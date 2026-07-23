(function RodObjectInspectorBundle(globalWindow) {
  "use strict";

  const VERSION = "3.0.0";
  const GLOBAL_NAME = "RodObjectInspector";
  const MAX_Z_INDEX = 2147483647;

  if (globalWindow[GLOBAL_NAME]) {
    return;
  }

  const DEFAULT_OPTIONS = {
    inspectDepth: 80,
    inspectItems: 1000,
    previewItems: 3,
    showPrototype: true,
    showNonEnumerable: false,
    showObjectLength: false,
    virtualize: true,
    virtualizeAfter: 60,
    virtualRowHeight: 24,
    virtualOverscan: 8,
    virtualMaxHeight: 360,
    unmountOnCollapse: true,
  };

  const CSS_TEXT = `
    .rod-inspector,
    .rod-inspector * {
      box-sizing: border-box;
    }

    .rod-inspector {
      display: inline-block;
      min-width: 0;
      max-width: 100%;
      color: rgba(250, 250, 250, 1);
      font: inherit;
    }

    .rod-inspector > summary {
      display: inline-flex;
      align-items: baseline;
      gap: 4px;
      max-width: 100%;
      border-radius: 3px;
      cursor: pointer;
      list-style: none;
      outline: none;
      user-select: text;
      touch-action: manipulation;
    }

    .rod-inspector > summary::-webkit-details-marker {
      display: none;
    }

    .rod-inspector > summary::before {
      content: "▸";
      flex: 0 0 auto;
      width: 10px;
      color: rgba(228, 228, 231, 1);
      font-size: 10px;
      line-height: 1.4;
      text-align: center;
      user-select: none;
    }

    .rod-inspector[open] > summary::before {
      content: "▾";
    }

    .rod-inspector__body {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
      padding: 4px 0 2px 14px;
    }

    .rod-inspector__body[data-virtualized="true"] {
      position: relative;
      display: block;
      width: 100%;
      max-height: var(--rod-inspector-virtual-max-height, 360px);
      overflow-x: auto;
      overflow-y: auto;
      padding: 3px 0 3px 14px;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      contain: layout style;
    }

    .rod-inspector__virtual-window {
      display: flex;
      flex-direction: column;
      min-width: max-content;
      width: 100%;
    }

    .rod-inspector__virtual-spacer {
      width: 1px;
      min-width: 1px;
      pointer-events: none;
    }

    .rod-inspector__virtual-row {
      display: block;
      min-width: 0;
      width: 100%;
      contain: layout style;
    }

    .rod-inspector__row {
      display: block;
      min-width: 0;
      min-height: 22px;
      padding: 1px 0 1px 2px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      content-visibility: auto;
      contain-intrinsic-size: auto 24px;
    }

    .rod-inspector__key {
      color: rgba(125, 211, 252, 1);
      font-weight: 500;
    }

    .rod-inspector__key[data-symbol="true"] {
      color: rgba(45, 212, 191, 1);
    }

    .rod-inspector__meta {
      color: rgba(228, 228, 231, 1);
      font-style: italic;
    }

    .rod-inspector__getter,
    .rod-inspector__inspect {
      appearance: none;
      border: 0;
      outline: none;
      color: inherit;
      background: transparent;
      font: inherit;
      touch-action: manipulation;
      cursor: pointer;
    }

    .rod-inspector__getter {
      margin-left: 2px;
      padding: 0 4px;
      border-radius: 4px;
      color: rgba(240, 171, 252, 1);
      font-weight: 600;
    }

    .rod-inspector__getter:hover,
    .rod-inspector__getter:focus-visible,
    .rod-inspector__inspect:hover,
    .rod-inspector__inspect:focus-visible {
      background: rgba(255, 255, 255, 0.12);
    }

    .rod-inspector__getter:focus-visible,
    .rod-inspector__inspect:focus-visible,
    .rod-inspector > summary:focus-visible {
      outline: 1px solid rgba(125, 211, 252, 1);
      outline-offset: 1px;
    }

    .rod-inspector__badge {
      display: inline-block;
      margin-left: 5px;
      padding: 0 4px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 4px;
      color: rgba(228, 228, 231, 0.96);
      font: 600 9px/1.5 ui-sans-serif, system-ui, sans-serif;
      vertical-align: 1px;
      user-select: none;
    }

    .rod-inspector__inspect {
      display: inline-grid;
      place-items: center;
      width: 21px;
      height: 21px;
      margin-left: 3px;
      border-radius: 4px;
      color: rgba(45, 212, 191, 1);
      font: 700 13px/1 ui-sans-serif, system-ui, sans-serif;
      vertical-align: -4px;
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

    .rod-token--circular {
      color: rgba(251, 191, 36, 1);
    }

    .rod-dom-tag {
      color: rgba(96, 165, 250, 1);
    }

    .rod-dom-id {
      color: rgba(125, 211, 252, 1);
      font-weight: 600;
    }

    .rod-dom-class {
      color: rgba(253, 186, 116, 1);
    }

    .rod-inspector__loading {
      color: rgba(212, 212, 216, 0.9);
      font-style: italic;
    }
  `;

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

  function safeObjectTag(value) {
    return safeCall(
      () => Object.prototype.toString.call(value),
      "[object Unknown]",
    );
  }

  function safeKeyText(key) {
    if (typeof key === "symbol") {
      return safeCall(() => key.toString(), "Symbol(?)");
    }

    return String(key);
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
      return safeKeyText(value);
    }

    if (typeof value === "function") {
      const descriptor = safeCall(
        () => Object.getOwnPropertyDescriptor(value, "name"),
        null,
      );
      const name =
        descriptor && typeof descriptor.value === "string"
          ? descriptor.value
          : "anonymous";

      return `ƒ ${name || "anonymous"}()`;
    }

    return String(value);
  }

  function safeGetConstructorName(value) {
    let prototype = safeCall(() => Object.getPrototypeOf(value), null);
    let depth = 0;

    while (prototype && depth < 3) {
      const descriptor = safeCall(
        () => Object.getOwnPropertyDescriptor(prototype, "constructor"),
        null,
      );

      if (descriptor && typeof descriptor.value === "function") {
        const nameDescriptor = safeCall(
          () => Object.getOwnPropertyDescriptor(descriptor.value, "name"),
          null,
        );

        if (nameDescriptor && typeof nameDescriptor.value === "string") {
          return nameDescriptor.value || "Object";
        }
      }

      prototype = safeCall(() => Object.getPrototypeOf(prototype), null);
      depth += 1;
    }

    return "Object";
  }

  function isDomNode(value) {
    if (!value || typeof value !== "object") {
      return false;
    }

    return safeCall(
      () =>
        typeof value.nodeType === "number" &&
        typeof value.nodeName === "string" &&
        Boolean(value.ownerDocument || value.nodeType === 9),
      false,
    );
  }

  function isDomElement(value) {
    return (
      isDomNode(value) &&
      safeCall(
        () => value.nodeType === 1 && typeof value.tagName === "string",
        false,
      )
    );
  }

  function isMap(value) {
    return safeObjectTag(value) === "[object Map]";
  }

  function isSet(value) {
    return safeObjectTag(value) === "[object Set]";
  }

  function isError(value) {
    const tag = safeObjectTag(value);
    return tag === "[object Error]" || /Error\]$/.test(tag);
  }

  function isDate(value) {
    return safeObjectTag(value) === "[object Date]";
  }

  function isRegExp(value) {
    return safeObjectTag(value) === "[object RegExp]";
  }

  function normalizeOptions(options = {}) {
    return {
      inspectDepth: Number.isFinite(options.inspectDepth)
        ? Math.max(0, Number(options.inspectDepth))
        : DEFAULT_OPTIONS.inspectDepth,
      inspectItems: Number.isFinite(options.inspectItems)
        ? Math.max(0, Number(options.inspectItems))
        : DEFAULT_OPTIONS.inspectItems,
      previewItems: Number.isFinite(options.previewItems)
        ? Math.max(0, Number(options.previewItems))
        : DEFAULT_OPTIONS.previewItems,
      showPrototype: options.showPrototype ?? DEFAULT_OPTIONS.showPrototype,
      showNonEnumerable:
        options.showNonEnumerable ?? DEFAULT_OPTIONS.showNonEnumerable,
      showObjectLength:
        options.showObjectLength ?? DEFAULT_OPTIONS.showObjectLength,
      virtualize: options.virtualize ?? DEFAULT_OPTIONS.virtualize,
      virtualizeAfter: Number.isFinite(options.virtualizeAfter)
        ? Math.max(1, Number(options.virtualizeAfter))
        : DEFAULT_OPTIONS.virtualizeAfter,
      virtualRowHeight: Number.isFinite(options.virtualRowHeight)
        ? Math.max(16, Number(options.virtualRowHeight))
        : DEFAULT_OPTIONS.virtualRowHeight,
      virtualOverscan: Number.isFinite(options.virtualOverscan)
        ? Math.max(1, Number(options.virtualOverscan))
        : DEFAULT_OPTIONS.virtualOverscan,
      virtualMaxHeight: Number.isFinite(options.virtualMaxHeight)
        ? Math.max(120, Number(options.virtualMaxHeight))
        : DEFAULT_OPTIONS.virtualMaxHeight,
      unmountOnCollapse:
        options.unmountOnCollapse ?? DEFAULT_OPTIONS.unmountOnCollapse,
    };
  }

  function createStyle(documentRef) {
    const style = documentRef.createElement("style");
    style.setAttribute("data-rod-object-inspector-style", VERSION);
    style.textContent = CSS_TEXT;
    return style;
  }

  function createInspector(runtimeOptions = {}) {
    const defaultWindow = runtimeOptions.window || globalWindow;
    const defaultDocument =
      runtimeOptions.document || defaultWindow.document || globalWindow.document;
    const maxZIndex = Number(runtimeOptions.maxZIndex) || MAX_Z_INDEX;
    const baseOptions = normalizeOptions(runtimeOptions.options || {});
    const objectIds = new WeakMap();
    let nextObjectId = 1;
    let highlight = null;

    function getHost() {
      if (typeof runtimeOptions.getHost === "function") {
        const host = safeCall(() => runtimeOptions.getHost(), null);

        if (host?.window && host?.document) {
          return host;
        }
      }

      return {
        window: defaultWindow,
        document: defaultDocument,
      };
    }

    function getObjectId(value) {
      if (
        value === null ||
        (typeof value !== "object" && typeof value !== "function")
      ) {
        return null;
      }

      const knownId = objectIds.get(value);

      if (knownId) {
        return knownId;
      }

      const id = nextObjectId;
      nextObjectId += 1;
      objectIds.set(value, id);
      return id;
    }

    function getElementPreviewParts(element) {
      const tagName = safeCall(
        () => String(element.tagName || element.nodeName).toLowerCase(),
        "element",
      );
      const id = safeCall(
        () => (typeof element.id === "string" ? element.id : ""),
        "",
      );
      const className = safeCall(
        () => (typeof element.className === "string" ? element.className : ""),
        "",
      );
      const classes = className.trim().split(/\s+/).filter(Boolean).slice(0, 8);

      return { tagName, id, classes };
    }

    function getElementPreviewText(element) {
      const parts = getElementPreviewParts(element);
      const id = parts.id ? `#${parts.id}` : "";
      const classes = parts.classes.map((name) => `.${name}`).join("");
      return `<${parts.tagName}${id}${classes}>`;
    }

    function getInlinePreview(value) {
      if (value === null || typeof value !== "object") {
        const text = safePrimitiveText(value, true);
        return text.length > 80 ? `${text.slice(0, 77)}…` : text;
      }

      if (isDomElement(value)) {
        return getElementPreviewText(value);
      }

      if (Array.isArray(value)) {
        return `Array(${value.length})`;
      }

      if (isMap(value)) {
        return `Map(${safeCall(() => value.size, "?")})`;
      }

      if (isSet(value)) {
        return `Set(${safeCall(() => value.size, "?")})`;
      }

      if (isError(value)) {
        return safeCall(
          () => `${value.name || "Error"}: ${value.message || ""}`,
          "Error",
        );
      }

      return `${safeGetConstructorName(value)} {…}`;
    }

    function getPreviewOwnEntries(value, maxItems) {
      const keys = safeCall(() => Reflect.ownKeys(value), []);
      const items = [];
      let hasMore = false;

      for (const key of keys) {
        if (items.length >= maxItems) {
          hasMore = true;
          break;
        }

        const descriptor = safeCall(
          () => Object.getOwnPropertyDescriptor(value, key),
          null,
        );

        if (!descriptor || !descriptor.enumerable) {
          continue;
        }

        items.push({
          key,
          descriptor,
        });
      }

      return { items, hasMore };
    }

    function getObjectPreview(value, options = baseOptions) {
      const normalized = normalizeOptions({ ...baseOptions, ...options });
      const previewItems = normalized.previewItems;
      const id = getObjectId(value);
      const idSuffix = id ? ` #${id}` : "";

      if (isDomElement(value)) {
        return `${getElementPreviewText(value)}${idSuffix}`;
      }

      if (Array.isArray(value)) {
        const parts = [];
        const count = Math.min(value.length, previewItems);

        for (let index = 0; index < count; index += 1) {
          const descriptor = safeCall(
            () => Object.getOwnPropertyDescriptor(value, String(index)),
            null,
          );

          if (!descriptor) {
            parts.push("empty");
          } else if (hasOwn(descriptor, "value")) {
            parts.push(getInlinePreview(descriptor.value));
          } else {
            parts.push("(…)");
          }
        }

        const suffix = value.length > count ? ", …" : "";
        return `Array(${value.length})${idSuffix} [${parts.join(", ")}${suffix}]`;
      }

      if (isMap(value)) {
        const size = safeCall(() => value.size, "?");
        const parts = [];
        const iterator = safeCall(
          () => Reflect.apply(Map.prototype.entries, value, []),
          null,
        );

        if (iterator) {
          for (let index = 0; index < previewItems; index += 1) {
            const step = safeCall(() => iterator.next(), { done: true });

            if (step.done) {
              break;
            }

            parts.push(
              `${getInlinePreview(step.value[0])} => ${getInlinePreview(step.value[1])}`,
            );
          }
        }

        const suffix = Number(size) > parts.length ? ", …" : "";
        return `Map(${size})${idSuffix} {${parts.join(", ")}${suffix}}`;
      }

      if (isSet(value)) {
        const size = safeCall(() => value.size, "?");
        const parts = [];
        const iterator = safeCall(
          () => Reflect.apply(Set.prototype.values, value, []),
          null,
        );

        if (iterator) {
          for (let index = 0; index < previewItems; index += 1) {
            const step = safeCall(() => iterator.next(), { done: true });

            if (step.done) {
              break;
            }

            parts.push(getInlinePreview(step.value));
          }
        }

        const suffix = Number(size) > parts.length ? ", …" : "";
        return `Set(${size})${idSuffix} {${parts.join(", ")}${suffix}}`;
      }

      if (isError(value)) {
        const name = safeCall(() => String(value.name || "Error"), "Error");
        const message = safeCall(() => String(value.message || ""), "");
        return `${name}${idSuffix}${message ? `: ${message}` : ""}`;
      }

      if (isDate(value)) {
        const text = safeCall(
          () => Reflect.apply(Date.prototype.toISOString, value, []),
          "Invalid Date",
        );
        return `Date${idSuffix} ${text}`;
      }

      if (isRegExp(value)) {
        const text = safeCall(
          () => Reflect.apply(RegExp.prototype.toString, value, []),
          "/?/",
        );
        return `RegExp${idSuffix} ${text}`;
      }

      const constructorName = safeGetConstructorName(value);
      const preview = getPreviewOwnEntries(value, previewItems);
      const parts = preview.items.map(({ key, descriptor }) => {
        const keyText = safeKeyText(key);

        if (!hasOwn(descriptor, "value")) {
          return `${keyText}: (…)`;
        }

        return `${keyText}: ${getInlinePreview(descriptor.value)}`;
      });
      const suffix = preview.hasMore ? ", …" : "";
      const lengthSuffix = normalized.showObjectLength
        ? safeCall(() => ` (${Reflect.ownKeys(value).length})`, "")
        : "";

      return `${constructorName}${idSuffix}${lengthSuffix} {${parts.join(", ")}${suffix}}`;
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

    function createElementPreviewNode(element, documentRef) {
      const wrapper = documentRef.createElement("span");
      const parts = getElementPreviewParts(element);

      wrapper.appendChild(createTextNode(documentRef, "<", "rod-dom-tag"));
      wrapper.appendChild(
        createTextNode(documentRef, parts.tagName, "rod-dom-tag"),
      );

      if (parts.id) {
        wrapper.appendChild(
          createTextNode(documentRef, `#${parts.id}`, "rod-dom-id"),
        );
      }

      for (const className of parts.classes) {
        wrapper.appendChild(
          createTextNode(documentRef, `.${className}`, "rod-dom-class"),
        );
      }

      wrapper.appendChild(createTextNode(documentRef, ">", "rod-dom-tag"));

      const id = getObjectId(element);

      if (id) {
        wrapper.appendChild(
          createTextNode(documentRef, ` #${id}`, "rod-token--meta"),
        );
      }

      return wrapper;
    }

    function clearHighlight() {
      if (highlight?.remove) {
        safeCall(() => highlight.remove(), undefined);
      }

      highlight = null;
    }

    function getRectRelativeToWindow(element, targetWindow) {
      const rect = safeCall(() => element.getBoundingClientRect(), null);

      if (!rect) {
        return null;
      }

      let left = rect.left;
      let top = rect.top;
      let currentWindow = safeCall(
        () => element.ownerDocument.defaultView,
        null,
      );

      while (currentWindow && currentWindow !== targetWindow) {
        const frameElement = safeCall(() => currentWindow.frameElement, null);

        if (!frameElement) {
          break;
        }

        const frameRect = safeCall(
          () => frameElement.getBoundingClientRect(),
          null,
        );

        if (!frameRect) {
          break;
        }

        left += frameRect.left + (frameElement.clientLeft || 0);
        top += frameRect.top + (frameElement.clientTop || 0);
        currentWindow = safeCall(
          () => frameElement.ownerDocument.defaultView,
          null,
        );
      }

      return { left, top, width: rect.width, height: rect.height };
    }

    function highlightElement(element) {
      clearHighlight();

      if (!isDomElement(element)) {
        return;
      }

      const host = getHost();
      const rect = getRectRelativeToWindow(element, host.window);

      if (!rect) {
        return;
      }

      const overlay = host.document.createElement("div");
      overlay.setAttribute("aria-hidden", "true");

      Object.assign(overlay.style, {
        position: "fixed",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${Math.max(0, rect.width)}px`,
        height: `${Math.max(0, rect.height)}px`,
        zIndex: String(maxZIndex - 1),
        pointerEvents: "none",
        border: "1px solid rgba(125, 211, 252, 1)",
        background: "rgba(56, 189, 248, 0.2)",
        boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.22)",
      });

      const parent = host.document.body || host.document.documentElement;

      if (!parent) {
        return;
      }

      parent.appendChild(overlay);
      highlight = overlay;
    }

    function inspectElement(element) {
      safeCall(
        () =>
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          }),
        undefined,
      );

      highlightElement(element);
      getHost().window.setTimeout(clearHighlight, 1200);
    }

    function createInspectButton(element, documentRef) {
      const button = documentRef.createElement("button");
      button.type = "button";
      button.className = "rod-inspector__inspect";
      button.textContent = "◎";
      button.setAttribute("aria-label", "Inspect element on page");
      button.title = "Inspect element on page";

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        inspectElement(element);
      });

      button.addEventListener("pointerenter", () => highlightElement(element));
      button.addEventListener("pointerleave", clearHighlight);

      return button;
    }

    function createDataEntry(key, descriptor, owner) {
      if (!descriptor) {
        return {
          kind: "empty",
          key,
          value: undefined,
          enumerable: true,
        };
      }

      if (hasOwn(descriptor, "value")) {
        return {
          kind: "data",
          key,
          value: descriptor.value,
          enumerable: Boolean(descriptor.enumerable),
        };
      }

      return {
        kind: "accessor",
        key,
        owner,
        getter: descriptor.get,
        setter: descriptor.set,
        enumerable: Boolean(descriptor.enumerable),
      };
    }

    function createArraySource(value, options) {
      const limit = Math.min(value.length, options.inspectItems);

      return {
        count: limit,
        total: value.length,
        hasMore: value.length > limit,
        get(index) {
          const key = String(index);
          const descriptor = safeCall(
            () => Object.getOwnPropertyDescriptor(value, key),
            null,
          );
          return createDataEntry(index, descriptor, value);
        },
      };
    }

    function createObjectSource(value, options) {
      const keys = safeCall(() => Reflect.ownKeys(value), []);
      const eligibleKeys = [];
      let hasMore = false;

      for (const key of keys) {
        const descriptor = safeCall(
          () => Object.getOwnPropertyDescriptor(value, key),
          null,
        );

        if (!descriptor) {
          continue;
        }

        if (!options.showNonEnumerable && !descriptor.enumerable) {
          continue;
        }

        if (eligibleKeys.length >= options.inspectItems) {
          hasMore = true;
          break;
        }

        eligibleKeys.push(key);
      }

      return {
        count: eligibleKeys.length,
        total: hasMore ? null : eligibleKeys.length,
        hasMore,
        get(index) {
          const key = eligibleKeys[index];
          const descriptor = safeCall(
            () => Object.getOwnPropertyDescriptor(value, key),
            null,
          );
          return createDataEntry(key, descriptor, value);
        },
      };
    }

    function createIteratorSource(value, options, kind) {
      const size = safeCall(() => value.size, 0);
      const count = Math.min(Number(size) || 0, options.inspectItems);
      const cache = [];
      const iterator = safeCall(
        () =>
          kind === "map"
            ? Reflect.apply(Map.prototype.entries, value, [])
            : Reflect.apply(Set.prototype.values, value, []),
        null,
      );
      let exhausted = !iterator;

      function ensure(index) {
        while (!exhausted && cache.length <= index) {
          const step = safeCall(() => iterator.next(), { done: true });

          if (step.done) {
            exhausted = true;
            break;
          }

          cache.push(step.value);
        }
      }

      return {
        count,
        total: Number(size) || count,
        hasMore: Number(size) > count,
        get(index) {
          ensure(index);
          const item = cache[index];

          if (kind === "map") {
            return {
              kind: "data",
              key: `${index}: ${getInlinePreview(item?.[0])}`,
              value: item?.[1],
              enumerable: true,
            };
          }

          return {
            kind: "data",
            key: index,
            value: item,
            enumerable: true,
          };
        },
      };
    }

    function createDomSource(element, options) {
      const attributes = safeCall(() => element.attributes, null);
      const childNodes = safeCall(() => element.childNodes, null);
      const attributeCount = Number(attributes?.length) || 0;
      const childIndexes = [];

      if (childNodes) {
        for (let index = 0; index < childNodes.length; index += 1) {
          const child = childNodes[index];
          const nodeType = safeCall(() => child.nodeType, 0);

          if (nodeType === 3 && !safeCall(() => child.textContent.trim(), "")) {
            continue;
          }

          childIndexes.push(index);
        }
      }

      const total = attributeCount + childIndexes.length;
      const count = Math.min(total, options.inspectItems);

      return {
        count,
        total,
        hasMore: total > count,
        get(index) {
          if (index < attributeCount) {
            const attribute = attributes[index];
            return {
              kind: "data",
              key: `@${attribute.name}`,
              value: attribute.value,
              enumerable: true,
            };
          }

          const childIndex = childIndexes[index - attributeCount];
          const child = childNodes[childIndex];
          const nodeType = safeCall(() => child.nodeType, 0);
          const childValue =
            nodeType === 3
              ? safeCall(() => child.textContent.trim(), "")
              : child;

          return {
            kind: "data",
            key: index - attributeCount,
            value: childValue,
            enumerable: true,
          };
        },
      };
    }

    function createErrorSource(value, options) {
      const preferred = ["name", "message", "stack", "cause"];
      const seen = new Set();
      const entries = [];

      for (const key of preferred) {
        const descriptor = safeCall(
          () => Object.getOwnPropertyDescriptor(value, key),
          null,
        );

        if (!descriptor) {
          continue;
        }

        seen.add(key);
        entries.push(createDataEntry(key, descriptor, value));
      }

      const keys = safeCall(() => Reflect.ownKeys(value), []);
      let hasMore = false;

      for (const key of keys) {
        if (seen.has(key)) {
          continue;
        }

        const descriptor = safeCall(
          () => Object.getOwnPropertyDescriptor(value, key),
          null,
        );

        if (!descriptor) {
          continue;
        }

        if (!options.showNonEnumerable && !descriptor.enumerable) {
          continue;
        }

        if (entries.length >= options.inspectItems) {
          hasMore = true;
          break;
        }

        entries.push(createDataEntry(key, descriptor, value));
      }

      const limited = entries.slice(0, options.inspectItems);

      return {
        count: limited.length,
        total: hasMore ? null : limited.length,
        hasMore,
        get(index) {
          return limited[index];
        },
      };
    }

    function withPrototype(source, value, options) {
      if (!options.showPrototype || source.count >= options.inspectItems) {
        return source;
      }

      const prototype = safeCall(() => Object.getPrototypeOf(value), null);

      if (!prototype) {
        return source;
      }

      const baseCount = source.count;

      return {
        count: baseCount + 1,
        total: source.total == null ? null : source.total + 1,
        hasMore: source.hasMore,
        get(index) {
          if (index < baseCount) {
            return source.get(index);
          }

          return {
            kind: "prototype",
            key: "[[Prototype]]",
            value: prototype,
            enumerable: false,
          };
        },
      };
    }

    function createEntrySource(value, options) {
      let source;

      if (isDomElement(value)) {
        source = createDomSource(value, options);
      } else if (Array.isArray(value)) {
        source = createArraySource(value, options);
      } else if (isMap(value)) {
        source = createIteratorSource(value, options, "map");
      } else if (isSet(value)) {
        source = createIteratorSource(value, options, "set");
      } else if (isError(value)) {
        source = createErrorSource(value, options);
      } else {
        source = createObjectSource(value, options);
      }

      return withPrototype(source, value, options);
    }

    function createPropertyKeyNode(documentRef, key) {
      const node = documentRef.createElement("span");
      node.className = "rod-inspector__key";
      node.textContent = safeKeyText(key);

      if (typeof key === "symbol") {
        node.dataset.symbol = "true";
      }

      return node;
    }

    function createAccessorValue(documentRef, entry, context) {
      const wrapper = documentRef.createElement("span");
      const button = documentRef.createElement("button");
      button.type = "button";
      button.className = "rod-inspector__getter";
      button.textContent = "(…)";
      button.title = entry.getter ? "Invoke getter" : "Setter-only property";
      button.setAttribute(
        "aria-label",
        entry.getter ? "Invoke getter" : "Setter-only property",
      );

      if (!entry.getter) {
        button.disabled = true;
      }

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!entry.getter || button.dataset.invoked === "true") {
          return;
        }

        button.dataset.invoked = "true";
        const result = safeCall(
          () => ({
            value: Reflect.apply(entry.getter, entry.owner, []),
          }),
          null,
        );

        wrapper.replaceChildren();

        if (!result) {
          wrapper.appendChild(
            createTextNode(documentRef, "[Getter threw]", "rod-token--circular"),
          );
          return;
        }

        wrapper.appendChild(
          renderValue(result.value, documentRef, {
            ...context,
            quoteStrings: true,
          }),
        );
      });

      wrapper.appendChild(button);

      if (entry.getter) {
        wrapper.appendChild(
          createTextNode(documentRef, "get", "rod-inspector__badge"),
        );
      }

      if (entry.setter) {
        wrapper.appendChild(
          createTextNode(documentRef, "set", "rod-inspector__badge"),
        );
      }

      return wrapper;
    }

    function createPropertyRow(documentRef, entry, context) {
      const row = documentRef.createElement("div");
      row.className = "rod-inspector__row";
      row.appendChild(createPropertyKeyNode(documentRef, entry.key));
      row.appendChild(createTextNode(documentRef, ": ", "rod-token--meta"));

      if (entry.kind === "accessor") {
        row.appendChild(createAccessorValue(documentRef, entry, context));
      } else if (entry.kind === "empty") {
        row.appendChild(
          createTextNode(documentRef, "empty", "rod-inspector__meta"),
        );
      } else {
        row.appendChild(
          renderValue(entry.value, documentRef, {
            ...context,
            quoteStrings: true,
          }),
        );
      }

      if (entry.enumerable === false && entry.kind !== "prototype") {
        row.appendChild(
          createTextNode(documentRef, " non-enum", "rod-inspector__badge"),
        );
      }

      return row;
    }

    function createInspectorSummary(value, documentRef, options) {
      const fragment = documentRef.createDocumentFragment();

      if (isDomElement(value)) {
        fragment.appendChild(createElementPreviewNode(value, documentRef));
        fragment.appendChild(createInspectButton(value, documentRef));
        return fragment;
      }

      fragment.appendChild(
        createTextNode(documentRef, getObjectPreview(value, options), ""),
      );

      return fragment;
    }

    function createVirtualList(body, source, documentRef, context) {
      const options = context.options;
      const count = source.count;
      const estimatedHeight = options.virtualRowHeight;
      const overscan = options.virtualOverscan;
      const heights = new Array(count).fill(estimatedHeight);
      const topSpacer = documentRef.createElement("div");
      const windowNode = documentRef.createElement("div");
      const bottomSpacer = documentRef.createElement("div");
      const observedRows = new Map();
      let resizeObserver = null;
      let frame = null;
      let destroyed = false;
      let lastStart = -1;
      let lastEnd = -1;

      body.dataset.virtualized = "true";
      body.style.setProperty(
        "--rod-inspector-virtual-max-height",
        `${options.virtualMaxHeight}px`,
      );
      topSpacer.className = "rod-inspector__virtual-spacer";
      windowNode.className = "rod-inspector__virtual-window";
      bottomSpacer.className = "rod-inspector__virtual-spacer";
      body.replaceChildren(topSpacer, windowNode, bottomSpacer);

      function totalHeight() {
        let total = 0;

        for (let index = 0; index < heights.length; index += 1) {
          total += heights[index];
        }

        return total;
      }

      function offsetFor(index) {
        let offset = 0;

        for (let cursor = 0; cursor < index; cursor += 1) {
          offset += heights[cursor];
        }

        return offset;
      }

      function findIndexAtOffset(offset) {
        let low = 0;
        let high = count;
        let accumulated = 0;

        // Count is capped by inspectItems. A linear pass avoids maintaining a
        // second prefix-sum tree and is fast for the usual <= 1000 entries.
        for (let index = 0; index < count; index += 1) {
          const next = accumulated + heights[index];

          if (next > offset) {
            return index;
          }

          accumulated = next;
          low = index + 1;
        }

        return clamp(low, 0, Math.max(0, high - 1));
      }

      function disconnectObservedRows() {
        if (resizeObserver) {
          for (const row of observedRows.keys()) {
            resizeObserver.unobserve(row);
          }
        }

        observedRows.clear();
      }

      function measureRows() {
        if (destroyed) {
          return;
        }

        let changed = false;

        for (const [row, index] of observedRows) {
          const height = Math.max(
            estimatedHeight,
            Math.ceil(row.getBoundingClientRect().height),
          );

          if (Math.abs(heights[index] - height) > 1) {
            heights[index] = height;
            changed = true;
          }
        }

        if (changed) {
          scheduleRender(true);
        }
      }

      function render(force = false) {
        frame = null;

        if (destroyed || count <= 0) {
          return;
        }

        const scrollTop = body.scrollTop;
        const viewportHeight = Math.max(
          estimatedHeight,
          body.clientHeight || options.virtualMaxHeight,
        );
        const firstVisible = findIndexAtOffset(scrollTop);
        const lastVisible = findIndexAtOffset(scrollTop + viewportHeight);
        const start = Math.max(0, firstVisible - overscan);
        const end = Math.min(count, lastVisible + overscan + 1);

        if (!force && start === lastStart && end === lastEnd) {
          return;
        }

        lastStart = start;
        lastEnd = end;
        disconnectObservedRows();
        windowNode.replaceChildren();

        const fragment = documentRef.createDocumentFragment();

        for (let index = start; index < end; index += 1) {
          const wrapper = documentRef.createElement("div");
          wrapper.className = "rod-inspector__virtual-row";
          wrapper.dataset.virtualIndex = String(index);
          wrapper.appendChild(
            createPropertyRow(documentRef, source.get(index), context),
          );
          fragment.appendChild(wrapper);
          observedRows.set(wrapper, index);
        }

        windowNode.appendChild(fragment);
        topSpacer.style.height = `${offsetFor(start)}px`;
        bottomSpacer.style.height = `${Math.max(
          0,
          totalHeight() - offsetFor(end),
        )}px`;

        if (resizeObserver) {
          for (const row of observedRows.keys()) {
            resizeObserver.observe(row);
          }
        } else {
          const requestFrame =
            typeof defaultWindow.requestAnimationFrame === "function"
              ? defaultWindow.requestAnimationFrame.bind(defaultWindow)
              : (callback) => defaultWindow.setTimeout(callback, 0);
          requestFrame(measureRows);
        }
      }

      function scheduleRender(force = false) {
        if (destroyed) {
          return;
        }

        if (force) {
          lastStart = -1;
          lastEnd = -1;
        }

        if (frame !== null) {
          return;
        }

        const requestFrame =
          typeof defaultWindow.requestAnimationFrame === "function"
            ? defaultWindow.requestAnimationFrame.bind(defaultWindow)
            : (callback) => defaultWindow.setTimeout(callback, 0);

        frame = requestFrame(() => render(force));
      }

      if (typeof defaultWindow.ResizeObserver === "function") {
        resizeObserver = new defaultWindow.ResizeObserver(() => {
          measureRows();
        });
      }

      body.addEventListener("scroll", scheduleRender, { passive: true });
      scheduleRender(true);

      return {
        destroy() {
          if (destroyed) {
            return;
          }

          destroyed = true;
          body.removeEventListener("scroll", scheduleRender);
          disconnectObservedRows();
          resizeObserver?.disconnect();

          if (frame !== null && typeof defaultWindow.cancelAnimationFrame === "function") {
            defaultWindow.cancelAnimationFrame(frame);
          }

          body.removeAttribute("data-virtualized");
          body.style.removeProperty("--rod-inspector-virtual-max-height");
        },
      };
    }

    function appendRemainingMeta(body, source, documentRef) {
      if (!source.hasMore) {
        return;
      }

      const remaining =
        source.total == null
          ? null
          : Math.max(0, Number(source.total) - Number(source.count));
      const text = remaining
        ? `… ${remaining} more properties`
        : "… more properties";

      body.appendChild(
        createTextNode(documentRef, text, "rod-inspector__meta"),
      );
    }

    function mountInspectorBody(body, source, documentRef, context) {
      if (!source.count) {
        body.replaceChildren(
          createTextNode(
            documentRef,
            "No inspectable properties",
            "rod-inspector__meta",
          ),
        );
        return null;
      }

      const shouldVirtualize =
        context.options.virtualize &&
        source.count >= context.options.virtualizeAfter;

      if (shouldVirtualize) {
        const virtualizer = createVirtualList(
          body,
          source,
          documentRef,
          context,
        );
        appendRemainingMeta(body, source, documentRef);
        return virtualizer;
      }

      body.removeAttribute("data-virtualized");
      body.replaceChildren();
      const fragment = documentRef.createDocumentFragment();

      for (let index = 0; index < source.count; index += 1) {
        fragment.appendChild(
          createPropertyRow(documentRef, source.get(index), context),
        );
      }

      body.appendChild(fragment);
      appendRemainingMeta(body, source, documentRef);
      return null;
    }

    function renderObject(value, documentRef, context) {
      const details = documentRef.createElement("details");
      const summary = documentRef.createElement("summary");
      const body = documentRef.createElement("div");
      let initialized = false;
      let virtualizer = null;

      details.className = "rod-inspector";
      body.className = "rod-inspector__body";
      summary.appendChild(
        createInspectorSummary(value, documentRef, context.options),
      );
      details.appendChild(summary);
      details.appendChild(body);

      function initialize() {
        if (initialized) {
          return;
        }

        initialized = true;
        const source = createEntrySource(value, context.options);
        virtualizer = mountInspectorBody(body, source, documentRef, context);
      }

      function release() {
        if (!initialized || !context.options.unmountOnCollapse) {
          return;
        }

        virtualizer?.destroy();
        virtualizer = null;
        body.replaceChildren();
        body.removeAttribute("data-virtualized");
        initialized = false;
      }

      details.addEventListener("toggle", () => {
        if (details.open) {
          initialize();
        } else {
          release();
        }
      });

      return details;
    }

    function renderValue(value, documentRef = defaultDocument, context = {}) {
      const options = normalizeOptions({
        ...baseOptions,
        ...(context.options || {}),
      });
      const depth = Number(context.depth) || 0;
      const ancestors = context.ancestors || new Set();

      if (value === null || typeof value !== "object") {
        return renderPrimitive(value, documentRef, context);
      }

      if (ancestors.has(value)) {
        const preview = getObjectPreview(value, options);
        return createTextNode(
          documentRef,
          `↩ ${preview}`,
          "rod-token--circular",
        );
      }

      if (depth >= options.inspectDepth) {
        return createTextNode(
          documentRef,
          getObjectPreview(value, options),
          "rod-token--meta",
        );
      }

      const nextAncestors = new Set(ancestors);
      nextAncestors.add(value);

      return renderObject(value, documentRef, {
        ...context,
        depth: depth + 1,
        ancestors: nextAncestors,
        options,
      });
    }

    return {
      version: VERSION,
      render: renderValue,
      renderValue,
      getObjectPreview,
      getInlinePreview,
      isDomElement,
      highlightElement,
      clearHighlight,
      destroy() {
        clearHighlight();
      },
    };
  }

  const api = {
    version: VERSION,
    defaults: { ...DEFAULT_OPTIONS },
    cssText: CSS_TEXT,
    create: createInspector,
    createStyle,
  };

  Object.defineProperty(globalWindow, GLOBAL_NAME, {
    value: api,
    configurable: true,
    writable: true,
  });
})(window);
