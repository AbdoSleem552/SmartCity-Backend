# ─── Smart City — MQTT Handler ─────────────────────────────────────────────────

import ssl
import json
import time
from extensions import mqtt_client, socketio, _mqtt_client_id
from config import MQTT_BROKER, MQTT_PORT, MQTT_USER, MQTT_PASSWORD, TOPIC_TELEMETRY, TOPIC_COMMANDS
import rules_engine
from mq2_model import predict_gas_state


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("[MQTT] Connected to broker.")
        client.subscribe(TOPIC_TELEMETRY)
        print(f"[MQTT] Subscribed to {TOPIC_TELEMETRY}")
    else:
        print(f"[MQTT] Connect failed rc={rc}")


def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"[MQTT] Disconnected unexpectedly rc={rc}. Auto-reconnect active.")


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))

        # Field normalisation
        if "object" in payload:
            payload["ir1"] = payload.pop("object")
        payload.setdefault("ir2", False)
        if "vol" in payload:
            payload["speaker_volume"] = payload.pop("vol")

        with rules_engine.telemetry_lock:
            rules_engine.latest_telemetry.update(payload)
            snap = dict(rules_engine.latest_telemetry)

        rules_engine.gas_history.append({"value": snap.get("gas", 0), "timestamp": time.time()})
        
        gas_val = snap.get("gas", 0)
        gas_state = predict_gas_state(gas_val)
        gas_danger = gas_state in ["GAS_WARNING", "SMOKE_ALARM"]

        with rules_engine.illum_lock:
            il_snap = dict(rules_engine.illumination)

        from city_timer import get_city_time
        socketio.emit("telemetry", {
            **snap,
            "illumination":           il_snap,
            "gas_danger":             gas_danger,
            "gas_state":              gas_state,
            "gas_threshold":          rules_engine.GAS_DANGER_THRESHOLD,
            "street_light_threshold": rules_engine.STREET_LIGHT_THRESHOLD,
            "city_lights_logic":      rules_engine.CITY_LIGHTS_LOGIC,
            "city_time":              get_city_time(),
        })
    except Exception as e:
        print(f"[MQTT] on_message error: {e}")


def start_mqtt():
    """Wire up callbacks and connect to the broker."""
    mqtt_client.username_pw_set(MQTT_USER, MQTT_PASSWORD)
    mqtt_client.tls_set(tls_version=ssl.PROTOCOL_TLS)
    mqtt_client.on_connect    = on_connect
    mqtt_client.on_disconnect = on_disconnect
    mqtt_client.on_message    = on_message
    mqtt_client.reconnect_delay_set(min_delay=2, max_delay=60)

    try:
        print(f"[MQTT] Connecting to {MQTT_BROKER}:{MQTT_PORT} as {_mqtt_client_id}...")
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        mqtt_client.loop_start()
    except Exception as e:
        print(f"[MQTT] Initial connect failed: {e}")
