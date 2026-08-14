/* Auto-generated from object-inspector/object-inspector.ts. at 8/14/2026, 6:34:09 PM Do not edit directly. */
var RodObjectInspector = (function() {

//#region \0rolldown/runtime.js
	var __defProp = Object.defineProperty;
	var __exportAll = (all, no_symbols) => {
		let target = {};
		for (var name in all) {
			__defProp(target, name, {
				get: all[name],
				enumerable: true
			});
		}
		if (!no_symbols) {
			__defProp(target, Symbol.toStringTag, { value: "Module" });
		}
		return target;
	};

//#endregion
//#region object-inspector/object-inspector.ts
	var object_inspector_exports = /* @__PURE__ */ __exportAll({});
	(function RodObjectInspectorBundle(suppliedGlobal) {
		"use strict";
		const VERSION = "3.2.0";
		const GLOBAL_NAME = "RodObjectInspector";
		const API_SYMBOL = Symbol.for("rod.object-inspector.api");
		const MAX_Z_INDEX = 2147483647;
		const MAX_SAFE_ITEMS = 1e5;
		const VALID_THEMES = /* @__PURE__ */ new Set([
			"auto",
			"dark",
			"light"
		]);
		const styledRoots = /* @__PURE__ */ new WeakSet();
		const objectToString = Object.prototype.toString;
		const mapSizeGetter = Object.getOwnPropertyDescriptor(Map.prototype, "size")?.get;
		const setSizeGetter = Object.getOwnPropertyDescriptor(Set.prototype, "size")?.get;
		const regexpSourceGetter = Object.getOwnPropertyDescriptor(RegExp.prototype, "source")?.get;
		const DEFAULT_OPTIONS = Object.freeze({
			inspectDepth: 80,
			inspectItems: 1e3,
			previewItems: 3,
			previewMaxLength: 120,
			expandDepth: 0,
			showPrototype: false,
			showNonEnumerable: false,
			showObjectLength: false,
			virtualize: true,
			virtualizeAfter: 60,
			virtualRowHeight: 24,
			virtualOverscan: 8,
			virtualMaxHeight: 360,
			virtualRowCache: 160,
			unmountOnCollapse: true,
			highlightDuration: 850,
			theme: "auto"
		});
		const CSS_TEXT = `
    .rod-inspector,
    .rod-inspector * {
      box-sizing: border-box;
    }

    .rod-inspector {
      --rod-inspector-fg: rgba(250, 250, 250, 1);
      --rod-inspector-muted: rgba(212, 212, 216, 0.94);
      --rod-inspector-subtle: rgba(161, 161, 170, 0.92);
      --rod-inspector-hover: rgba(255, 255, 255, 0.09);
      --rod-inspector-focus: rgba(125, 211, 252, 1);
      --rod-inspector-key: rgba(125, 211, 252, 1);
      --rod-inspector-symbol: rgba(45, 212, 191, 1);
      --rod-inspector-string: rgba(253, 186, 116, 1);
      --rod-inspector-number: rgba(190, 242, 100, 1);
      --rod-inspector-boolean: rgba(96, 165, 250, 1);
      --rod-inspector-null: rgba(216, 180, 254, 1);
      --rod-inspector-function: rgba(253, 224, 71, 1);
      --rod-inspector-warning: rgba(251, 191, 36, 1);
      --rod-inspector-badge-border: rgba(255, 255, 255, 0.18);
      --rod-inspector-row-hover: rgba(255, 255, 255, 0.045);
      display: inline-block;
      min-width: 0;
      max-width: 100%;
      color: var(--rod-inspector-fg);
      font: inherit;
      color-scheme: dark;
    }

    .rod-inspector[data-theme="light"] {
      --rod-inspector-fg: rgba(24, 24, 27, 1);
      --rod-inspector-muted: rgba(63, 63, 70, 0.94);
      --rod-inspector-subtle: rgba(82, 82, 91, 0.9);
      --rod-inspector-hover: rgba(15, 23, 42, 0.08);
      --rod-inspector-focus: rgba(2, 132, 199, 1);
      --rod-inspector-key: rgba(2, 132, 199, 1);
      --rod-inspector-symbol: rgba(13, 148, 136, 1);
      --rod-inspector-string: rgba(194, 65, 12, 1);
      --rod-inspector-number: rgba(77, 124, 15, 1);
      --rod-inspector-boolean: rgba(37, 99, 235, 1);
      --rod-inspector-null: rgba(126, 34, 206, 1);
      --rod-inspector-function: rgba(161, 98, 7, 1);
      --rod-inspector-warning: rgba(180, 83, 9, 1);
      --rod-inspector-badge-border: rgba(15, 23, 42, 0.2);
      --rod-inspector-row-hover: rgba(15, 23, 42, 0.045);
      color-scheme: light;
    }

    @media (prefers-color-scheme: light) {
      .rod-inspector[data-theme="auto"] {
        --rod-inspector-fg: rgba(24, 24, 27, 1);
        --rod-inspector-muted: rgba(63, 63, 70, 0.94);
        --rod-inspector-subtle: rgba(82, 82, 91, 0.9);
        --rod-inspector-hover: rgba(15, 23, 42, 0.08);
        --rod-inspector-focus: rgba(2, 132, 199, 1);
        --rod-inspector-key: rgba(2, 132, 199, 1);
        --rod-inspector-symbol: rgba(13, 148, 136, 1);
        --rod-inspector-string: rgba(194, 65, 12, 1);
        --rod-inspector-number: rgba(77, 124, 15, 1);
        --rod-inspector-boolean: rgba(37, 99, 235, 1);
        --rod-inspector-null: rgba(126, 34, 206, 1);
        --rod-inspector-function: rgba(161, 98, 7, 1);
        --rod-inspector-warning: rgba(180, 83, 9, 1);
        --rod-inspector-badge-border: rgba(15, 23, 42, 0.2);
        --rod-inspector-row-hover: rgba(15, 23, 42, 0.045);
        color-scheme: light;
      }
    }

    .rod-inspector > summary {
      display: inline-flex;
      align-items: baseline;
      gap: 4px;
      max-width: 100%;
      margin-left: -2px;
      padding: 1px 4px 1px 2px;
      border-radius: 5px;
      cursor: pointer;
      list-style: none;
      outline: none;
      user-select: text;
      touch-action: manipulation;
      transition: background 120ms ease;
    }

    .rod-inspector > summary:hover {
      background: var(--rod-inspector-hover);
    }

    .rod-inspector > summary::-webkit-details-marker {
      display: none;
    }

    .rod-inspector > summary::before {
      content: "";
      flex: 0 0 auto;
      width: 0;
      height: 0;
      margin: 0 2px 1px 1px;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      border-left: 6px solid var(--rod-inspector-muted);
      transform-origin: 2px 4px;
      transition: transform 140ms ease;
      user-select: none;
    }

    .rod-inspector[open] > summary::before {
      transform: rotate(90deg);
    }

    .rod-inspector__body {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
      padding: 4px 0 2px 14px;
    }

    .rod-inspector[open] > .rod-inspector__body {
      animation: rod-inspector-enter 140ms ease-out both;
    }

    .rod-inspector__body[data-virtualized="true"] {
      position: relative;
      display: block;
      width: 100%;
      max-height: var(--rod-inspector-virtual-max-height, 360px);
      overflow: auto;
      padding: 3px 0 3px 14px;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-gutter: stable;
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
      padding: 1px 4px 1px 2px;
      border-radius: 4px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      content-visibility: auto;
      contain-intrinsic-size: auto 24px;
      transition: background 100ms ease;
    }

    .rod-inspector__row:hover {
      background: var(--rod-inspector-row-hover);
    }

    .rod-inspector__key {
      color: var(--rod-inspector-key);
      font-weight: 500;
    }

    .rod-inspector__key[data-symbol="true"] {
      color: var(--rod-inspector-symbol);
    }

    .rod-inspector__meta {
      color: var(--rod-inspector-muted);
      font-style: italic;
    }

    .rod-inspector__footer {
      display: block;
      min-height: 22px;
      padding: 2px 4px 1px 2px;
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
      color: var(--rod-inspector-null);
      font-weight: 600;
    }

    .rod-inspector__getter:disabled {
      cursor: not-allowed;
      opacity: 0.58;
    }

    .rod-inspector__getter:hover:not(:disabled),
    .rod-inspector__getter:focus-visible,
    .rod-inspector__inspect:hover,
    .rod-inspector__inspect:focus-visible {
      background: var(--rod-inspector-hover);
    }

    .rod-inspector__getter:focus-visible,
    .rod-inspector__inspect:focus-visible,
    .rod-inspector > summary:focus-visible {
      outline: 1px solid var(--rod-inspector-focus);
      outline-offset: 1px;
    }

    .rod-inspector__badge {
      display: inline-block;
      margin-left: 5px;
      padding: 0 4px;
      border: 1px solid var(--rod-inspector-badge-border);
      border-radius: 4px;
      color: var(--rod-inspector-muted);
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
      color: var(--rod-inspector-symbol);
      font: 700 13px/1 ui-sans-serif, system-ui, sans-serif;
      vertical-align: -4px;
    }

    .rod-token--null { color: var(--rod-inspector-null); }
    .rod-token--undefined,
    .rod-token--meta { color: var(--rod-inspector-subtle); }
    .rod-token--string { color: var(--rod-inspector-string); }
    .rod-token--number { color: var(--rod-inspector-number); }
    .rod-token--boolean {
      color: var(--rod-inspector-boolean);
      font-weight: 600;
    }
    .rod-token--symbol { color: var(--rod-inspector-symbol); }
    .rod-token--function { color: var(--rod-inspector-function); }
    .rod-token--circular,
    .rod-token--warning { color: var(--rod-inspector-warning); }
    .rod-dom-tag { color: var(--rod-inspector-boolean); }
    .rod-dom-id {
      color: var(--rod-inspector-key);
      font-weight: 600;
    }
    .rod-dom-class { color: var(--rod-inspector-string); }

    @keyframes rod-inspector-enter {
      from {
        opacity: 0;
        transform: translateY(-2px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .rod-inspector > summary,
      .rod-inspector > summary::before,
      .rod-inspector__row {
        transition: none;
      }

      .rod-inspector[open] > .rod-inspector__body {
        animation: none;
      }
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
		function isObjectLike(value) {
			return value !== null && (typeof value === "object" || typeof value === "function");
		}
		function isArray(value) {
			return safeCall(() => Array.isArray(value), false);
		}
		function toInteger(value, fallback, min, max = Number.MAX_SAFE_INTEGER) {
			const numeric = Number(value);
			if (!Number.isFinite(numeric)) return fallback;
			return clamp(Math.trunc(numeric), min, max);
		}
		function toBoolean(value, fallback) {
			return typeof value === "boolean" ? value : fallback;
		}
		function truncateText(value, maxLength) {
			const text = String(value);
			if (text.length <= maxLength) return text;
			return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
		}
		function safeObjectTag(value) {
			return safeCall(() => objectToString.call(value), "[object Unknown]");
		}
		function safeKeyText(key) {
			if (typeof key === "symbol") return safeCall(() => key.toString(), "Symbol(?)");
			return safeCall(() => String(key), "[Unprintable key]");
		}
		function safeFunctionName(value) {
			const descriptor = safeCall(() => Object.getOwnPropertyDescriptor(value, "name"), void 0);
			if (descriptor && typeof descriptor.value === "string") return descriptor.value || "anonymous";
			return "anonymous";
		}
		function safePrimitiveText(value, quoteStrings) {
			if (value === null) return "null";
			if (value === void 0) return "undefined";
			if (typeof value === "string") return quoteStrings ? JSON.stringify(value) : value;
			if (typeof value === "bigint") return `${value}n`;
			if (typeof value === "symbol") return safeKeyText(value);
			if (typeof value === "function") return `ƒ ${safeFunctionName(value)}()`;
			return safeCall(() => String(value), "[Unprintable value]");
		}
		function safeGetConstructorName(value) {
			let prototype = safeCall(() => Object.getPrototypeOf(value), null);
			let depth = 0;
			while (prototype && depth < 4) {
				const descriptor = safeCall(() => Object.getOwnPropertyDescriptor(prototype, "constructor"), void 0);
				if (descriptor && typeof descriptor.value === "function") {
					const name = safeFunctionName(descriptor.value);
					if (name && name !== "anonymous") return name;
				}
				prototype = safeCall(() => Object.getPrototypeOf(prototype), null);
				depth += 1;
			}
			const tag = safeObjectTag(value).slice(8, -1);
			return tag && tag !== "Unknown" ? tag : "Object";
		}
		function getMapSize(value) {
			if (!mapSizeGetter) return null;
			return safeCall(() => Reflect.apply(mapSizeGetter, value, []), null);
		}
		function getSetSize(value) {
			if (!setSizeGetter) return null;
			return safeCall(() => Reflect.apply(setSizeGetter, value, []), null);
		}
		function isMap(value) {
			return getMapSize(value) !== null;
		}
		function isSet(value) {
			return getSetSize(value) !== null;
		}
		function getDateTime(value) {
			return safeCall(() => Reflect.apply(Date.prototype.getTime, value, []), null);
		}
		function isDate(value) {
			return getDateTime(value) !== null;
		}
		function getRegExpSource(value) {
			if (!regexpSourceGetter) return null;
			return safeCall(() => Reflect.apply(regexpSourceGetter, value, []), null);
		}
		function isRegExp(value) {
			return getRegExpSource(value) !== null;
		}
		function isError(value) {
			if (!isObjectLike(value)) return false;
			const tag = safeObjectTag(value);
			const constructorName = safeGetConstructorName(value);
			return tag === "[object Error]" || /Error$/.test(constructorName);
		}
		function isDomNode(value) {
			if (!value || typeof value !== "object") return false;
			return safeCall(() => {
				const candidate = value;
				return typeof candidate.nodeType === "number" && typeof candidate.nodeName === "string" && Boolean(candidate.ownerDocument || candidate.nodeType === 9);
			}, false);
		}
		function isDomElement(value) {
			return isDomNode(value) && safeCall(() => value.nodeType === 1 && typeof value.tagName === "string", false);
		}
		function normalizeOptions(options = {}) {
			const theme = VALID_THEMES.has(options.theme) ? options.theme : DEFAULT_OPTIONS.theme;
			return {
				inspectDepth: toInteger(options.inspectDepth, DEFAULT_OPTIONS.inspectDepth, 0, 1e3),
				inspectItems: toInteger(options.inspectItems, DEFAULT_OPTIONS.inspectItems, 0, MAX_SAFE_ITEMS),
				previewItems: toInteger(options.previewItems, DEFAULT_OPTIONS.previewItems, 0, 100),
				previewMaxLength: toInteger(options.previewMaxLength, DEFAULT_OPTIONS.previewMaxLength, 24, 1e4),
				expandDepth: toInteger(options.expandDepth, DEFAULT_OPTIONS.expandDepth, 0, 1e3),
				showPrototype: toBoolean(options.showPrototype, DEFAULT_OPTIONS.showPrototype),
				showNonEnumerable: toBoolean(options.showNonEnumerable, DEFAULT_OPTIONS.showNonEnumerable),
				showObjectLength: toBoolean(options.showObjectLength, DEFAULT_OPTIONS.showObjectLength),
				virtualize: toBoolean(options.virtualize, DEFAULT_OPTIONS.virtualize),
				virtualizeAfter: toInteger(options.virtualizeAfter, DEFAULT_OPTIONS.virtualizeAfter, 1, MAX_SAFE_ITEMS),
				virtualRowHeight: toInteger(options.virtualRowHeight, DEFAULT_OPTIONS.virtualRowHeight, 16, 1e3),
				virtualOverscan: toInteger(options.virtualOverscan, DEFAULT_OPTIONS.virtualOverscan, 1, 1e3),
				virtualMaxHeight: toInteger(options.virtualMaxHeight, DEFAULT_OPTIONS.virtualMaxHeight, 120, 1e5),
				virtualRowCache: toInteger(options.virtualRowCache, DEFAULT_OPTIONS.virtualRowCache, 0, MAX_SAFE_ITEMS),
				unmountOnCollapse: toBoolean(options.unmountOnCollapse, DEFAULT_OPTIONS.unmountOnCollapse),
				highlightDuration: toInteger(options.highlightDuration, DEFAULT_OPTIONS.highlightDuration, 0, 6e4),
				theme
			};
		}
		function assertDocument(documentRef) {
			if (!documentRef || typeof documentRef.createElement !== "function") throw new TypeError("RodObjectInspector requires a valid Document instance.");
			return documentRef;
		}
		function isDocumentTarget(target) {
			return safeCall(() => Boolean(target) && typeof target.createElement === "function" && target.nodeType === 9, false);
		}
		function isShadowRootTarget(target) {
			return safeCall(() => Boolean(target) && !isDocumentTarget(target) && target.nodeType === 11 && Boolean(target.host) && Boolean(target.ownerDocument), false);
		}
		function getOwnerDocument(target) {
			return isDocumentTarget(target) ? target : target.ownerDocument;
		}
		function createStyle(documentRef) {
			const style = assertDocument(documentRef ?? safeCall(() => globalThis.document, void 0)).createElement("style");
			style.setAttribute("data-rod-object-inspector-style", VERSION);
			style.textContent = CSS_TEXT;
			return style;
		}
		function ensureStyle(target) {
			const fallbackDocument = safeCall(() => globalThis.document, void 0);
			const root = target ?? assertDocument(fallbackDocument);
			const documentValue = getOwnerDocument(root);
			const selector = "style[data-rod-object-inspector-style]";
			const existing = safeCall(() => root.querySelector(selector), null);
			if (existing) {
				if (existing.textContent !== CSS_TEXT) existing.textContent = CSS_TEXT;
				existing.setAttribute("data-rod-object-inspector-style", VERSION);
				styledRoots.add(root);
				return existing;
			}
			if (styledRoots.has(root)) styledRoots.delete(root);
			const style = createStyle(documentValue);
			(isDocumentTarget(root) ? root.head || root.documentElement || root.body : root)?.appendChild(style);
			if (style.isConnected || isShadowRootTarget(root)) styledRoots.add(root);
			return style;
		}
		function createFrameScheduler(windowRef) {
			const requestAnimationFrameRef = typeof windowRef.requestAnimationFrame === "function" ? windowRef.requestAnimationFrame.bind(windowRef) : null;
			const cancelAnimationFrameRef = typeof windowRef.cancelAnimationFrame === "function" ? windowRef.cancelAnimationFrame.bind(windowRef) : null;
			const setTimeoutRef = windowRef.setTimeout.bind(windowRef);
			const clearTimeoutRef = windowRef.clearTimeout.bind(windowRef);
			return {
				request(callback) {
					if (requestAnimationFrameRef) return {
						kind: "animation-frame",
						id: requestAnimationFrameRef(callback)
					};
					return {
						kind: "timeout",
						id: setTimeoutRef(() => callback(performance.now()), 16)
					};
				},
				cancel(handle) {
					if (!handle) return;
					if (handle.kind === "animation-frame" && cancelAnimationFrameRef) cancelAnimationFrameRef(handle.id);
					else clearTimeoutRef(handle.id);
				},
				setTimeout: setTimeoutRef,
				clearTimeout: clearTimeoutRef
			};
		}
		function isWindowLike(value) {
			if (!value || typeof value !== "object") return false;
			return safeCall(() => {
				const candidate = value;
				return candidate.window === value && typeof candidate.setTimeout === "function" && Boolean(candidate.document);
			}, false);
		}
		function collectGlobalScopes(seed) {
			const scopes = [];
			const seen = /* @__PURE__ */ new Set();
			const add = (value) => {
				if (!value || typeof value !== "object" && typeof value !== "function") return;
				const objectValue = value;
				if (seen.has(objectValue)) return;
				seen.add(objectValue);
				scopes.push(objectValue);
			};
			add(globalThis);
			add(seed);
			if (typeof window !== "undefined") add(window);
			if (typeof self !== "undefined") add(self);
			try {
				if (typeof unsafeWindow !== "undefined") add(unsafeWindow);
			} catch {}
			const windows = scopes.filter(isWindowLike);
			for (const startWindow of windows) {
				let current = startWindow;
				let depth = 0;
				while (current && depth < 32) {
					add(current);
					const parentWindow = safeCall(() => current?.parent ?? null, null);
					if (!parentWindow || parentWindow === current) break;
					if (!safeCall(() => {
						parentWindow.document.documentElement;
						return true;
					}, false)) break;
					current = parentWindow;
					depth += 1;
				}
				add(safeCall(() => startWindow.top, null));
			}
			return scopes;
		}
		function compareVersions(left, right) {
			const parse = (value) => value.split(/[.-]/).slice(0, 4).map((part) => Number.parseInt(part, 10) || 0);
			const leftParts = parse(left);
			const rightParts = parse(right);
			const length = Math.max(leftParts.length, rightParts.length);
			for (let index = 0; index < length; index += 1) {
				const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
				if (difference !== 0) return difference;
			}
			return 0;
		}
		function isInspectorApi(value) {
			if (!value || typeof value !== "object" && typeof value !== "function") return false;
			const candidate = value;
			return typeof candidate.version === "string" && typeof candidate.create === "function" && typeof candidate.createStyle === "function" && typeof candidate.ensureStyle === "function";
		}
		const globalScopes = collectGlobalScopes(suppliedGlobal);
		function publishApi(api) {
			for (const scope of globalScopes) {
				safeCall(() => {
					Object.defineProperty(scope, GLOBAL_NAME, {
						value: api,
						configurable: true,
						writable: true,
						enumerable: false
					});
					Object.defineProperty(scope, API_SYMBOL, {
						value: api,
						configurable: true,
						writable: true,
						enumerable: false
					});
					return true;
				}, false);
				const record = scope;
				if (!safeCall(() => record[GLOBAL_NAME] === api, false)) safeCall(() => {
					record[GLOBAL_NAME] = api;
					return true;
				}, false);
			}
		}
		const existingApi = globalScopes.flatMap((scope) => {
			const record = scope;
			return [safeCall(() => record[API_SYMBOL], void 0), safeCall(() => record[GLOBAL_NAME], void 0)];
		}).find(isInspectorApi);
		if (existingApi && compareVersions(existingApi.version, VERSION) >= 0) {
			publishApi(existingApi);
			return;
		}
		function createInspector(runtimeOptions = {}) {
			const resolvedWindow = runtimeOptions.window ?? globalScopes.find(isWindowLike);
			if (!resolvedWindow) throw new TypeError("RodObjectInspector.create() requires a browser Window. Pass { window, document } explicitly when using an unusual realm.");
			const defaultWindow = resolvedWindow;
			const defaultDocument = assertDocument(runtimeOptions.document ?? defaultWindow.document);
			const maxZIndex = clamp(toInteger(runtimeOptions.maxZIndex, MAX_Z_INDEX, 1, MAX_Z_INDEX), 1, MAX_Z_INDEX);
			const baseOptions = normalizeOptions(runtimeOptions.options ?? {});
			const autoStyle = runtimeOptions.autoStyle !== false;
			const objectIds = /* @__PURE__ */ new WeakMap();
			const activeVirtualizers = /* @__PURE__ */ new Set();
			const virtualizerByBody = /* @__PURE__ */ new WeakMap();
			let nextObjectId = 1;
			let highlightState = null;
			let destroyed = false;
			function getHost() {
				if (typeof runtimeOptions.getHost === "function") {
					const host = safeCall(() => runtimeOptions.getHost?.(), null);
					if (host?.window && host?.document) return {
						window: host.window,
						document: assertDocument(host.document)
					};
				}
				return {
					window: defaultWindow,
					document: defaultDocument
				};
			}
			function getObjectId(value) {
				const knownId = objectIds.get(value);
				if (knownId !== void 0) return knownId;
				const id = nextObjectId;
				nextObjectId += 1;
				objectIds.set(value, id);
				return id;
			}
			function getElementPreviewParts(element) {
				return {
					tagName: safeCall(() => String(element.tagName || element.nodeName).toLowerCase(), "element"),
					id: safeCall(() => typeof element.id === "string" ? element.id : "", ""),
					classes: safeCall(() => {
						if (element.classList && typeof element.classList.length === "number") return Array.from(element.classList).slice(0, 8);
						const className = safeCall(() => element.className, void 0);
						if (typeof className === "string") return className.trim().split(/\s+/).filter(Boolean).slice(0, 8);
						if (className && typeof className === "object" && "baseVal" in className && typeof className.baseVal === "string") return className.baseVal.trim().split(/\s+/).filter(Boolean).slice(0, 8);
						return [];
					}, [])
				};
			}
			function getElementPreviewText(element) {
				const parts = getElementPreviewParts(element);
				const id = parts.id ? `#${parts.id}` : "";
				const classes = parts.classes.map((name) => `.${name}`).join("");
				return `<${parts.tagName}${id}${classes}>`;
			}
			function getDomNodePreviewText(node, options = baseOptions) {
				if (isDomElement(node)) return getElementPreviewText(node);
				if (node.nodeType === Node.TEXT_NODE) {
					const text = safeCall(() => node.textContent ?? "", "");
					return `#text ${truncateText(JSON.stringify(text), options.previewMaxLength)}`;
				}
				if (node.nodeType === Node.COMMENT_NODE) return `<!--${truncateText(safeCall(() => node.textContent ?? "", ""), options.previewMaxLength)}-->`;
				if (node.nodeType === Node.DOCUMENT_NODE) return "#document";
				if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) return "#document-fragment";
				return safeCall(() => String(node.nodeName || "#node").toLowerCase(), "#node");
			}
			function getInlinePreview(value, options = {}) {
				const normalized = normalizeOptions({
					...baseOptions,
					...options
				});
				if (!isObjectLike(value)) return truncateText(safePrimitiveText(value, true), normalized.previewMaxLength);
				if (isDomNode(value)) return getDomNodePreviewText(value, normalized);
				if (typeof value === "function") return `ƒ ${safeFunctionName(value)}()`;
				if (isArray(value)) return `Array(${safeCall(() => value.length, 0)})`;
				const mapSize = getMapSize(value);
				if (mapSize !== null) return `Map(${mapSize})`;
				const setSize = getSetSize(value);
				if (setSize !== null) return `Set(${setSize})`;
				if (isError(value)) return truncateText(safeCall(() => `${value.name || "Error"}: ${value.message || ""}`, "Error"), normalized.previewMaxLength);
				if (isDate(value)) {
					const time = getDateTime(value);
					return Number.isNaN(time) ? "Date(Invalid)" : safeCall(() => Reflect.apply(Date.prototype.toISOString, value, []), "Date(?)");
				}
				if (isRegExp(value)) return safeCall(() => Reflect.apply(RegExp.prototype.toString, value, []), "/?/");
				return `${safeGetConstructorName(value)} {…}`;
			}
			function getPreviewOwnEntries(value, maxItems) {
				const keys = safeCall(() => Reflect.ownKeys(value), []);
				const items = [];
				let hasMore = false;
				for (const key of keys) {
					const descriptor = safeCall(() => Object.getOwnPropertyDescriptor(value, key), void 0);
					if (!descriptor?.enumerable) continue;
					if (items.length >= maxItems) {
						hasMore = true;
						break;
					}
					items.push({
						key,
						descriptor
					});
				}
				return {
					items,
					hasMore
				};
			}
			function getObjectPreview(value, options = {}) {
				const normalized = normalizeOptions({
					...baseOptions,
					...options
				});
				if (!isObjectLike(value)) return truncateText(safePrimitiveText(value, true), normalized.previewMaxLength);
				const previewItems = normalized.previewItems;
				const idSuffix = ` #${getObjectId(value)}`;
				if (isDomNode(value)) return `${getDomNodePreviewText(value, normalized)}${idSuffix}`;
				if (typeof value === "function") {
					const preview = getPreviewOwnEntries(value, previewItems);
					const parts = preview.items.map(({ key, descriptor }) => {
						const keyText = safeKeyText(key);
						return hasOwn(descriptor, "value") ? `${keyText}: ${getInlinePreview(descriptor.value, normalized)}` : `${keyText}: (…)`;
					});
					const suffix = preview.hasMore ? ", …" : "";
					return truncateText(`ƒ ${safeFunctionName(value)}()${idSuffix} {${parts.join(", ")}${suffix}}`, normalized.previewMaxLength);
				}
				if (isArray(value)) {
					const length = safeCall(() => value.length, 0);
					const parts = [];
					const count = Math.min(length, previewItems);
					for (let index = 0; index < count; index += 1) {
						const descriptor = safeCall(() => Object.getOwnPropertyDescriptor(value, String(index)), void 0);
						if (!descriptor) parts.push("empty");
						else if (hasOwn(descriptor, "value")) parts.push(getInlinePreview(descriptor.value, normalized));
						else parts.push("(…)");
					}
					const suffix = length > count ? ", …" : "";
					return truncateText(`Array(${length})${idSuffix} [${parts.join(", ")}${suffix}]`, normalized.previewMaxLength);
				}
				const mapSize = getMapSize(value);
				if (mapSize !== null) {
					const parts = [];
					const iterator = safeCall(() => Reflect.apply(Map.prototype.entries, value, []), null);
					if (iterator) for (let index = 0; index < previewItems; index += 1) {
						const step = safeCall(() => iterator.next(), {
							done: true,
							value: void 0
						});
						if (step.done) break;
						parts.push(`${getInlinePreview(step.value[0], normalized)} => ${getInlinePreview(step.value[1], normalized)}`);
					}
					const suffix = mapSize > parts.length ? ", …" : "";
					return truncateText(`Map(${mapSize})${idSuffix} {${parts.join(", ")}${suffix}}`, normalized.previewMaxLength);
				}
				const setSize = getSetSize(value);
				if (setSize !== null) {
					const parts = [];
					const iterator = safeCall(() => Reflect.apply(Set.prototype.values, value, []), null);
					if (iterator) for (let index = 0; index < previewItems; index += 1) {
						const step = safeCall(() => iterator.next(), {
							done: true,
							value: void 0
						});
						if (step.done) break;
						parts.push(getInlinePreview(step.value, normalized));
					}
					const suffix = setSize > parts.length ? ", …" : "";
					return truncateText(`Set(${setSize})${idSuffix} {${parts.join(", ")}${suffix}}`, normalized.previewMaxLength);
				}
				if (isError(value)) {
					const name = safeCall(() => String(value.name || "Error"), "Error");
					const message = safeCall(() => String(value.message || ""), "");
					return truncateText(`${name}${idSuffix}${message ? `: ${message}` : ""}`, normalized.previewMaxLength);
				}
				if (isDate(value)) return `Date${idSuffix} ${safeCall(() => Reflect.apply(Date.prototype.toISOString, value, []), "Invalid Date")}`;
				if (isRegExp(value)) return `RegExp${idSuffix} ${safeCall(() => Reflect.apply(RegExp.prototype.toString, value, []), "/?/")}`;
				const constructorName = safeGetConstructorName(value);
				const preview = getPreviewOwnEntries(value, previewItems);
				const parts = preview.items.map(({ key, descriptor }) => {
					const keyText = safeKeyText(key);
					if (!hasOwn(descriptor, "value")) return `${keyText}: (…)`;
					return `${keyText}: ${getInlinePreview(descriptor.value, normalized)}`;
				});
				const suffix = preview.hasMore ? ", …" : "";
				return truncateText(`${constructorName}${idSuffix}${normalized.showObjectLength ? safeCall(() => ` (${Reflect.ownKeys(value).length})`, "") : ""} {${parts.join(", ")}${suffix}}`, normalized.previewMaxLength);
			}
			function createTextNode(documentRef, text, className = "") {
				const node = documentRef.createElement("span");
				node.textContent = text;
				if (className) node.className = className;
				return node;
			}
			function renderPrimitive(value, documentRef, quoteStrings) {
				let className = "";
				if (value === null) className = "rod-token--null";
				else if (value === void 0) className = "rod-token--undefined";
				else if (typeof value === "string") className = "rod-token--string";
				else if (typeof value === "number" || typeof value === "bigint") className = "rod-token--number";
				else if (typeof value === "boolean") className = "rod-token--boolean";
				else if (typeof value === "symbol") className = "rod-token--symbol";
				else if (typeof value === "function") className = "rod-token--function";
				return createTextNode(documentRef, safePrimitiveText(value, quoteStrings), className);
			}
			function createDomPreviewNode(node, documentRef, options) {
				if (!isDomElement(node)) return createTextNode(documentRef, getDomNodePreviewText(node, options), "rod-token--meta");
				const wrapper = documentRef.createElement("span");
				const parts = getElementPreviewParts(node);
				wrapper.append(createTextNode(documentRef, "<", "rod-dom-tag"), createTextNode(documentRef, parts.tagName, "rod-dom-tag"));
				if (parts.id) wrapper.appendChild(createTextNode(documentRef, `#${parts.id}`, "rod-dom-id"));
				for (const className of parts.classes) wrapper.appendChild(createTextNode(documentRef, `.${className}`, "rod-dom-class"));
				wrapper.append(createTextNode(documentRef, ">", "rod-dom-tag"), createTextNode(documentRef, ` #${getObjectId(node)}`, "rod-token--meta"));
				return wrapper;
			}
			function clearHighlight() {
				if (!highlightState) return;
				const current = highlightState;
				highlightState = null;
				current.scheduler.cancel(current.frame);
				if (current.timer !== null) current.scheduler.clearTimeout(current.timer);
				safeCall(() => current.overlay.remove(), void 0);
			}
			function getRectRelativeToWindow(element, targetWindow) {
				const rect = safeCall(() => element.getBoundingClientRect(), null);
				if (!rect) return null;
				let left = rect.left;
				let top = rect.top;
				let width = rect.width;
				let height = rect.height;
				let currentWindow = safeCall(() => element.ownerDocument.defaultView, null);
				while (currentWindow && currentWindow !== targetWindow) {
					const frameElement = safeCall(() => currentWindow?.frameElement, null);
					if (!frameElement) return null;
					const frameRect = safeCall(() => frameElement.getBoundingClientRect(), null);
					if (!frameRect) return null;
					const frameHtmlElement = frameElement;
					const offsetWidth = safeCall(() => frameHtmlElement.offsetWidth, 0);
					const offsetHeight = safeCall(() => frameHtmlElement.offsetHeight, 0);
					const scaleX = offsetWidth > 0 ? frameRect.width / offsetWidth : 1;
					const scaleY = offsetHeight > 0 ? frameRect.height / offsetHeight : 1;
					const clientLeft = safeCall(() => frameElement.clientLeft, 0);
					const clientTop = safeCall(() => frameElement.clientTop, 0);
					left = frameRect.left + (clientLeft + left) * scaleX;
					top = frameRect.top + (clientTop + top) * scaleY;
					width *= scaleX;
					height *= scaleY;
					currentWindow = safeCall(() => frameElement.ownerDocument.defaultView, null);
				}
				if (currentWindow !== targetWindow) return null;
				return {
					left,
					top,
					width,
					height
				};
			}
			function highlightElement(element, options = {}) {
				clearHighlight();
				if (destroyed || !isDomElement(element) || !element.isConnected) return;
				const host = getHost();
				const parent = host.document.documentElement || host.document.body;
				if (!parent) return;
				const overlay = host.document.createElement("div");
				const scheduler = createFrameScheduler(host.window);
				const duration = toInteger(options.duration, baseOptions.highlightDuration, 0, 6e4);
				overlay.id = "__rod-object-inspector-highlight__";
				overlay.setAttribute("aria-hidden", "true");
				overlay.style.setProperty("all", "initial", "important");
				overlay.style.setProperty("display", "block", "important");
				overlay.style.setProperty("position", "fixed", "important");
				overlay.style.setProperty("left", "0", "important");
				overlay.style.setProperty("top", "0", "important");
				overlay.style.setProperty("width", "0", "important");
				overlay.style.setProperty("height", "0", "important");
				overlay.style.setProperty("box-sizing", "border-box", "important");
				overlay.style.setProperty("z-index", String(maxZIndex), "important");
				overlay.style.setProperty("pointer-events", "none", "important");
				overlay.style.setProperty("border", `1px solid ${options.borderColor || "rgba(125, 211, 252, 1)"}`, "important");
				overlay.style.setProperty("background", options.backgroundColor || "rgba(56, 189, 248, 0.2)", "important");
				overlay.style.setProperty("box-shadow", "0 0 0 1px rgba(0,0,0,.22), 0 8px 28px rgba(2,132,199,.16)", "important");
				overlay.style.setProperty("transition", "left 45ms linear, top 45ms linear, width 45ms linear, height 45ms linear", "important");
				parent.appendChild(overlay);
				const current = {
					overlay,
					scheduler,
					frame: null,
					timer: null
				};
				highlightState = current;
				const update = () => {
					if (highlightState !== current || destroyed) return;
					if (!element.isConnected || !overlay.isConnected) {
						clearHighlight();
						return;
					}
					const rect = getRectRelativeToWindow(element, host.window);
					if (!rect) {
						clearHighlight();
						return;
					}
					overlay.style.setProperty("left", `${rect.left}px`, "important");
					overlay.style.setProperty("top", `${rect.top}px`, "important");
					overlay.style.setProperty("width", `${Math.max(0, rect.width)}px`, "important");
					overlay.style.setProperty("height", `${Math.max(0, rect.height)}px`, "important");
					current.frame = scheduler.request(update);
				};
				update(performance.now());
				if (duration > 0) current.timer = scheduler.setTimeout(clearHighlight, duration);
			}
			function inspectElement(element) {
				if (destroyed || !element.isConnected) return;
				safeCall(() => {
					element.scrollIntoView({
						behavior: "smooth",
						block: "center",
						inline: "center"
					});
					return true;
				}, false);
				highlightElement(element, { duration: baseOptions.highlightDuration });
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
				button.addEventListener("pointerenter", () => {
					highlightElement(element, { duration: 0 });
				});
				button.addEventListener("pointerleave", clearHighlight);
				button.addEventListener("blur", clearHighlight);
				return button;
			}
			function createDataEntry(key, descriptor, owner) {
				if (!descriptor) return {
					kind: "empty",
					key,
					value: void 0,
					enumerable: true
				};
				if (hasOwn(descriptor, "value")) return {
					kind: "data",
					key,
					value: descriptor.value,
					enumerable: Boolean(descriptor.enumerable),
					configurable: Boolean(descriptor.configurable),
					writable: Boolean(descriptor.writable)
				};
				return {
					kind: "accessor",
					key,
					owner,
					getter: descriptor.get,
					setter: descriptor.set,
					enumerable: Boolean(descriptor.enumerable),
					configurable: Boolean(descriptor.configurable)
				};
			}
			function createStaticDataEntry(key, value, enumerable = true) {
				return {
					kind: "data",
					key,
					value,
					enumerable,
					configurable: false,
					writable: false
				};
			}
			function createArraySource(value, options) {
				const length = safeCall(() => value.length, 0);
				const numericCount = Math.min(length, options.inspectItems);
				const extraEntries = [];
				let extraTotal = 0;
				const canScanExtraKeys = length <= options.inspectItems;
				if (canScanExtraKeys) {
					const keys = safeCall(() => Reflect.ownKeys(value), []);
					for (const key of keys) {
						if (key === "length") {
							if (!options.showNonEnumerable) continue;
						} else if (typeof key === "string" && /^(?:0|[1-9]\d*)$/.test(key) && Number(key) < length) continue;
						const descriptor = safeCall(() => Object.getOwnPropertyDescriptor(value, key), void 0);
						if (!descriptor) continue;
						if (!options.showNonEnumerable && !descriptor.enumerable) continue;
						extraTotal += 1;
						if (numericCount + extraEntries.length < options.inspectItems) extraEntries.push(createDataEntry(key, descriptor, value));
					}
				}
				const total = canScanExtraKeys ? length + extraTotal : null;
				return {
					count: numericCount + extraEntries.length,
					total,
					hasMore: length > numericCount || extraTotal > extraEntries.length,
					get(index) {
						if (index < numericCount) {
							const key = String(index);
							return createDataEntry(index, safeCall(() => Object.getOwnPropertyDescriptor(value, key), void 0), value);
						}
						return extraEntries[index - numericCount];
					}
				};
			}
			function createObjectSource(value, options) {
				const keys = safeCall(() => Reflect.ownKeys(value), []);
				const entries = [];
				let total = 0;
				for (const key of keys) {
					const descriptor = safeCall(() => Object.getOwnPropertyDescriptor(value, key), void 0);
					if (!descriptor) continue;
					if (!options.showNonEnumerable && !descriptor.enumerable) continue;
					total += 1;
					if (entries.length < options.inspectItems) entries.push(createDataEntry(key, descriptor, value));
				}
				return {
					count: entries.length,
					total,
					hasMore: total > entries.length,
					get(index) {
						return entries[index];
					}
				};
			}
			function createIteratorSource(value, options, kind) {
				const size = kind === "map" ? getMapSize(value) : getSetSize(value);
				const total = Math.max(0, Number(size) || 0);
				const limit = Math.min(total, options.inspectItems);
				const entries = [];
				const iterator = safeCall(() => kind === "map" ? Reflect.apply(Map.prototype.entries, value, []) : Reflect.apply(Set.prototype.values, value, []), null);
				if (iterator) for (let index = 0; index < limit; index += 1) {
					const step = safeCall(() => iterator.next(), {
						done: true,
						value: void 0
					});
					if (step.done) break;
					if (kind === "map") {
						const pair = step.value;
						entries.push({
							kind: "map-entry",
							key: index,
							mapKey: pair[0],
							value: pair[1],
							enumerable: true
						});
					} else entries.push({
						kind: "set-entry",
						key: index,
						value: step.value,
						enumerable: true
					});
				}
				return {
					count: entries.length,
					total,
					hasMore: total > entries.length,
					get(index) {
						return entries[index];
					}
				};
			}
			function createDomSource(node, options) {
				const entries = [];
				let total = 0;
				const add = (entry) => {
					total += 1;
					if (entries.length < options.inspectItems) entries.push(entry);
				};
				if (isDomElement(node)) {
					const attributes = safeCall(() => node.attributes, null);
					const attributeCount = Number(attributes?.length) || 0;
					for (let index = 0; index < attributeCount; index += 1) {
						const attribute = safeCall(() => attributes?.item(index), null);
						if (attribute) add(createStaticDataEntry(`@${attribute.name}`, attribute.value));
					}
					const shadowRoot = safeCall(() => node.shadowRoot, null);
					if (shadowRoot) add(createStaticDataEntry("[[ShadowRoot]]", shadowRoot, false));
				}
				const childNodes = safeCall(() => node.childNodes, null);
				const childCount = Number(childNodes?.length) || 0;
				for (let index = 0; index < childCount; index += 1) {
					const child = safeCall(() => childNodes?.item(index), null);
					if (!child) continue;
					if (child.nodeType === Node.TEXT_NODE) {
						const text = safeCall(() => child.textContent ?? "", "");
						if (text.trim()) add(createStaticDataEntry(index, text.trim()));
					} else add(createStaticDataEntry(index, child));
				}
				return {
					count: entries.length,
					total,
					hasMore: total > entries.length,
					get(index) {
						return entries[index];
					}
				};
			}
			function createErrorSource(value, options) {
				const preferred = [
					"name",
					"message",
					"stack",
					"cause",
					"errors"
				];
				const seen = /* @__PURE__ */ new Set();
				const entries = [];
				let total = 0;
				const add = (entry) => {
					total += 1;
					if (entries.length < options.inspectItems) entries.push(entry);
				};
				for (const key of preferred) {
					const ownDescriptor = safeCall(() => Object.getOwnPropertyDescriptor(value, key), void 0);
					if (ownDescriptor) {
						seen.add(key);
						add(createDataEntry(key, ownDescriptor, value));
						continue;
					}
					if (key === "name" || key === "message") {
						const result = safeCall(() => ({
							found: key in value,
							value: value[key]
						}), {
							found: false,
							value: void 0
						});
						if (result.found) {
							seen.add(key);
							add(createStaticDataEntry(key, result.value, false));
						}
					}
				}
				const keys = safeCall(() => Reflect.ownKeys(value), []);
				for (const key of keys) {
					if (seen.has(key)) continue;
					const descriptor = safeCall(() => Object.getOwnPropertyDescriptor(value, key), void 0);
					if (!descriptor) continue;
					if (!options.showNonEnumerable && !descriptor.enumerable) continue;
					add(createDataEntry(key, descriptor, value));
				}
				return {
					count: entries.length,
					total,
					hasMore: total > entries.length,
					get(index) {
						return entries[index];
					}
				};
			}
			function withPrototype(source, value, options) {
				if (!options.showPrototype) return source;
				const prototype = safeCall(() => Object.getPrototypeOf(value), null);
				if (!prototype) return source;
				const prototypeEntry = {
					kind: "prototype",
					key: "[[Prototype]]",
					value: prototype,
					enumerable: false
				};
				const canAppend = source.count < options.inspectItems;
				const total = source.total === null ? null : source.total + 1;
				return {
					count: source.count + (canAppend ? 1 : 0),
					total,
					hasMore: source.hasMore || !canAppend,
					get(index) {
						return index < source.count ? source.get(index) : prototypeEntry;
					}
				};
			}
			function createEntrySource(value, options) {
				let source;
				if (isDomNode(value)) source = createDomSource(value, options);
				else if (isArray(value)) source = createArraySource(value, options);
				else if (isMap(value)) source = createIteratorSource(value, options, "map");
				else if (isSet(value)) source = createIteratorSource(value, options, "set");
				else if (isError(value)) source = createErrorSource(value, options);
				else source = createObjectSource(value, options);
				return withPrototype(source, value, options);
			}
			function createPropertyKeyNode(documentRef, key) {
				const node = documentRef.createElement("span");
				node.className = "rod-inspector__key";
				node.textContent = safeKeyText(key);
				if (typeof key === "symbol") node.dataset.symbol = "true";
				return node;
			}
			function createAccessorValue(documentRef, entry, context) {
				const wrapper = documentRef.createElement("span");
				const button = documentRef.createElement("button");
				button.type = "button";
				button.className = "rod-inspector__getter";
				button.textContent = "(…)";
				button.title = entry.getter ? "Invoke getter" : "Setter-only property";
				button.setAttribute("aria-label", button.title);
				if (!entry.getter) button.disabled = true;
				button.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					if (!entry.getter || button.dataset.invoked === "true") return;
					button.dataset.invoked = "true";
					let value;
					let thrown;
					let didThrow = false;
					try {
						value = Reflect.apply(entry.getter, entry.owner, []);
					} catch (error) {
						thrown = error;
						didThrow = true;
					}
					wrapper.replaceChildren();
					if (didThrow) {
						wrapper.append(createTextNode(documentRef, "[Getter threw] ", "rod-token--warning"), renderValueInternal(thrown, documentRef, {
							...context,
							depth: context.depth + 1,
							quoteStrings: true
						}));
						return;
					}
					wrapper.appendChild(renderValueInternal(value, documentRef, {
						...context,
						depth: context.depth + 1,
						quoteStrings: true
					}));
				});
				wrapper.appendChild(button);
				if (entry.getter) wrapper.appendChild(createTextNode(documentRef, "get", "rod-inspector__badge"));
				if (entry.setter) wrapper.appendChild(createTextNode(documentRef, "set", "rod-inspector__badge"));
				return wrapper;
			}
			function createPropertyRow(documentRef, entry, context) {
				const row = documentRef.createElement("div");
				row.className = "rod-inspector__row";
				if (!entry) {
					row.appendChild(createTextNode(documentRef, "[Property unavailable]", "rod-token--warning"));
					return row;
				}
				const childContext = {
					...context,
					depth: context.depth + 1,
					quoteStrings: true
				};
				if (entry.kind === "map-entry") {
					row.append(createPropertyKeyNode(documentRef, entry.key), createTextNode(documentRef, ": [", "rod-token--meta"), renderValueInternal(entry.mapKey, documentRef, childContext), createTextNode(documentRef, "] => ", "rod-token--meta"), renderValueInternal(entry.value, documentRef, childContext));
					return row;
				}
				if (entry.kind === "set-entry") {
					row.append(createPropertyKeyNode(documentRef, entry.key), createTextNode(documentRef, ": ", "rod-token--meta"), renderValueInternal(entry.value, documentRef, childContext));
					return row;
				}
				row.append(createPropertyKeyNode(documentRef, entry.key), createTextNode(documentRef, ": ", "rod-token--meta"));
				if (entry.kind === "accessor") row.appendChild(createAccessorValue(documentRef, entry, context));
				else if (entry.kind === "empty") row.appendChild(createTextNode(documentRef, "empty", "rod-inspector__meta"));
				else row.appendChild(renderValueInternal(entry.value, documentRef, childContext));
				if (entry.enumerable === false && entry.kind !== "prototype") row.appendChild(createTextNode(documentRef, "non-enum", "rod-inspector__badge"));
				return row;
			}
			function createInspectorSummary(value, documentRef, options) {
				const fragment = documentRef.createDocumentFragment();
				if (isDomNode(value)) {
					fragment.appendChild(createDomPreviewNode(value, documentRef, options));
					if (isDomElement(value)) fragment.appendChild(createInspectButton(value, documentRef));
					return fragment;
				}
				fragment.appendChild(createTextNode(documentRef, getObjectPreview(value, options)));
				return fragment;
			}
			function createRemainingMetaNode(source, documentRef) {
				if (!source.hasMore) return null;
				const remaining = source.total === null ? null : Math.max(0, source.total - source.count);
				return createTextNode(documentRef, remaining === null ? "… more properties" : `… ${remaining} more ${remaining === 1 ? "property" : "properties"}`, "rod-inspector__meta rod-inspector__footer");
			}
			function destroyVirtualizersWithin(root) {
				const bodies = [];
				const rootElement = safeCall(() => root.nodeType === 1 ? root : null, null);
				if (rootElement?.dataset.virtualized === "true") bodies.push(rootElement);
				for (const node of Array.from(root.querySelectorAll(".rod-inspector__body[data-virtualized=\"true\"]"))) bodies.push(node);
				for (const body of bodies) virtualizerByBody.get(body)?.destroy();
			}
			function createVirtualList(body, source, documentRef, context, footer) {
				const options = context.options;
				const count = source.count;
				const estimatedHeight = options.virtualRowHeight;
				const overscan = options.virtualOverscan;
				const windowRef = documentRef.defaultView ?? defaultWindow;
				const scheduler = createFrameScheduler(windowRef);
				const heights = new Float64Array(count);
				const offsets = new Float64Array(count + 1);
				const topSpacer = documentRef.createElement("div");
				const windowNode = documentRef.createElement("div");
				const bottomSpacer = documentRef.createElement("div");
				const observedRows = /* @__PURE__ */ new Map();
				const rowCache = /* @__PURE__ */ new Map();
				let resizeObserver = null;
				let bodyResizeObserver = null;
				let frame = null;
				let postLayoutFrame = null;
				let destroyedVirtualizer = false;
				let offsetsDirty = true;
				let lastStart = -1;
				let lastEnd = -1;
				let renderClock = 0;
				let lastBodyWidth = -1;
				let lastBodyHeight = -1;
				heights.fill(estimatedHeight);
				body.dataset.virtualized = "true";
				body.style.setProperty("--rod-inspector-virtual-max-height", `${options.virtualMaxHeight}px`);
				topSpacer.className = "rod-inspector__virtual-spacer";
				windowNode.className = "rod-inspector__virtual-window";
				bottomSpacer.className = "rod-inspector__virtual-spacer";
				body.replaceChildren(topSpacer, windowNode, bottomSpacer, ...footer ? [footer] : []);
				const rebuildOffsets = () => {
					if (!offsetsDirty) return;
					offsets[0] = 0;
					for (let index = 0; index < count; index += 1) offsets[index + 1] = offsets[index] + heights[index];
					offsetsDirty = false;
				};
				const totalHeight = () => {
					rebuildOffsets();
					return offsets[count];
				};
				const offsetFor = (index) => {
					rebuildOffsets();
					return offsets[clamp(index, 0, count)];
				};
				const findIndexAtOffset = (offset) => {
					rebuildOffsets();
					if (count <= 1) return 0;
					const target = clamp(offset, 0, Math.max(0, offsets[count] - 1));
					let low = 0;
					let high = count;
					while (low < high) {
						const middle = low + high >>> 1;
						if (offsets[middle + 1] <= target) low = middle + 1;
						else high = middle;
					}
					return clamp(low, 0, count - 1);
				};
				const disconnectObservedRows = () => {
					if (resizeObserver) for (const row of observedRows.keys()) resizeObserver.unobserve(row);
					observedRows.clear();
				};
				const getMeasuredHeight = (row, resizeEntry) => {
					const borderBoxSize = resizeEntry?.borderBoxSize;
					const blockSize = Array.isArray(borderBoxSize) ? borderBoxSize[0]?.blockSize : borderBoxSize && typeof borderBoxSize === "object" ? borderBoxSize.blockSize : void 0;
					const measured = Number.isFinite(blockSize) ? Number(blockSize) : safeCall(() => row.getBoundingClientRect().height, estimatedHeight);
					return Math.max(estimatedHeight, Math.ceil(measured));
				};
				const scheduleRender = (force = false) => {
					if (destroyedVirtualizer) return;
					if (force) {
						lastStart = -1;
						lastEnd = -1;
					}
					if (frame !== null) return;
					frame = scheduler.request(() => render(force));
				};
				const applyMeasurements = (entries) => {
					if (destroyedVirtualizer) return;
					const anchorIndex = findIndexAtOffset(body.scrollTop);
					const anchorDelta = body.scrollTop - offsetFor(anchorIndex);
					let changed = false;
					if (entries) for (const resizeEntry of entries) {
						const index = observedRows.get(resizeEntry.target);
						if (index === void 0) continue;
						const height = getMeasuredHeight(resizeEntry.target, resizeEntry);
						if (Math.abs(heights[index] - height) > 1) {
							heights[index] = height;
							changed = true;
						}
					}
					else for (const [row, index] of observedRows) {
						const height = getMeasuredHeight(row);
						if (Math.abs(heights[index] - height) > 1) {
							heights[index] = height;
							changed = true;
						}
					}
					if (!changed) return;
					offsetsDirty = true;
					const nextScrollTop = offsetFor(anchorIndex) + anchorDelta;
					if (Math.abs(body.scrollTop - nextScrollTop) > 1) body.scrollTop = nextScrollTop;
					scheduleRender(true);
				};
				const createVirtualRow = (index) => {
					const wrapper = documentRef.createElement("div");
					wrapper.className = "rod-inspector__virtual-row";
					wrapper.dataset.virtualIndex = String(index);
					wrapper.appendChild(createPropertyRow(documentRef, source.get(index), context));
					return wrapper;
				};
				const getVirtualRow = (index) => {
					const cached = rowCache.get(index);
					if (cached) {
						cached.lastUsed = renderClock;
						return cached.node;
					}
					const node = createVirtualRow(index);
					if (options.virtualRowCache > 0) rowCache.set(index, {
						node,
						lastUsed: renderClock
					});
					return node;
				};
				const pruneRowCache = (visibleIndexes) => {
					const maxCache = Math.max(options.virtualRowCache, visibleIndexes.size);
					if (maxCache <= 0 || rowCache.size <= maxCache) return;
					const candidates = [];
					for (const [index, cached] of rowCache) if (!visibleIndexes.has(index)) candidates.push([index, cached.lastUsed]);
					candidates.sort((left, right) => left[1] - right[1]);
					const removeCount = Math.max(0, rowCache.size - maxCache);
					for (let index = 0; index < removeCount; index += 1) {
						const candidate = candidates[index];
						if (candidate) rowCache.delete(candidate[0]);
					}
				};
				const render = (force = false) => {
					frame = null;
					if (destroyedVirtualizer || count <= 0) return;
					const scrollTop = body.scrollTop;
					const viewportHeight = Math.max(estimatedHeight, body.clientHeight || options.virtualMaxHeight);
					const firstVisible = findIndexAtOffset(scrollTop);
					const lastVisible = findIndexAtOffset(scrollTop + viewportHeight);
					const start = Math.max(0, firstVisible - overscan);
					const end = Math.min(count, lastVisible + overscan + 1);
					if (!force && start === lastStart && end === lastEnd) return;
					lastStart = start;
					lastEnd = end;
					renderClock += 1;
					disconnectObservedRows();
					windowNode.replaceChildren();
					const fragment = documentRef.createDocumentFragment();
					const visibleIndexes = /* @__PURE__ */ new Set();
					for (let index = start; index < end; index += 1) {
						const wrapper = getVirtualRow(index);
						visibleIndexes.add(index);
						fragment.appendChild(wrapper);
						observedRows.set(wrapper, index);
					}
					windowNode.appendChild(fragment);
					topSpacer.style.height = `${offsetFor(start)}px`;
					bottomSpacer.style.height = `${Math.max(0, totalHeight() - offsetFor(end))}px`;
					pruneRowCache(visibleIndexes);
					if (resizeObserver) for (const row of observedRows.keys()) resizeObserver.observe(row);
					else scheduler.request(() => applyMeasurements());
				};
				const handleScroll = () => scheduleRender(false);
				const ResizeObserverCtor = safeCall(() => windowRef.ResizeObserver, void 0);
				if (typeof ResizeObserverCtor === "function") {
					resizeObserver = new ResizeObserverCtor((entries) => {
						applyMeasurements(entries);
					});
					const containerObserver = new ResizeObserverCtor((entries) => {
						const rect = entries[0]?.contentRect;
						const width = Math.round(rect?.width ?? body.clientWidth);
						const height = Math.round(rect?.height ?? body.clientHeight);
						if (width === lastBodyWidth && height === lastBodyHeight) return;
						lastBodyWidth = width;
						lastBodyHeight = height;
						scheduleRender(true);
					});
					bodyResizeObserver = containerObserver;
					containerObserver.observe(body);
				}
				body.addEventListener("scroll", handleScroll, { passive: true });
				scheduleRender(true);
				postLayoutFrame = scheduler.request(() => {
					postLayoutFrame = null;
					scheduleRender(true);
				});
				const controller = { destroy() {
					if (destroyedVirtualizer) return;
					destroyedVirtualizer = true;
					body.removeEventListener("scroll", handleScroll);
					disconnectObservedRows();
					resizeObserver?.disconnect();
					bodyResizeObserver?.disconnect();
					scheduler.cancel(frame);
					scheduler.cancel(postLayoutFrame);
					frame = null;
					postLayoutFrame = null;
					rowCache.clear();
					body.removeAttribute("data-virtualized");
					body.style.removeProperty("--rod-inspector-virtual-max-height");
					activeVirtualizers.delete(controller);
					virtualizerByBody.delete(body);
				} };
				activeVirtualizers.add(controller);
				virtualizerByBody.set(body, controller);
				return controller;
			}
			function mountInspectorBody(body, source, documentRef, context) {
				const footer = createRemainingMetaNode(source, documentRef);
				if (!source.count) {
					body.replaceChildren(createTextNode(documentRef, context.options.inspectItems === 0 ? "Inspection limit is 0" : "No inspectable properties", "rod-inspector__meta"), ...footer ? [footer] : []);
					return null;
				}
				if (context.options.virtualize && source.count >= context.options.virtualizeAfter) return createVirtualList(body, source, documentRef, context, footer);
				body.removeAttribute("data-virtualized");
				body.replaceChildren();
				const fragment = documentRef.createDocumentFragment();
				for (let index = 0; index < source.count; index += 1) fragment.appendChild(createPropertyRow(documentRef, source.get(index), context));
				if (footer) fragment.appendChild(footer);
				body.appendChild(fragment);
				return null;
			}
			function renderObject(value, documentRef, context) {
				const details = documentRef.createElement("details");
				const summary = documentRef.createElement("summary");
				const body = documentRef.createElement("div");
				let initialized = false;
				let virtualizer = null;
				details.className = "rod-inspector";
				details.dataset.theme = context.options.theme;
				body.className = "rod-inspector__body";
				summary.appendChild(createInspectorSummary(value, documentRef, context.options));
				details.append(summary, body);
				const initialize = () => {
					if (initialized || destroyed) return;
					initialized = true;
					const source = createEntrySource(value, context.options);
					virtualizer = mountInspectorBody(body, source, documentRef, context);
				};
				const release = () => {
					if (!initialized || !context.options.unmountOnCollapse) return;
					destroyVirtualizersWithin(body);
					virtualizer?.destroy();
					virtualizer = null;
					body.replaceChildren();
					body.removeAttribute("data-virtualized");
					initialized = false;
				};
				details.addEventListener("toggle", () => {
					if (details.open) initialize();
					else release();
				});
				if (context.depth < context.options.expandDepth) {
					details.open = true;
					initialize();
				}
				return details;
			}
			function renderValueInternal(value, documentRef, context) {
				if (!isObjectLike(value)) return renderPrimitive(value, documentRef, context.quoteStrings);
				if (context.ancestors.has(value)) return createTextNode(documentRef, `↩ ${getObjectPreview(value, context.options)}`, "rod-token--circular");
				if (context.depth >= context.options.inspectDepth) return createTextNode(documentRef, getObjectPreview(value, context.options), "rod-token--meta");
				const nextAncestors = new Set(context.ancestors);
				nextAncestors.add(value);
				return renderObject(value, documentRef, {
					...context,
					ancestors: nextAncestors
				});
			}
			function renderValue(value, documentRef = defaultDocument, context = {}) {
				if (destroyed) throw new Error("RodObjectInspector runtime has been destroyed.");
				const documentValue = assertDocument(documentRef);
				const options = normalizeOptions({
					...baseOptions,
					...context.options ?? {}
				});
				const depth = Number.isFinite(context.depth) ? Math.max(0, Math.trunc(Number(context.depth))) : 0;
				const ancestors = /* @__PURE__ */ new Set();
				for (const ancestor of context.ancestors ?? []) if (isObjectLike(ancestor)) ancestors.add(ancestor);
				if (autoStyle) ensureStyle(documentValue);
				return renderValueInternal(value, documentValue, {
					depth,
					ancestors,
					quoteStrings: context.quoteStrings !== false,
					options
				});
			}
			return {
				version: VERSION,
				options: Object.freeze({ ...baseOptions }),
				render: renderValue,
				renderValue,
				getObjectPreview,
				getInlinePreview,
				isDomNode,
				isDomElement,
				inspectElement,
				highlightElement,
				clearHighlight,
				ensureStyle(target = defaultDocument) {
					return ensureStyle(target);
				},
				destroy() {
					if (destroyed) return;
					destroyed = true;
					clearHighlight();
					for (const virtualizer of [...activeVirtualizers]) virtualizer.destroy();
					activeVirtualizers.clear();
				}
			};
		}
		let defaultRuntime = null;
		function getDefaultRuntime() {
			if (!defaultRuntime) defaultRuntime = createInspector();
			return defaultRuntime;
		}
		publishApi(Object.freeze({
			version: VERSION,
			defaults: Object.freeze({ ...DEFAULT_OPTIONS }),
			cssText: CSS_TEXT,
			create: createInspector,
			createStyle,
			ensureStyle,
			render(value, documentRef, context) {
				return getDefaultRuntime().render(value, documentRef, context);
			},
			getObjectPreview(value, options) {
				return getDefaultRuntime().getObjectPreview(value, options);
			},
			getInlinePreview(value, options) {
				return getDefaultRuntime().getInlinePreview(value, options);
			},
			getPublishedScopes() {
				return Object.freeze([...globalScopes]);
			}
		}));
	})(typeof window !== "undefined" ? window : globalThis);

