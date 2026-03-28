from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)   # nullable for social-only accounts
    # Name fields — split for better display and matching with social login
    first_name = db.Column(db.String(100), nullable=True)
    last_name = db.Column(db.String(100), nullable=True)
    company_name = db.Column(db.String(200), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    # Email verification
    email_verified = db.Column(db.Boolean, default=False)
    verification_token = db.Column(db.String(100), nullable=True, unique=True)
    verification_token_expires = db.Column(db.DateTime, nullable=True)
    # Password reset
    reset_token = db.Column(db.String(100), nullable=True, unique=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)
    # Address fields — blank at signup, populated from checkout
    shipping_address = db.Column(db.Text, nullable=True)
    billing_address = db.Column(db.Text, nullable=True)
    # Account standing / credit terms (set by staff)
    approved_for_terms = db.Column(db.Boolean, default=False)
    credit_limit = db.Column(db.Float, default=0.0)
    payment_terms = db.Column(db.String(20), nullable=True)
    credit_notes = db.Column(db.Text, nullable=True)
    # Social OAuth fields
    oauth_provider = db.Column(db.String(20), nullable=True)   # 'google' | 'facebook' | 'twitter'
    oauth_id = db.Column(db.String(255), nullable=True)
    avatar_url = db.Column(db.String(500), nullable=True)

    def __repr__(self):
        return f'<User {self.username}>'

    @property
    def full_name(self):
        parts = [p for p in [self.first_name, self.last_name] if p]
        return ' '.join(parts) if parts else (self.username or '')

    def set_password(self, password):
        if password:
            self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'company_name': self.company_name,
            'phone': self.phone,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active,
            'email_verified': self.email_verified,
            'shipping_address': self.shipping_address,
            'billing_address': self.billing_address,
            'oauth_provider': self.oauth_provider,
            'avatar_url': self.avatar_url,
            'approved_for_terms': self.approved_for_terms,
            'credit_limit': self.credit_limit,
            'payment_terms': self.payment_terms,
        }
