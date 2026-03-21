"""
Sourcing API Routes
====================
Endpoints for the sourcing sub-agent system:

  Supplier Management
    POST   /api/sourcing/suppliers              Add a new supplier
    GET    /api/sourcing/suppliers              List all suppliers
    GET    /api/sourcing/suppliers/<id>         Supplier detail
    PUT    /api/sourcing/suppliers/<id>         Update supplier info

  RFQ Management
    POST   /api/sourcing/rfqs                   Create new RFQ
    GET    /api/sourcing/rfqs                   List RFQs
    PUT    /api/sourcing/rfqs/<id>/quotes       Add a supplier quote response
    POST   /api/sourcing/rfqs/<id>/award        Award RFQ to a supplier

  Shipment Tracking
    POST   /api/sourcing/shipments              Log a new shipment
    GET    /api/sourcing/shipments              List shipments
    PUT    /api/sourcing/shipments/<id>/status  Update tracking status
    GET    /api/sourcing/shipments/<id>/timeline Full shipment timeline

  QC Inspections
    POST   /api/sourcing/qc/inspections         Create QC inspection record
    PUT    /api/sourcing/qc/inspections/<id>     Update with results/photos

  Inventory Needs
    GET    /api/sourcing/inventory-needs         Products low on stock → triggers sourcing

All endpoints require staff authentication (JWT Bearer or session cookie).
Sub-agents authenticate using the same staff JWT mechanism.
"""

import re
from datetime import datetime
from flask import Blueprint, request, jsonify, session

from src.models.user import db
from src.models.product import Product
from src.models.sourcing import (
    Supplier, RFQ, RFQQuote, Shipment, ShipmentEvent, QCInspection
)

sourcing_bp = Blueprint('sourcing', __name__)

# ── Auth helper (reuse the same staff_required logic) ─────────────────────────

def _get_staff_id():
    """Return the current staff ID from session or JWT, or None if not authenticated."""
    import jwt as _jwt
    import os

    # 1. Check session cookie
    if session.get('staff_id'):
        return session['staff_id']

    # 2. Check JWT Bearer token
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        token = auth[7:].strip()
        if token and token not in ('null', 'undefined', 'false', ''):
            try:
                secret = os.environ.get('SECRET_KEY', 'dev-secret')
                payload = _jwt.decode(token, secret, algorithms=['HS256'])
                return payload.get('staff_id')
            except Exception:
                pass
    return None


def staff_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not _get_staff_id():
            return jsonify({'error': 'Staff authentication required'}), 401
        return f(*args, **kwargs)
    return decorated


def _get_staff_username():
    """Return the staff username for audit logging."""
    staff_id = _get_staff_id()
    if not staff_id:
        return 'agent'
    from src.models.order import StaffUser
    staff = StaffUser.query.get(staff_id)
    return staff.username if staff else 'agent'


# ── Sequence number generators ────────────────────────────────────────────────

def _next_rfq_number():
    year = datetime.utcnow().year
    last = RFQ.query.filter(RFQ.rfq_number.like(f'RFQ-{year}-%')) \
                    .order_by(RFQ.id.desc()).first()
    if last:
        seq = int(last.rfq_number.split('-')[-1]) + 1
    else:
        seq = 1
    return f'RFQ-{year}-{seq:04d}'


def _next_shipment_number():
    year = datetime.utcnow().year
    last = Shipment.query.filter(Shipment.shipment_number.like(f'SHP-{year}-%')) \
                         .order_by(Shipment.id.desc()).first()
    if last:
        seq = int(last.shipment_number.split('-')[-1]) + 1
    else:
        seq = 1
    return f'SHP-{year}-{seq:04d}'


def _next_qc_number():
    year = datetime.utcnow().year
    last = QCInspection.query.filter(QCInspection.inspection_number.like(f'QC-{year}-%')) \
                              .order_by(QCInspection.id.desc()).first()
    if last:
        seq = int(last.inspection_number.split('-')[-1]) + 1
    else:
        seq = 1
    return f'QC-{year}-{seq:04d}'