//#endregion
//#region \0rod-iife-entry:browser:/home/runner/work/rodkisten.github.io/rodkisten.github.io/object-inspector/object-inspector.ts
	const __globalName = "RodObjectInspector";
	const __roots = [];
	function __addRoot(value) {
		if (!value || typeof value !== "object" && typeof value !== "function") return;
		if (!__roots.includes(value)) __roots.push(value);
	}
	__addRoot(globalThis);
	try {
		if (typeof window !== "undefined") __addRoot(window);
	} catch {}
	try {
		if (typeof self !== "undefined") __addRoot(self);
	} catch {}
	try {
		if (typeof unsafeWindow !== "undefined") __addRoot(unsafeWindow);
	} catch {}
	try {
		if (typeof window !== "undefined") __addRoot(window.parent);
	} catch {}
	try {
		if (typeof window !== "undefined") __addRoot(window.top);
	} catch {}
	let __existing;
	for (const __root of __roots) try {
		const __candidate = __root[__globalName];
		if (__candidate !== void 0) {
			__existing = __candidate;
			break;
		}
	} catch {}
	const __hasExports = Object.keys(object_inspector_exports).length > 0;
	const __value = Object.prototype.hasOwnProperty.call(object_inspector_exports, "default") ? void 0 : Object.prototype.hasOwnProperty.call(object_inspector_exports, __globalName) ? object_inspector_exports[__globalName] : __hasExports ? object_inspector_exports : __existing;
	function __publish(__root) {
		if (__value === void 0) return;
		try {
			Object.defineProperty(__root, __globalName, {
				value: __value,
				configurable: true,
				writable: true
			});
			return;
		} catch {}
		try {
			__root[__globalName] = __value;
		} catch {}
	}
	for (const __root of __roots) __publish(__root);

//#endregion
return __value;
})();