"""
Script to update/replace all 25 products in the database with
Amazon-sourced pricing (10% cheaper), descriptions, and images.
Run from the backend directory: python3 update_products.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

os.environ.setdefault('SECRET_KEY', 'dev-secret-key')
os.environ.setdefault('DATABASE_URL', 'sqlite:///instance/app.db')

from src.main import app
from src.models.user import db
from src.models.product import Product, Category

PRODUCTS = [
    # COOKWARE
    {
        "name": 'Carbon Steel Wok 14"',
        "sku": "WOK-14-CS",
        "category": "Cookware",
        "unit_price": 53.99,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "A professional-grade 14-inch carbon steel wok built for the demands of a commercial kitchen. Heats rapidly and evenly for high-heat stir-frying, searing, and deep-frying. The seasoned surface becomes naturally non-stick over time, making it a long-lasting workhorse for any restaurant.",
        "image_url": "/static/product_images/WOK-14-CS.jpg",
    },
    {
        "name": "Stock Pot 20 Qt",
        "sku": "POT-20QT-SS",
        "category": "Cookware",
        "unit_price": 80.99,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "Heavy-duty 20-quart stainless steel stock pot designed for high-volume restaurant use. Perfect for soups, stocks, pasta, and boiling large batches. The thick aluminum core ensures even heat distribution and prevents hot spots.",
        "image_url": "/static/product_images/POT-20QT-SS.jpg",
    },
    {
        "name": 'Cast Iron Skillet 10"',
        "sku": "SKLT-10-CI",
        "category": "Cookware",
        "unit_price": 31.49,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "Pre-seasoned 10-inch cast iron skillet that delivers unmatched heat retention for searing steaks, baking cornbread, and frying eggs. Works on all cooktops including induction, oven, and open flame. A restaurant kitchen staple that only gets better with use.",
        "image_url": "/static/product_images/SKLT-10-CI.jpg",
    },
    {
        "name": "Sheet Pan Half Size",
        "sku": "PAN-HALF-AL",
        "category": "Cookware",
        "unit_price": 11.69,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "Commercial-grade aluminum half-size sheet pan (13\" x 18\") with a reinforced wire-in-rim to prevent warping under high heat. Essential for baking, roasting vegetables, and sheet-pan dinners. NSF-certified for professional kitchen use.",
        "image_url": "/static/product_images/PAN-HALF-AL.jpg",
    },
    {
        "name": "Hotel Pan Full Size SS",
        "sku": "HPAN-FULL-SS",
        "category": "Cookware",
        "unit_price": 15.29,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "Full-size 2.5-inch deep stainless steel hotel pan for buffet lines, steam tables, and food storage. Fits all standard steam table equipment. Durable 22-gauge stainless steel construction resists corrosion and is fully dishwasher safe.",
        "image_url": "/static/product_images/HPAN-FULL-SS.jpg",
    },
    # KITCHEN TOOLS
    {
        "name": 'Tongs 12"',
        "sku": "TONG-12-SS",
        "category": "Kitchen Tools",
        "unit_price": 11.69,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "12-inch stainless steel kitchen tongs with a scalloped grip for secure handling of meats, vegetables, and pasta. The spring-loaded mechanism provides smooth one-handed operation. Heat-resistant up to 450°F and fully dishwasher safe.",
        "image_url": "/static/product_images/TONG-12-SS.jpg",
    },
    {
        "name": "Spatula / Fish Turner",
        "sku": "SPAT-FISH-SS",
        "category": "Kitchen Tools",
        "unit_price": 13.49,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "Flexible stainless steel fish turner with a wide slotted head for flipping delicate fish fillets, pancakes, and omelets without breaking. The thin beveled edge slides easily under food. Ergonomic handle provides a comfortable grip during long service periods.",
        "image_url": "/static/product_images/SPAT-FISH-SS.jpg",
    },
    {
        "name": 'Balloon Whisk 12"',
        "sku": "WHSK-12-SS",
        "category": "Kitchen Tools",
        "unit_price": 11.69,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "Professional 12-inch stainless steel balloon whisk with 10 heavy-gauge wires for efficient mixing, emulsifying, and aerating. The balanced handle reduces hand fatigue during extended use. Ideal for sauces, dressings, batters, and whipped cream.",
        "image_url": "/static/product_images/WHSK-12-SS.jpg",
    },
    {
        "name": "Bench Scraper",
        "sku": "SCRP-BENCH",
        "category": "Kitchen Tools",
        "unit_price": 11.69,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "Stainless steel bench scraper and dough cutter with measurement markings for precise portioning. Essential for dividing dough, scraping work surfaces clean, and transferring chopped ingredients. The rolled top edge provides a comfortable grip.",
        "image_url": "/static/product_images/SCRP-BENCH.jpg",
    },
    {
        "name": "Pizza Cutter Wheel",
        "sku": "PCUT-WHEEL",
        "category": "Kitchen Tools",
        "unit_price": 13.49,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "Heavy-duty stainless steel pizza cutter with a 4-inch wheel that slices through thick-crust pizzas effortlessly. The protective blade guard ensures safe storage. Dishwasher safe with a comfortable ergonomic handle for high-volume pizza service.",
        "image_url": "/static/product_images/PCUT-WHEEL.jpg",
    },
    {
        "name": "Portion Scoop #16",
        "sku": "SCOOP-16",
        "category": "Kitchen Tools",
        "unit_price": 15.29,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "Stainless steel #16 portion scoop (2.75 oz) for consistent portioning of mashed potatoes, rice, cookie dough, and ice cream. The spring-loaded sweep mechanism releases food cleanly every time. Color-coded handle for easy size identification.",
        "image_url": "/static/product_images/SCOOP-16.jpg",
    },
    {
        "name": "Squeeze Bottles 16oz",
        "sku": "SQBT-16-6PK",
        "category": "Kitchen Tools",
        "unit_price": 17.09,
        "unit_size": "6-pack",
        "brand": "RS LLD",
        "description": "Set of 6 clear 16-oz squeeze bottles for sauces, dressings, oils, and condiments. The wide-mouth design makes filling and cleaning easy. Precision tip caps control flow for plating and portioning. BPA-free, dishwasher safe, and labeled with measurement markings.",
        "image_url": "/static/product_images/SQBT-16-6PK.jpg",
    },
    {
        "name": "Colander / Strainer 5qt",
        "sku": "COLD-5QT-SS",
        "category": "Kitchen Tools",
        "unit_price": 20.69,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "5-quart stainless steel colander with fine perforations for draining pasta, rinsing vegetables, and straining stocks. Dual handles and a stable base allow hands-free draining. Fully dishwasher safe and NSF-certified for commercial kitchen use.",
        "image_url": "/static/product_images/COLD-5QT-SS.jpg",
    },
    {
        "name": "Poly Cutting Board 18x12",
        "sku": "BORD-18X12",
        "category": "Kitchen Tools",
        "unit_price": 20.69,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "Commercial-grade 18x12-inch polyethylene cutting board that resists knife scarring and bacterial absorption. NSF-certified and HACCP compliant for use in professional kitchens. Dishwasher safe with a non-slip surface for safe cutting.",
        "image_url": "/static/product_images/BORD-18X12.jpg",
    },
    {
        "name": "Deli Containers 32oz",
        "sku": "DELI-32-24PK",
        "category": "Kitchen Tools",
        "unit_price": 15.29,
        "unit_size": "24-pack",
        "brand": "RS LLD",
        "description": "24-pack of 32-oz clear polypropylene deli containers with airtight lids for food prep, storage, and takeout. Stackable design maximizes refrigerator space. Microwave and dishwasher safe, BPA-free, and graduated measurement markings on the side.",
        "image_url": "/static/product_images/DELI-32-24PK.jpg",
    },
    # DISPOSABLES & SUPPLIES
    {
        "name": "Food Storage Bin 12qt",
        "sku": "BIN-12QT",
        "category": "Disposables & Supplies",
        "unit_price": 31.49,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "12-quart translucent square food storage container with a tight-fitting lid for bulk ingredient storage. Graduated markings in quarts and liters for easy measuring. Stackable design and NSF-certified for commercial kitchen use.",
        "image_url": "/static/product_images/BIN-12QT.jpg",
    },
    {
        "name": "Aluminum Foil Pans 30-pack",
        "sku": "FOIL-PAN-30",
        "category": "Disposables & Supplies",
        "unit_price": 17.99,
        "unit_size": "30-pack",
        "brand": "RS LLD",
        "description": "30-pack of heavy-duty 9x13 half-size aluminum foil pans for baking, roasting, and catering. The deep profile holds generous portions without spilling. Oven-safe up to 450°F and perfect for takeout, delivery, and buffet service.",
        "image_url": "/static/product_images/FOIL-PAN-30.jpg",
    },
    {
        "name": "Kraft Paper Bags 100-pack",
        "sku": "BAG-KRAFT-100",
        "category": "Disposables & Supplies",
        "unit_price": 26.99,
        "unit_size": "100-pack",
        "brand": "RS LLD",
        "description": "100-pack of brown kraft paper bags for takeout, delivery, and catering orders. Made from 100% recycled kraft paper with reinforced handles for carrying heavy orders. Grease-resistant lining keeps food fresh and bags intact.",
        "image_url": "/static/product_images/BAG-KRAFT-100.jpg",
    },
    {
        "name": "Paper Napkins 2-ply 500-pack",
        "sku": "NAP-2PLY-500",
        "category": "Disposables & Supplies",
        "unit_price": 13.49,
        "unit_size": "500-pack",
        "brand": "RS LLD",
        "description": "500-count pack of white 2-ply paper napkins for dine-in, takeout, and catering. Soft, absorbent, and strong enough for heavy use. Folded to a compact 4.5x4.5 inch size that fits standard napkin dispensers.",
        "image_url": "/static/product_images/NAP-2PLY-500.jpg",
    },
    {
        "name": "Portion Cups w/ Lids 2oz",
        "sku": "CUP-2OZ-200",
        "category": "Disposables & Supplies",
        "unit_price": 11.69,
        "unit_size": "200-pack",
        "brand": "RS LLD",
        "description": "200-pack of 2-oz clear plastic portion cups with snap-on lids for sauces, dressings, condiments, and samples. Leak-resistant lids keep contents secure during delivery. BPA-free and perfect for portion control in high-volume service.",
        "image_url": "/static/product_images/CUP-2OZ-200.jpg",
    },
    {
        "name": "Disposable Chopsticks 100-pair",
        "sku": "CHOP-DISP-100",
        "category": "Disposables & Supplies",
        "unit_price": 13.49,
        "unit_size": "100-pair",
        "brand": "RS LLD",
        "description": "100 pairs of individually wrapped 9-inch bamboo chopsticks for Asian restaurants, sushi bars, and takeout orders. Made from sustainably sourced bamboo and individually sleeved for hygiene. Smooth finish prevents splinters.",
        "image_url": "/static/product_images/CHOP-DISP-100.jpg",
    },
    {
        "name": "Chef Hats / Hair Nets 100-pack",
        "sku": "HAT-CHEF-100",
        "category": "Disposables & Supplies",
        "unit_price": 17.99,
        "unit_size": "100-pack",
        "brand": "RS LLD",
        "description": "100-pack of disposable white paper chef hats for kitchen staff compliance and food safety. Lightweight and breathable with an adjustable band that fits most head sizes. Meets health department requirements for food service workers.",
        "image_url": "/static/product_images/HAT-CHEF-100.jpg",
    },
    {
        "name": 'Serving Tray SS Oval 16"',
        "sku": "TRAY-OVAL-16",
        "category": "Disposables & Supplies",
        "unit_price": 17.09,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "16-inch oval stainless steel serving platter for presenting appetizers, entrees, and desserts with a polished professional look. Mirror-finish surface is easy to clean and resists tarnishing. Ideal for banquet service, buffets, and upscale dining.",
        "image_url": "/static/product_images/TRAY-OVAL-16.jpg",
    },
    {
        "name": "Condiment Caddy",
        "sku": "COND-CADDY",
        "category": "Disposables & Supplies",
        "unit_price": 17.99,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "Rust-resistant metal condiment caddy for organizing salt, pepper, hot sauce, napkins, and sugar packets on dining tables. The open mesh design allows easy cleaning and ventilation. Compact footprint fits any table size.",
        "image_url": "/static/product_images/COND-CADDY.jpg",
    },
    {
        "name": "Menu Covers Faux Leather",
        "sku": "MENU-COV-FL",
        "category": "Disposables & Supplies",
        "unit_price": 16.19,
        "unit_size": "1 pc",
        "brand": "RS LLD",
        "description": "Elegant faux leather menu cover in classic black for 8.5x11 inch menus. Four-view design holds up to 8 pages and features clear protective sleeves for easy menu updates. Stitched binding and gold corner accents give a premium restaurant presentation.",
        "image_url": "/static/product_images/MENU-COV-FL.jpg",
    },
]

with app.app_context():
    # Ensure categories exist
    cat_names = list(set(p['category'] for p in PRODUCTS))
    cat_map = {}
    for cname in cat_names:
        cat = Category.query.filter_by(name=cname).first()
        if not cat:
            cat = Category(name=cname, description=f"{cname} for restaurant use")
            db.session.add(cat)
            db.session.flush()
        cat_map[cname] = cat.id
    db.session.commit()

    updated = 0
    created = 0
    for p in PRODUCTS:
        existing = Product.query.filter_by(sku=p['sku']).first()
        if existing:
            existing.name = p['name']
            existing.description = p['description']
            existing.unit_price = p['unit_price']
            existing.unit_size = p['unit_size']
            existing.brand = p['brand']
            existing.image_url = p['image_url']
            existing.category_id = cat_map[p['category']]
            existing.in_stock = True
            updated += 1
        else:
            prod = Product(
                name=p['name'],
                description=p['description'],
                category_id=cat_map[p['category']],
                sku=p['sku'],
                unit_price=p['unit_price'],
                unit_size=p['unit_size'],
                brand=p['brand'],
                image_url=p['image_url'],
                in_stock=True,
            )
            db.session.add(prod)
            created += 1

    db.session.commit()
    print(f"Done! Updated: {updated}, Created: {created}")
    total = Product.query.count()
    print(f"Total products in DB: {total}")
    for prod in Product.query.all():
        print(f"  [{prod.sku}] {prod.name} - ${prod.unit_price}")
