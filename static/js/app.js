/* ═══════════════════════════════════════════════════════════
   app.js — Entry point (ES module)
   Imports and wires up all modules, then boots the app.
   ═══════════════════════════════════════════════════════════ */

import { state }        from './state.js';
import { render }       from './router.js';
import { connectSocket, startPolling } from './socket.js';

function init() {
    render();
    if (state.token) {
        connectSocket();
        startPolling();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
