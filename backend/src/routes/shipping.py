"""
shipping.py — Shipping Manager Portal API
Accessible by staff with role: shipping_manager, manager, or admin.
Shows only what the warehouse needs: delivery info + items to ship.
No sales rep info, no pricing details beyond packing slip.
"""
from flask import Blueprint, request, jsonify, session
from functools import wraps
from datetime import datetime, timedelta
import jwt as pyjwt

from src.models.user import db
from src.models.order import Order, OrderItem, StaffUser

shipping_bp = Blueprint('shipping', __name__)

# ─── Auth helpers ─────────────────────────────────────────────────────────────

def _get_jwt_secret():
    import os
    return os.environ.get('JWT_SECRET', 'lld-staff-secret-2024')

def _verify_staff_jwt(token):
    try:
        payload = pyjwt.decode(token, _get_jwt_secret(), algorithms=['HS256'])
        return payload.get('staff_id')
    except Exception:
        return None

def shipping_required(f):
    """Decorator: requires a staff login with role shipping_manager, manager, or admin."""
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask import g
        # JWT from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            if token and token not in ('null', 'undefined', 'false'):
                staff_id = _verify_staff_jwt(token)
                if staff_id:
                    staff = StaffUser.query.get(staff_id)
                    if not staff or not staff.is_active:
                        return jsonify({'error': 'Account inactive'}), 403
                    if staff.role not in ('shipping_manager', 'shipping', 'manager', 'admin'):
                        return jsonify({'error': 'Shipping access required'}), 403
                    g.shipping_staff = staff
                    return f(*args, **kwargs)
                return jsonify({'error': 'Invalid or expired token'}), 401
        # Session cookie fallback
        staff_id = session.get('shipping_staff_id') or session.get('staff_id')
        if not staff_id:
            return jsonify({'error': 'Authentication required'}), 401
        staff = StaffUser.query.get(staff_id)
        if not staff or not staff.is_active:
            return jsonify({'error': 'Account inactive'}), 403
        if staff.role not in ('shipping_manager', 'shipping', 'manager', 'admin'):
            return jsonify({'error': 'Shipping access required'}), 403
        from flask import g
        g.shipping_staff = staff
        return f(*args, **kwargs)
    return decorated

def get_shipping_staff():
    from flask import g
    return getattr(g, 'shipping_staff', None)

# ─── Login / Logout ───────────────────────────────────────────────────────────

@shipping_bp.route('/shipping/login', methods=['POST'])
def shipping_login():
    data = request.json or {}
    staff = StaffUser.query.filter_by(username=data.get('username')).first()
    if not staff or not staff.check_password(data.get('password', '')):
        return jsonify({'error': 'Invalid credentials'}), 401
    if not staff.is_active:
        return jsonify({'error': 'Account is inactive'}), 403
    if staff.role not in ('shipping_manager', 'shipping', 'manager', 'admin'):
        return jsonify({'error': 'This account does not have shipping access'}), 403
    session['shipping_staff_id'] = staff.id
    from datetime import timedelta
    token = pyjwt.encode(
        {'staff_id': staff.id, 'exp': datetime.utcnow() + timedelta(days=30)},
        _get_jwt_secret(),
        algorithm='HS256'
    )
    return jsonify({'success': True, 'staff': staff.to_dict(), 'token': token})

@shipping_bp.route('/shipping/logout', methods=['POST'])
def shipping_logout():
    session.pop('shipping_staff_id', None)
    return jsonify({'success': True})

@shipping_bp.route('/shipping/me', methods=['GET'])
@shipping_required
def shipping_me():
    staff = get_shipping_staff()
    return jsonify(staff.to_dict())

# ─── Order Queue ──────────────────────────────────────────────────────────────

import re

