/* ═══════════════════════════════════════════════════════════
   editor.js — Syntax highlighting & code editor logic
   ═══════════════════════════════════════════════════════════ */

export function highlightSyntax(text, searchTerm = '') {
    if (!text) return '';
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    html = html.replace(/\b(\d{1,2}:\d{2})\b/g, '<span class="hl-time">$1</span>');
    html = html.replace(/\b(turn\s+on|turn\s+off|turn\s+them\s+on|turn\s+them\s+off|turned\s+on|turned\s+off|switch\s+on|switch\s+off|keep|always\s+on|always\s+off|set|enable|disable|wait|sleep)\b/gi,
        '<span class="hl-keyword">$1</span>');
    html = html.replace(/\b(floor1|floor2|floor\s*1|floor\s*2|castle|mosque|street|home)\b/gi,
        '<span class="hl-zone">$1</span>');
    html = html.replace(/\b(gas|light|ldr|safe|danger|dark|bright|night|day|level|sensor|threshold|detected|clear)\b/gi,
        '<span class="hl-sensor">$1</span>');
    html = html.replace(/\b(when|during|if|while|until|after|before|continue|break|loop|end\s+loop|end|break\s+when)\b/gi,
        '<span class="hl-condition">$1</span>');
    html = html.replace(/\b(and|or|not|from|to|between|at|is|are|above|below|than|the)\b/gi,
        '<span class="hl-operator">$1</span>');
    html = html.replace(/\b(lights?|lamp|lamps)\b/gi,
        '<span class="hl-light">$1</span>');
    html = html.replace(/(?<![\w:-])(\d+)(?![\w:])/g,
        '<span class="hl-number">$1</span>');
    html = html.replace(/([.;,!()])/g,
        '<span class="hl-punct">$1</span>');

    if (searchTerm) {
        // Highlight search term safely outside of HTML tags
        const re = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
        html = html.replace(/>([^<]+)</g, function (match, p1) {
            return '>' + p1.replace(re, '<mark class="hl-search">$1</mark>') + '<';
        });
        // Also handle the case where the whole line is text (no tags) or text at the boundaries
        // To be completely safe, we wrap the entire html in dummy tags first:
        let wrapped = `<span>${html}</span>`;
        wrapped = wrapped.replace(/>([^<]+)</g, function (match, p1) {
            return '>' + p1.replace(re, '<mark class="hl-search">$1</mark>') + '<';
        });
        html = wrapped.substring(6, wrapped.length - 7);
    }

    return html;
}

export function updateCodeHighlight(searchTerm = '') {
    const textarea = document.getElementById('ctrl-lights-logic');
    const overlay = document.getElementById('code-highlight-overlay');
    const lineNums = document.getElementById('line-numbers');
    const lineCount = document.getElementById('editor-line-count');
    if (!textarea || !overlay) return;

    const lines = textarea.value.split('\n');
    const count = lines.length;

    overlay.innerHTML = lines.map(l => highlightSyntax(l, searchTerm) || '&nbsp;').join('\n') + '\n';

    if (lineNums) {
        let html = '';
        for (let i = 1; i <= Math.max(count, 4); i++) {
            html += `<div class="line-num ${i <= count ? '' : 'dim'}">${i}</div>`;
        }
        lineNums.innerHTML = html;
    }

    if (lineCount) {
        const real = lines.filter(l => l.trim().length > 0).length;
        lineCount.textContent = `${real} rule${real !== 1 ? 's' : ''}`;
    }

    syncEditorScroll();
}

export function syncEditorScroll() {
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

export function initCodeEditor() {
    const textarea = document.getElementById('ctrl-lights-logic');
    if (!textarea) return;
    updateCodeHighlight();
    textarea.addEventListener('input', () => updateCodeHighlight());
    textarea.addEventListener('scroll', syncEditorScroll);
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = textarea.selectionStart, end = textarea.selectionEnd;
            textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + 4;
            updateCodeHighlight();
        }
    });
}
