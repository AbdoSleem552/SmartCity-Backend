# ─── Smart City — Rules Engine & Telemetry State ──────────────────────────────

import re
import json
import threading
from collections import deque
from config import DEFAULT_GAS_THRESHOLD, DEFAULT_STREET_LIGHT_THRESHOLD

# ── Mutable thresholds (updated via /api/command) ──
GAS_DANGER_THRESHOLD   = DEFAULT_GAS_THRESHOLD
STREET_LIGHT_THRESHOLD = DEFAULT_STREET_LIGHT_THRESHOLD
CITY_LIGHTS_LOGIC      = ""


def load_active_rules_from_store():
    """
    Called once at startup. Restores the active rule file from the JSON store
    so the engine keeps running after a server restart.
    """
    try:
        import rules_store
        content = rules_store.get_active_content()
        if not content:
            return
        parsed, p_blocks, errors = parse_all_rules(content)
        with rules_lock:
            parsed_rules.clear()
            parsed_rules.extend(parsed)
            procedural_blocks.clear()
            procedural_blocks.extend(p_blocks)
        global CITY_LIGHTS_LOGIC
        CITY_LIGHTS_LOGIC = content
        print(f"[STARTUP] Restored active rules: {len(parsed)} decl, {len(p_blocks)} blocks, {len(errors)} errors")
        
        from extensions import socketio, mqtt_client
        from config import TOPIC_COMMANDS
        start_procedural_threads(socketio, mqtt_client, TOPIC_COMMANDS)
    except Exception as e:
        print(f"[STARTUP] Could not restore rules: {e}")

# ── Telemetry state ──
latest_telemetry = {
    "gas":            0,
    "light":          0,
    "ir1":            False,
    "ir2":            False,
    "led":            "OFF",
    "speaker_active": False,
    "speaker_volume": 15,
}
telemetry_lock = threading.Lock()

gas_history: deque = deque(maxlen=60)

# ── Illumination zones ──
illumination = {"floor1": False, "floor2": False, "castle": False, "mosque": False}
illum_lock   = threading.Lock()

# ── Parsed rules ──
parsed_rules: list = []
rules_lock    = threading.Lock()

VALID_ZONES = ["floor1", "floor2", "castle", "mosque"]

# ── Procedural execution ──
procedural_blocks: list = []
procedural_threads: list = []
stop_procedural_event = threading.Event()

def _check_condition(cond):
    """Evaluate a single parsed condition against current real-time telemetry/illumination."""
    if not cond:
        return True
    with telemetry_lock:
        snap = dict(latest_telemetry)
    
    if cond == "gas_safe":
        return snap.get("gas", 0) <= GAS_DANGER_THRESHOLD
    elif cond == "gas_danger":
        return snap.get("gas", 0) > GAS_DANGER_THRESHOLD
    elif cond.startswith("light_below_"):
        th = int(cond.split("_")[-1])
        return snap.get("light", 0) < th
    elif cond.startswith("light_above_"):
        th = int(cond.split("_")[-1])
        return snap.get("light", 0) >= th
    elif cond.startswith("zone_on_"):
        dep_zone = cond.split("_")[-1]
        with illum_lock:
            return illumination.get(dep_zone, False)
    elif cond.startswith("zone_off_"):
        dep_zone = cond.split("_")[-1]
        with illum_lock:
            return not illumination.get(dep_zone, False)
    return True

# ─── Parsing ──────────────────────────────────────────────────────────────────

