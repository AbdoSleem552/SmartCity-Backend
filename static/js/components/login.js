/* ═══════════════════════════════════════════════════════════
   components/login.js — Login page renderer
   ═══════════════════════════════════════════════════════════ */

import { state, app } from '../state.js';
import { connectSocket } from '../socket.js';
import { startPolling } from '../socket.js';
import { navigate } from '../router.js';

export function renderLogin() {
    app.innerHTML = `
    <div class="login-page">
        <div class="login-card">
            <div class="login-brand">
                <span class="city-icon">🏙️</span>
                <h1>Smart City</h1>
                <p>Intelligent Urban Control System</p>
            </div>
            <div class="login-error" id="login-error">Invalid username or password</div>
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
        const btn   = document.getElementById('btn-login');
        const errEl = document.getElementById('login-error');

        btn.textContent = 'Signing in…';
        btn.disabled = true;

        try {
            const res  = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();

            if (res.ok && data.token) {
                state.token    = data.token;
                state.username = data.username;
                sessionStorage.setItem('sc_token', data.token);
                sessionStorage.setItem('sc_user',  data.username);
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
