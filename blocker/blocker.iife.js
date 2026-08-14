/* Auto-generated from blocker/blocker.ts. at 8/14/2026, 4:59:46 PM Do not edit directly. */
var Blocker = (function() {

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
//#region blocker/blocker.ts
	var blocker_exports = /* @__PURE__ */ __exportAll({});
	const ACTIONS = {
		HIDE: "hide",
		REMOVE: "remove",
		REPLACE: "replace",
		CLICK: "click",
		SET_ATTRIBUTE: "set-attribute",
		REMOVE_ATTRIBUTE: "remove-attribute",
		SET_PROPERTY: "set-property",
		ADD_CLASS: "add-class",
		REMOVE_CLASS: "remove-class",
		UNWRAP: "unwrap",
		CUSTOM: "custom"
	};
	const FETCH_ACTIONS = {
		ALLOW: "allow",
		BLOCK: "block",
		REDIRECT: "redirect",
		MODIFY_REQUEST: "modify-request",
		MODIFY_RESPONSE: "modify-response",
		CUSTOM: "custom"
	};
	const RULE_TYPES = {
		DOM: "dom",
		FETCH: "fetch",
		SCRIPT: "script"
	};
	const SCRIPT_ACTIONS = {
		ALLOW: "allow",
		BLOCK: "block",
		REDIRECT: "redirect",
		MODIFY: "modify",
		CUSTOM: "custom"
	};
	const SCRIPT_KINDS = {
		ELEMENT: "script-element",
		INLINE: "inline-script",
		XHR: "xhr",
		WORKER: "worker",
		SHARED_WORKER: "shared-worker",
		SERVICE_WORKER: "service-worker",
		EVAL: "eval",
		FUNCTION: "function",
		TIMER: "timer",
		DOCUMENT_WRITE: "document-write",
		PRELOAD: "script-preload",
		MODULE_PRELOAD: "module-preload",
		WEBASSEMBLY: "webassembly"
	};
	const SELECT_STEPS = {
		CSS: "css",
		XPATH: "xpath",
		TEXT: "text",
		ROLE: "role",
		TEST_ID: "test-id",
		TAG: "tag",
		CUSTOM_SOURCE: "custom-source",
		WITHIN: "within",
		FILTER_TEXT: "filter-text",
		FILTER_ATTRIBUTE: "filter-attribute",
		FILTER_ATTRIBUTE_EXISTS: "filter-attribute-exists",
		FILTER_PROPERTY: "filter-property",
		FILTER_VISIBLE: "filter-visible",
		FILTER_HIDDEN: "filter-hidden",
		FILTER_ENABLED: "filter-enabled",
		FILTER_DISABLED: "filter-disabled",
		FILTER_IN_VIEWPORT: "filter-in-viewport",
		FILTER_HAS: "filter-has",
		FILTER_NOT: "filter-not",
		FILTER_CUSTOM: "filter-custom",
		CLOSEST: "closest",
		PARENT: "parent",
		CHILDREN: "children",
		DESCENDANTS: "descendants",
		NEXT: "next",
		PREVIOUS: "previous",
		SHADOW: "shadow",
		UNIQUE: "unique",
		FIRST: "first",
		LAST: "last",
		AT: "at",
		LIMIT: "limit",
		FALLBACK: "fallback"
	};
	const LOG_LEVELS = {
		trace: 0,
		debug: 1,
		info: 2,
		success: 2,
		warn: 3,
		error: 4,
		silent: 99
	};
	const LOG_STYLES = {
		trace: ["background:#475569;color:#fff;", "color:#64748b;"],
		debug: ["background:#4f46e5;color:#fff;", "color:#818cf8;"],
		info: ["background:#0369a1;color:#fff;", "color:#38bdf8;"],
		success: ["background:#047857;color:#fff;", "color:#10b981;"],
		warn: ["background:#b45309;color:#fff;", "color:#f59e0b;"],
		error: ["background:#b91c1c;color:#fff;", "color:#ef4444;"],
		dom: ["background:#0f766e;color:#fff;", "color:#14b8a6;"],
		fetch: ["background:#6d28d9;color:#fff;", "color:#a78bfa;"],
		script: ["background:#9f1239;color:#fff;", "color:#fb7185;"],
		select: ["background:#4338ca;color:#fff;", "color:#8b5cf6;"],
		plugin: ["background:#be185d;color:#fff;", "color:#ec4899;"],
		loader: ["background:#334155;color:#fff;", "color:#94a3b8;"]
	};
	const SELECT_STEP_CACHE = /* @__PURE__ */ new WeakMap();
	let GET_PAGE_CONTEXT_HOOK = null;
	let RESOLVE_SELECT_QUERY_HOOK = null;
	function flatten(values) {
		const output = [];
		const stack = [...values].reverse();
		while (stack.length) {
			const value = stack.pop();
			if (value == null) continue;
			if (Array.isArray(value)) for (let index = value.length - 1; index >= 0; index -= 1) stack.push(value[index]);
			else output.push(value);
		}
		return output;
	}
	function getPageContext(overrides = {}) {
		if (!GET_PAGE_CONTEXT_HOOK) throw new Error("Blocker runtime is not initialized.");
		return GET_PAGE_CONTEXT_HOOK(overrides);
	}
	function resolveSelectQuery(query, root = document, context = getPageContext()) {
		if (!RESOLVE_SELECT_QUERY_HOOK) throw new Error("Blocker selector runtime is not initialized.");
		return RESOLVE_SELECT_QUERY_HOOK(query, root, context);
	}
	var SelectQuery = class SelectQuery {
		tail;
		length;
		constructor(tail = null, length = 0) {
			this.tail = tail;
			this.length = length;
			Object.freeze(this);
		}
		append(type, payload = {}) {
			const step = Object.freeze({
				type,
				...payload
			});
			const node = {
				previous: this.tail,
				step,
				length: this.length + 1
			};
			return new SelectQuery(node, node.length);
		}
		get steps() {
			const cached = SELECT_STEP_CACHE.get(this);
			if (cached) return cached;
			const output = new Array(this.length);
			let node = this.tail;
			let index = this.length - 1;
			while (node) {
				output[index--] = node.step;
				node = node.previous;
			}
			const frozen = Object.freeze(output);
			SELECT_STEP_CACHE.set(this, frozen);
			return frozen;
		}
		css(selector) {
			return this.append(SELECT_STEPS.CSS, { selector });
		}
		xpath(expression) {
			return this.append(SELECT_STEPS.XPATH, { expression });
		}
		text(expected, options = {}) {
			return this.append(SELECT_STEPS.TEXT, {
				expected,
				options
			});
		}
		role(roleName, options = {}) {
			return this.append(SELECT_STEPS.ROLE, {
				roleName,
				options
			});
		}
		testId(value, attribute = "data-testid") {
			return this.append(SELECT_STEPS.TEST_ID, {
				value,
				attribute
			});
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
			return this.append(SELECT_STEPS.FILTER_TEXT, {
				expected,
				options
			});
		}
		attribute(name, expected) {
			return this.append(SELECT_STEPS.FILTER_ATTRIBUTE, {
				name,
				expected
			});
		}
		attributeExists(name) {
			return this.append(SELECT_STEPS.FILTER_ATTRIBUTE_EXISTS, { name });
		}
		property(name, expected) {
			return this.append(SELECT_STEPS.FILTER_PROPERTY, {
				name,
				expected
			});
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
		children(selector = "*") {
			return this.append(SELECT_STEPS.CHILDREN, { selector });
		}
		descendants(selector = "*") {
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
				type: "blocker-select",
				steps: this.steps
			};
		}
	};
	(function BlockerRuntime(globalWindow) {
		"use strict";
		if (globalWindow.Blocker?.__isBlockerRuntime) return;
		const SCRIPT = Object.freeze({
			name: "Blocker",
			version: "2.2.0",
			globalName: "Blocker",
			queueName: "BlockerQueue"
		});
		const CONFIG = {
			debug: true,
			logLevel: "debug",
			colouredLogs: true,
			collapsedLogGroups: true,
			observeMutations: true,
			observeAttributes: false,
			observeCharacterData: false,
			observeShadowRoots: true,
			processExistingShadowRoots: true,
			observerDebounceMs: 50,
			navigationDebounceMs: 24,
			mutationFullScanThreshold: 80,
			maximumMutationScopes: 32,
			maximumTextCandidates: 1e4,
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
			maximumLoggedBodyLength: 2e3,
			dispatchEvents: true
		};
		const INTERNAL = {
			initialized: false,
			stylesInstalled: false,
			navigationInstalled: false,
			shadowHookInstalled: false,
			fetchInstalled: false,
			scriptInterceptorsInstalled: false,
			currentUrl: location.href,
			observerTimer: 0,
			navigationTimer: 0,
			ruleSequence: 0,
			fetchSequence: 0,
			runSequence: 0,
			rulesById: /* @__PURE__ */ new Map(),
			domRules: [],
			fetchRules: [],
			scriptRules: [],
			processedElements: /* @__PURE__ */ new WeakMap(),
			observedRoots: /* @__PURE__ */ new WeakSet(),
			observers: /* @__PURE__ */ new Set(),
			pendingMutationScopes: /* @__PURE__ */ new Set(),
			pendingMutationCount: 0,
			originalFetch: null,
			originals: /* @__PURE__ */ new Map(),
			originalAttachShadow: null,
			originalHistoryMethods: /* @__PURE__ */ new Map()
		};
		const COMPILED_DOM_ACTIONS = /* @__PURE__ */ new WeakMap();
		const HOST_MATCHERS = /* @__PURE__ */ new WeakMap();
		function timestamp() {
			return (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR", {
				hour12: false,
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				fractionalSecondDigits: 3
			});
		}
		function duration(startTime) {
			return `${(performance.now() - startTime).toFixed(2)}ms`;
		}
		function shouldLog(level) {
			return CONFIG.debug && LOG_LEVELS[level] >= LOG_LEVELS[CONFIG.logLevel];
		}
		function writeLog(level, scope, message, ...values) {
			if (!shouldLog(level)) return;
			const method = level === "success" ? console.info : console[level] || console.log;
			const style = LOG_STYLES[scope] || LOG_STYLES[level] || LOG_STYLES.info;
			if (CONFIG.colouredLogs) {
				method.call(console, `%c${SCRIPT.name}:${scope}%c ${timestamp()} %c${message}`, `${style[0]}border-radius:4px;padding:2px 6px;font-weight:700;`, "color:#94a3b8;font-weight:500;", style[1], ...values);
				return;
			}
			method.call(console, `[${SCRIPT.name}:${scope}] ${timestamp()} ${message}`, ...values);
		}
		function writeGroup(level, scope, title, callback) {
			if (!shouldLog(level)) return callback?.();
			const style = LOG_STYLES[scope] || LOG_STYLES[level] || LOG_STYLES.info;
			const group = CONFIG.collapsedLogGroups ? console.groupCollapsed : console.group;
			if (CONFIG.colouredLogs) group.call(console, `%c${SCRIPT.name}:${scope}%c ${timestamp()} %c${title}`, `${style[0]}border-radius:4px;padding:2px 6px;font-weight:700;`, "color:#94a3b8;font-weight:500;", style[1]);
			else group.call(console, `[${SCRIPT.name}:${scope}] ${timestamp()} ${title}`);
			try {
				return callback?.();
			} finally {
				console.groupEnd();
			}
		}
		const debug = Object.freeze({
			trace: (scope, message, ...values) => writeLog("trace", scope, message, ...values),
			debug: (scope, message, ...values) => writeLog("debug", scope, message, ...values),
			info: (scope, message, ...values) => writeLog("info", scope, message, ...values),
			success: (scope, message, ...values) => writeLog("success", scope, message, ...values),
			warn: (scope, message, ...values) => writeLog("warn", scope, message, ...values),
			error: (scope, message, ...values) => writeLog("error", scope, message, ...values),
			group: writeGroup,
			get config() {
				return { ...CONFIG };
			}
		});
		function dispatchBlockerEvent(name, detail = {}) {
			if (!CONFIG.dispatchEvents) return;
			globalWindow.dispatchEvent(new CustomEvent(`blocker:${name}`, { detail: {
				timestamp: Date.now(),
				...detail
			} }));
		}
		function uniqueElements(values) {
			const output = [];
			const seen = /* @__PURE__ */ new Set();
			for (const value of values) {
				if (!(value instanceof Element) || seen.has(value)) continue;
				seen.add(value);
				output.push(value);
			}
			return output;
		}
		function normalizeElements(value) {
			if (value == null) return [];
			if (value instanceof Element) return [value];
			if (value instanceof DocumentFragment) return uniqueElements(value.children);
			if (typeof value === "string") return [];
			if (Array.isArray(value) || value instanceof NodeList || value instanceof HTMLCollection || typeof value?.[Symbol.iterator] === "function") return uniqueElements(value);
			return [];
		}
		function normalizeWhitespace(value) {
			return String(value ?? "").replace(/\s+/g, " ").trim();
		}
		function isPromiseLike(value) {
			return Boolean(value && (typeof value === "object" || typeof value === "function") && typeof value.then === "function");
		}
		async function settle(value) {
			return isPromiseLike(value) ? await value : value;
		}
		function escapeCss(value) {
			const text = String(value);
			return globalWindow.CSS?.escape ? globalWindow.CSS.escape(text) : text.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
		}
		function matchesValue(actual, expected, context) {
			if (expected == null) return true;
			if (Array.isArray(expected)) {
				for (const entry of expected) if (matchesValue(actual, entry, context)) return true;
				return false;
			}
			if (expected instanceof RegExp) {
				expected.lastIndex = 0;
				return expected.test(String(actual));
			}
			if (typeof expected === "function") return Boolean(expected(actual, context));
			return String(actual) === String(expected);
		}
		function matchesText(actual, expected, options = {}, element) {
			const normalizedActual = normalizeWhitespace(actual);
			if (expected instanceof RegExp) {
				expected.lastIndex = 0;
				return expected.test(normalizedActual);
			}
			if (typeof expected === "function") return Boolean(expected(normalizedActual, element));
			const normalizedExpected = normalizeWhitespace(expected);
			const comparableActual = options.caseSensitive ? normalizedActual : normalizedActual.toLocaleLowerCase();
			const comparableExpected = options.caseSensitive ? normalizedExpected : normalizedExpected.toLocaleLowerCase();
			return options.exact ? comparableActual === comparableExpected : comparableActual.includes(comparableExpected);
		}
		function isVisible(element) {
			if (!element.isConnected) return false;
			const style = globalWindow.getComputedStyle(element);
			if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || Number(style.opacity) === 0) return false;
			const rect = element.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		}
		function isInViewport(element, margin = 0) {
			const rect = element.getBoundingClientRect();
			return rect.bottom >= -margin && rect.right >= -margin && rect.top <= globalWindow.innerHeight + margin && rect.left <= globalWindow.innerWidth + margin;
		}
		function queryCss(root, selector, includeRoot = false) {
			if (!root || typeof root.querySelectorAll !== "function") return [];
			try {
				const matches = root.querySelectorAll(selector);
				const extra = includeRoot && root instanceof Element && root.matches(selector) ? 1 : 0;
				const output = new Array(matches.length + extra);
				let offset = 0;
				if (extra) {
					output[0] = root;
					offset = 1;
				}
				for (let index = 0; index < matches.length; index += 1) output[index + offset] = matches[index];
				return output;
			} catch (error) {
				debug.warn("select", `Invalid CSS selector: ${selector}`, error);
				return [];
			}
		}
		function queryXPath(root, expression) {
			const ownerDocument = root instanceof Document ? root : root.ownerDocument || document;
			try {
				const result = ownerDocument.evaluate(expression, root, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
				const output = [];
				const seen = /* @__PURE__ */ new Set();
				for (let index = 0; index < result.snapshotLength; index += 1) {
					const node = result.snapshotItem(index);
					const element = node instanceof Element ? node : node?.parentElement;
					if (!element || seen.has(element)) continue;
					seen.add(element);
					output.push(element);
				}
				return output;
			} catch (error) {
				debug.warn("select", `Invalid XPath expression: ${expression}`, error);
				return [];
			}
		}
		function select(initialSelector) {
			const query = new SelectQuery();
			return initialSelector == null ? query : query.css(initialSelector);
		}
		const query = select;
		function selectAny(...queries) {
			const flattened = flatten(queries);
			return select().custom(({ root, context }) => {
				const output = [];
				const seen = /* @__PURE__ */ new Set();
				for (const entry of flattened) {
					const matches = resolveSelector(entry, root, context);
					for (const element of matches) {
						if (seen.has(element)) continue;
						seen.add(element);
						output.push(element);
					}
				}
				return output;
			});
		}
		function selectFirst(...queries) {
			const flattened = flatten(queries);
			return select().custom(({ root, context }) => {
				for (const entry of flattened) {
					const matches = resolveSelector(entry, root, context);
					if (matches.length) return matches;
				}
				return [];
			});
		}
		function runStep(current, step, root, context) {
			switch (step.type) {
				case SELECT_STEPS.CSS: {
					if (current.length === 0) return queryCss(root, step.selector, true);
					const output = [];
					const seen = /* @__PURE__ */ new Set();
					for (const element of current) for (const match of queryCss(element, step.selector, false)) {
						if (seen.has(match)) continue;
						seen.add(match);
						output.push(match);
					}
					return output;
				}
				case SELECT_STEPS.XPATH: {
					if (current.length === 0) return queryXPath(root, step.expression);
					const output = [];
					const seen = /* @__PURE__ */ new Set();
					for (const element of current) for (const match of queryXPath(element, step.expression)) {
						if (seen.has(match)) continue;
						seen.add(match);
						output.push(match);
					}
					return output;
				}
				case SELECT_STEPS.TEXT: {
					const scope = current.length === 0 ? queryCss(root, step.options?.selector || "button,a,[role=\"button\"],label,summary,p,span,div", true) : current;
					const maximum = Math.min(scope.length, CONFIG.maximumTextCandidates);
					const output = [];
					for (let index = 0; index < maximum; index += 1) {
						const element = scope[index];
						if (matchesText(element.textContent, step.expected, step.options, element)) output.push(element);
					}
					return output;
				}
				case SELECT_STEPS.ROLE: {
					const roleName = String(step.roleName);
					const selector = `[role="${escapeCss(roleName)}"]`;
					const scope = current.length === 0 ? queryCss(root, selector, true) : current.filter((element) => element.getAttribute("role") === roleName);
					if (step.options?.name == null) return scope;
					return scope.filter((element) => matchesText(element.getAttribute("aria-label") || element.textContent, step.options.name, step.options, element));
				}
				case SELECT_STEPS.TEST_ID: {
					const attribute = String(step.attribute);
					const value = String(step.value);
					const selector = `[${escapeCss(attribute)}="${escapeCss(value)}"]`;
					return current.length === 0 ? queryCss(root, selector, true) : current.filter((element) => element.getAttribute(attribute) === value);
				}
				case SELECT_STEPS.TAG: {
					const tag = String(step.tagName).toLocaleLowerCase();
					return current.length === 0 ? queryCss(root, tag, true) : current.filter((element) => element.localName === tag);
				}
				case SELECT_STEPS.CUSTOM_SOURCE: return normalizeElements(step.resolver({
					root,
					context,
					current,
					Blocker: PUBLIC_API
				}));
				case SELECT_STEPS.WITHIN: {
					const scopes = resolveSelector(step.target, root, context);
					if (current.length === 0) {
						const output = [];
						const seen = /* @__PURE__ */ new Set();
						for (const scope of scopes) for (const child of scope.children) {
							if (seen.has(child)) continue;
							seen.add(child);
							output.push(child);
						}
						return output;
					}
					return current.filter((element) => scopes.some((scope) => scope.contains(element)));
				}
				case SELECT_STEPS.FILTER_TEXT: return current.filter((element) => matchesText(element.textContent, step.expected, step.options, element));
				case SELECT_STEPS.FILTER_ATTRIBUTE: return current.filter((element) => matchesValue(element.getAttribute(step.name), step.expected, {
					element,
					context
				}));
				case SELECT_STEPS.FILTER_ATTRIBUTE_EXISTS: return current.filter((element) => element.hasAttribute(step.name));
				case SELECT_STEPS.FILTER_PROPERTY: return current.filter((element) => matchesValue(element[step.name], step.expected, {
					element,
					context
				}));
				case SELECT_STEPS.FILTER_VISIBLE: return current.filter(isVisible);
				case SELECT_STEPS.FILTER_HIDDEN: return current.filter((element) => !isVisible(element));
				case SELECT_STEPS.FILTER_ENABLED: return current.filter((element) => !element.matches(":disabled,[aria-disabled=\"true\"]"));
				case SELECT_STEPS.FILTER_DISABLED: return current.filter((element) => element.matches(":disabled,[aria-disabled=\"true\"]"));
				case SELECT_STEPS.FILTER_IN_VIEWPORT: return current.filter((element) => isInViewport(element, Number(step.margin) || 0));
				case SELECT_STEPS.FILTER_HAS: return current.filter((element) => resolveSelector(step.target, element, context).length > 0);
				case SELECT_STEPS.FILTER_NOT: return current.filter((element) => resolveSelector(step.target, element, context).length === 0 && !matchesElementSelector(element, step.target, context));
				case SELECT_STEPS.FILTER_CUSTOM: return current.filter((element, index) => Boolean(step.predicate(element, index, context)));
				case SELECT_STEPS.CLOSEST: return uniqueElements(current.map((element) => element.closest(step.selector)));
				case SELECT_STEPS.PARENT: return uniqueElements(current.map((element) => {
					const parent = element.parentElement;
					return parent && (!step.selector || parent.matches(step.selector)) ? parent : null;
				}));
				case SELECT_STEPS.CHILDREN: {
					const output = [];
					const seen = /* @__PURE__ */ new Set();
					for (const element of current) for (const child of element.children) {
						if (!child.matches(step.selector) || seen.has(child)) continue;
						seen.add(child);
						output.push(child);
					}
					return output;
				}
				case SELECT_STEPS.DESCENDANTS: {
					const output = [];
					const seen = /* @__PURE__ */ new Set();
					for (const element of current) for (const child of queryCss(element, step.selector, false)) {
						if (seen.has(child)) continue;
						seen.add(child);
						output.push(child);
					}
					return output;
				}
				case SELECT_STEPS.NEXT: return uniqueElements(current.map((element) => {
					const sibling = element.nextElementSibling;
					return sibling && (!step.selector || sibling.matches(step.selector)) ? sibling : null;
				}));
				case SELECT_STEPS.PREVIOUS: return uniqueElements(current.map((element) => {
					const sibling = element.previousElementSibling;
					return sibling && (!step.selector || sibling.matches(step.selector)) ? sibling : null;
				}));
				case SELECT_STEPS.SHADOW: {
					const output = [];
					const seen = /* @__PURE__ */ new Set();
					for (const element of current) {
						const shadowRoot = element.shadowRoot;
						if (!shadowRoot) continue;
						for (const child of shadowRoot.children) {
							if (seen.has(child)) continue;
							seen.add(child);
							output.push(child);
						}
					}
					return output;
				}
				case SELECT_STEPS.UNIQUE: return uniqueElements(current);
				case SELECT_STEPS.FIRST: return current.length ? [current[0]] : [];
				case SELECT_STEPS.LAST: return current.length ? [current[current.length - 1]] : [];
				case SELECT_STEPS.AT: {
					const index = step.index < 0 ? current.length + step.index : step.index;
					return index >= 0 && index < current.length ? [current[index]] : [];
				}
				case SELECT_STEPS.LIMIT: return current.slice(0, Math.max(0, Number(step.count) || 0));
				case SELECT_STEPS.FALLBACK:
					if (current.length) return current;
					for (const fallbackQuery of step.queries) {
						const matches = resolveSelector(fallbackQuery, root, context);
						if (matches.length) return matches;
					}
					return [];
				default:
					debug.warn("select", `Unknown select step: ${String(step.type)}`);
					return current;
			}
		}
		function resolveSelectQueryCore(selectQuery, root = document, context = getPageContext()) {
			const startedAt = shouldLog("trace") ? performance.now() : 0;
			let current = [];
			for (const step of selectQuery.steps) current = runStep(current, step, root, context);
			const result = uniqueElements(current);
			if (startedAt) debug.trace("select", `Resolved ${result.length} element(s) through ${selectQuery.length} step(s) in ${duration(startedAt)}.`, selectQuery.toJSON());
			return result;
		}
		function matchesElementSelector(element, target, context) {
			if (typeof target === "string") try {
				return element.matches(target);
			} catch {
				return false;
			}
			if (target instanceof SelectQuery) return resolveSelectQueryCore(target, element.ownerDocument || document, context).includes(element);
			return false;
		}
		function resolveSelector(target, root = document, context = getPageContext()) {
			if (target instanceof SelectQuery) return resolveSelectQueryCore(target, root, context);
			if (typeof target === "string") return queryCss(root, target, true);
			if (typeof target === "function") return normalizeElements(target({
				root,
				context,
				Blocker: PUBLIC_API
			}));
			if (Array.isArray(target)) {
				const output = [];
				const seen = /* @__PURE__ */ new Set();
				for (const entry of target) for (const element of resolveSelector(entry, root, context)) {
					if (seen.has(element)) continue;
					seen.add(element);
					output.push(element);
				}
				return output;
			}
			if ("xpath" in target) return queryXPath(root, target.xpath);
			if ("selector" in target) return queryCss(root, String(target.selector), true);
			if ("text" in target) return select().text(target.text, target).resolve(root, context);
			if ("resolve" in target) return normalizeElements(target.resolve({
				root,
				context,
				Blocker: PUBLIC_API
			}));
			return [];
		}
		function createAction(action, targets, options = {}) {
			return {
				action,
				targets: flatten(targets),
				...options
			};
		}
		function hide(...targets) {
			return createAction(ACTIONS.HIDE, targets);
		}
		function remove(...targets) {
			return createAction(ACTIONS.REMOVE, targets);
		}
		function replace(target, replacement, options = {}) {
			return createAction(ACTIONS.REPLACE, [target], {
				with: replacement,
				...options
			});
		}
		function click(...targets) {
			return createAction(ACTIONS.CLICK, targets);
		}
		function setAttributes(target, attributes, options = {}) {
			return createAction(ACTIONS.SET_ATTRIBUTE, [target], {
				attributes,
				...options
			});
		}
		function removeAttributes(target, ...attributes) {
			return createAction(ACTIONS.REMOVE_ATTRIBUTE, [target], { attributes: flatten(attributes) });
		}
		function setProperties(target, properties, options = {}) {
			return createAction(ACTIONS.SET_PROPERTY, [target], {
				properties,
				...options
			});
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
			return createAction(ACTIONS.CUSTOM, [target], {
				handler,
				...options
			});
		}
		function createPageContext(overrides = {}) {
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
				...overrides
			};
		}
		GET_PAGE_CONTEXT_HOOK = createPageContext;
		RESOLVE_SELECT_QUERY_HOOK = resolveSelectQueryCore;
		function compileHostMatcher(matcher) {
			if (matcher == null || matcher === "*") return () => true;
			if (typeof matcher === "string") {
				const pattern = matcher.toLocaleLowerCase();
				if (pattern.startsWith("*.")) {
					const base = pattern.slice(2);
					return (hostname) => {
						const actual = hostname.toLocaleLowerCase();
						return actual === base || actual.endsWith(`.${base}`);
					};
				}
				return (hostname) => hostname.toLocaleLowerCase() === pattern;
			}
			if (matcher instanceof RegExp) return (hostname) => {
				matcher.lastIndex = 0;
				return matcher.test(hostname);
			};
			if (typeof matcher === "function") return (_hostname, context) => Boolean(matcher(context));
			const compiled = matcher.map((entry) => compileHostMatcher(entry));
			return (hostname, context) => {
				for (const test of compiled) if (test(hostname, context)) return true;
				return false;
			};
		}
		function matchesHost(hostname, matcher, context, owner) {
			if (!owner) return compileHostMatcher(matcher)(hostname, context);
			let compiled = HOST_MATCHERS.get(owner);
			if (!compiled) {
				compiled = compileHostMatcher(matcher);
				HOST_MATCHERS.set(owner, compiled);
			}
			return compiled(hostname, context);
		}
		function blockScript(match, options = {}) {
			return {
				type: RULE_TYPES.SCRIPT,
				match,
				action: SCRIPT_ACTIONS.BLOCK,
				...options
			};
		}
		function allowScript(match, options = {}) {
			return {
				type: RULE_TYPES.SCRIPT,
				match,
				action: SCRIPT_ACTIONS.ALLOW,
				...options
			};
		}
		function redirectScript(match, redirect, options = {}) {
			return {
				type: RULE_TYPES.SCRIPT,
				match,
				action: SCRIPT_ACTIONS.REDIRECT,
				redirect,
				...options
			};
		}
		function modifyScript(match, modify, options = {}) {
			return {
				type: RULE_TYPES.SCRIPT,
				match,
				action: SCRIPT_ACTIONS.MODIFY,
				modify,
				...options
			};
		}
		function customScriptRule(match, handler, options = {}) {
			return {
				type: RULE_TYPES.SCRIPT,
				match,
				action: SCRIPT_ACTIONS.CUSTOM,
				handler,
				...options
			};
		}
		function matchScriptValue(actual, expected, context) {
			return matchesValue(actual, expected, context);
		}
		function createScriptContext(kind, values = {}) {
			const rawUrl = values.url || values.src || "";
			let parsedUrl = null;
			if (rawUrl) try {
				parsedUrl = new URL(String(rawUrl), location.href);
			} catch {
				parsedUrl = null;
			}
			return {
				kind,
				url: parsedUrl?.href || String(rawUrl || ""),
				src: parsedUrl?.href || String(rawUrl || ""),
				hostname: parsedUrl?.hostname || "",
				host: parsedUrl?.host || "",
				pathname: parsedUrl?.pathname || "",
				origin: parsedUrl?.origin || "",
				inline: String(values.inline ?? values.code ?? ""),
				code: String(values.code ?? values.inline ?? ""),
				type: String(values.type || ""),
				method: String(values.method || "").toUpperCase(),
				element: values.element instanceof Element ? values.element : null,
				args: Array.isArray(values.args) ? values.args : [],
				options: values.options,
				page: getPageContext(),
				...values
			};
		}
		function matchesScriptMatch(match, context) {
			if (match == null) return true;
			if (typeof match === "string") return context.url.includes(match) || context.code.includes(match);
			if (match instanceof RegExp) {
				match.lastIndex = 0;
				return match.test(context.url || context.code);
			}
			if (typeof match === "function") return Boolean(match(context));
			if (Array.isArray(match)) {
				for (const entry of match) if (matchesScriptMatch(entry, context)) return true;
				return false;
			}
			const objectMatch = match;
			if (objectMatch.kind != null && !matchScriptValue(context.kind, objectMatch.kind, context)) return false;
			if (objectMatch.src != null && !matchScriptValue(context.src, objectMatch.src, context)) return false;
			if (objectMatch.url != null && !matchScriptValue(context.url, objectMatch.url, context)) return false;
			if (objectMatch.hostname != null && !matchesHost(context.hostname, objectMatch.hostname, context.page)) return false;
			if (objectMatch.pathname != null && !matchScriptValue(context.pathname, objectMatch.pathname, context)) return false;
			if (objectMatch.inline != null && !matchScriptValue(context.inline, objectMatch.inline, context)) return false;
			if (objectMatch.code != null && !matchScriptValue(context.code, objectMatch.code, context)) return false;
			if (objectMatch.type != null && !matchScriptValue(context.type, objectMatch.type, context)) return false;
			if (objectMatch.method != null && !matchScriptValue(context.method, objectMatch.method, context)) return false;
			return typeof objectMatch.test !== "function" || objectMatch.test(context);
		}
		function matchesScriptRule(rule, context) {
			if (!rule.enabled) return false;
			if (rule.kind != null && !matchScriptValue(context.kind, rule.kind, context)) return false;
			if (rule.host != null && !matchesHost(location.hostname, rule.host, context.page, rule)) return false;
			return matchesScriptMatch(rule.match, context);
		}
		function evaluateScriptRules(context) {
			const result = {
				action: SCRIPT_ACTIONS.ALLOW,
				context,
				matchedRules: [],
				redirect: null,
				replacement: null,
				customResult: null
			};
			for (const rule of INTERNAL.scriptRules) {
				let matched = false;
				try {
					matched = matchesScriptRule(rule, context);
				} catch (error) {
					debug.error("script", `Matcher failed for "${rule.name}".`, error);
				}
				if (!matched) continue;
				result.matchedRules.push(rule);
				const action = rule.action || SCRIPT_ACTIONS.BLOCK;
				if (action === SCRIPT_ACTIONS.CUSTOM && rule.handler) try {
					const customResult = rule.handler(context, result);
					result.customResult = customResult;
					if (customResult && typeof customResult === "object") {
						const custom = customResult;
						if (custom.action) result.action = custom.action;
						if (custom.redirect) result.redirect = String(custom.redirect);
						if ("replacement" in custom) result.replacement = custom.replacement;
					}
				} catch (error) {
					debug.error("script", `Custom handler failed for "${rule.name}".`, error);
				}
				else if (action === SCRIPT_ACTIONS.REDIRECT) {
					result.action = action;
					result.redirect = typeof rule.redirect === "function" ? rule.redirect(context) : rule.redirect || null;
				} else if (action === SCRIPT_ACTIONS.MODIFY) {
					result.action = action;
					result.replacement = typeof rule.modify === "function" ? rule.modify(context) : rule.modify;
				} else result.action = action;
				if (rule.continue !== true || result.action === SCRIPT_ACTIONS.ALLOW) break;
			}
			if (CONFIG.logAllScripts || result.matchedRules.length) {
				const level = result.action === SCRIPT_ACTIONS.BLOCK ? "warn" : "debug";
				debug.group(level, "script", `${context.kind} ${result.action}: ${context.url || truncateCode(context.code)}`, () => {
					console.log("Context:", context);
					console.log("Matched rules:", result.matchedRules.map(({ id, name, action }) => ({
						id,
						name,
						action
					})));
				});
			}
			dispatchBlockerEvent("script", {
				kind: context.kind,
				url: context.url,
				action: result.action,
				matchedRuleIds: result.matchedRules.map((rule) => rule.id)
			});
			return result;
		}
		function truncateCode(code, maximum = 120) {
			const normalized = String(code || "").replace(/\s+/g, " ").trim();
			return normalized.length > maximum ? `${normalized.slice(0, maximum)}…` : normalized;
		}
		function rememberOriginal(key, value) {
			if (!INTERNAL.originals.has(key)) INTERNAL.originals.set(key, value);
			return value;
		}
		function preventScriptElement(script, reason = "blocked") {
			try {
				script.type = "application/x-blocker-blocked";
				script.dataset.blockerStatus = reason;
				script.removeAttribute("src");
				script.textContent = "";
			} catch {}
		}
		function inspectScriptElement(script) {
			const src = script.getAttribute("src") || script.src || "";
			return evaluateScriptRules(createScriptContext(src ? SCRIPT_KINDS.ELEMENT : SCRIPT_KINDS.INLINE, {
				src,
				url: src,
				inline: src ? "" : script.textContent || "",
				code: src ? "" : script.textContent || "",
				type: script.getAttribute("type") || "",
				element: script
			}));
		}
		function applyScriptElementDecision(script, decision) {
			if (decision.action === SCRIPT_ACTIONS.BLOCK) {
				preventScriptElement(script);
				return false;
			}
			if (decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect) script.src = new URL(decision.redirect, location.href).href;
			if (decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null) {
				if (script.src) script.removeAttribute("src");
				script.textContent = String(decision.replacement);
			}
			return true;
		}
		function inspectScriptPreload(link) {
			if (!CONFIG.interceptScriptPreloads) return true;
			const rel = String(link.rel || "").toLowerCase();
			const decision = evaluateScriptRules(createScriptContext(rel === "modulepreload" ? SCRIPT_KINDS.MODULE_PRELOAD : SCRIPT_KINDS.PRELOAD, {
				src: link.href,
				url: link.href,
				element: link,
				type: rel
			}));
			if (decision.action === SCRIPT_ACTIONS.BLOCK) {
				link.removeAttribute("href");
				link.dataset.blockerStatus = "blocked";
				return false;
			}
			if (decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect) link.href = new URL(decision.redirect, location.href).href;
			return true;
		}
		function inspectNodeForScripts(node) {
			if (!CONFIG.interceptScripts) return true;
			let allowed = true;
			if (node instanceof HTMLScriptElement) allowed = applyScriptElementDecision(node, inspectScriptElement(node)) && allowed;
			else if (node instanceof HTMLLinkElement) {
				const rel = node.rel.toLowerCase();
				if (rel === "modulepreload" || rel === "preload" && node.as === "script") allowed = inspectScriptPreload(node) && allowed;
			}
			if (!(node instanceof Element || node instanceof DocumentFragment)) return allowed;
			const scripts = node.querySelectorAll?.("script") || [];
			for (let index = 0; index < scripts.length; index += 1) allowed = applyScriptElementDecision(scripts[index], inspectScriptElement(scripts[index])) && allowed;
			if (CONFIG.interceptScriptPreloads) {
				const links = node.querySelectorAll?.("link[rel=\"preload\"][as=\"script\"],link[rel=\"modulepreload\"]") || [];
				for (let index = 0; index < links.length; index += 1) allowed = inspectScriptPreload(links[index]) && allowed;
			}
			return allowed;
		}
		function patchMethod(owner, key, originalKey, wrapper) {
			const original = owner[key];
			if (typeof original !== "function") return;
			rememberOriginal(originalKey, original);
			try {
				owner[key] = wrapper(original);
			} catch {}
		}
		function installDomScriptInterceptors() {
			for (const methodName of [
				"appendChild",
				"insertBefore",
				"replaceChild"
			]) patchMethod(Node.prototype, methodName, `Node.${methodName}`, (original) => function blockerNodeInsertion(node, ...rest) {
				inspectNodeForScripts(node);
				return Reflect.apply(original, this, [node, ...rest]);
			});
			for (const prototype of [
				Element.prototype,
				Document.prototype,
				DocumentFragment.prototype
			]) for (const methodName of ["append", "prepend"]) patchMethod(prototype, methodName, `${prototype.constructor?.name || "ParentNode"}.${methodName}`, (original) => function blockerParentInsertion(...nodes) {
				if (CONFIG.interceptScripts) {
					for (const node of nodes) if (node instanceof Node) inspectNodeForScripts(node);
				}
				return Reflect.apply(original, this, nodes);
			});
			for (const prototype of [
				Element.prototype,
				CharacterData.prototype,
				DocumentType.prototype
			]) for (const methodName of [
				"before",
				"after",
				"replaceWith"
			]) patchMethod(prototype, methodName, `${prototype.constructor?.name || "ChildNode"}.${methodName}`, (original) => function blockerChildInsertion(...nodes) {
				if (CONFIG.interceptScripts) {
					for (const node of nodes) if (node instanceof Node) inspectNodeForScripts(node);
				}
				return Reflect.apply(original, this, nodes);
			});
			const originalSetAttribute = rememberOriginal("Element.setAttribute", Element.prototype.setAttribute);
			Element.prototype.setAttribute = function blockerSetAttribute(name, value) {
				if (CONFIG.interceptScripts && this instanceof HTMLScriptElement && name.toLowerCase() === "src") {
					const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.ELEMENT, {
						src: value,
						url: value,
						element: this,
						type: this.type
					}));
					if (decision.action === SCRIPT_ACTIONS.BLOCK) {
						preventScriptElement(this);
						return;
					}
					if (decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect) value = decision.redirect;
				}
				return Reflect.apply(originalSetAttribute, this, [name, value]);
			};
			const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src");
			if (srcDescriptor?.set && srcDescriptor.get) {
				rememberOriginal("HTMLScriptElement.src", srcDescriptor);
				Object.defineProperty(HTMLScriptElement.prototype, "src", {
					configurable: srcDescriptor.configurable,
					enumerable: srcDescriptor.enumerable,
					get: srcDescriptor.get,
					set(value) {
						if (!CONFIG.interceptScripts) return Reflect.apply(srcDescriptor.set, this, [value]);
						const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.ELEMENT, {
							src: value,
							url: value,
							element: this,
							type: this.type
						}));
						if (decision.action === SCRIPT_ACTIONS.BLOCK) {
							preventScriptElement(this);
							return;
						}
						const nextValue = decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect ? decision.redirect : value;
						return Reflect.apply(srcDescriptor.set, this, [nextValue]);
					}
				});
			}
			document.addEventListener("beforescriptexecute", (event) => {
				if (!CONFIG.interceptScripts) return;
				const script = event.target;
				if (!(script instanceof HTMLScriptElement)) return;
				if (!applyScriptElementDecision(script, inspectScriptElement(script))) {
					event.preventDefault();
					event.stopImmediatePropagation();
				}
			}, true);
			document.addEventListener("beforeload", (event) => {
				if (!CONFIG.interceptScripts) return;
				const target = event.target;
				if (target instanceof HTMLScriptElement && !applyScriptElementDecision(target, inspectScriptElement(target))) event.preventDefault();
				if (target instanceof HTMLLinkElement && !inspectScriptPreload(target)) event.preventDefault();
			}, true);
		}
		const XHR_META = /* @__PURE__ */ new WeakMap();
		function installXHRInterceptor() {
			if (typeof XMLHttpRequest !== "function") return;
			const open = rememberOriginal("XMLHttpRequest.open", XMLHttpRequest.prototype.open);
			const send = rememberOriginal("XMLHttpRequest.send", XMLHttpRequest.prototype.send);
			XMLHttpRequest.prototype.open = function blockerXhrOpen(method, url, async = true, user = null, password = null) {
				XHR_META.set(this, {
					method,
					url,
					async: Boolean(async),
					user,
					password
				});
				return Reflect.apply(open, this, [
					method,
					url,
					async,
					user,
					password
				]);
			};
			XMLHttpRequest.prototype.send = function blockerXhrSend(body) {
				if (!CONFIG.interceptScripts || !CONFIG.interceptXHR) return Reflect.apply(send, this, [body]);
				const meta = XHR_META.get(this);
				if (!meta) return Reflect.apply(send, this, [body]);
				const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.XHR, {
					method: meta.method,
					url: meta.url,
					src: meta.url,
					body,
					xhr: this
				}));
				if (decision.action === SCRIPT_ACTIONS.BLOCK) {
					queueMicrotask(() => {
						try {
							this.abort();
						} catch {}
						try {
							this.dispatchEvent(new Event("error"));
						} catch {}
						try {
							this.dispatchEvent(new Event("loadend"));
						} catch {}
					});
					return;
				}
				if (decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect) Reflect.apply(open, this, [
					meta.method,
					decision.redirect,
					meta.async,
					meta.user,
					meta.password
				]);
				return Reflect.apply(send, this, [body]);
			};
		}
		function installWorkerInterceptors() {
			if (!CONFIG.interceptWorkers) return;
			const installWorker = (name, kind) => {
				const Original = globalWindow[name];
				if (typeof Original !== "function") return;
				rememberOriginal(name, Original);
				const Wrapped = function BlockerWorker(url, options) {
					if (!CONFIG.interceptScripts || !CONFIG.interceptWorkers) return Reflect.construct(Original, options === void 0 ? [url] : [url, options], new.target || Original);
					const decision = evaluateScriptRules(createScriptContext(kind, {
						url,
						src: url,
						options
					}));
					if (decision.action === SCRIPT_ACTIONS.BLOCK) throw new DOMException(`Blocked by ${SCRIPT.name}`, "SecurityError");
					const nextUrl = decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect ? decision.redirect : url;
					return Reflect.construct(Original, options === void 0 ? [nextUrl] : [nextUrl, options], new.target || Original);
				};
				Object.setPrototypeOf(Wrapped, Original);
				Wrapped.prototype = Original.prototype;
				try {
					globalWindow[name] = Wrapped;
				} catch {}
			};
			installWorker("Worker", SCRIPT_KINDS.WORKER);
			installWorker("SharedWorker", SCRIPT_KINDS.SHARED_WORKER);
			const serviceWorkerContainer = navigator.serviceWorker;
			const register = serviceWorkerContainer?.register;
			if (serviceWorkerContainer && typeof register === "function") {
				rememberOriginal("ServiceWorker.register", register);
				try {
					serviceWorkerContainer.register = function blockerServiceWorkerRegister(url, options) {
						if (!CONFIG.interceptScripts || !CONFIG.interceptWorkers) return Reflect.apply(register, this, options === void 0 ? [url] : [url, options]);
						const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.SERVICE_WORKER, {
							url,
							src: url,
							options
						}));
						if (decision.action === SCRIPT_ACTIONS.BLOCK) return Promise.reject(new DOMException(`Blocked by ${SCRIPT.name}`, "SecurityError"));
						const nextUrl = decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect ? decision.redirect : url;
						return Reflect.apply(register, this, options === void 0 ? [nextUrl] : [nextUrl, options]);
					};
				} catch {}
			}
		}
		function installDynamicCodeInterceptors() {
			const originalEval = rememberOriginal("eval", globalWindow.eval);
			globalWindow.eval = function blockerEval(code) {
				if (!CONFIG.interceptScripts || !CONFIG.interceptDynamicCode) return Reflect.apply(originalEval, this, [code]);
				const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.EVAL, {
					code,
					inline: code
				}));
				if (decision.action === SCRIPT_ACTIONS.BLOCK) return void 0;
				const nextCode = decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null ? String(decision.replacement) : code;
				return Reflect.apply(originalEval, this, [nextCode]);
			};
			const OriginalFunction = rememberOriginal("Function", globalWindow.Function);
			const BlockerFunction = function(...args) {
				if (!CONFIG.interceptScripts || !CONFIG.interceptDynamicCode) return Reflect.construct(OriginalFunction, args, new.target || OriginalFunction);
				const code = args.length ? args[args.length - 1] : "";
				const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.FUNCTION, {
					code,
					inline: code,
					args
				}));
				if (decision.action === SCRIPT_ACTIONS.BLOCK) return function blockedDynamicFunction() {};
				if (decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null && args.length) args[args.length - 1] = String(decision.replacement);
				return Reflect.construct(OriginalFunction, args, new.target || OriginalFunction);
			};
			Object.setPrototypeOf(BlockerFunction, OriginalFunction);
			BlockerFunction.prototype = OriginalFunction.prototype;
			try {
				globalWindow.Function = BlockerFunction;
			} catch {}
			for (const timerName of ["setTimeout", "setInterval"]) {
				const original = rememberOriginal(timerName, globalWindow[timerName]);
				globalWindow[timerName] = function blockerTimer(handler, timeout, ...args) {
					if (CONFIG.interceptScripts && CONFIG.interceptDynamicCode && typeof handler === "string") {
						const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.TIMER, {
							code: handler,
							inline: handler,
							timer: timerName,
							timeout
						}));
						if (decision.action === SCRIPT_ACTIONS.BLOCK) return 0;
						if (decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null) handler = String(decision.replacement);
					}
					return Reflect.apply(original, this, [
						handler,
						timeout,
						...args
					]);
				};
			}
		}
		function installDocumentWriteInterceptor() {
			for (const methodName of ["write", "writeln"]) {
				const original = document[methodName];
				if (typeof original !== "function") continue;
				rememberOriginal(`document.${methodName}`, original);
				document[methodName] = function blockerDocumentWrite(...parts) {
					if (!CONFIG.interceptScripts || !CONFIG.interceptDocumentWrite) return Reflect.apply(original, this, parts);
					const html = parts.join(methodName === "writeln" ? "\n" : "");
					const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.DOCUMENT_WRITE, {
						code: html,
						inline: html,
						html
					}));
					if (decision.action === SCRIPT_ACTIONS.BLOCK) return;
					const nextHtml = decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null ? String(decision.replacement) : html;
					return Reflect.apply(original, this, [nextHtml]);
				};
			}
		}
		function installWebAssemblyInterceptors() {
			const wasm = globalWindow.WebAssembly;
			if (!wasm) return;
			for (const methodName of [
				"instantiate",
				"instantiateStreaming",
				"compile",
				"compileStreaming"
			]) {
				const original = wasm[methodName];
				if (typeof original !== "function") continue;
				rememberOriginal(`WebAssembly.${methodName}`, original);
				try {
					wasm[methodName] = function blockerWebAssembly(...args) {
						if (!CONFIG.interceptScripts || !CONFIG.interceptWebAssembly) return Reflect.apply(original, this, args);
						const source = args[0];
						const sourceUrl = source instanceof Response ? source.url : "";
						if (evaluateScriptRules(createScriptContext(SCRIPT_KINDS.WEBASSEMBLY, {
							args,
							source,
							url: sourceUrl,
							src: sourceUrl
						})).action === SCRIPT_ACTIONS.BLOCK) return Promise.reject(new WebAssembly.CompileError(`Blocked by ${SCRIPT.name}`));
						return Reflect.apply(original, this, args);
					};
				} catch {}
			}
		}
		function restoreOriginal(key, target, property) {
			const original = INTERNAL.originals.get(key);
			if (original == null) return;
			try {
				if (original && typeof original === "object" && ("get" in original || "set" in original)) Object.defineProperty(target, property, original);
				else target[property] = original;
			} catch {}
		}
		function installScriptInterceptors() {
			if (INTERNAL.scriptInterceptorsInstalled || !CONFIG.interceptScripts) return false;
			INTERNAL.scriptInterceptorsInstalled = true;
			installDomScriptInterceptors();
			installXHRInterceptor();
			installWorkerInterceptors();
			installDynamicCodeInterceptors();
			installDocumentWriteInterceptor();
			installWebAssemblyInterceptors();
			debug.success("script", "Script and executable-resource interceptors installed.");
			return true;
		}
		function uninstallScriptInterceptors() {
			if (!INTERNAL.scriptInterceptorsInstalled) return false;
			restoreOriginal("Element.setAttribute", Element.prototype, "setAttribute");
			restoreOriginal("HTMLScriptElement.src", HTMLScriptElement.prototype, "src");
			restoreOriginal("XMLHttpRequest.open", XMLHttpRequest.prototype, "open");
			restoreOriginal("XMLHttpRequest.send", XMLHttpRequest.prototype, "send");
			restoreOriginal("eval", globalWindow, "eval");
			restoreOriginal("Function", globalWindow, "Function");
			restoreOriginal("setTimeout", globalWindow, "setTimeout");
			restoreOriginal("setInterval", globalWindow, "setInterval");
			restoreOriginal("document.write", document, "write");
			restoreOriginal("document.writeln", document, "writeln");
			for (const methodName of [
				"appendChild",
				"insertBefore",
				"replaceChild"
			]) restoreOriginal(`Node.${methodName}`, Node.prototype, methodName);
			INTERNAL.scriptInterceptorsInstalled = false;
			debug.info("script", "Core script interceptors restored where possible. Event listeners remain inert behind config guards.");
			return true;
		}
		function normalizeRule(rule) {
			if (!rule || typeof rule !== "object") throw new TypeError("Blocker rules must be objects.");
			INTERNAL.ruleSequence += 1;
			const type = rule.type || RULE_TYPES.DOM;
			const id = rule.id || `${type}-${Date.now().toString(36)}-${INTERNAL.ruleSequence.toString(36)}`;
			const name = rule.name || id;
			const enabled = rule.enabled !== false;
			if (type === RULE_TYPES.FETCH) {
				const fetchRule = rule;
				return {
					...fetchRule,
					type,
					id,
					name,
					enabled,
					action: fetchRule.action || FETCH_ACTIONS.BLOCK
				};
			}
			if (type === RULE_TYPES.SCRIPT) {
				const scriptRule = rule;
				return {
					...scriptRule,
					type,
					id,
					name,
					enabled,
					action: scriptRule.action || SCRIPT_ACTIONS.BLOCK
				};
			}
			if (type === RULE_TYPES.DOM) return {
				...rule,
				type,
				id,
				name,
				enabled
			};
			throw new TypeError(`Unsupported rule type: ${String(type)}`);
		}
		function compileDomActions(rule) {
			const cached = COMPILED_DOM_ACTIONS.get(rule);
			if (cached) return cached;
			const actions = [];
			const sourceActions = Array.isArray(rule.actions) ? rule.actions : [];
			for (let actionIndex = 0; actionIndex < sourceActions.length; actionIndex += 1) {
				const action = sourceActions[actionIndex];
				const targets = flatten(action.targets || []).map((target, targetIndex) => ({
					target,
					identity: `${rule.id}:${action.action}:${actionIndex}:${targetIndex}`
				}));
				actions.push({
					action,
					targets
				});
			}
			COMPILED_DOM_ACTIONS.set(rule, actions);
			return actions;
		}
		function addRule(rule, options = {}) {
			const normalized = normalizeRule(rule);
			if (INTERNAL.rulesById.has(normalized.id)) {
				if (options.replace !== true) {
					debug.warn("plugin", `Rule "${normalized.id}" already exists.`);
					return INTERNAL.rulesById.get(normalized.id);
				}
				removeRule(normalized.id);
			}
			INTERNAL.rulesById.set(normalized.id, normalized);
			if (normalized.type === RULE_TYPES.FETCH) INTERNAL.fetchRules.push(normalized);
			else if (normalized.type === RULE_TYPES.SCRIPT) INTERNAL.scriptRules.push(normalized);
			else {
				INTERNAL.domRules.push(normalized);
				compileDomActions(normalized);
			}
			debug.success("plugin", `Added ${normalized.type} rule "${normalized.name}" (${normalized.id}).`);
			dispatchBlockerEvent("rule-added", { rule: normalized });
			if (normalized.type === RULE_TYPES.DOM && options.run !== false && INTERNAL.initialized) queueMicrotask(() => void runDomRules({ reason: `rule-added:${normalized.id}` }));
			return normalized;
		}
		function addRules(rules, options = {}) {
			if (!Array.isArray(rules)) throw new TypeError("Blocker.addRules() expects an array.");
			const added = new Array(rules.length);
			for (let index = 0; index < rules.length; index += 1) added[index] = addRule(rules[index], {
				...options,
				run: false
			});
			if (options.run !== false && INTERNAL.initialized) queueMicrotask(() => void runDomRules({ reason: "rules-added" }));
			return added;
		}
		function addScriptRule(rule, options = {}) {
			return addRule({
				...rule,
				type: RULE_TYPES.SCRIPT
			}, options);
		}
		function addScriptRules(rules, options = {}) {
			const output = new Array(rules.length);
			for (let index = 0; index < rules.length; index += 1) output[index] = addScriptRule(rules[index], {
				...options,
				run: false
			});
			return output;
		}
		function getRule(id) {
			return INTERNAL.rulesById.get(id) || null;
		}
		function getRules(options = {}) {
			const output = [];
			for (const rule of INTERNAL.rulesById.values()) {
				if (options.type && rule.type !== options.type) continue;
				if (options.enabled != null && rule.enabled !== options.enabled) continue;
				output.push(rule);
			}
			return output;
		}
		function removeRule(id) {
			const rule = getRule(id);
			if (!rule) return false;
			INTERNAL.rulesById.delete(id);
			const collection = rule.type === RULE_TYPES.FETCH ? INTERNAL.fetchRules : rule.type === RULE_TYPES.SCRIPT ? INTERNAL.scriptRules : INTERNAL.domRules;
			const index = collection.indexOf(rule);
			if (index >= 0) collection.splice(index, 1);
			debug.warn("plugin", `Removed rule "${rule.name}" (${rule.id}).`);
			dispatchBlockerEvent("rule-removed", { rule });
			return true;
		}
		function clearRules(options = {}) {
			const rules = getRules(options);
			for (const rule of rules) removeRule(rule.id);
			return rules.length;
		}
		function setRuleEnabled(id, enabled) {
			const rule = getRule(id);
			if (!rule) return false;
			rule.enabled = Boolean(enabled);
			debug.info("plugin", `${rule.enabled ? "Enabled" : "Disabled"} rule "${rule.name}".`);
			dispatchBlockerEvent("rule-toggled", {
				rule,
				enabled: rule.enabled
			});
			if (rule.enabled && rule.type === RULE_TYPES.DOM) queueMicrotask(() => void runDomRules({ reason: `rule-enabled:${rule.id}` }));
			return true;
		}
		function markProcessed(element, identity) {
			let identities = INTERNAL.processedElements.get(element);
			if (!identities) {
				identities = /* @__PURE__ */ new Set();
				INTERNAL.processedElements.set(element, identities);
			}
			identities.add(identity);
		}
		function wasProcessed(element, identity) {
			return INTERNAL.processedElements.get(element)?.has(identity) ?? false;
		}
		async function executeDomAction(rule, action, identity, element, context) {
			const once = action.once !== false;
			if (once && wasProcessed(element, identity)) return false;
			if (action.when) {
				if (!await settle(action.when(element, context))) return false;
			}
			if (once) markProcessed(element, identity);
			switch (action.action) {
				case ACTIONS.HIDE:
					element.classList.add("blocker-hidden");
					return true;
				case ACTIONS.REMOVE:
					element.remove();
					return true;
				case ACTIONS.REPLACE: {
					const replacement = typeof action.with === "function" ? await settle(action.with(element, context)) : action.with;
					if (replacement instanceof Node) {
						element.replaceWith(replacement);
						return true;
					}
					if (typeof replacement === "string") {
						const template = document.createElement("template");
						template.innerHTML = replacement.trim();
						element.replaceWith(template.content);
						return true;
					}
					return false;
				}
				case ACTIONS.CLICK:
					if (action.nativeClick === false) element.dispatchEvent(new MouseEvent("click", {
						bubbles: true,
						cancelable: true,
						composed: true,
						view: globalWindow
					}));
					else element.click?.();
					return true;
				case ACTIONS.SET_ATTRIBUTE: {
					const attributes = typeof action.attributes === "function" ? await settle(action.attributes(element, context)) : action.attributes;
					for (const [name, value] of Object.entries(attributes || {})) if (value == null || value === false) element.removeAttribute(name);
					else element.setAttribute(name, value === true ? "" : String(value));
					return true;
				}
				case ACTIONS.REMOVE_ATTRIBUTE: {
					const attributes = action.attributes;
					if (!attributes) return false;
					for (const name of attributes) element.removeAttribute(String(name));
					return true;
				}
				case ACTIONS.SET_PROPERTY: {
					const properties = typeof action.properties === "function" ? await settle(action.properties(element, context)) : action.properties;
					if (!properties) return false;
					Object.assign(element, properties);
					return true;
				}
				case ACTIONS.ADD_CLASS:
					if (action.classNames?.length) element.classList.add(...action.classNames);
					return true;
				case ACTIONS.REMOVE_CLASS:
					if (action.classNames?.length) element.classList.remove(...action.classNames);
					return true;
				case ACTIONS.UNWRAP: {
					const parent = element.parentNode;
					if (!parent) return false;
					while (element.firstChild) parent.insertBefore(element.firstChild, element);
					element.remove();
					return true;
				}
				case ACTIONS.CUSTOM:
					if (!action.handler) return false;
					await settle(action.handler(element, context));
					return true;
				default: throw new TypeError(`Unknown DOM action: ${String(action.action)}`);
			}
		}
		async function runDomRules(options = {}) {
			INTERNAL.runSequence += 1;
			const root = options.root || document;
			const context = getPageContext({
				root,
				reason: options.reason || "manual",
				runSequence: INTERNAL.runSequence
			});
			const results = [];
			for (const rule of INTERNAL.domRules) {
				if (!rule.enabled) continue;
				if (!matchesHost(context.hostname, rule.host, context, rule)) continue;
				if (rule.pathname != null && !matchesValue(context.pathname, rule.pathname, context)) continue;
				if (rule.match && !rule.match(context)) continue;
				if (rule.when && !rule.when(context)) continue;
				const startedAt = performance.now();
				const result = {
					ruleId: rule.id,
					matched: 0,
					affected: 0,
					errors: 0
				};
				try {
					if (rule.before) await settle(rule.before(context));
					const actions = compileDomActions(rule);
					for (const compiled of actions) for (const compiledTarget of compiled.targets) {
						const elements = resolveSelector(compiledTarget.target, root, context);
						result.matched += elements.length;
						for (const element of elements) try {
							if (await executeDomAction(rule, compiled.action, compiledTarget.identity, element, context)) result.affected += 1;
						} catch (error) {
							result.errors += 1;
							debug.error("dom", `Action failed in rule "${rule.name}".`, error);
						}
					}
					if (rule.run) await settle(rule.run(context, result));
					if (rule.after) await settle(rule.after(context, result));
				} catch (error) {
					result.errors += 1;
					debug.error("dom", `Rule "${rule.name}" failed.`, error);
				}
				result.duration = duration(startedAt);
				results.push(result);
				if (result.affected > 0 || result.errors > 0 || rule.debug) debug.group(result.errors ? "error" : "debug", "dom", `${rule.name}: ${result.affected} affected in ${result.duration}`, () => console.table(result));
			}
			return results;
		}
		function createFetchContext(input, init, sequence) {
			const request = input instanceof Request ? input : null;
			const url = new URL(request?.url || String(input), location.href);
			return {
				id: `fetch-${sequence}`,
				sequence,
				input,
				init,
				request,
				url,
				href: url.href,
				hostname: url.hostname,
				host: url.host,
				pathname: url.pathname,
				search: url.search,
				method: String(init?.method || request?.method || "GET").toUpperCase(),
				headers: new Headers(init?.headers || request?.headers || void 0),
				body: init?.body ?? null,
				startedAt: performance.now(),
				page: getPageContext()
			};
		}
		function matchesFetchMatch(match, context) {
			if (match == null) return true;
			if (typeof match === "string") return context.href.includes(match);
			if (match instanceof RegExp) {
				match.lastIndex = 0;
				return match.test(context.href);
			}
			if (typeof match === "function") return Boolean(match(context));
			if (Array.isArray(match)) {
				for (const entry of match) if (matchesFetchMatch(entry, context)) return true;
				return false;
			}
			const objectMatch = match;
			return matchesHost(context.hostname, objectMatch.hostname, context.page) && matchesValue(context.host, objectMatch.host, context) && matchesValue(context.pathname, objectMatch.pathname, context) && matchesValue(context.search, objectMatch.search, context) && matchesValue(context.method, objectMatch.method, context) && (typeof objectMatch.test !== "function" || objectMatch.test(context));
		}
		function matchesFetchRule(rule, context) {
			return rule.enabled && matchesFetchMatch(rule.match, context);
		}
		function blockedResponse(rule, context) {
			const config = typeof rule.response === "function" ? rule.response(context) : rule.response || {};
			const headers = new Headers(config.headers || {});
			headers.set("x-blocked-by", SCRIPT.name);
			let body = config.body ?? null;
			if (body && typeof body === "object" && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && !(body instanceof FormData) && !(body instanceof URLSearchParams) && !(body instanceof ReadableStream)) {
				body = JSON.stringify(body);
				if (!headers.has("content-type")) headers.set("content-type", "application/json; charset=utf-8");
			}
			const status = config.status ?? (body == null ? 204 : 200);
			return new Response(status === 204 || status === 205 || status === 304 ? null : body, {
				status,
				statusText: config.statusText ?? "Blocked by Blocker",
				headers
			});
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
				if (!matchesFetchRule(rule, context)) continue;
				matchedRules.push(rule);
				if (rule.action === FETCH_ACTIONS.ALLOW) break;
				if (rule.action === FETCH_ACTIONS.BLOCK) {
					response = blockedResponse(rule, context);
					blocked = true;
					if (rule.continue !== true) break;
				} else if (rule.action === FETCH_ACTIONS.REDIRECT) {
					if (!rule.redirect) continue;
					currentInput = typeof rule.redirect === "function" ? await settle(rule.redirect(context)) : rule.redirect;
					context = createFetchContext(currentInput, currentInit, sequence);
					if (rule.continue !== true) break;
				} else if (rule.action === FETCH_ACTIONS.MODIFY_REQUEST) {
					if (!rule.modifyRequest) continue;
					const modification = await settle(rule.modifyRequest({
						...context,
						input: currentInput,
						init: currentInit
					}));
					if (modification instanceof Request) {
						currentInput = modification;
						currentInit = void 0;
					} else if (modification) {
						currentInput = modification.input ?? currentInput;
						currentInit = modification.init ?? {
							...currentInit || {},
							...modification
						};
					}
					context = createFetchContext(currentInput, currentInit, sequence);
					if (rule.continue !== true) break;
				} else if (rule.action === FETCH_ACTIONS.MODIFY_RESPONSE) responseModifiers.push(rule);
				else if (rule.action === FETCH_ACTIONS.CUSTOM) {
					if (!rule.handler) continue;
					const result = await settle(rule.handler({
						...context,
						input: currentInput,
						init: currentInit,
						fetch: INTERNAL.originalFetch
					}));
					if (result instanceof Response) response = result;
					else if (result) {
						currentInput = result.input ?? currentInput;
						currentInit = result.init ?? currentInit;
						response = result.response instanceof Response ? result.response : response;
						blocked = Boolean(result.blocked ?? blocked);
					}
					if (rule.continue !== true) break;
				}
			}
			if (!response) {
				if (!INTERNAL.originalFetch) throw new Error("Original fetch is unavailable.");
				response = await Reflect.apply(INTERNAL.originalFetch, globalWindow, [currentInput, currentInit]);
			}
			for (const rule of responseModifiers) {
				if (!rule.modifyResponse) continue;
				const modified = await settle(rule.modifyResponse(response, {
					...context,
					response
				}));
				if (modified instanceof Response) response = modified;
			}
			if (CONFIG.logAllFetches || matchedRules.length) debug.group(blocked ? "warn" : "debug", "fetch", `#${sequence} ${context.method} ${context.href} → ${blocked ? "BLOCKED" : response.status} · ${duration(context.startedAt)}`, () => {
				console.log("Matched rules:", matchedRules.map(({ id, name, action }) => ({
					id,
					name,
					action
				})));
				console.log("Response:", response);
			});
			dispatchBlockerEvent("fetch", {
				id: context.id,
				url: context.href,
				method: context.method,
				blocked,
				status: response.status,
				matchedRuleIds: matchedRules.map((rule) => rule.id)
			});
			return response;
		}
		function installFetchInterceptor() {
			if (INTERNAL.fetchInstalled || !CONFIG.interceptFetch || typeof globalWindow.fetch !== "function") return false;
			INTERNAL.originalFetch = globalWindow.fetch.bind(globalWindow);
			globalWindow.fetch = interceptedFetch;
			INTERNAL.fetchInstalled = true;
			debug.success("fetch", "Fetch interceptor installed.");
			return true;
		}
		function uninstallFetchInterceptor() {
			if (!INTERNAL.fetchInstalled || !INTERNAL.originalFetch) return false;
			globalWindow.fetch = INTERNAL.originalFetch;
			INTERNAL.fetchInstalled = false;
			return true;
		}
		function addMutationScope(node) {
			if (node instanceof ShadowRoot) {
				INTERNAL.pendingMutationScopes.add(node);
				return;
			}
			if (node instanceof Element) {
				INTERNAL.pendingMutationScopes.add(node);
				return;
			}
			if (node.parentElement) INTERNAL.pendingMutationScopes.add(node.parentElement);
		}
		function collapseMutationScopes(scopes) {
			if (scopes.length <= 1) return [...scopes];
			const output = [];
			outer: for (const candidate of scopes) {
				for (let index = output.length - 1; index >= 0; index -= 1) {
					const current = output[index];
					if (current === candidate) continue outer;
					if (current instanceof Element && candidate instanceof Element) {
						if (current.contains(candidate)) continue outer;
						if (candidate.contains(current)) output.splice(index, 1);
					} else if (current instanceof ShadowRoot && candidate.getRootNode() === current) continue outer;
				}
				output.push(candidate);
				if (output.length >= CONFIG.maximumMutationScopes) break;
			}
			return output;
		}
		function discoverShadowRootsFromNode(node) {
			if (!CONFIG.observeShadowRoots) return;
			if (node instanceof Element && node.shadowRoot) observeRoot(node.shadowRoot);
			if (!(node instanceof Element || node instanceof DocumentFragment)) return;
			const elements = node.querySelectorAll("*");
			for (let index = 0; index < elements.length; index += 1) {
				const shadowRoot = elements[index].shadowRoot;
				if (shadowRoot) observeRoot(shadowRoot);
			}
		}
		function flushMutationScopes(observerRoot) {
			INTERNAL.observerTimer = 0;
			const mutationCount = INTERNAL.pendingMutationCount;
			INTERNAL.pendingMutationCount = 0;
			const pending = Array.from(INTERNAL.pendingMutationScopes);
			INTERNAL.pendingMutationScopes.clear();
			if (!pending.length) return;
			if (mutationCount >= CONFIG.mutationFullScanThreshold || pending.length > CONFIG.maximumMutationScopes) {
				runDomRules({
					reason: "mutation:full-scan",
					root: observerRoot
				});
				return;
			}
			const scopes = collapseMutationScopes(pending);
			for (const scope of scopes) runDomRules({
				reason: "mutation",
				root: scope
			});
		}
		function scheduleMutationFlush(observerRoot) {
			if (INTERNAL.observerTimer) globalWindow.clearTimeout(INTERNAL.observerTimer);
			INTERNAL.observerTimer = globalWindow.setTimeout(() => flushMutationScopes(observerRoot), CONFIG.observerDebounceMs);
		}
		function observeRoot(root) {
			if (!CONFIG.observeMutations || INTERNAL.observedRoots.has(root)) return;
			const observer = new MutationObserver((mutations) => {
				let relevant = false;
				for (const mutation of mutations) if (mutation.type === "childList") {
					if (!mutation.addedNodes.length) continue;
					relevant = true;
					INTERNAL.pendingMutationCount += mutation.addedNodes.length;
					addMutationScope(mutation.target);
					for (let index = 0; index < mutation.addedNodes.length; index += 1) {
						const node = mutation.addedNodes[index];
						addMutationScope(node);
						discoverShadowRootsFromNode(node);
					}
				} else if (mutation.type === "attributes" && CONFIG.observeAttributes) {
					relevant = true;
					INTERNAL.pendingMutationCount += 1;
					addMutationScope(mutation.target);
				} else if (mutation.type === "characterData" && CONFIG.observeCharacterData) {
					relevant = true;
					INTERNAL.pendingMutationCount += 1;
					addMutationScope(mutation.target);
				}
				if (relevant) scheduleMutationFlush(root);
			});
			observer.observe(root, {
				childList: true,
				subtree: true,
				attributes: CONFIG.observeAttributes,
				characterData: CONFIG.observeCharacterData
			});
			INTERNAL.observedRoots.add(root);
			INTERNAL.observers.add(observer);
		}
		function discoverShadowRoots(root = document) {
			if (!CONFIG.observeShadowRoots) return;
			if (root instanceof Element && root.shadowRoot) observeRoot(root.shadowRoot);
			const elements = queryCss(root, "*", root instanceof Element);
			for (const element of elements) if (element.shadowRoot) observeRoot(element.shadowRoot);
		}
		function installShadowHook() {
			if (INTERNAL.shadowHookInstalled || typeof Element.prototype.attachShadow !== "function") return;
			INTERNAL.originalAttachShadow = Element.prototype.attachShadow;
			Element.prototype.attachShadow = function blockerAttachShadow(init) {
				const shadowRoot = Reflect.apply(INTERNAL.originalAttachShadow, this, [init]);
				if (init.mode === "open") queueMicrotask(() => {
					observeRoot(shadowRoot);
					runDomRules({
						reason: "attach-shadow",
						root: shadowRoot
					});
				});
				return shadowRoot;
			};
			INTERNAL.shadowHookInstalled = true;
		}
		function scheduleNavigation(reason) {
			if (INTERNAL.navigationTimer) globalWindow.clearTimeout(INTERNAL.navigationTimer);
			INTERNAL.navigationTimer = globalWindow.setTimeout(() => {
				INTERNAL.navigationTimer = 0;
				const nextUrl = location.href;
				const previousUrl = INTERNAL.currentUrl;
				if (nextUrl === previousUrl && reason !== "pageshow") return;
				INTERNAL.currentUrl = nextUrl;
				debug.info("dom", `Navigation via ${reason}: ${previousUrl} → ${nextUrl}`);
				dispatchBlockerEvent("navigation", {
					reason,
					previousUrl,
					url: nextUrl
				});
				runDomRules({ reason: `navigation:${reason}` });
			}, CONFIG.navigationDebounceMs);
		}
		function installNavigationHooks() {
			if (INTERNAL.navigationInstalled) return;
			for (const methodName of ["pushState", "replaceState"]) {
				const original = history[methodName];
				INTERNAL.originalHistoryMethods.set(methodName, original);
				history[methodName] = function blockerHistory(...args) {
					const result = Reflect.apply(original, this, args);
					scheduleNavigation(methodName);
					return result;
				};
			}
			globalWindow.addEventListener("popstate", () => scheduleNavigation("popstate"));
			globalWindow.addEventListener("hashchange", () => scheduleNavigation("hashchange"));
			globalWindow.addEventListener("pageshow", () => scheduleNavigation("pageshow"));
			INTERNAL.navigationInstalled = true;
		}
		function installStyles() {
			if (INTERNAL.stylesInstalled) return;
			const cssText = ".blocker-hidden{display:none!important;visibility:hidden!important;pointer-events:none!important;}";
			if (typeof globalWindow.GM_addStyle === "function") globalWindow.GM_addStyle(cssText);
			else {
				const style = document.createElement("style");
				style.dataset.blockerVersion = SCRIPT.version;
				style.textContent = cssText;
				(document.head || document.documentElement)?.appendChild(style);
			}
			INTERNAL.stylesInstalled = true;
		}
		function configure(nextConfig = {}) {
			Object.assign(CONFIG, nextConfig);
			if (CONFIG.interceptFetch && !INTERNAL.fetchInstalled) installFetchInterceptor();
			if (!CONFIG.interceptFetch && INTERNAL.fetchInstalled) uninstallFetchInterceptor();
			if (CONFIG.interceptScripts && !INTERNAL.scriptInterceptorsInstalled) installScriptInterceptors();
			if (!CONFIG.interceptScripts && INTERNAL.scriptInterceptorsInstalled) uninstallScriptInterceptors();
			debug.info("plugin", "Configuration updated.", { ...CONFIG });
			return { ...CONFIG };
		}
		const EASYLIST_QUALITY_RANK = {
			exact: 0,
			equivalent: 1,
			lossy: 2,
			unsupported: 3
		};
		const EASYLIST_PASSIVE_RESOURCE_OPTIONS = /* @__PURE__ */ new Set([
			"image",
			"media",
			"font",
			"stylesheet",
			"object",
			"subdocument",
			"document",
			"ping",
			"websocket"
		]);
		function mergeEasyListQuality(current, next) {
			return EASYLIST_QUALITY_RANK[next] > EASYLIST_QUALITY_RANK[current] ? next : current;
		}
		function easyListWarning(code, message, details = {}) {
			return {
				severity: details.severity || "warning",
				code,
				message,
				...details
			};
		}
		function escapeEasyListCssString(value) {
			return String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, "\\A ");
		}
		function escapeEasyListRegexSource(value) {
			return value.replace(/\//g, "\\/");
		}
		function serializeEasyListTextMatcher(matcher, ruleId) {
			if (typeof matcher === "string") return {
				value: `"${escapeEasyListCssString(matcher)}"`,
				quality: "equivalent",
				warnings: []
			};
			if (matcher instanceof RegExp) {
				const supportedFlags = matcher.flags.replace(/[gyd]/g, "");
				const warnings = [];
				let quality = "equivalent";
				if (supportedFlags !== matcher.flags) {
					quality = "lossy";
					warnings.push(easyListWarning("text-regexp-flags", `Stateful RegExp flags "${matcher.flags}" cannot be preserved in a cosmetic filter.`, { ruleId }));
				}
				return {
					value: `/${escapeEasyListRegexSource(matcher.source)}/${supportedFlags}`,
					quality,
					warnings
				};
			}
			return {
				value: null,
				quality: "unsupported",
				warnings: [easyListWarning("selector-function-text", "Function-based text matchers cannot be serialized to EasyList.", { ruleId })]
			};
		}
		function staticHostValues(matcher, ruleId) {
			if (matcher == null || matcher === "*") return {
				hosts: [],
				quality: "exact",
				warnings: []
			};
			if (typeof matcher === "string") {
				if (matcher === "*.*") return {
					hosts: [],
					quality: "lossy",
					warnings: [easyListWarning("host-star-dot-star", "\"*.*\" is treated as a global host during EasyList conversion.", { ruleId })]
				};
				return {
					hosts: [matcher.startsWith("*.") ? matcher.slice(2) : matcher],
					quality: matcher.startsWith("*.") ? "equivalent" : "exact",
					warnings: []
				};
			}
			if (Array.isArray(matcher)) {
				const hosts = [];
				const warnings = [];
				let quality = "exact";
				for (const entry of matcher) {
					const result = staticHostValues(entry, ruleId);
					quality = mergeEasyListQuality(quality, result.quality);
					warnings.push(...result.warnings);
					if (result.hosts == null) return {
						hosts: null,
						quality: "unsupported",
						warnings
					};
					for (const host of result.hosts) if (!hosts.includes(host)) hosts.push(host);
				}
				return {
					hosts,
					quality,
					warnings
				};
			}
			return {
				hosts: null,
				quality: "unsupported",
				warnings: [easyListWarning("dynamic-host-matcher", "RegExp/function host matchers cannot be represented as static EasyList domains.", { ruleId })]
			};
		}
		function applySelectorSuffix(selectors, suffix) {
			if (!selectors.length) return [suffix];
			const output = new Array(selectors.length);
			for (let index = 0; index < selectors.length; index += 1) output[index] = `${selectors[index]}${suffix}`;
			return output;
		}
		function applySelectorDescendant(selectors, selector, combinator = " ") {
			if (!selectors.length) return [selector];
			const output = new Array(selectors.length);
			for (let index = 0; index < selectors.length; index += 1) output[index] = selectors[index] ? `${selectors[index]}${combinator}${selector}` : selector;
			return output;
		}
		function selectorTargetToEasyList(target, options = {}, ruleId) {
			const targetMode = options.target || "ublock";
			if (typeof target === "string") return {
				selectors: [target],
				quality: "exact",
				warnings: []
			};
			if (Array.isArray(target)) {
				const selectors = [];
				const warnings = [];
				let quality = "exact";
				for (const entry of target) {
					const result = selectorTargetToEasyList(entry, options, ruleId);
					quality = mergeEasyListQuality(quality, result.quality);
					warnings.push(...result.warnings);
					selectors.push(...result.selectors);
				}
				return {
					selectors: Array.from(new Set(selectors)),
					quality,
					warnings
				};
			}
			if (!(target instanceof SelectQuery)) {
				if (target && typeof target === "object" && "selector" in target && typeof target.selector === "string") return {
					selectors: [target.selector],
					quality: "exact",
					warnings: []
				};
				if (target && typeof target === "object" && "xpath" in target && typeof target.xpath === "string") {
					if (targetMode === "ublock") return {
						selectors: [`:xpath(${target.xpath})`],
						quality: "equivalent",
						warnings: []
					};
					return {
						selectors: [],
						quality: "unsupported",
						warnings: [easyListWarning("xpath-easylist", "XPath selectors require the uBlock target.", { ruleId })]
					};
				}
				return {
					selectors: [],
					quality: "unsupported",
					warnings: [easyListWarning("dynamic-selector-target", "Function/custom selector targets cannot be serialized to EasyList.", { ruleId })]
				};
			}
			let selectors = [""];
			let quality = "exact";
			const warnings = [];
			const mark = (nextQuality, warning) => {
				quality = mergeEasyListQuality(quality, nextQuality);
				if (warning) warnings.push(warning);
			};
			for (const step of target.steps) {
				switch (step.type) {
					case SELECT_STEPS.CSS:
						selectors = applySelectorDescendant(selectors, String(step.selector || ""));
						break;
					case SELECT_STEPS.XPATH:
						if (targetMode !== "ublock") {
							mark("unsupported", easyListWarning("xpath-easylist", "XPath selectors require the uBlock target.", { ruleId }));
							selectors = [];
						} else {
							selectors = applySelectorSuffix(selectors, `:xpath(${String(step.expression || "")})`);
							mark("equivalent");
						}
						break;
					case SELECT_STEPS.TEXT: {
						if (targetMode !== "ublock") {
							mark("unsupported", easyListWarning("text-easylist", "Text matching requires procedural uBlock syntax.", { ruleId }));
							selectors = [];
							break;
						}
						const text = serializeEasyListTextMatcher(step.expected, ruleId);
						mark(text.quality);
						warnings.push(...text.warnings);
						if (!text.value) {
							selectors = [];
							break;
						}
						const sourceSelector = String(step.options?.selector || ":is(button,a,[role=\"button\"],label,summary,p,span,div)");
						selectors = applySelectorDescendant(selectors, sourceSelector);
						selectors = applySelectorSuffix(selectors, `:has-text(${text.value})`);
						mark("equivalent");
						break;
					}
					case SELECT_STEPS.ROLE: {
						const roleSelector = `[role="${escapeEasyListCssString(step.roleName)}"]`;
						selectors = selectors.map((selector) => selector ? `${selector}${roleSelector}` : roleSelector);
						const name = step.options?.name;
						if (name != null) {
							if (targetMode !== "ublock") {
								mark("unsupported", easyListWarning("role-name-easylist", "Accessible-name matching requires uBlock procedural syntax.", { ruleId }));
								selectors = [];
								break;
							}
							const text = serializeEasyListTextMatcher(name, ruleId);
							mark(mergeEasyListQuality(text.quality, "lossy"));
							warnings.push(...text.warnings);
							warnings.push(easyListWarning("role-name-semantics", "role({name}) also considers aria-label in Blocker; :has-text() only sees rendered text.", { ruleId }));
							if (!text.value) {
								selectors = [];
								break;
							}
							selectors = applySelectorSuffix(selectors, `:has-text(${text.value})`);
						}
						break;
					}
					case SELECT_STEPS.TEST_ID: {
						const attribute = String(step.attribute || "data-testid");
						const value = escapeEasyListCssString(step.value);
						selectors = applySelectorSuffix(selectors, `[${attribute}="${value}"]`);
						break;
					}
					case SELECT_STEPS.TAG: {
						const tag = String(step.tagName || "*").toLowerCase();
						selectors = selectors.map((selector) => selector ? `${selector}:is(${tag})` : tag);
						break;
					}
					case SELECT_STEPS.CUSTOM_SOURCE:
					case SELECT_STEPS.FILTER_CUSTOM:
						mark("unsupported", easyListWarning("custom-selector-code", "Custom selector callbacks cannot be exported.", { ruleId }));
						selectors = [];
						break;
					case SELECT_STEPS.WITHIN:
						mark("unsupported", easyListWarning("within-selector", "within() has runtime scoping semantics that cannot be safely flattened.", { ruleId }));
						selectors = [];
						break;
					case SELECT_STEPS.FILTER_TEXT: {
						if (targetMode !== "ublock") {
							mark("unsupported", easyListWarning("text-easylist", "hasText() requires the uBlock target.", { ruleId }));
							selectors = [];
							break;
						}
						const text = serializeEasyListTextMatcher(step.expected, ruleId);
						mark(text.quality);
						warnings.push(...text.warnings);
						if (!text.value) {
							selectors = [];
							break;
						}
						selectors = applySelectorSuffix(selectors, `:has-text(${text.value})`);
						break;
					}
					case SELECT_STEPS.FILTER_ATTRIBUTE: {
						const expected = step.expected;
						if (typeof expected === "function" || expected instanceof RegExp || Array.isArray(expected)) {
							mark("unsupported", easyListWarning("attribute-dynamic-match", `attribute("${String(step.name)}") uses a matcher that cannot be represented as CSS.`, { ruleId }));
							selectors = [];
							break;
						}
						if (expected == null) {
							mark("equivalent");
							break;
						}
						selectors = applySelectorSuffix(selectors, `[${String(step.name)}="${escapeEasyListCssString(expected)}"]`);
						break;
					}
					case SELECT_STEPS.FILTER_ATTRIBUTE_EXISTS:
						selectors = applySelectorSuffix(selectors, `[${String(step.name)}]`);
						break;
					case SELECT_STEPS.FILTER_PROPERTY:
						mark("unsupported", easyListWarning("property-selector", "JavaScript property filters cannot be exported to EasyList.", { ruleId }));
						selectors = [];
						break;
					case SELECT_STEPS.FILTER_VISIBLE:
						mark("lossy", easyListWarning("visible-selector", "visible() is omitted because cosmetic filters are persistent and do not share Blocker visibility timing semantics.", {
							ruleId,
							severity: "info"
						}));
						break;
					case SELECT_STEPS.FILTER_HIDDEN:
						mark("unsupported", easyListWarning("hidden-selector", "hidden() cannot be represented without broadening the match.", { ruleId }));
						selectors = [];
						break;
					case SELECT_STEPS.FILTER_ENABLED:
						selectors = applySelectorSuffix(selectors, ":not(:disabled):not([aria-disabled=\"true\"])");
						break;
					case SELECT_STEPS.FILTER_DISABLED:
						selectors = applySelectorSuffix(selectors, ":is(:disabled,[aria-disabled=\"true\"])");
						break;
					case SELECT_STEPS.FILTER_IN_VIEWPORT:
						mark("unsupported", easyListWarning("viewport-selector", "inViewport() is runtime geometry and has no EasyList equivalent.", { ruleId }));
						selectors = [];
						break;
					case SELECT_STEPS.FILTER_HAS: {
						const nested = selectorTargetToEasyList(step.target, options, ruleId);
						mark(nested.quality);
						warnings.push(...nested.warnings);
						if (!nested.selectors.length) {
							selectors = [];
							break;
						}
						selectors = applySelectorSuffix(selectors, `:has(${nested.selectors.join(",")})`);
						break;
					}
					case SELECT_STEPS.FILTER_NOT: {
						const nested = selectorTargetToEasyList(step.target, options, ruleId);
						mark(nested.quality);
						warnings.push(...nested.warnings);
						if (!nested.selectors.length) {
							selectors = [];
							break;
						}
						selectors = applySelectorSuffix(selectors, `:not(${nested.selectors.join(",")})`);
						break;
					}
					case SELECT_STEPS.CLOSEST:
						if (targetMode !== "ublock") {
							mark("unsupported", easyListWarning("closest-easylist", "closest() requires uBlock :upward().", { ruleId }));
							selectors = [];
						} else {
							selectors = applySelectorSuffix(selectors, `:upward(${String(step.selector)})`);
							mark("equivalent");
						}
						break;
					case SELECT_STEPS.PARENT:
						if (targetMode !== "ublock") {
							mark("unsupported", easyListWarning("parent-easylist", "parent() requires uBlock :upward().", { ruleId }));
							selectors = [];
						} else {
							const parentSelector = step.selector ? String(step.selector) : "1";
							selectors = applySelectorSuffix(selectors, `:upward(${parentSelector})`);
							mark("equivalent");
						}
						break;
					case SELECT_STEPS.CHILDREN:
						selectors = applySelectorDescendant(selectors, String(step.selector || "*"), " > ");
						break;
					case SELECT_STEPS.DESCENDANTS:
						selectors = applySelectorDescendant(selectors, String(step.selector || "*"));
						break;
					case SELECT_STEPS.NEXT:
						selectors = applySelectorDescendant(selectors, String(step.selector || "*"), " + ");
						break;
					case SELECT_STEPS.PREVIOUS:
						mark("unsupported", easyListWarning("previous-selector", "previous() cannot be represented as a forward CSS selection.", { ruleId }));
						selectors = [];
						break;
					case SELECT_STEPS.SHADOW:
						mark("unsupported", easyListWarning("shadow-selector", "Open Shadow DOM traversal is runtime-specific and is not exported.", { ruleId }));
						selectors = [];
						break;
					case SELECT_STEPS.UNIQUE: break;
					case SELECT_STEPS.FIRST:
					case SELECT_STEPS.LAST:
					case SELECT_STEPS.AT:
					case SELECT_STEPS.LIMIT:
						mark("unsupported", easyListWarning("positional-result-selector", `${step.type} operates on the result set, not CSS structural position, so it cannot be safely exported.`, { ruleId }));
						selectors = [];
						break;
					case SELECT_STEPS.FALLBACK: {
						const queries = Array.isArray(step.queries) ? step.queries : [];
						const fallbackSelectors = [];
						for (const fallbackQuery of queries) {
							const fallback = selectorTargetToEasyList(fallbackQuery, options, ruleId);
							warnings.push(...fallback.warnings);
							quality = mergeEasyListQuality(quality, fallback.quality);
							fallbackSelectors.push(...fallback.selectors);
						}
						if (fallbackSelectors.length) {
							selectors.push(...fallbackSelectors);
							selectors = Array.from(new Set(selectors.filter(Boolean)));
							mark("lossy", easyListWarning("fallback-selector", "fallback() priority cannot be represented statically; all serializable alternatives are emitted.", { ruleId }));
						}
						break;
					}
					default:
						mark("unsupported", easyListWarning("unknown-selector-step", `Unknown selector step "${String(step.type)}".`, { ruleId }));
						selectors = [];
				}
				if (!selectors.length && quality === "unsupported") break;
			}
			return {
				selectors: Array.from(new Set(selectors.filter(Boolean))),
				quality,
				warnings
			};
		}
		function cosmeticDomainPrefix(host, ruleId) {
			const result = staticHostValues(host, ruleId);
			if (result.hosts == null) return {
				prefix: null,
				quality: "unsupported",
				warnings: result.warnings
			};
			return {
				prefix: result.hosts.length ? result.hosts.join(",") : "",
				quality: result.quality,
				warnings: result.warnings
			};
		}
		function compileDomRuleToEasyList(rule, options, ruleId, ruleName) {
			const targetMode = options.target || "ublock";
			const removal = options.removal || "preserve";
			const host = cosmeticDomainPrefix(rule.host, ruleId);
			const filters = [];
			const warnings = [...host.warnings];
			let quality = host.quality;
			if (host.prefix == null) quality = "unsupported";
			if (rule.pathname != null || rule.match || rule.when || rule.before || rule.run || rule.after) {
				quality = mergeEasyListQuality(quality, "unsupported");
				warnings.push(easyListWarning("dom-runtime-conditions", "DOM rule pathname/match/when/hooks cannot be represented by cosmetic filters.", { ruleId }));
			}
			for (const action of rule.actions || []) {
				if (action.action !== ACTIONS.HIDE && action.action !== ACTIONS.REMOVE) {
					quality = mergeEasyListQuality(quality, "unsupported");
					warnings.push(easyListWarning("dom-action-unsupported", `DOM action "${action.action}" cannot be represented by EasyList.`, { ruleId }));
					continue;
				}
				for (const target of action.targets || []) {
					const compiled = selectorTargetToEasyList(target, options, ruleId);
					quality = mergeEasyListQuality(quality, compiled.quality);
					warnings.push(...compiled.warnings);
					for (const selector of compiled.selectors) {
						if (host.prefix == null) continue;
						let finalSelector = selector;
						if (action.action === ACTIONS.REMOVE) {
							if (targetMode === "ublock" && removal === "preserve") {
								finalSelector += ":remove()";
								quality = mergeEasyListQuality(quality, "equivalent");
							} else {
								quality = mergeEasyListQuality(quality, "lossy");
								warnings.push(easyListWarning("remove-becomes-hide", "remove() is exported as cosmetic hiding for this target/profile.", {
									ruleId,
									severity: "info"
								}));
							}
						}
						filters.push(`${host.prefix}##${finalSelector}`);
					}
				}
			}
			if (!filters.length && quality !== "unsupported") {
				quality = "unsupported";
				warnings.push(easyListWarning("dom-no-exportable-actions", "The DOM rule has no exportable cosmetic actions.", { ruleId }));
			}
			return {
				ruleId,
				ruleName,
				ruleType: RULE_TYPES.DOM,
				quality,
				filters: Array.from(new Set(filters)),
				warnings
			};
		}
		function regexpToEasyListNetworkPattern(expression, ruleId) {
			const warnings = [];
			let quality = "equivalent";
			if (expression.flags.replace(/[i]/g, "")) {
				quality = "lossy";
				warnings.push(easyListWarning("network-regexp-flags", `RegExp flags "${expression.flags}" are not fully representable in static network syntax.`, { ruleId }));
			}
			return {
				pattern: `/${escapeEasyListRegexSource(expression.source)}/`,
				quality,
				warnings
			};
		}
		function scalarNetworkValue(value, ruleId, label) {
			if (value == null) return {
				values: [],
				regexValues: [],
				quality: "exact",
				warnings: []
			};
			if (Array.isArray(value)) {
				const values = [];
				const regexValues = [];
				const warnings = [];
				let quality = "exact";
				for (const entry of value) {
					const nested = scalarNetworkValue(entry, ruleId, label);
					quality = mergeEasyListQuality(quality, nested.quality);
					warnings.push(...nested.warnings);
					if (nested.values == null) return {
						values: null,
						regexValues,
						quality: "unsupported",
						warnings
					};
					values.push(...nested.values);
					regexValues.push(...nested.regexValues);
				}
				return {
					values,
					regexValues,
					quality,
					warnings
				};
			}
			if (value instanceof RegExp) return {
				values: [],
				regexValues: [value],
				quality: "equivalent",
				warnings: []
			};
			if (typeof value === "function") return {
				values: null,
				regexValues: [],
				quality: "unsupported",
				warnings: [easyListWarning("network-dynamic-match", `Function matcher for ${label} cannot be exported.`, { ruleId })]
			};
			return {
				values: [String(value)],
				regexValues: [],
				quality: "exact",
				warnings: []
			};
		}
		function appendNetworkOptions(filter, options) {
			const clean = options.filter(Boolean);
			if (!clean.length) return filter;
			return `${filter}$${clean.join(",")}`;
		}
		function fetchMatchToEasyListPatterns(match, targetMode, ruleId) {
			if (match == null) return {
				patterns: ["*"],
				options: [],
				quality: "lossy",
				warnings: [easyListWarning("network-match-all", "A match-all fetch rule is exported as a global network filter.", {
					ruleId,
					severity: "info"
				})]
			};
			if (typeof match === "string") return {
				patterns: [match],
				options: [],
				quality: "equivalent",
				warnings: []
			};
			if (match instanceof RegExp) {
				const converted = regexpToEasyListNetworkPattern(match, ruleId);
				return {
					patterns: [converted.pattern],
					options: [],
					quality: converted.quality,
					warnings: converted.warnings
				};
			}
			if (typeof match === "function") return {
				patterns: [],
				options: [],
				quality: "unsupported",
				warnings: [easyListWarning("fetch-function-match", "Function fetch matchers cannot be exported.", { ruleId })]
			};
			if (Array.isArray(match)) {
				const patterns = [];
				const warnings = [];
				let quality = "exact";
				let commonOptions = null;
				for (const entry of match) {
					const nested = fetchMatchToEasyListPatterns(entry, targetMode, ruleId);
					patterns.push(...nested.patterns);
					warnings.push(...nested.warnings);
					quality = mergeEasyListQuality(quality, nested.quality);
					const normalizedOptions = [...nested.options].sort();
					if (commonOptions == null) commonOptions = normalizedOptions;
					else if (normalizedOptions.length !== commonOptions.length || normalizedOptions.some((option, index) => option !== commonOptions[index])) {
						warnings.push(easyListWarning("fetch-array-option-mismatch", "OR-ed fetch match alternatives require different static filter options and cannot be safely merged.", { ruleId }));
						return {
							patterns: [],
							options: [],
							quality: "unsupported",
							warnings
						};
					}
				}
				return {
					patterns: Array.from(new Set(patterns)),
					options: commonOptions || [],
					quality,
					warnings
				};
			}
			const objectMatch = match;
			const warnings = [];
			let quality = "exact";
			if (objectMatch.test) {
				quality = "unsupported";
				warnings.push(easyListWarning("fetch-test-callback", "Fetch match.test() cannot be serialized.", { ruleId }));
			}
			const hosts = staticHostValues(objectMatch.hostname, ruleId);
			warnings.push(...hosts.warnings);
			quality = mergeEasyListQuality(quality, hosts.quality);
			if (hosts.hosts == null) return {
				patterns: [],
				options: [],
				quality: "unsupported",
				warnings
			};
			const hostValues = scalarNetworkValue(objectMatch.host, ruleId, "host");
			const paths = scalarNetworkValue(objectMatch.pathname, ruleId, "pathname");
			const searches = scalarNetworkValue(objectMatch.search, ruleId, "search");
			const methods = scalarNetworkValue(objectMatch.method, ruleId, "method");
			for (const result of [
				hostValues,
				paths,
				searches,
				methods
			]) {
				warnings.push(...result.warnings);
				quality = mergeEasyListQuality(quality, result.quality);
			}
			if (hostValues.values == null || paths.values == null || searches.values == null || methods.values == null) return {
				patterns: [],
				options: [],
				quality: "unsupported",
				warnings
			};
			if (hostValues.regexValues.length || paths.regexValues.length || searches.regexValues.length) {
				quality = mergeEasyListQuality(quality, "unsupported");
				warnings.push(easyListWarning("network-field-regexp", "RegExp host/path/search fields combined inside an object matcher are not exported automatically.", { ruleId }));
				return {
					patterns: [],
					options: [],
					quality,
					warnings
				};
			}
			const domains = hosts.hosts.length ? hosts.hosts : hostValues.values.length ? hostValues.values : [""];
			const pathValues = paths.values.length ? paths.values : [""];
			const searchValues = searches.values.length ? searches.values : [""];
			const patterns = [];
			for (const domain of domains) for (const pathname of pathValues) for (const search of searchValues) if (domain) {
				let pattern = `||${domain}`;
				if (pathname) pattern += pathname.startsWith("/") ? pathname : `/${pathname}`;
				else pattern += "^";
				if (search) pattern += search.startsWith("?") ? search : `?${search}`;
				patterns.push(pattern);
			} else if (pathname || search) {
				patterns.push(`${pathname}${search}`);
				quality = mergeEasyListQuality(quality, "lossy");
			} else {
				patterns.push("*");
				quality = mergeEasyListQuality(quality, "lossy");
			}
			if (paths.values.length || searches.values.length) {
				quality = mergeEasyListQuality(quality, "lossy");
				warnings.push(easyListWarning("network-path-exactness", "Blocker object pathname/search fields use exact matching; EasyList URL patterns are generally substring/prefix based.", {
					ruleId,
					severity: "info"
				}));
			}
			const optionList = [];
			if (methods.values.length) {
				if (targetMode === "ublock") for (const method of methods.values) optionList.push(`method=${method.toLowerCase()}`);
				else {
					quality = mergeEasyListQuality(quality, "lossy");
					warnings.push(easyListWarning("method-easylist", "HTTP method constraints are omitted for the EasyList target.", { ruleId }));
				}
			}
			return {
				patterns: Array.from(new Set(patterns)),
				options: optionList,
				quality,
				warnings
			};
		}
		function compileFetchRuleToEasyList(rule, options, ruleId, ruleName) {
			const targetMode = options.target || "ublock";
			const match = fetchMatchToEasyListPatterns(rule.match, targetMode, ruleId);
			const warnings = [...match.warnings];
			let quality = match.quality;
			if (rule.action !== FETCH_ACTIONS.BLOCK && rule.action !== FETCH_ACTIONS.ALLOW && rule.action != null) {
				quality = "unsupported";
				warnings.push(easyListWarning("fetch-action-unsupported", `Fetch action "${rule.action}" cannot be represented by a static filter.`, { ruleId }));
			}
			const allow = rule.action === FETCH_ACTIONS.ALLOW;
			const filters = match.patterns.map((pattern) => `${allow ? "@@" : ""}${appendNetworkOptions(pattern, match.options)}`);
			return {
				ruleId,
				ruleName,
				ruleType: RULE_TYPES.FETCH,
				quality,
				filters: quality === "unsupported" ? [] : filters,
				warnings
			};
		}
		function scriptKindOptions(matcher, targetMode, ruleId) {
			if (matcher == null) return {
				groups: [["script"]],
				quality: "lossy",
				warnings: [easyListWarning("script-kind-unspecified", "A script rule without kind is narrowed to network script resources during export.", {
					ruleId,
					severity: "info"
				})]
			};
			const values = Array.isArray(matcher) ? matcher : [matcher];
			const groups = [];
			const warnings = [];
			let quality = "exact";
			for (const entry of values) {
				if (typeof entry === "function" || entry instanceof RegExp || Array.isArray(entry)) {
					quality = "unsupported";
					warnings.push(easyListWarning("script-kind-dynamic", "Dynamic/RegExp script kind matchers cannot be exported.", { ruleId }));
					continue;
				}
				switch (entry) {
					case SCRIPT_KINDS.ELEMENT:
					case SCRIPT_KINDS.PRELOAD:
					case SCRIPT_KINDS.MODULE_PRELOAD:
						groups.push(["script"]);
						break;
					case SCRIPT_KINDS.XHR:
						groups.push([targetMode === "ublock" ? "xhr" : "xmlhttprequest"]);
						break;
					case SCRIPT_KINDS.WORKER:
					case SCRIPT_KINDS.SHARED_WORKER:
					case SCRIPT_KINDS.SERVICE_WORKER:
						if (targetMode === "ublock") {
							groups.push(["worker"]);
							quality = mergeEasyListQuality(quality, "equivalent");
						} else {
							groups.push(["script"]);
							quality = mergeEasyListQuality(quality, "lossy");
							warnings.push(easyListWarning("worker-easylist", "Worker kinds are approximated as script for the EasyList target.", { ruleId }));
						}
						break;
					default:
						quality = "unsupported";
						warnings.push(easyListWarning("dynamic-code-script-kind", `Script kind "${String(entry)}" is runtime-only and has no static network equivalent.`, { ruleId }));
				}
			}
			return {
				groups: groups.length ? groups : [],
				quality,
				warnings
			};
		}
		function scriptMatchToEasyListPatterns(match, rule, targetMode, ruleId) {
			const warnings = [];
			let quality = "exact";
			const kinds = scriptKindOptions(rule.kind ?? (match && typeof match === "object" && !Array.isArray(match) && !(match instanceof RegExp) ? match.kind : void 0), targetMode, ruleId);
			warnings.push(...kinds.warnings);
			quality = mergeEasyListQuality(quality, kinds.quality);
			const pageHosts = staticHostValues(rule.host, ruleId);
			warnings.push(...pageHosts.warnings);
			quality = mergeEasyListQuality(quality, pageHosts.quality);
			if (pageHosts.hosts == null) return {
				patterns: [],
				optionGroups: [],
				domainOptions: [],
				quality: "unsupported",
				warnings
			};
			const domainOptions = pageHosts.hosts.length ? [`domain=${pageHosts.hosts.join("|")}`] : [];
			if (match == null) return {
				patterns: ["*"],
				optionGroups: kinds.groups,
				domainOptions,
				quality: mergeEasyListQuality(quality, "lossy"),
				warnings
			};
			if (typeof match === "string") return {
				patterns: [match],
				optionGroups: kinds.groups,
				domainOptions,
				quality,
				warnings
			};
			if (match instanceof RegExp) {
				const converted = regexpToEasyListNetworkPattern(match, ruleId);
				warnings.push(...converted.warnings);
				quality = mergeEasyListQuality(quality, converted.quality);
				return {
					patterns: [converted.pattern],
					optionGroups: kinds.groups,
					domainOptions,
					quality,
					warnings
				};
			}
			if (typeof match === "function" || Array.isArray(match)) {
				quality = "unsupported";
				warnings.push(easyListWarning("script-complex-match", "Function/array top-level script matches are not exported automatically.", { ruleId }));
				return {
					patterns: [],
					optionGroups: [],
					domainOptions,
					quality,
					warnings
				};
			}
			const objectMatch = match;
			if (objectMatch.inline != null || objectMatch.code != null || objectMatch.type != null || objectMatch.test) {
				quality = "unsupported";
				warnings.push(easyListWarning("script-runtime-match-fields", "inline/code/type/test script match fields require runtime inspection and cannot be exported.", { ruleId }));
			}
			const host = staticHostValues(objectMatch.hostname, ruleId);
			warnings.push(...host.warnings);
			quality = mergeEasyListQuality(quality, host.quality);
			if (host.hosts == null) return {
				patterns: [],
				optionGroups: [],
				domainOptions,
				quality: "unsupported",
				warnings
			};
			const src = scalarNetworkValue(objectMatch.src ?? objectMatch.url, ruleId, "script src/url");
			const paths = scalarNetworkValue(objectMatch.pathname, ruleId, "script pathname");
			const methods = scalarNetworkValue(objectMatch.method, ruleId, "script method");
			for (const result of [
				src,
				paths,
				methods
			]) {
				warnings.push(...result.warnings);
				quality = mergeEasyListQuality(quality, result.quality);
			}
			if (src.values == null || paths.values == null || methods.values == null) return {
				patterns: [],
				optionGroups: [],
				domainOptions,
				quality: "unsupported",
				warnings
			};
			if (src.regexValues.length) {
				if (host.hosts.length || paths.values.length) {
					quality = "unsupported";
					warnings.push(easyListWarning("script-combined-regexp", "RegExp src/url combined with hostname/path fields is not exported automatically.", { ruleId }));
					return {
						patterns: [],
						optionGroups: [],
						domainOptions,
						quality,
						warnings
					};
				}
				const patterns = [];
				for (const expression of src.regexValues) {
					const converted = regexpToEasyListNetworkPattern(expression, ruleId);
					patterns.push(converted.pattern);
					warnings.push(...converted.warnings);
					quality = mergeEasyListQuality(quality, converted.quality);
				}
				return {
					patterns,
					optionGroups: kinds.groups,
					domainOptions,
					quality,
					warnings
				};
			}
			const domains = host.hosts.length ? host.hosts : [""];
			const urls = src.values.length ? src.values : [""];
			const pathValues = paths.values.length ? paths.values : [""];
			const patterns = [];
			for (const domain of domains) for (const url of urls) for (const pathname of pathValues) if (url) patterns.push(url);
			else if (domain) {
				let pattern = `||${domain}`;
				if (pathname) pattern += pathname.startsWith("/") ? pathname : `/${pathname}`;
				else pattern += "^";
				patterns.push(pattern);
			} else if (pathname) {
				patterns.push(pathname);
				quality = mergeEasyListQuality(quality, "lossy");
			} else {
				patterns.push("*");
				quality = mergeEasyListQuality(quality, "lossy");
			}
			if (methods.values.length) {
				if (targetMode === "ublock") for (const group of kinds.groups) for (const method of methods.values) group.push(`method=${method.toLowerCase()}`);
				else {
					quality = mergeEasyListQuality(quality, "lossy");
					warnings.push(easyListWarning("script-method-easylist", "Script method constraints are omitted for the EasyList target.", { ruleId }));
				}
			}
			return {
				patterns: Array.from(new Set(patterns)),
				optionGroups: kinds.groups,
				domainOptions,
				quality,
				warnings
			};
		}
		function compileScriptRuleToEasyList(rule, options, ruleId, ruleName) {
			const targetMode = options.target || "ublock";
			const compiled = scriptMatchToEasyListPatterns(rule.match, rule, targetMode, ruleId);
			const warnings = [...compiled.warnings];
			let quality = compiled.quality;
			if (rule.action !== SCRIPT_ACTIONS.BLOCK && rule.action !== SCRIPT_ACTIONS.ALLOW && rule.action != null) {
				quality = "unsupported";
				warnings.push(easyListWarning("script-action-unsupported", `Script action "${rule.action}" cannot be represented by static filter syntax.`, { ruleId }));
			}
			const allow = rule.action === SCRIPT_ACTIONS.ALLOW;
			const filters = [];
			if (quality !== "unsupported") for (const pattern of compiled.patterns) {
				const groups = compiled.optionGroups.length ? compiled.optionGroups : [[]];
				for (const optionGroup of groups) filters.push(`${allow ? "@@" : ""}${appendNetworkOptions(pattern, [...optionGroup, ...compiled.domainOptions])}`);
			}
			return {
				ruleId,
				ruleName,
				ruleType: RULE_TYPES.SCRIPT,
				quality,
				filters: Array.from(new Set(filters)),
				warnings
			};
		}
		function compileRuleToEasyList(rule, options = {}) {
			const type = rule.type || RULE_TYPES.DOM;
			const ruleId = rule.id || "unregistered-rule";
			const ruleName = rule.name || ruleId;
			if (type === RULE_TYPES.FETCH) return compileFetchRuleToEasyList(rule, options, ruleId, ruleName);
			if (type === RULE_TYPES.SCRIPT) return compileScriptRuleToEasyList(rule, options, ruleId, ruleName);
			return compileDomRuleToEasyList(rule, options, ruleId, ruleName);
		}
		function exportEasyList(options = {}) {
			const targetMode = options.target || "ublock";
			const unsupportedMode = options.unsupported || "comment";
			const sourceRules = options.rules ? [...options.rules] : getRules({ enabled: options.includeDisabled ? void 0 : true });
			const conversions = [];
			const warnings = [];
			const output = [];
			if (options.comments !== false) output.push(`! ${options.title || `${SCRIPT.name} ${SCRIPT.version}`}`, `! Generated by Blocker.easyList.export()`, `! Target: ${targetMode}`, `! Generated: ${(/* @__PURE__ */ new Date()).toISOString()}`, "");
			const stats = {
				rules: sourceRules.length,
				filters: 0,
				exact: 0,
				equivalent: 0,
				lossy: 0,
				unsupported: 0
			};
			for (const rule of sourceRules) {
				const conversion = compileRuleToEasyList(rule, {
					target: targetMode,
					unsupported: unsupportedMode,
					removal: options.removal || "preserve"
				});
				conversions.push(conversion);
				warnings.push(...conversion.warnings);
				stats[conversion.quality] += 1;
				if (conversion.quality === "unsupported" || !conversion.filters.length) {
					if (unsupportedMode === "throw") throw new TypeError(`Rule "${conversion.ruleId}" cannot be exported to ${targetMode}.`);
					if (unsupportedMode === "comment" && options.comments !== false) output.push(`! BLOCKER-UNSUPPORTED [${conversion.ruleId}] ${conversion.ruleName}`, ...conversion.warnings.map((warning) => `!   ${warning.code}: ${warning.message}`), "");
					continue;
				}
				if (options.comments !== false) output.push(`! [${conversion.quality.toUpperCase()}] ${conversion.ruleId} · ${conversion.ruleName}`);
				output.push(...conversion.filters, "");
				stats.filters += conversion.filters.length;
			}
			while (output.length && output[output.length - 1] === "") output.pop();
			return {
				target: targetMode,
				text: output.join("\n"),
				conversions,
				warnings,
				stats
			};
		}
		function hashEasyListLine(value) {
			let hash = 2166136261;
			for (let index = 0; index < value.length; index += 1) {
				hash ^= value.charCodeAt(index);
				hash = Math.imul(hash, 16777619);
			}
			return (hash >>> 0).toString(36);
		}
		function splitEasyListOptions(line) {
			let escaped = false;
			let regex = false;
			for (let index = 0; index < line.length; index += 1) {
				const character = line[index];
				if (escaped) {
					escaped = false;
					continue;
				}
				if (character === "\\") {
					escaped = true;
					continue;
				}
				if (character === "/" && index === 0) {
					regex = true;
					continue;
				}
				if (regex && character === "/" && index > 0) {
					regex = false;
					continue;
				}
				if (!regex && character === "$") return {
					pattern: line.slice(0, index),
					options: line.slice(index + 1).split(",").map((entry) => entry.trim()).filter(Boolean)
				};
			}
			return {
				pattern: line,
				options: []
			};
		}
		function easyListPatternToRegExp(pattern) {
			if (pattern.startsWith("/") && pattern.lastIndexOf("/") > 0) {
				const end = pattern.lastIndexOf("/");
				const source = pattern.slice(1, end);
				return new RegExp(source, "i");
			}
			let source = "";
			let index = 0;
			let anchorStart = false;
			let anchorEnd = false;
			if (pattern.startsWith("||")) {
				source += "^(?:[^:/?#]+:)?(?://)?(?:[^/?#]*\\.)?";
				index = 2;
			} else if (pattern.startsWith("|")) {
				source += "^";
				index = 1;
				anchorStart = true;
			}
			let endIndex = pattern.length;
			if (endIndex > index && pattern.endsWith("|") && !pattern.endsWith("\\|")) {
				anchorEnd = true;
				endIndex -= 1;
			}
			for (; index < endIndex; index += 1) {
				const character = pattern[index];
				if (character === "*") source += ".*";
				else if (character === "^") source += "(?:[^A-Za-z0-9_.%-]|$)";
				else source += character.replace(/[.*+?${}()|[\]\\]/g, "\\$&");
			}
			if (anchorEnd) source += "$";
			if (!anchorStart && !source.startsWith("^")) source = source || ".*";
			return new RegExp(source, "i");
		}
		function parseEasyListMatcher(value) {
			const trimmed = value.trim();
			if (trimmed.startsWith("/") && trimmed.lastIndexOf("/") > 0) {
				const end = trimmed.lastIndexOf("/");
				const source = trimmed.slice(1, end);
				const flags = trimmed.slice(end + 1).replace(/[^imsu]/g, "");
				try {
					return new RegExp(source, flags);
				} catch {
					return source;
				}
			}
			if (trimmed.startsWith("\"") && trimmed.endsWith("\"") || trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1).replace(/\\(["'\\])/g, "$1");
			return trimmed;
		}
		function findClosingPseudoParen(selector, openIndex) {
			let depth = 1;
			let quote = "";
			let regex = false;
			let escaped = false;
			for (let index = openIndex + 1; index < selector.length; index += 1) {
				const character = selector[index];
				if (escaped) {
					escaped = false;
					continue;
				}
				if (character === "\\") {
					escaped = true;
					continue;
				}
				if (quote) {
					if (character === quote) quote = "";
					continue;
				}
				if (character === "\"" || character === "'") {
					quote = character;
					continue;
				}
				if (character === "/" && selector[index - 1] !== "\\") {
					regex = !regex;
					continue;
				}
				if (regex) continue;
				if (character === "(") depth += 1;
				else if (character === ")") {
					depth -= 1;
					if (depth === 0) return index;
				}
			}
			return -1;
		}
		function parseProceduralCosmeticSelector(rawSelector, line, warnings) {
			let selector = rawSelector.trim();
			let remove = false;
			if (selector.endsWith(":remove()")) {
				remove = true;
				selector = selector.slice(0, -9);
			}
			const tokenExpression = /:(has-text|upward|xpath)\(/g;
			tokenExpression.lastIndex = 0;
			const first = tokenExpression.exec(selector);
			if (!first) return {
				query: selector,
				remove
			};
			let query = select(first.index > 0 ? selector.slice(0, first.index) : void 0);
			let cursor = first.index;
			tokenExpression.lastIndex = first.index;
			while (cursor < selector.length) {
				tokenExpression.lastIndex = cursor;
				const match = tokenExpression.exec(selector);
				if (!match || match.index !== cursor) {
					const trailing = selector.slice(cursor).trim();
					if (trailing) {
						warnings.push(easyListWarning("cosmetic-procedural-trailing", `Unsupported trailing selector syntax "${trailing}".`, {
							line,
							source: rawSelector
						}));
						return {
							query: null,
							remove
						};
					}
					break;
				}
				const openIndex = match.index + match[0].length - 1;
				const closeIndex = findClosingPseudoParen(selector, openIndex);
				if (closeIndex < 0) {
					warnings.push(easyListWarning("cosmetic-unclosed-pseudo", `Unclosed :${match[1]}() pseudo.`, {
						line,
						source: rawSelector
					}));
					return {
						query: null,
						remove
					};
				}
				const argument = selector.slice(openIndex + 1, closeIndex).trim();
				if (match[1] === "has-text") query = query.hasText(parseEasyListMatcher(argument));
				else if (match[1] === "upward") {
					if (/^\d+$/.test(argument)) {
						const amount = Number(argument);
						if (amount !== 1) warnings.push(easyListWarning("upward-distance", `:upward(${amount}) is approximated by ${amount} parent() steps.`, {
							line,
							source: rawSelector,
							severity: "info"
						}));
						for (let step = 0; step < Math.max(0, amount); step += 1) query = query.parent();
					} else query = query.closest(argument);
				} else if (match[1] === "xpath") query = query.xpath(argument);
				cursor = closeIndex + 1;
			}
			return {
				query,
				remove
			};
		}
		function parseEasyListDomains(raw, line, warnings) {
			if (!raw) return void 0;
			const hosts = [];
			for (const entry of raw.split(",")) {
				const host = entry.trim();
				if (!host) continue;
				if (host.startsWith("~")) {
					warnings.push(easyListWarning("negative-cosmetic-domain", `Excluded cosmetic domain "${host}" is not representable by a Blocker host matcher.`, {
						line,
						source: raw
					}));
					continue;
				}
				hosts.push(host);
			}
			if (!hosts.length) return void 0;
			return hosts.length === 1 ? hosts[0] : hosts;
		}
		function parseCosmeticEasyListLine(lineText, lineNumber, options, warnings) {
			if (lineText.indexOf("#@#") >= 0) {
				warnings.push(easyListWarning("cosmetic-exception", "Cosmetic exception filters (#@#) are not representable because Blocker has no cosmetic allow-rule layer.", {
					line: lineNumber,
					source: lineText
				}));
				return null;
			}
			let separator = "##";
			let index = lineText.indexOf(separator);
			if (index < 0) {
				separator = "#?#";
				index = lineText.indexOf(separator);
			}
			if (index < 0) return null;
			const rawDomains = lineText.slice(0, index);
			const parsed = parseProceduralCosmeticSelector(lineText.slice(index + separator.length), lineNumber, warnings);
			if (!parsed.query) return null;
			const host = parseEasyListDomains(rawDomains, lineNumber, warnings);
			const actionMode = options.cosmeticAction || "preserve";
			const shouldRemove = actionMode === "remove" || actionMode === "preserve" && parsed.remove;
			return [{
				id: `${options.idPrefix || "easylist"}-cosmetic-${lineNumber}-${hashEasyListLine(lineText)}`,
				name: `Imported cosmetic filter ${lineNumber}`,
				type: RULE_TYPES.DOM,
				host,
				actions: [shouldRemove ? remove(parsed.query) : hide(parsed.query)]
			}];
		}
		function parseNetworkDomainOption(option) {
			const value = option.slice(7);
			const include = [];
			const exclude = [];
			for (const part of value.split("|")) {
				const domain = part.trim();
				if (!domain) continue;
				if (domain.startsWith("~")) exclude.push(domain.slice(1));
				else include.push(domain);
			}
			return {
				include,
				exclude
			};
		}
		function pageHostAllowed(hostname, include, exclude) {
			const matches = (domain) => hostname === domain || hostname.endsWith(`.${domain}`);
			for (const domain of exclude) if (matches(domain)) return false;
			if (!include.length) return true;
			for (const domain of include) if (matches(domain)) return true;
			return false;
		}
		function parseNetworkEasyListLine(lineText, lineNumber, options, warnings) {
			const allow = lineText.startsWith("@@");
			const split = splitEasyListOptions(allow ? lineText.slice(2) : lineText);
			const pattern = split.pattern.trim();
			if (!pattern) return null;
			let matcher;
			try {
				matcher = easyListPatternToRegExp(pattern);
			} catch (error) {
				warnings.push(easyListWarning("network-pattern-invalid", `Could not parse network pattern: ${error instanceof Error ? error.message : String(error)}`, {
					line: lineNumber,
					source: lineText
				}));
				return null;
			}
			const optionSet = new Set(split.options.map((entry) => entry.toLowerCase()));
			const idPrefix = options.idPrefix || "easylist";
			const domainOption = split.options.find((entry) => entry.toLowerCase().startsWith("domain="));
			const pageDomains = domainOption ? parseNetworkDomainOption(domainOption) : {
				include: [],
				exclude: []
			};
			const methodOption = split.options.find((entry) => entry.toLowerCase().startsWith("method="));
			const method = methodOption ? methodOption.slice(7).toUpperCase() : "";
			for (const option of optionSet) {
				const base = option.startsWith("~") ? option.slice(1) : option;
				if (option.startsWith("~") && (base === "script" || base === "xhr" || base === "xmlhttprequest" || base === "worker" || EASYLIST_PASSIVE_RESOURCE_OPTIONS.has(base))) {
					warnings.push(easyListWarning("negative-resource-option", `Negated resource option "${option}" cannot be safely reproduced by Blocker's interceptor surfaces.`, {
						line: lineNumber,
						source: lineText
					}));
					return null;
				}
				if (base.startsWith("redirect=") || base.startsWith("redirect-rule=") || base.startsWith("removeparam=") || base === "badfilter") {
					warnings.push(easyListWarning("behavioral-network-option", `Behavioral option "${option}" changes filter semantics and is not imported as a plain block/allow rule.`, {
						line: lineNumber,
						source: lineText
					}));
					return null;
				}
				if (EASYLIST_PASSIVE_RESOURCE_OPTIONS.has(base) || base === "third-party" || base === "1p" || base === "3p" || base === "important") warnings.push(easyListWarning("network-option-partial", `Network option "${option}" is not fully reproduced by the browser runtime.`, {
					line: lineNumber,
					source: lineText,
					severity: "info"
				}));
			}
			const script = optionSet.has("script");
			const xhr = optionSet.has("xhr") || optionSet.has("xmlhttprequest");
			const worker = optionSet.has("worker");
			if (Array.from(optionSet).some((entry) => EASYLIST_PASSIVE_RESOURCE_OPTIONS.has(entry.replace(/^~/, ""))) && !script && !xhr && !worker) {
				warnings.push(easyListWarning("passive-resource-not-intercepted", "This filter targets a passive browser subresource that Blocker does not currently intercept.", {
					line: lineNumber,
					source: lineText
				}));
				return null;
			}
			const testPage = (hostname) => pageHostAllowed(hostname, pageDomains.include, pageDomains.exclude);
			const testUrl = (url) => {
				matcher.lastIndex = 0;
				return matcher.test(url);
			};
			const rules = [];
			const baseId = `${idPrefix}-network-${lineNumber}-${hashEasyListLine(lineText)}`;
			const createFetchRule = (suffix) => ({
				id: `${baseId}-${suffix}`,
				name: `Imported network filter ${lineNumber}`,
				type: RULE_TYPES.FETCH,
				action: allow ? FETCH_ACTIONS.ALLOW : FETCH_ACTIONS.BLOCK,
				match: (context) => testPage(context.page.hostname) && (!method || context.method === method) && testUrl(context.href)
			});
			const createScriptRule = (suffix, kinds) => ({
				id: `${baseId}-${suffix}`,
				name: `Imported executable-resource filter ${lineNumber}`,
				type: RULE_TYPES.SCRIPT,
				host: pageDomains.include.length ? pageDomains.include.length === 1 ? pageDomains.include[0] : pageDomains.include : void 0,
				kind: kinds,
				action: allow ? SCRIPT_ACTIONS.ALLOW : SCRIPT_ACTIONS.BLOCK,
				match: (context) => testPage(context.page.hostname) && (!method || !context.method || context.method === method) && testUrl(context.url)
			});
			if (script) {
				rules.push(createScriptRule("script", [
					SCRIPT_KINDS.ELEMENT,
					SCRIPT_KINDS.PRELOAD,
					SCRIPT_KINDS.MODULE_PRELOAD
				]));
				return rules;
			}
			if (xhr) {
				rules.push(createFetchRule("fetch"), createScriptRule("xhr", [SCRIPT_KINDS.XHR]));
				return rules;
			}
			if (worker) {
				rules.push(createScriptRule("worker", [
					SCRIPT_KINDS.WORKER,
					SCRIPT_KINDS.SHARED_WORKER,
					SCRIPT_KINDS.SERVICE_WORKER
				]));
				return rules;
			}
			rules.push(createFetchRule("fetch"), createScriptRule("executable", [
				SCRIPT_KINDS.ELEMENT,
				SCRIPT_KINDS.PRELOAD,
				SCRIPT_KINDS.MODULE_PRELOAD,
				SCRIPT_KINDS.XHR,
				SCRIPT_KINDS.WORKER,
				SCRIPT_KINDS.SHARED_WORKER,
				SCRIPT_KINDS.SERVICE_WORKER
			]));
			warnings.push(easyListWarning("generic-network-runtime-scope", "Generic imported network filter covers fetch/XHR/executable resources, not every passive browser request.", {
				line: lineNumber,
				source: lineText,
				severity: "info"
			}));
			return rules;
		}
		function parseEasyList(text, options = {}) {
			const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
			const rules = [];
			const warnings = [];
			const unsupportedLines = [];
			const stats = {
				lines: lines.length,
				parsed: 0,
				rules: 0,
				cosmetic: 0,
				network: 0,
				ignored: 0,
				unsupported: 0
			};
			for (let index = 0; index < lines.length; index += 1) {
				const lineNumber = index + 1;
				const lineText = lines[index].trim();
				if (!lineText || lineText.startsWith("!") || lineText.startsWith("[")) {
					stats.ignored += 1;
					continue;
				}
				const warningStart = warnings.length;
				let parsedRules = null;
				let kind = "network";
				if (lineText.includes("##") || lineText.includes("#@#") || lineText.includes("#?#")) {
					kind = "cosmetic";
					parsedRules = parseCosmeticEasyListLine(lineText, lineNumber, options, warnings);
				} else parsedRules = parseNetworkEasyListLine(lineText, lineNumber, options, warnings);
				if (!parsedRules?.length) {
					const reason = warnings.slice(warningStart).map((warning) => warning.message).join(" ") || "Unsupported or unrecognized filter.";
					unsupportedLines.push({
						line: lineNumber,
						text: lineText,
						reason
					});
					stats.unsupported += 1;
					continue;
				}
				rules.push(...parsedRules);
				stats.parsed += 1;
				stats.rules += parsedRules.length;
				stats[kind] += 1;
			}
			return {
				rules,
				registeredRules: options.register ? addRules(rules, {
					replace: options.replace,
					run: options.run
				}) : [],
				warnings,
				unsupportedLines,
				stats
			};
		}
		function validateEasyList(text, options = {}) {
			const result = parseEasyList(text, {
				...options,
				register: false
			});
			return {
				valid: result.unsupportedLines.length === 0,
				warnings: result.warnings,
				unsupportedLines: result.unsupportedLines,
				stats: result.stats
			};
		}
		const easyList = Object.freeze({
			export: exportEasyList,
			parse: parseEasyList,
			import(text, options = {}) {
				return parseEasyList(text, {
					...options,
					register: options.register ?? true
				});
			},
			compileRule: compileRuleToEasyList,
			compileSelector: selectorTargetToEasyList,
			validate: validateEasyList
		});
		function processQueue() {
			const queue = globalWindow.BlockerQueue;
			if (!Array.isArray(queue)) return;
			const entries = queue.splice(0);
			for (const entry of entries) try {
				if (typeof entry === "function") entry(PUBLIC_API);
				else if (Array.isArray(entry)) addRules(entry);
				else addRule(entry);
			} catch (error) {
				debug.error("plugin", "Queued plugin registration failed.", error);
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
			uninstallScriptInterceptors,
			debug,
			easyList,
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
			}
		};
		Object.defineProperty(globalWindow, SCRIPT.globalName, {
			configurable: true,
			enumerable: false,
			writable: false,
			value: PUBLIC_API
		});
		globalWindow.BlockerQueue ||= [];
		function initialize() {
			if (INTERNAL.initialized) return;
			const startedAt = performance.now();
			INTERNAL.initialized = true;
			installStyles();
			installFetchInterceptor();
			installScriptInterceptors();
			installShadowHook();
			installNavigationHooks();
			if (document.documentElement) observeRoot(document.documentElement);
			if (CONFIG.processExistingShadowRoots) discoverShadowRoots(document);
			processQueue();
			runDomRules({ reason: "initial" });
			debug.success("plugin", `${SCRIPT.name} v${SCRIPT.version} ready in ${duration(startedAt)}.`);
			dispatchBlockerEvent("ready", {
				version: SCRIPT.version,
				api: PUBLIC_API
			});
		}
		if (document.documentElement) initialize();
		else document.addEventListener("readystatechange", initialize, { once: true });
		/**
		* ========================================================================
		* EXAMPLES
		* ========================================================================
		*
		* 1. Simple CSS removal
		*
		* Blocker.addRule({
		*   id: 'remove-ads',
		*   host: 'example.com',
		*   actions: [Blocker.remove(Blocker.select('.advertisement'))],
		* });
		*
		* 2. Text + visibility + ancestor
		*
		* Blocker.addRule({
		*   id: 'remove-promoted-cards',
		*   actions: [
		*     Blocker.remove(
		*       Blocker.select('span')
		*         .hasText(/promoted|patrocinado/i)
		*         .visible()
		*         .closest('article'),
		*     ),
		*   ],
		* });
		*
		* 3. Accessible role and name
		*
		* Blocker.addRule({
		*   id: 'accept-cookie-dialog',
		*   actions: [
		*     Blocker.click(
		*       Blocker.select()
		*         .role('button', { name: /accept all|aceitar todos/i })
		*         .visible()
		*         .enabled()
		*         .first(),
		*     ),
		*   ],
		* });
		*
		* 4. Test id with fallbacks
		*
		* const closeButton = Blocker.select()
		*   .testId('close-button')
		*   .fallback(
		*     Blocker.select().role('button', { name: /close|fechar/i }),
		*     Blocker.select().xpath('//button[@aria-label="Close"]'),
		*   );
		*
		* 5. Cards that contain a sponsored child
		*
		* Blocker.addRule({
		*   id: 'remove-sponsored-products',
		*   actions: [
		*     Blocker.remove(
		*       Blocker.select('.product-card')
		*         .has(Blocker.select('[data-sponsored="true"]'))
		*         .visible(),
		*     ),
		*   ],
		* });
		*
		* 6. Modify attributes and properties
		*
		* Blocker.addRule({
		*   id: 'unlock-video',
		*   actions: [
		*     Blocker.removeAttributes(Blocker.select('video'), 'controlsList', 'disablePictureInPicture'),
		*     Blocker.setProperties(Blocker.select('video'), { playbackRate: 1 }),
		*   ],
		* });
		*
		* 7. Custom action, rerunnable on mutations
		*
		* Blocker.addRule({
		*   id: 'normalize-videos',
		*   actions: [
		*     Blocker.customAction(
		*       Blocker.select('video'),
		*       (video) => {
		*         if (video instanceof HTMLVideoElement) video.playbackRate = 1;
		*       },
		*       { once: false },
		*     ),
		*   ],
		* });
		*
		* 8. Block fetch request with a synthetic 204
		*
		* Blocker.addRule({
		*   id: 'block-analytics',
		*   type: Blocker.RULE_TYPES.FETCH,
		*   match: {
		*     hostname: '*.example.com',
		*     pathname: /collect|analytics|track/i,
		*     method: 'POST',
		*   },
		*   action: Blocker.FETCH_ACTIONS.BLOCK,
		*   response: { status: 204 },
		* });
		*
		* 9. Redirect a fetch
		*
		* Blocker.addRule({
		*   id: 'redirect-api',
		*   type: Blocker.RULE_TYPES.FETCH,
		*   match: { hostname: 'old-api.example.com' },
		*   action: Blocker.FETCH_ACTIONS.REDIRECT,
		*   redirect: ({ url }) => `https://api.example.com${url.pathname}${url.search}`,
		* });
		*
		* 10. Modify request headers
		*
		* Blocker.addRule({
		*   id: 'inject-debug-header',
		*   type: Blocker.RULE_TYPES.FETCH,
		*   match: { hostname: 'api.example.com' },
		*   action: Blocker.FETCH_ACTIONS.MODIFY_REQUEST,
		*   modifyRequest: ({ input, init, headers }) => ({
		*     input,
		*     init: {
		*       ...init,
		*       headers: new Headers([...headers, ['x-debug', '1']]),
		*     },
		*   }),
		* });
		*
		* 11. Modify a JSON response
		*
		* Blocker.addRule({
		*   id: 'disable-api-ads',
		*   type: Blocker.RULE_TYPES.FETCH,
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
		* 12. Block external scripts and preloads
		*
		* Blocker.addScriptRule({
		*   id: 'block-google-tracking-scripts',
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
		* 13. Block inline bootstrap scripts
		*
		* Blocker.addScriptRule({
		*   id: 'block-inline-tracker',
		*   match: {
		*     kind: Blocker.SCRIPT_KINDS.INLINE,
		*     inline: /window\.__trackerBootstrap|gtag\(/i,
		*   },
		* });
		*
		* 14. Block XHR-delivered JavaScript payloads
		*
		* Blocker.addScriptRule({
		*   id: 'block-remote-eval-payload',
		*   match: {
		*     kind: Blocker.SCRIPT_KINDS.XHR,
		*     pathname: /\/(?:bundle|payload|loader)\.js$/i,
		*   },
		* });
		*
		* 15. Block workers
		*
		* Blocker.addScriptRule({
		*   id: 'block-tracker-workers',
		*   match: {
		*     kind: [
		*       Blocker.SCRIPT_KINDS.WORKER,
		*       Blocker.SCRIPT_KINDS.SHARED_WORKER,
		*       Blocker.SCRIPT_KINDS.SERVICE_WORKER,
		*     ],
		*     src: /tracker|analytics|fingerprint/i,
		*   },
		* });
		*
		* 16. Block eval, Function and string timers
		*
		* Blocker.addScriptRules([
		*   {
		*     id: 'block-suspicious-eval',
		*     match: { kind: Blocker.SCRIPT_KINDS.EVAL, code: /document\.cookie|fingerprint/i },
		*   },
		*   {
		*     id: 'block-suspicious-function',
		*     match: { kind: Blocker.SCRIPT_KINDS.FUNCTION, code: /WebSocket|localStorage/i },
		*   },
		*   {
		*     id: 'block-string-timers',
		*     match: { kind: Blocker.SCRIPT_KINDS.TIMER, code: /tracker|advert/i },
		*   },
		* ]);
		*
		* 17. Redirect a broken SDK
		*
		* Blocker.addScriptRule({
		*   id: 'redirect-broken-sdk',
		*   match: { src: 'https://cdn.example.com/sdk.js' },
		*   action: Blocker.SCRIPT_ACTIONS.REDIRECT,
		*   redirect: 'https://rod.migos.club/shims/sdk.js',
		* });
		*
		* 18. Modify an inline script
		*
		* Blocker.addScriptRule({
		*   id: 'neutralize-bootstrap-flag',
		*   match: { kind: Blocker.SCRIPT_KINDS.INLINE, code: /adsEnabled\s*=\s*true/ },
		*   action: Blocker.SCRIPT_ACTIONS.MODIFY,
		*   modify: ({ code }) => code.replace(/adsEnabled\s*=\s*true/g, 'adsEnabled=false'),
		* });
		*
		* 19. Helper form
		*
		* Blocker.addRule(Blocker.blockScript(
		*   {
		*     kind: Blocker.SCRIPT_KINDS.DOCUMENT_WRITE,
		*     code: /<script[^>]+advertising/i,
		*   },
		*   {
		*     id: 'block-document-write-ad-script',
		*     name: 'Block advertising scripts written by document.write',
		*   },
		* ));
		*
		* 20. Queue rules before the runtime loads
		*
		* window.BlockerQueue ||= [];
		* window.BlockerQueue.push((Blocker) => {
		*   Blocker.addRule({
		*     id: 'queued-rule',
		*     host: 'example.com',
		*     actions: [Blocker.remove(Blocker.select('.popup'))],
		*   });
		* });
		*
		* 21. Runtime configuration
		*
		* Blocker.configure({
		*   debug: false,
		*   observerDebounceMs: 32,
		*   mutationFullScanThreshold: 120,
		*   interceptWebAssembly: false,
		* });
		*
		* 22. Export current Blocker rules to uBlock-compatible syntax
		*
		* const ublock = Blocker.easyList.export({
		*   target: 'ublock',
		*   comments: true,
		*   unsupported: 'comment',
		*   removal: 'preserve',
		* });
		*
		* console.log(ublock.text);
		* console.table(ublock.conversions);
		*
		* 23. Export portable EasyList syntax
		*
		* const easylist = Blocker.easyList.export({
		*   target: 'easylist',
		*   removal: 'hide',
		* });
		*
		* 24. Parse without registering
		*
		* const parsed = Blocker.easyList.parse(`
		*   ||doubleclick.net^$script
		*   ||analytics.example.com^$xhr
		*   youtube.com##ytd-ad-slot-renderer
		*   x.com##article:has-text(/promoted|patrocinado/i):remove()
		* `);
		*
		* console.log(parsed.rules);
		* console.table(parsed.warnings);
		*
		* 25. Import + immediately register supported filters
		*
		* Blocker.easyList.import(`
		*   ||googletagmanager.com^$script
		*   example.com##.advertisement
		* `, {
		*   register: true,
		*   cosmeticAction: 'preserve',
		* });
		*
		* 26. Compile a selector
		*
		* const selectorConversion = Blocker.easyList.compileSelector(
		*   Blocker.select('span')
		*     .hasText(/promoted|patrocinado/i)
		*     .closest('article'),
		*   { target: 'ublock' },
		* );
		*
		* // → span:has-text(/promoted|patrocinado/i):upward(article)
		*
		* 27. Compile one rule
		*
		* const ruleConversion = Blocker.easyList.compileRule({
		*   id: 'remove-promoted',
		*   host: ['x.com', 'twitter.com'],
		*   actions: [
		*     Blocker.remove(
		*       Blocker.select('article').hasText(/promoted|patrocinado/i),
		*     ),
		*   ],
		* }, { target: 'ublock' });
		*
		* 28. Validate a downloaded list before registering
		*
		* const validation = Blocker.easyList.validate(listText);
		* if (!validation.valid) {
		*   console.table(validation.unsupportedLines);
		* }
		*
		* Browser limitation:
		* JavaScript cannot universally hook the native dynamic import() operator.
		* Parser-inserted scripts can also execute before MutationObserver sees them.
		* For guaranteed network-level blocking, combine Blocker with a content blocker,
		* extension request filter, local proxy or Content-Security-Policy.
		*/
	})(window);

//#endregion
//#region \0rod-iife-entry:browser:/home/runner/work/rodkisten.github.io/rodkisten.github.io/blocker/blocker.ts
	const __globalName = "Blocker";
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
	const __hasExports = Object.keys(blocker_exports).length > 0;
	const __value = Object.prototype.hasOwnProperty.call(blocker_exports, "default") ? void 0 : Object.prototype.hasOwnProperty.call(blocker_exports, __globalName) ? blocker_exports[__globalName] : __hasExports ? blocker_exports : __existing;
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