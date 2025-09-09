import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.user import db
from src.models.product import Product, Category
from src.routes.user import user_bp
from src.routes.product import product_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Enable CORS for all routes
CORS(app, supports_credentials=True)

app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(product_bp, url_prefix='/api')

# uncomment if you need to use database
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
with app.app_context():
    db.create_all()
    
    # Add sample data if tables are empty
    if Category.query.count() == 0:
        categories = [
            Category(name="Canned Goods", description="Canned vegetables, fruits, and proteins"),
            Category(name="Dry Ingredients", description="Flour, rice, pasta, and grains"),
            Category(name="Condiments & Sauces", description="Sauces, dressings, and seasonings"),
            Category(name="Cleaning Supplies", description="Commercial cleaning products"),
            Category(name="Paper Products", description="Napkins, towels, and disposables"),
            Category(name="Packaging Materials", description="Containers, bags, and wrapping")
        ]
        for category in categories:
            db.session.add(category)
        db.session.commit()
        
        # Add sample products
        sample_products = [
            Product(name="Diced Tomatoes - 28oz Can", category_id=1, sku="DT-28", unit_price=2.49, bulk_price=2.19, bulk_quantity=24, unit_size="28 oz", brand="Hunt's"),
            Product(name="Black Beans - 15oz Can", category_id=1, sku="BB-15", unit_price=1.89, bulk_price=1.69, bulk_quantity=24, unit_size="15 oz", brand="Goya"),
            Product(name="All-Purpose Flour - 50lb Bag", category_id=2, sku="APF-50", unit_price=18.99, bulk_price=16.99, bulk_quantity=10, unit_size="50 lb", brand="King Arthur"),
            Product(name="Long Grain Rice - 25lb Bag", category_id=2, sku="LGR-25", unit_price=15.49, bulk_price=13.99, bulk_quantity=8, unit_size="25 lb", brand="Mahatma"),
            Product(name="Olive Oil - 1 Gallon", category_id=3, sku="OO-1G", unit_price=24.99, bulk_price=22.49, bulk_quantity=6, unit_size="1 gallon", brand="Colavita"),
            Product(name="Ketchup - 32oz Bottle", category_id=3, sku="K-32", unit_price=3.99, bulk_price=3.49, bulk_quantity=12, unit_size="32 oz", brand="Heinz"),
            Product(name="Commercial Degreaser - 1 Gallon", category_id=4, sku="CD-1G", unit_price=12.99, bulk_price=11.49, bulk_quantity=4, unit_size="1 gallon", brand="Ecolab"),
            Product(name="Paper Towels - 12 Roll Pack", category_id=5, sku="PT-12", unit_price=18.99, bulk_price=16.99, bulk_quantity=6, unit_size="12 rolls", brand="Bounty")
        ]
        for product in sample_products:
            db.session.add(product)
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
