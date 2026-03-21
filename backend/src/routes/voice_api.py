"""
ElevenLabs Voice Agent — Webhook API
=====================================
Five endpoints designed for ElevenLabs tool-calling webhooks:

  POST /api/voice/get_customer       — look up a customer by phone number
  POST /api/voice/get_products       — search / list available products
  POST /api/voice/place_order        — place a new order by phone + SKU list
  POST /api/voice/check_order_status — look up order status by order number or phone
  POST /api/voice/cancel_order       — cancel a pending/confirmed order

Authentication
--------------
Every request must include the header:
    X-Voice-Secret: <ELEVENLABS_VOICE_SECRET>

The secret is stored in the ELEVENLABS_VOICE_SECRET environment variable on Railway.
Set it to any long random string (e.g. openssl rand -hex 32).

Phone number normalisation
--------------------------
ElevenLabs passes caller phone numbers in E.164 format (+17735551234).
We strip all non-digit characters for comparison so stored numbers like
"(773) 555-1234", "773-555-1234", or "+17735551234" all match.
"""

import os
import re
from datetime import datetime
from flask import Blueprint, request, jsonify
from src.models.user import db, User
from src.models.product import Product
from src.models.order import Order, OrderItem

voice_api_bp = Blueprint('voice_api', __name__)

# ── Auth helper ───────────────────────────────────────────────────────────────

def _check_secret():
    """Return True if the request carries the correct voice secret."""
    expected = os.environ.get('ELEVENLABS_VOICE_SECRET', '')
    if not expected:
        # If env var not set, reject all requests for safety
        return False
    provided = request.headers.get('X-Voice-Secret', '')
    return provided == expected


def _auth_error():
    return jsonify({
        'success': False,
        'error': 'Unauthorized — invalid or missing X-Voice-Secret header'
    }), 401


# ── Phone normalisation ───────────────────────────────────────────────────────

def _normalize_phone(phone: str) -> str:
    """Strip everything except digits. E.164 +17735551234 → 17735551234."""
    if not phone:
        return ''
    return re.sub(r'\D', '', phone)


def _find_user_by_phone(phone: str):
    """
    Match a phone number against all users.
    Compares digit-only versions to handle any formatting differences.
    Returns the User object or None.
    """
    normalized = _normalize_phone(phone)
    if not normalized:
        return None
    # Pull all users with a phone set and compare digit-stripped versions
    users = User.query.filter(User.phone.isnot(None)).all()
    for user in users:
        if _normalize_phone(user.phone) == normalized:
            return user
    return None


# ── 1. get_customer ───────────────────────────────────────────────────────────

@voice_api_bp.route('/voice/get_customer', methods=['POST'])
def get_customer():
    """
    Look up a registered customer by phone number.

    Request body:
        { "phone_number": "+17735551234" }

    Response (found):
        {
          "success": true,
          "customer": {
            "name": "John Smith",
            "company": "Smith's Diner",
            "email": "john@smithsdiner.com",
            "phone": "+17735551234",
            "payment_method": "net30",
            "recent_orders": [...]
          }
        }
    """
    if not _check_secret():
        return _auth_error()

    data = request.get_json(silent=True) or {}
    phone = data.get('phone_number', '')

    if not phone:
        return jsonify({'success': False, 'error': 'phone_number is required'}), 400

    user = _find_user_by_phone(phone)
    if not user:
        return jsonify({
            'success': False,
            'error': 'No customer found with that phone number.',
            'found': False
        })  # 200 OK — not-found is a normal agent flow, not an error

    # Get their last 5 orders for context
    recent_orders = (
        Order.query
        .filter_by(user_id=user.id)
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )

    return jsonify({
        'success': True,
        'found': True,
        'customer': {
            'id': user.id,
            'name': user.username,
            'company': user.company_name,
            'email': user.email,
            'phone': user.phone,
            'recent_orders': [
                {
                    'order_number': o.order_number,
                    'status': o.status,
                    'total': o.total_amount,
                    'date': o.created_at.strftime('%Y-%m-%d') if o.created_at else None,
                    'item_count': len(o.items),
                }
                for o in recent_orders
            ]
        }
    })


# ── 2. get_products ───────────────────────────────────────────────────────────