def _parse_tracking(staff_notes, field):
    """Extract tracking number or carrier from staff_notes string.
    Format stored: '[Shipped] Carrier: UPS | Tracking: 1Z999AA10123456784'
    """
    if not staff_notes:
        return ''
    # Look for the [Shipped] line
    for line in staff_notes.splitlines():
        if '[Shipped]' in line:
            if field == 'carrier':
                m = re.search(r'Carrier:\s*([^|\n]+)', line)
                return m.group(1).strip() if m else ''
            elif field == 'tracking':
                m = re.search(r'Tracking:\s*([^|\n]+)', line)
                return m.group(1).strip() if m else ''
    return ''

def _order_to_shipping_dict(order):
    """Return only the fields a warehouse worker needs — no sales/pricing info."""
    items = []
    for item in order.items:
        items.append({
            'id': item.id,
            'product_name': item.product_name,
            'product_sku': item.product_sku,
            'product_brand': item.product_brand or '',
            'product_unit_size': item.product_unit_size or '',
            'quantity': item.quantity,
        })
    return {
        'id': order.id,
        'order_number': order.order_number,
        'status': order.status,
        'created_at': order.created_at.isoformat() if order.created_at else None,
        'confirmed_at': order.confirmed_at.isoformat() if order.confirmed_at else None,
        'shipped_at': order.shipped_at.isoformat() if order.shipped_at else None,
        'delivered_at': order.delivered_at.isoformat() if order.delivered_at else None,
        'preferred_delivery_date': order.preferred_delivery_date or '',
        # Delivery address — warehouse needs this
        'delivery_name': order.delivery_name,
        'delivery_company': order.delivery_company or '',
        'delivery_address': order.delivery_address,
        'delivery_city': order.delivery_city,
        'delivery_state': order.delivery_state,
        'delivery_zip': order.delivery_zip,
        'delivery_phone': order.delivery_phone or '',
        'special_notes': order.special_notes or '',
        'item_count': sum(i.quantity for i in order.items),
        'items': items,
        # Tracking (stored in staff_notes if not a dedicated column)
        'tracking_number': _parse_tracking(order.staff_notes, 'tracking'),
        'carrier': _parse_tracking(order.staff_notes, 'carrier'),
        'staff_notes': order.staff_notes or '',
    }

@shipping_bp.route('/shipping/orders', methods=['GET'])
@shipping_required
def get_shipping_orders():
    """
    Returns orders that need warehouse action.
    Default: pending + confirmed (not yet shipped).
    Query params:
      status=pending|confirmed|shipped|all
      q=search string (order number, name, company)
      sort=created_at|order_number|delivery_date  dir=asc|desc
    """
    status_filter = request.args.get('status', 'active')  # active = pending+confirmed
    search_q = request.args.get('q', '').strip().lower()
    sort_by = request.args.get('sort', 'created_at')
    sort_dir = request.args.get('dir', 'asc')  # oldest first by default

    query = Order.query

    if status_filter == 'active':
        query = query.filter(Order.status.in_(['pending', 'confirmed']))
    elif status_filter == 'shipped':
        query = query.filter(Order.status == 'shipped')
    elif status_filter == 'delivered':
        query = query.filter(Order.status == 'delivered')
    elif status_filter != 'all':
        query = query.filter(Order.status == status_filter)

    # Search
    if search_q:
        query = query.filter(
            db.or_(
                Order.order_number.ilike(f'%{search_q}%'),
                Order.delivery_name.ilike(f'%{search_q}%'),
                Order.delivery_company.ilike(f'%{search_q}%'),
                Order.delivery_city.ilike(f'%{search_q}%'),
            )
        )

    # Sort
    sort_col = {
        'created_at': Order.created_at,
        'order_number': Order.order_number,
        'delivery_date': Order.preferred_delivery_date,
    }.get(sort_by, Order.created_at)

    if sort_dir == 'desc':
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    orders = query.all()
    return jsonify({'orders': [_order_to_shipping_dict(o) for o in orders]})

@shipping_bp.route('/shipping/orders/<order_number>', methods=['GET'])
@shipping_required
def get_shipping_order(order_number):
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    return jsonify({'order': _order_to_shipping_dict(order)})

