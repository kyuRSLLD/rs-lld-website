from flask import Blueprint, request, jsonify, session
from datetime import datetime, timedelta
import random
import string
import os
import jwt

from src.models.user import db
from src.models.order import Order, OrderItem
from src.models.product import Product
from src.routes.user import login_required


def _get_jwt_secret():
    return os.environ.get('SECRET_KEY', 'REDACTED_SECRET_KEY')


def _verify_staff_jwt(token):
    """Decode a staff JWT token. Returns staff_id on success, None on failure."""
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=['HS256'])
        return payload.get('staff_id')
    except Exception:
        return None

order_bp = Blueprint('order', __name__)


def generate_order_number():
    """Generate a unique order number like RS-2026-A3F7"""
    year = datetime.utcnow().year
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"RS-{year}-{suffix}"


def deduct_stock(items, restore=False):
    """Deduct (or restore) stock_quantity for each item in an order.
    restore=True is used when an order is cancelled."""
    for item in items:
        product = Product.query.get(item.product_id) if hasattr(item, 'product_id') else Product.query.get(item.get('product_id'))
        if not product:
            continue
        qty = item.quantity if hasattr(item, 'quantity') else int(item.get('quantity', 1))
        if restore:
            product.stock_quantity = (product.stock_quantity or 0) + qty
            if product.stock_quantity > 0:
                product.in_stock = True
        else:
            new_qty = max(0, (product.stock_quantity or 0) - qty)
            product.stock_quantity = new_qty
            if new_qty == 0:
                product.in_stock = False


def calculate_order_totals(items_data):
    """Calculate subtotal, discount, delivery fee, and total for a list of cart items."""
    subtotal = 0.0
    discount = 0.0

    for item in items_data:
        product = Product.query.get(item['product_id'])
        if not product:
            continue
        qty = item['quantity']
        # Apply bulk pricing if applicable
        if product.bulk_price and product.bulk_quantity and qty >= product.bulk_quantity:
            unit_price = product.bulk_price
            discount += (product.unit_price - product.bulk_price) * qty
        else:
            unit_price = product.unit_price
        subtotal += unit_price * qty

    # Free delivery over $100, otherwise $25
    delivery_fee = 0.0 if subtotal >= 100 else 25.0
    total = subtotal + delivery_fee

    return subtotal, discount, delivery_fee, total


# ─── Customer-facing order endpoints ────────────────────────────────────────

