// ==UserScript==
// @name         ⛺️ 002 / Alerta v7.5.1 / styled
// @namespace    https://rod.dev/userscripts
// @version      7.5.1
// @description  Central Alerta shell runtime powered by Fabrica, Shadow DOM styles, componentized views, plugin API, modal API, virtualized source viewer, safe storage, and extraction-ready helpers.
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

  const VERSION = "7.5.1";
  const HOST_ID = "__rod_alerta_fabrica_host__";
  const ROOT_ID = "__rod_alerta_fabrica_root__";
  const STYLE_ID = "__rod_alerta_fabrica_style__";
  const SOURCE_HOST_ID = "__rod_alerta_source_host__";
  const STORAGE_KEY = "rod.alerta.fabrica.v7.5";
  const LEGACY_STORAGE_KEY = "rod.alerta.fabrica.v7.4";
  const DEBUG_KEY = "rod.alerta.fabrica.debug";
  const PLUGIN_STORAGE_PREFIX = "rod.alerta.fabrica.plugin";

  const INITIAL_LIMIT = 60;
  const LIMIT_STEP = 60;
  const MAX_TEXT = 900;
  const MAX_TREE_ITEMS = 160;
  const MAX_TREE_RENDER_ITEMS = 42;
  const SEARCH_DEBOUNCE_MS = 80;
  const FLASH_MS = 1200;
  const BOOT_TIMEOUT_MS = 11_500;
  const MAX_RECORDS = 500;
  const DRAG_THRESHOLD_PX = 5;
  const MIN_DOCK_Y = 18;
  const DOCK_BOTTOM_GAP = 88;
  const MIN_PANEL_WIDTH = 320;
  const MIN_PANEL_HEIGHT = 260;
  const PANEL_SCREEN_GAP = 10;
  const PANEL_FLOAT_MIN_X = 6;
  const PANEL_FLOAT_MIN_Y = 6;
  const SOURCE_LINE_HEIGHT = 20;
  const SOURCE_OVERSCAN = 28;
  const SOURCE_MAX_PRETTY = 300_000;

  let debug = null;
  
  const Utils = await waitForRequiredGlobal("RodUtils", BOOT_TIMEOUT_MS);
    
  // Utils.setDebuggerStylePrompt(["namespace(bgRed,italic,paddding: 3, white)", "scope(bgWhite,red)", "separator(icon:🦊)", "message"]); 
  /* *************** */
  /* Native Console  */
  /* *************** */

  const nativeConsole = window.nativeConsole || {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
    trace: console.trace ? console.trace.bind(console) : console.log.bind(console),
    time: console.time ? console.time.bind(console) : function noopTime() {},
    timeEnd: console.timeEnd ? console.timeEnd.bind(console) : function noopTimeEnd() {},
  };

  window.nativeConsole = nativeConsole;
  

  /* *************** */
  /* Boot Globals    */
  /* *************** */


  let FabricaApiBootstrap = Utils.Fabrica
  let CipoApi = Utils.Cipo
  let CipoElements = Utils.CipoElements
  let FabricaApi = FabricaApiBootstrap;
  
  
  
 /*const cipo = FabricaElements.createStyledFactory({
  createStyle(strings, values) {
    const artifact = CipoApi.assertAtomicCssArtifact(
      CipoApi.css(strings, ...values)
    )
    return { className: artifact.className, artifact }
  },
})
  
  
nativeConsole.log({ cipo, CipoElements, Utils, FabricaApi, CipoApi })


const StyledButton = cipo.button.css`
  px: 4;
  bg: $brand;
`
debug.log("cipo / StyledButton", StyledButton)

const buttonWithChildren = StyledButton({ children: 'Save' });

nativeConsole.log("cipo / buttonWithChildren", buttonWithChildren);


*/

  /* *************** */
  /* RodUtils Bridge */
  /* *************** */

  const {
    createElement,
    el,
    createEventBus,
    escapeHtml,
    trimText,
    dedent,
    formatHtml,
    formatCss,
    formatElement,
    normalizeHighlightLanguage,
    highlightCode,
    prettySource,
    splitHighlightedLines,
    isObjectLike,
    isPlainObject,
    isNodeListLike,
    safeCall,
    hashText,
    getNodeLabel,
    getElementFromObject,
    isReactElement,
    getReactOwnerInfo,
    copyText,
    sanitizeConsoleStyle,
    clampNumber,
    getViewportRect,
    readStorageValue,
    writeStorageValue,
    createStorageDriver,
    
    lucide,
    
    Cipo,
    Fabrica,
    FabricaElements,
  } = Utils;
  
const {
  sheet: { css },
  configure,
} = Cipo;

  



  function clampPanelRect(input) {
    return Utils.clampPanelRect(input, {
      minWidth: MIN_PANEL_WIDTH,
      minHeight: MIN_PANEL_HEIGHT,
      screenGap: PANEL_SCREEN_GAP,
      minX: PANEL_FLOAT_MIN_X,
      minY: PANEL_FLOAT_MIN_Y,
    });
  }

  function safeLockZoom() {
    try {
      return typeof Utils.lockZoom === "function" ? Utils.lockZoom() : null;
    } catch (error) {
      nativeConsole.warn("[Alerta] lockZoom failed", error);
      return null;
    }
  }

  /* *************** */
  /* Fatal Guards    */
  /* *************** */

  window.addEventListener("error", handleFatalError);
  window.addEventListener("unhandledrejection", handlePromiseFatalError);

  boot().catch((error) => {
    nativeConsole.error("[Alerta Boot Fatal]", error);
    insertBootError(error);
  });

  function handleFatalError(event) {
    nativeConsole.error("[Alerta Fatal]", event.error || event.message);
  }

  function handlePromiseFatalError(event) {
    nativeConsole.error("[Alerta Promise Fatal]", event.reason);
  }

  /* *************** */
  /* Boot            */
  /* *************** */
 
  
  async function boot() {
    FabricaApi = normalizeFabricaApi(FabricaApiBootstrap);


nativeConsole.log("[Alerta] raw Fabrica:", FabricaApiBootstrap);
nativeConsole.log("[Alerta] raw Fabrica keys:", Reflect.ownKeys(FabricaApiBootstrap || {}));
nativeConsole.log("[Alerta] window.Fabrica:", window.Fabrica);
nativeConsole.log("[Alerta] window.Fabrica normalized:", FabricaApi);
nativeConsole.log("[Alerta] window.Rod:", window.Rod);
 
    await waitForDocumentElement();

    cleanupPreviousInstance();

    const app = createApp(FabricaApi);

    app.exposePublicApi();
    app.registerCorePlugins();
    app.mountShell();

    app.debug.info("shell:ready", {
      version: VERSION,
      fabrica: typeof FabricaApi.debug === "function" ? FabricaApi.debug() : null,
      Utils,
    });
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

  const candidate = candidates.find((item) => {
    return typeof item?.html === "function" && typeof item?.render === "function";
  });

  if (!candidate) {
    nativeConsole.error("[Alerta] Fabrica candidates:", candidates);

    throw new Error("[Alerta] Invalid Fabrica global. Expected html() and render().");
  }

  return candidate;
}
  
  
  /**
 * Exposes every Fabrica API property on `window`.
 *
 * Useful for quick debugging in DevTools:
 * html`...`
 * signal()
 * effect()
 * render()
 *
 * @param {Record<string, *>} fabricaApi Fabrica runtime object.
 * @param {Object} options Options.
 * @param {boolean} options.overwrite Allow overwriting existing globals.
 * @param {boolean} options.debug Print exposed globals.
 * @param {string[]} options.ignore Ignore specific keys.
 * @returns {string[]} Exposed keys.
 *
 * @example
 * exposeFabricaGlobals(Fabrica);
 *
 * @example
 * exposeFabricaGlobals(Fabrica, {
 *   overwrite: false,
 *   debug: true,
 * });
 */