@voice_api_bp.route('/voice/get_products', methods=['POST'])
def get_products():
    """
    Search or list available products.

    Request body (all optional):
        {
          "query":    "gloves",        // keyword search in name / brand / SKU
          "category": "Disposables",   // filter by category name
          "in_stock_only": true        // default: true
        }

    Response:
        {
          "success": true,
          "count": 5,
          "products": [
            {
              "sku": "GLV-MED-BLK",
              "name": "Black Nitrile Gloves Medium",
              "brand": "SafeHands",
              "unit_size": "100/box",
              "unit_price": 12.99,
              "bulk_price": 10.99,
              "bulk_quantity": 10,
              "in_stock": true,
              "stock_quantity": 48
            },
            ...
          ]
        }
    """
    if not _check_secret():
        return _auth_error()

    data = request.get_json(silent=True) or {}
    query = data.get('query', '').strip()
    category_filter = data.get('category', '').strip()
    in_stock_only = data.get('in_stock_only', True)

    q = Product.query

    if in_stock_only:
        q = q.filter(Product.in_stock == True, Product.stock_quantity > 0)

    if category_filter:
        from src.models.product import Category
        cat = Category.query.filter(
            Category.name.ilike(f'%{category_filter}%')
        ).first()
        if cat:
            q = q.filter(Product.category_id == cat.id)

    if query:
        like = f'%{query}%'
        q = q.filter(
            db.or_(
                Product.name.ilike(like),
                Product.brand.ilike(like),
                Product.sku.ilike(like),
                Product.description.ilike(like),
            )
        )

    products = q.order_by(Product.name).limit(20).all()

    return jsonify({
        'success': True,
        'count': len(products),
        'products': [
            {
                'sku': p.sku,
                'name': p.name,
                'brand': p.brand,
                'unit_size': p.unit_size,
                'unit_price': p.unit_price,
                'bulk_price': p.bulk_price,
                'bulk_quantity': p.bulk_quantity,
                'in_stock': p._in_stock_computed(),
                'stock_quantity': p.stock_quantity or 0,
            }
            for p in products
        ]
    })


# ── 3. place_order ────────────────────────────────────────────────────────────

@voice_api_bp.route('/voice/place_order', methods=['POST'])
def place_order():
    """
    Place a new order on behalf of a customer identified by phone number.
    Only call this AFTER the customer has verbally confirmed the order.

    Request body:
        {
          "phone_number": "+17735551234",
          "items": [
            { "sku": "GLV-MED-BLK", "qty": 3 },
            { "sku": "FOIL-HH-200", "qty": 1 }
          ],
          "confirmed": true,
          "special_notes": "Please deliver before noon",
          "payment_method": "net30"   // optional, defaults to net30
        }

    Response:
        {
          "success": true,
          "order_number": "RS-2026-AB1C",
          "total": 54.97,
          "items_placed": 2,
          "message": "Order RS-2026-AB1C placed successfully"
        }
    """
    if not _check_secret():
        return _auth_error()

    data = request.get_json(silent=True) or {}
    phone = data.get('phone_number', '')
    items = data.get('items', [])
    confirmed = data.get('confirmed', False)
    special_notes = data.get('special_notes', '')
    payment_method = data.get('payment_method', 'net30')

    if not confirmed:
        return jsonify({
            'success': False,
            'error': 'Order not confirmed. Set confirmed=true after customer verbally confirms.'
        }), 400

    if not phone:
        return jsonify({'success': False, 'error': 'phone_number is required'}), 400

    if not items:
        return jsonify({'success': False, 'error': 'items list is required and cannot be empty'}), 400

    user = _find_user_by_phone(phone)
    if not user:
        return jsonify({
            'success': False,
            'error': f'No customer found with phone number {phone}. '
                     'Customer must be registered before placing a voice order.'
        }), 404

    # Resolve products and calculate totals
    order_items_data = []
    errors = []
    subtotal = 0.0

    for item in items:
        sku = item.get('sku', '').strip().upper()
        # Accept both 'quantity' (spec) and 'qty' (legacy) keys
        qty = int(item.get('quantity', item.get('qty', 1)))

        if not sku or qty < 1:
            errors.append(f'Invalid item: {item}')
            continue

        product = Product.query.filter(
            db.func.upper(Product.sku) == sku
        ).first()

        if not product:
            errors.append(f'SKU not found: {sku}')
            continue

        if not product._in_stock_computed():
            errors.append(f'{product.name} ({sku}) is currently out of stock')
            continue

        # Apply bulk pricing if eligible
        if (product.bulk_price and product.bulk_quantity
                and qty >= product.bulk_quantity):
            unit_price = product.bulk_price
            is_bulk = True
        else:
            unit_price = product.unit_price
            is_bulk = False

        line_total = round(unit_price * qty, 2)
        subtotal += line_total

        order_items_data.append({
            'product': product,
            'qty': qty,
            'unit_price': unit_price,
            'is_bulk': is_bulk,
            'line_total': line_total,
        })

    if errors:
        return jsonify({
            'success': False,
            'error': 'Some items could not be resolved',
            'item_errors': errors
        }), 400

    # Generate order number
    import random, string
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    year = datetime.utcnow().year
    order_number = f'RS-{year}-{suffix}'

    # Delivery info from user profile
    delivery_fee = 0.0
    total = round(subtotal + delivery_fee, 2)

    order = Order(
        order_number=order_number,
        user_id=user.id,
        status='pending',
        delivery_name=user.username,
        delivery_company=user.company_name or '',
        delivery_address='',
        delivery_city='',
        delivery_state='',
        delivery_zip='',
        delivery_phone=user.phone,
        special_notes=f'[VOICE ORDER] {special_notes}'.strip(),
        payment_method=payment_method,
        subtotal=round(subtotal, 2),
        discount_amount=0.0,
        delivery_fee=delivery_fee,
        total_amount=total,
    )
    db.session.add(order)
    db.session.flush()  # get order.id before adding items

    for item_data in order_items_data:
        p = item_data['product']
        oi = OrderItem(
            order_id=order.id,
            product_id=p.id,
            product_name=p.name,
            product_sku=p.sku,
            product_brand=p.brand,
            product_unit_size=p.unit_size,
            quantity=item_data['qty'],
            unit_price=item_data['unit_price'],
            is_bulk_price=item_data['is_bulk'],
            line_total=item_data['line_total'],
        )
        db.session.add(oi)

    db.session.commit()

    return jsonify({
        'success': True,
        'order_number': order_number,
        'total': total,
        'subtotal': round(subtotal, 2),
        'items_placed': len(order_items_data),
        'message': f'Order {order_number} placed successfully for {user.username}. Total: ${total:.2f}',
    })