@order_bp.route('/orders', methods=['POST'])
def create_order():
    """Place a new order. Works for both logged-in and guest customers."""
    try:
        data = request.json
        items_data = data.get('items', [])

        if not items_data:
            return jsonify({'error': 'Order must contain at least one item'}), 400

        # Validate required delivery fields
        required = ['delivery_name', 'delivery_address', 'delivery_city', 'delivery_state', 'delivery_zip']
        for field in required:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        subtotal, discount, delivery_fee, total = calculate_order_totals(items_data)

        # Generate unique order number
        order_number = generate_order_number()
        while Order.query.filter_by(order_number=order_number).first():
            order_number = generate_order_number()

        order = Order(
            order_number=order_number,
            user_id=session.get('user_id'),
            status='pending',
            delivery_name=data['delivery_name'],
            delivery_company=data.get('delivery_company', ''),
            delivery_address=data['delivery_address'],
            delivery_city=data['delivery_city'],
            delivery_state=data['delivery_state'],
            delivery_zip=data['delivery_zip'],
            delivery_phone=data.get('delivery_phone', ''),
            special_notes=data.get('special_notes', ''),
            subtotal=subtotal,
            discount_amount=discount,
            delivery_fee=delivery_fee,
            total_amount=total,
            payment_method=data.get('payment_method', 'net30'),
            payment_status='pending',
        )
        db.session.add(order)
        db.session.flush()  # get order.id before adding items

        # Save shipping and billing addresses to the user profile (if logged in)
        from src.models.user import User as _User
        _uid = session.get('user_id')
        if _uid:
            _user = _User.query.get(_uid)
            if _user:
                # Build formatted shipping address from delivery fields
                _ship_parts = [
                    data['delivery_address'],
                    data['delivery_city'],
                    data['delivery_state'],
                    data['delivery_zip'],
                ]
                _user.shipping_address = ', '.join(p for p in _ship_parts if p)
                # Billing address: use explicit billing_address if provided, else same as shipping
                _billing = data.get('billing_address', '').strip()
                if _billing:
                    _user.billing_address = _billing
                elif not _user.billing_address:
                    _user.billing_address = _user.shipping_address

        # Create order items
        for item_data in items_data:
            product = Product.query.get(item_data['product_id'])
            if not product:
                continue
            qty = item_data['quantity']
            is_bulk = bool(product.bulk_price and product.bulk_quantity and qty >= product.bulk_quantity)
            unit_price = product.bulk_price if is_bulk else product.unit_price
            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                product_sku=product.sku,
                product_brand=product.brand,
                product_unit_size=product.unit_size,
                quantity=qty,
                unit_price=unit_price,
                is_bulk_price=is_bulk,
                line_total=unit_price * qty,
            )
            db.session.add(order_item)
        # Deduct stock for each item ordered
        deduct_stock(items_data)
        db.session.commit()

        # Send order confirmation email (non-blocking)
        try:
            from src.utils.email import send_order_confirmation
            send_order_confirmation(order)
        except Exception as _email_err:
            print(f"[EMAIL] Order confirmation failed: {_email_err}")

        return jsonify({
            'success': True,
            'message': 'Order placed successfully',
            'order': order.to_dict(include_items=True),
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Order creation error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@order_bp.route('/orders', methods=['GET'])
@login_required
def get_my_orders():
    """Get all orders for the currently logged-in customer."""
    user_id = session['user_id']
    orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict(include_items=True) for o in orders])


@order_bp.route('/orders/<string:order_number>', methods=['GET'])
def get_order_by_number(order_number):
    """Get a specific order by order number (for tracking, no auth required)."""
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    # Only allow if the order belongs to the logged-in user, or no user is logged in (guest tracking)
    if session.get('user_id') and order.user_id and order.user_id != session['user_id']:
        return jsonify({'error': 'Access denied'}), 403
    return jsonify(order.to_dict(include_items=True))


@order_bp.route('/orders/<string:order_number>/reorder', methods=['POST'])
@login_required
def reorder(order_number):
    """Return the items from a previous order so the customer can reorder quickly."""
    order = Order.query.filter_by(order_number=order_number, user_id=session['user_id']).first_or_404()
    items = []
    for item in order.items:
        if item.product and item.product.in_stock:
            items.append({
                'product_id': item.product_id,
                'product_name': item.product_name,
                'product_sku': item.product_sku,
                'quantity': item.quantity,
                'unit_price': item.product.unit_price,
                'bulk_price': item.product.bulk_price,
                'bulk_quantity': item.product.bulk_quantity,
            })
    return jsonify({'success': True, 'items': items})


# ─── Staff / Internal order management endpoints ─────────────────────────────

def staff_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        # Accept JWT token from Authorization header (cross-domain support)
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            staff_id = _verify_staff_jwt(token)
            if staff_id:
                # Inject staff_id into session-like context via g
                from flask import g
                g.staff_id = staff_id
                return f(*args, **kwargs)
            return jsonify({'error': 'Invalid or expired token'}), 401
        # Fall back to session cookie
        if 'staff_id' not in session:
            return jsonify({'error': 'Staff authentication required'}), 401
        return f(*args, **kwargs)
    return decorated


def get_current_staff_id():
    """Get staff_id from either JWT (g.staff_id) or session."""
    from flask import g
    return getattr(g, 'staff_id', None) or session.get('staff_id')


