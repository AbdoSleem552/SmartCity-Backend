/* ═══════════════════════════════════════════════════════════
   rules_manager.js — API wrapper for rule CRUD operations
   ═══════════════════════════════════════════════════════════ */

import { apiGet, apiPost } from './api.js';
import { state } from './state.js';

// ── Low-level fetch helpers (PUT / DELETE) ───────────────────────────────────

async function apiPut(url, data) {
    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + state.token,
        },
        body: JSON.stringify(data),
    });
    return res.json();
}

async function apiDelete(url) {
    const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + state.token },
    });
    return res.json();
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Fetch list of all rule files (no content) */
export async function fetchRules() {
    return apiGet('/api/rules');
}

/** Fetch a single rule including its content */
export async function fetchRule(id) {
    return apiGet(`/api/rules/${id}`);
}

/** Create a new rule file */
export async function createRule(name = 'New Rule', content = '') {
    return apiPost('/api/rules', { name, content });
}

/** Update name and/or content of a rule */
export async function updateRule(id, { name, content } = {}) {
    const payload = {};
    if (name    !== undefined) payload.name    = name;
    if (content !== undefined) payload.content = content;
    return apiPut(`/api/rules/${id}`, payload);
}

/** Delete a rule file */
export async function deleteRule(id) {
    return apiDelete(`/api/rules/${id}`);
}

/** Toggle a rule's active state (on → off, off → on) */
export async function toggleRule(id) {
    return apiPost(`/api/rules/${id}/toggle`, {});
}

/** Explicitly activate a rule */
export async function activateRule(id) {
    return apiPost(`/api/rules/${id}/activate`, {});
}

/** Explicitly deactivate a rule */
export async function deactivateRule(id) {
    return apiPost(`/api/rules/${id}/deactivate`, {});
}

/** Deactivate all rules */
export async function deactivateAll() {
    return apiPost('/api/rules/deactivate', {});
}