function exposeFabricaGlobals(fabricaApi, options = {}) {
  const {
    overwrite = false,
    debug = true,
    ignore = [],
  } = options;

  if (!fabricaApi || typeof fabricaApi !== "object") {
    throw new Error("exposeFabricaGlobals: invalid Fabrica API");
  }

  const exposed = [];

  for (const key of Reflect.ownKeys(fabricaApi)) {
    if (typeof key !== "string") continue;
    if (ignore.includes(key)) continue;

    const value = fabricaApi[key];

    if (!overwrite && key in window) {
      if (debug) {
        console.warn(`[Fabrica globals] skipped "${key}" (already exists)`);
      }

      continue;
    }

    try {
      Object.defineProperty(window, key, {
        configurable: true,
        enumerable: false,
        writable: true,
        value,
      });

      exposed.push(key);
    } catch (error) {
      console.warn(`[Fabrica globals] failed "${key}"`, error);
    }
  }

  if (debug) {
    console.log(
      `%cFabrica globals exposed`,
      "color:#7dd3fc;font-weight:900",
      exposed,
    );
  }

  return exposed;
}

  let html;

  function createApp(FabricaApi) {
    const {
      html: _html,
      render,
      computed: fabricaComputed,
      effect: fabricaEffect,
      batch: fabricaBatch,
      repeat,
      when,
      ref,
      classMap,
      styleMap,
      component,
      jsx
    } = FabricaApi;

    html = _html.jsx || jsx.html;

    const signal =
      FabricaApi.signal ||
      FabricaApi.createSignal ||
      FabricaApi.state ||
      Utils.signal;

    const computed =
      fabricaComputed ||
      Utils.computed;

    const effect =
      fabricaEffect ||
      Utils.effect;

    const batch =
      fabricaBatch ||
      function batchFallback(callback) {
        return callback();
      };

    if (typeof signal !== "function") {
      nativeConsole.error("[Alerta] FabricaApi keys:", Reflect.ownKeys(FabricaApi));
      nativeConsole.error("[Alerta] Utils keys:", Reflect.ownKeys(Utils));

      throw new Error("[Alerta] signal/createSignal/Utils.signal is not a function.");
    }

        
    /**exposeFabricaGlobals(FabricaApi, {
      debug: true,
      overwrite: true,
      ignore: ["version"],
    });**/

    const rawHtml =
      FabricaApi.rawHtml ||
      FabricaApi.html?.raw ||
      ((value) => ({ __kind: "rawHtml", value: String(value) }));

    const storage = createStorageDriver(localStorage);
    let debugEnabled = true || storage.read(DEBUG_KEY, false) === true || storage.read(DEBUG_KEY, false) === "true";

    function createDebugLogger(namespace) {
      const scopedName = `Alerta:${String(namespace || "core").replace(/^alerta[:.-]?/i, "")}`;

      function write(level, message, ...payload) {
        if (!debugEnabled && level !== "error" && level !== "warn") return;

        const method = nativeConsole[level] || nativeConsole.debug || nativeConsole.log;
        const badge =
          "color:#7dd3fc;background:rgba(125,211,252,.14);padding:2px 6px;border-radius:8px;font-weight:900";
        const text =
          level === "error" ? "color:#ff7b72" : level === "warn" ? "color:#fbbf24" : "color:#e5e7eb";

        method.call(nativeConsole, `%c${scopedName}%c ${message}`, badge, text, ...payload);
      }

      return {
        get enabled() {
          return debugEnabled;
        },

        setEnabled(enabled) {
          debugEnabled = Boolean(enabled);
          storage.write(DEBUG_KEY, debugEnabled);
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
          if (debugEnabled) nativeConsole.time(`${scopedName}:${label}`);
        },

        timeEnd(label) {
          if (debugEnabled) nativeConsole.timeEnd(`${scopedName}:${label}`);
        },
      };
    }


    debug = createDebugLogger("core");
    
    //Utils.setLogger(debug);
    
    const initialState = readState();

    /* *************** */
    /* Fine State      */
    /* *************** */

    const openSignal = signal(initialState.open);
    const dockedSignal = signal(initialState.docked);
    const zenSignal = signal(initialState.zen);
    const dockYSignal = signal(initialState.dockY);
    const panelXSignal = signal(initialState.x);
    const panelYSignal = signal(initialState.y);
    const panelWidthSignal = signal(initialState.width);
    const panelHeightSignal = signal(initialState.height);
    const querySignal = signal(initialState.query);
    const queryDraftSignal = signal(initialState.query);
    const tabSignal = signal(initialState.tab);
    const defaultTabSignal = signal(initialState.defaultTab);
    const defaultFullscreenSignal = signal(initialState.defaultFullscreen);
    const themeSignal = signal(initialState.theme);
    const densitySignal = signal(initialState.density);
    const fontSizeSignal = signal(initialState.fontSize);
    const opacitySignal = signal(initialState.opacity);
    const debugLogsSignal = signal(Boolean(initialState.debugLogs));
    const filtersSignal = signal(initialState.filters || {});
    const limitsSignal = signal(initialState.limits || {});
    const pluginSettingsSignal = signal(initialState.plugins || {});
    const settingsGroupsSignal = signal(initialState.settingsGroups || {});
    const pluginsSignal = signal([]);
    const modalSignal = signal(null);
    const sourceSignal = signal(createSourceState());
    const treeVersionSignal = signal(0);

    const visiblePluginsSignal = computed(() => pluginsSignal().filter((plugin) => plugin.enabled !== false));
    const activePluginSignal = computed(
      () => visiblePluginsSignal().find((plugin) => plugin.id === tabSignal()) || visiblePluginsSignal()[0] || null,
    );
    const totalCountSignal = computed(getTotalPluginCount);

    const panelClassSignal = computed(() => {
      return [
        "ra-panel",
        openSignal() ? "ra-open" : "",
        dockedSignal() ? "" : "ra-floating",
        zenSignal() ? "ra-zen" : "",
      ]
        .filter(Boolean)
        .join(" ");
    });

    const panelStyleSignal = computed(() => {
      return css({
        "--ra-w": `${panelWidthSignal()}px`,
        "--ra-h": `${panelHeightSignal()}px`,
        "--ra-x": `${panelXSignal()}px`,
        "--ra-y": `${panelYSignal()}px`,
        "--ra-font-size": `${fontSizeSignal()}px`,
        "--ra-opacity": String(opacitySignal()),
        "--ra-density-scale":
          densitySignal() === "compact" ? "0.82" : densitySignal() === "spacious" ? "1.14" : "1",
      });
    });

    const eventBus = createEventBus({
      onError: (name, error) => nativeConsole.error("[Alerta event handler failed]", name, error),
            onEvent: (name, payload) => debug.log("[Alerta event handler]", name, payload),
    });

    const objectStoreMap = new Map();
    const objectRefs = new WeakMap();
    const expandedPaths = new Set();
    const expandedPathLimits = new Map();
    const customActions = new Map();

    let host = null;
    let shadowRoot = null;
    let root = null;
    let sourceRoot = null;
    let disposer = null;
    let sourceDisposer = null;
    let nextObjectId = 1;
    let searchTimer = 0;
    let dragState = null;
    let resizeState = null;
    let dockDragging = false;
    let statePersistSuspended = false;
    let pendingStatePersist = false;
    let windowLocked = null;
    let api = null;

    debug.setEnabled(debugLogsSignal());

    effect(() => {
      debug.setEnabled(debugLogsSignal());

      if (statePersistSuspended) {
        pendingStatePersist = true;
        return;
      }

      saveState(getStateSnapshot());
    });

    eventBus.on("panel:open", () => {
      if (!windowLocked) windowLocked = safeLockZoom();
    });

    eventBus.on("panel:minimize", () => {
      if (typeof windowLocked === "function") {
        windowLocked();
        windowLocked = null;
      }
    });

    /* *************** */
    /* State API       */
    /* *************** */

    function getStateSnapshot() {
      return {
        open: openSignal(),
        docked: dockedSignal(),
        zen: zenSignal(),
        dockY: dockYSignal(),
        x: panelXSignal(),
        y: panelYSignal(),
        width: panelWidthSignal(),
        height: panelHeightSignal(),
        query: querySignal(),
        tab: tabSignal(),
        defaultTab: defaultTabSignal(),
        defaultFullscreen: defaultFullscreenSignal(),
        theme: themeSignal(),
        density: densitySignal(),
        fontSize: fontSizeSignal(),
        opacity: opacitySignal(),
        debugLogs: debugLogsSignal(),
        filters: filtersSignal(),
        limits: limitsSignal(),
        plugins: pluginSettingsSignal(),
        settingsGroups: settingsGroupsSignal(),
      };
    }

    function patchState(partial) {
      const previous = getStateSnapshot();
      const next = typeof partial === "function" ? partial(previous) : { ...previous, ...partial };

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
        if ("open" in state) openSignal.set(Boolean(state.open));
        if ("docked" in state) dockedSignal.set(Boolean(state.docked));
        if ("zen" in state) zenSignal.set(Boolean(state.zen));

        if ("dockY" in state) {
          dockYSignal.set(
            clampNumber(state.dockY, MIN_DOCK_Y, Math.max(MIN_DOCK_Y, window.innerHeight - DOCK_BOTTOM_GAP)),
          );
        }

        if ("width" in state) {
          panelWidthSignal.set(
            clampNumber(state.width, MIN_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, window.innerWidth - PANEL_SCREEN_GAP * 2)),
          );
        }

        if ("height" in state) {
          panelHeightSignal.set(
            clampNumber(
              state.height,
              MIN_PANEL_HEIGHT,
              Math.max(MIN_PANEL_HEIGHT, window.innerHeight - PANEL_SCREEN_GAP * 2),
            ),
          );
        }

        if ("x" in state || "y" in state || "width" in state || "height" in state) {
          const rect = clampPanelRect({
            x: "x" in state ? state.x : panelXSignal.peek(),
            y: "y" in state ? state.y : panelYSignal.peek(),
            width: panelWidthSignal.peek(),
            height: panelHeightSignal.peek(),
          });

          panelXSignal.set(rect.x);
          panelYSignal.set(rect.y);
          panelWidthSignal.set(rect.width);
          panelHeightSignal.set(rect.height);
        }

        if ("query" in state) {
          const nextQuery = String(state.query || "");
          querySignal.set(nextQuery);
          queryDraftSignal.set(nextQuery);
        }

        if ("tab" in state) tabSignal.set(String(state.tab || "settings"));
        if ("defaultTab" in state) defaultTabSignal.set(String(state.defaultTab || "settings"));
        if ("defaultFullscreen" in state) defaultFullscreenSignal.set(Boolean(state.defaultFullscreen));
        if ("theme" in state) themeSignal.set(String(state.theme || "dark"));
        if ("density" in state) densitySignal.set(String(state.density || "compact"));
        if ("fontSize" in state) fontSizeSignal.set(Number(state.fontSize || 12));
        if ("opacity" in state) opacitySignal.set(Number(state.opacity || 0.94));
        if ("debugLogs" in state) debugLogsSignal.set(Boolean(state.debugLogs));
        if ("filters" in state) filtersSignal.set({ ...(state.filters || {}) });
        if ("limits" in state) limitsSignal.set({ ...(state.limits || {}) });
        if ("plugins" in state) pluginSettingsSignal.set({ ...(state.plugins || {}) });
        if ("settingsGroups" in state) settingsGroupsSignal.set({ ...(state.settingsGroups || {}) });
      });
    }

    /* *************** */
    /* Mount           */
    /* *************** */

    function mountShell() {
      host = createElement(`div#${HOST_ID}[data-ra-host="true"]`, {
        style: css`
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          pointer-events: none;
        `,
      });

      document.documentElement.appendChild(host);

      shadowRoot = host.attachShadow({ mode: "open" });

      installShellStyle(shadowRoot);

      root = createElement(`div#${ROOT_ID}.ra-root`);
      sourceRoot = createElement(`div#${SOURCE_HOST_ID}.ra-source-root`);

      shadowRoot.appendChild(root);
      shadowRoot.appendChild(sourceRoot);

disposer = render(root, html`<${App} />`);
sourceDisposer = render(sourceRoot, html`<${SourceModalHost} />`);

      window.Alerta = window.RodDockedInspector;

      refreshIcons();
    }

    function installShellStyle(targetRoot) {
      const style = createElement(`style#${STYLE_ID}`).props({
        text: getShellStyle()
      }).appendTo(targetRoot);

      //style.id = STYLE_ID;
      debug.log("shellStyle",getShellStyle())
            
     // style.textContent = getShellStyle();

      targetRoot.appendChild(style);

      return style;
    }

    /* *************** */
    /* Views           */
    /* *************** */

