// ==UserScript==
// @name         ⛱️ 003 / Alerta / Elements Plugin Ultra
// @namespace    https://rod.dev/userscripts
// @version      0.1.0
// @description  Ultra Fabrica Elements plugin: virtual DOM tree, resizable fixed panels, matched CSS rules, computed styles, source modal, color picker, VizBug outline, anchored menus.
// @author       Rod
// @match        *://*/*
// @run-at       document-idle
// @weight       997
// @grant        none
// @noframes
// ==/UserScript==

(async function AlertaElementsUltraPlugin() {
  "use strict";

  /* *************** */
  /* Constants       */
  /* *************** */

  const GLOBAL_NAME = "RodDockedInspector";
  const PLUGIN_ID = "elements";
  const VERSION = "0.1.0";
  const STORAGE_KEY = "rod.alerta.elements.ultra.v0.1.0";
  const STYLE_ID = "rod-alerta-elements-ultra-style";
  const OVERLAY_ID = "rod-alerta-elements-outline-overlay";
  const READY_TIMEOUT_MS = 15_000;
  const READY_INTERVAL_MS = 80;
  const LONG_PRESS_MS = 220;
  const TREE_ROW_HEIGHT = 24;
  const TREE_OVERSCAN = 24;
  const MAX_DEPTH = 80;
  const MAX_CHILDREN_PER_NODE = 1_500;
  const MAX_ATTRS = 60;
  const MAX_ATTR_LENGTH = 180;
  const MENU_WIDTH = 224;
  const MENU_ITEM_HEIGHT = 34;
  const MENU_PADDING = 7;
  const EDGE_GAP = 0;
  const DETAILS_MIN_W = 300;
  const DETAILS_MIN_H = 180;
  const SOURCE_PRETTY_LIMIT = 260_000;

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

  const ICONS = {
    refresh: "rotate-cw",
    picker: "mouse-pointer-click",
    wrap: "wrap-text",
    text: "text",
    code: "code-2",
    collapse: "fold-horizontal",
    outline: "scan",
    source: "file-code-2",
    fetch: "download-cloud",
    focus: "scan-search",
    dollar: "badge-dollar-sign",
    copy: "copy",
    link: "external-link",
    trash: "trash-2",
    down: "chevron-down",
    right: "chevron-right",
    plus: "plus",
    styles: "palette",
    box: "box",
    props: "list",
    computed: "calculator",
    rules: "braces",
    close: "x",
    drag: "move",
    eye: "eye",
    color: "pipette",
  };

  /* *************** */
  /* Runtime         */
  /* *************** */

  let api = null;
  let html = null;
  let signal = null;
  let stateSignal = null;
  let flatTreeSignal = null;
  let scrollTopSignal = null;
  let renderTickSignal = null;
  let state = readState();
  let longPressTimer = 0;
  let longPressPoint = null;
  let pickerActive = false;
  let hoveredElement = null;
  let outlineActive = false;
  let outlineRaf = 0;
  let unsubscribeSelected = null;

  const nodeRefs = new WeakMap();
  const nodePathCache = new WeakMap();

  const inspector = await waitForInspector();

  if (!inspector?.registerPlugin) return;

  inspector.registerPlugin({
    id: PLUGIN_ID,
    title: "Elements",
    icon: "mouse-pointer-click",
    order: 10,
    setup,
    teardown,
    render,
    clear,
    copy,
    getCount,
  });

  /* *************** */
  /* Setup           */
  /* *************** */

  function setup(nextApi) {
    api = nextApi;
    html = api.html;
    signal = api.signal;
    stateSignal = signal ? signal(state, { equals: false }) : null;
    flatTreeSignal = signal ? signal([], { equals: false }) : null;
    scrollTopSignal = signal ? signal(0) : null;
    renderTickSignal = signal ? signal(0) : null;

    installStyle();
    exposeCompatibilityApi();

    unsubscribeSelected =
      api.on?.("element:selected", (payload) => {
        if (payload?.element instanceof Element) revealElement(payload.element);
      }) || null;

    api.settings?.register?.(PLUGIN_ID, [
      {
        key: "showTextNodes",
        type: "boolean",
        label: "Show text nodes",
        defaultValue: state.showTextNodes,
      },
      
       {
        key: "showDetailsPanel",
        type: "boolean",
        label: "Show details panel",
        defaultValue: state.showDetailsPanel,
      },
      {
        key: "wrap",
        type: "boolean",
        label: "Wrap rows",
        defaultValue: state.wrap,
      },
      {
        key: "showInlineSource",
        type: "boolean",
        label: "Inline style/script preview",
        defaultValue: state.showInlineSource,
      },
      {
        key: "showUserAgentStyles",
        type: "boolean",
        label: "Show UA CSS rules",
        defaultValue: state.showUserAgentStyles,
      },
    ]);

    rebuildTree();
  }

  function teardown() {
    stopPicker();
    setOutlineMode(false);
    clearHover();

    if (typeof unsubscribeSelected === "function") {
      unsubscribeSelected();
    }

    getStyleRoot()?.querySelector?.(`#${STYLE_ID}`)?.remove?.();
    document.getElementById(STYLE_ID)?.remove?.();
  }

  /* *************** */
  /* State           */
  /* *************** */

  function readState() {
    const fallback = {
      expanded: ["html", "html.0", "html.1"],
      selectedPath: "html",
      selectedRefId: null,
      selectedPanel: "styles",
      showTextNodes: true,
      showDetailsPanel: false,
      wrap: true,
      showInlineSource: true,
      showUserAgentStyles: false,
      menu: null,
      detailsOpen: true,
      details: {
        x: 12,
        y: 120,
        width: 430,
        height: 420,
      },
      search: "",
      persistedStyles: {},
      persistedDomFields: {},

    };

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

      return {
        ...fallback,
        ...saved,
        menu: null,
        details: {
          ...fallback.details,
          ...(saved.details || {}),
        },
      };
    } catch {
      return fallback;
    }
  }

  function setState(patch, reason = "state") {
    state = {
      ...state,
      ...patch,
    };

    if (stateSignal) {
      stateSignal.set(state);
    }

    saveState();
    api?.scheduleRender?.();
    debug(reason, patch);
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...state,
          menu: null,
        }),
      );
    } catch {}
  }

  function bump() {
    renderTickSignal?.set((renderTickSignal.peek?.() || 0) + 1);
    api?.scheduleRender?.();
  }

  /* *************** */
  /* Tree engine     */
  /* *************** */

  function rebuildTree() {
    const rows = [];

    walkNode(document.documentElement, "html", 0, rows);
    flatTreeSignal?.set(rows);

    return rows;
  }

  function walkNode(node, path, depth, rows) {
    if (!node || shouldSkipNode(node) || depth > MAX_DEPTH) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();

      if (text) {
        rows.push({
          node,
          path,
          depth,
          kind: "text",
          key: path,
        });
      }

      return;
    }

    if (!(node instanceof Element)) return;

    rows.push({
      node,
      path,
      depth,
      kind: "element",
      key: path,
    });

    if (!state.expanded.includes(path)) return;

    const children = getRenderableChildren(node);

    for (let index = 0; index < children.length; index += 1) {
      walkNode(children[index], `${path}.${index}`, depth + 1, rows);
    }

    rows.push({
      node,
      path: `${path}:close`,
      depth,
      kind: "close",
      key: `${path}:close`,
    });
  }

  function getRenderableChildren(node) {
    const output = [];
    const children = node.childNodes;

    for (let index = 0; index < children.length && output.length < MAX_CHILDREN_PER_NODE; index += 1) {
      const child = children[index];

      if (!shouldSkipNode(child)) {
        output.push(child);
      }
    }

    return output;
  }

  function shouldSkipNode(node) {
    if (isInspectorNode(node)) return true;
    if (node.nodeType === Node.COMMENT_NODE) return true;

    if (node.nodeType === Node.TEXT_NODE) {
      return !state.showTextNodes || !node.textContent?.trim();
    }

    return false;
  }

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

  /* *************** */
  /* Actions         */
  /* *************** */

  function revealElement(element) {
    const path = getPathForElement(element);
    const expanded = new Set(state.expanded);
    const parts = path.split(".");

    for (let index = 1; index <= parts.length; index += 1) {
      expanded.add(parts.slice(0, index).join("."));
    }

    window.$0 = element;

    setState(
      {
        expanded: Array.from(expanded),
        selectedPath: path,
        selectedRefId: getNodeRefId(element),
        detailsOpen: true,
      },
      "tree:reveal",
    );

    rebuildTree();
    api?.setTab?.(PLUGIN_ID);
    api?.open?.();

    requestAnimationFrame(() => {
      getPluginRoot()
        ?.querySelector?.(`[data-elements-path="${safeCssEscape(path)}"]`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    });
  }

  function selectRow(row) {
    if (!(row.node instanceof Element)) return;

    window.$0 = row.node;

    setState(
      {
        selectedPath: row.path,
        selectedRefId: getNodeRefId(row.node),
        detailsOpen: true,
      },
      "tree:select",
    );
  }

  function togglePath(path) {
    const expanded = new Set(state.expanded);

    if (expanded.has(path)) {
      expanded.delete(path);
    } else {
      expanded.add(path);
    }

    setState(
      {
        expanded: Array.from(expanded),
      },
      "tree:toggle",
    );

    rebuildTree();
  }

  async function openSource(element, external = false) {
    const language = getElementLanguage(element);
    const url = getAbsoluteResourceUrl(element);

    if (external && url) {
      api?.modal?.source?.({
        title: `Loading ${url}`,
        source: `Loading...\n${url}`,
        language: "text",
        url,
      });

      try {
        const response = await fetch(url, {
          cache: "force-cache",
        });

        const source = await response.text();
        const pretty = source.length <= SOURCE_PRETTY_LIMIT ? await prettySource(source, language) : source;

        api?.modal?.source?.({
          title: `${response.status} ${url}`,
          source: pretty,
          language,
          url,
        });
      } catch (error) {
        api?.modal?.source?.({
          title: `Failed ${url}`,
          source: String(error?.stack || error),
          language: "text",
          url,
        });
      }

      return;
    }

    const raw = getElementSource(element);
    const pretty = raw.length <= SOURCE_PRETTY_LIMIT ? await prettySource(raw, language) : raw;

    api?.modal?.source?.({
      title: formatCompactTag(element),
      source: pretty,
      language,
      url,
    });
  }

  function runMenuAction(action, element) {
    if (action === "focus") focusElement(element);
    if (action === "source") openSource(element, false);
    if (action === "fetch") openSource(element, true);
    if (action === "dollar") window.$0 = element;
    if (action === "copy-outer") copyText(element.outerHTML);
    if (action === "copy-inner") copyText(element.innerHTML);
    if (action === "copy-text") copyText(element.textContent || "");
    if (action === "copy-url") copyText(getAbsoluteResourceUrl(element));
    if (action === "open-url") window.open(getAbsoluteResourceUrl(element), "_blank", "noopener,noreferrer");

    if (action === "delete") {
      element.remove();
      rebuildTree();
    }

    closeMenu();
  }

  function focusElement(element) {
    api?.minimize?.();
    window.$0 = element;

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });

    const previous = {
      outline: element.style.outline,
      outlineOffset: element.style.outlineOffset,
    };

    element.style.outline = "4px solid rgba(125,211,252,.96)";
    element.style.outlineOffset = "5px";

    setTimeout(() => {
      element.style.outline = previous.outline;
      element.style.outlineOffset = previous.outlineOffset;
    }, 1600);
  }

  function clear() {
    setState(
      {
        expanded: ["html"],
        menu: null,
        search: "",
      },
      "clear",
    );

    rebuildTree();
  }

  function copy() {
    const element = getSelectedElement();

    if (element) {
      copyText(element.outerHTML || "");
    }
  }

  function getCount() {
    return getSelectedElement() ? 1 : 0;
  }

  /* *************** */
  /* Picker          */
  /* *************** */

  function startPicker() {
    if (pickerActive) return;

    pickerActive = true;
    document.addEventListener("pointermove", handlePickerMove, true);
    document.addEventListener("click", handlePickerClick, true);
    api?.minimize?.();
  }

  function stopPicker() {
    if (!pickerActive) return;

    pickerActive = false;
    clearHover();
    document.removeEventListener("pointermove", handlePickerMove, true);
    document.removeEventListener("click", handlePickerClick, true);
  }

  function handlePickerMove(event) {
    const target = event.target;

    if (!(target instanceof Element) || isInspectorNode(target) || hoveredElement === target) return;

    clearHover();

    hoveredElement = target;
    hoveredElement.__raPrevOutline = hoveredElement.style.outline;
    hoveredElement.__raPrevOutlineOffset = hoveredElement.style.outlineOffset;
    hoveredElement.style.outline = "3px solid rgba(251,146,60,.96)";
    hoveredElement.style.outlineOffset = "4px";
  }

  function handlePickerClick(event) {
    const target = event.target;

    if (!(target instanceof Element) || isInspectorNode(target)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    stopPicker();
    revealElement(target);
  }

  function clearHover() {
    if (!hoveredElement) return;

    hoveredElement.style.outline = hoveredElement.__raPrevOutline || "";
    hoveredElement.style.outlineOffset = hoveredElement.__raPrevOutlineOffset || "";
    hoveredElement = null;
  }

  /* *************** */
  /* Outline overlay */
  /* *************** */

  function toggleOutline() {
    setOutlineMode(!outlineActive);
  }

  function setOutlineMode(enabled) {
    outlineActive = Boolean(enabled);

    let overlay = document.getElementById(OVERLAY_ID);

    if (!outlineActive) {
      overlay?.remove();
      cancelAnimationFrame(outlineRaf);
      return;
    }

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = OVERLAY_ID;
      overlay.style.cssText = "position:absolute;inset:0;z-index:2147483000;pointer-events:none;contain:layout style paint;";
      document.documentElement.appendChild(overlay);
    }

    drawOutlineOverlay();
    window.addEventListener("scroll", scheduleOutlineDraw, true);
    window.addEventListener("resize", scheduleOutlineDraw, true);
  }

  function scheduleOutlineDraw() {
    if (!outlineActive || outlineRaf) return;

    outlineRaf = requestAnimationFrame(() => {
      outlineRaf = 0;
      drawOutlineOverlay();
    });
  }

  function drawOutlineOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);

    if (!overlay) return;

    const elements = Array.from(document.body.querySelectorAll("*"))
      .filter((element) => !isInspectorNode(element) && element.getClientRects().length)
      .slice(0, 900);

    const htmlParts = [];
    const sx = window.scrollX;
    const sy = window.scrollY;

    for (let index = 0; index < elements.length; index += 1) {
      const element = elements[index];
      const rect = element.getBoundingClientRect();

      if (rect.width < 6 || rect.height < 6) continue;

      const color = `hsl(${(index * 37) % 360} 92% 66%)`;
      const label = formatCompactTag(element).replace(/[<>]/g, "");

      htmlParts.push(
        `<div class="ra-vizbox" style="left:${rect.left + sx}px;top:${rect.top + sy}px;width:${rect.width}px;height:${rect.height}px;border-color:${color};"><span style="background:${color}">${escapeHtml(label)}</span></div>`,
      );
    }

    overlay.innerHTML = `
      <style>
        #${OVERLAY_ID} .ra-vizbox {
          position: absolute;
          border: 1px solid;
          box-sizing: border-box;
        }

        #${OVERLAY_ID} .ra-vizbox span {
          position: absolute;
          left: 0;
          top: -16px;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #061014;
          font: 900 10px/1 system-ui;
          padding: 2px 5px;
          border-radius: 6px;
        }
      </style>
      ${htmlParts.join("")}
    `;
  }

  /* *************** */
  /* Menu            */
  /* *************** */

  function openMenu(event, element) {
    const actions = getMenuActions(element);
    const position = solveMenuPosition(event, element, actions.length);

    setState(
      {
        menu: {
          ...position,
          refId: getNodeRefId(element),
          actions,
        },
      },
      "menu:open",
    );
  }

  function closeMenu() {
    if (state.menu) {
      setState(
        {
          menu: null,
        },
        "menu:close",
      );
    }
  }

  function getMenuActions(element) {
    const url = getElementUrl(element);
    const external = hasExternalSource(element);

    return [
      ["source", "Source", "source"],
      ...(external ? [["fetch", "Fetch preview", "fetch"]] : []),
      ["focus", "Focus", "focus"],
      ["dollar", "Set $0", "dollar"],
      ["copy-outer", "Copy outerHTML", "copy"],
      ["copy-inner", "Copy innerHTML", "copy"],
      ["copy-text", "Copy text", "copy"],
      ...(url
        ? [
            ["open-url", "Open URL", "link"],
            ["copy-url", "Copy URL", "copy"],
          ]
        : []),
      ["delete", "Delete", "trash"],
    ];
  }

 function getPointerPoint(event) {
  const touch =
    event.touches?.[0] ||
    event.changedTouches?.[0] ||
    event.targetTouches?.[0];

  return {
    x: touch ? touch.clientX : event.clientX,
    y: touch ? touch.clientY : event.clientY,
  };
}

