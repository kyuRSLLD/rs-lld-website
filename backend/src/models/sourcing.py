"""
Sourcing Module — Database Models
==================================
Models for the supplier sourcing workflow:
  - Supplier           : A vendor/manufacturer (domestic or overseas)
  - RFQ                : A Request for Quote issued to one or more suppliers
  - RFQQuote           : A supplier's response to an RFQ
  - Shipment           : A tracked inbound shipment from a supplier
  - ShipmentEvent      : Timeline events for a shipment (status changes)
  - QCInspection       : Quality-control inspection record for a shipment/order
"""

from datetime import datetime
from src.models.user import db


class Supplier(db.Model):
    """A supplier / manufacturer that LLD sources products from."""
    __tablename__ = 'supplier'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    name_zh = db.Column(db.String(200), nullable=True)          # Chinese name if applicable
    contact_name = db.Column(db.String(200), nullable=True)
    contact_name_zh = db.Column(db.String(200), nullable=True)
    email = db.Column(db.String(200), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    wechat_id = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), nullable=True, default='China')
    city = db.Column(db.String(100), nullable=True)
    address = db.Column(db.Text, nullable=True)
    website = db.Column(db.String(500), nullable=True)
    platform_url = db.Column(db.String(500), nullable=True)     # 1688 / Alibaba / Made-in-China listing URL
    platform = db.Column(db.String(50), nullable=True)          # '1688', 'alibaba', 'made_in_china', 'direct'
    categories = db.Column(db.Text, nullable=True)              # comma-separated product categories they supply
    notes = db.Column(db.Text, nullable=True)
    notes_zh = db.Column(db.Text, nullable=True)
    rating = db.Column(db.Float, nullable=True)                 # 1–5 internal rating
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=True)       # staff username

    rfqs = db.relationship('RFQ', backref='supplier', lazy=True)
    shipments = db.relationship('Shipment', backref='supplier', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'name_zh': self.name_zh,
            'contact_name': self.contact_name,
            'contact_name_zh': self.contact_name_zh,
            'email': self.email,
            'phone': self.phone,
            'wechat_id': self.wechat_id,
            'country': self.country,
            'city': self.city,
            'address': self.address,
            'website': self.website,
            'platform_url': self.platform_url,
            'platform': self.platform,
            'categories': self.categories,
            'notes': self.notes,
            'notes_zh': self.notes_zh,
            'rating': self.rating,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
        }


