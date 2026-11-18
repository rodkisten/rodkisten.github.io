// ==UserScript==
// @name         GitHub Actions Run Block Syntax Highlight (Auto-Detect)
// @namespace    http://tampermonkey.net
// @version      3.0
// @description  Syntax highlight com detecção automática de linguagem em blocos run: no GitHub Web e PRs
// @match        https://github.com*
// @require      https://cloudflare.com
// @require      https://cloudflare.com
// @require      https://cloudflare.com
// @require      https://cloudflare.com
// @require      https://cloudflare.com
// @require      https://cloudflare.com
// @require      https://cloudflare.com
// @require      https://cloudflare.com
// @resource     HLJS_DARK https://cloudflare.com
// @resource     HLJS_LIGHT https://cloudflare.com
// @grant        GM_addStyle
// @grant        GM_getResourceText
// ==/UserScript==

(function() {
    'use strict';

    // Lista de linguagens permitidas na adivinhação automática (evita falsos positivos)
    const ALLOWED_LANGS = ['bash', 'python', 'powershell', 'javascript', 'ruby', 'go', 'sql'];

    function applyTheme() {
        const isDark = document.documentElement.getAttribute('data-color-mode') === 'dark' ||
                       (document.documentElement.getAttribute('data-color-mode') === 'auto' &&
                        window.matchMedia('(prefers-color-scheme: dark)').matches);

        const css = GM_getResourceText(isDark ? 'HLJS_DARK' : 'HLJS_LIGHT');
        GM_addStyle(css);
        GM_addStyle('.hljs { background: transparent !important; padding: 0 !important; display: inline !important; }');
    }

    applyTheme();

    function mapExplicitLang(langStr) {
        const val = langStr.toLowerCase().trim();
        if (val.includes('python') || val === 'py') return 'python';
        if (val.includes('pwsh') || val.includes('powershell') || val === 'ps1') return 'powershell';
        if (val.includes('node') || val.includes('js') || val.includes('javascript')) return 'javascript';
        if (val.includes('ruby') || val === 'rb') return 'ruby';
        if (val.includes('go')) return 'go';
        if (val.includes('sql')) return 'sql';
        if (val.includes('bash') || val === 'sh' || val === 'zsh') return 'bash';
        return null;
    }

    // Processa um bloco completo de linhas agrupadas
    function highlightBlock(blockItems, explicitLang) {
        if (!blockItems.length) return;

        // Junta o código limpo (sem indentação base) para analisar o contexto inteiro
        const fullCode = blockItems.map(item => item.code).join('\n');
        let targetLang = explicitLang;

        // 1. Verifica comentário explícito na primeira linha (ex: # lang=python ou #!/usr/bin/env python)
        const firstLine = blockItems[0].code.trim();
        const commentMatch = firstLine.match(/^#\s*lang\s*=\s*([a-zA-Z0-9_-]+)/i);
        const shebangMatch = firstLine.match(/^#!.*\/([a-zA-Z0-9_-]+)$/);

        if (commentMatch) {
            targetLang = mapExplicitLang(commentMatch[1]);
        } else if (shebangMatch) {
            targetLang = mapExplicitLang(shebangMatch[1]);
        }

        // 2. Se não houver linguagem explícita, tenta adivinhar com highlightAuto
        if (!targetLang) {
            const autoResult = hljs.highlightAuto(fullCode, ALLOWED_LANGS);
            // Usa a linguagem detectada se a relevância for confiável, senão cai para 'bash'
            targetLang = (autoResult.relevance > 2 && autoResult.language) ? autoResult.language : 'bash';
        }

        // 3. Aplica o highlight linha a linha usando a linguagem escolhida
        blockItems.forEach(item => {
            try {
                const highlighted = hljs.highlight(item.code, { language: targetLang }).value;
                item.element.innerHTML = item.diffPrefix + item.leadingSpaces + highlighted;
                item.element.dataset.hljsDone = 'true';
            } catch (e) {
                // Mantém original em caso de erro
            }
        });
    }

    function processLines(nodeList, isDiff = false) {
        let inRunBlock = false;
        let runIndent = 0;
        let stepShell = null;
        let currentBlock = [];

        nodeList.forEach(line => {
            if (line.dataset.hljsDone) return;

            let rawText = line.textContent;
            let diffPrefix = '';

            if (isDiff && /^[+-]/.test(rawText)) {
                diffPrefix = rawText[0];
                rawText = rawText.slice(1);
            }

            const trimmed = rawText.trim();
            const currentIndent = trimmed ? rawText.search(/\S/) : Infinity;

            // Se estava em um bloco e encontrou uma linha não-vazia com indentação menor ou igual ao "run:"
            if (inRunBlock && trimmed && currentIndent <= runIndent) {
                highlightBlock(currentBlock, stepShell);
                currentBlock = [];
                inRunBlock = false;
                stepShell = null;
            }

            // Reseta o shell ao iniciar novo step (- name / - uses)
            if (!inRunBlock && /^\s*-\s+/.test(rawText)) {
                stepShell = null;
            }

            // Captura "shell:" se existir no step
            const shellMatch = rawText.match(/^\s*(?:-\s*)?shell:\s*([a-zA-Z0-9_-]+)/);
            if (shellMatch) {
                stepShell = mapExplicitLang(shellMatch[1]);
            }

            // Detecta início de "run: |" ou "run: >"
            if (!inRunBlock && /^\s*(?:-\s*)?run:\s*[|>]/.test(rawText)) {
                inRunBlock = true;
                runIndent = currentIndent;
                return;
            }

            // Coleta as linhas pertencentes ao bloco atual
            if (inRunBlock) {
                if (!trimmed) {
                    currentBlock.push({ element: line, diffPrefix, leadingSpaces: '', code: '' });
                } else {
                    const leadingSpaces = rawText.slice(0, currentIndent);
                    const code = rawText.slice(currentIndent);
                    currentBlock.push({ element: line, diffPrefix, leadingSpaces, code });
                }
            }
        });

        // Garante que o último bloco do arquivo também seja processado
        if (inRunBlock && currentBlock.length) {
            highlightBlock(currentBlock, stepShell);
        }
    }

    function scanPage() {
        const url = window.location.pathname;

        if (/\.ya?ml$/.test(url)) {
            const blobLines = document.querySelectorAll('.react-code-line-contents');
            if (blobLines.length) processLines(blobLines, false);
        }

        if (url.includes('/pull/') || url.includes('/commit/')) {
            const fileContainers = document.querySelectorAll('[data-tagsearch-path$=".yml"], [data-tagsearch-path$=".yaml"], .file[data-file-type=".yml"], .file[data-file-type=".yaml"]');
            fileContainers.forEach(container => {
                const diffLines = container.querySelectorAll('.blob-code-inner');
                if (diffLines.length) processLines(diffLines, true);
            });
        }
    }

    const observer = new MutationObserver(() => {
        scanPage();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(scanPage, 600);
})();
