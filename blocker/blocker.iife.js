/* Auto-generated from blocker/blocker.ts. at 8/9/2026, 3:35:30 PM Do not edit directly. */
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
			version: "2.1.0",
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