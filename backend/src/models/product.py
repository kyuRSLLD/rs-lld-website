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
    name = db.Column(db.String(200), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False, index=True)
    sku = db.Column(db.String(50), unique=True, nullable=False, index=True)
    unit_price = db.Column(db.Float, nullable=False)
    bulk_price = db.Column(db.Float, nullable=True)
    bulk_quantity = db.Column(db.Integer, nullable=True)
    unit_size = db.Column(db.String(50), nullable=True)
    brand = db.Column(db.String(100), nullable=True, index=True)
    in_stock = db.Column(db.Boolean, default=True, index=True)
    stock_quantity = db.Column(db.Integer, default=0, nullable=False)
    image_url = db.Column(db.Text, nullable=True)  # primary image (base64 data URL or external URL)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = db.relationship('Category', backref=db.backref('products', lazy=True))
    # Eager-loadable relationship used by the optimised query helpers below
    extra_images = db.relationship(
        'ProductImage',
        backref=db.backref('product', lazy=True),
        lazy='select',
        cascade='all, delete-orphan',
        order_by='ProductImage.sort_order',
    )

    # ── helpers ──────────────────────────────────────────────────────────────

    def _in_stock_computed(self):
        return bool(self.in_stock) and (self.stock_quantity or 0) > 0

    def to_dict(self):
        """
        Full serialisation including gallery images.
        Use only for single-product detail pages — NOT for list endpoints.
        For lists use list_dict() to avoid sending megabytes of base64 data.
        """
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
            'in_stock': self._in_stock_computed(),
            'stock_quantity': self.stock_quantity if self.stock_quantity is not None else 0,
            'image_url': self.image_url,
            'images': [img.to_dict() for img in self.extra_images],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def list_dict(self):
        """
        Lightweight serialisation for list/grid views.

        Base64 image data is replaced with a sentinel flag so the frontend
        knows an image exists without downloading megabytes of data per request.
        The full image_url is only sent on the single-product detail endpoint.
        This reduces a 100-product response from ~6 MB to ~50 KB.
        """
        # For base64 data URLs, send a flag instead of the full blob.
        # The product card uses the SKU-based detail URL anyway for the
        # full image; the list card just needs to know whether to show
        # a placeholder or an image.
        raw = self.image_url or ''
        if raw.startswith('data:'):
            # Send a lightweight proxy URL so the card can lazy-load via
            # the single-product endpoint if needed, or just show the icon.
            img_flag = f'/api/products/{self.id}/thumbnail'
        else:
            img_flag = raw or None

        return {
            'id': self.id,
            'name': self.name,
            'description': None,   # not needed in list view
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'sku': self.sku,
            'unit_price': self.unit_price,
            'bulk_price': self.bulk_price,
            'bulk_quantity': self.bulk_quantity,
            'unit_size': self.unit_size,
            'brand': self.brand,
            'in_stock': self._in_stock_computed(),
            'stock_quantity': self.stock_quantity if self.stock_quantity is not None else 0,
            'image_url': img_flag,
            'images': [],          # gallery not needed in list view
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class ProductImage(db.Model):
    """Additional images for a product (supports multiple images per product)."""
    __tablename__ = 'product_image'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id', ondelete='CASCADE'), nullable=False)
    image_url = db.Column(db.Text, nullable=False)  # base64 data URL
    sort_order = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'image_url': self.image_url,
            'sort_order': self.sort_order,
        }


# ── Module-level query helpers (avoid N+1) ────────────────────────────────────

def query_with_images(base_query):
    """
    Apply joinedload for extra_images to an existing Product query.
    Returns the modified query — call .all() / .paginate() on the result.
    """
    from sqlalchemy.orm import joinedload
    return base_query.options(joinedload(Product.extra_images))