# ─── Status Updates ───────────────────────────────────────────────────────────

@shipping_bp.route('/shipping/orders/<order_number>/confirm', methods=['POST'])
@shipping_required
def confirm_order(order_number):
    """Mark order as confirmed (picked and ready to ship)."""
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    if order.status not in ('pending',):
        return jsonify({'error': f'Cannot confirm order with status: {order.status}'}), 400
    order.status = 'confirmed'
    order.confirmed_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'order': _order_to_shipping_dict(order)})

@shipping_bp.route('/shipping/orders/<order_number>/ship', methods=['POST'])
@shipping_required
def mark_shipped(order_number):
    """Mark order as shipped. Optionally record tracking number and carrier."""
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    if order.status not in ('pending', 'confirmed'):
        return jsonify({'error': f'Cannot ship order with status: {order.status}'}), 400
    data = request.json or {}
    tracking = data.get('tracking_number', '').strip()
    carrier = data.get('carrier', '').strip()
    # Store tracking info in staff_notes if model doesn't have dedicated columns
    if tracking or carrier:
        existing_notes = order.staff_notes or ''
        tracking_note = f'[Shipped] Carrier: {carrier} | Tracking: {tracking}'
        order.staff_notes = f'{tracking_note}\n{existing_notes}'.strip()
    order.status = 'shipped'
    order.shipped_at = datetime.utcnow()
    db.session.commit()
    # Notify customer via SMS if phone available
    try:
        from src.utils.sms import send_sms
        if order.delivery_phone:
            msg = (
                f'RS LLD Restaurant Supply: Your order #{order.order_number} has shipped!'
            )
            if tracking:
                msg += f' Tracking: {tracking} ({carrier}).' if carrier else f' Tracking: {tracking}.'
            msg += ' Reply STOP to opt out.'
            send_sms(order.delivery_phone, msg)
    except Exception as e:
        print(f'[SHIPPING] SMS notify failed: {e}')
    return jsonify({'success': True, 'order': _order_to_shipping_dict(order)})

@shipping_bp.route('/shipping/orders/<order_number>/deliver', methods=['POST'])
@shipping_required
def mark_delivered(order_number):
    """Mark order as delivered."""
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    order.status = 'delivered'
    order.delivered_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'order': _order_to_shipping_dict(order)})

# ─── Packing Slip ─────────────────────────────────────────────────────────────

@shipping_bp.route('/shipping/orders/<order_number>/packing-slip', methods=['GET'])
@shipping_required
def packing_slip(order_number):
    """Returns packing slip data (no pricing)."""
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    return jsonify({'slip': _order_to_shipping_dict(order)})

# ─── Stats ────────────────────────────────────────────────────────────────────

@shipping_bp.route('/shipping/stats', methods=['GET'])
@shipping_required
def shipping_stats():
    """Quick counts for the dashboard header."""
    pending_count   = Order.query.filter_by(status='pending').count()
    confirmed_count = Order.query.filter_by(status='confirmed').count()
    # Use CDT offset (UTC-5) to calculate local midnight as a UTC boundary.
    # CDT = UTC-5; CST = UTC-6. Using -5 covers CDT (Apr–Nov).
    CDT_OFFSET = timedelta(hours=5)
    local_now = datetime.utcnow() - CDT_OFFSET
    local_midnight = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    utc_midnight = local_midnight + CDT_OFFSET  # convert local midnight back to UTC
    shipped_today   = Order.query.filter(
        Order.status == 'shipped',
        Order.shipped_at >= utc_midnight
    ).count()
    return jsonify({
        'pending': pending_count,
        'confirmed': confirmed_count,
        'shipped_today': shipped_today,
        'active': pending_count + confirmed_count,
    })

# ─── EasyPost Shipping Labels ─────────────────────────────────────────────────

