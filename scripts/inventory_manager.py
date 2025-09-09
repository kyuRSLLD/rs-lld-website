#!/usr/bin/env python3
"""
RS LLD Inventory Management Script
Simple tool to manage your product inventory
"""

import sqlite3
import csv
import json
from datetime import datetime
from typing import List, Dict, Optional

class InventoryManager:
    def __init__(self, db_path: str = "rs-lld-backend/src/database/app.db"):
        self.db_path = db_path
        
    def get_connection(self):
        return sqlite3.connect(self.db_path)
    
    def list_categories(self) -> List[Dict]:
        """List all product categories"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, description FROM category ORDER BY name")
        categories = [{"id": row[0], "name": row[1], "description": row[2]} for row in cursor.fetchall()]
        conn.close()
        return categories
    
    def list_products(self, category_id: Optional[int] = None, search: str = "") -> List[Dict]:
        """List all products, optionally filtered by category or search term"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = """
        SELECT p.id, p.name, p.sku, p.unit_price, p.bulk_price, p.bulk_quantity, 
               p.unit_size, p.brand, p.in_stock, c.name as category_name
        FROM product p
        JOIN category c ON p.category_id = c.id
        """
        params = []
        
        conditions = []
        if category_id:
            conditions.append("p.category_id = ?")
            params.append(category_id)
        
        if search:
            conditions.append("(p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)")
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term])
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        query += " ORDER BY c.name, p.name"
        
        cursor.execute(query, params)
        products = []
        for row in cursor.fetchall():
            products.append({
                "id": row[0], "name": row[1], "sku": row[2], "unit_price": row[3],
                "bulk_price": row[4], "bulk_quantity": row[5], "unit_size": row[6],
                "brand": row[7], "in_stock": bool(row[8]), "category": row[9]
            })
        
        conn.close()
        return products
    
    def add_product(self, name: str, category_id: int, sku: str, unit_price: float,
                   bulk_price: Optional[float] = None, bulk_quantity: Optional[int] = None,
                   unit_size: Optional[str] = None, brand: Optional[str] = None,
                   description: Optional[str] = None, image_url: Optional[str] = None) -> bool:
        """Add a new product to inventory"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Check if SKU already exists
            cursor.execute("SELECT id FROM product WHERE sku = ?", (sku,))
            if cursor.fetchone():
                print(f"Error: SKU '{sku}' already exists!")
                return False
            
            cursor.execute("""
                INSERT INTO product (name, description, category_id, sku, unit_price, 
                                   bulk_price, bulk_quantity, unit_size, brand, image_url, 
                                   in_stock, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            """, (name, description, category_id, sku, unit_price, bulk_price, 
                  bulk_quantity, unit_size, brand, image_url, 
                  datetime.utcnow(), datetime.utcnow()))
            
            conn.commit()
            conn.close()
            print(f"✅ Added product: {name} (SKU: {sku})")
            return True
            
        except Exception as e:
            print(f"❌ Error adding product: {e}")
            return False
    
    def update_product_price(self, sku: str, unit_price: Optional[float] = None, 
                           bulk_price: Optional[float] = None) -> bool:
        """Update product pricing"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            updates = []
            params = []
            
            if unit_price is not None:
                updates.append("unit_price = ?")
                params.append(unit_price)
            
            if bulk_price is not None:
                updates.append("bulk_price = ?")
                params.append(bulk_price)
            
            if not updates:
                print("No price updates specified")
                return False
            
            updates.append("updated_at = ?")
            params.append(datetime.utcnow())
            params.append(sku)
            
            query = f"UPDATE product SET {', '.join(updates)} WHERE sku = ?"
            cursor.execute(query, params)
            
            if cursor.rowcount == 0:
                print(f"❌ Product with SKU '{sku}' not found")
                return False
            
            conn.commit()
            conn.close()
            print(f"✅ Updated pricing for SKU: {sku}")
            return True
            
        except Exception as e:
            print(f"❌ Error updating product: {e}")
            return False
    
    def toggle_stock_status(self, sku: str, in_stock: bool) -> bool:
        """Update product stock status"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("UPDATE product SET in_stock = ?, updated_at = ? WHERE sku = ?", 
                         (in_stock, datetime.utcnow(), sku))
            
            if cursor.rowcount == 0:
                print(f"❌ Product with SKU '{sku}' not found")
                return False
            
            conn.commit()
            conn.close()
            status = "in stock" if in_stock else "out of stock"
            print(f"✅ Updated SKU {sku} to {status}")
            return True
            
        except Exception as e:
            print(f"❌ Error updating stock status: {e}")
            return False
    
    def export_to_csv(self, filename: str = "inventory_export.csv") -> bool:
        """Export all products to CSV file"""
        try:
            products = self.list_products()
            
            with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['sku', 'name', 'category', 'unit_price', 'bulk_price', 
                            'bulk_quantity', 'unit_size', 'brand', 'in_stock']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                writer.writeheader()
                for product in products:
                    writer.writerow({
                        'sku': product['sku'],
                        'name': product['name'],
                        'category': product['category'],
                        'unit_price': product['unit_price'],
                        'bulk_price': product['bulk_price'],
                        'bulk_quantity': product['bulk_quantity'],
                        'unit_size': product['unit_size'],
                        'brand': product['brand'],
                        'in_stock': product['in_stock']
                    })
            
            print(f"✅ Exported {len(products)} products to {filename}")
            return True
            
        except Exception as e:
            print(f"❌ Error exporting to CSV: {e}")
            return False
    
    def import_from_csv(self, filename: str) -> bool:
        """Import products from CSV file"""
        try:
            with open(filename, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                
                success_count = 0
                error_count = 0
                
                for row in reader:
                    # Find category ID by name
                    categories = self.list_categories()
                    category_id = None
                    for cat in categories:
                        if cat['name'].lower() == row['category'].lower():
                            category_id = cat['id']
                            break
                    
                    if not category_id:
                        print(f"❌ Category '{row['category']}' not found for SKU {row['sku']}")
                        error_count += 1
                        continue
                    
                    # Convert values
                    try:
                        unit_price = float(row['unit_price'])
                        bulk_price = float(row['bulk_price']) if row['bulk_price'] else None
                        bulk_quantity = int(row['bulk_quantity']) if row['bulk_quantity'] else None
                        in_stock = row['in_stock'].lower() in ['true', '1', 'yes']
                    except ValueError as e:
                        print(f"❌ Invalid data for SKU {row['sku']}: {e}")
                        error_count += 1
                        continue
                    
                    # Add product
                    if self.add_product(
                        name=row['name'],
                        category_id=category_id,
                        sku=row['sku'],
                        unit_price=unit_price,
                        bulk_price=bulk_price,
                        bulk_quantity=bulk_quantity,
                        unit_size=row['unit_size'],
                        brand=row['brand']
                    ):
                        success_count += 1
                    else:
                        error_count += 1
                
                print(f"✅ Import complete: {success_count} products added, {error_count} errors")
                return error_count == 0
                
        except Exception as e:
            print(f"❌ Error importing from CSV: {e}")
            return False

def main():
    """Interactive command-line interface"""
    manager = InventoryManager()
    
    print("🏪 RS LLD Inventory Management System")
    print("=====================================")
    
    while True:
        print("\nOptions:")
        print("1. List all products")
        print("2. List categories")
        print("3. Add new product")
        print("4. Update product price")
        print("5. Toggle stock status")
        print("6. Export to CSV")
        print("7. Import from CSV")
        print("8. Search products")
        print("9. Exit")
        
        choice = input("\nEnter your choice (1-9): ").strip()
        
        if choice == '1':
            products = manager.list_products()
            print(f"\n📦 Found {len(products)} products:")
            for p in products:
                stock_status = "✅" if p['in_stock'] else "❌"
                bulk_info = f" (Bulk: ${p['bulk_price']}/{p['bulk_quantity']}+)" if p['bulk_price'] else ""
                print(f"{stock_status} {p['sku']}: {p['name']} - ${p['unit_price']}{bulk_info}")
        
        elif choice == '2':
            categories = manager.list_categories()
            print(f"\n📁 Found {len(categories)} categories:")
            for c in categories:
                print(f"{c['id']}. {c['name']} - {c['description']}")
        
        elif choice == '3':
            print("\n➕ Add New Product")
            name = input("Product name: ")
            
            categories = manager.list_categories()
            print("Available categories:")
            for c in categories:
                print(f"{c['id']}. {c['name']}")
            
            category_id = int(input("Category ID: "))
            sku = input("SKU: ").upper()
            unit_price = float(input("Unit price: $"))
            
            bulk_price = input("Bulk price (optional): $")
            bulk_price = float(bulk_price) if bulk_price else None
            
            bulk_quantity = input("Bulk quantity (optional): ")
            bulk_quantity = int(bulk_quantity) if bulk_quantity else None
            
            unit_size = input("Unit size (e.g., '28 oz'): ")
            brand = input("Brand (optional): ")
            
            manager.add_product(name, category_id, sku, unit_price, bulk_price, 
                              bulk_quantity, unit_size, brand)
        
        elif choice == '4':
            sku = input("Enter SKU to update: ").upper()
            unit_price = input("New unit price (leave blank to skip): $")
            bulk_price = input("New bulk price (leave blank to skip): $")
            
            unit_price = float(unit_price) if unit_price else None
            bulk_price = float(bulk_price) if bulk_price else None
            
            manager.update_product_price(sku, unit_price, bulk_price)
        
        elif choice == '5':
            sku = input("Enter SKU: ").upper()
            status = input("In stock? (y/n): ").lower() == 'y'
            manager.toggle_stock_status(sku, status)
        
        elif choice == '6':
            filename = input("Export filename (default: inventory_export.csv): ")
            filename = filename or "inventory_export.csv"
            manager.export_to_csv(filename)
        
        elif choice == '7':
            filename = input("Import filename: ")
            manager.import_from_csv(filename)
        
        elif choice == '8':
            search_term = input("Search term: ")
            products = manager.list_products(search=search_term)
            print(f"\n🔍 Found {len(products)} matching products:")
            for p in products:
                stock_status = "✅" if p['in_stock'] else "❌"
                print(f"{stock_status} {p['sku']}: {p['name']} - ${p['unit_price']}")
        
        elif choice == '9':
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please try again.")

if __name__ == "__main__":
    main()

