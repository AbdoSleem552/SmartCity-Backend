/* ═══════════════════════════════════════════════════════════
   components/svg.js — SVG city illustration functions
   ═══════════════════════════════════════════════════════════ */

export function svgDefs() {
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
            <stop offset="0%"   stop-color="#0a1628"/>
            <stop offset="100%" stop-color="#141e33"/>
        </linearGradient>
        <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="#1a2035"/>
            <stop offset="100%" stop-color="#0f1520"/>
        </linearGradient>
        <linearGradient id="car1Grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#0077b6"/>
            <stop offset="100%" stop-color="#00d4ff"/>
        </linearGradient>
        <linearGradient id="car2Grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#db2777"/>
            <stop offset="100%" stop-color="#ff3366"/>
        </linearGradient>
    </defs>`;
}

export function svgHome(il, gasDanger) {
    const f1 = il.floor1, f2 = il.floor2;
    const wColor = on => on ? '#ffdd57' : '#1a2035';
    const wOp    = on => on ? '0.9' : '0.5';
    const glowF  = on => on ? 'url(#windowGlow)' : 'none';
    return `<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg">
        ${svgDefs()}
        <rect width="240" height="200" fill="url(#skyGrad)" rx="12"/>
        <rect x="0" y="155" width="240" height="45" fill="url(#groundGrad)" rx="0"/>
        <rect x="50" y="60" width="140" height="95" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1"/>
        <polygon points="40,62 120,15 200,62" fill="#2d3a52" stroke="#475569" stroke-width="1"/>
        <polygon points="60,62 120,25 180,62" fill="#253349"/>
        <rect x="150" y="22" width="16" height="32" rx="2" fill="#2d3a52" stroke="#475569" stroke-width="1"/>
        <rect id="svg-home-f2-w1" x="72"  y="72" width="26" height="22" rx="3" fill="${wColor(f2)}" opacity="${wOp(f2)}" filter="${glowF(f2)}"/>
        <rect id="svg-home-f2-w2" x="107" y="72" width="26" height="22" rx="3" fill="${wColor(f2)}" opacity="${wOp(f2)}" filter="${glowF(f2)}"/>
        <rect id="svg-home-f2-w3" x="142" y="72" width="26" height="22" rx="3" fill="${wColor(f2)}" opacity="${wOp(f2)}" filter="${glowF(f2)}"/>
        <line x1="55" y1="105" x2="185" y2="105" stroke="#334155" stroke-width="1"/>
        <rect id="svg-home-f1-w1" x="72"  y="112" width="26" height="26" rx="3" fill="${wColor(f1)}" opacity="${wOp(f1)}" filter="${glowF(f1)}"/>
        <rect id="svg-home-f1-w2" x="142" y="112" width="26" height="26" rx="3" fill="${wColor(f1)}" opacity="${wOp(f1)}" filter="${glowF(f1)}"/>
        <rect x="104" y="118" width="24" height="37" rx="3" fill="#162032" stroke="#334155" stroke-width="1"/>
        <circle cx="124" cy="138" r="2" fill="#475569"/>
        <text x="196" y="90"  fill="#64748b" font-size="8" font-family="Inter,sans-serif" font-weight="600">F2</text>
        <text x="196" y="132" fill="#64748b" font-size="8" font-family="Inter,sans-serif" font-weight="600">F1</text>
        <g id="svg-gas-cloud" opacity="${gasDanger ? '1' : '0'}" style="transition:opacity 0.5s ease">
            <ellipse cx="172" cy="18" rx="14" ry="8" fill="#ff3366" opacity="0.3"/>
            <ellipse cx="165" cy="14" rx="10" ry="6" fill="#ff3366" opacity="0.25"/>
            <text x="160" y="20" fill="#ff3366" font-size="7" font-weight="bold" font-family="Inter,sans-serif">GAS</text>
        </g>
    </svg>`;
}

export function svgMosque(il, speakerActive) {
    const lit = il.mosque;
    const lColor = lit ? '#ffdd57' : '#1a2035';
    const lOp    = lit ? '0.85' : '0.4';
    const glowF  = lit ? 'url(#windowGlow)' : 'none';
    const spkColor = speakerActive ? '#00e88f' : '#475569';
    return `<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg">
        ${svgDefs()}
        <rect width="240" height="200" fill="url(#skyGrad)" rx="12"/>
        <rect x="0" y="155" width="240" height="45" fill="url(#groundGrad)"/>
        <rect x="55" y="80" width="130" height="75" rx="3" fill="#1e293b" stroke="#334155" stroke-width="1"/>
        <ellipse cx="120" cy="82" rx="50" ry="32" fill="#253349" stroke="#475569" stroke-width="1"/>
        <ellipse cx="120" cy="82" rx="38" ry="24" fill="#2d3a52"/>
        <circle cx="120" cy="52" r="6" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
        <circle cx="122" cy="51" r="5" fill="#253349"/>
        <line x1="120" y1="58" x2="120" y2="50" stroke="#64748b" stroke-width="1.5"/>
        <rect x="32"  y="45" width="18" height="110" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1"/>
        <ellipse cx="41"  cy="46" rx="11" ry="8" fill="#253349" stroke="#475569" stroke-width="1"/>
        <circle cx="41" cy="38" r="3" fill="${lColor}" opacity="${lOp}"/>
        <rect x="190" y="45" width="18" height="110" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1"/>
        <ellipse cx="199" cy="46" rx="11" ry="8" fill="#253349" stroke="#475569" stroke-width="1"/>
        <circle cx="199" cy="38" r="3" fill="${lColor}" opacity="${lOp}"/>
        <rect id="svg-mosque-w1" x="75"  y="105" width="20" height="28" rx="10" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
        <rect id="svg-mosque-w2" x="110" y="105" width="20" height="28" rx="10" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
        <rect id="svg-mosque-w3" x="145" y="105" width="20" height="28" rx="10" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
        <rect x="108" y="128" width="24" height="27" rx="12" fill="#162032" stroke="#334155" stroke-width="1"/>
        <g id="svg-speaker-indicator" transform="translate(26,60)">
            <rect x="0" y="0" width="12" height="8" rx="2" fill="${spkColor}" opacity="0.8"/>
            <polygon points="12,0 18,-3 18,11 12,8" fill="${spkColor}" opacity="0.6"/>
            ${speakerActive ? `<path d="M20,0 Q24,4 20,8" fill="none" stroke="${spkColor}" stroke-width="1" opacity="0.5" class="svg-glow"/>
            <path d="M22,-2 Q28,4 22,10" fill="none" stroke="${spkColor}" stroke-width="1" opacity="0.3" class="svg-glow"/>` : ''}
        </g>
    </svg>`;
}

export function svgCastle(il, ir1, ir2) {
    const lit    = il.castle;
    const lColor = lit ? '#c4a6ff' : '#1a2035';
    const lOp    = lit ? '0.85' : '0.4';
    const glowF  = lit ? 'url(#windowGlow)' : 'none';
    return `<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg">
        ${svgDefs()}
        <rect width="240" height="200" fill="url(#skyGrad)" rx="12"/>
        <rect x="0" y="155" width="240" height="45" fill="url(#groundGrad)"/>
        <rect x="55" y="65" width="130" height="90" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1"/>
        <rect x="55" y="58" width="18" height="12" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
        <rect x="82" y="58" width="18" height="12" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
        <rect x="109" y="58" width="22" height="12" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
        <rect x="140" y="58" width="18" height="12" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
        <rect x="167" y="58" width="18" height="12" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
        <rect x="38" y="38" width="30" height="117" rx="1" fill="#222d42" stroke="#334155" stroke-width="1"/>
        <rect x="38" y="31" width="8"  height="10" fill="#222d42" stroke="#334155" stroke-width="0.8"/>
        <rect x="52" y="31" width="8"  height="10" fill="#222d42" stroke="#334155" stroke-width="0.8"/>
        <rect x="45" y="31" width="8"  height="10" fill="#222d42" stroke="#334155" stroke-width="0.8"/>
        <rect x="172" y="38" width="30" height="117" rx="1" fill="#222d42" stroke="#334155" stroke-width="1"/>
        <rect x="172" y="31" width="8"  height="10" fill="#222d42" stroke="#334155" stroke-width="0.8"/>
        <rect x="186" y="31" width="8"  height="10" fill="#222d42" stroke="#334155" stroke-width="0.8"/>
        <rect x="179" y="31" width="8"  height="10" fill="#222d42" stroke="#334155" stroke-width="0.8"/>
        <rect x="47"  y="55" width="12" height="16" rx="6" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
        <rect x="181" y="55" width="12" height="16" rx="6" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
        <rect id="svg-castle-w1" x="72"  y="80" width="16" height="22" rx="8" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
        <rect id="svg-castle-w2" x="112" y="80" width="16" height="22" rx="8" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
        <rect id="svg-castle-w3" x="152" y="80" width="16" height="22" rx="8" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
        <rect x="103" y="115" width="34" height="40" rx="17" fill="#0f1520" stroke="#334155" stroke-width="1"/>
        <line x1="120" y1="120" x2="120" y2="155" stroke="#334155" stroke-width="0.8"/>
        <rect x="20" y="160" width="80" height="24" rx="3" fill="rgba(255,255,255,0.03)" stroke="#334155" stroke-width="0.5" stroke-dasharray="3,2"/>
        <text x="48" y="171" fill="#475569" font-size="5" font-family="Inter,sans-serif" text-anchor="middle">PARKING</text>
        <g id="svg-car-1" class="svg-car ${ir1 ? 'visible' : 'hidden'}">
            <!-- Shadow -->
            <ellipse cx="38" cy="182" rx="14" ry="2" fill="#000" opacity="0.5"/>
            <!-- Body -->
            <path d="M25,178 Q24,178 24,176 L25,173 Q26,170 30,169 L36,168 L45,171 Q49,172 51,174 L52,176 Q52,178 48,178 Z" fill="url(#car1Grad)"/>
            <!-- Windows -->
            <path d="M30,169.5 L36,168.5 L38,171.5 L28,171.5 Z" fill="#0a0f18"/>
            <path d="M39,169 L44,171.5 L39,171.5 Z" fill="#0a0f18"/>
            <!-- Wheels -->
            <circle cx="30" cy="178" r="3.5" fill="#0f1520" stroke="#334155" stroke-width="1"/>
            <circle cx="30" cy="178" r="1" fill="#00d4ff"/>
            <circle cx="45" cy="178" r="3.5" fill="#0f1520" stroke="#334155" stroke-width="1"/>
            <circle cx="45" cy="178" r="1" fill="#00d4ff"/>
            <!-- Lights -->
            <rect x="50" y="174" width="2" height="1.5" rx="0.5" fill="#fff" filter="url(#windowGlow)"/>
            <rect x="23.5" y="174" width="2" height="1.5" rx="0.5" fill="#ff3366"/>
        </g>
        <g id="svg-car-2" class="svg-car ${ir2 ? 'visible' : 'hidden'}">
            <!-- Shadow -->
            <ellipse cx="76" cy="182" rx="14" ry="2" fill="#000" opacity="0.5"/>
            <!-- Body -->
            <path d="M63,178 Q62,178 62,176 L63,173 Q64,170 68,169 L74,168 L83,171 Q87,172 89,174 L90,176 Q90,178 86,178 Z" fill="url(#car2Grad)"/>
            <!-- Windows -->
            <path d="M68,169.5 L74,168.5 L76,171.5 L66,171.5 Z" fill="#0a0f18"/>
            <path d="M77,169 L82,171.5 L77,171.5 Z" fill="#0a0f18"/>
            <!-- Wheels -->
            <circle cx="68" cy="178" r="3.5" fill="#0f1520" stroke="#334155" stroke-width="1"/>
            <circle cx="68" cy="178" r="1" fill="#ff3366"/>
            <circle cx="83" cy="178" r="3.5" fill="#0f1520" stroke="#334155" stroke-width="1"/>
            <circle cx="83" cy="178" r="1" fill="#ff3366"/>
            <!-- Lights -->
            <rect x="88" y="174" width="2" height="1.5" rx="0.5" fill="#fff" filter="url(#windowGlow)"/>
            <rect x="61.5" y="174" width="2" height="1.5" rx="0.5" fill="#00d4ff"/>
        </g>
        <circle cx="53"  cy="35" r="3" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
        <circle cx="187" cy="35" r="3" fill="${lColor}" opacity="${lOp}" filter="${glowF}"/>
    </svg>`;
}

export function svgStreet(lightLevel) {
    const bright   = lightLevel < 2000;
    const lampColor = bright ? '#ffdd57' : '#475569';
    const lampOp    = bright ? '0.9' : '0.3';
    const glowF     = bright ? 'url(#lampGlow)' : 'none';
    const lampCone  = bright ? 'rgba(255,221,87,0.06)' : 'rgba(255,255,255,0.01)';
    return `<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg">
        ${svgDefs()}
        <rect width="240" height="200" fill="url(#skyGrad)" rx="12"/>
        <rect x="0" y="140" width="240" height="60" fill="#141820" rx="0"/>
        <rect x="0" y="138" width="240" height="4"  fill="#2a3040"/>
        <rect x="20"  y="168" width="30" height="3" rx="1" fill="#2a3040"/>
        <rect x="70"  y="168" width="30" height="3" rx="1" fill="#2a3040"/>
        <rect x="120" y="168" width="30" height="3" rx="1" fill="#2a3040"/>
        <rect x="170" y="168" width="30" height="3" rx="1" fill="#2a3040"/>
        <rect x="0" y="134" width="240" height="6" fill="#1e2636"/>
        <rect x="58" y="52" width="4"  height="84" fill="#334155"/>
        <rect x="50" y="48" width="20" height="6"  rx="3" fill="#3b4a63"/>
        <ellipse cx="60" cy="46" rx="10" ry="5" fill="${lampColor}" opacity="${lampOp}" filter="${glowF}"/>
        <polygon points="50,51 70,51 80,136 40,136" fill="${lampCone}"/>
        <rect x="158" y="52" width="4"  height="84" fill="#334155"/>
        <rect x="150" y="48" width="20" height="6"  rx="3" fill="#3b4a63"/>
        <ellipse cx="160" cy="46" rx="10" ry="5" fill="${lampColor}" opacity="${lampOp}" filter="${glowF}"/>
        <polygon points="150,51 170,51 180,136 140,136" fill="${lampCone}"/>
        <g transform="translate(105,82)">
            <rect x="0" y="0" width="30" height="20" rx="4" fill="#1e293b" stroke="#475569" stroke-width="0.8"/>
            <circle cx="15" cy="10" r="6" fill="#253349" stroke="#00d4ff" stroke-width="0.8" opacity="0.6"/>
            <text x="15" y="28" fill="#64748b" font-size="6" font-family="Inter,sans-serif" text-anchor="middle">LDR</text>
        </g>
        <circle cx="30"  cy="20" r="1" fill="#fff" opacity="0.3"/>
        <circle cx="90"  cy="30" r="1" fill="#fff" opacity="0.2"/>
        <circle cx="180" cy="15" r="1" fill="#fff" opacity="0.4"/>
        <circle cx="210" cy="35" r="1" fill="#fff" opacity="0.2"/>
        <circle cx="140" cy="22" r="1" fill="#fff" opacity="0.3"/>
    </svg>`;
}
