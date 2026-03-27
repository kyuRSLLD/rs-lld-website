"""
Voice Agent Payment & Account Tools
=====================================
Tool 6:  POST /api/voice/check_account_standing  — credit/terms check by phone_number
Tool 7:  POST /api/voice/send_payment_sms        — Twilio SMS (net30 / credit_card / check)
Tool 8:  POST /api/voice/webhook/call-complete   — ElevenLabs post-call webhook (HMAC)
Extra:   POST /api/payments/create-link          — Stripe Payment Link (staff / dashboard use)

Auth for voice tools: X-Voice-Secret header (ELEVENLABS_VOICE_SECRET env var)
Auth for webhook:     HMAC-SHA256 via ElevenLabs-Signature header
"""

import os
import re
import hmac
import hashlib
import threading
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify

from src.models.user import db, User
from src.models.order import Order

payment_links_bp = Blueprint('payment_links', __name__)

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://lldrestaurantsupply.com')
LLD_PHONE = '(224) 424-7271'
DEFAULT_CREDIT_LIMIT = 5000.00


# ── Shared auth helpers ───────────────────────────────────────────────────────

def _check_voice_secret():
    """Validate X-Voice-Secret header."""
    expected = os.environ.get('ELEVENLABS_VOICE_SECRET', '')
    if not expected:
        return False
    return request.headers.get('X-Voice-Secret', '') == expected


def _voice_auth_error():
    return jsonify({'success': False, 'error': 'Unauthorized — invalid or missing X-Voice-Secret header'}), 401


def _normalize_phone(phone: str) -> str:
    """Strip all non-digit characters."""
    return re.sub(r'\D', '', phone or '')


def _find_user_by_phone(phone: str):
    """Match phone number against all users (digit-only comparison)."""
    normalized = _normalize_phone(phone)
    if not normalized:
        return None
    users = User.query.filter(User.phone.isnot(None)).all()
    for user in users:
        if _normalize_phone(user.phone) == normalized:
            return user
    return None


def _get_staff_id():
    import jwt as _jwt
    from flask import session
    if session.get('staff_id'):
        return session['staff_id']
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        token = auth[7:].strip()
        if token and token not in ('null', 'undefined', 'false', ''):
            try:
                secret = os.environ.get('SECRET_KEY', 'dev-secret')
                payload = _jwt.decode(token, secret, algorithms=['HS256'])
                return payload.get('staff_id')
            except Exception:
                pass
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# Tool 6: POST /api/voice/check_account_standing
# ═══════════════════════════════════════════════════════════════════════════════

