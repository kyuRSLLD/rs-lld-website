"""
Sales Rep Portal API — lowest-level staff role.

Endpoints:
  GET  /api/sales/call-list          — customers with phone numbers, last order date, invoice summary
  GET  /api/sales/script             — the call script for reps to follow
  POST /api/sales/script             — admin: update the call script
  POST /api/sales/place-order        — place an order attributed to the logged-in rep
  GET  /api/sales/my-sales           — rep's own attributed orders + totals
  GET  /api/sales/customer/<id>/invoices — invoices/orders for a specific customer
"""

import os
from datetime import datetime, timedelta
from functools import wraps

from flask import Blueprint, jsonify, request, session
import jwt

from src.models.user import db, User
from src.models.order import Order, OrderItem, StaffUser
from src.models.product import Product

sales_rep_bp = Blueprint('sales_rep', __name__)

# ─── Auth helpers (reuse JWT logic from order.py) ────────────────────────────

def _get_jwt_secret():
    return os.environ.get('SECRET_KEY', 'fallback-secret')

def _verify_staff_jwt(token):
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=['HS256'])
        return payload.get('staff_id')
    except Exception:
        return None

def _get_current_staff():
    """Return the StaffUser for the current request, or None."""
    token = None
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get('staff_token')
    if token:
        staff_id = _verify_staff_jwt(token)
        if staff_id:
            return StaffUser.query.get(staff_id)
    # Fall back to session
    staff_id = session.get('staff_id')
    if staff_id:
        return StaffUser.query.get(staff_id)
    return None

def sales_rep_required(f):
    """Decorator: requires any active staff role (sales_rep, staff, manager, admin)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        staff = _get_current_staff()
        if not staff or not staff.is_active:
            return jsonify({'error': 'Authentication required'}), 401
        return f(staff, *args, **kwargs)
    return decorated

def admin_or_manager_required(f):
    """Decorator: requires manager or admin role."""
    @wraps(f)
    def decorated(*args, **kwargs):
        staff = _get_current_staff()
        if not staff or not staff.is_active:
            return jsonify({'error': 'Authentication required'}), 401
        if staff.role not in ('admin', 'manager'):
            return jsonify({'error': 'Insufficient permissions'}), 403
        return f(staff, *args, **kwargs)
    return decorated

# ─── In-memory call script storage (persisted via DB env var or simple table) ─
# We store the script as a single text record in a lightweight way using a
# dedicated table-less approach: store in a special StaffUser record or use
# a simple key-value via the existing DB.  We'll use a dedicated model-free
# approach: store in a file on the filesystem (Railway ephemeral) or better,
# as an environment variable set via the admin UI.  Simplest: store in DB as
# a special row.  We'll use a simple approach: a dedicated table.

class SalesScript(db.Model):
    """Stores the call script that sales reps use."""
    __tablename__ = 'sales_script'
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    updated_by = db.Column(db.String(100), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

DEFAULT_SCRIPT = """Hi, may I speak with the owner or manager?

Hi [Customer Name], this is [Your Name] calling from LLD Restaurant Supply.

I'm reaching out because we noticed it's been a while since your last order, and I wanted to let you know about some great deals we have right now on [mention relevant products based on their history].

We carry everything from disposable goods, kitchen tools, cleaning supplies, to packaging materials — all at competitive wholesale prices with fast delivery.

Can I help you place an order today, or would you like me to send over our latest product catalog?

[If they want to order:]
Great! Let me pull up your account. What items are you running low on?