@order_bp.route('/staff/login', methods=['POST'])
def staff_login():
    from src.models.order import StaffUser
    data = request.json
    staff = StaffUser.query.filter_by(username=data.get('username')).first()
    if staff and staff.check_password(data.get('password', '')):
        session['staff_id'] = staff.id
        # Also issue a JWT token for cross-domain auth (Bluehost frontend -> Railway backend)
        token = jwt.encode(
            {'staff_id': staff.id, 'exp': datetime.utcnow() + timedelta(days=30)},
            _get_jwt_secret(),
            algorithm='HS256'
        )
        return jsonify({'success': True, 'staff': staff.to_dict(), 'token': token})
    return jsonify({'error': 'Invalid credentials'}), 401


@order_bp.route('/staff/logout', methods=['POST'])
def staff_logout():
    session.pop('staff_id', None)
    return jsonify({'success': True})


@order_bp.route('/staff/me', methods=['GET'])
@staff_required
def get_staff_me():
    from src.models.order import StaffUser
    staff = StaffUser.query.get(get_current_staff_id())
    return jsonify(staff.to_dict())


@order_bp.route('/staff/orders', methods=['GET'])
@staff_required
def staff_get_orders():
    """Get all orders with optional status filter."""
    status = request.args.get('status', '')
    query = Order.query
    if status:
        query = query.filter_by(status=status)
    orders = query.order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict(include_items=True) for o in orders])


@order_bp.route('/staff/orders/<int:order_id>/status', methods=['PUT'])
@staff_required
def update_order_status(order_id):
    """Update the status of an order."""
    order = Order.query.get_or_404(order_id)
    data = request.json
    new_status = data.get('status')

    valid_statuses = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']
    if new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of: {valid_statuses}'}), 400

    old_status = order.status
    order.status = new_status
    now = datetime.utcnow()
    if new_status == 'confirmed':
        order.confirmed_at = now
    elif new_status == 'shipped':
        order.shipped_at = now
    elif new_status == 'delivered':
        order.delivered_at = now
        order.payment_status = 'paid'
    elif new_status == 'cancelled' and old_status != 'cancelled':
        # Restore stock quantities when an order is cancelled
        deduct_stock(order.items, restore=True)
        # Issue Stripe refund if the order was paid by credit card
        refund_result = None
        if order.payment_method == 'credit_card' and order.payment_intent_id and order.payment_status == 'paid':
            try:
                import stripe as _stripe
                import os as _os
                _stripe.api_key = _os.environ.get('STRIPE_SECRET_KEY', '')
                refund = _stripe.Refund.create(
                    payment_intent=order.payment_intent_id,
                    reason='requested_by_customer',
                    metadata={
                        'order_number': order.order_number,
                        'cancelled_by': session.get('staff_username', 'staff'),
                    }
                )
                order.payment_status = 'refunded'
                refund_result = {
                    'refund_id': refund.id,
                    'amount': refund.amount / 100,  # convert cents to dollars
                    'status': refund.status,
                }
                print(f"[REFUND] Stripe refund issued for order {order.order_number}: {refund.id} (${refund.amount/100:.2f})")
            except Exception as _refund_err:
                # Don't block cancellation if refund fails — log it for manual follow-up
                print(f"[REFUND ERROR] Failed to refund order {order.order_number}: {_refund_err}")
                refund_result = {'error': str(_refund_err)}
    if data.get('staff_notes'):
        order.staff_notes = data['staff_notes']
    if data.get('assigned_to'):
        order.assigned_to = data['assigned_to']
    db.session.commit()

    # Send status update email to customer (non-blocking)
    # Only send for confirmed and cancelled — not packed/shipped/delivered
    if new_status in ('confirmed', 'cancelled'):
        try:
            from src.utils.email import send_order_status_update
            send_order_status_update(order)
        except Exception as _email_err:
            print(f"[EMAIL] Status update email failed: {_email_err}")

    response = {'success': True, 'order': order.to_dict(include_items=True)}
    if new_status == 'cancelled' and 'refund_result' in dir():
        response['refund'] = refund_result
    return jsonify(response)


