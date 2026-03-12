"""
Bill Analyzer Routes
Staff upload a customer's existing supplier invoice (PDF or image).
GPT-4o Vision extracts every line item + price.
We then match against our own product catalog to show potential savings.
"""
import os
import json
import base64
import threading
from flask import Blueprint, request, jsonify, session
from werkzeug.utils import secure_filename
from src.models.user import db
from src.models.supplier_bill import SupplierBill
from src.models.product import Product
from src.routes.order import staff_required

bill_bp = Blueprint('bill_analyzer', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'bills')
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp'}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_openai_client():
    from openai import OpenAI
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


def encode_image_to_base64(path):
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


def pdf_first_page_to_base64(pdf_path):
    """Convert first page of PDF to base64 PNG for vision API."""
    try:
        from pdf2image import convert_from_path
        pages = convert_from_path(pdf_path, first_page=1, last_page=1, dpi=200)
        if pages:
            import io
            buf = io.BytesIO()
            pages[0].save(buf, format='PNG')
            return base64.b64encode(buf.getvalue()).decode('utf-8'), 'image/png'
    except Exception as e:
        print(f"PDF conversion error: {e}")
    return None, None


def extract_line_items_with_ai(file_path, file_type):
    """
    Use GPT-4o Vision to extract all line items from a supplier invoice.
    Returns a list of dicts with keys:
      description, sku, quantity, unit, unit_price, line_total
    """
    client = get_openai_client()
    if not client:
        return None, "OpenAI API key not configured"

    # Prepare image data
    if file_type == 'pdf':
        img_b64, mime = pdf_first_page_to_base64(file_path)
        if not img_b64:
            return None, "Could not convert PDF to image"
    else:
        ext = file_path.rsplit('.', 1)[-1].lower()
        mime_map = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
                    'webp': 'image/webp', 'tiff': 'image/tiff', 'bmp': 'image/bmp'}
        mime = mime_map.get(ext, 'image/jpeg')
        img_b64 = encode_image_to_base64(file_path)

    prompt = """You are an expert at reading supplier invoices for restaurants and food service businesses.

Analyze this invoice image and extract ALL line items. For each item return a JSON object with these exact keys:
- "description": full product name/description as shown on the invoice
- "sku": item code, product number, or SKU (empty string if not shown)
- "quantity": numeric quantity ordered (number, not string)
- "unit": unit of measure (e.g. "CS", "EA", "LB", "GAL", "CASE", "EACH", "BOX") 
- "unit_price": price per unit as a number (not string, no $ sign)
- "line_total": total for this line as a number (quantity × unit_price)

Also extract these invoice-level fields:
- "supplier_name": name of the supplier/vendor
- "bill_date": invoice date as shown
- "bill_number": invoice or order number
- "bill_total": grand total of the invoice as a number

Return ONLY valid JSON in this exact format:
{
  "supplier_name": "...",
  "bill_date": "...",
  "bill_number": "...",
  "bill_total": 0.00,
  "line_items": [
    {
      "description": "...",
      "sku": "...",
      "quantity": 1,
      "unit": "CS",
      "unit_price": 0.00,
      "line_total": 0.00
    }
  ]
}

If a field cannot be determined, use null for numbers and "" for strings.
Do NOT include any text outside the JSON object."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime};base64,{img_b64}",
                                "detail": "high"
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ],
            max_tokens=4096,
            temperature=0
        )

        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        raw = raw.strip()

        data = json.loads(raw)
        return data, None

    except json.JSONDecodeError as e:
        return None, f"AI returned invalid JSON: {e}"
    except Exception as e:
        return None, f"AI extraction failed: {e}"


def match_items_to_catalog(line_items):
    """
    For each extracted line item, try to find a matching product in our catalog.
    Adds fields: our_sku, our_price, our_unit, savings, savings_pct, match_confidence
    Returns updated line_items and summary stats.
    """
    products = Product.query.filter_by(in_stock=True).all()

    # Build a searchable index
    product_index = []
    for p in products:
        keywords = set()
        if p.name:
            keywords.update(p.name.lower().split())
        if p.sku:
            keywords.add(p.sku.lower())
        if p.brand:
            keywords.update(p.brand.lower().split())
        if p.description:
            keywords.update(p.description.lower().split()[:20])
        product_index.append({
            'product': p,
            'keywords': keywords,
            'name_lower': (p.name or '').lower(),
            'sku_lower': (p.sku or '').lower(),
        })

    items_we_carry = 0
    potential_savings = 0.0

    for item in line_items:
        desc = (item.get('description') or '').lower()
        sku = (item.get('sku') or '').lower()
        their_price = float(item.get('unit_price') or 0)

        best_match = None
        best_score = 0
        confidence = 'none'

        for pi in product_index:
            score = 0

            # SKU exact match = highest confidence
            if sku and pi['sku_lower'] and sku == pi['sku_lower']:
                score = 100
            elif sku and pi['sku_lower'] and (sku in pi['sku_lower'] or pi['sku_lower'] in sku):
                score = 80
            else:
                # Keyword matching on description
                desc_words = set(w for w in desc.split() if len(w) > 2)
                if desc_words:
                    matched = desc_words & pi['keywords']
                    score = int(len(matched) / len(desc_words) * 60)

                # Boost if product name words appear in description
                name_words = set(w for w in pi['name_lower'].split() if len(w) > 2)
                if name_words:
                    name_matched = name_words & set(desc.split())
                    score += int(len(name_matched) / len(name_words) * 40)

            if score > best_score:
                best_score = score
                best_match = pi['product']

        if best_match and best_score >= 40:
            our_price = float(best_match.unit_price or 0)
            savings = their_price - our_price
            savings_pct = (savings / their_price * 100) if their_price > 0 else 0

            if best_score >= 80:
                confidence = 'high'
            elif best_score >= 55:
                confidence = 'medium'
            else:
                confidence = 'low'

            item['our_sku'] = best_match.sku or ''
            item['our_name'] = best_match.name or ''
            item['our_price'] = our_price
            item['our_unit'] = best_match.unit_size or item.get('unit', '')
            item['savings'] = round(savings, 2)
            item['savings_pct'] = round(savings_pct, 1)
            item['match_confidence'] = confidence

            items_we_carry += 1
            if savings > 0:
                qty = float(item.get('quantity') or 1)
                potential_savings += savings * qty
        else:
            item['our_sku'] = ''
            item['our_name'] = ''
            item['our_price'] = None
            item['our_unit'] = ''
            item['savings'] = None
            item['savings_pct'] = None
            item['match_confidence'] = 'none'

    return line_items, items_we_carry, round(potential_savings, 2)


def process_bill_async(bill_id, file_path, file_type):
    """Background thread: extract items and match to catalog."""
    from src.main import app
    with app.app_context():
        bill = SupplierBill.query.get(bill_id)
        if not bill:
            return

        bill.extraction_status = 'processing'
        db.session.commit()

        try:
            data, err = extract_line_items_with_ai(file_path, file_type)
            if err:
                bill.extraction_status = 'error'
                bill.extraction_error = err
                db.session.commit()
                return

            # Update bill-level fields from AI extraction
            if not bill.supplier_name and data.get('supplier_name'):
                bill.supplier_name = data['supplier_name']
            if not bill.bill_date and data.get('bill_date'):
                bill.bill_date = data['bill_date']
            if not bill.bill_number and data.get('bill_number'):
                bill.bill_number = data['bill_number']
            if not bill.bill_total and data.get('bill_total'):
                bill.bill_total = data['bill_total']

            raw_items = data.get('line_items', [])

            # Match items to our catalog
            matched_items, items_we_carry, potential_savings = match_items_to_catalog(raw_items)

            bill.line_items = matched_items
            bill.total_items = len(matched_items)
            bill.items_we_carry = items_we_carry
            bill.potential_savings = potential_savings
            bill.extraction_status = 'done'
            db.session.commit()

        except Exception as e:
            bill.extraction_status = 'error'
            bill.extraction_error = str(e)
            db.session.commit()


# ─── Routes ───────────────────────────────────────────────────────────────────

@bill_bp.route('/api/bills', methods=['GET'])
@staff_required
def list_bills():
    """List all uploaded bills, newest first."""
    bills = SupplierBill.query.order_by(SupplierBill.created_at.desc()).all()
    return jsonify([b.to_dict(include_items=False) for b in bills])


@bill_bp.route('/api/bills', methods=['POST'])
@staff_required
def upload_bill():
    """Upload a new supplier bill for analysis."""
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    # Validate file
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file or not file.filename:
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not supported. Use PDF, PNG, JPG, or WEBP.'}), 400

    # Read file to check size
    file_data = file.read()
    if len(file_data) > MAX_FILE_SIZE:
        return jsonify({'error': 'File too large. Maximum size is 20 MB.'}), 400

    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[-1].lower()
    file_type = 'pdf' if ext == 'pdf' else 'image'

    # Save file
    import uuid
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    save_path = os.path.join(UPLOAD_FOLDER, unique_name)
    with open(save_path, 'wb') as f:
        f.write(file_data)

    # Get form data
    restaurant_name = request.form.get('restaurant_name', '').strip()
    if not restaurant_name:
        return jsonify({'error': 'Restaurant name is required'}), 400

    staff_user = session.get('staff_user', {})

    # Create bill record
    bill = SupplierBill(
        restaurant_name=restaurant_name,
        restaurant_email=request.form.get('restaurant_email', '').strip(),
        restaurant_phone=request.form.get('restaurant_phone', '').strip(),
        contact_name=request.form.get('contact_name', '').strip(),
        notes=request.form.get('notes', '').strip(),
        supplier_name=request.form.get('supplier_name', '').strip(),
        original_filename=filename,
        file_path=save_path,
        file_type=file_type,
        extraction_status='pending',
        uploaded_by=staff_user.get('username', 'staff'),
    )
    db.session.add(bill)
    db.session.commit()

    # Start async extraction
    t = threading.Thread(target=process_bill_async, args=(bill.id, save_path, file_type))
    t.daemon = True
    t.start()

    return jsonify({'success': True, 'bill': bill.to_dict(include_items=False)}), 201


@bill_bp.route('/api/bills/<int:bill_id>', methods=['GET'])
@staff_required
def get_bill(bill_id):
    """Get a single bill with all line items."""
    bill = SupplierBill.query.get_or_404(bill_id)
    return jsonify(bill.to_dict(include_items=True))


@bill_bp.route('/api/bills/<int:bill_id>/reprocess', methods=['POST'])
@staff_required
def reprocess_bill(bill_id):
    """Re-run AI extraction on an existing bill."""
    bill = SupplierBill.query.get_or_404(bill_id)
    if bill.extraction_status == 'processing':
        return jsonify({'error': 'Already processing'}), 400

    bill.extraction_status = 'pending'
    bill.extraction_error = None
    db.session.commit()

    t = threading.Thread(target=process_bill_async, args=(bill.id, bill.file_path, bill.file_type))
    t.daemon = True
    t.start()

    return jsonify({'success': True, 'message': 'Reprocessing started'})


@bill_bp.route('/api/bills/<int:bill_id>/notes', methods=['PUT'])
@staff_required
def update_bill_notes(bill_id):
    """Update staff notes on a bill."""
    bill = SupplierBill.query.get_or_404(bill_id)
    data = request.get_json()
    bill.notes = data.get('notes', bill.notes)
    bill.restaurant_email = data.get('restaurant_email', bill.restaurant_email)
    bill.restaurant_phone = data.get('restaurant_phone', bill.restaurant_phone)
    bill.contact_name = data.get('contact_name', bill.contact_name)
    db.session.commit()
    return jsonify({'success': True})


@bill_bp.route('/api/bills/<int:bill_id>', methods=['DELETE'])
@staff_required
def delete_bill(bill_id):
    """Delete a bill and its uploaded file."""
    bill = SupplierBill.query.get_or_404(bill_id)

    # Remove file from disk
    try:
        if bill.file_path and os.path.exists(bill.file_path):
            os.remove(bill.file_path)
    except Exception:
        pass

    db.session.delete(bill)
    db.session.commit()
    return jsonify({'success': True})


@bill_bp.route('/api/bills/<int:bill_id>/status', methods=['GET'])
@staff_required
def get_bill_status(bill_id):
    """Poll extraction status — used by frontend to check progress."""
    bill = SupplierBill.query.get_or_404(bill_id)
    return jsonify({
        'id': bill.id,
        'extraction_status': bill.extraction_status,
        'extraction_error': bill.extraction_error,
        'total_items': bill.total_items,
        'items_we_carry': bill.items_we_carry,
        'potential_savings': bill.potential_savings,
        'supplier_name': bill.supplier_name,
        'bill_date': bill.bill_date,
        'bill_number': bill.bill_number,
        'bill_total': bill.bill_total,
    })
