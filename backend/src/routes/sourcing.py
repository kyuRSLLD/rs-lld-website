"""
Sourcing API Routes
====================
All endpoints require staff authentication (JWT Bearer or session cookie).

  Supplier Management
    POST   /api/sourcing/suppliers
    GET    /api/sourcing/suppliers
    GET    /api/sourcing/suppliers/<id>
    PUT    /api/sourcing/suppliers/<id>

  RFQ Management
    POST   /api/sourcing/rfqs
    GET    /api/sourcing/rfqs
    PUT    /api/sourcing/rfqs/<id>/quotes       Add a supplier quote to the quotes JSON array
    POST   /api/sourcing/rfqs/<id>/award        Award RFQ to a supplier

  Shipment Tracking
    POST   /api/sourcing/shipments
    GET    /api/sourcing/shipments
    PUT    /api/sourcing/shipments/<id>/status  Update status + append to timeline JSON array
    GET    /api/sourcing/shipments/<id>/timeline

  QC Inspections
    POST   /api/sourcing/qc/inspections
    GET    /api/sourcing/qc/inspections
    PUT    /api/sourcing/qc/inspections/<id>

  Inventory Needs
    GET    /api/sourcing/inventory-needs

  Sourcing Orchestrator (AI)
    POST   /api/sourcing/orchestrate            Generate sub-agent config for a sourcing requirement
"""

import os
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, session

from src.models.user import db
from src.models.product import Product
from src.models.sourcing import Supplier, RFQ, Shipment, QCInspection, SupplierPayment

sourcing_bp = Blueprint('sourcing', __name__)

# ── Auth helpers ──────────────────────────────────────────────────────────────

def _get_staff_id():
    import jwt as _jwt
    if session.get('staff_id'):
        return session['staff_id']
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


def _staff_username():
    staff_id = _get_staff_id()
    if not staff_id:
        return 'agent'
    from src.models.order import StaffUser
    staff = StaffUser.query.get(staff_id)
    return staff.username if staff else 'agent'


# ── Auto-numbering ────────────────────────────────────────────────────────────

def _next_number(model, field, prefix):
    year = datetime.utcnow().year
    pattern = f'{prefix}-{year}-%'
    last = model.query.filter(getattr(model, field).like(pattern)) \
                      .order_by(model.id.desc()).first()
    seq = (int(getattr(last, field).split('-')[-1]) + 1) if last else 1
    return f'{prefix}-{year}-{seq:04d}'


# ═══════════════════════════════════════════════════════════════════════════════
# SUPPLIER MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@sourcing_bp.route('/sourcing/suppliers', methods=['POST'])
@staff_required
def create_supplier():
    data = request.json or {}
    if not data.get('name'):
        return jsonify({'error': 'name is required'}), 400
    s = Supplier(
        name=data['name'],
        name_cn=data.get('name_cn'),
        platform=data.get('platform'),
        location=data.get('location'),
        contact_name=data.get('contact_name'),
        contact_wechat=data.get('contact_wechat'),
        contact_email=data.get('contact_email'),
        contact_phone=data.get('contact_phone'),
        product_categories=data.get('product_categories', []),
        rating=data.get('rating', 0),
        lead_time_days=data.get('lead_time_days'),
        moq_notes=data.get('moq_notes'),
        payment_terms=data.get('payment_terms'),
        is_active=data.get('is_active', True),
        notes=data.get('notes'),
        created_by=_staff_username(),
    )
    db.session.add(s)
    db.session.commit()
    return jsonify({'success': True, 'supplier': s.to_dict()}), 201


@sourcing_bp.route('/sourcing/suppliers', methods=['GET'])
@staff_required
def list_suppliers():
    active = request.args.get('active', 'true').lower()
    search = request.args.get('search', '').strip()
    platform = request.args.get('platform', '').strip()

    q = Supplier.query
    if active == 'true':
        q = q.filter_by(is_active=True)
    elif active == 'false':
        q = q.filter_by(is_active=False)
    if search:
        q = q.filter(db.or_(
            Supplier.name.ilike(f'%{search}%'),
            Supplier.name_cn.ilike(f'%{search}%'),
            Supplier.location.ilike(f'%{search}%'),
            Supplier.contact_name.ilike(f'%{search}%'),
        ))
    if platform:
        q = q.filter_by(platform=platform)
    return jsonify([s.to_dict() for s in q.order_by(Supplier.name).all()])


