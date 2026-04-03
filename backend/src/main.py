import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, jsonify as _jsonify
from flask_cors import CORS
from src.models.user import db
from src.models.product import Product, Category, ProductImage
from src.models.order import Order, OrderItem, StaffUser
from src.models.invoice import CustomInvoice
from src.routes.user import user_bp
from src.routes.product import product_bp
from src.routes.chat import chat_bp
from src.routes.order import order_bp
from src.routes.payment import payment_bp
from src.routes.product_admin import product_admin_bp
from src.routes.inventory_api import inventory_api_bp
from src.routes.invoice import invoice_bp
from src.routes.staff_admin import staff_admin_bp
from src.routes.api_keys import api_keys_bp
from src.routes.bill_analyzer import bill_bp
from src.routes.social_auth import social_bp
from src.routes.password_reset import password_reset_bp
from src.routes.save_me_money import save_me_money_bp
from src.routes.seed_products import seed_bp
from src.routes.db_backup import db_backup_bp
from src.routes.customer_admin import customer_admin_bp
from src.routes.voice_api import voice_api_bp
from src.routes.sourcing import sourcing_bp
from src.routes.voice_analytics import voice_analytics_bp
from src.routes.sales_rep import sales_rep_bp, SalesScript, CallingListEntry
from src.routes.payment_links import payment_links_bp
from src.routes.sms_optin import sms_optin_bp
from src.routes.shipping import shipping_bp
from src.routes.restaurant_finder import restaurant_finder_bp
from src.models.restaurant_finder import RestaurantLead
from src.models.api_key import APIKey
from src.models.voice_analytics import CallLog, AgentPerformance
# SalesScript imported from sales_rep blueprint
from src.models.sourcing import Supplier, RFQ, Shipment, QCInspection, SupplierPayment
from src.models.supplier_bill import SupplierBill

# ⚠️  ARCHITECTURE RULE (DO NOT CHANGE):
# Frontend is served EXCLUSIVELY by Cloudflare Pages (lld-restaurant-supply.pages.dev / lldrestaurantsupply.com)
# This Railway backend serves ONLY /api/* routes. It must NEVER serve static frontend files.
app = Flask(__name__, static_folder=None)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', '')
# Cookie settings — SameSite=None + Secure=True required for cross-origin requests
# (Bluehost frontend calling Railway backend)
_on_railway = bool(os.environ.get('RAILWAY_ENVIRONMENT') or os.environ.get('RAILWAY_PROJECT_ID'))
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
# CORS: allow lldrestaurantsupply.com, Railway, Cloudflare Pages, and localhost
# flask-cors supports regex strings in the origins list
CORS(app, supports_credentials=True, origins=[
    'https://lldrestaurantsupply.com',
    'https://www.lldrestaurantsupply.com',
    'https://rs-lld-website-production.up.railway.app',
    'https://lld-restaurant-supply.pages.dev',
    r'https://[a-z0-9-]+\.lld-restaurant-supply\.pages\.dev',
    'http://localhost:5173',
    'http://localhost:7777',
])

app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(product_bp, url_prefix='/api')
app.register_blueprint(chat_bp, url_prefix='/api')
app.register_blueprint(order_bp, url_prefix='/api')
app.register_blueprint(payment_bp, url_prefix='/api')
app.register_blueprint(product_admin_bp, url_prefix='/api')
app.register_blueprint(inventory_api_bp, url_prefix='/api')
app.register_blueprint(invoice_bp, url_prefix='/api')
app.register_blueprint(staff_admin_bp, url_prefix='/api')
app.register_blueprint(api_keys_bp, url_prefix='/api')
app.register_blueprint(bill_bp, url_prefix='/api')
app.register_blueprint(social_bp, url_prefix='/api')
app.register_blueprint(password_reset_bp, url_prefix='/api')
app.register_blueprint(save_me_money_bp, url_prefix='/api')
app.register_blueprint(seed_bp, url_prefix='/api')
app.register_blueprint(db_backup_bp, url_prefix='/api')
app.register_blueprint(customer_admin_bp, url_prefix='/api')
app.register_blueprint(voice_api_bp, url_prefix='/api')
app.register_blueprint(sourcing_bp, url_prefix='/api')
app.register_blueprint(voice_analytics_bp, url_prefix='/api')
app.register_blueprint(payment_links_bp, url_prefix='/api')
app.register_blueprint(sales_rep_bp, url_prefix='/api')
app.register_blueprint(sms_optin_bp, url_prefix='/api')
app.register_blueprint(shipping_bp, url_prefix='/api')
app.register_blueprint(restaurant_finder_bp)  # restaurant finder uses its own /api/* prefixes

