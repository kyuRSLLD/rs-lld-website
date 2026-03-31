"""
Invoice PDF generator for RS LLD Restaurant Supply.
Uses reportlab to produce a clean, branded PDF invoice.
"""
import os
from io import BytesIO
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER

# ─── Colour palette ────────────────────────────────────────────────────────────
DARK   = colors.HexColor('#0f172a')   # near-black
BLUE   = colors.HexColor('#2563eb')   # RS LLD blue
LIGHT  = colors.HexColor('#f8fafc')   # very light grey
MID    = colors.HexColor('#64748b')   # muted text
BORDER = colors.HexColor('#e2e8f0')   # table border


def _fmt(n):
    try:
        return f'${float(n or 0):,.2f}'
    except Exception:
        return '$0.00'


def generate_invoice_pdf(invoice_dict: dict) -> bytes:
    """
    Generate a PDF for the given invoice dict (as returned by CustomInvoice.to_dict()).
    Returns the PDF as raw bytes.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()
    normal = styles['Normal']

    # Custom styles
    h1 = ParagraphStyle('h1', fontSize=22, fontName='Helvetica-Bold', textColor=DARK, spaceAfter=2)
    h2 = ParagraphStyle('h2', fontSize=11, fontName='Helvetica-Bold', textColor=DARK, spaceAfter=2)
    small = ParagraphStyle('small', fontSize=8, fontName='Helvetica', textColor=MID, spaceAfter=1)
    label = ParagraphStyle('label', fontSize=7, fontName='Helvetica-Bold', textColor=MID,
                           spaceAfter=1, leading=10, textTransform='uppercase')
    body = ParagraphStyle('body', fontSize=9, fontName='Helvetica', textColor=DARK, spaceAfter=2)
    body_right = ParagraphStyle('body_right', fontSize=9, fontName='Helvetica',
                                textColor=DARK, alignment=TA_RIGHT)
    bold_right = ParagraphStyle('bold_right', fontSize=10, fontName='Helvetica-Bold',
                                textColor=DARK, alignment=TA_RIGHT)

    inv = invoice_dict
    story = []

    # ── Header row ──────────────────────────────────────────────────────────────
    created_str = ''
    if inv.get('created_at'):
        try:
            created_str = datetime.fromisoformat(inv['created_at'].replace('Z', '')).strftime('%B %d, %Y')
        except Exception:
            created_str = inv['created_at'][:10]

    due_str = inv.get('due_date') or ''

    header_data = [[
        # Left: company info
        [
            Paragraph('RS LLD', h1),
            Paragraph('Restaurant Supply Leading Logistics &amp; Distribution', small),
            Paragraph('info@lldrestaurantsupply.com', small),
            Paragraph('lldrestaurantsupply.com', small),
        ],
        # Right: INVOICE label + number + dates
        [
            Paragraph('INVOICE', ParagraphStyle('inv_label', fontSize=26, fontName='Helvetica-Bold',
                                                textColor=BLUE, alignment=TA_RIGHT)),
            Paragraph(f'<b>{inv.get("invoice_number", "")}</b>',
                      ParagraphStyle('inv_num', fontSize=11, fontName='Helvetica-Bold',
                                     textColor=DARK, alignment=TA_RIGHT)),
            Paragraph(f'Date: {created_str}',
                      ParagraphStyle('inv_date', fontSize=8, fontName='Helvetica',
                                     textColor=MID, alignment=TA_RIGHT)),
            Paragraph(f'Due: {due_str}' if due_str else '',
                      ParagraphStyle('inv_due', fontSize=8, fontName='Helvetica',
                                     textColor=MID, alignment=TA_RIGHT)),
        ],
    ]]
    header_table = Table(header_data, colWidths=[3.5 * inch, 3.5 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.25 * inch))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER))
    story.append(Spacer(1, 0.2 * inch))

    # ── Bill To / Payment Info ──────────────────────────────────────────────────
    addr_parts = [inv.get('customer_name', '')]
    if inv.get('customer_company'):
        addr_parts.append(inv['customer_company'])
    if inv.get('customer_email'):
        addr_parts.append(inv['customer_email'])
    if inv.get('customer_phone'):
        addr_parts.append(inv['customer_phone'])
    if inv.get('customer_address'):
        addr_parts.append(inv['customer_address'])
    city_line = ', '.join(filter(None, [
        inv.get('customer_city'), inv.get('customer_state'), inv.get('customer_zip')
    ]))
    if city_line:
        addr_parts.append(city_line)

    pay_method = (inv.get('payment_method') or '').replace('_', ' ').upper()
    pay_terms  = inv.get('payment_terms') or ''

    bill_data = [[
        [Paragraph('BILL TO', label)] +
        [Paragraph(line, body) for line in addr_parts],
        [Paragraph('PAYMENT', label),
         Paragraph(pay_method, ParagraphStyle('pm', fontSize=10, fontName='Helvetica-Bold', textColor=DARK)),
         Paragraph(pay_terms, body),
         Paragraph(f'Due: {due_str}' if due_str else '', body)],
    ]]
    bill_table = Table(bill_data, colWidths=[3.5 * inch, 3.5 * inch])
    bill_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(bill_table)
    story.append(Spacer(1, 0.25 * inch))

    # ── Line Items Table ────────────────────────────────────────────────────────
    col_desc  = 3.0 * inch
    col_sku   = 1.0 * inch
    col_qty   = 0.6 * inch
    col_price = 1.0 * inch
    col_total = 1.4 * inch

    th_style = ParagraphStyle('th', fontSize=8, fontName='Helvetica-Bold',
                               textColor=colors.white, alignment=TA_LEFT)
    th_right = ParagraphStyle('th_r', fontSize=8, fontName='Helvetica-Bold',
                               textColor=colors.white, alignment=TA_RIGHT)
    td_style = ParagraphStyle('td', fontSize=8, fontName='Helvetica', textColor=DARK)
    td_right = ParagraphStyle('td_r', fontSize=8, fontName='Helvetica',
                               textColor=DARK, alignment=TA_RIGHT)
    td_mono  = ParagraphStyle('td_m', fontSize=7, fontName='Courier', textColor=MID)

    rows = [[
        Paragraph('Description', th_style),
        Paragraph('SKU', th_style),
        Paragraph('Qty', th_right),
        Paragraph('Unit Price', th_right),
        Paragraph('Total', th_right),
    ]]

    items = inv.get('items') or []
    for item in items:
        rows.append([
            Paragraph(str(item.get('description') or ''), td_style),
            Paragraph(str(item.get('sku') or '—'), td_mono),
            Paragraph(str(item.get('quantity') or ''), td_right),
            Paragraph(_fmt(item.get('unit_price')), td_right),
            Paragraph(_fmt(item.get('line_total')), td_right),
        ])

    items_table = Table(rows, colWidths=[col_desc, col_sku, col_qty, col_price, col_total])
    row_count = len(rows)
    items_table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), DARK),
        ('ROWBACKGROUNDS', (0, 1), (-1, row_count - 1), [colors.white, LIGHT]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('LINEBELOW', (0, 0), (-1, 0), 1, DARK),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 0.2 * inch))

    # ── Totals ──────────────────────────────────────────────────────────────────
    subtotal   = float(inv.get('subtotal') or 0)
    discount   = float(inv.get('discount_amount') or 0)
    shipping   = float(inv.get('shipping_fee') or 0)
    tax_rate   = float(inv.get('tax_rate') or 0)
    tax_amount = float(inv.get('tax_amount') or 0)
    total      = float(inv.get('total_amount') or 0)

    totals_rows = [[Paragraph('Subtotal', body_right), Paragraph(_fmt(subtotal), body_right)]]
    if discount:
        totals_rows.append([Paragraph('Discount', body_right), Paragraph(f'−{_fmt(discount)}', body_right)])
    if shipping:
        totals_rows.append([Paragraph('Shipping', body_right), Paragraph(_fmt(shipping), body_right)])
    if tax_rate:
        totals_rows.append([Paragraph(f'Tax ({tax_rate}%)', body_right), Paragraph(_fmt(tax_amount), body_right)])
    totals_rows.append([
        Paragraph('<b>Total</b>', ParagraphStyle('tot', fontSize=11, fontName='Helvetica-Bold',
                                                  textColor=DARK, alignment=TA_RIGHT)),
        Paragraph(f'<b>{_fmt(total)}</b>', ParagraphStyle('tot_v', fontSize=11, fontName='Helvetica-Bold',
                                                           textColor=BLUE, alignment=TA_RIGHT)),
    ])

    totals_table = Table(totals_rows, colWidths=[5.5 * inch, 1.5 * inch])
    totals_table.setStyle(TableStyle([
        ('LINEABOVE', (0, len(totals_rows) - 1), (-1, len(totals_rows) - 1), 1, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(totals_table)

    # ── Notes ───────────────────────────────────────────────────────────────────
    if inv.get('notes'):
        story.append(Spacer(1, 0.2 * inch))
        story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER))
        story.append(Spacer(1, 0.1 * inch))
        story.append(Paragraph('Notes', label))
        story.append(Paragraph(inv['notes'], body))

    # ── Footer ──────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.3 * inch))
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER))
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph(
        'RS LLD — Restaurant Supply Leading Logistics &amp; Distribution · '
        '218 Terrace Dr, Mundelein, IL 60060 · info@lldrestaurantsupply.com · lldrestaurantsupply.com',
        ParagraphStyle('footer', fontSize=7, fontName='Helvetica', textColor=MID, alignment=TA_CENTER)
    ))

    doc.build(story)
    return buf.getvalue()


def save_invoice_pdf(invoice_dict: dict, output_dir: str = '/tmp/invoices') -> str:
    """
    Generate and save a PDF for the given invoice.
    Returns the absolute path to the saved file.
    """
    os.makedirs(output_dir, exist_ok=True)
    inv_num = invoice_dict.get('invoice_number', 'invoice').replace('/', '-')
    filename = f'{inv_num}.pdf'
    filepath = os.path.join(output_dir, filename)
    pdf_bytes = generate_invoice_pdf(invoice_dict)
    with open(filepath, 'wb') as f:
        f.write(pdf_bytes)
    return filepath
