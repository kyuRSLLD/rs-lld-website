#!/usr/bin/env python3
"""
Script to update product image paths in the database
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.main import app, db
from src.models.product import Product

def update_image_paths():
    with app.app_context():
        print("Updating product image paths...")
        
        # Mapping of product names to image filenames
        image_mapping = {
            "Takeout Container with Lid - Black Rectangular": "takeout_container_with_lid.webp",
            "Heavyweight Deli Soup Containers": "deli_soup_containers.webp",
            "Microwavable Hinged Container - Black": "microwavable_hinged_container.webp",
            "Clear Salad Containers with Lid": "salad_containers.webp",
            "Hinged Sugarcane Containers - Eco-Friendly": "hinged_sugarcane_containers.webp",
            "Hinged Mineral-Filled PP Containers": "hinged_mineral_filled_pp_containers.webp",
            "Hinged Foam Container": "hinged_foam_container.webp",
            "Portion Cups with Lids": "portion_cup.webp",
            "Sushi Tray & Bento Box": "sushi_tray_bento_box.webp",
            "Kraft Paper Containers": "kraft_containers.webp",
            "Aluminum Containers with Lids": "aluminum_container.webp",
            "Sugarcane Plates - Compostable": "sugarcane_plates.webp",
            "2-Ply White Dispenser Napkins": "napkin.webp",
            "Colored Napkin Bands": "napkin_band.webp",
            "Vinyl Gloves - Powder Free": "vinyl_gloves.webp",
            "Nitrile Gloves - Powder Free": "nitrile_gloves.webp",
            "Poly Gloves - Food Service": "poly_gloves.webp",
            "Thermal Paper Rolls - BPA Free": "thermal_paper_rolls.webp",
            "Restaurant Guest Checks": "guest_checks.webp",
        }
        
        updated_count = 0
        for product_name, image_filename in image_mapping.items():
            product = Product.query.filter_by(name=product_name).first()
            if product:
                product.image_url = f"/assets/products/{image_filename}"
                updated_count += 1
                print(f"Updated: {product_name} -> {image_filename}")
        
        db.session.commit()
        print(f"\nSuccessfully updated {updated_count} product image paths!")

if __name__ == "__main__":
    update_image_paths()
