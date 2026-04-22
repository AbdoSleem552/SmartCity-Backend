/* ═══════════════════════════════════════════════════════════
   pages/home.js — Home (Dashboard) page renderer
   ═══════════════════════════════════════════════════════════ */

import { state } from '../state.js';
import { svgHome, svgMosque, svgCastle, svgStreet } from '../components/svg.js';

export function renderHomePage() {
    const content = document.getElementById('page-content');
    const t  = state.telemetry;
    const il = state.illumination;

    const gasLevel   = t.gas || 0;
    const gasPercent = Math.min(100, (gasLevel / 4095) * 100);
    const gasState   = t.gas_state || 'CLEAN_AIR';
    const gasClass   = gasState === 'SMOKE_ALARM' ? 'danger' : gasState === 'GAS_WARNING' ? 'warning' : gasState === 'PERFUME' ? 'active' : 'safe';
    const gasDanger  = t.gas_danger || false;
    const gasBadgeLabel = gasState === 'CLEAN_AIR' ? 'CLEAN AIR' : gasState === 'GAS_WARNING' ? 'WARNING' : gasState === 'PERFUME' ? 'PERFUME' : 'SMOKE ALARM';


    content.innerHTML = `
    <h1 class="page-title">Dashboard</h1>
    <p class="page-subtitle">Real-time sensor monitoring · Castle Smart City</p>

    <!-- HOME ZONE -->
    <div class="zone-section ${gasDanger ? 'gas-alert' : ''}" id="zone-home">
        <div class="zone-accent home-accent"></div>
        <div class="zone-alert-banner">⚠️ Gas leak detected — Level exceeds safety threshold!</div>
        <div class="zone-header">
            <div class="zone-header-left">
                <div class="zone-icon" style="background:var(--accent-cyan-dim)">🏠</div>
                <div>
                    <h3>Home</h3>
                    <div class="zone-desc">Residential building · 2 floors</div>
                </div>
            </div>
            <span class="card-badge badge-${gasClass}" id="gas-badge">${gasBadgeLabel}</span>
        </div>
        <div class="zone-body">
            <div class="zone-visual" id="svg-home-container">${svgHome(il, gasDanger)}</div>
            <div class="zone-data">
                <div class="zone-data-card ai-pred-card-compact">
                    <div class="ai-compact-header">
                        <div class="ai-compact-title-group">
                            <span class="zd-label">🧠 AI (MQ2)</span>
                            <div class="ai-status-pulse ${gasClass}" id="ai-pulse"></div>
                        </div>
                        <span class="ai-compact-raw">ADC: <span id="gas-value" class="${gasClass}">${gasLevel}</span></span>
                    </div>
                    <div class="ai-prediction-box ${gasClass}" id="ai-prediction-box">
                        <div class="ai-pred-result" id="ai-pred-result">${gasBadgeLabel}</div>
                    </div>
                    <div class="gas-bar" style="margin-top: 8px;">
                        <div class="gas-bar-fill ${gasClass}" id="gas-bar" style="width:${gasPercent}%"></div>
                    </div>
                </div>
                <div class="zone-data-row">
                    <div class="zone-data-card">
                        <div class="zd-label">💡 Floor 1</div>
                        <div class="zd-value" style="color:${il.floor1 ? 'var(--accent-amber)' : 'var(--text-muted)'}" id="home-f1-status">${il.floor1 ? 'ON' : 'OFF'}</div>
                    </div>
                    <div class="zone-data-card">
                        <div class="zd-label">💡 Floor 2</div>
                        <div class="zd-value" style="color:${il.floor2 ? 'var(--accent-amber)' : 'var(--text-muted)'}" id="home-f2-status">${il.floor2 ? 'ON' : 'OFF'}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- MOSQUE ZONE -->
    <div class="zone-section" id="zone-mosque">
        <div class="zone-accent mosque-accent"></div>
        <div class="zone-header">
            <div class="zone-header-left">
                <div class="zone-icon" style="background:var(--accent-green-dim)">🕌</div>
                <div>
                    <h3>Mosque</h3>
                    <div class="zone-desc">Prayer hall · Speaker system</div>
                </div>
            </div>
            <span class="card-badge ${t.speaker_active ? 'badge-active' : 'badge-inactive'}" id="speaker-badge">${t.speaker_active ? 'ATHAN PLAYING' : 'IDLE'}</span>
        </div>
        <div class="zone-body">
            <div class="zone-visual" id="svg-mosque-container">${svgMosque(il, t.speaker_active)}</div>
            <div class="zone-data">
                <div class="zone-data-card">
                    <div class="zd-header">
                        <span class="zd-label">🔊 Speaker Status</span>
                        <div class="speaker-indicator">
                            <span class="dot ${t.speaker_active ? 'active' : 'inactive'}" id="speaker-dot"></span>
                            <span id="speaker-status-text" style="font-size:0.8rem">${t.speaker_active ? 'Playing' : 'Idle'}</span>
                        </div>
                    </div>
                    <div class="volume-display" style="margin-top:12px">
                        <span style="font-size:0.75rem;color:var(--text-muted)">VOL</span>
                        <div class="volume-bar-track">
                            <div class="volume-bar-fill" id="vol-bar" style="width:${t.speaker_volume}%"></div>
                        </div>
                        <span class="volume-value" id="vol-value">${t.speaker_volume}</span>
                    </div>
                </div>
                <div class="zone-data-card">
                    <div class="zd-label">🕌 Mosque Lights</div>
                    <div class="zd-value" style="color:${il.mosque ? 'var(--accent-amber)' : 'var(--text-muted)'}" id="mosque-lights-status">${il.mosque ? 'ON' : 'OFF'}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- CASTLE ZONE -->
    <div class="zone-section" id="zone-castle">
        <div class="zone-accent castle-accent"></div>
        <div class="zone-header">
            <div class="zone-header-left">
                <div class="zone-icon" style="background:var(--accent-purple-dim)">🏰</div>
                <div>
                    <h3>Castle</h3>
                    <div class="zone-desc">Historic landmark · Parking area</div>
                </div>
            </div>
            <span class="card-badge ${(t.ir1 && t.ir2) ? 'badge-danger' : (t.ir1 || t.ir2) ? 'badge-active' : 'badge-safe'}" id="parking-badge">${(t.ir1 && t.ir2) ? 'FULL' : (t.ir1 || t.ir2) ? '1 PARKED' : 'EMPTY'}</span>
        </div>
        <div class="zone-body">
            <div class="zone-visual" id="svg-castle-container">${svgCastle(il, t.ir1, t.ir2)}</div>
            <div class="zone-data">
                <div class="zone-data-row">
                    <div class="zone-data-card">
                        <div class="zd-header">
                            <span class="zd-label">🚗 Slot 1</span>
                            <span class="card-badge ${t.ir1 ? 'badge-danger' : 'badge-safe'}" id="slot1-badge" style="font-size:0.65rem">${t.ir1 ? 'PARKED' : 'EMPTY'}</span>
                        </div>
                        <div class="zd-value" id="slot1-text" style="color:${t.ir1 ? 'var(--accent-red)' : 'var(--accent-green)'};font-size:1.2rem">${t.ir1 ? '🚘 Occupied' : '✅ Available'}</div>
                    </div>
                    <div class="zone-data-card">
                        <div class="zd-header">
                            <span class="zd-label">🚗 Slot 2</span>
                            <span class="card-badge ${t.ir2 ? 'badge-danger' : 'badge-safe'}" id="slot2-badge" style="font-size:0.65rem">${t.ir2 ? 'PARKED' : 'EMPTY'}</span>
                        </div>
                        <div class="zd-value" id="slot2-text" style="color:${t.ir2 ? 'var(--accent-red)' : 'var(--accent-green)'};font-size:1.2rem">${t.ir2 ? '🚘 Occupied' : '✅ Available'}</div>
                    </div>
                </div>
                <div class="zone-data-card">
                    <div class="zd-label">🏰 Castle Outside Lights</div>
                    <div class="zd-value" style="color:${il.castle ? 'var(--accent-purple)' : 'var(--text-muted)'}" id="castle-lights-status">${il.castle ? 'ON' : 'OFF'}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- STREET ZONE -->
    <div class="zone-section" id="zone-street">
        <div class="zone-accent street-accent"></div>
        <div class="zone-header">
            <div class="zone-header-left">
                <div class="zone-icon" style="background:var(--accent-amber-dim)">🛣️</div>
                <div>
                    <h3>Street</h3>
                    <div class="zone-desc">Public road · Smart lighting</div>
                </div>
            </div>
            <span class="card-badge badge-active" id="ldr-badge">${(t.light || 0) < 2000 ? 'LAMPS ON' : 'DAYLIGHT'}</span>
        </div>
        <div class="zone-body">
            <div class="zone-visual" id="svg-street-container">${svgStreet(t.light || 0)}</div>
            <div class="zone-data">
                <div class="zone-data-card">
                    <div class="zd-header"><span class="zd-label">☀️ Light Level (LDR)</span></div>
                    <div class="zd-value" style="color:var(--accent-amber)" id="ldr-value">${t.light || 0}</div>
                    <div class="gas-range" style="margin-top:4px">0 (dark) — 4095 (bright) · lamp-on below ${t.street_light_threshold || 2000}</div>
                    <div class="gas-bar" style="margin-top:10px">
                        <div class="gas-bar-fill" id="ldr-bar" style="width:${Math.min(100,((t.light||0)/4095)*100)}%;background:linear-gradient(90deg,#ffaa00,#ffdd57)"></div>
                    </div>
                </div>
                <div class="zone-data-card">
                    <div class="zd-label">💡 Street Lamp Status</div>
                    <div class="zd-value" style="color:${(t.light||0) < (t.street_light_threshold||2000) ? 'var(--accent-amber)' : 'var(--text-muted)'}" id="street-lamp-status">${(t.light||0) < (t.street_light_threshold||2000) ? 'ON — Auto' : 'OFF — Daylight'}</div>
                </div>
            </div>
        </div>
    </div>`;
}