@sourcing_bp.route('/sourcing/suppliers/<int:sid>', methods=['GET'])
@staff_required
def get_supplier(sid):
    s = Supplier.query.get_or_404(sid)
    data = s.to_dict()
    data['rfq_count'] = RFQ.query.filter_by(awarded_supplier_id=sid).count()
    data['shipment_count'] = Shipment.query.filter_by(supplier_id=sid).count()
    data['active_shipments'] = Shipment.query.filter_by(supplier_id=sid).filter(
        Shipment.status.notin_(['delivered'])
    ).count()
    return jsonify(data)


@sourcing_bp.route('/sourcing/suppliers/<int:sid>', methods=['PUT'])
@staff_required
def update_supplier(sid):
    s = Supplier.query.get_or_404(sid)
    data = request.json or {}
    fields = ['name', 'name_cn', 'platform', 'location', 'contact_name', 'contact_wechat',
              'contact_email', 'contact_phone', 'product_categories', 'rating',
              'lead_time_days', 'moq_notes', 'payment_terms', 'is_active', 'notes']
    for f in fields:
        if f in data:
            setattr(s, f, data[f])
    db.session.commit()
    return jsonify({'success': True, 'supplier': s.to_dict()})


# ═══════════════════════════════════════════════════════════════════════════════
# RFQ MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@sourcing_bp.route('/sourcing/rfqs', methods=['POST'])
@staff_required
def create_rfq():
    data = request.json or {}
    rfq = RFQ(
        rfq_number=_next_number(RFQ, 'rfq_number', 'RFQ'),
        product_id=data.get('product_id'),
        description=data.get('description'),
        target_unit_price=data.get('target_unit_price'),
        quantity=data.get('quantity'),
        status=data.get('status', 'draft'),
        quotes=[],
        created_by=_staff_username(),
    )
    db.session.add(rfq)
    db.session.commit()
    return jsonify({'success': True, 'rfq': rfq.to_dict()}), 201


@sourcing_bp.route('/sourcing/rfqs', methods=['GET'])
@staff_required
def list_rfqs():
    status = request.args.get('status', '').strip()
    product_id = request.args.get('product_id', type=int)
    q = RFQ.query
    if status:
        q = q.filter_by(status=status)
    if product_id:
        q = q.filter_by(product_id=product_id)
    return jsonify([r.to_dict() for r in q.order_by(RFQ.created_at.desc()).all()])


@sourcing_bp.route('/sourcing/rfqs/<int:rfq_id>/quotes', methods=['PUT'])
@staff_required
def add_rfq_quote(rfq_id):
    """Append a supplier quote to the RFQ's quotes JSON array."""
    rfq = RFQ.query.get_or_404(rfq_id)
    data = request.json or {}
    if data.get('price') is None:
        return jsonify({'error': 'price is required'}), 400

    supplier_id = data.get('supplier_id')
    supplier_name = None
    if supplier_id:
        s = Supplier.query.get(supplier_id)
        supplier_name = s.name if s else None

    quote_entry = {
        'supplier_id': supplier_id,
        'supplier_name': supplier_name,
        'price': float(data['price']),
        'moq': data.get('moq'),
        'lead_time': data.get('lead_time'),
        'notes': data.get('notes'),
        'received_at': datetime.utcnow().isoformat(),
    }

    current_quotes = list(rfq.quotes or [])
    current_quotes.append(quote_entry)
    rfq.quotes = current_quotes

    if rfq.status == 'sent':
        rfq.status = 'quoted'

    db.session.commit()
    return jsonify({'success': True, 'rfq': rfq.to_dict()})


@sourcing_bp.route('/sourcing/rfqs/<int:rfq_id>/award', methods=['POST'])
@staff_required
def award_rfq(rfq_id):
    """Award an RFQ to a specific supplier."""
    rfq = RFQ.query.get_or_404(rfq_id)
    data = request.json or {}
    supplier_id = data.get('supplier_id')
    if not supplier_id:
        return jsonify({'error': 'supplier_id is required'}), 400
    rfq.awarded_supplier_id = supplier_id
    rfq.status = 'awarded'
    db.session.commit()
    return jsonify({'success': True, 'rfq': rfq.to_dict()})


# ═══════════════════════════════════════════════════════════════════════════════
# SHIPMENT TRACKING
# ═══════════════════════════════════════════════════════════════════════════════

