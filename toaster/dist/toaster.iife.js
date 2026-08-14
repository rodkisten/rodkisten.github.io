/* Auto-generated from toaster/toaster.ts. at 8/14/2026, 3:04:20 PM Do not edit directly. */
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
	var toaster_exports = /* @__PURE__ */ __exportAll({ default: () => toaster_default });
	(function installRodToaster(globalWindow) {
		"use strict";
		const VERSION = "4.8.1";
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
		const THEME_TOAST_COLORS = {
			dark: TOAST_COLORS,
			light: Object.fromEntries(Object.keys(TOAST_COLORS).map((type) => [type, {
				...TOAST_COLORS[type],
				...LIGHT_TOAST_COLORS[type]
			}]))
		};
		const SVG_TEMPLATE_CACHE = /* @__PURE__ */ new WeakMap();
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
			image: `<rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="8.5" cy="9" r="1.5"></circle><path d="m21 15-5-5L5 20"></path>`,
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
			size: "compact",
			stacked: true,
			stackVisible: 3,
			stackMaxHeight: 520,
			stackViewportRatio: .48,
			stackAutoCollapseThreshold: 6,
			stackToolbar: true,
			persistAcrossSpaNavigation: true,
			minimizeOnSpaNavigation: true,
			useTopLayer: true,
			idleHostTtl: 0,
			persistTasks: false,
			taskProgressPersistInterval: 900,
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
			"lane",
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
			"loadingAnimation",
			"progress",
			"progressLabel",
			"dismissible",
			"actions",
			"scope",
			"metadata",
			"details",
			"detailsLabel",
			"onDismiss",
			"checkbox",
			"countdown",
			"shortcuts",
			"dismissValue",
			"returnMeta",
			"validation",
			"validationMessage",
			"rejectOnActionError",
			"copyError",
			"copyLabel",
			"error",
			"inputLabel",
			"inputType",
			"value",
			"placeholder",
			"autocomplete",
			"spellcheck",
			"minLength",
			"maxLength",
			"required",
			"requiredMessage",
			"multiline",
			"cancelLabel",
			"confirmLabel",
			"multiple",
			"options",
			"actionLabel",
			"actionIcon",
			"variant",
			"loadingLabel",
			"successLabel",
			"undo"
		]);
		const LOADING_DESCRIPTOR_KEYS = OPTION_KEYS;
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
		const ALLOWED_SIZES = /* @__PURE__ */ new Set([
			"compact",
			"comfortable",
			"large"
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
		function isImageElement(value) {
			return isElementLike(value) && String(value.tagName).toUpperCase() === "IMG";
		}
		function isUrlObject(value) {
			return isObject(value) && typeof value.href === "string" && safeCall(() => Object.prototype.toString.call(value) === "[object URL]", false);
		}
		function isToastImageIconDescriptor(value) {
			return isPlainObject(value) && (typeof value.src === "string" || isUrlObject(value.src));
		}
		function looksLikeImageSource(value) {
			const source = value.trim();
			if (!source) return false;
			return /^(?:https?:|blob:|data:image\/|file:)/i.test(source) || /^(?:\/|\.\.?\/)/.test(source) || /\.(?:avif|bmp|gif|heic|heif|ico|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(source);
		}
		function isUnknownRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		function isPlainObject(value) {
			if (!isUnknownRecord(value)) return false;
			const prototype = safeCall(() => Object.getPrototypeOf(value), null);
			return prototype === Object.prototype || prototype === null;
		}
		function isBlobLike(value) {
			if (!isObject(value)) return false;
			const tag = safeCall(() => Object.prototype.toString.call(value), "");
			return tag === "[object Blob]" || tag === "[object File]";
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
		function normalizeToastSize(value) {
			return typeof value === "string" && ALLOWED_SIZES.has(value) ? value : "compact";
		}
		function normalizeTaskStatus(value) {
			return typeof value === "string" && ALLOWED_TASK_STATUSES.has(value) ? value : "queued";
		}
		function normalizeImageIconDescriptor(value) {
			if (isImageElement(value)) return {
				src: value.currentSrc || value.src,
				alt: value.alt,
				fit: value.style.objectFit === "contain" ? "contain" : "cover",
				objectPosition: value.style.objectPosition || "center",
				crossOrigin: value.crossOrigin === "anonymous" || value.crossOrigin === "use-credentials" ? value.crossOrigin : void 0,
				referrerPolicy: value.referrerPolicy || void 0,
				decoding: value.decoding || "async",
				loading: value.loading || "eager"
			};
			if (typeof value === "string" || isUrlObject(value)) return { src: typeof value === "string" ? value : value.href };
			return {
				...value,
				src: isUrlObject(value.src) ? value.src.href : String(value.src),
				fit: value.fit === "contain" ? "contain" : "cover",
				objectPosition: value.objectPosition || "center"
			};
		}
		function getImageIconDescriptor(value) {
			if (isImageElement(value)) return normalizeImageIconDescriptor(value);
			if (isToastImageIconDescriptor(value)) return normalizeImageIconDescriptor(value);
			if (isUrlObject(value)) return normalizeImageIconDescriptor(value);
			if (typeof value === "string" && !hasOwn(SVG_ICONS, value) && looksLikeImageSource(value)) return normalizeImageIconDescriptor(value);
			return null;
		}
		function normalizeTaskIcon(value, fallback) {
			if (value === false) return false;
			if (isUrlObject(value)) return value.href;
			if (isToastImageIconDescriptor(value)) return normalizeImageIconDescriptor(value);
			if (typeof value === "string") return value;
			return fallback;
		}
		function iconKeyHash(value) {
			let hash = 2166136261;
			for (let index = 0; index < value.length; index += 1) {
				hash ^= value.charCodeAt(index);
				hash = Math.imul(hash, 16777619);
			}
			return (hash >>> 0).toString(36);
		}
		function createImageIcon(documentRef, descriptor) {
			const normalized = normalizeImageIconDescriptor(descriptor);
			const image = documentRef.createElement("img");
			image.className = "rod-toast__icon-image";
			image.alt = normalized.alt ?? "";
			image.draggable = false;
			image.decoding = normalized.decoding ?? "async";
			image.loading = normalized.loading ?? "eager";
			image.style.objectFit = normalized.fit === "contain" ? "contain" : "cover";
			image.style.objectPosition = normalized.objectPosition || "center";
			if (normalized.crossOrigin === "" || normalized.crossOrigin === "anonymous" || normalized.crossOrigin === "use-credentials") image.crossOrigin = normalized.crossOrigin;
			if (normalized.referrerPolicy) image.referrerPolicy = normalized.referrerPolicy;
			image.src = String(normalized.src);
			return image;
		}
		function createSvgIcon(documentRef, name, size = 18) {
			const iconName = hasOwn(SVG_ICONS, name) ? name : "circle";
			const normalizedSize = Math.max(1, Math.round(Number(size) || 18));
			const cacheKey = `${iconName}:${normalizedSize}`;
			let documentCache = SVG_TEMPLATE_CACHE.get(documentRef);
			if (!documentCache) {
				documentCache = /* @__PURE__ */ new Map();
				SVG_TEMPLATE_CACHE.set(documentRef, documentCache);
			}
			let template = documentCache.get(cacheKey);
			if (!template) {
				template = documentRef.createElementNS("http://www.w3.org/2000/svg", "svg");
				template.setAttribute("viewBox", "0 0 24 24");
				template.setAttribute("width", String(normalizedSize));
				template.setAttribute("height", String(normalizedSize));
				template.setAttribute("fill", "none");
				template.setAttribute("stroke", "currentColor");
				template.setAttribute("stroke-width", "2");
				template.setAttribute("stroke-linecap", "round");
				template.setAttribute("stroke-linejoin", "round");
				template.setAttribute("aria-hidden", "true");
				template.setAttribute("focusable", "false");
				template.innerHTML = SVG_ICONS[iconName];
				documentCache.set(cacheKey, template);
			}
			return template.cloneNode(true);
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
		const previousRodToaster = safeCall(() => typedInitialHostWindow[TOAST_GLOBAL] ?? null, null);
		const previousToastGlobal = safeCall(() => typedInitialHostWindow.toast ?? null, null);
		const existingToaster = safeCall(() => typedInitialHostWindow[TOAST_GLOBAL] ?? typedGlobalWindow[TOAST_GLOBAL] ?? null, null);
		function isValidToaster(value) {
			if (typeof value !== "function") return false;
			const candidate = value;
			return typeof candidate.loading === "function" && typeof candidate.success === "function" && typeof candidate.error === "function" && typeof candidate.confirm === "function" && typeof candidate.picker === "function" && typeof candidate.multiLoading === "function" && typeof candidate.bringToFront === "function" && typeof candidate.destroy === "function";
		}
		function compareVersions(left, right) {
			const parse = (value) => String(value ?? "").trim().split(/[.+-]/, 1)[0].split(".").slice(0, 4).map((part) => {
				const numeric = Number.parseInt(part, 10);
				return Number.isFinite(numeric) ? numeric : 0;
			});
			const leftParts = parse(left);
			const rightParts = parse(right);
			const length = Math.max(leftParts.length, rightParts.length, 3);
			for (let index = 0; index < length; index += 1) {
				const leftPart = leftParts[index] ?? 0;
				const rightPart = rightParts[index] ?? 0;
				if (leftPart > rightPart) return 1;
				if (leftPart < rightPart) return -1;
			}
			return 0;
		}
		function canReuseToaster(value) {
			return isValidToaster(value) && compareVersions(value.version, VERSION) >= 0;
		}
		const existingState = safeCall(() => typedInitialHostWindow[STATE_SYMBOL] ?? null, null);
		if (canReuseToaster(existingToaster)) {
			typedGlobalWindow[TOAST_GLOBAL] = existingToaster;
			typedGlobalWindow.toast = existingToaster;
			return;
		}
		if (canReuseToaster(existingState?.api)) {
			typedGlobalWindow[TOAST_GLOBAL] = existingState.api;
			typedGlobalWindow.toast = existingState.api;
			return;
		}
		function teardownLegacyRuntime(candidate) {
			if (!candidate || typeof candidate !== "object") return;
			const legacy = candidate;
			const legacyApi = legacy.api;
			if (typeof legacyApi?.destroy === "function") {
				safeCall(() => legacyApi.destroy?.("upgrade"), void 0);
				return;
			}
			safeCall(() => legacy.spaCleanup?.(), void 0);
			safeCall(() => legacy.historyRestore?.(), void 0);
			safeCall(() => legacy.themeCleanup?.(), void 0);
			safeCall(() => legacy.topLayerCleanup?.(), void 0);
			safeCall(() => legacy.spaObserver?.disconnect(), void 0);
			safeCall(() => legacy.topLayerObserver?.disconnect(), void 0);
			if (legacy.taskPersistTimer != null) safeCall(() => (legacy.hostWindow ?? initialHostWindow).clearTimeout(legacy.taskPersistTimer), void 0);
			safeCall(() => legacy.hostElement?.remove(), void 0);
		}
		const staleExistingToaster = existingToaster;
		const staleStateApi = safeCall(() => existingState?.api ?? null, null);
		if (isValidToaster(staleExistingToaster) && staleExistingToaster !== staleStateApi && compareVersions(staleExistingToaster.version, VERSION) < 0) safeCall(() => staleExistingToaster.destroy("upgrade"), void 0);
		teardownLegacyRuntime(existingState);
		safeCall(() => initialHostWindow.document.getElementById(TOAST_HOST_ID)?.remove(), void 0);
		safeCall(() => {
			delete typedInitialHostWindow[STATE_SYMBOL];
		}, void 0);
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
			recordsByNode: /* @__PURE__ */ new WeakMap(),
			dedupeRecords: /* @__PURE__ */ new Map(),
			objectIds: /* @__PURE__ */ new WeakMap(),
			nextObjectId: 1,
			activeLoadingCount: 0,
			stackExpanded: false,
			managerMinimized: false,
			resolvedTheme: "dark",
			themeMediaQuery: null,
			themeCleanup: null,
			managerNode: null,
			list: null,
			interactionList: null,
			toolbar: null,
			stackCountNode: null,
			managerCountNode: null,
			listeners: /* @__PURE__ */ new Map(),
			tasks: /* @__PURE__ */ new Map(),
			groups: /* @__PURE__ */ new Map(),
			dialogStack: [],
			failedImageKeys: /* @__PURE__ */ new Set(),
			restoredTasks: false,
			outsidePointerDownHandler: null,
			inspectorPromise: null,
			inspectorApi: null,
			inspectorRuntime: null,
			inspectorStyle: null,
			spaObserver: null,
			spaCleanup: null,
			hostRepairFrame: null,
			historyRestore: null,
			topLayerActive: false,
			topLayerObserver: null,
			topLayerCleanup: null,
			taskPersistTimer: null,
			taskPersistLastAt: 0,
			idleDestroyTimer: null,
			destroying: false
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
      ${hostMode === "shadow" ? `:host {
          all: initial;
          position: fixed !important;
          inset: 0 !important;
          width: 0 !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          overflow: visible !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: ${MAX_Z_INDEX} !important;
          isolation: isolate !important;
          pointer-events: none !important;
          color-scheme: dark;
        }` : `#${TOAST_HOST_ID} {
          all: initial !important;
          position: fixed !important;
          inset: 0 !important;
          width: 0 !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          overflow: visible !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: ${MAX_Z_INDEX} !important;
          isolation: isolate !important;
          pointer-events: none !important;
          color-scheme: dark;
        }`}
      ${hostMode === "shadow" ? `
          *,
          *::before,
          *::after {
            box-sizing: border-box;
          }
        ` : `
          #${TOAST_HOST_ID} *,
          #${TOAST_HOST_ID} *::before,
          #${TOAST_HOST_ID} *::after {
            box-sizing: border-box;
          }
        `}
      ${hostMode === "shadow" ? `
          button,
          input,
          textarea,
          select {
            font: inherit;
          }
        ` : `
          #${TOAST_HOST_ID} button,
          #${TOAST_HOST_ID} input,
          #${TOAST_HOST_ID} textarea,
          #${TOAST_HOST_ID} select {
            font: inherit;
          }
        `}
      .rod-toast-stack {
        --rod-surface: rgba(23, 23, 23, .985);
        --rod-surface-raised: rgba(28, 28, 29, .992);
        --rod-border: rgba(255, 255, 255, .105);
        --rod-border-strong: rgba(255, 255, 255, .18);
        --rod-text: rgba(232, 232, 232, .96);
        --rod-text-strong: rgba(255, 255, 255, .985);
        --rod-muted: rgba(163, 163, 163, .9);
        --rod-muted-soft: rgba(132, 132, 137, .84);
        --rod-hover: rgba(255, 255, 255, .07);
        --rod-overlay: rgba(255, 255, 255, .05);
        --rod-focus: rgba(255, 255, 255, .34);
        --rod-toast-stack-max-height: 660px;
        --rod-toast-stack-max-viewport: 62dvh;
        --rod-toast-width: min(580px, calc(100vw - 28px));
        --rod-shadow: 0 1px 0 rgba(255, 255, 255, .055) inset, 0 2px 3px rgba(0, 0, 0, .2), 0 18px 46px rgba(0, 0, 0, .38);
        --rod-shadow-raised: 0 1px 0 rgba(255, 255, 255, .07) inset, 0 4px 8px rgba(0, 0, 0, .22), 0 28px 66px rgba(0, 0, 0, .46);
        --rod-ease-spring: cubic-bezier(.16, 1, .3, 1);
        --rod-ease-soft: cubic-bezier(.22, .61, .36, 1);
        position: fixed;
        z-index: ${MAX_Z_INDEX};
        isolation: isolate;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 11px;
        pointer-events: none;
        color: var(--rod-text);
        color-scheme: dark;
        font: 440 var(--rod-toaster-font-size, 15px)/var(--rod-toaster-line-height, 1.48) Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .rod-toast-stack[data-theme="light"] {
        --rod-surface: rgba(255, 255, 255, .985);
        --rod-surface-raised: rgba(255, 255, 255, .998);
        --rod-border: rgba(24, 24, 27, .105);
        --rod-border-strong: rgba(24, 24, 27, .17);
        --rod-text: rgba(39, 39, 42, .94);
        --rod-text-strong: rgba(9, 9, 11, .98);
        --rod-muted: rgba(82, 82, 91, .82);
        --rod-muted-soft: rgba(113, 113, 122, .78);
        --rod-hover: rgba(24, 24, 27, .065);
        --rod-overlay: rgba(24, 24, 27, .045);
        --rod-focus: rgba(24, 24, 27, .32);
        --rod-shadow: 0 1px 0 rgba(255, 255, 255, .96) inset, 0 1px 3px rgba(15, 23, 42, .08), 0 18px 48px rgba(15, 23, 42, .15);
        --rod-shadow-raised: 0 1px 0 rgba(255, 255, 255, 1) inset, 0 3px 8px rgba(15, 23, 42, .09), 0 28px 64px rgba(15, 23, 42, .18);
        color-scheme: light;
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

      .rod-toast-stack[data-position$="left"] {
        align-items: flex-start;
      }

      .rod-toast-stack[data-position$="right"] {
        align-items: flex-end;
      }

      .rod-toast-stack__list,
      .rod-toast-stack__toolbar,
      .rod-toast-stack__interactions {
        width: var(--rod-toast-width);
      }

      .rod-toast-stack__interactions {
        position: relative;
        z-index: 4;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 11px;
        min-width: 0;
        pointer-events: none;
      }

      .rod-toast-stack__interactions:empty {
        display: none;
      }

      .rod-toast-stack__interactions .rod-toast {
        pointer-events: auto;
      }

      .rod-toast-stack__interactions .rod-toast[data-dialog-active="false"] {
        display: none!important;
      }

      .rod-toast-stack[data-has-interaction="true"] .rod-toast-stack__manager,
      .rod-toast-stack[data-has-interaction="true"] .rod-toast-stack__toolbar,
      .rod-toast-stack[data-has-interaction="true"] .rod-toast-stack__list {
        visibility: hidden;
        pointer-events: none!important;
      }

      .rod-toast-stack__manager {
        appearance: none;
        position: relative;
        display: none;
        place-items: center;
        align-self: center;
        width: 50px;
        height: 50px;
        padding: 0;
        border: 1px solid var(--rod-border);
        border-radius: 999px;
        outline: 0;
        background: var(--rod-surface);
        color: var(--rod-text-strong);
        box-shadow: var(--rod-shadow-raised);
        pointer-events: auto;
        touch-action: manipulation;
        cursor: pointer;
        animation: rod-toast-manager-enter 480ms var(--rod-ease-spring) both;
        transition: transform 300ms var(--rod-ease-spring), background-color 180ms, border-color 180ms;
      }

      .rod-toast-stack__manager:hover,
      .rod-toast-stack__manager:focus-visible {
        border-color: var(--rod-border-strong);
        background: var(--rod-surface-raised);
        transform: translateY(-2px) scale(1.04);
      }

      .rod-toast-stack__manager svg {
        width: 19px;
        height: 19px;
        animation: rod-toast-spinner 850ms linear infinite;
      }

      .rod-toast-stack__manager-count {
        position: absolute;
        top: -4px;
        right: -5px;
        display: none;
        min-width: 19px;
        height: 19px;
        padding: 0 5px;
        border: 2px solid var(--rod-surface);
        border-radius: 999px;
        background: var(--rod-text-strong);
        color: var(--rod-surface);
        font: 750 9px/15px system-ui, sans-serif;
        text-align: center;
      }

      .rod-toast-stack__manager-count[data-visible="true"] {
        display: block;
      }

      .rod-toast-stack[data-manager-minimized="true"] .rod-toast-stack__manager {
        display: grid;
      }

      .rod-toast-stack[data-manager-minimized="true"] .rod-toast-stack__toolbar,
      .rod-toast-stack[data-manager-minimized="true"] .rod-toast-stack__list {
        display: none!important;
      }

      .rod-toast-stack__toolbar {
        display: none;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 48px;
        padding: 7px 8px 7px 16px;
        border: 1px solid var(--rod-border);
        border-radius: 16px;
        background: var(--rod-surface);
        box-shadow: var(--rod-shadow);
        pointer-events: auto;
        user-select: none;
        animation: rod-toast-toolbar-enter 360ms var(--rod-ease-spring) both;
      }

      .rod-toast-stack[data-expanded="true"][data-has-many="true"] .rod-toast-stack__toolbar[data-enabled="true"] {
        display: flex;
      }

      .rod-toast-stack__toolbar-label {
        min-width: 0;
        overflow: hidden;
        color: var(--rod-muted);
        font: 650 12px/1.2 system-ui, sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rod-toast-stack__toolbar-actions {
        display: flex;
        gap: 4px;
      }

      .rod-toast-stack__toolbar-button,
      .rod-toast__close,
      .rod-toast__expand,
      .rod-toast__minimize {
        appearance: none;
        border: 1px solid transparent;
        outline: 0;
        background: transparent;
        color: inherit;
        touch-action: manipulation;
        cursor: pointer;
      }

      .rod-toast-stack__toolbar-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 34px;
        padding: 0 11px;
        border-radius: 10px;
        color: var(--rod-muted);
        font: 650 11px/1 system-ui, sans-serif;
        transition: transform 160ms var(--rod-ease-spring), background-color 140ms, border-color 140ms, color 140ms;
      }

      .rod-toast-stack__toolbar-button:hover,
      .rod-toast-stack__toolbar-button:focus-visible {
        border-color: var(--rod-border);
        background: var(--rod-hover);
        color: var(--rod-text-strong);
        transform: translateY(-1px);
      }

      .rod-toast-stack__list {
        position: relative;
        isolation: isolate;
        display: flex;
        flex-direction: column;
        gap: 11px;
        min-width: 0;
        overflow: visible;
        pointer-events: none;
        overscroll-behavior: contain;
        scrollbar-width: thin;
      }

      .rod-toast-stack[data-position^="bottom"] .rod-toast-stack__list {
        flex-direction: column-reverse;
      }

      .rod-toast-stack__list::before,
      .rod-toast-stack__list::after {
        content: "";
        position: absolute;
        inset: 0;
        border: 1px solid var(--rod-border);
        border-radius: 22px;
        background: var(--rod-surface);
        box-shadow: var(--rod-shadow);
        opacity: 0;
        transform-origin: top center;
        pointer-events: none;
        transition: opacity 240ms, transform 480ms var(--rod-ease-spring);
      }

      .rod-toast-stack__list::before {
        z-index: -1;
      }

      .rod-toast-stack__list::after {
        z-index: -2;
      }

      .rod-toast-stack[data-expanded="false"][data-stack-depth="2"] .rod-toast-stack__list::before,
      .rod-toast-stack[data-expanded="false"][data-stack-depth="3"] .rod-toast-stack__list::before {
        opacity: .94;
        transform: translateY(12px) scaleX(.95);
      }

      .rod-toast-stack[data-expanded="false"][data-stack-depth="3"] .rod-toast-stack__list::after {
        opacity: .76;
        transform: translateY(22px) scaleX(.89);
      }

      .rod-toast-stack[data-expanded="true"] .rod-toast-stack__list {
        max-height: min(var(--rod-toast-stack-max-height), var(--rod-toast-stack-max-viewport), 50dvh);
        overflow-x: hidden;
        overflow-y: auto;
        padding: 2px 4px 8px 2px;
        pointer-events: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-gutter: stable;
      }

      .rod-toast-stack[data-expanded="false"] .rod-toast {
        display: none;
      }

      .rod-toast-stack[data-expanded="false"] .rod-toast[data-stack-index="0"] {
        display: grid;
        cursor: grab;
      }

      .rod-toast {
        --rod-toast-bg: var(--rod-surface);
        --rod-toast-border: var(--rod-border);
        --rod-toast-text: var(--rod-text);
        --rod-toast-accent: rgba(244, 244, 245, .76);
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 15px;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        min-height: 78px;
        max-height: min(72dvh, 760px);
        overflow: auto;
        padding: 17px 14px 17px 18px;
        border: 1px solid var(--rod-toast-border);
        border-radius: var(--rod-toaster-border-radius, 22px);
        background: var(--rod-toast-bg);
        color: var(--rod-toast-text);
        box-shadow: var(--rod-shadow);
        opacity: 0;
        transform: translate3d(0, -14px, 0) scale(.975);
        transform-origin: top center;
        transition: opacity 180ms, transform 260ms var(--rod-ease-spring), border-color 140ms, background-color 140ms;
        pointer-events: auto;
        touch-action: none;
        user-select: text;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        contain: layout paint style;
      }

      .rod-toast-stack[data-position^="bottom"] .rod-toast {
        transform: translate3d(0, 14px, 0) scale(.975);
        transform-origin: bottom center;
      }

      .rod-toast::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(118deg, rgba(255, 255, 255, .035), transparent 34%, transparent 74%, rgba(255, 255, 255, .012));
        pointer-events: none;
      }

      .rod-toast[data-visible="true"] {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }

      .rod-toast:hover {
        border-color: var(--rod-border-strong);
      }

      .rod-toast-stack[data-theme="light"] .rod-toast {
        background: var(--rod-toast-bg);
      }

      .rod-toast-stack[data-expanded="true"][data-has-many="true"] .rod-toast[data-item-expanded="false"] {
        max-height: 64px;
        min-height: 64px;
        overflow: hidden;
        cursor: pointer;
      }

      .rod-toast-stack[data-expanded="true"][data-has-many="true"] .rod-toast[data-item-expanded="false"] .rod-toast__content {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rod-toast-stack[data-expanded="true"][data-has-many="true"] .rod-toast[data-item-expanded="true"] {
        max-height: min(68dvh, 720px);
        overflow: auto;
        border-color: var(--rod-border-strong);
        background: var(--rod-surface-raised);
        box-shadow: var(--rod-shadow-raised);
      }

      .rod-toast__icon {
        position: relative;
        display: grid;
        place-items: center;
        width: 26px;
        min-width: 26px;
        height: 26px;
        aspect-ratio: 1/1;
        color: var(--rod-toast-accent);
        user-select: none;
        transition: color 180ms, transform 420ms var(--rod-ease-spring);
      }

      .rod-toast__icon svg {
        width: 22px;
        height: 22px;
        overflow: visible;
      }

      .rod-toast__icon-image {
        display: block;
        width: 100%!important;
        height: 100%!important;
        min-width: 100%;
        max-width: none!important;
        aspect-ratio: 1/1;
        border-radius: 7px;
        background: var(--rod-overlay);
        object-fit: cover;
        object-position: center;
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
      }

      .rod-toast__icon[data-rod-icon-kind="image"] {
        isolation: isolate;
      }

      .rod-toast[data-visible="true"] .rod-toast__icon {
        animation: rod-toast-icon-enter 520ms 90ms var(--rod-ease-spring) both;
      }

      .rod-toast__content {
        position: relative;
        z-index: 1;
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 4px 8px;
        min-width: 0;
        color: inherit;
        font-size: 15px;
        letter-spacing: -.012em;
        line-height: 1.5;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .rod-toast__arg {
        min-width: 0;
        max-width: 100%;
      }

      .rod-toast__actions {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        gap: 4px;
        margin: 0;
      }

      .rod-toast__count {
        display: none;
        min-width: 27px;
        height: 27px;
        padding: 0 7px;
        border: 1px solid var(--rod-border);
        border-radius: 999px;
        background: var(--rod-overlay);
        color: var(--rod-muted);
        font: 700 10px/25px system-ui, sans-serif;
        text-align: center;
      }

      .rod-toast__count[data-visible="true"] {
        display: block;
      }

      .rod-toast__close,
      .rod-toast__expand,
      .rod-toast__minimize {
        display: grid;
        place-items: center;
        width: 38px;
        min-width: 38px;
        height: 38px;
        padding: 0;
        border-radius: 12px;
        color: var(--rod-muted);
        transition: transform 160ms var(--rod-ease-spring), background-color 140ms, border-color 140ms, color 140ms;
      }

      .rod-toast__close:hover,
      .rod-toast__expand:hover,
      .rod-toast__minimize:hover,
      .rod-toast__close:focus-visible,
      .rod-toast__expand:focus-visible,
      .rod-toast__minimize:focus-visible {
        border-color: var(--rod-border);
        background: var(--rod-hover);
        color: var(--rod-text-strong);
        transform: scale(1.04);
      }

      .rod-toast__expand,
      .rod-toast__minimize {
        display: none;
      }

      .rod-toast[data-loading="true"] .rod-toast__minimize,
      .rod-toast-stack[data-expanded="true"][data-has-many="true"] .rod-toast__expand {
        display: grid;
      }

      .rod-toast[data-item-expanded="true"] .rod-toast__expand svg {
        transform: rotate(180deg);
      }

      .rod-token--null {
        color: rgb(216, 180, 254);
      }

      .rod-token--undefined,
      .rod-token--meta {
        color: rgb(212, 212, 216);
      }

      .rod-token--string {
        color: rgb(253, 186, 116);
      }

      .rod-token--number {
        color: rgb(190, 242, 100);
      }

      .rod-token--boolean {
        color: rgb(147, 197, 253);
        font-weight: 600;
      }

      .rod-token--symbol {
        color: rgb(94, 234, 212);
      }

      .rod-token--function {
        color: rgb(253, 224, 71);
      }

      .rod-toast__inspector-placeholder {
        color: var(--rod-muted);
        font-style: italic;
      }

      .rod-toast__loading-copy,
      .rod-toast__confirm-copy,
      .rod-toast__rich-copy,
      .rod-toast__interactive-copy {
        display: grid;
        gap: 6px;
        min-width: 0;
        width: 100%;
      }

      .rod-toast__loading-title,
      .rod-toast__confirm-title,
      .rod-toast__rich-title,
      .rod-toast__interactive-title {
        color: var(--rod-text-strong);
        font: 680 15px/1.34 Inter, system-ui, sans-serif;
        letter-spacing: -.02em;
      }

      .rod-toast__loading-description,
      .rod-toast__confirm-description,
      .rod-toast__rich-description,
      .rod-toast__interactive-description {
        color: var(--rod-muted);
        font: 430 13px/1.5 Inter, system-ui, sans-serif;
        letter-spacing: -.01em;
      }

      .rod-toast[data-loading="true"][data-loading-icon="false"] {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .rod-toast[data-loading="true"][data-loading-icon="false"] .rod-toast__icon {
        display: none;
      }

      .rod-toast[data-loading="true"][data-loading-content-empty="true"] {
        grid-template-columns: auto auto;
        justify-content: center;
        width: fit-content;
        min-width: 0;
        max-width: min(100%, 280px);
        margin-inline: auto;
      }

      .rod-toast[data-loading="true"][data-loading-content-empty="true"] .rod-toast__content {
        display: none;
      }

      .rod-toast__progress {
        display: grid;
        gap: 7px;
        width: 100%;
        margin-top: 8px;
      }

      .rod-toast__progress-meta {
        display: flex;
        justify-content: flex-end;
        min-height: 14px;
        color: var(--rod-muted-soft);
        font: 650 10px/1 system-ui, sans-serif;
      }

      .rod-toast__progress-track {
        position: relative;
        width: 100%;
        height: 4px;
        overflow: hidden;
        border-radius: 999px;
        background: var(--rod-overlay);
      }

      .rod-toast__progress-bar {
        position: absolute;
        inset: 0 auto 0 0;
        width: var(--rod-loading-progress, 0%);
        border-radius: inherit;
        background: linear-gradient(90deg, color-mix(in srgb, var(--rod-toast-accent) 84%, transparent), var(--rod-toast-accent));
        transition: width 420ms var(--rod-ease-soft);
      }

      .rod-toast:not([data-loading-animation="progress"]) .rod-toast__progress {
        display: none;
      }

      .rod-toast[data-loading-indeterminate="true"] .rod-toast__progress-bar {
        width: 38%;
        animation: rod-toast-progress-indeterminate 1.1s cubic-bezier(.4, 0, .2, 1) infinite;
      }

      .rod-toast[data-loading-state="loading"][data-loading-spinner="true"] {
        animation: rod-toast-spinner 850ms linear infinite;
      }

      .rod-toast[data-loading-state="loading"] .rod-toast__icon[data-rod-icon-kind="image"][data-loading-spinner="true"] {
        animation: none;
      }

      .rod-toast[data-loading-state="loading"] .rod-toast__icon[data-rod-icon-kind="image"][data-loading-spinner="true"]::after {
        content: "";
        position: absolute;
        z-index: 2;
        right: -4px;
        bottom: -4px;
        width: 12px;
        height: 12px;
        border: 2px solid var(--rod-surface);
        border-top-color: var(--rod-toast-accent);
        border-radius: 999px;
        background: var(--rod-surface);
        box-shadow: 0 1px 4px rgba(0, 0, 0, .28);
        animation: rod-toast-spinner 700ms linear infinite;
      }

      .rod-toast[data-loading-state="loading"][data-loading-pulse="true"] {
        animation: rod-toast-pulse 1.35s cubic-bezier(.4, 0, .6, 1) infinite;
      }

      .rod-toast[data-confirm="true"],
      .rod-toast[data-rich="true"],
      .rod-toast[data-interactive="true"] {
        min-width: min(470px, calc(100vw - 28px));
        max-width: min(620px, calc(100vw - 28px));
        padding-block: 19px;
        touch-action: pan-y;
      }

      .rod-toast[data-confirm="true"] .rod-toast__content,
      .rod-toast[data-rich="true"] .rod-toast__content,
      .rod-toast[data-interactive="true"] .rod-toast__content {
        display: block;
        width: 100%;
      }

      .rod-toast[data-confirm="true"] .rod-toast__minimize,
      .rod-toast[data-rich="true"] .rod-toast__minimize,
      .rod-toast[data-interactive="true"] .rod-toast__minimize,
      .rod-toast[data-confirm="true"] .rod-toast__expand,
      .rod-toast[data-rich="true"] .rod-toast__expand,
      .rod-toast[data-interactive="true"] .rod-toast__expand {
        display: none!important;
      }

      .rod-toast__confirm,
      .rod-toast__rich,
      .rod-toast__interactive {
        display: grid;
        gap: 17px;
        width: 100%;
        min-width: 0;
      }

      .rod-toast__interactive-body {
        min-width: 0;
        min-height: 0;
      }

      .rod-toast__confirm-actions,
      .rod-toast__action-bar,
      .rod-toast__task-actions {
        display: flex;
        flex-flow: row wrap;
        align-items: stretch;
        justify-content: flex-end;
        gap: 9px;
        width: 100%;
        container-type: inline-size;
      }

      .rod-toast__confirm-actions::-webkit-scrollbar {
        display: none;
      }

      .rod-toast__confirm-button,
      .rod-toast__action-button,
      .rod-toast__task-button {
        appearance: none;
        display: inline-flex;
        flex: 1 1 max-content;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-width: min(100%, 108px);
        max-width: 100%;
        min-height: 40px;
        padding: 0 15px;
        border: 1px solid var(--rod-border);
        border-radius: 12px;
        outline: 0;
        background: var(--rod-overlay);
        color: var(--rod-text);
        font: 650 12px/1.2 system-ui, sans-serif;
        cursor: pointer;
        white-space: normal;
        text-wrap: balance;
        transition: transform 160ms var(--rod-ease-spring), background-color 140ms, border-color 140ms, color 140ms;
      }

      .rod-toast__confirm-button span,
      .rod-toast__action-button span,
      .rod-toast__task-button span {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .rod-toast__confirm-button:hover:not(:disabled),
      .rod-toast__action-button:hover:not(:disabled),
      .rod-toast__task-button:hover:not(:disabled) {
        border-color: var(--rod-border-strong);
        background: var(--rod-hover);
        transform: translateY(-2px);
      }

      .rod-toast__confirm-button:disabled,
      .rod-toast__action-button:disabled,
      .rod-toast__task-button:disabled {
        opacity: .5;
        cursor: wait;
      }

      .rod-toast__confirm-button[data-variant="primary"],
      .rod-toast__action-button[data-variant="primary"] {
        border-color: var(--rod-text-strong);
        background: var(--rod-text-strong);
        color: var(--rod-surface);
      }

      .rod-toast__confirm-button[data-variant="danger"],
      .rod-toast__action-button[data-variant="danger"] {
        border-color: rgba(248, 113, 113, .3);
        background: rgba(127, 29, 29, .22);
        color: rgba(252, 165, 165, .98);
      }

      .rod-toast__confirm-button[data-variant="ghost"],
      .rod-toast__action-button[data-variant="ghost"] {
        border-color: transparent;
        background: transparent;
        color: var(--rod-muted);
      }

      @container (max-width:340px) {
        .rod-toast__confirm-button,
        .rod-toast__action-button,
        .rod-toast__task-button {
          flex-basis: calc(50% - 5px);
        }
      }

      .rod-toast__details {
        overflow: hidden;
        border: 1px solid var(--rod-border);
        border-radius: 12px;
        background: var(--rod-overlay);
      }

      .rod-toast__details summary {
        display: flex;
        align-items: center;
        min-height: 36px;
        padding: 0 11px;
        color: var(--rod-muted);
        font: 600 11px/1 system-ui, sans-serif;
        cursor: pointer;
      }

      .rod-toast__details-body {
        max-height: 280px;
        overflow: auto;
        padding: 10px;
        border-top: 1px solid var(--rod-border);
        font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .rod-toast__field {
        display: grid;
        gap: 6px;
        min-width: 0;
      }

      .rod-toast__field-label {
        color: var(--rod-muted);
        font: 600 10px/1.2 system-ui, sans-serif;
      }

      .rod-toast__input,
      .rod-toast__select,
      .rod-toast__textarea {
        appearance: none;
        width: 100%;
        min-width: 0;
        min-height: 40px;
        padding: 9px 11px;
        border: 1px solid var(--rod-border);
        border-radius: 12px;
        outline: 0;
        background: var(--rod-overlay);
        color: var(--rod-text-strong);
        font: 16px/1.45 system-ui, sans-serif;
      }

      .rod-toast__textarea {
        min-height: 96px;
        resize: vertical;
      }

      .rod-toast__input:focus,
      .rod-toast__select:focus,
      .rod-toast__textarea:focus {
        border-color: var(--rod-border-strong);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--rod-focus) 18%, transparent);
      }

      .rod-toast__checkboxes {
        display: grid;
        gap: 7px;
      }

      .rod-toast__checkbox {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        color: var(--rod-muted);
        font: 11px/1.45 system-ui, sans-serif;
        cursor: pointer;
      }

      .rod-toast__checkbox input {
        width: 15px;
        height: 15px;
        margin: 1px 0 0;
        accent-color: var(--rod-text-strong);
      }

      .rod-toast__validation {
        display: none;
        padding: 8px 10px;
        border: 1px solid rgba(248, 113, 113, .24);
        border-radius: 10px;
        background: rgba(127, 29, 29, .16);
        color: rgba(252, 165, 165, .96);
        font: 500 11px/1.45 system-ui, sans-serif;
      }

      .rod-toast__validation[data-visible="true"] {
        display: block;
      }

      .rod-toast__countdown {
        display: none;
        gap: 5px;
        color: var(--rod-muted);
        font: 500 10px/1.2 system-ui, sans-serif;
      }

      .rod-toast__countdown[data-visible="true"] {
        display: grid;
      }

      .rod-toast__countdown-track {
        position: relative;
        height: 3px;
        overflow: hidden;
        border-radius: 999px;
        background: var(--rod-overlay);
      }

      .rod-toast__countdown-bar {
        position: absolute;
        inset: 0 auto 0 0;
        width: var(--rod-countdown-progress, 100%);
        border-radius: inherit;
        background: var(--rod-text);
        transition: width 250ms linear;
      }

      .rod-toast__task-status {
        color: var(--rod-muted-soft);
        font: 650 9px/1 system-ui, sans-serif;
        letter-spacing: .04em;
        text-transform: uppercase;
      }

      .rod-toast[data-completing="true"] {
        align-self: center;
        justify-self: center;
        grid-template-columns: 1fr;
        gap: 0;
        width: 54px;
        min-width: 54px;
        max-width: 54px;
        height: 54px;
        min-height: 54px;
        max-height: 54px;
        padding: 0;
        overflow: hidden;
        border-radius: 999px;
        background: var(--rod-surface);
        box-shadow: var(--rod-shadow-raised);
        cursor: default;
      }

      .rod-toast[data-completing="true"] .rod-toast__content,
      .rod-toast[data-completing="true"] .rod-toast__actions {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .rod-toast[data-completing="true"] .rod-toast__icon {
        justify-self: center;
        width: 54px;
        min-width: 54px;
        height: 54px;
        margin: 0;
      }

      .rod-toast[data-completing="true"] .rod-icon-check-path {
        stroke-dasharray: 24;
        stroke-dashoffset: 24;
        animation: rod-toast-check-draw 280ms 100ms ease-out forwards;
      }

      .rod-toast[data-success-exit="true"] {
        opacity: 0;
        transform: translate3d(0, -18px, 0) scale(.86);
      }

      @keyframes rod-toast-spinner {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes rod-toast-pulse {
        0%,
        100% {
          opacity: .55;
          transform: scale(.92);
        }
        50% {
          opacity: 1;
          transform: scale(1.08);
        }
      }

      @keyframes rod-toast-progress-indeterminate {
        0% {
          left: -42%;
        }
        50% {
          left: 42%;
        }
        100% {
          left: 104%;
        }
      }

      @keyframes rod-toast-check-draw {
        to {
          stroke-dashoffset: 0;
        }
      }

      @keyframes rod-toast-icon-enter {
        0% {
          opacity: 0;
          transform: scale(.72) rotate(-9deg);
        }
        62% {
          opacity: 1;
          transform: scale(1.08) rotate(1deg);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes rod-toast-toolbar-enter {
        from {
          opacity: 0;
          transform: translateY(-8px) scale(.98);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }

      @keyframes rod-toast-manager-enter {
        0% {
          opacity: 0;
          transform: translateY(-10px) scale(.72);
        }
        70% {
          opacity: 1;
          transform: translateY(1px) scale(1.06);
        }
        100% {
          opacity: 1;
          transform: none;
        }
      }

      @media (max-width:560px) {
        .rod-toast-stack {
          --rod-toast-width: calc(100vw - 16px);
        }
        .rod-toast-stack[data-position^="top"] {
          top: max(env(safe-area-inset-top, 0px), 8px);
          right: 8px;
          left: 8px;
        }
        .rod-toast-stack[data-position^="bottom"] {
          right: 8px;
          bottom: max(env(safe-area-inset-bottom, 0px), 8px);
          left: 8px;
        }
        .rod-toast[data-confirm="true"],
        .rod-toast[data-rich="true"],
        .rod-toast[data-interactive="true"] {
          min-width: 0;
          max-width: none;
        }
        .rod-toast__confirm-actions,
        .rod-toast__action-bar,
        .rod-toast__task-actions {
          gap: 6px;
        }
        .rod-toast__confirm-button,
        .rod-toast__action-button,
        .rod-toast__task-button {
          min-width: min(100%, 96px);
          min-height: 36px;
          padding-inline: 10px;
          font-size: 10px;
        }
      }

      .rod-toast-stack[data-size="compact"] {
        --rod-toast-width: min(420px, calc(100vw - 16px));
        --rod-toaster-font-size: 11px;
        --rod-toaster-line-height: 1;
        gap: 4px;
      }

      .rod-toast-stack[data-size="compact"] .rod-toast {
        min-height: 48px;
        max-height: min(64dvh, 620px);
        gap: 9px;
        padding: 8px 6px 8px 10px;
        border-radius: 12px;
      }

      .rod-toast-stack[data-size="compact"] .rod-toast__icon {
        width: 19px;
        min-width: 19px;
        height: 19px;
      }

      .rod-toast-stack[data-size="compact"] .rod-toast__icon svg {
        width: 14px;
        height: 14px;
      }

      .rod-toast-stack[data-size="compact"] .rod-toast__icon-image {
        border-radius: 5px;
      }

      .rod-toast-stack[data-size="compact"] .rod-toast__content {
        font-size: 13px;
        line-height: 1.38;
      }

      .rod-toast-stack[data-size="compact"] .rod-toast__actions {
        gap: 1px;
      }

      .rod-toast-stack[data-size="compact"] .rod-toast__close,
      .rod-toast-stack[data-size="compact"] .rod-toast__expand,
      .rod-toast-stack[data-size="compact"] .rod-toast__minimize {
        width: 31px;
        min-width: 31px;
        height: 31px;
        border-radius: 9px;
      }

      .rod-toast-stack[data-size="compact"] .rod-toast__loading-copy,
      .rod-toast-stack[data-size="compact"] .rod-toast__confirm-copy,
      .rod-toast-stack[data-size="compact"] .rod-toast__rich-copy,
      .rod-toast-stack[data-size="compact"] .rod-toast__interactive-copy {
        gap: 3px;
      }

      .rod-toast-stack[data-size="compact"] .rod-toast__loading-title,
      .rod-toast-stack[data-size="compact"] .rod-toast__confirm-title,
      .rod-toast-stack[data-size="compact"] .rod-toast__rich-title,
      .rod-toast-stack[data-size="compact"] .rod-toast__interactive-title {
        font-size: 11px;
        line-height: 1;
      }

      .rod-toast-stack[data-size="compact"] .rod-toast__loading-description,
      .rod-toast-stack[data-size="compact"] .rod-toast__confirm-description,
      .rod-toast-stack[data-size="compact"] .rod-toast__rich-description,
      .rod-toast-stack[data-size="compact"] .rod-toast__interactive-description {
        font-size: 11px;
        line-height: 1.4;
      }

      .rod-toast-stack[data-size="compact"] .rod-toast[data-confirm="true"],
      .rod-toast-stack[data-size="compact"] .rod-toast[data-rich="true"],
      .rod-toast-stack[data-size="compact"] .rod-toast[data-interactive="true"] {
        min-width: min(390px, calc(100vw - 16px));
        max-width: min(480px, calc(100vw - 16px));
        padding-block: 12px;
      }

      .rod-toast-stack[data-size="compact"] .rod-toast__confirm,
      .rod-toast-stack[data-size="compact"] .rod-toast__rich,
      .rod-toast-stack[data-size="compact"] .rod-toast__interactive {
        gap: 11px;
      }

      .rod-toast-stack[data-size="compact"] .rod-toast__confirm-button,
      .rod-toast-stack[data-size="compact"] .rod-toast__action-button,
      .rod-toast-stack[data-size="compact"] .rod-toast__task-button {
        min-height: 32px;
        padding: 0 10px;
        border-radius: 9px;
        font-size: 9px;
      }

      .rod-toast-stack[data-size="compact"] .rod-toast[data-visible="true"] .rod-toast__icon {
        animation: none;
      }

      .rod-toast-stack[data-size="comfortable"] {
        --rod-toast-width: min(520px, calc(100vw - 24px));
        --rod-toaster-font-size: 14px;
        --rod-toaster-line-height: 1.46;
        gap: 10px;
      }

      .rod-toast-stack[data-size="comfortable"] .rod-toast {
        min-height: 70px;
        gap: 13px;
        padding: 14px 11px 14px 16px;
        border-radius: 19px;
      }

      .rod-toast-stack[data-size="comfortable"] .rod-toast__content {
        font-size: 14px;
      }

      .rod-toast-stack[data-size="comfortable"] .rod-toast__close,
      .rod-toast-stack[data-size="comfortable"] .rod-toast__expand,
      .rod-toast-stack[data-size="comfortable"] .rod-toast__minimize {
        width: 36px;
        min-width: 36px;
        height: 36px;
        border-radius: 11px;
      }

      .rod-toast-stack[data-size="comfortable"] .rod-toast[data-confirm="true"],
      .rod-toast-stack[data-size="comfortable"] .rod-toast[data-rich="true"],
      .rod-toast-stack[data-size="comfortable"] .rod-toast[data-interactive="true"] {
        min-width: min(460px, calc(100vw - 24px));
        max-width: min(580px, calc(100vw - 24px));
        padding-block: 16px;
      }

      .rod-toast-stack[data-size="comfortable"] .rod-toast__confirm-button,
      .rod-toast-stack[data-size="comfortable"] .rod-toast__action-button,
      .rod-toast-stack[data-size="comfortable"] .rod-toast__task-button {
        min-height: 38px;
        padding: 0 13px;
      }

      .rod-toast-stack[data-size="large"] {
        --rod-toast-width: min(640px, calc(100vw - 32px));
        --rod-toaster-font-size: 16px;
        --rod-toaster-line-height: 1.52;
        gap: 13px;
      }

      .rod-toast-stack[data-size="large"] .rod-toast {
        min-height: 88px;
        gap: 17px;
        padding: 20px 16px 20px 22px;
        border-radius: 24px;
      }

      .rod-toast-stack[data-size="large"] .rod-toast__icon {
        width: 31px;
        min-width: 31px;
        height: 31px;
      }

      .rod-toast-stack[data-size="large"] .rod-toast__icon svg {
        width: 26px;
        height: 26px;
      }

      .rod-toast-stack[data-size="large"] .rod-toast__icon-image {
        border-radius: 9px;
      }

      .rod-toast-stack[data-size="large"] .rod-toast__content {
        font-size: 16px;
      }

      .rod-toast-stack[data-size="large"] .rod-toast__close,
      .rod-toast-stack[data-size="large"] .rod-toast__expand,
      .rod-toast-stack[data-size="large"] .rod-toast__minimize {
        width: 44px;
        min-width: 44px;
        height: 44px;
        border-radius: 14px;
      }

      .rod-toast-stack[data-size="large"] .rod-toast__loading-title,
      .rod-toast-stack[data-size="large"] .rod-toast__confirm-title,
      .rod-toast-stack[data-size="large"] .rod-toast__rich-title,
      .rod-toast-stack[data-size="large"] .rod-toast__interactive-title {
        font-size: 17px;
      }

      .rod-toast-stack[data-size="large"] .rod-toast__loading-description,
      .rod-toast-stack[data-size="large"] .rod-toast__confirm-description,
      .rod-toast-stack[data-size="large"] .rod-toast__rich-description,
      .rod-toast-stack[data-size="large"] .rod-toast__interactive-description {
        font-size: 14px;
      }

      .rod-toast-stack[data-size="large"] .rod-toast[data-confirm="true"],
      .rod-toast-stack[data-size="large"] .rod-toast[data-rich="true"],
      .rod-toast-stack[data-size="large"] .rod-toast[data-interactive="true"] {
        min-width: min(560px, calc(100vw - 32px));
        max-width: min(700px, calc(100vw - 32px));
        padding-block: 22px;
      }

      .rod-toast-stack[data-size="large"] .rod-toast__confirm-button,
      .rod-toast-stack[data-size="large"] .rod-toast__action-button,
      .rod-toast-stack[data-size="large"] .rod-toast__task-button {
        min-height: 46px;
        padding: 0 18px;
        font-size: 13px;
      }

      @media (max-width:560px) {
        .rod-toast-stack[data-size="compact"],
        .rod-toast-stack[data-size="comfortable"],
        .rod-toast-stack[data-size="large"] {
          --rod-toast-width: calc(100vw - 16px);
        }
        .rod-toast-stack[data-size="large"] .rod-toast {
          min-height: 78px;
          gap: 14px;
          padding: 17px 12px 17px 16px;
        }
        .rod-toast-stack[data-size="large"] .rod-toast[data-confirm="true"],
        .rod-toast-stack[data-size="large"] .rod-toast[data-rich="true"],
        .rod-toast-stack[data-size="large"] .rod-toast[data-interactive="true"] {
          min-width: 0;
          max-width: none;
        }
      }

      /* Multi loading manager */
      .rod-toast[data-multi-loading="true"] {
        width: min(620px, calc(100vw - 20px));
        max-width: min(620px, calc(100vw - 20px));
        max-height: none;
        overflow: hidden;
        padding: 0;
        grid-template-columns: 1fr;
        gap: 0;
        touch-action: pan-y;
      }

      .rod-toast[data-multi-loading="true"]>.rod-toast__icon,
      .rod-toast[data-multi-loading="true"]>.rod-toast__actions {
        display: none!important;
      }

      .rod-toast[data-multi-loading="true"]>.rod-toast__content {
        display: block;
        width: 100%;
        min-width: 0;
        overflow: hidden;
      }

      .rod-multi-loading {
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr);
        width: 100%;
        min-width: 0;
        max-height: var(--rod-multi-max-height, min(50dvh, 520px));
        overflow: hidden;
      }

      .rod-multi-loading__header {
        position: relative;
        z-index: 2;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        padding: 13px 13px 11px 15px;
        border-bottom: 1px solid var(--rod-border);
        background: var(--rod-surface);
      }

      .rod-multi-loading__heading {
        display: grid;
        gap: 4px;
        min-width: 0;
      }

      .rod-multi-loading__title {
        overflow: hidden;
        color: var(--rod-text-strong);
        font: 700 13px/1.2 system-ui, sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rod-multi-loading__summary {
        overflow: hidden;
        color: var(--rod-muted);
        font: 600 10px/1.2 system-ui, sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rod-multi-loading__aggregate {
        display: grid;
        gap: 7px;
        padding: 9px 14px 10px;
        border-bottom: 1px solid var(--rod-border);
        background: var(--rod-surface);
      }

      .rod-multi-loading__aggregate-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-width: 0;
        color: var(--rod-muted);
        font: 650 10px/1.2 system-ui, sans-serif;
        font-variant-numeric: tabular-nums;
      }

      .rod-multi-loading__aggregate-percent {
        color: var(--rod-text-strong);
        font-weight: 720;
      }

      .rod-multi-loading__aggregate-count {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rod-multi-loading__aggregate-track {
        position: relative;
        width: 100%;
        height: 4px;
        overflow: hidden;
        border-radius: 999px;
        background: var(--rod-overlay);
      }

      .rod-multi-loading__aggregate-bar {
        position: absolute;
        inset: 0 auto 0 0;
        width: var(--rod-multi-aggregate-progress, 0%);
        border-radius: inherit;
        background: var(--rod-text-strong);
        transition: width 320ms var(--rod-ease-soft);
      }

      .rod-multi-loading__header-actions {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .rod-multi-loading__header-button {
        appearance: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 31px;
        padding: 0 9px;
        border: 1px solid var(--rod-border);
        border-radius: 9px;
        background: var(--rod-overlay);
        color: var(--rod-muted);
        font: 650 10px/1 system-ui, sans-serif;
        cursor: pointer;
        touch-action: manipulation;
      }

      .rod-multi-loading__header-button:hover {
        border-color: var(--rod-border-strong);
        color: var(--rod-text-strong);
        background: var(--rod-hover);
      }

      .rod-multi-loading__list {
        display: flex;
        flex-direction: column;
        gap: 0;
        min-height: 0;
        max-height: var(--rod-multi-list-height, min(42dvh, 440px));
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: var(--rod-border-strong) transparent;
        scrollbar-gutter: stable;
      }

      .rod-multi-loading__empty {
        display: grid;
        place-items: center;
        min-height: 90px;
        padding: 24px;
        color: var(--rod-muted);
        font: 500 11px/1.4 system-ui, sans-serif;
        text-align: center;
      }

      .rod-multi-loading__item {
        --rod-multi-accent: var(--rod-toast-accent);
        position: relative;
        display: grid;
        grid-template-columns: 30px minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        min-height: 58px;
        padding: 9px 10px 9px 12px;
        border-bottom: 1px solid var(--rod-border);
        background: transparent;
        opacity: 1;
        transform: translate3d(0, 0, 0);
        transform-origin: center;
        transition: opacity 260ms ease, transform 340ms var(--rod-ease-spring), max-height 360ms var(--rod-ease-spring), min-height 360ms var(--rod-ease-spring), padding 360ms var(--rod-ease-spring), margin 360ms var(--rod-ease-spring), background-color 220ms, border-color 220ms;
      }

      .rod-multi-loading__item:last-child {
        border-bottom: 0;
      }

      .rod-multi-loading__item[data-status="error"] {
        background: color-mix(in srgb, rgba(251, 113, 133, .12) 60%, transparent);
      }

      .rod-multi-loading__item[data-status="cancelled"] {
        opacity: .62;
      }

      .rod-multi-loading__lead {
        position: relative;
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border: 1px solid var(--rod-border);
        border-radius: 10px;
        background: var(--rod-overlay);
        color: var(--rod-muted);
        transition: width 340ms var(--rod-ease-spring), height 340ms var(--rod-ease-spring), border-radius 340ms var(--rod-ease-spring), background-color 220ms, color 220ms, transform 340ms var(--rod-ease-spring);
      }

      .rod-multi-loading__lead svg {
        width: 15px;
        height: 15px;
      }

      .rod-multi-loading__lead[data-spin="true"] svg {
        animation: rod-toast-spinner 850ms linear infinite;
      }

      .rod-multi-loading__lead .rod-toast__icon-image {
        width: 100%;
        height: 100%;
        border-radius: inherit;
        object-fit: cover;
      }

      .rod-multi-loading__copy {
        display: grid;
        gap: 3px;
        min-width: 0;
        transition: opacity 180ms, width 320ms var(--rod-ease-spring), transform 320ms var(--rod-ease-spring);
      }

      .rod-multi-loading__item-title {
        overflow: hidden;
        color: var(--rod-text-strong);
        font: 650 12px/1.25 system-ui, sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rod-multi-loading__item-description {
        overflow: hidden;
        color: var(--rod-muted);
        font: 500 10px/1.3 system-ui, sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rod-multi-loading__progress {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-top: 2px;
      }

      .rod-multi-loading__track {
        position: relative;
        flex: 1;
        height: 3px;
        overflow: hidden;
        border-radius: 999px;
        background: var(--rod-overlay);
      }

      .rod-multi-loading__bar {
        position: absolute;
        inset: 0 auto 0 0;
        width: var(--rod-multi-progress, 0%);
        border-radius: inherit;
        background: var(--rod-toast-accent);
        transition: width 360ms var(--rod-ease-soft);
      }

      .rod-multi-loading__progress-label {
        min-width: 30px;
        color: var(--rod-muted-soft);
        font: 650 9px/1 ui-monospace, monospace;
        text-align: right;
      }

      .rod-multi-loading__actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
      }

      .rod-multi-loading__button {
        appearance: none;
        display: grid;
        place-items: center;
        width: 31px;
        height: 31px;
        padding: 0;
        border: 1px solid transparent;
        border-radius: 9px;
        background: transparent;
        color: var(--rod-muted);
        cursor: pointer;
        touch-action: manipulation;
        transition: transform 160ms var(--rod-ease-spring), background-color 140ms, border-color 140ms, color 140ms;
      }

      .rod-multi-loading__button:hover,
      .rod-multi-loading__button:focus-visible {
        border-color: var(--rod-border);
        background: var(--rod-hover);
        color: var(--rod-text-strong);
        transform: scale(1.04);
      }

      .rod-multi-loading__button[data-action="retry"] {
        width: auto;
        display: inline-flex;
        gap: 5px;
        padding-inline: 8px;
        color: rgba(253, 186, 116, .98);
        font: 650 9px/1 system-ui, sans-serif;
      }

      .rod-multi-loading__button[data-action="retry"] svg {
        width: 13px;
        height: 13px;
      }

      .rod-multi-loading__button:disabled {
        opacity: .4;
        cursor: wait;
      }

      .rod-multi-loading__item[data-status="success"] .rod-multi-loading__lead {
        border-color: rgba(74, 222, 128, .36);
        background: rgba(34, 197, 94, .16);
        color: rgb(74, 222, 128);
      }

      .rod-multi-loading__item[data-status="error"] .rod-multi-loading__lead {
        border-color: rgba(251, 113, 133, .34);
        background: rgba(190, 18, 60, .14);
        color: rgb(251, 113, 133);
      }

      .rod-multi-loading__item[data-success-morph="true"] {
        align-self: center;
        width: 42px;
        min-width: 42px;
        max-width: 42px;
        min-height: 42px;
        max-height: 42px;
        margin-block: 5px;
        padding: 5px;
        border: 1px solid rgba(74, 222, 128, .25);
        border-radius: 999px;
        background: rgba(34, 197, 94, .12);
        grid-template-columns: 30px 0 0;
        gap: 0;
        overflow: hidden;
      }

      .rod-multi-loading__item[data-success-morph="true"] .rod-multi-loading__lead {
        width: 30px;
        height: 30px;
        border-radius: 999px;
        transform: scale(1.02);
      }

      .rod-multi-loading__item[data-success-morph="true"] .rod-multi-loading__copy,
      .rod-multi-loading__item[data-success-morph="true"] .rod-multi-loading__actions {
        width: 0;
        opacity: 0;
        overflow: hidden;
        pointer-events: none;
        transform: scale(.9);
      }

      .rod-multi-loading__item[data-removing="true"] {
        min-height: 0!important;
        max-height: 0!important;
        margin: 0!important;
        padding-block: 0!important;
        border-width: 0;
        opacity: 0;
        transform: translate3d(0, -7px, 0) scale(.92);
        overflow: hidden;
      }

      @media (max-width:560px) {
        .rod-toast[data-multi-loading="true"] {
          width: calc(100vw - 12px);
          max-width: calc(100vw - 12px);
          border-radius: 16px;
        }
        .rod-multi-loading {
          max-height: min(50dvh, 430px);
        }
        .rod-multi-loading__header {
          padding: 11px 9px 9px 12px;
        }
        .rod-multi-loading__aggregate {
          gap: 6px;
          padding: 8px 11px 9px;
        }
        .rod-multi-loading__header-button span {
          display: none;
        }
        .rod-multi-loading__header-button {
          width: 31px;
          padding: 0;
        }
        .rod-multi-loading__list {
          max-height: min(41dvh, 350px);
        }
        .rod-multi-loading__item {
          grid-template-columns: 28px minmax(0, 1fr) auto;
          gap: 8px;
          min-height: 54px;
          padding: 8px;
        }
        .rod-multi-loading__lead {
          width: 28px;
          height: 28px;
        }
        .rod-multi-loading__item-title {
          font-size: 11px;
        }
        .rod-multi-loading__item-description {
          font-size: 9.5px;
        }
        .rod-multi-loading__button {
          width: 29px;
          height: 29px;
        }
        .rod-multi-loading__button[data-action="retry"] span {
          display: none;
        }
        .rod-multi-loading__button[data-action="retry"] {
          width: 29px;
          padding: 0;
        }
      }

      /* Media picker */
      .rod-toast-stack .rod-toast[data-interactive-kind="picker"] {
        width: min(760px, calc(100vw - 20px));
        min-width: min(620px, calc(100vw - 20px));
        max-width: min(760px, calc(100vw - 20px));
        height: min(760px, calc(100dvh - max(env(safe-area-inset-top, 0px), 12px) - max(env(safe-area-inset-bottom, 0px), 12px) - 24px));
        max-height: min(860px, calc(100dvh - max(env(safe-area-inset-top, 0px), 12px) - max(env(safe-area-inset-bottom, 0px), 12px) - 24px));
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: stretch;
        padding: 14px 10px 12px 14px;
        overflow: hidden;
        touch-action: pan-y;
      }

      .rod-toast[data-interactive-kind="picker"]>.rod-toast__icon {
        display: none;
      }

      .rod-toast[data-interactive-kind="picker"]>.rod-toast__content {
        min-height: 0;
        overflow: hidden;
      }

      .rod-toast[data-interactive-kind="picker"]>.rod-toast__actions {
        align-self: start;
      }

      .rod-toast[data-interactive-kind="picker"] .rod-toast__interactive {
        grid-template-rows: auto minmax(0, 1fr);
        grid-auto-rows: auto;
        gap: 11px;
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }

      .rod-toast[data-interactive-kind="picker"] .rod-toast__interactive-body {
        min-height: 0;
        overflow: hidden;
      }

      .rod-toast[data-interactive-kind="picker"] .rod-toast__confirm-actions {
        position: relative;
        z-index: 3;
        flex: none;
        padding-top: 2px;
        overflow: visible;
        background: var(--rod-surface);
      }

      .rod-toast__picker {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        gap: 9px;
        min-width: 0;
        width: 100%;
        height: 100%;
        min-height: 0;
      }

      .rod-toast__picker-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-width: 0;
      }

      .rod-toast__picker-count {
        min-width: 0;
        overflow: hidden;
        color: var(--rod-muted);
        font: 620 11px/1.25 ui-sans-serif, system-ui, -apple-system, sans-serif;
        font-variant-numeric: tabular-nums;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rod-toast__picker-tools {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 6px;
      }

      .rod-toast__picker-tool {
        appearance: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 30px;
        padding: 0 9px;
        border: 1px solid var(--rod-border);
        border-radius: 9px;
        outline: 0;
        background: var(--rod-overlay);
        color: var(--rod-muted);
        font: 650 10px/1 ui-sans-serif, system-ui, -apple-system, sans-serif;
        cursor: pointer;
        touch-action: manipulation;
        transition: color 150ms, background-color 150ms, border-color 150ms, opacity 150ms, transform 240ms var(--rod-ease-spring);
      }

      .rod-toast__picker-tool:hover:not(:disabled),
      .rod-toast__picker-tool:focus-visible:not(:disabled) {
        border-color: var(--rod-border-strong);
        background: var(--rod-hover);
        color: var(--rod-text-strong);
        transform: translateY(-1px);
      }

      .rod-toast__picker-tool:active:not(:disabled) {
        transform: translateY(0) scale(.97);
      }

      .rod-toast__picker-tool:disabled {
        cursor: default;
        opacity: .38;
      }

      .rod-toast__picker-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(var(--rod-picker-item-min, 112px), 1fr));
        grid-auto-rows: auto;
        align-content: start;
        align-items: start;
        justify-items: stretch;
        gap: var(--rod-picker-gap, 8px);
        width: 100%;
        height: 100%;
        min-height: 0;
        overflow-x: hidden;
        overflow-y: auto;
        padding: 1px 3px 7px 1px;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        scrollbar-color: var(--rod-border-strong) transparent;
        -webkit-overflow-scrolling: touch;
        scroll-padding: 8px;
      }

      .rod-toast__picker-item {
        appearance: none;
        position: relative;
        isolation: isolate;
        display: block;
        align-self: start;
        width: 100%;
        height: auto;
        min-width: 0;
        min-height: 0;
        padding: 0;
        overflow: hidden;
        border: 1px solid var(--rod-border);
        border-radius: var(--rod-picker-radius, 13px);
        outline: 0;
        background: linear-gradient(145deg, var(--rod-overlay), transparent), var(--rod-surface-raised);
        color: var(--rod-text);
        line-height: 0;
        cursor: pointer;
        touch-action: manipulation;
        contain: layout paint style;
        transition: border-color 170ms, box-shadow 220ms, opacity 170ms, transform 300ms var(--rod-ease-spring);
      }

      /*
       * Do not depend on CSS aspect-ratio for picker cells. WebKit can resolve
       * intrinsic replaced-element sizes incorrectly inside a scrollable grid,
       * producing the tall/overlapping cards seen on iOS. A normal-flow ratio
       * spacer gives Grid a deterministic block-size before any image decodes.
       */
      .rod-toast__picker-item::before {
        content: "";
        display: block;
        width: 100%;
        padding-block-start: var(--rod-picker-aspect-padding, 100%);
        pointer-events: none;
      }

      .rod-toast__picker-item:hover:not(:disabled),
      .rod-toast__picker-item:focus-visible:not(:disabled) {
        border-color: var(--rod-border-strong);
        box-shadow: 0 8px 24px rgba(0, 0, 0, .18), 0 0 0 1px color-mix(in srgb, var(--rod-text-strong) 7%, transparent);
        transform: translateY(-2px) scale(1.012);
      }

      .rod-toast__picker-item:active:not(:disabled) {
        transform: scale(.985);
      }

      .rod-toast__picker-item[data-selected="true"] {
        border-color: color-mix(in srgb, var(--rod-text-strong) 62%, var(--rod-border));
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--rod-text-strong) 72%, transparent) inset, 0 10px 28px rgba(0, 0, 0, .2);
      }

      .rod-toast__picker-item:disabled {
        cursor: default;
        opacity: .38;
        filter: grayscale(.35);
      }

      @supports (-webkit-touch-callout: none) {
        .rod-toast__picker-grid {
          grid-auto-flow: row;
        }

        .rod-toast__picker-item {
          transform: none !important;
        }
      }

      .rod-toast__picker-media {
        position: absolute;
        inset: 0;
        z-index: 0;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        background: var(--rod-overlay);
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
        transition: filter 220ms, transform 420ms var(--rod-ease-spring);
      }

      .rod-toast__picker-item:hover:not(:disabled) .rod-toast__picker-media {
        transform: scale(1.035);
      }

      .rod-toast__picker-item[data-selected="false"] .rod-toast__picker-media {
        filter: saturate(.76) brightness(.78);
      }

      .rod-toast-stack[data-theme="light"] .rod-toast__picker-item[data-selected="false"] .rod-toast__picker-media {
        filter: saturate(.82) brightness(.93);
      }

      .rod-toast__picker-shade {
        position: absolute;
        inset: 0;
        z-index: 1;
        background: linear-gradient(to top, rgba(0, 0, 0, .48), transparent 46%);
        pointer-events: none;
        opacity: .66;
        transition: opacity 180ms;
      }

      .rod-toast__picker-item[data-selected="true"] .rod-toast__picker-shade {
        opacity: .32;
      }

      .rod-toast__picker-check {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 3;
        display: grid;
        place-items: center;
        width: 25px;
        height: 25px;
        border: 1px solid rgba(255, 255, 255, .42);
        border-radius: 999px;
        background: rgba(10, 10, 11, .48);
        color: rgba(255, 255, 255, .96);
        box-shadow: 0 2px 8px rgba(0, 0, 0, .2), 0 1px 0 rgba(255, 255, 255, .14) inset;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        opacity: .78;
        transform: scale(.9);
        transition: opacity 160ms, transform 300ms var(--rod-ease-spring), background-color 160ms, border-color 160ms;
        pointer-events: none;
      }

      .rod-toast__picker-check svg {
        width: 14px;
        height: 14px;
        stroke-width: 2.4;
        opacity: 0;
        transform: scale(.6);
        transition: opacity 160ms, transform 280ms var(--rod-ease-spring);
      }

      .rod-toast__picker-item[data-selected="true"] .rod-toast__picker-check {
        border-color: rgba(255, 255, 255, .88);
        background: rgba(250, 250, 250, .96);
        color: rgba(20, 20, 21, .98);
        opacity: 1;
        transform: scale(1);
      }

      .rod-toast__picker-item[data-selected="true"] .rod-toast__picker-check svg {
        opacity: 1;
        transform: scale(1);
      }

      .rod-toast__picker-index,
      .rod-toast__picker-kind {
        position: absolute;
        z-index: 3;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        min-height: 21px;
        padding: 0 6px;
        border: 1px solid rgba(255, 255, 255, .22);
        border-radius: 999px;
        background: rgba(10, 10, 11, .48);
        color: rgba(255, 255, 255, .94);
        box-shadow: 0 2px 8px rgba(0, 0, 0, .16);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        font: 700 9px/1 ui-sans-serif, system-ui, -apple-system, sans-serif;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }

      .rod-toast__picker-index {
        bottom: 8px;
        left: 8px;
      }

      .rod-toast__picker-kind {
        right: 8px;
        bottom: 8px;
        gap: 4px;
        min-width: 0;
        padding-inline: 6px;
        text-transform: uppercase;
      }

      .rod-toast__picker-kind svg {
        width: 11px;
        height: 11px;
      }

      .rod-toast__picker-index[hidden],
      .rod-toast__picker-kind[hidden],
      .rod-toast__picker-label[hidden] {
        display: none!important;
      }

      .rod-toast__picker-label {
        position: absolute;
        right: 8px;
        bottom: 8px;
        left: 38px;
        z-index: 2;
        overflow: hidden;
        color: rgba(255, 255, 255, .96);
        font: 650 10px/1.2 ui-sans-serif, system-ui, -apple-system, sans-serif;
        text-align: left;
        text-overflow: ellipsis;
        text-shadow: 0 1px 5px rgba(0, 0, 0, .58);
        white-space: nowrap;
        pointer-events: none;
      }

      .rod-toast__picker-label[data-has-kind="true"] {
        right: 58px;
      }

      .rod-toast__picker-empty {
        display: grid;
        place-items: center;
        min-height: 150px;
        padding: 24px;
        border: 1px dashed var(--rod-border);
        border-radius: 13px;
        color: var(--rod-muted);
        background: var(--rod-overlay);
        font: 500 12px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif;
        text-align: center;
      }

      .rod-toast__picker-item[data-media-error="true"]::after {
        content: "Preview unavailable";
        position: absolute;
        inset: 0;
        z-index: 2;
        display: grid;
        place-items: center;
        padding: 12px;
        background: var(--rod-surface-raised);
        color: var(--rod-muted);
        font: 600 10px/1.3 system-ui, sans-serif;
        text-align: center;
      }

      @media (max-width:560px) {
        .rod-toast-stack .rod-toast[data-interactive-kind="picker"] {
          width: calc(100vw - 10px);
          min-width: 0;
          max-width: calc(100vw - 10px);
          height: calc(100dvh - max(env(safe-area-inset-top, 0px), 8px) - max(env(safe-area-inset-bottom, 0px), 8px) - 12px);
          max-height: none;
          padding: 11px 8px 9px 11px;
          border-radius: 17px;
        }
        .rod-toast[data-interactive-kind="picker"] .rod-toast__interactive {
          gap: 9px;
        }
        .rod-toast[data-interactive-kind="picker"] .rod-toast__interactive-copy {
          gap: 3px;
        }
        .rod-toast[data-interactive-kind="picker"] .rod-toast__interactive-title {
          font-size: 13px;
        }
        .rod-toast[data-interactive-kind="picker"] .rod-toast__interactive-description {
          font-size: 11px;
          line-height: 1.35;
        }
        .rod-toast__picker {
          gap: 7px;
        }
        .rod-toast__picker-grid {
          grid-template-columns: repeat(auto-fill, minmax(var(--rod-picker-item-min-mobile, 104px), 1fr));
          gap: 6px;
          padding-bottom: 5px;
        }
        .rod-toast__picker-toolbar {
          align-items: center;
          flex-direction: row;
          gap: 6px;
        }
        .rod-toast__picker-tools {
          width: auto;
          gap: 4px;
        }
        .rod-toast__picker-tool {
          flex: 0 0 auto;
          min-height: 28px;
          padding-inline: 8px;
          font-size: 9px;
        }
        .rod-toast[data-interactive-kind="picker"] .rod-toast__confirm-actions {
          gap: 6px;
          padding-top: 0;
        }
        .rod-toast[data-interactive-kind="picker"] .rod-toast__confirm-button {
          min-height: 38px!important;
        }
        .rod-toast__picker-label {
          font-size: 9px;
        }
      }

      @media (prefers-reduced-motion:reduce) {
        .rod-toast,
        .rod-toast__content,
        .rod-toast__actions,
        .rod-toast__icon,
        .rod-toast__expand svg,
        .rod-toast-stack__list::before,
        .rod-toast-stack__list::after,
        .rod-toast__picker-item,
        .rod-toast__picker-media,
        .rod-toast__picker-check {
          transition-duration: 1ms!important;
          animation-duration: 1ms!important;
        }
      }
    `;
			return style;
		}
		function resolveTheme(value = state.config.theme) {
			if (value === "dark" || value === "light") return value;
			const hostWindow = state.hostWindow ?? initialHostWindow;
			return safeCall(() => hostWindow.matchMedia?.("(prefers-color-scheme: light)")?.matches === true, false) ? "light" : "dark";
		}
		function getToastPalette(type) {
			const semanticType = hasOwn(TOAST_COLORS, type) ? type : "default";
			return THEME_TOAST_COLORS[state.resolvedTheme][semanticType];
		}
		function applyToastPalette(node, type) {
			if (!node) return;
			const semanticType = hasOwn(TOAST_COLORS, type) ? type : "default";
			const paletteKey = `${state.resolvedTheme}:${semanticType}`;
			if (node.dataset.rodPalette === paletteKey) return;
			const palette = THEME_TOAST_COLORS[state.resolvedTheme][semanticType];
			node.style.setProperty("--rod-toast-bg", palette.bg);
			node.style.setProperty("--rod-toast-border", palette.border);
			node.style.setProperty("--rod-toast-text", palette.text);
			node.style.setProperty("--rod-toast-accent", palette.accent);
			node.dataset.type = semanticType;
			node.dataset.rodPalette = paletteKey;
		}
		function syncTheme() {
			const previous = state.resolvedTheme;
			state.resolvedTheme = resolveTheme();
			if (state.container) state.container.dataset.theme = state.resolvedTheme;
			if (state.hostElement) state.hostElement.dataset.rodToasterTheme = state.resolvedTheme;
			for (const record of state.toasts) applyToastPalette(record.node, record.options.type);
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
			if (state.inspectorApi) return state.inspectorApi;
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
		function hasEventListeners(eventName) {
			return Boolean(state.listeners.get(eventName)?.size || state.listeners.get("*")?.size);
		}
		function emitEvent(eventName, payload = {}) {
			const event = {
				event: eventName,
				timestamp: Date.now(),
				...payload
			};
			const directListeners = state.listeners.get(eventName);
			if (directListeners) for (const listener of directListeners) safeCall(() => listener(event), void 0);
			if (eventName !== "*") {
				const wildcardListeners = state.listeners.get("*");
				if (wildcardListeners) for (const listener of wildcardListeners) safeCall(() => listener(event), void 0);
			}
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
		function hasActiveLoadingRecords() {
			return state.activeLoadingCount > 0;
		}
		function setDataValue(element, key, value) {
			if (element.dataset[key] !== value) element.dataset[key] = value;
		}
		function setTextValue(node, value) {
			if (node.textContent !== value) node.textContent = value;
		}
		function getStackRecords() {
			return state.toasts.filter((record) => record.options.lane !== "interaction" && !record.removed);
		}
		function getNotificationRecords() {
			return state.toasts.filter((record) => record.options.lane === "notification" && !record.removed);
		}
		function getTopDialogEntry() {
			return state.dialogStack.at(-1) ?? null;
		}
		function isTopDialog(record) {
			return getTopDialogEntry()?.record === record;
		}
		function syncDialogStack() {
			const top = getTopDialogEntry();
			for (const entry of state.dialogStack) {
				const active = entry === top && !entry.record.removed;
				entry.record.node.dataset.dialogActive = String(active);
				entry.record.node.setAttribute("aria-hidden", String(!active));
				entry.record.node.inert = !active;
			}
			if (state.container) setDataValue(state.container, "hasInteraction", String(Boolean(top)));
		}
		function registerDialog(record, previousFocus) {
			const focus = previousFocus && typeof previousFocus.focus === "function" ? previousFocus : null;
			state.dialogStack.push({
				record,
				previousFocus: focus
			});
			syncDialogStack();
		}
		function unregisterDialog(record) {
			const index = state.dialogStack.findIndex((entry) => entry.record === record);
			if (index < 0) return;
			const [removedEntry] = state.dialogStack.splice(index, 1);
			syncDialogStack();
			(state.hostWindow ?? initialHostWindow).queueMicrotask(() => {
				const top = getTopDialogEntry();
				if (top?.record.node.isConnected) {
					safeCall(() => top.record.node.focus({ preventScroll: true }), void 0);
					return;
				}
				if (removedEntry?.previousFocus?.isConnected) safeCall(() => removedEntry.previousFocus?.focus({ preventScroll: true }), void 0);
			});
		}
		function setManagerMinimized(minimized) {
			const count = getStackRecords().length;
			state.managerMinimized = Boolean(minimized) && count > 0;
			syncStackLayout();
			if (!state.managerMinimized && count > 1) setStackExpanded(true);
			return state.managerMinimized;
		}
		function syncStackLayout() {
			const container = state.container;
			if (!container) return;
			const records = getStackRecords();
			const count = records.length;
			let taskCount = 0;
			for (let sourceIndex = count - 1, stackIndex = 0; sourceIndex >= 0; sourceIndex -= 1, stackIndex += 1) {
				const record = records[sourceIndex];
				setDataValue(record.node, "stackIndex", String(stackIndex));
				if (!record.node.dataset.itemExpanded) record.node.dataset.itemExpanded = "false";
				if (record.options.lane === "task" || record.options.metadata?.taskId) taskCount += 1;
			}
			if (count === 0) state.managerMinimized = false;
			if (count <= 1) state.stackExpanded = false;
			const stackVisible = Math.min(3, Math.max(1, Number(state.config.stackVisible) || 1));
			const stackDepth = Math.min(count, stackVisible);
			const effectiveExpanded = !state.config.stacked || state.stackExpanded || count <= 1;
			const viewportRatio = clamp(Number(state.config.stackViewportRatio) || DEFAULT_CONFIG.stackViewportRatio, .2, .8);
			setDataValue(container, "stacked", String(state.config.stacked));
			setDataValue(container, "managerMinimized", String(state.managerMinimized));
			setDataValue(container, "expanded", String(effectiveExpanded));
			setDataValue(container, "stackDepth", String(stackDepth));
			setDataValue(container, "count", String(count));
			setDataValue(container, "hasMany", String(count > 1));
			setDataValue(container, "hasInteraction", String(Boolean(getTopDialogEntry())));
			setDataValue(container, "size", state.config.size);
			const stackHeight = `${Math.max(180, state.config.stackMaxHeight)}px`;
			const stackViewport = `${Math.round(viewportRatio * 100)}dvh`;
			if (container.style.getPropertyValue("--rod-toast-stack-max-height") !== stackHeight) container.style.setProperty("--rod-toast-stack-max-height", stackHeight);
			if (container.style.getPropertyValue("--rod-toast-stack-max-viewport") !== stackViewport) container.style.setProperty("--rod-toast-stack-max-viewport", stackViewport);
			if (state.toolbar) setDataValue(state.toolbar, "enabled", String(state.config.stackToolbar));
			if (state.stackCountNode) setTextValue(state.stackCountNode, taskCount ? `${taskCount} ${taskCount === 1 ? "task" : "tasks"} · ${count} ${count === 1 ? "toast" : "toasts"}` : `${count} ${count === 1 ? "toast" : "toasts"}`);
			if (state.managerCountNode) {
				const visibleCount = taskCount || count;
				setTextValue(state.managerCountNode, String(visibleCount));
				setDataValue(state.managerCountNode, "visible", String(visibleCount > 1));
			}
			if (state.managerNode) {
				const title = taskCount ? `Restore ${taskCount} active ${taskCount === 1 ? "task" : "tasks"}` : "Restore active toasts";
				if (state.managerNode.title !== title) state.managerNode.title = title;
			}
		}
		function setExpandedToast(record, expanded) {
			if (record.removed || record.options.lane === "interaction") return;
			for (const candidate of getStackRecords()) setDataValue(candidate.node, "itemExpanded", String(candidate === record && expanded));
			if (expanded) safeCall(() => record.node.scrollIntoView({
				block: "nearest",
				inline: "nearest"
			}), void 0);
		}
		function setStackExpanded(expanded) {
			const records = getStackRecords();
			if (!state.config.stacked || records.length <= 1) {
				state.stackExpanded = false;
				for (const record of records) setDataValue(record.node, "itemExpanded", "false");
				syncStackLayout();
				return;
			}
			state.stackExpanded = Boolean(expanded);
			if (state.stackExpanded) {
				let alreadyExpanded = false;
				for (const record of records) if (record.node.dataset.itemExpanded === "true") {
					alreadyExpanded = true;
					break;
				}
				if (!alreadyExpanded) {
					const newest = records[records.length - 1];
					if (newest) setExpandedToast(newest, true);
				}
			} else for (const record of records) setDataValue(record.node, "itemExpanded", "false");
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
			const record = state.recordsByNode.get(node);
			return record && !record.removed ? record : null;
		}
		function handleStackClick(event) {
			if (!state.config.stacked || eventHasInteractiveTarget(event)) return;
			const target = event.target;
			const toastNode = isElementLike(target) ? target.closest(".rod-toast") : null;
			if (!toastNode || toastNode.dataset.suppressStackClick === "true") return;
			const record = getToastRecordByNode(toastNode);
			if (!record) return;
			if (!state.stackExpanded) {
				if (state.toasts.length <= 1 || toastNode.dataset.stackIndex !== "0") return;
				setStackExpanded(true);
				setExpandedToast(record, true);
				return;
			}
			toggleExpandedToast(record);
		}
		function applyHostDominanceStyles(hostElement) {
			const importantStyles = [
				["all", "initial"],
				["position", "fixed"],
				["inset", "0"],
				["top", "0"],
				["right", "0"],
				["bottom", "0"],
				["left", "0"],
				["width", "0"],
				["height", "0"],
				["min-width", "0"],
				["min-height", "0"],
				["max-width", "none"],
				["max-height", "none"],
				["margin", "0"],
				["padding", "0"],
				["border", "0"],
				["outline", "0"],
				["background", "transparent"],
				["overflow", "visible"],
				["visibility", "visible"],
				["opacity", "1"],
				["clip", "auto"],
				["clip-path", "none"],
				["filter", "none"],
				["transform", "none"],
				["perspective", "none"],
				["mask", "none"],
				["mix-blend-mode", "normal"],
				["isolation", "isolate"],
				["z-index", String(MAX_Z_INDEX)],
				["pointer-events", "none"]
			];
			for (const [property, value] of importantStyles) if (hostElement.style.getPropertyValue(property) !== value || hostElement.style.getPropertyPriority(property) !== "important") hostElement.style.setProperty(property, value, "important");
		}
		function isHostInTopLayer(hostElement = state.hostElement) {
			if (!hostElement?.isConnected) return false;
			return safeCall(() => hostElement.matches(":popover-open"), false);
		}
		function disableHostTopLayer() {
			const hostElement = state.hostElement;
			state.topLayerCleanup?.();
			state.topLayerCleanup = null;
			state.topLayerObserver?.disconnect();
			state.topLayerObserver = null;
			if (hostElement) {
				if (isHostInTopLayer(hostElement)) safeCall(() => hostElement.hidePopover?.(), void 0);
				hostElement.removeAttribute("popover");
				hostElement.dataset.rodToasterTopLayer = "z-index";
				applyHostDominanceStyles(hostElement);
			}
			state.topLayerActive = false;
		}
		function promoteHostToTopLayer(reorder = false) {
			const hostElement = state.hostElement;
			if (!hostElement?.isConnected) {
				state.topLayerActive = false;
				return false;
			}
			applyHostDominanceStyles(hostElement);
			if (!state.config.useTopLayer || typeof hostElement.showPopover !== "function") {
				hostElement.dataset.rodToasterTopLayer = "z-index";
				state.topLayerActive = false;
				return false;
			}
			hostElement.setAttribute("popover", "manual");
			const wasOpen = isHostInTopLayer(hostElement);
			if (reorder && wasOpen) safeCall(() => hostElement.hidePopover?.(), void 0);
			if (!isHostInTopLayer(hostElement)) safeCall(() => hostElement.showPopover?.(), void 0);
			state.topLayerActive = isHostInTopLayer(hostElement);
			hostElement.dataset.rodToasterTopLayer = state.topLayerActive ? "popover" : "z-index";
			return state.topLayerActive;
		}
		function installTopLayerGuard(hostWindow, hostDocument) {
			state.topLayerCleanup?.();
			state.topLayerCleanup = null;
			state.topLayerObserver?.disconnect();
			state.topLayerObserver = null;
			if (!state.config.useTopLayer || !state.hostElement) {
				promoteHostToTopLayer(false);
				return;
			}
			const promoteAfterExternalTopLayerChange = (event) => {
				if (!state.toasts.length) return;
				const toggleEvent = event;
				if (event.target === state.hostElement) {
					hostWindow.queueMicrotask(() => {
						if (state.toasts.length && !isHostInTopLayer()) promoteHostToTopLayer(false);
					});
					return;
				}
				if (typeof toggleEvent.newState === "string" && toggleEvent.newState !== "open") return;
				hostWindow.queueMicrotask(() => {
					if (state.toasts.length) promoteHostToTopLayer(true);
				});
			};
			hostDocument.addEventListener("toggle", promoteAfterExternalTopLayerChange, true);
			hostDocument.addEventListener("fullscreenchange", promoteAfterExternalTopLayerChange, true);
			hostDocument.addEventListener("webkitfullscreenchange", promoteAfterExternalTopLayerChange, true);
			if (typeof hostWindow.MutationObserver === "function" && hostDocument.documentElement) {
				const observer = new hostWindow.MutationObserver((mutations) => {
					for (const mutation of mutations) {
						const target = mutation.target;
						if (isElementLike(target) && target !== state.hostElement && target.matches("dialog[open]")) {
							hostWindow.queueMicrotask(() => {
								if (state.toasts.length) promoteHostToTopLayer(true);
							});
							break;
						}
					}
				});
				observer.observe(hostDocument.documentElement, {
					subtree: true,
					attributes: true,
					attributeFilter: ["open"]
				});
				state.topLayerObserver = observer;
			}
			state.topLayerCleanup = () => {
				hostDocument.removeEventListener("toggle", promoteAfterExternalTopLayerChange, true);
				hostDocument.removeEventListener("fullscreenchange", promoteAfterExternalTopLayerChange, true);
				hostDocument.removeEventListener("webkitfullscreenchange", promoteAfterExternalTopLayerChange, true);
				state.topLayerObserver?.disconnect();
				state.topLayerObserver = null;
				state.topLayerCleanup = null;
			};
			promoteHostToTopLayer(false);
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
				if (state.toasts.length) {
					ensureHost();
					promoteHostToTopLayer(false);
				}
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
			const pageHideHandler = () => {
				flushTaskSnapshots();
			};
			hostWindow.addEventListener("pagehide", pageHideHandler);
			callbacks.push(() => hostWindow.removeEventListener("pagehide", pageHideHandler));
			const patchedWindow = hostWindow;
			if (!safeCall(() => Boolean(patchedWindow[HISTORY_PATCH_SYMBOL]), false)) {
				const history = hostWindow.history;
				const originals = {};
				const patchedMethods = {};
				for (const methodName of ["pushState", "replaceState"]) {
					const original = history[methodName];
					originals[methodName] = original;
					const patched = function patchedHistoryMethod(data, unused, url) {
						Reflect.apply(original, this, [
							data,
							unused,
							url
						]);
						safeCall(() => hostWindow.dispatchEvent(new hostWindow.CustomEvent("rod:toaster:navigation")), false);
					};
					patchedMethods[methodName] = patched;
					history[methodName] = patched;
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
						const patched = patchedMethods[methodName];
						if (original && patched && history[methodName] === patched) history[methodName] = original;
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
					if (state.toasts.length && state.hostElement && !state.hostElement.isConnected) scheduleHostRepair();
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
			state.topLayerCleanup?.();
			state.topLayerCleanup = null;
			state.topLayerObserver?.disconnect();
			state.topLayerObserver = null;
			state.topLayerActive = false;
			state.inspectorRuntime?.clearHighlight?.();
			state.themeCleanup?.();
			state.themeCleanup = null;
			state.themeMediaQuery = null;
			if (!options.keepPersistence) state.spaCleanup?.();
			if (state.idleDestroyTimer !== null) {
				(state.hostWindow ?? initialHostWindow).clearTimeout(state.idleDestroyTimer);
				state.idleDestroyTimer = null;
			}
			state.hostElement?.remove();
			state.hostElement = null;
			state.shadowRoot = null;
			state.renderRoot = null;
			state.hostMode = null;
			state.container = null;
			state.managerNode = null;
			state.managerCountNode = null;
			state.list = null;
			state.interactionList = null;
			state.toolbar = null;
			state.stackCountNode = null;
			state.inspectorRuntime = null;
			state.inspectorStyle = null;
			state.stackExpanded = false;
			state.managerMinimized = false;
		}
		function handleHostIdle() {
			if (state.toasts.length || !state.hostElement) return;
			if (isHostInTopLayer()) safeCall(() => state.hostElement.hidePopover?.(), void 0);
			state.topLayerActive = false;
			state.hostElement.dataset.rodToasterTopLayer = "idle";
			if (state.idleDestroyTimer !== null) {
				(state.hostWindow ?? initialHostWindow).clearTimeout(state.idleDestroyTimer);
				state.idleDestroyTimer = null;
			}
			const ttl = Math.max(0, Number(state.config.idleHostTtl) || 0);
			if (ttl > 0) state.idleDestroyTimer = (state.hostWindow ?? initialHostWindow).setTimeout(() => {
				state.idleDestroyTimer = null;
				if (!state.toasts.length) destroyHost({ keepPersistence: state.config.persistAcrossSpaNavigation });
			}, ttl);
		}
		function cancelIdleHostDestroy() {
			if (state.idleDestroyTimer !== null) {
				(state.hostWindow ?? initialHostWindow).clearTimeout(state.idleDestroyTimer);
				state.idleDestroyTimer = null;
			}
		}
		function ensureHost() {
			if (state.hostElement?.isConnected && state.hostWindow && state.hostDocument && state.container && state.list && state.interactionList) {
				applyHostDominanceStyles(state.hostElement);
				promoteHostToTopLayer(false);
				return {
					window: state.hostWindow,
					document: state.hostDocument,
					container: state.container,
					list: state.list,
					interactionList: state.interactionList
				};
			}
			const hostWindow = getHighestAccessibleWindow(globalWindow);
			const hostDocument = safeCall(() => hostWindow.document, null);
			if (!hostDocument) return null;
			const parent = hostDocument.documentElement ?? hostDocument.body;
			if (!parent) return null;
			if (state.hostElement && !state.hostElement.isConnected && state.hostDocument === hostDocument && state.container && state.list && state.interactionList) {
				applyHostDominanceStyles(state.hostElement);
				parent.appendChild(state.hostElement);
				installTopLayerGuard(hostWindow, hostDocument);
				installSpaPersistence(hostWindow, hostDocument);
				promoteHostToTopLayer(true);
				syncStackLayout();
				return {
					window: state.hostWindow ?? hostWindow,
					document: state.hostDocument,
					container: state.container,
					list: state.list,
					interactionList: state.interactionList
				};
			}
			if (state.hostElement?.isConnected) destroyHost();
			else removeHostInteractionListeners();
			const hostElement = hostDocument.createElement("div");
			hostElement.id = TOAST_HOST_ID;
			if (state.config.useTopLayer && typeof hostElement.showPopover === "function") hostElement.setAttribute("popover", "manual");
			applyHostDominanceStyles(hostElement);
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
			const interactionList = hostDocument.createElement("div");
			const list = hostDocument.createElement("div");
			container.className = "rod-toast-stack";
			container.dataset.position = state.config.position;
			container.dataset.theme = state.resolvedTheme;
			container.dataset.size = state.config.size;
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
				let delayIndex = 0;
				const records = getStackRecords();
				for (let index = records.length - 1; index >= 0; index -= 1) {
					const record = records[index];
					hostWindow.setTimeout(() => record.dismiss(false, null, "dismissAll"), delayIndex * 28);
					delayIndex += 1;
				}
			});
			toolbarActions.append(minimizeButton, collapseButton, clearButton);
			toolbar.append(toolbarLabel, toolbarActions);
			interactionList.className = "rod-toast-stack__interactions";
			list.className = "rod-toast-stack__list";
			container.append(interactionList, managerButton, toolbar, list);
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
			state.interactionList = interactionList;
			state.toolbar = toolbar;
			state.stackCountNode = toolbarLabel;
			installThemeObserver();
			syncTheme();
			installTopLayerGuard(hostWindow, hostDocument);
			promoteHostToTopLayer(true);
			installSpaPersistence(hostWindow, hostDocument);
			for (let index = state.toasts.length - 1; index >= 0; index -= 1) {
				const record = state.toasts[index];
				if (!record.node.isConnected) (record.options.lane === "interaction" ? interactionList : list).append(record.node);
			}
			const inspectorApi = getObjectInspectorApi();
			if (inspectorApi) state.inspectorApi = inspectorApi;
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
			syncDialogStack();
			syncStackLayout();
			return {
				window: hostWindow,
				document: hostDocument,
				container,
				list,
				interactionList
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
				lane: options.lane === "interaction" || options.lane === "task" || options.lane === "notification" ? options.lane : loading ? "task" : "notification",
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
			if (record.options.lane === "interaction") unregisterDialog(record);
		}
		function enforceToastLimit(incoming) {
			if (incoming.lane !== "notification") return;
			const limit = Math.max(1, state.config.maxToasts);
			let notifications = getNotificationRecords();
			while (notifications.length >= limit) {
				const candidate = notifications.find((record) => record.options.duration > 0) ?? notifications[0];
				if (!candidate) break;
				candidate.dismiss(true, null, "limit");
				notifications = getNotificationRecords();
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
			if (iconValue === false) {
				if (node.childNodes.length) node.replaceChildren();
				node.dataset.rodIconKey = "false";
				node.dataset.rodIconKind = "none";
				return false;
			}
			const imageDescriptor = getImageIconDescriptor(iconValue);
			if (imageDescriptor) {
				const normalized = normalizeImageIconDescriptor(imageDescriptor);
				const key = `image:${iconKeyHash([
					String(normalized.src),
					normalized.fit === "contain" ? "contain" : "cover",
					normalized.objectPosition || "center",
					normalized.crossOrigin ?? "",
					normalized.referrerPolicy ?? "",
					normalized.decoding ?? "async",
					normalized.loading ?? "eager"
				].join("|"))}`;
				if (state.failedImageKeys.has(key)) {
					const fallbackKey = `failed:${key}:svg:${fallbackName}`;
					if (node.dataset.rodIconKey !== fallbackKey || !node.firstChild) {
						node.replaceChildren(createSvgIcon(documentRef, fallbackName, 17));
						node.dataset.rodIconKey = fallbackKey;
					}
					node.dataset.rodIconKind = "svg";
					return true;
				}
				if (node.dataset.rodIconKey === key && node.firstChild) {
					node.dataset.rodIconKind = "image";
					return true;
				}
				const image = createImageIcon(documentRef, normalized);
				image.addEventListener("error", () => {
					state.failedImageKeys.add(key);
					if (node.dataset.rodIconKey !== key) return;
					node.replaceChildren(createSvgIcon(documentRef, fallbackName, 17));
					node.dataset.rodIconKey = `failed:${key}:svg:${fallbackName}`;
					node.dataset.rodIconKind = "svg";
				}, { once: true });
				node.replaceChildren(image);
				node.dataset.rodIconKey = key;
				node.dataset.rodIconKind = "image";
				return true;
			}
			if (isDomNode(iconValue)) {
				node.replaceChildren(iconValue.cloneNode(true));
				node.dataset.rodIconKey = `node:${getObjectId(iconValue)}`;
				node.dataset.rodIconKind = "node";
				return true;
			}
			const iconName = typeof iconValue === "string" && hasOwn(SVG_ICONS, iconValue) ? iconValue : fallbackName;
			const key = `svg:${iconName}`;
			if (node.dataset.rodIconKey === key && node.firstChild) {
				node.dataset.rodIconKind = "svg";
				return true;
			}
			node.replaceChildren(createSvgIcon(documentRef, iconName, 17));
			node.dataset.rodIconKey = key;
			node.dataset.rodIconKind = "svg";
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
			const options = normalizeToastOptions(rawOptions);
			cancelIdleHostDestroy();
			const host = ensureHost();
			if (!host) {
				safeCall(() => console.log(`[${String(rawOptions.type ?? "toast")}]`, ...args), void 0);
				return null;
			}
			if (options.id) {
				const existing = state.recordsById.get(options.id);
				if (existing && !existing.removed) existing.dismiss(true, null, "replaced");
			}
			enforceToastLimit(options);
			const palette = getToastPalette(options.type);
			const node = host.document.createElement("div");
			const icon = host.document.createElement("div");
			const content = host.document.createElement("div");
			const actions = host.document.createElement("div");
			const count = host.document.createElement("div");
			let loadingCopy = null;
			let loadingTitle = null;
			let loadingDescription = null;
			let progressMeta = null;
			let progressBar = null;
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
			node.dataset.itemExpanded = "false";
			node.dataset.lane = options.lane;
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
			const ensureLoadingNodes = () => {
				if (loadingCopy && loadingTitle && loadingDescription && progressMeta && progressBar) return {
					copy: loadingCopy,
					title: loadingTitle,
					description: loadingDescription,
					progressMeta,
					progressBar
				};
				const progress = host.document.createElement("div");
				const progressTrack = host.document.createElement("div");
				loadingCopy = host.document.createElement("div");
				loadingTitle = host.document.createElement("div");
				loadingDescription = host.document.createElement("div");
				progressMeta = host.document.createElement("div");
				progressBar = host.document.createElement("div");
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
				return {
					copy: loadingCopy,
					title: loadingTitle,
					description: loadingDescription,
					progressMeta,
					progressBar
				};
			};
			const renderLoading = (nextOptions) => {
				const loadingUi = ensureLoadingNodes();
				const hasTitle = Boolean(nextOptions.title);
				const hasDescription = Boolean(nextOptions.description);
				const hasProgress = nextOptions.animation === "progress";
				const contentEmpty = !hasTitle && !hasDescription && !hasProgress;
				const fallbackIcon = nextOptions.loadingState === "settled" ? TOAST_COLORS[nextOptions.type].icon : state.config.loadingIcon || "loader-circle";
				const hasIcon = setToastIcon(icon, host.document, nextOptions.icon, fallbackIcon);
				setDataValue(node, "loading", "true");
				setDataValue(node, "loadingState", nextOptions.loadingState);
				setDataValue(node, "loadingAnimation", nextOptions.animation);
				setDataValue(node, "loadingIcon", String(hasIcon));
				setDataValue(node, "loadingContentEmpty", String(contentEmpty));
				setDataValue(node, "loadingIndeterminate", String(hasProgress && nextOptions.progress === null));
				setDataValue(icon, "loadingSpinner", String(nextOptions.loadingState === "loading" && nextOptions.animation === "spinner"));
				setDataValue(icon, "loadingPulse", String(nextOptions.loadingState === "loading" && nextOptions.animation === "pulse"));
				setTextValue(loadingUi.title, nextOptions.title);
				if (loadingUi.title.hidden === hasTitle) loadingUi.title.hidden = !hasTitle;
				setTextValue(loadingUi.description, nextOptions.description);
				if (loadingUi.description.hidden === hasDescription) loadingUi.description.hidden = !hasDescription;
				const progressPercent = nextOptions.progress === null ? 0 : Math.round(nextOptions.progress * 100);
				const progressValue = `${progressPercent}%`;
				if (node.style.getPropertyValue("--rod-loading-progress") !== progressValue) node.style.setProperty("--rod-loading-progress", progressValue);
				const progressText = nextOptions.progressLabel ?? (nextOptions.progress === null ? "" : `${progressPercent}%`);
				setTextValue(loadingUi.progressMeta, progressText);
				const hideProgressMeta = !progressText || nextOptions.animation !== "progress";
				if (loadingUi.progressMeta.hidden !== hideProgressMeta) loadingUi.progressMeta.hidden = hideProgressMeta;
				if (content.firstChild !== loadingUi.copy || content.childNodes.length !== 1) content.replaceChildren(loadingUi.copy);
			};
			const renderArgs = (nextArgs, nextOptions) => {
				if (nextOptions.loading) {
					renderLoading(nextOptions);
					return;
				}
				setDataValue(node, "loading", "false");
				setDataValue(node, "loadingState", "");
				setDataValue(node, "loadingAnimation", "");
				setDataValue(node, "loadingIcon", "true");
				setDataValue(node, "loadingContentEmpty", "false");
				setDataValue(node, "loadingIndeterminate", "false");
				setDataValue(icon, "loadingSpinner", "false");
				setDataValue(icon, "loadingPulse", "false");
				setToastIcon(icon, host.document, nextOptions.icon, TOAST_COLORS[nextOptions.type].icon);
				const nextContent = host.document.createDocumentFragment();
				for (const value of nextArgs) {
					const wrapper = host.document.createElement("span");
					wrapper.className = "rod-toast__arg";
					wrapper.append(renderToastValue(value, host.document, nextOptions));
					nextContent.append(wrapper);
				}
				content.replaceChildren(nextContent);
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
				if (options.loading && options.loadingState === "loading") state.activeLoadingCount = Math.max(0, state.activeLoadingCount - 1);
				const dismissEvent = {
					reason: dismissReason,
					record,
					controller,
					scope: options.scope
				};
				removeRecord(record);
				state.recordsByNode.delete(node);
				node.remove();
				syncStackLayout();
				if (hasEventListeners("dismiss")) emitEvent("dismiss", dismissEvent);
				safeCall(() => options.onDismiss?.(dismissEvent), void 0);
				if (!state.toasts.length) handleHostIdle();
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
				const shouldEmitUpdate = hasEventListeners("update");
				const previous = shouldEmitUpdate ? { ...options } : null;
				const wasActiveLoading = options.loading && options.loadingState === "loading";
				const nextOptions = normalizeToastOptions({
					...options,
					...nextRawOptions
				});
				const isActiveLoading = nextOptions.loading && nextOptions.loadingState === "loading";
				if (wasActiveLoading !== isActiveLoading) state.activeLoadingCount = Math.max(0, state.activeLoadingCount + (isActiveLoading ? 1 : -1));
				Object.assign(options, nextOptions);
				applyToastPalette(node, nextOptions.type);
				if (node.getAttribute("role") !== nextOptions.role) node.setAttribute("role", nextOptions.role);
				renderArgs(nextArgs, nextOptions);
				resetTimer(nextOptions.duration);
				if (shouldEmitUpdate && previous) emitEvent("update", {
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
						animation: next.animation ?? "progress"
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
			if (options.lane !== "interaction") {
				actions.append(createMinimizeButton(host.document));
				actions.append(createExpandButton(host.document, () => record));
			}
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
				if (options.lane === "interaction" || event.key !== "Escape") return;
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
			(options.lane === "interaction" ? host.interactionList : host.list).prepend(node);
			state.toasts.push(record);
			state.recordsByNode.set(node, record);
			if (options.id) state.recordsById.set(options.id, record);
			if (options.lane !== "interaction") {
				if (getStackRecords().length >= Math.max(2, Number(state.config.stackAutoCollapseThreshold) || 6)) state.stackExpanded = false;
			}
			promoteHostToTopLayer(true);
			if (options.loading && options.loadingState === "loading") state.activeLoadingCount += 1;
			if (hasEventListeners("create")) emitEvent("create", {
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
		function showMultiLoadingToast(descriptor = {}) {
			const options = isPlainObject(descriptor) ? { ...descriptor } : {};
			const created = createToastRecord([], {
				...options,
				lane: "task",
				title: "",
				description: "",
				icon: false,
				loading: false,
				duration: 0,
				dedupe: false,
				closeButton: false,
				swipeToDismiss: false,
				pauseOnInteraction: false,
				role: options.role ?? "status",
				metadata: {
					...options.metadata ?? {},
					multiLoading: true
				}
			});
			if (!created) return null;
			const { controller: toastController, record } = created;
			const node = toastController.element;
			const content = node.querySelector(".rod-toast__content");
			if (!content) {
				toastController.dismiss("unavailable", true);
				return null;
			}
			const documentRef = node.ownerDocument;
			const hostWindow = state.hostWindow ?? initialHostWindow;
			const root = documentRef.createElement("div");
			const header = documentRef.createElement("div");
			const heading = documentRef.createElement("div");
			const titleNode = documentRef.createElement("div");
			const summaryNode = documentRef.createElement("div");
			const aggregate = documentRef.createElement("div");
			const aggregateMeta = documentRef.createElement("div");
			const aggregatePercent = documentRef.createElement("span");
			const aggregateCount = documentRef.createElement("span");
			const aggregateTrack = documentRef.createElement("div");
			const aggregateBar = documentRef.createElement("div");
			const headerActions = documentRef.createElement("div");
			const clearButton = documentRef.createElement("button");
			const cancelAllButton = documentRef.createElement("button");
			const list = documentRef.createElement("div");
			const empty = documentRef.createElement("div");
			const items = /* @__PURE__ */ new Map();
			const aggregateProgressById = /* @__PURE__ */ new Map();
			const aggregateCompletedIds = /* @__PURE__ */ new Set();
			let nextId = 1;
			let dismissed = false;
			node.dataset.multiLoading = "true";
			root.className = "rod-multi-loading";
			header.className = "rod-multi-loading__header";
			heading.className = "rod-multi-loading__heading";
			titleNode.className = "rod-multi-loading__title";
			summaryNode.className = "rod-multi-loading__summary";
			aggregate.className = "rod-multi-loading__aggregate";
			aggregateMeta.className = "rod-multi-loading__aggregate-meta";
			aggregatePercent.className = "rod-multi-loading__aggregate-percent";
			aggregateCount.className = "rod-multi-loading__aggregate-count";
			aggregateTrack.className = "rod-multi-loading__aggregate-track";
			aggregateBar.className = "rod-multi-loading__aggregate-bar";
			headerActions.className = "rod-multi-loading__header-actions";
			list.className = "rod-multi-loading__list";
			empty.className = "rod-multi-loading__empty";
			empty.textContent = String(options.emptyLabel ?? "No active operations.");
			titleNode.textContent = String(options.title ?? "Processing items");
			heading.append(titleNode, summaryNode);
			const configureHeaderButton = (button, icon, label, action) => {
				button.type = "button";
				button.className = "rod-multi-loading__header-button";
				button.dataset.action = action;
				button.append(createSvgIcon(documentRef, icon, 13));
				const span = documentRef.createElement("span");
				span.textContent = label;
				button.append(span);
			};
			configureHeaderButton(clearButton, "check", "Clear done", "clear");
			configureHeaderButton(cancelAllButton, "x-circle", String(options.cancelAllLabel ?? "Cancel all"), "cancel-all");
			headerActions.append(clearButton, cancelAllButton);
			header.append(heading, headerActions);
			aggregateMeta.append(aggregatePercent, aggregateCount);
			aggregateTrack.append(aggregateBar);
			aggregate.append(aggregateMeta, aggregateTrack);
			root.append(header, aggregate, list);
			content.replaceChildren(root);
			const viewportRatio = clamp(Number(options.viewportRatio) || .5, .2, .5);
			const rawMaxHeight = options.maxHeight;
			const maxHeight = typeof rawMaxHeight === "number" ? `${Math.max(160, rawMaxHeight)}px` : typeof rawMaxHeight === "string" && rawMaxHeight.trim() ? rawMaxHeight : `min(${Math.round(viewportRatio * 100)}dvh,520px)`;
			root.style.setProperty("--rod-multi-max-height", maxHeight);
			root.style.setProperty("--rod-multi-list-height", `min(${Math.max(16, Math.round(viewportRatio * 100) - 8)}dvh,440px)`);
			const successDuration = Math.max(400, Number(options.successDuration) || 2200);
			const successMorphDelay = Math.max(0, Number(options.successMorphDelay) || 220);
			const successFadeDuration = Math.max(180, Number(options.successFadeDuration) || 420);
			const cancelledDuration = Math.max(120, Number(options.cancelledDuration) || 650);
			const globalCancellable = options.cancellable !== false;
			const snapshot = (item) => ({
				id: item.id,
				title: item.title,
				description: item.description,
				status: item.status,
				progress: item.progress,
				progressLabel: item.progressLabel,
				metadata: { ...item.metadata },
				error: item.error
			});
			const counts = () => {
				let active = 0;
				let success = 0;
				let error = 0;
				let cancelled = 0;
				for (const item of items.values()) {
					if (item.removing) continue;
					if (item.status === "success") success += 1;
					else if (item.status === "error") error += 1;
					else if (item.status === "cancelled") cancelled += 1;
					else active += 1;
				}
				return {
					active,
					success,
					error,
					cancelled,
					total: items.size
				};
			};
			const syncAggregate = () => {
				const total = aggregateProgressById.size;
				let contribution = 0;
				for (const progress of aggregateProgressById.values()) contribution += progress;
				const normalized = total > 0 ? clamp(contribution / total, 0, 1) : 0;
				const percent = Math.round(normalized * 100);
				const completed = aggregateCompletedIds.size;
				aggregate.style.setProperty("--rod-multi-aggregate-progress", `${percent}%`);
				aggregatePercent.textContent = `${percent}% concluído`;
				aggregateCount.textContent = `${completed} de ${total} ${total === 1 ? "item" : "itens"}`;
				aggregateTrack.setAttribute("aria-valuemin", "0");
				aggregateTrack.setAttribute("aria-valuemax", "100");
				aggregateTrack.setAttribute("aria-valuenow", String(percent));
				aggregateTrack.setAttribute("role", "progressbar");
				aggregateTrack.setAttribute("aria-label", `Progresso total: ${percent}%`);
			};
			const syncSummary = () => {
				const current = counts();
				syncAggregate();
				if (options.showSummary === false) summaryNode.hidden = true;
				else {
					summaryNode.hidden = false;
					const parts = [];
					if (current.active) parts.push(`${current.active} active`);
					if (current.error) parts.push(`${current.error} failed`);
					if (current.success) parts.push(`${current.success} done`);
					if (current.cancelled) parts.push(`${current.cancelled} cancelled`);
					summaryNode.textContent = parts.length ? parts.join(" · ") : "All operations completed";
				}
				clearButton.disabled = current.success === 0 && current.cancelled === 0;
				cancelAllButton.disabled = current.active === 0;
				list.dataset.empty = String(items.size === 0);
				if (!items.size) {
					if (!empty.isConnected) list.append(empty);
				} else empty.remove();
				if (options.autoDismiss !== false && current.total > 0 && current.active === 0 && current.error === 0) hostWindow.setTimeout(() => {
					if (!dismissed && counts().active === 0 && counts().error === 0) toastController.dismiss("multi-complete");
				}, successDuration + successFadeDuration + 120);
			};
			const setLead = (item, icon, spin = false) => {
				item.lead.dataset.spin = "false";
				item.lead.replaceChildren();
				const imageDescriptor = getImageIconDescriptor(icon);
				if (imageDescriptor) item.lead.append(createImageIcon(documentRef, imageDescriptor));
				else {
					const name = typeof icon === "string" && hasOwn(SVG_ICONS, icon) ? icon : "circle";
					item.lead.append(createSvgIcon(documentRef, name, 15));
				}
				item.lead.dataset.spin = String(spin && !imageDescriptor);
			};
			const renderItem = (item) => {
				item.node.dataset.status = item.status;
				item.titleNode.textContent = item.title;
				item.descriptionNode.textContent = item.description;
				item.descriptionNode.hidden = !item.description;
				const percent = item.progress === null ? 0 : Math.round(item.progress * 100);
				item.node.style.setProperty("--rod-multi-progress", `${percent}%`);
				item.progressLabelNode.textContent = item.progressLabel ?? (item.progress === null ? "" : `${percent}%`);
				item.progressNode.hidden = item.progress === null || item.status === "success" || item.status === "error" || item.status === "cancelled";
				item.retryButton.hidden = item.status !== "error" || typeof item.descriptor.retry !== "function";
				item.cancelButton.hidden = !globalCancellable || item.descriptor.cancellable === false || item.status === "success" || item.status === "cancelled";
				if (item.status === "success") setLead(item, "check", false);
				else if (item.status === "error") setLead(item, "circle-x", false);
				else if (item.status === "cancelled") setLead(item, "x", false);
				else {
					const persistentIcon = item.descriptor.icon ?? "loader-circle";
					setLead(item, persistentIcon, item.status === "loading" && !getImageIconDescriptor(persistentIcon));
				}
				syncSummary();
			};
			const removeItem = (item, immediate = false) => {
				if (item.removing) return;
				item.removing = true;
				if (item.successTimer !== null) hostWindow.clearTimeout(item.successTimer);
				if (immediate) {
					item.node.remove();
					items.delete(item.id);
					syncSummary();
					return;
				}
				item.node.dataset.removing = "true";
				hostWindow.setTimeout(() => {
					item.node.remove();
					items.delete(item.id);
					syncSummary();
				}, successFadeDuration + 40);
			};
			const completeSuccess = (item) => {
				if (item.successTimer !== null) hostWindow.clearTimeout(item.successTimer);
				item.successTimer = hostWindow.setTimeout(() => {
					if (!item.node.isConnected || item.status !== "success") return;
					item.node.dataset.successMorph = "true";
					item.successTimer = hostWindow.setTimeout(() => removeItem(item, false), successDuration);
				}, successMorphDelay);
			};
			let api;
			const makeItem = (source = {}) => {
				const id = String(source.id ?? `item-${nextId++}`);
				const existing = items.get(id);
				if (existing) return existing;
				const itemNode = documentRef.createElement("div");
				const lead = documentRef.createElement("div");
				const copy = documentRef.createElement("div");
				const itemTitle = documentRef.createElement("div");
				const description = documentRef.createElement("div");
				const progress = documentRef.createElement("div");
				const track = documentRef.createElement("div");
				const bar = documentRef.createElement("div");
				const progressLabel = documentRef.createElement("span");
				const actions = documentRef.createElement("div");
				const retry = documentRef.createElement("button");
				const cancel = documentRef.createElement("button");
				itemNode.className = "rod-multi-loading__item";
				itemNode.dataset.multiItemId = id;
				lead.className = "rod-multi-loading__lead";
				copy.className = "rod-multi-loading__copy";
				itemTitle.className = "rod-multi-loading__item-title";
				description.className = "rod-multi-loading__item-description";
				progress.className = "rod-multi-loading__progress";
				track.className = "rod-multi-loading__track";
				bar.className = "rod-multi-loading__bar";
				progressLabel.className = "rod-multi-loading__progress-label";
				actions.className = "rod-multi-loading__actions";
				retry.className = "rod-multi-loading__button";
				cancel.className = "rod-multi-loading__button";
				retry.dataset.action = "retry";
				cancel.dataset.action = "cancel";
				retry.type = cancel.type = "button";
				retry.append(createSvgIcon(documentRef, "refresh", 13));
				const retryLabel = documentRef.createElement("span");
				retryLabel.textContent = "Retry";
				retry.append(retryLabel);
				cancel.append(createSvgIcon(documentRef, "x", 14));
				cancel.setAttribute("aria-label", `Cancel ${id}`);
				cancel.title = "Cancel";
				track.append(bar);
				progress.append(track, progressLabel);
				copy.append(itemTitle, description, progress);
				actions.append(retry, cancel);
				itemNode.append(lead, copy, actions);
				const item = {
					descriptor: { ...source },
					id,
					title: String(source.title ?? `Item ${items.size + 1}`),
					description: String(source.description ?? ""),
					status: source.status ?? "queued",
					progress: normalizeProgress(source.progress),
					progressLabel: source.progressLabel == null ? null : String(source.progressLabel),
					metadata: isUnknownRecord(source.metadata) ? { ...source.metadata } : {},
					error: source.error ?? null,
					abortController: new AbortController(),
					node: itemNode,
					lead,
					copy,
					titleNode: itemTitle,
					descriptionNode: description,
					progressNode: progress,
					progressLabelNode: progressLabel,
					actionsNode: actions,
					retryButton: retry,
					cancelButton: cancel,
					successTimer: null,
					removing: false,
					running: false
				};
				retry.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					api.retry(id);
				});
				cancel.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					api.cancel(id, "user");
				});
				items.set(id, item);
				aggregateProgressById.set(id, item.status === "success" ? 1 : item.progress ?? 0);
				if (item.status === "success") aggregateCompletedIds.add(id);
				list.append(itemNode);
				renderItem(item);
				return item;
			};
			const patchItem = (item, next = {}) => {
				item.descriptor = {
					...item.descriptor,
					...next
				};
				if (hasOwn(next, "title")) item.title = String(next.title ?? "");
				if (hasOwn(next, "description")) item.description = String(next.description ?? "");
				if (hasOwn(next, "status") && next.status) item.status = next.status;
				if (hasOwn(next, "progress")) item.progress = normalizeProgress(next.progress);
				if (hasOwn(next, "progressLabel")) item.progressLabel = next.progressLabel == null ? null : String(next.progressLabel);
				if (hasOwn(next, "error")) item.error = next.error;
				if (isUnknownRecord(next.metadata)) item.metadata = {
					...item.metadata,
					...next.metadata
				};
				const aggregateProgress = item.status === "success" ? 1 : item.progress ?? 0;
				aggregateProgressById.set(item.id, clamp(aggregateProgress, 0, 1));
				if (item.status === "success") aggregateCompletedIds.add(item.id);
				else aggregateCompletedIds.delete(item.id);
				renderItem(item);
			};
			api = {
				get id() {
					return toastController.id;
				},
				get element() {
					return node;
				},
				get size() {
					return items.size;
				},
				get activeCount() {
					return counts().active;
				},
				get errorCount() {
					return counts().error;
				},
				get successCount() {
					return counts().success;
				},
				add(source = {}) {
					makeItem(source);
					syncSummary();
					return api;
				},
				update(id, next = {}) {
					const item = items.get(String(id));
					if (!item || item.removing) return api;
					patchItem(item, next);
					return api;
				},
				progress(id, value, next = {}) {
					const item = items.get(String(id));
					if (!item || item.removing || item.status === "success" || item.status === "cancelled") return api;
					patchItem(item, {
						...next,
						status: "loading",
						progress: value
					});
					return api;
				},
				success(id, next = {}) {
					const item = items.get(String(id));
					if (!item || item.removing || item.status === "cancelled") return api;
					patchItem(item, {
						...next,
						status: "success",
						progress: 1,
						error: null
					});
					safeCall(() => options.onItemSuccess?.(snapshot(item)), void 0);
					completeSuccess(item);
					return api;
				},
				error(id, error, next = {}) {
					const item = items.get(String(id));
					if (!item || item.removing || item.status === "cancelled") return api;
					patchItem(item, {
						...next,
						status: "error",
						error,
						description: next.description ?? toErrorMessage(error)
					});
					safeCall(() => options.onItemError?.(snapshot(item)), void 0);
					return api;
				},
				async retry(id) {
					const item = items.get(String(id));
					if (!item || item.removing || typeof item.descriptor.retry !== "function" || item.running) return api;
					item.running = true;
					item.retryButton.disabled = true;
					item.abortController = new AbortController();
					patchItem(item, {
						status: "loading",
						error: null,
						progress: null,
						description: item.descriptor.description ?? "Retrying…"
					});
					try {
						await Promise.resolve().then(() => item.descriptor.retry?.({
							id: item.id,
							signal: item.abortController.signal,
							controller: api,
							progress: (value, next = {}) => api.progress(item.id, value, next),
							update: (next = {}) => api.update(item.id, next)
						}));
						if (item.abortController.signal.aborted || item.status === "cancelled") throw createAbortError(item.abortController.signal.reason);
						api.success(item.id, { description: item.descriptor.description ?? "Completed" });
						return api;
					} catch (error) {
						if (!item.abortController.signal.aborted && item.status !== "cancelled") api.error(item.id, error);
						return api;
					} finally {
						item.running = false;
						item.retryButton.disabled = false;
					}
				},
				async cancel(id, reason = "cancelled") {
					const item = items.get(String(id));
					if (!item || item.removing || item.status === "success" || item.status === "cancelled") return api;
					if (!item.abortController.signal.aborted) item.abortController.abort(reason);
					try {
						if (typeof item.descriptor.cancel === "function") await Promise.resolve().then(() => item.descriptor.cancel?.({
							id: item.id,
							signal: item.abortController.signal,
							controller: api,
							reason,
							progress: (value, next = {}) => api.progress(item.id, value, next),
							update: (next = {}) => api.update(item.id, next)
						}));
					} finally {
						patchItem(item, {
							status: "cancelled",
							description: "Cancelled"
						});
						safeCall(() => options.onItemCancel?.(snapshot(item)), void 0);
						hostWindow.setTimeout(() => removeItem(item, false), cancelledDuration);
					}
					return api;
				},
				async cancelAll(reason = "cancel-all") {
					await Promise.allSettled([...items.values()].map((item) => api.cancel(item.id, reason)));
					return api;
				},
				remove(id, immediate = false) {
					const item = items.get(String(id));
					if (item) removeItem(item, immediate);
					return api;
				},
				clearCompleted(immediate = false) {
					for (const item of [...items.values()]) if (item.status === "success" || item.status === "cancelled") removeItem(item, immediate);
					return api;
				},
				get(id) {
					const item = items.get(String(id));
					return item ? snapshot(item) : null;
				},
				getItems() {
					return [...items.values()].map(snapshot);
				},
				async run(id, executor) {
					const key = String(id);
					let item = items.get(key);
					if (!item) item = makeItem({
						id: key,
						status: "queued"
					});
					if (item.running) throw new Error(`Multi loading item ${key} is already running.`);
					item.descriptor.retry = (context) => executor(context);
					item.running = true;
					item.abortController = new AbortController();
					patchItem(item, {
						status: "loading",
						error: null
					});
					try {
						const result = await executor({
							id: item.id,
							signal: item.abortController.signal,
							controller: api,
							progress: (value, next = {}) => api.progress(item.id, value, next),
							update: (next = {}) => api.update(item.id, next)
						});
						if (item.abortController.signal.aborted || item.status === "cancelled") throw createAbortError(item.abortController.signal.reason);
						api.success(item.id);
						return result;
					} catch (error) {
						if (item.abortController.signal.aborted || item.status === "cancelled") {
							if (item.status !== "cancelled") await api.cancel(item.id, item.abortController.signal.reason ?? "aborted");
						} else api.error(item.id, error);
						throw error;
					} finally {
						item.running = false;
					}
				},
				dismiss(reason = "programmatic", immediate = false) {
					dismissed = true;
					for (const item of items.values()) {
						if (!item.abortController.signal.aborted && item.status !== "success" && item.status !== "cancelled") item.abortController.abort(reason);
						if (item.successTimer !== null) hostWindow.clearTimeout(item.successTimer);
					}
					toastController.dismiss(reason, immediate);
				}
			};
			clearButton.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				api.clearCompleted(false);
			});
			cancelAllButton.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				api.cancelAll("user-all");
			});
			for (const item of options.items ?? []) api.add(item);
			syncSummary();
			record.externalUpdate = (next) => {
				if (hasOwn(next, "title")) titleNode.textContent = String(next.title ?? "");
				return toastController;
			};
			syncStackLayout();
			return api;
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
			const previousFocus = safeCall(() => (state.hostDocument ?? initialHostWindow.document).activeElement, null);
			return new Promise((resolve, reject) => {
				let settled = false;
				let actionInFlight = false;
				let countdownTimer = null;
				let remainingSeconds = 0;
				let initialSeconds = 0;
				const cleanupCallbacks = [];
				let getValues = () => ({});
				const created = createToastRecord([], {
					type: typeof options.type === "string" && hasOwn(TOAST_COLORS, options.type) ? options.type : settings.type ?? "default",
					lane: "interaction",
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
				registerDialog(record, previousFocus);
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
				const dialogToken = `${record.createdAt}-${Math.random().toString(36).slice(2, 8)}`;
				root.className = "rod-toast__interactive";
				copy.className = "rod-toast__interactive-copy";
				title.className = "rod-toast__interactive-title";
				description.className = "rod-toast__interactive-description";
				body.className = "rod-toast__interactive-body";
				validation.className = "rod-toast__validation";
				validation.dataset.visible = "false";
				countdown.className = "rod-toast__countdown";
				countdown.dataset.visible = "false";
				countdownTrack.className = "rod-toast__countdown-track";
				countdownBar.className = "rod-toast__countdown-bar";
				actionsNode.className = "rod-toast__confirm-actions";
				title.id = `rod-toast-dialog-title-${dialogToken}`;
				description.id = `rod-toast-dialog-description-${dialogToken}`;
				title.textContent = String(options.title ?? "");
				title.hidden = !title.textContent;
				description.textContent = String(options.description ?? "");
				description.hidden = !description.textContent;
				if (!title.hidden) node.setAttribute("aria-labelledby", title.id);
				if (!description.hidden) node.setAttribute("aria-describedby", description.id);
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
				if (typeof bodyApi.cleanup === "function") cleanupCallbacks.push(bodyApi.cleanup);
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
					const values = getValues();
					cleanup();
					resolve(formatDialogResult(options, value, reason, actionId, values));
				}
				const setValidation = (message) => {
					validation.textContent = String(message ?? "");
					validation.dataset.visible = String(Boolean(validation.textContent));
				};
				const updateDialog = (next = {}) => {
					if (hasOwn(next, "title")) {
						title.textContent = String(next.title ?? "");
						title.hidden = !title.textContent;
						if (title.hidden) node.removeAttribute("aria-labelledby");
						else node.setAttribute("aria-labelledby", title.id);
					}
					if (hasOwn(next, "description")) {
						description.textContent = String(next.description ?? "");
						description.hidden = !description.textContent;
						if (description.hidden) node.removeAttribute("aria-describedby");
						else node.setAttribute("aria-describedby", description.id);
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
				record.externalUpdate = (next) => updateDialog(next);
				const syncButtons = () => {
					buttons.forEach((button) => {
						const descriptorForButton = button.__rodAction;
						const lockedByCountdown = descriptorForButton.disabledUntilCountdown && remainingSeconds > 0;
						button.disabled = actionInFlight || descriptorForButton.disabled || lockedByCountdown;
					});
					bodyApi.syncActionState?.();
				};
				const setButtonBusyVisual = (button, action, busy, originalIcon) => {
					const label = button.querySelector("span");
					if (busy) {
						if (label && action.loadingLabel) label.textContent = action.loadingLabel;
						const currentSvg = button.querySelector("svg");
						const loader = createSvgIcon(documentRef, "loader-circle", 15);
						if (currentSvg) currentSvg.replaceWith(loader);
						else button.insertBefore(loader, label);
						button.dataset.busy = "true";
					} else {
						button.querySelector("svg")?.remove();
						if (originalIcon) button.insertBefore(originalIcon.cloneNode(true), label);
						if (label) label.textContent = action.label;
						button.dataset.busy = "false";
					}
				};
				const executeAction = async (action, button, event) => {
					if (settled || actionInFlight || button.disabled || !isTopDialog(record)) return;
					setValidation("");
					actionInFlight = true;
					const originalIcon = button.querySelector("svg")?.cloneNode(true) ?? null;
					syncButtons();
					setButtonBusyVisual(button, action, true, originalIcon);
					try {
						const values = getValues();
						const validationResult = await settings.validate?.({
							action,
							values,
							options
						});
						if (validationResult !== true && validationResult !== void 0) {
							setValidation(validationResult === false ? options.validationMessage ?? "Please review this value." : validationResult);
							actionInFlight = false;
							setButtonBusyVisual(button, action, false, originalIcon);
							syncButtons();
							return;
						}
						let closedByContext = false;
						const close = (value = action.value, reason = "action") => {
							closedByContext = true;
							finish(value, reason, action.id);
							controller.dismiss(reason);
						};
						emitEvent("action", {
							phase: "start",
							actionId: action.id,
							action: action.raw,
							controller,
							scope: options.scope ?? null
						});
						let result = action.handle ? await Promise.resolve().then(() => action.handle({
							action: action.raw,
							controller,
							event,
							toast: getToastApi(),
							close,
							update: updateDialog,
							setValidation,
							values,
							checked: isUnknownRecord(values.checked) ? values.checked : {}
						})) : void 0;
						if (closedByContext) return;
						if (result === void 0) result = settings.resolveValue ? settings.resolveValue(action, values) : action.hasValue ? action.value : action.id;
						if (action.successLabel) {
							const labelNode = button.querySelector("span");
							if (labelNode) labelNode.textContent = action.successLabel;
							button.querySelector("svg")?.replaceWith(createSvgIcon(documentRef, "check", 15));
							await new Promise((resolveDelay) => (state.hostWindow ?? initialHostWindow).setTimeout(resolveDelay, 220));
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
						actionInFlight = false;
						setButtonBusyVisual(button, action, false, originalIcon);
						syncButtons();
					} catch (error) {
						emitEvent("action", {
							phase: "error",
							actionId: action.id,
							action: action.raw,
							error,
							controller,
							scope: options.scope ?? null
						});
						actionInFlight = false;
						setButtonBusyVisual(button, action, false, originalIcon);
						syncButtons();
						if (options.rejectOnActionError === false) {
							setValidation(toErrorMessage(error));
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
					});
					syncButtons();
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
				Object.entries(options.shortcuts ?? {}).forEach(([shortcut, actionId]) => {
					const normalizedShortcut = normalizeShortcutName(shortcut);
					if (options.dismissible === false && normalizedShortcut === "Escape") return;
					shortcuts.set(normalizedShortcut, String(actionId));
				});
				normalizedActions.forEach((action) => {
					if (!action.shortcut) return;
					const normalizedShortcut = normalizeShortcutName(action.shortcut);
					if (options.dismissible === false && normalizedShortcut === "Escape") return;
					shortcuts.set(normalizedShortcut, action.id);
				});
				const keyHandler = (event) => {
					if (settled || !isTopDialog(record)) return;
					if (event.key === "Escape" && options.dismissible === false) return;
					const actionId = shortcuts.get(shortcutFromEvent(event));
					if (actionId) {
						const button = buttonByActionId.get(actionId);
						if (button && !button.disabled) {
							event.preventDefault();
							event.stopImmediatePropagation();
							button.click();
							return;
						}
					}
					if (event.key === "Escape" && options.dismissible !== false) {
						event.preventDefault();
						event.stopImmediatePropagation();
						controller.dismiss("escape");
					}
				};
				documentRef.addEventListener("keydown", keyHandler, true);
				cleanupCallbacks.push(() => documentRef.removeEventListener("keydown", keyHandler, true));
				bodyApi.onActionsReady?.();
				syncButtons();
				syncDialogStack();
				setManagerMinimized(false);
				syncStackLayout();
				const preferredButton = buttons.find((button) => !button.disabled && button.dataset.variant === "primary") ?? buttons.find((button) => !button.disabled);
				const hostWindow = state.hostWindow ?? initialHostWindow;
				(hostWindow.requestAnimationFrame?.bind(hostWindow) ?? ((callback) => hostWindow.setTimeout(() => callback(performance.now()), 0)))(() => {
					if (!isTopDialog(record)) return;
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
			const valuesByToken = /* @__PURE__ */ new Map();
			return showActionDialog(options, {
				kind: "select",
				dismissValue: hasOwn(options, "dismissValue") ? options.dismissValue : null,
				fallbackActions: [{
					id: "cancel",
					label: options.cancelLabel ?? "Cancel",
					icon: "circle-x",
					variant: "secondary",
					value: null
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
					const initialValues = options.multiple ? Array.isArray(options.value) ? options.value : options.value === void 0 ? [] : [options.value] : [options.value];
					choices.forEach((choice, index) => {
						const isDescriptor = isUnknownRecord(choice) && hasOwn(choice, "value");
						const value = isDescriptor ? choice.value : choice;
						const choiceLabel = isDescriptor ? choice.label : choice;
						const disabled = isDescriptor ? Boolean(choice.disabled) : false;
						const token = `choice:${index}`;
						valuesByToken.set(token, value);
						const option = document.createElement("option");
						option.value = token;
						option.textContent = String(choiceLabel ?? value ?? index);
						option.disabled = disabled;
						option.selected = initialValues.some((candidate) => Object.is(candidate, value));
						select.append(option);
					});
					field.append(label, select);
					body.append(field);
					return {
						focus: () => select?.focus({ preventScroll: true }),
						getValues: () => {
							const selectedValues = (select ? Array.from(select.selectedOptions, (option) => option.value) : []).map((token) => valuesByToken.get(token));
							return { selection: options.multiple ? selectedValues : selectedValues[0] ?? null };
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
					if (action.id === "cancel") return null;
					return action.hasValue ? action.value : values.selection;
				}
			});
		}
		function inferPickerMediaType(value, fallback = "image") {
			if (typeof value !== "string") {
				if (value.isVideo === true || Number(value.media_type) === 2) return "video";
				if (Number(value.media_type) === 1) return "image";
				const explicit = String(value.type ?? value.kind ?? value.mediaType ?? value.mimeType ?? "").toLowerCase();
				if (explicit.startsWith("video") || explicit === "reel") return "video";
				if (explicit.startsWith("image") || explicit === "photo") return "image";
			}
			const source = typeof value === "string" ? value : String(value.src ?? value.url ?? value.mediaUrl ?? value.href ?? value.preview ?? value.thumbnail ?? value.poster ?? "");
			if (/\.(?:mp4|webm|mov|m4v|mkv|avi|ogv|3gp|ts|m3u8)(?:$|[?#])/i.test(source)) return "video";
			if (/\.(?:jpe?g|png|webp|gif|avif|bmp|svg)(?:$|[?#])/i.test(source)) return "image";
			return fallback;
		}
		function normalizePickerItems(source, options = {}) {
			const values = Array.isArray(source) ? source : source == null ? [] : [source];
			const objectUrls = [];
			const usedIds = /* @__PURE__ */ new Set();
			const hostWindow = state.hostWindow ?? initialHostWindow;
			return {
				items: values.map((input, index) => {
					const blobLike = isBlobLike(input);
					const descriptorLike = !blobLike && isUnknownRecord(input) && [
						"src",
						"url",
						"mediaUrl",
						"href",
						"poster",
						"thumbnail",
						"preview",
						"previewUrl",
						"id",
						"pk",
						"key",
						"code",
						"type",
						"kind",
						"mediaType",
						"mimeType",
						"media_type",
						"isVideo"
					].some((key) => key in input);
					const raw = descriptorLike ? input : {};
					let srcCandidate = descriptorLike ? raw.src ?? raw.url ?? raw.mediaUrl ?? raw.href ?? null : blobLike ? null : input;
					if (blobLike && !srcCandidate) {
						const objectUrl = safeCall(() => hostWindow.URL.createObjectURL(input), null);
						if (objectUrl) {
							srcCandidate = objectUrl;
							objectUrls.push(objectUrl);
						}
					}
					if (srcCandidate == null) return null;
					const src = String(srcCandidate).trim();
					if (!src) return null;
					const rawBaseId = String(raw.id ?? raw.pk ?? raw.key ?? raw.code ?? index);
					let id = rawBaseId;
					let collision = 1;
					while (usedIds.has(id)) {
						id = `${rawBaseId}:${collision}`;
						collision += 1;
					}
					usedIds.add(id);
					const type = inferPickerMediaType({
						...raw,
						src,
						type: raw.type ?? (blobLike ? input.type : void 0)
					}, options.defaultMediaType ?? "image");
					const posterCandidate = raw.poster ?? raw.thumbnail ?? raw.preview ?? raw.previewUrl ?? null;
					const label = String(raw.label ?? raw.title ?? raw.filename ?? raw.name ?? "");
					const alt = String(raw.alt ?? raw.label ?? `${type === "video" ? "Video" : "Image"} ${index + 1}`);
					return {
						id,
						index,
						type,
						src,
						poster: posterCandidate == null ? null : String(posterCandidate),
						label,
						alt,
						disabled: Boolean(raw.disabled),
						selected: hasOwn(raw, "selected") ? Boolean(raw.selected) : null,
						transient: blobLike,
						original: input
					};
				}).filter((item) => item !== null),
				objectUrls
			};
		}
		function getInitialPickerSelection(items, options) {
			const selectable = items.filter((item) => !item.disabled);
			if (!selectable.length) return /* @__PURE__ */ new Set();
			const requested = options.value ?? options.selected ?? options.defaultSelected;
			const requestedIds = /* @__PURE__ */ new Set();
			if (Array.isArray(requested)) requested.forEach((value) => requestedIds.add(String(value)));
			else if (requested !== void 0 && requested !== null && requested !== true && requested !== false && requested !== "all") requestedIds.add(String(requested));
			const requestedIndexes = new Set([...options.defaultSelectedIndexes ?? [], ...options.selectedIndexes ?? []].filter((value) => Number.isInteger(value) && value >= 0));
			const shouldSelectAll = options.defaultAllSelected === true || options.allSelectedByDefault === true || options.defaultSelected === "all" || options.defaultSelected === true || options.value === "all" || options.value === true || options.selected === "all" || options.selected === true;
			const selected = /* @__PURE__ */ new Set();
			for (const item of items) {
				if (item.disabled) continue;
				if (item.selected === true) {
					selected.add(item.id);
					continue;
				}
				if (item.selected === false) continue;
				if (shouldSelectAll || requestedIds.has(item.id) || requestedIndexes.has(item.index)) selected.add(item.id);
			}
			if (options.multiple === false) {
				const first = items.find((item) => selected.has(item.id) && !item.disabled) ?? (shouldSelectAll ? selectable[0] : null);
				return new Set(first ? [first.id] : []);
			}
			return selected;
		}
		function normalizePickerAspectRatio(value) {
			const fallbackRatio = 1;
			const source = String(value ?? "").trim();
			let ratio = fallbackRatio;
			if (source) {
				const fraction = source.match(/^([0-9]*\.?[0-9]+)\s*(?:\/|:)\s*([0-9]*\.?[0-9]+)$/);
				if (fraction) {
					const width = Number(fraction[1]);
					const height = Number(fraction[2]);
					if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) ratio = width / height;
				} else {
					const numeric = Number(source);
					if (Number.isFinite(numeric) && numeric > 0) ratio = numeric;
				}
			}
			ratio = clamp(ratio, .05, 20);
			const padding = 100 / ratio;
			return {
				css: `${ratio} / 1`,
				paddingPercent: `${Number(padding.toFixed(5))}%`
			};
		}
		function showPickerToast(descriptor = {}) {
			const options = isPlainObject(descriptor) ? { ...descriptor } : {};
			const normalized = normalizePickerItems(options.items ?? options.media ?? options.sources ?? [], options);
			const items = normalized.items;
			const multiple = options.multiple !== false;
			const requestedMinimum = Number.isFinite(Number(options.minSelected)) ? Math.max(0, Math.floor(Number(options.minSelected))) : options.required === false ? 0 : 1;
			const minimum = multiple ? requestedMinimum : Math.min(1, requestedMinimum);
			const requestedMaximum = Number.isFinite(Number(options.maxSelected)) ? Math.max(0, Math.floor(Number(options.maxSelected))) : multiple ? Infinity : 1;
			const maximum = multiple ? Math.max(minimum, requestedMaximum) : 1;
			const selectedIds = getInitialPickerSelection(items, {
				...options,
				multiple
			});
			const preservedObjectUrls = /* @__PURE__ */ new Set();
			if (Number.isFinite(maximum) && selectedIds.size > maximum) {
				let kept = 0;
				for (const item of items) {
					if (!selectedIds.has(item.id)) continue;
					kept += 1;
					if (kept > maximum) selectedIds.delete(item.id);
				}
			}
			options.shortcuts ??= {
				Escape: "cancel",
				"Meta+Enter": "confirm",
				"Control+Enter": "confirm"
			};
			return showActionDialog(options, {
				kind: "picker",
				icon: "image",
				dismissValue: hasOwn(options, "dismissValue") ? options.dismissValue : null,
				fallbackActions: [{
					id: "cancel",
					label: options.cancelLabel ?? "Cancel",
					icon: "circle-x",
					variant: "secondary",
					value: hasOwn(options, "dismissValue") ? options.dismissValue : null
				}, {
					id: "confirm",
					label: options.confirmLabel ?? (options.downloadLabel ? "Download" : "Use selected"),
					icon: options.confirmIcon ?? (options.downloadLabel ? "download" : "check"),
					variant: "primary"
				}],
				buildBody({ document, body, node, controller }) {
					const hostWindow = state.hostWindow ?? initialHostWindow;
					const root = document.createElement("div");
					const toolbar = document.createElement("div");
					const count = document.createElement("div");
					const tools = document.createElement("div");
					const selectAll = document.createElement("button");
					const clearAll = document.createElement("button");
					const grid = document.createElement("div");
					const empty = document.createElement("div");
					const buttonsById = /* @__PURE__ */ new Map();
					const mediaElements = /* @__PURE__ */ new Set();
					const virtualizeAfter = Math.max(1, Number(options.virtualizeAfter) || 60);
					const IntersectionObserverCtor = safeCall(() => hostWindow.IntersectionObserver ?? null, null);
					const mediaObserver = items.length > virtualizeAfter && typeof IntersectionObserverCtor === "function" ? new IntersectionObserverCtor((entries, observer) => {
						for (const entry of entries) {
							if (!entry.isIntersecting) continue;
							const media = entry.target;
							const source = media.dataset.rodPickerSrc;
							if (source && !media.getAttribute("src")) media.setAttribute("src", source);
							const poster = media.dataset.rodPickerPoster;
							if (poster && String(media.tagName).toUpperCase() === "VIDEO") media.setAttribute("poster", poster);
							observer.unobserve(media);
						}
					}, {
						root: grid,
						rootMargin: options.mediaRootMargin ?? "320px 0px"
					}) : null;
					root.className = "rod-toast__picker";
					toolbar.className = "rod-toast__picker-toolbar";
					count.className = "rod-toast__picker-count";
					tools.className = "rod-toast__picker-tools";
					grid.className = "rod-toast__picker-grid";
					grid.setAttribute("role", "listbox");
					grid.setAttribute("aria-multiselectable", String(multiple));
					empty.className = "rod-toast__picker-empty";
					if (Number.isFinite(Number(options.columns)) && Number(options.columns) > 0) grid.style.gridTemplateColumns = `repeat(${Math.max(1, Math.floor(Number(options.columns)))},minmax(0,1fr))`;
					if (Number.isFinite(Number(options.itemMinWidth))) grid.style.setProperty("--rod-picker-item-min", `${Math.max(64, Number(options.itemMinWidth))}px`);
					const pickerAspectRatio = normalizePickerAspectRatio(options.aspectRatio ?? "1 / 1");
					grid.style.setProperty("--rod-picker-aspect-ratio", pickerAspectRatio.css);
					grid.style.setProperty("--rod-picker-aspect-padding", pickerAspectRatio.paddingPercent);
					if (Number.isFinite(Number(options.gap))) grid.style.setProperty("--rod-picker-gap", `${Math.max(0, Number(options.gap))}px`);
					selectAll.type = "button";
					clearAll.type = "button";
					selectAll.className = "rod-toast__picker-tool";
					clearAll.className = "rod-toast__picker-tool";
					selectAll.textContent = options.selectAllLabel ?? "Select all";
					clearAll.textContent = options.clearAllLabel ?? "Clear";
					const selectableCount = items.filter((item) => !item.disabled).length;
					const getSelectedItems = () => items.filter((item) => !item.disabled && selectedIds.has(item.id));
					const makeDisposableDescriptor = (item) => {
						if (!item.transient) return { ...item };
						preservedObjectUrls.add(item.src);
						let disposed = false;
						return {
							...item,
							transient: true,
							dispose() {
								if (disposed) return;
								disposed = true;
								preservedObjectUrls.delete(item.src);
								safeCall(() => (state.hostWindow ?? initialHostWindow).URL.revokeObjectURL(item.src), void 0);
							}
						};
					};
					const getSelectionValue = () => {
						const selected = getSelectedItems();
						switch (options.returnType ?? "items") {
							case "ids": return selected.map((item) => item.id);
							case "indexes": return selected.map((item) => item.index);
							case "descriptors": return selected.map(makeDisposableDescriptor);
							default: return selected.map((item) => item.original);
						}
					};
					let cachedConfirmButton = null;
					const syncConfirmButton = () => {
						const confirm = cachedConfirmButton?.isConnected ? cachedConfirmButton : node.querySelector("[data-action-id=\"confirm\"]");
						if (!confirm) return;
						cachedConfirmButton = confirm;
						const label = confirm.querySelector("span");
						const selectedCount = selectedIds.size;
						const valid = selectedCount >= minimum && selectedCount <= maximum;
						if (confirm.dataset.busy !== "true") confirm.disabled = !valid;
						if (label && options.dynamicConfirmLabel !== false && confirm.dataset.busy !== "true") {
							const base = options.confirmLabel ?? (options.downloadLabel ? "Download" : "Use selected");
							label.textContent = selectedCount > 0 ? `${base} (${selectedCount})` : base;
						}
					};
					const notifyChange = () => {
						const selected = getSelectedItems();
						safeCall(() => options.onChange?.({
							selected: selected.map((item) => item.original),
							selectedIds: selected.map((item) => item.id),
							selectedIndexes: selected.map((item) => item.index),
							selectedCount: selected.length,
							totalItems: items.length,
							controller
						}), void 0);
					};
					const syncButton = (id) => {
						const button = buttonsById.get(id);
						if (!button) return;
						const active = selectedIds.has(id);
						button.dataset.selected = String(active);
						button.setAttribute("aria-pressed", String(active));
						button.setAttribute("aria-selected", String(active));
					};
					const renderSelectionState = (changedIds) => {
						const selectedCount = selectedIds.size;
						if (options.countLabel === false) {
							count.textContent = "";
							count.hidden = true;
						} else {
							count.hidden = false;
							if (typeof options.countLabel === "function") count.textContent = String(options.countLabel({
								selected: selectedCount,
								total: selectableCount
							}));
							else if (typeof options.countLabel === "string") count.textContent = options.countLabel.replace(/\{selected\}/g, String(selectedCount)).replace(/\{total\}/g, String(selectableCount));
							else count.textContent = `${selectedCount} of ${selectableCount} selected`;
						}
						if (changedIds) for (const id of changedIds) syncButton(id);
						else for (const id of buttonsById.keys()) syncButton(id);
						selectAll.disabled = !multiple || selectableCount === 0 || selectedCount >= Math.min(selectableCount, maximum);
						clearAll.disabled = selectedCount === 0;
						syncConfirmButton();
						notifyChange();
					};
					const setSelected = (item, active) => {
						if (item.disabled) return false;
						const changed = /* @__PURE__ */ new Set();
						if (!multiple) {
							for (const id of selectedIds) changed.add(id);
							selectedIds.clear();
							if (active) selectedIds.add(item.id);
							changed.add(item.id);
						} else if (active) {
							if (selectedIds.size >= maximum && !selectedIds.has(item.id)) return false;
							selectedIds.add(item.id);
							changed.add(item.id);
						} else {
							selectedIds.delete(item.id);
							changed.add(item.id);
						}
						renderSelectionState(changed);
						return true;
					};
					const toggle = (item) => {
						const active = selectedIds.has(item.id);
						if (active && !multiple && minimum > 0) return;
						setSelected(item, !active);
					};
					const isVideoMediaElement = (media) => String(media.tagName).toUpperCase() === "VIDEO";
					const loadMedia = (media, item) => {
						const isVideoElement = isVideoMediaElement(media);
						const source = isVideoElement ? item.src : item.poster ?? item.src;
						if (mediaObserver) {
							media.dataset.rodPickerSrc = source;
							if (isVideoElement && item.poster) media.dataset.rodPickerPoster = item.poster;
							mediaObserver.observe(media);
							return;
						}
						media.setAttribute("src", source);
						if (isVideoElement && item.poster) media.setAttribute("poster", item.poster);
					};
					const makeMedia = (item) => {
						let media;
						if (item.type === "video" && !item.poster) {
							const video = document.createElement("video");
							video.muted = true;
							video.playsInline = true;
							video.preload = mediaObserver ? "none" : options.videoPreload ?? "none";
							video.setAttribute("playsinline", "");
							video.setAttribute("webkit-playsinline", "");
							media = video;
						} else {
							const image = document.createElement("img");
							image.alt = item.alt;
							image.loading = mediaObserver ? "lazy" : "eager";
							image.decoding = "async";
							media = image;
						}
						media.className = "rod-toast__picker-media";
						media.draggable = false;
						if (options.crossOrigin) media.crossOrigin = options.crossOrigin;
						mediaElements.add(media);
						loadMedia(media, item);
						return media;
					};
					items.forEach((item) => {
						const button = document.createElement("button");
						const media = makeMedia(item);
						const shade = document.createElement("span");
						const check = document.createElement("span");
						const index = document.createElement("span");
						const kind = document.createElement("span");
						const label = document.createElement("span");
						button.type = "button";
						button.className = "rod-toast__picker-item";
						button.dataset.pickerId = item.id;
						button.dataset.selected = String(selectedIds.has(item.id));
						button.disabled = item.disabled;
						button.setAttribute("role", "option");
						button.setAttribute("aria-pressed", String(selectedIds.has(item.id)));
						button.setAttribute("aria-selected", String(selectedIds.has(item.id)));
						button.setAttribute("aria-label", item.label || `${item.type} ${item.index + 1}`);
						let previewFallbackAttempted = false;
						media.addEventListener("error", () => {
							if (!previewFallbackAttempted && !isVideoMediaElement(media) && item.type === "image" && item.poster && item.poster !== item.src) {
								previewFallbackAttempted = true;
								delete button.dataset.mediaError;
								media.setAttribute("src", item.src);
								return;
							}
							button.dataset.mediaError = "true";
						});
						shade.className = "rod-toast__picker-shade";
						check.className = "rod-toast__picker-check";
						check.append(createSvgIcon(document, "check", 14));
						index.className = "rod-toast__picker-index";
						index.textContent = String(item.index + 1);
						kind.className = "rod-toast__picker-kind";
						const normalizedLabel = item.label.trim().toLowerCase();
						const labelHasType = (item.type === "video" ? /\b(v[ií]deo|video)\b/i : /\b(foto|photo|image|imagem)\b/i).test(item.label);
						const labelHasIndex = new RegExp(`^\\s*0*${item.index + 1}(?:\\s|[.·:_-]|$)`, "i").test(item.label);
						kind.hidden = options.showType === false || labelHasType;
						kind.append(createSvgIcon(document, item.type === "video" ? "play" : "image", 12));
						const kindText = document.createElement("span");
						kindText.textContent = item.type === "video" ? options.videoLabel ?? "Video" : options.imageLabel ?? "Photo";
						kind.append(kindText);
						index.hidden = labelHasIndex;
						label.className = "rod-toast__picker-label";
						label.textContent = item.label;
						label.hidden = !normalizedLabel || options.showLabels === false;
						label.dataset.hasKind = String(!kind.hidden);
						if (index.hidden) label.style.left = "8px";
						button.append(media, shade, check, index);
						if (!kind.hidden) button.append(kind);
						if (!label.hidden) button.append(label);
						button.addEventListener("click", (event) => {
							event.preventDefault();
							event.stopPropagation();
							toggle(item);
						});
						buttonsById.set(item.id, button);
						grid.append(button);
					});
					grid.addEventListener("keydown", (event) => {
						if (![
							"ArrowLeft",
							"ArrowRight",
							"ArrowUp",
							"ArrowDown",
							"Home",
							"End"
						].includes(event.key)) return;
						const target = event.target;
						if (!isElementLike(target) || !target.matches(".rod-toast__picker-item")) return;
						const enabled = [...buttonsById.values()].filter((button) => !button.disabled);
						const currentIndex = enabled.indexOf(target);
						if (currentIndex < 0 || !enabled.length) return;
						let nextIndex = currentIndex;
						const currentButton = enabled[currentIndex];
						const approximateColumns = Math.max(1, Math.round(grid.clientWidth / Math.max(1, currentButton.offsetWidth + (Number(options.gap) || 8))));
						if (event.key === "ArrowLeft") nextIndex = currentIndex - 1;
						else if (event.key === "ArrowRight") nextIndex = currentIndex + 1;
						else if (event.key === "ArrowUp") nextIndex = currentIndex - approximateColumns;
						else if (event.key === "ArrowDown") nextIndex = currentIndex + approximateColumns;
						else if (event.key === "Home") nextIndex = 0;
						else if (event.key === "End") nextIndex = enabled.length - 1;
						nextIndex = clamp(nextIndex, 0, enabled.length - 1);
						if (nextIndex === currentIndex) return;
						event.preventDefault();
						enabled[nextIndex]?.focus({ preventScroll: true });
						enabled[nextIndex]?.scrollIntoView({
							block: "nearest",
							inline: "nearest"
						});
					});
					if (!items.length) empty.textContent = options.emptyMessage ?? "No images or videos available.";
					if (options.showSelectionTools !== false && multiple && items.length) {
						selectAll.addEventListener("click", (event) => {
							event.preventDefault();
							event.stopPropagation();
							const changed = /* @__PURE__ */ new Set();
							for (const item of items) {
								if (item.disabled || selectedIds.size >= maximum) continue;
								if (!selectedIds.has(item.id)) changed.add(item.id);
								selectedIds.add(item.id);
							}
							renderSelectionState(changed);
						});
						clearAll.addEventListener("click", (event) => {
							event.preventDefault();
							event.stopPropagation();
							const changed = new Set(selectedIds);
							selectedIds.clear();
							renderSelectionState(changed);
						});
						tools.append(selectAll, clearAll);
					}
					toolbar.append(count);
					if (tools.childElementCount) toolbar.append(tools);
					root.append(toolbar, items.length ? grid : empty);
					body.append(root);
					renderSelectionState();
					return {
						focus() {
							const hostWindow = state.hostWindow ?? initialHostWindow;
							if (!safeCall(() => hostWindow.matchMedia?.("(pointer: fine)")?.matches === true, false)) return;
							const preferred = items.find((item) => selectedIds.has(item.id) && !item.disabled) ?? items.find((item) => !item.disabled);
							buttonsById.get(preferred?.id ?? "")?.focus({ preventScroll: true });
						},
						getValues() {
							const selected = getSelectedItems();
							return {
								selection: getSelectionValue(),
								selected: selected.map((item) => item.original),
								selectedIds: selected.map((item) => item.id),
								selectedIndexes: selected.map((item) => item.index),
								selectedCount: selected.length,
								totalItems: items.length
							};
						},
						syncActionState: syncConfirmButton,
						cleanup() {
							mediaObserver?.disconnect();
							const hostWindow = state.hostWindow ?? initialHostWindow;
							const mediaToRelease = [...mediaElements];
							const objectUrlsToRelease = normalized.objectUrls.filter((url) => !preservedObjectUrls.has(url));
							mediaElements.clear();
							hostWindow.setTimeout(() => {
								for (const media of mediaToRelease) {
									if (isVideoMediaElement(media)) {
										safeCall(() => media.pause(), void 0);
										media.removeAttribute("poster");
									}
									media.removeAttribute("src");
									delete media.dataset.rodPickerSrc;
									delete media.dataset.rodPickerPoster;
								}
								for (const url of objectUrlsToRelease) safeCall(() => hostWindow.URL.revokeObjectURL(url), void 0);
							}, 360);
						}
					};
				},
				async validate({ action, values }) {
					if (action.id === "cancel") return true;
					const selectedCount = Number(values.selectedCount) || 0;
					if (selectedCount < minimum) return options.requiredMessage ?? (minimum === 1 ? "Select at least one item." : `Select at least ${minimum} items.`);
					if (selectedCount > maximum) return options.validationMessage ?? `Select at most ${maximum} items.`;
					return typeof options.validate === "function" ? options.validate(values.selection) : true;
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
			const { controller, record } = created;
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
						Promise.resolve().then(() => action.handle ? action.handle({
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
			record.externalUpdate = controller.updateRich;
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
			return isUnknownRecord(value) && typeof value.id === "string" && typeof value.title === "string" && typeof value.status === "string" && ALLOWED_TASK_STATUSES.has(value.status);
		}
		function toStorageSafeValue(value, seen = /* @__PURE__ */ new WeakSet(), depth = 0) {
			if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
			if (value === void 0) return null;
			if (typeof value === "bigint") return `${value}n`;
			if (typeof value === "symbol") return safeCall(() => value.toString(), "Symbol(?)");
			if (typeof value === "function") return `[Function: ${value.name || "anonymous"}]`;
			if (!isObject(value)) return String(value);
			if (depth >= 10) return "[MaxDepth]";
			if (isDomNode(value)) return `[Node: ${value.nodeName}]`;
			if (value instanceof Date) return safeCall(() => value.toISOString(), String(value));
			if (value instanceof RegExp) return String(value);
			if (value instanceof Error) return {
				name: value.name,
				message: value.message,
				stack: value.stack ?? null,
				cause: toStorageSafeValue(value.cause, seen, depth + 1)
			};
			if (seen.has(value)) return "[Circular]";
			seen.add(value);
			if (Array.isArray(value)) return value.slice(0, 1e3).map((entry) => toStorageSafeValue(entry, seen, depth + 1));
			if (value instanceof Map) return {
				__type: "Map",
				entries: Array.from(value.entries()).slice(0, 1e3).map(([key, entry]) => [toStorageSafeValue(key, seen, depth + 1), toStorageSafeValue(entry, seen, depth + 1)])
			};
			if (value instanceof Set) return {
				__type: "Set",
				values: Array.from(value.values()).slice(0, 1e3).map((entry) => toStorageSafeValue(entry, seen, depth + 1))
			};
			const output = {};
			let count = 0;
			for (const key of safeCall(() => Object.keys(value), [])) {
				if (count >= 1e3) {
					output.__truncated = true;
					break;
				}
				output[key] = toStorageSafeValue(safeCall(() => value[key], void 0), seen, depth + 1);
				count += 1;
			}
			return output;
		}
		function sanitizeTaskSnapshot(snapshot) {
			const safeMetadata = toStorageSafeValue(snapshot.metadata);
			return {
				...snapshot,
				metadata: isUnknownRecord(safeMetadata) ? safeMetadata : { value: safeMetadata }
			};
		}
		function hasPersistableTasks() {
			for (const task of state.tasks.values()) if (task.persist && !task.dismissed) return true;
			return false;
		}
		function flushTaskSnapshots() {
			const hostWindow = state.hostWindow ?? initialHostWindow;
			if (state.taskPersistTimer !== null) {
				hostWindow.clearTimeout(state.taskPersistTimer);
				state.taskPersistTimer = null;
			}
			const storage = getTaskStorage();
			if (!storage) return;
			const snapshots = [];
			const limit = Math.max(1, state.config.maxPersistedTasks);
			for (const task of state.tasks.values()) {
				if (!task.persist || task.dismissed) continue;
				try {
					snapshots.push(sanitizeTaskSnapshot(task.snapshot()));
					if (snapshots.length > limit) snapshots.shift();
				} catch (error) {
					emitEvent("task:persist-error", {
						task,
						error
					});
				}
			}
			try {
				storage.setItem(state.config.taskStorageKey, JSON.stringify(snapshots));
				state.taskPersistLastAt = Date.now();
			} catch (error) {
				emitEvent("task:persist-error", {
					error,
					snapshots: snapshots.length
				});
			}
		}
		function persistTaskSnapshots(immediate = false) {
			if (state.destroying) return;
			const hostWindow = state.hostWindow ?? initialHostWindow;
			if (immediate) {
				flushTaskSnapshots();
				return;
			}
			if (state.taskPersistTimer !== null) return;
			const interval = Math.max(100, Number(state.config.taskProgressPersistInterval) || DEFAULT_CONFIG.taskProgressPersistInterval);
			const elapsed = Date.now() - state.taskPersistLastAt;
			const delay = Math.max(0, interval - elapsed);
			state.taskPersistTimer = hostWindow.setTimeout(flushTaskSnapshots, delay);
		}
		const TERMINAL_TASK_STATUSES = /* @__PURE__ */ new Set([
			"success",
			"error",
			"cancelled"
		]);
		function isTerminalTaskStatus(status) {
			return TERMINAL_TASK_STATUSES.has(status);
		}
		function canTransitionTask(from, to) {
			if (from === to) return true;
			if (isTerminalTaskStatus(from)) return false;
			switch (from) {
				case "queued": return to === "running" || to === "paused" || to === "warning" || isTerminalTaskStatus(to);
				case "running": return to === "paused" || to === "warning" || isTerminalTaskStatus(to);
				case "paused": return to === "running" || to === "warning" || isTerminalTaskStatus(to);
				case "warning": return to === "running" || to === "paused" || isTerminalTaskStatus(to);
				default: return false;
			}
		}
		function createAbortError(reason = "Cancelled") {
			if (reason instanceof Error) return reason;
			return new DOMException(String(reason ?? "Cancelled"), "AbortError");
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
				icon: normalizeTaskIcon(options.icon, "clock"),
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
				lane: "task",
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
					if (taskState.persist && !state.destroying) persistTaskSnapshots(true);
					if (hasEventListeners("task:dismiss")) emitEvent("task:dismiss", {
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
			let lastTaskActionsSignature = "";
			const renderTaskActions = () => {
				const signature = `${taskState.status}|${Boolean(options.pausable)}|${Boolean(options.cancellable)}|${Array.isArray(options.actions) ? options.actions.length : 0}`;
				if (signature === lastTaskActionsSignature) return;
				lastTaskActionsSignature = signature;
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
				if (options.cancellable && !isTerminalTaskStatus(taskState.status)) descriptors.push({
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
						if (button.disabled) return;
						if (action.id === "pause") {
							task.pause();
							return;
						}
						if (action.id === "resume") {
							task.resume();
							return;
						}
						if (action.id === "cancel") {
							task.cancel("user");
							return;
						}
						button.disabled = true;
						button.dataset.busy = "true";
						Promise.resolve().then(() => action.handle?.({
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
						}).catch((error) => {
							emitEvent("action", {
								phase: "error",
								actionId: action.id,
								action: action.raw,
								error,
								controller: toastController,
								scope: taskState.scope
							});
							showSemanticToast("error", [error]);
						}).finally(() => {
							button.disabled = false;
							button.dataset.busy = "false";
						});
					});
					taskActions.append(button);
				});
				taskActions.hidden = !taskActions.childElementCount;
			};
			const apply = (next = {}, emit = true) => {
				if (dismissed) return task;
				const previousStatus = taskState.status;
				const requestedStatus = hasOwn(next, "status") ? normalizeTaskStatus(next.status) : previousStatus;
				const statusChanged = requestedStatus !== previousStatus;
				const transitionAllowed = !statusChanged || canTransitionTask(previousStatus, requestedStatus);
				if (statusChanged && !transitionAllowed) {
					emitEvent("task:transition-blocked", {
						task,
						from: previousStatus,
						to: requestedStatus
					});
					return task;
				}
				if (hasOwn(next, "title")) taskState.title = String(next.title ?? "");
				if (hasOwn(next, "description")) taskState.description = String(next.description ?? "");
				if (hasOwn(next, "icon")) taskState.icon = normalizeTaskIcon(next.icon, "circle");
				if (statusChanged && transitionAllowed) taskState.status = requestedStatus;
				if (hasOwn(next, "progress") && !isTerminalTaskStatus(previousStatus)) taskState.progress = normalizeProgress(next.progress);
				if (hasOwn(next, "progressLabel")) taskState.progressLabel = next.progressLabel == null ? null : String(next.progressLabel);
				if (isUnknownRecord(next.metadata)) taskState.metadata = {
					...taskState.metadata,
					...next.metadata
				};
				taskState.updatedAt = Date.now();
				let semanticIcon;
				let semanticAnimation;
				const persistentImageIcon = getImageIconDescriptor(taskState.icon) ? taskState.icon : null;
				switch (taskState.status) {
					case "queued":
						semanticIcon = persistentImageIcon ?? (taskState.icon || "clock");
						semanticAnimation = "pulse";
						break;
					case "running":
						semanticIcon = persistentImageIcon ?? (taskState.icon || "loader-circle");
						semanticAnimation = taskState.progress === null ? "spinner" : "progress";
						break;
					case "paused":
						semanticIcon = persistentImageIcon ?? "pause";
						semanticAnimation = "none";
						break;
					case "warning":
						semanticIcon = persistentImageIcon ?? "triangle-alert";
						semanticAnimation = "none";
						break;
					case "cancelled":
						semanticIcon = persistentImageIcon ?? "square";
						semanticAnimation = "none";
						break;
					case "success":
						semanticIcon = persistentImageIcon ?? "check";
						semanticAnimation = "none";
						break;
					case "error":
						semanticIcon = persistentImageIcon ?? "circle-x";
						semanticAnimation = "none";
				}
				if (taskState.status === "success" || taskState.status === "error") (taskState.status === "success" ? toastController.success.bind(toastController) : toastController.error.bind(toastController))({
					title: taskState.title,
					description: taskState.description,
					icon: semanticIcon,
					duration: Number.isFinite(Number(next.duration)) ? Number(next.duration) : taskState.status === "success" ? state.config.loadingSuccessDuration : state.config.loadingErrorDuration
				});
				else toastController.update({
					title: taskState.title,
					description: taskState.description,
					icon: semanticIcon,
					animation: semanticAnimation,
					progress: taskState.progress,
					progressLabel: taskState.progressLabel,
					duration: taskState.status === "cancelled" ? state.config.loadingInfoDuration : 0
				});
				setTextValue(taskStatus, taskState.status);
				renderTaskActions();
				if (taskState.persist) persistTaskSnapshots(statusChanged || isTerminalTaskStatus(taskState.status));
				if (emit && hasEventListeners("task:update")) emitEvent("task:update", {
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
				start: (next = {}) => {
					if (isTerminalTaskStatus(taskState.status)) return task;
					return apply({
						...next,
						status: "running"
					});
				},
				setProgress: (value, next = {}) => {
					if (isTerminalTaskStatus(taskState.status)) return task;
					const status = next.status ?? (taskState.status === "queued" ? "running" : taskState.status);
					return apply({
						...next,
						status,
						progress: value
					});
				},
				pause: async () => {
					if (dismissed || isTerminalTaskStatus(taskState.status) || taskState.status === "paused") return task;
					await Promise.resolve().then(() => options.pause?.({
						task,
						signal: task.signal
					}));
					return apply({ status: "paused" });
				},
				resume: async () => {
					if (dismissed || taskState.status !== "paused") return task;
					await Promise.resolve().then(() => options.resume?.({
						task,
						signal: task.signal
					}));
					return apply({ status: "running" });
				},
				cancel: async (reason = "cancelled") => {
					if (dismissed || isTerminalTaskStatus(taskState.status)) return task;
					if (!abortController.signal.aborted) abortController.abort(reason);
					try {
						await Promise.resolve().then(() => options.cancel?.({
							task,
							reason
						}));
					} finally {
						apply({
							status: "cancelled",
							title: options.cancelledTitle ?? taskState.title,
							description: options.cancelledDescription ?? "Task cancelled."
						});
						emitEvent("task:cancel", {
							task,
							reason
						});
					}
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
					if (isTerminalTaskStatus(taskState.status)) throw new Error(`Task ${id} is already ${taskState.status}.`);
					task.start();
					try {
						const result = await executor({
							task,
							signal: task.signal,
							progress: (value, next = {}) => task.setProgress(value, next),
							update: (next = {}) => task.update(next)
						});
						if (task.signal.aborted || task.status === "cancelled") throw createAbortError(task.signal.reason);
						if (task.status === "error") throw new Error(`Task ${id} entered error state while executor was running.`);
						task.success();
						return result;
					} catch (error) {
						if (task.signal.aborted || task.status === "cancelled") {
							if (task.status !== "cancelled") await task.cancel(task.signal.reason ?? "aborted");
						} else if (!isTerminalTaskStatus(task.status)) task.error(error);
						throw error;
					}
				}
			});
			state.tasks.set(id, task);
			apply(options, false);
			if (taskState.persist) persistTaskSnapshots(true);
			if (hasEventListeners("task:create")) emitEvent("task:create", {
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
				if (task.signal.aborted || task.status === "cancelled") throw createAbortError(task.signal.reason);
				if (task.status === "error") throw new Error(`Task ${task.id} entered error state while promise was pending.`);
				task.success(resolvePhaseDescriptor(descriptor.success, result, {
					title: "Completed",
					description: "The operation completed successfully."
				}));
				return result;
			} catch (error) {
				if (task.signal.aborted || task.status === "cancelled") {
					if (task.status !== "cancelled") await task.cancel(task.signal.reason ?? "cancelled");
				} else if (!isTerminalTaskStatus(task.status)) task.error(error, resolvePhaseDescriptor(descriptor.error, error, {
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
					if (!externalAbortController.signal.aborted) externalAbortController.abort(createAbortError("Cancelled"));
				}
			});
			if (!task) throw new Error("Could not create retry task.");
			for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
				if (externalAbortController.signal.aborted || task.status === "cancelled") throw createAbortError(externalAbortController.signal.reason);
				task.update({
					status: "running",
					title: descriptor.title ?? "Trying operation",
					description: `Attempt ${attempt} of ${maxAttempts}`,
					icon: descriptor.icon ?? "refresh",
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
					if (externalAbortController.signal.aborted || task.status === "cancelled") throw createAbortError(externalAbortController.signal.reason);
					task.success(resolvePhaseDescriptor(descriptor.success, result, {
						title: "Completed",
						description: `Succeeded on attempt ${attempt}.`
					}));
					return result;
				} catch (error) {
					if (externalAbortController.signal.aborted || task.status === "cancelled") {
						if (task.status !== "cancelled") await task.cancel("cancelled");
						throw error;
					}
					if (attempt >= maxAttempts) {
						task.error(error, resolvePhaseDescriptor(descriptor.error, error, {
							title: "All attempts failed",
							description: toErrorMessage(error)
						}));
						throw error;
					}
					let configuredBackoff;
					if (Array.isArray(descriptor.backoff)) configuredBackoff = descriptor.backoff.length ? Number(descriptor.backoff[Math.min(attempt - 1, descriptor.backoff.length - 1)]) : 1e3 * 2 ** (attempt - 1);
					else if (typeof descriptor.backoff === "function") configuredBackoff = Number(descriptor.backoff(attempt, error));
					else if (descriptor.backoff !== void 0) configuredBackoff = Number(descriptor.backoff);
					else configuredBackoff = 1e3 * 2 ** (attempt - 1);
					const delay = Math.max(0, Number.isFinite(configuredBackoff) ? configuredBackoff : 0);
					if (delay <= 0) continue;
					const seconds = Math.max(1, Math.ceil(delay / 1e3));
					task.update({
						status: "paused",
						title: descriptor.retryTitle ?? "Retry scheduled",
						description: `Attempt ${attempt} failed. Retry in ${seconds}s or retry now.`,
						icon: "clock"
					});
					if (await showConfirmToast({
						title: descriptor.retryTitle ?? "Try again?",
						description: toErrorMessage(error),
						icon: "refresh",
						duration: 0,
						dismissValue: "cancel",
						countdown: {
							seconds,
							autoAction: "retry"
						},
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
								label: "Retry now · {seconds}s",
								icon: "refresh",
								variant: "primary",
								value: "retry"
							}
						]
					}) !== "retry") {
						externalAbortController.abort(createAbortError("Cancelled"));
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
			const weights = new Map(Object.entries(options.weights ?? {}).map(([key, value]) => [key, Math.max(0, Number(value) || 0)]));
			const metrics = /* @__PURE__ */ new Map();
			let totalWeight = 0;
			let completedWeight = 0;
			let unknownCount = 0;
			let errorCount = 0;
			let cancelledCount = 0;
			let successCount = 0;
			let finalized = false;
			const parentTaskId = options.parentTaskId ?? `group:${id}`;
			const staleParent = state.tasks.get(parentTaskId);
			if (staleParent && (staleParent.dismissed || isTerminalTaskStatus(staleParent.status))) staleParent.dismiss("group-reused", true);
			const parent = createTaskController({
				id: parentTaskId,
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
			let group;
			const finishGroupRegistration = () => {
				if (finalized) return;
				finalized = true;
				group.unsubscribe?.();
				group.unsubscribe = void 0;
				if (state.groups.get(id) === group) state.groups.delete(id);
			};
			const removeMetric = (metric) => {
				totalWeight -= metric.weight;
				completedWeight -= metric.contribution;
				if (metric.unknown) unknownCount -= 1;
				if (metric.status === "error") errorCount -= 1;
				if (metric.status === "cancelled") cancelledCount -= 1;
				if (metric.status === "success") successCount -= 1;
			};
			const addMetric = (metric) => {
				totalWeight += metric.weight;
				completedWeight += metric.contribution;
				if (metric.unknown) unknownCount += 1;
				if (metric.status === "error") errorCount += 1;
				if (metric.status === "cancelled") cancelledCount += 1;
				if (metric.status === "success") successCount += 1;
			};
			const createMetric = (key, task) => {
				const weight = weights.has(key) ? Number(weights.get(key)) : 1;
				const status = task.status;
				const progress = task.progress;
				const unknown = status !== "success" && progress === null;
				return {
					status,
					progress,
					weight,
					contribution: status === "success" ? weight : progress === null ? 0 : weight * progress,
					unknown
				};
			};
			const updateMetric = (key, task) => {
				const old = metrics.get(key);
				if (old) removeMetric(old);
				const next = createMetric(key, task);
				metrics.set(key, next);
				addMetric(next);
			};
			const rebuildMetrics = () => {
				metrics.clear();
				totalWeight = completedWeight = unknownCount = errorCount = cancelledCount = successCount = 0;
				for (const [key, task] of children) updateMetric(key, task);
			};
			const renderParent = () => {
				if (finalized) return;
				const count = children.size;
				if (!count) {
					parent.update({
						status: "queued",
						progress: null
					});
					return;
				}
				if (errorCount > 0) {
					parent.error("One or more child tasks failed.", { title: options.errorTitle ?? "Task group failed" });
					finishGroupRegistration();
					return;
				}
				if (cancelledCount > 0) {
					parent.update({
						status: "cancelled",
						title: options.title ?? "Task group cancelled",
						description: "A child task was cancelled."
					});
					finishGroupRegistration();
					return;
				}
				if (successCount === count) {
					parent.success({
						title: options.successTitle ?? options.title ?? "All tasks completed",
						description: options.successDescription ?? `${count} tasks completed.`
					});
					finishGroupRegistration();
					return;
				}
				parent.update({
					status: "running",
					title: options.title ?? "Task group",
					description: `${successCount}/${count} tasks completed`,
					progress: unknownCount > 0 || totalWeight <= 0 ? null : completedWeight / totalWeight
				});
			};
			group = {
				id,
				parent,
				children,
				weights,
				task(keyOrDescriptor, maybeDescriptor = {}) {
					if (finalized) return null;
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
					if (child) {
						children.set(key, child);
						updateMetric(key, child);
						renderParent();
					}
					return child;
				},
				setWeights(nextWeights = {}) {
					Object.entries(nextWeights).forEach(([key, value]) => weights.set(String(key), Math.max(0, Number(value) || 0)));
					rebuildMetrics();
					renderParent();
					return group;
				},
				recompute() {
					rebuildMetrics();
					renderParent();
					return group;
				},
				dismissAll(reason = "group-dismiss") {
					children.forEach((task) => task.dismiss(reason));
					parent.dismiss(reason);
					finishGroupRegistration();
				},
				complete(next = {}) {
					if (!finalized) parent.success(next);
					finishGroupRegistration();
					return group;
				}
			};
			group.unsubscribe = addEventListenerInternal("task:update", (event) => {
				const candidateTask = event.task;
				if (!isTaskController(candidateTask) || candidateTask === parent) return;
				const snapshot = candidateTask.snapshot();
				if (snapshot.metadata.groupId !== id) return;
				const key = String(snapshot.metadata.groupKey ?? "");
				if (!key || !children.has(key)) return;
				updateMetric(key, candidateTask);
				renderParent();
			});
			state.groups.set(id, group);
			emitEvent("group:create", { group });
			return group;
		}
		function isTaskController(value) {
			return isObject(value) && "snapshot" in value && typeof value.snapshot === "function";
		}
		function restorePersistedTasks() {
			if (state.restoredTasks) return [];
			state.restoredTasks = true;
			const now = Date.now();
			const restored = [];
			getPersistedTaskSnapshots().forEach((snapshot) => {
				if (isTerminalTaskStatus(normalizeTaskStatus(snapshot.status)) && now - Number(snapshot.updatedAt || 0) > state.config.taskTerminalRetention) return;
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
			const enrichDescriptor = (descriptor) => {
				const source = isPlainObject(descriptor) ? descriptor : { title: String(descriptor ?? "") };
				return {
					...defaults,
					...source,
					scope: scopeName
				};
			};
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
				multiLoading: (descriptor) => showMultiLoadingToast(enrichDescriptor(descriptor)),
				confirm: (descriptor) => showConfirmToast(enrichDescriptor(descriptor)),
				prompt: (descriptor) => showPromptToast(enrichDescriptor(descriptor)),
				select: (descriptor) => showSelectToast({
					...defaults,
					...descriptor ?? {},
					scope: scopeName
				}),
				picker: (descriptor) => showPickerToast({
					...defaults,
					...descriptor ?? {},
					scope: scopeName
				}),
				undo: (descriptor) => showUndoToast(enrichDescriptor(descriptor)),
				task: (descriptor) => createTaskController(enrichDescriptor(descriptor)),
				promise: (input, descriptor) => showPromiseToast(input, enrichDescriptor(descriptor)),
				retry: (descriptor) => showRetryToast(enrichDescriptor(descriptor)),
				group: (descriptor) => createTaskGroup(enrichDescriptor(descriptor)),
				dismissAll(immediate = false) {
					for (let index = state.toasts.length - 1; index >= 0; index -= 1) {
						const record = state.toasts[index];
						if (record.options.scope === scopeName) record.dismiss(immediate, null, "scope-dismissAll");
					}
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
		toastApi.multiLoading = (descriptor = {}) => showMultiLoadingToast(descriptor);
		toastApi.confirm = (descriptor = {}) => showConfirmToast(descriptor);
		toastApi.prompt = (descriptor = {}) => showPromptToast(descriptor);
		toastApi.select = (descriptor = {}) => showSelectToast(descriptor);
		toastApi.picker = (descriptor = {}) => showPickerToast(descriptor);
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
			if (record.externalUpdate && inputArgs.length && isPlainObject(inputArgs[0])) return record.externalUpdate(inputArgs[0]);
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
				animation: next.animation ?? "progress"
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
			const hostWindow = state.hostWindow ?? initialHostWindow;
			let delayIndex = 0;
			for (let index = state.toasts.length - 1; index >= 0; index -= 1) {
				const record = state.toasts[index];
				if (immediate) record.dismiss(true, null, "dismissAll");
				else hostWindow.setTimeout(() => record.dismiss(false, null, "dismissAll"), delayIndex * 28);
				delayIndex += 1;
			}
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
			if (state.taskPersistTimer !== null) {
				(state.hostWindow ?? initialHostWindow).clearTimeout(state.taskPersistTimer);
				state.taskPersistTimer = null;
			}
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
			const previousTheme = state.config.theme;
			const previousSize = state.config.size;
			const previousPersistTasks = state.config.persistTasks;
			const previousUseTopLayer = state.config.useTopLayer;
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
			state.config.stackViewportRatio = clamp(Number(state.config.stackViewportRatio) || DEFAULT_CONFIG.stackViewportRatio, .2, .5);
			state.config.stackAutoCollapseThreshold = Math.max(2, Number(state.config.stackAutoCollapseThreshold) || DEFAULT_CONFIG.stackAutoCollapseThreshold);
			state.config.swipeThreshold = Math.max(24, Number(state.config.swipeThreshold) || DEFAULT_CONFIG.swipeThreshold);
			state.config.swipeVelocity = Math.max(.05, Number(state.config.swipeVelocity) || DEFAULT_CONFIG.swipeVelocity);
			state.config.objectInspectorLoadTimeout = Math.max(1e3, Number(state.config.objectInspectorLoadTimeout) || DEFAULT_CONFIG.objectInspectorLoadTimeout);
			state.config.virtualizeAfter = Math.max(1, Number(state.config.virtualizeAfter) || DEFAULT_CONFIG.virtualizeAfter);
			state.config.virtualRowHeight = Math.max(16, Number(state.config.virtualRowHeight) || DEFAULT_CONFIG.virtualRowHeight);
			state.config.virtualOverscan = Math.max(1, Number(state.config.virtualOverscan) || DEFAULT_CONFIG.virtualOverscan);
			state.config.virtualMaxHeight = Math.max(120, Number(state.config.virtualMaxHeight) || DEFAULT_CONFIG.virtualMaxHeight);
			state.config.theme = normalizeTheme(state.config.theme);
			state.config.size = normalizeToastSize(state.config.size);
			state.config.position = ALLOWED_POSITIONS.has(state.config.position) ? state.config.position : DEFAULT_CONFIG.position;
			state.config.stacked = Boolean(state.config.stacked);
			state.config.stackToolbar = Boolean(state.config.stackToolbar);
			state.config.persistAcrossSpaNavigation = Boolean(state.config.persistAcrossSpaNavigation);
			state.config.minimizeOnSpaNavigation = Boolean(state.config.minimizeOnSpaNavigation);
			state.config.useTopLayer = Boolean(state.config.useTopLayer);
			state.config.idleHostTtl = Number.isFinite(Number(state.config.idleHostTtl)) ? Math.max(0, Number(state.config.idleHostTtl)) : DEFAULT_CONFIG.idleHostTtl;
			state.config.persistTasks = Boolean(state.config.persistTasks);
			state.config.taskProgressPersistInterval = Math.max(100, Number(state.config.taskProgressPersistInterval) || DEFAULT_CONFIG.taskProgressPersistInterval);
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
			if (previousUseTopLayer !== state.config.useTopLayer && state.hostWindow && state.hostDocument && state.hostElement) {
				if (state.config.useTopLayer) {
					installTopLayerGuard(state.hostWindow, state.hostDocument);
					promoteHostToTopLayer(true);
				} else disableHostTopLayer();
			}
			if ((previousHostConfig.useShadowRoot !== state.config.useShadowRoot || previousHostConfig.shadowRootMode !== state.config.shadowRootMode || previousHostConfig.fallbackToLightDom !== state.config.fallbackToLightDom) && state.hostElement) {
				destroyHost({ keepPersistence: state.config.persistAcrossSpaNavigation });
				ensureHost();
			}
			while (getNotificationRecords().length > state.config.maxToasts) {
				const notifications = getNotificationRecords();
				const candidate = notifications.find((record) => record.options.duration > 0) ?? notifications[0];
				if (!candidate) break;
				candidate.dismiss(true, null, "limit");
			}
			if (previousPersistTasks && !state.config.persistTasks && !hasPersistableTasks() && state.taskPersistTimer !== null) {
				(state.hostWindow ?? initialHostWindow).clearTimeout(state.taskPersistTimer);
				state.taskPersistTimer = null;
			}
			if (previousTheme !== state.config.theme) installThemeObserver();
			else if (state.container && state.container.dataset.theme !== state.resolvedTheme) syncTheme();
			if (state.container) {
				setDataValue(state.container, "position", state.config.position);
				setDataValue(state.container, "size", state.config.size);
				syncStackLayout();
			}
			if (previousSize !== state.config.size && hasEventListeners("size:change")) emitEvent("size:change", {
				previousSize,
				size: state.config.size
			});
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
		toastApi.setSize = (size) => {
			const previousSize = state.config.size;
			state.config.size = normalizeToastSize(size);
			if (state.container) {
				setDataValue(state.container, "size", state.config.size);
				syncStackLayout();
			}
			if (previousSize !== state.config.size && hasEventListeners("size:change")) emitEvent("size:change", {
				previousSize,
				size: state.config.size
			});
			return state.config.size;
		};
		toastApi.getSize = () => state.config.size;
		toastApi.getConfig = () => ({
			...state.config,
			resolvedTheme: state.resolvedTheme
		});
		toastApi.getHostMode = () => state.hostMode;
		toastApi.bringToFront = () => {
			ensureHost();
			return promoteHostToTopLayer(true);
		};
		toastApi.isTopLayer = () => isHostInTopLayer();
		toastApi.destroy = (reason = "destroy") => {
			flushTaskSnapshots();
			state.destroying = true;
			const records = [...state.toasts];
			for (const record of records) record.dismiss(true, null, reason);
			for (const group of [...state.groups.values()]) group.unsubscribe?.();
			state.groups.clear();
			if (state.taskPersistTimer !== null) {
				(state.hostWindow ?? initialHostWindow).clearTimeout(state.taskPersistTimer);
				state.taskPersistTimer = null;
			}
			state.listeners.clear();
			state.dialogStack.length = 0;
			state.failedImageKeys.clear();
			state.spaCleanup?.();
			state.spaCleanup = null;
			state.historyRestore?.();
			state.historyRestore = null;
			destroyHost();
			state.api = null;
			safeCall(() => {
				if (typedInitialHostWindow[STATE_SYMBOL] === state) delete typedInitialHostWindow[STATE_SYMBOL];
			}, void 0);
		};
		toastApi.noConflict = () => {
			if (typedInitialHostWindow[TOAST_GLOBAL] === toastApi) {
				if (previousRodToaster) typedInitialHostWindow[TOAST_GLOBAL] = previousRodToaster;
				else safeCall(() => {
					delete typedInitialHostWindow[TOAST_GLOBAL];
				}, void 0);
			}
			if (typedInitialHostWindow.toast === toastApi) {
				if (previousToastGlobal) typedInitialHostWindow.toast = previousToastGlobal;
				else safeCall(() => {
					delete typedInitialHostWindow.toast;
				}, void 0);
			}
			if (typedGlobalWindow[TOAST_GLOBAL] === toastApi) {
				if (previousRodToaster) typedGlobalWindow[TOAST_GLOBAL] = previousRodToaster;
				else safeCall(() => {
					delete typedGlobalWindow[TOAST_GLOBAL];
				}, void 0);
			}
			if (typedGlobalWindow.toast === toastApi) {
				if (previousToastGlobal) typedGlobalWindow.toast = previousToastGlobal;
				else safeCall(() => {
					delete typedGlobalWindow.toast;
				}, void 0);
			}
			return toastApi;
		};
		toastApi.repairHost = () => {
			if (ensureHost() && state.toasts.length) promoteHostToTopLayer(false);
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
	var toaster_default = {};

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
	const __value = Object.prototype.hasOwnProperty.call(toaster_exports, "default") ? toaster_default : Object.prototype.hasOwnProperty.call(toaster_exports, __globalName) ? toaster_exports[__globalName] : __hasExports ? toaster_exports : __existing;
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