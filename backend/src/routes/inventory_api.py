"""
LLD Restaurant Supply — Inventory & Product Management API
==========================================================
External-facing REST API for updating product inventory, prices, and images.
All endpoints require an API key passed via the X-API-Key header.

Base URL: /api/v1
"""

import os
import uuid
import hmac
import hashlib
from flask import Blueprint, jsonify, request, current_app
from werkzeug.utils import secure_filename
from src.models.product import Product, Category, db

inventory_api_bp = Blueprint('inventory_api', __name__)

# ─── Allowed image extensions ─────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_IMAGE_SIZE_MB = 5

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ─── API Key authentication ───────────────────────────────────────────────────
def require_api_key(f):
    """Decorator that enforces API key authentication via X-API-Key header."""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get('X-API-Key') or request.args.get('api_key')
        expected_key = os.environ.get('INVENTORY_API_KEY', 'lld-inventory-api-key-2024')
        if not api_key:
            return jsonify({'error': 'Missing API key. Pass X-API-Key header.'}), 401
        if not hmac.compare_digest(api_key, expected_key):
            return jsonify({'error': 'Invalid API key.'}), 403
        return f(*args, **kwargs)
    return decorated

# ─── GET /api/v1/products ─────────────────────────────────────────────────────
@inventory_api_bp.route('/v1/products', methods=['GET'])
@require_api_key
def api_list_products():
    """
    List all products with optional filtering.

    Query params:
      - category_id (int): Filter by category
      - search (str): Search by name, SKU, or brand
      - in_stock (bool): Filter by stock status (true/false)
      - page (int): Page number (default 1)
      - per_page (int): Items per page (default 50, max 200)
    """
    category_id = request.args.get('category_id', type=int)
    search = request.args.get('search', '').strip()
    in_stock = request.args.get('in_stock')
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 200)

    query = Product.query
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if search:
        query = query.filter(
            db.or_(
                Product.name.ilike(f'%{search}%'),
                Product.sku.ilike(f'%{search}%'),
                Product.brand.ilike(f'%{search}%')
            )
        )
    if in_stock is not None:
        query = query.filter(Product.in_stock == (in_stock.lower() == 'true'))

    total = query.count()
    products = query.order_by(Product.category_id, Product.name)\
                    .offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page,
        'products': [p.to_dict() for p in products]
    })

# ─── GET /api/v1/products/<id_or_sku> ────────────────────────────────────────
@inventory_api_bp.route('/v1/products/<identifier>', methods=['GET'])
@require_api_key
def api_get_product(identifier):
    """
    Get a single product by ID (integer) or SKU (string).
    """
    if identifier.isdigit():
        product = Product.query.get(int(identifier))
    else:
        product = Product.query.filter_by(sku=identifier.upper()).first()

    if not product:
        return jsonify({'error': f"Product '{identifier}' not found"}), 404
    return jsonify(product.to_dict())

