# ─── Smart City — Authentication ──────────────────────────────────────────────

from functools import wraps
from flask import request, jsonify
from config import VALID_USERS

# token -> username
active_tokens: dict[str, str] = {}


def require_auth(f):
    """Decorator: rejects requests without a valid Bearer token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if token not in active_tokens:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated
