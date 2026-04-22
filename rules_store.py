# ─── Smart City — Rule Store (JSON persistence) ────────────────────────────────
"""
Manages named rule files persisted to data/rules_store.json.
Each file has: id, name, content, created_at, updated_at.
Multiple files can be active simultaneously (active_ids list).
"""

import json
import uuid
import threading
from datetime import datetime, timezone
from pathlib import Path

_DATA_DIR   = Path(__file__).parent / "data"
_STORE_PATH = _DATA_DIR / "rules_store.json"
_store_lock = threading.Lock()


# ── Internal helpers ───────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def _load() -> dict:
    """Load store from disk. Returns default structure if file missing."""
    if not _STORE_PATH.exists():
        return {"active_ids": [], "rules": {}}
    with open(_STORE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    # ── Migrate old single-active stores ──
    if "active_id" in data and "active_ids" not in data:
        old = data.pop("active_id")
        data["active_ids"] = [old] if old else []
    data.setdefault("active_ids", [])
    return data


def _save(store: dict) -> None:
    """Atomically save store to disk."""
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = _STORE_PATH.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(store, f, indent=2, ensure_ascii=False)
    tmp.replace(_STORE_PATH)


# ── Public API ─────────────────────────────────────────────────────────────────

def list_rules() -> list:
    """Return a lightweight list of all rule files (no content)."""
    with _store_lock:
        store = _load()
    active_ids = set(store.get("active_ids", []))
    result = []
    for rid, rule in store["rules"].items():
        result.append({
            "id":          rid,
            "name":        rule["name"],
            "is_active":   rid in active_ids,
            "updated_at":  rule.get("updated_at", ""),
            "created_at":  rule.get("created_at", ""),
            "line_count":  len([l for l in rule.get("content", "").split("\n") if l.strip()]),
        })
    result.sort(key=lambda r: r["created_at"])
    return result


def get_rule(rule_id: str) -> dict | None:
    """Return the full rule object including content, or None if not found."""
    with _store_lock:
        store = _load()
    rule = store["rules"].get(rule_id)
    if rule is None:
        return None
    active_ids = set(store.get("active_ids", []))
    return {**rule, "is_active": rule_id in active_ids}


def create_rule(name: str, content: str = "") -> dict:
    """Create a new rule file. Returns the created object."""
    with _store_lock:
        store = _load()
        rid = str(uuid.uuid4())
        now = _now_iso()
        rule = {
            "id":         rid,
            "name":       name.strip() or "Untitled Rule",
            "content":    content,
            "created_at": now,
            "updated_at": now,
        }
        store["rules"][rid] = rule
        _save(store)
    active_ids = set(store.get("active_ids", []))
    return {**rule, "is_active": rid in active_ids}


def update_rule(rule_id: str, name: str = None, content: str = None) -> dict | None:
    """Update name and/or content of a rule. Returns updated object or None."""
    with _store_lock:
        store = _load()
        rule = store["rules"].get(rule_id)
        if rule is None:
            return None
        if name is not None:
            rule["name"] = name.strip() or rule["name"]
        if content is not None:
            rule["content"] = content
        rule["updated_at"] = _now_iso()
        store["rules"][rule_id] = rule
        _save(store)
    active_ids = set(store.get("active_ids", []))
    return {**rule, "is_active": rule_id in active_ids}


def delete_rule(rule_id: str) -> bool:
    """Delete a rule file. Returns True if deleted."""
    with _store_lock:
        store = _load()
        if rule_id not in store["rules"]:
            return False
        del store["rules"][rule_id]
        ids = store.get("active_ids", [])
        if rule_id in ids:
            ids.remove(rule_id)
        store["active_ids"] = ids
        _save(store)
    return True


def activate_rule(rule_id: str) -> dict | None:
    """Add rule_id to active set. Returns rule object or None."""
    with _store_lock:
        store = _load()
        if rule_id not in store["rules"]:
            return None
        ids = store.get("active_ids", [])
        if rule_id not in ids:
            ids.append(rule_id)
        store["active_ids"] = ids
        _save(store)
    rule = store["rules"][rule_id]
    return {**rule, "is_active": True}


def deactivate_rule(rule_id: str) -> dict | None:
    """Remove rule_id from active set. Returns rule object or None."""
    with _store_lock:
        store = _load()
        if rule_id not in store["rules"]:
            return None
        ids = store.get("active_ids", [])
        if rule_id in ids:
            ids.remove(rule_id)
        store["active_ids"] = ids
        _save(store)
    rule = store["rules"][rule_id]
    return {**rule, "is_active": False}


def toggle_rule(rule_id: str) -> dict | None:
    """Toggle active state of a rule. Returns updated rule object or None."""
    with _store_lock:
        store = _load()
        if rule_id not in store["rules"]:
            return None
        ids = store.get("active_ids", [])
        if rule_id in ids:
            ids.remove(rule_id)
            now_active = False
        else:
            ids.append(rule_id)
            now_active = True
        store["active_ids"] = ids
        _save(store)
    rule = store["rules"][rule_id]
    return {**rule, "is_active": now_active}


def deactivate_all() -> None:
    """Clear all active rules."""
    with _store_lock:
        store = _load()
        store["active_ids"] = []
        _save(store)


def get_active_content() -> str:
    """Merge and return content of ALL currently active rules."""
    with _store_lock:
        store = _load()
    active_ids = store.get("active_ids", [])
    parts = []
    for rid in active_ids:
        rule = store["rules"].get(rid, {})
        c = rule.get("content", "").strip()
        if c:
            parts.append(c)
    return "\n".join(parts)


def get_active_ids() -> list:
    """Return the list of currently active rule IDs."""
    with _store_lock:
        store = _load()
    return store.get("active_ids", [])
