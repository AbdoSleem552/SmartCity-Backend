# ─── Smart City — Configuration ───────────────────────────────────────────────

# MQTT
MQTT_BROKER   = "39c19f912df04e67b6cafc40a93ac9a7.s1.eu.hivemq.cloud"
MQTT_PORT     = 8883
MQTT_USER     = "ESP32"
MQTT_PASSWORD = "ESP32Password"

TOPIC_TELEMETRY = "smartcity/telemetry"
TOPIC_COMMANDS  = "smartcity/commands"

# Auth
VALID_USERS = {"admin": "smartcity2026"}

# Sensor defaults
DEFAULT_GAS_THRESHOLD         = 1000
DEFAULT_STREET_LIGHT_THRESHOLD = 2000