def parse_single_rule(text, line_num):
    """Parse one natural-language rule line into a structured dict."""
    raw = text.strip()
    if not raw:
        return None
    t = raw.lower().rstrip(".")

    # Action
    action = None
    if re.search(r"\b(turn\s+on|switch\s+on|enable)\b", t):
        action = "on"
    elif re.search(r"\b(turn\s+off|switch\s+off|disable)\b", t):
        action = "off"
    elif "keep" in t:
        if "always on" in t or re.search(r"\bon\b", t):
            action = "on"
        elif "always off" in t or re.search(r"\boff\b", t):
            action = "off"
    if action is None:
        return {
            "error": "No valid action found. Use: Turn on, Turn off, Keep, Switch on, Switch off, Enable, Disable.",
            "line": line_num,
            "text": raw,
        }

    # Zones
    found_zones = [z for z in VALID_ZONES if z in t]
    if "floor 1" in t and "floor1" not in found_zones:
        found_zones.append("floor1")
    if "floor 2" in t and "floor2" not in found_zones:
        found_zones.append("floor2")
    if not found_zones:
        return {
            "error": f'No valid zone found. Use: {", ".join(VALID_ZONES)}.',
            "line": line_num,
            "text": raw,
        }

    # Time range
    time_from = time_to = None
    m = re.search(r"from\s+(\d{1,2}:\d{2})\s+to\s+(\d{1,2}:\d{2})", t)
    if m:
        time_from, time_to = m.group(1), m.group(2)
    else:
        m = re.search(r"between\s+(\d{1,2}:\d{2})\s+and\s+(\d{1,2}:\d{2})", t)
        if m:
            time_from, time_to = m.group(1), m.group(2)

    # Condition
    condition = None
    if re.search(r"\bwhen\b.*\bgas\b.*\bsafe\b", t):
        condition = "gas_safe"
    elif re.search(r"\bwhen\b.*\bgas\b.*\bdanger\b", t):
        condition = "gas_danger"
    elif re.search(r"\bwhen\b.*\b(light|ldr)\b.*\bbelow\b", t):
        mv = re.search(r"below\s+(\d+)", t)
        condition = f"light_below_{mv.group(1)}" if mv else "light_below_2000"
    elif re.search(r"\bwhen\b.*\b(light|ldr)\b.*\babove\b", t):
        mv = re.search(r"above\s+(\d+)", t)
        condition = f"light_above_{mv.group(1)}" if mv else "light_above_2000"
    elif re.search(r"\bwhen\b.*\bdark\b", t):
        condition = f"light_below_{STREET_LIGHT_THRESHOLD}"
    elif re.search(r"\bwhen\b.*\bbright\b", t):
        condition = f"light_above_{STREET_LIGHT_THRESHOLD}"
    else:
        # Check for zone dependencies e.g., "when floor2 is turned on"
        m_zone = re.search(r"\bwhen\b\s+(floor1|floor2|floor\s*1|floor\s*2|castle|mosque|street)\s+is\s+(turned\s+on|on|turned\s+off|off)\b", t)
        if m_zone:
            z_cond = m_zone.group(1).replace(" ", "")
            if z_cond == "street":
                 # Not a standard zone in backend but UI keywords use it; map it or ignore
                 pass
            elif "on" in m_zone.group(2):
                condition = f"zone_on_{z_cond}"
            else:
                condition = f"zone_off_{z_cond}"

    return {
        "action":    action,
        "zones":     found_zones,
        "time_from": time_from,
        "time_to":   time_to,
        "condition": condition,
        "line":      line_num,
        "raw":       raw,
    }


def _parse_procedural_block(block_lines):
    insts = []
    errs = []
    i = 0
    while i < len(block_lines):
        txt, l_num = block_lines[i]
        t = txt.lower()
        if t.startswith("wait") or t.startswith("sleep"):
            m = re.search(r"(\d+)\s*(ms|sec|s\b)", t)
            if m:
                val = int(m.group(1))
                ms = val if m.group(2) == "ms" else val * 1000
                insts.append({"type": "wait", "ms": ms})
            else:
                errs.append({"error": "Invalid wait value. Use wait 500ms or wait 2 sec", "line": l_num, "text": txt})
        elif t.startswith("break when"):
            mock_t = "when " + t.replace("break when", "").strip() + " turn on empty"
            pr = parse_single_rule(mock_t, l_num)
            if pr and pr.get("condition") and "error" not in pr:
                insts.append({"type": "break", "condition": pr["condition"]})
            else:
                errs.append({"error": "Invalid break condition.", "line": l_num, "text": txt})
        elif t.startswith("if "):
            mock_t = "when " + t[3:].strip().rstrip(":") + " turn on empty"
            pr = parse_single_rule(mock_t, l_num)
            if pr and pr.get("condition") and "error" not in pr:
                if_lines = []
                i += 1
                while i < len(block_lines) and not block_lines[i][0].lower().startswith("end if"):
                    if_lines.append(block_lines[i])
                    i += 1
                sub_insts, sub_errs = _parse_procedural_block(if_lines)
                errs.extend(sub_errs)
                insts.append({"type": "if", "condition": pr["condition"], "instructions": sub_insts})
            else:
                errs.append({"error": "Invalid if condition.", "line": l_num, "text": txt})
        else:
            pr = parse_single_rule(txt, l_num)
            if pr:
                if "error" in pr:
                    errs.append(pr)
                else:
                    insts.append({"type": "action", "rule": pr})
        i += 1
    return insts, errs


def parse_all_rules(text):
    """Parse multi-line rule text. Returns (rules_list, procedural_blocks, errors_list)."""
    rules, p_blocks, errors = [], [], []
    if not text or not text.strip():
        return rules, p_blocks, errors
    
    lines = text.strip().split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
            
        if line.lower().startswith("loop:"):
            block_lines = []
            l_num = i + 1
            i += 1
            while i < len(lines):
                b_line = lines[i].strip()
                if b_line.lower() in ["end", "end loop"]:
                    break
                if b_line:
                    block_lines.append((b_line, i + 1))
                i += 1
                
            insts, b_errors = _parse_procedural_block(block_lines)
            if b_errors:
                errors.extend(b_errors)
            else:
                p_blocks.append({"type": "loop", "instructions": insts})
            i += 1
            continue
            
        result = parse_single_rule(line, i + 1)
        if result:
            (errors if "error" in result else rules).append(result)
        i += 1
        
    return rules, p_blocks, errors


# ─── Evaluation ───────────────────────────────────────────────────────────────

