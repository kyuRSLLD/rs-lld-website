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

    discount_amount = float(data.get('discount_amount', 0.0))
    delivery_fee = float(data.get('delivery_fee', 0.0))

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
        # Use staff-supplied unit_price if provided, otherwise fall back to product price
        unit_price = float(item.get('unit_price') or product.unit_price or 0)
        line_total = unit_price * qty
        subtotal += line_total
        order_items.append(OrderItem(
            product_id=product.id,
            product_name=product.name,
            product_sku=product.sku or 'CUSTOM',
            product_brand=product.brand or '',
            product_unit_size=getattr(product, 'unit_size', '') or '',
            quantity=qty,
            unit_price=unit_price,
            is_bulk_price=item.get('is_bulk_price', False),
            line_total=line_total,
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
        discount_amount=round(discount_amount, 2),
        delivery_fee=round(delivery_fee, 2),
        total_amount=round(subtotal - discount_amount + delivery_fee, 2),
        payment_method=payment_method,
        payment_status='pending',
        sales_rep_id=staff.id,
        sales_source='phone_rep',
    )
    for oi in order_items:
        order.items.append(oi)

    db.session.add(order)
    db.session.commit()

    # ── Upsert customer into calling list with status=customer ──────────────
    try:
        cl_entry = CallingListEntry.query.filter(
            db.or_(
                CallingListEntry.phone == (customer.phone or '__none__'),
                CallingListEntry.email == (customer.email or '__none__'),
            )
        ).first()
        if cl_entry:
            cl_entry.status       = 'customer'
            cl_entry.company_name = customer.company_name or cl_entry.company_name
            cl_entry.contact_name = customer.full_name or cl_entry.contact_name
            cl_entry.phone        = customer.phone or cl_entry.phone
            cl_entry.email        = customer.email or cl_entry.email
            cl_entry.address      = customer.shipping_address or cl_entry.address
        else:
            cl_entry = CallingListEntry(
                company_name   = customer.company_name or '',
                contact_name   = customer.full_name or customer.username,
                phone          = customer.phone or '',
                email          = customer.email or '',
                address        = customer.shipping_address or '',
                notes          = f'Customer — order {order.order_number}',
                priority_score = 100.0,
                status         = 'customer',
                uploaded_by    = staff.id,
            )
            db.session.add(cl_entry)
        db.session.commit()
    except Exception as _cle:
        print(f'[SALES REP] Calling list upsert failed: {_cle}')


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


# ─── Calling List: add / update / delete entries ─────────────────────────────

class CallingListEntry(db.Model):
    """Extra phone numbers uploaded by staff for outbound calling campaigns."""
    __tablename__ = 'calling_list_entry'
    id            = db.Column(db.Integer, primary_key=True)
    company_name  = db.Column(db.String(200), nullable=True)
    contact_name  = db.Column(db.String(200), nullable=True)
    phone         = db.Column(db.String(30), nullable=False)
    email         = db.Column(db.String(200), nullable=True)
    address       = db.Column(db.Text, nullable=True)
    notes         = db.Column(db.Text, nullable=True)
    # Smart-filter score (0–100) — set by future ML pipeline; default 50
    priority_score = db.Column(db.Float, default=50.0)
    # Status tracking
    status        = db.Column(db.String(30), default='new')   # new | called | converted | dnc
    last_called   = db.Column(db.DateTime, nullable=True)
    assigned_to   = db.Column(db.Integer, db.ForeignKey('staff_user.id'), nullable=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    uploaded_by   = db.Column(db.Integer, db.ForeignKey('staff_user.id'), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'company_name': self.company_name or '',
            'contact_name': self.contact_name or '',
            'phone': self.phone,
            'email': self.email or '',
            'address': self.address or '',
            'notes': self.notes or '',
            'priority_score': self.priority_score,
            'status': self.status,
            'last_called': self.last_called.isoformat() if self.last_called else None,
            'assigned_to': self.assigned_to,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


@sales_rep_bp.route('/sales/calling-list', methods=['GET'])
@sales_rep_required
def get_calling_list_entries(staff):
    """Return all calling list entries (uploaded prospects + registered customers with phones)."""
    import re as _re

    sort_by    = request.args.get('sort', 'priority_score')   # priority_score | company_name | last_called | status
    sort_dir   = request.args.get('dir', 'desc')
    status_f   = request.args.get('status', '')               # filter by status
    search_q   = request.args.get('q', '').strip()

    # ── Uploaded prospects ──────────────────────────────────────────────────
    q = CallingListEntry.query
    if status_f:
        q = q.filter(CallingListEntry.status == status_f)
    if search_q:
        like = f'%{search_q}%'
        q = q.filter(
            (CallingListEntry.company_name.ilike(like)) |
            (CallingListEntry.contact_name.ilike(like)) |
            (CallingListEntry.phone.ilike(like))
        )
    entries = q.all()
    result = [e.to_dict() for e in entries]

    # ── Registered customers with phones (merged view) ──────────────────────
    # Build a set of phones already covered by CallingListEntry rows so we
    # don't show the same person twice in the list.
    existing_phones = {e.phone for e in CallingListEntry.query.with_entities(CallingListEntry.phone).all()}
    customers = User.query.filter(
        User.phone.isnot(None), User.phone != '', User.is_active == True
    ).all()
    for c in customers:
        # Skip if this phone already has a dedicated CallingListEntry
        if (c.phone or '').strip() in existing_phones:
            continue
        orders = Order.query.filter_by(user_id=c.id).order_by(Order.created_at.desc()).all()
        last_order = orders[0] if orders else None
        total_spend = sum(o.total_amount for o in orders)
        result.append({
            'id': f'cust-{c.id}',
            'source': 'customer',
            'company_name': c.company_name or '',
            'contact_name': c.full_name or c.username,
            'phone': c.phone or '',
            'email': c.email or '',
            'address': c.shipping_address or '',
            'notes': '',
            'priority_score': min(100, 50 + len(orders) * 5),
            'status': 'customer',
            'last_called': last_order.created_at.isoformat() if last_order else None,
            'order_count': len(orders),
            'total_spend': round(total_spend, 2),
            'customer_id': c.id,
        })

    # ── Sort ────────────────────────────────────────────────────────────────
    reverse = sort_dir == 'desc'
    if sort_by == 'company_name':
        result.sort(key=lambda x: (x.get('company_name') or '').lower(), reverse=reverse)
    elif sort_by == 'last_called':
        result.sort(key=lambda x: x.get('last_called') or '', reverse=reverse)
    elif sort_by == 'status':
        result.sort(key=lambda x: x.get('status') or '', reverse=reverse)
    else:  # priority_score (default)
        result.sort(key=lambda x: x.get('priority_score', 50), reverse=reverse)

    return jsonify({'entries': result, 'total': len(result)})


@sales_rep_bp.route('/sales/calling-list', methods=['POST'])
@sales_rep_required
def add_calling_list_entry(staff):
    """Add a single prospect to the calling list."""
    data = request.json or {}
    phone = (data.get('phone') or '').strip()
    if not phone:
        return jsonify({'error': 'phone is required'}), 400
    entry = CallingListEntry(
        company_name  = (data.get('company_name') or '').strip() or None,
        contact_name  = (data.get('contact_name') or '').strip() or None,
        phone         = phone,
        email         = (data.get('email') or '').strip() or None,
        address       = (data.get('address') or '').strip() or None,
        notes         = (data.get('notes') or '').strip() or None,
        priority_score= float(data.get('priority_score', 50)),
        status        = data.get('status', 'new'),
        uploaded_by   = staff.id,
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify({'success': True, 'entry': entry.to_dict()}), 201


@sales_rep_bp.route('/sales/calling-list/<int:entry_id>', methods=['PUT'])
@sales_rep_required
def update_calling_list_entry(staff, entry_id):
    """Update a calling list entry (status, notes, last_called, etc.)."""
    entry = CallingListEntry.query.get_or_404(entry_id)
    data = request.json or {}
    for field in ('company_name', 'contact_name', 'phone', 'email', 'address', 'notes', 'status'):
        if field in data:
            setattr(entry, field, data[field])
    if 'priority_score' in data:
        entry.priority_score = float(data['priority_score'])
    if data.get('mark_called'):
        entry.last_called = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'entry': entry.to_dict()})


@sales_rep_bp.route('/sales/calling-list/<int:entry_id>', methods=['DELETE'])
@sales_rep_required
def delete_calling_list_entry(staff, entry_id):
    """Delete a calling list entry."""
    entry = CallingListEntry.query.get_or_404(entry_id)
    db.session.delete(entry)
    db.session.commit()
    return jsonify({'success': True})


@sales_rep_bp.route('/sales/calling-list/upload-csv', methods=['POST'])
@sales_rep_required
def upload_calling_list_csv(staff):
    """
    Bulk-upload prospects from CSV.
    Expected columns: company_name, contact_name, phone, email, address, notes, priority_score
    """
    import csv, io as _io
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    f = request.files['file']
    if not f.filename.lower().endswith('.csv'):
        return jsonify({'error': 'File must be a .csv'}), 400
    try:
        stream = _io.StringIO(f.stream.read().decode('utf-8-sig'))
        reader = csv.DictReader(stream)
    except Exception as e:
        return jsonify({'error': f'Could not read file: {e}'}), 400

    created = 0
    skipped = 0
    errors  = []
    for i, row in enumerate(reader, start=2):
        phone = (row.get('phone') or '').strip()
        if not phone:
            skipped += 1
            errors.append(f'Row {i}: phone is required — skipped')
            continue
        try:
            score_raw = (row.get('priority_score') or '50').strip()
            score = float(score_raw) if score_raw else 50.0
        except ValueError:
            score = 50.0
        entry = CallingListEntry(
            company_name  = (row.get('company_name') or '').strip() or None,
            contact_name  = (row.get('contact_name') or '').strip() or None,
            phone         = phone,
            email         = (row.get('email') or '').strip() or None,
            address       = (row.get('address') or '').strip() or None,
            notes         = (row.get('notes') or '').strip() or None,
            priority_score= score,
            status        = 'new',
            uploaded_by   = staff.id,
        )
        db.session.add(entry)
        created += 1
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database commit failed: {e}'}), 500
    return jsonify({'success': True, 'created': created, 'skipped': skipped, 'errors': errors})


# ─── Staff: send payment SMS for a specific order ─────────────────────────────

@sales_rep_bp.route('/sales/send-payment-sms', methods=['POST'])
@sales_rep_required
def staff_send_payment_sms(staff):
    """
    Staff-facing wrapper around the payment SMS endpoint.
    Body: { order_number, phone_number, payment_method }
    Delegates to the existing /api/voice/send_payment_sms logic.
    """
    import os as _os
    from src.routes.payment_links import send_payment_sms as _send
    # Re-use the existing implementation by calling it directly via internal request context
    # Since we can't call Flask routes internally, we duplicate the core logic here.
    data = request.json or {}
    order_number   = (data.get('order_number') or '').strip()
    phone_number   = (data.get('phone_number') or '').strip()
    payment_method = (data.get('payment_method') or 'net30').strip().lower()

    if not order_number:
        return jsonify({'success': False, 'error': 'order_number is required'}), 400
    if not phone_number:
        return jsonify({'success': False, 'error': 'phone_number is required'}), 400

    order = Order.query.filter_by(order_number=order_number).first()
    if not order:
        return jsonify({'success': False, 'error': f'Order {order_number} not found'}), 404

    import re as _re
    digits = _re.sub(r'\D', '', phone_number)
    if len(digits) == 11 and digits[0] == '1':
        digits = digits[1:]
    if len(digits) != 10:
        return jsonify({'success': False, 'error': 'Invalid phone number'}), 400
    to_phone = f'+1{digits}'

    total = order.total_amount or 0.0
    FRONTEND_URL = _os.environ.get('FRONTEND_URL', 'https://lldrestaurantsupply.com')
    LLD_PHONE    = _os.environ.get('LLD_PHONE', '(775) 591-5629')

    if payment_method == 'net30':
        sms_body = (
            f'RS LLD Restaurant Supply — Order {order_number} confirmed! '
            f'Total: ${total:.2f}. Payment due in 30 days. '
            f'Invoice emailed to your address on file. '
            f'Questions? Call {LLD_PHONE}. Reply STOP to opt out.'
        )
        order.payment_method = 'net30'
    elif payment_method == 'credit_card':
        payment_url = f'{FRONTEND_URL}/pay/{order_number}'
        try:
            import stripe
            stripe.api_key = _os.environ.get('STRIPE_SECRET_KEY', '')
            amount_cents = int(round(total * 100))
            if amount_cents > 0:
                price = stripe.Price.create(
                    unit_amount=amount_cents, currency='usd',
                    product_data={'name': f'RS LLD Order {order_number}'},
                )
                link = stripe.PaymentLink.create(
                    line_items=[{'price': price.id, 'quantity': 1}],
                    metadata={'order_number': order_number},
                    after_completion={
                        'type': 'redirect',
                        'redirect': {'url': f'{FRONTEND_URL}/order-confirmation?order={order_number}'},
                    },
                )
                payment_url = link.url
                order.stripe_payment_link = payment_url
        except Exception:
            pass
        order.payment_method = 'credit_card'
        sms_body = (
            f'RS LLD Restaurant Supply — Complete your order {order_number} (${total:.2f}): '
            f'{payment_url} — Secure link expires in 24 hours. Reply STOP to opt out.'
        )
    else:  # check
        payment_url = f'{FRONTEND_URL}/pay/{order_number}'
        order.payment_method = 'check'
        order.payment_status = 'pending_review'
        sms_body = (
            f'RS LLD Restaurant Supply — Upload your check for order {order_number} (${total:.2f}): '
            f'{payment_url} — Please photograph front and back. Reply STOP to opt out.'
        )
    db.session.commit()

    twilio_sid   = _os.environ.get('TWILIO_ACCOUNT_SID', '')
    twilio_token = _os.environ.get('TWILIO_AUTH_TOKEN', '')
    twilio_from  = _os.environ.get('TWILIO_PHONE_NUMBER', '')

    if not twilio_sid or not twilio_token or not twilio_from:
        return jsonify({
            'success': False,
            'error': 'Twilio not configured on the server.',
            'sms_preview': sms_body,
        }), 500

    try:
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(twilio_sid, twilio_token)
        msg = client.messages.create(body=sms_body, from_=twilio_from, to=to_phone)
        return jsonify({
            'success': True,
            'sms_sid': msg.sid,
            'to': to_phone,
            'order_number': order_number,
            'amount': total,
            'payment_method': payment_method,
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'sms_preview': sms_body}), 500