function solveMenuPosition(event, element, itemCount) {
  const vv = window.visualViewport;

  const viewport = {
    left: vv?.offsetLeft ?? 0,
    top: vv?.offsetTop ?? 0,
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
  };

  const menuHeight = Math.min(
    itemCount * MENU_ITEM_HEIGHT + MENU_PADDING * 2,
    viewport.height - EDGE_GAP * 2
  );

  const point = getPointerPoint(event);

  /**
   * IMPORTANT:
   * For position: fixed, clientX/clientY are already viewport-based.
   * Do NOT add visualViewport.offsetLeft/top to the pointer.
   */
  const anchor = {
    x: point.x,
    y: point.y,
  };

  const target = element?.getBoundingClientRect?.() || {
    left: anchor.x,
    right: anchor.x,
    top: anchor.y,
    bottom: anchor.y,
  };

  const viewportRect = {
    left: viewport.left + EDGE_GAP,
    top: viewport.top + EDGE_GAP,
    right: viewport.left + viewport.width - EDGE_GAP,
    bottom: viewport.top + viewport.height - EDGE_GAP,
  };

  const targetAbs = {
    left: target.left,
    right: target.right,
    top: target.top,
    bottom: target.bottom,
  };

  const candidates = [
    { x: anchor.x + 8, y: anchor.y + 8 },
    { x: anchor.x - MENU_WIDTH - 8, y: anchor.y + 8 },
    { x: anchor.x + 8, y: anchor.y - menuHeight - 8 },
    { x: anchor.x - MENU_WIDTH - 8, y: anchor.y - menuHeight - 8 },

    {
      x: target.right + 8,
      y: anchor.y - menuHeight / 2,
    },
    {
      x: target.left - MENU_WIDTH - 8,
      y: anchor.y - menuHeight / 2,
    },
  ];

  for (const candidate of candidates) {
    const rect = {
      left: candidate.x,
      top: candidate.y,
      right: candidate.x + MENU_WIDTH,
      bottom: candidate.y + menuHeight,
    };

    const fits =
      rect.left >= viewportRect.left &&
      rect.right <= viewportRect.right &&
      rect.top >= viewportRect.top &&
      rect.bottom <= viewportRect.bottom;

    if (fits && !intersects(rect, targetAbs)) {
      return {
        x: candidate.x,
        y: candidate.y,
        maxHeight: menuHeight,
      };
    }
  }

  return {
    x: clamp(anchor.x + 8, viewportRect.left, viewportRect.right - MENU_WIDTH),
    y: clamp(anchor.y + 8, viewportRect.top, viewportRect.bottom - menuHeight),
    maxHeight: menuHeight,
  };
}

  /* *************** */
  /* Rendering       */
  /* *************** */

  function render(nextApi) {
    api = nextApi;
    html = api.html;

    if (!stateSignal && api.signal) {
      setup(api);
    }

    state = stateSignal ? stateSignal() : state;
    renderTickSignal?.();

    const rows = flatTreeSignal ? flatTreeSignal() : rebuildTree();
    const scrollTop = scrollTopSignal ? scrollTopSignal() : 0;
    const viewportHeight = 620;
    const first = Math.max(0, Math.floor(scrollTop / TREE_ROW_HEIGHT) - TREE_OVERSCAN);
    const count = Math.ceil(viewportHeight / TREE_ROW_HEIGHT) + TREE_OVERSCAN * 2;
    const visible = rows.slice(first, first + count);
    const totalHeight = rows.length * TREE_ROW_HEIGHT;

    return html`
      <section class=${`ra-elements-plugin ${state.wrap ? "ra-wrap" : ""}`} @pointerdown=${handleRootPointerDown}>
        ${renderToolbar()}
        ${renderBreadcrumb()}
        <div class="ra-elements-tree" @scroll=${handleTreeScroll}>
          <div class="ra-elements-spacer" style=${style({ height: `${totalHeight}px` })}></div>
          <div class="ra-elements-rows" style=${style({ transform: `translateY(${first * TREE_ROW_HEIGHT}px)` })}>
            ${visible.map((row) => renderTreeRow(row))}
          </div>
        </div>
        ${state.showDetailsPanel && state.detailsOpen ? renderDetailsPanel() : ""}
        ${renderContextMenu()}
      </section>
    `;
  }

  function renderToolbar() {
    return html`
      <nav class="ra-elements-toolbar">
        <button
          type="button"
          @click=${() => {
            rebuildTree();
            bump();
          }}
        >
          ${icon("refresh")}Refresh
        </button>
        <button type="button" @click=${startPicker}>${icon("picker")}Pick</button>
        <button type="button" @click=${toggleOutline}>${icon("outline")}Outline</button>
        <button type="button" @click=${() => setState({ wrap: !state.wrap })}>${icon("wrap")}${state.wrap ? "Wrap on" : "Wrap off"}</button>
        <button
          type="button"
          @click=${() => {
            setState({ showTextNodes: !state.showTextNodes });
            rebuildTree();
          }}
        >
          ${icon("text")}Text
        </button>
        <button type="button" @click=${() => setState({ showInlineSource: !state.showInlineSource })}>${icon("code")}Inline</button>
        <button
          type="button"
          @click=${() => {
            setState({ expanded: ["html"] });
            rebuildTree();
          }}
        >
          ${icon("collapse")}Collapse
        </button>
        <input class="ra-elements-search" type="search" placeholder="Search DOM..." .value=${state.search || ""} @input=${handleSearch} />
      </nav>
    `;
  }

  function renderBreadcrumb() {
    const element = getSelectedElement();

    if (!element) {
      return html`<div class="ra-elements-breadcrumb">No selection</div>`;
    }

    const chain = [];
    let node = element;

    while (node && node instanceof Element) {
      chain.unshift(node);

      if (node === document.documentElement) break;

      node = node.parentElement;
    }

    return html`
      <div class="ra-elements-breadcrumb">
        ${chain.map((item) => html`<button type="button" @click=${() => revealElement(item)}>${formatCompactTag(item).replace(/[<>]/g, "")}</button>`)}
      </div>
    `;
  }

  function renderTreeRow(row) {
    if (row.kind === "text") {
      return html`
        <div class="ra-elements-row ra-elements-text-row" style=${style({ "--depth": row.depth })}>
          <span></span>
          <span class="ra-elements-text">${trim(row.node.textContent?.trim() || "", 180)}</span>
        </div>
      `;
    }

    const node = row.node;
    const tag = node.tagName.toLowerCase();
    const path = row.path.replace(":close", "");
    const selected = state.selectedPath === path || state.selectedRefId === getNodeRefId(node);

    if (row.kind === "close") {
      return html`
        <div class="ra-elements-row ra-elements-close-row" style=${style({ "--depth": row.depth })}>
          <span></span>
          <span class="ra-elements-tag">
            <span class="ra-elements-punctuation">&lt;/</span><span class="ra-elements-tag-name">${tag}</span><span class="ra-elements-punctuation">&gt;</span>
          </span>
        </div>
      `;
    }

    const hasChildren = getRenderableChildren(node).length > 0;
    const open = state.expanded.includes(path);

    return html`
      <div
        class=${`ra-elements-row ${selected ? "ra-elements-selected" : ""}`}
        style=${style({ "--depth": row.depth })}
        data-elements-path=${path}
        @click=${(event) => {
          event.preventDefault();
          event.stopPropagation();
          selectRow(row);
        }}
        @dblclick=${(event) => {
          event.preventDefault();
          event.stopPropagation();
          togglePath(path);
        }}
        @pointerdown=${(event) => startLongPress(event, node)}
        @pointermove=${clearLongPress}
        @pointerup=${clearLongPress}
        @pointercancel=${clearLongPress}
      >
        <button
          class="ra-elements-toggle"
          type="button"
          ?disabled=${!hasChildren}
          @click=${(event) => {
            event.stopPropagation();
            togglePath(path);
          }}
        >
          ${hasChildren ? icon(open ? "down" : "right") : ""}
        </button>
        <span class="ra-elements-tag">${renderOpenTag(node)}${renderBadges(node)}</span>
      </div>
      ${open && state.showInlineSource ? renderInlineSource(node, row.depth) : ""}
    `;
  }

  function renderOpenTag(element) {
    return html`
      <span class="ra-elements-punctuation">&lt;</span>
      <span class="ra-elements-tag-name">
        ${element.tagName.toLowerCase()}
      </span>
      ${renderAttributes(element)}
      <span class="ra-elements-punctuation">&gt;
      </span>
    `; 
  }

  function renderAttributes(element) {
    return Array.from(element.attributes)
      .slice(0, MAX_ATTRS)
      .map(
        (attr) => html`
          <span class="ra-elements-attr">
            <span class="ra-elements-attr-name">
              ${attr.name}
            </span>
            <span class="ra-elements-equals">=</span>
            <span class="ra-elements-attr-value">
              "${trim(attr.value, MAX_ATTR_LENGTH)}"
            </span>
          </span>
        `,
      );
  }

  function renderBadges(element) {
    const computed = getComputedStyle(element);
    const badges = [];

    if (computed.display === "flex" || computed.display === "inline-flex") badges.push("flex");
    if (computed.display === "grid" || computed.display === "inline-grid") badges.push("grid");
    if (["fixed", "sticky"].includes(computed.position)) badges.push(computed.position);
    if (element.shadowRoot) badges.push("shadow");
    if (isReactElement(element)) badges.push("react");

    return badges.map((badge) => html`<span class="ra-elements-badge">${badge}</span>`);
  }

  function renderInlineSource(element, depth) {
    if (!(element instanceof HTMLStyleElement) && !(element instanceof HTMLScriptElement)) return "";

    const source = getElementSource(element).trim();

    if (!source) return "";

    return html`
      <div class="ra-elements-source-row" style=${style({ "--depth": depth + 1 })}>
        <pre>${trim(source, 900)}</pre>
        <button type="button" @click=${() => openSource(element)}>${icon("source")}source</button>
      </div>
    `;
  }

  function renderContextMenu() {
    const menu = state.menu;

    if (!menu) return "";

    const element = read(menu.refId);

    if (!(element instanceof Element)) return "";

    return html`
      <div class="ra-elements-menu" style=${style({ left: `${menu.x}px`, top: `${menu.y}px` })} @pointerdown=${(event) => event.stopPropagation()}>
        ${menu.actions.map(
          ([action, label, iconName]) => html`
            <button 
              type="button" 
              class=${action === "delete" ? "ra-elements-danger" : ""} 
              @click=${() => runMenuAction(action, element)}>
                ${icon(iconName)}${label}
             </button>
          `,
        )}
      </div>
    `;
  }

  function renderDetailsPanel() {
    const element = getSelectedElement();
    const panel = state.details;

    if (!element) {
      return html`
        <aside class="ra-elements-details" style=${style(panelStyle(panel))}>
          <div class="ra-elements-empty-details">Select an element.</div>
        </aside>
      `;
    }

    return html`
      <aside class="ra-elements-details" style=${style(panelStyle(panel))}>
        <header class="ra-elements-details-head" @pointerdown=${startDetailsDrag}>
          <div> 
            <strong>${formatCompactTag(element)}</strong>
          </div>
          <div>
            ${detailTab("styles", "Styles", "styles")} ${detailTab("computed", "Computed", "computed")} ${detailTab("rules", "Rules", "rules")}
            ${detailTab("box", "Box", "box")} ${detailTab("props", "Props", "props")}
            <button type="button" @click=${() => setState({ detailsOpen: false })}>${icon("close")}</button>
          </div>
        </header>

        <main class="ra-elements-details-body">
          ${state.selectedPanel === "styles" ? renderStyleEditor(element) : ""} ${state.selectedPanel === "computed" ? renderComputedStyles(element) : ""}
          ${state.selectedPanel === "rules" ? renderMatchedRules(element) : ""} ${state.selectedPanel === "box" ? renderBoxModel(element) : ""}
          ${state.selectedPanel === "props" ? renderDomProperties(element) : ""}
        </main>

        <div class="ra-elements-details-resize" @pointerdown=${startDetailsResize}></div>
      </aside>
    `;
  }

  function detailTab(id, label, iconName) {
    return html`
      <button type="button" class=${state.selectedPanel === id ? "active" : ""} @click=${() => setState({ selectedPanel: id })}>${icon(iconName)}${label}</button>
    `;
  }

  function renderStyleEditor(element) {
    const computed = getComputedStyle(element);

    return html`
      <section class="ra-elements-editor">
        ${EDITABLE_STYLE_PROPERTIES.map((property) => renderStyleField(element, property, element.style[property] || computed[property] || ""))}
      </section>
    `;
  }

  function renderStyleField(element, property, value) {
    const isColor = isColorProperty(property) || looksLikeColor(value);

    return html`
      <label class="ra-elements-field">
        <span>${property}</span>
        <div class="ra-elements-value-wrap">
          ${isColor
            ? html`
                <button class="ra-color-dot" style=${style({ background: normalizeColor(value) || "transparent" })} title="Pick color" type="button">
                  <input type="color" .value=${toHexColor(value)} @input=${(event) => updateStyleProperty(element, property, event.currentTarget.value)} />
                </button>
              `
            : ""}
          <input type="text" .value=${String(value || "")} @change=${(event) => updateStyleProperty(element, property, event.currentTarget.value)} />
        </div>
      </label>
    `;
  }

  function renderComputedStyles(element) {
    const computed = getComputedStyle(element);
    const changed = getNonDefaultComputedProperties(element, computed);

    return html`
      <section class="ra-elements-editor">
        <div class="ra-elements-panel-note">Changed from browser defaults only.</div>
        ${changed.map(
          (property) => html`
            <label class="ra-elements-field">
              <span>${property}</span>
              <input readonly .value=${computed.getPropertyValue(property)} />
            </label>
          `,
        )}
      </section>
    `;
  }

  function renderMatchedRules(element) {
    const rules = getMatchedCssRules(element);

    return html`
      <section class="ra-elements-rules">
        ${rules.map(
          (entry) => html`
            <article class="ra-rule">
              <header>
                <strong>${entry.selector}</strong>
                <small>${entry.href}:${entry.line || "?"}</small>
              </header>
              ${entry.declarations.map(
                (decl) => html`
                  <div class=${decl.overridden ? "overridden" : ""}>
                    <span>${decl.name}</span>
                    <b>${decl.value}</b>
                  </div>
                `,
              )}
            </article>
          `,
        )}
      </section>
    `;
  }

  function renderBoxModel(element) {
    const rect = element.getBoundingClientRect();
    const s = getComputedStyle(element);
    const box = {
      size: `${Math.round(rect.width)} × ${Math.round(rect.height)}`,
      margin: [s.marginTop, s.marginRight, s.marginBottom, s.marginLeft],
      border: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth],
      padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft],
    };

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
                  <div>
                    <b>${box.padding[3]}</b>
                    <div class="ra-box-content">${box.size}</div>
                    <b>${box.padding[1]}</b>
                  </div>
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

  function renderDomProperties(element) {
    return html`<section class="ra-elements-editor">${EDITABLE_DOM_FIELDS.map((field) => renderDomField(element, field))}</section>`;
  }

  function renderDomField(element, field) {
    const value = element[field.key];

    if (field.type === "checkbox") {
      return html`
        <label class="ra-elements-field">
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
          @change=${(event) => updateDomField(element, field.key, field.type === "number" ? Number(event.currentTarget.value) : event.currentTarget.value)}
        />
      </label>
    `;
  }

  /* *************** */
  /* Events          */
  /* *************** */

  function handleTreeScroll(event) {
    scrollTopSignal?.set(event.currentTarget.scrollTop);
  }

  function handleRootPointerDown(event) {
    const target = event.target;

    if (target instanceof Element && !target.closest(".ra-elements-menu")) {
      closeMenu();
    }
  }

  function handleSearch(event) {
    setState({
      search: event.currentTarget.value || "",
    });
  }

  function startLongPress(event, element) {
    clearLongPress();

    longPressPoint = {
      x: event.clientX,
      y: event.clientY,
    };

    longPressTimer = setTimeout(() => openMenu(event, element), LONG_PRESS_MS);
  }

  function clearLongPress() {
    clearTimeout(longPressTimer);
    longPressTimer = 0;
  }

  function startDetailsDrag(event) {
    if (event.target.closest("button,input,select,textarea")) return;

    event.preventDefault();

    const start = {
      x: event.clientX,
      y: event.clientY,
      ...state.details,
    };

    listenDrag((move) => {
      const next = keepPanel({
        ...state.details,
        x: start.x + move.clientX - start.x,
        y: start.y + move.clientY - start.y,
      });

      setState(
        {
          details: next,
        },
        "details:drag",
      );
    });
  }

  function startDetailsResize(event) {
    event.preventDefault();

    const start = {
      x: event.clientX,
      y: event.clientY,
      ...state.details,
    };

    listenDrag((move) => {
      const next = keepPanel({
        ...state.details,
        width: start.width + move.clientX - start.x,
        height: start.height + move.clientY - start.y,
      });

      setState(
        {
          details: next,
        },
        "details:resize",
      );
    });
  }

  function listenDrag(onMove) {
    function move(event) {
      onMove(event);
    }

    function up() {
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
    }

    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", up, true);
  }

  /* *************** */
  /* CSS/Source      */
  /* *************** */

  function getMatchedCssRules(element) {
    const matched = [];
    const computed = getComputedStyle(element);

    for (const sheet of Array.from(document.styleSheets)) {
      let rules = null;

      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }

      for (const rule of Array.from(rules || [])) {
        collectRule(rule, sheet.href || "inline", element, computed, matched);
      }
    }

    const seen = new Map();

    for (let i = matched.length - 1; i >= 0; i -= 1) {
      for (const decl of matched[i].declarations) {
        const key = decl.name;

        decl.overridden = seen.has(key);

        if (!seen.has(key)) {
          seen.set(key, decl.value);
        }
      }
    }

    return matched.slice(-80).reverse();
  }

  function collectRule(rule, href, element, computed, out) {
    if (rule.type === CSSRule.STYLE_RULE) {
      try {
        if (!element.matches(rule.selectorText)) return;
      } catch {
        return;
      }

      const declarations = [];

      for (let i = 0; i < rule.style.length; i += 1) {
        const name = rule.style[i];
        const value = rule.style.getPropertyValue(name).trim();

        if (!value) continue;

        declarations.push({
          name,
          value,
          priority: rule.style.getPropertyPriority(name),
          overridden: false,
        });
      }

      if (declarations.length) {
        out.push({
          selector: rule.selectorText,
          href,
          line: "?",
          declarations,
        });
      }

      return;
    }

    if (rule.cssRules) {
      for (const child of Array.from(rule.cssRules)) {
        collectRule(child, href, element, computed, out);
      }
    }
  }

  function getNonDefaultComputedProperties(element, computed) {
    const baseline = document.createElement(element.tagName.toLowerCase());

    baseline.style.all = "initial";
    document.documentElement.appendChild(baseline);

    const base = getComputedStyle(baseline);
    const result = [];

    for (const name of Array.from(computed).sort()) {
      if (name.startsWith("-webkit-")) continue;

      const value = computed.getPropertyValue(name);

      if (value && value !== base.getPropertyValue(name)) {
        result.push(name);
      }
    }

    baseline.remove();

    return result;
  }

  async function prettySource(source, language) {
    if (api?.prettySource) return api.prettySource(source, language, { highlight: false });
    if (api?.format?.prettySource) return api.format.prettySource(source, language, { highlight: false });

    const text = String(source || "");
    
    
    return Utils.prettySource(text, language, true);
    
    /**
    if (language === "css") {
      return text
        .replace(/\s*{\s * /g, " {\n  ")
        .replace(/;\s* /g, ";\n  ")
        .replace(/\s*}\s * /g, "\n}\n")
        .trim();
    }

    if (language === "xml" || language === "html") {
      return text
        .replace(/>\s+</g, "><")
        .replace(/</g, "\n<")
        .replace(/>/g, ">\n")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");
    }

    return dedent(text)
    **/
  }

  /* *************** */
  /* Editing         */
  /* *************** */

  function updateStyleProperty(element, property, value) {
    try {
      element.style[property] = value;
    } catch {}

    const key = getElementStorageKey(element);
    const persistedStyles = {
      ...state.persistedStyles,
      [key]: {
        ...(state.persistedStyles[key] || {}),
        [property]: value,
      },
    };

    setState(
      {
        persistedStyles,
      },
      "style:update",
    );
  }

  function updateDomField(element, field, value) {
    try {
      element[field] = value;
    } catch {}

    const key = getElementStorageKey(element);
    const persistedDomFields = {
      ...state.persistedDomFields,
      [key]: {
        ...(state.persistedDomFields[key] || {}),
        [field]: value,
      },
    };

    setState(
      {
        persistedDomFields,
      },
      "dom:update",
    );

    rebuildTree();
  }

  function getElementStorageKey(element) {
    return `${location.href}::${getPathForElement(element)}::${formatCompactTag(element)}`;
  }

  /* *************** */
  /* Helpers         */
  /* *************** */

  function getSelectedElement() {
    const value = read(state.selectedRefId);

    return value instanceof Element ? value : null;
  }

  function getNodeRefId(node) {
    if (nodeRefs.has(node)) return nodeRefs.get(node);

    const ref = api?.objectStore?.set?.(node) ?? Math.random();

    nodeRefs.set(node, ref);

    return ref;
  }

  function read(id) {
    if (id == null) return null;

    return api?.objectStore?.get?.(Number(id)) ?? api?.objectStore?.get?.(id) ?? null;
  }

  function store(value) {
    return api?.objectStore?.set?.(value) ?? null;
  }

  function getElementLanguage(element) {
    if (element instanceof HTMLStyleElement || element.tagName.toLowerCase() === "link") return "css";
    if (element instanceof HTMLScriptElement) return "javascript";

    return "xml";
  }

  function getElementSource(element) {
    if (element instanceof HTMLStyleElement || element instanceof HTMLScriptElement) return element.textContent || "";

    return element.outerHTML || "";
  }

  function getElementUrl(element) {
    return element.getAttribute("href") || element.getAttribute("src") || "";
  }

  function hasExternalSource(element) {
    return Boolean(getElementUrl(element));
  }

  function getAbsoluteResourceUrl(element) {
    try {
      return new URL(getElementUrl(element), location.href).href;
    } catch {
      return getElementUrl(element);
    }
  }

  function formatCompactTag(element) {
    const tag = element.tagName?.toLowerCase?.() || "element";
    const id = element.id ? `#${element.id}` : "";
    const cls =
      typeof element.className === "string" && element.className.trim()
        ? `.${element.className
            .trim()
            .split(/\s+/)
            .slice(0, 4)
            .join(".")}`
        : "";

    return `<${tag}${id}${cls}>`;
  }

  function isInspectorNode(node) {
    const host = document.querySelector("[data-ra-host='true']") || document.getElementById("__rod_alerta_fabrica_host__");

    return Boolean(host && (host === node || host.contains(node) || node.getRootNode?.() === host.shadowRoot));
  }

  function getStyleRoot() {
    return document.querySelector("[data-ra-host='true']")?.shadowRoot || document.head;
  }

  function getPluginRoot() {
    return document.querySelector("[data-ra-host='true']")?.shadowRoot || document;
  }

  function installStyle() {
    const root = getStyleRoot();

    root.querySelector?.(`#${STYLE_ID}`)?.remove?.();

    const styleEl = document.createElement("style");

    styleEl.id = STYLE_ID;
    styleEl.textContent = getStyleText();

    root.appendChild(styleEl);
  }

  function exposeCompatibilityApi() {
    if (!window[GLOBAL_NAME]) return;

    window[GLOBAL_NAME].revealElementInElementsPanel = revealElement;
    window[GLOBAL_NAME].selectElement = (element) => {
      if (!(element instanceof Element)) return false;

      revealElement(element);

      return true;
    };
  }

  /**function fallbackHtml(strings, ...values) {
    return strings.reduce((out, part, i) => out + part + String(values[i] ?? ""), "");
  }**/

  function style(map) {
    if (api?.css) return api.css(map);

    return Object.entries(map)
      .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${v};`)
      .join("");
  }

  function icon(name) {
    const lucide = ICONS[name] || name;

    return typeof api?.icon === "function" ? api.icon(lucide) : html`<span class="ra-icon-fallback">${String(name).slice(0, 1).toUpperCase()}</span>`;
  }

  function panelStyle(panel) {
    const p = keepPanel(panel);

    return {
      left: `${p.x}px`,
      top: `${p.y}px`,
      width: `${p.width}px`,
      height: `${p.height}px`,
    };
  }

  function keepPanel(panel) {
    const vv = window.visualViewport;
    const vw = vv?.width || innerWidth;
    const vh = vv?.height || innerHeight;
    const ox = vv?.offsetLeft || 0;
    const oy = vv?.offsetTop || 0;
    const width = clamp(panel.width, DETAILS_MIN_W, vw - EDGE_GAP * 2);
    const height = clamp(panel.height, DETAILS_MIN_H, vh - EDGE_GAP * 2);

    return {
      x: clamp(panel.x, ox + EDGE_GAP, ox + vw - width - EDGE_GAP),
      y: clamp(panel.y, oy + EDGE_GAP, oy + vh - height - EDGE_GAP),
      width,
      height,
    };
  }

  function intersects(a, b) {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  function safeCssEscape(value) {
    return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
  }

  function escapeHtml(value) {
    return Utils.escapeHtml(value);
    
    
    
    
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function trim(value, max) {
    return Utils.trimText(value, max)
    
    
    
    
    const text = String(value ?? "");

    return text.length > max ? `${text.slice(0, max)}…` : text;
  }

  function copyText(value) {
    return Utils.copyText(value);
    navigator.clipboard?.writeText?.(String(value ?? "")).catch(() => {});
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : min));
  }

  function isReactElement(element) { 
    return Utils.isReactElement(element);





 
    return Object.keys(element || {}).some((key) => key.startsWith("__reactFiber$") || key.startsWith("__reactProps$"));
  }

  function dedent(value) {
    return Utils.dedent(value);
    
    
    
    
    
    
    
    const lines = String(value).replace(/\r\n?/g, "\n").split("\n");

    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines.at(-1).trim()) lines.pop();

    const indent = lines.reduce((min, line) => {
      if (!line.trim()) return min;

      const size = line.match(/^\s*/)[0].length;

      return min == null ? size : Math.min(min, size);
    }, null);

    return indent ? lines.map((line) => line.slice(indent)).join("\n") : lines.join("\n");
  }

  function isColorProperty(property) {
    return /color|background|shadow|fill|stroke|caret|accent/i.test(property);
  }

  function looksLikeColor(value) {
    return /#|rgb\(|rgba\(|hsl\(|hsla\(|oklch\(|oklab\(/i.test(String(value || ""));
  }

  function normalizeColor(value) {
    return String(value || "").trim();
  }

  function toHexColor(value) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return "#000000";

    ctx.fillStyle = "#000";
    ctx.fillStyle = String(value || "#000");

    const color = ctx.fillStyle;

    return /^#[0-9a-f]{6}$/i.test(color) ? color : "#000000";
  }

  function waitForInspector() {
    return new Promise((resolve) => {
      const start = Date.now();
      const id = setInterval(() => {
        if (window[GLOBAL_NAME]) {
          clearInterval(id);
          resolve(window[GLOBAL_NAME]);
        } else if (Date.now() - start > READY_TIMEOUT_MS) {
          clearInterval(id);
          resolve(null);
        }
      }, READY_INTERVAL_MS);
    });
  }

  function debug(label, payload) {
    api?.debug?.log?.(`[elements] ${label}`, payload);
  }

  function getStyleText() {
    const { css } = api;
    
    return css`
      .ra-elements-plugin {
        height: 100%;
        min-height: 0;
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr);
        overflow: hidden;
        --el-font: 11.5px;
        --el-line: 1.45;
        --el-indent: 13px;
      }

      .ra-elements-toolbar {
        display: flex;
        gap: 5px;
        padding: 5px;
        border-bottom: 1px solid var(--ra-border);
        overflow-x: auto;
        background: rgb(8 9 11 / .78);
      }

      .ra-elements-toolbar button,
      .ra-elements-details button,
      .ra-elements-menu button {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-height: 28px;
        border: 1px solid var(--ra-border);
        border-radius: 999px;
        background: rgb(255 255 255 / .065);
        color: var(--ra-text);
        font: 800 11px / 1 var(--ra-font-ui);
        padding: 0 9px;
        white-space: nowrap;
      }

      .ra-elements-search {
        min-width: 130px;
        height: 28px;
        border: 1px solid var(--ra-border);
        border-radius: 999px;
        background: rgb(0 0 0 / .28);
        color: var(--ra-text);
        font: 600 16px / 1 var(--ra-font-ui);
        padding: 0 10px;
      }

      .ra-elements-breadcrumb {
        display: flex;
        gap: 3px;
        align-items: center;
        overflow-x: auto;
        padding: 4px 6px;
        border-bottom: 1px solid var(--ra-border);
        background: rgb(0 0 0 / .18);
      }

      .ra-elements-breadcrumb button {
        border: 0;
        background: transparent;
        color: var(--ra-muted);
        font: 750 10px / 1 var(--ra-font-mono);
        white-space: nowrap;
      }

      .ra-elements-tree {
        position: relative;
        min-height: 0;
        overflow: auto;
        font: 500 var(--el-font) / var(--el-line) var(--ra-font-mono);
        contain: strict;
        -webkit-overflow-scrolling: touch;
      }

      .ra-elements-spacer {
        width: 1px;
        pointer-events: none;
      }

      .ra-elements-rows {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        will-change: transform;
      }

      .ra-elements-row {
        height: ${TREE_ROW_HEIGHT}px;
        display: grid;
        grid-template-columns: calc(var(--depth, 0) * var(--el-indent)) 17px minmax(0, 1fr);
        align-items: center;
        gap: 2px;
        padding: 0 7px;
        color: var(--ra-text);
        white-space: pre;
      }

      .ra-elements-plugin.ra-wrap .ra-elements-row {
        white-space: pre-wrap;
        height: auto;
        min-height: ${TREE_ROW_HEIGHT}px;
        overflow-wrap: anywhere;
      }

      .ra-elements-row:hover,
      .ra-elements-selected {
        background: rgb(125 211 252 / .14);
      }

      .ra-elements-toggle {
        grid-column: 2;
        width: 16px;
        height: 16px;
        min-height: 16px;
        padding: 0;
        border: 0 !important;
        background: transparent !important;
      }

      .ra-elements-toggle:disabled {
        opacity: .08;
      }

      .ra-elements-tag {
        grid-column: 3;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ra-elements-tag-name,
      .ra-elements-punctuation {
        color: #ff7b72;
      }

      .ra-elements-attr {
        margin-left: 5px;
      }

      .ra-elements-attr-name {
        color: #a5d6ff;
      }

      .ra-elements-equals {
        color: var(--ra-muted);
      }

      .ra-elements-attr-value {
        color: #a5d6a7;
      }

      .ra-elements-text {
        grid-column: 3;
        color: var(--ra-muted);
      }

      .ra-elements-badge {
        margin-left: 5px;
        border: 1px solid rgb(125 211 252 / .3);
        border-radius: 999px;
        color: #7dd3fc;
        padding: 1px 5px;
        font: 850 9px / 1 var(--ra-font-ui);
      }

      .ra-elements-source-row {
        display: grid;
        gap: 4px;
        margin: 3px 8px 5px calc(22px + var(--depth) * var(--el-indent));
        padding: 6px;
        border: 1px solid var(--ra-border);
        border-radius: 10px;
        background: rgb(255 255 255 / .035);
      }

      .ra-elements-source-row pre {
        margin: 0;
        max-height: 84px;
        overflow: auto;
        white-space: pre-wrap;
        color: var(--ra-muted);
        font: 10px / 1.35 var(--ra-font-mono);
      }

      .ra-elements-menu {
        position: fixed;
        z-index: 2147483601;
        width: ${MENU_WIDTH}px;
        padding: ${MENU_PADDING}px;
        border: 1px solid var(--ra-border-strong);
        border-radius: 7px;
        background: rgb(16 17 20 / .88);
        box-shadow: 0 18px 60px rgb(0 0 0 / .6);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        user-select: none;
      }

      .ra-elements-menu button {
        width: 100%;
        height: ${MENU_ITEM_HEIGHT}px;
        justify-content: flex-start;
        border: 0;
        background: transparent;
        border-radius: 9px;
      }

      .ra-elements-menu button:hover {
        background: rgb(255 255 255 / .08);
      }

      .ra-elements-danger {
        color: #ff7b72 !important;
      }

      .ra-elements-details {
        position: fixed;
        z-index: 2147483500;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        overflow: hidden;
        border: 1px solid var(--ra-border-strong);
        border-radius: 18px;
        background: linear-gradient(180deg, rgb(18 19 23 / .98), rgb(7 8 10 / .98));
        box-shadow: 0 22px 80px rgb(0 0 0 / .66);
        pointer-events: auto;
      }

      .ra-elements-details-head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
        padding: 8px;
        border-bottom: 1px solid var(--ra-border);
        cursor: move;
      }

      .ra-elements-details-head strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ra-text);
        font: 900 11px / 1.2 var(--ra-font-mono);
      }

      .ra-elements-details-head div {
        display: flex;
        gap: 4px;
        overflow-x: auto;
      }

      .ra-elements-details button.active {
        background: rgb(125 211 252 / .17);
        border-color: rgb(125 211 252 / .45);
      }

      .ra-elements-details-body {
        min-height: 0;
        overflow: auto;
        padding: 8px;
      }

      .ra-elements-details-resize {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 28px;
        height: 28px;
        cursor: nwse-resize;
      }

      .ra-elements-details-resize:after {
        content: "";
        position: absolute;
        right: 7px;
        bottom: 7px;
        width: 10px;
        height: 10px;
        border-right: 2px solid var(--ra-muted);
        border-bottom: 2px solid var(--ra-muted);
      }

      .ra-elements-empty-details,
      .ra-elements-panel-note {
        color: var(--ra-muted);
        font: 750 11px / 1.4 var(--ra-font-ui);
        padding: 8px;
      }

      .ra-elements-editor {
        display: grid;
        gap: 6px;
      }

      .ra-elements-field {
        display: grid;
        grid-template-columns: minmax(90px, 120px) minmax(0, 1fr);
        gap: 7px;
        align-items: center;
        font: 650 11px / 1.25 var(--ra-font-ui);
      }

      .ra-elements-field > span {
        color: var(--ra-muted);
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ra-elements-field input,
      .ra-elements-field select,
      .ra-elements-field textarea {
        min-width: 0;
        border: 1px solid var(--ra-border);
        border-radius: 9px;
        background: rgb(255 255 255 / .055);
        color: var(--ra-text);
        font: 500 12px / 1.3 var(--ra-font-mono);
        padding: 6px 7px;
      }

      .ra-elements-field textarea {
        min-height: 70px;
        resize: vertical;
      }

      .ra-elements-value-wrap {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 6px;
      }

      .ra-color-dot {
        position: relative;
        width: 25px !important;
        height: 25px !important;
        min-height: 25px !important;
        padding: 0 !important;
        border-radius: 50% !important;
      }

      .ra-color-dot input {
        position: absolute;
        inset: 0;
        opacity: 0;
      }

      .ra-elements-rules {
        display: grid;
        gap: 8px;
      }

      .ra-rule {
        border: 1px solid var(--ra-border);
        border-radius: 12px;
        background: rgb(255 255 255 / .035);
        overflow: hidden;
      }

      .ra-rule header {
        display: grid;
        gap: 2px;
        padding: 8px;
        border-bottom: 1px solid var(--ra-border);
      }

      .ra-rule header strong {
        color: #a5d6ff;
        font: 850 11px / 1.2 var(--ra-font-mono);
      }

      .ra-rule header small {
        color: var(--ra-muted);
        font: 650 10px / 1.2 var(--ra-font-mono);
      }

      .ra-rule div {
        display: grid;
        grid-template-columns: minmax(120px, 1fr) minmax(0, 1.4fr);
        gap: 8px;
        padding: 4px 8px;
        font: 600 11px / 1.35 var(--ra-font-mono);
      }

      .ra-rule div span {
        color: #9cc2ff;
      }

      .ra-rule div b {
        color: #a5d6a7;
        font-weight: 500;
      }

      .ra-rule div.overridden {
        text-decoration: line-through;
        opacity: .45;
      }

      .ra-elements-box {
        display: grid;
        place-items: center;
        padding: 10px;
        font: 800 10px / 1 var(--ra-font-ui);
      }

      .ra-box-layer {
        display: grid;
        gap: 5px;
        place-items: center;
        border: 1px solid var(--ra-border);
        border-radius: 10px;
        padding: 7px;
      }

      .ra-box-layer > div {
        display: flex;
        align-items: center;
        gap: 7px;
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
        min-width: 86px;
        min-height: 40px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        background: rgb(125 211 252 / .16);
      }

      .ra-icon-fallback {
        display: inline-grid;
        place-items: center;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        background: rgb(255 255 255 / .11);
        font: 900 8px / 1 system-ui;
      }

      @media (max-width: 720px) {
        .ra-elements-details {
          left: 8px !important;
          right: 8px !important;
          width: auto !important;
          max-width: calc(100vw - 16px);
        }
      }
    `.trim();
  }
})();