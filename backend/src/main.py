import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.user import db
from src.models.product import Product, Category
from src.models.order import Order, OrderItem, StaffUser
from src.routes.user import user_bp
from src.routes.product import product_bp
from src.routes.chat import chat_bp
from src.routes.order import order_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'
CORS(app, supports_credentials=True)

app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(product_bp, url_prefix='/api')
app.register_blueprint(chat_bp, url_prefix='/api')
app.register_blueprint(order_bp, url_prefix='/api')

app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()

    # Seed categories
    if Category.query.count() == 0:
        categories = [
            Category(name="Canned Goods", description="Canned vegetables, fruits, and proteins"),
            Category(name="Dry Ingredients", description="Flour, rice, pasta, and grains"),
            Category(name="Condiments & Sauces", description="Sauces, dressings, and seasonings"),
            Category(name="Cleaning Supplies", description="Commercial cleaning products"),
            Category(name="Paper Products", description="Napkins, towels, and disposables"),
            Category(name="Packaging Materials", description="Containers, bags, and wrapping"),
        ]
        for c in categories:
            db.session.add(c)
        db.session.commit()

    # Seed products (expanded catalog)
    if Product.query.count() == 0:
        products = [
            # Canned Goods
            Product(name="Diced Tomatoes - 28oz Can", category_id=1, sku="DT-28", unit_price=2.49, bulk_price=2.19, bulk_quantity=24, unit_size="28 oz", brand="Hunt's"),
            Product(name="Black Beans - 15oz Can", category_id=1, sku="BB-15", unit_price=1.89, bulk_price=1.69, bulk_quantity=24, unit_size="15 oz", brand="Goya"),
            Product(name="Whole Kernel Corn - 15oz Can", category_id=1, sku="WKC-15", unit_price=1.49, bulk_price=1.29, bulk_quantity=24, unit_size="15 oz", brand="Del Monte"),
            Product(name="Chicken Broth - 32oz Carton", category_id=1, sku="CB-32", unit_price=3.29, bulk_price=2.89, bulk_quantity=12, unit_size="32 oz", brand="Swanson"),
            Product(name="Crushed Tomatoes - 28oz Can", category_id=1, sku="CT-28", unit_price=2.29, bulk_price=1.99, bulk_quantity=24, unit_size="28 oz", brand="Muir Glen"),
            # Dry Ingredients
            Product(name="All-Purpose Flour - 50lb Bag", category_id=2, sku="APF-50", unit_price=18.99, bulk_price=16.99, bulk_quantity=10, unit_size="50 lb", brand="King Arthur"),
            Product(name="Long Grain Rice - 25lb Bag", category_id=2, sku="LGR-25", unit_price=15.49, bulk_price=13.99, bulk_quantity=8, unit_size="25 lb", brand="Mahatma"),
            Product(name="Penne Pasta - 20lb Box", category_id=2, sku="PP-20", unit_price=12.99, bulk_price=11.49, bulk_quantity=6, unit_size="20 lb", brand="Barilla"),
            Product(name="Granulated Sugar - 25lb Bag", category_id=2, sku="GS-25", unit_price=14.99, bulk_price=13.49, bulk_quantity=8, unit_size="25 lb", brand="Domino"),
            Product(name="Bread Crumbs - 10lb Bag", category_id=2, sku="BC-10", unit_price=8.99, bulk_price=7.99, bulk_quantity=10, unit_size="10 lb", brand="Progresso"),
            # Condiments & Sauces
            Product(name="Olive Oil - 1 Gallon", category_id=3, sku="OO-1G", unit_price=24.99, bulk_price=22.49, bulk_quantity=6, unit_size="1 gallon", brand="Colavita"),
            Product(name="Ketchup - 32oz Bottle", category_id=3, sku="K-32", unit_price=3.99, bulk_price=3.49, bulk_quantity=12, unit_size="32 oz", brand="Heinz"),
            Product(name="Soy Sauce - 1 Gallon", category_id=3, sku="SS-1G", unit_price=9.99, bulk_price=8.49, bulk_quantity=6, unit_size="1 gallon", brand="Kikkoman"),
            Product(name="Hot Sauce - 12oz Bottle", category_id=3, sku="HS-12", unit_price=4.49, bulk_price=3.99, bulk_quantity=12, unit_size="12 oz", brand="Tabasco"),
            Product(name="Mayonnaise - 1 Gallon", category_id=3, sku="MAY-1G", unit_price=11.99, bulk_price=10.49, bulk_quantity=4, unit_size="1 gallon", brand="Hellmann's"),
            # Cleaning Supplies
            Product(name="Commercial Degreaser - 1 Gallon", category_id=4, sku="CD-1G", unit_price=12.99, bulk_price=11.49, bulk_quantity=4, unit_size="1 gallon", brand="Ecolab"),
            Product(name="Dish Soap - 1 Gallon", category_id=4, sku="DS-1G", unit_price=8.99, bulk_price=7.99, bulk_quantity=4, unit_size="1 gallon", brand="Dawn"),
            Product(name="Sanitizing Wipes - 300ct", category_id=4, sku="SW-300", unit_price=14.99, bulk_price=12.99, bulk_quantity=6, unit_size="300 count", brand="Clorox"),
            # Paper Products
            Product(name="Paper Towels - 12 Roll Pack", category_id=5, sku="PT-12", unit_price=18.99, bulk_price=16.99, bulk_quantity=6, unit_size="12 rolls", brand="Bounty"),
            Product(name="Dinner Napkins - 500ct", category_id=5, sku="DN-500", unit_price=7.99, bulk_price=6.99, bulk_quantity=10, unit_size="500 count", brand="Tork"),
            Product(name="Deli Tissue Paper - 500ct", category_id=5, sku="DTP-500", unit_price=5.99, bulk_price=4.99, bulk_quantity=12, unit_size="500 count", brand="Bagcraft"),
            # Packaging
            Product(name="Aluminum Foil Containers - 50ct", category_id=6, sku="AFC-50", unit_price=12.99, bulk_price=10.99, bulk_quantity=6, unit_size="50 count", brand="Handi-Foil"),
            Product(name="Hinged Foam Containers - 200ct", category_id=6, sku="HFC-200", unit_price=19.99, bulk_price=17.49, bulk_quantity=4, unit_size="200 count", brand="Dart"),
            Product(name="Kraft Paper Bags - 500ct", category_id=6, sku="KPB-500", unit_price=24.99, bulk_price=21.99, bulk_quantity=4, unit_size="500 count", brand="Duro"),
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
    app.run(host='0.0.0.0', port=5000, debug=True)