@payment_links_bp.route('/voice/check_account_standing', methods=['POST'])
def check_account_standing():
    """
    Determine whether a customer is approved for Net 30 payment terms and
    whether they have any overdue invoices.

    The voice agent calls this before placing an order to decide the payment
    flow: Net 30 (frictionless), Stripe link, or check upload.

    Request body:
        { "phone_number": "+17735551234" }

    Response:
        {
          "success": true,
          "approved_for_terms": true,
          "payment_terms": "net30",
          "has_overdue": false,
          "overdue_amount": 0.00,
          "overdue_invoice_count": 0,
          "credit_limit": 5000.00,
          "available_credit": 3500.00
        }

    Business logic:
    - Not found → approved_for_terms: false (new customer, must pay upfront)
    - Overdue = net30 orders with payment_status pending and created_at > 30 days ago
    - approved_for_terms = true if: customer exists + no overdue + outstanding < credit_limit
    - available_credit = credit_limit - total outstanding unpaid orders
    """
    if not _check_voice_secret():
        return _voice_auth_error()

    data = request.get_json(silent=True) or {}
    phone = data.get('phone_number', '').strip()

    if not phone:
        return jsonify({'success': False, 'error': 'phone_number is required'}), 400

    user = _find_user_by_phone(phone)
    if not user:
        # New customer — not approved for terms, must pay upfront
        return jsonify({
            'success': True,
            'approved_for_terms': False,
            'payment_terms': None,
            'has_overdue': False,
            'overdue_amount': 0.00,
            'overdue_invoice_count': 0,
            'credit_limit': 0.00,
            'available_credit': 0.00,
            'account_status': 'new_customer',
            'message': 'Customer not found — treat as new customer, require upfront payment.',
        })

    # Use stored credit_limit or default $5,000
    credit_limit = user.credit_limit if (user.credit_limit and user.credit_limit > 0) else DEFAULT_CREDIT_LIMIT

    # All unpaid net30 orders
    unpaid_net30 = Order.query.filter_by(
        user_id=user.id,
        payment_method='net30',
    ).filter(
        Order.payment_status.in_(['pending', 'pending_review']),
    ).all()

    current_balance = sum(o.total_amount or 0.0 for o in unpaid_net30)

    # Overdue: net30 orders pending payment where created_at > 30 days ago
    overdue_cutoff = datetime.utcnow() - timedelta(days=30)
    overdue_orders = [
        o for o in unpaid_net30
        if o.created_at and o.created_at < overdue_cutoff
    ]
    overdue_amount = sum(o.total_amount or 0.0 for o in overdue_orders)
    has_overdue = overdue_amount > 0

    available_credit = max(0.0, credit_limit - current_balance)

    # approved_for_terms: must be explicitly approved by staff, no overdue, and under credit limit
    approved = (
        bool(user.approved_for_terms)
        and not has_overdue
        and current_balance < credit_limit
        and user.is_active
    )

    # Account status
    if not user.is_active:
        account_status = 'suspended'
    elif has_overdue:
        account_status = 'overdue'
    elif credit_limit > 0 and current_balance >= credit_limit:
        account_status = 'over_limit'
    else:
        account_status = 'good'

    return jsonify({
        'success': True,
        'customer_id': user.id,
        'company_name': user.company_name or user.username,
        'approved_for_terms': approved,
        'payment_terms': user.payment_terms or ('net30' if approved else None),
        'has_overdue': has_overdue,
        'overdue_amount': round(overdue_amount, 2),
        'overdue_invoice_count': len(overdue_orders),
        'credit_limit': credit_limit,
        'current_balance': round(current_balance, 2),
        'available_credit': round(available_credit, 2),
        'account_status': account_status,
        'overdue_orders': [
            {
                'order_number': o.order_number,
                'amount': o.total_amount,
                'created_at': o.created_at.isoformat() if o.created_at else None,
                'days_overdue': (datetime.utcnow() - o.created_at).days if o.created_at else None,
            }
            for o in overdue_orders
        ],
    })


# ═══════════════════════════════════════════════════════════════════════════════
# Tool 7: POST /api/voice/send_payment_sms
# ═══════════════════════════════════════════════════════════════════════════════

