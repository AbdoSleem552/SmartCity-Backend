# ─── Smart City — Application Entry Point ─────────────────────────────────────

import threading
from extensions import app, socketio
from routes import register_blueprints
import socket_events          # registers @socketio.on handlers (import side-effect)
from mqtt_handler import start_mqtt
from city_timer import city_timer_thread
from rules_engine import evaluate_rules, load_active_rules_from_store
from config import TOPIC_COMMANDS
from extensions import mqtt_client

# ── Register blueprints ──
register_blueprints(app)

# ── Start MQTT ──
start_mqtt()

# ── Restore active rule profile from disk ──
load_active_rules_from_store()


if __name__ == "__main__":
    # City clock + rules evaluation (plain daemon thread)
    def _rules_fn():
        evaluate_rules(socketio, mqtt_client, TOPIC_COMMANDS)

    t = threading.Thread(
        target=city_timer_thread,
        args=(socketio, _rules_fn),
        daemon=True,
    )
    t.start()
    print("[TIMER] City clock thread started.")

    socketio.run(
        app,
        debug=False,
        host="0.0.0.0",
        port=5000,
        use_reloader=False,
        allow_unsafe_werkzeug=True,
    )