@sourcing_bp.route('/sourcing/shipments', methods=['POST'])
@staff_required
def create_shipment():
    data = request.json or {}
    staff = _staff_username()
    shipment = Shipment(
        shipment_number=_next_number(Shipment, 'shipment_number', 'SHP'),
        supplier_id=data.get('supplier_id'),
        rfq_id=data.get('rfq_id'),
        tracking_number=data.get('tracking_number'),
        carrier=data.get('carrier'),
        status=data.get('status', 'production'),
        origin=data.get('origin'),
        destination=data.get('destination', 'Chicago warehouse'),
        eta=datetime.fromisoformat(data['eta']) if data.get('eta') else None,
        items=data.get('items', []),
        documents=data.get('documents', []),
        timeline=[{
            'date': datetime.utcnow().isoformat(),
            'event': 'Shipment created',
            'notes': data.get('notes', ''),
            'recorded_by': staff,
        }],
        total_cost=data.get('total_cost'),
        currency=data.get('currency', 'USD'),
        notes=data.get('notes'),
        created_by=staff,
    )
    db.session.add(shipment)
    db.session.commit()
    return jsonify({'success': True, 'shipment': shipment.to_dict()}), 201


@sourcing_bp.route('/sourcing/shipments', methods=['GET'])
@staff_required
def list_shipments():
    status = request.args.get('status', '').strip()
    supplier_id = request.args.get('supplier_id', type=int)
    active = request.args.get('active', '').lower()
    q = Shipment.query
    if status:
        q = q.filter_by(status=status)
    if supplier_id:
        q = q.filter_by(supplier_id=supplier_id)
    if active == 'true':
        q = q.filter(Shipment.status != 'delivered')
    return jsonify([s.to_dict() for s in q.order_by(Shipment.created_at.desc()).all()])


@sourcing_bp.route('/sourcing/shipments/<int:sid>/status', methods=['PUT'])
@staff_required
def update_shipment_status(sid):
    """Update shipment status and append an event to the timeline JSON array."""
    shipment = Shipment.query.get_or_404(sid)
    data = request.json or {}
    staff = _staff_username()

    valid = ['production', 'qc', 'shipped', 'in_transit', 'customs', 'delivered']
    new_status = data.get('status')
    if new_status and new_status not in valid:
        return jsonify({'error': f'status must be one of: {valid}'}), 400

    if new_status:
        shipment.status = new_status
    if data.get('tracking_number'):
        shipment.tracking_number = data['tracking_number']
    if data.get('eta'):
        shipment.eta = datetime.fromisoformat(data['eta'])
    if new_status == 'delivered' and not shipment.actual_arrival:
        shipment.actual_arrival = datetime.utcnow()

    # Append to timeline
    event = {
        'date': datetime.utcnow().isoformat(),
        'event': data.get('event', new_status or shipment.status),
        'notes': data.get('notes', ''),
        'location': data.get('location', ''),
        'recorded_by': data.get('recorded_by', staff),
    }
    current_timeline = list(shipment.timeline or [])
    current_timeline.append(event)
    shipment.timeline = current_timeline

    db.session.commit()
    return jsonify({'success': True, 'shipment': shipment.to_dict()})


@sourcing_bp.route('/sourcing/shipments/<int:sid>/timeline', methods=['GET'])
@staff_required
def get_shipment_timeline(sid):
    shipment = Shipment.query.get_or_404(sid)
    return jsonify({
        'shipment_number': shipment.shipment_number,
        'status': shipment.status,
        'timeline': shipment.timeline or [],
    })


# ═══════════════════════════════════════════════════════════════════════════════
# QC INSPECTIONS
# ═══════════════════════════════════════════════════════════════════════════════

@sourcing_bp.route('/sourcing/qc/inspections', methods=['POST'])
@staff_required
def create_qc_inspection():
    data = request.json or {}
    insp = QCInspection(
        inspection_number=_next_number(QCInspection, 'inspection_number', 'QC'),
        shipment_id=data.get('shipment_id'),
        supplier_id=data.get('supplier_id'),
        product_id=data.get('product_id'),
        product_name=data.get('product_name'),
        quantity_inspected=data.get('quantity_inspected'),
        inspector_name=data.get('inspector_name'),
        inspection_date=datetime.fromisoformat(data['inspection_date']) if data.get('inspection_date') else None,
        checklist=data.get('checklist'),
        notes=data.get('notes'),
        status='pending',
        created_by=_staff_username(),
    )
    db.session.add(insp)
    db.session.commit()
    return jsonify({'success': True, 'inspection': insp.to_dict()}), 201


