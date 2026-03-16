from flask import Blueprint, jsonify, request, make_response
from src.models.product import Product, Category, db
from src.routes.user import login_required

product_bp = Blueprint('product', __name__)

def _no_cache(response):
    """Add Cache-Control: no-store, no-cache headers to prevent browser caching."""
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@product_bp.route('/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return _no_cache(make_response(jsonify([c.to_dict() for c in categories])))

@product_bp.route('/products', methods=['GET'])
def get_products():
    category_id = request.args.get('category_id', type=int)
    search = request.args.get('search', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 100, type=int)

    query = Product.query

    if category_id:
        query = query.filter(Product.category_id == category_id)

    category_name = request.args.get('category', '')
    if category_name:
        cat = Category.query.filter(Category.name.ilike(f'%{category_name}%')).first()
        if cat:
            query = query.filter(Product.category_id == cat.id)

    if search:
        query = query.filter(Product.name.contains(search))

    products = query.paginate(page=page, per_page=per_page, error_out=False)

    resp = make_response(jsonify({
        'products': [p.to_dict() for p in products.items],
        'total': products.total,
        'pages': products.pages,
        'current_page': page,
        'per_page': per_page
    }))
    return _no_cache(resp)

@product_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return _no_cache(make_response(jsonify(product.to_dict())))

@product_bp.route('/products/sku/<string:sku>', methods=['GET'])
def get_product_by_sku(sku):
    product = Product.query.filter_by(sku=sku).first_or_404()
    return _no_cache(make_response(jsonify(product.to_dict())))

@product_bp.route('/products/featured', methods=['GET'])
def get_featured_products():
    # Return up to 8 in-stock products ordered by most recently updated
    products = (
        Product.query
        .filter(Product.in_stock == True)
        .order_by(Product.updated_at.desc())
        .limit(8)
        .all()
    )
    return _no_cache(make_response(jsonify([p.to_dict() for p in products])))

# Admin routes
@product_bp.route('/admin/categories', methods=['POST'])
@login_required
def create_category():
    data = request.json
    category = Category(
        name=data['name'],
        description=data.get('description')
    )
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201

@product_bp.route('/admin/products', methods=['POST'])
@login_required
def create_product():
    data = request.json
    product = Product(
        name=data['name'],
        description=data.get('description'),
        category_id=data['category_id'],
        sku=data['sku'],
        unit_price=data['unit_price'],
        bulk_price=data.get('bulk_price'),
        bulk_quantity=data.get('bulk_quantity'),
        unit_size=data.get('unit_size'),
        brand=data.get('brand'),
        image_url=data.get('image_url')
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201