@order_bp.route('/staff/orders/<int:order_id>/notes', methods=['PUT'])
@staff_required
def update_order_notes(order_id):
    order = Order.query.get_or_404(order_id)
    data = request.json
    order.staff_notes = data.get('staff_notes', order.staff_notes)
    order.assigned_to = data.get('assigned_to', order.assigned_to)
    db.session.commit()
    return jsonify({'success': True, 'order': order.to_dict()})


@order_bp.route('/staff/stats', methods=['GET'])
@staff_required
def staff_stats():
    """Dashboard stats for the internal portal. Supports ?range=7d|30d|month|all"""
    from sqlalchemy import func
    date_range = request.args.get('range', 'all')
    now = datetime.utcnow()
    if date_range == '7d':
        since = now - timedelta(days=7)
    elif date_range == '30d':
        since = now - timedelta(days=30)
    elif date_range == 'month':
        since = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        since = None

    def count_q(status=None):
        base = Order.query
        if since:
            base = base.filter(Order.created_at >= since)
        if status:
            base = base.filter_by(status=status)
        return base.count()

    def rev_q():
        base = db.session.query(func.sum(Order.total_amount)).filter(
            Order.status.in_(['confirmed', 'packed', 'shipped', 'delivered'])
        )
        if since:
            base = base.filter(Order.created_at >= since)
        return base.scalar() or 0

    total_orders = count_q()
    pending = count_q('pending')
    confirmed = count_q('confirmed')
    packed = count_q('packed')
    shipped = count_q('shipped')
    delivered = count_q('delivered')
    cancelled = count_q('cancelled')
    total_revenue = rev_q()

    return jsonify({
        'total_orders': total_orders,
        'pending': pending,
        'confirmed': confirmed,
        'packed': packed,
        'shipped': shipped,
        'delivered': delivered,
        'cancelled': cancelled,
        'total_revenue': round(total_revenue, 2),
        'needs_attention': pending + confirmed,
    })


@order_bp.route('/staff/customers/search', methods=['GET'])
@staff_required
def staff_search_customers():
    """Search customers by name, company, or phone for autofill in Create Order."""
    from src.models.user import User
    q = request.args.get('q', '').strip()
    # Also search past orders for guest customers
    results = []
    seen = set()
    if q and len(q) >= 2:
        # Registered users
        users = User.query.filter(
            (User.username.ilike(f'%{q}%')) |
            (User.company_name.ilike(f'%{q}%')) |
            (User.phone.ilike(f'%{q}%'))
        ).limit(10).all()
        for u in users:
            # Get most recent order for address
            last_order = Order.query.filter_by(user_id=u.id).order_by(Order.created_at.desc()).first()
            key = f'user-{u.id}'
            if key not in seen:
                seen.add(key)
                results.append({
                    'source': 'customer',
                    'name': u.username,
                    'company': u.company_name or '',
                    'phone': u.phone or '',
                    'address': last_order.delivery_address if last_order else '',
                    'city': last_order.delivery_city if last_order else '',
                    'state': last_order.delivery_state if last_order else '',
                    'zip': last_order.delivery_zip if last_order else '',
                })
        # Guest orders
        orders = Order.query.filter(
            (Order.delivery_name.ilike(f'%{q}%')) |
            (Order.delivery_company.ilike(f'%{q}%')) |
            (Order.delivery_phone.ilike(f'%{q}%'))
        ).order_by(Order.created_at.desc()).limit(20).all()
        for o in orders:
            key = f'{o.delivery_name}|{o.delivery_address}'
            if key not in seen:
                seen.add(key)
                results.append({
                    'source': 'order',
                    'name': o.delivery_name,
                    'company': o.delivery_company or '',
                    'phone': o.delivery_phone or '',
                    'address': o.delivery_address,
                    'city': o.delivery_city,
                    'state': o.delivery_state,
                    'zip': o.delivery_zip,
                })
    return jsonify(results[:10])


