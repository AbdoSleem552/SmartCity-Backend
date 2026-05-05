# ─── Smart City — Prayer Times & Track Library Store ───────────────────────────

import os
import json
import threading

_STORE_PATH = os.path.join(os.path.dirname(__file__), "data", "prayer_config.json")
_lock = threading.Lock()

PRAYER_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
PRAYER_ICONS = {"Fajr": "🌅", "Dhuhr": "☀️", "Asr": "🌤", "Maghrib": "🌇", "Isha": "🌙"}

_DEFAULTS = {
    "prayer_times": {
        "Fajr":    "05:00",
        "Dhuhr":   "12:30",
        "Asr":     "15:45",
        "Maghrib": "18:30",
        "Isha":    "20:00",
    },
    "adhan_track":   1,
    "adhan_enabled": True,
    "track_library": [
        {"number": 1, "name": "Adhan – Madinah"},
        {"number": 2, "name": "Quran Recitation"},
        {"number": 3, "name": "City Announcement"},
        {"number": 4, "name": "Alarm / Siren"},
        {"number": 5, "name": "Welcome Jingle"},
        {"number": 6, "name": "Traffic Alert"},
        {"number": 7, "name": "Night Ambience"},
    ],
}


def _load() -> dict:
    """Load config from disk, returning defaults if missing."""
    try:
        with open(_STORE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Ensure all keys exist (forward compat)
        for k, v in _DEFAULTS.items():
            data.setdefault(k, v)
        return data
    except (FileNotFoundError, json.JSONDecodeError):
        return dict(_DEFAULTS)


def _save(data: dict):
    """Persist config to disk."""
    os.makedirs(os.path.dirname(_STORE_PATH), exist_ok=True)
    with open(_STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ── Public API ─────────────────────────────────────────────────────────────────

def get_config() -> dict:
    """Return the full prayer/track config."""
    with _lock:
        return _load()


def update_prayer_times(times: dict) -> dict:
    """Update prayer times. `times` is a dict like {"Fajr": "05:00", ...}."""
    with _lock:
        data = _load()
        for name in PRAYER_NAMES:
            if name in times:
                data["prayer_times"][name] = times[name]
        _save(data)
        return data


def update_adhan_settings(track: int = None, enabled: bool = None) -> dict:
    """Update adhan track number and/or enabled flag."""
    with _lock:
        data = _load()
        if track is not None:
            data["adhan_track"] = max(1, int(track))
        if enabled is not None:
            data["adhan_enabled"] = bool(enabled)
        _save(data)
        return data


def update_track_library(tracks: list) -> dict:
    """Replace the entire track library. Each item: {"number": int, "name": str}."""
    with _lock:
        data = _load()
        data["track_library"] = [
            {"number": int(t.get("number", i + 1)), "name": str(t.get("name", f"Track {i + 1}"))}
            for i, t in enumerate(tracks)
        ]
        _save(data)
        return data


def get_next_prayer(city_hours: int, city_minutes: int) -> dict | None:
    """Return the next upcoming prayer based on current city time."""
    current_min = city_hours * 60 + city_minutes
    with _lock:
        data = _load()

    best = None
    best_diff = 99999

    for name in PRAYER_NAMES:
        t = data["prayer_times"].get(name, "")
        if ":" not in t:
            continue
        parts = t.split(":")
        prayer_min = int(parts[0]) * 60 + int(parts[1])
        diff = prayer_min - current_min
        if diff < 0:
            diff += 1440  # wrap around midnight
        if diff < best_diff:
            best_diff = diff
            best = {"name": name, "time": t, "minutes_until": diff}

    return best
