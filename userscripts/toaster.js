(function Toaster(globalWindow) {
  "use strict";

  const VERSION = "3.0.0";
  const TOAST_GLOBAL = "RodToaster";
  const INSPECTOR_GLOBAL = "RodObjectInspector";
  const TOAST_HOST_ID = "__rod-super-toaster-host__";
  const STATE_SYMBOL = Symbol.for("rod.super-toaster.state");
  const OPTIONS_SYMBOL = Symbol("rod.super-toaster.options");
  const MAX_Z_INDEX = 2147483647;

  const TOAST_COLORS = {
    error: {
      bg: "rgba(24, 24, 27, 0.985)",
      border: "rgba(82, 82, 91, 0.98)",
      text: "rgba(250, 250, 250, 1)",
      accent: "rgba(255, 92, 108, 1)",
      icon: "✕",
    },
    info: {
      bg: "rgba(24, 24, 27, 0.985)",
      border: "rgba(82, 82, 91, 0.98)",
      text: "rgba(250, 250, 250, 1)",
      accent: "rgba(96, 165, 250, 1)",
      icon: "ⓘ",
    },
    success: {
      bg: "rgba(24, 24, 27, 0.985)",
      border: "rgba(82, 82, 91, 0.98)",
      text: "rgba(250, 250, 250, 1)",
      accent: "rgba(74, 222, 128, 1)",
      icon: "✓",
    },
    warning: {
      bg: "rgba(24, 24, 27, 0.985)",
      border: "rgba(82, 82, 91, 0.98)",
      text: "rgba(250, 250, 250, 1)",
      accent: "rgba(250, 204, 21, 1)",
      icon: "⚠",
    },
    debug: {
      bg: "rgba(24, 24, 27, 0.985)",
      border: "rgba(82, 82, 91, 0.98)",
      text: "rgba(250, 250, 250, 1)",
      accent: "rgba(196, 181, 253, 1)",
      icon: "›",
    },
  };

  const DEFAULT_CONFIG = {
    duration: 15_000,
    debugDuration: 0,
    shouldDebug: true,
    downloadFallback:
      globalWindow.console?.debug || globalWindow.console?.log || null,
    maxToasts: 20,
    dedupe: true,
    dedupeWindow: 1000,
    pauseOnInteraction: true,
    closeButton: true,
    position: "top-center",
    stacked: true,
    stackVisible: 3,
    swipeToDismiss: true,
    swipeThreshold: 72,
    swipeVelocity: 0.45,

    // Object Inspector integration. It is loaded only when an object actually
    // needs to be rendered and RodObjectInspector is not already global.
    objectInspectorSrc: null,
    objectInspectorLoadTimeout: 15_000,
    inspectDepth: 80,
    inspectItems: 1000,
    previewItems: 3,
    showPrototype: true,
    showNonEnumerable: false,
    showObjectLength: false,
    virtualizeInspector: true,
    virtualizeAfter: 60,
    virtualRowHeight: 24,
    virtualOverscan: 8,
    virtualMaxHeight: 360,
    unmountInspectorOnCollapse: true,
  };

  const OPTION_KEYS = new Set([
    "duration",
    "type",
    "id",
    "dedupe",
    "dedupeWindow",
    "pauseOnInteraction",
    "closeButton",
    "role",
    "swipeToDismiss",
    "swipeThreshold",
    "swipeVelocity",
    "inspectDepth",
    "inspectItems",
    "previewItems",
    "showPrototype",
    "showNonEnumerable",
    "showObjectLength",
    "virtualizeInspector",
    "virtualizeAfter",
    "virtualRowHeight",
    "virtualOverscan",
    "virtualMaxHeight",
    "unmountInspectorOnCollapse",
  ]);

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function safeCall(callback, fallback) {
    try {
      return callback();
    } catch {
      return fallback;
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function safePrimitiveText(value, quoteStrings) {
    if (value === null) {
      return "null";
    }

    if (value === undefined) {
      return "undefined";
    }

    if (typeof value === "string") {
      return quoteStrings ? JSON.stringify(value) : value;
    }

    if (typeof value === "bigint") {
      return `${value}n`;
    }

    if (typeof value === "symbol") {
      return safeCall(() => value.toString(), "Symbol(?)");
    }

    if (typeof value === "function") {
      const name = safeCall(() => value.name || "anonymous", "anonymous");
      return `ƒ ${name}()`;
    }

    return String(value);
  }

  function getHighestAccessibleWindow(startWindow) {
    let currentWindow = startWindow;

    while (currentWindow.parent && currentWindow.parent !== currentWindow) {
      try {
        const parentWindow = currentWindow.parent;
        void parentWindow.document.documentElement;
        currentWindow = parentWindow;
      } catch {
        break;
      }
    }

    return currentWindow;
  }

  function getExistingToaster(hostWindow) {
    return (
      safeCall(() => hostWindow[TOAST_GLOBAL], null) ||
      safeCall(() => globalWindow[TOAST_GLOBAL], null)
    );
  }

  const initialHostWindow = getHighestAccessibleWindow(globalWindow);
  const existingToaster = getExistingToaster(initialHostWindow);

  if (existingToaster) {
    globalWindow[TOAST_GLOBAL] = existingToaster;
    globalWindow.toast = existingToaster;
    return;
  }

  const existingState = safeCall(() => initialHostWindow[STATE_SYMBOL], null);

  if (existingState?.api) {
    globalWindow[TOAST_GLOBAL] = existingState.api;
    globalWindow.toast = existingState.api;
    return;
  }

  const state = {
    version: VERSION,
    api: null,
    config: { ...DEFAULT_CONFIG },
    hostWindow: null,
    hostDocument: null,
    hostElement: null,
    shadowRoot: null,
    container: null,
    toasts: [],
    recordsById: new Map(),
    dedupeRecords: new Map(),
    objectIds: new WeakMap(),
    nextObjectId: 1,
    stackExpanded: false,
    outsidePointerDownHandler: null,
    inspectorPromise: null,
    inspectorApi: null,
    inspectorRuntime: null,
    inspectorStyle: null,
  };

  try {
    Object.defineProperty(initialHostWindow, STATE_SYMBOL, {
      value: state,
      configurable: true,
    });
  } catch {
    // A frozen or exotic Window should not prevent local usage.
  }

  function getObjectId(value) {
    if (
      value === null ||
      (typeof value !== "object" && typeof value !== "function")
    ) {
      return null;
    }

    const knownId = state.objectIds.get(value);

    if (knownId) {
      return knownId;
    }

    const id = state.nextObjectId;
    state.nextObjectId += 1;
    state.objectIds.set(value, id);
    return id;
  }

  function getFallbackObjectPreview(value) {
    if (Array.isArray(value)) {
      return `Array(${value.length})`;
    }

    const tag = safeCall(
      () => Object.prototype.toString.call(value),
      "[object Object]",
    );

    if (tag === "[object Map]") {
      return `Map(${safeCall(() => value.size, "?")})`;
    }

    if (tag === "[object Set]") {
      return `Set(${safeCall(() => value.size, "?")})`;
    }

    if (tag === "[object Date]") {
      return safeCall(() => value.toISOString(), "Date");
    }

    if (tag === "[object RegExp]") {
      return safeCall(() => value.toString(), "RegExp");
    }

    if (/Error\]$/.test(tag)) {
      return safeCall(
        () => `${value.name || "Error"}: ${value.message || ""}`,
        "Error",
      );
    }

    if (
      safeCall(
        () =>
          value?.nodeType === 1 &&
          typeof value?.tagName === "string",
        false,
      )
    ) {
      const tagName = safeCall(() => value.tagName.toLowerCase(), "element");
      const id = safeCall(() => (value.id ? `#${value.id}` : ""), "");
      return `<${tagName}${id}>`;
    }

    const constructorName = safeCall(
      () => value?.constructor?.name || "Object",
      "Object",
    );

    return `${constructorName} {…}`;
  }

  function createStyles(documentRef) {
    const style = documentRef.createElement("style");

    style.textContent = `
      :host {
        all: initial;
        contain: layout style;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      .rod-toast-stack {
        position: fixed;
        z-index: ${MAX_Z_INDEX};
        isolation: isolate;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: calc(100dvh - 32px);
        pointer-events: none;
        color-scheme: dark;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          "Liberation Mono", "Courier New", monospace;
        font-size: 13px;
        font-weight: 400;
        line-height: 1.45;
      }

      .rod-toast-stack::before,
      .rod-toast-stack::after {
        content: "";
        position: absolute;
        inset: 0;
        border: 1px solid rgba(82, 82, 91, 0.98);
        border-radius: 14px;
        background: rgba(24, 24, 27, 0.985);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
        opacity: 0;
        transform-origin: top center;
        pointer-events: none;
        transition: opacity 180ms ease, transform 180ms ease;
      }

      .rod-toast-stack::before {
        z-index: -1;
      }

      .rod-toast-stack::after {
        z-index: -2;
      }

      .rod-toast-stack[data-expanded="false"][data-stack-depth="2"]::before,
      .rod-toast-stack[data-expanded="false"][data-stack-depth="3"]::before {
        opacity: 1;
        transform: translateY(9px) scaleX(0.975);
      }

      .rod-toast-stack[data-expanded="false"][data-stack-depth="3"]::after {
        opacity: 1;
        transform: translateY(17px) scaleX(0.945);
      }

      .rod-toast-stack[data-expanded="true"] {
        overflow-x: visible;
        overflow-y: auto;
        pointer-events: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
      }

      .rod-toast-stack[data-expanded="false"] {
        overflow: visible;
      }

      .rod-toast-stack[data-expanded="false"] .rod-toast {
        display: none;
      }

      .rod-toast-stack[data-expanded="false"] .rod-toast[data-stack-index="0"] {
        display: grid;
      }

      .rod-toast-stack[data-position^="top"] {
        top: max(env(safe-area-inset-top, 0px), 16px);
        right: max(env(safe-area-inset-right, 0px), 16px);
        left: max(env(safe-area-inset-left, 0px), 16px);
      }

      .rod-toast-stack[data-position^="bottom"] {
        right: max(env(safe-area-inset-right, 0px), 16px);
        bottom: max(env(safe-area-inset-bottom, 0px), 16px);
        left: max(env(safe-area-inset-left, 0px), 16px);
        flex-direction: column-reverse;
      }

      .rod-toast {
        --rod-toast-bg: rgba(24, 24, 27, 0.985);
        --rod-toast-border: rgba(82, 82, 91, 0.98);
        --rod-toast-text: rgba(250, 250, 250, 1);
        --rod-toast-accent: rgba(196, 181, 253, 1);
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: flex-start;
        gap: 10px;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        max-height: min(70dvh, 720px);
        overflow: auto;
        padding: 12px 12px 12px 14px;
        border: 1px solid var(--rod-toast-border);
        border-radius: 14px;
        background: var(--rod-toast-bg);
        color: var(--rod-toast-text);
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.42);
        opacity: 0;
        transform: translate3d(0, -6px, 0) scale(0.99);
        transition: opacity 180ms ease, transform 180ms ease,
          border-color 180ms ease;
        pointer-events: auto;
        touch-action: none;
        user-select: text;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        will-change: transform, opacity;
      }

      .rod-toast[data-visible="true"] {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }

      .rod-toast[data-swiping="true"] {
        cursor: grabbing;
      }

      .rod-toast-stack[data-expanded="false"] .rod-toast[data-stack-index="0"] {
        cursor: grab;
      }

      .rod-toast__icon {
        display: grid;
        place-items: center;
        width: 20px;
        min-width: 20px;
        height: 20px;
        margin-top: 1px;
        color: var(--rod-toast-accent);
        font: 800 14px/1 ui-sans-serif, system-ui, sans-serif;
        user-select: none;
      }

      .rod-toast__content {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 3px 7px;
        min-width: 0;
        color: inherit;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        user-select: text;
      }

      .rod-toast__arg {
        min-width: 0;
        max-width: 100%;
      }

      .rod-toast__actions {
        position: sticky;
        top: 0;
        display: flex;
        align-items: center;
        gap: 5px;
        margin: -4px -4px 0 0;
      }

      .rod-toast__count {
        display: none;
        min-width: 24px;
        height: 24px;
        padding: 0 7px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.09);
        color: rgba(250, 250, 250, 0.96);
        font: 700 10px/22px ui-sans-serif, system-ui, sans-serif;
        text-align: center;
        user-select: none;
      }

      .rod-toast__count[data-visible="true"] {
        display: block;
      }

      .rod-toast__close {
        appearance: none;
        display: grid;
        place-items: center;
        width: 34px;
        min-width: 34px;
        height: 34px;
        margin: -6px -6px 0 0;
        border: 0;
        border-radius: 9px;
        outline: none;
        background: transparent;
        color: rgba(250, 250, 250, 0.8);
        font: 400 22px/1 ui-sans-serif, system-ui, sans-serif;
        touch-action: manipulation;
        cursor: pointer;
      }

      .rod-toast__close:hover,
      .rod-toast__close:focus-visible {
        background: rgba(255, 255, 255, 0.1);
      }

      .rod-toast__close:focus-visible {
        outline: 1px solid rgba(125, 211, 252, 1);
        outline-offset: 1px;
      }

      .rod-toast__inspector-placeholder {
        color: rgba(228, 228, 231, 0.94);
        font-style: italic;
      }

      .rod-token--null {
        color: rgba(216, 180, 254, 1);
      }

      .rod-token--undefined,
      .rod-token--meta {
        color: rgba(212, 212, 216, 1);
      }

      .rod-token--string {
        color: rgba(253, 186, 116, 1);
      }

      .rod-token--number {
        color: rgba(190, 242, 100, 1);
      }

      .rod-token--boolean {
        color: rgba(96, 165, 250, 1);
        font-weight: 600;
      }

      .rod-token--symbol {
        color: rgba(45, 212, 191, 1);
      }

      .rod-token--function {
        color: rgba(253, 224, 71, 1);
      }

      @media (prefers-reduced-motion: reduce) {
        .rod-toast,
        .rod-toast-stack::before,
        .rod-toast-stack::after {
          transition: none;
        }
      }
    `;

    return style;
  }

  function resolveObjectInspectorSrc() {
    if (typeof state.config.objectInspectorSrc === "string") {
      const configured = state.config.objectInspectorSrc.trim();

      if (configured) {
        return configured;
      }
    }

    const explicitGlobal = safeCall(
      () => globalWindow.ROD_OBJECT_INSPECTOR_SRC,
      null,
    );

    if (typeof explicitGlobal === "string" && explicitGlobal.trim()) {
      return explicitGlobal.trim();
    }

    const documents = [
      safeCall(() => state.hostDocument, null),
      safeCall(() => globalWindow.document, null),
    ].filter(Boolean);

    for (const documentRef of documents) {
      const currentScript = safeCall(() => documentRef.currentScript, null);
      const scripts = safeCall(() => Array.from(documentRef.scripts || []), []);
      const candidates = currentScript ? [currentScript, ...scripts.reverse()] : scripts.reverse();

      for (const script of candidates) {
        const src = safeCall(() => script.src, "");

        if (!src || !/toaster(?:\.min)?\.js(?:[?#].*)?$/i.test(src)) {
          continue;
        }

        return src.replace(
          /toaster(?:\.min)?\.js([?#].*)?$/i,
          "object-inspector.js$1",
        );
      }
    }

    // This fallback is intentionally relative. In a userscript or CDN setup,
    // set window.ROD_OBJECT_INSPECTOR_SRC or configure objectInspectorSrc.
    return "object-inspector.js";
  }

  function getObjectInspectorApi() {
    const candidates = [
      state.hostWindow,
      initialHostWindow,
      globalWindow,
    ];

    for (const candidate of candidates) {
      const api = safeCall(() => candidate?.[INSPECTOR_GLOBAL], null);

      if (api?.create && api?.createStyle) {
        return api;
      }
    }

    return null;
  }

  function installInspectorStyle(api) {
    if (!state.shadowRoot || !state.hostDocument) {
      return;
    }

    if (state.inspectorStyle?.isConnected) {
      return;
    }

    const style = api.createStyle(state.hostDocument);
    state.shadowRoot.appendChild(style);
    state.inspectorStyle = style;
  }

  function buildInspectorOptions(options = state.config) {
    return {
      inspectDepth: options.inspectDepth,
      inspectItems: options.inspectItems,
      previewItems: options.previewItems,
      showPrototype: options.showPrototype,
      showNonEnumerable: options.showNonEnumerable,
      showObjectLength: options.showObjectLength,
      virtualize: options.virtualizeInspector,
      virtualizeAfter: options.virtualizeAfter,
      virtualRowHeight: options.virtualRowHeight,
      virtualOverscan: options.virtualOverscan,
      virtualMaxHeight: options.virtualMaxHeight,
      unmountOnCollapse: options.unmountInspectorOnCollapse,
    };
  }

  function ensureInspectorRuntime(api) {
    installInspectorStyle(api);

    if (state.inspectorRuntime) {
      return state.inspectorRuntime;
    }

    state.inspectorRuntime = api.create({
      window: state.hostWindow || initialHostWindow,
      document: state.hostDocument || initialHostWindow.document,
      maxZIndex: MAX_Z_INDEX,
      options: buildInspectorOptions(),
      getHost() {
        return {
          window: state.hostWindow || initialHostWindow,
          document: state.hostDocument || initialHostWindow.document,
        };
      },
    });

    return state.inspectorRuntime;
  }

  function loadObjectInspector() {
    const existing = getObjectInspectorApi();

    if (existing) {
      state.inspectorApi = existing;
      ensureInspectorRuntime(existing);
      return Promise.resolve(existing);
    }

    if (state.inspectorPromise) {
      return state.inspectorPromise;
    }

    const hostWindow = state.hostWindow || initialHostWindow;
    const hostDocument = safeCall(() => hostWindow.document, null);

    if (!hostDocument) {
      return Promise.reject(new Error("Object Inspector host document unavailable"));
    }

    const src = resolveObjectInspectorSrc();
    const existingScript = safeCall(
      () =>
        Array.from(hostDocument.scripts || []).find(
          (candidate) => candidate.dataset?.rodObjectInspectorSrc === src,
        ) || null,
      null,
    );
    const script = existingScript || hostDocument.createElement("script");

    state.inspectorPromise = new Promise((resolve, reject) => {
      let settled = false;
      const timeout = hostWindow.setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        state.inspectorPromise = null;
        reject(new Error(`Timed out loading ${INSPECTOR_GLOBAL} from ${src}`));
      }, state.config.objectInspectorLoadTimeout);

      function cleanupListeners() {
        script.removeEventListener("load", handleLoad);
        script.removeEventListener("error", handleError);
      }

      function finish(api) {
        if (settled) {
          return;
        }

        settled = true;
        hostWindow.clearTimeout(timeout);
        cleanupListeners();
        state.inspectorApi = api;
        ensureInspectorRuntime(api);
        resolve(api);
      }

      function handleLoad() {
        const api = getObjectInspectorApi();

        if (!api) {
          handleError();
          return;
        }

        finish(api);
      }

      function handleError() {
        if (settled) {
          return;
        }

        settled = true;
        hostWindow.clearTimeout(timeout);
        cleanupListeners();
        state.inspectorPromise = null;
        reject(new Error(`Failed to load ${INSPECTOR_GLOBAL} from ${src}`));
      }

      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);

      if (!existingScript) {
        script.src = src;
        script.async = true;
        script.dataset.rodObjectInspectorSrc = src;
        (hostDocument.head || hostDocument.documentElement).appendChild(script);
      } else {
        const api = getObjectInspectorApi();

        if (api) {
          finish(api);
        }
      }
    });

    return state.inspectorPromise;
  }

  function getActiveToastRecords() {
    return state.toasts.filter((record) => !record.removed);
  }

  function syncStackLayout() {
    if (!state.container) {
      return;
    }

    const newestFirst = [...getActiveToastRecords()].reverse();

    for (let index = 0; index < newestFirst.length; index += 1) {
      newestFirst[index].node.dataset.stackIndex = String(index);
    }

    const count = newestFirst.length;

    if (count <= 1) {
      state.stackExpanded = false;
    }

    const stackVisible = Math.min(
      3,
      Math.max(1, Number(state.config.stackVisible) || 1),
    );
    const stackDepth = Math.min(count, stackVisible);
    const effectiveExpanded =
      !state.config.stacked || state.stackExpanded || count <= 1;

    state.container.dataset.stacked = String(Boolean(state.config.stacked));
    state.container.dataset.expanded = String(effectiveExpanded);
    state.container.dataset.stackDepth = String(stackDepth);
    state.container.dataset.count = String(count);
  }

  function setStackExpanded(expanded) {
    const activeRecords = getActiveToastRecords();

    if (!state.config.stacked || activeRecords.length <= 1) {
      state.stackExpanded = false;
      syncStackLayout();
      return;
    }

    state.stackExpanded = Boolean(expanded);
    syncStackLayout();
  }

  function isStackInteractionTarget(target) {
    if (!target || typeof target.closest !== "function") {
      return false;
    }

    return Boolean(
      target.closest(
        "button, a, summary, details, input, textarea, select, option, " +
          "[contenteditable='true'], [role='button']",
      ),
    );
  }

  function handleStackClick(event) {
    if (!state.config.stacked || state.stackExpanded) {
      return;
    }

    if (
      getActiveToastRecords().length <= 1 ||
      isStackInteractionTarget(event.target)
    ) {
      return;
    }

    const toastNode =
      typeof event.target?.closest === "function"
        ? event.target.closest(".rod-toast")
        : null;

    if (
      !toastNode ||
      toastNode.dataset.stackIndex !== "0" ||
      toastNode.dataset.suppressStackClick === "true"
    ) {
      return;
    }

    setStackExpanded(true);
  }

  function removeHostInteractionListeners() {
    if (state.hostDocument && state.outsidePointerDownHandler) {
      state.hostDocument.removeEventListener(
        "pointerdown",
        state.outsidePointerDownHandler,
        true,
      );
    }

    state.outsidePointerDownHandler = null;
  }

  function destroyHost() {
    removeHostInteractionListeners();
    state.inspectorRuntime?.clearHighlight?.();

    if (state.hostElement?.isConnected) {
      state.hostElement.remove();
    }

    state.hostElement = null;
    state.shadowRoot = null;
    state.container = null;
    state.inspectorRuntime = null;
    state.inspectorStyle = null;
    state.stackExpanded = false;
  }

  function ensureHost() {
    const hostWindow = getHighestAccessibleWindow(globalWindow);
    const hostDocument = safeCall(() => hostWindow.document, null);

    if (!hostDocument) {
      return null;
    }

    if (
      state.hostElement?.isConnected &&
      state.hostDocument === hostDocument &&
      state.container
    ) {
      return {
        window: state.hostWindow,
        document: state.hostDocument,
        container: state.container,
      };
    }

    const parent = hostDocument.body || hostDocument.documentElement;

    if (!parent) {
      return null;
    }

    if (state.hostElement?.isConnected) {
      destroyHost();
    } else {
      removeHostInteractionListeners();
    }

    const hostElement = hostDocument.createElement("div");
    hostElement.id = TOAST_HOST_ID;
    hostElement.setAttribute("aria-live", "polite");
    hostElement.style.setProperty("all", "initial", "important");
    hostElement.style.setProperty("position", "fixed", "important");
    hostElement.style.setProperty("inset", "0", "important");
    hostElement.style.setProperty("width", "0", "important");
    hostElement.style.setProperty("height", "0", "important");
    hostElement.style.setProperty("z-index", String(MAX_Z_INDEX), "important");
    hostElement.style.setProperty("pointer-events", "none", "important");

    const shadowRoot = hostElement.attachShadow({ mode: "closed" });
    const container = hostDocument.createElement("div");
    container.className = "rod-toast-stack";
    container.dataset.position = state.config.position;
    container.dataset.expanded = "true";
    container.dataset.stackDepth = "0";

    shadowRoot.appendChild(createStyles(hostDocument));
    shadowRoot.appendChild(container);
    parent.appendChild(hostElement);

    state.hostWindow = hostWindow;
    state.hostDocument = hostDocument;
    state.hostElement = hostElement;
    state.shadowRoot = shadowRoot;
    state.container = container;

    const inspectorApi = getObjectInspectorApi();

    if (inspectorApi) {
      state.inspectorApi = inspectorApi;
      ensureInspectorRuntime(inspectorApi);
    }

    container.addEventListener("click", handleStackClick);
    container.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape" || !state.stackExpanded) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        setStackExpanded(false);
      },
      true,
    );

    state.outsidePointerDownHandler = (event) => {
      if (!state.stackExpanded) {
        return;
      }

      const path =
        typeof event.composedPath === "function" ? event.composedPath() : [];

      if (path.includes(hostElement)) {
        return;
      }

      setStackExpanded(false);
    };

    hostDocument.addEventListener(
      "pointerdown",
      state.outsidePointerDownHandler,
      true,
    );

    syncStackLayout();

    return { window: hostWindow, document: hostDocument, container };
  }

  function createTextNode(documentRef, text, className) {
    const node = documentRef.createElement("span");
    node.textContent = text;

    if (className) {
      node.className = className;
    }

    return node;
  }

  function renderPrimitive(value, documentRef, options = {}) {
    let className = "";

    if (value === null) {
      className = "rod-token--null";
    } else if (value === undefined) {
      className = "rod-token--undefined";
    } else if (typeof value === "string") {
      className = "rod-token--string";
    } else if (typeof value === "number" || typeof value === "bigint") {
      className = "rod-token--number";
    } else if (typeof value === "boolean") {
      className = "rod-token--boolean";
    } else if (typeof value === "symbol") {
      className = "rod-token--symbol";
    } else if (typeof value === "function") {
      className = "rod-token--function";
    }

    return createTextNode(
      documentRef,
      safePrimitiveText(value, options.quoteStrings !== false),
      className,
    );
  }

  function renderToastValue(value, documentRef, options) {
    if (value === null || typeof value !== "object") {
      return renderPrimitive(value, documentRef, {
        quoteStrings: false,
      });
    }

    const api = getObjectInspectorApi();

    if (api) {
      state.inspectorApi = api;
      const runtime = ensureInspectorRuntime(api);
      return runtime.render(value, documentRef, {
        depth: 0,
        ancestors: new Set(),
        quoteStrings: false,
        options: buildInspectorOptions(options),
      });
    }

    const placeholder = documentRef.createElement("span");
    placeholder.className = "rod-toast__inspector-placeholder";
    placeholder.textContent = getFallbackObjectPreview(value);

    loadObjectInspector()
      .then((loadedApi) => {
        if (!placeholder.isConnected) {
          return;
        }

        const runtime = ensureInspectorRuntime(loadedApi);
        const inspectorNode = runtime.render(value, documentRef, {
          depth: 0,
          ancestors: new Set(),
          quoteStrings: false,
          options: buildInspectorOptions(options),
        });
        placeholder.replaceWith(inspectorNode);
      })
      .catch((error) => {
        if (!placeholder.isConnected) {
          return;
        }

        placeholder.textContent = `${getFallbackObjectPreview(value)} [inspector unavailable]`;
        safeCall(() => console.warn(error), undefined);
      });

    return placeholder;
  }

  function isOptionsCandidate(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }

    if (value[OPTIONS_SYMBOL]) {
      return true;
    }

    return Reflect.ownKeys(value).some(
      (key) => typeof key === "string" && OPTION_KEYS.has(key),
    );
  }

  function parseArguments(inputArgs, forcedType) {
    const args = [...inputArgs];
    let options = {};

    if (args.length > 1 && isOptionsCandidate(args[args.length - 1])) {
      options = { ...args.pop() };
      delete options[OPTIONS_SYMBOL];
    }

    if (!args.length) {
      args.push("");
    }

    if (forcedType) {
      options.type = forcedType;
    }

    return { args, options };
  }

  function normalizeToastOptions(options) {
    const type = hasOwn(TOAST_COLORS, options.type) ? options.type : "error";
    const defaultDuration =
      type === "debug" ? state.config.debugDuration : state.config.duration;

    return {
      type,
      id: options.id == null ? null : String(options.id),
      duration: Number.isFinite(options.duration)
        ? Number(options.duration)
        : defaultDuration,
      dedupe: options.dedupe ?? state.config.dedupe,
      dedupeWindow: Number.isFinite(options.dedupeWindow)
        ? Number(options.dedupeWindow)
        : state.config.dedupeWindow,
      pauseOnInteraction:
        options.pauseOnInteraction ?? state.config.pauseOnInteraction,
      closeButton: options.closeButton ?? state.config.closeButton,
      role: options.role || (type === "error" ? "alert" : "status"),
      swipeToDismiss: options.swipeToDismiss ?? state.config.swipeToDismiss,
      swipeThreshold: Number.isFinite(options.swipeThreshold)
        ? Math.max(24, Number(options.swipeThreshold))
        : state.config.swipeThreshold,
      swipeVelocity: Number.isFinite(options.swipeVelocity)
        ? Math.max(0.05, Number(options.swipeVelocity))
        : state.config.swipeVelocity,
      inspectDepth: Number.isFinite(options.inspectDepth)
        ? Math.max(0, Number(options.inspectDepth))
        : state.config.inspectDepth,
      inspectItems: Number.isFinite(options.inspectItems)
        ? Math.max(0, Number(options.inspectItems))
        : state.config.inspectItems,
      previewItems: Number.isFinite(options.previewItems)
        ? Math.max(0, Number(options.previewItems))
        : state.config.previewItems,
      showPrototype: options.showPrototype ?? state.config.showPrototype,
      showNonEnumerable:
        options.showNonEnumerable ?? state.config.showNonEnumerable,
      showObjectLength: options.showObjectLength ?? state.config.showObjectLength,
      virtualizeInspector:
        options.virtualizeInspector ?? state.config.virtualizeInspector,
      virtualizeAfter: Number.isFinite(options.virtualizeAfter)
        ? Math.max(1, Number(options.virtualizeAfter))
        : state.config.virtualizeAfter,
      virtualRowHeight: Number.isFinite(options.virtualRowHeight)
        ? Math.max(16, Number(options.virtualRowHeight))
        : state.config.virtualRowHeight,
      virtualOverscan: Number.isFinite(options.virtualOverscan)
        ? Math.max(1, Number(options.virtualOverscan))
        : state.config.virtualOverscan,
      virtualMaxHeight: Number.isFinite(options.virtualMaxHeight)
        ? Math.max(120, Number(options.virtualMaxHeight))
        : state.config.virtualMaxHeight,
      unmountInspectorOnCollapse:
        options.unmountInspectorOnCollapse ??
        state.config.unmountInspectorOnCollapse,
    };
  }

  function shouldRenderDebug(args) {
    const setting = state.config.shouldDebug;

    if (typeof setting === "function") {
      return safeCall(
        () => Boolean(Reflect.apply(setting, undefined, args)),
        false,
      );
    }

    return Boolean(setting);
  }

  function runDownloadFallback(args) {
    const fallback = state.config.downloadFallback;

    if (typeof fallback !== "function") {
      return null;
    }

    return safeCall(
      () => Reflect.apply(fallback, globalWindow.console || null, args),
      null,
    );
  }

  function createDedupeKey(args, options) {
    if (options.id) {
      return `id:${options.id}`;
    }

    const signatures = args.map((value) => {
      if (value === null) {
        return "null";
      }

      if (typeof value === "object" || typeof value === "function") {
        return `ref:${getObjectId(value)}`;
      }

      return `${typeof value}:${safePrimitiveText(value, false)}`;
    });

    return `${options.type}|${signatures.join("|")}`;
  }

  function removeRecord(record) {
    const index = state.toasts.indexOf(record);

    if (index >= 0) {
      state.toasts.splice(index, 1);
    }

    if (
      record.options.id &&
      state.recordsById.get(record.options.id) === record
    ) {
      state.recordsById.delete(record.options.id);
    }

    if (
      record.dedupeKey &&
      state.dedupeRecords.get(record.dedupeKey) === record
    ) {
      state.dedupeRecords.delete(record.dedupeKey);
    }
  }

  function enforceToastLimit() {
    while (state.toasts.length >= state.config.maxToasts) {
      const oldest = state.toasts[0];

      if (!oldest) {
        break;
      }

      oldest.dismiss(true);
    }
  }

  function createCloseButton(documentRef, dismiss) {
    const button = documentRef.createElement("button");
    button.type = "button";
    button.className = "rod-toast__close";
    button.textContent = "×";
    button.setAttribute("aria-label", "Close toast");
    button.title = "Close";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    });

    return button;
  }

  function isSwipeBlockedTarget(target) {
    if (!target || typeof target.closest !== "function") {
      return false;
    }

    return Boolean(
      target.closest(
        "button, a, summary, input, textarea, select, option, " +
          "[contenteditable='true'], [role='button']",
      ),
    );
  }

  function installSwipeToDismiss(record, host) {
    const node = record.node;
    let active = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocityX = 0;
    let velocityY = 0;
    let startScrollTop = 0;
    let mode = "pending";
    let moved = false;

    function resetVisualState() {
      node.dataset.swiping = "false";
      node.style.removeProperty("transition");
      node.style.removeProperty("transform");
      node.style.removeProperty("opacity");
    }

    function snapBack() {
      node.dataset.swiping = "false";
      node.style.transition =
        "transform 220ms cubic-bezier(.2,.8,.2,1), opacity 180ms ease";
      node.style.transform = "translate3d(0, 0, 0) scale(1)";
      node.style.opacity = "1";

      host.window.setTimeout(() => {
        if (!record.removed) {
          resetVisualState();
        }
      }, 240);
    }

    function suppressNextStackClick() {
      node.dataset.suppressStackClick = "true";
      host.window.setTimeout(() => {
        if (node.isConnected) {
          delete node.dataset.suppressStackClick;
        }
      }, 350);
    }

    function finish(event, cancelled) {
      if (!active || event.pointerId !== pointerId) {
        return;
      }

      active = false;
      safeCall(() => node.releasePointerCapture(pointerId), undefined);

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const distance = Math.hypot(dx, dy);
      const speed = Math.hypot(velocityX, velocityY);
      const threshold = record.options.swipeThreshold;
      const velocityThreshold = record.options.swipeVelocity;
      const shouldDismiss =
        !cancelled &&
        mode === "swipe" &&
        (distance >= threshold ||
          (distance >= 24 && speed >= velocityThreshold));

      if (moved) {
        suppressNextStackClick();
      }

      if (shouldDismiss) {
        record.dismiss(false, {
          dx,
          dy,
          velocityX,
          velocityY,
        });
        return;
      }

      if (mode === "swipe") {
        snapBack();
      } else {
        resetVisualState();
      }
    }

    node.addEventListener("pointerdown", (event) => {
      if (
        !record.options.swipeToDismiss ||
        record.removed ||
        event.isPrimary === false ||
        event.button > 0 ||
        isSwipeBlockedTarget(event.target)
      ) {
        return;
      }

      active = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      lastX = event.clientX;
      lastY = event.clientY;
      lastTime = event.timeStamp || performance.now();
      velocityX = 0;
      velocityY = 0;
      startScrollTop = node.scrollTop;
      mode = "pending";
      moved = false;
      node.dataset.swiping = "true";
      node.style.transition = "none";

      safeCall(() => node.setPointerCapture(pointerId), undefined);
    });

    node.addEventListener("pointermove", (event) => {
      if (!active || event.pointerId !== pointerId || record.removed) {
        return;
      }

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const distance = Math.hypot(dx, dy);
      const now = event.timeStamp || performance.now();
      const elapsed = Math.max(1, now - lastTime);

      velocityX = (event.clientX - lastX) / elapsed;
      velocityY = (event.clientY - lastY) / elapsed;
      lastX = event.clientX;
      lastY = event.clientY;
      lastTime = now;

      if (distance < 5) {
        return;
      }

      if (mode === "pending") {
        const maxScrollTop = Math.max(0, node.scrollHeight - node.clientHeight);
        const verticalDominant = Math.abs(dy) > Math.abs(dx) * 1.25;
        const canScrollTowardTop = dy > 0 && startScrollTop > 0;
        const canScrollTowardBottom = dy < 0 && startScrollTop < maxScrollTop;

        mode =
          maxScrollTop > 1 &&
          verticalDominant &&
          (canScrollTowardTop || canScrollTowardBottom)
            ? "scroll"
            : "swipe";
      }

      if (mode === "scroll") {
        const maxScrollTop = Math.max(0, node.scrollHeight - node.clientHeight);
        node.scrollTop = clamp(startScrollTop - dy, 0, maxScrollTop);
        return;
      }

      event.preventDefault();
      moved = moved || distance > 8;

      const threshold = record.options.swipeThreshold;
      const opacity =
        1 - Math.min(0.78, distance / Math.max(threshold * 2.25, 1));
      const rotation = clamp(dx / 28, -7, 7);

      node.style.transform =
        `translate3d(${dx}px, ${dy}px, 0) rotate(${rotation}deg)`;
      node.style.opacity = String(opacity);
    });

    node.addEventListener("pointerup", (event) => finish(event, false));
    node.addEventListener("pointercancel", (event) => finish(event, true));
    node.addEventListener("lostpointercapture", (event) => {
      if (active && event.pointerId === pointerId) {
        finish(event, true);
      }
    });
  }

  function createToastRecord(args, rawOptions) {
    const host = ensureHost();

    if (!host) {
      safeCall(
        () => console.log(`[${rawOptions.type || "toast"}]`, ...args),
        undefined,
      );
      return null;
    }

    enforceToastLimit();

    const options = normalizeToastOptions(rawOptions);
    const palette = TOAST_COLORS[options.type];
    const node = host.document.createElement("div");
    const icon = host.document.createElement("div");
    const content = host.document.createElement("div");
    const actions = host.document.createElement("div");
    const count = host.document.createElement("div");

    node.className = "rod-toast";
    node.setAttribute("role", options.role);
    node.style.setProperty("--rod-toast-bg", palette.bg);
    node.style.setProperty("--rod-toast-border", palette.border);
    node.style.setProperty("--rod-toast-text", palette.text);
    node.style.setProperty("--rod-toast-accent", palette.accent);

    icon.className = "rod-toast__icon";
    icon.textContent = palette.icon;
    icon.setAttribute("aria-hidden", "true");

    content.className = "rod-toast__content";
    actions.className = "rod-toast__actions";
    count.className = "rod-toast__count";
    count.textContent = "1";
    count.dataset.visible = "false";

    actions.appendChild(count);
    node.appendChild(icon);
    node.appendChild(content);
    node.appendChild(actions);

    let removed = false;
    let removalTimer = null;
    let timerStartedAt = 0;
    let remainingDuration = options.duration;
    let paused = false;
    let duplicateCount = 1;

    const renderArgs = (nextArgs, nextOptions = options) => {
      content.replaceChildren();

      for (const value of nextArgs) {
        const wrapper = host.document.createElement("span");
        wrapper.className = "rod-toast__arg";
        wrapper.appendChild(renderToastValue(value, host.document, nextOptions));
        content.appendChild(wrapper);
      }
    };

    const clearTimer = () => {
      if (removalTimer !== null) {
        host.window.clearTimeout(removalTimer);
        removalTimer = null;
      }
    };

    const cleanup = () => {
      if (removed) {
        return;
      }

      removed = true;
      clearTimer();
      removeRecord(record);
      node.remove();
      syncStackLayout();

      if (!host.container.children.length) {
        destroyHost();
      }
    };

    const dismiss = (immediate = false, swipe = null) => {
      if (removed || !node.isConnected) {
        cleanup();
        return;
      }

      clearTimer();

      if (immediate) {
        cleanup();
        return;
      }

      if (swipe) {
        const rawX = Number(swipe.dx) || Number(swipe.velocityX) || 0;
        const rawY = Number(swipe.dy) || Number(swipe.velocityY) || 0;
        const length = Math.hypot(rawX, rawY) || 1;
        const viewportDistance =
          Math.hypot(
            host.window.innerWidth || 1000,
            host.window.innerHeight || 1000,
          ) * 1.2;
        const targetX = (rawX / length) * viewportDistance;
        const targetY = (rawY / length) * viewportDistance;
        const rotation = clamp(targetX / 90, -16, 16);

        node.dataset.swiping = "false";
        node.style.transition =
          "transform 220ms cubic-bezier(.2,.8,.2,1), opacity 180ms ease";
        node.style.transform =
          `translate3d(${targetX}px, ${targetY}px, 0) rotate(${rotation}deg)`;
        node.style.opacity = "0";
        host.window.setTimeout(cleanup, 240);
        return;
      }

      node.dataset.visible = "false";
      node.addEventListener("transitionend", cleanup, { once: true });
      host.window.setTimeout(cleanup, 240);
    };

    const scheduleTimer = () => {
      clearTimer();

      if (
        removed ||
        paused ||
        !Number.isFinite(remainingDuration) ||
        remainingDuration <= 0
      ) {
        return;
      }

      timerStartedAt = Date.now();
      removalTimer = host.window.setTimeout(dismiss, remainingDuration);
    };

    const pauseTimer = () => {
      if (
        paused ||
        removalTimer === null ||
        !Number.isFinite(remainingDuration) ||
        remainingDuration <= 0
      ) {
        return;
      }

      paused = true;
      remainingDuration = Math.max(
        0,
        remainingDuration - (Date.now() - timerStartedAt),
      );
      clearTimer();
    };

    const resumeTimer = () => {
      if (!paused) {
        return;
      }

      paused = false;
      scheduleTimer();
    };

    const resetTimer = (duration = options.duration) => {
      remainingDuration = duration;
      paused = false;
      scheduleTimer();
    };

    const update = (nextArgs, nextRawOptions = {}) => {
      const nextOptions = normalizeToastOptions({
        ...options,
        ...nextRawOptions,
      });
      const nextPalette = TOAST_COLORS[nextOptions.type];

      Object.assign(options, nextOptions);
      icon.textContent = nextPalette.icon;
      node.style.setProperty("--rod-toast-bg", nextPalette.bg);
      node.style.setProperty("--rod-toast-border", nextPalette.border);
      node.style.setProperty("--rod-toast-text", nextPalette.text);
      node.style.setProperty("--rod-toast-accent", nextPalette.accent);
      node.setAttribute("role", nextOptions.role);
      renderArgs(nextArgs, nextOptions);
      resetTimer(nextOptions.duration);
      return controller;
    };

    const bumpDuplicate = () => {
      duplicateCount += 1;
      count.textContent = `×${duplicateCount}`;
      count.dataset.visible = "true";
      resetTimer(options.duration);
      return controller;
    };

    const record = {
      node,
      options,
      args,
      dedupeKey: null,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      dismiss,
      update,
      bumpDuplicate,
      get removed() {
        return removed;
      },
    };

    const controller = {
      get id() {
        return options.id;
      },
      get element() {
        return node;
      },
      update(...inputArgs) {
        const parsed = parseArguments(inputArgs, null);
        return update(parsed.args, parsed.options);
      },
      dismiss() {
        dismiss();
      },
    };

    if (options.closeButton) {
      actions.appendChild(createCloseButton(host.document, dismiss));
    }

    if (options.pauseOnInteraction) {
      node.addEventListener("pointerenter", pauseTimer);
      node.addEventListener("pointerleave", resumeTimer);
      node.addEventListener("focusin", pauseTimer);
      node.addEventListener("focusout", (event) => {
        const nextTarget = event.relatedTarget;

        if (!nextTarget || !node.contains(nextTarget)) {
          resumeTimer();
        }
      });
    }

    node.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (state.stackExpanded) {
        event.preventDefault();
        event.stopPropagation();
        setStackExpanded(false);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      dismiss();
    });

    renderArgs(args, options);
    host.container.prepend(node);
    state.toasts.push(record);
    installSwipeToDismiss(record, host);
    syncStackLayout();

    const requestFrame =
      typeof host.window.requestAnimationFrame === "function"
        ? host.window.requestAnimationFrame.bind(host.window)
        : (callback) => host.window.setTimeout(callback, 0);

    requestFrame(() => {
      if (node.isConnected) {
        node.dataset.visible = "true";
      }
    });

    scheduleTimer();
    return { record, controller };
  }

  function showToast(inputArgs, forcedType) {
    const parsed = parseArguments(inputArgs, forcedType);
    const options = normalizeToastOptions(parsed.options);

    if (options.id) {
      const existing = state.recordsById.get(options.id);

      if (existing && !existing.removed) {
        existing.lastSeenAt = Date.now();
        return existing.update(parsed.args, parsed.options);
      }
    }

    const dedupeKey = options.dedupe
      ? createDedupeKey(parsed.args, options)
      : null;

    if (dedupeKey && !options.id) {
      const existing = state.dedupeRecords.get(dedupeKey);
      const now = Date.now();

      if (
        existing &&
        !existing.removed &&
        now - existing.lastSeenAt <= options.dedupeWindow
      ) {
        existing.lastSeenAt = now;
        return existing.bumpDuplicate();
      }
    }

    const created = createToastRecord(parsed.args, parsed.options);

    if (!created) {
      return null;
    }

    created.record.dedupeKey = dedupeKey;

    if (options.id) {
      state.recordsById.set(options.id, created.record);
    }

    if (dedupeKey) {
      state.dedupeRecords.set(dedupeKey, created.record);
    }

    return created.controller;
  }

  function showDebugToast(inputArgs) {
    const parsed = parseArguments(inputArgs, "debug");

    if (!shouldRenderDebug(parsed.args)) {
      runDownloadFallback(parsed.args);
      return null;
    }

    return showToast(inputArgs, "debug");
  }

  function toast(...args) {
    return showToast(args, null);
  }

  toast.error = (...args) => showToast(args, "error");
  toast.info = (...args) => showToast(args, "info");
  toast.success = (...args) => showToast(args, "success");
  toast.warning = (...args) => showToast(args, "warning");
  toast.debug = (...args) => showDebugToast(args);
  toast.inspect = (...args) => showDebugToast(args);

  toast.options = (options = {}) => {
    const normalized = { ...options };

    Object.defineProperty(normalized, OPTIONS_SYMBOL, {
      value: true,
      enumerable: false,
    });

    return normalized;
  };

  toast.with = (options = {}) => {
    const markedOptions = toast.options(options);
    return (...args) => toast(...args, markedOptions);
  };

  toast.update = (id, ...inputArgs) => {
    const record = state.recordsById.get(String(id));

    if (!record || record.removed) {
      return null;
    }

    const parsed = parseArguments(inputArgs, null);
    record.lastSeenAt = Date.now();
    return record.update(parsed.args, parsed.options);
  };

  toast.dismiss = (target) => {
    if (target && typeof target.dismiss === "function") {
      target.dismiss();
      return true;
    }

    if (target !== undefined && target !== null) {
      const record = state.recordsById.get(String(target));

      if (record && !record.removed) {
        record.dismiss();
        return true;
      }
    }

    return false;
  };

  toast.dismissAll = () => {
    for (const record of [...state.toasts]) {
      record.dismiss(true);
    }
  };

  toast.expand = () => setStackExpanded(true);
  toast.collapse = () => setStackExpanded(false);
  toast.toggleStack = () => {
    setStackExpanded(!state.stackExpanded);
    return state.stackExpanded;
  };

  toast.loadInspector = () => loadObjectInspector();

  toast.configure = (nextConfig = {}) => {
    const allowedPositions = new Set([
      "top-center",
      "top-left",
      "top-right",
      "bottom-center",
      "bottom-left",
      "bottom-right",
    ]);

    for (const key of Object.keys(DEFAULT_CONFIG)) {
      if (hasOwn(nextConfig, key)) {
        state.config[key] = nextConfig[key];
      }
    }

    state.config.maxToasts = Math.max(
      1,
      Number(state.config.maxToasts) || DEFAULT_CONFIG.maxToasts,
    );
    state.config.inspectDepth = Math.max(
      0,
      Number(state.config.inspectDepth) || 0,
    );
    state.config.inspectItems = Math.max(
      0,
      Number(state.config.inspectItems) || 0,
    );
    state.config.previewItems = Math.max(
      0,
      Number(state.config.previewItems) || 0,
    );
    state.config.stackVisible = Math.min(
      3,
      Math.max(
        1,
        Number(state.config.stackVisible) || DEFAULT_CONFIG.stackVisible,
      ),
    );
    state.config.swipeThreshold = Math.max(
      24,
      Number(state.config.swipeThreshold) || DEFAULT_CONFIG.swipeThreshold,
    );
    state.config.swipeVelocity = Math.max(
      0.05,
      Number(state.config.swipeVelocity) || DEFAULT_CONFIG.swipeVelocity,
    );
    state.config.objectInspectorLoadTimeout = Math.max(
      1000,
      Number(state.config.objectInspectorLoadTimeout) ||
        DEFAULT_CONFIG.objectInspectorLoadTimeout,
    );
    state.config.virtualizeAfter = Math.max(
      1,
      Number(state.config.virtualizeAfter) || DEFAULT_CONFIG.virtualizeAfter,
    );
    state.config.virtualRowHeight = Math.max(
      16,
      Number(state.config.virtualRowHeight) || DEFAULT_CONFIG.virtualRowHeight,
    );
    state.config.virtualOverscan = Math.max(
      1,
      Number(state.config.virtualOverscan) || DEFAULT_CONFIG.virtualOverscan,
    );
    state.config.virtualMaxHeight = Math.max(
      120,
      Number(state.config.virtualMaxHeight) || DEFAULT_CONFIG.virtualMaxHeight,
    );
    state.config.stacked = Boolean(state.config.stacked);
    state.config.swipeToDismiss = Boolean(state.config.swipeToDismiss);
    state.config.virtualizeInspector = Boolean(state.config.virtualizeInspector);
    state.config.unmountInspectorOnCollapse = Boolean(
      state.config.unmountInspectorOnCollapse,
    );

    if (!allowedPositions.has(state.config.position)) {
      state.config.position = DEFAULT_CONFIG.position;
    }

    if (
      typeof state.config.shouldDebug !== "boolean" &&
      typeof state.config.shouldDebug !== "function"
    ) {
      state.config.shouldDebug = DEFAULT_CONFIG.shouldDebug;
    }

    if (
      state.config.downloadFallback !== null &&
      typeof state.config.downloadFallback !== "function"
    ) {
      state.config.downloadFallback = DEFAULT_CONFIG.downloadFallback;
    }

    if (
      state.config.objectInspectorSrc !== null &&
      typeof state.config.objectInspectorSrc !== "string"
    ) {
      state.config.objectInspectorSrc = DEFAULT_CONFIG.objectInspectorSrc;
    }

    if (state.container) {
      state.container.dataset.position = state.config.position;
      syncStackLayout();
    }

    return { ...state.config };
  };

  toast.getConfig = () => ({ ...state.config });
  toast.version = VERSION;

  Object.defineProperty(toast, "objectInspector", {
    configurable: true,
    enumerable: true,
    get() {
      return getObjectInspectorApi();
    },
  });

  state.api = toast;

  try {
    Object.defineProperty(initialHostWindow, TOAST_GLOBAL, {
      value: toast,
      configurable: true,
      writable: true,
    });
  } catch {
    initialHostWindow[TOAST_GLOBAL] = toast;
  }

  globalWindow[TOAST_GLOBAL] = toast;
  globalWindow.toast = toast;
})(window);
