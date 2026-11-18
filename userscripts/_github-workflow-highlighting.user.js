// ==UserScript==
// @name         GitHub Actions YAML Extended Grammar (subLanguage)
// @namespace    http://tampermonkey.net
// @version      4.0
// @description  Estende a gramática YAML do Highlight.js com subLanguage para blocos run: no GitHub
// @match        https://github.com*
// @require      https://jsdelivr.net
// @resource     HLJS_DARK https://jsdelivr.net
// @resource     HLJS_LIGHT https://jsdelivr.net
// @grant        GM_addStyle
// @grant        GM_getResourceText
// ==/UserScript==

(function() {
    'use strict';

    // 1. Aplica o tema do Highlight.js alinhado ao tema do GitHub
    const isDark = document.documentElement.getAttribute('data-color-mode') === 'dark' ||
                   (document.documentElement.getAttribute('data-color-mode') === 'auto' &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches);

    GM_addStyle(GM_getResourceText(isDark ? 'HLJS_DARK' : 'HLJS_LIGHT'));
    GM_addStyle('.hljs { background: transparent !important; padding: 0 !important; }');

    // 2. Estende a definição nativa do YAML no Highlight.js
    function extendYamlGrammar() {
        const yamlLang = hljs.getLanguage('yaml');
        if (!yamlLang || yamlLang._extendedForActions) return;

        // Regra de injeção de sub-linguagem para blocos "run: |" ou "run: >"
        const runBlockRule = {
            begin: /^(\s*)(?:-\s*)?run:\s*[|>][+-]?\s*$/,
            // Termina quando encontra uma linha não-vazia com indentação menor ou igual à do "run:"
            end: /^(?=\s*\S)/,
            excludeBegin: true,
            excludeEnd: true,
            // O Highlight.js tenta adivinhar automaticamente entre as linguagens listadas abaixo:
            subLanguage: ['bash', 'python', 'powershell', 'javascript', 'ruby', 'go', 'sql']
        };

        // Adiciona a regra no topo das prioridades do YAML
        yamlLang.contains.unshift(runBlockRule);
        yamlLang._extendedForActions = true;
    }

    extendYamlGrammar();

    // 3. Processa o arquivo YAML no DOM do GitHub
    function highlightYamlPage() {
        if (!/\.ya?ml$/.test(window.location.pathname)) return;

        const lineElements = Array.from(document.querySelectorAll('.react-code-line-contents'));
        if (!lineElements.length || lineElements[0].dataset.yamlExtended) return;

        // Extrai o texto completo do arquivo para que o parser de gramática entenda o contexto
        const fullYamlText = lineElements.map(el => el.textContent).join('\n');

        // Destaca o arquivo inteiro usando o YAML estendido
        const highlightedHtml = hljs.highlight(fullYamlText, { language: 'yaml' }).value;

        // Divide o HTML resultante de volta em linhas individuais (mantendo tags abertas entre linhas)
        const htmlLines = splitHtmlByLines(highlightedHtml);

        if (htmlLines.length === lineElements.length) {
            lineElements.forEach((el, idx) => {
                // Só substitui as linhas que estão dentro de um bloco run (preserva o tema nativo do resto do YAML)
                if (el.dataset.isRunContent === 'true') {
                    el.innerHTML = htmlLines[idx];
                }
                el.dataset.yamlExtended = 'true';
            });
        }
    }

    // Função auxiliar para fechar e reabrir spans HTML quando um token cruza múltiplas linhas
    function splitHtmlByLines(html) {
        const lines = html.split('\n');
        let openTags = [];
        return lines.map(line => {
            const prefix = openTags.join('');
            const tagRegex = /<\/?span[^>]*>/g;
            let match;
            while ((match = tagRegex.exec(line)) !== null) {
                if (match[0].startsWith('</')) {
                    openTags.pop();
                } else {
                    openTags.push(match[0]);
                }
            }
            const suffix = openTags.map(() => '</span>').join('');
            return prefix + line + suffix;
        });
    }

    // Marca quais linhas pertencem a blocos run: antes de substituir o HTML
    function markAndHighlight() {
        const lineElements = Array.from(document.querySelectorAll('.react-code-line-contents'));
        if (!lineElements.length || lineElements[0].dataset.yamlExtended) return;

        let inRun = false;
        let runIndent = 0;

        lineElements.forEach(el => {
            const text = el.textContent;
            const trimmed = text.trim();
            if (!trimmed) return;

            const indent = text.search(/\S/);
            if (/^\s*(?:-\s*)?run:\s*[|>]/.test(text)) {
                inRun = true;
                runIndent = indent;
            } else if (inRun) {
                if (indent <= runIndent) {
                    inRun = false;
                } else {
                    el.dataset.isRunContent = 'true';
                }
            }
        });

        highlightYamlPage();
    }

    const observer = new MutationObserver(markAndHighlight);
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(markAndHighlight, 600);
})();
