# ─── Smart City — Rules CRUD API Routes ───────────────────────────────────────

from flask import Blueprint, request, jsonify
from auth import require_auth
from extensions import socketio, mqtt_client
from config import TOPIC_COMMANDS
import rules_store
import rules_engine

rules_bp = Blueprint("rules", __name__, url_prefix="/api/rules")


# ── List all rule files ────────────────────────────────────────────────────────

@rules_bp.route("", methods=["GET"])
@require_auth
def list_rules():
    return jsonify(rules_store.list_rules())


# ── Create a new rule file ─────────────────────────────────────────────────────

@rules_bp.route("", methods=["POST"])
@require_auth
def create_rule():
    data    = request.json or {}
    name    = data.get("name", "New Rule")
    content = data.get("content", "")
    rule    = rules_store.create_rule(name, content)
    return jsonify(rule), 201


# ── Get single rule (with content) ────────────────────────────────────────────

@rules_bp.route("/<rule_id>", methods=["GET"])
@require_auth
def get_rule(rule_id):
    rule = rules_store.get_rule(rule_id)
    if rule is None:
        return jsonify({"error": "Rule not found"}), 404
    return jsonify(rule)


# ── Update rule (name and/or content) ─────────────────────────────────────────

@rules_bp.route("/<rule_id>", methods=["PUT"])
@require_auth
def update_rule(rule_id):
    data    = request.json or {}
    name    = data.get("name")
    content = data.get("content")

    rule = rules_store.update_rule(rule_id, name=name, content=content)
    if rule is None:
        return jsonify({"error": "Rule not found"}), 404

    # If this rule is currently active, re-apply the merged ruleset live
    if rule["is_active"] and content is not None:
        _rebuild_and_apply()

    return jsonify(rule)


# ── Delete a rule file ─────────────────────────────────────────────────────────

@rules_bp.route("/<rule_id>", methods=["DELETE"])
@require_auth
def delete_rule(rule_id):
    old_rule   = rules_store.get_rule(rule_id)
    was_active = old_rule and old_rule.get("is_active", False)

    deleted = rules_store.delete_rule(rule_id)
    if not deleted:
        return jsonify({"error": "Rule not found"}), 404

    # Rebuild engine without the deleted rule
    if was_active:
        _rebuild_and_apply()

    return jsonify({"status": "deleted", "id": rule_id})


# ── Toggle a rule's active state (activate if off, deactivate if on) ──────────

@rules_bp.route("/<rule_id>/toggle", methods=["POST"])
@require_auth
def toggle_rule(rule_id):
    rule = rules_store.toggle_rule(rule_id)
    if rule is None:
        return jsonify({"error": "Rule not found"}), 404

    parsed_count, errors = _rebuild_and_apply()

    return jsonify({
        "status":       "active" if rule["is_active"] else "inactive",
        "rule":         rule,
        "parsed_count": parsed_count,
        "errors":       errors,
    })


# ── Explicitly activate a rule (idempotent) ───────────────────────────────────

@rules_bp.route("/<rule_id>/activate", methods=["POST"])
@require_auth
def activate_rule(rule_id):
    rule = rules_store.activate_rule(rule_id)
    if rule is None:
        return jsonify({"error": "Rule not found"}), 404

    parsed_count, errors = _rebuild_and_apply()

    return jsonify({
        "status":       "activated",
        "rule":         rule,
        "parsed_count": parsed_count,
        "errors":       errors,
    })


# ── Explicitly deactivate a rule ───────────────────────────────────────────────

@rules_bp.route("/<rule_id>/deactivate", methods=["POST"])
@require_auth
def deactivate_rule(rule_id):
    rule = rules_store.deactivate_rule(rule_id)
    if rule is None:
        return jsonify({"error": "Rule not found"}), 404

    parsed_count, errors = _rebuild_and_apply()

    return jsonify({
        "status":       "deactivated",
        "rule":         rule,
        "parsed_count": parsed_count,
        "errors":       errors,
    })


# ── Deactivate ALL rules ───────────────────────────────────────────────────────

@rules_bp.route("/deactivate", methods=["POST"])
@require_auth
def deactivate_all():
    rules_store.deactivate_all()
    _apply_empty_to_engine()
    return jsonify({"status": "all_deactivated"})


# ── Internal helpers ───────────────────────────────────────────────────────────

def _rebuild_and_apply():
    """Merge content of ALL active rules and push to the live engine."""
    merged = rules_store.get_active_content()
    return _apply_content_to_engine(merged)


def _apply_empty_to_engine():
    _apply_content_to_engine("")


def _apply_content_to_engine(content: str):
    """Parse content string and update the live rules engine."""
    parsed, p_blocks, errors = rules_engine.parse_all_rules(content)
    with rules_engine.rules_lock:
        rules_engine.parsed_rules.clear()
        rules_engine.parsed_rules.extend(parsed)
        rules_engine.procedural_blocks = p_blocks
        
    rules_engine.CITY_LIGHTS_LOGIC = content
    active_count = len(rules_store.get_active_ids())
    print(f"[RULES] {active_count} active file(s) → {len(parsed)} decl rules, {len(p_blocks)} blocks, {len(errors)} errors")
    
    if parsed:
        rules_engine.evaluate_rules(socketio, mqtt_client, TOPIC_COMMANDS)
        
    rules_engine.start_procedural_threads(socketio, mqtt_client, TOPIC_COMMANDS)
    
    socketio.emit("config_update", {"city_lights_logic": content})
    return len(parsed) + len(p_blocks), errors
