/* ═══════════════════════════════════════════════════════════
   components/toggle.js — Toggle & zone-status helpers
   ═══════════════════════════════════════════════════════════ */

export function renderToggle(zone, icon, label, isOn) {
    return `
    <div class="toggle-row">
        <div class="toggle-info">
            <span class="t-icon">${icon}</span>
            <span class="t-label">${label}</span>
        </div>
        <label class="toggle-switch">
            <input type="checkbox" class="zone-toggle" data-zone="${zone}" ${isOn ? 'checked' : ''}>
            <span class="toggle-slider"></span>
        </label>
    </div>`;
}

export function renderZone(key, label, isOn) {
    return `
    <div class="light-zone ${isOn ? 'active' : ''}">
        <span class="zone-dot ${isOn ? 'on' : 'off'}"></span>
        <span class="zone-name">${label}</span>
        <span class="zone-status ${isOn ? 'on' : 'off'}">${isOn ? 'ON' : 'OFF'}</span>
    </div>`;
}