@sourcing_bp.route('/sourcing/qc/inspections', methods=['GET'])
@staff_required
def list_qc_inspections():
    status = request.args.get('status', '').strip()
    result = request.args.get('result', '').strip()
    shipment_id = request.args.get('shipment_id', type=int)
    supplier_id = request.args.get('supplier_id', type=int)
    q = QCInspection.query
    if status:
        q = q.filter_by(status=status)
    if result:
        q = q.filter_by(result=result)
    if shipment_id:
        q = q.filter_by(shipment_id=shipment_id)
    if supplier_id:
        q = q.filter_by(supplier_id=supplier_id)
    return jsonify([i.to_dict() for i in q.order_by(QCInspection.created_at.desc()).all()])


@sourcing_bp.route('/sourcing/qc/inspections/<int:iid>', methods=['PUT'])
@staff_required
def update_qc_inspection(iid):
    insp = QCInspection.query.get_or_404(iid)
    data = request.json or {}
    fields = ['quantity_inspected', 'quantity_passed', 'quantity_failed', 'result',
              'checklist', 'defects_found', 'photos', 'inspector_name', 'notes', 'status']
    for f in fields:
        if f in data:
            setattr(insp, f, data[f])
    if data.get('inspection_date'):
        insp.inspection_date = datetime.fromisoformat(data['inspection_date'])
    if data.get('result') and insp.status != 'complete':
        insp.status = 'complete'
    db.session.commit()
    return jsonify({'success': True, 'inspection': insp.to_dict()})


# ═══════════════════════════════════════════════════════════════════════════════
# INVENTORY NEEDS
# ═══════════════════════════════════════════════════════════════════════════════

@sourcing_bp.route('/sourcing/inventory-needs', methods=['GET'])
@staff_required
def inventory_needs():
    """Products low on stock that may need sourcing. Used by the orchestrator."""
    threshold = request.args.get('threshold', 20, type=int)
    include_oos = request.args.get('include_out_of_stock', 'true').lower() == 'true'

    conditions = [Product.stock_quantity <= threshold]
    if include_oos:
        conditions.append(Product.in_stock == False)

    products = Product.query.filter(db.or_(*conditions)) \
                            .order_by(Product.stock_quantity.asc()).all()

    result = []
    for p in products:
        data = p.list_dict()
        open_rfqs = RFQ.query.filter_by(product_id=p.id).filter(
            RFQ.status.in_(['draft', 'sent', 'quoted'])
        ).count()
        active_shipments = Shipment.query.filter(
            Shipment.items.contains([{'product_id': p.id}])
        ).filter(Shipment.status != 'delivered').count()
        last_ship = Shipment.query.filter_by(supplier_id=None).first()  # fallback
        # Try to find last supplier via awarded RFQ
        last_rfq = RFQ.query.filter_by(product_id=p.id, status='awarded') \
                             .order_by(RFQ.created_at.desc()).first()
        last_supplier = None
        if last_rfq and last_rfq.awarded_supplier_id:
            sup = Supplier.query.get(last_rfq.awarded_supplier_id)
            if sup:
                last_supplier = {'id': sup.id, 'name': sup.name}

        if p.stock_quantity == 0 or not p.in_stock:
            urgency = 'critical'
        elif p.stock_quantity <= threshold // 2:
            urgency = 'high'
        else:
            urgency = 'medium'

        data.update({
            'open_rfqs': open_rfqs,
            'active_shipments': active_shipments,
            'last_supplier': last_supplier,
            'urgency': urgency,
        })
        result.append(data)

    return jsonify({'total': len(result), 'threshold': threshold, 'products': result})


# ═══════════════════════════════════════════════════════════════════════════════
# SOURCING ORCHESTRATOR  (AI-powered sub-agent generator)
# ═══════════════════════════════════════════════════════════════════════════════