# ═══════════════════════════════════════════════════════════════════════════════
# SUPPLIER MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@sourcing_bp.route('/sourcing/suppliers', methods=['POST'])
@staff_required
def create_supplier():
    """
    Add a new supplier.

    Body fields (all optional except `name`):
      name, name_zh, contact_name, contact_name_zh, email, phone, wechat_id,
      country, city, address, website, platform_url, platform, categories,
      notes, notes_zh, rating
    """
    data = request.json or {}
    if not data.get('name'):
        return jsonify({'error': 'Supplier name is required'}), 400

    supplier = Supplier(
        name=data['name'],
        name_zh=data.get('name_zh'),
        contact_name=data.get('contact_name'),
        contact_name_zh=data.get('contact_name_zh'),
        email=data.get('email'),
        phone=data.get('phone'),
        wechat_id=data.get('wechat_id'),
        country=data.get('country', 'China'),
        city=data.get('city'),
        address=data.get('address'),
        website=data.get('website'),
        platform_url=data.get('platform_url'),
        platform=data.get('platform'),
        categories=data.get('categories'),
        notes=data.get('notes'),
        notes_zh=data.get('notes_zh'),
        rating=data.get('rating'),
        created_by=_get_staff_username(),
    )
    db.session.add(supplier)
    db.session.commit()
    return jsonify({'success': True, 'supplier': supplier.to_dict()}), 201


@sourcing_bp.route('/sourcing/suppliers', methods=['GET'])
@staff_required
def list_suppliers():
    """
    List all suppliers.

    Query params:
      - active (bool): Filter by active status (default: true)
      - search (str): Search by name, contact, or categories
      - platform (str): Filter by platform ('1688', 'alibaba', etc.)
    """
    active_filter = request.args.get('active', 'true').lower()
    search = request.args.get('search', '').strip()
    platform = request.args.get('platform', '').strip()

    query = Supplier.query
    if active_filter == 'true':
        query = query.filter_by(is_active=True)
    elif active_filter == 'false':
        query = query.filter_by(is_active=False)
    if search:
        query = query.filter(
            db.or_(
                Supplier.name.ilike(f'%{search}%'),
                Supplier.name_zh.ilike(f'%{search}%'),
                Supplier.contact_name.ilike(f'%{search}%'),
                Supplier.categories.ilike(f'%{search}%'),
            )
        )
    if platform:
        query = query.filter_by(platform=platform)

    suppliers = query.order_by(Supplier.name).all()
    return jsonify([s.to_dict() for s in suppliers])


@sourcing_bp.route('/sourcing/suppliers/<int:supplier_id>', methods=['GET'])
@staff_required
def get_supplier(supplier_id):
    """Get a supplier by ID, including their RFQ and shipment counts."""
    supplier = Supplier.query.get_or_404(supplier_id)
    data = supplier.to_dict()
    data['rfq_count'] = RFQ.query.filter_by(supplier_id=supplier_id).count()
    data['shipment_count'] = Shipment.query.filter_by(supplier_id=supplier_id).count()
    data['active_shipments'] = Shipment.query.filter_by(
        supplier_id=supplier_id
    ).filter(
        Shipment.status.in_(['pending', 'in_transit', 'customs'])
    ).count()
    return jsonify(data)


@sourcing_bp.route('/sourcing/suppliers/<int:supplier_id>', methods=['PUT'])
@staff_required
def update_supplier(supplier_id):
    """Update a supplier's information."""
    supplier = Supplier.query.get_or_404(supplier_id)
    data = request.json or {}

    updatable = [
        'name', 'name_zh', 'contact_name', 'contact_name_zh', 'email', 'phone',
        'wechat_id', 'country', 'city', 'address', 'website', 'platform_url',
        'platform', 'categories', 'notes', 'notes_zh', 'rating', 'is_active',
    ]
    for field in updatable:
        if field in data:
            setattr(supplier, field, data[field])

    db.session.commit()
    return jsonify({'success': True, 'supplier': supplier.to_dict()})


