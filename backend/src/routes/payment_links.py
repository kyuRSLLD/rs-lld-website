"""
Payment Links & Account Standing Routes
=========================================
POST /api/voice/send_payment_sms      — Twilio SMS with Stripe link or check upload URL
POST /api/payments/create-link        — Generates a Stripe Payment Link for an order
GET  /api/voice/check_account_standing — Returns approved_for_terms, overdue_amount, credit_limit
"""

import os
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, session

from src.models.user import db, User
from src.models.order import Order

payment_links_bp = Blueprint('payment_links', __name__)

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://lldrestaurantsupply.com')


# ── Auth helpers ──────────────────────────────────────────────────────────────

def _get_staff_id():
    import jwt as _jwt
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


def _get_current_user_id():
    """Return user_id from session or JWT."""
    if session.get('user_id'):
        return session['user_id']
    import jwt as _jwt
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        token = auth[7:].strip()
        if token and token not in ('null', 'undefined', 'false', ''):
            try:
                secret = os.environ.get('SECRET_KEY', 'dev-secret')
                payload = _jwt.decode(token, secret, algorithms=['HS256'])
                return payload.get('user_id')
            except Exception:
                pass
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/payments/create-link
# Generates a Stripe Payment Link for a specific order
# ═══════════════════════════════════════════════════════════════════════════════

