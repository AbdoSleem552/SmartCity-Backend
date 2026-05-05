# ─── Smart City — SocketIO Event Handlers ──────────────────────────────────────

from flask_socketio import emit
from extensions import socketio
import rules_engine
from city_timer import get_city_time


@socketio.on("connect")
def handle_connect():
    print("[WS] Client connected")
    with rules_engine.telemetry_lock:
        snap = dict(rules_engine.latest_telemetry)
    with rules_engine.illum_lock:
        il_snap = dict(rules_engine.illumination)
    gas_danger = snap.get("gas", 0) > rules_engine.GAS_DANGER_THRESHOLD

    # Prayer config
    try:
        import prayer_store
        prayer_config = prayer_store.get_config()
        ct = get_city_time()
        prayer_config["next_prayer"] = prayer_store.get_next_prayer(ct["hours"], ct["minutes"])
    except Exception:
        prayer_config = {}

    emit("telemetry", {
        **snap,
        "illumination":           il_snap,
        "gas_danger":             gas_danger,
        "gas_threshold":          rules_engine.GAS_DANGER_THRESHOLD,
        "street_light_threshold": rules_engine.STREET_LIGHT_THRESHOLD,
        "city_lights_logic":      rules_engine.CITY_LIGHTS_LOGIC,
        "city_time":              get_city_time(),
    })
    emit("city_time", get_city_time())
    emit("illumination_update", il_snap)
    emit("prayer_config", prayer_config)


@socketio.on("disconnect")
def handle_disconnect():
    print("[WS] Client disconnected")
