  const FormatUtils = {
    escapeHtml,
    trimText,
    dedent,
    formatHtml,
    formatCss,
    formatElement,
    normalizeHighlightLanguage,
    highlightCode,
    prettySource,
    stringifyPreview,
  };

  const ObjectUtils = {
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
    clonePlainObject,
  };

  const DomUtils = {
    clampNumber,
    getViewportRect,
    clampPanelRect,
    copyText,
    fallbackCopyText,
    getElementFromObject,
    isReactElement,
    getReactOwnerInfo,
    flashElement,
  };

  const IconUtils = {
    createFallbackIconClass,
    createIconFallbackText,
  };

  const StorageUtils = {
    readStorageValue,
    writeStorageValue,
    createStorageDriver,
  };

  const EventUtils = {
    createEventBus,
  };

;[FormatUtils, 
  ObjectUtils, 
  DomUtils, 
  IconUtils, 
  StorageUtils, 
  EventUtils].forEach(
    util => (window.RodUtils[util] = util)
  )
