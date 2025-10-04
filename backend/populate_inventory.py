#!/usr/bin/env python3
"""
Script to populate the database with Gorilla Paper inventory
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.main import app, db
from src.models.product import Category, Product

def populate_database():
    with app.app_context():
        # Clear existing data
        print("Clearing existing data...")
        Product.query.delete()
        Category.query.delete()
        db.session.commit()
        
        # Create categories
        print("Creating categories...")
        categories_data = [
            {"name": "Takeout Containers", "description": "Various takeout containers including microwavable, eco-friendly, and specialty containers"},
            {"name": "Napkin & Napkin Band", "description": "Napkins and napkin bands for restaurant use"},
            {"name": "Bag Supplies", "description": "Thank you bags, kraft paper bags, trash can liners, and produce bags"},
            {"name": "Disposable Gloves", "description": "Vinyl, nitrile, and poly disposable gloves in various sizes"},
            {"name": "Receipt Paper Rolls", "description": "Thermal paper rolls, guest checks, and POS supplies"},
            {"name": "Utensils & Chopsticks", "description": "Disposable utensils, wrapped utensils, and custom chopsticks"},
            {"name": "Cups & Straw", "description": "Cold cups and straws for beverages"},
            {"name": "Food Film", "description": "Food wrap in various widths for food storage"},
        ]
        
        categories = {}
        for cat_data in categories_data:
            category = Category(**cat_data)
            db.session.add(category)
            db.session.flush()
            categories[cat_data["name"]] = category.id
        
        # Create products
        print("Creating products...")
        products_data = [
            # Takeout Containers
            {
                "name": "Takeout Container with Lid - Black Rectangular",
                "description": "28oz Black Rectangular Microwavable Container with Lid, perfect for takeout orders",
                "category_id": categories["Takeout Containers"],
                "sku": "KX-RE-28",
                "unit_price": 45.99,
                "bulk_price": 42.99,
                "bulk_quantity": 5,
                "unit_size": "28 oz (840 ml), 50 Sets",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/takeout_container_with_lid.webp"
            },
            {
                "name": "Heavyweight Deli Soup Containers",
                "description": "Clear heavyweight deli containers perfect for soups, salads, and deli items",
                "category_id": categories["Takeout Containers"],
                "sku": "DELI-32",
                "unit_price": 38.99,
                "bulk_price": 35.99,
                "bulk_quantity": 5,
                "unit_size": "32 oz, 240 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/deli_soup_containers.webp"
            },
            {
                "name": "Microwavable Hinged Container - Black",
                "description": "Black rectangular microwavable hinged containers, leak-resistant design",
                "category_id": categories["Takeout Containers"],
                "sku": "KX-HINGE-BLK",
                "unit_price": 52.99,
                "bulk_price": 49.99,
                "bulk_quantity": 5,
                "unit_size": "Various sizes, 150 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/microwavable_hinged_container.webp"
            },
            {
                "name": "Clear Salad Containers with Lid",
                "description": "Crystal clear salad containers perfect for displaying fresh salads",
                "category_id": categories["Takeout Containers"],
                "sku": "SALAD-CLR",
                "unit_price": 42.99,
                "bulk_price": 39.99,
                "bulk_quantity": 5,
                "unit_size": "24-32 oz, 200 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/salad_containers.webp"
            },
            {
                "name": "Hinged Sugarcane Containers - Eco-Friendly",
                "description": "9\"x9\"x3\" Compostable Sugarcane Bamboo 1 Compartment Container",
                "category_id": categories["Takeout Containers"],
                "sku": "KX-SUGAR-9X9",
                "unit_price": 48.99,
                "bulk_price": 45.99,
                "bulk_quantity": 5,
                "unit_size": "9\"x9\"x3\", 200 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/hinged_sugarcane_containers.webp"
            },
            {
                "name": "Hinged Mineral-Filled PP Containers",
                "description": "Aluminum-style mineral-filled polypropylene containers, microwave safe",
                "category_id": categories["Takeout Containers"],
                "sku": "KX-PP-MIN",
                "unit_price": 54.99,
                "bulk_price": 51.99,
                "bulk_quantity": 5,
                "unit_size": "Various sizes, 150 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/hinged_mineral_filled_pp_containers.webp"
            },
            {
                "name": "Hinged Foam Container",
                "description": "Classic foam clamshell containers for hot or cold food",
                "category_id": categories["Takeout Containers"],
                "sku": "FOAM-HINGE",
                "unit_price": 32.99,
                "bulk_price": 29.99,
                "bulk_quantity": 5,
                "unit_size": "Various sizes, 500 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/hinged_foam_container.webp"
            },
            {
                "name": "Portion Cups with Lids",
                "description": "Clear portion cups perfect for sauces, dressings, and condiments",
                "category_id": categories["Takeout Containers"],
                "sku": "PORTION-2OZ",
                "unit_price": 24.99,
                "bulk_price": 22.99,
                "bulk_quantity": 10,
                "unit_size": "2-4 oz, 2500 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/portion_cup.webp"
            },
            {
                "name": "Sushi Tray & Bento Box",
                "description": "Clear plastic sushi trays and bento boxes with secure lids",
                "category_id": categories["Takeout Containers"],
                "sku": "SUSHI-TRAY",
                "unit_price": 58.99,
                "bulk_price": 55.99,
                "bulk_quantity": 5,
                "unit_size": "Various sizes, 300 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/sushi_tray_bento_box.webp"
            },
            {
                "name": "Kraft Paper Containers",
                "description": "Eco-friendly kraft paper containers for hot or cold food",
                "category_id": categories["Takeout Containers"],
                "sku": "KRAFT-CTR",
                "unit_price": 46.99,
                "bulk_price": 43.99,
                "bulk_quantity": 5,
                "unit_size": "Various sizes, 500 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/kraft_containers.webp"
            },
            {
                "name": "Aluminum Containers with Lids",
                "description": "Heavy-duty aluminum containers perfect for catering and meal prep",
                "category_id": categories["Takeout Containers"],
                "sku": "ALUM-CTR",
                "unit_price": 39.99,
                "bulk_price": 36.99,
                "bulk_quantity": 5,
                "unit_size": "Various sizes, 500 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/aluminum_container.webp"
            },
            {
                "name": "Sugarcane Plates - Compostable",
                "description": "Eco-friendly compostable sugarcane plates in various sizes",
                "category_id": categories["Takeout Containers"],
                "sku": "SUGAR-PLATE",
                "unit_price": 34.99,
                "bulk_price": 31.99,
                "bulk_quantity": 5,
                "unit_size": "9-10 inch, 500 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/sugarcane_plates.webp"
            },
            
            # Napkins
            {
                "name": "2-Ply White Dispenser Napkins",
                "description": "6 1/2\" x 8\" 2-Ply White Dispenser Napkin",
                "category_id": categories["Napkin & Napkin Band"],
                "sku": "NAPKIN-DISP",
                "unit_price": 28.99,
                "bulk_price": 26.99,
                "bulk_quantity": 5,
                "unit_size": "6000/case",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/napkin.webp"
            },
            {
                "name": "Colored Napkin Bands",
                "description": "Decorative napkin bands in assorted colors for wrapped utensils",
                "category_id": categories["Napkin & Napkin Band"],
                "sku": "NAPKIN-BAND",
                "unit_price": 12.99,
                "bulk_price": 11.99,
                "bulk_quantity": 10,
                "unit_size": "2500 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/napkin_band.webp"
            },
            
            # Gloves
            {
                "name": "Vinyl Gloves - Powder Free",
                "description": "1000 count vinyl gloves, powder free, latex free",
                "category_id": categories["Disposable Gloves"],
                "sku": "VINYL-M-1000",
                "unit_price": 32.99,
                "bulk_price": 29.99,
                "bulk_quantity": 5,
                "unit_size": "Medium, 1000 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/vinyl_gloves.webp"
            },
            {
                "name": "Nitrile Gloves - Powder Free",
                "description": "Premium nitrile gloves, powder free, latex free, various colors",
                "category_id": categories["Disposable Gloves"],
                "sku": "NITRILE-M-1000",
                "unit_price": 42.99,
                "bulk_price": 39.99,
                "bulk_quantity": 5,
                "unit_size": "Medium, 1000 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/nitrile_gloves.webp"
            },
            {
                "name": "Poly Gloves - Food Service",
                "description": "Disposable poly gloves for food service and kitchen use",
                "category_id": categories["Disposable Gloves"],
                "sku": "POLY-M-8000",
                "unit_price": 24.99,
                "bulk_price": 22.99,
                "bulk_quantity": 5,
                "unit_size": "Medium, 8000 count",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/poly_gloves.webp"
            },
            
            # Receipt Paper
            {
                "name": "Thermal Paper Rolls - BPA Free",
                "description": "2-1/4\" x 50' Thermal Paper Rolls, BPA/BPS Free",
                "category_id": categories["Receipt Paper Rolls"],
                "sku": "THERMAL-2.25",
                "unit_price": 24.99,
                "bulk_price": 22.99,
                "bulk_quantity": 10,
                "unit_size": "50 rolls/case",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/thermal_paper_rolls.webp"
            },
            {
                "name": "Restaurant Guest Checks",
                "description": "2-part carbonless guest checks for restaurants",
                "category_id": categories["Receipt Paper Rolls"],
                "sku": "GUEST-CHECK",
                "unit_price": 18.99,
                "bulk_price": 16.99,
                "bulk_quantity": 10,
                "unit_size": "50 books/case",
                "brand": "Gorilla Supply",
                "in_stock": True,
                "image_url": "/src/assets/products/guest_checks.webp"
            },
        ]
        
        for product_data in products_data:
            product = Product(**product_data)
            db.session.add(product)
        
        db.session.commit()
        print(f"Successfully created {len(categories_data)} categories and {len(products_data)} products!")
        
        # Print summary
        print("\n=== Database Population Summary ===")
        print(f"Categories: {Category.query.count()}")
        print(f"Products: {Product.query.count()}")
        print("\nCategories created:")
        for category in Category.query.all():
            product_count = Product.query.filter_by(category_id=category.id).count()
            print(f"  - {category.name}: {product_count} products")

if __name__ == "__main__":
    populate_database()
