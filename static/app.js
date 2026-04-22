/* ═══════════════════════════════════════════════════════════
   Smart City Dashboard — SPA Application
   ═══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ─── State ───
    const state = {
        token: sessionStorage.getItem('sc_token') || null,
        username: sessionStorage.getItem('sc_user') || null,
        page: 'home',
        telemetry: {
            gas: 0, light: 0,
            ir1: false, ir2: false,
            led: 'OFF',
            speaker_active: false,
            speaker_volume: 15,
            gas_danger: false,
            gas_threshold: 1000,
            street_light_threshold: 2000,
            city_lights_logic: '',
        },
        illumination: {
            floor1: false, floor2: false,
            castle: false, mosque: false
        },
        cityTime: {
            formatted: '06:00:00',
            speed: 1
        },
        socket: null,
        connected: false
    };

    const app = document.getElementById('app');

    // ─── Router ───
    function navigate(page) {
        state.page = page;
        render();
    }

    function render() {
        if (!state.token) {
            renderLogin();
        } else if (state.page === 'control') {
            renderShell(renderControlPage);
        } else if (state.page === 'logic') {
            renderShell(renderLogicPage);
        } else {
            renderShell(renderHomePage);
        }
    }

    // ─── API Helpers ───
    async function apiPost(url, data) {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + state.token
            },
            body: JSON.stringify(data)
        });
        return res.json();
    }

    async function apiGet(url) {
        const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + state.token }
        });
        return res.json();
    }

    // ─── SocketIO ───
    function connectSocket() {
        if (state.socket) {
            state.socket.disconnect();
        }

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
                if (data.illumination) state.illumination = data.illumination;
                if (data.city_time) state.cityTime = data.city_time;
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
            });

            state.socket.on('connect_error', (err) => {
                console.log('[SC] SocketIO connect error:', err.message);
            });
        } catch (e) {
            console.log('[SC] SocketIO init failed, using polling only:', e);
        }
    }

    // ─── Polling Fallback (always runs) ───
    let pollTimer = null;

    function startPolling() {
        if (pollTimer) clearInterval(pollTimer);
        // Initial fetch immediately
        pollTelemetry();
        // Then every 2 seconds
        pollTimer = setInterval(pollTelemetry, 2000);
    }

    function stopPolling() {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    function pollTelemetry() {
        if (!state.token) return;
        fetch('/api/telemetry', {
            headers: { 'Authorization': 'Bearer ' + state.token }
        })
        .then(r => {
            if (r.status === 401) {
                // Token expired, force re-login
                state.token = null;
                sessionStorage.removeItem('sc_token');
                sessionStorage.removeItem('sc_user');
                stopPolling();
                render();
                return null;
            }
            return r.json();
        })
        .then(data => {
            if (!data) return;
            state.telemetry = { ...state.telemetry, ...data };
            if (data.illumination) state.illumination = data.illumination;
            if (data.city_time) state.cityTime = data.city_time;
            if (state.page === 'home') updateDashboardUI();
            updateClockUI();
        })
        .catch(err => console.log('[SC] Poll error:', err));
    }

    function updateConnectionUI() {
        const dot = document.getElementById('conn-dot');
        if (dot) {
            dot.className = 'connection-dot ' + (state.connected ? 'connected' : 'disconnected');
        }
    }

    // ─── LOGIN PAGE ───
    function renderLogin() {
        app.innerHTML = `
        <div class="login-page">
            <div class="login-card">
                <div class="login-brand">
                    <span class="city-icon">🏙️</span>
                    <h1>Smart City</h1>
                    <p>Intelligent Urban Control System</p>
                </div>
                <div class="login-error" id="login-error">
                    Invalid username or password
                </div>
                <form id="login-form" autocomplete="off">
                    <div class="form-group">
                        <label for="login-user">Username</label>
                        <input type="text" id="login-user" class="form-input" placeholder="Enter username" required autofocus>
                    </div>
                    <div class="form-group">
                        <label for="login-pass">Password</label>
                        <input type="password" id="login-pass" class="form-input" placeholder="Enter password" required>
                    </div>
                    <button type="submit" class="btn-login" id="btn-login">Sign In</button>
                </form>
            </div>
        </div>`;

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-user').value.trim();
            const password = document.getElementById('login-pass').value;
            const btn = document.getElementById('btn-login');
            const errEl = document.getElementById('login-error');

            btn.textContent = 'Signing in...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();

                if (res.ok && data.token) {
                    state.token = data.token;
                    state.username = data.username;
                    sessionStorage.setItem('sc_token', data.token);
                    sessionStorage.setItem('sc_user', data.username);
                    connectSocket();
                    startPolling();
                    navigate('home');
                } else {
                    errEl.classList.add('visible');
                    errEl.textContent = data.error || 'Invalid credentials';
                    btn.textContent = 'Sign In';
                    btn.disabled = false;
                }
            } catch {
                errEl.classList.add('visible');
                errEl.textContent = 'Connection failed. Is the server running?';
                btn.textContent = 'Sign In';
                btn.disabled = false;
            }
        });
    }

    // ─── SHELL (nav + page) ───
    function renderShell(pageRenderer) {
        const speedText = state.cityTime.speed > 1 ? `<span class="speed-badge">${state.cityTime.speed}x</span>` : '';

        app.innerHTML = `
        <nav class="top-nav">
            <div class="nav-brand">
                <span class="icon">🏙️</span>
                <h2>Smart City</h2>
                <span id="conn-dot" class="connection-dot ${state.connected ? 'connected' : 'disconnected'}"></span>
            </div>
            <div class="nav-links">
                <button class="nav-link ${state.page === 'home' ? 'active' : ''}" id="nav-home">🏠 Home</button>
                <button class="nav-link ${state.page === 'control' ? 'active' : ''}" id="nav-control">🎛️ Control</button>
                <button class="nav-link ${state.page === 'logic' ? 'active' : ''}" id="nav-logic">📝 Logic</button>
            </div>
            <div class="nav-right">
                <div class="city-clock">
                    <span>🕐</span>
                    <span id="city-clock-time">${state.cityTime.formatted}</span>
                    <span id="city-clock-speed">${speedText}</span>
                </div>
                <button class="btn-logout" id="btn-logout">Logout</button>
            </div>
        </nav>
        <main class="dashboard" id="page-content"></main>`;

        document.getElementById('nav-home').addEventListener('click', () => navigate('home'));
        document.getElementById('nav-control').addEventListener('click', () => navigate('control'));
        document.getElementById('nav-logic').addEventListener('click', () => navigate('logic'));
        document.getElementById('btn-logout').addEventListener('click', () => {
            apiPost('/api/logout', {}).catch(() => {});
            state.token = null;
            state.username = null;
            sessionStorage.removeItem('sc_token');
            sessionStorage.removeItem('sc_user');
            stopPolling();
            if (state.socket) state.socket.disconnect();
            navigate('home');
        });

        pageRenderer();
    }

    // ─── SVG ILLUSTRATIONS ───

    function svgDefs() {
        return `<defs>
            <filter id="windowGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="lampGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0a1628"/>
                <stop offset="100%" stop-color="#141e33"/>
            </linearGradient>
            <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#1a2035"/>
                <stop offset="100%" stop-color="#0f1520"/>
            </linearGradient>
        </defs>`;
    }

    function svgHome(il, gasDanger) {
        const f1 = il.floor1;
        const f2 = il.floor2;
        const wColor = (on) => on ? '#ffdd57' : '#1a2035';
        const wOp = (on) => on ? '0.9' : '0.5';
        const glowF = (on) => on ? 'url(#windowGlow)' : 'none';
        return `<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg">
            ${svgDefs()}
            <rect width="240" height="200" fill="url(#skyGrad)" rx="12"/>
            <!-- ground -->
            <rect x="0" y="155" width="240" height="45" fill="url(#groundGrad)" rx="0"/>
            <!-- house body -->
            <rect x="50" y="60" width="140" height="95" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1"/>
            <!-- roof -->
            <polygon points="40,62 120,15 200,62" fill="#2d3a52" stroke="#475569" stroke-width="1"/>
            <polygon points="60,62 120,25 180,62" fill="#253349"/>
            <!-- chimney -->
            <rect x="150" y="22" width="16" height="32" rx="2" fill="#2d3a52" stroke="#475569" stroke-width="1"/>
            <!-- floor 2 windows -->
            <rect id="svg-home-f2-w1" x="72" y="72" width="26" height="22" rx="3" fill="${wColor(f2)}" opacity="${wOp(f2)}" filter="${glowF(f2)}"/>
            <rect id="svg-home-f2-w2" x="107" y="72" width="26" height="22" rx="3" fill="${wColor(f2)}" opacity="${wOp(f2)}" filter="${glowF(f2)}"/>
            <rect id="svg-home-f2-w3" x="142" y="72" width="26" height="22" rx="3" fill="${wColor(f2)}" opacity="${wOp(f2)}" filter="${glowF(f2)}"/>
            <!-- floor divider -->
            <line x1="55" y1="105" x2="185" y2="105" stroke="#334155" stroke-width="1"/>
            <!-- floor 1 windows -->
            <rect id="svg-home-f1-w1" x="72" y="112" width="26" height="26" rx="3" fill="${wColor(f1)}" opacity="${wOp(f1)}" filter="${glowF(f1)}"/>
            <rect id="svg-home-f1-w2" x="142" y="112" width="26" height="26" rx="3" fill="${wColor(f1)}" opacity="${wOp(f1)}" filter="${glowF(f1)}"/>
            <!-- door -->
            <rect x="104" y="118" width="24" height="37" rx="3" fill="#162032" stroke="#334155" stroke-width="1"/>
            <circle cx="124" cy="138" r="2" fill="#475569"/>
            <!-- floor labels -->
            <text x="196" y="90" fill="#64748b" font-size="8" font-family="Inter,sans-serif" font-weight="600">F2</text>
            <text x="196" y="132" fill="#64748b" font-size="8" font-family="Inter,sans-serif" font-weight="600">F1</text>
            <!-- gas cloud if danger -->
            <g id="svg-gas-cloud" opacity="${gasDanger ? '1' : '0'}" style="transition: opacity 0.5s ease">
                <ellipse cx="172" cy="18" rx="14" ry="8" fill="#ff3366" opacity="0.3"/>
                <ellipse cx="165" cy="14" rx="10" ry="6" fill="#ff3366" opacity="0.25"/>
                <text x="160" y="20" fill="#ff3366" font-size="7" font-weight="bold" font-family="Inter,sans-serif">GAS</text>
            </g>
        </svg>`;
    }

    function svgMosque(il, speakerActive) {
        const lit = il.mosque;
        const lColor = lit ? '#ffdd57' : '#1a2035';
        const lOp = lit ? '0.85' : '0.4';
        const glowF = lit ? 'url(#windowGlow)' : 'none';
        const spkColor = speakerActive ? '#00e88f' : '#475569';
        return `<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg">
            ${svgDefs()}
            <rect width="240" height="200" fill="url(#skyGrad)" rx="12"/>
            <rect x="0" y="155" width="240" height="45" fill="url(#groundGrad)"/>
            <!-- main body -->
            <rect x="55" y="80" width="130" height="75" rx="3" fill="#1e293b" stroke="#334155" stroke-width="1"/>
            <!-- dome -->
            <ellipse cx="120" cy="82" rx="50" ry="32" fill="#253349" stroke="#475569" stroke-width="1"/>
            <ellipse cx="120" cy="82" rx="38" ry="24" fill="#2d3a52"/>
            <!-- crescent -->
            <circle cx="120" cy="52" r="6" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
            <circle cx="122" cy="51" r="5" fill="#253349"/>
            <!-- pole -->
            <line x1="120" y1="58" x2="120" y2="50" stroke="#64748b" stroke-width="1.5"/>
            <!-- minaret left -->
            <rect x="32" y="45" width="18" height="110" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1"/>
            <ellipse cx="41" cy="46" rx="11" ry="8" fill="#253349" stroke="#475569" stroke-width="1"/>
            <circle cx="41" cy="38" r="3" fill="${lColor}" opacity="${lOp}"/>
            <!-- minaret right -->
            <rect x="190" y="45" width="18" height="110" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1"/>
            <ellipse cx="199" cy="46" rx="11" ry="8" fill="#253349" stroke="#475569" stroke-width="1"/>
            <circle cx="199" cy="38" r="3" fill="${lColor}" opacity="${lOp}"/>
            <!-- windows (arched) -->
            <rect id="svg-mosque-w1" x="75" y="105" width="20" height="28" rx="10" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
            <rect id="svg-mosque-w2" x="110" y="105" width="20" height="28" rx="10" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
            <rect id="svg-mosque-w3" x="145" y="105" width="20" height="28" rx="10" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
            <!-- door -->
            <rect x="108" y="128" width="24" height="27" rx="12" fill="#162032" stroke="#334155" stroke-width="1"/>
            <!-- speaker icon on minaret -->
            <g id="svg-speaker-indicator" transform="translate(26, 60)">
                <rect x="0" y="0" width="12" height="8" rx="2" fill="${spkColor}" opacity="0.8"/>
                <polygon points="12,0 18,-3 18,11 12,8" fill="${spkColor}" opacity="0.6"/>
                ${speakerActive ? `
                <path d="M20,0 Q24,4 20,8" fill="none" stroke="${spkColor}" stroke-width="1" opacity="0.5" class="svg-glow"/>
                <path d="M22,-2 Q28,4 22,10" fill="none" stroke="${spkColor}" stroke-width="1" opacity="0.3" class="svg-glow"/>` : ''}
            </g>
        </svg>`;
    }

    function svgCastle(il, ir1, ir2) {
        const lit = il.castle;
        const lColor = lit ? '#c4a6ff' : '#1a2035';
        const lOp = lit ? '0.85' : '0.4';
        const glowF = lit ? 'url(#windowGlow)' : 'none';
        return `<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg">
            ${svgDefs()}
            <rect width="240" height="200" fill="url(#skyGrad)" rx="12"/>
            <rect x="0" y="155" width="240" height="45" fill="url(#groundGrad)"/>
            <!-- castle body -->
            <rect x="55" y="65" width="130" height="90" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1"/>
            <!-- battlements -->
            <rect x="55" y="58" width="18" height="12" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
            <rect x="82" y="58" width="18" height="12" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
            <rect x="109" y="58" width="22" height="12" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
            <rect x="140" y="58" width="18" height="12" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
            <rect x="167" y="58" width="18" height="12" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
            <!-- left tower -->
            <rect x="38" y="38" width="30" height="117" rx="1" fill="#222d42" stroke="#334155" stroke-width="1"/>
            <rect x="38" y="31" width="8" height="10" fill="#222d42" stroke="#334155" stroke-width="0.8"/>
            <rect x="52" y="31" width="8" height="10" fill="#222d42" stroke="#334155" stroke-width="0.8"/>
            <rect x="45" y="31" width="8" height="10" fill="#222d42" stroke="#334155" stroke-width="0.8"/>
            <!-- right tower -->
            <rect x="172" y="38" width="30" height="117" rx="1" fill="#222d42" stroke="#334155" stroke-width="1"/>
            <rect x="172" y="31" width="8" height="10" fill="#222d42" stroke="#334155" stroke-width="0.8"/>
            <rect x="186" y="31" width="8" height="10" fill="#222d42" stroke="#334155" stroke-width="0.8"/>
            <rect x="179" y="31" width="8" height="10" fill="#222d42" stroke="#334155" stroke-width="0.8"/>
            <!-- tower windows -->
            <rect x="47" y="55" width="12" height="16" rx="6" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
            <rect x="181" y="55" width="12" height="16" rx="6" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
            <!-- castle windows -->
            <rect id="svg-castle-w1" x="72" y="80" width="16" height="22" rx="8" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
            <rect id="svg-castle-w2" x="112" y="80" width="16" height="22" rx="8" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
            <rect id="svg-castle-w3" x="152" y="80" width="16" height="22" rx="8" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
            <!-- gate -->
            <rect x="103" y="115" width="34" height="40" rx="17" fill="#0f1520" stroke="#334155" stroke-width="1"/>
            <line x1="120" y1="120" x2="120" y2="155" stroke="#334155" stroke-width="0.8"/>
            <!-- parking area -->
            <rect x="20" y="160" width="80" height="24" rx="3" fill="rgba(255,255,255,0.03)" stroke="#334155" stroke-width="0.5" stroke-dasharray="3,2"/>
            <text x="48" y="171" fill="#475569" font-size="5" font-family="Inter,sans-serif" text-anchor="middle">PARKING</text>
            <!-- car 1 -->
            <g id="svg-car-1" class="svg-car ${ir1 ? 'visible' : 'hidden'}">
                <rect x="24" y="173" width="28" height="10" rx="3" fill="#3b82f6" opacity="0.8"/>
                <rect x="28" y="170" width="20" height="6" rx="2" fill="#3b82f6" opacity="0.6"/>
                <circle cx="30" cy="183" r="3" fill="#1e293b" stroke="#475569" stroke-width="0.6"/>
                <circle cx="46" cy="183" r="3" fill="#1e293b" stroke="#475569" stroke-width="0.6"/>
            </g>
            <!-- car 2 -->
            <g id="svg-car-2" class="svg-car ${ir2 ? 'visible' : 'hidden'}">
                <rect x="62" y="173" width="28" height="10" rx="3" fill="#ef4444" opacity="0.8"/>
                <rect x="66" y="170" width="20" height="6" rx="2" fill="#ef4444" opacity="0.6"/>
                <circle cx="68" cy="183" r="3" fill="#1e293b" stroke="#475569" stroke-width="0.6"/>
                <circle cx="84" cy="183" r="3" fill="#1e293b" stroke="#475569" stroke-width="0.6"/>
            </g>
            <!-- outside lights -->
            <circle cx="53" cy="35" r="3" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
            <circle cx="187" cy="35" r="3" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
        </svg>`;
    }

    function svgStreet(lightLevel) {
        const bright = lightLevel < 2000;
        const lampColor = bright ? '#ffdd57' : '#475569';
        const lampOp = bright ? '0.9' : '0.3';
        const glowF = bright ? 'url(#lampGlow)' : 'none';
        const lampCone = bright ? 'rgba(255,221,87,0.06)' : 'rgba(255,255,255,0.01)';
        return `<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg">
            ${svgDefs()}
            <rect width="240" height="200" fill="url(#skyGrad)" rx="12"/>
            <!-- road -->
            <rect x="0" y="140" width="240" height="60" fill="#141820" rx="0"/>
            <rect x="0" y="138" width="240" height="4" fill="#2a3040"/>
            <!-- road markings -->
            <rect x="20" y="168" width="30" height="3" rx="1" fill="#2a3040"/>
            <rect x="70" y="168" width="30" height="3" rx="1" fill="#2a3040"/>
            <rect x="120" y="168" width="30" height="3" rx="1" fill="#2a3040"/>
            <rect x="170" y="168" width="30" height="3" rx="1" fill="#2a3040"/>
            <!-- sidewalk -->
            <rect x="0" y="134" width="240" height="6" fill="#1e2636"/>
            <!-- lamp post 1 -->
            <rect x="58" y="52" width="4" height="84" fill="#334155"/>
            <rect x="50" y="48" width="20" height="6" rx="3" fill="#3b4a63"/>
            <ellipse cx="60" cy="46" rx="10" ry="5" fill="${lampColor}" opacity="${lampOp}" filter="${glowF}"/>
            <!-- light cone 1 -->
            <polygon points="50,51 70,51 80,136 40,136" fill="${lampCone}"/>
            <!-- lamp post 2 -->
            <rect x="158" y="52" width="4" height="84" fill="#334155"/>
            <rect x="150" y="48" width="20" height="6" rx="3" fill="#3b4a63"/>
            <ellipse cx="160" cy="46" rx="10" ry="5" fill="${lampColor}" opacity="${lampOp}" filter="${glowF}"/>
            <!-- light cone 2 -->
            <polygon points="150,51 170,51 180,136 140,136" fill="${lampCone}"/>
            <!-- LDR sensor -->
            <g transform="translate(105,82)">
                <rect x="0" y="0" width="30" height="20" rx="4" fill="#1e293b" stroke="#475569" stroke-width="0.8"/>
                <circle cx="15" cy="10" r="6" fill="#253349" stroke="#00d4ff" stroke-width="0.8" opacity="0.6"/>
                <text x="15" y="28" fill="#64748b" font-size="6" font-family="Inter,sans-serif" text-anchor="middle">LDR</text>
            </g>
            <!-- stars -->
            <circle cx="30" cy="20" r="1" fill="#fff" opacity="0.3"/>
            <circle cx="90" cy="30" r="1" fill="#fff" opacity="0.2"/>
            <circle cx="180" cy="15" r="1" fill="#fff" opacity="0.4"/>
            <circle cx="210" cy="35" r="1" fill="#fff" opacity="0.2"/>
            <circle cx="140" cy="22" r="1" fill="#fff" opacity="0.3"/>
        </svg>`;
    }

    // ─── HOME PAGE ───
    function renderHomePage() {
        const content = document.getElementById('page-content');
        const t = state.telemetry;
        const il = state.illumination;

        const gasLevel = t.gas || 0;
        const gasPercent = Math.min(100, (gasLevel / 4095) * 100);
        const gasClass = gasLevel > (t.gas_threshold || 1000) ? 'danger' : gasLevel > 600 ? 'warning' : 'safe';
        const gasDanger = t.gas_danger || false;

        content.innerHTML = `
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Real-time sensor monitoring · Castle Smart City</p>

        <!-- ═══ HOME ZONE ═══ -->
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
                <span class="card-badge ${gasDanger ? 'badge-danger' : 'badge-safe'}" id="gas-badge">${gasDanger ? 'GAS ALERT' : 'SAFE'}</span>
            </div>
            <div class="zone-body">
                <div class="zone-visual" id="svg-home-container">${svgHome(il, gasDanger)}</div>
                <div class="zone-data">
                    <div class="zone-data-card">
                        <div class="zd-header">
                            <span class="zd-label">🔥 Gas Sensor (MQ2)</span>
                            <span class="card-badge ${gasDanger ? 'badge-danger' : 'badge-safe'}" id="gas-badge-mini" style="font-size:0.65rem">${gasDanger ? 'DANGER' : 'SAFE'}</span>
                        </div>
                        <div class="gas-value ${gasClass}" id="gas-value" style="font-size:2.2rem">${gasLevel}</div>
                        <div class="gas-range">0 — 4095 (threshold: ${t.gas_threshold || 1000})</div>
                        <div class="gas-bar">
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

        <!-- ═══ MOSQUE ZONE ═══ -->
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

        <!-- ═══ CASTLE ZONE ═══ -->
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
                            <div class="zd-value" id="slot1-text" style="color:${t.ir1 ? 'var(--accent-red)' : 'var(--accent-green)'}; font-size:1.2rem">${t.ir1 ? '🚘 Occupied' : '✅ Available'}</div>
                        </div>
                        <div class="zone-data-card">
                            <div class="zd-header">
                                <span class="zd-label">🚗 Slot 2</span>
                                <span class="card-badge ${t.ir2 ? 'badge-danger' : 'badge-safe'}" id="slot2-badge" style="font-size:0.65rem">${t.ir2 ? 'PARKED' : 'EMPTY'}</span>
                            </div>
                            <div class="zd-value" id="slot2-text" style="color:${t.ir2 ? 'var(--accent-red)' : 'var(--accent-green)'}; font-size:1.2rem">${t.ir2 ? '🚘 Occupied' : '✅ Available'}</div>
                        </div>
                    </div>
                    <div class="zone-data-card">
                        <div class="zd-label">🏰 Castle Outside Lights</div>
                        <div class="zd-value" style="color:${il.castle ? 'var(--accent-purple)' : 'var(--text-muted)'}" id="castle-lights-status">${il.castle ? 'ON' : 'OFF'}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ STREET ZONE ═══ -->
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
                        <div class="zd-header">
                            <span class="zd-label">☀️ Light Level (LDR)</span>
                        </div>
                        <div class="zd-value" style="color:var(--accent-amber)" id="ldr-value">${t.light || 0}</div>
                        <div class="gas-range" style="margin-top:4px">0 (dark) — 4095 (bright) · lamp-on below ${t.street_light_threshold || 2000}</div>
                        <div class="gas-bar" style="margin-top:10px">
                            <div class="gas-bar-fill" id="ldr-bar" style="width:${Math.min(100, ((t.light||0)/4095)*100)}%;background:linear-gradient(90deg,#ffaa00,#ffdd57)"></div>
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

    function renderZone(key, label, isOn) {
        return `
        <div class="light-zone ${isOn ? 'active' : ''}">
            <span class="zone-dot ${isOn ? 'on' : 'off'}"></span>
            <span class="zone-name">${label}</span>
            <span class="zone-status ${isOn ? 'on' : 'off'}">${isOn ? 'ON' : 'OFF'}</span>
        </div>`;
    }

    // ─── CONTROL PAGE ───
    function renderControlPage() {
        const content = document.getElementById('page-content');
        const il = state.illumination;
        const t = state.telemetry;
        const speed = state.cityTime.speed || 1;

        content.innerHTML = `
        <h1 class="page-title">City Control Center</h1>
        <p class="page-subtitle">Manage actuators, system settings, and automation overrides</p>

        <!-- 🌐 GLOBAL SYSTEMS -->
        <div class="zone-section" style="margin-bottom: 24px;">
            <div class="zone-accent" style="background:var(--accent-cyan)"></div>
            <div class="zone-header">
                <div class="zone-header-left">
                    <div class="zone-icon" style="background:rgba(0, 240, 255, 0.15);color:var(--accent-cyan)">🌐</div>
                    <div>
                        <h3>Global Systems</h3>
                        <div class="zone-desc">Time simulation & master overrides</div>
                    </div>
                </div>
            </div>
            <div class="zone-body" style="grid-template-columns: 1fr; gap: 20px;">
                <div class="control-grid">
                    <div class="slider-control">
                        <div class="slider-header">
                            <span class="slider-label">⚡ Simulation Speed</span>
                        </div>
                        <div class="speed-buttons" id="speed-buttons">
                            ${[1, 2, 5, 10, 30, 50, 100].map(s =>
                                `<button class="speed-btn ${speed === s ? 'active' : ''}" data-speed="${s}">${s}x</button>`
                            ).join('')}
                        </div>
                    </div>
                    <div class="slider-control">
                        <div class="slider-header">
                            <span class="slider-label">🕐 Set City Time</span>
                        </div>
                        <div class="time-input-group">
                            <input type="text" id="set-time-input" class="time-input" placeholder="HH:MM" value="${state.cityTime.formatted ? state.cityTime.formatted.substring(0,5) : '06:00'}">
                            <button class="btn-action btn-cyan" id="btn-set-time">Set</button>
                        </div>
                    </div>
                    <div class="slider-control">
                        <div class="slider-header">
                            <span class="slider-label">💡 Master ESP32 LED</span>
                            <span class="slider-value" id="led-state-ctrl" style="color:${t.led === 'ON' ? 'var(--accent-green)' : 'var(--text-muted)'}">${t.led}</span>
                        </div>
                        <div class="action-row" style="margin:0; justify-content: flex-start; gap: 8px;">
                            <button class="btn-action btn-cyan btn-sm" id="btn-led-on">ON</button>
                            <button class="btn-action btn-red btn-sm" id="btn-led-off">OFF</button>
                            <button class="btn-action btn-ghost btn-sm" id="btn-led-toggle">Toggle</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">

            <!-- 🏠 HOME CONTROLS -->
            <div class="zone-section">
                <div class="zone-accent home-accent"></div>
                <div class="zone-header">
                    <div class="zone-header-left">
                        <div class="zone-icon" style="background:var(--accent-cyan-dim)">🏠</div>
                        <div>
                            <h3>Home</h3>
                            <div class="zone-desc">Floor lights</div>
                        </div>
                    </div>
                </div>
                <div class="zone-body" style="grid-template-columns: 1fr;">
                    <div style="display:flex; flex-direction:column; gap:16px; padding: 20px;">
                        ${renderToggle('floor1', '💡', 'Floor 1 Lights', il.floor1)}
                        ${renderToggle('floor2', '💡', 'Floor 2 Lights', il.floor2)}
                    </div>
                </div>
            </div>

            <!-- 🕌 MOSQUE CONTROLS -->
            <div class="zone-section">
                <div class="zone-accent mosque-accent"></div>
                <div class="zone-header">
                    <div class="zone-header-left">
                        <div class="zone-icon" style="background:var(--accent-emerald-dim)">🕌</div>
                        <div>
                            <h3>Mosque</h3>
                            <div class="zone-desc">Lights & Athan Audio</div>
                        </div>
                    </div>
                </div>
                <div class="zone-body" style="grid-template-columns: 1fr;">
                    <div style="display:flex; flex-direction:column; gap:16px; padding: 20px;">
                        ${renderToggle('mosque', '💡', 'Mosque Lights', il.mosque)}
                        
                        <div style="height: 1px; background: var(--border-light); margin: 8px 0;"></div>
                        
                        <div class="slider-header" style="margin-bottom:8px;">
                            <span class="slider-label">🔈 Volume</span>
                            <span class="slider-value" id="ctrl-vol-display">${t.speaker_volume}</span>
                        </div>
                        <input type="range" id="ctrl-volume" min="0" max="100" value="${t.speaker_volume}" />
                        
                        <div style="display:flex; justify-content: space-between; align-items: center; margin-top: 16px;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span>Track:</span>
                                <input type="number" id="ctrl-track" min="1" max="99" value="1" class="time-input" style="width:60px;text-align:center;">
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button class="btn-action btn-ghost btn-sm" id="btn-stop-audio">⏹️ Stop</button>
                                <button class="btn-action btn-cyan" id="btn-play-athan" style="background:var(--accent-emerald)">▶️ Play Athan</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 🏰 CASTLE CONTROLS -->
            <div class="zone-section">
                <div class="zone-accent castle-accent"></div>
                <div class="zone-header">
                    <div class="zone-header-left">
                        <div class="zone-icon" style="background:var(--accent-purple-dim)">🏰</div>
                        <div>
                            <h3>Castle</h3>
                            <div class="zone-desc">Exterior display</div>
                        </div>
                    </div>
                </div>
                <div class="zone-body" style="grid-template-columns: 1fr;">
                    <div style="display:flex; flex-direction:column; gap:16px; padding: 20px;">
                        ${renderToggle('castle', '💡', 'Outside Lights', il.castle)}
                    </div>
                </div>
            </div>

            <!-- 🔥 GAS SENSOR THRESHOLD -->
            <div class="zone-section">
                <div class="zone-accent" style="background:linear-gradient(180deg,var(--accent-red),var(--accent-amber))"></div>
                <div class="zone-header">
                    <div class="zone-header-left">
                        <div class="zone-icon" style="background:var(--accent-red-dim)">🔥</div>
                        <div>
                            <h3>Gas Sensor</h3>
                            <div class="zone-desc">Danger threshold · 0 – 4095</div>
                        </div>
                    </div>
                    <span class="card-badge badge-danger" style="font-size:0.7rem">MQ2</span>
                </div>
                <div class="zone-body" style="grid-template-columns: 1fr;">
                    <div style="display:flex; flex-direction:column; gap:16px; padding: 20px;">
                        <div class="slider-header" style="margin-bottom:8px;">
                            <span class="slider-label">⚠️ Alert Threshold</span>
                            <span class="slider-value" id="gas-threshold-display">${t.gas_threshold || 1000}</span>
                        </div>
                        <input type="range" id="ctrl-gas-threshold" min="100" max="4095" step="50" value="${t.gas_threshold || 1000}" />
                        <div style="display:flex;gap:8px;margin-top:4px;align-items:center;">
                            <input type="number" id="ctrl-gas-threshold-num" min="100" max="4095" value="${t.gas_threshold || 1000}" class="time-input" style="width:90px;text-align:center;" />
                            <button class="btn-action btn-red" id="btn-set-gas-threshold">Set Threshold</button>
                        </div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">Gas reading above this value triggers the danger alert.</div>
                    </div>
                </div>
            </div>

            <!-- 🛣️ STREET LIGHT AUTO SETTINGS -->
            <div class="zone-section">
                <div class="zone-accent street-accent"></div>
                <div class="zone-header">
                    <div class="zone-header-left">
                        <div class="zone-icon" style="background:var(--accent-amber-dim)">🛣️</div>
                        <div>
                            <h3>Street Light Auto</h3>
                            <div class="zone-desc">LDR auto-on threshold · 0 – 4095</div>
                        </div>
                    </div>
                </div>
                <div class="zone-body" style="grid-template-columns: 1fr;">
                    <div style="display:flex; flex-direction:column; gap:16px; padding: 20px;">
                        <div class="slider-header" style="margin-bottom:8px;">
                            <span class="slider-label">🌑 Lamps ON below</span>
                            <span class="slider-value" id="light-threshold-display">${t.street_light_threshold || 2000}</span>
                        </div>
                        <input type="range" id="ctrl-light-threshold" min="100" max="4095" step="50" value="${t.street_light_threshold || 2000}" />
                        <div style="display:flex;gap:8px;margin-top:4px;align-items:center;">
                            <input type="number" id="ctrl-light-threshold-num" min="100" max="4095" value="${t.street_light_threshold || 2000}" class="time-input" style="width:90px;text-align:center;" />
                            <button class="btn-action btn-cyan" id="btn-set-light-threshold">Set Threshold</button>
                        </div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">Street lamps switch on automatically when LDR reads below this value.</div>
                    </div>
                </div>
            </div>

        </div>`;

        // ─── Event Bindings ───

        // Illumination toggles
        document.querySelectorAll('.zone-toggle').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const zone = e.target.dataset.zone;
                const newState = e.target.checked ? 'on' : 'off';
                apiPost('/api/command', { action: 'illuminate', zone, state: newState });
            });
        });

        // Volume slider — 0-100; ESP maps internally to DFPlayer 0-30
        const volSlider = document.getElementById('ctrl-volume');
        if (volSlider) {
            volSlider.addEventListener('input', (e) => {
                const display = document.getElementById('ctrl-vol-display');
                if (display) display.textContent = e.target.value;
            });
            volSlider.addEventListener('change', (e) => {
                apiPost('/api/command', { action: 'volume', level: parseInt(e.target.value) });
            });
        }

        // Play athan
        const btnPlay = document.getElementById('btn-play-athan');
        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                const track = parseInt(document.getElementById('ctrl-track')?.value || 1);
                apiPost('/api/command', { action: 'play', track });
            });
        }

        // Stop audio
        document.getElementById('btn-stop-audio')?.addEventListener('click', () => {
            apiPost('/api/command', { action: 'stop' });
        });

        // LED buttons
        document.getElementById('btn-led-on')?.addEventListener('click', () => {
            apiPost('/api/command', { action: 'led', state: 'on' });
        });
        document.getElementById('btn-led-off')?.addEventListener('click', () => {
            apiPost('/api/command', { action: 'led', state: 'off' });
        });
        document.getElementById('btn-led-toggle')?.addEventListener('click', () => {
            apiPost('/api/command', { action: 'led', state: 'toggle' });
        });

        // Speed buttons
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const speed = parseInt(e.target.dataset.speed);
                apiPost('/api/timer', { speed }).then(() => {
                    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                });
            });
        });

        // Set time
        document.getElementById('btn-set-time')?.addEventListener('click', () => {
            const timeVal = document.getElementById('set-time-input')?.value;
            if (timeVal) apiPost('/api/timer', { set_time: timeVal });
        });

        // ── Gas threshold slider + number input (issue #1)
        const gasThreshSlider = document.getElementById('ctrl-gas-threshold');
        const gasThreshNum    = document.getElementById('ctrl-gas-threshold-num');
        const gasThreshDisp   = document.getElementById('gas-threshold-display');
        if (gasThreshSlider) {
            gasThreshSlider.addEventListener('input', (e) => {
                if (gasThreshDisp) gasThreshDisp.textContent = e.target.value;
                if (gasThreshNum)  gasThreshNum.value = e.target.value;
            });
        }
        if (gasThreshNum) {
            gasThreshNum.addEventListener('input', (e) => {
                const v = Math.min(4095, Math.max(100, parseInt(e.target.value) || 100));
                if (gasThreshDisp)   gasThreshDisp.textContent = v;
                if (gasThreshSlider) gasThreshSlider.value = v;
            });
        }
        document.getElementById('btn-set-gas-threshold')?.addEventListener('click', () => {
            const threshold = parseInt(gasThreshNum?.value || 1000);
            apiPost('/api/command', { action: 'set_gas_threshold', threshold })
                .then(() => { state.telemetry.gas_threshold = threshold; });
        });

        // ── Street light threshold slider + number input (issue #4)
        const lightThreshSlider = document.getElementById('ctrl-light-threshold');
        const lightThreshNum    = document.getElementById('ctrl-light-threshold-num');
        const lightThreshDisp   = document.getElementById('light-threshold-display');
        if (lightThreshSlider) {
            lightThreshSlider.addEventListener('input', (e) => {
                if (lightThreshDisp) lightThreshDisp.textContent = e.target.value;
                if (lightThreshNum)  lightThreshNum.value = e.target.value;
            });
        }
        if (lightThreshNum) {
            lightThreshNum.addEventListener('input', (e) => {
                const v = Math.min(4095, Math.max(100, parseInt(e.target.value) || 100));
                if (lightThreshDisp)   lightThreshDisp.textContent = v;
                if (lightThreshSlider) lightThreshSlider.value = v;
            });
        }
        document.getElementById('btn-set-light-threshold')?.addEventListener('click', () => {
            const threshold = parseInt(lightThreshNum?.value || 2000);
            apiPost('/api/command', { action: 'set_light_threshold', threshold })
                .then(() => { state.telemetry.street_light_threshold = threshold; });
        });
    }

    // ─── LOGIC PAGE ───
    function renderLogicPage() {
        const content = document.getElementById('page-content');
        const t = state.telemetry;

        content.innerHTML = `
        <h1 class="page-title">Smart City Logic Editor</h1>
        <p class="page-subtitle">Define automation rules using natural language · Syntax-highlighted DSL</p>

        <!-- 📖 REFERENCE BOX -->
        <div class="zone-section" style="margin-bottom: 24px;">
            <div class="zone-accent" style="background:linear-gradient(180deg,var(--accent-purple),var(--accent-cyan))"></div>
            <div class="zone-header">
                <div class="zone-header-left">
                    <div class="zone-icon" style="background:rgba(168,85,247,0.15);color:var(--accent-purple)">📖</div>
                    <div>
                        <h3>Rule Syntax Reference</h3>
                        <div class="zone-desc">Available keywords, zones, and patterns</div>
                    </div>
                </div>
            </div>
            <div class="zone-body" style="grid-template-columns: 1fr; gap:0;">
                <div style="padding: 0 24px 24px 24px;">
                    <div class="logic-example-box">
                        <div class="logic-example-header">
                            <span class="logic-example-dot red"></span>
                            <span class="logic-example-dot yellow"></span>
                            <span class="logic-example-dot green"></span>
                            <span class="logic-example-title">examples.smart — Sample Rules</span>
                        </div>
                        <div class="logic-example-body">
                            <div class="logic-example-line"><span class="logic-line-num">1</span><span class="hl-keyword">Turn on</span> <span class="hl-zone">floor1</span> <span class="hl-operator">and</span> <span class="hl-zone">mosque</span> <span class="hl-light">lights</span> <span class="hl-operator">from</span> <span class="hl-time">18:00</span> <span class="hl-operator">to</span> <span class="hl-time">23:00</span><span class="hl-punct">.</span></div>
                            <div class="logic-example-line"><span class="logic-line-num">2</span><span class="hl-keyword">Turn off</span> <span class="hl-zone">castle</span> <span class="hl-light">lights</span> <span class="hl-condition">during</span> <span class="hl-operator">the</span> <span class="hl-sensor">day</span> <span class="hl-punct">(</span><span class="hl-time">06:00</span> – <span class="hl-time">18:00</span><span class="hl-punct">)</span><span class="hl-punct">.</span></div>
                            <div class="logic-example-line"><span class="logic-line-num">3</span><span class="hl-keyword">Keep</span> <span class="hl-zone">floor2</span> <span class="hl-keyword">always on</span> <span class="hl-condition">when</span> <span class="hl-sensor">gas</span> <span class="hl-sensor">level</span> <span class="hl-operator">is</span> <span class="hl-sensor">safe</span><span class="hl-punct">.</span></div>
                            <div class="logic-example-line"><span class="logic-line-num">4</span><span class="hl-keyword">Switch on</span> <span class="hl-zone">street</span> <span class="hl-light">lamps</span> <span class="hl-condition">when</span> <span class="hl-sensor">light</span> <span class="hl-operator">is</span> <span class="hl-operator">below</span> <span class="hl-number">2000</span><span class="hl-punct">.</span></div>
                        </div>
                    </div>

                    <div class="logic-keywords-grid">
                        <div class="logic-keyword-group">
                            <div class="keyword-group-title">Keywords</div>
                            <div class="keyword-tags"><span class="hl-keyword">Turn on</span> <span class="hl-keyword">Turn off</span> <span class="hl-keyword">Keep</span> <span class="hl-keyword">Set</span> <span class="hl-keyword">Enable</span> <span class="hl-keyword">Disable</span></div>
                        </div>
                        <div class="logic-keyword-group">
                            <div class="keyword-group-title">Zones</div>
                            <div class="keyword-tags"><span class="hl-zone">floor1</span> <span class="hl-zone">floor2</span> <span class="hl-zone">castle</span> <span class="hl-zone">mosque</span> <span class="hl-zone">street</span></div>
                        </div>
                        <div class="logic-keyword-group">
                            <div class="keyword-group-title">Conditions</div>
                            <div class="keyword-tags"><span class="hl-condition">when</span> <span class="hl-condition">during</span> <span class="hl-condition">if</span> <span class="hl-condition">while</span> <span class="hl-condition">after</span> <span class="hl-condition">before</span></div>
                        </div>
                        <div class="logic-keyword-group">
                            <div class="keyword-group-title">Sensors</div>
                            <div class="keyword-tags"><span class="hl-sensor">gas</span> <span class="hl-sensor">light</span> <span class="hl-sensor">safe</span> <span class="hl-sensor">danger</span> <span class="hl-sensor">dark</span> <span class="hl-sensor">bright</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ✍️ CODE EDITOR -->
        <div class="zone-section" style="margin-bottom: 24px;">
            <div class="zone-accent" style="background:linear-gradient(180deg,var(--accent-cyan),var(--accent-purple))"></div>
            <div class="zone-header">
                <div class="zone-header-left">
                    <div class="zone-icon" style="background:rgba(0, 212, 255, 0.15);color:var(--accent-cyan)">✍️</div>
                    <div>
                        <h3>Automation Rules Editor</h3>
                        <div class="zone-desc">Write and apply lighting automation rules</div>
                    </div>
                </div>
                <span class="card-badge ${t.city_lights_logic ? 'badge-active' : 'badge-inactive'}" id="logic-status-badge">${t.city_lights_logic ? 'RULE SET' : 'DEFAULT'}</span>
            </div>
            <div class="zone-body" style="grid-template-columns: 1fr; gap:0;">
                <div style="padding: 0 24px 24px 24px; display:flex; flex-direction:column; gap:14px;">
                    <div>
                        <label class="editor-label">
                            <span class="editor-label-icon">📝</span>
                            <span>Enter your lighting rules</span>
                            <span class="editor-label-lang">SMART-LANG</span>
                        </label>
                        <div class="code-editor" id="code-editor">
                            <div class="code-editor-toolbar">
                                <div class="toolbar-left">
                                    <span class="toolbar-dot red"></span>
                                    <span class="toolbar-dot yellow"></span>
                                    <span class="toolbar-dot green"></span>
                                    <span class="toolbar-filename">rules.smart</span>
                                </div>
                                <div class="toolbar-right">
                                    <span class="toolbar-lines" id="editor-line-count">0 rules</span>
                                    <span class="toolbar-lang">Smart City DSL</span>
                                </div>
                            </div>
                            <div class="code-editor-body">
                                <div class="line-numbers" id="line-numbers"></div>
                                <div class="code-input-wrapper">
                                    <textarea id="ctrl-lights-logic" class="code-textarea" spellcheck="false" placeholder="Turn on mosque lights at 18:00 and turn them off at 23:00.&#10;Keep floor1 on between 20:00 and 06:00.&#10;Turn castle lights on when gas is safe.&#10;Switch on street lamps when light is below 2000.">${t.city_lights_logic || ''}</textarea>
                                    <div class="code-highlight-overlay" id="code-highlight-overlay"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="editor-actions">
                        <div class="editor-actions-left">
                            <button class="btn-action btn-apply-logic" id="btn-apply-logic">⚡ Apply Rules</button>
                            <button class="btn-action btn-ghost" id="btn-clear-logic">🗑️ Clear</button>
                        </div>
                        <span id="logic-save-status" class="logic-save-indicator">✓ Rules Applied!</span>
                    </div>
                    <div id="logic-feedback" class="logic-feedback"></div>
                </div>
            </div>
        </div>`;

        // ─── Logic Page Event Bindings ───
        initCodeEditor();

        document.getElementById('btn-apply-logic')?.addEventListener('click', () => {
            const logic = document.getElementById('ctrl-lights-logic')?.value?.trim();
            if (!logic) return;
            const feedbackEl = document.getElementById('logic-feedback');
            const statusEl = document.getElementById('logic-save-status');
            const badge    = document.getElementById('logic-status-badge');

            apiPost('/api/command', { action: 'city_lights_logic', logic }).then((data) => {
                state.telemetry.city_lights_logic = logic;

                if (data.errors && data.errors.length > 0) {
                    // Show errors
                    let errHtml = `<div class="feedback-header feedback-error">⚠️ ${data.errors.length} syntax error${data.errors.length > 1 ? 's' : ''} found</div>`;
                    errHtml += '<div class="feedback-errors">';
                    data.errors.forEach(err => {
                        errHtml += `<div class="feedback-error-line"><span class="error-line-num">Line ${err.line}</span><span class="error-text">${err.text}</span><span class="error-msg">${err.error}</span></div>`;
                    });
                    errHtml += '</div>';
                    if (data.parsed_count > 0) {
                        errHtml += `<div class="feedback-partial">✓ ${data.parsed_count} rule${data.parsed_count > 1 ? 's' : ''} applied successfully</div>`;
                    }
                    if (feedbackEl) { feedbackEl.innerHTML = errHtml; feedbackEl.className = 'logic-feedback visible has-errors'; }
                    if (badge) { badge.textContent = 'PARTIAL'; badge.className = 'card-badge badge-danger'; }
                } else {
                    // All rules parsed OK
                    let okHtml = `<div class="feedback-header feedback-success">✅ ${data.parsed_count} rule${data.parsed_count > 1 ? 's' : ''} parsed and applied successfully</div>`;
                    if (data.parsed_rules) {
                        okHtml += '<div class="feedback-rules">';
                        data.parsed_rules.forEach(r => {
                            let desc = `<span class="hl-keyword">${r.action.toUpperCase()}</span> → `;
                            desc += r.zones.map(z => `<span class="hl-zone">${z}</span>`).join(', ');
                            if (r.time_from) desc += ` <span class="hl-time">${r.time_from} – ${r.time_to}</span>`;
                            if (r.condition) desc += ` <span class="hl-condition">${r.condition.replace(/_/g, ' ')}</span>`;
                            okHtml += `<div class="feedback-rule-line">${desc}</div>`;
                        });
                        okHtml += '</div>';
                    }
                    if (feedbackEl) { feedbackEl.innerHTML = okHtml; feedbackEl.className = 'logic-feedback visible'; }
                    if (statusEl) { statusEl.classList.add('visible'); setTimeout(() => { statusEl.classList.remove('visible'); }, 2500); }
                    if (badge) { badge.textContent = 'RULE SET'; badge.className = 'card-badge badge-active'; }
                }
            });
        });
        document.getElementById('btn-clear-logic')?.addEventListener('click', () => {
            const ta = document.getElementById('ctrl-lights-logic');
            if (ta) ta.value = '';
            state.telemetry.city_lights_logic = '';
            const badge = document.getElementById('logic-status-badge');
            const feedbackEl = document.getElementById('logic-feedback');
            if (badge) { badge.textContent = 'DEFAULT'; badge.className = 'card-badge badge-inactive'; }
            if (feedbackEl) { feedbackEl.innerHTML = ''; feedbackEl.className = 'logic-feedback'; }
            apiPost('/api/command', { action: 'city_lights_logic', logic: '' });
            updateCodeHighlight();
        });
    }

    function renderToggle(zone, icon, label, isOn) {
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


    // ─── LIVE UI UPDATES (without re-rendering the whole page) ───

    function updateDashboardUI() {
        if (!state.token || state.page !== 'home') return;

        const t = state.telemetry;
        const il = state.illumination;

        // Gas
        const gasVal = document.getElementById('gas-value');
        const gasBar = document.getElementById('gas-bar');
        const gasBadge = document.getElementById('gas-badge');
        const gasCard = document.getElementById('card-gas');

        if (gasVal) {
            const gasLevel = t.gas || 0;
            const gasPercent = Math.min(100, (gasLevel / 4095) * 100);
            const gasClass = gasLevel > (t.gas_threshold || 1000) ? 'danger' : gasLevel > 600 ? 'warning' : 'safe';
            const gasDanger = t.gas_danger || false;

            gasVal.textContent = gasLevel;
            gasVal.className = 'gas-value ' + gasClass;

            if (gasBar) {
                gasBar.style.width = gasPercent + '%';
                gasBar.className = 'gas-bar-fill ' + gasClass;
            }

            if (gasBadge) {
                gasBadge.textContent = gasDanger ? 'DANGER' : 'SAFE';
                gasBadge.className = 'card-badge ' + (gasDanger ? 'badge-danger' : 'badge-safe');
            }

            if (gasCard) {
                gasCard.classList.toggle('gas-danger', gasDanger);
            }
        }

        // Parking
        updateSlot('1', t.ir1);
        updateSlot('2', t.ir2);

        const parkingBadge = document.getElementById('parking-badge');
        if (parkingBadge) {
            const both = t.ir1 && t.ir2;
            const one  = t.ir1 || t.ir2;
            parkingBadge.textContent = both ? 'FULL' : one ? '1 PARKED' : 'EMPTY';
            parkingBadge.className   = 'card-badge ' + (both ? 'badge-danger' : (one ? 'badge-active' : 'badge-safe'));
        }

        updateIlluminationUI();

        // Speaker
        const speakerDot = document.getElementById('speaker-dot');
        const speakerText = document.getElementById('speaker-status-text');
        const speakerBadge = document.getElementById('speaker-badge');
        const volBar = document.getElementById('vol-bar');
        const volValue = document.getElementById('vol-value');

        if (speakerDot) {
            speakerDot.className = 'dot ' + (t.speaker_active ? 'active' : 'inactive');
        }
        if (speakerText) {
            speakerText.textContent = t.speaker_active ? 'Athan Playing' : 'Speaker Idle';
        }
        if (speakerBadge) {
            speakerBadge.textContent = t.speaker_active ? 'PLAYING' : 'IDLE';
            speakerBadge.className = 'card-badge ' + (t.speaker_active ? 'badge-active' : 'badge-inactive');
        }
        if (volBar) {
            volBar.style.width = ((t.speaker_volume / 30) * 100) + '%';
        }
        if (volValue) {
            volValue.textContent = t.speaker_volume;
        }

        // --- Dynamo-render SVGs ---
        const homeCont = document.getElementById('svg-home-container');
        if (homeCont) homeCont.innerHTML = svgHome(il, gasDanger);

        const mosqueCont = document.getElementById('svg-mosque-container');
        if (mosqueCont) mosqueCont.innerHTML = svgMosque(il, t.speaker_active);

        const castleCont = document.getElementById('svg-castle-container');
        if (castleCont) castleCont.innerHTML = svgCastle(il, t.ir1, t.ir2);

        const streetCont = document.getElementById('svg-street-container');
        if (streetCont) streetCont.innerHTML = svgStreet(t.light);
    }

    function updateSlot(slotNum, isParked) {
        const badge = document.getElementById('slot' + slotNum + '-badge');
        const text  = document.getElementById('slot' + slotNum + '-text');
        if (badge) {
            badge.textContent  = isParked ? 'PARKED' : 'EMPTY';
            badge.className    = 'card-badge ' + (isParked ? 'badge-danger' : 'badge-safe');
        }
        if (text) {
            text.textContent   = isParked ? '🚘 Occupied' : '✅ Available';
            text.style.color   = isParked ? 'var(--accent-red)' : 'var(--accent-green)';
        }
    }

    function updateIlluminationUI() {
        const grid = document.getElementById('illum-grid');
        if (!grid) return;
        const il = state.illumination;
        grid.innerHTML =
            renderZone('floor1', 'Home Floor 1', il.floor1) +
            renderZone('floor2', 'Home Floor 2', il.floor2) +
            renderZone('castle', 'Castle Outside', il.castle) +
            renderZone('mosque', 'Mosque Lights', il.mosque);
    }

    function updateClockUI() {
        const clockEl = document.getElementById('city-clock-time');
        const speedEl = document.getElementById('city-clock-speed');
        if (clockEl) clockEl.textContent = state.cityTime.formatted;
        if (speedEl) {
            speedEl.innerHTML = state.cityTime.speed > 1
                ? `<span class="speed-badge">${state.cityTime.speed}x</span>`
                : '';
        }
    }


    // ─── Code Editor — Syntax Highlighting Engine ───

    function highlightSyntax(text) {
        if (!text) return '';
        // Escape HTML first
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Time patterns: HH:MM (24hr)
        html = html.replace(/\b(\d{1,2}:\d{2})\b/g, '<span class="hl-time">$1</span>');

        // Keywords: turn on, turn off, keep, always on, always off, switch on, switch off, set, enable, disable
        html = html.replace(/\b(turn\s+on|turn\s+off|turn\s+them\s+on|turn\s+them\s+off|switch\s+on|switch\s+off|keep|always\s+on|always\s+off|set|enable|disable)\b/gi,
            '<span class="hl-keyword">$1</span>');

        // Zone names
        html = html.replace(/\b(floor1|floor2|floor\s*1|floor\s*2|castle|mosque|street|home)\b/gi,
            '<span class="hl-zone">$1</span>');

        // Sensor / state words
        html = html.replace(/\b(gas|light|ldr|safe|danger|dark|bright|night|day|level|sensor|threshold|detected|clear)\b/gi,
            '<span class="hl-sensor">$1</span>');

        // Conditionals: when, during, if, while, until, after, before
        html = html.replace(/\b(when|during|if|while|until|after|before)\b/gi,
            '<span class="hl-condition">$1</span>');

        // Logical operators: and, or, not, from, to, between, at, is, above, below
        html = html.replace(/\b(and|or|not|from|to|between|at|is|are|above|below|than|the)\b/gi,
            '<span class="hl-operator">$1</span>');

        // Lights keyword
        html = html.replace(/\b(lights?|lamp|lamps)\b/gi,
            '<span class="hl-light">$1</span>');

        // Numbers (standalone)
        html = html.replace(/(?<![\w:-])(\d+)(?![\w:])/g,
            '<span class="hl-number">$1</span>');

        // Punctuation
        html = html.replace(/([.;,!()])/g,
            '<span class="hl-punct">$1</span>');

        return html;
    }

    function updateCodeHighlight() {
        const textarea = document.getElementById('ctrl-lights-logic');
        const overlay = document.getElementById('code-highlight-overlay');
        const lineNums = document.getElementById('line-numbers');
        const lineCount = document.getElementById('editor-line-count');

        if (!textarea || !overlay) return;

        const text = textarea.value;
        const lines = text.split('\n');
        const count = lines.length;

        // Update highlight overlay
        const highlighted = lines.map(line => highlightSyntax(line) || '&nbsp;').join('\n');
        overlay.innerHTML = highlighted + '\n';

        // Update line numbers
        if (lineNums) {
            let numsHtml = '';
            for (let i = 1; i <= Math.max(count, 4); i++) {
                numsHtml += `<div class="line-num ${i <= count ? '' : 'dim'}">${i}</div>`;
            }
            lineNums.innerHTML = numsHtml;
        }

        // Update line count badge
        if (lineCount) {
            const realLines = lines.filter(l => l.trim().length > 0).length;
            lineCount.textContent = `${realLines} rule${realLines !== 1 ? 's' : ''}`;
        }
    }

    function syncEditorScroll() {
        const textarea = document.getElementById('ctrl-lights-logic');
        const overlay = document.getElementById('code-highlight-overlay');
        const lineNums = document.getElementById('line-numbers');
        if (!textarea) return;
        if (overlay) {
            overlay.scrollTop = textarea.scrollTop;
            overlay.scrollLeft = textarea.scrollLeft;
        }
        if (lineNums) {
            lineNums.scrollTop = textarea.scrollTop;
        }
    }

    function initCodeEditor() {
        const textarea = document.getElementById('ctrl-lights-logic');
        if (!textarea) return;

        // Initial render
        updateCodeHighlight();

        // Live update on typing
        textarea.addEventListener('input', updateCodeHighlight);
        textarea.addEventListener('scroll', syncEditorScroll);

        // Tab key support inside textarea
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 4;
                updateCodeHighlight();
            }
        });
    }


    // ─── Initialization ───
    function init() {
        render();
        if (state.token) {
            connectSocket();
            startPolling();
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
