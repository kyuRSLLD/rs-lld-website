"""
Sourcing Module — Database Models
==================================
Models for the supplier sourcing workflow.

  Supplier   : A vendor/manufacturer (domestic or overseas)
  RFQ        : A Request for Quote with JSON quotes array
  Shipment   : An inbound shipment with JSON items, documents, and timeline
  QCInspection : Quality-control inspection record (standalone, not FK'd to Shipment)
"""

from datetime import datetime
from src.models.user import db


class Supplier(db.Model):
    __tablename__ = 'supplier'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    name_cn = db.Column(db.String(200), nullable=True)          # Chinese name
    platform = db.Column(db.String(50), nullable=True)          # alibaba, 1688, direct
    location = db.Column(db.String(100), nullable=True)         # Guangzhou, Shenzhen, etc.
    contact_name = db.Column(db.String(100), nullable=True)
    contact_wechat = db.Column(db.String(100), nullable=True)
    contact_email = db.Column(db.String(200), nullable=True)
    contact_phone = db.Column(db.String(50), nullable=True)
    product_categories = db.Column(db.JSON, nullable=True)      # list of category strings
    rating = db.Column(db.Float, default=0)                     # internal quality score 0–5
    lead_time_days = db.Column(db.Integer, nullable=True)
    moq_notes = db.Column(db.Text, nullable=True)
    payment_terms = db.Column(db.String(100), nullable=True)    # T/T, L/C, etc.
    is_active = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'name_cn': self.name_cn,
            'platform': self.platform,
            'location': self.location,
            'contact_name': self.contact_name,
            'contact_wechat': self.contact_wechat,
            'contact_email': self.contact_email,
            'contact_phone': self.contact_phone,
            'product_categories': self.product_categories or [],
            'rating': self.rating,
            'lead_time_days': self.lead_time_days,
            'moq_notes': self.moq_notes,
            'payment_terms': self.payment_terms,
            'is_active': self.is_active,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
        }


class RFQ(db.Model):
    __tablename__ = 'rfq'

    id = db.Column(db.Integer, primary_key=True)
    rfq_number = db.Column(db.String(30), unique=True, nullable=False)  # RFQ-2026-0001
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=True)
    description = db.Column(db.Text, nullable=True)
    target_unit_price = db.Column(db.Float, nullable=True)
    quantity = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(50), default='draft')
    # Status lifecycle: draft → sent → quoted → awarded → closed
    quotes = db.Column(db.JSON, default=list)
    # quotes format: [{supplier_id, supplier_name, price, moq, lead_time, notes, received_at}]
    awarded_supplier_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=True)

    product = db.relationship('Product', foreign_keys=[product_id], lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'rfq_number': self.rfq_number,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'description': self.description,
            'target_unit_price': self.target_unit_price,
            'quantity': self.quantity,
            'status': self.status,
            'quotes': self.quotes or [],
            'awarded_supplier_id': self.awarded_supplier_id,
            'awarded_supplier_name': self._awarded_supplier_name(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
        }

    def _awarded_supplier_name(self):
        if not self.awarded_supplier_id:
            return None
        supplier = Supplier.query.get(self.awarded_supplier_id)
        return supplier.name if supplier else None


class Shipment(db.Model):
    __tablename__ = 'shipment'

    id = db.Column(db.Integer, primary_key=True)
    shipment_number = db.Column(db.String(30), unique=True, nullable=False)  # SHP-2026-0001
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'), nullable=True)
    rfq_id = db.Column(db.Integer, db.ForeignKey('rfq.id'), nullable=True)
    tracking_number = db.Column(db.String(100), nullable=True)
    carrier = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(50), default='production')
    # Status lifecycle: production → qc → shipped → in_transit → customs → delivered
    origin = db.Column(db.String(100), nullable=True)           # Guangzhou port
    destination = db.Column(db.String(100), nullable=True)      # Chicago warehouse
    eta = db.Column(db.DateTime, nullable=True)
    actual_arrival = db.Column(db.DateTime, nullable=True)
    items = db.Column(db.JSON, default=list)
    # items format: [{product_id, product_name, quantity, unit_cost}]
    documents = db.Column(db.JSON, default=list)
    # documents format: [{type: "invoice"|"packing_list"|"bill_of_lading", url, uploaded_at}]
    timeline = db.Column(db.JSON, default=list)
    # timeline format: [{date, event, notes, recorded_by}]
    total_cost = db.Column(db.Float, nullable=True)
    currency = db.Column(db.String(10), default='USD')
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=True)

    supplier = db.relationship('Supplier', foreign_keys=[supplier_id], lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'shipment_number': self.shipment_number,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'rfq_id': self.rfq_id,
            'tracking_number': self.tracking_number,
            'carrier': self.carrier,
            'status': self.status,
            'origin': self.origin,
            'destination': self.destination,
            'eta': self.eta.isoformat() if self.eta else None,
            'actual_arrival': self.actual_arrival.isoformat() if self.actual_arrival else None,
            'items': self.items or [],
            'documents': self.documents or [],
            'timeline': self.timeline or [],
            'total_cost': self.total_cost,
            'currency': self.currency,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
        }


