/* ═══════════════════════════════════════════════════════════
   router.js — Page navigation & shell renderer
   ═══════════════════════════════════════════════════════════ */

import { state, app } from './state.js';
import { renderLogin } from './components/login.js';
import { renderHomePage }    from './pages/home.js';
import { renderControlPage } from './pages/control.js';
import { renderLogicPage }   from './pages/logic.js';
import { renderDocsPage }    from './pages/docs.js';
import { stopPolling } from './socket.js';
import { apiPost }     from './api.js';

export function navigate(page) {
    state.page = page;
    render();
}

export function render() {
    if (!state.token) {
        renderLogin();
    } else if (state.page === 'control') {
        renderShell(renderControlPage);
    } else if (state.page === 'logic') {
        renderShell(renderLogicPage);
    } else if (state.page === 'docs') {
        renderShell(renderDocsPage);
    } else {
        renderShell(renderHomePage);
    }
}

export function renderShell(pageRenderer) {
    const speedText = state.cityTime.speed > 1
        ? `<span class="speed-badge">${state.cityTime.speed}x</span>` : '';

    app.innerHTML = `
    <nav class="top-nav">
        <div class="nav-brand">
            <span class="icon">🏙️</span>
            <h2>Smart City</h2>
            <span id="conn-dot" class="connection-dot ${state.connected ? 'connected' : 'disconnected'}"></span>
        </div>
        <div class="nav-links">
            <button class="nav-link ${state.page==='home'    ? 'active':''}" id="nav-home">🏠 Home</button>
            <button class="nav-link ${state.page==='control' ? 'active':''}" id="nav-control">🎛️ Control</button>
            <button class="nav-link ${state.page==='logic'   ? 'active':''}" id="nav-logic">📝 Logic</button>
            <button class="nav-link ${state.page==='docs'    ? 'active':''}" id="nav-docs">📖 Docs</button>
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

    document.getElementById('nav-home')?.addEventListener('click',    () => navigate('home'));
    document.getElementById('nav-control')?.addEventListener('click', () => navigate('control'));
    document.getElementById('nav-logic')?.addEventListener('click',   () => navigate('logic'));
    document.getElementById('nav-docs')?.addEventListener('click',    () => navigate('docs'));
    document.getElementById('btn-logout')?.addEventListener('click',  () => {
        apiPost('/api/logout', {}).catch(() => {});
        state.token    = null;
        state.username = null;
        sessionStorage.removeItem('sc_token');
        sessionStorage.removeItem('sc_user');
        stopPolling();
        if (state.socket) state.socket.disconnect();
        navigate('home');
    });

    pageRenderer();
}
