"""
API Key model — stores high-entropy keys in hashed form.

Key format:
  sk_live_<32-byte-hex>   — production secret key  (server-side only)
  sk_test_<32-byte-hex>   — sandbox/test secret key (server-side only)
  pk_live_<32-byte-hex>   — public client key       (safe to expose in frontend)

Only the first 8 characters of the raw key (the prefix + first 4 chars of the
random part) are stored in plaintext as `key_preview` so staff can identify
which key is which without ever reconstructing the full value.

The full key is shown ONCE at creation time and never stored in plaintext.
"""

import os
import secrets
import hashlib
from datetime import datetime
from src.models.user import db


# ── Key generation helpers ────────────────────────────────────────────────────

KEY_PREFIXES = {
    'sk_live': 'Production Secret Key',
    'sk_test': 'Sandbox / Test Key',
    'pk_live': 'Public Client Key',
}


def generate_api_key(prefix: str) -> tuple[str, str, str]:
    """
    Generate a new high-entropy API key.

    Returns:
        (raw_key, key_hash, key_preview)
        - raw_key    : the full key shown once to the user, e.g. sk_live_a3f7...
        - key_hash   : SHA-256 hex digest stored in the database
        - key_preview: first 12 chars of the random part + '...' for display
    """
    if prefix not in KEY_PREFIXES:
        raise ValueError(f'Unknown prefix: {prefix}')

    # 32 bytes = 64 hex chars → 256 bits of entropy
    random_part = secrets.token_hex(32)
    raw_key = f'{prefix}_{random_part}'

    # Hash with SHA-256 (no salt needed — key entropy is already 256 bits)
    key_hash = hashlib.sha256(raw_key.encode('utf-8')).hexdigest()

    # Preview: prefix + first 8 chars of random part + '...'
    key_preview = f'{prefix}_{random_part[:8]}...'

    return raw_key, key_hash, key_preview


def hash_api_key(raw_key: str) -> str:
    """Hash a raw API key for lookup."""
    return hashlib.sha256(raw_key.encode('utf-8')).hexdigest()


# ── Model ─────────────────────────────────────────────────────────────────────

class APIKey(db.Model):
    """Stores API keys in hashed form. The raw key is shown once at creation."""
    __tablename__ = 'api_key'

    id = db.Column(db.Integer, primary_key=True)

    # Human-readable label set by the admin
    name = db.Column(db.String(200), nullable=False)

    # Key type prefix: sk_live | sk_test | pk_live
    prefix = db.Column(db.String(20), nullable=False)

    # SHA-256 hash of the full raw key — used for lookup/verification
    key_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)

    # Short preview for display, e.g. "sk_live_a3f7b2c1..."
    key_preview = db.Column(db.String(40), nullable=False)

    # Optional: scope / permissions description
    description = db.Column(db.Text, nullable=True)

    # Lifecycle
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    revoked_at = db.Column(db.DateTime, nullable=True)
    revoked_by = db.Column(db.String(100), nullable=True)

    # Audit
    created_by = db.Column(db.String(100), nullable=False)   # staff username
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_used_at = db.Column(db.DateTime, nullable=True)
    use_count = db.Column(db.Integer, default=0, nullable=False)

    # Optional expiry
    expires_at = db.Column(db.DateTime, nullable=True)

    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at

    def is_valid(self) -> bool:
        return self.is_active and not self.is_expired()

    def to_dict(self, include_hash: bool = False) -> dict:
        d = {
            'id': self.id,
            'name': self.name,
            'prefix': self.prefix,
            'type_label': KEY_PREFIXES.get(self.prefix, self.prefix),
            'key_preview': self.key_preview,
            'description': self.description,
            'is_active': self.is_active,
            'is_expired': self.is_expired(),
            'is_valid': self.is_valid(),
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'use_count': self.use_count,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'revoked_at': self.revoked_at.isoformat() if self.revoked_at else None,
            'revoked_by': self.revoked_by,
        }
        if include_hash:
            d['key_hash'] = self.key_hash
        return d
