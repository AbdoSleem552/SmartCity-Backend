/* ═══════════════════════════════════════════════════════════
   updaters.js — Live UI patch functions (no full re-render)
   ═══════════════════════════════════════════════════════════ */

import { state } from './state.js';
import { svgHome, svgMosque, svgCastle, svgStreet } from './components/svg.js';
import { renderZone } from './components/toggle.js';

export function updateConnectionUI() {
    const dot = document.getElementById('conn-dot');
    if (dot) dot.className = 'connection-dot ' + (state.connected ? 'connected' : 'disconnected');
}

export function updateClockUI() {
    const clockEl = document.getElementById('city-clock-time');
    const speedEl = document.getElementById('city-clock-speed');
    if (clockEl) clockEl.textContent = state.cityTime.formatted;
    if (speedEl) {
        speedEl.innerHTML = state.cityTime.speed > 1
            ? `<span class="speed-badge">${state.cityTime.speed}x</span>`
            : '';
    }
}

export function updateSlot(slotNum, isParked) {
    const badge = document.getElementById('slot' + slotNum + '-badge');
    const text  = document.getElementById('slot' + slotNum + '-text');
    if (badge) { badge.textContent = isParked ? 'PARKED' : 'EMPTY'; badge.className = 'card-badge ' + (isParked ? 'badge-danger' : 'badge-safe'); }
    if (text)  { text.textContent  = isParked ? '🚘 Occupied' : '✅ Available'; text.style.color = isParked ? 'var(--accent-red)' : 'var(--accent-green)'; }
}

export function updateIlluminationUI() {
    const grid = document.getElementById('illum-grid');
    if (!grid) return;
    const il = state.illumination;
    grid.innerHTML =
        renderZone('floor1', 'Home Floor 1', il.floor1) +
        renderZone('floor2', 'Home Floor 2', il.floor2) +
        renderZone('castle', 'Castle Outside', il.castle) +
        renderZone('mosque', 'Mosque Lights', il.mosque) +
        renderZone('street', 'Street Lamps', il.street);
}