@order_bp.route('/staff/customers', methods=['GET'])
@staff_required
def staff_get_customers():
    """Get all registered customers with their order counts."""
    from src.models.user import User
    from sqlalchemy import func
    users = User.query.all()
    result = []
    for u in users:
        order_count = Order.query.filter_by(user_id=u.id).count()
        total_spent = db.session.query(func.sum(Order.total_amount)).filter_by(user_id=u.id).scalar() or 0
        d = u.to_dict()
        d['order_count'] = order_count
        d['total_spent'] = round(total_spent, 2)
        result.append(d)
    return jsonify(result)


@order_bp.route('/staff/inventory', methods=['GET'])
@staff_required
def staff_inventory():
    """Get all products for inventory management."""
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products])


@order_bp.route('/staff/inventory/<int:product_id>', methods=['PUT'])
@staff_required
def update_inventory(product_id):
    """Update product stock status or price."""
    product = Product.query.get_or_404(product_id)
    data = request.json
    if 'in_stock' in data:
        product.in_stock = data['in_stock']
    if 'unit_price' in data:
        product.unit_price = data['unit_price']
    if 'bulk_price' in data:
        product.bulk_price = data['bulk_price']
    if 'stock_quantity' in data:
        qty = max(0, int(data['stock_quantity']))
        product.stock_quantity = qty
        # Auto-update in_stock based on quantity
        product.in_stock = qty > 0
    db.session.commit()
    return jsonify({'success': True, 'product': product.to_dict()})


