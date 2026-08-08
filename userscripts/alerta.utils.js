/* Generated from userscripts/alerta.utils.ts. Do not edit directly. */
//#region userscripts/alerta.utils.ts
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