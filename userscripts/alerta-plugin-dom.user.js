// ==UserScript==
// @name         ⛱️ 003 / Alerta / Elements Plugin
// @namespace    https://rod.dev/userscripts
// @version      0.0.1
// @description  Lit-only Elements plugin for Alerta Docked Inspector with DOM tree, picker, source preview, box model, editable styles, persisted settings, and debug logs.
// @author       Rod
// @match        *://*/*
// @run-at       document-idle
// @weight       997
// @updateURL    https://github.com/rodkisten/rodkisten.github.io/raw/refs/heads/master/userscripts/alerta-plugin-dom.user.js
// @downloadURL  https://github.com/rodkisten/rodkisten.github.io/raw/refs/heads/master/userscripts/alerta-plugin-dom.user.js
// @grant        none
// @noframes
// ==/UserScript==

(async function RodDockedInspectorElementsPlugin() {
  "use strict";

  /************/
  /* Constants */
  /************/

  const GLOBAL_NAME = "RodDockedInspector";
  const PLUGIN_ID = "elements";
  const STORAGE_KEY = "rod.docked.inspector.elements.plugin.v0.0.1";
  const STYLE_ID = "rod-docked-inspector-elements-plugin-style-v0-0-1";
  const READY_TIMEOUT_MS = 15_000;
  const READY_INTERVAL_MS = 80;
  const LONG_PRESS_MS = 180;
  const FLASH_MS = 1_600;
  const DEFAULT_VISIBLE_CHILDREN = 80;
  const CHILDREN_STEP = 80;
  const MAX_CHILDREN_PER_NODE = 260;
  const MAX_RENDER_DEPTH = 18;
  const MAX_ATTRS_PER_NODE = 1000;
  const MAX_ATTR_VALUE_LENGTH = 1000;
  const MAX_TEXT_LENGTH = 220;
  const AUTO_PRETTY_THRESHOLD = 90_000;
  const EXTERNAL_SOURCE_PRETTY_THRESHOLD = 160_000;
  const MENU_WIDTH = 196;
  const MENU_ITEM_HEIGHT = 32;
  const MENU_PADDING = 6;
  const EDGE_GAP = 8;

  /** @typedef {"text" | "number" | "checkbox" | "select" | "textarea" | "color"} EditableFieldType */

  /**
   * @typedef {Object} EditableDomField
   * @property {keyof HTMLElement | "className" | "innerText" | "textContent"} key
   * @property {string} label
   * @property {EditableFieldType} type
   * @property {readonly string[]=} options
   */

  /** @type {readonly (keyof CSSStyleDeclaration)[]} */
  const EDITABLE_STYLE_PROPERTIES = [
    "display",
    "visibility",
    "position",
    "inset",
    "top",
    "right",
    "bottom",
    "left",
    "zIndex",

    "boxSizing",
    "width",
    "height",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
    "aspectRatio",

    "margin",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",

    "border",
    "borderWidth",
    "borderStyle",
    "borderColor",
    "borderRadius",
    "outline",
    "outlineWidth",
    "outlineStyle",
    "outlineColor",
    "outlineOffset",

    "background",
    "backgroundColor",
    "backgroundImage",
    "backgroundSize",
    "backgroundPosition",
    "backgroundRepeat",
    "color",
    "accentColor",

    "font",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "lineHeight",
    "letterSpacing",
    "wordSpacing",
    "textAlign",
    "textDecoration",
    "textTransform",
    "whiteSpace",

    "opacity",
    "boxShadow",
    "textShadow",
    "filter",
    "backdropFilter",

    "transform",
    "transformOrigin",
    "translate",
    "scale",
    "rotate",

    "overflow",
    "overflowX",
    "overflowY",
    "overscrollBehavior",
    "resize",

    "cursor",
    "pointerEvents",
    "userSelect",
    "touchAction",

    "flex",
    "flexDirection",
    "flexWrap",
    "alignItems",
    "alignContent",
    "justifyContent",
    "justifyItems",
    "gap",
    "rowGap",
    "columnGap",
    "order",
    "flexGrow",
    "flexShrink",
    "flexBasis",
    "alignSelf",

    "grid",
    "gridTemplateColumns",
    "gridTemplateRows",
    "gridTemplateAreas",
    "gridColumn",
    "gridRow",
    "placeItems",
    "placeContent",
    "placeSelf",

    "transition",
    "transitionProperty",
    "transitionDuration",
    "transitionTimingFunction",
    "animation",
    "animationName",
    "animationDuration",
    "animationTimingFunction",

    "clipPath",
    "objectFit",
    "objectPosition",
    "mixBlendMode",
    "isolation",

    "scrollBehavior",
    "scrollMargin",
    "scrollPadding",
  ];

  /** @type {readonly EditableDomField[]} */
  const EDITABLE_DOM_FIELDS = [
    { key: "id", label: "id", type: "text" },
    { key: "className", label: "class", type: "text" },
    { key: "title", label: "title", type: "text" },
    { key: "lang", label: "lang", type: "text" },

    { key: "hidden", label: "hidden", type: "checkbox" },
    { key: "draggable", label: "draggable", type: "checkbox" },
    { key: "spellcheck", label: "spellcheck", type: "checkbox" },

    {
      key: "contentEditable",
      label: "contentEditable",
      type: "select",
      options: ["inherit", "true", "false", "plaintext-only"],
    },
    {
      key: "dir",
      label: "dir",
      type: "select",
      options: ["", "auto", "ltr", "rtl"],
    },
    {
      key: "inputMode",
      label: "inputMode",
      type: "select",
      options: ["", "none", "text", "decimal", "numeric", "tel", "search", "email", "url"],
    },
    {
      key: "translate",
      label: "translate",
      type: "select",
      options: ["", "yes", "no"],
    },

    { key: "tabIndex", label: "tabIndex", type: "number" },
    { key: "accessKey", label: "accessKey", type: "text" },

    { key: "innerText", label: "innerText", type: "textarea" },
    { key: "textContent", label: "textContent", type: "textarea" },
  ];

  /***********/
  /* Runtime */
  /***********/

  let apiRef = null;
  let html = createFallbackHtml();
  let state = readPluginState();
  let longPressTimer = 0;
  let pickerActive = false;
  let hoveredElement = null;
  let renderCount = 0;

  const nodeRefs = new WeakMap();
  const nodePathCache = new WeakMap();

  /********/
  /* Boot */
  /********/

  debug("boot:start", "Waiting for inspector global", { globalName: GLOBAL_NAME });

  const inspector = await whenGlobalReady(GLOBAL_NAME).catch((error) => {
    console.warn("[Elements Plugin] Inspector was not ready.", error);
    return null;
  });

  if (!inspector?.registerPlugin) {
    console.warn("[Elements Plugin] RodDockedInspector.registerPlugin was not found.");
    return;
  }

  inspector.registerPlugin({
    id: PLUGIN_ID,
    title: "Elements",
    icon: "square-mouse-pointer",
    order: 10,
    setup,
    teardown,
    render,
    clear,
    copy,
    getCount,
  });

  debug("boot:registered", "Elements plugin registered", { version: "2.7.0" });

  /***********/
  /* Helpers */
  /***********/

  /**
   * Creates a tiny fallback template tag for defensive rendering.
   *
   * @returns {(strings: TemplateStringsArray, ...values: unknown[]) => string} Template function.
   */
  function createFallbackHtml() {
    return function fallbackHtml(strings, ...values) {
      let output = "";

      for (let index = 0; index < strings.length; index += 1) {
        output += strings[index];
        if (index < values.length) output += String(values[index] ?? "");
      }

      return output;
    };
  }

  /**
   * Logs plugin diagnostics when shell debug is enabled.
   *
   * @param {string} event Event label.
   * @param {string} message Human-friendly message.
   * @param {Record<string, unknown>} [payload] Optional payload.
   * @returns {void}
   */
  function debug(event, message, payload = {}) {
    const enabled = true || Boolean(apiRef?.state?.debugLogs || apiRef?.settings?.get?.("core", "debugLogs", false));

    if (!enabled && event !== "boot:start" && event !== "boot:registered") return;

    const logger = apiRef?.nativeConsole || console;
    const method = event.includes("error") || event.includes("failed") ? "warn" : "debug";

    logger[method]?.(
      `%c[⛱️ Alerta:Elements]%c ${event} %c${message}`,
      "background-color:$ff9900;font-weight:900",
      "color:#a78bfa;font-weight:900",
      "color:inherit",
      payload,
    );
  }

  /**
   * Waits until a window global is ready.
   *
   * @param {string} name Global name.
   * @returns {Promise<unknown>} Resolved global.
   */
  function whenGlobalReady(name) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const intervalId = setInterval(() => {
        const value = window[name];

        if (value) {
          clearInterval(intervalId);
          resolve(value);
          return;
        }

        if (Date.now() - startedAt >= READY_TIMEOUT_MS) {
          clearInterval(intervalId);
          reject(new Error(`${name} was not found after ${READY_TIMEOUT_MS}ms`));
        }
      }, READY_INTERVAL_MS);
    });
  }

  /**
   * Reads persisted plugin state.
   *
   * @returns {object} Plugin state.
   */
  function readPluginState() {
    const fallback = {
      expanded: ["html", "html.0", "html.1"],
      visibleLimits: {},
      selectedPath: "html",
      selectedRefId: null,
      selectedPanel: "styles",
      showTextNodes: true,
      wrap: true,
      showInlineSource: true,
      menu: null,
      persistedStyles: {},
      persistedDomFields: {},
    };

    try {
      return {
        ...fallback,
        ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
        menu: null,
      };
    } catch (error) {
      console.warn("[Elements Plugin] Failed to read persisted state.", error);
      return fallback;
    }
  }

  /**
   * Updates local plugin state, persists it, and asks the shell to render.
   *
   * @param {Partial<object>} patch Partial state.
   * @param {string} [reason="state:update"] Debug reason.
   * @returns {void}
   */
  function setState(patch, reason = "state:update") {
    state = {
      ...state,
      ...patch,
    };

    debug(reason, "State patch applied", patch);
    savePluginState();
    scheduleRender();
  }

  /**
   * Persists stable plugin state.
   *
   * @returns {void}
   */
  function savePluginState() {
    const payload = {
      ...state,
      menu: null,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      debug("state:persisted", "Plugin state persisted", {
        expanded: payload.expanded.length,
        selectedPath: payload.selectedPath,
      });
    } catch (error) {
      debug("state:persist-failed", "Could not persist plugin state", { error });
    }
  }

  /**
   * Requests a shell render without owning the shell rendering pipeline.
   *
   * @returns {void}
   */
  function scheduleRender() {
    apiRef?.scheduleRender?.();
  }

  /**
   * Stores a value in the host object store.
   *
   * @param {unknown} value Value.
   * @returns {number|string|null} Ref id.
   */
  function store(value) {
    return apiRef?.objectStore?.set?.(value) ?? null;
  }

  /**
   * Reads a value from the host object store.
   *
   * @param {string|number|null} id Ref id.
   * @returns {unknown} Stored value.
   */
  function read(id) {
    if (id == null) return null;
    return apiRef?.objectStore?.get?.(Number(id)) ?? apiRef?.objectStore?.get?.(id) ?? null;
  }

  /**
   * Gets a stable ref id for a node.
   *
   * @param {Node} node DOM node.
   * @returns {number|string|null} Ref id.
   */
  function getNodeRefId(node) {
    if (nodeRefs.has(node)) return nodeRefs.get(node);

    const refId = store(node);
    nodeRefs.set(node, refId);

    return refId;
  }

  /**
   * Escapes HTML for safe fallback text fragments.
   *
   * @param {unknown} value Raw value.
   * @returns {string} Escaped string.
   */
  function escapeHtml(value) {
    const formatter = apiRef?.format?.escapeHtml || apiRef?.escapeHtml;
    if (typeof formatter === "function") return formatter(value);

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /**
   * Trims long text.
   *
   * @param {unknown} value Input.
   * @param {number} limit Max length.
   * @returns {string} Trimmed text.
   */
  function trimText(value, limit) {
    const text = String(value ?? "");
    return text.length > limit ? `${text.slice(0, limit)}...` : text;
  }

  /**
   * Checks whether a node belongs to the inspector itself.
   *
   * @param {Node|null} node DOM node.
   * @returns {boolean} True when inspector-owned.
   */
  function isInspectorNode(node) {
    if (!node) return false;

    const host = document.querySelector("[data-alerta-host='true']") || document.getElementById("__rod_alerta_onefile_host__") || document.getElementById(ROOT_ID);
    return Boolean(host?.contains?.(node));
  }

  /**
   * Checks whether a node should be hidden from the tree.
   *
   * @param {Node} node DOM node.
   * @returns {boolean} True when hidden.
   */
  function shouldSkipNode(node) {
    if (isInspectorNode(node)) return true;
    if (node.nodeType === Node.COMMENT_NODE) return true;

    if (node.nodeType === Node.TEXT_NODE) {
      return !state.showTextNodes || !node.textContent?.trim();
    }

    return false;
  }

  /**
   * Copies text with clipboard fallback.
   *
   * @param {string} value Text.
   * @returns {void}
   */
  function copyText(value) {
    const text = String(value ?? "");

    debug("clipboard:copy", "Copy requested", { length: text.length });

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyText(text));
      return;
    }

    fallbackCopyText(text);
  }

  /**
   * Copies text through a temporary textarea.
   *
   * @param {string} text Text.
   * @returns {void}
   */
  function fallbackCopyText(text) {
    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
    document.documentElement.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  /**************/
  /* Formatting */
  /**************/

  /**
   * Formats a compact element tag.
   *
   * @param {Element} element Element.
   * @returns {string} Compact tag.
   */
  function formatCompactTag(element) {
    const tagName = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const className =
      typeof element.className === "string" && element.className.trim()
        ? `.${element.className.trim().split(/\s+/).slice(0, 4).join(".")}`
        : "";

    return `<${tagName}${id}${className}>`;
  }

  /**
   * Gets element source language.
   *
   * @param {Element} element Element.
   * @returns {"xml"|"css"|"javascript"} Source language.
   */
  function getElementLanguage(element) {
    if (element instanceof HTMLStyleElement || element.tagName.toLowerCase() === "link") return "css";
    if (element instanceof HTMLScriptElement) return "javascript";
    return "xml";
  }

  /**
   * Gets element source.
   *
   * @param {Element} element Element.
   * @returns {string} Source.
   */
  function getElementSource(element) {
    if (element instanceof HTMLStyleElement) return element.textContent || "";
    if (element instanceof HTMLScriptElement) return element.textContent || "";
    return element.outerHTML || "";
  }

  /**
   * Gets href/src URL from an element.
   *
   * @param {Element} element Element.
   * @returns {string} URL.
   */
  function getElementUrl(element) {
    return element.getAttribute("href") || element.getAttribute("src") || "";
  }

  /**
   * Checks whether element has external source.
   *
   * @param {Element} element Element.
   * @returns {boolean} True when external.
   */
  function hasExternalSource(element) {
    const url = getElementUrl(element);
    return Boolean(url && /^(https?:)?\/\//i.test(url));
  }

  /**
   * Resolves URL against current page.
   *
   * @param {Element} element Element.
   * @returns {string} Absolute URL.
   */
  function getAbsoluteResourceUrl(element) {
    const url = getElementUrl(element);
    if (!url) return "";

    try {
      return new URL(url, location.href).href;
    } catch {
      return url;
    }
  }

  /**
   * Pretty-formats source when safe.
   *
   * @param {string} source Source.
   * @param {string} language Language.
   * @returns {Promise<string>|string} Pretty source.
   */
  function prettySource(source, language, highlightCode = false) {
    if (source.length > AUTO_PRETTY_THRESHOLD) return String(source).trim();
    let content = source

    if (apiRef.prettySource) {
      debug("Alerta:Elements:prettySource", "trying to run pretty source from the main API")
      apiRef.prettySource(content, language, true).then((highlited => (content = highlited)))

      return content;
    }

    // if (apiRef?.format?.formatCss && language === "css") {
    //   content = apiRef.format.formatCss(source, highlightCode);
    // }
    // if (apiRef?.format?.formatHtml && language === "xml") {
    //   content = apiRef.format.formatHtml(source, highlightCode);
    // }

    if (apiRef?.format?.formatCss && apiRef?.format?.formatHtml) {
      if (language === "css") {
        content = apiRef.format.formatCss(source, highlightCode);
      } else if (language === "xml") {
        content = apiRef.format.formatHtml(source, highlightCode);
      }

      return highlightCode ? window?.hljs(content, language) : content;
    }  

    
    if (window.prettier && window.prettierPlugins) {
      try {
        const parser = language === "css" ? "css" : language === "javascript" ? "babel" : "html";
        content = window.prettier.format(source, { parser, plugins: window.prettierPlugins });

        return highlightCode ? window?.hljs(content, language) : content;
      } catch (error) {
        debug("source:prettier-failed", "Prettier failed; using fallback formatter", { error });
      }
    }

    if (language === "css") {
      content = source
        .replace(/\s*{\s*/g, " {\n  ")
        .replace(/;\s*/g, ";\n  ")
        .replace(/\s*}\s*/g, "\n}\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    if (language === "xml") {
      content = source
        .replace(/>\s+</g, "><")
        .replace(/</g, "\n<")
        .replace(/>/g, ">\n")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");
    }

    return content.trim();
  }

  /*************/
  /* DOM paths */
  /*************/

  /**
   * Gets renderable children.
   *
   * @param {Node} node Parent.
   * @returns {Node[]} Children.
   */
  function getRenderableChildren(node) {
    const output = [];
    const children = node.childNodes;

    for (let index = 0; index < children.length && output.length < MAX_CHILDREN_PER_NODE; index += 1) {
      const child = children[index];
      if (!shouldSkipNode(child)) output.push(child);
    }

    return output;
  }

  /**
   * Gets child path.
   *
   * @param {string} parentPath Parent path.
   * @param {number} index Index.
   * @returns {string} Path.
   */
  function getChildPath(parentPath, index) {
    return `${parentPath}.${index}`;
  }

  /**
   * Gets a path for an element.
   *
   * @param {Element} element Element.
   * @returns {string} Path.
   */
  function getPathForElement(element) {
    if (nodePathCache.has(element)) return nodePathCache.get(element);

    const chain = [];
    let current = element;

    while (current && current !== document.documentElement) {
      const parent = current.parentNode;
      if (!parent) break;

      const siblings = Array.from(parent.childNodes).filter((node) => !shouldSkipNode(node));
      chain.unshift(Math.max(0, siblings.indexOf(current)));
      current = parent instanceof Element ? parent : null;
    }

    const path = ["html", ...chain].join(".");
    nodePathCache.set(element, path);

    return path;
  }

  /**
   * Escapes CSS selector value.
   *
   * @param {string} value Raw value.
   * @returns {string} Escaped value.
   */
  function safeCssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return String(value).replace(/["\\]/g, "\\$&");
  }

  /***********/
  /* Actions */
  /***********/

  /**
   * Reveals an element in tree and opens panel.
   *
   * @param {Element} element Element.
   * @returns {void}
   */
  function revealElementInTree(element) {
    const path = getPathForElement(element);
    const expanded = new Set(state.expanded);
    const parts = path.split(".");

    for (let index = 1; index <= parts.length; index += 1) {
      expanded.add(parts.slice(0, index).join("."));
    }

    debug("tree:reveal", "Revealing element in tree", { path, tag: formatCompactTag(element) });

    setState(
      {
        expanded: Array.from(expanded),
        selectedPath: path,
        selectedRefId: getNodeRefId(element),
      },
      "tree:reveal-state",
    );

    apiRef?.setTab?.(PLUGIN_ID);
    apiRef?.open?.();

    requestAnimationFrame(() => {
      getPluginRoot()
        ?.querySelector(`[data-elements-path="${safeCssEscape(path)}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    });
  }

  /**
   * Toggles path open/closed.
   *
   * @param {string} path Path.
   * @returns {void}
   */
  function togglePath(path) {
    const expanded = new Set(state.expanded);
    const wasOpen = expanded.has(path);

    if (wasOpen) expanded.delete(path);
    else expanded.add(path);

    debug("tree:toggle", wasOpen ? "Collapsed node" : "Expanded node", { path });
    setState({ expanded: Array.from(expanded) }, "tree:toggle-state");
  }

  /**
   * Selects a node.
   *
   * @param {string} path Path.
   * @param {Element} element Element.
   * @returns {void}
   */
  function selectPath(path, element) {
    window.$0 = element;

    debug("tree:select", "Selected element and assigned window.$0", { path, tag: formatCompactTag(element) });

    setState(
      {
        selectedPath: path,
        selectedRefId: getNodeRefId(element),
      },
      "tree:select-state",
    );
  }

  /**
   * Loads more children for a node.
   *
   * @param {string} path Path.
   * @returns {void}
   */
  function loadMoreChildren(path) {
    const previous = state.visibleLimits[path] || DEFAULT_VISIBLE_CHILDREN;
    const next = previous + CHILDREN_STEP;

    debug("tree:load-more", "Increasing visible children", { path, previous, next });

    setState(
      {
        visibleLimits: {
          ...state.visibleLimits,
          [path]: next,
        },
      },
      "tree:load-more-state",
    );
  }

  /**
   * Opens local source using host modal.
   *
   * @param {Element} element Element.
   * @returns {void}
   */
  async function openSource(element) {
    const rawSource = getElementSource(element);
    const language = getElementLanguage(element);
    const formatted = rawSource.length <= AUTO_PRETTY_THRESHOLD ? await prettySource(rawSource, language) : rawSource;

    const payload = {
      title: formatCompactTag(element),
      source: formatted,
      language,
      refId: getNodeRefId(element),
    };

    debug("source:open-local", "Opening local source", {
      tag: formatCompactTag(element),
      language,
      length: rawSource.length,
      payload, 
    });



    apiRef?.modal?.openSource?.(payload);
  }

  /**
   * Opens external source preview using host modal.
   *
   * @param {Element} element Element.
   * @returns {Promise<void>} Fetch task.
   */
  async function openExternalSource(element) {
    const url = getAbsoluteResourceUrl(element);
    const language = getElementLanguage(element);

    debug("source:fetch-start", "Fetching external source", { url, language });

    apiRef?.modal?.openSource?.({
      title: `Loading ${url}`,
      source: `Loading external resource...\n\n${url}`,
      language: "text",
      refId: getNodeRefId(element),
    });

    try {
      const response = await fetch(url, {
        // credentials: "include",
        cache: "force-cache",
      });

      const source = await response.text();
      const finalSource = source.length <= EXTERNAL_SOURCE_PRETTY_THRESHOLD ? await prettySource(source, language) : source;

      debug("source:fetch-ok", "External source loaded", {
        url,
        status: response.status,
        length: source.length,
        response: source.substring(0, 100)
      });

      apiRef?.modal?.openSource?.({
        title: `${response.status} ${url}`,
        source: finalSource,
        language,
        refId: getNodeRefId(element),
      });
    } catch (error) {
      debug("source:fetch-failed", "External source fetch failed", { url, error });

      apiRef?.modal?.openSource?.({
        title: `Failed to fetch ${url}`,
        source: `${error?.name || "Error"}: ${error?.message || String(error)}\n\nURL: ${url}`,
        language: "text",
        refId: getNodeRefId(element),
      });
    }
  }

  /**
   * Focuses and flashes element.
   *
   * @param {Element} element Element.
   * @returns {void}
   */
  function focusElement(element) {
    window.$0 = element;
    apiRef?.minimize?.();

    debug("element:focus", "Focusing element", { tag: formatCompactTag(element) });

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });

    const previousOutline = element.style.outline;
    const previousOutlineOffset = element.style.outlineOffset;
    const previousTransition = element.style.transition;

    element.style.transition = "outline 140ms ease, outline-offset 140ms ease";
    element.style.outline = "4px solid rgba(125, 211, 252, .96)";
    element.style.outlineOffset = "5px";

    setTimeout(() => {
      element.style.outline = previousOutline;
      element.style.outlineOffset = previousOutlineOffset;
      element.style.transition = previousTransition;
    }, FLASH_MS);
  }

  /**
   * Runs menu action.
   *
   * @param {string} action Action.
   * @param {Element} element Element.
   * @returns {void}
   */
  function runElementAction(action, element) {
    debug("menu:action", "Running element action", { action, tag: formatCompactTag(element) });

    if (action === "focus") focusElement(element);
    if (action === "source") openSource(element);
    if (action === "external-source") openExternalSource(element);
    if (action === "dollar") window.$0 = element;
    if (action === "copy-outer") copyText(element.outerHTML);
    if (action === "copy-inner") copyText(element.innerHTML);
    if (action === "copy-text") copyText(element.textContent || "");

    if (action === "delete") {
      element.remove();
      closeMenu();
      scheduleRender();
      return;
    }

    if (action === "open-url") {
      const url = getAbsoluteResourceUrl(element);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }

    closeMenu();
  }

  /***********/
  /* Editing */
  /***********/

  /**
   * Gets stable storage key for element edits.
   *
   * @param {Element} element Element.
   * @returns {string} Storage key.
   */
  function getElementStorageKey(element) {
    const path = getPathForElement(element);
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const classes =
      typeof element.className === "string" && element.className.trim()
        ? `.${element.className.trim().split(/\s+/).join(".")}`
        : "";

    return `${location.href}::${path}::${tag}${id}${classes}`;
  }

  /**
   * Applies persisted styles to element.
   *
   * @param {Element} element Element.
   * @returns {void}
   */
  function applyPersistedStyles(element) {
    const styles = state.persistedStyles?.[getElementStorageKey(element)];
    if (!styles) return;

    for (const [property, value] of Object.entries(styles)) {
      element.style[property] = String(value ?? "");
    }
  }

  /**
   * Applies persisted DOM fields.
   *
   * @param {Element} element Element.
   * @returns {void}
   */
  function applyPersistedDomFields(element) {
    const fields = state.persistedDomFields?.[getElementStorageKey(element)];
    if (!fields) return;

    for (const [field, value] of Object.entries(fields)) {
      try {
        element[field] = value;
      } catch (error) {
        debug("dom-field:apply-failed", "Persisted DOM field failed", { field, error });
      }
    }
  }

  /**
   * Updates and persists style property.
   *
   * @param {Element} element Element.
   * @param {string} property Property.
   * @param {string} value Value.
   * @returns {void}
   */
  function updateStyleProperty(element, property, value) {
    const key = getElementStorageKey(element);
    const all = { ...state.persistedStyles };
    const current = { ...(all[key] || {}) };

    current[property] = value;
    all[key] = current;
    element.style[property] = value;

    debug("style:update", "Updated inline style property", { property, value, tag: formatCompactTag(element) });
    setState({ persistedStyles: all }, "style:update-state");
  }

  /**
   * Updates and persists DOM field.
   *
   * @param {Element} element Element.
   * @param {string} field Field.
   * @param {unknown} value Value.
   * @returns {void}
   */
  function updateDomField(element, field, value) {
    const key = getElementStorageKey(element);
    const all = { ...state.persistedDomFields };
    const current = { ...(all[key] || {}) };

    current[field] = value;
    all[key] = current;

    try {
      element[field] = value;
    } catch (error) {
      debug("dom-field:update-failed", "DOM field update failed", { field, value, error });
    }

    debug("dom-field:update", "Updated DOM field", { field, value, tag: formatCompactTag(element) });
    setState({ persistedDomFields: all }, "dom-field:update-state");
  }

  /**
   * Gets element box model.
   *
   * @param {Element} element Element.
   * @returns {object} Box model.
   */
  function getBoxModel(element) {
    const rect = element.getBoundingClientRect();
    const styles = getComputedStyle(element);

    return {
      size: `${Math.round(rect.width)} x ${Math.round(rect.height)}`,
      margin: [styles.marginTop, styles.marginRight, styles.marginBottom, styles.marginLeft],
      border: [styles.borderTopWidth, styles.borderRightWidth, styles.borderBottomWidth, styles.borderLeftWidth],
      padding: [styles.paddingTop, styles.paddingRight, styles.paddingBottom, styles.paddingLeft],
    };
  }

  /**********/
  /* Picker */
  /**********/

  /**
   * Starts picker mode.
   *
   * @returns {void}
   */
  function startPicker() {
    if (pickerActive) return;

    pickerActive = true;
    debug("picker:start", "Picker mode started");
    document.addEventListener("pointermove", handlePickerMove, true);
    document.addEventListener("click", handlePickerClick, true);
    apiRef?.minimize?.();
  }

  /**
   * Stops picker mode.
   *
   * @returns {void}
   */
  function stopPicker() {
    if (!pickerActive) return;

    pickerActive = false;
    debug("picker:stop", "Picker mode stopped");
    clearHover();
    document.removeEventListener("pointermove", handlePickerMove, true);
    document.removeEventListener("click", handlePickerClick, true);
  }

  /**
   * Handles picker hover.
   *
   * @param {PointerEvent} event Event.
   * @returns {void}
   */
  function handlePickerMove(event) {
    const target = event.target;

    if (!(target instanceof Element) || isInspectorNode(target)) return;
    if (hoveredElement === target) return;

    clearHover();

    hoveredElement = target;
    hoveredElement.__rodPreviousOutline = hoveredElement.style.outline;
    hoveredElement.__rodPreviousOutlineOffset = hoveredElement.style.outlineOffset;
    hoveredElement.style.outline = "3px solid rgba(251, 146, 60, .96)";
    hoveredElement.style.outlineOffset = "4px";
  }

  /**
   * Handles picker click.
   *
   * @param {MouseEvent} event Event.
   * @returns {void}
   */
  function handlePickerClick(event) {
    const target = event.target;

    if (!(target instanceof Element) || isInspectorNode(target)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    debug("picker:select", "Picker selected element", { tag: formatCompactTag(target) });
    stopPicker();
    revealElementInTree(target);
  }

  /**
   * Clears picker hover styles.
   *
   * @returns {void}
   */
  function clearHover() {
    if (!hoveredElement) return;

    hoveredElement.style.outline = hoveredElement.__rodPreviousOutline || "";
    hoveredElement.style.outlineOffset = hoveredElement.__rodPreviousOutlineOffset || "";
    hoveredElement = null;
  }

  /********/
  /* Menu */
  /********/

  /**
   * Gets safe menu position.
   *
   * @param {PointerEvent|MouseEvent} event Event.
   * @param {number} itemCount Item count.
   * @returns {{x: number, y: number}} Position.
   */
  function getSafeMenuPosition(event, itemCount) {
    const height = itemCount * MENU_ITEM_HEIGHT + MENU_PADDING * 2;

    return {
      x: Math.max(EDGE_GAP, Math.min(event.clientX + 5, window.innerWidth - MENU_WIDTH - EDGE_GAP)),
      y: Math.max(EDGE_GAP, Math.min(event.clientY + 5, window.innerHeight - height - EDGE_GAP)),
    };
  }

  /**
   * Opens context menu.
   *
   * @param {PointerEvent|MouseEvent} event Event.
   * @param {Element} element Element.
   * @returns {void}
   */
  function openMenu(event, element) {
    const itemCount = hasExternalSource(element) ? 9 : getElementUrl(element) ? 8 : 7;
    const position = getSafeMenuPosition(event, itemCount);

    debug("menu:open", "Opening element action menu", {
      tag: formatCompactTag(element),
      x: position.x,
      y: position.y,
    });

    setState(
      {
        menu: {
          x: position.x,
          y: position.y,
          refId: getNodeRefId(element),
        },
      },
      "menu:open-state",
    );
  }

  /**
   * Closes menu.
   *
   * @returns {void}
   */
  function closeMenu() {
    if (!state.menu) return;
    setState({ menu: null }, "menu:close-state");
  }

  /*********/
  /* Views */
  /*********/

  /**
   * Renders the plugin body through the shell Lit renderer.
   *
   * @param {object} api Host API.
   * @returns {unknown} Template result.
   */
  function render(api) {
    apiRef = api;
    html = typeof api.html === "function" ? api.html : html;
    renderCount += 1;

    debug("render", "Rendering Elements plugin", {
      renderCount,
      selectedPath: state.selectedPath,
      expanded: state.expanded.length,
    });

    return html`
      <section class="ra-elements-plugin ${state.wrap ? "ra-wrap" : ""}" @pointerdown=${handleShellPointerDown}>
        ${renderToolbar()}
        <div class="ra-elements-layout">
          <div class="ra-elements-tree">
            ${renderTreeNode(document.documentElement, "html", 0)}
          </div>
          ${renderSelectedPanel()}
        </div>
        ${renderContextMenu()}
      </section>
    `;
  }

  /**
   * Handles plugin shell pointerdown for menu cleanup.
   *
   * @param {PointerEvent} event Event.
   * @returns {void}
   */
  function handleShellPointerDown(event) {
    const target = event.target;
    if (target instanceof Element && !target.closest(".ra-elements-menu")) closeMenu();
  }

  /**
   * Renders toolbar actions.
   *
   * @returns {unknown} Template result.
   */
  function renderToolbar() {
    return html`
      <nav class="ra-elements-toolbar" aria-label="Elements tools">
        <button type="button" @click=${() => scheduleRender()}>${iconNode("refresh")}Refresh</button>
        <button type="button" @click=${startPicker}>${iconNode("picker")}Pick</button>
        <button type="button" @click=${() => setState({ wrap: !state.wrap }, "toolbar:wrap")}>${iconNode("wrap")}${state.wrap ? "Wrap on" : "Wrap off"}</button>
        <button type="button" @click=${() => setState({ showTextNodes: !state.showTextNodes }, "toolbar:text-nodes")}>${iconNode("text")}Text</button>
        <button type="button" @click=${() => setState({ showInlineSource: !state.showInlineSource }, "toolbar:inline-source")}>${iconNode("code")}Inline</button>
        <button type="button" @click=${() => setState({ expanded: ["html"], visibleLimits: {} }, "toolbar:collapse")}>${iconNode("fold")}Collapse</button>
      </nav>
    `;
  }

  /**
   * Renders a small icon via host icon fallback.
   *
   * @param {string} name Icon name.
   * @returns {unknown} Template result.
   */
  function iconNode(name) {
    const map = {
      refresh: "trace",
      picker: "inspect",
      wrap: "terminal",
      text: "info",
      code: "box",
      fold: "minus",
      down: "down",
      right: "right",
      plus: "hash",
      source: "box",
      fetch: "copy",
      focus: "focus",
      dollar: "hash",
      copy: "copy",
      link: "inspect",
      trash: "trash",
    };

    if (typeof apiRef?.icon === "function") return html`${apiRef.icon(map[name] || name)}`;
    return html`<span class="ra-icon-fallback" aria-hidden="true">${escapeHtml(name.slice(0, 1).toUpperCase())}</span>`;
  }



  /**
   * Renders attributes for an element.
   *
   * @param {Element} element Element.
   * @returns {unknown[]} Template results.
   */
  function renderAttributes(element) {
    return Array.from(element.attributes)
      .slice(0, MAX_ATTRS_PER_NODE)
      .map(
        (attr) => html`
          <span class="ra-elements-attr">
            <span class="ra-elements-attr-name">${attr.name}</span><span class="ra-elements-equals">=</span><span class="ra-elements-attr-value">"${trimText(attr.value, MAX_ATTR_VALUE_LENGTH)}"</span>
          </span>
        `,
      );
  }

  /**
   * Renders one tree node.
   *
   * @param {Node} node DOM node.
   * @param {string} path Path.
   * @param {number} depth Depth.
   * @returns {unknown|null} Template result.
   */
  function renderTreeNode(node, path, depth) {
    if (shouldSkipNode(node)) return null;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (!text || !state.showTextNodes) return null;

      return html`
        <div class="ra-elements-row ra-elements-text-row" style="--depth:${depth}">
          <span></span>
          <span class="ra-elements-text">"${trimText(text, MAX_TEXT_LENGTH)}"</span>
        </div>
      `;
    }

    if (!(node instanceof Element)) return null;

    applyPersistedStyles(node);
    applyPersistedDomFields(node);

    const refId = getNodeRefId(node);
    const isOpen = state.expanded.includes(path);
    const isSelected = state.selectedPath === path || state.selectedRefId === refId;
    const tagName = node.tagName.toLowerCase();
    const children = isOpen && depth < MAX_RENDER_DEPTH ? getRenderableChildren(node) : [];
    const childCount = isOpen ? children.length : getRenderableChildren(node).length;
    const hasChildren = childCount > 0;
    const visibleLimit = state.visibleLimits[path] || DEFAULT_VISIBLE_CHILDREN;
    const visibleChildren = children.slice(0, visibleLimit);
    const hasMore = children.length > visibleChildren.length;

    return html`
      <div class="ra-elements-node">
        <div
          class="ra-elements-row ${isSelected ? "ra-elements-selected" : ""}"
          style="--depth:${depth}"
          data-elements-ref=${String(refId)}
          data-elements-path=${path}
          @click=${(event) => {
        event.preventDefault();
        event.stopPropagation();
        selectPath(path, node);
      }}
          @dblclick=${(event) => {
        event.preventDefault();
        event.stopPropagation();
        togglePath(path);
      }}
          @pointerdown=${(event) => {
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => openMenu(event, node), LONG_PRESS_MS);
      }}
          @pointermove=${() => clearTimeout(longPressTimer)}
          @pointerup=${() => clearTimeout(longPressTimer)}
          @pointercancel=${() => clearTimeout(longPressTimer)}
        >
          <button
            class="ra-elements-toggle"
            type="button"
            ?disabled=${!hasChildren}
            @click=${(event) => {
        event.preventDefault();
        event.stopPropagation();
        togglePath(path);
      }}
          >
            ${hasChildren ? iconNode(isOpen ? "down" : "right") : null}
          </button>
          <span class="ra-elements-tag">
            <span class="ra-elements-punctuation">&lt;</span><span class="ra-elements-tag-name">${tagName}</span>${renderAttributes(node)}<span class="ra-elements-punctuation">&gt;</span>
          </span>
        </div>
        ${isOpen ? renderInlineSource(node, depth) : null}
        ${isOpen ? visibleChildren.map((child, index) => renderTreeNode(child, getChildPath(path, index), depth + 1)) : null}
        ${isOpen && hasMore
        ? html`
              <button
                class="ra-elements-more"
                type="button"
                style="--depth:${depth + 1}"
                @click=${(event) => {
            event.preventDefault();
            event.stopPropagation();
            loadMoreChildren(path);
          }}
              >
                ${iconNode("plus")} Load ${Math.min(CHILDREN_STEP, children.length - visibleChildren.length)} more
              </button>
            `
        : null}
        ${isOpen
        ? html`
              <div class="ra-elements-row ra-elements-close-row" style="--depth:${depth}">
                <span></span>
                <span class="ra-elements-tag"><span class="ra-elements-punctuation">&lt;/</span><span class="ra-elements-tag-name">${tagName}</span><span class="ra-elements-punctuation">&gt;</span></span>
              </div>
            `
        : null}
      </div>
    `;
  }

  /**
   * Renders inline source preview for style/script nodes.
   *
   * @param {Element} element Element.
   * @param {number} depth Depth.
   * @returns {unknown|null} Template result.
   */
  function renderInlineSource(element, depth) {
    if (!state.showInlineSource) return null;
    if (!(element instanceof HTMLStyleElement) && !(element instanceof HTMLScriptElement)) return null;

    const source = getElementSource(element).trim();
    if (!source) return null;

    return html`
      <div class="ra-elements-source-row" style="--depth:${depth + 1}">
        <pre>${prettySource(source, "javascript", true)}</pre>
        <button type="button" @click=${() => openSource(element)}>${iconNode("source")} source</button>
      </div>
    `;
  }

  /**
   * Renders context menu.
   *
   * @returns {unknown|null} Template result.
   */
  function renderContextMenu() {
    const menu = state.menu;
    if (!menu) return null;

    const element = read(menu.refId);
    if (!(element instanceof Element)) return null;

    const url = getElementUrl(element);
    const external = hasExternalSource(element);


    debug("renderContextMenu", {url, external})

    return html`
      <div class="ra-elements-menu" style="left:${menu.x}px;top:${menu.y}px" @pointerdown=${(event) => event.stopPropagation()}>
        <button type="button" @click=${() => runElementAction("source", element)}>${iconNode("source")} Source</button>
        ${external ? html`<button type="button" @click=${() => runElementAction("external-source", element)}>${iconNode("fetch")} Fetch preview</button>` : null}
        <button type="button" @click=${() => runElementAction("focus", element)}>${iconNode("focus")} Focus</button>
        <button type="button" @click=${() => runElementAction("dollar", element)}>${iconNode("dollar")} Set $0</button>
        <button type="button" @click=${() => runElementAction("copy-outer", element)}>${iconNode("copy")} outerHTML</button>
        <button type="button" @click=${() => runElementAction("copy-inner", element)}>${iconNode("copy")} innerHTML</button>
        <button type="button" @click=${() => runElementAction("copy-text", element)}>${iconNode("copy")} Text</button>
        ${url ? html`<button type="button" @click=${() => runElementAction("open-url", element)}>${iconNode("link")} Open URL</button>` : null}
        <button type="button" class="ra-elements-danger" @click=${() => runElementAction("delete", element)}>${iconNode("trash")} Delete</button>
      </div>
    `;
  }

  /**
   * Gets the selected element.
   *
   * @returns {Element|null} Selected element.
   */
  function getSelectedElement() {
    const value = read(state.selectedRefId);
    return value instanceof Element ? value : null;
  }

  /**
   * Renders selected side panel.
   *
   * @returns {unknown} Template result.
   */
  function renderSelectedPanel() {
    const element = getSelectedElement();

    if (!element) {
      return html`
        <aside class="ra-elements-details">
          <div class="ra-elements-empty-details">Select an element to inspect styles, box model and DOM properties.</div>
        </aside>
      `;
    }

    return html`
      <aside class="ra-elements-details">
        <header class="ra-elements-details-head">
          <strong>${formatCompactTag(element)}</strong>
          <div>
            <button type="button" class=${state.selectedPanel === "styles" ? "active" : ""} @click=${() => setState({ selectedPanel: "styles" }, "panel:styles")}>Styles</button>
            <button type="button" class=${state.selectedPanel === "box" ? "active" : ""} @click=${() => setState({ selectedPanel: "box" }, "panel:box")}>Box</button>
            <button type="button" class=${state.selectedPanel === "props" ? "active" : ""} @click=${() => setState({ selectedPanel: "props" }, "panel:props")}>Props</button>
            <button type="button" class=${state.selectedPanel === "none" ? "active" : ""} @click=${() => setState({ selectedPanel: "none" }, "panel:props")}>
            X
            </button>
          </div>
        </header>
        ${state.selectedPanel === "box" ? renderBoxModel(element) : null}
        ${state.selectedPanel === "props" ? renderDomProperties(element) : null}
        ${state.selectedPanel === "styles" ? renderStyleEditor(element) : null}
      </aside>
    `;
  }

  /**
   * Renders box model.
   *
   * @param {Element} element Element.
   * @returns {unknown} Template result.
   */
  function renderBoxModel(element) {
    const box = getBoxModel(element);

    return html`
      <section class="ra-elements-box">
        <div class="ra-box-layer ra-box-margin">
          <span>margin</span><b>${box.margin[0]}</b>
          <div>
            <b>${box.margin[3]}</b>
            <div class="ra-box-layer ra-box-border">
              <span>border</span><b>${box.border[0]}</b>
              <div>
                <b>${box.border[3]}</b>
                <div class="ra-box-layer ra-box-padding">
                  <span>padding</span><b>${box.padding[0]}</b>
                  <div><b>${box.padding[3]}</b><div class="ra-box-content">${box.size}</div><b>${box.padding[1]}</b></div>
                  <b>${box.padding[2]}</b>
                </div>
                <b>${box.border[1]}</b>
              </div>
              <b>${box.border[2]}</b>
            </div>
            <b>${box.margin[1]}</b>
          </div>
          <b>${box.margin[2]}</b>
        </div>
      </section>
    `;
  }

  /**
   * Renders style editor.
   *
   * @param {Element} element Element.
   * @returns {unknown} Template result.
   */
  function renderStyleEditor(element) {
    const computedStyle = getComputedStyle(element);

    return html`
      <section class="ra-elements-editor">
        ${EDITABLE_STYLE_PROPERTIES.map(
      (property) => html`
            <label class="ra-elements-field">
              <span>${property}</span>
              <input
                type="text"
                .value=${String(element.style[property] || computedStyle[property] || "")}
                @change=${(event) => updateStyleProperty(element, property, event.currentTarget.value)}
              />
            </label>
          `,
    )}
      </section>
    `;
  }

  /**
   * Renders DOM properties editor.
   *
   * @param {Element} element Element.
   * @returns {unknown} Template result.
   */
  function renderDomProperties(element) {
    // @todo check if is not native, because we should ignore them
    // add css vars root
    return html`
      <section class="ra-elements-editor">
        ${EDITABLE_DOM_FIELDS.map(
      (field) => renderDomField(element, field)
    )}
      </section>
    `;
  }

  /**
   * Renders a DOM field editor.
   *
   * @param {Element} element Element.
   * @param {object} field Field metadata.
   * @returns {unknown} Template result.
   */
  function renderDomField(element, field) {
    const value = element[field.key];

    if (field.type === "checkbox") {
      return html`
        <label class="ra-elements-field ra-elements-field-check">
          <span>${field.label}</span>
          <input type="checkbox" .checked=${Boolean(value)} @change=${(event) => updateDomField(element, field.key, event.currentTarget.checked)} />
        </label>
      `;
    }

    if (field.type === "select") {
      return html`
        <label class="ra-elements-field">
          <span>${field.label}</span>
          <select .value=${String(value ?? "")} @change=${(event) => updateDomField(element, field.key, event.currentTarget.value)}>
            ${field.options.map((option) => html`<option value=${option}>${option || "(empty)"}</option>`)}
          </select>
        </label>
      `;
    }

    if (field.type === "textarea") {
      return html`
        <label class="ra-elements-field">
          <span>${field.label}</span>
          <textarea .value=${String(value ?? "")} @change=${(event) => updateDomField(element, field.key, event.currentTarget.value)}></textarea>
        </label>
      `;
    }

    return html`
      <label class="ra-elements-field">
        <span>${field.label}</span>
        <input
          type=${field.type}
          .value=${String(value ?? "")}
          @change=${(event) => {
        const nextValue = field.type === "number" ? Number(event.currentTarget.value) : event.currentTarget.value;
        updateDomField(element, field.key, nextValue);
      }}
        />
      </label>
    `;
  }

  /*********/
  /* Setup */
  /*********/

  /**
   * Sets up plugin styles, settings, and shell integrations.
   *
   * @param {object} api Host API.
   * @returns {void}
   */
  function setup(api) {
    apiRef = api;
    html = typeof api.html === "function" ? api.html : html;

    debug("setup:start", "Installing Elements plugin assets");

    api.addStyle?.(getStyleText(), STYLE_ID);
    api.settings?.register?.(PLUGIN_ID, [
      { key: "showTextNodes", type: "boolean", label: "Show text nodes", defaultValue: state.showTextNodes },
      { key: "wrap", type: "boolean", label: "Wrap long DOM rows", defaultValue: state.wrap },
      { key: "showInlineSource", type: "boolean", label: "Show inline style/script source", defaultValue: state.showInlineSource },
    ]);

    api.on?.("element:selected", handleExternalElementSelected);
    exposeCompatibilityApi();

    debug("setup:done", "Elements plugin setup completed");
  }

  /**
   * Cleans up plugin global listeners.
   *
   * @returns {void}
   */
  function teardown() {
    debug("teardown", "Tearing down Elements plugin");
    stopPicker();
    clearHover();
  }

  /**
   * Handles element selections coming from the shell or other plugins.
   *
   * @param {{element?: Element}} payload Event payload.
   * @returns {void}
   */
  function handleExternalElementSelected(payload) {
    if (!(payload?.element instanceof Element)) return;
    revealElementInTree(payload.element);
  }

  /**
   * Exposes tiny compatibility helpers on the shell API.
   *
   * @returns {void}
   */
  function exposeCompatibilityApi() {
    if (!window[GLOBAL_NAME]) return;

    window[GLOBAL_NAME].revealElementInElementsPanel = revealElementInTree;
    window[GLOBAL_NAME].selectElement = function selectElement(element) {
      if (!(element instanceof Element)) return false;
      revealElementInTree(element);
      return true;
    };
  }

  /**
   * Clears transient plugin state.
   *
   * @returns {void}
   */
  function clear() {
    debug("clear", "Clearing Elements plugin transient state");
    setState({ menu: null, visibleLimits: {}, expanded: ["html"] }, "clear:state");
  }

  /**
   * Copies selected element source.
   *
   * @returns {void}
   */
  function copy() {
    const element = getSelectedElement();
    if (!element) return;
    copyText(element.outerHTML || "");
  }

  /**
   * Returns selected count for shell badges.
   *
   * @returns {number} Count.
   */
  function getCount() {
    return getSelectedElement() ? 1 : 0;
  }

  /**
   * Gets plugin root from composed DOM when available.
   *
   * @returns {Element|null} Plugin root.
   */
  function getPluginRoot() {
    return document.querySelector("[data-alerta-host='true']")?.shadowRoot || document;
  }

  /**********/
  /* Styles */
  /**********/

  function css(input, ...values) {
    return apiRef?.css(input, ...values);
  }

  /**
   * Returns plugin CSS.
   *
   * @returns {string} CSS.
   */
  function getStyleText() {
    return css`
  .ra-elements-plugin {
    height: 100%;
    min-height: 0;
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr;
    --ra-elements-font-size: 12px;
    --ra-elements-line-height: 1.35;
    --ra-elements-indent: 9px;
  }

  .ra-elements-toolbar {
    position: sticky;
    top: 0;
    z-index: 6;
    display: flex;
    gap: 4px;
    padding: 3px 4px;
    border-bottom: 1px solid var(--ra-border, var(--line, rgb(255 255 255 / .11)));
    background: rgb(12 13 15 / .90);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .ra-elements-toolbar button,
  .ra-elements-details button,
  .ra-elements-more,
  .ra-elements-menu button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 1px solid var(--ra-border, var(--line, rgb(255 255 255 / .11)));
    border-radius: 999px;
    background: rgb(255 255 255 / .06);
    color: var(--ra-text, var(--text, #edf0f7));
    font: 750 9px / 1 var(--ra-font-ui, var(--ui, system-ui));
  }

  .ra-elements-toolbar button {
    min-height: 24px;
    padding: 0 8px;
    flex: 0 0 auto;
  }

  .ra-elements-layout {
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .ra-elements-tree {
    min-height: 0;
    padding: 2px 0 40px;
    overflow: auto;
    font: 500 var(--ra-elements-font-size) / var(--ra-elements-line-height) var(--ra-font-mono, var(--mono, ui-monospace, monospace));
    -webkit-user-select: none;
    user-select: none;
    overscroll-behavior: contain;
    contain: content;
    -webkit-overflow-scrolling: touch;
  }

  .ra-elements-row {
    display: grid;
    grid-template-columns: 16px minmax(0, max-content);
    align-items: start;
    gap: 2px;
    min-height: 16px;
    padding: 1px 4px 1px calc(2px + var(--depth, 0) * var(--ra-elements-indent));
    border-radius: 5px;
    color: var(--ra-text, var(--text, #edf0f7));
    white-space: nowrap;
  }

  .ra-elements-plugin.ra-wrap .ra-elements-row,
  .ra-elements-plugin.ra-wrap .ra-elements-tag {
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .ra-elements-row:hover,
  .ra-elements-selected {
    background: rgb(125 211 252 / .13);
  }

  .ra-elements-toggle {
    width: 14px;
    height: 14px;
    min-height: 14px;
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    color: var(--ra-muted, var(--muted, #a4adbd));
    padding: 0;
  }

  .ra-elements-toggle:disabled {
    opacity: 0;
  }

  .ra-elements-tag-name,
  .ra-elements-punctuation {
    color: #ff7b72;
  }

  .ra-elements-attr {
    margin-left: 4px;
  }

  .ra-elements-attr-name {
    color: #a5d6ff;
  }

  .ra-elements-equals {
    color: var(--ra-muted, var(--muted, #a4adbd));
  }

  .ra-elements-attr-value {
    color: #a5d6a7;
  }

  .ra-elements-text {
    color: var(--ra-muted, var(--muted, #a4adbd));
  }

  .ra-elements-source-row {
    display: grid;
    gap: 4px;
    margin: 2px 6px 3px calc(18px + var(--depth, 0) * var(--ra-elements-indent));
    padding: 5px;
    border: 1px solid rgb(255 255 255 / .08);
    border-radius: 7px;
    background: rgb(255 255 255 / .035);
  }

  .ra-elements-source-row pre {
    margin: 0;
    max-height: 74px;
    overflow: auto;
    font: 8.5px / 1.35 var(--ra-font-mono, var(--mono, ui-monospace, monospace));
    white-space: pre-wrap;
    word-break: break-word;
  }

  .ra-elements-more {
    min-height: 23px;
    margin: 3px 0 4px calc(18px + var(--depth, 0) * var(--ra-elements-indent));
    padding: 0 8px;
  }

  .ra-elements-menu {
    position: fixed;
    z-index: 2147483601;
    width: ${MENU_WIDTH}px;
    padding: ${MENU_PADDING}px;
    border: 1px solid var(--ra-border-strong, var(--line-strong, rgb(255 255 255 / .2)));
    border-radius: 12px;
    background: var(--ra-bg-2, var(--bg-2, rgb(18 19 22 / .98)));
    box-shadow: 0 18px 50px rgb(0 0 0 / .58);
    pointer-events: auto;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .ra-elements-menu button {
    width: 100%;
    height: ${MENU_ITEM_HEIGHT}px;
    justify-content: flex-start;
    padding: 0 8px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    text-align: left;
    font-size: 10px;
  }

  .ra-elements-menu button:hover {
    background: rgb(255 255 255 / .08);
  }

  .ra-elements-danger {
    color: #ff7b72 !important;
  }

  .ra-elements-details {
    max-height: 38vh;
    overflow: auto;
    border-top: 1px solid var(--ra-border, var(--line, rgb(255 255 255 / .11)));
    background: rgb(8 9 11 / .88);
    padding: 6px;
  }

  .ra-elements-details-head {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    padding-bottom: 6px;
    background: rgb(8 9 11 / .88);
  }

  .ra-elements-details-head strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ra-text, var(--text, #edf0f7));
    font: 800 10px / 1.2 var(--ra-font-ui, var(--ui, system-ui));
  }

  .ra-elements-details-head div {
    display: flex;
    gap: 4px;
    flex: 0 0 auto;
  }

  .ra-elements-details button {
    min-height: 21px;
    padding: 0 8px;
  }

  .ra-elements-details button.active {
    border-color: rgb(125 211 252 / .45);
    background: rgb(125 211 252 / .16);
  }

  .ra-elements-empty-details {
    color: var(--ra-muted, var(--muted, #a4adbd));
    font: 700 10px / 1.4 var(--ra-font-ui, var(--ui, system-ui));
    padding: 8px;
  }

  .ra-elements-editor {
    display: grid;
    gap: 5px;
  }

  .ra-elements-field {
    display: grid;
    grid-template-columns: 104px minmax(0, 1fr);
    gap: 6px;
    align-items: center;
    font: 600 10px / 1.25 var(--ra-font-ui, var(--ui, system-ui));
  }

  .ra-elements-field span {
    color: var(--ra-muted, var(--muted, #a4adbd));
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ra-elements-field input,
  .ra-elements-field select,
  .ra-elements-field textarea {
    min-width: 0;
    border: 1px solid var(--ra-border, var(--line, rgb(255 255 255 / .11)));
    border-radius: 7px;
    background: rgb(255 255 255 / .055);
    color: var(--ra-text, var(--text, #edf0f7));
    font: 500 10px / 1.3 var(--ra-font-mono, var(--mono, ui-monospace, monospace));
    padding: 5px 6px;
  }

  .ra-elements-field textarea {
    min-height: 52px;
    resize: vertical;
  }

  .ra-elements-field-check input {
    justify-self: start;
  }

  .ra-elements-box {
    display: grid;
    place-items: center;
    padding: 8px 0;
    font: 800 9px / 1 var(--ra-font-ui, var(--ui, system-ui));
    color: var(--ra-text, var(--text, #edf0f7));
  }

  .ra-box-layer {
    display: grid;
    gap: 4px;
    place-items: center;
    border: 1px solid var(--ra-border, var(--line, rgb(255 255 255 / .11)));
    border-radius: 8px;
    padding: 5px;
  }

  .ra-box-layer > div {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .ra-box-margin {
    background: rgb(251 191 36 / .10);
  }

  .ra-box-border {
    background: rgb(248 113 113 / .10);
  }

  .ra-box-padding {
    background: rgb(74 222 128 / .10);
  }

  .ra-box-content {
    min-width: 72px;
    min-height: 36px;
    display: grid;
    place-items: center;
    border-radius: 6px;
    background: rgb(125 211 252 / .16);
  }

  .ra-box-layer span,
  .ra-box-layer b {
    color: var(--ra-muted, var(--muted, #a4adbd));
  }

  .ra-icon-fallback {
    width: 13px;
    height: 13px;
    
    display: inline-grid;
    place-items: center;
    border-radius: 999px;
    background: rgb(255 255 255 / .12);
    font: 900 8px / 1 var(--ra-font-ui, var(--ui, system-ui));
  }`.trim();
  }
})();