@payment_links_bp.route('/voice/send_payment_sms', methods=['POST'])
def send_payment_sms():
    """
    Send an SMS to the customer after an order is placed.
    SMS content varies by payment_method:
      - net30:       Confirms order on terms, no payment URL
      - credit_card: Generates Stripe Payment Link and texts it
      - check:       Texts the check upload URL

    Request body:
        {
          "phone_number": "+17735551234",
          "order_number": "RS-2026-AB1C",
          "payment_method": "net30" | "credit_card" | "check"
        }

    Response:
        {
          "success": true,
          "message": "SMS sent successfully",
          "sms_type": "net30_confirmation" | "stripe_link" | "check_upload",
          "payment_url": "https://..."   // null for net30
        }
    """
    if not _check_voice_secret():
        return _voice_auth_error()

    data = request.get_json(silent=True) or {}
    phone_number = data.get('phone_number', '').strip()
    order_number = data.get('order_number', '').strip()
    payment_method = data.get('payment_method', 'net30').strip().lower()

    if not order_number:
        return jsonify({'success': False, 'error': 'order_number is required'}), 400
    if not phone_number:
        return jsonify({'success': False, 'error': 'phone_number is required'}), 400
    if payment_method not in ('net30', 'credit_card', 'check'):
        return jsonify({'success': False, 'error': 'payment_method must be net30, credit_card, or check'}), 400

    order = Order.query.filter_by(order_number=order_number).first()
    if not order:
        return jsonify({'success': False, 'error': f'Order {order_number} not found'}), 404

    # Normalize to E.164
    digits = _normalize_phone(phone_number)
    if not digits:
        return jsonify({'success': False, 'error': 'Invalid phone_number'}), 400
    to_phone = '+1' + digits if not phone_number.startswith('+') else '+' + digits

    total = order.total_amount or 0.0
    payment_url = None
    sms_type = None

    # ── net30 ─────────────────────────────────────────────────────────────────
    if payment_method == 'net30':
        sms_type = 'net30_confirmation'
        sms_body = (
            f'LLD Restaurant Supply \u2014 Order {order_number} confirmed! '
            f'Total: ${total:.2f}. Payment due in 30 days. '
            f'Invoice has been emailed to your address on file. '
            f'Questions? Call us at {LLD_PHONE}.'
        )
        # Update order payment method
        order.payment_method = 'net30'
        db.session.commit()

    # ── credit_card ───────────────────────────────────────────────────────────
    elif payment_method == 'credit_card':
        sms_type = 'stripe_link'
        stripe_url = None
        try:
            import stripe
            stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
            amount_cents = int(round(total * 100))
            if amount_cents > 0:
                price = stripe.Price.create(
                    unit_amount=amount_cents,
                    currency='usd',
                    product_data={'name': f'LLD Order {order_number}'},
                )
                link = stripe.PaymentLink.create(
                    line_items=[{'price': price.id, 'quantity': 1}],
                    metadata={'order_number': order_number},
                    after_completion={
                        'type': 'redirect',
                        'redirect': {'url': f'{FRONTEND_URL}/order-confirmation?order={order_number}'},
                    },
                )
                stripe_url = link.url
                order.stripe_payment_link = stripe_url
        except Exception as e:
            stripe_url = f'{FRONTEND_URL}/checkout?order={order_number}'

        payment_url = stripe_url
        order.payment_method = 'credit_card'
        db.session.commit()

        sms_body = (
            f'LLD Restaurant Supply \u2014 Complete your order {order_number} (${total:.2f}): '
            f'{payment_url} \u2014 This secure link expires in 24 hours.'
        )

    # ── check ─────────────────────────────────────────────────────────────────
    else:  # check
        sms_type = 'check_upload'
        payment_url = f'{FRONTEND_URL}/pay/{order_number}'
        order.payment_method = 'check'
        order.payment_status = 'pending_review'
        db.session.commit()

        sms_body = (
            f'LLD Restaurant Supply \u2014 Upload your check for order {order_number} (${total:.2f}): '
            f'{payment_url} \u2014 Please photograph front and back of check.'
        )

    # ── Send via Twilio ───────────────────────────────────────────────────────
    twilio_sid = os.environ.get('TWILIO_ACCOUNT_SID', '')
    twilio_token = os.environ.get('TWILIO_AUTH_TOKEN', '')
    twilio_from = os.environ.get('TWILIO_PHONE_NUMBER', '')

    if not twilio_sid or not twilio_token or not twilio_from:
        return jsonify({
            'success': False,
            'error': 'Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.',
            'sms_type': sms_type,
            'payment_url': payment_url,
            'sms_body_preview': sms_body[:120],
        }), 500

    try:
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(twilio_sid, twilio_token)
        message = client.messages.create(body=sms_body, from_=twilio_from, to=to_phone)

        return jsonify({
            'success': True,
            'message': 'SMS sent successfully',
            'sms_type': sms_type,
            'sms_sid': message.sid,
            'to': to_phone,
            'payment_url': payment_url,
            'order_number': order_number,
            'amount': total,
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'sms_type': sms_type,
            'payment_url': payment_url,
        }), 500


# ═══════════════════════════════════════════════════════════════════════════════
# Tool 8: POST /api/voice/webhook/call-complete
# ElevenLabs post-call webhook with HMAC-SHA256 signature verification
# ═══════════════════════════════════════════════════════════════════════════════

