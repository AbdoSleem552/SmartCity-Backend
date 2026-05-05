/* ═══════════════════════════════════════════════════════════
   api.js — Fetch helpers
   ═══════════════════════════════════════════════════════════ */

import { state } from './state.js';

export async function apiPost(url, data) {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + state.token,
        },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function apiGet(url) {
    const res = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + state.token },
    });
    return res.json();
}

export async function apiPut(url, data) {
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