[If they're not interested:]
No problem at all! I'll make a note to follow up next month. Have a great day!

Thank you for your time, [Customer Name]. We appreciate your business!"""

# ─── Routes ──────────────────────────────────────────────────────────────────

@sales_rep_bp.route('/sales/call-list', methods=['GET'])
@sales_rep_required
def get_call_list(staff):
    """
    Returns a list of customers with phone numbers, sorted by last order date (oldest first).
    Includes last order date, total lifetime spend, and number of orders.
    """
    # Get all customers who have a phone number
    customers = User.query.filter(
        User.phone.isnot(None),
        User.phone != '',
        User.is_active == True
    ).all()

    result = []
    for c in customers:
        orders = Order.query.filter_by(user_id=c.id).order_by(Order.created_at.desc()).all()
        last_order = orders[0] if orders else None
        total_spend = sum(o.total_amount for o in orders)
        result.append({
            'id': c.id,
            'name': c.full_name or c.username,
            'first_name': c.first_name or '',
            'last_name': c.last_name or '',
            'company': c.company_name or '',
            'phone': c.phone or '',
            'email': c.email or '',
            'shipping_address': c.shipping_address or '',
            'order_count': len(orders),
            'total_spend': round(total_spend, 2),
            'last_order_date': last_order.created_at.isoformat() if last_order else None,
            'last_order_amount': last_order.total_amount if last_order else 0,
            'last_order_items': [i.product_name for i in last_order.items[:3]] if last_order else [],
        })

    # Sort: customers with no orders first, then by oldest last order
    result.sort(key=lambda x: (
        x['last_order_date'] is not None,
        x['last_order_date'] or ''
    ))

    return jsonify({'customers': result})


@sales_rep_bp.route('/sales/customer/<int:customer_id>/invoices', methods=['GET'])
@sales_rep_required
def get_customer_invoices(staff, customer_id):
    """Returns the order history (invoices) for a specific customer."""
    orders = Order.query.filter_by(user_id=customer_id).order_by(Order.created_at.desc()).limit(20).all()
    return jsonify({'orders': [o.to_dict(include_items=True) for o in orders]})


@sales_rep_bp.route('/sales/script', methods=['GET'])
@sales_rep_required
def get_script(staff):
    """Returns the current call script."""
    script = SalesScript.query.first()
    if not script:
        # Create default script
        script = SalesScript(content=DEFAULT_SCRIPT, updated_by='system')
        db.session.add(script)
        db.session.commit()
    return jsonify({
        'content': script.content,
        'updated_by': script.updated_by,
        'updated_at': script.updated_at.isoformat() if script.updated_at else None,
    })


@sales_rep_bp.route('/sales/script', methods=['POST'])
@admin_or_manager_required
def update_script(staff):
    """Admin/manager: update the call script."""
    data = request.json or {}
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Script content is required'}), 400

    script = SalesScript.query.first()
    if not script:
        script = SalesScript(content=content, updated_by=staff.full_name or staff.username)
        db.session.add(script)
    else:
        script.content = content
        script.updated_by = staff.full_name or staff.username
        script.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'message': 'Script updated'})


@sales_rep_bp.route('/sales/place-order', methods=['POST'])
@sales_rep_required
def place_order_as_rep(staff):
    """
    Place an order on behalf of a customer, attributed to the logged-in sales rep.
    Body: { customer_id, items: [{product_id, quantity}], notes, payment_method }
    """
    data = request.json or {}
    customer_id = data.get('customer_id')
    items_data = data.get('items', [])
    notes = data.get('notes', '')
    payment_method = data.get('payment_method', 'net30')

    if not customer_id:
        return jsonify({'error': 'customer_id is required'}), 400
    if not items_data:
        return jsonify({'error': 'At least one item is required'}), 400

    customer = User.query.get(customer_id)
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404

    # Build order items and calculate totals
    order_items = []
    subtotal = 0.0
    for item in items_data:
        product = Product.query.get(item.get('product_id'))
        if not product:
            return jsonify({'error': f'Product {item.get("product_id")} not found'}), 404
        qty = int(item.get('quantity', 1))
        if qty < 1:
            continue
        unit_price = product.price
        line_total = unit_price * qty
        subtotal += line_total
        order_items.append(OrderItem(
            product_id=product.id,
            product_name=product.name,
            quantity=qty,
            unit_price=unit_price,
            total_price=line_total,
        ))

    if not order_items:
        return jsonify({'error': 'No valid items provided'}), 400

    # Generate order number
    import random, string
    order_number = 'SR-' + ''.join(random.choices(string.digits, k=8))
    while Order.query.filter_by(order_number=order_number).first():
        order_number = 'SR-' + ''.join(random.choices(string.digits, k=8))

    # Parse shipping address
    addr_parts = (customer.shipping_address or '').split(',')
    delivery_address = addr_parts[0].strip() if addr_parts else ''
    delivery_city = addr_parts[1].strip() if len(addr_parts) > 1 else ''
    delivery_state = addr_parts[2].strip() if len(addr_parts) > 2 else 'IL'
    delivery_zip = addr_parts[3].strip() if len(addr_parts) > 3 else ''

    order = Order(
        order_number=order_number,
        user_id=customer.id,
        status='pending',
        delivery_name=customer.full_name or customer.username,
        delivery_company=customer.company_name or '',
        delivery_address=delivery_address,
        delivery_city=delivery_city,
        delivery_state=delivery_state,
        delivery_zip=delivery_zip,
        delivery_phone=customer.phone or '',
        special_notes=notes,
        subtotal=round(subtotal, 2),
        discount_amount=0.0,
        delivery_fee=0.0,
        total_amount=round(subtotal, 2),
        payment_method=payment_method,
        payment_status='pending',
        sales_rep_id=staff.id,
        sales_source='phone_rep',
    )
    for oi in order_items:
        order.items.append(oi)

    db.session.add(order)
    db.session.commit()

    # Send order confirmation email to customer
    try:
        from src.utils.email import send_order_confirmation_email
        send_order_confirmation_email(customer.email, order.to_dict(include_items=True))
    except Exception as e:
        print(f'[SALES REP] Email send failed: {e}')

    return jsonify({'success': True, 'order': order.to_dict(include_items=True)})


@sales_rep_bp.route('/sales/my-sales', methods=['GET'])
@sales_rep_required
def get_my_sales(staff):
    """Returns the logged-in rep's attributed orders and summary stats."""
    # Date range filter (optional)
    days = request.args.get('days', 30, type=int)
    since = datetime.utcnow() - timedelta(days=days)

    orders = Order.query.filter(
        Order.sales_rep_id == staff.id,
        Order.created_at >= since
    ).order_by(Order.created_at.desc()).all()

    total_revenue = sum(o.total_amount for o in orders)
    total_orders = len(orders)

    # All-time stats
    all_orders = Order.query.filter_by(sales_rep_id=staff.id).all()
    all_time_revenue = sum(o.total_amount for o in all_orders)
    all_time_orders = len(all_orders)

    return jsonify({
        'rep': {
            'id': staff.id,
            'name': staff.full_name or staff.username,
            'role': staff.role,
        },
        'period_days': days,
        'period_orders': total_orders,
        'period_revenue': round(total_revenue, 2),
        'all_time_orders': all_time_orders,
        'all_time_revenue': round(all_time_revenue, 2),
        'orders': [o.to_dict(include_items=True) for o in orders],
    })


@sales_rep_bp.route('/sales/leaderboard', methods=['GET'])
@sales_rep_required
def get_leaderboard(staff):
    """Returns sales leaderboard for all reps (visible to all staff)."""
    days = request.args.get('days', 30, type=int)
    since = datetime.utcnow() - timedelta(days=days)

    reps = StaffUser.query.filter(
        StaffUser.role == 'sales_rep',
        StaffUser.is_active == True
    ).all()

    leaderboard = []
    for rep in reps:
        orders = Order.query.filter(
            Order.sales_rep_id == rep.id,
            Order.created_at >= since
        ).all()
        leaderboard.append({
            'rep_id': rep.id,
            'rep_name': rep.full_name or rep.username,
            'order_count': len(orders),
            'revenue': round(sum(o.total_amount for o in orders), 2),
        })

    leaderboard.sort(key=lambda x: x['revenue'], reverse=True)
    return jsonify({'leaderboard': leaderboard, 'period_days': days})
