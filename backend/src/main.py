import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.user import db
from src.models.product import Product, Category
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

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'asdf#FGSgvasgf$5$WGT')
CORS(app, supports_credentials=True, origins=[
    'http://lldrestaurantsupply.com',
    'https://lldrestaurantsupply.com',
    'http://www.lldrestaurantsupply.com',
    'https://www.lldrestaurantsupply.com',
    'http://localhost:5173',
    'http://localhost:5000',
    'http://localhost:3000'
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

# Ensure database directory exists
_db_dir = os.path.join(os.path.dirname(__file__), 'database')
os.makedirs(_db_dir, exist_ok=True)
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(_db_dir, 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Max upload size: 10MB
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024
db.init_app(app)

with app.app_context():
    db.create_all()

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

    # Seed default staff accounts
    if StaffUser.query.count() == 0:
        admin = StaffUser(username='admin', email='admin@rslld.com', full_name='RS LLD Admin', role='admin')
        admin.set_password('rslld2024')
        staff = StaffUser(username='staff', email='staff@rslld.com', full_name='RS LLD Staff', role='staff')
        staff.set_password('staff2024')
        db.session.add(admin)
        db.session.add(staff)
        db.session.commit()

    # Seed a demo customer account
    from src.models.user import User
    if User.query.count() == 0:
        demo = User(username='demo_restaurant', email='demo@myrestaurant.com',
                    company_name="Mario's Italian Kitchen", phone='555-0100')
        demo.set_password('demo1234')
        db.session.add(demo)
        db.session.commit()


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404
    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'production') != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug)
