/* ═══════════════════════════════════════════════════════════
   pages/docs.js — Documentation Viewer (read-only editor)
   ═══════════════════════════════════════════════════════════ */

import { initCodeEditor, updateCodeHighlight } from '../editor.js';

const BUILTIN_DOCS = [
    // ─── 1. FULL SYNTAX REFERENCE ────────────────────────────
    {
        id: "doc-syntax-full",
        name: "00-syntax-reference.smart",
        line_count: 65,
        content: `// =====================================================
// SMART CITY DSL — COMPLETE SYNTAX REFERENCE
// =====================================================

// ─── ZONES (controllable locations) ──────────────────
// floor1    — Home first floor lights
// floor2    — Home second floor lights
// castle    — Castle building lights
// mosque    — Mosque building lights
// floor 1, floor 2 also accepted (with space)

// ─── ACTION VERBS ────────────────────────────────────
// Turn on / Switch on / Enable    → sets zone ON
// Turn off / Switch off / Disable → sets zone OFF
// Keep ... always on              → persistent ON
// Keep ... always off             → persistent OFF

// ─── TIME RANGES ─────────────────────────────────────
// from HH:MM to HH:MM
// between HH:MM and HH:MM
// Supports overnight: from 22:00 to 06:00

// ─── SENSOR CONDITIONS ───────────────────────────────
// when gas is safe       → gas ≤ threshold
// when gas is danger     → gas > threshold
// when light is dark     → LDR below threshold
// when light is bright   → LDR above threshold
// when light below 1500  → custom LDR value
// when light above 3000  → custom LDR value
// when ldr is dark       → same as light

// ─── ZONE DEPENDENCY CONDITIONS ──────────────────────
// when floor2 is turned on   → triggers on zone state
// when castle is turned off  → triggers on zone state
// when floor1 is on          → shorter form
// when mosque is off         → shorter form

// ─── PROCEDURAL BLOCKS (loops) ───────────────────────
// loop:
//     <instructions>
// end loop
//
// Instructions inside loops:
//   Turn on/off <zone>
//   wait 500ms         → milliseconds
//   wait 3 sec         → seconds
//   sleep 2 sec        → same as wait
//   break when <cond>  → exit loop on condition

// ─── CONDITIONAL BLOCKS (inside loops) ───────────────
// if <condition>:
//     <instructions>
// end if
//
// Conditions: gas is safe, gas is danger,
//   light is dark, light is bright,
//   light below 2000, light above 3000

// ─── COMMENTS ────────────────────────────────────────
// Lines starting with // are ignored by the parser
// Use them to document your rules`
    },

    // ─── 2. BASIC DECLARATIVE RULES ──────────────────────────
    {
        id: "doc-basic-rules",
        name: "01-basic-rules.smart",
        line_count: 12,
        content: `// ── Basic Declarative Rules ──
// Each line is a standalone rule.
// Rules are evaluated every city-clock tick.

Turn on mosque lights from 18:00 to 23:00.
Switch off castle lights when light is bright.
Keep floor1 always on when gas is safe.
Enable floor2 from 20:00 to 06:00.
Disable castle when gas is danger.

// Rules with time ranges automatically
// turn OFF outside the specified window.`
    },

    // ─── 3. TIME SCHEDULES ───────────────────────────────────
    {
        id: "doc-schedules",
        name: "02-time-schedules.smart",
        line_count: 16,
        content: `// ── Time-Based Scheduling ──
// Use "from...to" or "between...and" syntax.

// Evening lighting (auto off at 23:00)
Turn on floor1 from 18:00 to 23:00.
Turn on floor2 from 19:00 to 22:00.

// Overnight lighting (crosses midnight)
Turn on castle from 22:00 to 06:00.
Keep mosque on between 20:00 and 05:00.

// Morning schedule
Turn on floor1 from 06:00 to 08:00.

// All-day keep-alive
Keep castle always on from 00:00 to 23:59.`
    },

    // ─── 4. SENSOR CONDITIONS ────────────────────────────────
    {
        id: "doc-sensors",
        name: "03-sensor-conditions.smart",
        line_count: 20,
        content: `// ── Sensor-Reactive Rules ──
// React to gas and light sensors in real-time.

// Gas sensor conditions
Turn on castle when gas is safe.
Turn off floor1 when gas is danger.
Disable floor2 when gas is danger.

// Light sensor — named states
Turn on mosque when light is dark.
Switch off castle when light is bright.

// Light sensor — custom thresholds
Turn on floor1 when light below 1500.
Switch off floor2 when light above 3500.
Turn on castle when ldr below 2000.

// Combined: time + sensor
Turn on floor1 from 18:00 to 06:00.
Turn on mosque when light is dark.`
    },

    // ─── 5. ZONE DEPENDENCIES ────────────────────────────────
    {
        id: "doc-dependencies",
        name: "04-zone-dependencies.smart",
        line_count: 16,
        content: `// ── Zone Chain Dependencies ──
// One zone reacts to another zone's state.

// When floor2 turns on, also turn on floor1
Turn on floor1 when floor2 is turned on.

// When castle goes off, also shut down floor2
Turn off floor2 when castle is turned off.

// Cascade: mosque follows floor1
Turn on mosque when floor1 is on.
Turn off mosque when floor1 is off.

// Reverse dependency
Turn off castle when floor2 is turned on.
Turn on castle when floor2 is turned off.`
    },

    // ─── 6. PROCEDURAL LOOPS ─────────────────────────────────
    {
        id: "doc-procedural",
        name: "05-procedural-loops.smart",
        line_count: 22,
        content: `// ── Procedural Sequences (Loops) ──
// Loops run in background threads.
// They repeat until stopped or broken.

// Simple blink cycle
loop:
    Turn on floor1
    wait 3 sec
    Turn off floor1
    wait 3 sec
end loop

// Fast alternating pattern
loop:
    Turn on floor1
    Turn off floor2
    wait 500ms
    Turn off floor1
    Turn on floor2
    wait 500ms
end loop`
    },

    // ─── 7. BREAK CONDITIONS ─────────────────────────────────
    {
        id: "doc-breaks",
        name: "06-break-conditions.smart",
        line_count: 22,
        content: `// ── Breaking Out of Loops ──
// "break when" exits the loop immediately
// when the condition becomes true.

// Stop blinking if gas detected
loop:
    break when gas is danger
    Turn on mosque
    wait 500ms
    Turn off mosque
    wait 500ms
end loop

// Stop when it gets bright
loop:
    break when light is bright
    Turn on floor1
    wait 1 sec
    Turn off floor1
    wait 1 sec
end loop`
    },

    // ─── 8. CONDITIONAL BLOCKS ───────────────────────────────
    {
        id: "doc-conditionals",
        name: "07-if-conditions.smart",
        line_count: 26,
        content: `// ── Conditional Blocks Inside Loops ──
// Use if/end if to run actions only
// when a condition is met, each iteration.

// Auto lights at night
loop:
    if light is dark:
        Turn on castle
        Turn on mosque
    end if
    wait 1000ms
end loop

// Gas emergency response
loop:
    if gas is danger:
        Turn on floor1
        Turn on floor2
        Turn on castle
    end if
    if gas is safe:
        Turn off castle
    end if
    wait 2000ms
end loop`
    },

    // ─── 9. NIGHT MODE TEMPLATE ──────────────────────────────
    {
        id: "doc-night-mode",
        name: "08-night-mode.smart",
        line_count: 14,
        content: `// ── Night Mode Profile ──
// Combines time + sensor for smart nighttime.

// Scheduled evening lights
Turn on mosque from 18:00 to 05:00.
Turn on castle from 19:00 to 06:00.

// Sensor-adaptive loop for floors
loop:
    if light is dark:
        Turn on floor1
        Turn on floor2
    end if
    wait 5 sec
end loop`
    },

    // ─── 10. ENERGY SAVING ───────────────────────────────────
    {
        id: "doc-energy-saving",
        name: "09-energy-saving.smart",
        line_count: 14,
        content: `// ── Energy Saving Profile ──
// Minimal lighting, sensor-driven only.

// Only light when actually dark
loop:
    if light is dark:
        Turn on floor1
    end if
    if light is bright:
        Turn off floor1
        Turn off floor2
        Turn off castle
    end if
    wait 3 sec
end loop`
    },

    // ─── 11. SAFETY ALARMS ───────────────────────────────────
    {
        id: "doc-safety",
        name: "10-safety-alarms.smart",
        line_count: 18,
        content: `// ── Safety & Emergency Profile ──
// Flash all lights on gas danger.

// Declarative safety
Turn off floor1 when gas is danger.
Turn off floor2 when gas is danger.

// Emergency flash loop
loop:
    if gas is danger:
        Turn on castle
        Turn on mosque
        wait 300ms
        Turn off castle
        Turn off mosque
        wait 300ms
    end if
    wait 500ms
end loop`
    },

    // ─── 12. FULL CITY AUTOMATION ────────────────────────────
    {
        id: "doc-full-auto",
        name: "11-full-automation.smart",
        line_count: 22,
        content: `// ── Full City Automation ──
// Combines declarative + procedural rules.

// Time-scheduled zones
Turn on mosque from 18:00 to 23:00.
Turn on castle from 19:00 to 05:00.
Keep floor1 on between 20:00 and 06:00.

// Gas safety override (declarative)
Turn off floor1 when gas is danger.
Turn off floor2 when gas is danger.

// Adaptive light loop
loop:
    break when gas is danger
    if light is dark:
        Turn on floor2
    end if
    if light is bright:
        Turn off floor2
    end if
    wait 2 sec
end loop`
    },

    // ─── 13. MOSQUE SCHEDULE ─────────────────────────────────
    {
        id: "doc-mosque-schedule",
        name: "12-mosque-schedule.smart",
        line_count: 12,
        content: `// ── Mosque Daily Schedule ──
// Five prayer-time windows.

Turn on mosque from 04:30 to 05:30.
Turn on mosque from 12:00 to 13:00.
Turn on mosque from 15:30 to 16:30.
Turn on mosque from 18:00 to 19:00.
Turn on mosque from 19:30 to 20:30.

// Safety: always turn on if gas is clear
Turn on mosque when gas is safe.
Turn off mosque when gas is danger.`
    },

    // ─── 14. CHASE PATTERN ───────────────────────────────────
    {
        id: "doc-chase",
        name: "13-chase-pattern.smart",
        line_count: 20,
        content: `// ── Sequential Chase Pattern ──
// Lights turn on one by one, then off.
// Creates a wave effect across all zones.

loop:
    break when gas is danger
    Turn on floor1
    wait 400ms
    Turn on floor2
    wait 400ms
    Turn on castle
    wait 400ms
    Turn on mosque
    wait 800ms
    Turn off floor1
    wait 400ms
    Turn off floor2
    wait 400ms
    Turn off castle
    wait 400ms
    Turn off mosque
    wait 800ms
end loop`
    }
];

