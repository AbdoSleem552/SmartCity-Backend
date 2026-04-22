# ─── Smart City — Shared Flask / SocketIO / MQTT instances ────────────────────
#   Other modules import from here to avoid circular imports.

import ssl
import random
import paho.mqtt.client as mqtt
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS

# ── Flask app ──
app = Flask(__name__)
app.secret_key = "smartcity-secret-2026"
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
CORS(app)

# ── SocketIO (threading mode — compatible with paho loop_start) ──
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# ── MQTT client ──
_mqtt_client_id = f"FlaskBackend-{random.randint(10000, 99999)}"
mqtt_client = mqtt.Client(client_id=_mqtt_client_id)
