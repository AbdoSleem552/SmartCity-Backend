# ─── Smart City — City Clock ───────────────────────────────────────────────────

import time
import threading

# Use a plain lock — never call get_city_time() while holding _timer_lock
_timer_lock = threading.Lock()

city_timer = {
    "base_real_time": time.time(),
    "base_city_time": 6 * 3600,   # start at 06:00 AM
    "speed":          1,
}


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


def city_timer_thread(socketio, evaluate_rules_fn):
    """Emit city_time every second and evaluate automation rules."""
    while True:
        try:
            socketio.emit("city_time", get_city_time())
            evaluate_rules_fn()
        except Exception:
            pass
        time.sleep(1)
