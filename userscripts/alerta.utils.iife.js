/* Auto-generated from userscripts/alerta.utils.ts. at 8/9/2026, 12:16:36 PM Do not edit directly. */
var AlertaUtils = (function() {

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
//#region userscripts/alerta.utils.ts
	var alerta_utils_exports = /* @__PURE__ */ __exportAll({});
	[
		{
			escapeHtml,
			trimText,
			dedent,
			formatHtml,
			formatCss,
			formatElement,
			normalizeHighlightLanguage,
			highlightCode,
			prettySource,
			stringifyPreview
		},
		{
			isObjectLike,
			isPlainObject,
			isNodeListLike,
			safeCall,
			hashText,
			getNodeLabel,
			getObjectPreview,
			getRichCode,
			getCodeLanguage,
			formatValue,
			clonePlainObject
		},
		{
			clampNumber,
			getViewportRect,
			clampPanelRect,
			copyText,
			fallbackCopyText,
			getElementFromObject,
			isReactElement,
			getReactOwnerInfo,
			flashElement
		},
		{
			createFallbackIconClass,
			createIconFallbackText
		},
		{
			readStorageValue,
			writeStorageValue,
			createStorageDriver
		},
		{ createEventBus }
	].forEach((util) => window.RodUtils[util] = util);

//#endregion
//#region \0rod-iife-entry:browser:/home/runner/work/rodkisten.github.io/rodkisten.github.io/userscripts/alerta.utils.ts
	const __globalName = "AlertaUtils";
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
	const __hasExports = Object.keys(alerta_utils_exports).length > 0;
	const __value = Object.prototype.hasOwnProperty.call(alerta_utils_exports, "default") ? void 0 : Object.prototype.hasOwnProperty.call(alerta_utils_exports, __globalName) ? alerta_utils_exports[__globalName] : __hasExports ? alerta_utils_exports : __existing;
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