# ═══════════════════════════════════════════════════════════════════════════════
# RFQ MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@sourcing_bp.route('/sourcing/rfqs', methods=['POST'])
@staff_required
def create_rfq():
    """
    Create a new Request for Quote.

    Required: product_name, quantity_needed
    Optional: supplier_id, product_id, product_sku, target_unit_price, currency,
              description, description_zh, deadline, notes
    """
    data = request.json or {}
    if not data.get('product_name'):
        return jsonify({'error': 'product_name is required'}), 400
    if not data.get('quantity_needed'):
        return jsonify({'error': 'quantity_needed is required'}), 400

    # Auto-populate description_zh if description provided but no zh translation
    description_zh = data.get('description_zh')

    rfq = RFQ(
        rfq_number=_next_rfq_number(),
        supplier_id=data.get('supplier_id'),
        product_id=data.get('product_id'),
        product_name=data['product_name'],
        product_sku=data.get('product_sku'),
        quantity_needed=int(data['quantity_needed']),
        target_unit_price=data.get('target_unit_price'),
        currency=data.get('currency', 'USD'),
        description=data.get('description'),
        description_zh=description_zh,
        status=data.get('status', 'draft'),
        deadline=datetime.fromisoformat(data['deadline']) if data.get('deadline') else None,
        notes=data.get('notes'),
        created_by=_get_staff_username(),
    )
    db.session.add(rfq)
    db.session.commit()
    return jsonify({'success': True, 'rfq': rfq.to_dict(include_quotes=True)}), 201


@sourcing_bp.route('/sourcing/rfqs', methods=['GET'])
@staff_required
def list_rfqs():
    """
    List all RFQs.

    Query params:
      - status (str): Filter by status (draft, sent, quoted, awarded, cancelled)
      - supplier_id (int): Filter by supplier
      - product_id (int): Filter by product
    """
    status = request.args.get('status', '').strip()
    supplier_id = request.args.get('supplier_id', type=int)
    product_id = request.args.get('product_id', type=int)

    query = RFQ.query
    if status:
        query = query.filter_by(status=status)
    if supplier_id:
        query = query.filter_by(supplier_id=supplier_id)
    if product_id:
        query = query.filter_by(product_id=product_id)

    rfqs = query.order_by(RFQ.created_at.desc()).all()
    return jsonify([r.to_dict(include_quotes=True) for r in rfqs])


@sourcing_bp.route('/sourcing/rfqs/<int:rfq_id>/quotes', methods=['PUT'])
@staff_required
def add_rfq_quote(rfq_id):
    """
    Add a supplier quote response to an RFQ.

    Required: unit_price
    Optional: supplier_id, currency, moq, lead_time_days, sample_available,
              sample_price, payment_terms, notes, notes_zh
    """
    rfq = RFQ.query.get_or_404(rfq_id)
    data = request.json or {}

    if data.get('unit_price') is None:
        return jsonify({'error': 'unit_price is required'}), 400

    quote = RFQQuote(
        rfq_id=rfq_id,
        supplier_id=data.get('supplier_id', rfq.supplier_id),
        unit_price=float(data['unit_price']),
        currency=data.get('currency', rfq.currency),
        moq=data.get('moq'),
        lead_time_days=data.get('lead_time_days'),
        sample_available=data.get('sample_available', False),
        sample_price=data.get('sample_price'),
        payment_terms=data.get('payment_terms'),
        notes=data.get('notes'),
        notes_zh=data.get('notes_zh'),
    )
    db.session.add(quote)

    # Auto-advance RFQ status to 'quoted' if it was 'sent'
    if rfq.status == 'sent':
        rfq.status = 'quoted'

    db.session.commit()
    return jsonify({'success': True, 'quote': quote.to_dict(), 'rfq': rfq.to_dict(include_quotes=True)})