const App = function App() {
  return html`
  TESGE AAAAA <br/>
    <${Dock} />
    <${Panel} />
    <${ModalHost} />
  `;
};

const Dock = component(function Dock() {
  return html`
    === DOCK ===
    <button
      class="ra-dock"
      style=${() => css({ top: `${dockYSignal()}px` })}
      type="button"
      @click=${openInspector}
      @pointerdown=${startDockDrag}
    >
      <span class="ra-dock-inner">
        ${icon("panel-right-open")}
        <span class="ra-dock-count">${() => String(totalCountSignal())}</span>
      </span>
    </button>
  `;
});

const Panel = component(function Panel() {
  return html`
    <section class=${panelClassSignal} style=${panelStyleSignal} data-ra-theme=${themeSignal}>
      <${PanelHeader} />
      <${Toolbar} />
      <${Tabs} />
      <${FilterRow} />
      <${ActivePluginView} />
      <${ResizeHandle} />
    </section>
  `;
});

    /**
     * Reusable button component.
     *
     * @example
     * html`
     *   <${Button}
     *     tone="primary"
     *     onclick=${save}
     *   >
     *     Save
     *   </${Button}>
     * `
     *
     * @example
     * html`
     *   <${Button}
     *     tone="danger"
     *     size="sm"
     *   >
     *     Delete
     *   </${Button}>
     * `
     */
     
  /*   const buttonClasses = Cipo.css`
        appearance: none;
        py: 4px
        
        &.icon {
          color: teal; 
        }
     `*/
     
     
const buttonClasses = Cipo.recipe({
  base: 'buttonBase;focusRing;',
  variants: {
    tone: {
      primary: 'bg:$brand;color:$ink;',
      danger: 'bg:$danger;color:white;',
    },
  },
  defaults: { tone: 'primary' },
})


    debug.log("buttonClasses", buttonClasses().compiledCss)

    const Button = component((props = {}) => {
      const tone = props.tone || "primary";
      const size = props.size || "md";
      const type = props.type || "button"
      console.log("Button component props", {props});
      
      return html`
        <button
          ...${props}
          className=${() =>
            [
              "ra-button",
              `ra-button-${tone}`,
              `ra-button-${size}`,
              props.className,
              buttonClasses,
            ]
              .filter(Boolean)
              .join(" ")}
        >
          ${props.leftIcon
            ? html`
                <span class="ra-button-icon">
                  ${typeof props.leftIcon === "function"
                    ? props.leftIcon()
                    : icon(props.leftIcon)}
                </span>
              `
            : ""}

          <span class="ra-button-label">
            ${props.children}
          </span>

          ${props.rightIcon
            ? html`
                <span class="ra-button-icon">
                  ${typeof props.rightIcon === "function"
                    ? props.rightIcon()
                    : icon(props.rightIcon)}
                </span>
              `
            : ""}
        </button>
      `;
    });



const PanelHeader = component(function PanelHeader() {
  return html`
    <header class="ra-header" @pointerdown=${startPanelDrag}>
      <div class="ra-title">
        ${icon("bug")}
        <span>Alerta</span>
      </div>

      <div class="ra-actions">
        <${Button} className="ra-button" type="button" @click=${toggleZenMode}>
          ${() => icon(zenSignal() ? "shrink" : "expand")}
          <span>Zen</span>
        </${Button}>
        <${Button} @click=${copyVisible} iconLeft="copy">Copy </${Button}>
        <${Button} @click=${clearCurrent}>${icon("trash-2")}<span>Clear</span></${Button}>
        <${Button} @click=${minimizeInspector}>${icon("minus")}<span>Min</span></${Button}>
      </div>
    </header>
  `;
});

const Toolbar = component(function Toolbar() {
  return html`
    <div class="ra-toolbar">
      ${icon("search")}
      <input
        class="ra-search"
        type="search"
        placeholder="Filter..."
        autocomplete="off"
        .value=${queryDraftSignal}
        @input=${handleSearch}
      />
    </div>
  `;
});

const Tabs = component(function Tabs() {
  return html`
    <nav class="ra-tabs">
      ${repeat(
        visiblePluginsSignal,
        (plugin) => plugin.id,
        ({ item }) => html`<${TabButton} plugin=${item} />`,
      )}
    </nav>
  `;
});

const TabButton = component(function TabButton({ plugin }) {
  return html`
    <button
      class=${() => `ra-tab ${tabSignal() === plugin().id ? "ra-active" : ""}`}
      type="button"
      @click=${() => setTab(plugin().id)}
    >
      ${() => icon(plugin().icon || "puzzle")}
      ${() => (zenSignal() ? "" : html`<span>${plugin().title}</span>`)}
    </button>
  `;
});

const FilterRow = component(function FilterRow() {
  return html`
    <div class="ra-filter-row">
      ${() => {
        const plugin = activePluginSignal();

        return plugin?.renderFilters ? plugin.renderFilters(plugin.api) : "";
      }}
    </div>
  `;
});

const ActivePluginView = component(function ActivePluginView() {
  return html`
    <main class="ra-main">
      ${() => {
        const plugin = activePluginSignal();

        return plugin?.render ? plugin.render(plugin.api) : "";
      }}
    </main>
  `;
});

const ResizeHandle = component(function ResizeHandle() {
  return html`<div class="ra-resize" @pointerdown=${startResize}></div>`;
});

const ModalHost = component(function ModalHost() {
  return html`
    ${() => {
      const modal = modalSignal();

      return modal ? Modal({ modal }) : "";
    }}
  `;
});

const Modal = component(function Modal({ modal }) {
  let inputRef = null;

  return html`
    <div class="ra-modal-root" @click=${handleModalBackdrop}>
      <section class=${`ra-modal ra-modal-${modal.tone}`} role="dialog" aria-modal="true">
        <div class="ra-modal-glow"></div>

        <header class="ra-modal-head">
          <div class="ra-modal-title">
            <span class="ra-modal-icon">${icon(modal.icon || "sparkles")}</span>
            <div>
              <strong>${modal.title}</strong>
              ${modal.message ? html`<small>${modal.message}</small>` : ""}
            </div>
          </div>

          <button class="ra-modal-close" type="button" @click=${() => closeModal(null)}>${icon("x")}</button>
        </header>

        <div class="ra-modal-body">
          ${modal.kind === "prompt" && modal.multiline
            ? html`
                <textarea
                  class="ra-modal-textarea"
                  placeholder=${modal.placeholder}
                  .value=${modal.value || ""}
                  ref=${ref((node) => {
                    inputRef = node;
                  })}
                ></textarea>
              `
            : ""}

          ${modal.kind === "prompt" && !modal.multiline
            ? html`
                <input
                  class="ra-modal-input"
                  type="text"
                  placeholder=${modal.placeholder}
                  .value=${modal.value || ""}
                  ref=${ref((node) => {
                    inputRef = node;
                  })}
                />
              `
            : ""}

          ${modal.body ? html`<div class="ra-modal-content">${modal.body}</div>` : ""}
        </div>

        <footer class="ra-modal-actions">
          ${modal.showCancel
            ? html`<button class="ra-pill ra-modal-secondary" type="button" @click=${() => closeModal(null)}>${modal.cancelText}</button>`
            : ""}

          <button class="ra-pill ra-modal-primary" type="button" @click=${() => confirmModalAction(modal, inputRef)}>
            ${modal.confirmText}
          </button>
        </footer>
      </section>
    </div>
  `;
});