let _selectedId = null;

export async function renderDocsPage() {
    const content = document.getElementById('page-content');

    content.innerHTML = `
    <h1 class="page-title" style="color:var(--accent-purple)">📚 Documentation</h1>
    <p class="page-subtitle">Interactive guide to the Smart City DSL — ${BUILTIN_DOCS.length} templates</p>

    <!-- ── GLOBAL SEARCH ──────────────────────────────────── -->
    <div style="
        display:flex; align-items:center; gap:10px;
        background:rgba(255,255,255,0.025);
        border:1px solid rgba(255,255,255,0.08);
        border-radius:var(--radius-md);
        padding:10px 16px;
        margin-bottom:20px;
    ">
        <span style="font-size:1rem; flex-shrink:0;">🔍</span>
        <input
            type="text"
            id="docs-global-search"
            placeholder="Search across the open document…"
            autocomplete="off"
            style="
                flex:1; background:transparent; border:none; outline:none;
                font-family:'Inter',sans-serif; font-size:0.88rem;
                color:var(--text-primary); caret-color:var(--accent-cyan);
            "
        >
        <span style="font-size:0.7rem; color:var(--text-muted); white-space:nowrap;"
              id="docs-search-hint">Select a document first</span>
    </div>

    <div class="rules-layout">

        <!-- ── SIDEBAR ─────────────────────────────────────── -->
        <aside class="rules-sidebar">
            <div class="sidebar-header">
                <span class="sidebar-title">📂 Examples Library</span>
            </div>
            <div class="rule-list" id="docs-rule-list">
                <!-- Rendered in JS -->
            </div>
            <div class="sidebar-footer">
                <div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">Read-Only Templates</div>
            </div>
        </aside>

        <!-- ── EDITOR PANEL ─────────────────────────────────── -->
        <section class="rules-editor-panel" id="rules-editor-panel">
            <div class="editor-empty-state" id="editor-empty-state">
                <div class="empty-icon" style="font-size:3rem">📖</div>
                <div class="empty-title">Documentation Viewer</div>
                <div class="empty-sub">Select an example from the sidebar to explore</div>
            </div>

            <div class="editor-active-panel" id="editor-active-panel" style="display:none">

                <!-- Status bar above editor -->
                <div class="editor-status-bar" id="editor-status-bar">
                    <span class="status-name" id="status-name"></span>
                    <span class="status-toggle" style="background:var(--bg-tertiary); color:var(--text-muted); border:1px solid rgba(255,255,255,0.1);">READONLY</span>
                </div>

                <!-- Code Editor -->
                <div class="code-editor" id="code-editor">
                    <div class="code-editor-toolbar">
                        <div class="toolbar-left">
                            <span class="toolbar-dot red"></span>
                            <span class="toolbar-dot yellow"></span>
                            <span class="toolbar-dot green"></span>
                            <span class="toolbar-filename" id="editor-filename">docs.smart</span>
                        </div>
                        <div class="toolbar-right">
                            <span class="toolbar-lines" id="editor-line-count">0 rules</span>
                            <span class="toolbar-lang">Smart City DSL</span>
                        </div>
                    </div>
                    <div class="code-editor-body">
                        <div class="line-numbers" id="line-numbers"></div>
                        <div class="code-input-wrapper">
                            <textarea id="ctrl-lights-logic" class="code-textarea" spellcheck="false" readonly></textarea>
                            <div class="code-highlight-overlay" id="code-highlight-overlay"></div>
                        </div>
                    </div>
                </div>

                <!-- Action bar -->
                <div class="editor-actions" style="margin-top:14px;">
                    <span style="color:var(--text-muted); font-size:0.85rem; font-weight:500;">🔒 Read-Only Document — use the search bar above to find keywords</span>
                </div>

            </div>
        </section>

    </div>`;

    initCodeEditor();

    const globalSearch = document.getElementById('docs-global-search');
    const searchHint   = document.getElementById('docs-search-hint');
    if (globalSearch) {
        globalSearch.addEventListener('input', () => {
            updateCodeHighlight(globalSearch.value);
        });
    }

    _selectedId = null;
    _renderList();
    _showEmptyState();
}

