from flask import Blueprint, jsonify, request, make_response, Response
from src.models.product import Product, Category, db, query_with_images
from src.routes.user import login_required

product_bp = Blueprint('product', __name__)


def _cache(response, seconds=30):
    """
    Allow the *browser* to cache for `seconds` but tell CDN/proxies (Cloudflare)
    NOT to cache. Using `private` prevents Cloudflare from serving one user's
    response to another, which caused empty product lists on mobile.
    """
    response.headers['Cache-Control'] = f'private, max-age={seconds}'
    return response


def _no_cache(response):
    """Prevent all caching."""
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


@product_bp.route('/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    resp = make_response(jsonify([c.to_dict() for c in categories]))
    return _cache(resp, seconds=120)


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
        query = query.filter(
            db.or_(
                Product.name.ilike(f'%{search}%'),
                Product.sku.ilike(f'%{search}%'),
                Product.brand.ilike(f'%{search}%'),
            )
        )

    # ── Single JOIN to fetch all gallery images — eliminates N+1 ──
    query = query_with_images(query)

    products = query.paginate(page=page, per_page=per_page, error_out=False)

    resp = make_response(jsonify({
        'products': [p.list_dict() for p in products.items],
        'total': products.total,
        'pages': products.pages,
        'current_page': page,
        'per_page': per_page,
    }))
    return _cache(resp, seconds=300)  # 5 min — products rarely change


@product_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = query_with_images(Product.query).filter_by(id=product_id).first_or_404()
    return _cache(make_response(jsonify(product.to_dict())), seconds=30)


@product_bp.route('/products/sku/<string:sku>', methods=['GET'])
def get_product_by_sku(sku):
    product = query_with_images(Product.query).filter_by(sku=sku).first_or_404()
    return _cache(make_response(jsonify(product.to_dict())), seconds=30)


@product_bp.route('/products/sales-catalog', methods=['GET'])
def get_sales_catalog():
    """
    Returns ALL products grouped by category in a single slim response.
    Only the fields needed for the Place Order panel are included.
    Cached for 5 minutes — clicking a category in the UI is instant.
    """
    from sqlalchemy.orm import joinedload
    categories = Category.query.order_by(Category.name).all()
    # Fetch all products in one query with category pre-loaded
    products = (
        Product.query
        .options(joinedload(Product.category))
        .order_by(Product.name)
        .all()
    )
    # Build a lookup: category_id -> list of slim product dicts
    cat_map = {c.id: {'id': c.id, 'name': c.name, 'products': []} for c in categories}
    uncategorized = []
    for p in products:
        slim = {
            'id': p.id,
            'name': p.name,
            'sku': p.sku or '',
            'unit_price': float(p.unit_price) if p.unit_price else 0.0,
            'bulk_price': float(p.bulk_price) if p.bulk_price else None,
            'bulk_quantity': p.bulk_quantity,
            'brand': p.brand or '',
            'unit_size': p.unit_size or '',
            'in_stock': p._in_stock_computed(),
        }
        if p.category_id and p.category_id in cat_map:
            cat_map[p.category_id]['products'].append(slim)
        else:
            uncategorized.append(slim)
    result = [v for v in cat_map.values() if v['products']]
    if uncategorized:
        result.append({'id': 0, 'name': 'Other', 'products': uncategorized})
    resp = make_response(jsonify(result))
    return _cache(resp, seconds=300)  # 5 min browser cache


@product_bp.route('/products/featured', methods=['GET'])
def get_featured_products():
    products = (
        Product.query
        .filter(Product.in_stock == True)
        .order_by(Product.updated_at.desc())
        .limit(8)
        .all()
    )
    resp = make_response(jsonify([p.list_dict() for p in products]))
    return _cache(resp, seconds=60)


@product_bp.route('/products/<int:product_id>/thumbnail', methods=['GET'])
def get_product_thumbnail(product_id):
    """
    Serve the primary product image as a compressed, resized JPEG thumbnail.
    Images are resized to max 400x400 at quality=75 — reducing typical 1 MB
    images down to ~20-40 KB for fast product card loading.
    """
    product = Product.query.get_or_404(product_id)
    raw = product.image_url or ''

    from flask import request as _req
    origin = _req.headers.get('Origin', '*')

    if raw.startswith('data:'):
        try:
            import base64, io
            from PIL import Image

            header, b64data = raw.split(',', 1)
            img_bytes = base64.b64decode(b64data)

            # Open, resize to max 400x400 preserving aspect ratio, convert to JPEG
            img = Image.open(io.BytesIO(img_bytes))
            img = img.convert('RGB')  # ensure no alpha channel issues with JPEG
            img.thumbnail((400, 400), Image.LANCZOS)

            out = io.BytesIO()
            img.save(out, format='JPEG', quality=75, optimize=True)
            out.seek(0)
            jpeg_bytes = out.read()

            resp = make_response(jpeg_bytes)
            resp.headers['Content-Type'] = 'image/jpeg'
            # Cache for 5 minutes in browser; Cloudflare CDN can cache for 1 hour
            resp.headers['Cache-Control'] = 'public, max-age=300, s-maxage=3600'
            resp.headers['Access-Control-Allow-Origin'] = origin
            resp.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
            resp.headers['Vary'] = 'Origin'
            return resp
        except Exception as e:
            return '', 404
    elif raw.startswith('http'):
        from flask import redirect
        return redirect(raw, code=302)
    return '', 404


# ── Admin routes ──────────────────────────────────────────────────────────────

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
