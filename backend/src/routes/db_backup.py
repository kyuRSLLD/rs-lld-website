"""
Database backup/restore endpoints for staff portal.
GET  /api/staff/export-db  → download full JSON backup of all products, categories, images
POST /api/staff/import-db  → restore products/categories from a previously exported JSON file
"""
import json
from flask import Blueprint, jsonify, request, Response
from src.models.product import Product, Category, ProductImage
from src.models.user import db
from src.routes.staff_admin import admin_required

db_backup_bp = Blueprint('db_backup', __name__)


@db_backup_bp.route('/staff/export-db', methods=['GET'])
@admin_required
def export_db():
    """Export all categories, products, and product images as a JSON file."""
    categories = Category.query.order_by(Category.id).all()
    products = Product.query.order_by(Product.id).all()
    images = ProductImage.query.order_by(ProductImage.id).all()

    data = {
        'version': 1,
        'categories': [
            {
                'id': c.id,
                'name': c.name,
                'description': c.description,
            }
            for c in categories
        ],
        'products': [
            {
                'id': p.id,
                'name': p.name,
                'sku': p.sku,
                'category_id': p.category_id,
                'unit_price': p.unit_price,
                'bulk_price': p.bulk_price,
                'bulk_quantity': p.bulk_quantity,
                'unit_size': p.unit_size,
                'brand': p.brand,
                'description': p.description,
                'in_stock': p.in_stock,
                'stock_quantity': p.stock_quantity,
                'image_url': p.image_url,
            }
            for p in products
        ],
        'product_images': [
            {
                'id': i.id,
                'product_id': i.product_id,
                'image_url': i.image_url,
                'is_primary': i.is_primary,
                'sort_order': i.sort_order,
            }
            for i in images
        ],
    }

    json_bytes = json.dumps(data, indent=2, ensure_ascii=False).encode('utf-8')
    return Response(
        json_bytes,
        mimetype='application/json',
        headers={
            'Content-Disposition': 'attachment; filename="lld-products-backup.json"',
            'Content-Length': len(json_bytes),
        }
    )


@db_backup_bp.route('/staff/import-db', methods=['POST'])
@admin_required
def import_db():
    """
    Restore products and categories from a previously exported JSON backup.
    This UPSERTS (insert or update) records by id — it does NOT delete existing records.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    f = request.files['file']
    try:
        data = json.loads(f.read().decode('utf-8'))
    except Exception as e:
        return jsonify({'error': f'Invalid JSON: {e}'}), 400

    version = data.get('version', 1)
    if version != 1:
        return jsonify({'error': f'Unsupported backup version: {version}'}), 400

    stats = {'categories': 0, 'products': 0, 'images': 0}

    # Restore categories
    for c in data.get('categories', []):
        existing = Category.query.get(c['id'])
        if existing:
            existing.name = c['name']
            existing.description = c.get('description')
        else:
            db.session.add(Category(
                id=c['id'],
                name=c['name'],
                description=c.get('description'),
            ))
        stats['categories'] += 1

    db.session.flush()

    # Restore products
    for p in data.get('products', []):
        existing = Product.query.get(p['id'])
        if existing:
            existing.name = p['name']
            existing.sku = p['sku']
            existing.category_id = p['category_id']
            existing.unit_price = p['unit_price']
            existing.bulk_price = p.get('bulk_price')
            existing.bulk_quantity = p.get('bulk_quantity')
            existing.unit_size = p.get('unit_size')
            existing.brand = p.get('brand')
            existing.description = p.get('description')
            existing.in_stock = p.get('in_stock', True)
            existing.stock_quantity = p.get('stock_quantity', 0)
            existing.image_url = p.get('image_url')
        else:
            db.session.add(Product(
                id=p['id'],
                name=p['name'],
                sku=p['sku'],
                category_id=p['category_id'],
                unit_price=p['unit_price'],
                bulk_price=p.get('bulk_price'),
                bulk_quantity=p.get('bulk_quantity'),
                unit_size=p.get('unit_size'),
                brand=p.get('brand'),
                description=p.get('description'),
                in_stock=p.get('in_stock', True),
                stock_quantity=p.get('stock_quantity', 0),
                image_url=p.get('image_url'),
            ))
        stats['products'] += 1

    db.session.flush()

    # Restore product images
    for i in data.get('product_images', []):
        existing = ProductImage.query.get(i['id'])
        if existing:
            existing.product_id = i['product_id']
            existing.image_url = i['image_url']
            existing.is_primary = i.get('is_primary', False)
            existing.sort_order = i.get('sort_order', 0)
        else:
            db.session.add(ProductImage(
                id=i['id'],
                product_id=i['product_id'],
                image_url=i['image_url'],
                is_primary=i.get('is_primary', False),
                sort_order=i.get('sort_order', 0),
            ))
        stats['images'] += 1

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"Restored {stats['categories']} categories, {stats['products']} products, {stats['images']} images.",
        'stats': stats,
    })
