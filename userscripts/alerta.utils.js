/* Generated from userscripts/alerta.utils.ts. Do not edit directly. */
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
//#region \0rod-iife-entry:/home/runner/work/rodkisten.github.io/rodkisten.github.io/userscripts/alerta.utils.ts
	const __hasExports = Object.keys(alerta_utils_exports).length > 0;
	const __existing = globalThis["AlertaUtils"];
	const __value = Object.prototype.hasOwnProperty.call(alerta_utils_exports, "default") ? void 0 : Object.prototype.hasOwnProperty.call(alerta_utils_exports, "AlertaUtils") ? void 0 : __hasExports ? alerta_utils_exports : __existing;
	if (__value !== void 0) {
		globalThis["AlertaUtils"] = __value;
		if (typeof window !== "undefined") window["AlertaUtils"] = __value;
	}

//#endregion
return __value;
})();