export function updateDashboardUI() {
    if (!state.token || state.page !== 'home') return;

    const t  = state.telemetry;
    const il = state.illumination;

    // Gas
    const gasLevel   = t.gas || 0;
    const gasPercent = Math.min(100, (gasLevel / 4095) * 100);
    const gasState   = t.gas_state || 'CLEAN_AIR';
    const gasClass   = gasState === 'SMOKE_ALARM' ? 'danger' : gasState === 'GAS_WARNING' ? 'warning' : gasState === 'PERFUME' ? 'active' : 'safe';
    const gasDanger  = t.gas_danger || false;

    const gasVal   = document.getElementById('gas-value');
    const gasBar   = document.getElementById('gas-bar');
    const gasBadge = document.getElementById('gas-badge');
    const aiPulse = document.getElementById('ai-pulse');
    const aiPredBox = document.getElementById('ai-prediction-box');
    const aiPredResult = document.getElementById('ai-pred-result');
    const gasBadgeLabel = gasState === 'CLEAN_AIR' ? 'CLEAN AIR' : gasState === 'GAS_WARNING' ? 'WARNING' : gasState === 'PERFUME' ? 'PERFUME' : 'SMOKE ALARM';

    if (gasVal)   { gasVal.textContent = gasLevel; gasVal.className = gasClass; }
    if (gasBar)   { gasBar.style.width = gasPercent + '%'; gasBar.className = 'gas-bar-fill ' + gasClass; }
    if (gasBadge) { gasBadge.textContent = gasBadgeLabel; gasBadge.className = 'card-badge badge-' + gasClass; }
    if (aiPulse) { aiPulse.className = 'ai-status-pulse ' + gasClass; }
    if (aiPredBox) { aiPredBox.className = 'ai-prediction-box ' + gasClass; }
    if (aiPredResult) { aiPredResult.textContent = gasBadgeLabel; }

    // Parking
    updateSlot('1', t.ir1);
    updateSlot('2', t.ir2);
    const parkingBadge = document.getElementById('parking-badge');
    if (parkingBadge) {
        const both = t.ir1 && t.ir2, one = t.ir1 || t.ir2;
        parkingBadge.textContent = both ? 'FULL' : one ? '1 PARKED' : 'EMPTY';
        parkingBadge.className   = 'card-badge ' + (both ? 'badge-danger' : (one ? 'badge-active' : 'badge-safe'));
    }

    updateIlluminationUI();

    // Speaker
    const speakerDot   = document.getElementById('speaker-dot');
    const speakerText  = document.getElementById('speaker-status-text');
    const speakerBadge = document.getElementById('speaker-badge');
    const volBar       = document.getElementById('vol-bar');
    const volValue     = document.getElementById('vol-value');
    if (speakerDot)   speakerDot.className     = 'dot ' + (t.speaker_active ? 'active' : 'inactive');
    if (speakerText)  speakerText.textContent   = t.speaker_active ? 'Playing' : 'Idle';
    if (speakerBadge) {
        if (state.adhanPlaying) {
            speakerBadge.textContent = '🔊 ADHAN — ' + state.adhanPlaying.prayer;
            speakerBadge.className   = 'card-badge badge-adhan-pulse';
        } else {
            speakerBadge.textContent = t.speaker_active ? 'PLAYING' : 'IDLE';
            speakerBadge.className   = 'card-badge ' + (t.speaker_active ? 'badge-active' : 'badge-inactive');
        }
    }
    if (volBar)       volBar.style.width        = ((t.speaker_volume / 30) * 100) + '%';
    if (volValue)     volValue.textContent       = t.speaker_volume;

    // Mosque zone adhan-active class
    const mosqueZone = document.getElementById('zone-mosque');
    if (mosqueZone) {
        mosqueZone.classList.toggle('adhan-active', !!state.adhanPlaying);
    }

    // Prayer times table live update
    const prayerTable = document.getElementById('prayer-times-table');
    if (prayerTable) {
        const pc = state.prayerConfig;
        const ct = state.cityTime;
        const times = pc.prayer_times || {};
        const nextName = pc.next_prayer?.name || '';
        const currentMin = (ct.hours || 0) * 60 + (ct.minutes || 0);

        prayerTable.innerHTML = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(name => {
            const pt = times[name] || '--:--';
            const icon = {Fajr:'🌅',Dhuhr:'☀️',Asr:'🌤',Maghrib:'🌇',Isha:'🌙'}[name] || '🕌';
            const isNext = name === nextName;
            const parts = pt.split(':');
            const prayerMin = parts.length === 2 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : -1;
            const isPast = prayerMin >= 0 && prayerMin <= currentMin;
            return `<div class="prayer-row ${isNext ? 'prayer-next' : ''} ${isPast && !isNext ? 'prayer-past' : ''}">
                <span class="prayer-icon">${icon}</span>
                <span class="prayer-name">${name}</span>
                <span class="prayer-time">${pt}</span>
                <span class="prayer-indicator">${isNext ? '◀ NEXT' : ''}</span>
            </div>`;
        }).join('');
    }

    // Adhan auto-badge
    const adhanBadge = document.getElementById('adhan-auto-badge');
    if (adhanBadge) {
        const enabled = state.prayerConfig.adhan_enabled;
        adhanBadge.textContent = enabled ? '🔔 Auto-Adhan ON' : '🔕 Auto-Adhan OFF';
        adhanBadge.className = 'prayer-adhan-badge ' + (enabled ? 'enabled' : 'disabled');
    }

    // Street / LDR
    const ldrValue    = document.getElementById('ldr-value');
    const ldrBar      = document.getElementById('ldr-bar');
    const ldrBadge    = document.getElementById('ldr-badge');
    const streetLamp  = document.getElementById('street-lamp-status');
    if (ldrValue) ldrValue.textContent = t.light || 0;
    if (ldrBar)   ldrBar.style.width   = Math.min(100, ((t.light || 0) / 4095) * 100) + '%';
    if (ldrBadge) { ldrBadge.textContent = il.street ? 'LAMPS ON' : 'DAYLIGHT'; }
    if (streetLamp) { streetLamp.textContent = il.street ? 'ON' : 'OFF'; streetLamp.style.color = il.street ? 'var(--accent-amber)' : 'var(--text-muted)'; }

    // Home zone lights
    const f1Status = document.getElementById('home-f1-status');
    const f2Status = document.getElementById('home-f2-status');
    if (f1Status) { f1Status.textContent = il.floor1 ? 'ON' : 'OFF'; f1Status.style.color = il.floor1 ? 'var(--accent-amber)' : 'var(--text-muted)'; }
    if (f2Status) { f2Status.textContent = il.floor2 ? 'ON' : 'OFF'; f2Status.style.color = il.floor2 ? 'var(--accent-amber)' : 'var(--text-muted)'; }

    // Mosque lights
    const mosqueLights = document.getElementById('mosque-lights-status');
    if (mosqueLights) { mosqueLights.textContent = il.mosque ? 'ON' : 'OFF'; mosqueLights.style.color = il.mosque ? 'var(--accent-amber)' : 'var(--text-muted)'; }

    // Castle lights
    const castleLights = document.getElementById('castle-lights-status');
    if (castleLights) { castleLights.textContent = il.castle ? 'ON' : 'OFF'; castleLights.style.color = il.castle ? 'var(--accent-purple)' : 'var(--text-muted)'; }

    // SVGs
    const homeCont   = document.getElementById('svg-home-container');
    const mosqueCont = document.getElementById('svg-mosque-container');
    const castleCont = document.getElementById('svg-castle-container');
    const streetCont = document.getElementById('svg-street-container');
    if (homeCont)   homeCont.innerHTML   = svgHome(il, gasDanger);
    if (mosqueCont) mosqueCont.innerHTML = svgMosque(il, t.speaker_active);
    if (castleCont) castleCont.innerHTML = svgCastle(il, t.ir1, t.ir2);
    if (streetCont) streetCont.innerHTML = svgStreet(t.light);
}
