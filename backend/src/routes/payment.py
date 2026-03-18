import os
import stripe
from flask import Blueprint, request, jsonify, session
from werkzeug.utils import secure_filename
from datetime import datetime

from src.models.user import db
from src.models.order import Order

payment_bp = Blueprint('payment', __name__)

# Configure Stripe with the live secret key
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'}
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'checks')


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ─── Stripe Payment Intent ────────────────────────────────────────────────────

@payment_bp.route('/payments/create-intent', methods=['POST'])
def create_payment_intent():
    """
    Create a Stripe PaymentIntent for a given order total.
    Called from the frontend checkout when customer selects credit card.
    """
    try:
        data = request.json
        amount_dollars = data.get('amount')  # e.g. 49.99
        order_number = data.get('order_number', '')
        customer_name = data.get('customer_name', '')
        customer_email = data.get('customer_email', '')

        if not amount_dollars or float(amount_dollars) <= 0:
            return jsonify({'error': 'Invalid amount'}), 400

        # Stripe requires amount in cents (integer)
        amount_cents = int(round(float(amount_dollars) * 100))

        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency='usd',
            metadata={
                'order_number': order_number,
                'customer_name': customer_name,
                'customer_email': customer_email,
            },
            description=f'RS LLD Order {order_number}',
            receipt_email=customer_email if customer_email else None,
        )

        return jsonify({
            'success': True,
            'client_secret': intent.client_secret,
            'payment_intent_id': intent.id,
        })

    except stripe.error.StripeError as e:
        print(f"Stripe error: {str(e)}")
        return jsonify({'error': str(e.user_message)}), 400
    except Exception as e:
        print(f"Payment intent error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@payment_bp.route('/payments/confirm', methods=['POST'])
def confirm_payment():
    """
    Called after Stripe payment succeeds on the frontend.
    Updates the order's payment_status and stores the payment_intent_id.
    """
    try:
        data = request.json
        order_number = data.get('order_number')
        payment_intent_id = data.get('payment_intent_id')

        if not order_number or not payment_intent_id:
            return jsonify({'error': 'Missing order_number or payment_intent_id'}), 400

        # Verify the payment with Stripe
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if intent.status != 'succeeded':
            return jsonify({'error': f'Payment not completed. Status: {intent.status}'}), 400

        # Update order payment status
        order = Order.query.filter_by(order_number=order_number).first()
        if order:
            order.payment_status = 'paid'
            order.payment_method = 'credit_card'
            order.payment_intent_id = payment_intent_id
            order.status = 'confirmed'  # Auto-confirm paid orders
            order.confirmed_at = datetime.utcnow()
            db.session.commit()

        return jsonify({'success': True, 'message': 'Payment confirmed'})

    except stripe.error.StripeError as e:
        return jsonify({'error': str(e.user_message)}), 400
    except Exception as e:
        print(f"Payment confirm error: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ─── Check Image Upload ───────────────────────────────────────────────────────

@payment_bp.route('/payments/upload-check', methods=['POST'])
def upload_check():
    """
    Accepts front and back check image uploads for an order.
    Both images are stored on the server and linked to the order.
    Staff will review them in the internal portal.
    """
    try:
        order_number = request.form.get('order_number')
        if not order_number:
            return jsonify({'error': 'order_number is required'}), 400

        # Support both legacy single-image (check_image) and new dual-image (check_front + check_back)
        front_file = request.files.get('check_front') or request.files.get('check_image')
        back_file = request.files.get('check_back')

        if not front_file or front_file.filename == '':
            return jsonify({'error': 'Front check image is required'}), 400

        if not allowed_file(front_file.filename):
            return jsonify({'error': 'File type not allowed. Please upload a JPG or PNG.'}), 400

        # Ensure upload directory exists
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)

        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')

        # Save front image
        front_ext = front_file.filename.rsplit('.', 1)[1].lower() if '.' in front_file.filename else 'jpg'
        front_filename = secure_filename(f"check_{order_number}_front_{timestamp}.{front_ext}")
        front_file.save(os.path.join(UPLOAD_FOLDER, front_filename))

        # Save back image (optional for legacy compatibility, required for new flow)
        back_filename = None
        if back_file and back_file.filename != '':
            if not allowed_file(back_file.filename):
                return jsonify({'error': 'Back image file type not allowed. Please upload a JPG or PNG.'}), 400
            back_ext = back_file.filename.rsplit('.', 1)[1].lower() if '.' in back_file.filename else 'jpg'
            back_filename = secure_filename(f"check_{order_number}_back_{timestamp}.{back_ext}")
            back_file.save(os.path.join(UPLOAD_FOLDER, back_filename))

        # Update order with check image info
        order = Order.query.filter_by(order_number=order_number).first()
        if order:
            order.payment_method = 'check'
            order.check_image_filename = front_filename
            if back_filename:
                order.check_back_image_filename = back_filename
            order.payment_status = 'pending_review'
            db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Check images uploaded successfully. Your order will be confirmed once we review your check.',
            'front_filename': front_filename,
            'back_filename': back_filename,
        })

    except Exception as e:
        print(f"Check upload error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@payment_bp.route('/staff/checks/<string:order_number>', methods=['GET'])
def get_check_image(order_number):
    """Serve the check front image for staff review."""
    from flask import send_from_directory
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    if not order.check_image_filename:
        return jsonify({'error': 'No check image for this order'}), 404
    return send_from_directory(UPLOAD_FOLDER, order.check_image_filename)


@payment_bp.route('/staff/checks/<string:order_number>/back', methods=['GET'])
def get_check_back_image(order_number):
    """Serve the check back image for staff review."""
    from flask import send_from_directory
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    if not order.check_back_image_filename:
        return jsonify({'error': 'No check back image for this order'}), 404
    return send_from_directory(UPLOAD_FOLDER, order.check_back_image_filename)


@payment_bp.route('/staff/checks/<string:order_number>/approve', methods=['POST'])
def approve_check(order_number):
    """Staff approves a check payment and confirms the order."""
    if 'staff_id' not in session:
        return jsonify({'error': 'Staff authentication required'}), 401
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    order.payment_status = 'paid'
    order.status = 'confirmed'
    order.confirmed_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'message': 'Check approved, order confirmed'})


@payment_bp.route('/staff/checks/<string:order_number>/reject', methods=['POST'])
def reject_check(order_number):
    """Staff rejects a check payment."""
    if 'staff_id' not in session:
        return jsonify({'error': 'Staff authentication required'}), 401
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    order.payment_status = 'rejected'
    order.status = 'cancelled'
    db.session.commit()
    return jsonify({'success': True, 'message': 'Check rejected, order cancelled'})
