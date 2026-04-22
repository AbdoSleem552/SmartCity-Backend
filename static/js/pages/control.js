/* ═══════════════════════════════════════════════════════════
   pages/control.js — Control Center page renderer
   ═══════════════════════════════════════════════════════════ */

import { state } from '../state.js';
import { apiPost } from '../api.js';
import { renderToggle } from '../components/toggle.js';

export function renderControlPage() {
    const content = document.getElementById('page-content');
    const il    = state.illumination;
    const t     = state.telemetry;
    const speed = state.cityTime.speed || 1;

    content.innerHTML = `
    <h1 class="page-title">City Control Center</h1>
    <p class="page-subtitle">Manage actuators, system settings, and automation overrides</p>

    <!-- GLOBAL SYSTEMS -->
    <div class="zone-section" style="margin-bottom:24px">
        <div class="zone-accent" style="background:var(--accent-cyan)"></div>
        <div class="zone-header">
            <div class="zone-header-left">
                <div class="zone-icon" style="background:rgba(0,240,255,0.15);color:var(--accent-cyan)">🌐</div>
                <div><h3>Global Systems</h3><div class="zone-desc">Time simulation &amp; master overrides</div></div>
            </div>
        </div>
        <div class="zone-body" style="grid-template-columns:1fr;gap:20px">
            <div class="control-grid">
                <div class="slider-control">
                    <div class="slider-header"><span class="slider-label">⚡ Simulation Speed</span></div>
                    <div class="speed-buttons" id="speed-buttons">
                        ${[1,2,5,10,30,50,100].map(s =>
                            `<button class="speed-btn ${speed===s?'active':''}" data-speed="${s}">${s}x</button>`
                        ).join('')}
                    </div>
                </div>
                <div class="slider-control">
                    <div class="slider-header"><span class="slider-label">🕐 Set City Time</span></div>
                    <div class="time-input-group">
                        <input type="text" id="set-time-input" class="time-input" placeholder="HH:MM" value="${state.cityTime.formatted ? state.cityTime.formatted.substring(0,5) : '06:00'}">
                        <button class="btn-action btn-cyan" id="btn-set-time">Set</button>
                    </div>
                </div>
                <div class="slider-control">
                    <div class="slider-header">
                        <span class="slider-label">💡 Master ESP32 LED</span>
                        <span class="slider-value" id="led-state-ctrl" style="color:${t.led==='ON'?'var(--accent-green)':'var(--text-muted)'}">${t.led}</span>
                    </div>
                    <div class="action-row" style="margin:0;justify-content:flex-start;gap:8px">
                        <button class="btn-action btn-cyan btn-sm" id="btn-led-on">ON</button>
                        <button class="btn-action btn-red  btn-sm" id="btn-led-off">OFF</button>
                        <button class="btn-action btn-ghost btn-sm" id="btn-led-toggle">Toggle</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:24px">

        <!-- HOME CONTROLS -->
        <div class="zone-section">
            <div class="zone-accent home-accent"></div>
            <div class="zone-header">
                <div class="zone-header-left">
                    <div class="zone-icon" style="background:var(--accent-cyan-dim)">🏠</div>
                    <div><h3>Home</h3><div class="zone-desc">Floor lights</div></div>
                </div>
            </div>
            <div class="zone-body" style="grid-template-columns:1fr">
                <div style="display:flex;flex-direction:column;gap:16px;padding:20px">
                    ${renderToggle('floor1','💡','Floor 1 Lights',il.floor1)}
                    ${renderToggle('floor2','💡','Floor 2 Lights',il.floor2)}
                </div>
            </div>
        </div>

        <!-- MOSQUE CONTROLS -->
        <div class="zone-section">
            <div class="zone-accent mosque-accent"></div>
            <div class="zone-header">
                <div class="zone-header-left">
                    <div class="zone-icon" style="background:var(--accent-emerald-dim)">🕌</div>
                    <div><h3>Mosque</h3><div class="zone-desc">Lights &amp; Athan Audio</div></div>
                </div>
            </div>
            <div class="zone-body" style="grid-template-columns:1fr">
                <div style="display:flex;flex-direction:column;gap:16px;padding:20px">
                    ${renderToggle('mosque','💡','Mosque Lights',il.mosque)}
                    <div style="height:1px;background:var(--border-light);margin:8px 0"></div>
                    <div class="slider-header" style="margin-bottom:8px">
                        <span class="slider-label">🔈 Volume</span>
                        <span class="slider-value" id="ctrl-vol-display">${t.speaker_volume}</span>
                    </div>
                    <input type="range" id="ctrl-volume" min="0" max="100" value="${t.speaker_volume}">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
                        <div style="display:flex;align-items:center;gap:8px">
                            <span>Track:</span>
                            <input type="number" id="ctrl-track" min="1" max="99" value="1" class="time-input" style="width:60px;text-align:center">
                        </div>
                        <div style="display:flex;gap:8px">
                            <button class="btn-action btn-ghost btn-sm" id="btn-stop-audio">⏹️ Stop</button>
                            <button class="btn-action btn-cyan" id="btn-play-athan" style="background:var(--accent-green)">▶️ Play Athan</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- CASTLE CONTROLS -->
        <div class="zone-section">
            <div class="zone-accent castle-accent"></div>
            <div class="zone-header">
                <div class="zone-header-left">
                    <div class="zone-icon" style="background:var(--accent-purple-dim)">🏰</div>
                    <div><h3>Castle</h3><div class="zone-desc">Exterior display</div></div>
                </div>
            </div>
            <div class="zone-body" style="grid-template-columns:1fr">
                <div style="display:flex;flex-direction:column;gap:16px;padding:20px">
                    ${renderToggle('castle','💡','Outside Lights',il.castle)}
                </div>
            </div>
        </div>

        <!-- GAS THRESHOLD -->
        <div class="zone-section">
            <div class="zone-accent" style="background:linear-gradient(180deg,var(--accent-red),var(--accent-amber))"></div>
            <div class="zone-header">
                <div class="zone-header-left">
                    <div class="zone-icon" style="background:var(--accent-red-dim)">🔥</div>
                    <div><h3>Gas Sensor</h3><div class="zone-desc">Danger threshold · 0 – 4095</div></div>
                </div>
                <span class="card-badge badge-danger" style="font-size:0.7rem">MQ2</span>
            </div>
            <div class="zone-body" style="grid-template-columns:1fr">
                <div style="display:flex;flex-direction:column;gap:16px;padding:20px">
                    <div class="slider-header" style="margin-bottom:8px">
                        <span class="slider-label">⚠️ Alert Threshold</span>
                        <span class="slider-value" id="gas-threshold-display">${t.gas_threshold||1000}</span>
                    </div>
                    <input type="range" id="ctrl-gas-threshold" min="100" max="4095" step="50" value="${t.gas_threshold||1000}">
                    <div style="display:flex;gap:8px;margin-top:4px;align-items:center">
                        <input type="number" id="ctrl-gas-threshold-num" min="100" max="4095" value="${t.gas_threshold||1000}" class="time-input" style="width:90px;text-align:center">
                        <button class="btn-action btn-red" id="btn-set-gas-threshold">Set Threshold</button>
                    </div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">Gas reading above this value triggers the danger alert.</div>
                </div>
            </div>
        </div>

        <!-- STREET LIGHT THRESHOLD -->
        <div class="zone-section">
            <div class="zone-accent street-accent"></div>
            <div class="zone-header">
                <div class="zone-header-left">
                    <div class="zone-icon" style="background:var(--accent-amber-dim)">🛣️</div>
                    <div><h3>Street Light Auto</h3><div class="zone-desc">LDR auto-on threshold · 0 – 4095</div></div>
                </div>
            </div>
            <div class="zone-body" style="grid-template-columns:1fr">
                <div style="display:flex;flex-direction:column;gap:16px;padding:20px">
                    <div class="slider-header" style="margin-bottom:8px">
                        <span class="slider-label">🌑 Lamps ON below</span>
                        <span class="slider-value" id="light-threshold-display">${t.street_light_threshold||2000}</span>
                    </div>
                    <input type="range" id="ctrl-light-threshold" min="100" max="4095" step="50" value="${t.street_light_threshold||2000}">
                    <div style="display:flex;gap:8px;margin-top:4px;align-items:center">
                        <input type="number" id="ctrl-light-threshold-num" min="100" max="4095" value="${t.street_light_threshold||2000}" class="time-input" style="width:90px;text-align:center">
                        <button class="btn-action btn-cyan" id="btn-set-light-threshold">Set Threshold</button>
                    </div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">Street lamps switch on automatically when LDR reads below this value.</div>
                </div>
            </div>
        </div>

    </div>`;

    // ── Event bindings ──────────────────────────────────────────────────────

    document.querySelectorAll('.zone-toggle').forEach(cb => {
        cb.addEventListener('change', (e) => {
            apiPost('/api/command', { action:'illuminate', zone:e.target.dataset.zone, state: e.target.checked ? 'on' : 'off' });
        });
    });

    const volSlider = document.getElementById('ctrl-volume');
    if (volSlider) {
        volSlider.addEventListener('input', e => { const d = document.getElementById('ctrl-vol-display'); if (d) d.textContent = e.target.value; });
        volSlider.addEventListener('change', e => apiPost('/api/command', { action:'volume', level: parseInt(e.target.value) }));
    }

    document.getElementById('btn-play-athan')?.addEventListener('click', () => {
        apiPost('/api/command', { action:'play', track: parseInt(document.getElementById('ctrl-track')?.value || 1) });
    });
    document.getElementById('btn-stop-audio')?.addEventListener('click',   () => apiPost('/api/command', { action:'stop' }));
    document.getElementById('btn-led-on')?.addEventListener('click',       () => apiPost('/api/command', { action:'led', state:'on' }));
    document.getElementById('btn-led-off')?.addEventListener('click',      () => apiPost('/api/command', { action:'led', state:'off' }));
    document.getElementById('btn-led-toggle')?.addEventListener('click',   () => apiPost('/api/command', { action:'led', state:'toggle' }));

    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const s = parseInt(e.target.dataset.speed);
            apiPost('/api/timer', { speed: s }).then(() => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    });

    document.getElementById('btn-set-time')?.addEventListener('click', () => {
        const v = document.getElementById('set-time-input')?.value;
        if (v) apiPost('/api/timer', { set_time: v });
    });

    // Gas threshold
    const gasSlider = document.getElementById('ctrl-gas-threshold');
    const gasNum    = document.getElementById('ctrl-gas-threshold-num');
    const gasDisp   = document.getElementById('gas-threshold-display');
    gasSlider?.addEventListener('input', e => { if (gasDisp) gasDisp.textContent = e.target.value; if (gasNum) gasNum.value = e.target.value; });
    gasNum?.addEventListener('input', e => {
        const v = Math.min(4095, Math.max(100, parseInt(e.target.value)||100));
        if (gasDisp)   gasDisp.textContent = v;
        if (gasSlider) gasSlider.value     = v;
    });
    document.getElementById('btn-set-gas-threshold')?.addEventListener('click', () => {
        const threshold = parseInt(gasNum?.value||1000);
        apiPost('/api/command', { action:'set_gas_threshold', threshold }).then(() => { state.telemetry.gas_threshold = threshold; });
    });

    // Street light threshold
    const lightSlider = document.getElementById('ctrl-light-threshold');
    const lightNum    = document.getElementById('ctrl-light-threshold-num');
    const lightDisp   = document.getElementById('light-threshold-display');
    lightSlider?.addEventListener('input', e => { if (lightDisp) lightDisp.textContent = e.target.value; if (lightNum) lightNum.value = e.target.value; });
    lightNum?.addEventListener('input', e => {
        const v = Math.min(4095, Math.max(100, parseInt(e.target.value)||100));
        if (lightDisp)   lightDisp.textContent = v;
        if (lightSlider) lightSlider.value     = v;
    });
    document.getElementById('btn-set-light-threshold')?.addEventListener('click', () => {
        const threshold = parseInt(lightNum?.value||2000);
        apiPost('/api/command', { action:'set_light_threshold', threshold }).then(() => { state.telemetry.street_light_threshold = threshold; });
    });
}
