"""
Social OAuth login routes for customer accounts.
Supports Google, Facebook, and X (Twitter).

Each provider requires environment variables:
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET
  TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET
"""
import os
import secrets
import string
from flask import Blueprint, redirect, request, session, jsonify, url_for
from authlib.integrations.requests_client import OAuth2Session, OAuth1Session
from src.models.user import User, db

social_bp = Blueprint('social_auth', __name__)

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:5000')

# ─── helpers ──────────────────────────────────────────────────────────────────

def _random_password(length=32):
    """Generate a secure random password for social-login-only accounts."""
    alphabet = string.ascii_letters + string.digits + string.punctuation
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def _find_or_create_user(email: str, name: str, provider: str, provider_id: str):
    """
    Look up an existing user by email or provider ID.
    If none found, create a new account with a random password.
    Returns the User object.
    """
    # Try to find by provider_id stored in oauth_provider / oauth_id columns
    user = User.query.filter_by(oauth_provider=provider, oauth_id=provider_id).first()
    if user:
        return user

    # Try to find by email
    if email:
        user = User.query.filter_by(email=email).first()
        if user:
            # Link the social account to the existing user
            user.oauth_provider = provider
            user.oauth_id = provider_id
            db.session.commit()
            return user

    # Create a brand-new account
    base_username = (name or email or provider_id).split('@')[0].replace(' ', '_').lower()
    username = base_username
    counter = 1
    while User.query.filter_by(username=username).first():
        username = f"{base_username}{counter}"
        counter += 1

    user = User(
        username=username,
        email=email or f"{provider_id}@{provider}.social",
        company_name=None,
        phone=None,
        oauth_provider=provider,
        oauth_id=provider_id,
    )
    user.set_password(_random_password())
    db.session.add(user)
    db.session.commit()
    return user


def _success_redirect(user):
    """Set session and redirect back to the frontend."""
    session['user_id'] = user.id
    # Redirect to frontend with a success flag so the modal closes
    return redirect(f"{FRONTEND_URL}/?social_login=success")


def _error_redirect(msg):
    return redirect(f"{FRONTEND_URL}/?social_login=error&msg={msg}")


# ─── Google OAuth 2.0 ─────────────────────────────────────────────────────────

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'


@social_bp.route('/auth/google')
def google_login():
    if not GOOGLE_CLIENT_ID:
        return jsonify({'error': 'Google OAuth not configured'}), 503
    redirect_uri = f"{BACKEND_URL}/api/auth/google/callback"
    client = OAuth2Session(GOOGLE_CLIENT_ID, redirect_uri=redirect_uri,
                           scope='openid email profile')
    uri, state = client.create_authorization_url(GOOGLE_AUTH_URL)
    session['oauth_state'] = state
    session['oauth_provider'] = 'google'
    return redirect(uri)


@social_bp.route('/auth/google/callback')
def google_callback():
    if not GOOGLE_CLIENT_ID:
        return _error_redirect('not_configured')
    try:
        redirect_uri = f"{BACKEND_URL}/api/auth/google/callback"
        client = OAuth2Session(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
                               redirect_uri=redirect_uri,
                               state=session.get('oauth_state'))
        token = client.fetch_token(GOOGLE_TOKEN_URL,
                                   authorization_response=request.url)
        resp = client.get(GOOGLE_USERINFO_URL)
        info = resp.json()
        user = _find_or_create_user(
            email=info.get('email', ''),
            name=info.get('name', ''),
            provider='google',
            provider_id=info['sub']
        )
        return _success_redirect(user)
    except Exception as e:
        return _error_redirect(str(e)[:80])


# ─── Facebook OAuth 2.0 ───────────────────────────────────────────────────────

FACEBOOK_CLIENT_ID = os.environ.get('FACEBOOK_CLIENT_ID', '')
FACEBOOK_CLIENT_SECRET = os.environ.get('FACEBOOK_CLIENT_SECRET', '')
FACEBOOK_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth'
FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token'
FACEBOOK_USERINFO_URL = 'https://graph.facebook.com/me?fields=id,name,email'


