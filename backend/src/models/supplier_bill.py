from src.models.user import db
from datetime import datetime
import json


class SupplierBill(db.Model):
    """
    Stores an uploaded supplier bill/invoice from a customer's existing vendor.
    The bill is parsed by AI to extract line items and prices so staff can
    identify where RS LLD can offer better deals.
    """
    __tablename__ = 'supplier_bills'

    id = db.Column(db.Integer, primary_key=True)

    # ── Customer / Restaurant Info ────────────────────────────────────────────
    restaurant_name  = db.Column(db.String(200), nullable=False)
    restaurant_email = db.Column(db.String(200))
    restaurant_phone = db.Column(db.String(50))
    contact_name     = db.Column(db.String(200))
    notes            = db.Column(db.Text)          # internal staff notes

    # ── Supplier Info (extracted from bill) ──────────────────────────────────
    supplier_name    = db.Column(db.String(200))   # e.g. "Sysco", "US Foods"
    bill_date        = db.Column(db.String(50))    # as extracted from bill
    bill_number      = db.Column(db.String(100))   # invoice # on the bill
    bill_total       = db.Column(db.Float)         # total as shown on bill

    # ── File Storage ─────────────────────────────────────────────────────────
    original_filename = db.Column(db.String(500))
    file_path         = db.Column(db.String(500))  # path on server
    file_type         = db.Column(db.String(20))   # 'pdf' | 'image'

    # ── Extraction Results ───────────────────────────────────────────────────
    # JSON array of extracted line items:
    # [{ "description": str, "sku": str, "quantity": float, "unit": str,
    #    "unit_price": float, "line_total": float,
    #    "our_sku": str, "our_price": float, "savings": float,
    #    "match_confidence": "high"|"medium"|"low"|"none" }]
    line_items_json  = db.Column(db.Text)
    extraction_status = db.Column(db.String(20), default='pending')
    # 'pending' | 'processing' | 'done' | 'error'
    extraction_error  = db.Column(db.Text)

    # ── Summary Stats (computed after extraction) ─────────────────────────────
    total_items      = db.Column(db.Integer, default=0)
    items_we_carry   = db.Column(db.Integer, default=0)   # items we can match
    potential_savings = db.Column(db.Float, default=0.0)  # $ savings if they switch

    # ── Metadata ─────────────────────────────────────────────────────────────
    uploaded_by  = db.Column(db.String(100))   # staff username
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at   = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ── Helpers ──────────────────────────────────────────────────────────────
    @property
    def line_items(self):
        if self.line_items_json:
            try:
                return json.loads(self.line_items_json)
            except Exception:
                return []
        return []

    @line_items.setter
    def line_items(self, value):
        self.line_items_json = json.dumps(value)

    def to_dict(self, include_items=True):
        d = {
            'id':                 self.id,
            'restaurant_name':    self.restaurant_name,
            'restaurant_email':   self.restaurant_email,
            'restaurant_phone':   self.restaurant_phone,
            'contact_name':       self.contact_name,
            'notes':              self.notes,
            'supplier_name':      self.supplier_name,
            'bill_date':          self.bill_date,
            'bill_number':        self.bill_number,
            'bill_total':         self.bill_total,
            'original_filename':  self.original_filename,
            'file_type':          self.file_type,
            'extraction_status':  self.extraction_status,
            'extraction_error':   self.extraction_error,
            'total_items':        self.total_items,
            'items_we_carry':     self.items_we_carry,
            'potential_savings':  self.potential_savings,
            'uploaded_by':        self.uploaded_by,
            'created_at':         self.created_at.isoformat() if self.created_at else None,
            'updated_at':         self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_items:
            d['line_items'] = self.line_items
        return d