class RFQ(db.Model):
    """A Request for Quote — a sourcing inquiry sent to a supplier."""
    __tablename__ = 'rfq'

    id = db.Column(db.Integer, primary_key=True)
    rfq_number = db.Column(db.String(30), unique=True, nullable=False)  # e.g. RFQ-2026-0001
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'), nullable=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=True)
    product_name = db.Column(db.String(200), nullable=False)    # snapshot in case product changes
    product_sku = db.Column(db.String(50), nullable=True)
    quantity_needed = db.Column(db.Integer, nullable=False)
    target_unit_price = db.Column(db.Float, nullable=True)      # max acceptable price per unit
    currency = db.Column(db.String(10), default='USD')
    description = db.Column(db.Text, nullable=True)             # specs, requirements
    description_zh = db.Column(db.Text, nullable=True)          # Chinese translation for supplier
    status = db.Column(db.String(30), default='draft')
    # Status lifecycle: draft → sent → quoted → awarded → cancelled
    awarded_quote_id = db.Column(db.Integer, db.ForeignKey('rfq_quote.id'), nullable=True)
    deadline = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    quotes = db.relationship('RFQQuote', backref='rfq', lazy=True,
                             foreign_keys='RFQQuote.rfq_id',
                             cascade='all, delete-orphan')

    def to_dict(self, include_quotes=False):
        data = {
            'id': self.id,
            'rfq_number': self.rfq_number,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'product_id': self.product_id,
            'product_name': self.product_name,
            'product_sku': self.product_sku,
            'quantity_needed': self.quantity_needed,
            'target_unit_price': self.target_unit_price,
            'currency': self.currency,
            'description': self.description,
            'description_zh': self.description_zh,
            'status': self.status,
            'awarded_quote_id': self.awarded_quote_id,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'notes': self.notes,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_quotes:
            data['quotes'] = [q.to_dict() for q in self.quotes]
        return data


class RFQQuote(db.Model):
    """A supplier's quote response to an RFQ."""
    __tablename__ = 'rfq_quote'

    id = db.Column(db.Integer, primary_key=True)
    rfq_id = db.Column(db.Integer, db.ForeignKey('rfq.id'), nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'), nullable=True)
    unit_price = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    moq = db.Column(db.Integer, nullable=True)                  # Minimum Order Quantity
    lead_time_days = db.Column(db.Integer, nullable=True)
    sample_available = db.Column(db.Boolean, default=False)
    sample_price = db.Column(db.Float, nullable=True)
    payment_terms = db.Column(db.String(100), nullable=True)    # e.g. "30% deposit, 70% on shipment"
    notes = db.Column(db.Text, nullable=True)
    notes_zh = db.Column(db.Text, nullable=True)
    received_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_awarded = db.Column(db.Boolean, default=False)

    supplier = db.relationship('Supplier', foreign_keys=[supplier_id])

    def to_dict(self):
        return {
            'id': self.id,
            'rfq_id': self.rfq_id,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'unit_price': self.unit_price,
            'currency': self.currency,
            'moq': self.moq,
            'lead_time_days': self.lead_time_days,
            'sample_available': self.sample_available,
            'sample_price': self.sample_price,
            'payment_terms': self.payment_terms,
            'notes': self.notes,
            'notes_zh': self.notes_zh,
            'received_at': self.received_at.isoformat() if self.received_at else None,
            'is_awarded': self.is_awarded,
        }


class Shipment(db.Model):
    """An inbound shipment from a supplier to the LLD warehouse."""
    __tablename__ = 'shipment'

    id = db.Column(db.Integer, primary_key=True)
    shipment_number = db.Column(db.String(30), unique=True, nullable=False)  # e.g. SHP-2026-0001
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'), nullable=True)
    rfq_id = db.Column(db.Integer, db.ForeignKey('rfq.id'), nullable=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=True)
    product_name = db.Column(db.String(200), nullable=True)
    quantity = db.Column(db.Integer, nullable=True)
    tracking_number = db.Column(db.String(200), nullable=True)
    carrier = db.Column(db.String(100), nullable=True)          # FedEx, DHL, COSCO, etc.
    shipping_method = db.Column(db.String(50), nullable=True)   # 'air', 'sea', 'express', 'truck'
    origin_country = db.Column(db.String(100), nullable=True, default='China')
    destination = db.Column(db.String(200), nullable=True)      # warehouse address
    status = db.Column(db.String(50), default='pending')
    # Status: pending → in_transit → customs → arrived → received | delayed | lost
    estimated_arrival = db.Column(db.DateTime, nullable=True)
    actual_arrival = db.Column(db.DateTime, nullable=True)
    total_cost = db.Column(db.Float, nullable=True)
    currency = db.Column(db.String(10), default='USD')
    customs_status = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    events = db.relationship('ShipmentEvent', backref='shipment', lazy=True,
                             cascade='all, delete-orphan',
                             order_by='ShipmentEvent.occurred_at')
    qc_inspections = db.relationship('QCInspection', backref='shipment', lazy=True)

    def to_dict(self, include_timeline=False):
        data = {
            'id': self.id,
            'shipment_number': self.shipment_number,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'rfq_id': self.rfq_id,
            'product_id': self.product_id,
            'product_name': self.product_name,
            'quantity': self.quantity,
            'tracking_number': self.tracking_number,
            'carrier': self.carrier,
            'shipping_method': self.shipping_method,
            'origin_country': self.origin_country,
            'destination': self.destination,
            'status': self.status,
            'estimated_arrival': self.estimated_arrival.isoformat() if self.estimated_arrival else None,
            'actual_arrival': self.actual_arrival.isoformat() if self.actual_arrival else None,
            'total_cost': self.total_cost,
            'currency': self.currency,
            'customs_status': self.customs_status,
            'notes': self.notes,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_timeline:
            data['timeline'] = [e.to_dict() for e in self.events]
        return data


class ShipmentEvent(db.Model):
    """A timeline event for a shipment (status change, customs update, etc.)."""
    __tablename__ = 'shipment_event'

    id = db.Column(db.Integer, primary_key=True)
    shipment_id = db.Column(db.Integer, db.ForeignKey('shipment.id'), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    location = db.Column(db.String(200), nullable=True)
    description = db.Column(db.Text, nullable=True)
    description_zh = db.Column(db.Text, nullable=True)
    occurred_at = db.Column(db.DateTime, default=datetime.utcnow)
    recorded_by = db.Column(db.String(100), nullable=True)      # 'system', 'agent', or staff username

    def to_dict(self):
        return {
            'id': self.id,
            'shipment_id': self.shipment_id,
            'status': self.status,
            'location': self.location,
            'description': self.description,
            'description_zh': self.description_zh,
            'occurred_at': self.occurred_at.isoformat() if self.occurred_at else None,
            'recorded_by': self.recorded_by,
        }


class QCInspection(db.Model):
    """A quality-control inspection record for a shipment or product batch."""
    __tablename__ = 'qc_inspection'

    id = db.Column(db.Integer, primary_key=True)
    inspection_number = db.Column(db.String(30), unique=True, nullable=False)  # e.g. QC-2026-0001
    shipment_id = db.Column(db.Integer, db.ForeignKey('shipment.id'), nullable=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'), nullable=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=True)
    product_name = db.Column(db.String(200), nullable=True)
    quantity_inspected = db.Column(db.Integer, nullable=True)
    quantity_passed = db.Column(db.Integer, nullable=True)
    quantity_failed = db.Column(db.Integer, nullable=True)
    result = db.Column(db.String(30), nullable=True)            # 'pass', 'fail', 'conditional'
    checklist = db.Column(db.JSON, nullable=True)               # list of {item, passed, notes}
    defects_found = db.Column(db.Text, nullable=True)
    defects_found_zh = db.Column(db.Text, nullable=True)
    photos = db.Column(db.JSON, nullable=True)                  # list of base64 data URLs or S3 URLs
    inspector_name = db.Column(db.String(200), nullable=True)
    inspection_date = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    notes_zh = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(30), default='pending')        # pending, in_progress, complete
    created_by = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    supplier = db.relationship('Supplier', foreign_keys=[supplier_id])

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
            'defects_found_zh': self.defects_found_zh,
            'photos': self.photos,
            'inspector_name': self.inspector_name,
            'inspection_date': self.inspection_date.isoformat() if self.inspection_date else None,
            'notes': self.notes,
            'notes_zh': self.notes_zh,
            'status': self.status,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