# ─── PATCH /api/v1/products/<id_or_sku>/price ────────────────────────────────
@inventory_api_bp.route('/v1/products/<identifier>/price', methods=['PATCH'])
@require_api_key
def api_update_price(identifier):
    """
    Update pricing for a product.

    Body (JSON):
      - unit_price (float): New unit price
      - bulk_price (float, optional): New bulk/case price
      - bulk_quantity (int, optional): Minimum quantity for bulk price
    """
    if identifier.isdigit():
        product = Product.query.get(int(identifier))
    else:
        product = Product.query.filter_by(sku=identifier.upper()).first()

    if not product:
        return jsonify({'error': f"Product '{identifier}' not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    try:
        if 'unit_price' in data:
            val = float(data['unit_price'])
            if val < 0:
                return jsonify({'error': 'unit_price must be non-negative'}), 400
            product.unit_price = round(val, 2)
        if 'bulk_price' in data:
            product.bulk_price = round(float(data['bulk_price']), 2) if data['bulk_price'] is not None else None
        if 'bulk_quantity' in data:
            product.bulk_quantity = int(data['bulk_quantity']) if data['bulk_quantity'] is not None else None
        db.session.commit()
        return jsonify({'success': True, 'product': product.to_dict()})
    except (ValueError, TypeError) as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid value: {str(e)}'}), 400

# ─── PATCH /api/v1/products/<id_or_sku>/inventory ────────────────────────────
@inventory_api_bp.route('/v1/products/<identifier>/inventory', methods=['PATCH'])
@require_api_key
def api_update_inventory(identifier):
    """
    Update inventory/stock status for a product.

    Body (JSON):
      - in_stock (bool): Whether the item is in stock
    """
    if identifier.isdigit():
        product = Product.query.get(int(identifier))
    else:
        product = Product.query.filter_by(sku=identifier.upper()).first()

    if not product:
        return jsonify({'error': f"Product '{identifier}' not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    if 'in_stock' not in data:
        return jsonify({'error': 'in_stock field is required'}), 400

    try:
        product.in_stock = bool(data['in_stock'])
        db.session.commit()
        return jsonify({'success': True, 'product': product.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

# ─── PUT /api/v1/products/<id_or_sku> ────────────────────────────────────────
@inventory_api_bp.route('/v1/products/<identifier>', methods=['PUT'])
@require_api_key
def api_update_product(identifier):
    """
    Full or partial update of any product fields.

    Body (JSON) — all fields optional:
      - name (str)
      - description (str)
      - category_id (int)
      - sku (str)
      - unit_price (float)
      - bulk_price (float)
      - bulk_quantity (int)
      - unit_size (str)
      - brand (str)
      - in_stock (bool)
      - image_url (str)
    """
    if identifier.isdigit():
        product = Product.query.get(int(identifier))
    else:
        product = Product.query.filter_by(sku=identifier.upper()).first()

    if not product:
        return jsonify({'error': f"Product '{identifier}' not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    try:
        if 'name' in data:
            product.name = str(data['name']).strip()
        if 'description' in data:
            product.description = str(data['description'])
        if 'category_id' in data:
            cat = Category.query.get(int(data['category_id']))
            if not cat:
                return jsonify({'error': f"Category ID {data['category_id']} not found"}), 400
            product.category_id = int(data['category_id'])
        if 'sku' in data:
            new_sku = str(data['sku']).upper().strip()
            existing = Product.query.filter_by(sku=new_sku).first()
            if existing and existing.id != product.id:
                return jsonify({'error': f"SKU '{new_sku}' already in use"}), 400
            product.sku = new_sku
        if 'unit_price' in data:
            product.unit_price = round(float(data['unit_price']), 2)
        if 'bulk_price' in data:
            product.bulk_price = round(float(data['bulk_price']), 2) if data['bulk_price'] is not None else None
        if 'bulk_quantity' in data:
            product.bulk_quantity = int(data['bulk_quantity']) if data['bulk_quantity'] is not None else None
        if 'unit_size' in data:
            product.unit_size = str(data['unit_size'])
        if 'brand' in data:
            product.brand = str(data['brand'])
        if 'in_stock' in data:
            product.in_stock = bool(data['in_stock'])
        if 'image_url' in data:
            product.image_url = str(data['image_url']) if data['image_url'] else None
        db.session.commit()
        return jsonify({'success': True, 'product': product.to_dict()})
    except (ValueError, TypeError) as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid value: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

# ─── POST /api/v1/products/<id_or_sku>/image ─────────────────────────────────
@inventory_api_bp.route('/v1/products/<identifier>/image', methods=['POST'])
@require_api_key
def api_upload_image(identifier):
    """
    Upload a product image (multipart/form-data).

    Form field:
      - image (file): Image file (PNG, JPG, JPEG, GIF, WEBP — max 5MB)

    Returns the URL of the uploaded image and updates the product record.
    """
    if identifier.isdigit():
        product = Product.query.get(int(identifier))
    else:
        product = Product.query.filter_by(sku=identifier.upper()).first()

    if not product:
        return jsonify({'error': f"Product '{identifier}' not found"}), 404

    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided. Use form field name "image"'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': f'File type not allowed. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

    # Check file size
    file.seek(0, 2)
    file_size = file.tell()
    file.seek(0)
    if file_size > MAX_IMAGE_SIZE_MB * 1024 * 1024:
        return jsonify({'error': f'File too large. Maximum size is {MAX_IMAGE_SIZE_MB}MB'}), 400

    try:
        ext = file.filename.rsplit('.', 1)[1].lower()
        # Use SKU-based filename for easy identification
        safe_sku = secure_filename(product.sku.lower().replace(' ', '_'))
        unique_id = uuid.uuid4().hex[:8]
        filename = f"{safe_sku}_{unique_id}.{ext}"

        # Save to static/uploads/products/
        upload_dir = os.path.join(current_app.static_folder, 'uploads', 'products')
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)
        file.save(filepath)

        # Build the public URL
        image_url = f"/uploads/products/{filename}"
        product.image_url = image_url
        db.session.commit()

        return jsonify({
            'success': True,
            'image_url': image_url,
            'product': product.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ─── POST /api/v1/products/bulk-update ───────────────────────────────────────
@inventory_api_bp.route('/v1/products/bulk-update', methods=['POST'])
@require_api_key
def api_bulk_update():
    """
    Bulk update multiple products in a single request.

    Body (JSON):
      - products (list): Array of product update objects, each containing:
          - id OR sku (required): Product identifier
          - unit_price (float, optional)
          - bulk_price (float, optional)
          - bulk_quantity (int, optional)
          - in_stock (bool, optional)
          - name (str, optional)
          - description (str, optional)
          - brand (str, optional)
          - unit_size (str, optional)
          - image_url (str, optional)

    Returns a summary of updated, skipped, and errored products.
    """
    data = request.get_json()
    if not data or 'products' not in data:
        return jsonify({'error': 'Request body must contain a "products" array'}), 400

    items = data['products']
    if not isinstance(items, list):
        return jsonify({'error': '"products" must be an array'}), 400

    updated = []
    skipped = []
    errors = []

    for item in items:
        identifier = item.get('id') or item.get('sku')
        if not identifier:
            errors.append({'item': item, 'error': 'Each item must have "id" or "sku"'})
            continue

        if str(identifier).isdigit():
            product = Product.query.get(int(identifier))
        else:
            product = Product.query.filter_by(sku=str(identifier).upper()).first()

        if not product:
            skipped.append({'identifier': identifier, 'reason': 'Not found'})
            continue

        try:
            if 'unit_price' in item and item['unit_price'] is not None:
                product.unit_price = round(float(item['unit_price']), 2)
            if 'bulk_price' in item:
                product.bulk_price = round(float(item['bulk_price']), 2) if item['bulk_price'] is not None else None
            if 'bulk_quantity' in item:
                product.bulk_quantity = int(item['bulk_quantity']) if item['bulk_quantity'] is not None else None
            if 'in_stock' in item:
                product.in_stock = bool(item['in_stock'])
            if 'name' in item and item['name']:
                product.name = str(item['name']).strip()
            if 'description' in item:
                product.description = str(item['description'])
            if 'brand' in item:
                product.brand = str(item['brand'])
            if 'unit_size' in item:
                product.unit_size = str(item['unit_size'])
            if 'image_url' in item:
                product.image_url = str(item['image_url']) if item['image_url'] else None
            updated.append({'identifier': identifier, 'sku': product.sku, 'name': product.name})
        except (ValueError, TypeError) as e:
            errors.append({'identifier': identifier, 'error': str(e)})

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500

    return jsonify({
        'success': True,
        'updated_count': len(updated),
        'skipped_count': len(skipped),
        'error_count': len(errors),
        'updated': updated,
        'skipped': skipped,
        'errors': errors
    })

# ─── GET /api/v1/categories ───────────────────────────────────────────────────
@inventory_api_bp.route('/v1/categories', methods=['GET'])
@require_api_key
def api_list_categories():
    """List all product categories."""
    categories = Category.query.order_by(Category.name).all()
    return jsonify({'categories': [c.to_dict() for c in categories]})

# ─── GET /api/v1/health ───────────────────────────────────────────────────────
@inventory_api_bp.route('/v1/health', methods=['GET'])
def api_health():
    """Health check endpoint — no authentication required."""
    return jsonify({
        'status': 'ok',
        'service': 'LLD Restaurant Supply Inventory API',
        'version': '1.0'
    })