SOURCING_ORCHESTRATOR_PROMPT = """You are a supply chain architect for LLD Restaurant Supply,
a Chicago-based wholesale distributor that sources non-perishable restaurant supplies from
manufacturers in China (primarily Guangzhou and Shenzhen).

Given a sourcing requirement, generate a JSON sub-agent configuration. Sub-agent types:
- supplier_discovery: finds and evaluates new suppliers
- rfq_manager: creates and manages requests for quotes
- qc_coordinator: manages quality control inspections
- shipment_tracker: monitors logistics from China to Chicago
- supplier_comms: handles bilingual (English/Mandarin) supplier communication

Each sub-agent config needs:
- name, agent_type, system_prompt
- tools_enabled: which sourcing API endpoints it can call
- language_capabilities: [en, zh]
- communication_channels: [email, wechat, platform_message]
- escalation_triggers: when to alert Kyu directly

For supplier communication agents, the system prompt MUST include:
- Bilingual capability (English + Mandarin)
- LLD's standard payment terms and shipping preferences
- Quality standards for restaurant-grade supplies
- Negotiation guidelines (target margins, MOQ flexibility)

Output valid JSON only."""


def _get_low_stock_products():
    """Helper: return serializable low-stock product list for the orchestrator."""
    threshold = 20
    products = Product.query.filter(
        db.or_(Product.stock_quantity <= threshold, Product.in_stock == False)
    ).order_by(Product.stock_quantity.asc()).limit(20).all()
    return [
        {
            'id': p.id,
            'name': p.name,
            'sku': p.sku,
            'stock_quantity': p.stock_quantity,
            'in_stock': p.in_stock,
            'category': p.category.name if p.category else None,
        }
        for p in products
    ]


def _get_active_suppliers():
    """Helper: return serializable active supplier list for the orchestrator."""
    suppliers = Supplier.query.filter_by(is_active=True).order_by(Supplier.rating.desc()).all()
    return [
        {
            'id': s.id,
            'name': s.name,
            'name_cn': s.name_cn,
            'platform': s.platform,
            'location': s.location,
            'product_categories': s.product_categories,
            'rating': s.rating,
            'lead_time_days': s.lead_time_days,
            'payment_terms': s.payment_terms,
        }
        for s in suppliers
    ]


