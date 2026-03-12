from flask import Blueprint, request, jsonify, session
from src.models.user import db
from src.models.invoice import CustomInvoice
from src.models.order import StaffUser
from datetime import datetime
import re

invoice_bp = Blueprint('invoice', __name__)


def require_staff():
    """Check if a staff user is logged in via session."""
    staff_id = session.get('staff_id')
    if not staff_id:
        return None
    return StaffUser.query.get(staff_id)


def generate_invoice_number():
    """Generate a unique invoice number like INV-2026-0001."""
    year = datetime.utcnow().year
    last = CustomInvoice.query.filter(
        CustomInvoice.invoice_number.like(f'INV-{year}-%')
    ).order_by(CustomInvoice.id.desc()).first()
    if last:
        try:
            seq = int(last.invoice_number.split('-')[-1]) + 1
        except Exception:
            seq = 1
    else:
        seq = 1
    return f'INV-{year}-{seq:04d}'


# ─── List all invoices ────────────────────────────────────────────────────────

@invoice_bp.route('/invoices', methods=['GET'])
def list_invoices():
    staff = require_staff()
    if not staff:
        return jsonify({'error': 'Unauthorized'}), 401

    status_filter = request.args.get('status')
    query = CustomInvoice.query.order_by(CustomInvoice.created_at.desc())
    if status_filter:
        query = query.filter_by(status=status_filter)

    invoices = query.all()
    return jsonify([inv.to_dict() for inv in invoices])


# ─── Get single invoice ───────────────────────────────────────────────────────

@invoice_bp.route('/invoices/<int:invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    staff = require_staff()
    if not staff:
        return jsonify({'error': 'Unauthorized'}), 401

    inv = CustomInvoice.query.get_or_404(invoice_id)
    return jsonify(inv.to_dict())


# ─── Create invoice ───────────────────────────────────────────────────────────

@invoice_bp.route('/invoices', methods=['POST'])
def create_invoice():
    staff = require_staff()
    if not staff:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Validate required fields
    if not data.get('customer_name', '').strip():
        return jsonify({'error': 'Customer name is required'}), 400
    if not data.get('items') or len(data['items']) == 0:
        return jsonify({'error': 'At least one line item is required'}), 400

    # Calculate totals
    items = data['items']
    for item in items:
        item['line_total'] = round(float(item.get('quantity', 1)) * float(item.get('unit_price', 0)), 2)

    subtotal = round(sum(i['line_total'] for i in items), 2)
    discount = round(float(data.get('discount_amount', 0)), 2)
    tax_rate = round(float(data.get('tax_rate', 0)), 2)
    tax_amount = round((subtotal - discount) * tax_rate / 100, 2)
    total = round(subtotal - discount + tax_amount, 2)

    inv = CustomInvoice(
        invoice_number=generate_invoice_number(),
        status=data.get('status', 'draft'),
        customer_name=data['customer_name'].strip(),
        customer_company=data.get('customer_company', '').strip() or None,
        customer_email=data.get('customer_email', '').strip() or None,
        customer_phone=data.get('customer_phone', '').strip() or None,
        customer_address=data.get('customer_address', '').strip() or None,
        customer_city=data.get('customer_city', '').strip() or None,
        customer_state=data.get('customer_state', '').strip() or None,
        customer_zip=data.get('customer_zip', '').strip() or None,
        subtotal=subtotal,
        discount_amount=discount,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        total_amount=total,
        payment_method=data.get('payment_method', 'net30'),
        payment_terms=data.get('payment_terms', 'Net 30'),
        due_date=data.get('due_date'),
        notes=data.get('notes', '').strip() or None,
        internal_notes=data.get('internal_notes', '').strip() or None,
        created_by=staff.username,
    )
    inv.items = items

    db.session.add(inv)
    db.session.commit()

    return jsonify(inv.to_dict()), 201


# ─── Update invoice ───────────────────────────────────────────────────────────

@invoice_bp.route('/invoices/<int:invoice_id>', methods=['PUT'])
def update_invoice(invoice_id):
    staff = require_staff()
    if not staff:
        return jsonify({'error': 'Unauthorized'}), 401

    inv = CustomInvoice.query.get_or_404(invoice_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Update customer info
    if 'customer_name' in data:
        inv.customer_name = data['customer_name'].strip()
    for field in ['customer_company', 'customer_email', 'customer_phone',
                  'customer_address', 'customer_city', 'customer_state', 'customer_zip',
                  'payment_method', 'payment_terms', 'due_date', 'notes', 'internal_notes']:
        if field in data:
            setattr(inv, field, data[field])

    # Recalculate if items or financials changed
    if 'items' in data:
        items = data['items']
        for item in items:
            item['line_total'] = round(float(item.get('quantity', 1)) * float(item.get('unit_price', 0)), 2)
        inv.items = items
        subtotal = round(sum(i['line_total'] for i in items), 2)
        inv.subtotal = subtotal
    else:
        subtotal = inv.subtotal

    if 'discount_amount' in data:
        inv.discount_amount = round(float(data['discount_amount']), 2)
    if 'tax_rate' in data:
        inv.tax_rate = round(float(data['tax_rate']), 2)

    inv.tax_amount = round((inv.subtotal - inv.discount_amount) * inv.tax_rate / 100, 2)
    inv.total_amount = round(inv.subtotal - inv.discount_amount + inv.tax_amount, 2)

    # Status transitions
    if 'status' in data:
        new_status = data['status']
        inv.status = new_status
        if new_status == 'sent' and not inv.sent_at:
            inv.sent_at = datetime.utcnow()
        elif new_status == 'paid' and not inv.paid_at:
            inv.paid_at = datetime.utcnow()

    db.session.commit()
    return jsonify(inv.to_dict())


# ─── Delete invoice ───────────────────────────────────────────────────────────

@invoice_bp.route('/invoices/<int:invoice_id>', methods=['DELETE'])
def delete_invoice(invoice_id):
    staff = require_staff()
    if not staff:
        return jsonify({'error': 'Unauthorized'}), 401

    inv = CustomInvoice.query.get_or_404(invoice_id)
    db.session.delete(inv)
    db.session.commit()
    return jsonify({'message': 'Invoice deleted'})


# ─── Get products for invoice line item search ────────────────────────────────

@invoice_bp.route('/invoices/products/search', methods=['GET'])
def search_products_for_invoice():
    staff = require_staff()
    if not staff:
        return jsonify({'error': 'Unauthorized'}), 401

    from src.models.product import Product
    q = request.args.get('q', '').strip()
    if not q:
        products = Product.query.filter_by(in_stock=True).limit(20).all()
    else:
        products = Product.query.filter(
            (Product.name.ilike(f'%{q}%')) |
            (Product.sku.ilike(f'%{q}%'))
        ).limit(20).all()

    return jsonify([{
        'id': p.id,
        'name': p.name,
        'sku': p.sku,
        'unit_price': p.unit_price,
        'bulk_price': p.bulk_price,
        'unit_size': p.unit_size,
        'brand': p.brand,
    } for p in products])
