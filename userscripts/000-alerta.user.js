// ==UserScript==
// @name         ⛺️ 002 / Alerta v7.6.0 / Broto Deep Store Shell
// @namespace    https://rod.dev/userscripts
// @version      7.6.0
// @description  Alerta shell powered by Fabrica + Broto deep stores, reusable plugin UI components, source viewer, modal API, safe storage, Lucide/fallback icons, and viewport-safe panel controls.
// @author       Rod
// @match        *://*/*
// @run-at       document-start
// @weight       998
// @grant        none
// @require      https://code.migos.club/api/cdn?preset=highlight&css=highlight.js/styles/base16/material-darker.min.css&bundle=iife&global=RodCDN&cache=immutable
// @noframes
// ==/UserScript==

(async function AlertaFabricaShell() {
  "use strict";

  /* *************** */
  /* Constants       */
  /* *************** */

  const VERSION = "7.6.0";
  const HOST_ID = "__rod_alerta_fabrica_host__";
  const ROOT_ID = "__rod_alerta_fabrica_root__";
  const STYLE_ID = "__rod_alerta_fabrica_style__";
  const STORAGE_KEY = "rod.alerta.fabrica.v7.6";
  const LEGACY_STORAGE_KEY = "rod.alerta.fabrica.v7.5";
  const DEBUG_KEY = "rod.alerta.fabrica.debug";
  const PLUGIN_STORAGE_PREFIX = "rod.alerta.fabrica.plugin";

  const INITIAL_LIMIT = 60;
  const LIMIT_STEP = 60;
  const MAX_RECORDS = 500;
  const MAX_TEXT = 900;
  const MAX_TREE_ITEMS = 220;
  const MAX_TREE_RENDER_ITEMS = 64;
  const SEARCH_DEBOUNCE_MS = 80;
  const FLASH_MS = 1_200;
  const BOOT_TIMEOUT_MS = 12_000;
  const DRAG_THRESHOLD_PX = 5;
  const MIN_DOCK_Y = 18;
  const DOCK_BOTTOM_GAP = 88;
  const MIN_PANEL_WIDTH = 320;
  const MIN_PANEL_HEIGHT = 260;
  const PANEL_SCREEN_GAP = 10;
  const PANEL_FLOAT_MIN_X = 6;
  const PANEL_FLOAT_MIN_Y = 6;
  const SOURCE_LINE_HEIGHT = 20;
  const SOURCE_OVERSCAN = 30;
  const SOURCE_MAX_PRETTY = 300_000;

  const nativeConsole = window.nativeConsole || {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
    trace: console.trace
      ? console.trace.bind(console)
      : console.log.bind(console),
    time: console.time ? console.time.bind(console) : function noopTime() {},
    timeEnd: console.timeEnd
      ? console.timeEnd.bind(console)
      : function noopTimeEnd() {},
  };

  window.nativeConsole = nativeConsole;

  const Utils = await waitForRequiredGlobal("RodUtils", BOOT_TIMEOUT_MS);
  const FabricaApi = normalizeFabricaApi(
    Utils.Fabrica || window.Fabrica || window.Rod,
  );
  const BrotoApi = normalizeBrotoApi(
    Utils.Broto || FabricaApi.Broto || window.Broto,
  );

  const { $$, css } = Utils;
   
  const {
    html: fabricaHtml,
    render,
    repeat,
    when,
    ref,
    rawHtml: fabricaRawHtml,
  } = normalizeFabricaViews(FabricaApi);

  const html = fabricaHtml;
  const rawHtml =
    fabricaRawHtml ||
    FabricaApi.html?.raw ||
    ((value) => ({ __kind: "rawHtml", value: String(value) }));
  const signal = BrotoApi.signal || FabricaApi.signal || Utils.signal;
  const computed = BrotoApi.computed || FabricaApi.computed || Utils.computed;
  const effect = BrotoApi.effect || FabricaApi.effect || Utils.effect;
  const batch =
    BrotoApi.batch || FabricaApi.batch || ((callback) => callback());
  const storeFactory = BrotoApi.store || Utils.store || createFallbackDeepStore;

  const eventBus = createEventBus();
  const objectStoreMap = new Map();
  const objectRefs = new WeakMap();
  const expandedPaths = new Set();
  const expandedPathLimits = new Map();
  const customActions = new Map();

  let host = null;
  let shadowRoot = null;
  let root = null;
  let disposer = null;
  let resizeState = null;
  let dragState = null;
  let dockDragging = false;
  let nextObjectId = 1;
  let searchTimer = 0;
  let statePersistSuspended = false;
  let pendingStatePersist = false;
  let api = null;

  window.addEventListener("error", handleFatalError);
  window.addEventListener("unhandledrejection", handlePromiseFatalError);

  boot().catch((error) => {
    nativeConsole.error("[Alerta Boot Fatal]", error);
    insertBootError(error);
  });

  /* *************** */
  /* Boot            */
  /* *************** */

async function boot() {
  await waitForDocumentElement();
  cleanupPreviousInstance();

  appStore.ui.debugLogs.set(Boolean(readStorageValue(DEBUG_KEY, true)));

  api = createPluginApi("core");

  exposePublicApi();
  registerCorePlugins();
  mountShell();

  effect(
    () => {
      debug.setEnabled(appStore.ui.debugLogs());

      if (statePersistSuspended) {
        pendingStatePersist = true;
        return;
      }

      saveState(getStateSnapshot());
    },
    { scheduler: "microtask" },
  );

  debug.info("shell:ready", {
    version: VERSION,
    brotoDeepStore: Boolean(BrotoApi.store || Utils.store),
    fabrica: typeof FabricaApi.debug === "function" ? FabricaApi.debug() : null,
  });
}


  /* *************** */
  /* Broto Store     */
  /* *************** */

  const initialState = createInitialState();
  const appStore = storeFactory(initialState);

  const debug = createDebugLogger("core");
  debug.log("store", "initial", initialState);
  debug.log("store", "storeFactory", appStore);
  
  
  const visiblePluginsSignal = computed(() =>
    readStore(appStore.plugins.items).filter(
      (plugin) => plugin.enabled !== false,
    ),
  );
  const activePluginSignal = computed(() => {
    const items = visiblePluginsSignal();
    const tab = readStore(appStore.ui.tab);
    return items.find((plugin) => plugin.id === tab) || items[0] || null;
  });
  const totalCountSignal = computed(() => getTotalPluginCount());
  const panelClassSignal = computed(() => {
    return [
      "ra-panel",
      appStore.ui.open() ? "ra-open" : "",
      appStore.panel.docked() ? "" : "ra-floating",
      appStore.ui.zen() ? "ra-zen" : "",
    ]
      .filter(Boolean)
      .join(" ");
  });
  
  debug.log("panelClassSignal", panelClassSignal())
  
  const panelStyleSignal = computed(() =>
    styleObjectToCss({
      "--ra-w": `${appStore.panel.width()}px`,
      "--ra-h": `${appStore.panel.height()}px`,
      "--ra-x": `${appStore.panel.x()}px`,
      "--ra-y": `${appStore.panel.y()}px`,
      "--ra-font-size": `${appStore.ui.fontSize()}px`,
      "--ra-opacity": String(readStore(appStore.ui.opacity)),
      "--ra-density-scale":
        readStore(appStore.ui.density) === "compact"
          ? "0.86"
          : readStore(appStore.ui.density) === "spacious"
            ? "1.14"
            : "1",
    }),
  );
  
  debug.log("panelStyleSignal", panelStyleSignal())

  /*effect(
    () => {
      debug.setEnabled(readStore(appStore.ui.debugLogs));

      if (statePersistSuspended) {
        pendingStatePersist = true;
        return;
      }

      saveState(getStateSnapshot());
    },
    { scheduler: "microtask" },
  );
  */
  function createInitialState() {
    const fallback = {
      ui: {
        open: false,
        zen: false,
        tab: "settings",
        query: "",
        queryDraft: "",
        defaultTab: "settings",
        defaultFullscreen: false,
        theme: "dark",
        density: "compact",
        fontSize: 11,
        opacity: 0.74,
        debugLogs: true,
      },
      panel: {
        docked: true,
        dockY: Math.round(window.innerHeight * 0.34),
        x: 16,
        y: 72,
        width: 520,
        height: Math.min(780, window.innerHeight - 28),
      },
      modal: createModalState(),
      source: createSourceState(),
      plugins: {
        items: [],
        filters: {},
        limits: {},
        settings: {},
        settingsGroups: {},
      },
      tree: {
        version: 0,
      },
    };

    const saved = readStorageValue(
      STORAGE_KEY,
      readStorageValue(LEGACY_STORAGE_KEY, {}),
    );
    const normalized = normalizeSavedState(saved, fallback);
    const rect = clampPanelRect(normalized.panel);

    return {
      ...normalized,
      panel: {
        ...normalized.panel,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        docked: true,
      },
      ui: {
        ...normalized.ui,
        tab: normalized.ui.defaultTab || normalized.ui.tab || "settings",
        queryDraft: normalized.ui.query || "",
      },
      plugins: {
        ...normalized.plugins,
        items: [],
        limits: {},
      },
    };
  }

  function normalizeSavedState(saved, fallback) {
    if (saved?.ui && saved?.panel && saved?.plugins) {
      return mergeDeep(fallback, saved);
    }

    return mergeDeep(fallback, {
      ui: {
        open: saved.open,
        zen: saved.zen,
        tab: saved.tab,
        query: saved.query,
        queryDraft: saved.query,
        defaultTab: saved.defaultTab,
        defaultFullscreen: saved.defaultFullscreen,
        theme: saved.theme,
        density: saved.density,
        fontSize: saved.fontSize,
        opacity: saved.opacity,
        debugLogs: saved.debugLogs,
      },
      panel: {
        docked: saved.docked,
        dockY: saved.dockY,
        x: saved.x,
        y: saved.y,
        width: saved.width,
        height: saved.height,
      },
      plugins: {
        filters: saved.filters,
        limits: saved.limits,
        settings: saved.plugins,
        settingsGroups: saved.settingsGroups,
      },
    });
  }

  function getStateSnapshot() {
    const snapshot = snapshotStore(appStore);
    
    // TODO: Extract
    const { ui, panel, plugins } = snapshot; 

    return {
      open: snapshot.ui.open,
      docked: snapshot.panel.docked,
      zen: snapshot.ui.zen,
      dockY: snapshot.panel.dockY,
      x: snapshot.panel.x,
      y: snapshot.panel.y,
      width: snapshot.panel.width,
      height: snapshot.panel.height,
      query: snapshot.ui.query,
      tab: snapshot.ui.tab,
      defaultTab: snapshot.ui.defaultTab,
      defaultFullscreen: snapshot.ui.defaultFullscreen,
      theme: snapshot.ui.theme,
      density: snapshot.ui.density,
      fontSize: snapshot.ui.fontSize,
      opacity: snapshot.ui.opacity,
      debugLogs: snapshot.ui.debugLogs,
      filters: snapshot.plugins.filters || {},
      limits: snapshot.plugins.limits || {},
      plugins: snapshot.plugins.settings || {},
      settingsGroups: snapshot.plugins.settingsGroups || {},
      __deep: snapshot,
    };
  }

  function patchState(partial) {
    const previous = getStateSnapshot();
    const next =
      typeof partial === "function"
        ? partial(previous)
        : { ...previous, ...partial };

    applyStateSnapshot(next);

    return getStateSnapshot();
  }

  function updateState(mutator) {
    return patchState((previous) => {
      const next = {
        ...previous,
        filters: { ...(previous.filters || {}) },
        limits: { ...(previous.limits || {}) },
        plugins: clonePlainObject(previous.plugins || {}),
        settingsGroups: clonePlainObject(previous.settingsGroups || {}),
      };

      mutator(next);

      return next;
    });
  }

  function applyStateSnapshot(state) {
    batch(() => {
      if ("open" in state) appStore.ui.open.set(Boolean(state.open));
      if ("docked" in state) appStore.panel.docked.set(Boolean(state.docked));
      if ("zen" in state) appStore.ui.zen.set(Boolean(state.zen));
      if ("dockY" in state)
        appStore.panel.dockY.set(
          clampNumber(
            state.dockY,
            MIN_DOCK_Y,
            Math.max(MIN_DOCK_Y, window.innerHeight - DOCK_BOTTOM_GAP),
          ),
        );

      if ("width" in state)
        appStore.panel.width.set(
          clampNumber(
            state.width,
            MIN_PANEL_WIDTH,
            Math.max(MIN_PANEL_WIDTH, window.innerWidth - PANEL_SCREEN_GAP * 2),
          ),
        );
      if ("height" in state)
        appStore.panel.height.set(
          clampNumber(
            state.height,
            MIN_PANEL_HEIGHT,
            Math.max(
              MIN_PANEL_HEIGHT,
              window.innerHeight - PANEL_SCREEN_GAP * 2,
            ),
          ),
        );

      if (
        "x" in state ||
        "y" in state ||
        "width" in state ||
        "height" in state
      ) {
        const rect = clampPanelRect({
          x: "x" in state ? state.x : readStore(appStore.panel.x),
          y: "y" in state ? state.y : readStore(appStore.panel.y),
          width: readStore(appStore.panel.width),
          height: readStore(appStore.panel.height),
        });

        appStore.panel.x.set(rect.x);
        appStore.panel.y.set(rect.y);
        appStore.panel.width.set(rect.width);
        appStore.panel.height.set(rect.height);
      }

      if ("query" in state) {
        const query = String(state.query || "");
        appStore.ui.query.set(query);
        appStore.ui.queryDraft.set(query);
      }

      if ("tab" in state) appStore.ui.tab.set(String(state.tab || "settings"));
      if ("defaultTab" in state)
        appStore.ui.defaultTab.set(String(state.defaultTab || "settings"));
      if ("defaultFullscreen" in state)
        appStore.ui.defaultFullscreen.set(Boolean(state.defaultFullscreen));
      if ("theme" in state)
        appStore.ui.theme.set(String(state.theme || "dark"));
      if ("density" in state)
        appStore.ui.density.set(String(state.density || "compact"));
      if ("fontSize" in state)
        appStore.ui.fontSize.set(Number(state.fontSize || 12));
      if ("opacity" in state)
        appStore.ui.opacity.set(Number(state.opacity || 0.94));
      if ("debugLogs" in state)
        appStore.ui.debugLogs.set(Boolean(state.debugLogs));
      if ("filters" in state)
        appStore.plugins.filters.set({ ...(state.filters || {}) });
      if ("limits" in state)
        appStore.plugins.limits.set({ ...(state.limits || {}) });
      if ("plugins" in state)
        appStore.plugins.settings.set({ ...(state.plugins || {}) });
      if ("settingsGroups" in state)
        appStore.plugins.settingsGroups.set({
          ...(state.settingsGroups || {}),
        });
    });
  }

  function saveState(state) {
    return writeStorageValue(STORAGE_KEY, getPersistableState(state));
  }

  function getPersistableState(state) {
    return {
      ui: {
        zen: Boolean(state.zen),
        query: state.query || "",
        tab: state.tab,
        defaultTab: state.defaultTab,
        defaultFullscreen: Boolean(state.defaultFullscreen),
        theme: state.theme,
        density: state.density,
        fontSize: state.fontSize,
        opacity: state.opacity,
        debugLogs: Boolean(state.debugLogs),
      },
      panel: {
        dockY: state.dockY,
        x: state.x,
        y: state.y,
        width: state.width,
        height: state.height,
      },
      plugins: {
        filters: { ...(state.filters || {}) },
        settings: { ...(state.plugins || {}) },
        settingsGroups: { ...(state.settingsGroups || {}) },
      },
    };
  }

  /* *************** */
  /* Mount           */
  /* *************** */

  function mountShell() {
   /* host = document.createElement("div");
    host.id = HOST_ID;
    host.dataset.raHost = "true";
    host.style.cssText = `all:initial;
      position:fixed;
      inset:0;
      z-index:2147483647;
      pointer-events:none;`;
      
      */
      
      
      host = $$("<div>").props({
        id: HOST_ID,
        data: {
          raHost: true,
        },
        style: css`
          all:initial;
          position:fixed;
          inset:0;
          z-index:2147483647;
          pointer-events:none;
        `
      });

    document.documentElement.appendChild(host);

    shadowRoot = host.attachShadow({ mode: "open" });
    installShellStyle(shadowRoot);

    root = $$("<div>");
    root.id = ROOT_ID;
    root.className = "ra-root";

    shadowRoot.appendChild(root);
    disposer = render(root, html`<${App} />`);

    window.Alerta = window.RodDockedInspector;

    refreshIcons();
  }

  function installShellStyle(targetRoot) {
    const style = $$("<style>");
    style.id = STYLE_ID;
    
    const textContent = Utils.getCssText(getShellStyle()) // .transformedCss;
    debug.log("installShellStyle", Utils.trimText(textContent, 200))

    style.textContent = textContent;
    
    targetRoot.appendChild(style);
    return style;
  }

  /* *************** */
  /* Components      */
  /* *************** */

  const Components = Object.freeze({
    App,
    Dock,
    Panel,
    PanelHeader,
    Toolbar,
    Tabs,
    TabButton,
    FilterRow,
    ActivePluginView,
    ResizeHandle,
    ModalHost,
    Modal,
    SourceModalHost,
    SourceModal,
    Button,
    IconButton,
    PillButton,
    ToolbarButton,
    PanelCard,
    EmptyState,
    SettingField,
    SettingsGroup,
    ActionsRow,
    SearchInput,
    SelectInput,
  });

  function App() {
    return html`
      <${Dock} />
      <${Panel} />
      <${ModalHost} />
      <${SourceModalHost} />
    `;
  }

  function Dock() {
    return html`
      <button
        class="ra-dock"
        style=${() =>
          styleObjectToCss({ "--dock-top": `${appStore.panel.dockY()}px` })}
        type="button"
        @click=${toggleInspector}
        @pointerdown=${startDockDrag}
        aria-label="Toggle Alerta"
      >
        <span class="ra-dock-inner">
          ${icon("panel-right-open")}
          <span class="ra-dock-count">${() => String(totalCountSignal())}</span>
        </span>
      </button>
    `;
  }

  function Panel() {
    return html`
      <section
        class=${panelClassSignal}
        style=${panelStyleSignal}
        data-ra-theme=${() => readStore(appStore.ui.theme)}
      >
        <${PanelHeader} />
        <${Toolbar} />
        <${Tabs} />
        <${FilterRow} />
        <${ActivePluginView} />
        <${ResizeHandle} />
      </section>
    `;
  }

  function PanelHeader() {
    return html`
      <header class="ra-header" @pointerdown=${startPanelDrag}>
        <div class="ra-title">
          ${icon("bug")}
          <span>Alerta</span>
        </div>
        <${ActionsRow} className="ra-actions">
          <${ToolbarButton} icon=${() => (readStore(appStore.ui.zen) ? "shrink" : "expand")} label="Zen" onClick=${toggleZenMode} />
          <${ToolbarButton} icon="copy" label="Copy" onClick=${copyVisible} />
          <${ToolbarButton} icon="trash-2" label="Clear" tone="danger" onClick=${clearCurrent} />
          <${ToolbarButton} icon="minus" label="Min" onClick=${minimizeInspector} />
        </${ActionsRow}>
      </header>
    `;
  }

  function Toolbar() {
    return html`
      <div class="ra-toolbar">
        ${icon("search")}
        <${SearchInput}
          value=${() => readStore(appStore.ui.queryDraft)}
          placeholder="Filter..."
          onInput=${handleSearch}
        />
      </div>
    `;
  }

  function Tabs() {
    return html`
      <nav class="ra-tabs">
        ${repeat(
          visiblePluginsSignal,
          (plugin) => plugin.id,
          ({ item }) => html`<${TabButton} plugin=${item} />`,
        )}
      </nav>
    `;
  }

  function TabButton({ plugin }) {
    return html`
      <button
        class=${() =>
          `ra-tab ${readStore(appStore.ui.tab) === plugin().id ? "ra-active" : ""}`}
        type="button"
        @click=${() => setTab(plugin().id)}
      >
        ${() => icon(plugin().icon || "puzzle")}
        ${() =>
          readStore(appStore.ui.zen)
            ? ""
            : html`<span>${plugin().title}</span>`}
      </button>
    `;
  }

  function FilterRow() {
    return html`
      <div class="ra-filter-row">
        ${() => {
          const plugin = activePluginSignal();
          return plugin?.renderFilters ? plugin.renderFilters(plugin.api) : "";
        }}
      </div>
    `;
  }

  function ActivePluginView() {
    return html`
      <main class="ra-main">
        ${() => {
          const plugin = activePluginSignal();
          return plugin?.render ? plugin.render(plugin.api) : "";
        }}
      </main>
    `;
  }

  function ResizeHandle() {
    return html`<div class="ra-resize" @pointerdown=${startResize}></div>`;
  }

  function ModalHost() {
    return html`
      ${() => (readStore(appStore.modal.open) ? html`<${Modal} />` : "")}
    `;
  }

  function Modal() {
    let inputRef = null;
    const modal = snapshotStore(appStore.modal);

    return html`
      <div class="ra-modal-root" @click=${handleModalBackdrop}>
        <section
          class=${`ra-modal ra-modal-${modal.tone}`}
          role="dialog"
          aria-modal="true"
        >
          <header class="ra-modal-head">
            <div class="ra-modal-title">
              <span class="ra-modal-icon"
                >${icon(modal.icon || "sparkles")}</span
              >
              <div>
                <strong>${modal.title}</strong>
                ${modal.message ? html`<small>${modal.message}</small>` : ""}
              </div>
            </div>
            <${IconButton}
              icon="x"
              label="Close"
              className="ra-modal-close"
              onClick=${() => closeModal(null)}
            />
          </header>

          <div class="ra-modal-body">
            ${modal.kind === "prompt" && modal.multiline
              ? html`<textarea
                  class="ra-modal-textarea"
                  placeholder=${modal.placeholder}
                  .value=${modal.value || ""}
                  ref=${ref((node) => {
                    inputRef = node;
                  })}
                ></textarea>`
              : ""}
            ${modal.kind === "prompt" && !modal.multiline
              ? html`<input
                  class="ra-modal-input"
                  type="text"
                  placeholder=${modal.placeholder}
                  .value=${modal.value || ""}
                  ref=${ref((node) => {
                    inputRef = node;
                  })}
                />`
              : ""}
            ${modal.body
              ? html`<div class="ra-modal-content">${modal.body}</div>`
              : ""}
          </div>

          <footer class="ra-modal-actions">
            ${modal.showCancel
              ? html`<${PillButton}
                  label=${modal.cancelText}
                  tone="secondary"
                  onClick=${() => closeModal(null)}
                />`
              : ""}
            <${PillButton}
              label=${modal.confirmText}
              tone="primary"
              onClick=${() => confirmModalAction(inputRef)}
            />
          </footer>
        </section>
      </div>
    `;
  }

  function SourceModalHost() {
    return html`
      ${() => (readStore(appStore.source.open) ? html`<${SourceModal} />` : "")}
    `;
  }

  function SourceModal() {
    const state = snapshotStore(appStore.source);
    const height = Math.max(240, state.viewportHeight || 520);
    const first = Math.max(
      0,
      Math.floor((state.scrollTop || 0) / SOURCE_LINE_HEIGHT) - SOURCE_OVERSCAN,
    );
    const count = Math.ceil(height / SOURCE_LINE_HEIGHT) + SOURCE_OVERSCAN * 2;
    const visibleLines = state.highlightedLines.slice(first, first + count);
    const totalHeight = Math.max(
      SOURCE_LINE_HEIGHT,
      state.highlightedLines.length * SOURCE_LINE_HEIGHT,
    );

    return html`
      <div class="ra-source-backdrop" @click=${handleSourceBackdrop}>
        <section class="ra-source-modal" role="dialog" aria-modal="true">
          <header class="ra-source-head">
            <div class="ra-source-title">
              <span>${icon("code-2")}</span>
              <div>
                <strong>${state.title}</strong>
                <small
                  >${state.language} · ${state.lineCount}
                  lines${state.url ? ` · ${state.url}` : ""}</small
                >
              </div>
            </div>
            <nav class="ra-source-actions">
              ${state.url
                ? html`<${PillButton}
                    icon="external-link"
                    label="Open"
                    onClick=${() =>
                      window.open(state.url, "_blank", "noopener,noreferrer")}
                  />`
                : ""}
              ${state.url
                ? html`<${PillButton}
                    icon="link"
                    label="URL"
                    onClick=${() => copyText(state.url)}
                  />`
                : ""}
              <${PillButton}
                icon="copy"
                label="Copy"
                onClick=${() => copyText(state.current)}
              />
              <${PillButton}
                icon="wrap-text"
                label=${state.wrap ? "Wrap" : "No wrap"}
                onClick=${toggleSourceWrap}
              />
              <${IconButton}
                icon="x"
                label="Close"
                onClick=${closeSourceModal}
              />
            </nav>
          </header>

          <main
            class=${`ra-source-body ${state.wrap ? "ra-source-wrap" : ""}`}
            @scroll=${handleSourceScroll}
          >
            <div
              class="ra-source-spacer"
              style=${styleObjectToCss({ height: `${totalHeight}px` })}
            ></div>
            <div
              class="ra-source-lines"
              style=${styleObjectToCss({
                transform: `translateY(${first * SOURCE_LINE_HEIGHT}px)`,
              })}
            >
              ${visibleLines.map((line, index) => {
                const lineNumber = first + index + 1;
                return html`
                  <div class="ra-source-line">
                    <span class="ra-source-line-no">${String(lineNumber)}</span>
                    <code>${rawHtml(line || " ")}</code>
                  </div>
                `;
              })}
            </div>
          </main>
        </section>
      </div>
    `;
  }

  function Button(props = {}) {
    const tone = props.tone || "neutral";
    const size = props.size || "md";
    const type = props.type || "button";
    const className = props.className || "";
    const iconName =
      typeof props.icon === "function" ? props.icon() : props.icon;
    const label = props.label ?? props.children ?? "";

    return html`
      <button
        class=${`ra-button ra-button-${tone} ra-button-${size} ${className}`}
        type=${type}
        title=${props.title || label || ""}
        aria-label=${props.ariaLabel || props.title || label || "Button"}
        @click=${(event) => props.onClick?.(event)}
      >
        ${iconName ? icon(iconName) : ""}
        ${label ? html`<span class="ra-button-label">${label}</span>` : ""}
      </button>
    `;
  }

  function IconButton(props = {}) {
    return html`<${Button}
      ...${props}
      className=${`ra-icon-button ${props.className || ""}`}
      label=""
    />`;
  }

  function PillButton(props = {}) {
    return html`<${Button}
      ...${props}
      className=${`ra-pill ${props.className || ""}`}
    />`;
  }

  function ToolbarButton(props = {}) {
    return html`<${Button}
      ...${props}
      className=${`ra-toolbar-button ${props.className || ""}`}
    />`;
  }

  function PanelCard(props = {}) {
    return html`<article class=${`ra-card ${props.className || ""}`}>
      ${props.children || ""}
    </article>`;
  }

  function EmptyState(props = {}) {
    return html`
      <div class="ra-empty">
        ${icon(props.icon || "moon")}
        <div>${props.message || "Nothing here yet."}</div>
      </div>
    `;
  }

  function ActionsRow(props = {}) {
    return html`<div class=${props.className || "ra-actions"}>
      ${props.children || ""}
    </div>`;
  }

  function SearchInput(props = {}) {
    return html`
      <input
        class="ra-search"
        type="search"
        placeholder=${props.placeholder || "Search..."}
        autocomplete="off"
        .value=${typeof props.value === "function"
          ? props.value()
          : props.value || ""}
        @input=${(event) => props.onInput?.(event)}
      />
    `;
  }

  function SelectInput(props = {}) {
    return html`
      <select
        class="ra-select"
        .value=${String(props.value ?? "")}
        @change=${(event) => props.onChange?.(event)}
      >
        ${(props.options || []).map(
          (option) =>
            html`<option value=${option.value}>${option.label}</option>`,
        )}
      </select>
    `;
  }

  function SettingsGroup({ pluginId, title, iconName, fields }) {
    return html`
      <article class="ra-settings-group">
        <header class="ra-settings-group-head">
          <div>${icon(iconName)}<strong>${title}</strong></div>
          <span>${String(fields.length)}</span>
        </header>
        <div class="ra-settings-grid">
          ${fields.map(
            (field) =>
              html`<${SettingField} pluginId=${pluginId} field=${field} />`,
          )}
        </div>
      </article>
    `;
  }

  function SettingField({ pluginId, field }) {
    const type = field.type || "text";

    return html`
      <label class="ra-setting-field">
        <span class="ra-setting-label">
          <strong>${field.label || field.key}</strong>
          ${field.description ? html`<small>${field.description}</small>` : ""}
        </span>
        <span class="ra-setting-control">
          ${type === "boolean"
            ? html`<input
                class="ra-switch"
                type="checkbox"
                .checked=${Boolean(field.value)}
                @change=${(event) =>
                  handleSettingAction(
                    `${pluginId}:${field.key}:${type}`,
                    event.target,
                  )}
              />`
            : ""}
          ${type === "select"
            ? html`<${SelectInput}
                value=${String(field.value)}
                options=${field.options || []}
                onChange=${(event) =>
                  handleSettingAction(
                    `${pluginId}:${field.key}:${type}`,
                    event.target,
                  )}
              />`
            : ""}
          ${type === "range"
            ? html` <div class="ra-range-wrap">
                <input
                  class="ra-range"
                  type="range"
                  min=${field.min}
                  max=${field.max}
                  step=${field.step || 1}
                  .value=${String(field.value)}
                  @input=${(event) =>
                    handleSettingAction(
                      `${pluginId}:${field.key}:${type}`,
                      event.target,
                    )}
                />
                <code>${String(field.value)}</code>
              </div>`
            : ""}
          ${type === "number"
            ? html`<input
                class="ra-input"
                type="number"
                min=${field.min}
                max=${field.max}
                step=${field.step || 1}
                .value=${String(field.value)}
                @input=${(event) =>
                  handleSettingAction(
                    `${pluginId}:${field.key}:${type}`,
                    event.target,
                  )}
              />`
            : ""}
          ${type === "text"
            ? html`<input
                class="ra-input"
                type="text"
                .value=${String(field.value ?? "")}
                @input=${(event) =>
                  handleSettingAction(
                    `${pluginId}:${field.key}:${type}`,
                    event.target,
                  )}
              />`
            : ""}
        </span>
      </label>
    `;
  }

  /* *************** */
  /* Public API      */
  /* *************** */

  function createPluginApi(pluginId = "core") {
    const normalizedPluginId = normalizePluginId(pluginId);
    const pluginDebug = createDebugLogger(normalizedPluginId);

    return {
      version: VERSION,
      pluginId: normalizedPluginId,
      debug: pluginDebug,
      html,
      render,
      signal,
      computed,
      effect,
      batch,
      repeat,
      when,
      ref,
      rawHtml,
      store: appStore,
      deepStore: appStore,
      snapshot: () => snapshotStore(appStore),
      components: Components,
      Button,
      IconButton,
      PillButton,
      ToolbarButton,
      PanelCard,
      EmptyState,
      SearchInput,
      SelectInput,
      get state() {
        return getStateSnapshot();
      },
      patchState,
      updateState,
      readStorage: readStorageValue,
      saveStorage: writeStorageValue,
      pluginsSignal: appStore.plugins.items,
      modalSignal: appStore.modal,
      sourceSignal: appStore.source,
      utils: Utils,
      nativeConsole,
      icon,
      prettySource,
      highlightCode,
      registerPlugin,
      unregisterPlugin,
      scheduleRender: refreshIcons,
      selectElement,
      revealElementInElementsPanel,
      viewRecords,
      viewInspectableObject,
      viewNode,
      renderDefaultFilter,
      registerAction,
      runAction,
      setTab,
      clearCurrent,
      copyVisible,
      getActivePlugin: () => activePluginSignal(),
      getVisiblePlugins: () => visiblePluginsSignal(),
      getPluginSetting,
      setPluginSetting,
      createRecord,
      appendRecord,
      createLogSurface,
      objectStore: {
        raw: objectStoreMap,
        set: storeObject,
        get: (id) => objectStoreMap.get(id),
        has: (id) => objectStoreMap.has(id),
        delete: (id) => objectStoreMap.delete(id),
        entries: () => objectStoreMap.entries(),
        values: () => objectStoreMap.values(),
        size: () => objectStoreMap.size,
      },
      settings: {
        register: registerPluginSettings,
        get: getPluginSetting,
        set: setPluginSetting,
        groups: () => readStore(appStore.plugins.settingsGroups),
        resetAll: resetAllSettings,
      },
      modal: {
        open: openModal,
        alert: alertModal,
        confirm: confirmModal,
        prompt: promptModal,
        source: openSourceModal,
        openSource: openSourceModal,
        close: closeModal,
      },
      format: {
        escapeHtml,
        getNodeLabel,
        getObjectPreview,
        getRichCode,
        formatValue,
        formatHtml,
        formatCss,
        highlightCode,
        highlightSource: highlightCode,
        prettySource,
        formatSource: prettySource,
        stringifyPreview,
        getTime,
      },
      dom: {
        focusObject,
        setDollarZero,
        flashElement,
        getElementFromObject,
      },
      on: eventBus.on.bind(eventBus),
      off: eventBus.off.bind(eventBus),
      emit: eventBus.emit.bind(eventBus),
      addStyle,
      minimize: minimizeInspector,
      open: openInspector,
      toggle: toggleInspector,
      toggleZenMode,
      withoutStatePersistence,
      withSilentState,
      storage: createPluginStorage(normalizedPluginId),
    };
  }

  function exposePublicApi() {
    window.RodDockedInspector = {
      version: VERSION,
      api,
      debug,
      store: appStore,
      deepStore: appStore,
      snapshot: () => snapshotStore(appStore),
      components: Components,
      registerPlugin,
      unregisterPlugin,
      open: openInspector,
      minimize: minimizeInspector,
      toggle: toggleInspector,
      toggleZenMode,
      selectElement,
      revealElementInElementsPanel,
      createLogSurface,
      objectStore: objectStoreMap,
      modal: api.modal,
      utils: api.utils,
      format: api.format,
      clear() {
        const plugins = readStore(appStore.plugins.items);
        for (let index = 0; index < plugins.length; index += 1) {
          const plugin = plugins[index];
          if (typeof plugin.clear === "function") plugin.clear(plugin.api);
        }
      },
      destroy() {
        try {
          disposer?.();
        } catch {}
        try {
          eventBus.clear();
        } catch {}
        try {
          window.removeEventListener("error", handleFatalError);
        } catch {}
        try {
          window.removeEventListener(
            "unhandledrejection",
            handlePromiseFatalError,
          );
        } catch {}
        document.getElementById(HOST_ID)?.remove();
      },
    };

    window.Alerta = window.RodDockedInspector;
  }

  /* *************** */
  /* Plugins         */
  /* *************** */

  function registerCorePlugins() {
    registerPlugin({
      id: "settings",
      title: "Settings",
      icon: "settings",
      order: 999,
      render: renderSettingsPlugin,
    });

    registerPluginSettings("core", [
      {
        key: "debugLogs",
        type: "boolean",
        label: "Debug logs",
        description: "Print namespaced diagnostics in the browser console.",
        defaultValue: readStore(appStore.ui.debugLogs),
      },
      {
        key: "defaultTab",
        type: "select",
        label: "Default tab",
        defaultValue: readStore(appStore.ui.defaultTab),
        options: () =>
          visiblePluginsSignal().map((plugin) => ({
            label: plugin.title,
            value: plugin.id,
          })),
      },
      {
        key: "defaultFullscreen",
        type: "boolean",
        label: "Default Zen",
        defaultValue: readStore(appStore.ui.defaultFullscreen),
      },
      {
        key: "theme",
        type: "select",
        label: "Theme",
        defaultValue: readStore(appStore.ui.theme),
        options: [
          { label: "Dark", value: "dark" },
          { label: "Charcoal", value: "charcoal" },
          { label: "OLED", value: "oled" },
        ],
      },
      {
        key: "density",
        type: "select",
        label: "Density",
        defaultValue: readStore(appStore.ui.density),
        options: [
          { label: "Compact", value: "compact" },
          { label: "Comfortable", value: "comfortable" },
          { label: "Spacious", value: "spacious" },
        ],
      },
      {
        key: "fontSize",
        type: "range",
        label: "Font size",
        min: 10,
        max: 18,
        step: 1,
        defaultValue: readStore(appStore.ui.fontSize),
      },
      {
        key: "opacity",
        type: "range",
        label: "Opacity",
        min: 0.72,
        max: 1,
        step: 0.01,
        defaultValue: readStore(appStore.ui.opacity),
      },
      {
        key: "width",
        type: "number",
        label: "Width",
        min: MIN_PANEL_WIDTH,
        max: 1200,
        step: 20,
        defaultValue: readStore(appStore.panel.width),
      },
      {
        key: "height",
        type: "number",
        label: "Height",
        min: MIN_PANEL_HEIGHT,
        max: 1200,
        step: 20,
        defaultValue: readStore(appStore.panel.height),
      },
    ]);
  }

  function registerPlugin(plugin) {
    if (!plugin?.id) return false;

    const pluginId = normalizePluginId(plugin.id);
    const pluginApi = createPluginApi(pluginId);
    const currentPlugins = readStore(appStore.plugins.items).slice();
    const existingIndex = currentPlugins.findIndex(
      (item) => item.id === pluginId,
    );

    const finalPlugin = {
      order: 100,
      enabled: true,
      setup: null,
      teardown: null,
      renderFilters: null,
      clear: null,
      copy: null,
      getCount: null,
      ...plugin,
      id: pluginId,
      api: pluginApi,
    };

    if (existingIndex >= 0) {
      try {
        currentPlugins[existingIndex].teardown?.(
          currentPlugins[existingIndex].api,
        );
      } catch (error) {
        pluginApi.debug.warn("plugin:previous teardown failed", error);
      }
    }

    if (typeof finalPlugin.setup === "function") {
      try {
        pluginApi.debug.time("plugin:setup");
        finalPlugin.setup(pluginApi);
        pluginApi.debug.timeEnd("plugin:setup");
      } catch (error) {
        pluginApi.debug.error("plugin:setup failed", error);
      }
    }

    const nextPlugins = currentPlugins.slice();
    if (existingIndex >= 0) nextPlugins[existingIndex] = finalPlugin;
    else nextPlugins.push(finalPlugin);

    nextPlugins.sort((left, right) => left.order - right.order);
    appStore.plugins.items.set(nextPlugins);

    updateState((next) => {
      if (!next.filters[pluginId]) next.filters[pluginId] = "all";
      if (!next.limits[pluginId]) next.limits[pluginId] = INITIAL_LIMIT;
    });

    eventBus.emit("plugin:registered", finalPlugin);
    refreshIcons();
    return true;
  }

  function unregisterPlugin(pluginId) {
    const id = normalizePluginId(pluginId);
    const currentPlugins = readStore(appStore.plugins.items);
    const plugin = currentPlugins.find((item) => item.id === id);
    if (!plugin) return false;

    try {
      plugin.teardown?.(plugin.api);
    } catch (error) {
      plugin.api?.debug?.warn("plugin:teardown failed", error);
    }

    appStore.plugins.items.set(currentPlugins.filter((item) => item.id !== id));

    if (readStore(appStore.ui.tab) === id) {
      appStore.ui.tab.set(visiblePluginsSignal()[0]?.id || "settings");
    }

    eventBus.emit("plugin:unregistered", plugin);
    return true;
  }

  /* *************** */
  /* Modal API       */
  /* *************** */

  function openModal(options = {}) {
    if (options.kind === "source") return openSourceModal(options);

    return new Promise((resolve) => {
      appStore.modal.set({
        open: true,
        kind: options.kind || "custom",
        tone: options.tone || "default",
        icon: options.icon || toneToIcon(options.tone),
        title: options.title || "Alerta",
        message: options.message || "",
        body: options.body || "",
        value: options.value || "",
        placeholder: options.placeholder || "",
        multiline: Boolean(options.multiline),
        confirmText: options.confirmText || "OK",
        cancelText: options.cancelText || "Cancel",
        showCancel: Boolean(options.showCancel),
        resolve,
      });

      refreshIcons();
    });
    
    eventBus.emit("modal:open");
  }

  function alertModal(options = {}) {
    return openModal({ ...options, kind: "alert", showCancel: false }).then(
      () => true,
    );
  }

  function confirmModal(options = {}) {
    return openModal({ ...options, kind: "confirm", showCancel: true }).then(
      Boolean,
    );
  }

  function promptModal(options = {}) {
    return openModal({ ...options, kind: "prompt", showCancel: true });
  }

  async function openSourceModal(input) {
    if (typeof input === "number") {
      const value = objectStoreMap.get(input);
      if (!value) return null;
      return openSourceModal({
        title: getNodeLabel(value),
        source: getRichCode(value) || formatValue(value),
        language: getCodeLanguage(value),
      });
    }

    const source = String(input?.source || "");
    const language = input?.language || "javascript";
    const title = input?.title || "Source";
    const url = input?.url || input?.href || input?.src || "";

    appStore.source.set({
      ...createSourceState(),
      open: true,
      title,
      language,
      url,
      current: "Formatting source...",
      highlightedLines: [escapeHtml("Formatting source...")],
      lineCount: 1,
    });

    refreshIcons();
    await Promise.resolve();

    const pretty = await Promise.resolve(
      prettySource(source, language, { maxLength: SOURCE_MAX_PRETTY }),
    );
    const highlighted = highlightCode(pretty, language);
    const highlightedLines = splitHighlightedLines(highlighted);

    appStore.source.set({
      ...snapshotStore(appStore.source),
      current: pretty,
      highlightedLines,
      lineCount: Math.max(1, highlightedLines.length),
      scrollTop: 0,
    });

    refreshIcons();
    return true;
  }

  function closeSourceModal() {
    appStore.source.set(createSourceState());
  }

  function closeModal(result = null) {
    const modal = snapshotStore(appStore.modal);
    appStore.modal.set(createModalState());
    if (modal?.resolve) modal.resolve(result);
    eventBus.emit("modal:close", result);
  }

  function confirmModalAction(inputRef) {
    const modal = snapshotStore(appStore.modal);
    if (modal.kind === "prompt") {
      closeModal(inputRef ? inputRef.value : "");
      return;
    }
    closeModal(true);
  }

  function handleModalBackdrop(event) {
    if (event.target.classList.contains("ra-modal-root")) closeModal(null);
  }

  function handleSourceBackdrop(event) {
    if (event.target.classList.contains("ra-source-backdrop"))
      closeSourceModal();
  }

  function handleSourceScroll(event) {
    const target = event.currentTarget;
    appStore.source.scrollTop.set(target.scrollTop);
    appStore.source.viewportHeight.set(
      target.clientHeight || readStore(appStore.source.viewportHeight),
    );
  }

  function toggleSourceWrap() {
    appStore.source.wrap.set(!readStore(appStore.source.wrap));
  }

  function createModalState() {
    return {
      open: false,
      kind: "custom",
      tone: "default",
      icon: "sparkles",
      title: "Alerta",
      message: "",
      body: "",
      value: "",
      placeholder: "",
      multiline: false,
      confirmText: "OK",
      cancelText: "Cancel",
      showCancel: false,
      resolve: null,
    };
  }

  function createSourceState() {
    return {
      open: false,
      title: "Source",
      language: "javascript",
      url: "",
      current: "",
      highlightedLines: [],
      lineCount: 0,
      scrollTop: 0,
      viewportHeight: 520,
      wrap: true,
    };
  }

  function toneToIcon(tone) {
    if (tone === "danger") return "circle-alert";
    if (tone === "warning") return "triangle-alert";
    if (tone === "success") return "circle-check";
    return "sparkles";
  }

  /* *************** */
  /* Settings        */
  /* *************** */

  function renderSettingsPlugin() {
    return html`
      <section class="ra-settings">
        <div class="ra-settings-hero">
          <div>
            <strong>Alerta Settings</strong>
            <span
              >Deep store core state and every plugin setting in one
              place.</span
            >
          </div>
          <div class="ra-settings-actions">
            <${PillButton}
              icon="copy"
              label="Export"
              onClick=${exportSettings}
            />
            <${PillButton}
              icon="upload"
              label="Import"
              onClick=${importSettings}
            />
            <${PillButton}
              icon="rotate-ccw"
              label="Reset"
              tone="danger"
              onClick=${resetAllSettings}
            />
          </div>
        </div>

        ${() =>
          Object.entries(readStore(appStore.plugins.settingsGroups) || {}).map(
            ([pluginId, fields]) => {
              const plugin = readStore(appStore.plugins.items).find(
                (item) => item.id === pluginId,
              );
              return html`<${SettingsGroup}
                pluginId=${pluginId}
                title=${plugin
                  ? plugin.title
                  : pluginId === "core"
                    ? "Core"
                    : pluginId}
                iconName=${plugin?.icon ||
                (pluginId === "core" ? "panel-top" : "puzzle")}
                fields=${fields.map((field) => ({
                  ...field,
                  value:
                    pluginId === "core"
                      ? getCoreSetting(field.key)
                      : getPluginSetting(
                          pluginId,
                          field.key,
                          field.defaultValue,
                        ),
                  options:
                    typeof field.options === "function"
                      ? field.options()
                      : field.options,
                }))}
              />`;
            },
          )}
      </section>
    `;
  }

  function registerPluginSettings(pluginId, fields) {
    const id = normalizePluginId(pluginId);
    if (!Array.isArray(fields)) return false;

    updateState((next) => {
      if (!next.plugins[id]) next.plugins[id] = {};
      next.settingsGroups[id] = fields
        .filter((field) => field?.key)
        .map((field) => {
          if (next.plugins[id][field.key] === undefined)
            next.plugins[id][field.key] = field.defaultValue;
          return {
            type: field.type || "text",
            key: field.key,
            label: field.label || field.key,
            description: field.description || "",
            defaultValue: field.defaultValue,
            min: field.min,
            max: field.max,
            step: field.step,
            options: field.options || [],
          };
        });
    });

    return true;
  }

  function getCoreSetting(key) {
    if (key === "debugLogs") return readStore(appStore.ui.debugLogs);
    if (key === "defaultTab") return readStore(appStore.ui.defaultTab);
    if (key === "defaultFullscreen")
      return readStore(appStore.ui.defaultFullscreen);
    if (key === "theme") return readStore(appStore.ui.theme);
    if (key === "density") return readStore(appStore.ui.density);
    if (key === "fontSize") return readStore(appStore.ui.fontSize);
    if (key === "opacity") return readStore(appStore.ui.opacity);
    if (key === "width") return readStore(appStore.panel.width);
    if (key === "height") return readStore(appStore.panel.height);
    return getStateSnapshot()[key];
  }

  function setCoreSetting(key, value) {
    if (key === "debugLogs") appStore.ui.debugLogs.set(Boolean(value));
    else if (key === "defaultTab") appStore.ui.defaultTab.set(String(value));
    else if (key === "defaultFullscreen") {
      appStore.ui.defaultFullscreen.set(Boolean(value));
      appStore.ui.zen.set(Boolean(value));
    } else if (key === "theme") appStore.ui.theme.set(String(value));
    else if (key === "density") appStore.ui.density.set(String(value));
    else if (key === "fontSize") appStore.ui.fontSize.set(Number(value));
    else if (key === "opacity") appStore.ui.opacity.set(Number(value));
    else if (key === "width") appStore.panel.width.set(Number(value));
    else if (key === "height") appStore.panel.height.set(Number(value));
    else patchState({ [key]: value });
  }

  function getPluginSetting(pluginId, key, fallback = undefined) {
    const settings = readStore(appStore.plugins.settings);
    return settings?.[normalizePluginId(pluginId)]?.[key] !== undefined
      ? settings[normalizePluginId(pluginId)][key]
      : fallback;
  }

  function setPluginSetting(pluginId, key, value) {
    const id = normalizePluginId(pluginId);
    const settings = { ...(readStore(appStore.plugins.settings) || {}) };
    settings[id] = { ...(settings[id] || {}), [key]: value };
    appStore.plugins.settings.set(settings);
    eventBus.emit("setting:changed", { pluginId: id, key, value });
  }

  function handleSettingAction(encoded, target) {
    const [pluginId, key, type] = encoded.split(":");
    let value = target.value;

    if (type === "boolean") value = Boolean(target.checked);
    if (type === "number" || type === "range") value = Number(value);

    if (pluginId === "core") setCoreSetting(key, value);
    else setPluginSetting(pluginId, key, value);
  }

  function resetAllSettings() {
    batch(() => {
      appStore.ui.defaultTab.set("settings");
      appStore.ui.defaultFullscreen.set(false);
      appStore.ui.theme.set("dark");
      appStore.ui.density.set("compact");
      appStore.ui.fontSize.set(12);
      appStore.ui.opacity.set(0.94);
      appStore.ui.debugLogs.set(true);
      appStore.panel.width.set(520);
      appStore.panel.height.set(Math.min(780, window.innerHeight - 28));
      appStore.ui.zen.set(false);
      appStore.ui.tab.set("settings");
    });
    eventBus.emit("settings:reset", api);
  }

  function exportSettings() {
    copyText(
      JSON.stringify(
        {
          core: getStateSnapshot(),
          plugins: readStore(appStore.plugins.settings),
        },
        null,
        2,
      ),
    );
  }

  function importSettings() {
    promptModal({
      title: "Import settings",
      message: "Paste Alerta settings JSON.",
      placeholder: "{ ... }",
      multiline: true,
      confirmText: "Import",
    }).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        updateState((next) => {
          Object.assign(next, parsed.core || {});
          next.plugins = { ...next.plugins, ...(parsed.plugins || {}) };
        });
      } catch (error) {
        alertModal({
          tone: "danger",
          title: "Invalid JSON",
          message: String(error?.message || error),
        });
      }
    });
  }

  /* *************** */
  /* Shared Views    */
  /* *************** */

  function renderDefaultFilter() {
    const plugin = activePluginSignal();
    if (!plugin?.filters?.length) return "";

    const filters = readStore(appStore.plugins.filters);
    const value = filters[plugin.id] || "all";

    return html`
      <select
        class="ra-select ra-filter-select"
        .value=${value}
        @change=${(event) => setPluginFilter(plugin.id, event.target.value)}
      >
        ${plugin.filters.map(
          (item) =>
            html`<option value=${item}>
              ${item === "all" ? `All ${plugin.title.toLowerCase()}` : item}
            </option>`,
        )}
      </select>
    `;
  }

  function viewRecords(pluginId, records, renderRecord) {
    const limits = readStore(appStore.plugins.limits);
    const limit = limits[pluginId] || INITIAL_LIMIT;
    const visible = records.slice(0, limit);

    if (!visible.length)
      return html`<${EmptyState}
        icon="moon"
        message=${`No ${pluginId} yet.`}
      />`;

    return html`
      ${repeat(
        () => visible,
        (record) => record.id,
        ({ item }) => renderRecord(item()),
      )}
      ${records.length > visible.length
        ? html`<button class="ra-load-more" type="button" @click=${loadMore}>
            Load more
          </button>`
        : ""}
    `;
  }

  function viewInspectableObject(refId, path, label, options = {}) {
    const value = objectStoreMap.get(refId);
    if (!value) return "";

    const element = getElementFromObject(value);
    const showActions = options.showActions !== false;
    const react = element && isReactElement(element);

    return html`
      <section class="ra-object-card">
        ${showActions
          ? html` <div class="ra-inspect-actions">
              <${PillButton}
                icon="badge-dollar-sign"
                label="$0"
                onClick=${() => setDollarZero(refId)}
              />
              ${element
                ? html`<${PillButton}
                    icon="mouse-pointer-click"
                    label="Elements"
                    onClick=${() => revealElementRef(refId)}
                  />`
                : ""}
              ${react
                ? html`<${PillButton}
                    icon="atom"
                    label="React"
                    onClick=${() => revealReactRef(refId)}
                  />`
                : ""}
              <${PillButton}
                icon="scan-search"
                label="Focus"
                onClick=${() => focusObject(refId)}
              />
              <${PillButton}
                icon="code-2"
                label="Source"
                onClick=${() => openSourceModal(refId)}
              />
            </div>`
          : ""}
        ${viewNode(value, path, label, 0)}
      </section>
    `;
  }

  function viewNode(value, path, label, depth) {
    readStore(appStore.tree.version);

    if (!isObjectLike(value)) {
      return html`
        <div
          class="ra-tree-row"
          style=${styleObjectToCss({ paddingLeft: `${depth * 12}px` })}
        >
          <span class="ra-tree-spacer"></span>
          <span
            >${label
              ? html`<span class="ra-key">${label}:</span> `
              : ""}${getNodeLabel(value)}</span
          >
        </div>
      `;
    }

    const isOpen = expandedPaths.has(path);
    const allEntries = isOpen ? getEntries(value, path) : [];
    const pathLimit = expandedPathLimits.get(path) || MAX_TREE_RENDER_ITEMS;
    const entries = allEntries.slice(0, pathLimit);

    return html`
      <div class="ra-tree-item">
        <div
          class="ra-tree-row"
          style=${styleObjectToCss({ paddingLeft: `${depth * 12}px` })}
        >
          <button
            class="ra-tree-toggle"
            type="button"
            @click=${() => togglePath(path)}
          >
            ${icon(isOpen ? "chevron-down" : "chevron-right")}
          </button>
          <span class="ra-tree-summary"
            >${label
              ? html`<span class="ra-key">${label}:</span> `
              : ""}${rawHtml(getObjectPreview(value))}</span
          >
        </div>
        ${isOpen
          ? html`
              ${entries.map((entry) =>
                viewNode(entry.value, entry.path, entry.label, depth + 1),
              )}
              ${allEntries.length > entries.length
                ? html`<button
                    class="ra-tree-more"
                    type="button"
                    @click=${() => expandPathLimit(path)}
                  >
                    Load
                    ${Math.min(
                      MAX_TREE_RENDER_ITEMS,
                      allEntries.length - entries.length,
                    )}
                    more
                  </button>`
                : ""}
            `
          : ""}
      </div>
    `;
  }

  function getEntries(value, basePath) {
    if (!isObjectLike(value)) return [];

    if (isNodeListLike(value) || Array.isArray(value)) {
      const limit = Math.min(value.length, MAX_TREE_ITEMS);
      const output = new Array(limit);
      for (let index = 0; index < limit; index += 1)
        output[index] = {
          label: String(index),
          value: value[index],
          path: `${basePath}[${index}]`,
        };
      return output;
    }

    if (value instanceof Element) {
      return [
        { label: "tagName", value: value.tagName, path: `${basePath}.tagName` },
        { label: "id", value: value.id, path: `${basePath}.id` },
        {
          label: "className",
          value: value.className,
          path: `${basePath}.className`,
        },
        {
          label: "attributes",
          value: Array.from(value.attributes).map((attr) => ({
            name: attr.name,
            value: attr.value,
          })),
          path: `${basePath}.attributes`,
        },
        {
          label: "dataset",
          value: { ...value.dataset },
          path: `${basePath}.dataset`,
        },
        {
          label: "children",
          value: Array.from(value.children),
          path: `${basePath}.children`,
        },
        {
          label: "outerHTML",
          value: formatHtml(value.outerHTML || ""),
          path: `${basePath}.outerHTML`,
        },
      ];
    }

    const keys = Reflect.ownKeys(value).slice(0, MAX_TREE_ITEMS);
    return keys.map((key) => ({
      label: String(key),
      value: safeCall(() => value[key], "[Throws]"),
      path: `${basePath}.${String(key)}`,
    }));
  }

  /* *************** */
  /* Records         */
  /* *************** */

  function createRecord(options) {
    const values = options.values || [];
    const refIds = [];
    let react = false;

    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (isObjectLike(value)) {
        const refId = storeObject(value);
        if (refId !== null) refIds.push(refId);
        const element = getElementFromObject(value);
        if (element && isReactElement(element)) react = true;
      }
    }

    return {
      id: options.id ?? Date.now() + Math.random(),
      kind: options.kind || "log",
      type: options.type || options.kind || "log",
      time: options.time || getTime(),
      preview: options.preview || "",
      parts: options.parts || [],
      refIds: options.refIds || refIds,
      refId: options.refId ?? null,
      react: options.react ?? react,
      count: options.count || 1,
      groupKey:
        options.groupKey ||
        `${options.kind || "record"}:${options.preview || ""}:${refIds.join("|")}`,
      ...options.extra,
    };
  }

  function appendRecord(list, record, options = {}) {
    const shouldGroup = options.group !== false;
    const maxRecords = options.maxRecords || MAX_RECORDS;
    const previous = list[0];

    if (shouldGroup && previous?.groupKey === record.groupKey) {
      previous.count += 1;
      previous.time = getTime();
      return previous;
    }

    list.unshift(record);
    if (list.length > maxRecords) list.length = maxRecords;
    return record;
  }

  function createLogSurface(container, options = {}) {
    const target =
      typeof container === "string"
        ? document.querySelector(container)
        : container;
    if (!target)
      throw new Error("[Alerta] createLogSurface needs a valid container.");

    const recordsSignal = signal([]);
    const limitSignal = signal(options.limit || INITIAL_LIMIT);
    let surfaceDisposer = null;

    const surface = {
      container: target,
      recordsSignal,
      limitSignal,
      options: {
        toolbar: true,
        group: true,
        maxRecords: MAX_RECORDS,
        ...options,
      },
      log(...values) {
        return surface.add("log", ...values);
      },
      info(...values) {
        return surface.add("info", ...values);
      },
      warn(...values) {
        return surface.add("warn", ...values);
      },
      error(...values) {
        return surface.add("error", ...values);
      },
      debugLog(...values) {
        return surface.add("debug", ...values);
      },
      add(kind, ...values) {
        const current = recordsSignal.peek
          ? recordsSignal.peek().slice()
          : recordsSignal().slice();
        const preview = values.map(stringifyPreview).join(" ");
        const record = createRecord({
          kind,
          type: kind,
          values,
          preview,
          groupKey: `${kind}:${preview}`,
        });
        appendRecord(current, record, surface.options);
        recordsSignal.set(current);
        return values.length === 1 ? values[0] : values;
      },
      clear() {
        recordsSignal.set([]);
      },
      destroy() {
        surfaceDisposer?.();
      },
    };

    target.classList.add("ra-log-surface-host");
    surfaceDisposer = render(target, viewLogSurface(surface));
    refreshIcons();
    return surface;
  }

  function viewLogSurface(surface) {
    return html`
      <section class="ra-log-surface">
        ${surface.options.toolbar
          ? html` <div class="ra-surface-toolbar">
              <span class="ra-kind"
                >${icon(surface.options.icon || "terminal")}${surface.options
                  .title || "Logs"}</span
              >
              <${PillButton}
                icon="trash-2"
                label="Clear"
                tone="danger"
                onClick=${surface.clear}
              />
            </div>`
          : ""}
        ${() => {
          const visible = surface
            .recordsSignal()
            .slice(0, surface.limitSignal());
          if (!visible.length)
            return html`<${EmptyState} icon="moon" message="No logs yet." />`;
          return repeat(
            () => visible,
            (record) => record.id,
            ({ item }) => viewBasicRecordCard(item(), surface.options),
          );
        }}
      </section>
    `;
  }

  function viewBasicRecordCard(record, options = {}) {
    const hasObjects = record.refIds?.length > 0;
    const showActions = options.showActions !== false;

    return html`
      <article class=${`ra-card ra-kind-${record.kind} ra-compact-card`}>
        <div class=${`ra-card-head ${hasObjects ? "ra-has-body" : ""}`}>
          <span class="ra-meta">
            <span class="ra-kind"
              >${icon(
                kindToIcon(record.kind),
              )}<span>${record.kind}</span>${record.react
                ? html`<span class="ra-react-badge">⚛</span>`
                : ""}${record.count > 1
                ? html`<span class="ra-count">${String(record.count)}</span>`
                : ""}</span
            >
            <span class="ra-time">${record.time}</span>
          </span>
          <div class="ra-message">${record.preview}</div>
        </div>
        ${hasObjects
          ? html`<div class="ra-card-body">
              ${record.refIds.map((refId, index) =>
                viewInspectableObject(refId, `$[${index}]`, "", {
                  showActions,
                }),
              )}
            </div>`
          : ""}
      </article>
    `;
  }

  /* *************** */
  /* Actions         */
  /* *************** */

  function registerAction(actionName, handler) {
    customActions.set(actionName, handler);
    return () => customActions.delete(actionName);
  }

  function runAction(action, event, target) {
    if (!action) return;
    const direct = customActions.get(action);
    if (direct) {
      direct(event, target, api);
      return;
    }
    if (action === "open") openInspector(event);
  }

  function setTab(tab) {
    updateState((next) => {
      next.tab = tab;
      next.limits[tab] = INITIAL_LIMIT;
    });
    eventBus.emit("tab:changed", tab);
    refreshIcons();
  }

  function setPluginFilter(pluginId, value) {
    updateState((next) => {
      next.filters[pluginId] = value;
      next.limits[pluginId] = INITIAL_LIMIT;
    });
    eventBus.emit("filter:changed", { pluginId, value });
  }

  function loadMore() {
    const pluginId = readStore(appStore.ui.tab);
    updateState((next) => {
      next.limits[pluginId] =
        (next.limits[pluginId] || INITIAL_LIMIT) + LIMIT_STEP;
    });
  }

  function openInspector(event) {  
    event?.preventDefault?.();
    if (dockDragging) return;
    appStore.ui.open.set(true);
    eventBus.emit("panel:open", api);
    refreshIcons();
    
    debug.log("openInspector", appStore.ui()); 
  }

  function toggleInspector(event) {
    event?.preventDefault?.();
    if (dockDragging) return;
    const nextOpen = !readStore(appStore.ui.open);
    appStore.ui.open.set(nextOpen);
    eventBus.emit(nextOpen ? "panel:open" : "panel:minimize", api);
    refreshIcons();
    
    debug.log("toggleInspector", {
      nextOpen,
      stateUi: appStore.ui() 
    });
  }

  function minimizeInspector() {
    appStore.ui.open.set(false);
    eventBus.emit("panel:minimize", api);
  }

  function toggleZenMode() {
    batch(() => {
      appStore.ui.zen.set(!readStore(appStore.ui.zen));
      appStore.ui.open.set(true);
    });
    eventBus.emit("panel:zen", readStore(appStore.ui.zen));
    refreshIcons();
  }

  function clearCurrent() {
    const active = activePluginSignal();
    if (active?.clear) active.clear(active.api);
    eventBus.emit("records:clear", readStore(appStore.ui.tab));
  }

  function copyVisible() {
    const active = activePluginSignal();
    if (active?.copy) active.copy(active.api);
  }

  function handleSearch(event) {
    clearTimeout(searchTimer);
    const value = event.target.value;
    appStore.ui.queryDraft.set(value);
    searchTimer = setTimeout(() => {
      updateState((next) => {
        next.query = value;
        if (next.tab) next.limits[next.tab] = INITIAL_LIMIT;
      });
      eventBus.emit("search:changed", value);
    }, SEARCH_DEBOUNCE_MS);
  }

  function togglePath(path) {
    if (expandedPaths.has(path)) expandedPaths.delete(path);
    else expandedPaths.add(path);
    appStore.tree.version.set(readStore(appStore.tree.version) + 1);
  }

  function expandPathLimit(path) {
    expandedPathLimits.set(
      path,
      (expandedPathLimits.get(path) || MAX_TREE_RENDER_ITEMS) +
        MAX_TREE_RENDER_ITEMS,
    );
    appStore.tree.version.set(readStore(appStore.tree.version) + 1);
  }

  /* *************** */
  /* DOM Helpers     */
  /* *************** */

  function storeObject(value, preferredId = null) {
    if (!isObjectLike(value)) return null;
    if (objectRefs.has(value)) return objectRefs.get(value);
    const id = preferredId ?? nextObjectId++;
    objectStoreMap.set(id, value);
    try {
      objectRefs.set(value, id);
    } catch {}
    return id;
  }

  function setDollarZero(refId) {
    const value = objectStoreMap.get(refId);
    const element = getElementFromObject(value);
    window.$0 = element || value;
    if (element) flashElement(element);
    eventBus.emit("$0:updated", window.$0);
  }

  function selectElement(element, options = {}) {
    if (!(element instanceof Element)) return false;
    window.$0 = element;
    flashElement(element);
    eventBus.emit("element:selected", {
      element,
      source: options.source || "api",
    });
    return true;
  }

  function revealElementRef(refId) {
    const value = objectStoreMap.get(refId);
    const element = getElementFromObject(value);
    if (element) revealElementInElementsPanel(element);
  }

  function revealReactRef(refId) {
    const value = objectStoreMap.get(refId);
    const element = getElementFromObject(value);
    if (!element) return;
    window.$r = getReactOwnerInfo(element);
    selectElement(element, { source: "react" });
    eventBus.emit("react:selected", { element, react: window.$r });
    setTab("elements");
  }

  function revealElementInElementsPanel(element) {
    selectElement(element, { source: "logs" });
    setTab("elements");
    eventBus.emit("elements:reveal", element);
  }

  function focusObject(refId) {
    const value = objectStoreMap.get(refId);
    const element = getElementFromObject(value);
    if (!element) return;
    minimizeInspector();
    window.$0 = element;
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
    flashElement(element);
  }

  function flashElement(element) {
    if (!(element instanceof Element)) return;
    const previous = {
      outline: element.style.outline,
      outlineOffset: element.style.outlineOffset,
      transition: element.style.transition,
    };
    element.style.transition = "outline 160ms ease, outline-offset 160ms ease";
    element.style.outline = "4px solid rgba(125,211,252,.95)";
    element.style.outlineOffset = "5px";
    setTimeout(() => {
      element.style.outline = previous.outline;
      element.style.outlineOffset = previous.outlineOffset;
      element.style.transition = previous.transition;
    }, FLASH_MS);
  }

  /* *************** */
  /* Drag Resize     */
  /* *************** */

  function bindPointerSession({ event, onMove, onEnd }) {
    const pointerId = event.pointerId;

    function handleMove(nextEvent) {
      if (nextEvent.pointerId !== pointerId) return;
      onMove(nextEvent);
    }

    function handleEnd(nextEvent) {
      if (nextEvent.pointerId !== pointerId) return;
      cleanup();
      onEnd?.(nextEvent);
    }

    function cleanup() {
      window.removeEventListener("pointermove", handleMove, true);
      window.removeEventListener("pointerup", handleEnd, true);
      window.removeEventListener("pointercancel", handleEnd, true);
    }

    window.addEventListener("pointermove", handleMove, true);
    window.addEventListener("pointerup", handleEnd, true);
    window.addEventListener("pointercancel", handleEnd, true);
    return cleanup;
  }

  function startDockDrag(event) {
    const logger = debug.child("startDockDrag");
    
    logger.log("dragstate initial", {dragState});
    dragState = {
      type: "dock",
      startY: event.clientY,
      initialY: appStore.panel.dockY(),
    };
    
    debug.log({dragState});
    
    dockDragging = false;

    bindPointerSession({
      event,
      onMove(nextEvent) {
        if (!dragState || dragState.type !== "dock") return;
        
        const deltaY = nextEvent.clientY - dragState.startY;
        
        if (Math.abs(deltaY) > DRAG_THRESHOLD_PX) dockDragging = true;
        appStore.panel.dockY.set(
          clampNumber(
            dragState.initialY + deltaY,
            MIN_DOCK_Y,
            Math.max(MIN_DOCK_Y, window.innerHeight - DOCK_BOTTOM_GAP),
          ),
        );
        
        logger.log("appStore.panel", appStore.panel());
      },
      onEnd() {
        dragState = null;
        requestAnimationFrame(() => {
          dockDragging = false;
        });
      },
    });
  }

  function startPanelDrag(event) {
    if (event.target.closest("button,input,select,textarea,a")) return;
    if (readStore(appStore.ui.zen)) return;

    const panel = event.currentTarget.closest(".ra-panel");
    const rect = panel.getBoundingClientRect();
    
    dragState = {
      type: "panel",
      startX: event.clientX,
      startY: event.clientY,
      initialX: rect.left,
      initialY: rect.top,
      width: rect.width,
      height: rect.height,
    };
    
    appStore.panel.docked.set(false);

    bindPointerSession({
      event,
      onMove(nextEvent) {
        if (!dragState || dragState.type !== "panel") return;
        const rect = clampPanelRect({
          x: dragState.initialX + nextEvent.clientX - dragState.startX,
          y: dragState.initialY + nextEvent.clientY - dragState.startY,
          width: dragState.width,
          height: dragState.height,
        });
        batch(() => {
          appStore.panel.x.set(rect.x);
          appStore.panel.y.set(rect.y);
        });
      },
      onEnd() {
        dragState = null;
      },
    });
  }

  function startResize(event) {
    if (readStore(appStore.ui.zen)) return;
    const panel = event.currentTarget.closest(".ra-panel");
    const rect = panel.getBoundingClientRect();
    resizeState = {
      startX: event.clientX,
      startY: event.clientY,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
    appStore.panel.docked.set(false);

    bindPointerSession({
      event,
      onMove(nextEvent) {
        if (!resizeState) return;
        const rect = clampPanelRect({
          x: resizeState.x,
          y: resizeState.y,
          width: resizeState.width + nextEvent.clientX - resizeState.startX,
          height: resizeState.height + nextEvent.clientY - resizeState.startY,
        });
        batch(() => {
          appStore.panel.width.set(rect.width);
          appStore.panel.height.set(rect.height);
          appStore.panel.x.set(rect.x);
          appStore.panel.y.set(rect.y);
        });
      },
      onEnd() {
        resizeState = null;
      },
    });
  }

  window.addEventListener("resize", () => {
    const rect = clampPanelRect({
      x: readStore(appStore.panel.x),
      y: readStore(appStore.panel.y),
      width: readStore(appStore.panel.width),
      height: readStore(appStore.panel.height),
    });

    batch(() => {
      appStore.panel.x.set(rect.x);
      appStore.panel.y.set(rect.y);
      appStore.panel.width.set(rect.width);
      appStore.panel.height.set(rect.height);
      appStore.panel.dockY.set(
        clampNumber(
          readStore(appStore.panel.dockY),
          MIN_DOCK_Y,
          Math.max(MIN_DOCK_Y, window.innerHeight - DOCK_BOTTOM_GAP),
        ),
      );
    });
  });

  /* *************** */
  /* Storage         */
  /* *************** */

  function withoutStatePersistence(callback) {
    statePersistSuspended = true;
    try {
      return callback();
    } finally {
      statePersistSuspended = false;
      if (pendingStatePersist) {
        pendingStatePersist = false;
        saveState(getStateSnapshot());
      }
    }
  }

  function withSilentState(callback) {
    const previousPersist = statePersistSuspended;
    statePersistSuspended = true;
    try {
      return callback();
    } finally {
      statePersistSuspended = previousPersist;
    }
  }

  function createPluginStorage(pluginId) {
    const storageKey = `${PLUGIN_STORAGE_PREFIX}.${normalizePluginId(pluginId)}`;
    return {
      key: storageKey,
      get(name, fallbackValue = null) {
        const current = readStorageValue(storageKey, {});
        return Object.prototype.hasOwnProperty.call(current, name)
          ? current[name]
          : fallbackValue;
      },
      set(name, value) {
        const current = readStorageValue(storageKey, {});
        current[name] = value;
        writeStorageValue(storageKey, current);
        return value;
      },
      patch(partialState) {
        const next = {
          ...readStorageValue(storageKey, {}),
          ...(partialState || {}),
        };
        writeStorageValue(storageKey, next);
        return next;
      },
      remove(name) {
        const current = readStorageValue(storageKey, {});
        delete current[name];
        writeStorageValue(storageKey, current);
      },
      clear() {
        try {
          localStorage.removeItem(storageKey);
        } catch {}
      },
      all() {
        return readStorageValue(storageKey, {});
      },
    };
  }

  /* *************** */
  /* Icons           */
  /* *************** */

  function refreshIcons() {
    const targetRoot = shadowRoot || root?.getRootNode?.() || root;

    function run() {
      if (!targetRoot) return;
      try {
        const lucide = Utils.lucide || window.lucide;
        if (lucide?.createIcons) {
          lucide.createIcons({
            icons: lucide.icons,
            attrs: { "stroke-width": 2, width: 15, height: 15 },
            root: targetRoot,
          });
        }
      } catch (error) {
        nativeConsole.warn("[Alerta icons failed]", error);
      }
    }

    queueMicrotask(() => {
      run();
      requestAnimationFrame(run);
      setTimeout(run, 120);
    });
  }


  function stringValue(name){
    return String(
      typeof name === "function" ? name() : name || "circle",
    );
  }
  function icon(name) {
    const iconName = String(
      typeof name === "function" ? name() : name || "circle",
    );
    return html`
      <span class="ra-icon-wrap" aria-hidden="true" data-ra-icon=${iconName}>
        <i
          data-lucide=${iconName}
          class=${`ra-icon ra-lucide icon-${iconName}`}
        ></i>
        <span class="ra-icon-fallback"
          >${createIconFallbackText(iconName)}</span
        >
      </span>
    `;
  }

  function createIconFallbackText(name) {
    const map = {
      copy: "⧉",
      search: "⌕",
      settings: "⚙",
      x: "×",
      "code-2": "</>",
      "file-code-2": "</>",
      "external-link": "↗",
      "wrap-text": "↵",
      minus: "−",
      expand: "⛶",
      shrink: "⛶",
      "chevron-down": "⌄",
      "chevron-right": "›",
      "trash-2": "⌫",
      bug: "◉",
      "panel-right-open": "▰",
      moon: "☾",
      terminal: "▣",
      upload: "⇧",
      "rotate-ccw": "↺",
      link: "🔗",
      sparkles: "✦",
      puzzle: "▧",
      info: "i",
      wifi: "⌁",
      "circle-alert": "!",
      "triangle-alert": "△",
      "circle-check": "✓",
      "badge-dollar-sign": "$",
      "mouse-pointer-click": "⌖",
      atom: "⚛",
      "scan-search": "◎",
    };
    return (
      map[name] ||
      String(name || "?")
        .slice(0, 1)
        .toUpperCase()
    );
  }

  /* *************** */
  /* Utilities       */
  /* *************** */

  function addStyle(cssText, id = "") {
    const style = $$("style");
    style.id = id || `rod-inspector-plugin-style-${hashText(cssText)}`;
    style.textContent = String(cssText);

    if (shadowRoot) {
      shadowRoot.querySelector(`#${CSS.escape(style.id)}`)?.remove();
      shadowRoot.appendChild(style);
    } else {
      document.getElementById(style.id)?.remove();
      (document.head || document.documentElement).appendChild(style);
    }

    return style;
  }

  function getTotalPluginCount() {
    const plugins = readStore(appStore.plugins.items);
    let total = 0;
    for (let index = 0; index < plugins.length; index += 1) {
      const plugin = plugins[index];
      if (typeof plugin.getCount === "function")
        total += Number(plugin.getCount(plugin.api) || 0);
    }
    return total;
  }

  function readStore(node) {
    if (typeof node === "function") return node();
    return node;
  }

  function snapshotStore(node) {
    if (!node) return node;
    if (typeof node.snapshot === "function") return node.snapshot();
    if (typeof node === "function") return node();
    if (Array.isArray(node)) return node.map(snapshotStore);
    if (typeof node === "object") {
      const output = {};
      for (const key of Object.keys(node))
        output[key] = snapshotStore(node[key]);
      return output;
    }
    return node;
  }

  function createFallbackDeepStore(initialValue) {
    function wrap(value) {
      const rootSignal = signal(value);

      function makeNode(path) {
        function read() {
          return getAtPath(rootSignal(), path);
        }
        read.set = (nextValue) =>
          rootSignal.set(setAtPath(rootSignal(), path, nextValue));
        read.update = (updater) => read.set(updater(read()));
        read.peek = read;
        read.snapshot = read;
        read.setPath = (nextPath, nextValue) =>
          rootSignal.set(
            setAtPath(rootSignal(), path.concat(nextPath), nextValue),
          );
        return new Proxy(read, {
          get(target, key) {
            if (key in target) return target[key];
            if (typeof key === "symbol") return target[key];
            return makeNode(path.concat(String(key)));
          },
        });
      }

      return makeNode([]);
    }

    return wrap(initialValue);
  }

  function getAtPath(source, path) {
    let current = source;
    for (const key of path) current = current?.[key];
    return current;
  }

  function setAtPath(source, path, value) {
    if (!path.length) return value;
    const [head, ...rest] = path;
    const output = Array.isArray(source)
      ? source.slice()
      : { ...(source || {}) };
    output[head] = setAtPath(output[head], rest, value);
    return output;
  }

  function styleObjectToCss(style) {
    return Object.entries(style)
      .map(([key, value]) => `${camelToKebab(key)}:${value}`)
      .join(";");
  }

  function camelToKebab(value) {
    return String(value).startsWith("--")
      ? String(value)
      : String(value).replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
  }

  function normalizeFabricaViews(apiValue) {
    const htmlFactory = apiValue.jsx?.html || apiValue.html;
    if (
      typeof htmlFactory !== "function" ||
      typeof apiValue.render !== "function"
    ) {
      throw new Error(
        "[Alerta] Invalid Fabrica global. Expected html() and render().",
      );
    }
    return {
      html: htmlFactory,
      render: apiValue.render,
      repeat: apiValue.repeat,
      when: apiValue.when || ((condition, view) => (condition ? view() : "")),
      ref: apiValue.ref || ((callback) => callback),
      rawHtml: apiValue.rawHtml || apiValue.html?.raw,
    };
  }

  function normalizeFabricaApi(value) {
    const candidates = [
      value?.default,
      value?.Fabrica,
      value?.fabrica,
      value?.api,
      value?.Rod,
      value?.RodK,
      value,
      window.Fabrica,
      window.Rod,
    ].filter(Boolean);
    const candidate = candidates.find(
      (item) =>
        typeof item?.html === "function" && typeof item?.render === "function",
    );
    if (!candidate) {
      nativeConsole.error("[Alerta] Fabrica candidates:", candidates);
      throw new Error(
        "[Alerta] Invalid Fabrica global. Expected html() and render().",
      );
    }
    return candidate;
  }

  function normalizeBrotoApi(value) {
    const candidate = value?.default || value || {};
    return candidate;
  }

  function createDebugLogger(namespace) {
    return Utils.createDebugLogger(namespace);
    const scopedName = `Alerta:${String(namespace || "core").replace(/^alerta[:.-]?/i, "")}`;
    let enabled = Boolean(readStorageValue(DEBUG_KEY, true));

    function write(level, message, ...payload) {
      enabled = Boolean(readStore(appStore?.ui?.debugLogs) ?? enabled);
      if (!enabled && level !== "error" && level !== "warn") return;
      const method =
        nativeConsole[level] || nativeConsole.debug || nativeConsole.log;
      const badge =
        "color:#7dd3fc;background:rgba(125,211,252,.14);padding:2px 6px;border-radius:8px;font-weight:900";
      const text =
        level === "error"
          ? "color:#ff7b72"
          : level === "warn"
            ? "color:#fbbf24"
            : "color:#e5e7eb";
      method.call(
        nativeConsole,
        `%c${scopedName}%c ${message}`,
        badge,
        text,
        ...payload,
      );
    }

    return {
      get enabled() {
        return enabled;
      },
      setEnabled(next) {
        enabled = Boolean(next);
        writeStorageValue(DEBUG_KEY, enabled);
      },
      child(childNamespace) {
        return createDebugLogger(`${namespace}:${childNamespace}`);
      },
      log(message, ...payload) {
        write("log", message, ...payload);
      },
      info(message, ...payload) {
        write("info", message, ...payload);
      },
      warn(message, ...payload) {
        write("warn", message, ...payload);
      },
      error(message, ...payload) {
        write("error", message, ...payload);
      },
      time(label) {
        if (enabled) nativeConsole.time(`${scopedName}:${label}`);
      },
      timeEnd(label) {
        if (enabled) nativeConsole.timeEnd(`${scopedName}:${label}`);
      },
    };
  }

  function createEventBus() {
    const listeners = new Map();
    return {
      on(name, handler) {
        const bucket = listeners.get(name) || new Set();
        bucket.add(handler);
        listeners.set(name, bucket);
        return () => this.off(name, handler);
      },
      off(name, handler) {
        const bucket = listeners.get(name);
        if (!bucket) return false;
        bucket.delete(handler);
        if (!bucket.size) listeners.delete(name);
        return true;
      },
      emit(name, payload) {
        const bucket = listeners.get(name);
        if (!bucket) return;
        for (const handler of Array.from(bucket)) {
          try {
          
            debug.log("on", name, payload, handler);
            handler(payload);
          } catch (error) {
            nativeConsole.error("[Alerta event handler failed]", name, error);
          }
        }
      },
      clear() {
        listeners.clear();
      },
    };
  }

  function waitForRequiredGlobal(name, timeout) {
    const startedAt = performance.now();
    return new Promise((resolve, reject) => {
      function readGlobal() {
        try {
          if (globalThis[name]) return globalThis[name];
          if (window[name]) return window[name];
          if (typeof unsafeWindow !== "undefined" && unsafeWindow[name])
            return unsafeWindow[name];
        } catch {}
        try {
          return Function(
            `return typeof ${name} !== "undefined" ? ${name} : undefined`,
          )();
        } catch {
          return undefined;
        }
      }
      function tick() {
        const value = readGlobal();
        if (value) {
          resolve(value);
          return;
        }
        if (performance.now() - startedAt >= timeout) {
          reject(new Error(`[Alerta] Missing required global: ${name}`));
          return;
        }
        setTimeout(tick, 16);
      }
      tick();
    });
  }

  function waitForDocumentElement() {
    if (document.documentElement) return Promise.resolve();
    return new Promise((resolve) =>
      document.addEventListener("DOMContentLoaded", () => resolve(), {
        once: true,
      }),
    );
  }

  function cleanupPreviousInstance() {
    try {
      window.RodDockedInspector?.destroy?.();
    } catch {}
    const leftovers = document.querySelectorAll(
      `#${HOST_ID}, [data-ra-host="true"]`,
    );
    for (let index = 0; index < leftovers.length; index += 1)
      leftovers[index].remove();
  }

  function insertBootError(error) {
    const host = $$("<pre>").props({
      id: "__rod_alerta_boot_error__",
      textContent: `
        [Alerta boot failed]
        ${error}
        ${JSON.stringify(error, null, 2)}
        ${String(error?.stack || error?.message || error)}
      `,
      styles: css`
        position:fixed;
        z-index: 99998;
        left: 8px;
        right: 8px;
        bottom: 8px;
        max-height: 45dvh;
        overflow: auto;
        padding: 12px;
        border-radius: 12px;
        background: alpha(#12070a / 70%);
        color: #ffb4b4;
        font: 12px/1.45 ui-monospace,monospace;
         -webkit-text-size-adjust: 100%  !important;
        text-size-adjust: 100% !important;
        size-adjust: 100% !important;
        white-space:pre-wrap;
        `
    });
    
    host.addEventListener("click", () => host.remove());
    (document.documentElement || document.body)?.appendChild(host);
  }

  function handleFatalError(event) {
    nativeConsole.error("[Alerta Fatal]", event.error || event.message);
  }
  function handlePromiseFatalError(event) {
    nativeConsole.error("[Alerta Promise Fatal]", event.reason);
  }

  function readStorageValue(key, fallback = {}) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null || raw === "") return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeStorageValue(key, value, fallback = null) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      try {
        localStorage.setItem(
          key,
          JSON.stringify(fallback !== null ? fallback : {}),
        );
        return true;
      } catch {
        return false;
      }
    }
  }

  function escapeHtml(value) {
    return Utils.escapeHtml
      ? Utils.escapeHtml(value)
      : String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
  }
  function trimText(value, max = MAX_TEXT) {
    return Utils.trimText
      ? Utils.trimText(value, max)
      : String(value ?? "").length > max
        ? `${String(value ?? "").slice(0, max)}…`
        : String(value ?? "");
  }
  function isObjectLike(value) {
    return Utils.isObjectLike
      ? Utils.isObjectLike(value)
      : (typeof value === "object" && value !== null) ||
          typeof value === "function";
  }
  function isPlainObject(value) {
    return Utils.isPlainObject
      ? Utils.isPlainObject(value)
      : Boolean(
          value &&
          typeof value === "object" &&
          (Object.getPrototypeOf(value) === Object.prototype ||
            Object.getPrototypeOf(value) === null),
        );
  }
  function isNodeListLike(value) {
    return Utils.isNodeListLike
      ? Utils.isNodeListLike(value)
      : value instanceof NodeList || value instanceof HTMLCollection;
  }
  function safeCall(callback, fallback) {
    try {
      return callback();
    } catch {
      return fallback;
    }
  }
  function hashText(value) {
    return Utils.hashText
      ? Utils.hashText(value)
      : String(value)
          .split("")
          .reduce(
            (hash, char) => ((hash * 33) ^ char.charCodeAt(0)) >>> 0,
            5381,
          )
          .toString(36);
  }
  function formatHtml(value) {
    return Utils.formatHtml ? Utils.formatHtml(value) : String(value);
  }
  function formatCss(value) {
    return Utils.formatCss ? Utils.formatCss(value) : String(value);
  }
  function prettySource(value, language, options) {
    return Utils.prettySource
      ? Utils.prettySource(value, language, options)
      : String(value ?? "");
  }
  function highlightCode(value, language) {
    return Utils.highlightCode
      ? Utils.highlightCode(value, language)
      : escapeHtml(value);
  }
  function splitHighlightedLines(value) {
    return Utils.splitHighlightedLines
      ? Utils.splitHighlightedLines(value)
      : String(value || "").split("\n");
  }
  function copyText(value) {
    return Utils.copyText
      ? Utils.copyText(value)
      : navigator.clipboard?.writeText(String(value ?? ""));
  }
  function getNodeLabel(value) {
    return Utils.getNodeLabel
      ? Utils.getNodeLabel(value)
      : Object.prototype.toString.call(value);
  }
  function getElementFromObject(value) {
    return Utils.getElementFromObject
      ? Utils.getElementFromObject(value)
      : value instanceof Element
        ? value
        : value?.target instanceof Element
          ? value.target
          : null;
  }
  function isReactElement(value) {
    return Utils.isReactElement ? Utils.isReactElement(value) : false;
  }
  function getReactOwnerInfo(value) {
    return Utils.getReactOwnerInfo ? Utils.getReactOwnerInfo(value) : null;
  }
  function clampNumber(value, min, max) {
    return Utils.clampNumber
      ? Utils.clampNumber(value, min, max)
      : Math.min(max, Math.max(min, Number(value) || min));
  }
  function getViewportRect() {
    return Utils.getViewportRect
      ? Utils.getViewportRect()
      : {
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
  }

  function clampPanelRect(input) {
    if (Utils.clampPanelRect) {
      return Utils.clampPanelRect(input, {
        minWidth: MIN_PANEL_WIDTH,
        minHeight: MIN_PANEL_HEIGHT,
        screenGap: PANEL_SCREEN_GAP,
        minX: PANEL_FLOAT_MIN_X,
        minY: PANEL_FLOAT_MIN_Y,
      });
    }
    const viewport = getViewportRect();
    const maxWidth = Math.max(
      MIN_PANEL_WIDTH,
      viewport.width - PANEL_SCREEN_GAP * 2,
    );
    const maxHeight = Math.max(
      MIN_PANEL_HEIGHT,
      viewport.height - PANEL_SCREEN_GAP * 2,
    );
    const width = clampNumber(input.width, MIN_PANEL_WIDTH, maxWidth);
    const height = clampNumber(input.height, MIN_PANEL_HEIGHT, maxHeight);
    const minX = viewport.left + PANEL_FLOAT_MIN_X;
    const minY = viewport.top + PANEL_FLOAT_MIN_Y;
    const maxX = viewport.left + viewport.width - width - PANEL_SCREEN_GAP;
    const maxY = viewport.top + viewport.height - height - PANEL_SCREEN_GAP;
    return {
      x: clampNumber(input.x, minX, Math.max(minX, maxX)),
      y: clampNumber(input.y, minY, Math.max(minY, maxY)),
      width,
      height,
    };
  }

  function getObjectPreview(value) {
    if (!isObjectLike(value)) return escapeHtml(getNodeLabel(value));
    if (value instanceof Element)
      return `<span class="ra-element">${escapeHtml(formatElement(value))}</span>${isReactElement(value) ? '<span class="ra-react-badge">⚛</span>' : ""}`;
    if (Array.isArray(value))
      return `<span class="ra-object-type">Array(${value.length})</span>`;
    if (value instanceof Map)
      return `<span class="ra-object-type">Map(${value.size})</span>`;
    if (value instanceof Set)
      return `<span class="ra-object-type">Set(${value.size})</span>`;
    if (value instanceof Error)
      return `<span class="ra-object-type">${escapeHtml(value.name)}</span> ${escapeHtml(value.message)}`;
    return `<span class="ra-object-type">${escapeHtml(getNodeLabel(value))}</span>`;
  }

  function formatElement(element) {
    if (Utils.formatElement) return Utils.formatElement(element);
    const tag = element.tagName ? element.tagName.toLowerCase() : "element";
    const id = element.id ? ` id="${escapeHtml(element.id)}"` : "";
    const className =
      typeof element.className === "string" && element.className.trim()
        ? ` class="${escapeHtml(element.className.trim().split(/\s+/).slice(0, 6).join(" "))}"`
        : "";
    return `<${tag}${id}${className}>`;
  }

  function getRichCode(value) {
    if (value instanceof HTMLStyleElement)
      return formatCss(value.textContent || "");
    if (value instanceof HTMLScriptElement)
      return prettySource(value.textContent || "", "javascript");
    if (value instanceof HTMLTemplateElement)
      return formatHtml(value.innerHTML || "");
    if (value instanceof Element) return formatHtml(value.outerHTML || "");
    if (typeof value === "function")
      return Function.prototype.toString.call(value);
    return null;
  }


  function getCodeLanguage(value) {
    if (value instanceof HTMLStyleElement) return "css";
    if (value instanceof HTMLScriptElement || typeof value === "function")
      return "javascript";
    return "xml";
  }

  function formatValue(value, depth = 0, seen = new WeakSet()) {
    if (!isObjectLike(value)) return getNodeLabel(value);
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const rich = getRichCode(value);
    if (rich) return rich;
    const keys = Reflect.ownKeys(value).slice(0, MAX_TREE_ITEMS);
    const body = keys
      .map(
        (key) =>
          `${"  ".repeat(depth + 1)}${String(key)}: ${formatValue(
            safeCall(() => value[key], "[Throws]"),
            depth + 1,
            seen,
          )}`,
      )
      .join(",\n");
    return keys.length ? `{\n${body}\n${"  ".repeat(depth)}}` : "{}";
  }

  function stringifyPreview(value) {
    return typeof value === "string"
      ? trimText(value, MAX_TEXT)
      : getNodeLabel(value);
  }
  function getTime() {
    return new Date().toLocaleTimeString();
  }
  function kindToIcon(kind) {
    return kind === "error"
      ? "circle-alert"
      : kind === "warn"
        ? "triangle-alert"
        : kind === "info"
          ? "info"
          : kind === "debug"
            ? "bug"
            : kind === "network"
              ? "wifi"
              : "terminal";
  }
  function clonePlainObject(value) {
    const out = {};
    for (const key in value)
      out[key] = isPlainObject(value[key]) ? { ...value[key] } : value[key];
    return out;
  }
  function normalizePluginId(pluginId) {
    return (
      String(pluginId || "core")
        .trim()
        .replace(/[^\w.-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "core"
    );
  }

  function mergeDeep(target, source) {
    if (!isPlainObject(source)) return target;
    const output = { ...target };
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) continue;
      output[key] =
        isPlainObject(value) && isPlainObject(output[key])
          ? mergeDeep(output[key], value)
          : value;
    }
    return output;
  }

  /* *************** */
  /* Styles          */
  /* *************** */

  function getShellStyle() {
    return css`:host {
  all: initial;
  color-scheme: dark;
}
.ra-root,
.ra-log-surface-host {
  --ra-panel: rgb(12 13 15 / var(--ra-opacity, 0.94));
  --ra-border: rgb(255 255 255 / 0.1);
  --ra-border-strong: rgb(255 255 255 / 0.18);
  --ra-text: #e5e7eb;
  --ra-strong: #ffffff;
  --ra-muted: #9ca3af;
  --ra-faint: #6b7280;
  --ra-cyan: #7dd3fc;
  --ra-key: #8ab4ff;
  --ra-string: #7ee787;
  --ra-radius-md: 14px;
  --ra-radius-lg: 22px;
  --ra-radius-pill: 999px;
  --ra-font-ui:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
  --ra-font-mono:
    "SFMono-Regular", ui-monospace, Menlo, Monaco, Consolas, monospace;
  --ra-z: 9998;
  --ra-shadow: 0 28px 90px rgb(0 0 0 / 0.72);
  --ra-blur: 18px;
  --ra-density-scale: 1;
  --ra-font-size: 12px;
  color: var(--ra-text);
  font-family: var(--ra-font-ui);
  -webkit-font-smoothing: antialiased;
}
.ra-root *,
.ra-log-surface-host * {
  box-sizing: border-box;
}
.ra-root {
  position: fixed;
  inset: 0;
  z-index: var(--ra-z);
  pointer-events: none;
  font-family: var(--ra-font-ui);
  line-height: 1.4;
  letter-spacing: normal;
  text-transform: none;
}
.ra-panel[data-ra-theme="oled"] {
  --ra-panel: rgb(0 0 0 / var(--ra-opacity, 0.96));
  --ra-border: rgb(255 255 255 / 0.13);
}
.ra-panel[data-ra-theme="charcoal"] {
  --ra-panel: rgb(18 18 20 / var(--ra-opacity, 0.94));
  --ra-border: rgb(255 255 255 / 0.12);
}
.ra-icon-wrap {
  position: relative;
  width: 16px;
  height: 16px;
  min-width: 16px;
  min-height: 16px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  color: currentColor;
}
.ra-icon,
.ra-icon svg,
[data-lucide],
[data-lucide] svg {
  width: 15px;
  height: 15px;
  min-width: 15px;
  min-height: 15px;
  display: inline-block;
  color: currentColor;
  stroke: currentColor;
}
.ra-icon-wrap svg + .ra-icon-fallback {
  display: none;
}
.ra-icon-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font: 900 12px/1 var(--ra-font-mono);
  color: currentColor;
  opacity: 0.9;
}
.ra-dock {
  position: fixed;
  right: 0;
  z-index: calc(var(--ra-z) - 1);
  width: 42px;
  pointer-events: auto;
  border: 1px solid var(--ra-border-strong);
  border-right: 0;
  top: var(--dock-top, 50dvh);
  border-radius: 14px 0 0 14px;
  background: linear-gradient(
    180deg,
    rgb(24 25 28 / 0.88),
    rgb(9 10 12 / 0.88)
  );
  box-shadow: var(--ra-shadow);
  backdrop-filter: blur(var(--ra-blur));
  -webkit-backdrop-filter: blur(var(--ra-blur));
  /*touch-action: none;*/
}
.ra-dock-inner {
  display: grid;
  gap: 8px;
  justify-items: center;
  padding: 5px 6px;
}
.ra-dock-count {
  min-width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.075);
  color: var(--ra-strong);
  font: 900 11px/1 var(--ra-font-ui);
}
.ra-panel {
  position: fixed;
  top: max(12px, env(safe-area-inset-top));
  right: max(10px, env(safe-area-inset-right));
  width: min(var(--ra-w, 520px), calc(100vw - 18px));
  height: min(var(--ra-h, calc(100vh - 24px)), calc(100vh - 24px));
  display: none;
  grid-template-rows: auto auto auto auto minmax(0, 1fr);
  overflow: hidden;
  pointer-events: auto;
  border: 1px solid var(--ra-border-strong);
  border-radius: var(--ra-radius-lg);
  background: linear-gradient(180deg, var(--ra-panel), rgb(6 7 9 / 0.98));
  box-shadow: var(--ra-shadow);
  backdrop-filter: blur(var(--ra-blur));
  -webkit-backdrop-filter: blur(var(--ra-blur));
}
.ra-panel.ra-open {
  display: grid;
}
.ra-panel.ra-floating {
  right: auto;
  left: var(--ra-x);
  top: var(--ra-y);
}
.ra-panel.ra-zen {
  inset: 0 !important;
  width: 100dvw !important;
  height: 100dvh !important;
  border: 0;
  border-radius: 0 !important;
}
.ra-header,
.ra-toolbar,
.ra-tabs,
.ra-actions,
.ra-filter-row,
.ra-inspect-actions,
.ra-surface-toolbar,
.ra-settings-actions,
.ra-settings-group-head,
.ra-range-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ra-header {
  justify-content: space-between;
  min-height: calc(40px * var(--ra-density-scale));
  padding: calc(7px * var(--ra-density-scale)) 9px;
  border-bottom: 1px solid var(--ra-border);
  background: rgb(255 255 255 / 0.035);
  touch-action: none;
}
.ra-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ra-strong);
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.ra-toolbar,
.ra-tabs,
.ra-filter-row,
.ra-surface-toolbar {
  padding: calc(7px * var(--ra-density-scale));
  border-bottom: 1px solid var(--ra-border);
  background: rgb(0 0 0 / 0.14);
}
.ra-tabs {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.ra-search,
.ra-select,
.ra-input,
.ra-modal-input,
.ra-modal-textarea {
  border: 1px solid var(--ra-border);
  border-radius: var(--ra-radius-pill);
  background: rgb(0 0 0 / 0.3);
  color: var(--ra-text);
  outline: 0;
  font-size: 16px;
}
.ra-search {
  flex: 1;
  height: 34px;
  padding: 0 14px;
  font: 650 16px/1 var(--ra-font-ui);
}
.ra-select,
.ra-input {
  width: 100%;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  font: 650 16px/1 var(--ra-font-ui);
}
.ra-button,
.ra-tab,
.ra-pill,
.ra-load-more,
.ra-tree-toggle,
.ra-tree-more,
.ra-modal-close {
  appearance: none;
  border: 1px solid var(--ra-border);
  border-radius: var(--ra-radius-pill);
  background: rgb(255 255 255 / 0.055);
  color: var(--ra-text);
  font: 700 11px/1 var(--ra-font-ui);
  user-select: none;
  -webkit-user-select: none;
}
.ra-button,
.ra-tab,
.ra-pill {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  white-space: nowrap;
}
.ra-button-primary,
.ra-modal-primary {
  color: #061014;
  background: linear-gradient(180deg, #7dd3fc, #38bdf8);
  border-color: rgb(125 211 252 / 0.6);
}
.ra-button-danger {
  color: #ffe4e6;
  border-color: rgb(248 113 113 / 0.28);
  background: rgb(248 113 113 / 0.1);
}
.ra-icon-button {
  width: 34px;
  height: 34px;
  padding: 0;
}
.ra-tab.ra-active {
  background: rgb(255 255 255 / 0.14);
  color: var(--ra-strong);
}
.ra-main,
.ra-log-surface {
  min-height: 0;
  overflow: auto;
  padding: calc(7px * var(--ra-density-scale));
  contain: content;
  -webkit-overflow-scrolling: touch;
}
.ra-card {
  position: relative;
  display: grid;
  margin-bottom: 8px;
  overflow: visible;
  border: 1px solid var(--ra-border);
  border-left: 3px solid transparent;
  border-radius: var(--ra-radius-md);
  background: rgb(12 13 15 / 0.72);
}
.ra-kind-warn {
  border-left-color: rgb(251 191 36 / 0.5);
}
.ra-kind-error {
  border-left-color: rgb(248 81 73 / 0.62);
}
.ra-card-head {
  display: grid;
  gap: 5px;
  padding: 8px 10px;
  border-radius: var(--ra-radius-md);
  background: rgb(12 13 15 / 0.9);
}
.ra-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--ra-muted);
  font-size: 10px;
  font-weight: 850;
}
.ra-kind {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ra-cyan);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.ra-count,
.ra-react-badge {
  min-width: 20px;
  height: 20px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.11);
}
.ra-time {
  color: var(--ra-faint);
}
.ra-message,
.ra-tree-row {
  font: 420 var(--ra-font-size)/1.38 var(--ra-font-mono);
  white-space: pre-wrap;
  word-break: break-word;
}
.ra-card-body {
  display: grid;
  gap: 6px;
  padding: 0 9px 8px;
}
.ra-object-card {
  display: grid;
  gap: 6px;
  overflow-x: auto;
}
.ra-inspect-actions {
  flex-wrap: wrap;
  padding: 5px 0;
}
.ra-tree-row {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 5px;
  align-items: start;
  padding: 3px;
  border-radius: 10px;
}
.ra-tree-toggle {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  padding: 0;
  border-color: transparent;
  background: transparent;
}
.ra-tree-more,
.ra-load-more {
  width: 100%;
  min-height: 34px;
}
.ra-key,
.hljs-attr,
.hljs-property {
  color: var(--ra-key);
}
.ra-string,
.hljs-string {
  color: var(--ra-string);
}
.ra-muted,
.hljs-comment {
  color: var(--ra-muted);
}
.ra-element {
  color: var(--ra-cyan);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.ra-object-type {
  color: var(--ra-muted);
}
.ra-empty {
  min-height: 130px;
  display: grid;
  place-items: center;
  gap: 8px;
  color: var(--ra-muted);
  text-align: center;
}
.ra-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 34px;
  height: 34px;
  touch-action: none;
  cursor: nwse-resize;
}
.ra-resize::after {
  content: "";
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 12px;
  height: 12px;
  border-right: 2px solid rgb(255 255 255 / 0.32);
  border-bottom: 2px solid rgb(255 255 255 / 0.32);
  border-radius: 0 0 4px 0;
}
.ra-zen .ra-resize {
  display: none;
}
.ra-modal-root,
.ra-source-backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(var(--ra-z) + 4);
  display: grid;
  place-items: end center;
  pointer-events: auto;
  background: rgb(0 0 0 / 0.52);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.ra-modal {
  position: relative;
  width: min(720px, calc(100vw - 14px));
  max-height: min(82dvh, 720px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  border: 1px solid var(--ra-border-strong);
  border-radius: 24px 24px 0 0;
  background:
    radial-gradient(
      circle at top left,
      rgb(125 211 252 / 0.12),
      transparent 32%
    ),
    linear-gradient(180deg, rgb(17 18 23 / 0.98), rgb(6 7 10 / 0.98));
  box-shadow: 0 32px 120px rgb(0 0 0 / 0.78);
}
.ra-modal-head,
.ra-source-head {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-bottom: 1px solid var(--ra-border);
}
.ra-modal-title,
.ra-source-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.ra-modal-title strong,
.ra-source-title strong {
  display: block;
  color: var(--ra-strong);
  font: 900 14px/1.2 var(--ra-font-ui);
}
.ra-modal-title small,
.ra-source-title small {
  display: block;
  margin-top: 3px;
  max-width: min(640px, 58vw);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ra-muted);
  font: 500 12px/1.35 var(--ra-font-ui);
}
.ra-modal-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--ra-border);
  border-radius: 14px;
  color: var(--ra-cyan);
  background: rgb(255 255 255 / 0.07);
}
.ra-modal-body {
  position: relative;
  z-index: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px;
}
.ra-modal-input,
.ra-modal-textarea {
  width: 100%;
  border-radius: 16px;
  padding: 12px 14px;
  font: 600 16px/1.4 var(--ra-font-ui);
}
.ra-modal-textarea {
  min-height: 180px;
  resize: vertical;
  font-family: var(--ra-font-mono);
}
.ra-modal-actions {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--ra-border);
  background: rgb(0 0 0 / 0.18);
}
.ra-source-backdrop {
  place-items: center;
}
.ra-source-modal {
  width: min(1080px, calc(100vw - 14px));
  height: min(88dvh, 860px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--ra-border-strong);
  border-radius: 22px;
  background:
    radial-gradient(
      circle at top left,
      rgb(125 211 252 / 0.12),
      transparent 30%
    ),
    linear-gradient(180deg, rgb(13 14 18 / 0.98), rgb(5 6 8 / 0.98));
  box-shadow: 0 32px 120px rgb(0 0 0 / 0.78);
}
.ra-source-actions {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.ra-source-body {
  position: relative;
  min-height: 0;
  overflow: auto;
  background: rgb(0 0 0 / 0.35);
  font: 12px / 20px var(--ra-font-mono);
  contain: strict;
  -webkit-overflow-scrolling: touch;
}
.ra-source-spacer {
  width: 1px;
}
.ra-source-lines {
  position: absolute;
  inset: 0 0 auto 0;
  will-change: transform;
}
.ra-source-line {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 10px;
  min-height: 20px;
  height: 20px;
  white-space: pre;
  padding: 0 12px;
}
.ra-source-wrap .ra-source-line {
  height: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.ra-source-line-no {
  color: var(--ra-faint);
  text-align: right;
  user-select: none;
  -webkit-user-select: none;
}
.ra-source-line code {
  min-width: 0;
  color: var(--ra-text);
  font: inherit;
}
.ra-settings {
  display: grid;
  gap: 10px;
}
.ra-settings-hero,
.ra-settings-group {
  border: 1px solid var(--ra-border);
  border-radius: var(--ra-radius-md);
  background: rgb(255 255 255 / 0.04);
}
.ra-settings-hero {
  display: grid;
  gap: 10px;
  padding: 12px;
}
.ra-settings-hero strong {
  display: block;
  color: var(--ra-strong);
  font: 900 13px/1.2 var(--ra-font-ui);
}
.ra-settings-hero span,
.ra-setting-label small,
.ra-settings-group-head span {
  color: var(--ra-muted);
  font: 500 11px/1.35 var(--ra-font-ui);
}
.ra-settings-actions {
  flex-wrap: wrap;
}
.ra-settings-group {
  overflow: hidden;
}
.ra-settings-group-head {
  justify-content: space-between;
  padding: 9px 11px;
  border-bottom: 1px solid var(--ra-border);
  background: rgb(0 0 0 / 0.16);
}
.ra-settings-group-head div {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ra-strong);
  font: 850 12px/1.2 var(--ra-font-ui);
}
.ra-settings-grid {
  display: grid;
  gap: 1px;
}
.ra-setting-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(132px, 210px);
  gap: 10px;
  align-items: center;
  padding: 10px 11px;
  background: rgb(0 0 0 / 0.1);
}
.ra-setting-label {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.ra-setting-label strong {
  color: var(--ra-text);
  font: 750 12px/1.25 var(--ra-font-ui);
}
.ra-setting-control {
  min-width: 0;
  display: grid;
  justify-items: stretch;
}
.ra-range {
  width: 100%;
}
.ra-switch {
  width: 42px;
  height: 24px;
  justify-self: end;
  accent-color: var(--ra-cyan);
}
.ra-range-wrap {
  width: 100%;
}
.ra-range-wrap code {
  min-width: 42px;
  color: var(--ra-cyan);
  font: 800 11px/1 var(--ra-font-mono);
  text-align: right;
}
@media (max-width: 720px) {
  .ra-panel {
    inset: max(72px, env(safe-area-inset-top))
      max(8px, env(safe-area-inset-right))
      max(18px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
    width: auto;
    height: auto;
  }
  .ra-panel.ra-zen {
    inset: 0 !important;
  }
  .ra-button-label {
    display: none;
  }
  .ra-button {
    width: 34px;
    padding: 0;
  }
  .ra-resize {
    display: none;
  }
  .ra-setting-field {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .ra-switch {
    justify-self: start;
  }
  .ra-source-modal {
    width: calc(100vw - 8px);
    height: calc(100dvh - 10px);
    border-radius: 18px;
  }
  .ra-source-head {
    align-items: stretch;
    flex-direction: column;
  }
}
    `;
  }
})();