@sourcing_bp.route('/sourcing/orchestrate', methods=['POST'])
@staff_required
def orchestrate():
    """
    Generate a sourcing sub-agent configuration using an LLM.

    Body:
      requirement (str): Natural language description of the sourcing need
                         e.g. "We need 50,000 vinyl gloves, medium size, under $0.05/unit"

    Returns:
      agent_config (dict): Full sub-agent configuration JSON from the LLM
      context (dict): The inventory needs and supplier data used as context
    """
    data = request.json or {}
    requirement = data.get('requirement', '').strip()
    if not requirement:
        return jsonify({'error': 'requirement is required'}), 400

    low_stock = _get_low_stock_products()
    active_suppliers = _get_active_suppliers()

    # Use OpenAI-compatible client (OPENAI_API_KEY is set in Railway env)
    try:
        from openai import OpenAI
        client = OpenAI()  # uses OPENAI_API_KEY + OPENAI_BASE_URL from env

        user_message = f"""Sourcing Requirement: {requirement}

Current Inventory Needs (low stock):
{json.dumps(low_stock, indent=2)}

Active Suppliers:
{json.dumps(active_suppliers, indent=2)}

Generate the sourcing sub-agent configuration."""

        response = client.chat.completions.create(
            model='gpt-4.1-mini',
            max_tokens=4000,
            messages=[
                {'role': 'system', 'content': SOURCING_ORCHESTRATOR_PROMPT},
                {'role': 'user', 'content': user_message},
            ],
            response_format={'type': 'json_object'},
        )

        agent_config = json.loads(response.choices[0].message.content)

        return jsonify({
            'success': True,
            'requirement': requirement,
            'agent_config': agent_config,
            'context': {
                'low_stock_products': low_stock,
                'active_suppliers': active_suppliers,
            },
        })

    except Exception as e:
        return jsonify({'error': f'Orchestrator failed: {str(e)}'}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# RFQ DETAIL
# ═══════════════════════════════════════════════════════════════════════════════

@sourcing_bp.route('/sourcing/rfqs/<int:rfq_id>', methods=['GET'])
@staff_required
def get_rfq(rfq_id):
    """Return full RFQ detail including all quotes and awarded supplier info."""
    rfq = RFQ.query.get_or_404(rfq_id)
    data = rfq.to_dict()
    # Enrich each quote with full supplier contact details
    enriched_quotes = []
    for q in (rfq.quotes or []):
        qdata = dict(q)
        if q.get('supplier_id'):
            s = Supplier.query.get(q['supplier_id'])
            if s:
                qdata['supplier_contact'] = s.contact_name
                qdata['supplier_email'] = s.contact_email
                qdata['supplier_wechat'] = s.contact_wechat
                qdata['supplier_lead_time_days'] = s.lead_time_days
        enriched_quotes.append(qdata)
    data['quotes'] = enriched_quotes
    # Attach product details
    if rfq.product:
        data['product_sku'] = rfq.product.sku
        data['product_category'] = rfq.product.category.name if rfq.product.category else None
        data['current_unit_price'] = rfq.product.unit_price
    return jsonify(data)


# ═══════════════════════════════════════════════════════════════════════════════
# AI QUOTE COMPARISON
# ═══════════════════════════════════════════════════════════════════════════════

@sourcing_bp.route('/sourcing/rfqs/<int:rfq_id>/compare', methods=['GET'])
@staff_required
def compare_rfq_quotes(rfq_id):
    """AI-powered side-by-side comparison of all quotes for an RFQ."""
    rfq = RFQ.query.get_or_404(rfq_id)
    quotes = rfq.quotes or []
    if not quotes:
        return jsonify({'error': 'No quotes to compare for this RFQ'}), 400

    product_name = rfq.product.name if rfq.product else rfq.description or 'Unknown product'
    target_price = rfq.target_unit_price
    quantity = rfq.quantity

    quotes_text = '\n'.join([
        '- Supplier: {} | Price: ${:.4f}/unit | MOQ: {} | Lead time: {} | Notes: {}'.format(
            q.get('supplier_name', 'Unknown'),
            float(q.get('price', 0)),
            q.get('moq', 'N/A'),
            q.get('lead_time', 'N/A'),
            q.get('notes', '')
        )
        for q in quotes
    ])

    prompt = (
        'You are a procurement analyst for LLD Restaurant Supply, a Chicago-based wholesale '
        'distributor sourcing from Chinese manufacturers.\n\n'
        'Product: {}\nQuantity needed: {}\nTarget unit price: ${}\n\n'
        'Supplier Quotes:\n{}\n\n'
        'Provide a concise comparison analysis in JSON format with these fields:\n'
        '- recommendation: which supplier to award and why (1-2 sentences)\n'
        '- best_price_supplier: name of cheapest supplier\n'
        '- best_value_supplier: name of best overall value (considering lead time, MOQ, notes)\n'
        '- savings_vs_target: estimated savings or overage vs target price per unit\n'
        '- risk_flags: list of any concerns (e.g. very long lead time, high MOQ, missing info)\n'
        '- quote_summary: array of objects with supplier_name, price, total_cost (price * quantity), '
        'verdict (recommended/acceptable/avoid)'
    ).format(product_name, quantity, target_price if target_price else 'Not set', quotes_text)

    try:
        from openai import OpenAI
        client = OpenAI()
        response = client.chat.completions.create(
            model='gpt-4.1-mini',
            max_tokens=1500,
            messages=[{'role': 'user', 'content': prompt}],
            response_format={'type': 'json_object'},
        )
        analysis = json.loads(response.choices[0].message.content)
        return jsonify({
            'rfq_number': rfq.rfq_number,
            'product': product_name,
            'quote_count': len(quotes),
            'analysis': analysis,
        })
    except Exception as e:
        return jsonify({'error': 'AI comparison failed: {}'.format(str(e))}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# AI BILINGUAL RFQ MESSAGE DRAFTER
# ═══════════════════════════════════════════════════════════════════════════════

@sourcing_bp.route('/sourcing/draft-rfq-message', methods=['POST'])
@staff_required
def draft_rfq_message():
    """
    Generate a bilingual (English + Mandarin) RFQ outreach message for a supplier.

    Body:
      supplier_id (int, optional): Supplier to address (personalises the message)
      product_name (str): Product being requested
      quantity (int): Quantity needed
      target_price (float, optional): Target unit price
      notes (str, optional): Any special requirements (certifications, packaging, etc.)
      tone (str, optional): formal (default) | friendly
    """
    data = request.json or {}
    product_name = data.get('product_name', '').strip()
    if not product_name:
        return jsonify({'error': 'product_name is required'}), 400

    quantity = data.get('quantity')
    target_price = data.get('target_price')
    notes = data.get('notes', '')
    tone = data.get('tone', 'formal')

    supplier_context = ''
    if data.get('supplier_id'):
        s = Supplier.query.get(data['supplier_id'])
        if s:
            supplier_context = 'Supplier name: {} ({})\nContact: {}\nPlatform: {}'.format(
                s.name, s.name_cn or '', s.contact_name or 'N/A', s.platform or 'N/A'
            )

    prompt = (
        'You are a bilingual procurement specialist for LLD Restaurant Supply, a Chicago-based '
        'wholesale distributor that sources restaurant supplies from Chinese manufacturers.\n\n'
        'Draft a {} RFQ outreach message in BOTH English and Mandarin Chinese.\n\n'
        'Details:\n'
        '- Product: {}\n'
        '- Quantity: {}\n'
        '- Target unit price: {}\n'
        '- Special requirements: {}\n'
        '{}\n\n'
        'LLD standard terms: Net 30 payment, FOB Guangzhou/Shenzhen, quality must meet US FDA/NSF '
        'standards for food-service equipment.\n\n'
        'Return JSON with fields:\n'
        '- subject_en: email subject in English\n'
        '- subject_cn: email subject in Chinese\n'
        '- body_en: full message body in English\n'
        '- body_cn: full message body in Chinese\n'
        '- key_points: list of 3-5 key negotiation points to emphasize'
    ).format(
        tone,
        product_name,
        '{:,}'.format(quantity) if quantity else 'TBD',
        '${:.4f}/unit'.format(float(target_price)) if target_price else 'Open to quotes',
        notes or 'Standard restaurant-grade quality',
        supplier_context
    )

    try:
        from openai import OpenAI
        client = OpenAI()
        response = client.chat.completions.create(
            model='gpt-4.1-mini',
            max_tokens=2000,
            messages=[{'role': 'user', 'content': prompt}],
            response_format={'type': 'json_object'},
        )
        message = json.loads(response.choices[0].message.content)
        return jsonify({'success': True, 'message': message})
    except Exception as e:
        return jsonify({'error': 'AI draft failed: {}'.format(str(e))}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# SUPPLIER PAYMENTS
# ═══════════════════════════════════════════════════════════════════════════════

@sourcing_bp.route('/sourcing/payments', methods=['POST'])
@staff_required
def create_payment():
    """Record a supplier payment."""
    data = request.json or {}
    if not data.get('supplier_id'):
        return jsonify({'error': 'supplier_id is required'}), 400
    if data.get('amount') is None:
        return jsonify({'error': 'amount is required'}), 400

    payment = SupplierPayment(
        payment_number=_next_number(SupplierPayment, 'payment_number', 'PAY'),
        supplier_id=data['supplier_id'],
        shipment_id=data.get('shipment_id'),
        rfq_id=data.get('rfq_id'),
        amount=float(data['amount']),
        currency=data.get('currency', 'USD'),
        payment_method=data.get('payment_method'),
        reference_number=data.get('reference_number'),
        payment_date=datetime.fromisoformat(data['payment_date']) if data.get('payment_date') else datetime.utcnow(),
        status=data.get('status', 'sent'),
        notes=data.get('notes'),
        created_by=_staff_username(),
    )
    db.session.add(payment)
    db.session.commit()
    return jsonify({'success': True, 'payment': payment.to_dict()}), 201


@sourcing_bp.route('/sourcing/payments', methods=['GET'])
@staff_required
def list_payments():
    """List supplier payments with optional filters."""
    supplier_id = request.args.get('supplier_id', type=int)
    shipment_id = request.args.get('shipment_id', type=int)
    rfq_id = request.args.get('rfq_id', type=int)
    status = request.args.get('status', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    q = SupplierPayment.query
    if supplier_id:
        q = q.filter_by(supplier_id=supplier_id)
    if shipment_id:
        q = q.filter_by(shipment_id=shipment_id)
    if rfq_id:
        q = q.filter_by(rfq_id=rfq_id)
    if status:
        q = q.filter_by(status=status)

    paginated = q.order_by(SupplierPayment.payment_date.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    total_amount = db.session.query(db.func.sum(SupplierPayment.amount)).filter(
        *([SupplierPayment.supplier_id == supplier_id] if supplier_id else [])
    ).scalar() or 0.0

    return jsonify({
        'payments': [p.to_dict() for p in paginated.items],
        'total': paginated.total,
        'page': page,
        'per_page': per_page,
        'total_amount_usd': round(total_amount, 2),
    })
