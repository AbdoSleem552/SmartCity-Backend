# ─── Smart City — REST API Routes ──────────────────────────────────────────────

import json
import uuid
from flask import Blueprint, request, jsonify
from auth import require_auth, active_tokens, VALID_USERS
from extensions import socketio, mqtt_client
from config import TOPIC_COMMANDS
from city_timer import _timer_lock, _city_seconds, city_timer, get_city_time
import rules_engine

api_bp = Blueprint("api", __name__, url_prefix="/api")


# ── Telemetry: no-cache headers ────────────────────────────────────────────────
from extensions import app as flask_app

@flask_app.after_request
def add_no_cache_headers(response):
    """Prevent browser caching of static files during development."""
    if "static" in request.path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


# ── Auth ───────────────────────────────────────────────────────────────────────

@api_bp.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username", "")
    password = data.get("password", "")
    if username in VALID_USERS and VALID_USERS[username] == password:
        token = str(uuid.uuid4())
        active_tokens[token] = username
        return jsonify({"status": "success", "token": token, "username": username})
    return jsonify({"error": "Invalid credentials"}), 401


@api_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    active_tokens.pop(token, None)
    return jsonify({"status": "logged out"})


# ── Telemetry ──────────────────────────────────────────────────────────────────

@api_bp.route("/telemetry", methods=["GET"])
@require_auth
def get_telemetry():
    with rules_engine.telemetry_lock:
        snap = dict(rules_engine.latest_telemetry)
    with rules_engine.illum_lock:
        il_snap = dict(rules_engine.illumination)
    gas_danger = snap.get("gas", 0) > rules_engine.GAS_DANGER_THRESHOLD
    return jsonify({
        **snap,
        "illumination":           il_snap,
        "gas_danger":             gas_danger,
        "gas_threshold":          rules_engine.GAS_DANGER_THRESHOLD,
        "street_light_threshold": rules_engine.STREET_LIGHT_THRESHOLD,
        "city_lights_logic":      rules_engine.CITY_LIGHTS_LOGIC,
        "gas_history":            list(rules_engine.gas_history),
        "city_time":              get_city_time(),
    })


# ── Commands ───────────────────────────────────────────────────────────────────

@api_bp.route("/command", methods=["POST"])
@require_auth
def send_command():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON payload"}), 400

    action = data.get("action")

    if action == "illuminate":
        zone      = data.get("zone")
        new_state = data.get("state")
        with rules_engine.illum_lock:
            if zone not in rules_engine.illumination:
                return jsonify({"error": f"Unknown zone: {zone}"}), 400
            rules_engine.illumination[zone] = (new_state == "on")
            il_snap = dict(rules_engine.illumination)
        try:
            mqtt_client.publish(TOPIC_COMMANDS, json.dumps(data))
        except Exception as e:
            print(f"[MQTT] publish error: {e}")
        socketio.emit("illumination_update", il_snap)
        return jsonify({"status": "success", "illumination": il_snap})

    if action == "set_gas_threshold":
        threshold = max(0, min(4095, int(data.get("threshold", rules_engine.GAS_DANGER_THRESHOLD))))
        rules_engine.GAS_DANGER_THRESHOLD = threshold
        print(f"[CFG] Gas threshold set to {threshold}")
        socketio.emit("config_update", {"gas_threshold": threshold})
        return jsonify({"status": "success", "gas_threshold": threshold})

    if action == "set_light_threshold":
        threshold = max(0, min(4095, int(data.get("threshold", rules_engine.STREET_LIGHT_THRESHOLD))))
        rules_engine.STREET_LIGHT_THRESHOLD = threshold
        print(f"[CFG] Street light threshold set to {threshold}")
        socketio.emit("config_update", {"street_light_threshold": threshold})
        return jsonify({"status": "success", "street_light_threshold": threshold})

    if action == "city_lights_logic":
        logic_text = data.get("logic", "")
        rules_engine.CITY_LIGHTS_LOGIC = logic_text
        print(f"[CFG] City lights logic updated: {logic_text[:80]}")

        parsed, errors = rules_engine.parse_all_rules(logic_text)
        with rules_engine.rules_lock:
            rules_engine.parsed_rules.clear()
            rules_engine.parsed_rules.extend(parsed)
        print(f"[LOGIC] Parsed {len(parsed)} rules, {len(errors)} errors")

        if parsed:
            rules_engine.evaluate_rules(socketio, mqtt_client, TOPIC_COMMANDS)

        try:
            mqtt_client.publish(TOPIC_COMMANDS, json.dumps(data))
        except Exception as e:
            print(f"[MQTT] publish error: {e}")

        socketio.emit("config_update", {"city_lights_logic": logic_text})
        return jsonify({
            "status":       "success" if not errors else "partial",
            "city_lights_logic": logic_text,
            "parsed_count": len(parsed),
            "errors":       errors,
            "parsed_rules": [
                {
                    "zones":     r["zones"],
                    "action":    r["action"],
                    "time_from": r.get("time_from"),
                    "time_to":   r.get("time_to"),
                    "condition": r.get("condition"),
                    "line":      r["line"],
                }
                for r in parsed
            ],
        })

    # All other commands — forward to ESP
    try:
        mqtt_client.publish(TOPIC_COMMANDS, json.dumps(data))
        print(f"[CMD] -> ESP: {data}")
    except Exception as e:
        print(f"[MQTT] publish error: {e}")
    return jsonify({"status": "success", "command": data})


# ── Timer ──────────────────────────────────────────────────────────────────────

@api_bp.route("/timer", methods=["GET"])
@require_auth
def get_timer():
    return jsonify(get_city_time())


@api_bp.route("/timer", methods=["POST"])
@require_auth
def set_timer():
    data = request.json or {}
    with _timer_lock:
        current_total = _city_seconds()

        if "speed" in data:
            import time as _time
            speed = max(1, min(100, int(data["speed"])))
            city_timer["base_real_time"] = _time.time()
            city_timer["base_city_time"] = current_total
            city_timer["speed"]          = speed

        if "set_time" in data:
            import time as _time
            parts = str(data["set_time"]).split(":")
            if len(parts) >= 2:
                h = int(parts[0]); m = int(parts[1])
                city_timer["base_real_time"] = _time.time()
                city_timer["base_city_time"] = h * 3600 + m * 60

    new_time = get_city_time()
    socketio.emit("city_time", new_time)
    return jsonify({"status": "success", "city_time": new_time})
