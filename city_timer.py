# ─── Smart City — City Clock ───────────────────────────────────────────────────

import json
import time
import threading

# Use a plain lock — never call get_city_time() while holding _timer_lock
_timer_lock = threading.Lock()

city_timer = {
    "base_real_time": time.time(),
    "base_city_time": 6 * 3600,   # start at 06:00 AM
    "speed":          1,
}

# ── Adhan scheduler state ─────────────────────────────────────────────────────
_last_adhan_prayer = None   # name of last triggered prayer (avoid re-fire)
_last_adhan_minute = -1     # city minute when last triggered


def _city_seconds() -> float:
    """Return current city seconds-since-midnight (caller must hold _timer_lock)."""
    elapsed_real = time.time() - city_timer["base_real_time"]
    return (city_timer["base_city_time"] + elapsed_real * city_timer["speed"]) % 86400


def get_city_time() -> dict:
    """Thread-safe snapshot of the city clock."""
    with _timer_lock:
        total = _city_seconds()
    h = int(total // 3600)
    m = int((total % 3600) // 60)
    s = int(total % 60)
    return {
        "hours":         h,
        "minutes":       m,
        "seconds":       s,
        "formatted":     f"{h:02d}:{m:02d}:{s:02d}",
        "speed":         city_timer["speed"],
        "total_seconds": total,
    }


def _check_adhan(socketio, mqtt_client, topic_commands):
    """Check if current city time matches a prayer time and auto-play adhan."""
    global _last_adhan_prayer, _last_adhan_minute

    try:
        import prayer_store
        config = prayer_store.get_config()
    except Exception:
        return

    if not config.get("adhan_enabled", False):
        return

    ct = get_city_time()
    city_hhmm = f"{ct['hours']:02d}:{ct['minutes']:02d}"
    city_minute = ct["hours"] * 60 + ct["minutes"]

    # Don't re-trigger in the same city minute for the same prayer
    if city_minute == _last_adhan_minute and _last_adhan_prayer is not None:
        return

    prayer_times = config.get("prayer_times", {})
    matched_prayer = None

    for name, t in prayer_times.items():
        if t == city_hhmm:
            matched_prayer = name
            break

    if matched_prayer is None:
        # Reset once we move past the prayer minute
        if city_minute != _last_adhan_minute:
            _last_adhan_prayer = None
            _last_adhan_minute = -1
        return

    # Already triggered for this prayer
    if matched_prayer == _last_adhan_prayer:
        return

    _last_adhan_prayer = matched_prayer
    _last_adhan_minute = city_minute

    track = config.get("adhan_track", 1)
    print(f"[ADHAN] {matched_prayer} at {city_hhmm} - playing track {track}")

    # Send play command via MQTT
    if mqtt_client and topic_commands:
        try:
            mqtt_client.publish(topic_commands, json.dumps({
                "action": "play",
                "track": track,
            }))
        except Exception as e:
            print(f"[ADHAN] MQTT publish error: {e}")

    # Notify connected clients
    if socketio:
        socketio.emit("adhan_playing", {
            "prayer": matched_prayer,
            "time":   city_hhmm,
            "track":  track,
        })

    # Also turn on mosque lights
    import rules_engine
    with rules_engine.illum_lock:
        if not rules_engine.illumination.get("mosque", False):
            rules_engine.illumination["mosque"] = True
            il_snap = dict(rules_engine.illumination)
            if socketio:
                socketio.emit("illumination_update", il_snap)
            if mqtt_client and topic_commands:
                try:
                    mqtt_client.publish(topic_commands, json.dumps({
                        "action": "illuminate",
                        "zone": "mosque",
                        "state": "on",
                    }))
                except Exception:
                    pass
            print("[ADHAN] Mosque lights turned on")


def city_timer_thread(socketio, evaluate_rules_fn, mqtt_client=None, topic_commands=None):
    """Emit city_time every second, evaluate automation rules, and check adhan schedule."""
    while True:
        try:
            socketio.emit("city_time", get_city_time())
            evaluate_rules_fn()
            _check_adhan(socketio, mqtt_client, topic_commands)
        except Exception:
            pass
        time.sleep(1)
