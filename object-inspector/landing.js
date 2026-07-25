(function RodInspectorLanding(windowRef, documentRef) {
  "use strict";

  const INSTALL_TEXT = '<script src="./rod-object-inspector.js"><\/script>';
  const STORAGE_THEME_KEY = "rod-object-inspector-landing-theme";

  const CODE_EXAMPLES = {
    basic: `const inspector = RodObjectInspector.create();

const value = {
  status: "ready",
  users: new Map([
    ["rod", { role: "engineer" }],
  ]),
};

document.body.appendChild(
  inspector.render(value),
);`,
    options: `const inspector = RodObjectInspector.create({
  autoStyle: true,
  options: {
    inspectDepth: 80,
    inspectItems: 1000,
    previewItems: 4,
    showPrototype: true,
    showNonEnumerable: false,
    virtualize: true,
    virtualizeAfter: 60,
    virtualOverscan: 8,
    unmountOnCollapse: true,
  },
});`,
    dom: `const inspector = RodObjectInspector.create();
const button = document.querySelector("#save");

const tree = inspector.render(button);
panel.appendChild(tree);

// Scrolls to the node and draws an overlay.
inspector.inspectElement(button);

// Or only highlight it.
inspector.highlightElement(button);`,
    runtime: `const inspector = RodObjectInspector.create({
  getHost() {
    return {
      window: previewFrame.contentWindow,
      document: previewFrame.contentDocument,
    };
  },
});

console.log(inspector.version);
console.log(inspector.getObjectPreview(window));

inspector.ensureStyle(document);
inspector.destroy();`,
  };

  const INITIAL_SOURCE = `({
  app: "Rod Object Inspector",
  version: "3.1.0",
  connected: true,
  metrics: {
    nodes: 1284,
    latency: 3.4,
    memory: "18.2 MB",
  },
  profile: {
    id: "usr_8f2a",
    name: "Rod",
    role: "software engineer",
    skills: ["JavaScript", "TypeScript", "DOM"],
  },
  cache: new Map([
    ["session", { hit: true, ttl: 3600 }],
    ["preferences", { theme: "dark" }],
  ]),
  flags: new Set(["search", "diff", "live"]),
  createdAt: new Date("2026-07-25T12:00:00.000Z"),
  pattern: /object\\.path/gi,
  element: document.querySelector("main"),
  error: Object.assign(new Error("Demo stack trace"), {
    code: "E_INSPECTOR_DEMO",
  }),
})`;

  const state = {
    inspector: null,
    value: null,
    snapshot: null,
    liveTimer: null,
    activePlaygroundTab: "inspect",
    activeCodeTab: "basic",
    toastTimer: null,
  };

  const elements = {};

  function queryElements() {
    elements.root = documentRef.documentElement;
    elements.themeToggle = documentRef.querySelector("[data-theme-toggle]");
    elements.header = documentRef.querySelector("[data-header]");
    elements.editor = documentRef.querySelector("[data-object-editor]");
    elements.editorStatus = documentRef.querySelector("[data-editor-status]");
    elements.inspectorHost = documentRef.querySelector("[data-inspector-host]");
    elements.resultTitle = documentRef.querySelector("[data-result-title]");
    elements.searchPanel = documentRef.querySelector("[data-search-panel]");
    elements.searchInput = documentRef.querySelector("[data-search-input]");
    elements.searchResults = documentRef.querySelector("[data-search-results]");
    elements.diffPanel = documentRef.querySelector("[data-diff-panel]");
    elements.diffResults = documentRef.querySelector("[data-diff-results]");
    elements.diffAdded = documentRef.querySelector("[data-diff-added]");
    elements.diffChanged = documentRef.querySelector("[data-diff-changed]");
    elements.diffRemoved = documentRef.querySelector("[data-diff-removed]");
    elements.liveToggle = documentRef.querySelector("[data-live-toggle]");
    elements.codeOutput = documentRef.querySelector("[data-code-output]");
    elements.toast = documentRef.querySelector("[data-toast]");
  }

  function readInitialTheme() {
    const stored = safeStorageGet(STORAGE_THEME_KEY);

    if (stored === "light" || stored === "dark") {
      return stored;
    }

    return windowRef.matchMedia?.("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function safeStorageGet(key) {
    try {
      return windowRef.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      windowRef.localStorage.setItem(key, value);
    } catch {
      // Storage may be blocked in private or sandboxed contexts.
    }
  }

  function applyTheme(theme) {
    elements.root.dataset.theme = theme;
    safeStorageSet(STORAGE_THEME_KEY, theme);

    const themeColor = documentRef.querySelector('meta[name="theme-color"]');

    if (themeColor) {
      themeColor.content = theme === "light" ? "#f7f7f5" : "#09090b";
    }
  }

  function toggleTheme() {
    applyTheme(elements.root.dataset.theme === "dark" ? "light" : "dark");
  }

  function showToast(message) {
    windowRef.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    state.toastTimer = windowRef.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2200);
  }

  async function copyText(text, message = "copiado para o clipboard") {
    try {
      await windowRef.navigator.clipboard.writeText(text);
      showToast(message);
      return;
    } catch {
      const textarea = documentRef.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      documentRef.body.appendChild(textarea);
      textarea.select();
      documentRef.execCommand("copy");
      textarea.remove();
      showToast(message);
    }
  }

  function evaluateSource(source) {
    return Function("document", `"use strict"; return (${source});`)(documentRef);
  }

  function createInspector() {
    if (!windowRef.RodObjectInspector) {
      elements.inspectorHost.textContent = "RodObjectInspector não foi carregado.";
      elements.editorStatus.textContent = "runtime missing";
      return;
    }

    state.inspector = windowRef.RodObjectInspector.create({
      options: {
        inspectDepth: 80,
        inspectItems: 1000,
        previewItems: 4,
        virtualize: true,
        virtualizeAfter: 60,
      },
    });

    const version = windowRef.RodObjectInspector.version;
    documentRef.querySelectorAll("[data-version]").forEach((node) => {
      node.textContent = `v${version}`;
    });
  }

  function renderInspector() {
    if (!state.inspector) {
      return;
    }

    elements.inspectorHost.replaceChildren(state.inspector.render(state.value));
  }

  function runEditor(options = {}) {
    try {
      state.value = evaluateSource(elements.editor.value);
      elements.editorStatus.textContent = "valid object";
      elements.editorStatus.style.color = "var(--success)";
      renderInspector();
      refreshSearch();
      refreshDiff();

      if (!options.silent) {
        showToast("objeto executado");
      }
    } catch (error) {
      elements.editorStatus.textContent = error?.message || "invalid expression";
      elements.editorStatus.style.color = "var(--danger)";

      if (!options.silent) {
        showToast("a expressão contém um erro");
      }
    }
  }

  function mutateDemo() {
    if (!state.value || typeof state.value !== "object") {
      return;
    }

    const now = new Date();
    state.value.connected = !state.value.connected;
    state.value.metrics ??= {};
    state.value.metrics.nodes = Number(state.value.metrics.nodes || 0) + Math.floor(Math.random() * 18 + 1);
    state.value.metrics.latency = Number((1.5 + Math.random() * 5.5).toFixed(2));
    state.value.lastMutation = now.toISOString();

    if (state.value.profile && typeof state.value.profile === "object") {
      state.value.profile.updatedAt = now;
    }

    renderInspector();
    refreshSearch();
    refreshDiff();
    showToast("estado mutado");
  }

  function setLive(enabled) {
    windowRef.clearInterval(state.liveTimer);
    state.liveTimer = null;

    if (!enabled) {
      showToast("live refresh pausado");
      return;
    }

    state.liveTimer = windowRef.setInterval(() => {
      if (!state.value || typeof state.value !== "object") {
        return;
      }

      state.value.metrics ??= {};
      state.value.metrics.latency = Number((1.5 + Math.random() * 5.5).toFixed(2));
      state.value.metrics.nodes = Number(state.value.metrics.nodes || 0) + 1;
      renderInspector();
      refreshSearch();
      refreshDiff();
    }, 1400);

    showToast("live refresh ativado");
  }

  function formatPreview(value) {
    if (state.inspector) {
      try {
        return state.inspector.getInlinePreview(value);
      } catch {
        // Continue to the fallback.
      }
    }

    try {
      return typeof value === "string" ? JSON.stringify(value) : String(value);
    } catch {
      return "[unavailable]";
    }
  }

  function formatPath(base, key) {
    if (typeof key === "number" || /^\d+$/.test(String(key))) {
      return `${base}[${key}]`;
    }

    if (typeof key === "string" && /^[A-Za-z_$][\w$]*$/.test(key)) {
      return `${base}.${key}`;
    }

    return `${base}[${JSON.stringify(String(key))}]`;
  }

  function deepSearch(root, query, maxResults = 80) {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    const results = [];
    const queue = [{ value: root, path: "$", depth: 0 }];
    const seen = new WeakSet();

    while (queue.length && results.length < maxResults) {
      const current = queue.shift();
      const value = current.value;
      const preview = formatPreview(value);
      const searchable = `${current.path} ${preview} ${Object.prototype.toString.call(value)}`.toLowerCase();

      if (searchable.includes(normalizedQuery)) {
        results.push({ path: current.path, value, preview });
      }

      if (
        current.depth >= 7 ||
        value === null ||
        (typeof value !== "object" && typeof value !== "function")
      ) {
        continue;
      }

      if (seen.has(value)) {
        continue;
      }

      seen.add(value);

      if (value instanceof Map) {
        let index = 0;
        for (const [key, item] of value.entries()) {
          queue.push({
            value: item,
            path: `${current.path}.get(${JSON.stringify(formatPreview(key))})`,
            depth: current.depth + 1,
          });
          index += 1;
          if (index >= 200) break;
        }
        continue;
      }

      if (value instanceof Set) {
        let index = 0;
        for (const item of value.values()) {
          queue.push({
            value: item,
            path: `${current.path}.set[${index}]`,
            depth: current.depth + 1,
          });
          index += 1;
          if (index >= 200) break;
        }
        continue;
      }

      let keys = [];

      try {
        keys = Reflect.ownKeys(value).slice(0, 200);
      } catch {
        continue;
      }

      for (const key of keys) {
        let descriptor;

        try {
          descriptor = Object.getOwnPropertyDescriptor(value, key);
        } catch {
          continue;
        }

        if (!descriptor || !("value" in descriptor)) {
          continue;
        }

        const path = formatPath(current.path, typeof key === "symbol" ? key.toString() : key);
        const keyText = String(key).toLowerCase();
        const itemPreview = formatPreview(descriptor.value);

        if (`${keyText} ${path} ${itemPreview}`.toLowerCase().includes(normalizedQuery)) {
          results.push({ path, value: descriptor.value, preview: itemPreview });

          if (results.length >= maxResults) {
            break;
          }
        }

        queue.push({ value: descriptor.value, path, depth: current.depth + 1 });
      }
    }

    return results;
  }

  function refreshSearch() {
    if (state.activePlaygroundTab !== "search") {
      return;
    }

    const query = elements.searchInput.value;
    const results = deepSearch(state.value, query);
    elements.searchResults.replaceChildren();

    if (!query.trim()) {
      const empty = documentRef.createElement("p");
      empty.textContent = "Digite algo para atravessar o grafo.";
      empty.style.color = "var(--text-faint)";
      empty.style.fontSize = "10px";
      elements.searchResults.appendChild(empty);
      return;
    }

    if (!results.length) {
      const empty = documentRef.createElement("p");
      empty.textContent = "Nenhum caminho encontrado.";
      empty.style.color = "var(--text-faint)";
      empty.style.fontSize = "10px";
      elements.searchResults.appendChild(empty);
      return;
    }

    for (const result of results) {
      const card = documentRef.createElement("button");
      const path = documentRef.createElement("strong");
      const preview = documentRef.createElement("small");
      card.type = "button";
      card.className = "search-result";
      card.style.textAlign = "left";
      card.style.cursor = "pointer";
      path.textContent = result.path;
      preview.textContent = result.preview;
      card.append(path, preview);
      card.addEventListener("click", () => copyText(result.path, "caminho copiado"));
      elements.searchResults.appendChild(card);
    }
  }

  function snapshotValue(value, depth = 0, seen = new WeakMap()) {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      typeof value === "undefined"
    ) {
      return value;
    }

    if (typeof value === "bigint") return `${value}n`;
    if (typeof value === "symbol") return String(value);
    if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
    if (depth >= 7) return formatPreview(value);
    if (seen.has(value)) return `[Circular ${seen.get(value)}]`;

    seen.set(value, `$snapshot:${seen.size + 1}`);

    if (value instanceof Date) return value.toISOString();
    if (value instanceof RegExp) return value.toString();
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
        code: value.code,
      };
    }
    if (value instanceof Map) {
      return Array.from(value.entries()).slice(0, 200).map(([key, item]) => [
        snapshotValue(key, depth + 1, seen),
        snapshotValue(item, depth + 1, seen),
      ]);
    }
    if (value instanceof Set) {
      return Array.from(value.values()).slice(0, 200).map((item) => snapshotValue(item, depth + 1, seen));
    }
    if (Array.isArray(value)) {
      return value.slice(0, 200).map((item) => snapshotValue(item, depth + 1, seen));
    }
    if (value.nodeType && value.nodeName) {
      return `[DOM ${value.nodeName}]`;
    }

    const output = {};
    let keys = [];

    try {
      keys = Reflect.ownKeys(value).slice(0, 200);
    } catch {
      return formatPreview(value);
    }

    for (const key of keys) {
      const keyText = typeof key === "symbol" ? key.toString() : String(key);
      let descriptor;

      try {
        descriptor = Object.getOwnPropertyDescriptor(value, key);
      } catch {
        continue;
      }

      output[keyText] = descriptor && "value" in descriptor
        ? snapshotValue(descriptor.value, depth + 1, seen)
        : "[Accessor]";
    }

    return output;
  }

  function flattenSnapshot(value, path = "$", output = new Map()) {
    if (value === null || typeof value !== "object") {
      output.set(path, JSON.stringify(value));
      return output;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => flattenSnapshot(item, `${path}[${index}]`, output));
      return output;
    }

    for (const [key, item] of Object.entries(value)) {
      flattenSnapshot(item, formatPath(path, key), output);
    }

    return output;
  }

  function diffSnapshots(before, after) {
    const previous = flattenSnapshot(before);
    const current = flattenSnapshot(after);
    const changes = [];

    for (const [path, value] of current) {
      if (!previous.has(path)) {
        changes.push({ kind: "added", path, value });
      } else if (previous.get(path) !== value) {
        changes.push({ kind: "changed", path, value, previous: previous.get(path) });
      }
    }

    for (const [path, value] of previous) {
      if (!current.has(path)) {
        changes.push({ kind: "removed", path, value });
      }
    }

    return changes;
  }

  function createSnapshot() {
    state.snapshot = snapshotValue(state.value);
    refreshDiff();
    showToast("snapshot criado");
  }

  function refreshDiff() {
    if (state.activePlaygroundTab !== "diff") {
      return;
    }

    elements.diffResults.replaceChildren();

    if (!state.snapshot) {
      const message = documentRef.createElement("p");
      message.textContent = "Crie um snapshot e depois altere o objeto.";
      elements.diffResults.appendChild(message);
      updateDiffCounters([]);
      return;
    }

    const current = snapshotValue(state.value);
    const changes = diffSnapshots(state.snapshot, current);
    updateDiffCounters(changes);

    if (!changes.length) {
      const message = documentRef.createElement("p");
      message.textContent = "Nenhuma mudança desde o snapshot.";
      elements.diffResults.appendChild(message);
      return;
    }

    for (const change of changes.slice(0, 100)) {
      const card = documentRef.createElement("div");
      const path = documentRef.createElement("strong");
      const preview = documentRef.createElement("small");
      card.className = `diff-result diff-result--${change.kind}`;
      path.textContent = `${change.kind}: ${change.path}`;
      preview.textContent = change.kind === "changed"
        ? `${change.previous} → ${change.value}`
        : change.value;
      card.append(path, preview);
      elements.diffResults.appendChild(card);
    }
  }

  function updateDiffCounters(changes) {
    const counts = { added: 0, changed: 0, removed: 0 };
    changes.forEach((change) => {
      counts[change.kind] += 1;
    });
    elements.diffAdded.textContent = String(counts.added);
    elements.diffChanged.textContent = String(counts.changed);
    elements.diffRemoved.textContent = String(counts.removed);
  }

  function selectPlaygroundTab(tab) {
    state.activePlaygroundTab = tab;
    documentRef.querySelectorAll("[data-playground-tab]").forEach((button) => {
      const active = button.dataset.playgroundTab === tab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });

    elements.inspectorHost.hidden = tab !== "inspect";
    elements.searchPanel.hidden = tab !== "search";
    elements.diffPanel.hidden = tab !== "diff";
    elements.resultTitle.textContent = tab === "inspect"
      ? "object inspector"
      : tab === "search"
        ? "deep search"
        : "snapshot diff";

    if (tab === "search") {
      refreshSearch();
      windowRef.setTimeout(() => elements.searchInput.focus(), 0);
    } else if (tab === "diff") {
      refreshDiff();
    }
  }

  function selectCodeTab(tab) {
    state.activeCodeTab = tab;
    documentRef.querySelectorAll("[data-code-tab]").forEach((button) => {
      const active = button.dataset.codeTab === tab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    elements.codeOutput.textContent = CODE_EXAMPLES[tab];
  }

  function attachEvents() {
    elements.themeToggle.addEventListener("click", toggleTheme);

    documentRef.querySelectorAll("[data-copy-install]").forEach((button) => {
      button.addEventListener("click", () => copyText(INSTALL_TEXT, "instalação copiada"));
    });

    documentRef.querySelector("[data-refresh-demo]").addEventListener("click", () => {
      renderInspector();
      refreshSearch();
      refreshDiff();
      showToast("inspector atualizado");
    });

    documentRef.querySelector("[data-mutate-demo]").addEventListener("click", mutateDemo);
    documentRef.querySelector("[data-snapshot]").addEventListener("click", createSnapshot);
    elements.liveToggle.addEventListener("change", () => setLive(elements.liveToggle.checked));
    elements.searchInput.addEventListener("input", refreshSearch);

    documentRef.querySelector("[data-copy-object]").addEventListener("click", () => {
      copyText(elements.editor.value, "expressão copiada");
    });

    elements.editor.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        runEditor();
      }

      if (event.key === "Tab") {
        event.preventDefault();
        const start = elements.editor.selectionStart;
        const end = elements.editor.selectionEnd;
        elements.editor.setRangeText("  ", start, end, "end");
      }
    });

    documentRef.querySelectorAll("[data-playground-tab]").forEach((button) => {
      button.addEventListener("click", () => selectPlaygroundTab(button.dataset.playgroundTab));
    });

    documentRef.querySelectorAll("[data-code-tab]").forEach((button) => {
      button.addEventListener("click", () => selectCodeTab(button.dataset.codeTab));
    });

    documentRef.querySelector("[data-copy-code]").addEventListener("click", () => {
      copyText(CODE_EXAMPLES[state.activeCodeTab], "exemplo copiado");
    });

    windowRef.addEventListener("scroll", () => {
      elements.header.classList.toggle("is-scrolled", windowRef.scrollY > 16);
    }, { passive: true });

    windowRef.addEventListener("beforeunload", () => {
      windowRef.clearInterval(state.liveTimer);
      state.inspector?.destroy();
    });
  }

  function revealOnScroll() {
    const nodes = documentRef.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in windowRef)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new windowRef.IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -40px" });

    nodes.forEach((node) => observer.observe(node));
  }

  function initialize() {
    queryElements();
    applyTheme(readInitialTheme());
    elements.editor.value = INITIAL_SOURCE;
    createInspector();
    selectCodeTab("basic");
    attachEvents();
    runEditor({ silent: true });
    selectPlaygroundTab("inspect");
    revealOnScroll();
  }

  if (documentRef.readyState === "loading") {
    documentRef.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(window, document);