@sourcing_bp.route('/sourcing/rfqs/<int:rfq_id>/award', methods=['POST'])
@staff_required
def award_rfq(rfq_id):
    """
    Award an RFQ to a specific quote/supplier.

    Required: quote_id
    """
    rfq = RFQ.query.get_or_404(rfq_id)
    data = request.json or {}
    quote_id = data.get('quote_id')

    if not quote_id:
        return jsonify({'error': 'quote_id is required'}), 400

    quote = RFQQuote.query.get_or_404(quote_id)
    if quote.rfq_id != rfq_id:
        return jsonify({'error': 'Quote does not belong to this RFQ'}), 400

    # Clear any previous award
    RFQQuote.query.filter_by(rfq_id=rfq_id).update({'is_awarded': False})

    quote.is_awarded = True
    rfq.awarded_quote_id = quote_id
    rfq.status = 'awarded'
    db.session.commit()

    return jsonify({'success': True, 'rfq': rfq.to_dict(include_quotes=True)})


# ═══════════════════════════════════════════════════════════════════════════════
# SHIPMENT TRACKING
# ═══════════════════════════════════════════════════════════════════════════════

@sourcing_bp.route('/sourcing/shipments', methods=['POST'])
@staff_required
def create_shipment():
    """
    Log a new inbound shipment.

    Required: (none — all fields optional but supplier_id or product_name recommended)
    """
    data = request.json or {}
    staff = _get_staff_username()

    shipment = Shipment(
        shipment_number=_next_shipment_number(),
        supplier_id=data.get('supplier_id'),
        rfq_id=data.get('rfq_id'),
        product_id=data.get('product_id'),
        product_name=data.get('product_name'),
        quantity=data.get('quantity'),
        tracking_number=data.get('tracking_number'),
        carrier=data.get('carrier'),
        shipping_method=data.get('shipping_method'),
        origin_country=data.get('origin_country', 'China'),
        destination=data.get('destination'),
        status=data.get('status', 'pending'),
        estimated_arrival=datetime.fromisoformat(data['estimated_arrival']) if data.get('estimated_arrival') else None,
        total_cost=data.get('total_cost'),
        currency=data.get('currency', 'USD'),
        notes=data.get('notes'),
        created_by=staff,
    )
    db.session.add(shipment)
    db.session.flush()  # get shipment.id before adding event

    # Log the initial creation event
    event = ShipmentEvent(
        shipment_id=shipment.id,
        status='pending',
        description='Shipment created',
        recorded_by=staff,
    )
    db.session.add(event)
    db.session.commit()

    return jsonify({'success': True, 'shipment': shipment.to_dict(include_timeline=True)}), 201


@sourcing_bp.route('/sourcing/shipments', methods=['GET'])
@staff_required
def list_shipments():
    """
    List all shipments.

    Query params:
      - status (str): Filter by status
      - supplier_id (int): Filter by supplier
      - active (bool): If true, only show non-delivered/non-received shipments
    """
    status = request.args.get('status', '').strip()
    supplier_id = request.args.get('supplier_id', type=int)
    active = request.args.get('active', '').lower()

    query = Shipment.query
    if status:
        query = query.filter_by(status=status)
    if supplier_id:
        query = query.filter_by(supplier_id=supplier_id)
    if active == 'true':
        query = query.filter(Shipment.status.notin_(['received', 'lost']))

    shipments = query.order_by(Shipment.created_at.desc()).all()
    return jsonify([s.to_dict() for s in shipments])