@payment_links_bp.route('/payments/create-link', methods=['POST'])
def create_payment_link():
    """
    Generates a Stripe Payment Link for an order.
    Can be called by staff, the voice agent, or the customer dashboard.

    Body:
      order_number (str, required): The order to generate a link for
      expires_in_hours (int, optional): Link expiry in hours (default 48)

    Returns:
      payment_url (str): Stripe-hosted payment page URL
      order_number (str)
      amount (float): Order total in USD
      expires_at (str): ISO datetime when the link expires
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

    amount_cents = int(round(order.total_amount * 100))
    if amount_cents <= 0:
        return jsonify({'error': 'Order total must be greater than zero'}), 400

    expires_in_hours = data.get('expires_in_hours', 48)
    expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)

    try:
        import stripe
        stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')

        # Build a line item description from order items
        description = f'LLD Restaurant Supply — Order {order_number}'
        if order.items:
            item_names = [i.get('product_name', 'Item') for i in (order.items or [])[:3]]
            if item_names:
                description = ', '.join(item_names)
                if len(order.items) > 3:
                    description += f' + {len(order.items) - 3} more'

        # Create Stripe Payment Link
        price = stripe.Price.create(
            unit_amount=amount_cents,
            currency='usd',
            product_data={
                'name': f'Order {order_number}',
                'description': description,
            },
        )

        link = stripe.PaymentLink.create(
            line_items=[{'price': price.id, 'quantity': 1}],
            metadata={
                'order_number': order_number,
                'customer_id': str(order.user_id or ''),
            },
            after_completion={
                'type': 'redirect',
                'redirect': {'url': f'{FRONTEND_URL}/order-confirmation?order={order_number}'},
            },
        )

        # Store the payment link on the order for reference
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
        # Fallback: return a manual checkout URL if Stripe is not configured
        fallback_url = f'{FRONTEND_URL}/checkout?order={order_number}'
        return jsonify({
            'success': False,
            'error': str(e),
            'fallback_url': fallback_url,
            'order_number': order_number,
            'amount': order.total_amount,
        }), 500


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/voice/send_payment_sms
# Twilio SMS with Stripe payment link or check upload URL
# ═══════════════════════════════════════════════════════════════════════════════

@payment_links_bp.route('/voice/send_payment_sms', methods=['POST'])
def send_payment_sms():
    """
    Sends an SMS to the customer with a payment link for their order.
    Supports two payment methods:
      - 'card': Generates a Stripe Payment Link and texts it
      - 'check': Texts the check upload URL

    Body:
      order_number (str, required)
      phone (str, optional): Override phone number (defaults to customer's on-file phone)
      payment_method (str): 'card' (default) or 'check'

    Returns:
      success (bool)
      sms_sid (str): Twilio message SID
      to (str): Phone number the SMS was sent to
      message_preview (str): First 100 chars of the SMS body
    """
    data = request.json or {}
    order_number = data.get('order_number')
    if not order_number:
        return jsonify({'error': 'order_number is required'}), 400

    order = Order.query.filter_by(order_number=order_number).first()
    if not order:
        return jsonify({'error': f'Order {order_number} not found'}), 404

    # Resolve the phone number
    to_phone = data.get('phone')
    if not to_phone and order.user_id:
        user = User.query.get(order.user_id)
        if user:
            to_phone = user.phone

    if not to_phone:
        return jsonify({'error': 'No phone number found for this order. Please provide a phone number.'}), 400

    # Normalize phone number — ensure E.164 format
    to_phone = to_phone.strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    if not to_phone.startswith('+'):
        to_phone = '+1' + to_phone  # Default to US

    payment_method = data.get('payment_method', 'card')

    # Build the payment URL
    if payment_method == 'check':
        payment_url = f'{FRONTEND_URL}/upload-check?order={order_number}'
        sms_body = (
            f'Hi! Your LLD Restaurant Supply order {order_number} '
            f'(${order.total_amount:.2f}) is ready. '
            f'Please upload your check here: {payment_url} '
            f'Questions? Call us at (224) 424-7271.'
        )
    else:
        # Generate Stripe Payment Link
        stripe_url = None
        try:
            import stripe
            stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
            amount_cents = int(round(order.total_amount * 100))
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
            db.session.commit()
        except Exception as stripe_err:
            stripe_url = f'{FRONTEND_URL}/checkout?order={order_number}'

        payment_url = stripe_url
        sms_body = (
            f'Hi! Your LLD Restaurant Supply order {order_number} '
            f'(${order.total_amount:.2f}) is ready for payment. '
            f'Pay securely here: {payment_url} '
            f'Questions? Call (224) 424-7271.'
        )

    # Send via Twilio
    twilio_sid = os.environ.get('TWILIO_ACCOUNT_SID', '')
    twilio_token = os.environ.get('TWILIO_AUTH_TOKEN', '')
    twilio_from = os.environ.get('TWILIO_PHONE_NUMBER', '')

    if not twilio_sid or not twilio_token or not twilio_from:
        return jsonify({
            'success': False,
            'error': 'Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.',
            'sms_body_preview': sms_body[:100],
            'payment_url': payment_url,
        }), 500

    try:
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(twilio_sid, twilio_token)
        message = client.messages.create(
            body=sms_body,
            from_=twilio_from,
            to=to_phone,
        )

        return jsonify({
            'success': True,
            'sms_sid': message.sid,
            'to': to_phone,
            'payment_method': payment_method,
            'payment_url': payment_url,
            'message_preview': sms_body[:100],
            'order_number': order_number,
            'amount': order.total_amount,
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'payment_url': payment_url,
        }), 500


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/voice/check_account_standing
# Returns credit terms status, overdue balance, and credit limit for a customer
# ═══════════════════════════════════════════════════════════════════════════════

@payment_links_bp.route('/voice/check_account_standing', methods=['GET'])
def check_account_standing():
    """
    Returns account standing for a customer — used by the voice agent to determine
    whether to offer net terms, require upfront payment, or flag overdue balances.

    Query params (one required):
      customer_id (int): User ID
      phone (str): Customer phone number (looked up in User table)
      email (str): Customer email

    Returns:
      customer_id (int)
      company_name (str)
      approved_for_terms (bool): Whether this customer is approved for net-30/60
      payment_terms (str): 'net30', 'net60', 'cod', or null
      credit_limit (float): Maximum outstanding balance allowed
      current_balance (float): Sum of all unpaid confirmed orders
      overdue_amount (float): Sum of orders past their due date (> 30 days old, unpaid)
      available_credit (float): credit_limit - current_balance
      account_status (str): 'good' | 'overdue' | 'over_limit' | 'suspended'
      overdue_orders (list): List of overdue order numbers and amounts
    """
    customer_id = request.args.get('customer_id', type=int)
    phone = request.args.get('phone', '').strip()
    email = request.args.get('email', '').strip()

    user = None
    if customer_id:
        user = User.query.get(customer_id)
    elif phone:
        # Normalize phone for lookup
        normalized = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        if not normalized.startswith('+'):
            normalized_us = '+1' + normalized
        else:
            normalized_us = normalized
        user = User.query.filter(
            db.or_(
                User.phone == phone,
                User.phone == normalized,
                User.phone == normalized_us,
            )
        ).first()
    elif email:
        user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({'error': 'Customer not found'}), 404

    # Calculate current unpaid balance from confirmed orders
    unpaid_orders = Order.query.filter_by(
        user_id=user.id,
    ).filter(
        Order.payment_status.in_(['pending', 'pending_review']),
        Order.status.in_(['confirmed', 'processing', 'shipped']),
    ).all()

    current_balance = sum(o.total_amount for o in unpaid_orders if o.total_amount)

    # Calculate overdue amount: unpaid orders confirmed more than 30 days ago
    overdue_cutoff = datetime.utcnow() - timedelta(days=30)
    overdue_orders = [
        o for o in unpaid_orders
        if o.confirmed_at and o.confirmed_at < overdue_cutoff
    ]
    overdue_amount = sum(o.total_amount for o in overdue_orders if o.total_amount)

    credit_limit = user.credit_limit or 0.0
    available_credit = max(0.0, credit_limit - current_balance)

    # Determine account status
    if not user.is_active:
        account_status = 'suspended'
    elif overdue_amount > 0:
        account_status = 'overdue'
    elif credit_limit > 0 and current_balance >= credit_limit:
        account_status = 'over_limit'
    else:
        account_status = 'good'

    return jsonify({
        'customer_id': user.id,
        'company_name': user.company_name or user.username,
        'email': user.email,
        'phone': user.phone,
        'approved_for_terms': bool(user.approved_for_terms),
        'payment_terms': user.payment_terms,
        'credit_limit': credit_limit,
        'current_balance': round(current_balance, 2),
        'overdue_amount': round(overdue_amount, 2),
        'available_credit': round(available_credit, 2),
        'account_status': account_status,
        'overdue_orders': [
            {
                'order_number': o.order_number,
                'amount': o.total_amount,
                'confirmed_at': o.confirmed_at.isoformat() if o.confirmed_at else None,
                'days_overdue': (datetime.utcnow() - o.confirmed_at).days if o.confirmed_at else None,
            }
            for o in overdue_orders
        ],
    })
