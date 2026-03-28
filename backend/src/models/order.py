from datetime import datetime
from src.models.user import db


class Order(db.Model):
    """Represents a customer order placed by a restaurant owner."""
    __tablename__ = 'order'

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(20), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # nullable for guest orders

    # Status lifecycle: pending → confirmed → packed → shipped → delivered | cancelled
    status = db.Column(db.String(30), default='pending', nullable=False)

    # Delivery info
    delivery_name = db.Column(db.String(200), nullable=False)
    delivery_company = db.Column(db.String(200), nullable=True)
    delivery_address = db.Column(db.String(500), nullable=False)
    delivery_city = db.Column(db.String(100), nullable=False)
    delivery_state = db.Column(db.String(50), nullable=False)
    delivery_zip = db.Column(db.String(20), nullable=False)
    delivery_phone = db.Column(db.String(30), nullable=True)
    preferred_delivery_date = db.Column(db.String(30), nullable=True)
    special_notes = db.Column(db.Text, nullable=True)

    # Financials
    subtotal = db.Column(db.Float, nullable=False, default=0.0)
    discount_amount = db.Column(db.Float, nullable=False, default=0.0)
    delivery_fee = db.Column(db.Float, nullable=False, default=0.0)
    total_amount = db.Column(db.Float, nullable=False, default=0.0)

    # Payment
    payment_method = db.Column(db.String(50), default='net30')  # net30, net15, credit_card, check, cod
    payment_status = db.Column(db.String(30), default='pending')  # pending, paid, overdue, pending_review, rejected
    payment_intent_id = db.Column(db.String(200), nullable=True)  # Stripe PaymentIntent ID
    check_image_filename = db.Column(db.String(300), nullable=True)  # uploaded check front image filename
    check_back_image_filename = db.Column(db.String(300), nullable=True)  # uploaded check back image filename

    # Internal staff notes
    staff_notes = db.Column(db.Text, nullable=True)
    assigned_to = db.Column(db.String(100), nullable=True)  # staff member handling the order

    # Sales attribution
    sales_rep_id = db.Column(db.Integer, db.ForeignKey('staff_user.id'), nullable=True)  # which sales rep closed this
    sales_source = db.Column(db.String(50), nullable=True)  # 'online', 'phone_rep', 'voice_agent'

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    shipped_at = db.Column(db.DateTime, nullable=True)
    delivered_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    user = db.relationship('User', backref=db.backref('orders', lazy=True))
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')
    sales_rep = db.relationship('StaffUser', backref=db.backref('attributed_orders', lazy=True), foreign_keys=[sales_rep_id])

    def to_dict(self, include_items=False):
        data = {
            'id': self.id,
            'order_number': self.order_number,
            'user_id': self.user_id,
            'customer_name': self.user.username if self.user else self.delivery_name,
            'customer_company': self.user.company_name if self.user else self.delivery_company,
            'customer_email': self.user.email if self.user else None,
            'status': self.status,
            'delivery_name': self.delivery_name,
            'delivery_company': self.delivery_company,
            'delivery_address': self.delivery_address,
            'delivery_city': self.delivery_city,
            'delivery_state': self.delivery_state,
            'delivery_zip': self.delivery_zip,
            'delivery_phone': self.delivery_phone,
            'preferred_delivery_date': self.preferred_delivery_date,
            'special_notes': self.special_notes,
            'subtotal': self.subtotal,
            'discount_amount': self.discount_amount,
            'delivery_fee': self.delivery_fee,
            'total_amount': self.total_amount,
            'payment_method': self.payment_method,
            'payment_status': self.payment_status,
            'payment_intent_id': self.payment_intent_id,
            'check_image_filename': self.check_image_filename,
            'check_back_image_filename': self.check_back_image_filename,
            'has_check_image': bool(self.check_image_filename),
            'has_check_back_image': bool(self.check_back_image_filename),
            'staff_notes': self.staff_notes,
            'assigned_to': self.assigned_to,
            'sales_rep_id': self.sales_rep_id,
            'sales_rep_name': self.sales_rep.full_name if self.sales_rep else None,
            'sales_source': self.sales_source,
            'item_count': len(self.items),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'confirmed_at': self.confirmed_at.isoformat() if self.confirmed_at else None,
            'shipped_at': self.shipped_at.isoformat() if self.shipped_at else None,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
        }
        if include_items:
            data['items'] = [item.to_dict() for item in self.items]
        return data


class OrderItem(db.Model):
    """A single line item within an order."""
    __tablename__ = 'order_item'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=True)

    # Snapshot of product at time of order (in case product changes later)
    product_name = db.Column(db.String(200), nullable=False)
    product_sku = db.Column(db.String(50), nullable=False)
    product_brand = db.Column(db.String(100), nullable=True)
    product_unit_size = db.Column(db.String(50), nullable=True)

    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)  # price actually charged
    is_bulk_price = db.Column(db.Boolean, default=False)
    line_total = db.Column(db.Float, nullable=False)

    product = db.relationship('Product', backref=db.backref('order_items', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'product_id': self.product_id,
            'product_name': self.product_name,
            'product_sku': self.product_sku,
            'product_brand': self.product_brand,
            'product_unit_size': self.product_unit_size,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'is_bulk_price': self.is_bulk_price,
            'line_total': self.line_total,
        }


class StaffUser(db.Model):
    """Internal RS LLD staff accounts for the admin portal."""
    __tablename__ = 'staff_user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(200), nullable=True)
    role = db.Column(db.String(50), default='staff')  # staff, manager, admin
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reset_token = db.Column(db.String(100), nullable=True, unique=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)

    def set_password(self, password):
        from werkzeug.security import generate_password_hash
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
