/* ═══════════════════════════════════════════════════════════
   pages/logic.js — Rule Manager (sidebar + editor panel)
   Multiple rules can be active simultaneously.
   ═══════════════════════════════════════════════════════════ */

import { initCodeEditor, updateCodeHighlight } from '../editor.js';
import {
    fetchRules, fetchRule, createRule, updateRule,
    deleteRule, toggleRule, deactivateAll,
} from '../rules_manager.js';

// ── Module state ──────────────────────────────────────────────────────────────
let _rules      = [];      // lightweight list from server
let _selectedId = null;    // currently open in editor
let _isDirty    = false;   // unsaved changes in editor

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function renderLogicPage() {
    const content = document.getElementById('page-content');

    content.innerHTML = `
    <h1 class="page-title">Rule Manager</h1>
    <p class="page-subtitle">Manage named automation profiles · Activate or deactivate any combination</p>

    <div class="rules-layout">

        <!-- ── SIDEBAR ─────────────────────────────────────── -->
        <aside class="rules-sidebar" id="rules-sidebar">
            <div class="sidebar-header">
                <span class="sidebar-title">📂 Rule Files</span>
                <button class="btn-new-rule" id="btn-new-rule" title="Create new rule file">＋ New</button>
            </div>
            <div class="rule-list" id="rule-list">
                <div class="rule-list-loading">Loading…</div>
            </div>
            <div class="sidebar-footer">
                <button class="btn-deactivate" id="btn-deactivate-all" title="Stop all automation">⏹ Stop All</button>
            </div>
        </aside>

        <!-- ── EDITOR PANEL ─────────────────────────────────── -->
        <section class="rules-editor-panel" id="rules-editor-panel">
            <div class="editor-empty-state" id="editor-empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-title">No rule file selected</div>
                <div class="empty-sub">Select a file from the sidebar or create a new one</div>
                <button class="btn-apply-logic" id="btn-empty-new" style="margin-top:20px">＋ Create Rule File</button>
            </div>

            <div class="editor-active-panel" id="editor-active-panel" style="display:none">

                <!-- Status bar above editor -->
                <div class="editor-status-bar" id="editor-status-bar">
                    <span class="status-name" id="status-name"></span>
                    <span class="status-toggle" id="status-toggle-badge"></span>
                </div>

                <!-- Code Editor -->
                <div class="code-editor" id="code-editor">
                    <div class="code-editor-toolbar">
                        <div class="toolbar-left">
                            <span class="toolbar-dot red"></span>
                            <span class="toolbar-dot yellow"></span>
                            <span class="toolbar-dot green"></span>
                            <span class="toolbar-filename" id="editor-filename">rules.smart</span>
                            <span class="editor-dirty-dot" id="editor-dirty-dot" title="Unsaved changes"></span>
                        </div>
                        <div class="toolbar-right">
                            <span class="toolbar-lines" id="editor-line-count">0 rules</span>
                            <span class="toolbar-lang">Smart City DSL</span>
                        </div>
                    </div>
                    <div class="code-editor-body">
                        <div class="line-numbers" id="line-numbers"></div>
                        <div class="code-input-wrapper">
                            <textarea id="ctrl-lights-logic" class="code-textarea" spellcheck="false"
                                placeholder="Turn on mosque lights from 18:00 to 23:00.&#10;Keep floor1 on between 20:00 and 06:00.&#10;Turn castle lights on when gas is safe.&#10;Switch on street lamps when light is below 2000."></textarea>
                            <div class="code-highlight-overlay" id="code-highlight-overlay"></div>
                        </div>
                    </div>
                </div>

                <!-- Action bar -->
                <div class="editor-actions" style="margin-top:14px">
                    <div class="editor-actions-left">
                        <button class="btn-action btn-save-rule"     id="btn-save-rule">💾 Save</button>
                        <button class="btn-action btn-toggle-rule"   id="btn-toggle-rule">⚡ Activate</button>
                        <button class="btn-action btn-ghost"         id="btn-clear-editor">🗑️ Clear</button>
                    </div>
                    <span id="logic-save-status" class="logic-save-indicator">✓ Saved!</span>
                </div>

                <!-- Feedback -->
                <div id="logic-feedback" class="logic-feedback" style="margin-top:14px"></div>
            </div>
        </section>

    </div>

    </div>`;

    // Static buttons
    document.getElementById('btn-new-rule')?.addEventListener('click',        _handleNewRule);
    document.getElementById('btn-empty-new')?.addEventListener('click',       _handleNewRule);
    document.getElementById('btn-deactivate-all')?.addEventListener('click',  _handleDeactivateAll);
    document.getElementById('btn-save-rule')?.addEventListener('click',       _handleSave);
    document.getElementById('btn-toggle-rule')?.addEventListener('click',     _handleToggle);
    document.getElementById('btn-clear-editor')?.addEventListener('click',    _handleClearEditor);

    // Docs UI
    document.getElementById('btn-show-docs')?.addEventListener('click', () => {
        window.open('/docs', 'SmartCityDocs', 'width=950,height=800,scrollbars=yes,resizable=yes');
    });

    // Code editor
    initCodeEditor();
    document.getElementById('ctrl-lights-logic')?.addEventListener('input', () => _setDirty(true));

    await _refreshList();

    // Restore previously selected rule when returning to this page
    if (_selectedId && _rules.find(r => r.id === _selectedId)) {
        try {
            const rule = await fetchRule(_selectedId);
            _populateEditor(rule);
        } catch (e) { console.error('Failed to restore rule', e); }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

async function _refreshList(keepSelected = true) {
    try { _rules = await fetchRules(); } catch { _rules = []; }
    _renderList();
    if (keepSelected && _selectedId && !_rules.find(r => r.id === _selectedId)) {
        _selectedId = null;
        _showEmptyState();
    }
    // Always refresh the toggle button state in case active status changed
    _syncToggleButton();
}

function _renderList() {
    const list = document.getElementById('rule-list');
    if (!list) return;

    if (_rules.length === 0) {
        list.innerHTML = `<div class="rule-list-empty">No rule files yet.<br>Click <b>＋ New</b> to start.</div>`;
        return;
    }

    const activeCount = _rules.filter(r => r.is_active).length;

    list.innerHTML = _rules.map(r => `
        <div class="rule-item ${r.id === _selectedId ? 'selected' : ''} ${r.is_active ? 'is-active' : ''}"
             data-id="${r.id}" id="rule-item-${r.id}">
            <div class="rule-item-indicator" title="${r.is_active ? 'Active' : 'Inactive'}">
                <span class="indicator-dot"></span>
            </div>
            <div class="rule-item-body" data-id="${r.id}">
                <div class="rule-item-name" id="rule-name-${r.id}">${_escHtml(r.name)}</div>
                <div class="rule-item-meta">${r.line_count} rule${r.line_count !== 1 ? 's' : ''} · ${_fmtDate(r.updated_at)}</div>
            </div>
            <div class="rule-item-actions">
                <button class="rule-btn rule-btn-toggle ${r.is_active ? 'is-on' : ''}" data-id="${r.id}"
                    title="${r.is_active ? 'Deactivate' : 'Activate'}">
                    ${r.is_active ? '🟢' : '⭕'}
                </button>
                <button class="rule-btn rule-btn-rename" data-id="${r.id}" title="Rename">✏️</button>
                <button class="rule-btn rule-btn-delete" data-id="${r.id}" title="Delete">🗑</button>
            </div>
        </div>
    `).join('');

    // ── Active summary ──
    const summary = activeCount > 0
        ? `<div class="active-summary">⚡ ${activeCount} profile${activeCount !== 1 ? 's' : ''} running</div>`
        : `<div class="active-summary inactive-summary">No profiles active</div>`;
    list.insertAdjacentHTML('beforeend', summary);

    // ── Bind events ──
    list.querySelectorAll('.rule-item-body').forEach(el =>
        el.addEventListener('click', () => _selectRule(el.dataset.id))
    );
    list.querySelectorAll('.rule-btn-toggle').forEach(btn =>
        btn.addEventListener('click', async (e) => { e.stopPropagation(); await _handleSidebarToggle(btn.dataset.id); })
    );
    list.querySelectorAll('.rule-btn-rename').forEach(btn =>
        btn.addEventListener('click', (e) => { e.stopPropagation(); _startRename(btn.dataset.id); })
    );
    list.querySelectorAll('.rule-btn-delete').forEach(btn =>
        btn.addEventListener('click', (e) => { e.stopPropagation(); _handleDelete(btn.dataset.id); })
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Selection & editor
// ─────────────────────────────────────────────────────────────────────────────

async function _selectRule(id) {
    if (_selectedId === id) return;
    if (_isDirty && !confirm('You have unsaved changes. Discard them?')) return;

    _selectedId = id;
    _setDirty(false);
    _renderList();

    try {
        const rule = await fetchRule(id);
        _populateEditor(rule);
    } catch (e) { console.error('Failed to load rule', e); }
}

function _populateEditor(rule) {
    const ta       = document.getElementById('ctrl-lights-logic');
    const filename = document.getElementById('editor-filename');
    if (ta)       ta.value           = rule.content || '';
    if (filename) filename.textContent = rule.name + '.smart';
    _syncToggleButton();
    updateCodeHighlight();
    _showEditorPanel();
}

function _syncToggleButton() {
    const btn    = document.getElementById('btn-toggle-rule');
    const badge  = document.getElementById('status-toggle-badge');
    const nameEl = document.getElementById('status-name');
    if (!btn) return;

    const rule = _rules.find(r => r.id === _selectedId);
    if (!rule) return;

    if (nameEl) nameEl.textContent = rule.name;

    if (rule.is_active) {
        btn.textContent = '⏸ Deactivate';
        btn.className   = 'btn-action btn-toggle-rule btn-toggle-active';
        if (badge) { badge.textContent = 'RUNNING'; badge.className = 'status-toggle status-on'; }
    } else {
        btn.textContent = '⚡ Activate';
        btn.className   = 'btn-action btn-toggle-rule';
        if (badge) { badge.textContent = 'INACTIVE'; badge.className = 'status-toggle status-off'; }
    }
}

function _showEditorPanel() {
    document.getElementById('editor-empty-state').style.display  = 'none';
    document.getElementById('editor-active-panel').style.display = 'flex';
}

function _showEmptyState() {
    document.getElementById('editor-empty-state').style.display  = 'flex';
    document.getElementById('editor-active-panel').style.display = 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline rename
// ─────────────────────────────────────────────────────────────────────────────

function _startRename(id) {
    const rule   = _rules.find(r => r.id === id);
    const nameEl = document.getElementById(`rule-name-${id}`);
    if (!rule || !nameEl) return;

    const input = document.createElement('input');
    input.className = 'rename-input';
    input.value     = rule.name;
    input.maxLength = 60;
    nameEl.replaceWith(input);
    input.focus(); input.select();

    const commit = async () => {
        const newName = input.value.trim() || rule.name;
        await updateRule(id, { name: newName });
        await _refreshList();
        if (_selectedId === id) {
            const fn = document.getElementById('editor-filename');
            if (fn) fn.textContent = newName + '.smart';
        }
    };

    input.addEventListener('blur',    commit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')  commit();
        if (e.key === 'Escape') _refreshList();
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Button handlers
// ─────────────────────────────────────────────────────────────────────────────

async function _handleNewRule() {
    const name = prompt('Rule file name:', 'My Rule');
    if (name === null) return;
    const rule = await createRule(name.trim() || 'New Rule');
    await _refreshList(false);
    await _selectRule(rule.id);
}

async function _handleDelete(id) {
    const rule = _rules.find(r => r.id === id);
    if (!rule) return;
    if (!confirm(`Delete "${rule.name}"? This cannot be undone.`)) return;
    await deleteRule(id);
    if (_selectedId === id) { _selectedId = null; _setDirty(false); _showEmptyState(); }
    await _refreshList(false);
}

async function _handleSave() {
    if (!_selectedId) return;
    const content = document.getElementById('ctrl-lights-logic')?.value ?? '';
    await updateRule(_selectedId, { content });
    _setDirty(false);
    _flashStatus('✓ Saved!');
    await _refreshList();
}

async function _handleToggle() {
    if (!_selectedId) return;

    // Auto-save first
    const content = document.getElementById('ctrl-lights-logic')?.value ?? '';
    await updateRule(_selectedId, { content });
    _setDirty(false);

    const res = await toggleRule(_selectedId);
    await _refreshList();
    _showFeedback(res);
    _flashStatus(res.rule?.is_active ? '⚡ Activated!' : '⏸ Deactivated');
}

async function _handleSidebarToggle(id) {
    // Auto-save currently open rule before toggling another
    if (_isDirty && _selectedId) {
        const content = document.getElementById('ctrl-lights-logic')?.value ?? '';
        await updateRule(_selectedId, { content });
        _setDirty(false);
    }
    const res = await toggleRule(id);
    await _refreshList();
    if (_selectedId === id) _showFeedback(res);
    _flashStatus(res.rule?.is_active ? '⚡ On' : '⏸ Off');
}

async function _handleDeactivateAll() {
    if (!confirm('Stop ALL active automation profiles?')) return;
    await deactivateAll();
    await _refreshList();
    const feedbackEl = document.getElementById('logic-feedback');
    if (feedbackEl) {
        feedbackEl.innerHTML = '<div class="feedback-header feedback-success" style="border-radius:var(--radius-md)">⏹ All automation stopped</div>';
        feedbackEl.className = 'logic-feedback visible';
    }
    _syncToggleButton();
}

function _handleClearEditor() {
    const ta = document.getElementById('ctrl-lights-logic');
    if (ta) ta.value = '';
    updateCodeHighlight();
    _setDirty(true);
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function _showFeedback(res) {
    const feedbackEl = document.getElementById('logic-feedback');
    if (!feedbackEl) return;

    const isActive     = res.rule?.is_active;
    const parsedCount  = res.parsed_count ?? 0;
    const errors       = res.errors ?? [];

    if (!isActive) {
        feedbackEl.innerHTML = `<div class="feedback-header feedback-success" style="border-radius:var(--radius-md)">⏸ Profile deactivated</div>`;
        feedbackEl.className = 'logic-feedback visible';
        return;
    }

    if (errors.length > 0) {
        let html = `<div class="feedback-header feedback-error">⚠️ ${errors.length} error${errors.length > 1 ? 's' : ''}</div><div class="feedback-errors">`;
        errors.forEach(err => {
            html += `<div class="feedback-error-line"><span class="error-line-num">Line ${err.line}</span><span class="error-text">${err.text}</span><span class="error-msg">${err.error}</span></div>`;
        });
        html += '</div>';
        if (parsedCount > 0) html += `<div class="feedback-partial">✓ ${parsedCount} rule${parsedCount > 1 ? 's' : ''} applied</div>`;
        feedbackEl.innerHTML = html;
        feedbackEl.className = 'logic-feedback visible has-errors';
    } else {
        feedbackEl.innerHTML = `<div class="feedback-header feedback-success">✅ ${parsedCount} rule${parsedCount !== 1 ? 's' : ''} now running</div>`;
        feedbackEl.className = 'logic-feedback visible';
    }
}

function _setDirty(dirty) {
    _isDirty = dirty;
    const dot = document.getElementById('editor-dirty-dot');
    if (dot) dot.style.display = dirty ? 'inline-block' : 'none';
}

function _flashStatus(msg) {
    const el = document.getElementById('logic-save-status');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 2500);
}

function _escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _fmtDate(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
    } catch { return ''; }
}
