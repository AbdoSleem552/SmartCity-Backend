/* ═══════════════════════════════════════════════════════════
   socket.js — SocketIO connection & polling fallback
   ═══════════════════════════════════════════════════════════ */

import { state } from './state.js';
import { updateDashboardUI, updateClockUI, updateIlluminationUI, updateConnectionUI } from './updaters.js';

let pollTimer = null;

export function connectSocket() {
    if (state.socket) state.socket.disconnect();
    try {
        state.socket = io({ transports: ['polling', 'websocket'] });

        state.socket.on('connect', () => {
            state.connected = true;
            updateConnectionUI();
            console.log('[SC] SocketIO connected');
        });
        state.socket.on('disconnect', () => {
            state.connected = false;
            updateConnectionUI();
            console.log('[SC] SocketIO disconnected');
        });
        state.socket.on('telemetry', (data) => {
            state.telemetry = { ...state.telemetry, ...data };
            if (data.illumination)   state.illumination   = data.illumination;
            if (data.city_time)      state.cityTime       = data.city_time;
            if (data.prayer_config)  state.prayerConfig   = { ...state.prayerConfig, ...data.prayer_config };
            updateDashboardUI();
            updateClockUI();
        });
        state.socket.on('city_time', (data) => {
            state.cityTime = data;
            updateClockUI();
        });
        state.socket.on('illumination_update', (data) => {
            state.illumination = data;
            updateIlluminationUI();
            updateDashboardUI();
        });
        state.socket.on('prayer_config', (data) => {
            state.prayerConfig = { ...state.prayerConfig, ...data };
            updateDashboardUI();
        });
        state.socket.on('adhan_playing', (data) => {
            state.adhanPlaying = data;
            updateDashboardUI();
            // Auto-clear after 30s
            setTimeout(() => { state.adhanPlaying = null; updateDashboardUI(); }, 30000);
        });
        state.socket.on('connect_error', (err) => console.log('[SC] SocketIO error:', err.message));
    } catch (e) {
        console.log('[SC] SocketIO init failed, polling only:', e);
    }
}

export function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTelemetry();
    pollTimer = setInterval(pollTelemetry, 2000);
}

export function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

function pollTelemetry() {
    if (!state.token) return;
    fetch('/api/telemetry', { headers: { 'Authorization': 'Bearer ' + state.token } })
        .then(r => {
            if (r.status === 401) {
                state.token = null;
                sessionStorage.removeItem('sc_token');
                sessionStorage.removeItem('sc_user');
                stopPolling();
                // Lazy import to avoid circular dep
                import('./router.js').then(m => m.render());
                return null;
            }
            return r.json();
        })
        .then(data => {
            if (!data) return;
            state.telemetry = { ...state.telemetry, ...data };
            if (data.illumination)   state.illumination   = data.illumination;
            if (data.city_time)      state.cityTime       = data.city_time;
            if (data.prayer_config)  state.prayerConfig   = { ...state.prayerConfig, ...data.prayer_config };
            if (state.page === 'home') updateDashboardUI();
            updateClockUI();
        })
        .catch(err => console.log('[SC] Poll error:', err));
}
