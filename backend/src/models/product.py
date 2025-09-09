from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from src.models.user import db

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    sku = db.Column(db.String(50), unique=True, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    bulk_price = db.Column(db.Float, nullable=True)  # Price for bulk orders
    bulk_quantity = db.Column(db.Integer, nullable=True)  # Minimum quantity for bulk price
    unit_size = db.Column(db.String(50), nullable=True)  # e.g., "1 lb", "24 oz can"
    brand = db.Column(db.String(100), nullable=True)
    in_stock = db.Column(db.Boolean, default=True)
    image_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = db.relationship('Category', backref=db.backref('products', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'sku': self.sku,
            'unit_price': self.unit_price,
            'bulk_price': self.bulk_price,
            'bulk_quantity': self.bulk_quantity,
            'unit_size': self.unit_size,
            'brand': self.brand,
            'in_stock': self.in_stock,
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