@sourcing_bp.route('/sourcing/shipments/<int:shipment_id>/status', methods=['PUT'])
@staff_required
def update_shipment_status(shipment_id):
    """
    Update a shipment's tracking status and log a timeline event.

    Required: status
    Optional: location, description, description_zh, tracking_number,
              estimated_arrival, customs_status, actual_arrival
    """
    shipment = Shipment.query.get_or_404(shipment_id)
    data = request.json or {}
    staff = _get_staff_username()

    new_status = data.get('status')
    valid_statuses = ['pending', 'in_transit', 'customs', 'arrived', 'received', 'delayed', 'lost']
    if new_status and new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of: {valid_statuses}'}), 400

    if new_status:
        shipment.status = new_status

    if data.get('tracking_number'):
        shipment.tracking_number = data['tracking_number']
    if data.get('estimated_arrival'):
        shipment.estimated_arrival = datetime.fromisoformat(data['estimated_arrival'])
    if data.get('customs_status'):
        shipment.customs_status = data['customs_status']
    if new_status == 'received' and not shipment.actual_arrival:
        shipment.actual_arrival = datetime.utcnow()
    if data.get('actual_arrival'):
        shipment.actual_arrival = datetime.fromisoformat(data['actual_arrival'])

    # Log the timeline event
    event = ShipmentEvent(
        shipment_id=shipment_id,
        status=new_status or shipment.status,
        location=data.get('location'),
        description=data.get('description'),
        description_zh=data.get('description_zh'),
        recorded_by=data.get('recorded_by', staff),
    )
    db.session.add(event)
    db.session.commit()

    return jsonify({'success': True, 'shipment': shipment.to_dict(include_timeline=True)})


@sourcing_bp.route('/sourcing/shipments/<int:shipment_id>/timeline', methods=['GET'])
@staff_required
def get_shipment_timeline(shipment_id):
    """Get the full timeline of events for a shipment."""
    shipment = Shipment.query.get_or_404(shipment_id)
    return jsonify(shipment.to_dict(include_timeline=True))


# ═══════════════════════════════════════════════════════════════════════════════
# QC INSPECTIONS
# ═══════════════════════════════════════════════════════════════════════════════

@sourcing_bp.route('/sourcing/qc/inspections', methods=['POST'])
@staff_required
def create_qc_inspection():
    """
    Create a new QC inspection record.

    Optional: shipment_id, supplier_id, product_id, product_name,
              quantity_inspected, inspector_name, inspection_date, checklist,
              notes, notes_zh
    """
    data = request.json or {}

    inspection = QCInspection(
        inspection_number=_next_qc_number(),
        shipment_id=data.get('shipment_id'),
        supplier_id=data.get('supplier_id'),
        product_id=data.get('product_id'),
        product_name=data.get('product_name'),
        quantity_inspected=data.get('quantity_inspected'),
        inspector_name=data.get('inspector_name'),
        inspection_date=datetime.fromisoformat(data['inspection_date']) if data.get('inspection_date') else None,
        checklist=data.get('checklist'),
        notes=data.get('notes'),
        notes_zh=data.get('notes_zh'),
        status='pending',
        created_by=_get_staff_username(),
    )
    db.session.add(inspection)
    db.session.commit()
    return jsonify({'success': True, 'inspection': inspection.to_dict()}), 201


@sourcing_bp.route('/sourcing/qc/inspections/<int:inspection_id>', methods=['PUT'])
@staff_required
def update_qc_inspection(inspection_id):
    """
    Update a QC inspection with results, photos, and pass/fail data.

    Optional: quantity_passed, quantity_failed, result, checklist,
              defects_found, defects_found_zh, photos, notes, notes_zh,
              inspector_name, inspection_date, status
    """
    inspection = QCInspection.query.get_or_404(inspection_id)
    data = request.json or {}

    updatable = [
        'quantity_inspected', 'quantity_passed', 'quantity_failed', 'result',
        'checklist', 'defects_found', 'defects_found_zh', 'photos',
        'inspector_name', 'notes', 'notes_zh', 'status',
    ]
    for field in updatable:
        if field in data:
            setattr(inspection, field, data[field])

    if data.get('inspection_date'):
        inspection.inspection_date = datetime.fromisoformat(data['inspection_date'])

    # Auto-set status to 'complete' if a result is provided
    if data.get('result') and inspection.status != 'complete':
        inspection.status = 'complete'

    db.session.commit()
    return jsonify({'success': True, 'inspection': inspection.to_dict()})


