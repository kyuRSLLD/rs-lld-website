from flask import Blueprint, jsonify, request
from src.models.product import Product, Category, db
from src.routes.user import login_required

product_bp = Blueprint('product', __name__)

@product_bp.route('/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify([category.to_dict() for category in categories])

@product_bp.route('/products', methods=['GET'])
def get_products():
    # Get query parameters
    category_id = request.args.get('category_id', type=int)
    search = request.args.get('search', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # Build query
    query = Product.query
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    if search:
        query = query.filter(Product.name.contains(search))
    
    # Paginate results
    products = query.paginate(
        page=page, 
        per_page=per_page, 
        error_out=False
    )
    
    return jsonify({
        'products': [product.to_dict() for product in products.items],
        'total': products.total,
        'pages': products.pages,
        'current_page': page,
        'per_page': per_page
    })

@product_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict())

@product_bp.route('/products/featured', methods=['GET'])
def get_featured_products():
    # Return first 8 products as featured for demo
    products = Product.query.limit(8).all()
    return jsonify([product.to_dict() for product in products])

# Admin routes (would typically require admin authentication)
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