# Database configuration: use PostgreSQL (DATABASE_URL) if available, else fall back to SQLite
_database_url = os.environ.get('DATABASE_URL', '')
if _database_url:
    # Railway provides postgres:// URLs; SQLAlchemy requires postgresql://
    if _database_url.startswith('postgres://'):
        _database_url = _database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = _database_url
else:
    _db_dir = os.path.join(os.path.dirname(__file__), 'database')
    os.makedirs(_db_dir, exist_ok=True)
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(_db_dir, 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Max upload size: 10MB
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024  # 25MB for bill uploads
db.init_app(app)

with app.app_context():
    db.create_all()

    # ── Schema migrations: safely add new columns to existing tables ──────────
    import sqlalchemy as _sa
    _engine = db.engine
    _is_postgres = _engine.dialect.name == 'postgresql'

    def _add_column_if_missing(table, column, col_type):
        """Add a column to a table only if it doesn't already exist.
        Uses IF NOT EXISTS for PostgreSQL (avoids transaction abort on duplicate).
        Falls back to try/except for SQLite.
        """
        if _is_postgres:
            # PostgreSQL: quote table name to handle reserved words like 'user'
            quoted_table = f'"{table}"'
            try:
                with _engine.connect() as conn:
                    conn.execute(_sa.text(
                        f"ALTER TABLE {quoted_table} ADD COLUMN IF NOT EXISTS {column} {col_type}"
                    ))
                    conn.commit()
            except Exception:
                pass
        else:
            # SQLite: try/except (no IF NOT EXISTS support in older versions)
            try:
                with _engine.connect() as conn:
                    conn.execute(_sa.text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                    conn.commit()
            except Exception:
                pass  # Column already exists

    _add_column_if_missing('product', 'image_url', 'TEXT')
    _add_column_if_missing('product', 'stock_quantity', 'INTEGER DEFAULT 0 NOT NULL')
    _add_column_if_missing('product', 'description', 'TEXT')
    _add_column_if_missing('custom_invoice', 'shipping_fee', 'FLOAT DEFAULT 0.0')
    _add_column_if_missing('user', 'shipping_address', 'TEXT')
    _add_column_if_missing('user', 'billing_address', 'TEXT')
    _add_column_if_missing('order', 'check_back_image_filename', 'VARCHAR(300)')
    # User credit/terms fields (added for account standing + voice agent)
    _add_column_if_missing('user', 'approved_for_terms', 'BOOLEAN DEFAULT FALSE')
    _add_column_if_missing('user', 'credit_limit', 'FLOAT DEFAULT 0.0')
    _add_column_if_missing('user', 'payment_terms', 'VARCHAR(20)')
    _add_column_if_missing('user', 'credit_notes', 'TEXT')
    # Order stripe payment link field
    _add_column_if_missing('order', 'stripe_payment_link', 'VARCHAR(500)')
    # CallLog new columns (voice analytics — ElevenLabs webhook fields)
    _add_column_if_missing('call_log', 'conversation_id', 'VARCHAR(100)')
    _add_column_if_missing('call_log', 'sub_agent_name', 'VARCHAR(200)')
    _add_column_if_missing('call_log', 'payment_method', 'VARCHAR(50)')
    # vapi_call_id: make nullable (was NOT NULL unique, now optional)
    # product_image table: created by db.create_all() above (new table, no ALTER needed)
    # ── User profile / auth columns added 2026-03 ─────────────────────────────
    _add_column_if_missing('user', 'first_name', 'VARCHAR(100)')
    _add_column_if_missing('user', 'last_name', 'VARCHAR(100)')
    _add_column_if_missing('user', 'email_verified', 'BOOLEAN DEFAULT FALSE')
    _add_column_if_missing('user', 'verification_token', 'VARCHAR(200)')
    _add_column_if_missing('user', 'verification_token_expires', 'TIMESTAMP')
    # ── Order sales attribution columns added 2026-03 ─────────────────────────
    _add_column_if_missing('order', 'sales_rep_id', 'INTEGER REFERENCES staff_user(id)')
    _add_column_if_missing('order', 'sales_source', 'VARCHAR(50)')
    # ── ACH payment columns added 2026-03 ─────────────────────────────────────
    _add_column_if_missing('user',  'ach_bank_name',      'VARCHAR(200)')
    _add_column_if_missing('user',  'ach_account_name',   'VARCHAR(200)')
    _add_column_if_missing('user',  'ach_routing_number', 'VARCHAR(20)')
    _add_column_if_missing('user',  'ach_account_number', 'VARCHAR(30)')
    _add_column_if_missing('user',  'ach_account_type',   'VARCHAR(20)')
    _add_column_if_missing('user',  'ach_authorized_at',  'TIMESTAMP')
    _add_column_if_missing('user',  'ach_authorized_by',  'INTEGER')
    _add_column_if_missing('order', 'ach_bank_name',      'VARCHAR(200)')
    _add_column_if_missing('order', 'ach_account_name',   'VARCHAR(200)')
    _add_column_if_missing('order', 'ach_routing_number', 'VARCHAR(20)')
    _add_column_if_missing('order', 'ach_account_number', 'VARCHAR(30)')
    _add_column_if_missing('order', 'ach_account_type',   'VARCHAR(20)')
    _add_column_if_missing('order', 'ach_authorized_at',  'TIMESTAMP')
    # ── StaffUser name columns added 2026-04 ────────────────────────────────
    _add_column_if_missing('staff_user', 'first_name', 'VARCHAR(100)')
    _add_column_if_missing('staff_user', 'last_name',  'VARCHAR(100)')
    # ── Order contact name/email columns added 2026-04 ────────────────────────
    _add_column_if_missing('order', 'delivery_first_name', 'VARCHAR(100)')
    _add_column_if_missing('order', 'delivery_last_name',  'VARCHAR(100)')
    _add_column_if_missing('order', 'delivery_email',      'VARCHAR(200)')
    # ─────────────────────────────────────────────────────────────────────────

    # Seed categories
    if Category.query.count() == 0:
        categories = [
            Category(name="Disposable Goods", description="Gloves, disposable cups, containers, and lids"),
            Category(name="Kitchen Tools", description="Knives, ladles, cutting boards, and utensils"),
            Category(name="Cleaning Supplies", description="Brushes, cloths, and commercial cleaning products"),
            Category(name="Packaging Supplies", description="Takeout bags, containers, and packaging materials"),
            Category(name="Pest Control", description="Commercial pest control products for food service"),
            Category(name="Dry Ingredients", description="Seasonings, MSG, and dry pantry staples"),
        ]
        for c in categories:
            db.session.add(c)
        db.session.commit()

    # Seed products
    if Product.query.count() == 0:
        products = [
            # Disposable Goods (category_id=1)
            Product(name="Vinyl Gloves - Medium (100ct)", category_id=1, sku="VG-M-100", unit_price=8.99, bulk_price=7.49, bulk_quantity=10, unit_size="100 count", brand="SafeGuard"),
            Product(name="Vinyl Gloves - Large (100ct)", category_id=1, sku="VG-L-100", unit_price=8.99, bulk_price=7.49, bulk_quantity=10, unit_size="100 count", brand="SafeGuard"),
            Product(name="Nitrile Gloves - Medium (100ct)", category_id=1, sku="NG-M-100", unit_price=12.99, bulk_price=10.99, bulk_quantity=10, unit_size="100 count", brand="Kimberly-Clark"),
            Product(name="Nitrile Gloves - Large (100ct)", category_id=1, sku="NG-L-100", unit_price=12.99, bulk_price=10.99, bulk_quantity=10, unit_size="100 count", brand="Kimberly-Clark"),
            Product(name="Foam Cups - 8oz (1000ct)", category_id=1, sku="FC-8-1000", unit_price=22.99, bulk_price=19.99, bulk_quantity=4, unit_size="1000 count", brand="Dart"),
            Product(name="Foam Cups - 12oz (1000ct)", category_id=1, sku="FC-12-1000", unit_price=26.99, bulk_price=23.49, bulk_quantity=4, unit_size="1000 count", brand="Dart"),
            Product(name="Foam Cups - 16oz (1000ct)", category_id=1, sku="FC-16-1000", unit_price=29.99, bulk_price=26.49, bulk_quantity=4, unit_size="1000 count", brand="Dart"),
            Product(name="Plastic Cup Lids - 8oz (1000ct)", category_id=1, sku="LID-8-1000", unit_price=14.99, bulk_price=12.99, bulk_quantity=6, unit_size="1000 count", brand="Dart"),
            Product(name="Plastic Cup Lids - 12oz/16oz (1000ct)", category_id=1, sku="LID-16-1000", unit_price=15.99, bulk_price=13.49, bulk_quantity=6, unit_size="1000 count", brand="Dart"),
            Product(name="Disposable Food Containers - 32oz (150ct)", category_id=1, sku="DFC-32-150", unit_price=18.99, bulk_price=15.99, bulk_quantity=6, unit_size="150 count", brand="Pactiv"),
            Product(name="Disposable Food Containers - 16oz (150ct)", category_id=1, sku="DFC-16-150", unit_price=16.99, bulk_price=13.99, bulk_quantity=6, unit_size="150 count", brand="Pactiv"),
            # Kitchen Tools (category_id=2)
            Product(name="Chef Knife - 8 inch", category_id=2, sku="CK-8", unit_price=24.99, bulk_price=21.99, bulk_quantity=6, unit_size="8 inch", brand="Victorinox"),
            Product(name="Chef Knife - 10 inch", category_id=2, sku="CK-10", unit_price=29.99, bulk_price=26.49, bulk_quantity=6, unit_size="10 inch", brand="Victorinox"),
            Product(name="Paring Knife - 3.5 inch", category_id=2, sku="PK-3", unit_price=12.99, bulk_price=10.99, bulk_quantity=6, unit_size="3.5 inch", brand="Victorinox"),
            Product(name="Stainless Steel Ladle - 6oz", category_id=2, sku="LAD-6", unit_price=9.99, bulk_price=8.49, bulk_quantity=6, unit_size="6 oz", brand="Winco"),
            Product(name="Stainless Steel Ladle - 8oz", category_id=2, sku="LAD-8", unit_price=11.99, bulk_price=9.99, bulk_quantity=6, unit_size="8 oz", brand="Winco"),
            Product(name="Stainless Steel Ladle - 12oz", category_id=2, sku="LAD-12", unit_price=13.99, bulk_price=11.99, bulk_quantity=6, unit_size="12 oz", brand="Winco"),
            Product(name="Cutting Board - 18x12 inch (White)", category_id=2, sku="CB-18-W", unit_price=19.99, bulk_price=16.99, bulk_quantity=4, unit_size="18x12 inch", brand="San Jamar"),
            Product(name="Cutting Board - 24x18 inch (White)", category_id=2, sku="CB-24-W", unit_price=29.99, bulk_price=25.99, bulk_quantity=4, unit_size="24x18 inch", brand="San Jamar"),
            Product(name="Cutting Board - 18x12 inch (Yellow)", category_id=2, sku="CB-18-Y", unit_price=19.99, bulk_price=16.99, bulk_quantity=4, unit_size="18x12 inch", brand="San Jamar"),
            # Cleaning Supplies (category_id=3)
            Product(name="Grill Brush - Heavy Duty", category_id=3, sku="GB-HD", unit_price=14.99, bulk_price=12.49, bulk_quantity=6, unit_size="18 inch", brand="Carlisle"),
            Product(name="Pot & Pan Scrub Brush", category_id=3, sku="PPB-1", unit_price=4.99, bulk_price=3.99, bulk_quantity=12, unit_size="Standard", brand="Carlisle"),
            Product(name="Floor Scrub Brush - Long Handle", category_id=3, sku="FSB-LH", unit_price=12.99, bulk_price=10.99, bulk_quantity=6, unit_size="Standard", brand="Carlisle"),
            Product(name="Microfiber Cleaning Cloths (12ct)", category_id=3, sku="MCC-12", unit_price=15.99, bulk_price=12.99, bulk_quantity=6, unit_size="12 count", brand="Simpli-Magic"),
            Product(name="Bar Mop Towels / Kitchen Cloths (12ct)", category_id=3, sku="BMT-12", unit_price=12.99, bulk_price=10.49, bulk_quantity=6, unit_size="12 count", brand="Monarch Brands"),
            Product(name="Heavy Duty Scrubbing Pads (10ct)", category_id=3, sku="SP-10", unit_price=7.99, bulk_price=6.49, bulk_quantity=10, unit_size="10 count", brand="Scotch-Brite"),
            # Packaging Supplies (category_id=4)
            Product(name="Kraft Takeout Bags - Small (500ct)", category_id=4, sku="KTB-S-500", unit_price=19.99, bulk_price=16.99, bulk_quantity=4, unit_size="500 count", brand="Duro"),
            Product(name="Kraft Takeout Bags - Large (500ct)", category_id=4, sku="KTB-L-500", unit_price=24.99, bulk_price=21.49, bulk_quantity=4, unit_size="500 count", brand="Duro"),
            Product(name="Plastic Takeout Bags (500ct)", category_id=4, sku="PTB-500", unit_price=14.99, bulk_price=12.49, bulk_quantity=6, unit_size="500 count", brand="Inteplast"),
            Product(name="Hinged Clamshell Container - 9 inch (200ct)", category_id=4, sku="HCC-9-200", unit_price=22.99, bulk_price=19.49, bulk_quantity=4, unit_size="200 count", brand="Pactiv"),
            Product(name="Hinged Clamshell Container - 6 inch (250ct)", category_id=4, sku="HCC-6-250", unit_price=18.99, bulk_price=15.99, bulk_quantity=4, unit_size="250 count", brand="Pactiv"),
            Product(name="Aluminum Foil Containers - Half Size (100ct)", category_id=4, sku="AFC-H-100", unit_price=24.99, bulk_price=21.49, bulk_quantity=4, unit_size="100 count", brand="Handi-Foil"),
            Product(name="Deli Paper Sheets - 12x12 (1000ct)", category_id=4, sku="DP-12-1000", unit_price=9.99, bulk_price=7.99, bulk_quantity=6, unit_size="1000 count", brand="Bagcraft"),
            # Pest Control (category_id=5)
            Product(name="Orthene PCO Pellets - 10lb Pail", category_id=5, sku="OPC-10LB", unit_price=89.99, bulk_price=79.99, bulk_quantity=2, unit_size="10 lb pail", brand="Orthene PCO"),
            Product(name="Orthene PCO Pellets - 1lb Bag", category_id=5, sku="OPC-1LB", unit_price=12.99, bulk_price=10.99, bulk_quantity=6, unit_size="1 lb bag", brand="Orthene PCO"),
            # Dry Ingredients (category_id=6)
            Product(name="MSG (Monosodium Glutamate) - Low Sodium - 5lb", category_id=6, sku="MSG-LS-5", unit_price=14.99, bulk_price=12.49, bulk_quantity=6, unit_size="5 lb", brand="Ajinomoto"),
            Product(name="MSG (Monosodium Glutamate) - Low Sodium - 25lb", category_id=6, sku="MSG-LS-25", unit_price=49.99, bulk_price=42.99, bulk_quantity=2, unit_size="25 lb", brand="Ajinomoto"),
        ]
        for p in products:
            db.session.add(p)
        db.session.commit()

    # Seed default staff accounts — passwords read from Railway env vars (never hardcoded)
    if StaffUser.query.count() == 0:
        admin_pw = os.environ.get('SEED_ADMIN_PASSWORD', '')
        staff_pw = os.environ.get('SEED_STAFF_PASSWORD', '')
        if admin_pw:
            admin = StaffUser(username='admin', email='admin@rslld.com', full_name='RS LLD Admin', role='admin')
            admin.set_password(admin_pw)
            db.session.add(admin)
        if staff_pw:
            staff = StaffUser(username='staff', email='staff@rslld.com', full_name='RS LLD Staff', role='staff')
            staff.set_password(staff_pw)
            db.session.add(staff)
        if admin_pw or staff_pw:
            db.session.commit()

    # Seed a demo customer account — password read from Railway env var
    from src.models.user import User
    if User.query.count() == 0:
        demo_pw = os.environ.get('SEED_DEMO_PASSWORD', '')
        if demo_pw:
            demo = User(username='demo_restaurant', email='demo@myrestaurant.com',
                        company_name="Mario's Italian Kitchen", phone='555-0100')
            demo.set_password(demo_pw)
            db.session.add(demo)
            db.session.commit()

    # Ensure Robert Lin account exists — password read from Railway env var
    if not User.query.filter_by(email='robert@lldrestaurantsupply.com').first():
        robert_pw = os.environ.get('SEED_ROBERT_PASSWORD', '')
        if robert_pw:
            robert = User(
                username='robertlin',
                first_name='Robert',
                last_name='Lin',
                email='robert@lldrestaurantsupply.com',
                company_name=None,
                phone='(224)305-3888',
                shipping_address='3541 Melody St, 60060',
            )
            robert.set_password(robert_pw)
            db.session.add(robert)
            db.session.commit()
            print('[SEED] Robert Lin account created.')


@app.route('/api-docs')
def api_docs():
    """Serve the LLD API documentation page."""
    import os as _os
    from flask import send_file
    docs_path = _os.path.join(_os.path.dirname(__file__), 'api_docs.html')
    return send_file(docs_path, mimetype='text/html')

@app.route('/api/ping')
def ping():
    """Lightweight keep-alive endpoint to prevent Railway cold starts."""
    from flask import jsonify
    return jsonify({'status': 'ok'})


# ⚠️  ARCHITECTURE RULE: Frontend lives on Cloudflare Pages — Railway serves API only.
# Non-API routes return a clear error so nothing accidentally serves HTML.
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    # Allow /api/* and /api-docs to pass through (handled by blueprints above)
    return _jsonify({
        'error': 'Not found',
        'message': 'This is the LLD Restaurant Supply API server. The frontend is at https://lldrestaurantsupply.com'
    }), 404


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'production') != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug)
