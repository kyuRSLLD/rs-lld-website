from datetime import datetime
from src.models.user import db
import json


class CustomInvoice(db.Model):
    """Custom invoice created by staff — can include items not in inventory."""
    __tablename__ = 'custom_invoice'

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(30), unique=True, nullable=False)

    # Status: draft, sent, paid, cancelled
    status = db.Column(db.String(30), default='draft', nullable=False)

    # Customer info (free-form, not tied to a user account)
    customer_name = db.Column(db.String(200), nullable=False)
    customer_company = db.Column(db.String(200), nullable=True)
    customer_email = db.Column(db.String(200), nullable=True)
    customer_phone = db.Column(db.String(50), nullable=True)
    customer_address = db.Column(db.String(500), nullable=True)
    customer_city = db.Column(db.String(100), nullable=True)
    customer_state = db.Column(db.String(50), nullable=True)
    customer_zip = db.Column(db.String(20), nullable=True)

    # Line items stored as JSON array
    # Each item: {description, sku, quantity, unit_price, line_total}
    items_json = db.Column(db.Text, nullable=False, default='[]')

    # Financials
    subtotal = db.Column(db.Float, nullable=False, default=0.0)
    discount_amount = db.Column(db.Float, nullable=False, default=0.0)
    shipping_fee = db.Column(db.Float, nullable=False, default=0.0)
    tax_rate = db.Column(db.Float, nullable=False, default=0.0)   # percentage, e.g. 8.5
    tax_amount = db.Column(db.Float, nullable=False, default=0.0)
    total_amount = db.Column(db.Float, nullable=False, default=0.0)

    # Payment
    payment_method = db.Column(db.String(50), nullable=True)  # net30, check, credit_card, cash
    payment_terms = db.Column(db.String(100), nullable=True)  # e.g. "Net 30", "Due on receipt"
    due_date = db.Column(db.String(30), nullable=True)

    # Notes
    notes = db.Column(db.Text, nullable=True)
    internal_notes = db.Column(db.Text, nullable=True)

    # Staff
    created_by = db.Column(db.String(100), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sent_at = db.Column(db.DateTime, nullable=True)
    paid_at = db.Column(db.DateTime, nullable=True)

    @property
    def items(self):
        try:
            return json.loads(self.items_json)
        except Exception:
            return []

    @items.setter
    def items(self, value):
        self.items_json = json.dumps(value)

    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'status': self.status,
            'customer_name': self.customer_name,
            'customer_company': self.customer_company,
            'customer_email': self.customer_email,
            'customer_phone': self.customer_phone,
            'customer_address': self.customer_address,
            'customer_city': self.customer_city,
            'customer_state': self.customer_state,
            'customer_zip': self.customer_zip,
            'items': self.items,
            'subtotal': self.subtotal,
            'discount_amount': self.discount_amount,
            'shipping_fee': self.shipping_fee,
            'tax_rate': self.tax_rate,
            'tax_amount': self.tax_amount,
            'total_amount': self.total_amount,
            'payment_method': self.payment_method,
            'payment_terms': self.payment_terms,
            'due_date': self.due_date,
            'notes': self.notes,
            'internal_notes': self.internal_notes,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
        }