@social_bp.route('/auth/facebook')
def facebook_login():
    if not FACEBOOK_CLIENT_ID:
        return jsonify({'error': 'Facebook OAuth not configured'}), 503
    redirect_uri = f"{BACKEND_URL}/api/auth/facebook/callback"
    client = OAuth2Session(FACEBOOK_CLIENT_ID, redirect_uri=redirect_uri,
                           scope='email public_profile')
    uri, state = client.create_authorization_url(FACEBOOK_AUTH_URL)
    session['oauth_state'] = state
    session['oauth_provider'] = 'facebook'
    return redirect(uri)


@social_bp.route('/auth/facebook/callback')
def facebook_callback():
    if not FACEBOOK_CLIENT_ID:
        return _error_redirect('not_configured')
    try:
        redirect_uri = f"{BACKEND_URL}/api/auth/facebook/callback"
        client = OAuth2Session(FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET,
                               redirect_uri=redirect_uri,
                               state=session.get('oauth_state'))
        token = client.fetch_token(FACEBOOK_TOKEN_URL,
                                   authorization_response=request.url)
        resp = client.get(FACEBOOK_USERINFO_URL)
        info = resp.json()
        user = _find_or_create_user(
            email=info.get('email', ''),
            name=info.get('name', ''),
            provider='facebook',
            provider_id=info['id']
        )
        return _success_redirect(user)
    except Exception as e:
        return _error_redirect(str(e)[:80])


# ─── X / Twitter OAuth 2.0 (PKCE) ────────────────────────────────────────────

TWITTER_CLIENT_ID = os.environ.get('TWITTER_CLIENT_ID', '')
TWITTER_CLIENT_SECRET = os.environ.get('TWITTER_CLIENT_SECRET', '')
TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize'
TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token'
TWITTER_USERINFO_URL = 'https://api.twitter.com/2/users/me?user.fields=name,username'


@social_bp.route('/auth/twitter')
def twitter_login():
    if not TWITTER_CLIENT_ID:
        return jsonify({'error': 'X/Twitter OAuth not configured'}), 503
    redirect_uri = f"{BACKEND_URL}/api/auth/twitter/callback"
    client = OAuth2Session(TWITTER_CLIENT_ID, redirect_uri=redirect_uri,
                           scope='tweet.read users.read offline.access')
    # Twitter requires PKCE
    uri, state = client.create_authorization_url(
        TWITTER_AUTH_URL, code_challenge_method='S256')
    session['oauth_state'] = state
    session['oauth_code_verifier'] = client.code_verifier
    session['oauth_provider'] = 'twitter'
    return redirect(uri)


@social_bp.route('/auth/twitter/callback')
def twitter_callback():
    if not TWITTER_CLIENT_ID:
        return _error_redirect('not_configured')
    try:
        redirect_uri = f"{BACKEND_URL}/api/auth/twitter/callback"
        client = OAuth2Session(TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET,
                               redirect_uri=redirect_uri,
                               state=session.get('oauth_state'),
                               code_verifier=session.get('oauth_code_verifier'))
        token = client.fetch_token(TWITTER_TOKEN_URL,
                                   authorization_response=request.url)
        resp = client.get(TWITTER_USERINFO_URL)
        info = resp.json().get('data', {})
        user = _find_or_create_user(
            email='',
            name=info.get('name', ''),
            provider='twitter',
            provider_id=info.get('id', '')
        )
        return _success_redirect(user)
    except Exception as e:
        return _error_redirect(str(e)[:80])


# ─── Status endpoint (lets frontend check which providers are configured) ─────

@social_bp.route('/auth/providers')
def providers():
    return jsonify({
        'google': bool(GOOGLE_CLIENT_ID),
        'facebook': bool(FACEBOOK_CLIENT_ID),
        'twitter': bool(TWITTER_CLIENT_ID),
    })


# ─── Fetch current user after social redirect ─────────────────────────────────

@social_bp.route('/auth/me')
def social_me():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict()})