function _renderList() {
    const list = document.getElementById('docs-rule-list');
    if (!list) return;

    list.innerHTML = BUILTIN_DOCS.map(r => `
        <div class="rule-item docs-item ${r.id === _selectedId ? 'selected' : ''}"
             data-id="${r.id}">
            <div class="rule-item-indicator" title="Read Only">
                <span class="indicator-dot" style="background:var(--text-muted)"></span>
            </div>
            <div class="rule-item-body">
                <div class="rule-item-name" style="color:var(--accent-purple)">${r.name}</div>
                <div class="rule-item-meta">${r.line_count} lines · Built-In Template</div>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('.rule-item').forEach(el =>
        el.addEventListener('click', () => _selectRule(el.dataset.id))
    );
}

function _selectRule(id) {
    _selectedId = id;
    _renderList();
    const doc = BUILTIN_DOCS.find(r => r.id === id);
    if (!doc) return;

    const ta       = document.getElementById('ctrl-lights-logic');
    const filename = document.getElementById('editor-filename');
    const nameEl   = document.getElementById('status-name');
    const search   = document.getElementById('docs-global-search');
    const hint     = document.getElementById('docs-search-hint');

    if (ta) ta.value = doc.content;
    if (filename) filename.textContent = doc.name;
    if (nameEl) nameEl.textContent = doc.name.replace('.smart', '');
    if (search) search.value = '';
    if (hint) hint.textContent = `Searching in ${doc.name}`;

    updateCodeHighlight('');
    _showEditorPanel();
}

function _showEditorPanel() {
    document.getElementById('editor-empty-state').style.display  = 'none';
    document.getElementById('editor-active-panel').style.display = 'flex';
}

function _showEmptyState() {
    document.getElementById('editor-empty-state').style.display  = 'flex';
    document.getElementById('editor-active-panel').style.display = 'none';
}