# ── 4. check_order_status ─────────────────────────────────────────────────────

@voice_api_bp.route('/voice/check_order_status', methods=['POST'])
def check_order_status():
    """
    Look up the status of an order by order number OR by phone number (returns most recent).

    Request body (provide one or both):
        {
          "order_number": "RS-2026-AB1C",
          "phone_number": "+17735551234"
        }

    Response:
        {
          "success": true,
          "order": {
            "order_number": "RS-2026-AB1C",
            "status": "shipped",
            "total": 54.97,
            "item_count": 2,
            "created_at": "2026-03-18",
            "items": [...]
          }
        }
    """
    if not _check_secret():
        return _auth_error()

    data = request.get_json(silent=True) or {}
    order_number = data.get('order_number', '').strip().upper()
    phone = data.get('phone_number', '').strip()

    order = None

    if order_number:
        order = Order.query.filter(
            db.func.upper(Order.order_number) == order_number
        ).first()

    if not order and phone:
        user = _find_user_by_phone(phone)
        if user:
            order = (
                Order.query
                .filter_by(user_id=user.id)
                .order_by(Order.created_at.desc())
                .first()
            )

    if not order:
        return jsonify({
            'success': False,
            'error': 'No order found matching the provided order number or phone number.'
        }), 404

    return jsonify({
        'success': True,
        'order': {
            'order_number': order.order_number,
            'status': order.status,
            'total': order.total_amount,
            'subtotal': order.subtotal,
            'delivery_fee': order.delivery_fee,
            'payment_method': order.payment_method,
            'payment_status': order.payment_status,
            'item_count': len(order.items),
            'created_at': order.created_at.strftime('%Y-%m-%d') if order.created_at else None,
            'special_notes': order.special_notes,
            'items': [
                {
                    'sku': i.product_sku,
                    'name': i.product_name,
                    'quantity': i.quantity,
                    'unit_price': i.unit_price,
                    'line_total': i.line_total,
                }
                for i in order.items
            ]
        }
    })


# ── 5. cancel_order ───────────────────────────────────────────────────────────

@voice_api_bp.route('/voice/cancel_order', methods=['POST'])
def cancel_order():
    """
    Cancel an order. Only pending or confirmed orders can be cancelled via voice.
    Packed, shipped, or delivered orders require manual staff intervention.

    Request body:
        {
          "order_number": "RS-2026-AB1C",
          "phone_number": "+17735551234",
          "confirmed": true
        }

    Response:
        {
          "success": true,
          "message": "Order RS-2026-AB1C has been cancelled."
        }
    """
    if not _check_secret():
        return _auth_error()

    data = request.get_json(silent=True) or {}
    order_number = data.get('order_number', '').strip().upper()
    phone = data.get('phone_number', '').strip()
    confirmed = data.get('confirmed', False)

    if not confirmed:
        return jsonify({
            'success': False,
            'error': 'Cancellation not confirmed. Set confirmed=true after customer verbally confirms.'
        }), 400

    if not order_number:
        return jsonify({'success': False, 'error': 'order_number is required'}), 400

    order = Order.query.filter(
        db.func.upper(Order.order_number) == order_number
    ).first()

    if not order:
        return jsonify({
            'success': False,
            'error': f'Order {order_number} not found.'
        }), 404

    # Verify the caller owns this order (if phone provided)
    if phone:
        user = _find_user_by_phone(phone)
        if user and order.user_id and order.user_id != user.id:
            return jsonify({
                'success': False,
                'error': 'The phone number provided does not match the customer on this order.'
            }), 403

    # Only allow cancellation of pending or confirmed orders
    cancellable_statuses = ('pending', 'confirmed')
    if order.status not in cancellable_statuses:
        return jsonify({
            'success': False,
            'error': (
                f'Order {order_number} cannot be cancelled because it is already '
                f'"{order.status}". Please contact staff for assistance.'
            )
        }), 409

    order.status = 'cancelled'
    order.staff_notes = (
        (order.staff_notes or '') +
        f'\n[VOICE CANCEL] Cancelled via voice agent on {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}'
    ).strip()
    db.session.commit()

    return jsonify({
        'success': True,
        'order_number': order_number,
        'message': f'Order {order_number} has been successfully cancelled.'
    })