EASYPOST_FROM_ADDRESS = {
    'name':    'RS LLD LLC',
    'street1': '218 Terrace Dr',
    'city':    'Mundelein',
    'state':   'IL',
    'zip':     '60060',
    'country': 'US',
    'phone':   '8479999999',
}

def _get_easypost_client():
    import os
    import easypost
    api_key = os.environ.get('EASYPOST_API_KEY')
    if not api_key:
        raise ValueError('EASYPOST_API_KEY environment variable is not set')
    return easypost.EasyPostClient(api_key)


@shipping_bp.route('/shipping/orders/<order_number>/label/rates', methods=['POST'])
@shipping_required
def get_label_rates(order_number):
    """
    Create an EasyPost shipment for the order and return available rates.
    Body: { weight_oz: float, length_in: float, width_in: float, height_in: float }
    """
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    data  = request.get_json() or {}

    weight_oz = float(data.get('weight_oz', 16))
    length    = float(data.get('length_in', 12))
    width     = float(data.get('width_in', 12))
    height    = float(data.get('height_in', 6))

    # Build to_address from order
    to_address = {
        'name':    order.customer_name or order.customer_company or 'Recipient',
        'company': order.customer_company or '',
        'street1': order.shipping_address or order.address or '',
        'phone':   order.customer_phone or '',
        'country': 'US',
    }

    try:
        client   = _get_easypost_client()
        shipment = client.shipment.create(
            to_address   = to_address,
            from_address = EASYPOST_FROM_ADDRESS,
            parcel       = {
                'weight': weight_oz,
                'length': length,
                'width':  width,
                'height': height,
            },
        )
        rates = []
        for r in (shipment.rates or []):
            rates.append({
                'id':       r.id,
                'carrier':  r.carrier,
                'service':  r.service,
                'rate':     r.rate,
                'currency': r.currency,
                'est_days': r.est_delivery_days,
            })
        # Sort by rate ascending
        rates.sort(key=lambda x: float(x['rate'] or 0))
        return jsonify({
            'shipment_id': shipment.id,
            'rates':       rates,
            'to_address':  {
                'name':    to_address['name'],
                'street1': to_address['street1'],
            },
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@shipping_bp.route('/shipping/orders/<order_number>/label/buy', methods=['POST'])
@shipping_required
def buy_label(order_number):
    """
    Purchase a specific rate and return the label URL.
    Body: { shipment_id: str, rate_id: str, label_format: 'PDF'|'PNG'|'ZPL' }
    """
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    data  = request.get_json() or {}

    shipment_id  = data.get('shipment_id')
    rate_id      = data.get('rate_id')
    label_format = data.get('label_format', 'PDF').upper()

    if not shipment_id or not rate_id:
        return jsonify({'error': 'shipment_id and rate_id are required'}), 400

    try:
        client   = _get_easypost_client()
        shipment = client.shipment.buy(
            shipment_id,
            rate={'id': rate_id},
            label_format=label_format,
        )
        label_url    = shipment.postage_label.label_url if shipment.postage_label else None
        tracking_num = shipment.tracking_code or ''
        carrier      = shipment.selected_rate.carrier if shipment.selected_rate else ''
        service      = shipment.selected_rate.service if shipment.selected_rate else ''
        rate_cost    = shipment.selected_rate.rate    if shipment.selected_rate else ''

        # Auto-save tracking number to the order notes
        if tracking_num:
            existing_notes = order.staff_notes or ''
            if tracking_num not in existing_notes:
                carrier_prefix = carrier.upper() if carrier else 'CARRIER'
                tracking_line  = f'[TRACKING:{carrier_prefix}:{tracking_num}]'
                order.staff_notes = (existing_notes + '\n' + tracking_line).strip()
                db.session.commit()

        return jsonify({
            'label_url':    label_url,
            'tracking_num': tracking_num,
            'carrier':      carrier,
            'service':      service,
            'rate':         rate_cost,
            'shipment_id':  shipment.id,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400
