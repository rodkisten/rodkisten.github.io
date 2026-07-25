(function BlockerRuntime(globalWindow) {
  'use strict';

  if (globalWindow.Blocker?.__isBlockerRuntime) {
    return;
  }

  const SCRIPT = Object.freeze({
    name: 'Blocker',
    version: '2.0.0',
    globalName: 'Blocker',
    queueName: 'BlockerQueue',
  });

  const CONFIG = {
    debug: true,
    logLevel: 'debug',
    colouredLogs: true,
    collapsedLogGroups: true,
    observeMutations: true,
    observeAttributes: false,
    observeCharacterData: false,
    observeShadowRoots: true,
    processExistingShadowRoots: true,
    observerDebounceMs: 80,
    navigationDebounceMs: 30,
    maximumTextCandidates: 10_000,
    interceptFetch: true,
    interceptScripts: true,
    interceptXHR: true,
    interceptWorkers: true,
    interceptDynamicCode: true,
    interceptDocumentWrite: true,
    interceptScriptPreloads: true,
    interceptWebAssembly: true,
    logAllScripts: false,
    logAllFetches: false,
    logFetchBodies: false,
    maximumLoggedBodyLength: 2_000,
    dispatchEvents: true,
  };

  const ACTIONS = Object.freeze({
    HIDE: 'hide',
    REMOVE: 'remove',
    REPLACE: 'replace',
    CLICK: 'click',
    SET_ATTRIBUTE: 'set-attribute',
    REMOVE_ATTRIBUTE: 'remove-attribute',
    SET_PROPERTY: 'set-property',
    ADD_CLASS: 'add-class',
    REMOVE_CLASS: 'remove-class',
    UNWRAP: 'unwrap',
    CUSTOM: 'custom',
  });

  const FETCH_ACTIONS = Object.freeze({
    ALLOW: 'allow',
    BLOCK: 'block',
    REDIRECT: 'redirect',
    MODIFY_REQUEST: 'modify-request',
    MODIFY_RESPONSE: 'modify-response',
    CUSTOM: 'custom',
  });

  const RULE_TYPES = Object.freeze({
    DOM: 'dom',
    FETCH: 'fetch',
    SCRIPT: 'script',
  });

  const SCRIPT_ACTIONS = Object.freeze({
    ALLOW: 'allow',
    BLOCK: 'block',
    REDIRECT: 'redirect',
    MODIFY: 'modify',
    CUSTOM: 'custom',
  });

  const SCRIPT_KINDS = Object.freeze({
    ELEMENT: 'script-element',
    INLINE: 'inline-script',
    XHR: 'xhr',
    WORKER: 'worker',
    SHARED_WORKER: 'shared-worker',
    SERVICE_WORKER: 'service-worker',
    EVAL: 'eval',
    FUNCTION: 'function',
    TIMER: 'timer',
    DOCUMENT_WRITE: 'document-write',
    PRELOAD: 'script-preload',
    MODULE_PRELOAD: 'module-preload',
    WEBASSEMBLY: 'webassembly',
  });

  const SELECT_STEPS = Object.freeze({
    CSS: 'css',
    XPATH: 'xpath',
    TEXT: 'text',
    ROLE: 'role',
    TEST_ID: 'test-id',
    TAG: 'tag',
    CUSTOM_SOURCE: 'custom-source',
    WITHIN: 'within',
    FILTER_TEXT: 'filter-text',
    FILTER_ATTRIBUTE: 'filter-attribute',
    FILTER_ATTRIBUTE_EXISTS: 'filter-attribute-exists',
    FILTER_PROPERTY: 'filter-property',
    FILTER_VISIBLE: 'filter-visible',
    FILTER_HIDDEN: 'filter-hidden',
    FILTER_ENABLED: 'filter-enabled',
    FILTER_DISABLED: 'filter-disabled',
    FILTER_IN_VIEWPORT: 'filter-in-viewport',
    FILTER_HAS: 'filter-has',
    FILTER_NOT: 'filter-not',
    FILTER_CUSTOM: 'filter-custom',
    CLOSEST: 'closest',
    PARENT: 'parent',
    CHILDREN: 'children',
    DESCENDANTS: 'descendants',
    NEXT: 'next',
    PREVIOUS: 'previous',
    SHADOW: 'shadow',
    UNIQUE: 'unique',
    FIRST: 'first',
    LAST: 'last',
    AT: 'at',
    LIMIT: 'limit',
    FALLBACK: 'fallback',
  });

  const LOG_LEVELS = Object.freeze({
    trace: 0,
    debug: 1,
    info: 2,
    success: 2,
    warn: 3,
    error: 4,
    silent: 99,
  });

  const LOG_STYLES = Object.freeze({
    trace: ['background:#475569;color:#fff;', 'color:#64748b;'],
    debug: ['background:#4f46e5;color:#fff;', 'color:#818cf8;'],
    info: ['background:#0369a1;color:#fff;', 'color:#38bdf8;'],
    success: ['background:#047857;color:#fff;', 'color:#10b981;'],
    warn: ['background:#b45309;color:#fff;', 'color:#f59e0b;'],
    error: ['background:#b91c1c;color:#fff;', 'color:#ef4444;'],
    dom: ['background:#0f766e;color:#fff;', 'color:#14b8a6;'],
    fetch: ['background:#6d28d9;color:#fff;', 'color:#a78bfa;'],
    script: ['background:#9f1239;color:#fff;', 'color:#fb7185;'],
    select: ['background:#4338ca;color:#fff;', 'color:#8b5cf6;'],
    plugin: ['background:#be185d;color:#fff;', 'color:#ec4899;'],
    loader: ['background:#334155;color:#fff;', 'color:#94a3b8;'],
  });

  const INTERNAL = {
    initialized: false,
    stylesInstalled: false,
    navigationInstalled: false,
    shadowHookInstalled: false,
    fetchInstalled: false,
    scriptInterceptorsInstalled: false,
    currentUrl: location.href,
    observerTimer: null,
    navigationTimer: null,
    ruleSequence: 0,
    fetchSequence: 0,
    runSequence: 0,
    rulesById: new Map(),
    domRules: [],
    fetchRules: [],
    scriptRules: [],
    processedElements: new WeakMap(),
    observedRoots: new WeakSet(),
    observers: new Set(),
    originalFetch: null,
    originals: new Map(),
    originalAttachShadow: null,
    originalHistoryMethods: new Map(),
  };

  function timestamp() {
    return new Date().toLocaleTimeString('pt-BR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  }

  function duration(startTime) {
    return `${(performance.now() - startTime).toFixed(2)}ms`;
  }

  function shouldLog(level) {
    const configured = LOG_LEVELS[CONFIG.logLevel] ?? LOG_LEVELS.debug;
    const requested = LOG_LEVELS[level] ?? LOG_LEVELS.info;

    return CONFIG.debug && requested >= configured;
  }

  function writeLog(level, scope, message, ...values) {
    if (!shouldLog(level)) {
      return;
    }

    const method = level === 'success' ? console.info : console[level] || console.log;
    const style = LOG_STYLES[scope] || LOG_STYLES[level] || LOG_STYLES.info;

    if (CONFIG.colouredLogs) {
      method.call(
        console,
        `%c${SCRIPT.name}:${scope}%c ${timestamp()} %c${message}`,
        `${style[0]}border-radius:4px;padding:2px 6px;font-weight:700;`,
        'color:#94a3b8;font-weight:500;',
        style[1],
        ...values,
      );
      return;
    }

    method.call(console, `[${SCRIPT.name}:${scope}] ${timestamp()} ${message}`, ...values);
  }

  function writeGroup(level, scope, title, callback) {
    if (!shouldLog(level)) {
      return callback?.();
    }

    const style = LOG_STYLES[scope] || LOG_STYLES[level] || LOG_STYLES.info;
    const group = CONFIG.collapsedLogGroups ? console.groupCollapsed : console.group;

    if (CONFIG.colouredLogs) {
      group.call(
        console,
        `%c${SCRIPT.name}:${scope}%c ${timestamp()} %c${title}`,
        `${style[0]}border-radius:4px;padding:2px 6px;font-weight:700;`,
        'color:#94a3b8;font-weight:500;',
        style[1],
      );
    } else {
      group.call(console, `[${SCRIPT.name}:${scope}] ${timestamp()} ${title}`);
    }

    try {
      return callback?.();
    } finally {
      console.groupEnd();
    }
  }

  const debug = Object.freeze({
    trace: (scope, message, ...values) => writeLog('trace', scope, message, ...values),
    debug: (scope, message, ...values) => writeLog('debug', scope, message, ...values),
    info: (scope, message, ...values) => writeLog('info', scope, message, ...values),
    success: (scope, message, ...values) => writeLog('success', scope, message, ...values),
    warn: (scope, message, ...values) => writeLog('warn', scope, message, ...values),
    error: (scope, message, ...values) => writeLog('error', scope, message, ...values),
    group: writeGroup,
    get config() {
      return { ...CONFIG };
    },
  });

  function dispatchEvent(name, detail = {}) {
    if (!CONFIG.dispatchEvents) {
      return;
    }

    globalWindow.dispatchEvent(new CustomEvent(`blocker:${name}`, {
      detail: {
        timestamp: Date.now(),
        ...detail,
      },
    }));
  }

  function flatten(values) {
    const output = [];

    for (const value of values) {
      if (Array.isArray(value)) {
        output.push(...flatten(value));
      } else if (value != null) {
        output.push(value);
      }
    }

    return output;
  }

  function uniqueElements(elements) {
    return Array.from(new Set(elements.filter((element) => element instanceof Element)));
  }

  function normalizeWhitespace(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function normalizeElements(value) {
    if (value == null) {
      return [];
    }

    if (value instanceof Element) {
      return [value];
    }

    if (value instanceof DocumentFragment) {
      return Array.from(value.children);
    }

    if (value instanceof NodeList || value instanceof HTMLCollection || Array.isArray(value)) {
      return uniqueElements(Array.from(value));
    }

    if (typeof value !== 'string' && typeof value?.[Symbol.iterator] === 'function') {
      return uniqueElements(Array.from(value));
    }

    return [];
  }

  function matchesValue(actual, expected, context) {
    if (expected == null) {
      return true;
    }

    if (Array.isArray(expected)) {
      return expected.some((entry) => matchesValue(actual, entry, context));
    }

    if (expected instanceof RegExp) {
      expected.lastIndex = 0;
      return expected.test(String(actual));
    }

    if (typeof expected === 'function') {
      return Boolean(expected(actual, context));
    }

    return String(actual) === String(expected);
  }

  function matchesText(actual, expected, options = {}, element) {
    const normalizedActual = normalizeWhitespace(actual);

    if (expected instanceof RegExp) {
      expected.lastIndex = 0;
      return expected.test(normalizedActual);
    }

    if (typeof expected === 'function') {
      return Boolean(expected(normalizedActual, element));
    }

    const normalizedExpected = normalizeWhitespace(expected);
    const comparableActual = options.caseSensitive ? normalizedActual : normalizedActual.toLocaleLowerCase();
    const comparableExpected = options.caseSensitive ? normalizedExpected : normalizedExpected.toLocaleLowerCase();

    return options.exact ? comparableActual === comparableExpected : comparableActual.includes(comparableExpected);
  }

  function isVisible(element) {
    if (!(element instanceof Element) || !element.isConnected) {
      return false;
    }

    const style = globalWindow.getComputedStyle(element);

    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number(style.opacity) === 0) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isInViewport(element, margin = 0) {
    const rect = element.getBoundingClientRect();

    return rect.bottom >= -margin && rect.right >= -margin && rect.top <= globalWindow.innerHeight + margin && rect.left <= globalWindow.innerWidth + margin;
  }

  function queryCss(root, selector) {
    if (!root || typeof root.querySelectorAll !== 'function') {
      return [];
    }

    try {
      return Array.from(root.querySelectorAll(selector));
    } catch (error) {
      debug.warn('select', `Invalid CSS selector: ${selector}`, error);
      return [];
    }
  }

  function queryXPath(root, expression) {
    const ownerDocument = root instanceof Document ? root : root?.ownerDocument || document;

    try {
      const result = ownerDocument.evaluate(expression, root, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const elements = [];

      for (let index = 0; index < result.snapshotLength; index += 1) {
        const node = result.snapshotItem(index);

        if (node instanceof Element) {
          elements.push(node);
        } else if (node?.parentElement) {
          elements.push(node.parentElement);
        }
      }

      return uniqueElements(elements);
    } catch (error) {
      debug.warn('select', `Invalid XPath expression: ${expression}`, error);
      return [];
    }
  }

  /**
   * Immutable selector builder.
   *
   * Every method returns a new SelectQuery. Reusing a base query therefore
   * never mutates rules that already reference it.
   *
   * @example
   * const buttons = Blocker.select('button');
   * const visibleButtons = buttons.visible();
   * const saveButtons = buttons.hasText(/save|salvar/i);
   */
  class SelectQuery {
    constructor(steps = []) {
      this.steps = Object.freeze(steps.map((step) => Object.freeze({ ...step })));
      Object.freeze(this);
    }

    append(type, payload = {}) {
      return new SelectQuery([...this.steps, { type, ...payload }]);
    }

    css(selector) {
      return this.append(SELECT_STEPS.CSS, { selector });
    }

    xpath(expression) {
      return this.append(SELECT_STEPS.XPATH, { expression });
    }

    text(expected, options = {}) {
      return this.append(SELECT_STEPS.TEXT, { expected, options });
    }

    role(roleName, options = {}) {
      return this.append(SELECT_STEPS.ROLE, { roleName, options });
    }

    testId(value, attribute = 'data-testid') {
      return this.append(SELECT_STEPS.TEST_ID, { value, attribute });
    }

    tag(tagName) {
      return this.append(SELECT_STEPS.TAG, { tagName });
    }

    custom(resolver) {
      return this.append(SELECT_STEPS.CUSTOM_SOURCE, { resolver });
    }

    within(target) {
      return this.append(SELECT_STEPS.WITHIN, { target });
    }

    hasText(expected, options = {}) {
      return this.append(SELECT_STEPS.FILTER_TEXT, { expected, options });
    }

    attribute(name, expected) {
      return this.append(SELECT_STEPS.FILTER_ATTRIBUTE, { name, expected });
    }

    attributeExists(name) {
      return this.append(SELECT_STEPS.FILTER_ATTRIBUTE_EXISTS, { name });
    }

    property(name, expected) {
      return this.append(SELECT_STEPS.FILTER_PROPERTY, { name, expected });
    }

    visible() {
      return this.append(SELECT_STEPS.FILTER_VISIBLE);
    }

    hidden() {
      return this.append(SELECT_STEPS.FILTER_HIDDEN);
    }

    enabled() {
      return this.append(SELECT_STEPS.FILTER_ENABLED);
    }

    disabled() {
      return this.append(SELECT_STEPS.FILTER_DISABLED);
    }

    inViewport(margin = 0) {
      return this.append(SELECT_STEPS.FILTER_IN_VIEWPORT, { margin });
    }

    has(target) {
      return this.append(SELECT_STEPS.FILTER_HAS, { target });
    }

    not(target) {
      return this.append(SELECT_STEPS.FILTER_NOT, { target });
    }

    filter(predicate) {
      return this.append(SELECT_STEPS.FILTER_CUSTOM, { predicate });
    }

    closest(selector) {
      return this.append(SELECT_STEPS.CLOSEST, { selector });
    }

    parent(selector) {
      return this.append(SELECT_STEPS.PARENT, { selector });
    }

    children(selector = '*') {
      return this.append(SELECT_STEPS.CHILDREN, { selector });
    }

    descendants(selector = '*') {
      return this.append(SELECT_STEPS.DESCENDANTS, { selector });
    }

    next(selector) {
      return this.append(SELECT_STEPS.NEXT, { selector });
    }

    previous(selector) {
      return this.append(SELECT_STEPS.PREVIOUS, { selector });
    }

    shadow() {
      return this.append(SELECT_STEPS.SHADOW);
    }

    unique() {
      return this.append(SELECT_STEPS.UNIQUE);
    }

    first() {
      return this.append(SELECT_STEPS.FIRST);
    }

    last() {
      return this.append(SELECT_STEPS.LAST);
    }

    at(index) {
      return this.append(SELECT_STEPS.AT, { index });
    }

    limit(count) {
      return this.append(SELECT_STEPS.LIMIT, { count });
    }

    fallback(...queries) {
      return this.append(SELECT_STEPS.FALLBACK, { queries: flatten(queries) });
    }

    resolve(root = document, context = getPageContext()) {
      return resolveSelectQuery(this, root, context);
    }

    toJSON() {
      return {
        type: 'blocker-select',
        steps: this.steps,
      };
    }
  }

  function select(initialSelector) {
    const query = new SelectQuery();
    return initialSelector == null ? query : query.css(initialSelector);
  }

  const query = select;

  function selectAny(...queries) {
    return select().custom(({ root, context }) => uniqueElements(flatten(queries).flatMap((entry) => resolveSelector(entry, root, context))));
  }

  function selectFirst(...queries) {
    return select().custom(({ root, context }) => {
      for (const entry of flatten(queries)) {
        const matches = resolveSelector(entry, root, context);

        if (matches.length > 0) {
          return matches;
        }
      }

      return [];
    });
  }

  function runStep(current, step, root, context) {
    switch (step.type) {
      case SELECT_STEPS.CSS:
        return current.length === 0 ? queryCss(root, step.selector) : uniqueElements(current.flatMap((element) => queryCss(element, step.selector)));

      case SELECT_STEPS.XPATH:
        return current.length === 0 ? queryXPath(root, step.expression) : uniqueElements(current.flatMap((element) => queryXPath(element, step.expression)));

      case SELECT_STEPS.TEXT: {
        const scope = current.length === 0 ? queryCss(root, step.options.selector || 'button, a, [role="button"], label, summary, p, span, div') : current;
        return scope.filter((element) => matchesText(element.textContent, step.expected, step.options, element));
      }

      case SELECT_STEPS.ROLE: {
        const selector = `[role="${CSS.escape(String(step.roleName))}"]`;
        const scope = current.length === 0 ? queryCss(root, selector) : current.filter((element) => element.getAttribute('role') === String(step.roleName));
        return step.options?.name == null ? scope : scope.filter((element) => matchesText(element.getAttribute('aria-label') || element.textContent, step.options.name, step.options, element));
      }

      case SELECT_STEPS.TEST_ID: {
        const selector = `[${CSS.escape(step.attribute)}="${CSS.escape(String(step.value))}"]`;
        return current.length === 0 ? queryCss(root, selector) : current.filter((element) => element.getAttribute(step.attribute) === String(step.value));
      }

      case SELECT_STEPS.TAG:
        return current.length === 0 ? queryCss(root, String(step.tagName)) : current.filter((element) => element.localName === String(step.tagName).toLocaleLowerCase());

      case SELECT_STEPS.CUSTOM_SOURCE:
        return normalizeElements(step.resolver({ root, context, current: [...current], Blocker: PUBLIC_API }));

      case SELECT_STEPS.WITHIN: {
        const scopes = resolveSelector(step.target, root, context);
        return uniqueElements(scopes.flatMap((scope) => current.length === 0 ? Array.from(scope.children) : current.filter((element) => scope.contains(element))));
      }

      case SELECT_STEPS.FILTER_TEXT:
        return current.filter((element) => matchesText(element.textContent, step.expected, step.options, element));

      case SELECT_STEPS.FILTER_ATTRIBUTE:
        return current.filter((element) => matchesValue(element.getAttribute(step.name), step.expected, { element, context }));

      case SELECT_STEPS.FILTER_ATTRIBUTE_EXISTS:
        return current.filter((element) => element.hasAttribute(step.name));

      case SELECT_STEPS.FILTER_PROPERTY:
        return current.filter((element) => matchesValue(element[step.name], step.expected, { element, context }));

      case SELECT_STEPS.FILTER_VISIBLE:
        return current.filter(isVisible);

      case SELECT_STEPS.FILTER_HIDDEN:
        return current.filter((element) => !isVisible(element));

      case SELECT_STEPS.FILTER_ENABLED:
        return current.filter((element) => !element.matches(':disabled,[aria-disabled="true"]'));

      case SELECT_STEPS.FILTER_DISABLED:
        return current.filter((element) => element.matches(':disabled,[aria-disabled="true"]'));

      case SELECT_STEPS.FILTER_IN_VIEWPORT:
        return current.filter((element) => isInViewport(element, step.margin));

      case SELECT_STEPS.FILTER_HAS:
        return current.filter((element) => resolveSelector(step.target, element, context).length > 0);

      case SELECT_STEPS.FILTER_NOT:
        return current.filter((element) => resolveSelector(step.target, element, context).length === 0 && !matchesElementSelector(element, step.target, context));

      case SELECT_STEPS.FILTER_CUSTOM:
        return current.filter((element, index) => Boolean(step.predicate(element, index, context)));

      case SELECT_STEPS.CLOSEST:
        return uniqueElements(current.map((element) => element.closest(step.selector)).filter(Boolean));

      case SELECT_STEPS.PARENT:
        return uniqueElements(current.map((element) => element.parentElement).filter((element) => element && (!step.selector || element.matches(step.selector))));

      case SELECT_STEPS.CHILDREN:
        return uniqueElements(current.flatMap((element) => Array.from(element.children).filter((child) => child.matches(step.selector))));

      case SELECT_STEPS.DESCENDANTS:
        return uniqueElements(current.flatMap((element) => queryCss(element, step.selector)));

      case SELECT_STEPS.NEXT:
        return uniqueElements(current.map((element) => element.nextElementSibling).filter((element) => element && (!step.selector || element.matches(step.selector))));

      case SELECT_STEPS.PREVIOUS:
        return uniqueElements(current.map((element) => element.previousElementSibling).filter((element) => element && (!step.selector || element.matches(step.selector))));

      case SELECT_STEPS.SHADOW:
        return uniqueElements(current.flatMap((element) => element.shadowRoot ? Array.from(element.shadowRoot.children) : []));

      case SELECT_STEPS.UNIQUE:
        return uniqueElements(current);

      case SELECT_STEPS.FIRST:
        return current.slice(0, 1);

      case SELECT_STEPS.LAST:
        return current.slice(-1);

      case SELECT_STEPS.AT: {
        const match = current.at(step.index);
        return match ? [match] : [];
      }

      case SELECT_STEPS.LIMIT:
        return current.slice(0, Math.max(0, step.count));

      case SELECT_STEPS.FALLBACK:
        if (current.length > 0) {
          return current;
        }

        for (const fallbackQuery of step.queries) {
          const matches = resolveSelector(fallbackQuery, root, context);

          if (matches.length > 0) {
            return matches;
          }
        }

        return [];

      default:
        debug.warn('select', `Unknown select step: ${step.type}`);
        return current;
    }
  }

  function resolveSelectQuery(selectQuery, root = document, context = getPageContext()) {
    const startedAt = performance.now();
    let current = [];

    for (const step of selectQuery.steps) {
      current = runStep(current, step, root, context);
    }

    const result = uniqueElements(current);

    debug.trace('select', `Resolved ${result.length} element(s) through ${selectQuery.steps.length} step(s) in ${duration(startedAt)}.`, selectQuery.toJSON());

    return result;
  }

  function matchesElementSelector(element, target, context) {
    if (typeof target === 'string') {
      try {
        return element.matches(target);
      } catch {
        return false;
      }
    }

    if (target instanceof SelectQuery) {
      return resolveSelectQuery(target, element.ownerDocument || document, context).includes(element);
    }

    return false;
  }

  function resolveSelector(target, root = document, context = getPageContext()) {
    if (target instanceof SelectQuery) {
      return resolveSelectQuery(target, root, context);
    }

    if (typeof target === 'string') {
      return queryCss(root, target);
    }

    if (typeof target === 'function') {
      return normalizeElements(target({ root, context, Blocker: PUBLIC_API }));
    }

    if (Array.isArray(target)) {
      return uniqueElements(target.flatMap((entry) => resolveSelector(entry, root, context)));
    }

    if (target?.xpath) {
      return queryXPath(root, target.xpath);
    }

    if (target?.selector) {
      return queryCss(root, target.selector);
    }

    if (Object.prototype.hasOwnProperty.call(target || {}, 'text')) {
      return select().text(target.text, target).resolve(root, context);
    }

    if (typeof target?.resolve === 'function') {
      return normalizeElements(target.resolve({ root, context, Blocker: PUBLIC_API }));
    }

    return [];
  }

  function createAction(action, targets, options = {}) {
    return { action, targets: flatten(targets), ...options };
  }

  function hide(...targets) {
    return createAction(ACTIONS.HIDE, targets);
  }

  function remove(...targets) {
    return createAction(ACTIONS.REMOVE, targets);
  }

  function replace(target, replacement, options = {}) {
    return createAction(ACTIONS.REPLACE, [target], { with: replacement, ...options });
  }

  function click(...targets) {
    return createAction(ACTIONS.CLICK, targets);
  }

  function setAttributes(target, attributes, options = {}) {
    return createAction(ACTIONS.SET_ATTRIBUTE, [target], { attributes, ...options });
  }

  function removeAttributes(target, ...attributes) {
    return createAction(ACTIONS.REMOVE_ATTRIBUTE, [target], { attributes: flatten(attributes) });
  }

  function setProperties(target, properties, options = {}) {
    return createAction(ACTIONS.SET_PROPERTY, [target], { properties, ...options });
  }

  function addClass(target, ...classNames) {
    return createAction(ACTIONS.ADD_CLASS, [target], { classNames: flatten(classNames) });
  }

  function removeClass(target, ...classNames) {
    return createAction(ACTIONS.REMOVE_CLASS, [target], { classNames: flatten(classNames) });
  }

  function unwrap(...targets) {
    return createAction(ACTIONS.UNWRAP, targets);
  }

  function customAction(target, handler, options = {}) {
    return createAction(ACTIONS.CUSTOM, [target], { handler, ...options });
  }

  function getPageContext(overrides = {}) {
    return {
      window: globalWindow,
      document,
      location,
      url: location.href,
      origin: location.origin,
      protocol: location.protocol,
      hostname: location.hostname,
      host: location.host,
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      title: document.title,
      Blocker: PUBLIC_API,
      ...overrides,
    };
  }

  function matchesHost(hostname, matcher, context) {
    if (matcher == null || matcher === '*') {
      return true;
    }

    if (Array.isArray(matcher)) {
      return matcher.some((entry) => matchesHost(hostname, entry, context));
    }

    if (matcher instanceof RegExp) {
      matcher.lastIndex = 0;
      return matcher.test(hostname);
    }

    if (typeof matcher === 'function') {
      return Boolean(matcher(context));
    }

    const pattern = String(matcher).toLocaleLowerCase();
    const actual = hostname.toLocaleLowerCase();

    if (pattern.startsWith('*.')) {
      const base = pattern.slice(2);
      return actual === base || actual.endsWith(`.${base}`);
    }

    return actual === pattern;
  }


  /**
   * Creates a script/resource rule without registering it.
   *
   * @example
   * Blocker.blockScript({ src: /googletagmanager|google-analytics/i });
   */
  function blockScript(match, options = {}) {
    return { type: RULE_TYPES.SCRIPT, match, action: SCRIPT_ACTIONS.BLOCK, ...options };
  }

  function allowScript(match, options = {}) {
    return { type: RULE_TYPES.SCRIPT, match, action: SCRIPT_ACTIONS.ALLOW, ...options };
  }

  function redirectScript(match, redirect, options = {}) {
    return { type: RULE_TYPES.SCRIPT, match, action: SCRIPT_ACTIONS.REDIRECT, redirect, ...options };
  }

  function modifyScript(match, modify, options = {}) {
    return { type: RULE_TYPES.SCRIPT, match, action: SCRIPT_ACTIONS.MODIFY, modify, ...options };
  }

  function customScriptRule(match, handler, options = {}) {
    return { type: RULE_TYPES.SCRIPT, match, action: SCRIPT_ACTIONS.CUSTOM, handler, ...options };
  }

  function addScriptRule(rule, options = {}) {
    return addRule({ type: RULE_TYPES.SCRIPT, ...rule }, options);
  }

  function addScriptRules(rules, options = {}) {
    return addRules(rules.map((rule) => ({ type: RULE_TYPES.SCRIPT, ...rule })), options);
  }

  function matchValue(actual, expected, context) {
    if (expected == null) return true;
    if (Array.isArray(expected)) return expected.some((entry) => matchValue(actual, entry, context));
    if (expected instanceof RegExp) {
      expected.lastIndex = 0;
      return expected.test(String(actual ?? ''));
    }
    if (typeof expected === 'function') return Boolean(expected(actual, context));
    return String(actual ?? '') === String(expected);
  }

  function createScriptContext(kind, values = {}) {
    const rawUrl = values.url || values.src || '';
    let parsedUrl = null;

    try {
      if (rawUrl) parsedUrl = new URL(String(rawUrl), location.href);
    } catch {}

    return {
      kind,
      url: parsedUrl?.href || String(rawUrl || ''),
      src: parsedUrl?.href || String(rawUrl || ''),
      hostname: parsedUrl?.hostname || '',
      host: parsedUrl?.host || '',
      pathname: parsedUrl?.pathname || '',
      origin: parsedUrl?.origin || '',
      inline: values.inline ?? values.code ?? '',
      code: values.code ?? values.inline ?? '',
      type: values.type || '',
      method: String(values.method || '').toUpperCase(),
      element: values.element || null,
      args: values.args || [],
      options: values.options,
      page: getPageContext(),
      ...values,
    };
  }

  function matchesScriptRule(rule, context) {
    if (rule.enabled === false) return false;
    if (rule.kind != null && !matchValue(context.kind, rule.kind, context)) return false;
    if (rule.host != null && !matchesHost(location.hostname, rule.host, getPageContext())) return false;

    const match = rule.match;
    if (match == null) return true;
    if (typeof match === 'string') return context.url.includes(match) || context.code.includes(match);
    if (match instanceof RegExp) {
      match.lastIndex = 0;
      return match.test(context.url || context.code);
    }
    if (typeof match === 'function') return Boolean(match(context));
    if (Array.isArray(match)) return match.some((entry) => matchesScriptRule({ ...rule, match: entry }, context));
    if (typeof match !== 'object') return false;

    if (match.kind != null && !matchValue(context.kind, match.kind, context)) return false;
    if (match.src != null && !matchValue(context.src, match.src, context)) return false;
    if (match.url != null && !matchValue(context.url, match.url, context)) return false;
    if (match.hostname != null && !matchesHost(context.hostname, match.hostname, context)) return false;
    if (match.pathname != null && !matchValue(context.pathname, match.pathname, context)) return false;
    if (match.inline != null && !matchValue(context.inline, match.inline, context)) return false;
    if (match.code != null && !matchValue(context.code, match.code, context)) return false;
    if (match.type != null && !matchValue(context.type, match.type, context)) return false;
    if (match.method != null && !matchValue(context.method, String(match.method).toUpperCase(), context)) return false;
    if (typeof match.test === 'function' && !match.test(context)) return false;
    return true;
  }

  function evaluateScriptRules(context) {
    const result = {
      action: SCRIPT_ACTIONS.ALLOW,
      context,
      matchedRules: [],
      redirect: null,
      replacement: null,
      customResult: null,
    };

    for (const rule of INTERNAL.scriptRules) {
      let matched = false;
      try {
        matched = matchesScriptRule(rule, context);
      } catch (error) {
        debug.error('script', `Matcher failed for "${rule.name || rule.id}".`, error);
      }
      if (!matched) continue;

      result.matchedRules.push(rule);
      const action = rule.action || SCRIPT_ACTIONS.BLOCK;

      if (action === SCRIPT_ACTIONS.CUSTOM && typeof rule.handler === 'function') {
        try {
          result.customResult = rule.handler(context, result);
          if (result.customResult?.action) result.action = result.customResult.action;
          if (result.customResult?.redirect) result.redirect = result.customResult.redirect;
          if (Object.prototype.hasOwnProperty.call(result.customResult || {}, 'replacement')) result.replacement = result.customResult.replacement;
        } catch (error) {
          debug.error('script', `Custom handler failed for "${rule.name || rule.id}".`, error);
        }
      } else if (action === SCRIPT_ACTIONS.REDIRECT) {
        result.action = action;
        result.redirect = typeof rule.redirect === 'function' ? rule.redirect(context) : rule.redirect;
      } else if (action === SCRIPT_ACTIONS.MODIFY) {
        result.action = action;
        result.replacement = typeof rule.modify === 'function' ? rule.modify(context) : rule.modify;
      } else {
        result.action = action;
      }

      if (rule.continue !== true || result.action === SCRIPT_ACTIONS.ALLOW) break;
    }

    if (CONFIG.logAllScripts || result.matchedRules.length) {
      const level = result.action === SCRIPT_ACTIONS.BLOCK ? 'warn' : 'debug';
      writeGroup(level, 'script', `${context.kind} ${result.action}: ${context.url || truncateCode(context.code)}`, () => {
        console.log('Context:', context);
        console.log('Matched rules:', result.matchedRules.map(({ id, name, action }) => ({ id, name, action })));
      });
    }

    dispatchEvent('script', {
      kind: context.kind,
      url: context.url,
      action: result.action,
      matchedRuleIds: result.matchedRules.map((rule) => rule.id),
    });

    return result;
  }

  function truncateCode(code, maximum = 120) {
    const normalized = String(code || '').replace(/\s+/g, ' ').trim();
    return normalized.length > maximum ? `${normalized.slice(0, maximum)}…` : normalized;
  }

  function rememberOriginal(key, value) {
    if (!INTERNAL.originals.has(key)) INTERNAL.originals.set(key, value);
    return value;
  }

  function preventScriptElement(script, reason = 'blocked') {
    try {
      script.type = 'application/x-blocker-blocked';
      script.dataset.blockerStatus = reason;
      script.removeAttribute('src');
      script.textContent = '';
    } catch {}
  }

  function inspectScriptElement(script) {
    const src = script.getAttribute('src') || script.src || '';
    const context = createScriptContext(src ? SCRIPT_KINDS.ELEMENT : SCRIPT_KINDS.INLINE, {
      src,
      url: src,
      inline: src ? '' : script.textContent || '',
      code: src ? '' : script.textContent || '',
      type: script.getAttribute('type') || '',
      element: script,
    });
    return evaluateScriptRules(context);
  }

  function applyScriptElementDecision(script, decision) {
    if (decision.action === SCRIPT_ACTIONS.BLOCK) {
      preventScriptElement(script);
      return false;
    }
    if (decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect) {
      script.src = new URL(String(decision.redirect), location.href).href;
    }
    if (decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null) {
      if (script.src) script.removeAttribute('src');
      script.textContent = String(decision.replacement);
    }
    return true;
  }

  function inspectNodeForScripts(node) {
    if (!(node instanceof Node)) return true;
    const scripts = [];
    const links = [];
    if (node instanceof HTMLScriptElement) scripts.push(node);
    if (node instanceof HTMLLinkElement) links.push(node);
    if (node instanceof Element || node instanceof DocumentFragment) {
      scripts.push(...node.querySelectorAll?.('script') || []);
      links.push(...node.querySelectorAll?.('link[rel="preload"][as="script"],link[rel="modulepreload"]') || []);
    }
    for (const script of scripts) {
      if (!applyScriptElementDecision(script, inspectScriptElement(script))) return false;
    }
    for (const link of links) inspectScriptPreload(link);
    return true;
  }

  function inspectScriptPreload(link) {
    const rel = String(link.rel || '').toLowerCase();
    const kind = rel === 'modulepreload' ? SCRIPT_KINDS.MODULE_PRELOAD : SCRIPT_KINDS.PRELOAD;
    const decision = evaluateScriptRules(createScriptContext(kind, { src: link.href, url: link.href, element: link, type: rel }));
    if (decision.action === SCRIPT_ACTIONS.BLOCK) {
      link.removeAttribute('href');
      link.dataset.blockerStatus = 'blocked';
      return false;
    }
    if (decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect) link.href = new URL(String(decision.redirect), location.href).href;
    return true;
  }

  function installDomScriptInterceptors() {
    const methods = ['appendChild', 'insertBefore', 'replaceChild'];
    for (const methodName of methods) {
      const original = rememberOriginal(`Node.${methodName}`, Node.prototype[methodName]);
      Node.prototype[methodName] = function blockerNodeInsertion(node, ...rest) {
        inspectNodeForScripts(node);
        return Reflect.apply(original, this, [node, ...rest]);
      };
    }

    for (const methodName of ['append', 'prepend', 'before', 'after', 'replaceWith']) {
      const prototype = methodName === 'append' || methodName === 'prepend' ? Element.prototype : Element.prototype;
      const original = prototype[methodName];
      if (typeof original !== 'function') continue;
      rememberOriginal(`Element.${methodName}`, original);
      prototype[methodName] = function blockerElementInsertion(...nodes) {
        for (const node of nodes) inspectNodeForScripts(node);
        return Reflect.apply(original, this, nodes);
      };
    }

    const originalSetAttribute = rememberOriginal('Element.setAttribute', Element.prototype.setAttribute);
    Element.prototype.setAttribute = function blockerSetAttribute(name, value) {
      if (this instanceof HTMLScriptElement && String(name).toLowerCase() === 'src') {
        const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.ELEMENT, { src: value, url: value, element: this, type: this.type }));
        if (decision.action === SCRIPT_ACTIONS.BLOCK) {
          preventScriptElement(this);
          return;
        }
        if (decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect) value = decision.redirect;
      }
      return Reflect.apply(originalSetAttribute, this, [name, value]);
    };

    const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
    if (srcDescriptor?.set && srcDescriptor.get) {
      rememberOriginal('HTMLScriptElement.src', srcDescriptor);
      Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        configurable: srcDescriptor.configurable,
        enumerable: srcDescriptor.enumerable,
        get: srcDescriptor.get,
        set(value) {
          const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.ELEMENT, { src: value, url: value, element: this, type: this.type }));
          if (decision.action === SCRIPT_ACTIONS.BLOCK) {
            preventScriptElement(this);
            return;
          }
          const nextValue = decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect ? decision.redirect : value;
          return Reflect.apply(srcDescriptor.set, this, [nextValue]);
        },
      });
    }

    document.addEventListener('beforescriptexecute', (event) => {
      const script = event.target;
      if (!(script instanceof HTMLScriptElement)) return;
      if (!applyScriptElementDecision(script, inspectScriptElement(script))) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);

    document.addEventListener('beforeload', (event) => {
      const target = event.target;
      if (target instanceof HTMLScriptElement && !applyScriptElementDecision(target, inspectScriptElement(target))) event.preventDefault();
      if (target instanceof HTMLLinkElement && !inspectScriptPreload(target)) event.preventDefault();
    }, true);
  }

  function installXHRInterceptor() {
    if (!CONFIG.interceptXHR || typeof XMLHttpRequest !== 'function') return;
    const open = rememberOriginal('XMLHttpRequest.open', XMLHttpRequest.prototype.open);
    const send = rememberOriginal('XMLHttpRequest.send', XMLHttpRequest.prototype.send);

    XMLHttpRequest.prototype.open = function blockerXhrOpen(method, url, ...rest) {
      this.__blockerXHR = { method, url, rest };
      return Reflect.apply(open, this, [method, url, ...rest]);
    };
    XMLHttpRequest.prototype.send = function blockerXhrSend(body) {
      const meta = this.__blockerXHR || {};
      const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.XHR, { method: meta.method, url: meta.url, src: meta.url, body, xhr: this }));
      if (decision.action === SCRIPT_ACTIONS.BLOCK) {
        queueMicrotask(() => {
          try { this.abort(); } catch {}
          this.dispatchEvent(new Event('error'));
          this.dispatchEvent(new Event('loadend'));
        });
        return;
      }
      if (decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect) {
        Reflect.apply(open, this, [meta.method || 'GET', decision.redirect, ...(meta.rest || [])]);
      }
      return Reflect.apply(send, this, [body]);
    };
  }

  function installWorkerInterceptors() {
    if (!CONFIG.interceptWorkers) return;
    for (const [name, kind] of [['Worker', SCRIPT_KINDS.WORKER], ['SharedWorker', SCRIPT_KINDS.SHARED_WORKER]]) {
      const Original = globalWindow[name];
      if (typeof Original !== 'function') continue;
      rememberOriginal(name, Original);
      const Wrapped = function BlockerWorker(url, options) {
        const decision = evaluateScriptRules(createScriptContext(kind, { url, src: url, options }));
        if (decision.action === SCRIPT_ACTIONS.BLOCK) throw new DOMException(`Blocked by ${SCRIPT.name}`, 'SecurityError');
        const nextUrl = decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect ? decision.redirect : url;
        return Reflect.construct(Original, [nextUrl, options].filter((value, index) => index === 0 || value !== undefined), new.target || Original);
      };
      Object.setPrototypeOf(Wrapped, Original);
      Wrapped.prototype = Original.prototype;
      globalWindow[name] = Wrapped;
    }

    const register = navigator.serviceWorker?.register;
    if (typeof register === 'function') {
      rememberOriginal('ServiceWorker.register', register);
      navigator.serviceWorker.register = function blockerServiceWorkerRegister(url, options) {
        const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.SERVICE_WORKER, { url, src: url, options }));
        if (decision.action === SCRIPT_ACTIONS.BLOCK) return Promise.reject(new DOMException(`Blocked by ${SCRIPT.name}`, 'SecurityError'));
        const nextUrl = decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect ? decision.redirect : url;
        return Reflect.apply(register, this, [nextUrl, options]);
      };
    }
  }

  function installDynamicCodeInterceptors() {
    if (!CONFIG.interceptDynamicCode) return;
    const originalEval = rememberOriginal('eval', globalWindow.eval);
    globalWindow.eval = function blockerEval(code) {
      const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.EVAL, { code, inline: code }));
      if (decision.action === SCRIPT_ACTIONS.BLOCK) return undefined;
      const nextCode = decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null ? decision.replacement : code;
      return Reflect.apply(originalEval, this, [nextCode]);
    };

    const OriginalFunction = rememberOriginal('Function', globalWindow.Function);
    const BlockerFunction = function (...args) {
      const code = args.at(-1) || '';
      const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.FUNCTION, { code, inline: code, args }));
      if (decision.action === SCRIPT_ACTIONS.BLOCK) return function blockedDynamicFunction() {};
      if (decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null) args[args.length - 1] = String(decision.replacement);
      return Reflect.construct(OriginalFunction, args, new.target || OriginalFunction);
    };
    Object.setPrototypeOf(BlockerFunction, OriginalFunction);
    BlockerFunction.prototype = OriginalFunction.prototype;
    globalWindow.Function = BlockerFunction;

    for (const timerName of ['setTimeout', 'setInterval']) {
      const original = rememberOriginal(timerName, globalWindow[timerName]);
      globalWindow[timerName] = function blockerTimer(handler, timeout, ...args) {
        if (typeof handler === 'string') {
          const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.TIMER, { code: handler, inline: handler, timer: timerName, timeout }));
          if (decision.action === SCRIPT_ACTIONS.BLOCK) return 0;
          if (decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null) handler = String(decision.replacement);
        }
        return Reflect.apply(original, this, [handler, timeout, ...args]);
      };
    }
  }

  function installDocumentWriteInterceptor() {
    if (!CONFIG.interceptDocumentWrite) return;
    for (const methodName of ['write', 'writeln']) {
      const original = document[methodName];
      if (typeof original !== 'function') continue;
      rememberOriginal(`document.${methodName}`, original);
      document[methodName] = function blockerDocumentWrite(...parts) {
        const html = parts.join(methodName === 'writeln' ? '\n' : '');
        const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.DOCUMENT_WRITE, { code: html, inline: html, html }));
        if (decision.action === SCRIPT_ACTIONS.BLOCK) return;
        const nextHtml = decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null ? String(decision.replacement) : html;
        return Reflect.apply(original, this, [nextHtml]);
      };
    }
  }

  function installWebAssemblyInterceptors() {
    if (!CONFIG.interceptWebAssembly || !globalWindow.WebAssembly) return;
    for (const methodName of ['instantiate', 'instantiateStreaming', 'compile', 'compileStreaming']) {
      const original = globalWindow.WebAssembly[methodName];
      if (typeof original !== 'function') continue;
      rememberOriginal(`WebAssembly.${methodName}`, original);
      globalWindow.WebAssembly[methodName] = function blockerWebAssembly(...args) {
        const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.WEBASSEMBLY, { args, source: args[0] }));
        if (decision.action === SCRIPT_ACTIONS.BLOCK) return Promise.reject(new WebAssembly.CompileError(`Blocked by ${SCRIPT.name}`));
        return Reflect.apply(original, this, args);
      };
    }
  }

  function installScriptInterceptors() {
    if (INTERNAL.scriptInterceptorsInstalled || !CONFIG.interceptScripts) return;
    INTERNAL.scriptInterceptorsInstalled = true;
    installDomScriptInterceptors();
    installXHRInterceptor();
    installWorkerInterceptors();
    installDynamicCodeInterceptors();
    installDocumentWriteInterceptor();
    installWebAssemblyInterceptors();
    debug.success('script', 'Script and executable-resource interceptors installed.');
  }

  function normalizeRule(rule) {
    if (!rule || typeof rule !== 'object') {
      throw new TypeError('Blocker rules must be objects.');
    }

    INTERNAL.ruleSequence += 1;

    const normalized = {
      enabled: true,
      type: RULE_TYPES.DOM,
      ...rule,
    };

    normalized.id ||= `${normalized.type}-${Date.now().toString(36)}-${INTERNAL.ruleSequence.toString(36)}`;
    normalized.name ||= normalized.id;

    if (normalized.type === RULE_TYPES.FETCH && !normalized.action) normalized.action = FETCH_ACTIONS.BLOCK;
    if (normalized.type === RULE_TYPES.SCRIPT && !normalized.action) normalized.action = SCRIPT_ACTIONS.BLOCK;
    if (![RULE_TYPES.DOM, RULE_TYPES.FETCH, RULE_TYPES.SCRIPT].includes(normalized.type)) {
      throw new TypeError(`Unsupported rule type: ${normalized.type}`);
    }

    return normalized;
  }

  function addRule(rule, options = {}) {
    const normalized = normalizeRule(rule);

    if (INTERNAL.rulesById.has(normalized.id)) {
      if (options.replace !== true) {
        debug.warn('plugin', `Rule "${normalized.id}" already exists.`);
        return INTERNAL.rulesById.get(normalized.id);
      }

      removeRule(normalized.id);
    }

    INTERNAL.rulesById.set(normalized.id, normalized);
    const collection = normalized.type === RULE_TYPES.FETCH
      ? INTERNAL.fetchRules
      : normalized.type === RULE_TYPES.SCRIPT
        ? INTERNAL.scriptRules
        : INTERNAL.domRules;
    collection.push(normalized);

    debug.success('plugin', `Added ${normalized.type} rule "${normalized.name}" (${normalized.id}).`);
    dispatchEvent('rule-added', { rule: normalized });

    if (normalized.type === RULE_TYPES.DOM && options.run !== false && INTERNAL.initialized) {
      queueMicrotask(() => void runDomRules({ reason: `rule-added:${normalized.id}` }));
    }

    return normalized;
  }

  function addRules(rules, options = {}) {
    if (!Array.isArray(rules)) {
      throw new TypeError('Blocker.addRules() expects an array.');
    }

    const added = rules.map((rule) => addRule(rule, { ...options, run: false }));

    if (options.run !== false && INTERNAL.initialized) {
      queueMicrotask(() => void runDomRules({ reason: 'rules-added' }));
    }

    return added;
  }

  function getRule(id) {
    return INTERNAL.rulesById.get(id) || null;
  }

  function getRules(options = {}) {
    return Array.from(INTERNAL.rulesById.values()).filter((rule) => (!options.type || rule.type === options.type) && (options.enabled == null || rule.enabled === options.enabled));
  }

  function removeRule(id) {
    const rule = getRule(id);

    if (!rule) {
      return false;
    }

    INTERNAL.rulesById.delete(id);
    const collection = rule.type === RULE_TYPES.FETCH
      ? INTERNAL.fetchRules
      : rule.type === RULE_TYPES.SCRIPT
        ? INTERNAL.scriptRules
        : INTERNAL.domRules;
    const index = collection.indexOf(rule);

    if (index >= 0) {
      collection.splice(index, 1);
    }

    debug.warn('plugin', `Removed rule "${rule.name}" (${rule.id}).`);
    dispatchEvent('rule-removed', { rule });
    return true;
  }

  function clearRules(options = {}) {
    const rules = getRules(options);
    rules.forEach((rule) => removeRule(rule.id));
    return rules.length;
  }

  function setRuleEnabled(id, enabled) {
    const rule = getRule(id);

    if (!rule) {
      return false;
    }

    rule.enabled = Boolean(enabled);
    debug.info('plugin', `${rule.enabled ? 'Enabled' : 'Disabled'} rule "${rule.name}".`);
    dispatchEvent('rule-toggled', { rule, enabled: rule.enabled });

    if (rule.enabled && rule.type === RULE_TYPES.DOM) {
      queueMicrotask(() => void runDomRules({ reason: `rule-enabled:${rule.id}` }));
    }

    return true;
  }

  function createActionIdentity(rule, action, target, index) {
    return `${rule.id}:${action.action}:${index}:${target instanceof SelectQuery ? JSON.stringify(target.toJSON()) : String(target)}`;
  }

  function markProcessed(element, identity) {
    let identities = INTERNAL.processedElements.get(element);

    if (!identities) {
      identities = new Set();
      INTERNAL.processedElements.set(element, identities);
    }

    identities.add(identity);
  }

  function wasProcessed(element, identity) {
    return INTERNAL.processedElements.get(element)?.has(identity) ?? false;
  }

  async function executeDomAction(rule, action, target, targetIndex, element, context) {
    const identity = createActionIdentity(rule, action, target, targetIndex);
    const once = action.once !== false;

    if (once && wasProcessed(element, identity)) {
      return false;
    }

    if (typeof action.when === 'function' && !(await action.when(element, context))) {
      return false;
    }

    if (once) {
      markProcessed(element, identity);
    }

    switch (action.action) {
      case ACTIONS.HIDE:
        element.classList.add('blocker-hidden');
        return true;

      case ACTIONS.REMOVE:
        element.remove();
        return true;

      case ACTIONS.REPLACE: {
        const replacement = typeof action.with === 'function' ? await action.with(element, context) : action.with;

        if (replacement instanceof Node) {
          element.replaceWith(replacement);
          return true;
        }

        if (typeof replacement === 'string') {
          const template = document.createElement('template');
          template.innerHTML = replacement.trim();
          element.replaceWith(template.content);
          return true;
        }

        return false;
      }

      case ACTIONS.CLICK:
        if (action.nativeClick === false) {
          element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, view: globalWindow }));
        } else {
          element.click?.();
        }
        return true;

      case ACTIONS.SET_ATTRIBUTE: {
        const attributes = typeof action.attributes === 'function' ? await action.attributes(element, context) : action.attributes;

        for (const [name, value] of Object.entries(attributes || {})) {
          if (value == null || value === false) {
            element.removeAttribute(name);
          } else {
            element.setAttribute(name, value === true ? '' : String(value));
          }
        }
        return true;
      }

      case ACTIONS.REMOVE_ATTRIBUTE:
        action.attributes.forEach((name) => element.removeAttribute(String(name)));
        return true;

      case ACTIONS.SET_PROPERTY: {
        const properties = typeof action.properties === 'function' ? await action.properties(element, context) : action.properties;
        Object.assign(element, properties || {});
        return true;
      }

      case ACTIONS.ADD_CLASS:
        element.classList.add(...action.classNames);
        return true;

      case ACTIONS.REMOVE_CLASS:
        element.classList.remove(...action.classNames);
        return true;

      case ACTIONS.UNWRAP: {
        const parent = element.parentNode;

        if (!parent) {
          return false;
        }

        while (element.firstChild) {
          parent.insertBefore(element.firstChild, element);
        }

        element.remove();
        return true;
      }

      case ACTIONS.CUSTOM:
        await action.handler(element, context);
        return true;

      default:
        throw new TypeError(`Unknown DOM action: ${action.action}`);
    }
  }

  async function runDomRules(options = {}) {
    INTERNAL.runSequence += 1;

    const root = options.root || document;
    const context = getPageContext({ root, reason: options.reason || 'manual', runSequence: INTERNAL.runSequence });
    const results = [];

    for (const rule of INTERNAL.domRules) {
      if (!rule.enabled || !matchesHost(context.hostname, rule.host, context) || (rule.pathname != null && !matchesValue(context.pathname, rule.pathname, context)) || (typeof rule.match === 'function' && !rule.match(context)) || (typeof rule.when === 'function' && !rule.when(context))) {
        continue;
      }

      const startedAt = performance.now();
      const result = { ruleId: rule.id, matched: 0, affected: 0, errors: 0 };

      try {
        await rule.before?.(context);

        for (const action of Array.isArray(rule.actions) ? rule.actions : []) {
          for (const [targetIndex, target] of flatten(action.targets || []).entries()) {
            const elements = resolveSelector(target, root, context);
            result.matched += elements.length;

            for (const element of elements) {
              try {
                if (await executeDomAction(rule, action, target, targetIndex, element, context)) {
                  result.affected += 1;
                }
              } catch (error) {
                result.errors += 1;
                debug.error('dom', `Action failed in rule "${rule.name}".`, error);
              }
            }
          }
        }

        await rule.run?.(context, result);
        await rule.after?.(context, result);
      } catch (error) {
        result.errors += 1;
        debug.error('dom', `Rule "${rule.name}" failed.`, error);
      }

      result.duration = duration(startedAt);
      results.push(result);

      if (result.affected > 0 || result.errors > 0 || rule.debug) {
        debug.group(result.errors ? 'error' : 'debug', 'dom', `${rule.name}: ${result.affected} affected in ${result.duration}`, () => console.table(result));
      }
    }

    discoverShadowRoots(root);
    return results;
  }

  function createFetchContext(input, init, sequence) {
    const request = input instanceof Request ? input : null;
    const url = new URL(request?.url || String(input), location.href);

    return {
      id: `fetch-${sequence}`,
      sequence,
      input,
      init: init ? { ...init } : {},
      request,
      url,
      href: url.href,
      hostname: url.hostname,
      host: url.host,
      pathname: url.pathname,
      search: url.search,
      method: String(init?.method || request?.method || 'GET').toUpperCase(),
      headers: new Headers(init?.headers || request?.headers || undefined),
      body: init?.body,
      startedAt: performance.now(),
      page: getPageContext(),
    };
  }

  function matchesFetchRule(rule, context) {
    if (!rule.enabled) {
      return false;
    }

    const match = rule.match;

    if (typeof match === 'string') {
      return context.href.includes(match);
    }

    if (match instanceof RegExp) {
      match.lastIndex = 0;
      return match.test(context.href);
    }

    if (typeof match === 'function') {
      return Boolean(match(context));
    }

    if (Array.isArray(match)) {
      return match.some((entry) => matchesFetchRule({ ...rule, match: entry }, context));
    }

    if (match && typeof match === 'object') {
      return matchesHost(context.hostname, match.hostname, context) && matchesValue(context.host, match.host, context) && matchesValue(context.pathname, match.pathname, context) && matchesValue(context.search, match.search, context) && matchesValue(context.method, match.method && String(match.method).toUpperCase(), context) && (typeof match.test !== 'function' || match.test(context));
    }

    return match == null;
  }

  function blockedResponse(rule, context) {
    const config = typeof rule.response === 'function' ? rule.response(context) : rule.response || {};
    const headers = new Headers(config.headers || {});
    headers.set('x-blocked-by', SCRIPT.name);
    let body = config.body ?? null;

    if (body && typeof body === 'object' && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && !(body instanceof FormData) && !(body instanceof URLSearchParams) && !(body instanceof ReadableStream)) {
      body = JSON.stringify(body);
      headers.set('content-type', headers.get('content-type') || 'application/json; charset=utf-8');
    }

    return new Response(body, { status: config.status ?? 204, statusText: config.statusText ?? 'Blocked by Blocker', headers });
  }

  async function interceptedFetch(input, init) {
    INTERNAL.fetchSequence += 1;
    const sequence = INTERNAL.fetchSequence;
    let currentInput = input;
    let currentInit = init;
    let context = createFetchContext(currentInput, currentInit, sequence);
    let response = null;
    let blocked = false;
    const matchedRules = [];
    const responseModifiers = [];

    for (const rule of INTERNAL.fetchRules) {
      if (!matchesFetchRule(rule, context)) {
        continue;
      }

      matchedRules.push(rule);

      if (rule.action === FETCH_ACTIONS.ALLOW) {
        break;
      }

      if (rule.action === FETCH_ACTIONS.BLOCK) {
        response = blockedResponse(rule, context);
        blocked = true;
        if (rule.continue !== true) break;
      } else if (rule.action === FETCH_ACTIONS.REDIRECT) {
        currentInput = typeof rule.redirect === 'function' ? await rule.redirect(context) : rule.redirect;
        context = createFetchContext(currentInput, currentInit, sequence);
        if (rule.continue !== true) break;
      } else if (rule.action === FETCH_ACTIONS.MODIFY_REQUEST) {
        const modification = await rule.modifyRequest({ ...context, input: currentInput, init: currentInit });

        if (modification instanceof Request) {
          currentInput = modification;
          currentInit = undefined;
        } else if (modification) {
          currentInput = modification.input ?? currentInput;
          currentInit = modification.init ?? { ...(currentInit || {}), ...modification };
        }

        context = createFetchContext(currentInput, currentInit, sequence);
        if (rule.continue !== true) break;
      } else if (rule.action === FETCH_ACTIONS.MODIFY_RESPONSE) {
        responseModifiers.push(rule);
      } else if (rule.action === FETCH_ACTIONS.CUSTOM) {
        const result = await rule.handler({ ...context, input: currentInput, init: currentInit, fetch: INTERNAL.originalFetch });

        if (result instanceof Response) {
          response = result;
        } else if (result) {
          currentInput = result.input ?? currentInput;
          currentInit = result.init ?? currentInit;
          response = result.response instanceof Response ? result.response : response;
          blocked = Boolean(result.blocked ?? blocked);
        }

        if (rule.continue !== true) break;
      }
    }

    response ||= await Reflect.apply(INTERNAL.originalFetch, globalWindow, [currentInput, currentInit]);

    for (const rule of responseModifiers) {
      const modified = await rule.modifyResponse(response, { ...context, response });
      if (modified instanceof Response) response = modified;
    }

    if (CONFIG.logAllFetches || matchedRules.length > 0) {
      debug.group(blocked ? 'warn' : 'debug', 'fetch', `#${sequence} ${context.method} ${context.href} → ${blocked ? 'BLOCKED' : response.status} · ${duration(context.startedAt)}`, () => {
        console.log('Matched rules:', matchedRules.map(({ id, name, action }) => ({ id, name, action })));
        console.log('Response:', response);
      });
    }

    dispatchEvent('fetch', { id: context.id, url: context.href, method: context.method, blocked, status: response.status, matchedRuleIds: matchedRules.map((rule) => rule.id) });
    return response;
  }

  function installFetchInterceptor() {
    if (INTERNAL.fetchInstalled || !CONFIG.interceptFetch || typeof globalWindow.fetch !== 'function') {
      return false;
    }

    INTERNAL.originalFetch = globalWindow.fetch.bind(globalWindow);
    globalWindow.fetch = interceptedFetch;
    INTERNAL.fetchInstalled = true;
    debug.success('fetch', 'Fetch interceptor installed.');
    return true;
  }

  function uninstallFetchInterceptor() {
    if (!INTERNAL.fetchInstalled) {
      return false;
    }

    globalWindow.fetch = INTERNAL.originalFetch;
    INTERNAL.fetchInstalled = false;
    return true;
  }

  function observeRoot(root) {
    if (!CONFIG.observeMutations || !root || INTERNAL.observedRoots.has(root)) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => mutation.type === 'childList' ? mutation.addedNodes.length > 0 : mutation.type === 'attributes' ? CONFIG.observeAttributes : CONFIG.observeCharacterData);

      if (!relevant) {
        return;
      }

      clearTimeout(INTERNAL.observerTimer);
      INTERNAL.observerTimer = globalWindow.setTimeout(() => void runDomRules({ reason: 'mutation', root }), CONFIG.observerDebounceMs);
    });

    observer.observe(root, { childList: true, subtree: true, attributes: CONFIG.observeAttributes, characterData: CONFIG.observeCharacterData });
    INTERNAL.observedRoots.add(root);
    INTERNAL.observers.add(observer);
  }

  function discoverShadowRoots(root = document) {
    if (!CONFIG.observeShadowRoots || !root) {
      return;
    }

    const elements = root instanceof Element ? [root, ...queryCss(root, '*')] : queryCss(root, '*');

    for (const element of elements) {
      if (element.shadowRoot) {
        observeRoot(element.shadowRoot);
      }
    }
  }

  function installShadowHook() {
    if (INTERNAL.shadowHookInstalled || typeof Element.prototype.attachShadow !== 'function') {
      return;
    }

    INTERNAL.originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function blockerAttachShadow(init) {
      const shadowRoot = Reflect.apply(INTERNAL.originalAttachShadow, this, [init]);

      if (init?.mode === 'open') {
        queueMicrotask(() => {
          observeRoot(shadowRoot);
          void runDomRules({ reason: 'attach-shadow', root: shadowRoot });
        });
      }

      return shadowRoot;
    };

    INTERNAL.shadowHookInstalled = true;
  }

  function installNavigationHooks() {
    if (INTERNAL.navigationInstalled) {
      return;
    }

    for (const methodName of ['pushState', 'replaceState']) {
      const original = history[methodName];
      INTERNAL.originalHistoryMethods.set(methodName, original);

      history[methodName] = function blockerHistory(...args) {
        const result = Reflect.apply(original, this, args);
        scheduleNavigation(methodName);
        return result;
      };
    }

    globalWindow.addEventListener('popstate', () => scheduleNavigation('popstate'));
    globalWindow.addEventListener('hashchange', () => scheduleNavigation('hashchange'));
    globalWindow.addEventListener('pageshow', () => scheduleNavigation('pageshow'));
    INTERNAL.navigationInstalled = true;
  }

  function scheduleNavigation(reason) {
    clearTimeout(INTERNAL.navigationTimer);
    INTERNAL.navigationTimer = globalWindow.setTimeout(() => {
      const nextUrl = location.href;
      const previousUrl = INTERNAL.currentUrl;

      if (nextUrl === previousUrl && reason !== 'pageshow') {
        return;
      }

      INTERNAL.currentUrl = nextUrl;
      debug.info('dom', `Navigation via ${reason}: ${previousUrl} → ${nextUrl}`);
      dispatchEvent('navigation', { reason, previousUrl, url: nextUrl });
      void runDomRules({ reason: `navigation:${reason}` });
    }, CONFIG.navigationDebounceMs);
  }

  function installStyles() {
    if (INTERNAL.stylesInstalled) {
      return;
    }

    const cssText = '.blocker-hidden{display:none!important;visibility:hidden!important;pointer-events:none!important;}';

    if (typeof globalWindow.GM_addStyle === 'function') {
      globalWindow.GM_addStyle(cssText);
    } else {
      const style = document.createElement('style');
      style.dataset.blockerVersion = SCRIPT.version;
      style.textContent = cssText;
      (document.head || document.documentElement).appendChild(style);
    }

    INTERNAL.stylesInstalled = true;
  }

  function configure(nextConfig = {}) {
    Object.assign(CONFIG, nextConfig);

    if (CONFIG.interceptFetch && !INTERNAL.fetchInstalled) installFetchInterceptor();
    if (!CONFIG.interceptFetch && INTERNAL.fetchInstalled) uninstallFetchInterceptor();
    if (CONFIG.interceptScripts && !INTERNAL.scriptInterceptorsInstalled) installScriptInterceptors();

    debug.info('plugin', 'Configuration updated.', { ...CONFIG });
    return { ...CONFIG };
  }

  function processQueue() {
    const queue = globalWindow[SCRIPT.queueName];

    if (!Array.isArray(queue)) {
      return;
    }

    for (const entry of queue.splice(0)) {
      try {
        if (typeof entry === 'function') entry(PUBLIC_API);
        else if (Array.isArray(entry)) addRules(entry);
        else addRule(entry);
      } catch (error) {
        debug.error('plugin', 'Queued plugin registration failed.', error);
      }
    }
  }

  const PUBLIC_API = {
    __isBlockerRuntime: true,
    name: SCRIPT.name,
    version: SCRIPT.version,
    ACTIONS,
    FETCH_ACTIONS,
    SCRIPT_ACTIONS,
    SCRIPT_KINDS,
    RULE_TYPES,
    SELECT_STEPS,
    SelectQuery,
    select,
    query,
    selectAny,
    selectFirst,
    resolve: resolveSelector,
    hide,
    remove,
    replace,
    click,
    setAttributes,
    removeAttributes,
    setProperties,
    addClass,
    removeClass,
    unwrap,
    customAction,
    blockScript,
    allowScript,
    redirectScript,
    modifyScript,
    customScriptRule,
    addScriptRule,
    addScriptRules,
    addRule,
    addRules,
    getRule,
    getRules,
    removeRule,
    clearRules,
    enableRule: (id) => setRuleEnabled(id, true),
    disableRule: (id) => setRuleEnabled(id, false),
    run: runDomRules,
    runRules: runDomRules,
    configure,
    getPageContext,
    installFetchInterceptor,
    uninstallFetchInterceptor,
    installScriptInterceptors,
    debug,
    get ready() {
      return INTERNAL.initialized;
    },
    get rules() {
      return getRules();
    },
    get domRules() {
      return [...INTERNAL.domRules];
    },
    get fetchRules() {
      return [...INTERNAL.fetchRules];
    },
    get scriptRules() {
      return [...INTERNAL.scriptRules];
    },
    get originalFetch() {
      return INTERNAL.originalFetch;
    },
  };

  Object.defineProperty(globalWindow, SCRIPT.globalName, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: PUBLIC_API,
  });

  globalWindow[SCRIPT.queueName] ||= [];

  function initialize() {
    if (INTERNAL.initialized) {
      return;
    }

    const startedAt = performance.now();
    INTERNAL.initialized = true;
    installStyles();
    installFetchInterceptor();
    installScriptInterceptors();
    installShadowHook();
    installNavigationHooks();

    if (document.documentElement) {
      observeRoot(document.documentElement);
    }

    if (CONFIG.processExistingShadowRoots) {
      discoverShadowRoots(document);
    }

    processQueue();
    void runDomRules({ reason: 'initial' });

    debug.success('plugin', `${SCRIPT.name} v${SCRIPT.version} ready in ${duration(startedAt)}.`);
    dispatchEvent('ready', { version: SCRIPT.version, api: PUBLIC_API });
  }

  if (document.documentElement) {
    initialize();
  } else {
    document.addEventListener('readystatechange', initialize, { once: true });
  }

  /*
   * ========================================================================
   * SUPER EXAMPLES
   * ========================================================================
   *
   * 1. Simple CSS selection
   *
   * Blocker.addRule({
   *   id: 'remove-ads',
   *   host: 'example.com',
   *   actions: [
   *     Blocker.remove(Blocker.select('.advertisement')),
   *   ],
   * });
   *
   * 2. Text, visibility and closest ancestor
   *
   * Blocker.remove(
   *   Blocker.select('span')
   *     .hasText(/promoted|patrocinado/i)
   *     .visible()
   *     .closest('article'),
   * );
   *
   * 3. Accessible role and name
   *
   * Blocker.click(
   *   Blocker.select()
   *     .role('button', { name: /accept all|aceitar todos/i })
   *     .visible()
   *     .enabled()
   *     .first(),
   * );
   *
   * 4. Stable test id with text fallback
   *
   * const closeButton = Blocker.select()
   *   .testId('close-button')
   *   .fallback(
   *     Blocker.select().role('button', { name: /close|fechar/i }),
   *     Blocker.select().xpath('//button[@aria-label="Close"]'),
   *   );
   *
   * 5. Select cards that contain a child selector
   *
   * Blocker.select('.product-card')
   *   .has(Blocker.select('[data-sponsored="true"]'))
   *   .visible();
   *
   * 6. Attribute, property and viewport filters
   *
   * Blocker.select('video')
   *   .attribute('src', /\.mp4(?:\?|$)/i)
   *   .property('paused', true)
   *   .inViewport(100);
   *
   * 7. Shadow DOM traversal
   *
   * Blocker.select('my-player')
   *   .shadow()
   *   .descendants('button.play')
   *   .visible();
   *
   * 8. Custom filtering
   *
   * Blocker.select('article')
   *   .filter((article) => article.querySelectorAll('img').length >= 3)
   *   .limit(10);
   *
   * 9. Reusable immutable selectors
   *
   * const allButtons = Blocker.select('button');
   * const visibleButtons = allButtons.visible();
   * const saveButtons = allButtons.hasText(/save|salvar/i);
   *
   * 10. Fetch blocking
   *
   * Blocker.addRule({
   *   id: 'block-analytics',
   *   type: Blocker.RULE_TYPES.FETCH,
   *   match: {
   *     hostname: '*.analytics.example.com',
   *     pathname: /collect|track/i,
   *     method: 'POST',
   *   },
   *   action: Blocker.FETCH_ACTIONS.BLOCK,
   *   response: { status: 204 },
   * });
   *
   * 11. Modify a request
   *
   * Blocker.addRule({
   *   id: 'add-debug-header',
   *   type: 'fetch',
   *   match: { hostname: 'api.example.com' },
   *   action: Blocker.FETCH_ACTIONS.MODIFY_REQUEST,
   *   modifyRequest({ init, headers }) {
   *     headers.set('x-blocker-debug', '1');
   *     return { init: { ...init, headers } };
   *   },
   * });
   *
   * 12. Modify a JSON response
   *
   * Blocker.addRule({
   *   id: 'disable-api-ads',
   *   type: 'fetch',
   *   match: { hostname: 'api.example.com', pathname: '/config' },
   *   action: Blocker.FETCH_ACTIONS.MODIFY_RESPONSE,
   *   async modifyResponse(response) {
   *     const data = await response.clone().json();
   *     data.adsEnabled = false;
   *     return new Response(JSON.stringify(data), {
   *       status: response.status,
   *       statusText: response.statusText,
   *       headers: response.headers,
   *     });
   *   },
   * });
   *
   * 13. Block external scripts and script preloads
   *
   * Blocker.addScriptRule({
   *   id: 'block-google-tracking-scripts',
   *   name: 'Block Google tracking scripts',
   *   match: {
   *     kind: [
   *       Blocker.SCRIPT_KINDS.ELEMENT,
   *       Blocker.SCRIPT_KINDS.PRELOAD,
   *       Blocker.SCRIPT_KINDS.MODULE_PRELOAD,
   *     ],
   *     src: /googletagmanager|google-analytics|doubleclick/i,
   *   },
   *   action: Blocker.SCRIPT_ACTIONS.BLOCK,
   * });
   *
   * 14. Block inline scripts containing a known bootstrap marker
   *
   * Blocker.addScriptRule({
   *   id: 'block-inline-tracker-bootstrap',
   *   match: {
   *     kind: Blocker.SCRIPT_KINDS.INLINE,
   *     inline: /window\.__trackerBootstrap|gtag\(/i,
   *   },
   *   action: Blocker.SCRIPT_ACTIONS.BLOCK,
   * });
   *
   * 15. Block XHR requests used to download executable code
   *
   * Blocker.addScriptRule({
   *   id: 'block-remote-eval-payload',
   *   match: {
   *     kind: Blocker.SCRIPT_KINDS.XHR,
   *     pathname: /\/(?:bundle|payload|loader)\.js$/i,
   *   },
   *   action: Blocker.SCRIPT_ACTIONS.BLOCK,
   * });
   *
   * 16. Block Worker, SharedWorker and Service Worker scripts
   *
   * Blocker.addScriptRule({
   *   id: 'block-background-tracker-workers',
   *   match: {
   *     kind: [
   *       Blocker.SCRIPT_KINDS.WORKER,
   *       Blocker.SCRIPT_KINDS.SHARED_WORKER,
   *       Blocker.SCRIPT_KINDS.SERVICE_WORKER,
   *     ],
   *     src: /tracker|analytics|fingerprint/i,
   *   },
   *   action: Blocker.SCRIPT_ACTIONS.BLOCK,
   * });
   *
   * 17. Block dynamic code execution
   *
   * Blocker.addScriptRules([
   *   {
   *     id: 'block-suspicious-eval',
   *     match: {
   *       kind: Blocker.SCRIPT_KINDS.EVAL,
   *       code: /document\.cookie|localStorage|fingerprint/i,
   *     },
   *   },
   *   {
   *     id: 'block-suspicious-function-constructor',
   *     match: {
   *       kind: Blocker.SCRIPT_KINDS.FUNCTION,
   *       code: /fetch\(.+eval|WebSocket/i,
   *     },
   *   },
   * ]);
   *
   * 18. Redirect a script to a local compatibility shim
   *
   * Blocker.addScriptRule({
   *   id: 'redirect-broken-sdk',
   *   match: { src: 'https://cdn.example.com/sdk.js' },
   *   action: Blocker.SCRIPT_ACTIONS.REDIRECT,
   *   redirect: 'https://rod.migos.club/shims/sdk.js',
   * });
   *
   * 19. Helper form
   *
   * Blocker.addRule(
   *   Blocker.blockScript(
   *     {
   *       kind: Blocker.SCRIPT_KINDS.DOCUMENT_WRITE,
   *       code: /<script[^>]+advertising/i,
   *     },
   *     {
   *       id: 'block-document-write-ad-script',
   *       name: 'Block advertising scripts written by document.write',
   *     },
   *   ),
   * );
   *
   * Important browser limitation:
   * JavaScript cannot universally replace the native dynamic import() operator.
   * Parser-inserted scripts may also execute before MutationObserver sees them.
   * Blocker therefore intercepts dynamic DOM insertion, src assignment,
   * setAttribute(), beforeload/beforescriptexecute when supported, workers,
   * XHR, eval, Function, string timers, document.write, script preloads and
   * WebAssembly. For guaranteed network-level blocking, use a browser content
   * blocker, extension request filter or Content-Security-Policy as well.
   *
   * 20. Register rules before Blocker loads
   *
   * window.BlockerQueue ||= [];
   * window.BlockerQueue.push((Blocker) => {
   *   Blocker.addRule({
   *     id: 'queued-rule',
   *     host: 'example.com',
   *     actions: [Blocker.remove(Blocker.select('.popup'))],
   *   });
   * });
   */
})(window);