const SourceModalHost = component(function SourceModalHost() {
  return html`
    ${() => {
      const state = sourceSignal();

      return state.open ? SourceModal({ state }) : "";
    }}
  `;
});

const SourceModal = component(function SourceModal({ state }) {
  const height = Math.max(240, state.viewportHeight || 520);
  const first = Math.max(0, Math.floor((state.scrollTop || 0) / SOURCE_LINE_HEIGHT) - SOURCE_OVERSCAN);
  const count = Math.ceil(height / SOURCE_LINE_HEIGHT) + SOURCE_OVERSCAN * 2;
  const visibleLines = state.highlightedLines.slice(first, first + count);
  const totalHeight = Math.max(SOURCE_LINE_HEIGHT, state.highlightedLines.length * SOURCE_LINE_HEIGHT);

  return html`
    <div class="ra-source-backdrop" @click=${handleSourceBackdrop}>
      <section class="ra-source-modal" role="dialog" aria-modal="true">
        <header class="ra-source-head">
          <div class="ra-source-title">
            <span>${icon("code-2")}</span>
            <div>
              <strong>${state.title}</strong>
              <small>${state.language} · ${state.lineCount} lines${state.url ? ` · ${state.url}` : ""}</small>
            </div>
          </div>

          <nav class="ra-source-actions">
            ${state.url
              ? html`<button type="button" @click=${() => window.open(state.url, "_blank", "noopener,noreferrer")}>${icon("external-link")}Open</button>`
              : ""}
            ${state.url ? html`<button type="button" @click=${() => copyText(state.url)}>${icon("link")}URL</button>` : ""}
            <button type="button" @click=${() => copyText(state.current)}>${icon("copy")}Copy</button>
            <button type="button" @click=${toggleSourceWrap}>${icon("wrap-text")}${state.wrap ? "Wrap" : "No wrap"}</button>
            <button type="button" @click=${closeSourceModal}>${icon("x")}</button>
          </nav>
        </header>

        <main class=${`ra-source-body ${state.wrap ? "ra-source-wrap" : ""}`} @scroll=${handleSourceScroll}>
          <div class="ra-source-spacer" style=${css({ height: `${totalHeight}px` })}></div>
          <div class="ra-source-lines" style=${css({ transform: `translateY(${first * SOURCE_LINE_HEIGHT}px)` })}>
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
});

    /* *************** */
    /* Public API      */
    /* *************** */

    api = createPluginApi("core");

    function createPluginApi(pluginId = "core") {
      const normalizedPluginId = normalizePluginId(pluginId);
      const pluginDebug = createDebugLogger(normalizedPluginId);

      return {
        version: VERSION,
        pluginId: normalizedPluginId,
        debug: pluginDebug,

        html,
        css,
        render,
        signal,
        computed,
        component,
        effect,
        batch,
        repeat,
        when,
        ref,
        classMap,
        styleMap,
        rawHtml,

        get state() {
          return getStateSnapshot();
        },

        patchState,
        updateState,
        readStorage,
        saveStorage,

        stateSignal: createCompatibilityStateSignal(),
        pluginsSignal,
        modalSignal,
        sourceSignal,

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
          groups: () => settingsGroupsSignal(),
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

    function createCompatibilityStateSignal() {
      function read() {
        return getStateSnapshot();
      }

      read.peek = getStateSnapshot;
      read.set = applyStateSnapshot;
      read.update = (updater) => applyStateSnapshot(updater(getStateSnapshot()));
      read.subscribe = () => () => {};

      return read;
    }

    function exposePublicApi() {
      window.RodDockedInspector = {
        version: VERSION,
        api,
        debug,
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
          const plugins = pluginsSignal.peek();

          for (let index = 0; index < plugins.length; index += 1) {
            const plugin = plugins[index];

            if (typeof plugin.clear === "function") {
              plugin.clear(plugin.api);
            }
          }
        },

        destroy() {
          try {
            disposer?.();
          } catch {}

          try {
            sourceDisposer?.();
          } catch {}

          try {
            eventBus.clear();
          } catch {}

          try {
            window.removeEventListener("error", handleFatalError);
            window.removeEventListener("unhandledrejection", handlePromiseFatalError);
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
          defaultValue: debugLogsSignal(),
        },
        {
          key: "defaultTab",
          type: "select",
          label: "Default tab",
          defaultValue: defaultTabSignal(),
          options: () => visiblePluginsSignal().map((plugin) => ({ label: plugin.title, value: plugin.id })),
        },
        { key: "defaultFullscreen", type: "boolean", label: "Default Zen", defaultValue: defaultFullscreenSignal() },
        {
          key: "theme",
          type: "select",
          label: "Theme",
          defaultValue: themeSignal(),
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
          defaultValue: densitySignal(),
          options: [
            { label: "Compact", value: "compact" },
            { label: "Comfortable", value: "comfortable" },
            { label: "Spacious", value: "spacious" },
          ],
        },
        { key: "fontSize", type: "range", label: "Font size", min: 10, max: 18, step: 1, defaultValue: fontSizeSignal() },
        { key: "opacity", type: "range", label: "Opacity", min: 0.7, max: 1, step: 0.01, defaultValue: opacitySignal() },
        { key: "width", type: "number", label: "Width", min: 320, max: 1200, step: 20, defaultValue: panelWidthSignal() },
        { key: "height", type: "number", label: "Height", min: 260, max: 1200, step: 20, defaultValue: panelHeightSignal() },
      ]);
    }

    function registerPlugin(plugin) {
      if (!plugin?.id) return false;

      const pluginId = normalizePluginId(plugin.id);
      const pluginApi = createPluginApi(pluginId);
      const currentPlugins = pluginsSignal.peek();
      const existingIndex = currentPlugins.findIndex((item) => item.id === pluginId);

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
          currentPlugins[existingIndex].teardown?.(currentPlugins[existingIndex].api);
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
      pluginsSignal.set(nextPlugins);

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
      const currentPlugins = pluginsSignal.peek();
      const index = currentPlugins.findIndex((plugin) => plugin.id === id);

      if (index < 0) return false;

      const plugin = currentPlugins[index];

      try {
        plugin.teardown?.(plugin.api);
      } catch (error) {
        plugin.api?.debug?.warn("plugin:teardown failed", error);
      }

      pluginsSignal.set(currentPlugins.filter((item) => item.id !== id));

      if (tabSignal() === id) {
        tabSignal.set(visiblePluginsSignal()[0]?.id || "settings");
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
        modalSignal.set({
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
    }

    function alertModal(options = {}) {
      return openModal({ ...options, kind: "alert", showCancel: false }).then(() => true);
    }

    function confirmModal(options = {}) {
      return openModal({ ...options, kind: "confirm", showCancel: true }).then(Boolean);
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

      sourceSignal.set({
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

      const pretty = await Promise.resolve(prettySource(source, language, { maxLength: SOURCE_MAX_PRETTY }));
      const highlighted = highlightCode(pretty, language);
      const highlightedLines = splitHighlightedLines(highlighted);

      sourceSignal.set({
        ...sourceSignal.peek(),
        current: pretty,
        highlightedLines,
        lineCount: Math.max(1, highlightedLines.length),
        scrollTop: 0,
      });

      refreshIcons();

      return true;
    }

    function closeSourceModal() {
      sourceSignal.set(createSourceState());
    }

    function closeModal(result = null) {
      const modal = modalSignal.peek();
      modalSignal.set(null);

      if (modal?.resolve) modal.resolve(result);
      eventBus.emit("modal:close", result);
    }

    function confirmModalAction(modal, inputRef) {
      if (modal.kind === "prompt") {
        closeModal(inputRef ? inputRef.value : "");
        return;
      }

      closeModal(true);
    }

    function handleModalBackdrop(event) {
      if (event.target.classList.contains("ra-modal-root")) {
        closeModal(null);
      }
    }

    function handleSourceBackdrop(event) {
      if (event.target.classList.contains("ra-source-backdrop")) {
        closeSourceModal();
      }
    }

    function handleSourceScroll(event) {
      const target = event.currentTarget;

      sourceSignal.update((previous) => ({
        ...previous,
        scrollTop: target.scrollTop,
        viewportHeight: target.clientHeight || previous.viewportHeight,
      }));
    }

    function toggleSourceWrap() {
      sourceSignal.update((previous) => ({ ...previous, wrap: !previous.wrap }));
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
              <span>Core UI and every plugin setting in one place.</span>
            </div>

            <div class="ra-settings-actions">
              <button class="ra-pill" type="button" @click=${exportSettings}>${icon("copy")}Export</button>
              <button class="ra-pill" type="button" @click=${importSettings}>${icon("upload")}Import</button>
              <button class="ra-pill" type="button" @click=${resetAllSettings}>${icon("rotate-ccw")}Reset</button>
            </div>
          </div>

          ${() =>
            Object.entries(settingsGroupsSignal() || {}).map(([pluginId, fields]) => {
              const plugin = pluginsSignal.peek().find((item) => item.id === pluginId);

              return renderSettingsGroup(
                pluginId,
                plugin ? plugin.title : pluginId === "core" ? "Core" : pluginId,
                plugin?.icon || (pluginId === "core" ? "panel-top" : "puzzle"),
                fields.map((field) => ({
                  ...field,
                  value:
                    pluginId === "core"
                      ? getCoreSetting(field.key)
                      : getPluginSetting(pluginId, field.key, field.defaultValue),
                  options: typeof field.options === "function" ? field.options() : field.options,
                })),
              );
            })}
        </section>
      `;
    }

    function renderSettingsGroup(pluginId, title, iconName, fields) {
      return html`
        <article class="ra-settings-group">
          <header class="ra-settings-group-head">
            <div>${icon(iconName)}<strong>${title}</strong></div>
            <span>${String(fields.length)}</span>
          </header>

          <div class="ra-settings-grid">
            ${fields.map((field) => renderSettingField(pluginId, field))}
          </div>
        </article>
      `;
    }

    function renderSettingField(pluginId, field) {
      const type = field.type || "text";

      return html`
        <label class="ra-setting-field">
          <span class="ra-setting-label">
            <strong>${field.label || field.key}</strong>
            ${field.description ? html`<small>${field.description}</small>` : ""}
          </span>

          <span class="ra-setting-control">
            ${type === "boolean"
              ? html`
                  <input
                    class="ra-switch"
                    type="checkbox"
                    .checked=${Boolean(field.value)}
                    @change=${(event) => handleSettingAction(`${pluginId}:${field.key}:${type}`, event.target)}
                  />
                `
              : ""}

            ${type === "select"
              ? html`
                  <select
                    class="ra-select"
                    .value=${String(field.value)}
                    @change=${(event) => handleSettingAction(`${pluginId}:${field.key}:${type}`, event.target)}
                  >
                    ${(field.options || []).map((option) => html`<option value=${option.value}>${option.label}</option>`)}
                  </select>
                `
              : ""}

            ${type === "range"
              ? html`
                  <div class="ra-range-wrap">
                    <input
                      class="ra-range"
                      type="range"
                      min=${field.min}
                      max=${field.max}
                      step=${field.step || 1}
                      .value=${String(field.value)}
                      @input=${(event) => handleSettingAction(`${pluginId}:${field.key}:${type}`, event.target)}
                    />
                    <code>${String(field.value)}</code>
                  </div>
                `
              : ""}

            ${type === "number"
              ? html`
                  <input
                    class="ra-input"
                    type="number"
                    min=${field.min}
                    max=${field.max}
                    step=${field.step || 1}
                    .value=${String(field.value)}
                    @input=${(event) => handleSettingAction(`${pluginId}:${field.key}:${type}`, event.target)}
                  />
                `
              : ""}

            ${type === "text"
              ? html`
                  <input
                    class="ra-input"
                    type="text"
                    .value=${String(field.value ?? "")}
                    @input=${(event) => handleSettingAction(`${pluginId}:${field.key}:${type}`, event.target)}
                  />
                `
              : ""}
          </span>
        </label>
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
            if (next.plugins[id][field.key] === undefined) {
              next.plugins[id][field.key] = field.defaultValue;
            }

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
      const state = getStateSnapshot();

      return state[key];
    }

    function setCoreSetting(key, value) {
      if (key === "debugLogs") debugLogsSignal.set(Boolean(value));
      else if (key === "defaultTab") defaultTabSignal.set(String(value));
      else if (key === "defaultFullscreen") {
        defaultFullscreenSignal.set(Boolean(value));
        zenSignal.set(Boolean(value));
      } else if (key === "theme") themeSignal.set(String(value));
      else if (key === "density") densitySignal.set(String(value));
      else if (key === "fontSize") fontSizeSignal.set(Number(value));
      else if (key === "opacity") opacitySignal.set(Number(value));
      else if (key === "width") panelWidthSignal.set(Number(value));
      else if (key === "height") panelHeightSignal.set(Number(value));
      else patchState({ [key]: value });
    }

    function getPluginSetting(pluginId, key, fallback = undefined) {
      const id = normalizePluginId(pluginId);
      const settings = pluginSettingsSignal();

      return settings?.[id]?.[key] !== undefined ? settings[id][key] : fallback;
    }

    function setPluginSetting(pluginId, key, value) {
      const id = normalizePluginId(pluginId);

      updateState((next) => {
        if (!next.plugins[id]) next.plugins[id] = {};
        next.plugins[id][key] = value;
      });

      eventBus.emit("setting:changed", { pluginId: id, key, value });
    }

    function handleSettingAction(encoded, target) {
      const [pluginId, key, type] = encoded.split(":");
      let value = target.value;

      if (type === "boolean") value = Boolean(target.checked);
      if (type === "number" || type === "range") value = Number(value);

      if (pluginId === "core") {
        setCoreSetting(key, value);
        return;
      }

      setPluginSetting(pluginId, key, value);
    }

    function resetAllSettings() {
      batch(() => {
        defaultTabSignal.set("settings");
        defaultFullscreenSignal.set(false);
        themeSignal.set("dark");
        densitySignal.set("compact");
        fontSizeSignal.set(12);
        opacitySignal.set(0.94);
        debugLogsSignal.set(true);
        panelWidthSignal.set(520);
        panelHeightSignal.set(Math.min(780, window.innerHeight - 28));
        zenSignal.set(false);
        tabSignal.set("settings");
      });

      debug.setEnabled(true);
      eventBus.emit("settings:reset", api);
    }

    function exportSettings() {
      copyText(JSON.stringify({ core: getStateSnapshot(), plugins: pluginSettingsSignal() }, null, 2));
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

      const value = filtersSignal()[plugin.id] || "all";

      return html`
        <select class="ra-select ra-filter-select" .value=${value} @change=${(event) => setPluginFilter(plugin.id, event.target.value)}>
          ${plugin.filters.map((item) => html`<option value=${item}>${item === "all" ? `All ${plugin.title.toLowerCase()}` : item}</option>`)}
        </select>
      `;
    }

    function viewRecords(pluginId, records, renderRecord) {
      const limit = limitsSignal()[pluginId] || INITIAL_LIMIT;
      const visible = records.slice(0, limit);

      if (!visible.length) {
        return html`<div class="ra-empty">${icon("moon")}<div>No ${pluginId} yet.</div></div>`;
      }

      return html`
        ${repeat(
          () => visible,
          (record) => record.id,
          ({ item }) => renderRecord(item()),
        )}
        ${records.length > visible.length ? html`<button class="ra-load-more" type="button" @click=${loadMore}>Load more</button>` : ""}
      `;
    }

    function viewInspectableObject(refId, path, label, options = {}) {
      const value = objectStoreMap.get(refId);
      if (!value) return "";

      const element = getElementFromObject(value);
      const showActions = options.showActions !== false;
      const isReact = element && isReactElement(element);

      return html`
        <section class="ra-object-card">
          ${showActions
            ? html`
                <div class="ra-inspect-actions">
                  <button class="ra-pill" type="button" @click=${() => setDollarZero(refId)}>${icon("badge-dollar-sign")}$0</button>
                  ${element ? html`<button class="ra-pill" type="button" @click=${() => revealElementRef(refId)}>${icon("mouse-pointer-click")}Elements</button>` : ""}
                  ${isReact ? html`<button class="ra-pill" type="button" @click=${() => revealReactRef(refId)}>${icon("atom")}React</button>` : ""}
                  <button class="ra-pill" type="button" @click=${() => focusObject(refId)}>${icon("scan-search")}Focus</button>
                  <button class="ra-pill" type="button" @click=${() => openSourceModal(refId)}>${icon("code-2")}Source</button>
                </div>
              `
            : ""}

          ${viewNode(value, path, label, 0)}
        </section>
      `;
    }

    function viewNode(value, path, label, depth) {
      treeVersionSignal();

      if (!isObjectLike(value)) {
        return html`
          <div class="ra-tree-row" style=${css({ paddingLeft: `${depth * 12}px` })}>
            <span class="ra-tree-spacer"></span>
            <span>${label ? html`<span class="ra-key">${label}:</span> ` : ""}${getNodeLabel(value)}</span>
          </div>
        `;
      }

      const isOpen = expandedPaths.has(path);
      const allEntries = isOpen ? getEntries(value, path) : [];
      const pathLimit = expandedPathLimits.get(path) || MAX_TREE_RENDER_ITEMS;
      const entries = allEntries.slice(0, pathLimit);

      return html`
        <div class="ra-tree-item">
          <div class="ra-tree-row" style=${css({ paddingLeft: `${depth * 12}px` })}>
            <button class="ra-tree-toggle" type="button" @click=${() => togglePath(path)}>${icon(isOpen ? "chevron-down" : "chevron-right")}</button>
            <span class="ra-tree-summary">${label ? html`<span class="ra-key">${label}:</span> ` : ""}${rawHtml(getObjectPreview(value))}</span>
          </div>

          ${isOpen
            ? html`
                ${entries.map((entry) => viewNode(entry.value, entry.path, entry.label, depth + 1))}
                ${allEntries.length > entries.length
                  ? html`<button class="ra-tree-more" type="button" @click=${() => expandPathLimit(path)}>Load ${Math.min(MAX_TREE_RENDER_ITEMS, allEntries.length - entries.length)} more</button>`
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

        for (let index = 0; index < limit; index += 1) {
          output[index] = { label: String(index), value: value[index], path: `${basePath}[${index}]` };
        }

        return output;
      }

      if (value instanceof Element) {
        return [
          { label: "tagName", value: value.tagName, path: `${basePath}.tagName` },
          { label: "id", value: value.id, path: `${basePath}.id` },
          { label: "className", value: value.className, path: `${basePath}.className` },
          {
            label: "attributes",
            value: Array.from(value.attributes).map((attr) => ({ name: attr.name, value: attr.value })),
            path: `${basePath}.attributes`,
          },
          { label: "dataset", value: { ...value.dataset }, path: `${basePath}.dataset` },
          { label: "children", value: Array.from(value.children), path: `${basePath}.children` },
          { label: "outerHTML", value: formatHtml(value.outerHTML || ""), path: `${basePath}.outerHTML` },
        ];
      }

      const keys = Reflect.ownKeys(value).slice(0, MAX_TREE_ITEMS);
      const output = new Array(keys.length);

      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        output[index] = {
          label: String(key),
          value: safeCall(() => value[key], "[Throws]"),
          path: `${basePath}.${String(key)}`,
        };
      }

      return output;
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
        groupKey: options.groupKey || `${options.kind || "record"}:${options.preview || ""}:${refIds.join("|")}`,
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
      const target = typeof container === "string" ? document.querySelector(container) : container;

      if (!target) throw new Error("[Alerta] createLogSurface needs a valid container.");

      const recordsSignal = signal([]);
      const limitSignal = signal(options.limit || INITIAL_LIMIT);

      let surfaceDisposer = null;

      const surface = {
        container: target,
        recordsSignal,
        limitSignal,
        options: { toolbar: true, group: true, maxRecords: MAX_RECORDS, ...options },

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
          const current = recordsSignal.peek().slice();
          const preview = values.map(stringifyPreview).join(" ");
          const record = createRecord({ kind, type: kind, values, preview, groupKey: `${kind}:${preview}` });

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
            ? html`
                <div class="ra-surface-toolbar">
                  <span class="ra-kind">${icon(surface.options.icon || "terminal")}${surface.options.title || "Logs"}</span>
                  <button class="ra-pill" type="button" @click=${surface.clear}>${icon("trash-2")}Clear</button>
                </div>
              `
            : ""}

          ${() => {
            const visible = surface.recordsSignal().slice(0, surface.limitSignal());

            if (!visible.length) {
              return html`<div class="ra-empty">${icon("moon")}<div>No logs yet.</div></div>`;
            }

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
              <span class="ra-kind">
                ${icon(kindToIcon(record.kind))}
                <span>${record.kind}</span>
                ${record.react ? html`<span class="ra-react-badge">⚛</span>` : ""}
                ${record.count > 1 ? html`<span class="ra-count">${String(record.count)}</span>` : ""}
              </span>
              <span class="ra-time">${record.time}</span>
            </span>
            <div class="ra-message">${record.preview}</div>
          </div>

          ${hasObjects
            ? html`<div class="ra-card-body">${record.refIds.map((refId, index) => viewInspectableObject(refId, `$[${index}]`, "", { showActions }))}</div>`
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
      const pluginId = tabSignal();

      updateState((next) => {
        next.limits[pluginId] = (next.limits[pluginId] || INITIAL_LIMIT) + LIMIT_STEP;
      });
    }

    function openInspector(event) {
      event?.preventDefault?.();

      if (dockDragging) return;

      openSignal.set(true);
      eventBus.emit("panel:open", api);
      refreshIcons();
    }

    function toggleInspector(event) {
      event?.preventDefault?.();

      if (dockDragging) return;

      const nextOpen = !openSignal.peek();
      openSignal.set(nextOpen);
      eventBus.emit(nextOpen ? "panel:open" : "panel:minimize", api);
      refreshIcons();
    }

    function minimizeInspector() {
      batch(() => {
        openSignal.set(false);
      });

      eventBus.emit("panel:minimize", api);
    }

    function toggleZenMode() {
      batch(() => {
        zenSignal.set(!zenSignal.peek());
        openSignal.set(true);
      });

      eventBus.emit("panel:zen", zenSignal());
      eventBus.emit("panel:open", api);
      refreshIcons();
    }

    function clearCurrent() {
      const active = activePluginSignal();

      if (active?.clear) active.clear(active.api);

      eventBus.emit("records:clear", tabSignal());
    }

    function copyVisible() {
      const active = activePluginSignal();

      if (active?.copy) active.copy(active.api);
    }

    function handleSearch(event) {
      clearTimeout(searchTimer);

      const value = event.target.value;
      queryDraftSignal.set(value);

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

      treeVersionSignal.set(treeVersionSignal.peek() + 1);
    }

    function expandPathLimit(path) {
      expandedPathLimits.set(path, (expandedPathLimits.get(path) || MAX_TREE_RENDER_ITEMS) + MAX_TREE_RENDER_ITEMS);
      treeVersionSignal.set(treeVersionSignal.peek() + 1);
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
      eventBus.emit("element:selected", { element, source: options.source || "api" });

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
      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      flashElement(element);
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
      dragState = {
        type: "dock",
        startY: event.clientY,
        initialY: dockYSignal.peek(),
      };

      dockDragging = false;

      bindPointerSession({
        event,

        onMove(nextEvent) {
          if (!dragState || dragState.type !== "dock") return;

          const deltaY = nextEvent.clientY - dragState.startY;

          if (Math.abs(deltaY) > DRAG_THRESHOLD_PX) {
            dockDragging = true;
          }

          dockYSignal.set(
            clampNumber(
              dragState.initialY + deltaY,
              MIN_DOCK_Y,
              Math.max(MIN_DOCK_Y, window.innerHeight - DOCK_BOTTOM_GAP),
            ),
          );
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
      if (zenSignal()) return;

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

      dockedSignal.set(false);

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
            panelXSignal.set(rect.x);
            panelYSignal.set(rect.y);
          });
        },

        onEnd() {
          dragState = null;
        },
      });
    }

    function startResize(event) {
      if (zenSignal()) return;

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

      dockedSignal.set(false);

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
            panelWidthSignal.set(rect.width);
            panelHeightSignal.set(rect.height);
            panelXSignal.set(rect.x);
            panelYSignal.set(rect.y);
          });
        },

        onEnd() {
          resizeState = null;
        },
      });
    }

    window.addEventListener("resize", () => {
      const rect = clampPanelRect({
        x: panelXSignal.peek(),
        y: panelYSignal.peek(),
        width: panelWidthSignal.peek(),
        height: panelHeightSignal.peek(),
      });

      batch(() => {
        panelXSignal.set(rect.x);
        panelYSignal.set(rect.y);
        panelWidthSignal.set(rect.width);
        panelHeightSignal.set(rect.height);
        dockYSignal.set(
          clampNumber(dockYSignal.peek(), MIN_DOCK_Y, Math.max(MIN_DOCK_Y, window.innerHeight - DOCK_BOTTOM_GAP)),
        );
      });
    });

    /* *************** */
    /* Persistence     */
    /* *************** */

    function readState() {
      const fallback = {
        open: false,
        docked: true,
        zen: false,
        dockY: Math.round(window.innerHeight * 0.34),
        x: 16,
        y: 72,
        width: 520,
        height: Math.min(780, window.innerHeight - 28),
        query: "",
        tab: "settings",
        defaultTab: "settings",
        defaultFullscreen: false,
        theme: "dark",
        density: "compact",
        fontSize: 12,
        opacity: 0.7,
        debugLogs: true,
        filters: {},
        limits: {},
        plugins: {},
        settingsGroups: {},
      };

      const saved = readStorage(STORAGE_KEY, readStorage(LEGACY_STORAGE_KEY, {}));

      debugEnabled = Boolean(saved.debugLogs ?? fallback.debugLogs);

      const next = {
        ...fallback,
        ...saved,
        open: saved.open ?? fallback.open,
        docked: true,
        tab: saved.defaultTab || saved.tab || fallback.tab,
        filters: { ...(saved.filters || {}) },
        limits: {},
        plugins: { ...(saved.plugins || {}) },
        settingsGroups: { ...(saved.settingsGroups || {}) },
      };

      const rect = clampPanelRect({ x: next.x, y: next.y, width: next.width, height: next.height });

      return {
        ...next,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    }

    function saveState(state) {
      return saveStorage(STORAGE_KEY, getPersistableState(state), {});
    }

    function readStorage(key, fallback = {}) {
      return readStorageValue(key, fallback, null, localStorage);
     /*
      if (typeof key !== "string" || key.trim() === "") {
        debug.error("readStorage failed: invalid storage key", key);
        return fallback;
      }

      return storage.read(key, fallback);
      */
      
    }

    function saveStorage(key, data, fallback = null) {
      return writeStorageValue(key, data, fallback, localStorage);
         /*
      if (typeof key !== "string" || key.trim() === "") {
        debug.error("saveStorage failed: invalid storage key", key);
        return false;
      }

      return storage.write(key, data, fallback);
      */
    }

    function getPersistableState(state) {
      return {
        zen: Boolean(state.zen),
        dockY: state.dockY,
        x: state.x,
        y: state.y,
        width: state.width,
        height: state.height,
        query: state.query || "",
        tab: state.tab,
        defaultTab: state.defaultTab,
        defaultFullscreen: Boolean(state.defaultFullscreen),
        theme: state.theme,
        density: state.density,
        fontSize: state.fontSize,
        opacity: state.opacity,
        debugLogs: Boolean(state.debugLogs),
        filters: { ...(state.filters || {}) },
        plugins: { ...(state.plugins || {}) },
        settingsGroups: { ...(state.settingsGroups || {}) },
      };
    }

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

    /* *************** */
    /* Utilities       */
    /* *************** */

    function createPluginStorage(pluginId) {
      const storageKey = `${PLUGIN_STORAGE_PREFIX}.${normalizePluginId(pluginId)}`;

      return {
        key: storageKey,

        get(name, fallbackValue = null) {
          const current = readStorage(storageKey, {});
          return Object.prototype.hasOwnProperty.call(current, name) ? current[name] : fallbackValue;
        },

        set(name, value) {
          const current = readStorage(storageKey, {});
          current[name] = value;
          saveStorage(storageKey, current);
          return value;
        },

        patch(partialState) {
          const next = { ...readStorage(storageKey, {}), ...(partialState || {}) };
          saveStorage(storageKey, next);
          return next;
        },

        remove(name) {
          const current = readStorage(storageKey, {});
          delete current[name];
          saveStorage(storageKey, current);
        },

        clear() {
          try {
            localStorage.removeItem(storageKey);
          } catch {}
        },

        all() {
          return readStorage(storageKey, {});
        },
      };
    }

    function getTotalPluginCount() {
      const plugins = pluginsSignal();
      let total = 0;

      for (let index = 0; index < plugins.length; index += 1) {
        const plugin = plugins[index];

        if (typeof plugin.getCount === "function") {
          total += Number(plugin.getCount(plugin.api) || 0);
        }
      }

      return total;
    }

    function refreshIcons() {
      const targetRoot = shadowRoot || root?.getRootNode?.() || root;

      function run() {
        if (!targetRoot) return;

        try {
          if (lucide?.createIcons) {
            lucide?.createIcons({
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

    function icon(name) {
      const iconName = String(name || "circle");

      return html`
        <span class="ra-icon-wrap" aria-hidden="true">
          <i data-lucide=${iconName} class=${`ra-icon ra-lucide icon-${iconName}`}></i>
        </span>
      `;
    }

    function addStyle(cssText, id = "") {
      const style = el("style", {
        id: id || `rod-inspector-plugin-style-${hashText(cssText)}`,
        text: String(cssText)
      });
       
       /*
      style.id = id || `rod-inspector-plugin-style-${hashText(cssText)}`;
      style.textContent = String(cssText);
      */
      
      if (shadowRoot) {
        const previous = shadowRoot.querySelector(`#${CSS.escape(style.id)}`);
        previous?.remove?.();
        shadowRoot.appendChild(style);
      } else {
        const previous = document.getElementById(style.id);
        previous?.remove?.();
        (document.head || document.documentElement).appendChild(style);
      }

      return style;
    }

    return {
      debug,
      mountShell,
      exposePublicApi,
      registerCorePlugins,
    };
  }

  /* *************** */
  /* Global Utils    */
  /* *************** */

  function waitForRequiredGlobal(name, timeout) {
    const startedAt = performance.now();

    return new Promise((resolve, reject) => {
      function readGlobal() {
        try {
          if (globalThis[name]) return globalThis[name];
          if (window[name]) return window[name];
          if (typeof unsafeWindow !== "undefined" && unsafeWindow[name]) return unsafeWindow[name];
        } catch {}

        try {
          return Function(`return typeof ${name} !== "undefined" ? ${name} : undefined`)();
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

  function waitForGlobal(name, timeout = BOOT_TIMEOUT_MS) {
    return waitForRequiredGlobal(name, timeout);
  }

  function waitForDocumentElement() {
    if (document.documentElement) return Promise.resolve();

    return new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
  }

  function cleanupPreviousInstance() {
    try {
      window.RodDockedInspector?.destroy?.();
    } catch {}

    const leftovers = document.querySelectorAll(`#${HOST_ID}, [data-ra-host="true"]`);

    for (let index = 0; index < leftovers.length; index += 1) {
      leftovers[index].remove();
    }
  }

function insertBootError(error) {
  const host = createElement("pre", {
    id: "__rod_alerta_boot_error__",
    text: `[Alerta boot failed]
      ${error}
      ${String(error?.stack || error?.message || error)}`,
  });

  host.css`
    position: fixed;
    z-index: 2147483647;
    left: 8px;
    right: 8px;
    bottom: 8px;
    max-height: 45vh;
    overflow: auto;
    padding: 12px;
    border-radius: 12px;
    background: #12070a;
    color: #ffb4b4;
    font: 12px/1.45 ui-monospace, monospace;
    white-space: pre-wrap;
  `;

  host.addEventListener("click", () => host.remove());

  (document.documentElement || document.body)?.appendChild(host);
}

  function fallbackCopyText(value) {
    const text = String(value ?? "");
    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:fixed;top:-999px;left:-999px;opacity:0";

    document.documentElement.appendChild(textarea);
    textarea.select();

    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  }

  function getObjectPreview(value) {
    if (!isObjectLike(value)) return escapeHtml(getNodeLabel(value));

    if (value instanceof Element) {
      return `<span class="ra-element">${escapeHtml(formatElement(value))}</span>${
        isReactElement(value) ? '<span class="ra-react-badge">⚛</span>' : ""
      }`;
    }

    if (Array.isArray(value)) return `<span class="ra-object-type">Array(${value.length})</span>`;
    if (value instanceof Map) return `<span class="ra-object-type">Map(${value.size})</span>`;
    if (value instanceof Set) return `<span class="ra-object-type">Set(${value.size})</span>`;
    if (value instanceof WeakMap) return `<span class="ra-object-type">WeakMap</span>`;
    if (value instanceof WeakSet) return `<span class="ra-object-type">WeakSet</span>`;
    if (value instanceof Error) {
      return `<span class="ra-object-type">${escapeHtml(value.name)}</span> ${escapeHtml(value.message)}`;
    }

    return `<span class="ra-object-type">${escapeHtml(getNodeLabel(value))}</span>`;
  }

  function getRichCode(value) {
    if (value instanceof HTMLStyleElement) return formatCss(value.textContent || "");
    if (value instanceof HTMLScriptElement) return prettySource(dedent(value.textContent || ""), "javascript");
    if (value instanceof HTMLTemplateElement) return formatHtml(value.innerHTML || "");
    if (value instanceof Element) return formatHtml(value.outerHTML || "");
    if (typeof value === "function") return dedent(Function.prototype.toString.call(value));

    return null;
  }

  function getCodeLanguage(value) {
    if (value instanceof HTMLStyleElement) return "css";
    if (value instanceof HTMLScriptElement || typeof value === "function") return "javascript";

    return "xml";
  }

  function formatValue(value, depth = 0, seen = new WeakSet()) {
    if (!isObjectLike(value)) return getNodeLabel(value);
    if (seen.has(value)) return "[Circular]";

    seen.add(value);

    const rich = getRichCode(value);
    if (rich) return rich;

    if (value instanceof Map) {
      const entries = Array.from(value.entries()).slice(0, MAX_TREE_ITEMS);
      return `Map(${value.size}) {\n${entries
        .map(([key, item]) => `${"  ".repeat(depth + 1)}${getNodeLabel(key)} => ${formatValue(item, depth + 1, seen)}`)
        .join(",\n")}\n${"  ".repeat(depth)}}`;
    }

    if (value instanceof Set) {
      const entries = Array.from(value.values()).slice(0, MAX_TREE_ITEMS);
      return `Set(${value.size}) {\n${entries
        .map((item) => `${"  ".repeat(depth + 1)}${formatValue(item, depth + 1, seen)}`)
        .join(",\n")}\n${"  ".repeat(depth)}}`;
    }

    const keys = Reflect.ownKeys(value).slice(0, MAX_TREE_ITEMS);
    const body = keys
      .map((key) => {
        const item = safeCall(() => value[key], "[Throws]");
        return `${"  ".repeat(depth + 1)}${String(key)}: ${formatValue(item, depth + 1, seen)}`;
      })
      .join(",\n");

    return keys.length ? `{\n${body}\n${"  ".repeat(depth)}}` : "{}";
  }

  function stringifyPreview(value) {
    return typeof value === "string" ? trimText(value, MAX_TEXT) : getNodeLabel(value);
  }

  function getTime() {
    return new Date().toLocaleTimeString();
  }

  function kindToIcon(kind) {
    if (kind === "error") return "circle-alert";
    if (kind === "warn") return "triangle-alert";
    if (kind === "info") return "info";
    if (kind === "debug") return "bug";
    if (kind === "network") return "wifi";

    return "terminal";
  }

  function clonePlainObject(value) {
    const output = {};

    for (const key in value) {
      const item = value[key];
      output[key] = isPlainObject(item) ? { ...item } : item;
    }

    return output;
  }

  function normalizePluginId(pluginId) {
    return (
      String(pluginId || "core")
        .trim()
        .replace(/[^\w.-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "core"
    );
  }

  function flashElement(element) {
    if (!(element instanceof Element)) return;

    const previous = {
      outline: element.style.outline,
      outlineOffset: element.style.outlineOffset,
      transition: element.style.transition,
    };

    el(element).styles({
      transition: "outline 160ms ease, outline-offset 160ms ease",
      outline: "4px solid rgba(125,211,252,.95)",
      outlineOffset: "5px"
    });

    setTimeout(() => {
      el(element).styles({ 
        outline: previous.outline,
        outlineOffset: previous.outlineOffset,
        transition: previous.transition,
      });
    }, FLASH_MS);
  }

  function createFallbackIconClass(name) {
    const map = {
      "panel-right-open": "ri-layout-right-line",
      bug: "ri-bug-line",
      search: "ri-search-line",
      copy: "ri-file-copy-line",
      "trash-2": "ri-delete-bin-6-line",
      minus: "ri-subtract-line",
      expand: "ri-fullscreen-line",
      shrink: "ri-fullscreen-exit-line",
      settings: "ri-settings-3-line",
      upload: "ri-upload-2-line",
      "rotate-ccw": "ri-reset-left-line",
      x: "ri-close-line",
      terminal: "ri-terminal-box-line",
      moon: "ri-moon-line",
      puzzle: "ri-puzzle-line",
      "code-2": "ri-code-s-slash-line",
      "file-code-2": "ri-file-code-line",
      "circle-alert": "ri-error-warning-line",
      "triangle-alert": "ri-alert-line",
      "circle-check": "ri-checkbox-circle-line",
      sparkles: "ri-sparkling-line",
      "chevron-down": "ri-arrow-down-s-line",
      "chevron-right": "ri-arrow-right-s-line",
      "badge-dollar-sign": "ri-money-dollar-circle-line",
      "mouse-pointer-click": "ri-cursor-line",
      atom: "ri-atom-line",
      "scan-search": "ri-focus-3-line",
      info: "ri-information-line",
      wifi: "ri-wifi-line",
      link: "ri-link",
      "external-link": "ri-external-link-line",
      "wrap-text": "ri-text-wrap",
    };

    return map[name] || "ri-checkbox-blank-circle-line";
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
    };

    return map[name] || String(name || "?").slice(0, 1).toUpperCase();
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

  /* *************** */
  /* Styles          */
  /* *************** */
  
  /* *************** */
  /* Cipo configure  */
  /* *************** */
  
  CipoApi.setup({
    prefix: 'rod',
    layers: false,
    minify: false,
    rem: { enabled: true, baseFontSize: 16 },
    colorMode: 'oklch',
    theme: {
      colors: { 
        brand: '#f97316', 
        ink: '#f8fafc', 
        panel: '#0f172a',
        border: "rgb(255 255 255 / 0.1)",
        "border-strong": "rgb(255 255 255 / 0.18)",
        text: "#e5e7eb",
        strong: "#ffffff",
        muted: "#9ca3af",
        faint: "#6b7280",
        cyan: "#7dd3fc",
        key: "#8ab4ff" 
      },
      spacing: '0.25rem',
      radius: { md: '12px', xl: '24px' },
      shadow: { panel: '0 24px 80px rgb(0 0 0 / 0.35)' },
      text: { sm: '0.875rem', lg: '1.25rem' },
      z: 9998,
      font: {
        ui: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
        mono: "\"SFMono-Regular\", ui-monospace, Menlo, Monaco, Consolas, monospace"
      }
    },
  }); 
  
  
/*
  CipoApi.registerProperty('minw', { 
    property: 'min-width', 
    scale: 'spacing'
   });
   
  CipoApi.registerProperty('maxw', { 
    property: 'max-width', 
    scale: 'spacing'
   });
*/


/*  CipoApi.registerHelper('mwh', (args, context) => {
    return `0 0 0 3px ${context.resolveValue(`alpha(${args || '$brand'} / 25%)`)}`
  });*/
  
  
  function getShellStyle() {
    const { sheet: { css } } = Cipo
    return css`
      /*
      @import url("https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.css");
      @import url("https://unpkg.com/lucide-static@latest/font/lucide.css");
      */
      
      :host {  
        all: initial;
        color-scheme: dark;
        z-index: var(--ra-z, 9998);
      }

      .ra-root,
      .ra-source-root,
      .ra-log-surface-host {
        --ra-panel: rgb(12 13 15 / var(--ra-opacity, 0.94));
        
        --ra-border: $colors.border;
        --ra-border-strong: rgb(255 255 255 / 0.18);
        --ra-text: $colors.text;
        --ra-strong: $strong;
        --ra-muted: $muted;
        --ra-faint: $faint;
        --ra-cyan: $cyan;
        --ra-key: $key;
        --ra-string:$string;
        
        --ra-radius-md: $radius.md;
        --ra-radius-lg: $radius.lg;
        --ra-radius-pill: $radius.pill;
        
        --ra-font-ui: $font.ui;
        --ra-font-mono: $font.ui;
        --ra-z: $z;
        --ra-shadow: 0 28px 90px rgb(0 0 0 / 0.72);
        --ra-blur: 18px;
        --ra-density-scale: 1;
        --ra-font-size: 12px;
        color: $colors.text;
        font-family: $font.ui;
        -webkit-font-smoothing: antialiased;
      }

      .ra-root *,
      .ra-source-root *,
      .ra-log-surface-host * {
        box-sizing: border-box;
        z-index: $z;
      }

      .ra-root,
      .ra-source-root {
        fixed;
        text(family: $font.ui,lh: 1.4, ls: normal,transform:none);
        inset: 0;
        z-index: $z;
        pointer-events: none;
        
        font-family: $font.ui;
        line-height: 1.4;
        letter-spacing: normal;
        text-transform: none;
      }

      .ra-source-root {
        z-index: calc($z + 2);
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
        size(16px)
        minw(16px)
        minh(16px)
        
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
        flex: 0 0 auto;
        color: currentColor;
        stroke: currentColor;
      }

      .ra-dock {
        position: fixed;
        right: 0;
        z-index: var(--ra-z);
        width: 42px;
        pointer-events: auto;
        border: 1px solid var(--ra-border-strong);
        border-right: 0;
        border-radius: 14px 0 0 14px;
        background: linear-gradient(180deg, rgb(24 25 28 / 0.88), rgb(9 10 12 / 0.88));
        box-shadow: var(--ra-shadow);
        backdrop-filter: blur(var(--ra-blur));
        -webkit-backdrop-filter: blur(var(--ra-blur));
        touch-action: none;
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
      .ra-modal-close,
      .ra-source-actions button {
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
      .ra-pill,
      .ra-source-actions button {
        min-height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 10px;
        white-space: nowrap;
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
        border-right: 2px solid rgb(255 255 255 / .32);
        border-bottom: 2px solid rgb(255 255 255 / .32);
        border-radius: 0 0 4px 0;
      }

      .ra-zen .ra-resize {
        display: none;
      }

      .ra-modal-root,
      .ra-source-backdrop {
        position: fixed;
        inset: 0;
        z-index: calc(var(--ra-z) + 1);
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
          radial-gradient(circle at top left, rgb(125 211 252 / 0.12), transparent 32%),
          linear-gradient(180deg, rgb(17 18 23 / 0.98), rgb(6 7 10 / 0.98));
        box-shadow: 0 32px 120px rgb(0 0 0 / 0.78);
      }

      .ra-modal-glow {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(135deg, rgb(125 211 252 / 0.08), transparent 40%);
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

      .ra-modal-close {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        padding: 0;
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

      .ra-modal-primary {
        color: #061014;
        background: linear-gradient(180deg, #7dd3fc, #38bdf8);
        border-color: rgb(125 211 252 / 0.6);
      }

      .ra-modal-secondary {
        background: rgb(255 255 255 / 0.06);
      }

      .ra-source-backdrop {
        z-index: calc(var(--ra-z) + 4);
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
          radial-gradient(circle at top left, rgb(125 211 252 / 0.12), transparent 30%),
          linear-gradient(180deg, rgb(13 14 18 / .98), rgb(5 6 8 / .98));
        box-shadow: 0 32px 120px rgb(0 0 0 / .78);
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
        background: rgb(0 0 0 / .35);
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
          inset: max(72px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
          width: auto;
          height: auto;
        }

        .ra-panel.ra-zen {
          inset: 0 !important;
        }

        .ra-button {
          width: 34px;
          padding: 0;
        }

        .ra-button span {
          display: none;
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
    `.cssText;
  }
})();
