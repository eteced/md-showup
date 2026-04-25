import hmac
import hashlib
import os
import time
import config
from flask import request, jsonify, make_response

_sessions = {}


def _cleanup_expired():
    now = time.time()
    expired = [k for k, v in _sessions.items() if now - v > config.SESSION_DURATION_HOURS * 3600]
    for k in expired:
        del _sessions[k]


def _sign_token(token):
    return hmac.new(config.SESSION_SECRET.encode(), token.encode(), hashlib.sha256).hexdigest()


def issue_session_key(api_key):
    if api_key != config.API_KEY:
        return None
    token = os.urandom(32).hex()
    signature = _sign_token(token)
    _sessions[token] = time.time()
    _cleanup_expired()
    return f"{token}.{signature}"


def validate_session(cookie_value):
    if not cookie_value or "." not in cookie_value:
        return False
    token, signature = cookie_value.rsplit(".", 1)
    expected = _sign_token(token)
    if not hmac.compare_digest(signature, expected):
        return False
    if token not in _sessions:
        return False
    if time.time() - _sessions[token] > config.SESSION_DURATION_HOURS * 3600:
        del _sessions[token]
        return False
    return True


def revoke_session(cookie_value):
    if not cookie_value or "." not in cookie_value:
        return
    token = cookie_value.rsplit(".", 1)[0]
    _sessions.pop(token, None)


def _get_session_cookie():
    return request.cookies.get("md_session")


def require_auth():
    # Page routes always serve HTML (auth handled client-side)
    if request.path == "/" or request.path.startswith("/view/"):
        return None
    if request.path.startswith("/static"):
        return None
    if request.path == "/api/login" and request.method == "POST":
        return None
    cookie = _get_session_cookie()
    if validate_session(cookie):
        return None
    return jsonify({"error": "Unauthorized"}), 401


def handle_login():
    data = request.get_json(silent=True) or {}
    api_key = data.get("api_key", "")
    cookie_value = issue_session_key(api_key)
    if cookie_value is None:
        return jsonify({"error": "Invalid API key"}), 401
    resp = make_response(jsonify({"ok": True}))
    resp.set_cookie(
        "md_session",
        cookie_value,
        max_age=config.SESSION_DURATION_HOURS * 3600,
        samesite="Lax",
    )
    return resp


def handle_logout():
    cookie = _get_session_cookie()
    revoke_session(cookie)
    resp = make_response(jsonify({"ok": True}))
    resp.set_cookie("md_session", "", max_age=0)
    return resp