@sourcing_bp.route('/sourcing/qc/inspections', methods=['GET'])
@staff_required
def list_qc_inspections():
    """
    List all QC inspections.

    Query params:
      - status (str): pending, in_progress, complete
      - result (str): pass, fail, conditional
      - shipment_id (int): Filter by shipment
      - supplier_id (int): Filter by supplier
    """
    status = request.args.get('status', '').strip()
    result = request.args.get('result', '').strip()
    shipment_id = request.args.get('shipment_id', type=int)
    supplier_id = request.args.get('supplier_id', type=int)

    query = QCInspection.query
    if status:
        query = query.filter_by(status=status)
    if result:
        query = query.filter_by(result=result)
    if shipment_id:
        query = query.filter_by(shipment_id=shipment_id)
    if supplier_id:
        query = query.filter_by(supplier_id=supplier_id)

    inspections = query.order_by(QCInspection.created_at.desc()).all()
    return jsonify([i.to_dict() for i in inspections])


# ═══════════════════════════════════════════════════════════════════════════════
# INVENTORY NEEDS (connects to existing product catalog)
# ═══════════════════════════════════════════════════════════════════════════════

@sourcing_bp.route('/sourcing/inventory-needs', methods=['GET'])
@staff_required
def inventory_needs():
    """
    Returns products that are low on stock and may need sourcing.

    A product is flagged as needing sourcing when:
      - stock_quantity <= reorder_threshold (default: 20 units)
      - OR in_stock is False

    Query params:
      - threshold (int): Override the default low-stock threshold (default: 20)
      - include_out_of_stock (bool): Include products with in_stock=False (default: true)

    Each product in the response includes:
      - product details
      - open_rfqs: count of active RFQs for this product
      - active_shipments: count of in-transit shipments for this product
      - last_supplier: most recently used supplier for this product
    """
    threshold = request.args.get('threshold', 20, type=int)
    include_oos = request.args.get('include_out_of_stock', 'true').lower() == 'true'

    query = Product.query.filter(
        db.or_(
            Product.stock_quantity <= threshold,
            Product.in_stock == False if include_oos else False,
        )
    ).order_by(Product.stock_quantity.asc())

    products = query.all()
    result = []
    for p in products:
        data = p.list_dict()
        data['description'] = p.description  # include description for sourcing context

        # Count open RFQs for this product
        open_rfqs = RFQ.query.filter_by(product_id=p.id).filter(
            RFQ.status.in_(['draft', 'sent', 'quoted'])
        ).count()
        data['open_rfqs'] = open_rfqs

        # Count active inbound shipments for this product
        active_shipments = Shipment.query.filter_by(product_id=p.id).filter(
            Shipment.status.in_(['pending', 'in_transit', 'customs', 'arrived'])
        ).count()
        data['active_shipments'] = active_shipments

        # Most recently used supplier for this product
        last_shipment = Shipment.query.filter_by(product_id=p.id) \
                                      .order_by(Shipment.created_at.desc()).first()
        if last_shipment and last_shipment.supplier:
            data['last_supplier'] = {
                'id': last_shipment.supplier.id,
                'name': last_shipment.supplier.name,
            }
        else:
            data['last_supplier'] = None

        # Urgency flag
        if p.stock_quantity == 0 or not p.in_stock:
            data['urgency'] = 'critical'
        elif p.stock_quantity <= threshold // 2:
            data['urgency'] = 'high'
        else:
            data['urgency'] = 'medium'

        result.append(data)

    return jsonify({
        'total': len(result),
        'threshold': threshold,
        'products': result,
    })