@order_bp.route('/staff/orders', methods=['POST'])
@staff_required
def staff_create_order():
    """Manually create an order from the staff portal (for order history population)."""
    try:
        data = request.json
        items_data = data.get('items', [])

        if not items_data:
            return jsonify({'error': 'Order must contain at least one item'}), 400

        required = ['delivery_name', 'delivery_address', 'delivery_city', 'delivery_state', 'delivery_zip']
        for field in required:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        # Calculate totals from provided items (staff can override prices)
        subtotal = 0.0
        for item in items_data:
            qty = float(item.get('quantity', 1))
            price = float(item.get('unit_price', 0))
            subtotal += qty * price

        discount_amount = float(data.get('discount_amount', 0.0))
        delivery_fee = float(data.get('delivery_fee', 0.0 if subtotal >= 100 else 25.0))
        total_amount = subtotal - discount_amount + delivery_fee

        # Generate unique order number
        order_number = data.get('order_number', '').strip()
        if order_number:
            # Validate it's not already taken
            if Order.query.filter_by(order_number=order_number).first():
                return jsonify({'error': f'Order number {order_number} already exists'}), 400
        else:
            order_number = generate_order_number()
            while Order.query.filter_by(order_number=order_number).first():
                order_number = generate_order_number()

        # Parse optional back-dated created_at
        created_at = datetime.utcnow()
        if data.get('created_at'):
            try:
                created_at = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00').replace('+00:00', ''))
            except Exception:
                pass

        order = Order(
            order_number=order_number,
            user_id=None,
            status=data.get('status', 'pending'),
            delivery_name=data['delivery_name'],
            delivery_company=data.get('delivery_company', ''),
            delivery_address=data['delivery_address'],
            delivery_city=data['delivery_city'],
            delivery_state=data['delivery_state'],
            delivery_zip=data['delivery_zip'],
            delivery_phone=data.get('delivery_phone', ''),
            special_notes=data.get('special_notes', ''),
            subtotal=round(subtotal, 2),
            discount_amount=round(discount_amount, 2),
            delivery_fee=round(delivery_fee, 2),
            total_amount=round(total_amount, 2),
            payment_method=data.get('payment_method', 'net30'),
            payment_status=data.get('payment_status', 'paid'),
            staff_notes=data.get('staff_notes', 'Manually entered by staff'),
            assigned_to=data.get('assigned_to', ''),
            created_at=created_at,
        )

        # Set status timestamps
        if order.status in ('confirmed', 'packed', 'shipped', 'delivered'):
            order.confirmed_at = created_at
        if order.status in ('shipped', 'delivered'):
            order.shipped_at = created_at
        if order.status == 'delivered':
            order.delivered_at = created_at

        db.session.add(order)
        db.session.flush()  # get order.id before adding items

        for item in items_data:
            product_id = item.get('product_id')
            product = Product.query.get(product_id) if product_id else None
            qty = int(item.get('quantity', 1))
            unit_price = float(item.get('unit_price', 0))
            order_item = OrderItem(
                order_id=order.id,
                product_id=product_id,
                product_name=item.get('product_name', product.name if product else 'Custom Item'),
                product_sku=item.get('product_sku', product.sku if product else 'CUSTOM'),
                product_brand=item.get('product_brand', product.brand if product else ''),
                product_unit_size=item.get('product_unit_size', product.unit_size if product else ''),
                quantity=qty,
                unit_price=unit_price,
                is_bulk_price=item.get('is_bulk_price', False),
                line_total=round(qty * unit_price, 2),
            )
            db.session.add(order_item)
        # Deduct stock for each item in the staff-created order
        deduct_stock(items_data)
        db.session.commit()
        return jsonify({'success': True, 'order': order.to_dict(include_items=True)}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@order_bp.route('/staff/orders/<int:order_id>', methods=['DELETE'])
@staff_required
def staff_delete_order(order_id):
    """Delete an order (admin use — for removing test/duplicate entries)."""
    order = Order.query.get_or_404(order_id)
    db.session.delete(order)
    db.session.commit()
    return jsonify({'success': True})


@order_bp.route('/staff/test-email', methods=['POST'])
@staff_required
def staff_test_email():
    """Send a test email to verify SMTP configuration. Staff only."""
    import os as _os
    from src.utils.email import send_email, SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT

    data = request.json or {}
    to_addr = data.get('to', SMTP_USER)

    # Report config status (without revealing the password)
    config_status = {
        'SMTP_HOST': SMTP_HOST,
        'SMTP_PORT': SMTP_PORT,
        'SMTP_USER': SMTP_USER if SMTP_USER else '(not set)',
        'SMTP_PASSWORD': '(set, {} chars)'.format(len(SMTP_PASS)) if SMTP_PASS else '(not set)',
        'sending_to': to_addr,
    }

    if not SMTP_USER or not SMTP_PASS:
        return jsonify({
            'success': False,
            'error': 'SMTP credentials not configured. Set SMTP_USER and SMTP_PASSWORD in Railway environment variables.',
            'config': config_status,
        }), 500

    html = """
    <h2 style="color:#1c1917;font-size:20px;margin:0 0 16px;">Test Email ✅</h2>
    <p style="color:#57534e;font-size:14px;">
      This is a test email from RS LLD Restaurant Supply.<br>
      If you received this, your SMTP configuration is working correctly.
    </p>
    <p style="color:#a8a29e;font-size:12px;margin-top:24px;">
      Sent from the Staff Portal test email function.
    </p>
    """
    from src.utils.email import _wrap
    full_html = _wrap('Test Email', html)

    ok = send_email(to_addr, 'RS LLD — Test Email (SMTP Check)', full_html,
                    'This is a test email from RS LLD Restaurant Supply. SMTP is working.')

    return jsonify({
        'success': ok,
        'config': config_status,
        'message': f'Test email sent to {to_addr}' if ok else 'Failed to send — check Railway logs for SMTP error details.',
    })