@payment_links_bp.route('/voice/webhook/call-complete', methods=['POST'])
def voice_webhook_call_complete():
    """
    Receives the post-call transcription webhook from ElevenLabs after every call ends.
    Logs the conversation to CallLog and returns HTTP 200 immediately.

    HMAC verification:
        ElevenLabs-Signature: t=<timestamp>,v0=<HMAC-SHA256(timestamp.body, secret)>

    Payload fields used:
        conversation_id, transcript (array of turns), duration_seconds,
        metadata.caller_phone, metadata.sub_agent_name, metadata.direction,
        tool_calls (array), analysis.order_placed, analysis.order_number,
        analysis.order_total, analysis.payment_method
    """
    # ── HMAC verification ─────────────────────────────────────────────────────
    webhook_secret = os.environ.get('ELEVENLABS_WEBHOOK_SECRET', '')
    if webhook_secret:
        sig_header = request.headers.get('ElevenLabs-Signature', '')
        if sig_header:
            try:
                parts = dict(p.split('=', 1) for p in sig_header.split(','))
                timestamp = parts.get('t', '')
                provided_hash = parts.get('v0', '')
                raw_body = request.get_data(as_text=True)
                expected_hash = hmac.new(
                    webhook_secret.encode(),
                    f'{timestamp}.{raw_body}'.encode(),
                    hashlib.sha256,
                ).hexdigest()
                if not hmac.compare_digest(provided_hash, expected_hash):
                    return jsonify({'success': False, 'error': 'Invalid signature'}), 401
            except Exception:
                return jsonify({'success': False, 'error': 'Signature verification failed'}), 401

    # ── Parse payload ─────────────────────────────────────────────────────────
    payload = request.get_json(silent=True) or {}

    conversation_id = payload.get('conversation_id', '')
    transcript_raw = payload.get('transcript', [])
    duration_seconds = payload.get('duration_seconds') or payload.get('call_duration_secs')
    metadata = payload.get('metadata', {})
    tool_calls = payload.get('tool_calls', [])
    analysis = payload.get('analysis', {})

    caller_phone = metadata.get('caller_phone') or metadata.get('phone_number', '')
    sub_agent_name = metadata.get('sub_agent_name') or metadata.get('agent_name', '')
    direction = metadata.get('direction', 'inbound')

    # Flatten transcript array to text
    if isinstance(transcript_raw, list):
        transcript_text = '\n'.join(
            f"{t.get('role', 'unknown').capitalize()}: {t.get('message', t.get('text', ''))}"
            for t in transcript_raw
        )
    else:
        transcript_text = str(transcript_raw)

    order_placed = bool(analysis.get('order_placed') or any(
        tc.get('tool_name') == 'place_order' for tc in tool_calls
    ))
    order_number = analysis.get('order_number')
    order_total = analysis.get('order_total')
    payment_method = analysis.get('payment_method')

    # ── Store in DB asynchronously so we return 200 immediately ──────────────
    def _save_log():
        try:
            from src.models.voice_analytics import CallLog
            log = CallLog(
                conversation_id=conversation_id or f'unknown-{datetime.utcnow().timestamp()}',
                caller_phone=caller_phone,
                sub_agent_name=sub_agent_name,
                direction=direction,
                duration_seconds=int(duration_seconds) if duration_seconds else None,
                transcript=transcript_text,
                tools_called=tool_calls if isinstance(tool_calls, list) else [],
                order_placed=order_placed,
                order_number=order_number,
                order_total=float(order_total) if order_total else None,
                payment_method=payment_method,
                created_at=datetime.utcnow(),
            )
            from src.models.user import db as _db
            _db.session.add(log)
            _db.session.commit()
        except Exception as e:
            print(f'[webhook] Failed to save CallLog: {e}')

    thread = threading.Thread(target=_save_log, daemon=True)
    thread.start()

    # ── Sync customer profile to staff portal ────────────────────────────────
    # Extract delivery info from tool calls for profile building
    if caller_phone:
        try:
            from src.utils.staff_portal_sync import sync_voice_call_customer
            # Try to extract delivery info from place_order tool calls
            d_name = None
            d_company = None
            d_address = None
            d_city = None
            d_state = None
            d_zip = None
            for tc in (tool_calls or []):
                if tc.get('tool_name') == 'place_order':
                    tc_input = tc.get('input', {}) or tc.get('params', {})
                    d_name = tc_input.get('delivery_name')
                    d_company = tc_input.get('delivery_company')
                    d_address = tc_input.get('delivery_address')
                    d_city = tc_input.get('delivery_city')
                    d_state = tc_input.get('delivery_state')
                    d_zip = tc_input.get('delivery_zip')
                    break
            # Also try get_customer tool call for existing customer data
            for tc in (tool_calls or []):
                if tc.get('tool_name') == 'get_customer':
                    tc_output = tc.get('output', {}) or tc.get('result', {})
                    if isinstance(tc_output, dict):
                        cust = tc_output.get('customer', {})
                        if not d_name and cust.get('name'):
                            d_name = cust.get('name')
                        if not d_company and cust.get('company'):
                            d_company = cust.get('company')
                    break

            sync_voice_call_customer(
                phone=caller_phone,
                transcript_text=transcript_text[:500] if transcript_text else None,
                order_placed=order_placed,
                order_number=order_number,
                delivery_name=d_name,
                delivery_company=d_company,
                delivery_address=d_address,
                delivery_city=d_city,
                delivery_state=d_state,
                delivery_zip=d_zip,
            )
        except Exception as e:
            print(f'[webhook] Staff portal customer sync failed: {e}')

    return jsonify({'success': True}), 200


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/payments/create-link  (staff / dashboard use)
# Generates a Stripe Payment Link for a specific order
# ═══════════════════════════════════════════════════════════════════════════════