class SupplierPayment(db.Model):
    """
    Supplier payment record — tracks money sent to suppliers for shipments/RFQs.
    """
    __tablename__ = 'supplier_payment'

    id = db.Column(db.Integer, primary_key=True)
    payment_number = db.Column(db.String(30), unique=True, nullable=False)  # PAY-2026-0001
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'), nullable=False)
    shipment_id = db.Column(db.Integer, db.ForeignKey('shipment.id'), nullable=True)
    rfq_id = db.Column(db.Integer, db.ForeignKey('rfq.id'), nullable=True)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    payment_method = db.Column(db.String(50), nullable=True)   # wire, paypal, alipay, etc.
    reference_number = db.Column(db.String(100), nullable=True) # bank ref / transaction ID
    payment_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(30), default='pending')        # pending, sent, confirmed, failed
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=True)

    supplier = db.relationship('Supplier', foreign_keys=[supplier_id], lazy='joined')
    shipment = db.relationship('Shipment', foreign_keys=[shipment_id], lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'payment_number': self.payment_number,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'shipment_id': self.shipment_id,
            'shipment_number': self.shipment.shipment_number if self.shipment else None,
            'rfq_id': self.rfq_id,
            'amount': self.amount,
            'currency': self.currency,
            'payment_method': self.payment_method,
            'reference_number': self.reference_number,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
        }


class QCInspection(db.Model):
    """Quality-control inspection record — standalone, linked to a shipment or supplier."""
    __tablename__ = 'qc_inspection'

    id = db.Column(db.Integer, primary_key=True)
    inspection_number = db.Column(db.String(30), unique=True, nullable=False)  # QC-2026-0001
    shipment_id = db.Column(db.Integer, db.ForeignKey('shipment.id'), nullable=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'), nullable=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=True)
    product_name = db.Column(db.String(200), nullable=True)
    quantity_inspected = db.Column(db.Integer, nullable=True)
    quantity_passed = db.Column(db.Integer, nullable=True)
    quantity_failed = db.Column(db.Integer, nullable=True)
    result = db.Column(db.String(30), nullable=True)            # pass, fail, conditional
    checklist = db.Column(db.JSON, nullable=True)               # [{item, passed, notes}]
    defects_found = db.Column(db.Text, nullable=True)
    photos = db.Column(db.JSON, nullable=True)                  # list of image URLs
    inspector_name = db.Column(db.String(200), nullable=True)
    inspection_date = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(30), default='pending')        # pending, in_progress, complete
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=True)

    supplier = db.relationship('Supplier', foreign_keys=[supplier_id], lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'inspection_number': self.inspection_number,
            'shipment_id': self.shipment_id,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'product_id': self.product_id,
            'product_name': self.product_name,
            'quantity_inspected': self.quantity_inspected,
            'quantity_passed': self.quantity_passed,
            'quantity_failed': self.quantity_failed,
            'result': self.result,
            'checklist': self.checklist,
            'defects_found': self.defects_found,
            'photos': self.photos,
            'inspector_name': self.inspector_name,
            'inspection_date': self.inspection_date.isoformat() if self.inspection_date else None,
            'notes': self.notes,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
        }
