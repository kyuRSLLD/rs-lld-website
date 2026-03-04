import csv
import io
from flask import Blueprint, jsonify, request, session, Response
from src.models.product import Product, Category, db
from src.routes.order import staff_required

product_admin_bp = Blueprint('product_admin', __name__)

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
        db.session.commit()
        return jsonify({'success': True, 'product': product.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

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
        'unit_price', 'bulk_price', 'bulk_quantity', 'in_stock', 'description'
    ])
    for p in products:
        writer.writerow([
            p.id, p.name, p.sku, p.brand or '', p.unit_size or '',
            p.category.name if p.category else '',
            f'{p.unit_price:.2f}',
            f'{p.bulk_price:.2f}' if p.bulk_price else '',
            p.bulk_quantity or '',
            'Yes' if p.in_stock else 'No',
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
