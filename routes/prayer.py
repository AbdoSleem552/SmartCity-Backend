# ─── Smart City — Prayer & Speaker API Routes ─────────────────────────────────

from flask import Blueprint, request, jsonify
from auth import require_auth
from extensions import socketio
import prayer_store

prayer_bp = Blueprint("prayer", __name__, url_prefix="/api/prayer")


def _emit_prayer_update(config=None):
    """Push updated prayer config to all connected clients."""
    if config is None:
        config = prayer_store.get_config()
    socketio.emit("prayer_config", config)


# ── Get full config ────────────────────────────────────────────────────────────

@prayer_bp.route("", methods=["GET"])
@require_auth
def get_prayer_config():
    config = prayer_store.get_config()
    return jsonify(config)


# ── Update prayer times ────────────────────────────────────────────────────────

@prayer_bp.route("/times", methods=["PUT"])
@require_auth
def update_times():
    data = request.json or {}
    times = data.get("times", data)  # accept {times: {...}} or flat
    config = prayer_store.update_prayer_times(times)
    _emit_prayer_update(config)
    return jsonify({"status": "success", **config})


# ── Update adhan settings ─────────────────────────────────────────────────────

@prayer_bp.route("/adhan", methods=["PUT"])
@require_auth
def update_adhan():
    data = request.json or {}
    config = prayer_store.update_adhan_settings(
        track=data.get("track"),
        enabled=data.get("enabled"),
    )
    _emit_prayer_update(config)
    return jsonify({"status": "success", **config})


# ── Update track library ──────────────────────────────────────────────────────

@prayer_bp.route("/tracks", methods=["PUT"])
@require_auth
def update_tracks():
    data = request.json or {}
    tracks = data.get("tracks", [])
    config = prayer_store.update_track_library(tracks)
    _emit_prayer_update(config)
    return jsonify({"status": "success", **config})
