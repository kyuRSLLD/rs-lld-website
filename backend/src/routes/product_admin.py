import csv
import io
import os
import uuid
from werkzeug.utils import secure_filename
from flask import Blueprint, jsonify, request, session, Response, send_from_directory
from src.models.product import Product, Category, db
from src.routes.order import staff_required

PRODUCT_IMAGE_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'products')
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

product_admin_bp = Blueprint('product_admin', __name__)

# ─── UPLOAD product image ────────────────────────────────────────────────────
@product_admin_bp.route('/staff/products/<int:product_id>/image', methods=['POST'])
@staff_required
def upload_product_image(product_id):
    """Upload or replace the display image for a product."""
    product = Product.query.get_or_404(product_id)
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return jsonify({'error': 'Invalid file type. Use JPG, PNG, GIF, or WebP.'}), 400
    os.makedirs(PRODUCT_IMAGE_FOLDER, exist_ok=True)
    # Delete old image file if it was a local upload
    if product.image_url and product.image_url.startswith('/api/staff/products/images/'):
        old_filename = product.image_url.split('/')[-1]
        old_path = os.path.join(PRODUCT_IMAGE_FOLDER, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
    filename = f"product_{product_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(PRODUCT_IMAGE_FOLDER, filename)
    file.save(filepath)
    product.image_url = f"/api/staff/products/images/{filename}"
    db.session.commit()
    return jsonify({'success': True, 'image_url': product.image_url, 'product': product.to_dict()})


@product_admin_bp.route('/staff/products/images/<path:filename>', methods=['GET'])
def serve_product_image(filename):
    """Serve uploaded product images."""
    return send_from_directory(PRODUCT_IMAGE_FOLDER, filename)


@product_admin_bp.route('/staff/products/<int:product_id>/image', methods=['DELETE'])
@staff_required
def delete_product_image(product_id):
    """Remove the image from a product."""
    product = Product.query.get_or_404(product_id)
    if product.image_url and product.image_url.startswith('/api/staff/products/images/'):
        old_filename = product.image_url.split('/')[-1]
        old_path = os.path.join(PRODUCT_IMAGE_FOLDER, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
    product.image_url = None
    db.session.commit()
    return jsonify({'success': True, 'product': product.to_dict()})


# ─── GET all products for admin (includes inactive) ──────────────────────────
@product_admin_bp.route('/staff/products', methods=['GET'])
@staff_required
def admin_get_products():
    category_id = request.args.get('category_id', type=int)
    search = request.args.get('search', '')
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
    products = query.order_by(Product.category_id, Product.name).all()
    return jsonify([p.to_dict() for p in products])

# ─── GET all categories ───────────────────────────────────────────────────────
@product_admin_bp.route('/staff/categories', methods=['GET'])
@staff_required
def admin_get_categories():
    categories = Category.query.order_by(Category.name).all()
    return jsonify([c.to_dict() for c in categories])

# ─── ADD new product ──────────────────────────────────────────────────────────
@product_admin_bp.route('/staff/products', methods=['POST'])
@staff_required
def admin_add_product():
    data = request.json
    # Validate required fields
    required = ['name', 'sku', 'unit_price', 'category_id']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400
    # Check SKU uniqueness
    if Product.query.filter_by(sku=data['sku']).first():
        return jsonify({'error': f"SKU '{data['sku']}' already exists"}), 400
    try:
        product = Product(
            name=data['name'],
            description=data.get('description', ''),
            category_id=int(data['category_id']),
            sku=data['sku'].upper().strip(),
            unit_price=float(data['unit_price']),
            bulk_price=float(data['bulk_price']) if data.get('bulk_price') else None,
            bulk_quantity=int(data['bulk_quantity']) if data.get('bulk_quantity') else None,
            unit_size=data.get('unit_size', ''),
            brand=data.get('brand', ''),
            in_stock=data.get('in_stock', True),
            stock_quantity=int(data['stock_quantity']) if data.get('stock_quantity') else 0,
        )
        db.session.add(product)
        db.session.commit()
        return jsonify({'success': True, 'product': product.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

# ─── UPDATE product (price, SKU, name, stock, etc.) ──────────────────────────
@product_admin_bp.route('/staff/products/<int:product_id>', methods=['PUT'])
@staff_required
def admin_update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.json
    try:
        if 'name' in data:
            product.name = data['name']
        if 'description' in data:
            product.description = data['description']
        if 'category_id' in data:
            product.category_id = int(data['category_id'])
        if 'sku' in data:
            new_sku = data['sku'].upper().strip()
            existing = Product.query.filter_by(sku=new_sku).first()
            if existing and existing.id != product_id:
                return jsonify({'error': f"SKU '{new_sku}' already in use by another product"}), 400
            product.sku = new_sku
        if 'unit_price' in data:
            product.unit_price = float(data['unit_price'])
        if 'bulk_price' in data:
            product.bulk_price = float(data['bulk_price']) if data['bulk_price'] else None
        if 'bulk_quantity' in data:
            product.bulk_quantity = int(data['bulk_quantity']) if data['bulk_quantity'] else None
        if 'unit_size' in data:
            product.unit_size = data['unit_size']
        if 'brand' in data:
            product.brand = data['brand']
        if 'in_stock' in data:
            product.in_stock = bool(data['in_stock'])
        if 'stock_quantity' in data:
            qty = int(data['stock_quantity']) if data['stock_quantity'] is not None else 0
            product.stock_quantity = max(0, qty)
            # Auto-sync in_stock based on quantity if quantity is explicitly provided
            if qty <= 0 and product.in_stock:
                product.in_stock = False
            elif qty > 0 and not product.in_stock:
                product.in_stock = True
        db.session.commit()
        return jsonify({'success': True, 'product': product.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

# ─── BULK SAVE products (save all pending edits at once) ─────────────────────
@product_admin_bp.route('/staff/products/bulk-save', methods=['POST'])
@staff_required
def admin_bulk_save_products():
    """
    Save multiple product edits in a single request.
    Body: { "products": [ { "id": 1, ...fields... }, ... ] }
    Returns a summary of saved and errored products.
    """
    data = request.json
    if not data or 'products' not in data:
        return jsonify({'error': 'Request body must contain a "products" array'}), 400
    items = data['products']
    if not isinstance(items, list):
        return jsonify({'error': '"products" must be an array'}), 400

    saved = []
    errors = []

    for item in items:
        product_id = item.get('id')
        if not product_id:
            errors.append({'item': item, 'error': 'Missing product id'})
            continue
        product = Product.query.get(int(product_id))
        if not product:
            errors.append({'id': product_id, 'error': 'Product not found'})
            continue
        try:
            if 'name' in item and item['name']:
                product.name = str(item['name']).strip()
            if 'description' in item:
                product.description = str(item['description'])
            if 'category_id' in item and item['category_id']:
                product.category_id = int(item['category_id'])
            if 'sku' in item and item['sku']:
                new_sku = str(item['sku']).upper().strip()
                existing = Product.query.filter_by(sku=new_sku).first()
                if existing and existing.id != int(product_id):
                    errors.append({'id': product_id, 'name': product.name, 'error': f"SKU '{new_sku}' already in use"})
                    continue
                product.sku = new_sku
            if 'unit_price' in item and item['unit_price'] is not None:
                product.unit_price = round(float(item['unit_price']), 2)
            if 'bulk_price' in item:
                product.bulk_price = round(float(item['bulk_price']), 2) if item['bulk_price'] else None
            if 'bulk_quantity' in item:
                product.bulk_quantity = int(item['bulk_quantity']) if item['bulk_quantity'] else None
            if 'unit_size' in item:
                product.unit_size = str(item['unit_size'])
            if 'brand' in item:
                product.brand = str(item['brand'])
            if 'in_stock' in item:
                product.in_stock = bool(item['in_stock'])
            if 'stock_quantity' in item and item['stock_quantity'] is not None:
                qty = max(0, int(item['stock_quantity']))
                product.stock_quantity = qty
                # Auto-sync in_stock based on quantity
                if qty <= 0:
                    product.in_stock = False
                else:
                    product.in_stock = True
            saved.append({'id': product_id, 'sku': product.sku, 'name': product.name})
        except (ValueError, TypeError) as e:
            errors.append({'id': product_id, 'error': str(e)})

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500

    return jsonify({
        'success': True,
        'saved_count': len(saved),
        'error_count': len(errors),
        'saved': saved,
        'errors': errors,
    })

# ─── TOGGLE stock status ──────────────────────────────────────────────────────
@product_admin_bp.route('/staff/products/<int:product_id>/toggle-stock', methods=['POST'])
@staff_required
def admin_toggle_stock(product_id):
    product = Product.query.get_or_404(product_id)
    product.in_stock = not product.in_stock
    db.session.commit()
    return jsonify({'success': True, 'in_stock': product.in_stock, 'product': product.to_dict()})

# ─── DELETE product ───────────────────────────────────────────────────────────
@product_admin_bp.route('/staff/products/<int:product_id>', methods=['DELETE'])
@staff_required
def admin_delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    # Block deletion if there is remaining inventory
    stock_qty = product.stock_quantity if product.stock_quantity is not None else 0
    if stock_qty > 0:
        return jsonify({
            'error': f"Cannot delete '{product.name}' — there are still {stock_qty} unit(s) in inventory. "
                     f"Please reduce the stock quantity to 0 before deleting.",
            'blocked': True,
            'stock_quantity': stock_qty,
        }), 409
    try:
        db.session.delete(product)
        db.session.commit()
        return jsonify({'success': True, 'message': f"Product '{product.name}' deleted"})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

# ─── EXPORT products as CSV ───────────────────────────────────────────────────
@product_admin_bp.route('/staff/products/export-csv', methods=['GET'])
@staff_required
def admin_export_csv():
    products = Product.query.order_by(Product.category_id, Product.name).all()
    output = io.StringIO()
    writer = csv.writer(output)
    # Header row
    writer.writerow([
        'id', 'name', 'sku', 'brand', 'unit_size', 'category',
        'unit_price', 'bulk_price', 'bulk_quantity', 'in_stock', 'stock_quantity', 'description'
    ])
    for p in products:
        writer.writerow([
            p.id, p.name, p.sku, p.brand or '', p.unit_size or '',
            p.category.name if p.category else '',
            f'{p.unit_price:.2f}',
            f'{p.bulk_price:.2f}' if p.bulk_price else '',
            p.bulk_quantity or '',
            'Yes' if p.in_stock else 'No',
            p.stock_quantity or 0,
            p.description or ''
        ])
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=lld_products.csv'}
    )

# ─── IMPORT products from CSV (bulk price update) ────────────────────────────
@product_admin_bp.route('/staff/products/import-csv', methods=['POST'])
@staff_required
def admin_import_csv():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'File must be a .csv'}), 400
    try:
        stream = io.StringIO(file.stream.read().decode('utf-8-sig'))
        reader = csv.DictReader(stream)
        updated = 0
        skipped = 0
        errors = []
        for row in reader:
            sku = row.get('sku', '').strip().upper()
            if not sku:
                skipped += 1
                continue
            product = Product.query.filter_by(sku=sku).first()
            if not product:
                errors.append(f"SKU '{sku}' not found — skipped")
                skipped += 1
                continue
            try:
                if row.get('unit_price'):
                    product.unit_price = float(row['unit_price'])
                if row.get('bulk_price'):
                    product.bulk_price = float(row['bulk_price'])
                if row.get('bulk_quantity'):
                    product.bulk_quantity = int(row['bulk_quantity'])
                if row.get('name'):
                    product.name = row['name']
                if row.get('brand'):
                    product.brand = row['brand']
                if row.get('unit_size'):
                    product.unit_size = row['unit_size']
                if row.get('in_stock'):
                    product.in_stock = row['in_stock'].strip().lower() in ('yes', 'true', '1')
                if row.get('stock_quantity'):
                    product.stock_quantity = max(0, int(row['stock_quantity']))
                updated += 1
            except Exception as e:
                errors.append(f"SKU '{sku}': {str(e)}")
                skipped += 1
        db.session.commit()
        return jsonify({
            'success': True,
            'updated': updated,
            'skipped': skipped,
            'errors': errors
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

# ─── ADD new category ─────────────────────────────────────────────────────────
@product_admin_bp.route('/staff/categories', methods=['POST'])
@staff_required
def admin_add_category():
    data = request.json
    if not data.get('name'):
        return jsonify({'error': 'Category name is required'}), 400
    category = Category(name=data['name'], description=data.get('description', ''))
    db.session.add(category)
    db.session.commit()
    return jsonify({'success': True, 'category': category.to_dict()}), 201
