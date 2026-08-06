/* Generated from toaster/toaster.ts. Do not edit directly. */
var RodToaster = (function() {

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
//#region toaster/toaster.ts
	var toaster_exports = /* @__PURE__ */ __exportAll({});
	(function installRodToaster(globalWindow) {
		"use strict";
		const VERSION = "4.2.0";
		const TOAST_GLOBAL = "RodToaster";
		const INSPECTOR_GLOBAL = "RodObjectInspector";
		const TOAST_HOST_ID = "__rod-super-toaster-host__";
		const STATE_SYMBOL = Symbol.for("rod.super-toaster.state");
		const OPTIONS_SYMBOL = Symbol("rod.super-toaster.options");
		const HISTORY_PATCH_SYMBOL = Symbol.for("rod.super-toaster.history-navigation-patch");
		const MAX_Z_INDEX = 2147483647;
		const TOAST_COLORS = {
			default: {
				bg: "rgba(23,23,23,.985)",
				border: "rgba(255,255,255,.11)",
				text: "rgba(232,232,232,.96)",
				accent: "rgba(244,244,245,.9)",
				icon: "circle"
			},
			error: {
				bg: "rgba(23,23,23,.985)",
				border: "rgba(251,113,133,.2)",
				text: "rgba(244,244,245,.96)",
				accent: "rgba(251,154,166,.98)",
				icon: "circle-x"
			},
			info: {
				bg: "rgba(23,23,23,.985)",
				border: "rgba(186,230,253,.16)",
				text: "rgba(244,244,245,.96)",
				accent: "rgba(186,230,253,.96)",
				icon: "info"
			},
			success: {
				bg: "rgba(23,23,23,.985)",
				border: "rgba(255,255,255,.12)",
				text: "rgba(244,244,245,.96)",
				accent: "rgba(250,250,250,.98)",
				icon: "check"
			},
			warning: {
				bg: "rgba(23,23,23,.985)",
				border: "rgba(250,204,21,.2)",
				text: "rgba(244,244,245,.96)",
				accent: "rgba(250,212,119,.98)",
				icon: "triangle-alert"
			},
			debug: {
				bg: "rgba(23,23,23,.985)",
				border: "rgba(255,255,255,.11)",
				text: "rgba(232,232,232,.96)",
				accent: "rgba(212,212,216,.94)",
				icon: "terminal"
			}
		};
		const LIGHT_TOAST_COLORS = {
			default: {
				bg: "rgba(255,255,255,.985)",
				border: "rgba(24,24,27,.11)",
				text: "rgba(39,39,42,.94)",
				accent: "rgba(39,39,42,.84)"
			},
			error: {
				bg: "rgba(255,255,255,.985)",
				border: "rgba(190,18,60,.16)",
				text: "rgba(39,39,42,.96)",
				accent: "rgba(190,18,60,.94)"
			},
			info: {
				bg: "rgba(255,255,255,.985)",
				border: "rgba(3,105,161,.15)",
				text: "rgba(39,39,42,.96)",
				accent: "rgba(3,105,161,.9)"
			},
			success: {
				bg: "rgba(255,255,255,.985)",
				border: "rgba(24,24,27,.12)",
				text: "rgba(39,39,42,.96)",
				accent: "rgba(24,24,27,.94)"
			},
			warning: {
				bg: "rgba(255,255,255,.985)",
				border: "rgba(161,98,7,.17)",
				text: "rgba(39,39,42,.96)",
				accent: "rgba(161,98,7,.94)"
			},
			debug: {
				bg: "rgba(255,255,255,.985)",
				border: "rgba(24,24,27,.11)",
				text: "rgba(39,39,42,.94)",
				accent: "rgba(63,63,70,.86)"
			}
		};
		const SVG_ICONS = {
			circle: `<circle cx="12" cy="12" r="7.5"></circle>`,
			"circle-x": `<circle cx="12" cy="12" r="9"></circle><path d="m9 9 6 6"></path><path d="m15 9-6 6"></path>`,
			info: `<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><path d="M12 8h.01"></path>`,
			check: `<path class="rod-icon-check-path" d="m6.5 12.5 3.25 3.25L17.5 8"></path>`,
			"triangle-alert": `<path d="M10.3 3.8 2.4 18a2 2 0 0 0 1.75 3h15.7a2 2 0 0 0 1.75-3L13.7 3.8a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>`,
			terminal: `<path d="m7 8 4 4-4 4"></path><path d="M13 16h4"></path>`,
			x: `<path d="M6 6l12 12"></path><path d="M18 6 6 18"></path>`,
			"chevron-down": `<path d="m6 9 6 6 6-6"></path>`,
			"chevrons-up": `<path d="m17 11-5-5-5 5"></path><path d="m17 18-5-5-5 5"></path>`,
			"x-circle": `<circle cx="12" cy="12" r="9"></circle><path d="m9 9 6 6"></path><path d="m15 9-6 6"></path>`,
			"loader-circle": `<path d="M21 12a9 9 0 1 1-6.22-8.56"></path>`,
			download: `<path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path>`,
			upload: `<path d="M12 21V9"></path><path d="m7 14 5-5 5 5"></path><path d="M5 3h14"></path>`,
			refresh: `<path d="M20 11a8 8 0 1 0 2 5"></path><path d="M20 4v7h-7"></path>`,
			clock: `<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>`,
			sparkles: `<path d="m12 3-1.1 2.9L8 7l2.9 1.1L12 11l1.1-2.9L16 7l-2.9-1.1Z"></path><path d="m19 13-.7 1.8-1.8.7 1.8.7L19 18l.7-1.8 1.8-.7-1.8-.7Z"></path><path d="m5 14-.8 2.2L2 17l2.2.8L5 20l.8-2.2L8 17l-2.2-.8Z"></path>`,
			history: `<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path><path d="M12 7v5l3 2"></path>`,
			send: `<path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path>`,
			copy: `<rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>`,
			pause: `<path d="M9 5v14"></path><path d="M15 5v14"></path>`,
			play: `<path d="m8 5 11 7-11 7Z"></path>`,
			square: `<rect x="5" y="5" width="14" height="14" rx="2"></rect>`,
			list: `<path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path>`,
			folder: `<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3Z"></path>`,
			eye: `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle>`,
			trash: `<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 15H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path>`,
			undo: `<path d="M9 7 4 12l5 5"></path><path d="M20 17a7 7 0 0 0-7-7H4"></path>`,
			settings: `<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21H9.6v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H3V9.6h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V3h4v.09a1.7 1.7 0 0 0 1.1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.15.36.36.7.6 1 .27.3.63.5 1 .6h.09v4H21a1.7 1.7 0 0 0-1.6.4Z"></path>`
		};
		const DEFAULT_CONFIG = {
			duration: 15e3,
			debugDuration: 0,
			shouldDebug: true,
			downloadFallback: globalWindow.console?.debug?.bind(globalWindow.console) ?? globalWindow.console?.log?.bind(globalWindow.console) ?? null,
			maxToasts: 20,
			dedupe: true,
			dedupeWindow: 1e3,
			pauseOnInteraction: true,
			closeButton: true,
			position: "top-center",
			theme: "auto",
			stacked: true,
			stackVisible: 3,
			stackMaxHeight: 660,
			stackViewportRatio: .62,
			stackToolbar: true,
			persistAcrossSpaNavigation: true,
			minimizeOnSpaNavigation: true,
			persistTasks: false,
			restoreTasksOnLoad: true,
			taskStorage: "sessionStorage",
			taskStorageKey: "__rod_super_toaster_tasks_v1__",
			maxPersistedTasks: 50,
			taskTerminalRetention: 864e5,
			successExitAnimation: true,
			successCollapseDuration: 360,
			successExitDuration: 220,
			loadingDuration: 0,
			loadingAnimation: "spinner",
			loadingIcon: "loader-circle",
			loadingSuccessDuration: 1400,
			loadingErrorDuration: 7e3,
			loadingInfoDuration: 4e3,
			loadingWarningDuration: 6e3,
			coalescePersistent: true,
			swipeToDismiss: true,
			swipeThreshold: 72,
			swipeVelocity: .45,
			objectInspectorSrc: null,
			objectInspectorLoadTimeout: 15e3,
			inspectDepth: 80,
			inspectItems: 1e3,
			previewItems: 30,
			showPrototype: false,
			showNonEnumerable: false,
			showObjectLength: false,
			virtualizeInspector: true,
			virtualizeAfter: 60,
			virtualRowHeight: 24,
			virtualOverscan: 8,
			virtualMaxHeight: 360,
			unmountInspectorOnCollapse: true,
			useShadowRoot: true,
			shadowRootMode: "closed",
			fallbackToLightDom: true
		};
		const OPTION_KEYS = /* @__PURE__ */ new Set([
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
			"loading",
			"loadingState",
			"title",
			"description",
			"icon",
			"animation",
			"progress",
			"progressLabel",
			"dismissible",
			"actions",
			"scope",
			"metadata",
			"details",
			"onDismiss"
		]);
		const LOADING_DESCRIPTOR_KEYS = /* @__PURE__ */ new Set([
			"title",
			"description",
			"icon",
			"animation",
			"progress",
			"progressLabel",
			"duration",
			"id",
			"dedupe",
			"dedupeWindow",
			"pauseOnInteraction",
			"closeButton",
			"role",
			"swipeToDismiss",
			"swipeThreshold",
			"swipeVelocity",
			"scope",
			"metadata",
			"onDismiss"
		]);
		const ALLOWED_LOADING_ANIMATIONS = /* @__PURE__ */ new Set([
			"spinner",
			"pulse",
			"progress",
			"none"
		]);
		const ALLOWED_POSITIONS = /* @__PURE__ */ new Set([
			"top-center",
			"top-left",
			"top-right",
			"bottom-center",
			"bottom-left",
			"bottom-right"
		]);
		const ALLOWED_ACTION_VARIANTS = /* @__PURE__ */ new Set([
			"primary",
			"secondary",
			"danger",
			"ghost"
		]);
		const ALLOWED_TASK_STATUSES = /* @__PURE__ */ new Set([
			"queued",
			"running",
			"paused",
			"success",
			"error",
			"warning",
			"cancelled"
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
		function isObject(value) {
			return typeof value === "object" && value !== null || typeof value === "function";
		}
		function isDomNode(value) {
			return isObject(value) && "nodeType" in value && typeof value.cloneNode === "function";
		}
		function isElementLike(value) {
			return isDomNode(value) && typeof value.matches === "function";
		}
		function isInputElement(value) {
			return isElementLike(value) && String(value.tagName).toUpperCase() === "INPUT";
		}
		function isUnknownRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		function isPlainObject(value) {
			if (!isUnknownRecord(value)) return false;
			const prototype = safeCall(() => Object.getPrototypeOf(value), null);
			return prototype === Object.prototype || prototype === null;
		}
		function toErrorMessage(error) {
			if (error instanceof Error) return error.message || error.name;
			return String(error);
		}
		function toErrorDetails(error) {
			if (error instanceof Error) return error.stack || error.message || error.name;
			return String(error);
		}
		function safePrimitiveText(value, quoteStrings) {
			if (value === null) return "null";
			if (value === void 0) return "undefined";
			if (typeof value === "string") return quoteStrings ? JSON.stringify(value) : value;
			if (typeof value === "bigint") return `${value}n`;
			if (typeof value === "symbol") return safeCall(() => value.toString(), "Symbol(?)");
			if (typeof value === "function") return `ƒ ${safeCall(() => value.name || "anonymous", "anonymous")}()`;
			return String(value);
		}
		function normalizeProgress(value) {
			if (value === null || value === void 0 || value === "") return null;
			const numeric = Number(value);
			if (!Number.isFinite(numeric)) return null;
			return clamp(numeric > 1 ? numeric / 100 : numeric, 0, 1);
		}
		function normalizeLoadingAnimation(value) {
			return typeof value === "string" && ALLOWED_LOADING_ANIMATIONS.has(value) ? value : "spinner";
		}
		function normalizeTheme(value) {
			return value === "dark" || value === "light" || value === "auto" ? value : "auto";
		}
		function normalizeTaskStatus(value) {
			return typeof value === "string" && ALLOWED_TASK_STATUSES.has(value) ? value : "queued";
		}
		function createSvgIcon(documentRef, name, size = 18) {
			const svg = documentRef.createElementNS("http://www.w3.org/2000/svg", "svg");
			svg.setAttribute("viewBox", "0 0 24 24");
			svg.setAttribute("width", String(size));
			svg.setAttribute("height", String(size));
			svg.setAttribute("fill", "none");
			svg.setAttribute("stroke", "currentColor");
			svg.setAttribute("stroke-width", "2");
			svg.setAttribute("stroke-linecap", "round");
			svg.setAttribute("stroke-linejoin", "round");
			svg.setAttribute("aria-hidden", "true");
			svg.setAttribute("focusable", "false");
			const iconName = hasOwn(SVG_ICONS, name) ? name : "circle";
			svg.innerHTML = SVG_ICONS[iconName];
			return svg;
		}
		function parseLoadingInput(inputArgs, base = {}) {
			const args = [...inputArgs];
			const next = { ...base };
			if (!args.length) return next;
			const first = args.shift();
			if (isLoadingDescriptor(first)) Object.assign(next, first);
			else if (first !== void 0 && first !== null) next.title = String(first);
			if (args.length) {
				const second = args.shift();
				if (isLoadingDescriptor(second)) Object.assign(next, second);
				else if (second !== void 0 && second !== null) next.description = String(second);
			}
			if (args.length && isLoadingDescriptor(args[0])) Object.assign(next, args[0]);
			return next;
		}
		function isLoadingDescriptor(value) {
			return isPlainObject(value) && Reflect.ownKeys(value).some((key) => typeof key === "string" && LOADING_DESCRIPTOR_KEYS.has(key));
		}
		function getHighestAccessibleWindow(startWindow) {
			let currentWindow = startWindow;
			while (currentWindow.parent && currentWindow.parent !== currentWindow) try {
				const parentWindow = currentWindow.parent;
				parentWindow.document.documentElement;
				currentWindow = parentWindow;
			} catch {
				break;
			}
			return currentWindow;
		}
		const initialHostWindow = getHighestAccessibleWindow(globalWindow);
		const typedGlobalWindow = globalWindow;
		const typedInitialHostWindow = initialHostWindow;
		const existingToaster = safeCall(() => typedInitialHostWindow[TOAST_GLOBAL] ?? typedGlobalWindow[TOAST_GLOBAL] ?? null, null);
		if (existingToaster) {
			typedGlobalWindow[TOAST_GLOBAL] = existingToaster;
			typedGlobalWindow.toast = existingToaster;
			return;
		}
		const existingState = safeCall(() => typedInitialHostWindow[STATE_SYMBOL] ?? null, null);
		if (existingState?.api) {
			typedGlobalWindow[TOAST_GLOBAL] = existingState.api;
			typedGlobalWindow.toast = existingState.api;
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
			renderRoot: null,
			hostMode: null,
			container: null,
			toasts: [],
			recordsById: /* @__PURE__ */ new Map(),
			dedupeRecords: /* @__PURE__ */ new Map(),
			objectIds: /* @__PURE__ */ new WeakMap(),
			nextObjectId: 1,
			stackExpanded: false,
			managerMinimized: false,
			resolvedTheme: "dark",
			themeMediaQuery: null,
			themeCleanup: null,
			managerNode: null,
			list: null,
			toolbar: null,
			stackCountNode: null,
			managerCountNode: null,
			listeners: /* @__PURE__ */ new Map(),
			tasks: /* @__PURE__ */ new Map(),
			groups: /* @__PURE__ */ new Map(),
			restoredTasks: false,
			outsidePointerDownHandler: null,
			inspectorPromise: null,
			inspectorApi: null,
			inspectorRuntime: null,
			inspectorStyle: null,
			spaObserver: null,
			spaCleanup: null,
			hostRepairFrame: null,
			historyRestore: null
		};
		try {
			Object.defineProperty(typedInitialHostWindow, STATE_SYMBOL, {
				value: state,
				configurable: true
			});
		} catch {}
		function getObjectId(value) {
			const known = state.objectIds.get(value);
			if (known !== void 0) return known;
			const id = state.nextObjectId++;
			state.objectIds.set(value, id);
			return id;
		}
		function getFallbackObjectPreview(value) {
			if (Array.isArray(value)) return `Array(${value.length})`;
			const tag = safeCall(() => Object.prototype.toString.call(value), "[object Object]");
			if (tag === "[object Map]") return `Map(${safeCall(() => value.size, 0)})`;
			if (tag === "[object Set]") return `Set(${safeCall(() => value.size, 0)})`;
			if (tag === "[object Date]") return safeCall(() => value.toISOString(), "Date");
			if (tag === "[object RegExp]") return safeCall(() => String(value), "RegExp");
			if (/Error\]$/.test(tag)) {
				const candidate = value;
				return safeCall(() => `${String(candidate.name ?? "Error")}: ${String(candidate.message ?? "")}`, "Error");
			}
			const elementCandidate = value;
			if (elementCandidate.nodeType === 1 && typeof elementCandidate.tagName === "string") return `<${safeCall(() => elementCandidate.tagName.toLowerCase(), "element")}${safeCall(() => elementCandidate.id ? `#${elementCandidate.id}` : "", "")}>`;
			return `${safeCall(() => value.constructor?.name || "Object", "Object")} {…}`;
		}
		function createStyles(documentRef, hostMode) {
			const style = documentRef.createElement("style");
			style.textContent = `
      ${hostMode === "shadow" ? ":host{all:initial;contain:layout style;color-scheme:dark}" : `#${TOAST_HOST_ID}{all:initial!important;contain:layout style;color-scheme:dark}`}
      ${hostMode === "shadow" ? "*,*::before,*::after{box-sizing:border-box}" : `#${TOAST_HOST_ID} *,#${TOAST_HOST_ID} *::before,#${TOAST_HOST_ID} *::after{box-sizing:border-box}`}
      ${hostMode === "shadow" ? "button,input,textarea,select{font:inherit}" : `#${TOAST_HOST_ID} button,#${TOAST_HOST_ID} input,#${TOAST_HOST_ID} textarea,#${TOAST_HOST_ID} select{font:inherit}`}
      .rod-toast-stack{
        --rod-surface:rgba(23,23,23,.985);--rod-surface-raised:rgba(28,28,29,.992);
        --rod-border:rgba(255,255,255,.105);--rod-border-strong:rgba(255,255,255,.18);
        --rod-text:rgba(232,232,232,.96);--rod-text-strong:rgba(255,255,255,.985);
        --rod-muted:rgba(163,163,163,.9);--rod-muted-soft:rgba(132,132,137,.84);
        --rod-hover:rgba(255,255,255,.07);--rod-overlay:rgba(255,255,255,.05);
        --rod-focus:rgba(255,255,255,.34);--rod-toast-stack-max-height:660px;
        --rod-toast-stack-max-viewport:62dvh;--rod-toast-width:min(580px,calc(100vw - 28px));
        --rod-shadow:0 1px 0 rgba(255,255,255,.055) inset,0 2px 3px rgba(0,0,0,.2),0 18px 46px rgba(0,0,0,.38);
        --rod-shadow-raised:0 1px 0 rgba(255,255,255,.07) inset,0 4px 8px rgba(0,0,0,.22),0 28px 66px rgba(0,0,0,.46);
        --rod-ease-spring:cubic-bezier(.16,1,.3,1);--rod-ease-soft:cubic-bezier(.22,.61,.36,1);
        position:fixed;z-index:${MAX_Z_INDEX};isolation:isolate;display:flex;flex-direction:column;align-items:center;
        gap:11px;pointer-events:none;color:var(--rod-text);color-scheme:dark;
        font:440 var(--rod-toaster-font-size,15px)/var(--rod-toaster-line-height,1.48) Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif
      }
      .rod-toast-stack[data-theme="light"]{
        --rod-surface:rgba(255,255,255,.985);--rod-surface-raised:rgba(255,255,255,.998);
        --rod-border:rgba(24,24,27,.105);--rod-border-strong:rgba(24,24,27,.17);
        --rod-text:rgba(39,39,42,.94);--rod-text-strong:rgba(9,9,11,.98);
        --rod-muted:rgba(82,82,91,.82);--rod-muted-soft:rgba(113,113,122,.78);
        --rod-hover:rgba(24,24,27,.065);--rod-overlay:rgba(24,24,27,.045);--rod-focus:rgba(24,24,27,.32);
        --rod-shadow:0 1px 0 rgba(255,255,255,.96) inset,0 1px 3px rgba(15,23,42,.08),0 18px 48px rgba(15,23,42,.15);
        --rod-shadow-raised:0 1px 0 rgba(255,255,255,1) inset,0 3px 8px rgba(15,23,42,.09),0 28px 64px rgba(15,23,42,.18);
        color-scheme:light
      }
      .rod-toast-stack[data-position^="top"]{top:max(env(safe-area-inset-top,0px),16px);right:max(env(safe-area-inset-right,0px),16px);left:max(env(safe-area-inset-left,0px),16px)}
      .rod-toast-stack[data-position^="bottom"]{right:max(env(safe-area-inset-right,0px),16px);bottom:max(env(safe-area-inset-bottom,0px),16px);left:max(env(safe-area-inset-left,0px),16px);flex-direction:column-reverse}
      .rod-toast-stack[data-position$="left"]{align-items:flex-start}.rod-toast-stack[data-position$="right"]{align-items:flex-end}
      .rod-toast-stack__list,.rod-toast-stack__toolbar{width:var(--rod-toast-width)}
      .rod-toast-stack__manager{appearance:none;position:relative;display:none;place-items:center;align-self:center;width:50px;height:50px;padding:0;border:1px solid var(--rod-border);border-radius:999px;outline:0;background:var(--rod-surface);color:var(--rod-text-strong);box-shadow:var(--rod-shadow-raised);backdrop-filter:blur(28px) saturate(1.28);-webkit-backdrop-filter:blur(28px) saturate(1.28);pointer-events:auto;touch-action:manipulation;cursor:pointer;animation:rod-toast-manager-enter 480ms var(--rod-ease-spring) both;transition:transform 300ms var(--rod-ease-spring),background-color 180ms,border-color 180ms}
      .rod-toast-stack__manager:hover,.rod-toast-stack__manager:focus-visible{border-color:var(--rod-border-strong);background:var(--rod-surface-raised);transform:translateY(-2px) scale(1.04)}
      .rod-toast-stack__manager svg{width:19px;height:19px;animation:rod-toast-spinner 850ms linear infinite}
      .rod-toast-stack__manager-count{position:absolute;top:-4px;right:-5px;display:none;min-width:19px;height:19px;padding:0 5px;border:2px solid var(--rod-surface);border-radius:999px;background:var(--rod-text-strong);color:var(--rod-surface);font:750 9px/15px system-ui,sans-serif;text-align:center}.rod-toast-stack__manager-count[data-visible="true"]{display:block}
      .rod-toast-stack[data-manager-minimized="true"] .rod-toast-stack__manager{display:grid}.rod-toast-stack[data-manager-minimized="true"] .rod-toast-stack__toolbar,.rod-toast-stack[data-manager-minimized="true"] .rod-toast-stack__list{display:none!important}
      .rod-toast-stack__toolbar{display:none;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:7px 8px 7px 16px;border:1px solid var(--rod-border);border-radius:16px;background:color-mix(in srgb,var(--rod-surface) 94%,transparent);box-shadow:var(--rod-shadow);backdrop-filter:blur(26px) saturate(1.3);-webkit-backdrop-filter:blur(26px) saturate(1.3);pointer-events:auto;user-select:none;animation:rod-toast-toolbar-enter 360ms var(--rod-ease-spring) both}
      .rod-toast-stack[data-expanded="true"][data-has-many="true"] .rod-toast-stack__toolbar[data-enabled="true"]{display:flex}
      .rod-toast-stack__toolbar-label{min-width:0;overflow:hidden;color:var(--rod-muted);font:650 12px/1.2 system-ui,sans-serif;text-overflow:ellipsis;white-space:nowrap}.rod-toast-stack__toolbar-actions{display:flex;gap:4px}
      .rod-toast-stack__toolbar-button,.rod-toast__close,.rod-toast__expand,.rod-toast__minimize{appearance:none;border:1px solid transparent;outline:0;background:transparent;color:inherit;touch-action:manipulation;cursor:pointer}
      .rod-toast-stack__toolbar-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:34px;padding:0 11px;border-radius:10px;color:var(--rod-muted);font:650 11px/1 system-ui,sans-serif;transition:all 180ms var(--rod-ease-spring)}
      .rod-toast-stack__toolbar-button:hover,.rod-toast-stack__toolbar-button:focus-visible{border-color:var(--rod-border);background:var(--rod-hover);color:var(--rod-text-strong);transform:translateY(-1px)}
      .rod-toast-stack__list{position:relative;isolation:isolate;display:flex;flex-direction:column;gap:11px;min-width:0;overflow:visible;pointer-events:none;overscroll-behavior:contain;scrollbar-width:thin}
      .rod-toast-stack[data-position^="bottom"] .rod-toast-stack__list{flex-direction:column-reverse}
      .rod-toast-stack__list::before,.rod-toast-stack__list::after{content:"";position:absolute;inset:0;border:1px solid var(--rod-border);border-radius:22px;background:var(--rod-surface);box-shadow:var(--rod-shadow);opacity:0;transform-origin:top center;pointer-events:none;transition:opacity 240ms,transform 480ms var(--rod-ease-spring)}
      .rod-toast-stack__list::before{z-index:-1}.rod-toast-stack__list::after{z-index:-2}
      .rod-toast-stack[data-expanded="false"][data-stack-depth="2"] .rod-toast-stack__list::before,.rod-toast-stack[data-expanded="false"][data-stack-depth="3"] .rod-toast-stack__list::before{opacity:.94;transform:translateY(12px) scaleX(.95)}
      .rod-toast-stack[data-expanded="false"][data-stack-depth="3"] .rod-toast-stack__list::after{opacity:.76;transform:translateY(22px) scaleX(.89)}
      .rod-toast-stack[data-expanded="true"] .rod-toast-stack__list{max-height:min(var(--rod-toast-stack-max-height),var(--rod-toast-stack-max-viewport));overflow-x:hidden;overflow-y:auto;padding:2px;pointer-events:auto;-webkit-overflow-scrolling:touch;scroll-behavior:smooth}
      .rod-toast-stack[data-expanded="false"] .rod-toast{display:none}.rod-toast-stack[data-expanded="false"] .rod-toast[data-stack-index="0"]{display:grid;cursor:grab}
      .rod-toast{--rod-toast-bg:var(--rod-surface);--rod-toast-border:var(--rod-border);--rod-toast-text:var(--rod-text);--rod-toast-accent:rgba(244,244,245,.76);position:relative;z-index:1;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:15px;width:100%;min-width:0;max-width:100%;min-height:78px;max-height:min(72dvh,760px);overflow:auto;padding:17px 14px 17px 18px;border:1px solid var(--rod-toast-border);border-radius:var(--rod-toaster-border-radius,22px);background:linear-gradient(180deg,color-mix(in srgb,var(--rod-toast-bg) 98%,white 2%),var(--rod-toast-bg));color:var(--rod-toast-text);box-shadow:var(--rod-shadow);opacity:0;filter:blur(5px);transform:translate3d(0,-18px,0) scale(.965);transform-origin:top center;transition:opacity 260ms,filter 360ms,transform 500ms var(--rod-ease-spring),border-color 180ms,background-color 180ms,width 420ms var(--rod-ease-spring),height 420ms var(--rod-ease-spring),padding 420ms var(--rod-ease-spring),border-radius 420ms var(--rod-ease-spring);pointer-events:auto;touch-action:none;user-select:text;overscroll-behavior:contain;backdrop-filter:blur(30px) saturate(1.35);-webkit-backdrop-filter:blur(30px) saturate(1.35);scrollbar-width:thin}
      .rod-toast-stack[data-position^="bottom"] .rod-toast{transform:translate3d(0,18px,0) scale(.965);transform-origin:bottom center}.rod-toast::before{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(118deg,rgba(255,255,255,.055),transparent 28%,transparent 72%,rgba(255,255,255,.018));pointer-events:none}.rod-toast[data-visible="true"]{opacity:1;filter:blur(0);transform:translate3d(0,0,0) scale(1)}.rod-toast:hover{border-color:color-mix(in srgb,var(--rod-toast-border) 72%,var(--rod-text-strong) 28%);box-shadow:var(--rod-shadow-raised)}
      .rod-toast-stack[data-theme="light"] .rod-toast{background:linear-gradient(180deg,rgba(255,255,255,.998),rgba(250,250,250,.992))}
      .rod-toast-stack[data-expanded="true"][data-has-many="true"] .rod-toast[data-item-expanded="false"]{max-height:64px;min-height:64px;overflow:hidden;cursor:pointer}.rod-toast-stack[data-expanded="true"][data-has-many="true"] .rod-toast[data-item-expanded="false"] .rod-toast__content{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rod-toast-stack[data-expanded="true"][data-has-many="true"] .rod-toast[data-item-expanded="true"]{max-height:min(68dvh,720px);overflow:auto;border-color:var(--rod-border-strong);background:var(--rod-surface-raised);box-shadow:var(--rod-shadow-raised)}
      .rod-toast__icon{position:relative;display:grid;place-items:center;width:26px;min-width:26px;height:26px;color:var(--rod-toast-accent);user-select:none;transition:color 180ms,transform 420ms var(--rod-ease-spring)}.rod-toast__icon svg{width:22px;height:22px;overflow:visible}.rod-toast[data-visible="true"] .rod-toast__icon{animation:rod-toast-icon-enter 520ms 90ms var(--rod-ease-spring) both}
      .rod-toast__content{position:relative;z-index:1;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;min-width:0;color:inherit;font-size:15px;letter-spacing:-.012em;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.rod-toast__arg{min-width:0;max-width:100%}.rod-toast__actions{position:relative;z-index:2;display:flex;align-items:center;gap:4px;margin:0}
      .rod-toast__count{display:none;min-width:27px;height:27px;padding:0 7px;border:1px solid var(--rod-border);border-radius:999px;background:var(--rod-overlay);color:var(--rod-muted);font:700 10px/25px system-ui,sans-serif;text-align:center}.rod-toast__count[data-visible="true"]{display:block}
      .rod-toast__close,.rod-toast__expand,.rod-toast__minimize{display:grid;place-items:center;width:38px;min-width:38px;height:38px;padding:0;border-radius:12px;color:var(--rod-muted);transition:all 180ms var(--rod-ease-spring)}.rod-toast__close:hover,.rod-toast__expand:hover,.rod-toast__minimize:hover,.rod-toast__close:focus-visible,.rod-toast__expand:focus-visible,.rod-toast__minimize:focus-visible{border-color:var(--rod-border);background:var(--rod-hover);color:var(--rod-text-strong);transform:scale(1.04)}.rod-toast__expand,.rod-toast__minimize{display:none}.rod-toast[data-loading="true"] .rod-toast__minimize,.rod-toast-stack[data-expanded="true"][data-has-many="true"] .rod-toast__expand{display:grid}.rod-toast[data-item-expanded="true"] .rod-toast__expand svg{transform:rotate(180deg)}
      .rod-token--null{color:rgb(216,180,254)}.rod-token--undefined,.rod-token--meta{color:rgb(212,212,216)}.rod-token--string{color:rgb(253,186,116)}.rod-token--number{color:rgb(190,242,100)}.rod-token--boolean{color:rgb(147,197,253);font-weight:600}.rod-token--symbol{color:rgb(94,234,212)}.rod-token--function{color:rgb(253,224,71)}.rod-toast__inspector-placeholder{color:var(--rod-muted);font-style:italic}
      .rod-toast__loading-copy,.rod-toast__confirm-copy,.rod-toast__rich-copy,.rod-toast__interactive-copy{display:grid;gap:6px;min-width:0;width:100%}.rod-toast__loading-title,.rod-toast__confirm-title,.rod-toast__rich-title,.rod-toast__interactive-title{color:var(--rod-text-strong);font:680 15px/1.34 Inter,system-ui,sans-serif;letter-spacing:-.02em}.rod-toast__loading-description,.rod-toast__confirm-description,.rod-toast__rich-description,.rod-toast__interactive-description{color:var(--rod-muted);font:430 13px/1.5 Inter,system-ui,sans-serif;letter-spacing:-.01em}
      .rod-toast[data-loading="true"][data-loading-icon="false"]{grid-template-columns:minmax(0,1fr) auto}.rod-toast[data-loading="true"][data-loading-icon="false"] .rod-toast__icon{display:none}.rod-toast[data-loading="true"][data-loading-content-empty="true"]{grid-template-columns:auto auto;justify-content:center;width:fit-content;min-width:0;max-width:min(100%,280px);margin-inline:auto}.rod-toast[data-loading="true"][data-loading-content-empty="true"] .rod-toast__content{display:none}
      .rod-toast__progress{display:grid;gap:7px;width:100%;margin-top:8px}.rod-toast__progress-meta{display:flex;justify-content:flex-end;min-height:14px;color:var(--rod-muted-soft);font:650 10px/1 system-ui,sans-serif}.rod-toast__progress-track{position:relative;width:100%;height:4px;overflow:hidden;border-radius:999px;background:var(--rod-overlay)}.rod-toast__progress-bar{position:absolute;inset:0 auto 0 0;width:var(--rod-loading-progress,0%);border-radius:inherit;background:linear-gradient(90deg,color-mix(in srgb,var(--rod-toast-accent) 84%,transparent),var(--rod-toast-accent));transition:width 420ms var(--rod-ease-soft)}.rod-toast:not([data-loading-animation="progress"]) .rod-toast__progress{display:none}.rod-toast[data-loading-indeterminate="true"] .rod-toast__progress-bar{width:38%;animation:rod-toast-progress-indeterminate 1.1s cubic-bezier(.4,0,.2,1) infinite}.rod-toast[data-loading-state="loading"] [data-loading-spinner="true"]{animation:rod-toast-spinner 850ms linear infinite}.rod-toast[data-loading-state="loading"] [data-loading-pulse="true"]{animation:rod-toast-pulse 1.35s cubic-bezier(.4,0,.6,1) infinite}
      .rod-toast[data-confirm="true"],.rod-toast[data-rich="true"],.rod-toast[data-interactive="true"]{min-width:min(470px,calc(100vw - 28px));max-width:min(620px,calc(100vw - 28px));padding-block:19px;touch-action:pan-y}.rod-toast[data-confirm="true"] .rod-toast__content,.rod-toast[data-rich="true"] .rod-toast__content,.rod-toast[data-interactive="true"] .rod-toast__content{display:block;width:100%}.rod-toast[data-confirm="true"] .rod-toast__minimize,.rod-toast[data-rich="true"] .rod-toast__minimize,.rod-toast[data-interactive="true"] .rod-toast__minimize,.rod-toast[data-confirm="true"] .rod-toast__expand,.rod-toast[data-rich="true"] .rod-toast__expand,.rod-toast[data-interactive="true"] .rod-toast__expand{display:none!important}
      .rod-toast__confirm,.rod-toast__rich,.rod-toast__interactive{display:grid;gap:17px;width:100%;min-width:0}.rod-toast__confirm-actions,.rod-toast__action-bar,.rod-toast__task-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:9px;width:100%}.rod-toast__confirm-button,.rod-toast__action-button,.rod-toast__task-button{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:40px;padding:0 15px;border:1px solid var(--rod-border);border-radius:12px;outline:0;background:var(--rod-overlay);color:var(--rod-text);font:650 12px/1 system-ui,sans-serif;cursor:pointer;transition:all 180ms var(--rod-ease-spring)}.rod-toast__confirm-button:hover:not(:disabled),.rod-toast__action-button:hover:not(:disabled),.rod-toast__task-button:hover:not(:disabled){border-color:var(--rod-border-strong);background:var(--rod-hover);transform:translateY(-2px)}.rod-toast__confirm-button:disabled,.rod-toast__action-button:disabled,.rod-toast__task-button:disabled{opacity:.5;cursor:wait}.rod-toast__confirm-button[data-variant="primary"],.rod-toast__action-button[data-variant="primary"]{border-color:var(--rod-text-strong);background:var(--rod-text-strong);color:var(--rod-surface)}.rod-toast__confirm-button[data-variant="danger"],.rod-toast__action-button[data-variant="danger"]{border-color:rgba(248,113,113,.3);background:rgba(127,29,29,.22);color:rgba(252,165,165,.98)}.rod-toast__confirm-button[data-variant="ghost"],.rod-toast__action-button[data-variant="ghost"]{border-color:transparent;background:transparent;color:var(--rod-muted)}
      .rod-toast__details{overflow:hidden;border:1px solid var(--rod-border);border-radius:12px;background:var(--rod-overlay)}.rod-toast__details summary{display:flex;align-items:center;min-height:36px;padding:0 11px;color:var(--rod-muted);font:600 11px/1 system-ui,sans-serif;cursor:pointer}.rod-toast__details-body{max-height:280px;overflow:auto;padding:10px;border-top:1px solid var(--rod-border);font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
      .rod-toast__field{display:grid;gap:6px;min-width:0}.rod-toast__field-label{color:var(--rod-muted);font:600 10px/1.2 system-ui,sans-serif}.rod-toast__input,.rod-toast__select,.rod-toast__textarea{appearance:none;width:100%;min-width:0;min-height:40px;padding:9px 11px;border:1px solid var(--rod-border);border-radius:12px;outline:0;background:var(--rod-overlay);color:var(--rod-text-strong);font:16px/1.45 system-ui,sans-serif}.rod-toast__textarea{min-height:96px;resize:vertical}.rod-toast__input:focus,.rod-toast__select:focus,.rod-toast__textarea:focus{border-color:var(--rod-border-strong);box-shadow:0 0 0 4px color-mix(in srgb,var(--rod-focus) 18%,transparent)}
      .rod-toast__checkboxes{display:grid;gap:7px}.rod-toast__checkbox{display:flex;align-items:flex-start;gap:8px;color:var(--rod-muted);font:11px/1.45 system-ui,sans-serif;cursor:pointer}.rod-toast__checkbox input{width:15px;height:15px;margin:1px 0 0;accent-color:var(--rod-text-strong)}
      .rod-toast__validation{display:none;padding:8px 10px;border:1px solid rgba(248,113,113,.24);border-radius:10px;background:rgba(127,29,29,.16);color:rgba(252,165,165,.96);font:500 11px/1.45 system-ui,sans-serif}.rod-toast__validation[data-visible="true"]{display:block}.rod-toast__countdown{display:none;gap:5px;color:var(--rod-muted);font:500 10px/1.2 system-ui,sans-serif}.rod-toast__countdown[data-visible="true"]{display:grid}.rod-toast__countdown-track{position:relative;height:3px;overflow:hidden;border-radius:999px;background:var(--rod-overlay)}.rod-toast__countdown-bar{position:absolute;inset:0 auto 0 0;width:var(--rod-countdown-progress,100%);border-radius:inherit;background:var(--rod-text);transition:width 250ms linear}.rod-toast__task-status{color:var(--rod-muted-soft);font:650 9px/1 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase}
      .rod-toast[data-completing="true"]{align-self:center;justify-self:center;grid-template-columns:1fr;gap:0;width:54px;min-width:54px;max-width:54px;height:54px;min-height:54px;max-height:54px;padding:0;overflow:hidden;border-radius:999px;background:var(--rod-surface);box-shadow:var(--rod-shadow-raised);cursor:default}.rod-toast[data-completing="true"] .rod-toast__content,.rod-toast[data-completing="true"] .rod-toast__actions{position:absolute;opacity:0;pointer-events:none}.rod-toast[data-completing="true"] .rod-toast__icon{justify-self:center;width:54px;min-width:54px;height:54px;margin:0}.rod-toast[data-completing="true"] .rod-icon-check-path{stroke-dasharray:24;stroke-dashoffset:24;animation:rod-toast-check-draw 280ms 100ms ease-out forwards}.rod-toast[data-success-exit="true"]{opacity:0;filter:blur(5px);transform:translate3d(0,-22px,0) scale(.82)}
      @keyframes rod-toast-spinner{to{transform:rotate(360deg)}}@keyframes rod-toast-pulse{0%,100%{opacity:.55;transform:scale(.92)}50%{opacity:1;transform:scale(1.08)}}@keyframes rod-toast-progress-indeterminate{0%{left:-42%}50%{left:42%}100%{left:104%}}@keyframes rod-toast-check-draw{to{stroke-dashoffset:0}}@keyframes rod-toast-icon-enter{0%{opacity:0;transform:scale(.72) rotate(-9deg)}62%{opacity:1;transform:scale(1.08) rotate(1deg)}100%{opacity:1;transform:scale(1)}}@keyframes rod-toast-toolbar-enter{from{opacity:0;transform:translateY(-8px) scale(.98)}to{opacity:1;transform:none}}@keyframes rod-toast-manager-enter{0%{opacity:0;transform:translateY(-10px) scale(.72)}70%{opacity:1;transform:translateY(1px) scale(1.06)}100%{opacity:1;transform:none}}
      @media(max-width:560px){.rod-toast-stack{--rod-toast-width:calc(100vw - 20px)}.rod-toast-stack[data-position^="top"]{top:max(env(safe-area-inset-top,0px),10px);right:10px;left:10px}.rod-toast-stack[data-position^="bottom"]{right:10px;bottom:max(env(safe-area-inset-bottom,0px),10px);left:10px}.rod-toast{min-height:72px;gap:12px;padding:15px 10px 15px 15px;border-radius:20px}.rod-toast[data-confirm="true"],.rod-toast[data-rich="true"],.rod-toast[data-interactive="true"]{min-width:0;max-width:none}.rod-toast__confirm-actions,.rod-toast__action-bar,.rod-toast__task-actions{display:grid;grid-template-columns:1fr}.rod-toast__confirm-button,.rod-toast__action-button,.rod-toast__task-button{width:100%}}
      @media(prefers-reduced-motion:reduce){.rod-toast,.rod-toast__content,.rod-toast__actions,.rod-toast__icon,.rod-toast__expand svg,.rod-toast-stack__list::before,.rod-toast-stack__list::after{transition-duration:1ms!important;animation-duration:1ms!important}}
    `;
			return style;
		}
		function resolveTheme(value = state.config.theme) {
			if (value === "dark" || value === "light") return value;
			const hostWindow = state.hostWindow ?? initialHostWindow;
			return safeCall(() => hostWindow.matchMedia?.("(prefers-color-scheme: light)")?.matches === true, false) ? "light" : "dark";
		}
		function getToastPalette(type) {
			const base = TOAST_COLORS[type] ?? TOAST_COLORS.default;
			return state.resolvedTheme === "light" ? {
				...base,
				...LIGHT_TOAST_COLORS[type]
			} : base;
		}
		function applyToastPalette(node, type) {
			if (!node) return;
			const semanticType = hasOwn(TOAST_COLORS, type) ? type : "default";
			const palette = getToastPalette(semanticType);
			node.style.setProperty("--rod-toast-bg", palette.bg);
			node.style.setProperty("--rod-toast-border", palette.border);
			node.style.setProperty("--rod-toast-text", palette.text);
			node.style.setProperty("--rod-toast-accent", palette.accent);
			node.dataset.type = semanticType;
		}
		function syncTheme() {
			const previous = state.resolvedTheme;
			state.resolvedTheme = resolveTheme();
			if (state.container) state.container.dataset.theme = state.resolvedTheme;
			if (state.hostElement) state.hostElement.dataset.rodToasterTheme = state.resolvedTheme;
			for (const record of getActiveToastRecords()) applyToastPalette(record.node, record.options.type);
			return previous !== state.resolvedTheme;
		}
		function installThemeObserver() {
			state.themeCleanup?.();
			state.themeCleanup = null;
			state.themeMediaQuery = null;
			if (state.config.theme !== "auto") {
				syncTheme();
				return;
			}
			const hostWindow = state.hostWindow ?? initialHostWindow;
			const mediaQuery = safeCall(() => hostWindow.matchMedia?.("(prefers-color-scheme: light)") ?? null, null);
			if (!mediaQuery) {
				syncTheme();
				return;
			}
			const handleChange = () => {
				if (syncTheme() && state.api) emitEvent("theme:change", {
					theme: state.config.theme,
					resolvedTheme: state.resolvedTheme
				});
			};
			if (typeof mediaQuery.addEventListener === "function") {
				mediaQuery.addEventListener("change", handleChange);
				state.themeCleanup = () => mediaQuery.removeEventListener("change", handleChange);
			} else {
				mediaQuery.addListener(handleChange);
				state.themeCleanup = () => mediaQuery.removeListener(handleChange);
			}
			state.themeMediaQuery = mediaQuery;
			syncTheme();
		}
		function resolveObjectInspectorSrc() {
			const configured = state.config.objectInspectorSrc?.trim();
			if (configured) return configured;
			const explicit = safeCall(() => typedGlobalWindow.ROD_OBJECT_INSPECTOR_SRC, void 0);
			if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
			const documents = [state.hostDocument, globalWindow.document].filter((item) => Boolean(item));
			for (const documentRef of documents) {
				const currentScript = safeCall(() => documentRef.currentScript, null);
				const scripts = safeCall(() => Array.from(documentRef.scripts), []);
				const candidates = currentScript && String(currentScript.tagName).toUpperCase() === "SCRIPT" ? [currentScript, ...scripts.reverse()] : scripts.reverse();
				for (const script of candidates) {
					const src = safeCall(() => script.src, "");
					if (src && /toaster(?:\.min)?\.js(?:[?#].*)?$/i.test(src)) return src.replace(/toaster(?:\.min)?\.js([?#].*)?$/i, "object-inspector.js$1");
				}
			}
			return "object-inspector.js";
		}
		function getObjectInspectorApi() {
			for (const candidate of [
				state.hostWindow,
				initialHostWindow,
				globalWindow
			]) {
				if (!candidate) continue;
				const api = safeCall(() => candidate.RodObjectInspector ?? null, null);
				if (api) return api;
			}
			return null;
		}
		function buildInspectorOptions(options) {
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
				unmountOnCollapse: options.unmountInspectorOnCollapse
			};
		}
		function installInspectorStyle(api) {
			if (!state.renderRoot || !state.hostDocument || state.inspectorStyle?.isConnected) return;
			const style = api.createStyle(state.hostDocument);
			state.renderRoot.appendChild(style);
			state.inspectorStyle = style;
		}
		function ensureInspectorRuntime(api) {
			installInspectorStyle(api);
			if (state.inspectorRuntime) return state.inspectorRuntime;
			const hostWindow = state.hostWindow ?? initialHostWindow;
			const hostDocument = state.hostDocument ?? hostWindow.document;
			state.inspectorRuntime = api.create({
				window: hostWindow,
				document: hostDocument,
				maxZIndex: MAX_Z_INDEX,
				options: buildInspectorOptions(state.config),
				getHost: () => ({
					window: state.hostWindow ?? initialHostWindow,
					document: state.hostDocument ?? initialHostWindow.document
				})
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
			if (state.inspectorPromise) return state.inspectorPromise;
			const hostWindow = state.hostWindow ?? initialHostWindow;
			const hostDocument = safeCall(() => hostWindow.document, null);
			if (!hostDocument) return Promise.reject(/* @__PURE__ */ new Error("Object Inspector host document unavailable"));
			const src = resolveObjectInspectorSrc();
			const existingScript = safeCall(() => Array.from(hostDocument.scripts).find((candidate) => candidate.dataset.rodObjectInspectorSrc === src) ?? null, null);
			const script = existingScript ?? hostDocument.createElement("script");
			state.inspectorPromise = new Promise((resolve, reject) => {
				let settled = false;
				const timeout = hostWindow.setTimeout(() => {
					if (settled) return;
					settled = true;
					state.inspectorPromise = null;
					cleanupListeners();
					reject(/* @__PURE__ */ new Error(`Timed out loading ${INSPECTOR_GLOBAL} from ${src}`));
				}, state.config.objectInspectorLoadTimeout);
				const cleanupListeners = () => {
					script.removeEventListener("load", handleLoad);
					script.removeEventListener("error", handleError);
				};
				const finish = (api) => {
					if (settled) return;
					settled = true;
					hostWindow.clearTimeout(timeout);
					cleanupListeners();
					state.inspectorApi = api;
					ensureInspectorRuntime(api);
					resolve(api);
				};
				const handleLoad = () => {
					const api = getObjectInspectorApi();
					if (api) finish(api);
					else handleError();
				};
				const handleError = () => {
					if (settled) return;
					settled = true;
					hostWindow.clearTimeout(timeout);
					cleanupListeners();
					state.inspectorPromise = null;
					reject(/* @__PURE__ */ new Error(`Failed to load ${INSPECTOR_GLOBAL} from ${src}`));
				};
				script.addEventListener("load", handleLoad);
				script.addEventListener("error", handleError);
				if (!existingScript) {
					script.src = src;
					script.async = true;
					script.dataset.rodObjectInspectorSrc = src;
					(hostDocument.head ?? hostDocument.documentElement).appendChild(script);
				} else {
					const api = getObjectInspectorApi();
					if (api) finish(api);
				}
			});
			return state.inspectorPromise;
		}
		function emitEvent(eventName, payload = {}) {
			const event = {
				event: eventName,
				timestamp: Date.now(),
				...payload
			};
			const listeners = [...state.listeners.get(eventName) ?? [], ...state.listeners.get("*") ?? []];
			for (const listener of listeners) safeCall(() => listener(event), void 0);
			return event;
		}
		function addEventListenerInternal(eventName, listener) {
			const name = String(eventName || "*");
			const bucket = state.listeners.get(name) ?? /* @__PURE__ */ new Set();
			bucket.add(listener);
			state.listeners.set(name, bucket);
			return () => {
				bucket.delete(listener);
				if (!bucket.size) state.listeners.delete(name);
			};
		}
		function getActiveToastRecords() {
			return state.toasts.filter((record) => !record.removed);
		}
		function hasActiveLoadingRecords() {
			return getActiveToastRecords().some((record) => record.options.loading && record.options.loadingState === "loading");
		}
		function setManagerMinimized(minimized) {
			const activeRecords = getActiveToastRecords();
			state.managerMinimized = Boolean(minimized) && activeRecords.length > 0;
			syncStackLayout();
			if (!state.managerMinimized && activeRecords.length > 1) setStackExpanded(true);
			return state.managerMinimized;
		}
		function syncStackLayout() {
			if (!state.container) return;
			const newestFirst = [...getActiveToastRecords()].reverse();
			newestFirst.forEach((record, index) => {
				record.node.dataset.stackIndex = String(index);
				record.node.dataset.itemExpanded ||= "false";
			});
			const count = newestFirst.length;
			if (count === 0) state.managerMinimized = false;
			if (count <= 1) state.stackExpanded = false;
			const stackVisible = Math.min(3, Math.max(1, Number(state.config.stackVisible) || 1));
			const stackDepth = Math.min(count, stackVisible);
			const effectiveExpanded = !state.config.stacked || state.stackExpanded || count <= 1;
			const viewportRatio = clamp(Number(state.config.stackViewportRatio) || DEFAULT_CONFIG.stackViewportRatio, .2, .8);
			state.container.dataset.stacked = String(state.config.stacked);
			state.container.dataset.managerMinimized = String(state.managerMinimized);
			state.container.dataset.expanded = String(effectiveExpanded);
			state.container.dataset.stackDepth = String(stackDepth);
			state.container.dataset.count = String(count);
			state.container.dataset.hasMany = String(count > 1);
			state.container.style.setProperty("--rod-toast-stack-max-height", `${Math.max(180, state.config.stackMaxHeight)}px`);
			state.container.style.setProperty("--rod-toast-stack-max-viewport", `${Math.round(viewportRatio * 100)}dvh`);
			if (state.toolbar) state.toolbar.dataset.enabled = String(state.config.stackToolbar);
			const taskCount = newestFirst.filter((record) => Boolean(record.options.metadata?.taskId)).length;
			if (state.stackCountNode) state.stackCountNode.textContent = taskCount ? `${taskCount} ${taskCount === 1 ? "task" : "tasks"} · ${count} ${count === 1 ? "toast" : "toasts"}` : `${count} ${count === 1 ? "toast" : "toasts"}`;
			if (state.managerCountNode) {
				const visibleCount = taskCount || count;
				state.managerCountNode.textContent = String(visibleCount);
				state.managerCountNode.dataset.visible = String(visibleCount > 1);
			}
			if (state.managerNode) state.managerNode.title = taskCount ? `Restore ${taskCount} active ${taskCount === 1 ? "task" : "tasks"}` : "Restore active toasts";
		}
		function setExpandedToast(record, expanded) {
			if (record.removed) return;
			for (const candidate of getActiveToastRecords()) candidate.node.dataset.itemExpanded = String(candidate === record && expanded);
			if (expanded) safeCall(() => record.node.scrollIntoView({
				block: "nearest",
				inline: "nearest",
				behavior: "smooth"
			}), void 0);
		}
		function setStackExpanded(expanded) {
			const activeRecords = getActiveToastRecords();
			if (!state.config.stacked || activeRecords.length <= 1) {
				state.stackExpanded = false;
				activeRecords.forEach((record) => {
					record.node.dataset.itemExpanded = "false";
				});
				syncStackLayout();
				return;
			}
			state.stackExpanded = Boolean(expanded);
			if (state.stackExpanded) {
				if (!activeRecords.some((record) => record.node.dataset.itemExpanded === "true")) {
					const newest = [...activeRecords].sort((left, right) => right.createdAt - left.createdAt)[0];
					if (newest) setExpandedToast(newest, true);
				}
			} else activeRecords.forEach((record) => {
				record.node.dataset.itemExpanded = "false";
			});
			syncStackLayout();
		}
		function toggleExpandedToast(record) {
			if (record.removed) return;
			setExpandedToast(record, record.node.dataset.itemExpanded !== "true");
		}
		const INTERACTIVE_SELECTOR = "button,a,summary,details,input,textarea,select,option,[contenteditable='true'],[role='button']";
		function eventHasInteractiveTarget(event) {
			return (typeof event.composedPath === "function" ? event.composedPath() : [event.target]).some((candidate) => isElementLike(candidate) && candidate.matches(INTERACTIVE_SELECTOR));
		}
		function getToastRecordByNode(node) {
			return state.toasts.find((record) => !record.removed && record.node === node) ?? null;
		}
		function handleStackClick(event) {
			if (!state.config.stacked || eventHasInteractiveTarget(event)) return;
			const target = event.target;
			const toastNode = isElementLike(target) ? target.closest(".rod-toast") : null;
			if (!toastNode || toastNode.dataset.suppressStackClick === "true") return;
			const record = getToastRecordByNode(toastNode);
			if (!record) return;
			if (!state.stackExpanded) {
				if (getActiveToastRecords().length <= 1 || toastNode.dataset.stackIndex !== "0") return;
				setStackExpanded(true);
				setExpandedToast(record, true);
				return;
			}
			toggleExpandedToast(record);
		}
		function removeHostInteractionListeners() {
			if (state.hostDocument && state.outsidePointerDownHandler) state.hostDocument.removeEventListener("pointerdown", state.outsidePointerDownHandler, true);
			state.outsidePointerDownHandler = null;
		}
		function scheduleHostRepair() {
			if (!state.config.persistAcrossSpaNavigation || state.hostRepairFrame !== null) return;
			const hostWindow = state.hostWindow ?? initialHostWindow;
			const requestFrame = hostWindow.requestAnimationFrame?.bind(hostWindow) ?? ((callback) => hostWindow.setTimeout(() => callback(performance.now()), 0));
			state.hostRepairFrame = requestFrame(() => {
				state.hostRepairFrame = null;
				if (getActiveToastRecords().length) ensureHost();
			});
		}
		function installSpaPersistence(hostWindow, hostDocument) {
			if (!state.config.persistAcrossSpaNavigation) return;
			if (state.spaCleanup && state.hostWindow !== hostWindow) state.spaCleanup();
			if (state.spaCleanup) return;
			const callbacks = [];
			const navigationHandler = () => {
				if (state.config.minimizeOnSpaNavigation && hasActiveLoadingRecords()) setManagerMinimized(true);
				scheduleHostRepair();
			};
			hostWindow.addEventListener("popstate", navigationHandler);
			hostWindow.addEventListener("hashchange", navigationHandler);
			hostWindow.addEventListener("rod:toaster:navigation", navigationHandler);
			callbacks.push(() => {
				hostWindow.removeEventListener("popstate", navigationHandler);
				hostWindow.removeEventListener("hashchange", navigationHandler);
				hostWindow.removeEventListener("rod:toaster:navigation", navigationHandler);
			});
			const patchedWindow = hostWindow;
			if (!safeCall(() => Boolean(patchedWindow[HISTORY_PATCH_SYMBOL]), false)) {
				const history = hostWindow.history;
				const originals = {};
				for (const methodName of ["pushState", "replaceState"]) {
					const original = history[methodName];
					originals[methodName] = original;
					history[methodName] = function patchedHistoryMethod(data, unused, url) {
						Reflect.apply(original, this, [
							data,
							unused,
							url
						]);
						safeCall(() => hostWindow.dispatchEvent(new hostWindow.CustomEvent("rod:toaster:navigation")), false);
					};
				}
				safeCall(() => {
					Object.defineProperty(patchedWindow, HISTORY_PATCH_SYMBOL, {
						value: true,
						configurable: true
					});
				}, void 0);
				state.historyRestore = () => {
					for (const methodName of ["pushState", "replaceState"]) {
						const original = originals[methodName];
						if (original) history[methodName] = original;
					}
					safeCall(() => {
						delete patchedWindow[HISTORY_PATCH_SYMBOL];
					}, void 0);
				};
				callbacks.push(() => {
					state.historyRestore?.();
					state.historyRestore = null;
				});
			}
			if (typeof hostWindow.MutationObserver === "function" && hostDocument.documentElement) {
				state.spaObserver = new hostWindow.MutationObserver(() => {
					if (getActiveToastRecords().length && state.hostElement && !state.hostElement.isConnected) scheduleHostRepair();
				});
				state.spaObserver.observe(hostDocument.documentElement, { childList: true });
				callbacks.push(() => {
					state.spaObserver?.disconnect();
					state.spaObserver = null;
				});
			}
			state.spaCleanup = () => {
				callbacks.forEach((callback) => safeCall(callback, void 0));
				state.spaCleanup = null;
			};
		}
		function destroyHost(options = {}) {
			removeHostInteractionListeners();
			state.inspectorRuntime?.clearHighlight?.();
			state.themeCleanup?.();
			state.themeCleanup = null;
			state.themeMediaQuery = null;
			if (!options.keepPersistence) state.spaCleanup?.();
			state.hostElement?.remove();
			state.hostElement = null;
			state.shadowRoot = null;
			state.renderRoot = null;
			state.hostMode = null;
			state.container = null;
			state.managerNode = null;
			state.managerCountNode = null;
			state.list = null;
			state.toolbar = null;
			state.stackCountNode = null;
			state.inspectorRuntime = null;
			state.inspectorStyle = null;
			state.stackExpanded = false;
			state.managerMinimized = false;
		}
		function ensureHost() {
			const hostWindow = getHighestAccessibleWindow(globalWindow);
			const hostDocument = safeCall(() => hostWindow.document, null);
			if (!hostDocument) return null;
			if (state.hostElement?.isConnected && state.hostDocument === hostDocument && state.container && state.list) return {
				window: state.hostWindow ?? hostWindow,
				document: state.hostDocument,
				container: state.container,
				list: state.list
			};
			const parent = hostDocument.documentElement ?? hostDocument.body;
			if (!parent) return null;
			if (state.hostElement && !state.hostElement.isConnected && state.hostDocument === hostDocument && state.container && state.list) {
				parent.appendChild(state.hostElement);
				installSpaPersistence(hostWindow, hostDocument);
				syncStackLayout();
				return {
					window: state.hostWindow ?? hostWindow,
					document: state.hostDocument,
					container: state.container,
					list: state.list
				};
			}
			if (state.hostElement?.isConnected) destroyHost();
			else removeHostInteractionListeners();
			const hostElement = hostDocument.createElement("div");
			hostElement.id = TOAST_HOST_ID;
			hostElement.setAttribute("aria-live", "polite");
			for (const [property, value] of [
				["all", "initial"],
				["position", "fixed"],
				["inset", "0"],
				["width", "0"],
				["height", "0"],
				["z-index", String(MAX_Z_INDEX)],
				["pointer-events", "none"]
			]) hostElement.style.setProperty(property, value, "important");
			let shadowRoot = null;
			let renderRoot = hostElement;
			let hostMode = "light-dom";
			if (state.config.useShadowRoot) {
				shadowRoot = safeCall(() => hostElement.attachShadow({ mode: state.config.shadowRootMode }), null);
				if (shadowRoot) {
					renderRoot = shadowRoot;
					hostMode = "shadow";
				} else if (!state.config.fallbackToLightDom) return null;
			}
			if (!shadowRoot) hostElement.dataset.rodToasterFallback = "light-dom";
			hostElement.dataset.rodToasterHostMode = hostMode;
			const container = hostDocument.createElement("div");
			const managerButton = hostDocument.createElement("button");
			const managerCount = hostDocument.createElement("span");
			const toolbar = hostDocument.createElement("div");
			const toolbarLabel = hostDocument.createElement("div");
			const toolbarActions = hostDocument.createElement("div");
			const minimizeButton = hostDocument.createElement("button");
			const collapseButton = hostDocument.createElement("button");
			const clearButton = hostDocument.createElement("button");
			const list = hostDocument.createElement("div");
			container.className = "rod-toast-stack";
			container.dataset.position = state.config.position;
			container.dataset.theme = state.resolvedTheme;
			container.dataset.expanded = "true";
			container.dataset.stackDepth = "0";
			container.dataset.managerMinimized = String(state.managerMinimized);
			managerButton.type = "button";
			managerButton.className = "rod-toast-stack__manager";
			managerButton.append(createSvgIcon(hostDocument, "loader-circle", 19));
			managerCount.className = "rod-toast-stack__manager-count";
			managerCount.textContent = "0";
			managerCount.dataset.visible = "false";
			managerButton.append(managerCount);
			managerButton.setAttribute("aria-label", "Restore active toast tasks");
			managerButton.title = "Restore active tasks";
			managerButton.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				setManagerMinimized(false);
			});
			toolbar.className = "rod-toast-stack__toolbar";
			toolbar.dataset.enabled = String(state.config.stackToolbar);
			toolbarLabel.className = "rod-toast-stack__toolbar-label";
			toolbarLabel.textContent = "0 toasts";
			toolbarActions.className = "rod-toast-stack__toolbar-actions";
			const configureToolbarButton = (button, icon, label, ariaLabel) => {
				button.type = "button";
				button.className = "rod-toast-stack__toolbar-button";
				button.append(createSvgIcon(hostDocument, icon, 14));
				const text = hostDocument.createElement("span");
				text.textContent = label;
				button.append(text);
				button.setAttribute("aria-label", ariaLabel);
			};
			configureToolbarButton(minimizeButton, "chevron-down", "Minimize", "Minimize active toast tasks");
			configureToolbarButton(collapseButton, "chevrons-up", "Collapse", "Collapse toast stack");
			configureToolbarButton(clearButton, "x-circle", "Close all", "Dismiss all toasts");
			minimizeButton.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				setManagerMinimized(true);
			});
			collapseButton.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				setStackExpanded(false);
			});
			clearButton.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				[...getActiveToastRecords()].reverse().forEach((record, index) => {
					hostWindow.setTimeout(() => record.dismiss(false, null, "dismissAll"), index * 28);
				});
			});
			toolbarActions.append(minimizeButton, collapseButton, clearButton);
			toolbar.append(toolbarLabel, toolbarActions);
			list.className = "rod-toast-stack__list";
			container.append(managerButton, toolbar, list);
			renderRoot.append(createStyles(hostDocument, hostMode), container);
			parent.append(hostElement);
			state.hostWindow = hostWindow;
			state.hostDocument = hostDocument;
			state.hostElement = hostElement;
			state.shadowRoot = shadowRoot;
			state.renderRoot = renderRoot;
			state.hostMode = hostMode;
			state.container = container;
			state.managerNode = managerButton;
			state.managerCountNode = managerCount;
			state.list = list;
			state.toolbar = toolbar;
			state.stackCountNode = toolbarLabel;
			installThemeObserver();
			syncTheme();
			installSpaPersistence(hostWindow, hostDocument);
			[...getActiveToastRecords()].sort((left, right) => right.createdAt - left.createdAt).forEach((record) => {
				if (!record.node.isConnected) list.append(record.node);
			});
			const inspectorApi = getObjectInspectorApi();
			if (inspectorApi) {
				state.inspectorApi = inspectorApi;
				ensureInspectorRuntime(inspectorApi);
			}
			container.addEventListener("click", handleStackClick);
			container.addEventListener("keydown", (event) => {
				if (event.key === "Escape" && state.stackExpanded) {
					event.preventDefault();
					event.stopPropagation();
					setStackExpanded(false);
				}
			}, true);
			state.outsidePointerDownHandler = (event) => {
				if (!state.stackExpanded) return;
				if (!(typeof event.composedPath === "function" ? event.composedPath() : []).includes(hostElement)) setStackExpanded(false);
			};
			hostDocument.addEventListener("pointerdown", state.outsidePointerDownHandler, true);
			syncStackLayout();
			return {
				window: hostWindow,
				document: hostDocument,
				container,
				list
			};
		}
		function createTextNode(documentRef, text, className = "") {
			const node = documentRef.createElement("span");
			node.textContent = text;
			if (className) node.className = className;
			return node;
		}
		function renderPrimitive(value, documentRef, quoteStrings = true) {
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
		function renderToastValue(value, documentRef, options) {
			if (!isObject(value)) return renderPrimitive(value, documentRef, false);
			const api = getObjectInspectorApi();
			if (api) {
				state.inspectorApi = api;
				return ensureInspectorRuntime(api).render(value, documentRef, {
					depth: 0,
					ancestors: /* @__PURE__ */ new Set(),
					quoteStrings: false,
					options: buildInspectorOptions(options)
				});
			}
			const placeholder = documentRef.createElement("span");
			placeholder.className = "rod-toast__inspector-placeholder";
			placeholder.textContent = getFallbackObjectPreview(value);
			loadObjectInspector().then((loadedApi) => {
				if (!placeholder.isConnected) return;
				const inspectorNode = ensureInspectorRuntime(loadedApi).render(value, documentRef, {
					depth: 0,
					ancestors: /* @__PURE__ */ new Set(),
					quoteStrings: false,
					options: buildInspectorOptions(options)
				});
				placeholder.replaceWith(inspectorNode);
			}).catch((error) => {
				if (!placeholder.isConnected) return;
				placeholder.textContent = `${getFallbackObjectPreview(value)} [inspector unavailable]`;
				safeCall(() => console.warn(error), void 0);
			});
			return placeholder;
		}
		function isOptionsCandidate(value) {
			if (!isUnknownRecord(value)) return false;
			if (value[OPTIONS_SYMBOL]) return true;
			return Reflect.ownKeys(value).some((key) => typeof key === "string" && OPTION_KEYS.has(key));
		}
		function parseArguments(inputArgs, forcedType) {
			const args = [...inputArgs];
			let options = {};
			if (args.length > 1 && isOptionsCandidate(args.at(-1))) {
				options = { ...args.pop() };
				delete options[OPTIONS_SYMBOL];
			}
			if (!args.length) args.push("");
			if (forcedType) options.type = forcedType;
			return {
				args,
				options
			};
		}
		function normalizeToastOptions(options) {
			const type = typeof options.type === "string" && hasOwn(TOAST_COLORS, options.type) ? options.type : "default";
			const loading = Boolean(options.loading);
			const defaultDuration = loading ? state.config.loadingDuration : type === "debug" ? state.config.debugDuration : state.config.duration;
			const animation = normalizeLoadingAnimation(options.animation ?? options.loadingAnimation ?? state.config.loadingAnimation);
			const progress = normalizeProgress(options.progress);
			const icon = options.icon === false || options.icon === null ? false : options.icon ?? (loading ? state.config.loadingIcon : TOAST_COLORS[type].icon);
			const durationCandidate = Number(options.duration);
			const dedupeWindowCandidate = Number(options.dedupeWindow);
			return {
				type,
				id: options.id == null ? null : String(options.id),
				duration: Number.isFinite(durationCandidate) ? durationCandidate : defaultDuration,
				dedupe: options.dedupe ?? state.config.dedupe,
				dedupeWindow: Number.isFinite(dedupeWindowCandidate) ? dedupeWindowCandidate : state.config.dedupeWindow,
				pauseOnInteraction: options.pauseOnInteraction ?? state.config.pauseOnInteraction,
				dismissible: options.dismissible !== false,
				closeButton: options.dismissible !== false && (options.closeButton ?? state.config.closeButton),
				role: typeof options.role === "string" && options.role ? options.role : type === "error" ? "alert" : "status",
				swipeToDismiss: options.dismissible !== false && (options.swipeToDismiss ?? state.config.swipeToDismiss),
				swipeThreshold: Number.isFinite(Number(options.swipeThreshold)) ? Math.max(24, Number(options.swipeThreshold)) : state.config.swipeThreshold,
				swipeVelocity: Number.isFinite(Number(options.swipeVelocity)) ? Math.max(.05, Number(options.swipeVelocity)) : state.config.swipeVelocity,
				inspectDepth: Number.isFinite(Number(options.inspectDepth)) ? Math.max(0, Number(options.inspectDepth)) : state.config.inspectDepth,
				inspectItems: Number.isFinite(Number(options.inspectItems)) ? Math.max(0, Number(options.inspectItems)) : state.config.inspectItems,
				previewItems: Number.isFinite(Number(options.previewItems)) ? Math.max(0, Number(options.previewItems)) : state.config.previewItems,
				showPrototype: options.showPrototype ?? state.config.showPrototype,
				showNonEnumerable: options.showNonEnumerable ?? state.config.showNonEnumerable,
				showObjectLength: options.showObjectLength ?? state.config.showObjectLength,
				virtualizeInspector: options.virtualizeInspector ?? state.config.virtualizeInspector,
				virtualizeAfter: Number.isFinite(Number(options.virtualizeAfter)) ? Math.max(1, Number(options.virtualizeAfter)) : state.config.virtualizeAfter,
				virtualRowHeight: Number.isFinite(Number(options.virtualRowHeight)) ? Math.max(16, Number(options.virtualRowHeight)) : state.config.virtualRowHeight,
				virtualOverscan: Number.isFinite(Number(options.virtualOverscan)) ? Math.max(1, Number(options.virtualOverscan)) : state.config.virtualOverscan,
				virtualMaxHeight: Number.isFinite(Number(options.virtualMaxHeight)) ? Math.max(120, Number(options.virtualMaxHeight)) : state.config.virtualMaxHeight,
				unmountInspectorOnCollapse: options.unmountInspectorOnCollapse ?? state.config.unmountInspectorOnCollapse,
				loading,
				loadingState: options.loadingState === "settled" ? "settled" : "loading",
				title: options.title == null ? "" : String(options.title),
				description: options.description == null ? "" : String(options.description),
				icon,
				animation,
				progress,
				progressLabel: options.progressLabel == null ? null : String(options.progressLabel),
				scope: options.scope == null ? null : String(options.scope),
				metadata: isUnknownRecord(options.metadata) ? options.metadata : null,
				onDismiss: typeof options.onDismiss === "function" ? options.onDismiss : null
			};
		}
		function shouldRenderDebug(args) {
			const setting = state.config.shouldDebug;
			return typeof setting === "function" ? safeCall(() => Boolean(setting(...args)), false) : Boolean(setting);
		}
		function runDownloadFallback(args) {
			const fallback = state.config.downloadFallback;
			return typeof fallback === "function" ? safeCall(() => fallback(...args), null) : null;
		}
		function createDedupeKey(args, options) {
			if (options.id) return `id:${options.id}`;
			const signatures = args.map((value) => {
				if (value === null) return "null";
				if (isObject(value)) return `ref:${getObjectId(value)}`;
				return `${typeof value}:${safePrimitiveText(value, false)}`;
			});
			return `${options.scope ?? "global"}|${options.type}|${signatures.join("|")}`;
		}
		function removeRecord(record) {
			const index = state.toasts.indexOf(record);
			if (index >= 0) state.toasts.splice(index, 1);
			if (record.options.id && state.recordsById.get(record.options.id) === record) state.recordsById.delete(record.options.id);
			if (record.dedupeKey && state.dedupeRecords.get(record.dedupeKey) === record) state.dedupeRecords.delete(record.dedupeKey);
		}
		function enforceToastLimit() {
			while (state.toasts.length >= state.config.maxToasts) {
				const oldest = state.toasts[0];
				if (!oldest) break;
				oldest.dismiss(true, null, "limit");
			}
		}
		function createCloseButton(documentRef, dismiss) {
			const button = documentRef.createElement("button");
			button.type = "button";
			button.className = "rod-toast__close";
			button.append(createSvgIcon(documentRef, "x", 16));
			button.setAttribute("aria-label", "Close toast");
			button.title = "Close";
			button.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				dismiss();
			});
			return button;
		}
		function createMinimizeButton(documentRef) {
			const button = documentRef.createElement("button");
			button.type = "button";
			button.className = "rod-toast__minimize";
			button.append(createSvgIcon(documentRef, "chevron-down", 16));
			button.setAttribute("aria-label", "Minimize active toast tasks");
			button.title = "Minimize";
			button.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				setManagerMinimized(true);
			});
			return button;
		}
		function createExpandButton(documentRef, getRecord) {
			const button = documentRef.createElement("button");
			button.type = "button";
			button.className = "rod-toast__expand";
			button.append(createSvgIcon(documentRef, "chevron-down", 16));
			button.setAttribute("aria-label", "Expand toast");
			button.title = "Expand or collapse";
			button.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				toggleExpandedToast(getRecord());
			});
			return button;
		}
		function setToastIcon(node, documentRef, iconValue, fallbackName) {
			node.replaceChildren();
			if (iconValue === false) return false;
			if (isDomNode(iconValue)) {
				node.append(iconValue.cloneNode(true));
				return true;
			}
			const iconName = typeof iconValue === "string" && hasOwn(SVG_ICONS, iconValue) ? iconValue : fallbackName;
			node.append(createSvgIcon(documentRef, iconName, 17));
			return true;
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
			let scrollOwner = node;
			let mode = "pending";
			let moved = false;
			const resetVisualState = () => {
				node.dataset.swiping = "false";
				node.style.removeProperty("transition");
				node.style.removeProperty("transform");
				node.style.removeProperty("opacity");
			};
			const snapBack = () => {
				node.dataset.swiping = "false";
				node.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1),opacity 180ms ease";
				node.style.transform = "translate3d(0,0,0) scale(1)";
				node.style.opacity = "1";
				host.window.setTimeout(() => {
					if (!record.removed) resetVisualState();
				}, 240);
			};
			const suppressNextStackClick = () => {
				node.dataset.suppressStackClick = "true";
				host.window.setTimeout(() => {
					if (node.isConnected) delete node.dataset.suppressStackClick;
				}, 350);
			};
			const finish = (event, cancelled) => {
				if (!active || event.pointerId !== pointerId) return;
				active = false;
				const capturedPointerId = pointerId;
				if (capturedPointerId !== null) safeCall(() => node.releasePointerCapture(capturedPointerId), void 0);
				const dx = event.clientX - startX;
				const dy = event.clientY - startY;
				const distance = Math.hypot(dx, dy);
				const speed = Math.hypot(velocityX, velocityY);
				const shouldDismiss = !cancelled && mode === "swipe" && (distance >= record.options.swipeThreshold || distance >= 24 && speed >= record.options.swipeVelocity);
				if (moved) suppressNextStackClick();
				if (shouldDismiss) {
					record.dismiss(false, {
						dx,
						dy,
						velocityX,
						velocityY
					}, "swipe");
					return;
				}
				if (mode === "swipe") snapBack();
				else resetVisualState();
			};
			node.addEventListener("pointerdown", (event) => {
				if (!record.options.swipeToDismiss || record.removed || !event.isPrimary || event.button > 0 || eventHasInteractiveTarget(event)) return;
				active = true;
				pointerId = event.pointerId;
				startX = lastX = event.clientX;
				startY = lastY = event.clientY;
				lastTime = event.timeStamp || performance.now();
				velocityX = velocityY = 0;
				scrollOwner = state.stackExpanded && host.list ? host.list : node;
				startScrollTop = scrollOwner.scrollTop;
				mode = "pending";
				moved = false;
				node.dataset.swiping = "true";
				node.style.transition = "none";
				safeCall(() => node.setPointerCapture(event.pointerId), void 0);
			});
			node.addEventListener("pointermove", (event) => {
				if (!active || event.pointerId !== pointerId || record.removed) return;
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
				if (distance < 5) return;
				if (mode === "pending") {
					const maxScrollTop = Math.max(0, scrollOwner.scrollHeight - scrollOwner.clientHeight);
					const verticalDominant = Math.abs(dy) > Math.abs(dx) * 1.25;
					mode = maxScrollTop > 1 && verticalDominant && (dy > 0 && startScrollTop > 0 || dy < 0 && startScrollTop < maxScrollTop) ? "scroll" : "swipe";
				}
				if (mode === "scroll") {
					const maxScrollTop = Math.max(0, scrollOwner.scrollHeight - scrollOwner.clientHeight);
					scrollOwner.scrollTop = clamp(startScrollTop - dy, 0, maxScrollTop);
					return;
				}
				event.preventDefault();
				moved ||= distance > 8;
				const opacity = 1 - Math.min(.78, distance / Math.max(record.options.swipeThreshold * 2.25, 1));
				const rotation = clamp(dx / 28, -7, 7);
				node.style.transform = `translate3d(${dx}px,${dy}px,0) rotate(${rotation}deg)`;
				node.style.opacity = String(opacity);
			});
			node.addEventListener("pointerup", (event) => finish(event, false));
			node.addEventListener("pointercancel", (event) => finish(event, true));
			node.addEventListener("lostpointercapture", (event) => {
				if (active && event.pointerId === pointerId) finish(event, true);
			});
		}
		function createToastRecord(args, rawOptions) {
			const host = ensureHost();
			if (!host) {
				safeCall(() => console.log(`[${String(rawOptions.type ?? "toast")}]`, ...args), void 0);
				return null;
			}
			enforceToastLimit();
			const options = normalizeToastOptions(rawOptions);
			const palette = getToastPalette(options.type);
			const node = host.document.createElement("div");
			const icon = host.document.createElement("div");
			const content = host.document.createElement("div");
			const actions = host.document.createElement("div");
			const count = host.document.createElement("div");
			const loadingCopy = host.document.createElement("div");
			const loadingTitle = host.document.createElement("div");
			const loadingDescription = host.document.createElement("div");
			const progress = host.document.createElement("div");
			const progressMeta = host.document.createElement("div");
			const progressTrack = host.document.createElement("div");
			const progressBar = host.document.createElement("div");
			node.className = "rod-toast";
			node.setAttribute("role", options.role);
			node.tabIndex = -1;
			applyToastPalette(node, options.type);
			icon.className = "rod-toast__icon";
			setToastIcon(icon, host.document, options.icon, palette.icon);
			icon.setAttribute("aria-hidden", "true");
			content.className = "rod-toast__content";
			actions.className = "rod-toast__actions";
			count.className = "rod-toast__count";
			count.textContent = "1";
			count.dataset.visible = "false";
			loadingCopy.className = "rod-toast__loading-copy";
			loadingTitle.className = "rod-toast__loading-title";
			loadingDescription.className = "rod-toast__loading-description";
			progress.className = "rod-toast__progress";
			progressMeta.className = "rod-toast__progress-meta";
			progressTrack.className = "rod-toast__progress-track";
			progressBar.className = "rod-toast__progress-bar";
			progressTrack.append(progressBar);
			progress.append(progressMeta, progressTrack);
			loadingCopy.append(loadingTitle, loadingDescription, progress);
			node.dataset.itemExpanded = "false";
			node.dataset.completing = "false";
			node.dataset.successExit = "false";
			actions.append(count);
			node.append(icon, content, actions);
			let removed = false;
			let removalTimer = null;
			let timerStartedAt = 0;
			let remainingDuration = options.duration;
			let paused = false;
			let duplicateCount = 1;
			let completing = false;
			let dismissReason = "programmatic";
			let record;
			let controller;
			const renderLoading = (nextOptions) => {
				const hasTitle = Boolean(nextOptions.title);
				const hasDescription = Boolean(nextOptions.description);
				const hasProgress = nextOptions.animation === "progress";
				const contentEmpty = !hasTitle && !hasDescription && !hasProgress;
				const fallbackIcon = nextOptions.loadingState === "settled" ? TOAST_COLORS[nextOptions.type].icon : state.config.loadingIcon || "loader-circle";
				const hasIcon = setToastIcon(icon, host.document, nextOptions.icon, fallbackIcon);
				node.dataset.loading = "true";
				node.dataset.loadingState = nextOptions.loadingState;
				node.dataset.loadingAnimation = nextOptions.animation;
				node.dataset.loadingIcon = String(hasIcon);
				node.dataset.loadingContentEmpty = String(contentEmpty);
				node.dataset.loadingIndeterminate = String(hasProgress && nextOptions.progress === null);
				icon.dataset.loadingSpinner = String(nextOptions.loadingState === "loading" && nextOptions.animation === "spinner");
				icon.dataset.loadingPulse = String(nextOptions.loadingState === "loading" && nextOptions.animation === "pulse");
				loadingTitle.textContent = nextOptions.title;
				loadingTitle.hidden = !hasTitle;
				loadingDescription.textContent = nextOptions.description;
				loadingDescription.hidden = !hasDescription;
				const progressPercent = nextOptions.progress === null ? 0 : Math.round(nextOptions.progress * 100);
				node.style.setProperty("--rod-loading-progress", `${progressPercent}%`);
				progressMeta.textContent = nextOptions.progressLabel ?? (nextOptions.progress === null ? "" : `${progressPercent}%`);
				progressMeta.hidden = !progressMeta.textContent || nextOptions.animation !== "progress";
				content.replaceChildren(loadingCopy);
			};
			const renderArgs = (nextArgs, nextOptions) => {
				if (nextOptions.loading) {
					renderLoading(nextOptions);
					return;
				}
				node.dataset.loading = "false";
				node.dataset.loadingState = "";
				node.dataset.loadingAnimation = "";
				node.dataset.loadingIcon = "true";
				node.dataset.loadingContentEmpty = "false";
				node.dataset.loadingIndeterminate = "false";
				icon.dataset.loadingSpinner = "false";
				icon.dataset.loadingPulse = "false";
				setToastIcon(icon, host.document, nextOptions.icon, TOAST_COLORS[nextOptions.type].icon);
				content.replaceChildren();
				for (const value of nextArgs) {
					const wrapper = host.document.createElement("span");
					wrapper.className = "rod-toast__arg";
					wrapper.append(renderToastValue(value, host.document, nextOptions));
					content.append(wrapper);
				}
			};
			const clearTimer = () => {
				if (removalTimer !== null) {
					host.window.clearTimeout(removalTimer);
					removalTimer = null;
				}
			};
			const cleanup = (reason = dismissReason) => {
				if (removed) return;
				removed = true;
				dismissReason = reason || dismissReason || "programmatic";
				clearTimer();
				const dismissEvent = {
					reason: dismissReason,
					record,
					controller,
					scope: options.scope
				};
				safeCall(() => options.onDismiss?.(dismissEvent), void 0);
				removeRecord(record);
				node.remove();
				emitEvent("dismiss", dismissEvent);
				syncStackLayout();
				if (!host.list.children.length) destroyHost({ keepPersistence: state.config.persistAcrossSpaNavigation });
			};
			const playSuccessExit = () => {
				if (completing || removed || !node.isConnected) return;
				completing = true;
				clearTimer();
				setToastIcon(icon, host.document, "check", "check");
				node.dataset.swiping = "false";
				(host.window.requestAnimationFrame?.bind(host.window) ?? ((callback) => host.window.setTimeout(() => callback(performance.now()), 0)))(() => {
					if (!node.isConnected) return cleanup();
					node.dataset.completing = "true";
					host.window.setTimeout(() => {
						if (!node.isConnected) return cleanup();
						node.dataset.successExit = "true";
						host.window.setTimeout(() => cleanup(), Math.max(80, state.config.successExitDuration));
					}, Math.max(120, state.config.successCollapseDuration));
				});
			};
			const dismiss = (immediate = false, swipe = null, reason = "programmatic") => {
				dismissReason = reason || "programmatic";
				if (removed || !node.isConnected) return cleanup(dismissReason);
				clearTimer();
				if (immediate) return cleanup();
				if (!swipe && options.type === "success" && state.config.successExitAnimation) return playSuccessExit();
				if (swipe) {
					const rawX = Number(swipe.dx) || Number(swipe.velocityX) || 0;
					const rawY = Number(swipe.dy) || Number(swipe.velocityY) || 0;
					const length = Math.hypot(rawX, rawY) || 1;
					const viewportDistance = Math.hypot(host.window.innerWidth || 1e3, host.window.innerHeight || 1e3) * 1.2;
					const targetX = rawX / length * viewportDistance;
					const targetY = rawY / length * viewportDistance;
					node.dataset.swiping = "false";
					node.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1),opacity 180ms ease";
					node.style.transform = `translate3d(${targetX}px,${targetY}px,0) rotate(${clamp(targetX / 90, -16, 16)}deg)`;
					node.style.opacity = "0";
					host.window.setTimeout(() => cleanup(), 240);
					return;
				}
				node.dataset.visible = "false";
				const onTransitionEnd = (event) => {
					if (event.target === node && (event.propertyName === "opacity" || event.propertyName === "transform")) cleanup();
				};
				node.addEventListener("transitionend", onTransitionEnd, { once: true });
				host.window.setTimeout(() => cleanup(), 300);
			};
			const scheduleTimer = () => {
				clearTimer();
				if (removed || paused || !Number.isFinite(remainingDuration) || remainingDuration <= 0) return;
				timerStartedAt = Date.now();
				removalTimer = host.window.setTimeout(() => dismiss(false, null, "timeout"), remainingDuration);
			};
			const pauseTimer = () => {
				if (paused || removalTimer === null || !Number.isFinite(remainingDuration) || remainingDuration <= 0) return;
				paused = true;
				remainingDuration = Math.max(0, remainingDuration - (Date.now() - timerStartedAt));
				clearTimer();
			};
			const resumeTimer = () => {
				if (!paused) return;
				paused = false;
				scheduleTimer();
			};
			const resetTimer = (duration = options.duration) => {
				remainingDuration = duration;
				paused = false;
				scheduleTimer();
			};
			const update = (nextArgs, nextRawOptions = {}) => {
				const previous = { ...options };
				const nextOptions = normalizeToastOptions({
					...options,
					...nextRawOptions
				});
				Object.assign(options, nextOptions);
				applyToastPalette(node, nextOptions.type);
				node.setAttribute("role", nextOptions.role);
				renderArgs(nextArgs, nextOptions);
				resetTimer(nextOptions.duration);
				emitEvent("update", {
					record,
					controller,
					previous,
					options: { ...options },
					args: nextArgs,
					scope: options.scope
				});
				return controller;
			};
			const updateLoading = (inputArgs) => {
				const parsed = parseLoadingInput(inputArgs);
				return update([], {
					...options,
					...parsed,
					loading: true,
					loadingState: parsed.loadingState ?? options.loadingState ?? "loading"
				});
			};
			const settleLoading = (type, inputArgs = []) => {
				const parsed = parseLoadingInput(inputArgs);
				const durationByType = {
					success: state.config.loadingSuccessDuration,
					error: state.config.loadingErrorDuration,
					info: state.config.loadingInfoDuration,
					warning: state.config.loadingWarningDuration
				};
				return update([], {
					...options,
					...parsed,
					type,
					loading: true,
					loadingState: "settled",
					animation: "none",
					icon: parsed.icon ?? TOAST_COLORS[type].icon,
					progress: type === "success" ? 1 : parsed.progress ?? options.progress,
					duration: Number.isFinite(Number(parsed.duration)) ? Number(parsed.duration) : durationByType[type]
				});
			};
			const bumpDuplicate = () => {
				duplicateCount += 1;
				count.textContent = `×${duplicateCount}`;
				count.dataset.visible = "true";
				resetTimer(options.duration);
				return controller;
			};
			record = {
				node,
				options,
				args,
				dedupeKey: null,
				createdAt: Date.now(),
				lastSeenAt: Date.now(),
				dismiss,
				update,
				updateLoading,
				settleLoading,
				bumpDuplicate,
				get removed() {
					return removed;
				}
			};
			controller = {
				get id() {
					return options.id;
				},
				get element() {
					return node;
				},
				get progress() {
					return options.progress;
				},
				get state() {
					return options.loading ? options.loadingState : options.type;
				},
				update(...inputArgs) {
					if (options.loading) return updateLoading(inputArgs);
					const parsed = parseArguments(inputArgs, null);
					return update(parsed.args, parsed.options);
				},
				setProgress(value, next = {}) {
					return updateLoading([{
						...next,
						progress: value,
						animation: next.animation ?? options.animation ?? "progress"
					}]);
				},
				success(...inputArgs) {
					return settleLoading("success", inputArgs);
				},
				error(...inputArgs) {
					return settleLoading("error", inputArgs);
				},
				info(...inputArgs) {
					return settleLoading("info", inputArgs);
				},
				warning(...inputArgs) {
					return settleLoading("warning", inputArgs);
				},
				dismiss(reason = "programmatic", immediate = false) {
					if (typeof reason === "boolean") dismiss(reason, null, "programmatic");
					else dismiss(Boolean(immediate), null, String(reason || "programmatic"));
				}
			};
			actions.append(createMinimizeButton(host.document));
			actions.append(createExpandButton(host.document, () => record));
			if (options.closeButton) actions.append(createCloseButton(host.document, () => dismiss(false, null, "close")));
			if (options.pauseOnInteraction) {
				node.addEventListener("pointerenter", pauseTimer);
				node.addEventListener("pointerleave", resumeTimer);
				node.addEventListener("focusin", pauseTimer);
				node.addEventListener("focusout", (event) => {
					if (!isDomNode(event.relatedTarget) || !node.contains(event.relatedTarget)) resumeTimer();
				});
			}
			node.addEventListener("keydown", (event) => {
				if (event.key !== "Escape") return;
				if (state.stackExpanded) {
					event.preventDefault();
					event.stopPropagation();
					setStackExpanded(false);
				} else if (options.dismissible) {
					event.preventDefault();
					event.stopPropagation();
					dismiss(false, null, "escape");
				}
			});
			renderArgs(args, options);
			host.list.prepend(node);
			state.toasts.push(record);
			emitEvent("create", {
				record,
				controller,
				options: { ...options },
				args,
				scope: options.scope
			});
			installSwipeToDismiss(record, host);
			syncStackLayout();
			(host.window.requestAnimationFrame?.bind(host.window) ?? ((callback) => host.window.setTimeout(() => callback(performance.now()), 0)))(() => {
				if (node.isConnected) node.dataset.visible = "true";
			});
			scheduleTimer();
			return {
				record,
				controller
			};
		}
		function showParsedToast(parsed) {
			const options = normalizeToastOptions(parsed.options);
			if (options.id) {
				const existing = state.recordsById.get(options.id);
				if (existing && !existing.removed) {
					existing.lastSeenAt = Date.now();
					return options.loading || existing.options.loading ? existing.updateLoading([{
						...parsed.options,
						loading: true
					}]) : existing.update(parsed.args, parsed.options);
				}
			}
			const dedupeKey = options.dedupe ? createDedupeKey(parsed.args, options) : null;
			if (dedupeKey && !options.id) {
				const existing = state.dedupeRecords.get(dedupeKey);
				const now = Date.now();
				const persistentDuplicate = state.config.coalescePersistent && options.duration <= 0 && (existing?.options.duration ?? 1) <= 0;
				const insideWindow = Boolean(existing && now - existing.lastSeenAt <= options.dedupeWindow);
				if (existing && !existing.removed && (persistentDuplicate || insideWindow)) {
					existing.lastSeenAt = now;
					return existing.bumpDuplicate();
				}
			}
			const created = createToastRecord(parsed.args, parsed.options);
			if (!created) return null;
			created.record.dedupeKey = dedupeKey;
			if (options.id) state.recordsById.set(options.id, created.record);
			if (dedupeKey) state.dedupeRecords.set(dedupeKey, created.record);
			return created.controller;
		}
		function showToast(inputArgs, forcedType) {
			return showParsedToast(parseArguments(inputArgs, forcedType));
		}
		function showLoadingToast(inputArgs) {
			const descriptor = parseLoadingInput(inputArgs);
			return showParsedToast({
				args: [],
				options: {
					...descriptor,
					type: descriptor.type ?? "default",
					loading: true,
					loadingState: "loading",
					animation: descriptor.animation ?? state.config.loadingAnimation,
					icon: descriptor.icon === void 0 ? state.config.loadingIcon : descriptor.icon,
					duration: Number.isFinite(Number(descriptor.duration)) ? Number(descriptor.duration) : state.config.loadingDuration,
					dedupe: descriptor.dedupe ?? false
				}
			});
		}
		function normalizeActionDescriptors(actions, fallbackActions = []) {
			return (Array.isArray(actions) && actions.length ? actions : fallbackActions).filter((action) => isUnknownRecord(action)).map((action, index) => {
				const id = action.id == null ? `action-${index + 1}` : String(action.id);
				const label = action.label == null ? String(action.id ?? `Action ${index + 1}`) : String(action.label);
				return {
					id,
					label,
					labelTemplate: label,
					loadingLabel: action.loadingLabel == null ? null : String(action.loadingLabel),
					successLabel: action.successLabel == null ? null : String(action.successLabel),
					icon: action.icon === false || action.icon === null ? false : typeof action.icon === "string" && hasOwn(SVG_ICONS, action.icon) ? action.icon : null,
					variant: typeof action.variant === "string" && ALLOWED_ACTION_VARIANTS.has(action.variant) ? action.variant : "secondary",
					disabled: Boolean(action.disabled),
					disabledUntilCountdown: Boolean(action.disabledUntilCountdown),
					close: action.close !== false && action.keepOpen !== true,
					keepOpen: action.keepOpen === true || action.close === false,
					handle: typeof action.handle === "function" ? action.handle : null,
					hasValue: hasOwn(action, "value"),
					value: action.value,
					shortcut: action.shortcut == null ? null : String(action.shortcut),
					raw: action
				};
			});
		}
		function normalizeShortcutName(value) {
			const order = [
				"Control",
				"Alt",
				"Shift",
				"Meta"
			];
			return String(value ?? "").split("+").map((part) => part.trim()).filter(Boolean).map((part) => {
				const lower = part.toLowerCase();
				if (lower === "cmd" || lower === "command") return "Meta";
				if (lower === "ctrl" || lower === "control") return "Control";
				if (lower === "alt" || lower === "option") return "Alt";
				if (lower === "shift") return "Shift";
				if (lower === "esc") return "Escape";
				if (lower === "return") return "Enter";
				return part.length === 1 ? part.toUpperCase() : part;
			}).sort((left, right) => {
				const leftIndex = order.indexOf(left);
				const rightIndex = order.indexOf(right);
				if (leftIndex >= 0 || rightIndex >= 0) return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex);
				return 0;
			}).join("+");
		}
		function shortcutFromEvent(event) {
			const parts = [];
			if (event.ctrlKey) parts.push("Control");
			if (event.altKey) parts.push("Alt");
			if (event.shiftKey) parts.push("Shift");
			if (event.metaKey) parts.push("Meta");
			parts.push(event.key.length === 1 ? event.key.toUpperCase() : event.key);
			return normalizeShortcutName(parts.join("+"));
		}
		function createDetailsNode(documentRef, details, label = "Details") {
			if (details === void 0 || details === null || details === false) return null;
			const root = documentRef.createElement("details");
			const summary = documentRef.createElement("summary");
			const body = documentRef.createElement("div");
			root.className = "rod-toast__details";
			summary.textContent = String(label || "Details");
			body.className = "rod-toast__details-body";
			if (typeof details === "string") body.textContent = details;
			else body.append(renderToastValue(details, documentRef, state.config));
			root.append(summary, body);
			return root;
		}
		async function copyText(value) {
			const text = String(value ?? "");
			const hostWindow = state.hostWindow ?? initialHostWindow;
			const hostDocument = state.hostDocument ?? hostWindow.document;
			if (hostWindow.navigator?.clipboard?.writeText) {
				await hostWindow.navigator.clipboard.writeText(text);
				return true;
			}
			const textarea = hostDocument.createElement("textarea");
			textarea.value = text;
			textarea.style.position = "fixed";
			textarea.style.left = "-99999px";
			(hostDocument.body ?? hostDocument.documentElement).append(textarea);
			textarea.select();
			const copied = safeCall(() => hostDocument.execCommand("copy"), false);
			textarea.remove();
			return copied;
		}
		function buildCheckboxes(documentRef, checkbox) {
			const source = Array.isArray(checkbox) ? checkbox : checkbox ? [checkbox] : [];
			if (!source.length) return {
				node: null,
				getValue: () => ({})
			};
			const root = documentRef.createElement("div");
			const inputs = /* @__PURE__ */ new Map();
			root.className = "rod-toast__checkboxes";
			source.forEach((item, index) => {
				const descriptor = typeof item === "string" ? {
					id: `checkbox-${index + 1}`,
					label: item
				} : item;
				const id = String(descriptor.id ?? `checkbox-${index + 1}`);
				const label = documentRef.createElement("label");
				const input = documentRef.createElement("input");
				const copy = documentRef.createElement("span");
				label.className = "rod-toast__checkbox";
				input.type = "checkbox";
				input.checked = Boolean(descriptor.checked);
				input.disabled = Boolean(descriptor.disabled);
				input.dataset.checkboxId = id;
				copy.textContent = String(descriptor.label ?? id);
				label.append(input, copy);
				root.append(label);
				inputs.set(id, input);
			});
			return {
				node: root,
				getValue: () => Object.fromEntries([...inputs.entries()].map(([id, input]) => [id, input.checked]))
			};
		}
		function formatDialogResult(options, value, reason, actionId, values) {
			if (!options.returnMeta) return value;
			return {
				value,
				reason,
				actionId,
				...values
			};
		}
		function getToastApi() {
			if (!state.api) throw new Error("RodToaster API is not initialized yet.");
			return state.api;
		}
		function showActionDialog(descriptor = {}, settings = {}) {
			const options = isPlainObject(descriptor) ? { ...descriptor } : { title: String(descriptor ?? "") };
			const fallbackActions = settings.fallbackActions ?? [{
				id: "cancel",
				label: "Cancel",
				icon: "circle-x",
				variant: "secondary",
				value: settings.dismissValue ?? false
			}, {
				id: "confirm",
				label: "Confirm",
				icon: "check",
				variant: "primary",
				value: true
			}];
			const normalizedActions = normalizeActionDescriptors(options.actions, fallbackActions);
			const dismissValue = hasOwn(options, "dismissValue") ? options.dismissValue : settings.dismissValue ?? false;
			return new Promise((resolve, reject) => {
				let settled = false;
				let countdownTimer = null;
				let remainingSeconds = 0;
				let initialSeconds = 0;
				const cleanupCallbacks = [];
				let getValues = () => ({});
				const created = createToastRecord([], {
					type: typeof options.type === "string" && hasOwn(TOAST_COLORS, options.type) ? options.type : settings.type ?? "default",
					title: options.title,
					description: options.description,
					icon: options.icon === void 0 ? settings.icon ?? "circle" : options.icon,
					duration: Number.isFinite(Number(options.duration)) ? Number(options.duration) : settings.duration ?? 0,
					id: options.id,
					scope: options.scope,
					metadata: options.metadata,
					dedupe: false,
					pauseOnInteraction: options.pauseOnInteraction ?? true,
					dismissible: options.dismissible !== false,
					closeButton: options.dismissible !== false && (options.closeButton ?? true),
					swipeToDismiss: options.dismissible !== false && (options.swipeToDismiss ?? true),
					role: options.role ?? "alertdialog",
					onDismiss: ({ reason }) => finish(dismissValue, reason, null)
				});
				if (!created) {
					resolve(formatDialogResult(options, dismissValue, "unavailable", null, {}));
					return;
				}
				const { controller, record } = created;
				const node = controller.element;
				const content = node.querySelector(".rod-toast__content");
				const iconNode = node.querySelector(".rod-toast__icon");
				node.dataset.confirm = "false";
				node.dataset.interactive = "true";
				node.dataset.interactiveKind = settings.kind ?? "dialog";
				node.setAttribute("aria-modal", "false");
				if (!content) {
					controller.dismiss("unavailable", true);
					resolve(formatDialogResult(options, dismissValue, "unavailable", null, {}));
					return;
				}
				const documentRef = node.ownerDocument;
				const root = documentRef.createElement("div");
				const copy = documentRef.createElement("div");
				const title = documentRef.createElement("div");
				const description = documentRef.createElement("div");
				const body = documentRef.createElement("div");
				const validation = documentRef.createElement("div");
				const countdown = documentRef.createElement("div");
				const countdownLabel = documentRef.createElement("div");
				const countdownTrack = documentRef.createElement("div");
				const countdownBar = documentRef.createElement("div");
				const actionsNode = documentRef.createElement("div");
				root.className = "rod-toast__interactive";
				copy.className = "rod-toast__interactive-copy";
				title.className = "rod-toast__interactive-title";
				description.className = "rod-toast__interactive-description";
				validation.className = "rod-toast__validation";
				validation.dataset.visible = "false";
				countdown.className = "rod-toast__countdown";
				countdown.dataset.visible = "false";
				countdownTrack.className = "rod-toast__countdown-track";
				countdownBar.className = "rod-toast__countdown-bar";
				actionsNode.className = "rod-toast__confirm-actions";
				title.textContent = String(options.title ?? "");
				title.hidden = !title.textContent;
				description.textContent = String(options.description ?? "");
				description.hidden = !description.textContent;
				countdownTrack.append(countdownBar);
				countdown.append(countdownLabel, countdownTrack);
				copy.append(title, description);
				root.append(copy, body);
				const checkboxApi = buildCheckboxes(documentRef, options.checkbox);
				if (checkboxApi.node) body.append(checkboxApi.node);
				const bodyApi = settings.buildBody?.({
					document: documentRef,
					body,
					node,
					controller,
					options
				}) ?? {};
				getValues = () => ({
					...bodyApi.getValues?.() ?? {},
					...checkboxApi.node ? { checked: checkboxApi.getValue() } : {}
				});
				let currentDetailsNode = createDetailsNode(documentRef, options.details, options.detailsLabel ?? "Details");
				if (currentDetailsNode) root.append(currentDetailsNode);
				root.append(validation, countdown, actionsNode);
				content.replaceChildren(root);
				const buttons = [];
				const buttonByActionId = /* @__PURE__ */ new Map();
				function cleanup() {
					if (countdownTimer !== null) {
						(state.hostWindow ?? initialHostWindow).clearInterval(countdownTimer);
						countdownTimer = null;
					}
					cleanupCallbacks.splice(0).forEach((callback) => safeCall(callback, void 0));
				}
				function finish(value, reason = "action", actionId = null) {
					if (settled) return;
					settled = true;
					cleanup();
					resolve(formatDialogResult(options, value, reason, actionId, getValues()));
				}
				const setValidation = (message) => {
					validation.textContent = String(message ?? "");
					validation.dataset.visible = String(Boolean(validation.textContent));
				};
				const updateDialog = (next = {}) => {
					if (hasOwn(next, "title")) {
						title.textContent = String(next.title ?? "");
						title.hidden = !title.textContent;
					}
					if (hasOwn(next, "description")) {
						description.textContent = String(next.description ?? "");
						description.hidden = !description.textContent;
					}
					if (hasOwn(next, "details")) {
						const nextDetails = createDetailsNode(documentRef, next.details, String(next.detailsLabel ?? options.detailsLabel ?? "Details"));
						currentDetailsNode?.remove();
						currentDetailsNode = nextDetails;
						if (currentDetailsNode) root.insertBefore(currentDetailsNode, validation);
					}
					if (hasOwn(next, "validation")) setValidation(next.validation);
					return controller;
				};
				const setButtonsBusy = (activeButton, action, busy) => {
					buttons.forEach((button) => {
						const descriptorForButton = button.__rodAction;
						const lockedByCountdown = descriptorForButton.disabledUntilCountdown && remainingSeconds > 0;
						button.disabled = busy || descriptorForButton.disabled || lockedByCountdown;
						button.dataset.busy = String(busy && button === activeButton);
					});
					if (activeButton) {
						const label = activeButton.querySelector("span");
						if (label) label.textContent = busy && action.loadingLabel ? action.loadingLabel : action.label;
					}
				};
				const executeAction = async (action, button, event) => {
					if (settled || button.disabled) return;
					setValidation("");
					const values = getValues();
					const validationResult = await settings.validate?.({
						action,
						values,
						options
					});
					if (validationResult !== true && validationResult !== void 0) {
						setValidation(validationResult === false ? options.validationMessage ?? "Please review this value." : validationResult);
						return;
					}
					const currentSvg = button.querySelector("svg");
					const originalIcon = currentSvg?.cloneNode(true) ?? null;
					const labelNode = button.querySelector("span");
					setButtonsBusy(button, action, true);
					const loader = createSvgIcon(documentRef, "loader-circle", 15);
					if (currentSvg) currentSvg.replaceWith(loader);
					else button.insertBefore(loader, labelNode);
					let closedByContext = false;
					const close = (value = action.value, reason = "action") => {
						closedByContext = true;
						finish(value, reason, action.id);
						controller.dismiss(reason);
					};
					try {
						emitEvent("action", {
							phase: "start",
							actionId: action.id,
							action: action.raw,
							controller,
							scope: options.scope ?? null
						});
						let result = action.handle ? await action.handle({
							action: action.raw,
							controller,
							event,
							toast: getToastApi(),
							close,
							update: updateDialog,
							setValidation,
							values,
							checked: isUnknownRecord(values.checked) ? values.checked : {}
						}) : void 0;
						if (closedByContext) return;
						if (result === void 0) result = settings.resolveValue ? settings.resolveValue(action, values) : action.hasValue ? action.value : action.id;
						if (action.successLabel && labelNode) {
							labelNode.textContent = action.successLabel;
							button.querySelector("svg")?.replaceWith(createSvgIcon(documentRef, "check", 15));
							await new Promise((resolveDelay) => (state.hostWindow ?? initialHostWindow).setTimeout(resolveDelay, 260));
						}
						emitEvent("action", {
							phase: "success",
							actionId: action.id,
							action: action.raw,
							result,
							controller,
							scope: options.scope ?? null
						});
						if (action.close) {
							finish(result, "action", action.id);
							controller.dismiss("action");
							return;
						}
						button.querySelector("svg")?.remove();
						if (originalIcon) button.insertBefore(originalIcon, labelNode);
						if (labelNode) labelNode.textContent = action.label;
						setButtonsBusy(button, action, false);
					} catch (error) {
						emitEvent("action", {
							phase: "error",
							actionId: action.id,
							action: action.raw,
							error,
							controller,
							scope: options.scope ?? null
						});
						if (options.rejectOnActionError === false) {
							setValidation(toErrorMessage(error));
							button.querySelector("svg")?.remove();
							if (originalIcon) button.insertBefore(originalIcon, labelNode);
							if (labelNode) labelNode.textContent = action.label;
							setButtonsBusy(button, action, false);
							return;
						}
						if (!settled) {
							settled = true;
							cleanup();
							reject(error);
							controller.dismiss("action-error", true);
						}
					}
				};
				normalizedActions.forEach((action) => {
					const button = documentRef.createElement("button");
					const label = documentRef.createElement("span");
					button.type = "button";
					button.className = "rod-toast__confirm-button";
					button.dataset.actionId = action.id;
					button.dataset.variant = action.variant;
					button.dataset.busy = "false";
					button.__rodAction = action;
					button.disabled = action.disabled;
					if (action.icon) button.append(createSvgIcon(documentRef, action.icon, 15));
					label.textContent = action.label;
					button.append(label);
					button.addEventListener("click", (event) => {
						event.preventDefault();
						event.stopPropagation();
						executeAction(action, button, event);
					});
					actionsNode.append(button);
					buttons.push(button);
					buttonByActionId.set(action.id, button);
				});
				const countdownValue = isUnknownRecord(options.countdown) ? options.countdown.seconds : options.countdown;
				initialSeconds = Math.max(0, Math.ceil(Number(countdownValue) || 0));
				remainingSeconds = initialSeconds;
				const updateCountdown = () => {
					countdown.dataset.visible = String(initialSeconds > 0);
					if (!initialSeconds) return;
					countdown.style.setProperty("--rod-countdown-progress", `${Math.round(clamp(remainingSeconds / initialSeconds, 0, 1) * 100)}%`);
					countdownLabel.textContent = remainingSeconds > 0 ? `${remainingSeconds}s remaining` : "Ready";
					buttons.forEach((button) => {
						const action = button.__rodAction;
						const label = button.querySelector("span");
						if (label && button.dataset.busy !== "true") label.textContent = action.labelTemplate.replace(/\{seconds\}/g, String(remainingSeconds));
						button.disabled = action.disabled || action.disabledUntilCountdown && remainingSeconds > 0;
					});
				};
				if (initialSeconds > 0) {
					updateCountdown();
					countdownTimer = (state.hostWindow ?? initialHostWindow).setInterval(() => {
						remainingSeconds = Math.max(0, remainingSeconds - 1);
						updateCountdown();
						if (remainingSeconds <= 0) {
							if (countdownTimer !== null) (state.hostWindow ?? initialHostWindow).clearInterval(countdownTimer);
							countdownTimer = null;
							const autoActionId = isUnknownRecord(options.countdown) ? options.countdown.autoAction : null;
							if (autoActionId != null) buttonByActionId.get(String(autoActionId))?.click();
						}
					}, 1e3);
				}
				const shortcuts = /* @__PURE__ */ new Map();
				Object.entries(options.shortcuts ?? {}).forEach(([shortcut, actionId]) => shortcuts.set(normalizeShortcutName(shortcut), String(actionId)));
				normalizedActions.forEach((action) => {
					if (action.shortcut) shortcuts.set(normalizeShortcutName(action.shortcut), action.id);
				});
				const keyHandler = (event) => {
					if (settled) return;
					const actionId = shortcuts.get(shortcutFromEvent(event));
					if (actionId) {
						const button = buttonByActionId.get(actionId);
						if (button) {
							event.preventDefault();
							event.stopPropagation();
							button.click();
							return;
						}
					}
					if (event.key === "Escape" && options.dismissible !== false) {
						event.preventDefault();
						event.stopPropagation();
						controller.dismiss("escape");
					}
				};
				documentRef.addEventListener("keydown", keyHandler, true);
				cleanupCallbacks.push(() => documentRef.removeEventListener("keydown", keyHandler, true));
				setManagerMinimized(false);
				syncStackLayout();
				const preferredButton = buttons.find((button) => !button.disabled && button.dataset.variant === "primary") ?? buttons.find((button) => !button.disabled);
				const hostWindow = state.hostWindow ?? initialHostWindow;
				(hostWindow.requestAnimationFrame?.bind(hostWindow) ?? ((callback) => hostWindow.setTimeout(() => callback(performance.now()), 0)))(() => {
					bodyApi.focus?.();
					if (!bodyApi.focus) preferredButton?.focus({ preventScroll: true });
					iconNode?.setAttribute("aria-hidden", "true");
				});
				record.dialogActions = normalizedActions;
			});
		}
		function showConfirmToast(descriptor = {}) {
			const options = isPlainObject(descriptor) ? { ...descriptor } : { title: String(descriptor ?? "") };
			options.shortcuts ??= {
				Escape: "cancel",
				Enter: "confirm"
			};
			return showActionDialog(options, {
				kind: "confirm",
				dismissValue: false,
				fallbackActions: [{
					id: "cancel",
					label: "Cancel",
					icon: "circle-x",
					variant: "secondary",
					value: false
				}, {
					id: "confirm",
					label: "Confirm",
					icon: "check",
					variant: "primary",
					value: true
				}]
			});
		}
		function showPromptToast(descriptor = {}) {
			const options = isPlainObject(descriptor) ? { ...descriptor } : { title: String(descriptor ?? "") };
			options.shortcuts ??= options.multiline ? {
				Escape: "cancel",
				"Meta+Enter": "confirm",
				"Control+Enter": "confirm"
			} : {
				Escape: "cancel",
				Enter: "confirm"
			};
			let input = null;
			return showActionDialog(options, {
				kind: "prompt",
				dismissValue: hasOwn(options, "dismissValue") ? options.dismissValue : null,
				fallbackActions: [{
					id: "cancel",
					label: options.cancelLabel ?? "Cancel",
					icon: "circle-x",
					variant: "secondary",
					value: hasOwn(options, "dismissValue") ? options.dismissValue : null
				}, {
					id: "confirm",
					label: options.confirmLabel ?? "Save",
					icon: "check",
					variant: "primary"
				}],
				buildBody({ document, body }) {
					const field = document.createElement("label");
					const label = document.createElement("span");
					input = options.multiline ? document.createElement("textarea") : document.createElement("input");
					field.className = "rod-toast__field";
					label.className = "rod-toast__field-label";
					label.textContent = String(options.inputLabel ?? "Value");
					label.hidden = !options.inputLabel;
					input.className = options.multiline ? "rod-toast__textarea" : "rod-toast__input";
					if (isInputElement(input)) input.type = options.inputType ?? "text";
					input.value = options.value == null ? "" : String(options.value);
					input.placeholder = String(options.placeholder ?? "");
					input.autocomplete = options.autocomplete ?? "off";
					input.spellcheck = options.spellcheck !== false;
					if (Number.isFinite(options.minLength)) input.minLength = Number(options.minLength);
					if (Number.isFinite(options.maxLength)) input.maxLength = Number(options.maxLength);
					input.required = Boolean(options.required);
					field.append(label, input);
					body.append(field);
					return {
						focus: () => {
							input?.focus({ preventScroll: true });
							if (isInputElement(input)) input.select();
						},
						getValues: () => ({ input: input?.value ?? "" })
					};
				},
				async validate({ action, values }) {
					if (action.id === "cancel") return true;
					const value = String(values.input ?? "");
					if (options.required && !value.trim()) return options.requiredMessage ?? "A value is required.";
					return typeof options.validate === "function" ? options.validate(value) : true;
				},
				resolveValue(action, values) {
					if (action.id === "cancel") return action.hasValue ? action.value : null;
					return action.hasValue ? action.value : values.input;
				}
			});
		}
		function showSelectToast(descriptor = {}) {
			const options = isPlainObject(descriptor) ? { ...descriptor } : {};
			options.shortcuts ??= {
				Escape: "cancel",
				Enter: "confirm"
			};
			let select = null;
			const choices = Array.isArray(options.options) ? options.options : [];
			return showActionDialog(options, {
				kind: "select",
				dismissValue: hasOwn(options, "dismissValue") ? options.dismissValue : null,
				fallbackActions: [{
					id: "cancel",
					label: options.cancelLabel ?? "Cancel",
					icon: "circle-x",
					variant: "secondary",
					value: hasOwn(options, "dismissValue") ? options.dismissValue : null
				}, {
					id: "confirm",
					label: options.confirmLabel ?? "Select",
					icon: "check",
					variant: "primary"
				}],
				buildBody({ document, body }) {
					const field = document.createElement("label");
					const label = document.createElement("span");
					select = document.createElement("select");
					field.className = "rod-toast__field";
					label.className = "rod-toast__field-label";
					label.textContent = String(options.inputLabel ?? "Option");
					label.hidden = !options.inputLabel;
					select.className = "rod-toast__select";
					select.multiple = Boolean(options.multiple);
					choices.forEach((choice, index) => {
						const choiceDescriptor = isUnknownRecord(choice) ? choice : {
							value: choice,
							label: choice
						};
						const option = document.createElement("option");
						option.value = String(choiceDescriptor.value ?? index);
						option.textContent = String(choiceDescriptor.label ?? choiceDescriptor.value ?? index);
						option.disabled = Boolean(choiceDescriptor.disabled);
						option.selected = options.multiple ? Array.isArray(options.value) && options.value.map(String).includes(option.value) : String(options.value ?? "") === option.value;
						select.append(option);
					});
					field.append(label, select);
					body.append(field);
					return {
						focus: () => select?.focus({ preventScroll: true }),
						getValues: () => {
							const selected = select ? [...select.selectedOptions].map((option) => option.value) : [];
							return { selection: options.multiple ? selected : selected[0] ?? null };
						}
					};
				},
				async validate({ action, values }) {
					if (action.id === "cancel") return true;
					const selection = values.selection;
					if (options.required && (selection == null || Array.isArray(selection) && selection.length === 0)) return options.requiredMessage ?? "Choose an option.";
					return typeof options.validate === "function" ? options.validate(selection) : true;
				},
				resolveValue(action, values) {
					if (action.id === "cancel") return action.hasValue ? action.value : null;
					return action.hasValue ? action.value : values.selection;
				}
			});
		}
		function isRichDescriptor(value) {
			return isPlainObject(value) && [
				"title",
				"description",
				"details",
				"actions",
				"error",
				"copyError"
			].some((key) => hasOwn(value, key));
		}
		function showRichToast(descriptor = {}, forcedType = null) {
			const options = isPlainObject(descriptor) ? { ...descriptor } : { title: String(descriptor ?? "") };
			const type = forcedType ?? (typeof options.type === "string" && hasOwn(TOAST_COLORS, options.type) ? options.type : "default");
			const created = createToastRecord([], {
				...options,
				type,
				dedupe: options.dedupe ?? false
			});
			if (!created) return null;
			const { controller } = created;
			const node = controller.element;
			const content = node.querySelector(".rod-toast__content");
			if (!content) return controller;
			const documentRef = node.ownerDocument;
			node.dataset.rich = "true";
			const render = (next = options) => {
				const root = documentRef.createElement("div");
				const copy = documentRef.createElement("div");
				const title = documentRef.createElement("div");
				const description = documentRef.createElement("div");
				const actionBar = documentRef.createElement("div");
				root.className = "rod-toast__rich";
				copy.className = "rod-toast__rich-copy";
				title.className = "rod-toast__rich-title";
				description.className = "rod-toast__rich-description";
				actionBar.className = "rod-toast__action-bar";
				title.textContent = String(next.title ?? "");
				title.hidden = !title.textContent;
				description.textContent = String(next.description ?? "");
				description.hidden = !description.textContent;
				copy.append(title, description);
				root.append(copy);
				const details = next.details ?? next.error;
				const detailsNode = createDetailsNode(documentRef, details instanceof Error ? details.stack ?? details.message : details, next.detailsLabel ?? "Details");
				if (detailsNode) root.append(detailsNode);
				const normalizedActions = normalizeActionDescriptors(next.actions, []);
				if (next.copyError !== false && next.error) {
					const copyAction = normalizeActionDescriptors([{
						id: "copy-error",
						label: next.copyLabel ?? "Copy error",
						icon: "copy",
						variant: "secondary",
						close: false,
						successLabel: "Copied",
						handle: () => copyText(next.error instanceof Error ? next.error.stack ?? next.error.message : next.error)
					}])[0];
					if (copyAction) normalizedActions.push(copyAction);
				}
				normalizedActions.forEach((action) => {
					const button = documentRef.createElement("button");
					const label = documentRef.createElement("span");
					button.type = "button";
					button.className = "rod-toast__action-button";
					button.dataset.variant = action.variant;
					button.dataset.busy = "false";
					button.disabled = action.disabled;
					if (action.icon) button.append(createSvgIcon(documentRef, action.icon, 14));
					label.textContent = action.label;
					button.append(label);
					button.addEventListener("click", (event) => {
						event.preventDefault();
						event.stopPropagation();
						if (button.disabled) return;
						button.disabled = true;
						button.dataset.busy = "true";
						const originalLabel = label.textContent ?? action.label;
						if (action.loadingLabel) label.textContent = action.loadingLabel;
						Promise.resolve(action.handle ? action.handle({
							action: action.raw,
							controller,
							event,
							toast: getToastApi(),
							close: (_value, reason = "action") => controller.dismiss(reason),
							update: (nextDescriptor) => {
								Object.assign(next, nextDescriptor);
								render(next);
								return controller;
							},
							setValidation: () => void 0,
							values: {},
							checked: {}
						}) : action.hasValue ? action.value : action.id).then((result) => {
							emitEvent("action", {
								phase: "success",
								actionId: action.id,
								action: action.raw,
								result,
								controller,
								scope: options.scope ?? null
							});
							if (action.successLabel) label.textContent = action.successLabel;
							if (action.close) {
								controller.dismiss("action");
								return;
							}
							(state.hostWindow ?? initialHostWindow).setTimeout(() => {
								label.textContent = originalLabel;
								button.disabled = false;
								button.dataset.busy = "false";
							}, action.successLabel ? 650 : 0);
						}).catch((error) => {
							emitEvent("action", {
								phase: "error",
								actionId: action.id,
								action: action.raw,
								error,
								controller,
								scope: options.scope ?? null
							});
							label.textContent = originalLabel;
							button.disabled = false;
							button.dataset.busy = "false";
							showSemanticToast("error", [error]);
						});
					});
					actionBar.append(button);
				});
				if (normalizedActions.length) root.append(actionBar);
				content.replaceChildren(root);
			};
			render(options);
			controller.updateRich = (next = {}) => {
				Object.assign(options, next);
				render(options);
				return controller;
			};
			return controller;
		}
		function showSemanticToast(type, inputArgs) {
			const args = [...inputArgs];
			if (args.length === 1 && isRichDescriptor(args[0])) return showRichToast(args[0], type);
			if (args[0] instanceof Error) {
				const error = args[0];
				const tail = isOptionsCandidate(args[1]) ? args[1] : {};
				return showRichToast({
					...tail,
					title: tail.title ?? error.message ?? error.name ?? "Error",
					description: tail.description ?? error.name ?? "Error",
					error,
					icon: tail.icon ?? "circle-x",
					copyError: tail.copyError ?? true
				}, type);
			}
			return showToast(args, type);
		}
		function getTaskStorage() {
			const hostWindow = state.hostWindow ?? initialHostWindow;
			return safeCall(() => hostWindow[state.config.taskStorage], null);
		}
		function getPersistedTaskSnapshots() {
			const storage = getTaskStorage();
			if (!storage) return [];
			return safeCall(() => {
				const parsed = JSON.parse(storage.getItem(state.config.taskStorageKey) ?? "[]");
				return Array.isArray(parsed) ? parsed.filter(isTaskSnapshot) : [];
			}, []);
		}
		function isTaskSnapshot(value) {
			return isUnknownRecord(value) && typeof value.id === "string" && typeof value.title === "string" && typeof value.status === "string";
		}
		function persistTaskSnapshots() {
			if (!state.config.persistTasks) return;
			const storage = getTaskStorage();
			if (!storage) return;
			const snapshots = [...state.tasks.values()].filter((task) => task.persist && !task.dismissed).map((task) => task.snapshot()).slice(-state.config.maxPersistedTasks);
			safeCall(() => storage.setItem(state.config.taskStorageKey, JSON.stringify(snapshots)), void 0);
		}
		function createTaskController(descriptor = {}) {
			const options = isPlainObject(descriptor) ? { ...descriptor } : { title: String(descriptor ?? "") };
			const id = String(options.id ?? `task-${Date.now()}-${Math.random().toString(36).slice(2)}`);
			const existing = state.tasks.get(id);
			if (existing && !existing.dismissed) return existing;
			const abortController = new AbortController();
			const taskState = {
				id,
				title: String(options.title ?? "Task"),
				description: String(options.description ?? ""),
				icon: options.icon === false ? false : options.icon ?? "clock",
				status: normalizeTaskStatus(options.status ?? "queued"),
				progress: normalizeProgress(options.progress),
				progressLabel: options.progressLabel == null ? null : String(options.progressLabel),
				metadata: isUnknownRecord(options.metadata) ? { ...options.metadata } : {},
				scope: options.scope == null ? null : String(options.scope),
				createdAt: Number(options.createdAt) || Date.now(),
				updatedAt: Number(options.updatedAt) || Date.now(),
				persist: options.persist ?? state.config.persistTasks,
				restored: Boolean(options.restored),
				orphaned: Boolean(options.orphaned)
			};
			let dismissed = false;
			let paused = taskState.status === "paused";
			const toastId = String(options.toastId ?? `task:${id}`);
			let toastController = null;
			const task = {};
			Object.defineProperties(task, {
				id: {
					value: id,
					enumerable: true
				},
				persist: {
					get: () => taskState.persist,
					enumerable: true
				},
				abortController: {
					value: abortController,
					enumerable: true
				},
				signal: {
					value: abortController.signal,
					enumerable: true
				},
				status: {
					get: () => taskState.status,
					enumerable: true
				},
				progress: {
					get: () => taskState.progress,
					enumerable: true
				},
				dismissed: {
					get: () => dismissed,
					enumerable: true
				},
				element: {
					get: () => toastController?.element ?? null,
					enumerable: true
				}
			});
			toastController = showLoadingToast([{
				id: toastId,
				title: taskState.title,
				description: taskState.description,
				icon: taskState.icon,
				animation: taskState.progress === null ? "spinner" : "progress",
				progress: taskState.progress,
				progressLabel: taskState.progressLabel,
				duration: 0,
				dedupe: false,
				scope: taskState.scope,
				metadata: {
					...taskState.metadata,
					taskId: id
				},
				onDismiss: ({ reason }) => {
					dismissed = true;
					state.tasks.delete(id);
					persistTaskSnapshots();
					emitEvent("task:dismiss", {
						task,
						reason
					});
				}
			}]);
			if (!toastController) return null;
			const node = toastController.element;
			const loadingCopy = node.querySelector(".rod-toast__loading-copy");
			const taskStatus = node.ownerDocument.createElement("div");
			const taskActions = node.ownerDocument.createElement("div");
			taskStatus.className = "rod-toast__task-status";
			taskActions.className = "rod-toast__task-actions";
			loadingCopy?.append(taskStatus, taskActions);
			const renderTaskActions = () => {
				taskActions.replaceChildren();
				const descriptors = [];
				if (options.pausable && (taskState.status === "running" || taskState.status === "queued")) descriptors.push({
					id: "pause",
					label: "Pause",
					icon: "pause"
				});
				if (options.pausable && taskState.status === "paused") descriptors.push({
					id: "resume",
					label: "Resume",
					icon: "play"
				});
				if (options.cancellable && ![
					"success",
					"error",
					"cancelled"
				].includes(taskState.status)) descriptors.push({
					id: "cancel",
					label: "Cancel",
					icon: "square"
				});
				if (Array.isArray(options.actions)) descriptors.push(...options.actions.map((action) => ({
					...action,
					close: action.close === true
				})));
				normalizeActionDescriptors(descriptors).forEach((action) => {
					const button = node.ownerDocument.createElement("button");
					const label = node.ownerDocument.createElement("span");
					button.type = "button";
					button.className = "rod-toast__task-button";
					button.dataset.busy = "false";
					if (action.icon) button.append(createSvgIcon(node.ownerDocument, action.icon, 14));
					label.textContent = action.label;
					button.append(label);
					button.addEventListener("click", (event) => {
						event.preventDefault();
						event.stopPropagation();
						if (action.id === "pause") task.pause();
						else if (action.id === "resume") task.resume();
						else if (action.id === "cancel") task.cancel("user");
						else {
							button.disabled = true;
							button.dataset.busy = "true";
							Promise.resolve(action.handle?.({
								action: action.raw,
								controller: toastController,
								event,
								toast: getToastApi(),
								close: (_value, reason = "action") => task.dismiss(reason),
								update: (next) => {
									task.update(next);
									return toastController;
								},
								setValidation: () => void 0,
								values: {},
								checked: {}
							})).then(() => {
								if (action.close) task.dismiss("action");
							}).finally(() => {
								button.disabled = false;
								button.dataset.busy = "false";
							});
						}
					});
					taskActions.append(button);
				});
				taskActions.hidden = !taskActions.childElementCount;
			};
			const apply = (next = {}, emit = true) => {
				if (dismissed) return task;
				if (hasOwn(next, "title")) taskState.title = String(next.title ?? "");
				if (hasOwn(next, "description")) taskState.description = String(next.description ?? "");
				if (hasOwn(next, "icon")) taskState.icon = next.icon === false ? false : next.icon ?? "circle";
				if (hasOwn(next, "status")) taskState.status = normalizeTaskStatus(next.status);
				if (hasOwn(next, "progress")) taskState.progress = normalizeProgress(next.progress);
				if (hasOwn(next, "progressLabel")) taskState.progressLabel = next.progressLabel == null ? null : String(next.progressLabel);
				if (isUnknownRecord(next.metadata)) taskState.metadata = {
					...taskState.metadata,
					...next.metadata
				};
				taskState.updatedAt = Date.now();
				paused = taskState.status === "paused";
				const semantic = {
					queued: {
						icon: taskState.icon || "clock",
						animation: "pulse"
					},
					running: {
						icon: taskState.icon || "loader-circle",
						animation: taskState.progress === null ? "spinner" : "progress"
					},
					paused: {
						icon: "pause",
						animation: "none"
					},
					warning: {
						icon: "triangle-alert",
						animation: "none"
					},
					cancelled: {
						icon: "square",
						animation: "none"
					},
					success: {
						icon: "check",
						animation: "none"
					},
					error: {
						icon: "circle-x",
						animation: "none"
					}
				}[taskState.status];
				if (taskState.status === "success" || taskState.status === "error") (taskState.status === "success" ? toastController.success.bind(toastController) : toastController.error.bind(toastController))({
					title: taskState.title,
					description: taskState.description,
					icon: semantic.icon,
					duration: Number.isFinite(Number(next.duration)) ? Number(next.duration) : taskState.status === "success" ? state.config.loadingSuccessDuration : state.config.loadingErrorDuration
				});
				else toastController.update({
					title: taskState.title,
					description: taskState.description,
					icon: semantic.icon,
					animation: semantic.animation,
					progress: taskState.progress,
					progressLabel: taskState.progressLabel,
					duration: 0
				});
				taskStatus.textContent = taskState.status;
				renderTaskActions();
				persistTaskSnapshots();
				if (emit) emitEvent("task:update", {
					task,
					snapshot: task.snapshot()
				});
				return task;
			};
			Object.assign(task, {
				controller: toastController,
				snapshot: () => ({
					id,
					title: taskState.title,
					description: taskState.description,
					icon: taskState.icon,
					status: taskState.status,
					progress: taskState.progress,
					progressLabel: taskState.progressLabel,
					metadata: { ...taskState.metadata },
					scope: taskState.scope,
					createdAt: taskState.createdAt,
					updatedAt: taskState.updatedAt,
					persist: taskState.persist
				}),
				update: (next = {}) => apply(next),
				start: (next = {}) => apply({
					...next,
					status: "running"
				}),
				setProgress: (value, next = {}) => apply({
					...next,
					status: next.status ?? "running",
					progress: value
				}),
				pause: async () => {
					if (dismissed || paused) return task;
					await options.pause?.({
						task,
						signal: task.signal
					});
					return apply({ status: "paused" });
				},
				resume: async () => {
					if (dismissed || !paused) return task;
					await options.resume?.({
						task,
						signal: task.signal
					});
					return apply({ status: "running" });
				},
				cancel: async (reason = "cancelled") => {
					if (dismissed || [
						"success",
						"error",
						"cancelled"
					].includes(taskState.status)) return task;
					if (!abortController.signal.aborted) abortController.abort(reason);
					await options.cancel?.({
						task,
						reason
					});
					apply({
						status: "cancelled",
						title: options.cancelledTitle ?? taskState.title,
						description: options.cancelledDescription ?? "Task cancelled."
					});
					emitEvent("task:cancel", {
						task,
						reason
					});
					return task;
				},
				success: (next = {}) => apply({
					...next,
					status: "success",
					progress: 1
				}),
				error: (error, next = {}) => apply({
					...next,
					status: "error",
					description: next.description ?? toErrorMessage(error) ?? taskState.description
				}),
				warning: (next = {}) => apply({
					...next,
					status: "warning"
				}),
				dismiss: (reason = "programmatic", immediate = false) => {
					toastController.dismiss(reason, immediate);
					return task;
				},
				run: async (executor) => {
					task.start();
					try {
						const result = await executor({
							task,
							signal: task.signal,
							progress: (value, next = {}) => task.setProgress(value, next),
							update: (next = {}) => task.update(next)
						});
						task.success();
						return result;
					} catch (error) {
						if (task.signal.aborted) {
							if (task.status !== "cancelled") await task.cancel(task.signal.reason ?? "aborted");
						} else task.error(error);
						throw error;
					}
				}
			});
			state.tasks.set(id, task);
			apply(options, false);
			persistTaskSnapshots();
			emitEvent("task:create", {
				task,
				snapshot: task.snapshot()
			});
			return task;
		}
		function resolvePhaseDescriptor(spec, value, fallback = {}) {
			const resolved = typeof spec === "function" ? spec(value) : spec;
			if (resolved == null) return fallback;
			if (typeof resolved === "string") return {
				...fallback,
				description: resolved
			};
			return {
				...fallback,
				...resolved
			};
		}
		async function showPromiseToast(input, descriptor = {}) {
			const loading = resolvePhaseDescriptor(descriptor.loading, null, {
				title: descriptor.title ?? "Working",
				description: descriptor.description ?? "Please wait…",
				icon: descriptor.icon ?? "loader-circle"
			});
			const task = createTaskController({
				...descriptor,
				...loading,
				status: "running"
			});
			if (!task) return typeof input === "function" ? input({
				task: null,
				signal: new AbortController().signal,
				progress: () => null,
				update: () => null,
				toast: getToastApi()
			}) : input;
			try {
				const result = typeof input === "function" ? await input({
					task,
					signal: task.signal,
					progress: (value, next = {}) => task.setProgress(value, next),
					update: (next = {}) => task.update(next),
					toast: getToastApi()
				}) : await input;
				task.success(resolvePhaseDescriptor(descriptor.success, result, {
					title: "Completed",
					description: "The operation completed successfully."
				}));
				return result;
			} catch (error) {
				task.error(error, resolvePhaseDescriptor(descriptor.error, error, {
					title: "Failed",
					description: toErrorMessage(error)
				}));
				throw error;
			}
		}
		async function showUndoToast(descriptor = {}) {
			const duration = Number.isFinite(Number(descriptor.duration)) ? Number(descriptor.duration) : 6e3;
			const seconds = Math.max(1, Math.ceil(duration / 1e3));
			return showConfirmToast({
				...descriptor,
				icon: descriptor.icon ?? "undo",
				duration,
				dismissValue: false,
				countdown: seconds,
				actions: [{
					id: "undo",
					label: `${descriptor.actionLabel ?? "Undo"} · {seconds}s`,
					icon: descriptor.actionIcon ?? "undo",
					variant: descriptor.variant ?? "secondary",
					loadingLabel: descriptor.loadingLabel ?? "Undoing…",
					successLabel: descriptor.successLabel ?? "Restored",
					handle: async (context) => {
						await descriptor.undo?.(context);
						return true;
					}
				}]
			});
		}
		async function showRetryToast(descriptor) {
			if (typeof descriptor.run !== "function") throw new TypeError("toast.retry() requires a run function.");
			const maxAttempts = Math.max(1, Number(descriptor.maxAttempts) || 3);
			const externalAbortController = new AbortController();
			const task = createTaskController({
				...descriptor,
				title: descriptor.title ?? "Trying operation",
				description: descriptor.description ?? "Starting…",
				icon: descriptor.icon ?? "refresh",
				status: "running",
				cancellable: true,
				cancel: () => {
					if (!externalAbortController.signal.aborted) externalAbortController.abort(new DOMException("Cancelled", "AbortError"));
				}
			});
			if (!task) throw new Error("Could not create retry task.");
			for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
				task.update({
					status: "running",
					title: descriptor.title ?? "Trying operation",
					description: `Attempt ${attempt} of ${maxAttempts}`,
					icon: "refresh",
					progress: null
				});
				emitEvent("retry:attempt", {
					task,
					attempt,
					maxAttempts
				});
				try {
					const result = await descriptor.run({
						attempt,
						maxAttempts,
						signal: externalAbortController.signal,
						task,
						progress: (value, next = {}) => task.setProgress(value, next)
					});
					task.success(resolvePhaseDescriptor(descriptor.success, result, {
						title: "Completed",
						description: `Succeeded on attempt ${attempt}.`
					}));
					return result;
				} catch (error) {
					if (externalAbortController.signal.aborted) {
						await task.cancel("cancelled");
						throw error;
					}
					if (attempt >= maxAttempts) {
						task.error(error, resolvePhaseDescriptor(descriptor.error, error, {
							title: "All attempts failed",
							description: toErrorMessage(error)
						}));
						throw error;
					}
					const configuredBackoff = Array.isArray(descriptor.backoff) ? descriptor.backoff[Math.min(attempt - 1, descriptor.backoff.length - 1)] : typeof descriptor.backoff === "function" ? descriptor.backoff(attempt, error) : Number(descriptor.backoff) || 1e3 * 2 ** (attempt - 1);
					const delay = Math.max(0, Number(configuredBackoff) || 0);
					task.update({
						status: "paused",
						title: descriptor.retryTitle ?? "Retry scheduled",
						description: `Attempt ${attempt} failed. Retrying in ${Math.ceil(delay / 1e3)}s…`,
						icon: "clock"
					});
					if (await showConfirmToast({
						title: descriptor.retryTitle ?? "Try again?",
						description: toErrorMessage(error),
						icon: "refresh",
						duration: delay,
						dismissValue: "retry",
						details: toErrorDetails(error),
						rejectOnActionError: false,
						actions: [
							{
								id: "cancel",
								label: "Cancel",
								icon: "circle-x",
								variant: "secondary",
								value: "cancel"
							},
							{
								id: "details",
								label: "View details",
								icon: "eye",
								variant: "ghost",
								keepOpen: true,
								handle: ({ update }) => update({ details: toErrorDetails(error) })
							},
							{
								id: "retry",
								label: "Retry now",
								icon: "refresh",
								variant: "primary",
								value: "retry"
							}
						]
					}) === "cancel") {
						externalAbortController.abort(new DOMException("Cancelled", "AbortError"));
						await task.cancel("cancelled");
						throw error;
					}
				}
			}
			throw new Error("Retry loop ended unexpectedly.");
		}
		function createTaskGroup(descriptor = {}) {
			const options = isPlainObject(descriptor) ? { ...descriptor } : { title: String(descriptor ?? "Group") };
			const id = String(options.id ?? `group-${Date.now()}-${Math.random().toString(36).slice(2)}`);
			const existing = state.groups.get(id);
			if (existing) return existing;
			const children = /* @__PURE__ */ new Map();
			const weights = new Map(Object.entries(options.weights ?? {}));
			const parent = createTaskController({
				id: options.parentTaskId ?? `group:${id}`,
				title: options.title ?? "Task group",
				description: options.description ?? "Waiting for tasks…",
				icon: options.icon ?? "folder",
				status: "queued",
				scope: options.scope,
				metadata: {
					...options.metadata ?? {},
					groupId: id,
					groupRoot: true
				},
				persist: options.persist
			});
			if (!parent) throw new Error("Could not create task group parent.");
			const group = {
				id,
				parent,
				children,
				weights,
				task(keyOrDescriptor, maybeDescriptor = {}) {
					const childOptions = typeof keyOrDescriptor === "string" ? {
						...maybeDescriptor,
						key: maybeDescriptor.key ?? keyOrDescriptor,
						title: maybeDescriptor.title ?? keyOrDescriptor
					} : { ...keyOrDescriptor };
					const key = String(childOptions.key ?? childOptions.id ?? `task-${children.size + 1}`);
					if (children.has(key)) return children.get(key) ?? null;
					const child = createTaskController({
						...childOptions,
						id: childOptions.id ?? `${id}:${key}`,
						scope: childOptions.scope ?? options.scope,
						metadata: {
							...childOptions.metadata ?? {},
							groupId: id,
							groupKey: key
						},
						persist: childOptions.persist ?? options.persist
					});
					if (child) children.set(key, child);
					group.recompute();
					return child;
				},
				setWeights(nextWeights = {}) {
					Object.entries(nextWeights).forEach(([key, value]) => weights.set(String(key), Math.max(0, Number(value) || 0)));
					group.recompute();
					return group;
				},
				recompute() {
					const entries = [...children.entries()];
					if (!entries.length) {
						parent.update({
							status: "queued",
							progress: null
						});
						return group;
					}
					let totalWeight = 0;
					let completedWeight = 0;
					let hasUnknownProgress = false;
					let hasError = false;
					let allSuccess = true;
					entries.forEach(([key, task]) => {
						const weight = weights.has(key) ? Number(weights.get(key)) : 1;
						totalWeight += weight;
						if (task.status === "error") hasError = true;
						if (task.status !== "success") allSuccess = false;
						if (task.status === "success") completedWeight += weight;
						else if (task.progress === null) hasUnknownProgress = true;
						else completedWeight += weight * task.progress;
					});
					if (hasError) parent.error("One or more child tasks failed.", { title: options.errorTitle ?? "Task group failed" });
					else if (allSuccess) parent.success({
						title: options.successTitle ?? options.title ?? "All tasks completed",
						description: options.successDescription ?? `${entries.length} tasks completed.`
					});
					else parent.update({
						status: "running",
						title: options.title ?? "Task group",
						description: `${entries.filter(([, task]) => task.status === "success").length}/${entries.length} tasks completed`,
						progress: hasUnknownProgress || totalWeight <= 0 ? null : completedWeight / totalWeight
					});
					return group;
				},
				dismissAll(reason = "group-dismiss") {
					children.forEach((task) => task.dismiss(reason));
					parent.dismiss(reason);
					group.unsubscribe?.();
					state.groups.delete(id);
				},
				complete(next = {}) {
					parent.success(next);
					group.unsubscribe?.();
					return group;
				}
			};
			group.unsubscribe = addEventListenerInternal("task:update", (event) => {
				const candidateTask = event.task;
				if (!isTaskController(candidateTask) || candidateTask === parent) return;
				if (candidateTask.snapshot().metadata.groupId === id) group.recompute();
			});
			state.groups.set(id, group);
			emitEvent("group:create", { group });
			return group;
		}
		function isTaskController(value) {
			return isObject(value) && "snapshot" in value && typeof value.snapshot === "function";
		}
		function restorePersistedTasks() {
			if (!state.config.persistTasks || state.restoredTasks) return [];
			state.restoredTasks = true;
			const now = Date.now();
			const restored = [];
			getPersistedTaskSnapshots().forEach((snapshot) => {
				if ((snapshot.status === "success" || snapshot.status === "error" || snapshot.status === "cancelled") && now - Number(snapshot.updatedAt || 0) > state.config.taskTerminalRetention) return;
				const wasActive = snapshot.status === "running" || snapshot.status === "queued";
				const task = createTaskController({
					...snapshot,
					status: wasActive ? "paused" : snapshot.status,
					description: wasActive ? `${snapshot.description}${snapshot.description ? " · " : ""}Restored after reload. Resume manually.` : snapshot.description,
					restored: true,
					orphaned: true,
					persist: true,
					pausable: false,
					cancellable: true
				});
				if (task) restored.push(task);
			});
			emitEvent("tasks:restore", { tasks: restored });
			return restored;
		}
		function createScope(name, defaults = {}) {
			const scopeName = String(name || "default");
			const enrichDescriptor = (descriptor) => ({
				...defaults,
				...isPlainObject(descriptor) ? descriptor : { title: String(descriptor ?? "") },
				scope: scopeName
			});
			const withOptions = (inputArgs) => {
				const args = [...inputArgs];
				let trailing = {};
				if (args.length && isOptionsCandidate(args.at(-1))) {
					trailing = { ...args.pop() };
					delete trailing[OPTIONS_SYMBOL];
				}
				return [...args, getToastApi().options({
					...defaults,
					...trailing,
					scope: scopeName
				})];
			};
			const semantic = (type, args) => {
				if (args.length === 1 && isRichDescriptor(args[0])) return showRichToast(enrichDescriptor(args[0]), type);
				if (args[0] instanceof Error) {
					const trailing = isOptionsCandidate(args[1]) ? { ...args[1] } : {};
					return showSemanticToast(type, [args[0], getToastApi().options({
						...defaults,
						...trailing,
						scope: scopeName
					})]);
				}
				return showSemanticToast(type, withOptions(args));
			};
			return {
				name: scopeName,
				show: (...args) => getToastApi()(...withOptions(args)),
				error: (...args) => semantic("error", args),
				info: (...args) => semantic("info", args),
				success: (...args) => semantic("success", args),
				warning: (...args) => semantic("warning", args),
				loading: (descriptor) => showLoadingToast([enrichDescriptor(descriptor)]),
				confirm: (descriptor) => showConfirmToast(enrichDescriptor(descriptor)),
				prompt: (descriptor) => showPromptToast(enrichDescriptor(descriptor)),
				select: (descriptor) => showSelectToast(enrichDescriptor(descriptor)),
				undo: (descriptor) => showUndoToast(enrichDescriptor(descriptor)),
				task: (descriptor) => createTaskController(enrichDescriptor(descriptor)),
				promise: (input, descriptor) => showPromiseToast(input, enrichDescriptor(descriptor)),
				retry: (descriptor) => showRetryToast(enrichDescriptor(descriptor)),
				group: (descriptor) => createTaskGroup(enrichDescriptor(descriptor)),
				dismissAll(immediate = false) {
					getActiveToastRecords().filter((record) => record.options.scope === scopeName).forEach((record) => record.dismiss(immediate, null, "scope-dismissAll"));
				},
				getTasks: () => [...state.tasks.values()].filter((task) => task.snapshot().scope === scopeName),
				minimize: () => setManagerMinimized(true),
				restore: () => setManagerMinimized(false)
			};
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
		const toastApi = toast;
		toastApi.error = (...args) => showSemanticToast("error", args);
		toastApi.info = (...args) => showSemanticToast("info", args);
		toastApi.success = (...args) => showSemanticToast("success", args);
		toastApi.warning = (...args) => showSemanticToast("warning", args);
		toastApi.message = (descriptor = {}) => showRichToast(descriptor);
		toastApi.copyError = (error, options = {}) => showRichToast({
			...options,
			type: "error",
			title: options.title ?? (error instanceof Error ? error.message : "Error"),
			description: options.description ?? (error instanceof Error ? error.name : "Error"),
			error,
			copyError: true,
			icon: options.icon ?? "circle-x"
		}, "error");
		toastApi.loading = (...args) => showLoadingToast(args);
		toastApi.confirm = (descriptor = {}) => showConfirmToast(descriptor);
		toastApi.prompt = (descriptor = {}) => showPromptToast(descriptor);
		toastApi.select = (descriptor = {}) => showSelectToast(descriptor);
		toastApi.undo = (descriptor = {}) => showUndoToast(descriptor);
		toastApi.task = (descriptor = {}) => createTaskController(descriptor);
		toastApi.promise = (input, descriptor = {}) => showPromiseToast(input, descriptor);
		toastApi.retry = (descriptor) => showRetryToast(descriptor);
		toastApi.group = (descriptor = {}) => createTaskGroup(descriptor);
		toastApi.scope = (name, defaults = {}) => createScope(name, defaults);
		toastApi.debug = (...args) => showDebugToast(args);
		toastApi.inspect = (...args) => showDebugToast(args);
		toastApi.options = (options = {}) => {
			const normalized = { ...options };
			Object.defineProperty(normalized, OPTIONS_SYMBOL, {
				value: true,
				enumerable: false
			});
			return normalized;
		};
		toastApi.with = (options = {}) => {
			const markedOptions = toastApi.options(options);
			return (...args) => toastApi(...args, markedOptions);
		};
		toastApi.update = (id, ...inputArgs) => {
			const record = state.recordsById.get(String(id));
			if (!record || record.removed) return null;
			record.lastSeenAt = Date.now();
			if (record.options.loading) return record.updateLoading(inputArgs);
			const parsed = parseArguments(inputArgs, null);
			return record.update(parsed.args, parsed.options);
		};
		toastApi.progress = (id, value, next = {}) => {
			const record = state.recordsById.get(String(id));
			if (!record || record.removed || !record.options.loading) return null;
			return record.updateLoading([{
				...next,
				progress: value,
				animation: next.animation ?? record.options.animation ?? "progress"
			}]);
		};
		toastApi.resolve = (id, type = "success", ...inputArgs) => {
			const record = state.recordsById.get(String(id));
			if (!record || record.removed || !record.options.loading) return null;
			const normalizedType = type === "error" || type === "info" || type === "warning" || type === "success" ? type : "success";
			return record.settleLoading(normalizedType, inputArgs);
		};
		toastApi.dismiss = (target, reason = "programmatic", immediate = false) => {
			if (target && typeof target === "object" && "dismiss" in target && typeof target.dismiss === "function") {
				target.dismiss(reason, immediate);
				return true;
			}
			if (target != null) {
				const record = state.recordsById.get(String(target));
				if (record && !record.removed) {
					record.dismiss(Boolean(immediate), null, String(reason || "programmatic"));
					return true;
				}
			}
			return false;
		};
		toastApi.dismissAll = (immediate = false) => {
			[...getActiveToastRecords()].reverse().forEach((record, index) => {
				if (immediate) record.dismiss(true, null, "dismissAll");
				else (state.hostWindow ?? initialHostWindow).setTimeout(() => record.dismiss(false, null, "dismissAll"), index * 28);
			});
		};
		toastApi.on = (eventName, listener) => addEventListenerInternal(eventName, listener);
		toastApi.off = (eventName, listener) => {
			const bucket = state.listeners.get(String(eventName || "*"));
			if (!bucket) return false;
			const removed = bucket.delete(listener);
			if (!bucket.size) state.listeners.delete(String(eventName || "*"));
			return removed;
		};
		toastApi.once = (eventName, listener) => {
			const unsubscribe = addEventListenerInternal(eventName, (event) => {
				unsubscribe();
				listener(event);
			});
			return unsubscribe;
		};
		toastApi.emit = (eventName, payload = {}) => emitEvent(eventName, payload);
		toastApi.getTasks = () => [...state.tasks.values()];
		toastApi.getTask = (id) => state.tasks.get(String(id)) ?? null;
		toastApi.restoreTasks = () => restorePersistedTasks();
		toastApi.clearPersistedTasks = () => {
			const storage = getTaskStorage();
			safeCall(() => storage?.removeItem(state.config.taskStorageKey), void 0);
			state.restoredTasks = false;
		};
		toastApi.expand = () => {
			setManagerMinimized(false);
			setStackExpanded(true);
		};
		toastApi.collapse = () => setStackExpanded(false);
		toastApi.minimize = () => setManagerMinimized(true);
		toastApi.restore = () => setManagerMinimized(false);
		toastApi.toggleMinimized = () => setManagerMinimized(!state.managerMinimized);
		toastApi.isMinimized = () => state.managerMinimized;
		toastApi.toggleStack = () => {
			setStackExpanded(!state.stackExpanded);
			return state.stackExpanded;
		};
		toastApi.loadInspector = () => loadObjectInspector();
		toastApi.configure = (nextConfig = {}) => {
			const previousHostConfig = {
				useShadowRoot: state.config.useShadowRoot,
				shadowRootMode: state.config.shadowRootMode,
				fallbackToLightDom: state.config.fallbackToLightDom
			};
			const keys = Object.keys(DEFAULT_CONFIG);
			for (const key of keys) if (hasOwn(nextConfig, key)) state.config[key] = nextConfig[key];
			state.config.maxToasts = Math.max(1, Number(state.config.maxToasts) || DEFAULT_CONFIG.maxToasts);
			state.config.inspectDepth = Math.max(0, Number(state.config.inspectDepth) || 0);
			state.config.inspectItems = Math.max(0, Number(state.config.inspectItems) || 0);
			state.config.previewItems = Math.max(0, Number(state.config.previewItems) || 0);
			state.config.stackVisible = Math.min(3, Math.max(1, Number(state.config.stackVisible) || DEFAULT_CONFIG.stackVisible));
			state.config.stackMaxHeight = Math.max(180, Number(state.config.stackMaxHeight) || DEFAULT_CONFIG.stackMaxHeight);
			state.config.stackViewportRatio = clamp(Number(state.config.stackViewportRatio) || DEFAULT_CONFIG.stackViewportRatio, .2, .8);
			state.config.swipeThreshold = Math.max(24, Number(state.config.swipeThreshold) || DEFAULT_CONFIG.swipeThreshold);
			state.config.swipeVelocity = Math.max(.05, Number(state.config.swipeVelocity) || DEFAULT_CONFIG.swipeVelocity);
			state.config.objectInspectorLoadTimeout = Math.max(1e3, Number(state.config.objectInspectorLoadTimeout) || DEFAULT_CONFIG.objectInspectorLoadTimeout);
			state.config.virtualizeAfter = Math.max(1, Number(state.config.virtualizeAfter) || DEFAULT_CONFIG.virtualizeAfter);
			state.config.virtualRowHeight = Math.max(16, Number(state.config.virtualRowHeight) || DEFAULT_CONFIG.virtualRowHeight);
			state.config.virtualOverscan = Math.max(1, Number(state.config.virtualOverscan) || DEFAULT_CONFIG.virtualOverscan);
			state.config.virtualMaxHeight = Math.max(120, Number(state.config.virtualMaxHeight) || DEFAULT_CONFIG.virtualMaxHeight);
			state.config.theme = normalizeTheme(state.config.theme);
			state.config.position = ALLOWED_POSITIONS.has(state.config.position) ? state.config.position : DEFAULT_CONFIG.position;
			state.config.stacked = Boolean(state.config.stacked);
			state.config.stackToolbar = Boolean(state.config.stackToolbar);
			state.config.persistAcrossSpaNavigation = Boolean(state.config.persistAcrossSpaNavigation);
			state.config.minimizeOnSpaNavigation = Boolean(state.config.minimizeOnSpaNavigation);
			state.config.persistTasks = Boolean(state.config.persistTasks);
			state.config.restoreTasksOnLoad = Boolean(state.config.restoreTasksOnLoad);
			state.config.taskStorage = state.config.taskStorage === "localStorage" ? "localStorage" : "sessionStorage";
			state.config.taskStorageKey = String(state.config.taskStorageKey || DEFAULT_CONFIG.taskStorageKey);
			state.config.maxPersistedTasks = Math.max(1, Number(state.config.maxPersistedTasks) || DEFAULT_CONFIG.maxPersistedTasks);
			state.config.taskTerminalRetention = Number.isFinite(Number(state.config.taskTerminalRetention)) ? Math.max(0, Number(state.config.taskTerminalRetention)) : DEFAULT_CONFIG.taskTerminalRetention;
			state.config.successExitAnimation = Boolean(state.config.successExitAnimation);
			state.config.successCollapseDuration = Math.max(120, Number(state.config.successCollapseDuration) || DEFAULT_CONFIG.successCollapseDuration);
			state.config.successExitDuration = Math.max(80, Number(state.config.successExitDuration) || DEFAULT_CONFIG.successExitDuration);
			state.config.loadingDuration = Number.isFinite(Number(state.config.loadingDuration)) ? Number(state.config.loadingDuration) : DEFAULT_CONFIG.loadingDuration;
			state.config.loadingAnimation = normalizeLoadingAnimation(state.config.loadingAnimation);
			state.config.loadingIcon = state.config.loadingIcon === false ? false : hasOwn(SVG_ICONS, state.config.loadingIcon) ? state.config.loadingIcon : DEFAULT_CONFIG.loadingIcon;
			state.config.loadingSuccessDuration = Math.max(0, Number(state.config.loadingSuccessDuration) || DEFAULT_CONFIG.loadingSuccessDuration);
			state.config.loadingErrorDuration = Math.max(0, Number(state.config.loadingErrorDuration) || DEFAULT_CONFIG.loadingErrorDuration);
			state.config.loadingInfoDuration = Math.max(0, Number(state.config.loadingInfoDuration) || DEFAULT_CONFIG.loadingInfoDuration);
			state.config.loadingWarningDuration = Math.max(0, Number(state.config.loadingWarningDuration) || DEFAULT_CONFIG.loadingWarningDuration);
			state.config.coalescePersistent = Boolean(state.config.coalescePersistent);
			state.config.swipeToDismiss = Boolean(state.config.swipeToDismiss);
			state.config.virtualizeInspector = Boolean(state.config.virtualizeInspector);
			state.config.unmountInspectorOnCollapse = Boolean(state.config.unmountInspectorOnCollapse);
			state.config.useShadowRoot = Boolean(state.config.useShadowRoot);
			state.config.fallbackToLightDom = Boolean(state.config.fallbackToLightDom);
			state.config.shadowRootMode = state.config.shadowRootMode === "open" ? "open" : "closed";
			if (typeof state.config.shouldDebug !== "boolean" && typeof state.config.shouldDebug !== "function") state.config.shouldDebug = DEFAULT_CONFIG.shouldDebug;
			if (state.config.downloadFallback !== null && typeof state.config.downloadFallback !== "function") state.config.downloadFallback = DEFAULT_CONFIG.downloadFallback;
			if (state.config.objectInspectorSrc !== null && typeof state.config.objectInspectorSrc !== "string") state.config.objectInspectorSrc = DEFAULT_CONFIG.objectInspectorSrc;
			if (!state.config.persistAcrossSpaNavigation) state.spaCleanup?.();
			else if (state.hostWindow && state.hostDocument) installSpaPersistence(state.hostWindow, state.hostDocument);
			if ((previousHostConfig.useShadowRoot !== state.config.useShadowRoot || previousHostConfig.shadowRootMode !== state.config.shadowRootMode || previousHostConfig.fallbackToLightDom !== state.config.fallbackToLightDom) && state.hostElement) {
				destroyHost({ keepPersistence: state.config.persistAcrossSpaNavigation });
				ensureHost();
			}
			while (state.toasts.length > state.config.maxToasts) state.toasts[0]?.dismiss(true, null, "limit");
			installThemeObserver();
			syncTheme();
			if (state.container) {
				state.container.dataset.position = state.config.position;
				syncStackLayout();
			}
			return {
				...state.config,
				resolvedTheme: state.resolvedTheme
			};
		};
		toastApi.setTheme = (theme) => {
			const previousTheme = state.config.theme;
			const previousResolvedTheme = state.resolvedTheme;
			state.config.theme = normalizeTheme(theme);
			installThemeObserver();
			syncTheme();
			emitEvent("theme:change", {
				previousTheme,
				previousResolvedTheme,
				theme: state.config.theme,
				resolvedTheme: state.resolvedTheme
			});
			return state.resolvedTheme;
		};
		toastApi.getTheme = () => ({
			theme: state.config.theme,
			resolvedTheme: state.resolvedTheme
		});
		toastApi.toggleTheme = () => toastApi.setTheme(state.resolvedTheme === "dark" ? "light" : "dark");
		toastApi.getConfig = () => ({
			...state.config,
			resolvedTheme: state.resolvedTheme
		});
		toastApi.getHostMode = () => state.hostMode;
		toastApi.repairHost = () => {
			scheduleHostRepair();
			return state.hostElement;
		};
		Object.defineProperty(toastApi, "version", {
			value: VERSION,
			enumerable: true
		});
		Object.defineProperty(toastApi, "objectInspector", {
			configurable: true,
			enumerable: true,
			get: () => getObjectInspectorApi()
		});
		state.api = toastApi;
		try {
			Object.defineProperty(typedInitialHostWindow, TOAST_GLOBAL, {
				value: toastApi,
				configurable: true,
				writable: true
			});
		} catch {
			typedInitialHostWindow[TOAST_GLOBAL] = toastApi;
		}
		typedGlobalWindow[TOAST_GLOBAL] = toastApi;
		typedGlobalWindow.toast = toastApi;
		globalThis.RodToaster = toastApi;
		if (state.config.restoreTasksOnLoad) (initialHostWindow.setTimeout ?? globalWindow.setTimeout)(() => {
			safeCall(() => restorePersistedTasks(), []);
		}, 0);
	})(window);

//#endregion
//#region \0rod-iife-entry:browser:/home/runner/work/rodkisten.github.io/rodkisten.github.io/toaster/toaster.ts
	const __globalName = "RodToaster";
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
	const __hasExports = Object.keys(toaster_exports).length > 0;
	const __value = Object.prototype.hasOwnProperty.call(toaster_exports, "default") ? void 0 : Object.prototype.hasOwnProperty.call(toaster_exports, __globalName) ? toaster_exports[__globalName] : __hasExports ? toaster_exports : __existing;
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
