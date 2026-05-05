/* ═══════════════════════════════════════════════════════════
   pages/control.js — Control Center page renderer
   ═══════════════════════════════════════════════════════════ */

import { state } from '../state.js';
import { apiPost, apiGet, apiPut } from '../api.js';
import { renderToggle } from '../components/toggle.js';

function _trackOption(num, name, selected) {
    return `<option value="${num}" ${num === selected ? 'selected' : ''}>${num}. ${name}</option>`;
}

function _trackLibraryOptions(pc, selectedTrack) {
    const lib = pc.track_library || [];
    if (lib.length === 0) {
        return Array.from({length: 10}, (_, i) => _trackOption(i+1, `Track ${i+1}`, selectedTrack)).join('');
    }
    return lib.map(t => _trackOption(t.number, t.name, selectedTrack)).join('');
}

export function renderControlPage() {
    const content = document.getElementById('page-content');
    const il    = state.illumination;
    const t     = state.telemetry;
    const speed = state.cityTime.speed || 1;
    const pc    = state.prayerConfig;

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
                    <div><h3>Mosque</h3><div class="zone-desc">Lights, Speaker &amp; Prayer System</div></div>
                </div>
            </div>
            <div class="zone-body" style="grid-template-columns:1fr">
                <div style="display:flex;flex-direction:column;gap:16px;padding:20px">
                    ${renderToggle('mosque','💡','Mosque Lights',il.mosque)}

                    <div style="height:1px;background:var(--border-light);margin:8px 0"></div>

                    <!-- Volume -->
                    <div class="slider-header" style="margin-bottom:8px">
                        <span class="slider-label">🔈 Volume</span>
                        <span class="slider-value" id="ctrl-vol-display">${t.speaker_volume}</span>
                    </div>
                    <input type="range" id="ctrl-volume" min="0" max="100" value="${t.speaker_volume}">

                    <!-- Track Player -->
                    <div class="track-player-section">
                        <div class="slider-label" style="margin-bottom:10px">🎵 Track Player</div>
                        <div class="track-player-controls">
                            <select id="ctrl-track-select" class="track-select">
                                ${_trackLibraryOptions(pc, 1)}
                            </select>
                            <div class="track-player-buttons">
                                <button class="btn-action btn-ghost btn-sm" id="btn-stop-audio" title="Stop">⏹</button>
                                <button class="btn-action btn-cyan btn-sm" id="btn-play-track" title="Play">▶️</button>
                            </div>
                        </div>
                    </div>

                    </div>
                </div>
            </div>
        </div>

        <!-- PRAYER TIMES CONFIGURATION -->
        <div class="zone-section">
            <div class="zone-accent" style="background:linear-gradient(180deg, var(--accent-emerald), var(--accent-cyan))"></div>
            <div class="zone-header">
                <div class="zone-header-left">
                    <div class="zone-icon" style="background:var(--accent-emerald-dim)">🕋</div>
                    <div><h3>Prayer Schedule</h3><div class="zone-desc">Prayer Times &amp; Auto-Adhan Settings</div></div>
                </div>
            </div>
            <div class="zone-body" style="grid-template-columns:1fr">
                <div style="display:flex;flex-direction:column;gap:16px;padding:20px">
                    <!-- Prayer Times Editor -->
                    <div class="prayer-editor-section">
                        <div class="slider-label" style="margin-bottom:10px">🕋 Prayer Times</div>
                        <div class="prayer-editor-grid" id="prayer-editor-grid">
                            ${['Fajr','Dhuhr','Asr','Maghrib','Isha'].map(name => `
                                <div class="prayer-editor-row">
                                    <span class="prayer-editor-name">${{Fajr:'🌅',Dhuhr:'☀️',Asr:'🌤',Maghrib:'🌇',Isha:'🌙'}[name]} ${name}</span>
                                    <input type="time" class="prayer-time-input" data-prayer="${name}" value="${pc.prayer_times[name] || '12:00'}">
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn-action btn-cyan btn-sm" id="btn-save-prayer-times" style="margin-top:12px;width:100%">💾 Save Prayer Times</button>
                    </div>

                    <div style="height:1px;background:var(--border-light);margin:8px 0"></div>

                    <!-- Adhan Settings -->
                    <div class="adhan-settings-section">
                        <div class="toggle-row" style="margin-bottom:12px; padding:12px 16px;">
                            <div class="toggle-info">
                                <span class="t-icon">🔔</span>
                                <span class="t-label">Auto-Adhan Playback</span>
                            </div>
                            <div style="display:flex;align-items:center;">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="ctrl-adhan-enabled" ${pc.adhan_enabled ? 'checked' : ''}>
                                    <span class="toggle-slider"></span>
                                </label>
                                <span style="font-size:0.85rem;margin-left:12px;color:var(--text-muted);width:50px;text-align:right;">${pc.adhan_enabled ? 'ON' : 'OFF'}</span>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;margin-top:12px">
                            <span style="font-size:0.85rem;color:var(--text-secondary)">Adhan Track:</span>
                            <select id="ctrl-adhan-track" class="track-select" style="flex:1">
                                ${_trackLibraryOptions(pc, pc.adhan_track)}
                            </select>
                        </div>
                    </div>

                    </div>
                </div>
            </div>
        </div>

        <!-- TRACK LIBRARY (SD CARD) -->
        <div class="zone-section">
            <div class="zone-accent castle-accent" style="background:linear-gradient(180deg, var(--accent-purple), var(--accent-cyan))"></div>
            <div class="zone-header">
                <div class="zone-header-left">
                    <div class="zone-icon" style="background:var(--accent-purple-dim)">📂</div>
                    <div><h3>Audio Library</h3><div class="zone-desc">SD Card Track Management</div></div>
                </div>
            </div>
            <div class="zone-body" style="grid-template-columns:1fr">
                <div style="padding:20px">
                    <div class="track-library-section" style="margin-top:0">
                        <div class="track-library-list" id="track-library-list">
                            ${(pc.track_library || []).map((tr, i) => `
                                <div class="track-lib-row">
                                    <span class="track-lib-num">${tr.number}</span>
                                    <input class="track-lib-name" data-index="${i}" value="${tr.name}">
                                    <button class="track-lib-del" data-index="${i}" title="Remove">✕</button>
                                </div>
                            `).join('')}
                        </div>
                        <div style="display:flex;gap:8px;margin-top:10px">
                            <button class="btn-action btn-ghost btn-sm" id="btn-add-track" style="flex:1">＋ Add Track</button>
                            <button class="btn-action btn-cyan btn-sm" id="btn-save-tracks" style="flex:1">💾 Save Library</button>
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

        <!-- STREET CONTROLS -->
        <div class="zone-section">
            <div class="zone-accent street-accent"></div>
            <div class="zone-header">
                <div class="zone-header-left">
                    <div class="zone-icon" style="background:var(--accent-amber-dim)">🛣️</div>
                    <div><h3>Street</h3><div class="zone-desc">Street lamps &amp; auto threshold</div></div>
                </div>
            </div>
            <div class="zone-body" style="grid-template-columns:1fr">
                <div style="display:flex;flex-direction:column;gap:16px;padding:20px">
                    ${renderToggle('street','💡','Street Lights',il.street)}
                    <div style="height:1px;background:var(--border-light);margin:8px 0"></div>
                    <div class="slider-header" style="margin-bottom:8px">
                        <span class="slider-label">🌑 Auto-ON below (LDR)</span>
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

    // Track player
    document.getElementById('btn-play-track')?.addEventListener('click', () => {
        const sel = document.getElementById('ctrl-track-select');
        const track = sel ? parseInt(sel.value) : 1;
        apiPost('/api/command', { action:'play', track });
    });
    document.getElementById('btn-stop-audio')?.addEventListener('click', () => apiPost('/api/command', { action:'stop' }));

    // Prayer times save
    document.getElementById('btn-save-prayer-times')?.addEventListener('click', () => {
        const times = {};
        document.querySelectorAll('.prayer-time-input').forEach(inp => {
            times[inp.dataset.prayer] = inp.value;
        });
        apiPut('/api/prayer/times', { times }).then(() => {
            state.prayerConfig.prayer_times = times;
            const btn = document.getElementById('btn-save-prayer-times');
            if (btn) { btn.textContent = '✓ Saved!'; setTimeout(() => btn.textContent = '💾 Save Prayer Times', 2000); }
        });
    });

    // Adhan toggle
    document.getElementById('ctrl-adhan-enabled')?.addEventListener('change', (e) => {
        const checked = e.target.checked;
        apiPut('/api/prayer/adhan', { enabled: checked }).then(() => {
            state.prayerConfig.adhan_enabled = checked;
            const label = e.target.closest('.toggle-row')?.querySelector('div > span:last-child');
            if (label) label.textContent = checked ? 'ON' : 'OFF';
        });
    });

    // Adhan track selection
    document.getElementById('ctrl-adhan-track')?.addEventListener('change', (e) => {
        apiPut('/api/prayer/adhan', { track: parseInt(e.target.value) }).then(() => {
            state.prayerConfig.adhan_track = parseInt(e.target.value);
        });
    });

    // Track library — add track
    document.getElementById('btn-add-track')?.addEventListener('click', () => {
        const list = document.getElementById('track-library-list');
        if (!list) return;
        const count = list.querySelectorAll('.track-lib-row').length;
        const num = count + 1;
        const row = document.createElement('div');
        row.className = 'track-lib-row';
        row.innerHTML = `<span class="track-lib-num">${num}</span><input class="track-lib-name" data-index="${count}" value="Track ${num}"><button class="track-lib-del" data-index="${count}" title="Remove">✕</button>`;
        list.appendChild(row);
        row.querySelector('.track-lib-del')?.addEventListener('click', () => row.remove());
    });

    // Track library — delete buttons
    document.querySelectorAll('.track-lib-del').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.track-lib-row')?.remove());
    });

    // Track library — save
    document.getElementById('btn-save-tracks')?.addEventListener('click', () => {
        const tracks = [];
        document.querySelectorAll('.track-lib-row').forEach((row, i) => {
            const num = parseInt(row.querySelector('.track-lib-num')?.textContent || (i+1));
            const name = row.querySelector('.track-lib-name')?.value || `Track ${i+1}`;
            tracks.push({ number: num, name });
        });
        apiPut('/api/prayer/tracks', { tracks }).then(() => {
            state.prayerConfig.track_library = tracks;
            const btn = document.getElementById('btn-save-tracks');
            if (btn) { btn.textContent = '✓ Saved!'; setTimeout(() => btn.textContent = '💾 Save Library', 2000); }
        });
    });
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