def evaluate_rules(socketio=None, mqtt_client=None, topic_commands=None):
    """Check parsed rules against city time & sensors. Apply illumination."""
    with rules_lock:
        current_rules = list(parsed_rules)
    if not current_rules:
        return

    # Import here to avoid circular dependency with city_timer
    from city_timer import get_city_time
    ct = get_city_time()
    current_min = ct["hours"] * 60 + ct["minutes"]

    with telemetry_lock:
        snap = dict(latest_telemetry)

    zone_actions: dict = {}
    for rule in current_rules:
        should_apply = True
        time_constrained = rule.get("time_from") and rule.get("time_to")

        if time_constrained:
            fp = rule["time_from"].split(":")
            tp = rule["time_to"].split(":")
            fr = int(fp[0]) * 60 + int(fp[1])
            to = int(tp[0]) * 60 + int(tp[1])
            if fr <= to:
                should_apply = fr <= current_min < to
            else:
                should_apply = current_min >= fr or current_min < to

        if rule.get("condition"):
            cond = rule["condition"]
            if cond == "gas_safe":
                cond_met = snap.get("gas", 0) <= GAS_DANGER_THRESHOLD
            elif cond == "gas_danger":
                cond_met = snap.get("gas", 0) > GAS_DANGER_THRESHOLD
            elif cond.startswith("light_below_"):
                th = int(cond.split("_")[-1])
                cond_met = snap.get("light", 0) < th
            elif cond.startswith("light_above_"):
                th = int(cond.split("_")[-1])
                cond_met = snap.get("light", 0) >= th
            elif cond.startswith("zone_on_"):
                dep_zone = cond.split("_")[-1]
                with illum_lock:
                    cond_met = illumination.get(dep_zone, False)
            elif cond.startswith("zone_off_"):
                dep_zone = cond.split("_")[-1]
                with illum_lock:
                    cond_met = not illumination.get(dep_zone, False)
            else:
                cond_met = True
            should_apply = should_apply and cond_met

        target_state = (
            (rule["action"] == "on") if should_apply
            else (not (rule["action"] == "on") if time_constrained else None)
        )
        if target_state is not None:
            for zone in rule["zones"]:
                zone_actions[zone] = target_state

    if not zone_actions:
        return

    changed = False
    with illum_lock:
        for zone, target in zone_actions.items():
            if zone in illumination and illumination[zone] != target:
                illumination[zone] = target
                changed = True
        il_snap = dict(illumination)

    if changed and socketio:
        socketio.emit("illumination_update", il_snap)
        if mqtt_client and topic_commands:
            for zone, target in zone_actions.items():
                try:
                    mqtt_client.publish(topic_commands, json.dumps({
                        "action": "illuminate",
                        "zone":   zone,
                        "state":  "on" if target else "off",
                    }))
                except Exception:
                    pass
        print(f"[LOGIC] Declarative Rules applied: {zone_actions}")

# ─── Procedural Engine ────────────────────────────────────────────────────────

def _emit_procedural_action(zone, is_on, socketio, mqtt_client, topic_commands):
    """Directly modify illumination state from a procedural thread and emit."""
    with illum_lock:
        if zone in illumination and illumination[zone] != is_on:
            illumination[zone] = is_on
            il_snap = dict(illumination)
            changed = True
        else:
            changed = False
            
    if changed and socketio:
        socketio.emit("illumination_update", il_snap)
        if mqtt_client and topic_commands:
            try:
                mqtt_client.publish(topic_commands, json.dumps({
                    "action": "illuminate",
                    "zone":   zone,
                    "state":  "on" if is_on else "off",
                }))
            except Exception:
                pass


def _run_procedural_block(block, socketio, mqtt_client, topic_commands):
    """Runs inside a background thread to execute procedural instructions."""
    def _execute_insts(insts):
        for i in insts:
            if stop_procedural_event.is_set():
                return "stop"
                
            itype = i["type"]
            if itype == "wait":
                if stop_procedural_event.wait(i["ms"] / 1000.0):
                    return "stop"
            elif itype == "action":
                rule = i["rule"]
                if _check_condition(rule.get("condition")):
                    for zone in rule["zones"]:
                        _emit_procedural_action(zone, rule["action"] == "on", socketio, mqtt_client, topic_commands)
            elif itype == "break":
                if _check_condition(i["condition"]):
                    return "break"
            elif itype == "if":
                if _check_condition(i["condition"]):
                    res = _execute_insts(i["instructions"])
                    if res in ["break", "stop"]:
                        return res
        return "continue"

    while not stop_procedural_event.is_set():
        res = _execute_insts(block["instructions"])
        if res in ["break", "stop"] or block.get("type") != "loop":
            break


def start_procedural_threads(socketio, mqtt_client, topic_commands):
    """Called on rule activation to spin up threads for procedural blocks."""
    stop_procedural_event.set()
    for t in procedural_threads:
        t.join(timeout=2.0)
    procedural_threads.clear()
    stop_procedural_event.clear()
    
    with rules_lock:
        blocks = list(procedural_blocks)
        
    for p_block in blocks:
        t = threading.Thread(
            target=_run_procedural_block,
            args=(p_block, socketio, mqtt_client, topic_commands),
            daemon=True
        )
        t.start()
        procedural_threads.append(t)