@payment_links_bp.route('/payments/create-link', methods=['POST'])
def create_payment_link():
    """
    Generates a Stripe Payment Link for an order.
    Can be called by staff, the voice agent, or the customer dashboard.

    Body:
      order_number (str, required)
      expires_in_hours (int, optional, default 48)

    Returns:
      payment_url, order_number, amount, expires_at
    """
    data = request.json or {}
    order_number = data.get('order_number')
    if not order_number:
        return jsonify({'error': 'order_number is required'}), 400

    order = Order.query.filter_by(order_number=order_number).first()
    if not order:
        return jsonify({'error': f'Order {order_number} not found'}), 404

    if order.payment_status == 'paid':
        return jsonify({'error': 'Order is already paid'}), 400

    amount_cents = int(round((order.total_amount or 0) * 100))
    if amount_cents <= 0:
        return jsonify({'error': 'Order total must be greater than zero'}), 400

    expires_in_hours = data.get('expires_in_hours', 48)
    expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)

    try:
        import stripe
        stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')

        description = f'LLD Restaurant Supply \u2014 Order {order_number}'
        if order.items:
            try:
                item_names = [i.product_name for i in order.items[:3]]
                if item_names:
                    description = ', '.join(item_names)
                    if len(order.items) > 3:
                        description += f' + {len(order.items) - 3} more'
            except Exception:
                pass

        price = stripe.Price.create(
            unit_amount=amount_cents,
            currency='usd',
            product_data={'name': f'Order {order_number}', 'description': description},
        )
        link = stripe.PaymentLink.create(
            line_items=[{'price': price.id, 'quantity': 1}],
            metadata={'order_number': order_number, 'customer_id': str(order.user_id or '')},
            after_completion={
                'type': 'redirect',
                'redirect': {'url': f'{FRONTEND_URL}/order-confirmation?order={order_number}'},
            },
        )

        order.stripe_payment_link = link.url
        db.session.commit()

        return jsonify({
            'success': True,
            'payment_url': link.url,
            'order_number': order_number,
            'amount': order.total_amount,
            'expires_at': expires_at.isoformat(),
        })

    except Exception as e:
        fallback_url = f'{FRONTEND_URL}/checkout?order={order_number}'
        return jsonify({
            'success': False,
            'error': str(e),
            'fallback_url': fallback_url,
            'order_number': order_number,
            'amount': order.total_amount,
        }), 500
