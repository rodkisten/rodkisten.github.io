/* Generated from elements/elements.ts. Do not edit directly. */
//#region elements/elements.ts
/**
* RodElements v1.1.0
* Tiny, strict and cross-realm-safe DOM factory with optional Cipó CSS runtime.
*
* Main guarantees:
* - One standalone TypeScript file.
* - Compiles under `strict` without `@ts-ignore`.
* - Global IIFE publication as `RodElements`.
* - Tiny Emmet-like selector parser with bounded cache.
* - HTML and SVG creation.
* - Cross-realm-safe Node detection.
* - Variadic and recursively nested children.
* - `text` writes to `textContent`.
* - `html` writes to `innerHTML` and is intentionally unsanitized.
* - `css` accepts a Cipó `css``...`` ` result or a plain multiline string.
* - Plain CSS strings are routed through the available Cipó runtime before
*   becoming a scoped rule for the created element.
* - Style, data, attributes, event listeners, direct event properties and refs.
* - Document-bound facade, fragments, noConflict and diagnostics.
*
* Usage:
*
*   const { el, svg } = RodElements;
*
*   const button = el("button.primary[type=button]", {
*     text: "Salvar",
*     css: `
*       display: inline-flex;
*       gap: 8px;
*       padding: 8px 12px;
*
*       &:hover {
*         transform: translateY(-1px);
*       }
*     `,
*     onclick: () => console.log("saved"),
*   });
*
* Cipó tagged template output is accepted directly:
*
*   el("section.card", {
*     css: Cipo.css`
*       p: 4;
*       radius: xl;
*       bg: alpha(#111827 / 92%);
*     `,
*   });
*
* `html` is a direct innerHTML sink. Never pass untrusted HTML.
*
* @license MIT
*/
(function installRodElements(factory) {
	"use strict";
	const VERSION = "1.1.0";
	const SIGNATURE = "__rodElements__";
	const GLOBAL_NAME = "RodElements";
	const roots = [];
	const localRoot = globalThis;
	function addRoot(value) {
		if (!value || typeof value !== "object" && typeof value !== "function") return;
		const root = value;
		if (!roots.includes(root)) roots.push(root);
	}
	addRoot(localRoot);
	if (typeof window !== "undefined") addRoot(window);
	if (typeof self !== "undefined") addRoot(self);
	try {
		if (typeof unsafeWindow !== "undefined") addRoot(unsafeWindow);
	} catch {}
	let existing = null;
	for (const root of roots) try {
		const candidate = root[GLOBAL_NAME];
		if (isObjectLike(candidate) && candidate[SIGNATURE] === true && candidate.version === VERSION) {
			existing = candidate;
			break;
		}
	} catch {}
	if (existing) {
		for (const root of roots) try {
			if (!root[GLOBAL_NAME]) root[GLOBAL_NAME] = existing;
		} catch {}
		return;
	}
	const defaultDocument = roots.find((root) => isDocument(root.document))?.document ?? (typeof document !== "undefined" ? document : null);
	const previousValues = [];
	for (const root of roots) try {
		previousValues.push({
			root,
			value: root[GLOBAL_NAME]
		});
	} catch {}
	const api = factory({
		version: VERSION,
		signature: SIGNATURE,
		globalName: GLOBAL_NAME,
		defaultDocument,
		roots,
		previousValues
	});
	for (const root of roots) try {
		root[GLOBAL_NAME] = api;
	} catch {}
	function isObjectLike(value) {
		return value !== null && (typeof value === "object" || typeof value === "function");
	}
	function isDocument(value) {
		return Boolean(value && typeof value === "object" && typeof value.createElement === "function" && value.nodeType === 9);
	}
})(function createRodElements(environment) {
	"use strict";
	const VERSION = environment.version;
	const SIGNATURE = environment.signature;
	const GLOBAL_NAME = environment.globalName;
	const roots = environment.roots;
	const previousValues = environment.previousValues;
	const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
	const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
	const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
	const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
	const hasOwn = Object.prototype.hasOwnProperty;
	const selectorCache = /* @__PURE__ */ new Map();
	const compiledCssCache = /* @__PURE__ */ new Map();
	const cssRuleCache = /* @__PURE__ */ new Map();
	const styleElements = /* @__PURE__ */ new WeakMap();
	const installedRules = /* @__PURE__ */ new WeakMap();
	const knownStyleRoots = /* @__PURE__ */ new Set();
	const mutableConfig = {
		cache: true,
		cacheSize: 256,
		cssCache: true,
		debug: false,
		debugAttribute: false,
		publishUnsafeWindow: true,
		document: environment.defaultDocument,
		cipo: null,
		styleNonce: ""
	};
	let api;
	function isNode(value) {
		if (!value || typeof value !== "object") return false;
		const candidate = value;
		return typeof candidate.nodeType === "number" && typeof candidate.nodeName === "string";
	}
	function isDocument(value) {
		return isNode(value) && value.nodeType === 9 && typeof value.createElement === "function";
	}
	function isShadowRoot(value) {
		return Boolean(value && typeof value === "object" && value.nodeType === 11 && "host" in value && typeof value.appendChild === "function");
	}
	function isPropsObject(value) {
		return value !== null && typeof value === "object" && !Array.isArray(value) && !isNode(value);
	}
	function resolveDocument(preferred) {
		const resolved = preferred ?? mutableConfig.document;
		if (!isDocument(resolved)) throw new Error("[RodElements] No usable document is available. Provide one with RodElements.configure({ document }).");
		return resolved;
	}
	function trimSelectorCache() {
		if (!mutableConfig.cache || mutableConfig.cacheSize <= 0) {
			selectorCache.clear();
			return;
		}
		while (selectorCache.size > mutableConfig.cacheSize) {
			const oldest = selectorCache.keys().next();
			if (oldest.done) break;
			selectorCache.delete(oldest.value);
		}
	}
	function isNameCode(code) {
		return code >= 65 && code <= 90 || code >= 97 && code <= 122 || code >= 48 && code <= 57 || code === 45 || code === 95;
	}
	function parse(input = "div") {
		let source = String(input ?? "div").trim();
		if (!source) source = "div";
		if (mutableConfig.cache) {
			const cached = selectorCache.get(source);
			if (cached) return cached;
		}
		const length = source.length;
		let cursor = 0;
		let tag = "div";
		let id = "";
		const classes = [];
		const attrs = Object.create(null);
		const first = source.charCodeAt(0);
		if (first >= 65 && first <= 90 || first >= 97 && first <= 122) {
			const start = cursor;
			cursor += 1;
			while (cursor < length && isNameCode(source.charCodeAt(cursor))) cursor += 1;
			tag = source.slice(start, cursor);
		}
		while (cursor < length) {
			const marker = source.charCodeAt(cursor);
			if (marker === 35 || marker === 46) {
				const idToken = marker === 35;
				cursor += 1;
				const start = cursor;
				while (cursor < length && isNameCode(source.charCodeAt(cursor))) cursor += 1;
				if (cursor === start) throw new SyntaxError(`[RodElements] Invalid selector token in: ${source}`);
				const token = source.slice(start, cursor);
				if (idToken) id = token;
				else classes.push(token);
				continue;
			}
			if (marker === 91) {
				cursor += 1;
				while (cursor < length && source.charCodeAt(cursor) <= 32) cursor += 1;
				const nameStart = cursor;
				while (cursor < length) {
					const code = source.charCodeAt(cursor);
					if (code === 61 || code === 93 || code <= 32) break;
					cursor += 1;
				}
				const name = source.slice(nameStart, cursor);
				if (!name) throw new SyntaxError(`[RodElements] Empty attribute name in selector: ${source}`);
				while (cursor < length && source.charCodeAt(cursor) <= 32) cursor += 1;
				let value = "";
				if (source.charCodeAt(cursor) === 61) {
					cursor += 1;
					while (cursor < length && source.charCodeAt(cursor) <= 32) cursor += 1;
					const quote = source.charCodeAt(cursor);
					if (quote === 34 || quote === 39) {
						cursor += 1;
						const valueStart = cursor;
						while (cursor < length && source.charCodeAt(cursor) !== quote) cursor += 1;
						if (cursor >= length) throw new SyntaxError(`[RodElements] Unclosed quoted attribute in selector: ${source}`);
						value = source.slice(valueStart, cursor);
						cursor += 1;
					} else {
						const valueStart = cursor;
						while (cursor < length && source.charCodeAt(cursor) !== 93) cursor += 1;
						value = source.slice(valueStart, cursor).trim();
					}
					while (cursor < length && source.charCodeAt(cursor) <= 32) cursor += 1;
				}
				if (source.charCodeAt(cursor) !== 93) throw new SyntaxError(`[RodElements] Unclosed attribute in selector: ${source}`);
				cursor += 1;
				attrs[name] = value;
				continue;
			}
			if (marker <= 32) {
				cursor += 1;
				continue;
			}
			throw new SyntaxError(`[RodElements] Unsupported selector syntax near \`${source.slice(cursor)}\` in: ${source}`);
		}
		const frozenClasses = Object.freeze(classes.slice());
		const frozenAttrs = Object.freeze({ ...attrs });
		const parsed = Object.freeze({
			tag,
			id,
			classes: frozenClasses,
			className: frozenClasses.join(" "),
			attrs: frozenAttrs
		});
		if (mutableConfig.cache) {
			selectorCache.set(source, parsed);
			trimSelectorCache();
		}
		return parsed;
	}
	function setAttributeValue(element, name, value, namespace = null) {
		if (value == null || value === false) return;
		const normalized = value === true ? "" : String(value);
		if (namespace) element.setAttributeNS(namespace, name, normalized);
		else element.setAttribute(name, normalized);
	}
	function applyStyle(element, value) {
		const style = element.style;
		if (!style) return;
		if (typeof value === "string") {
			style.cssText = value;
			return;
		}
		for (const [key, styleValue] of Object.entries(value)) {
			if (styleValue == null || styleValue === false) continue;
			const normalized = String(styleValue);
			if (key.startsWith("--") || key.includes("-")) {
				style.setProperty(key, normalized);
				continue;
			}
			try {
				style[key] = styleValue;
			} catch {
				style.setProperty(key, normalized);
			}
		}
	}
	function dataAttributeName(key) {
		return `data-${key.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)}`;
	}
	function applyData(element, values) {
		for (const [key, value] of Object.entries(values)) {
			if (value == null || value === false) continue;
			element.setAttribute(dataAttributeName(key), String(value));
		}
	}
	function applyAttributes(element, values) {
		for (const [key, value] of Object.entries(values)) if (key.startsWith("xlink:")) setAttributeValue(element, key, value, XLINK_NAMESPACE);
		else if (key.startsWith("xml:")) setAttributeValue(element, key, value, XML_NAMESPACE);
		else setAttributeValue(element, key, value);
	}
	function applyListeners(element, listeners) {
		for (const [eventName, declaration] of Object.entries(listeners)) {
			if (!declaration) continue;
			let handler;
			let options;
			if (Array.isArray(declaration)) {
				handler = declaration[0];
				options = declaration[1];
			} else if (typeof declaration === "object" && "handler" in declaration && !isNode(declaration)) {
				handler = declaration.handler;
				options = declaration.options;
			} else handler = declaration;
			if (typeof handler === "function" || handler && typeof handler === "object" && typeof handler.handleEvent === "function") element.addEventListener(eventName, handler, options);
		}
	}
	function appendClasses(element, value) {
		if (value == null || value === false || value === true) return;
		if (typeof value === "string" || typeof value === "number") {
			const textValue = String(value).trim();
			if (textValue) {
				for (const token of textValue.split(/\s+/)) if (token) element.classList.add(token);
			}
			return;
		}
		if (Array.isArray(value)) {
			for (const item of value) appendClasses(element, item);
			return;
		}
		for (const [key, enabled] of Object.entries(value)) if (enabled) appendClasses(element, key);
	}
	function applyGenericProp(element, key, value) {
		if (value == null) return;
		const record = element;
		if (key in element) try {
			record[key] = value;
			return;
		} catch {}
		if (value === false) {
			element.removeAttribute(key);
			return;
		}
		setAttributeValue(element, key, value);
	}
	function readGlobalCipo() {
		if (mutableConfig.cipo) return mutableConfig.cipo;
		try {
			if (typeof Cipo !== "undefined" && isCipoRuntime(Cipo)) return Cipo;
		} catch {}
		for (const root of roots) try {
			const candidate = root.Cipo;
			if (isCipoRuntime(candidate)) return candidate;
		} catch {}
		return null;
	}
	function isCipoRuntime(value) {
		if (!value || typeof value !== "object" && typeof value !== "function") return false;
		const candidate = value;
		return typeof candidate.css === "function" || typeof candidate.sheet?.css === "function" || typeof candidate.compile === "function";
	}
	function cssInputToString(input) {
		if (typeof input === "string" || input instanceof String) return String(input);
		if ("cssText" in input && typeof input.cssText === "string") return input.cssText;
		const output = input.toString();
		return output === "[object Object]" ? "" : output;
	}
	function templateFromString(source) {
		const strings = [source];
		Object.defineProperty(strings, "raw", {
			value: [source],
			enumerable: false,
			configurable: false,
			writable: false
		});
		return strings;
	}
	function cssOutputToString(output) {
		if (typeof output === "string" || output instanceof String) return String(output);
		if (output && typeof output === "object") {
			const record = output;
			for (const key of [
				"cssText",
				"css",
				"code",
				"value",
				"text"
			]) if (typeof record[key] === "string") return record[key];
			const toStringValue = record.toString;
			if (typeof toStringValue === "function") {
				const result = Reflect.apply(toStringValue, output, []);
				if (typeof result === "string" && result !== "[object Object]") return result;
			}
		}
		return "";
	}
	function callCssCompiler(owner, compiler, source) {
		if (typeof compiler !== "function") return "";
		const callable = compiler;
		const template = templateFromString(source);
		for (const args of [[template], [source]]) try {
			const textValue = cssOutputToString(Reflect.apply(callable, owner, [...args])).trim();
			if (textValue) return textValue;
		} catch {}
		return "";
	}
	function compileCss(input) {
		const source = cssInputToString(input).trim();
		if (!source) return "";
		if (mutableConfig.cssCache) {
			const cached = compiledCssCache.get(source);
			if (cached !== void 0) return cached;
		}
		const cipo = readGlobalCipo();
		let compiled = "";
		if (cipo) compiled = callCssCompiler(cipo.sheet, cipo.sheet?.css, source) || callCssCompiler(cipo, cipo.css, source) || callCssCompiler(cipo, cipo.compile, source);
		const result = (compiled || source).trim();
		if (mutableConfig.cssCache) compiledCssCache.set(source, result);
		return result;
	}
	function hashCss(value) {
		let hash = 2166136261;
		for (let index = 0; index < value.length; index += 1) {
			hash ^= value.charCodeAt(index);
			hash = Math.imul(hash, 16777619);
		}
		return (hash >>> 0).toString(36);
	}
	function ruleForCss(compiled) {
		const cached = cssRuleCache.get(compiled);
		if (cached) return cached;
		const base = `rod-cipo-${hashCss(compiled)}`;
		let className = base;
		let collisionIndex = 0;
		while ([...cssRuleCache.values()].some((entry) => entry.className === className && entry.compiled !== compiled)) {
			collisionIndex += 1;
			className = `${base}-${collisionIndex}`;
		}
		const record = Object.freeze({
			className,
			compiled,
			rule: `\n.${className}{\n${compiled}\n}\n`
		});
		cssRuleCache.set(compiled, record);
		return record;
	}
	function styleRootFor(element, explicit) {
		if (isDocument(explicit) || isShadowRoot(explicit)) return explicit;
		const currentRoot = element.getRootNode?.();
		if (isShadowRoot(currentRoot)) return currentRoot;
		return element.ownerDocument ?? resolveDocument();
	}
	function ensureStyleElement(root) {
		const cached = styleElements.get(root);
		if (cached?.isConnected) return cached;
		const style = (isDocument(root) ? root : root.ownerDocument).createElement("style");
		style.id = `rod-elements-cipo-runtime-${VERSION.replace(/\W+/g, "-")}`;
		style.dataset["rodElements"] = VERSION;
		if (mutableConfig.styleNonce) style.nonce = mutableConfig.styleNonce;
		if (isDocument(root)) (root.head || root.documentElement).appendChild(style);
		else root.appendChild(style);
		styleElements.set(root, style);
		installedRules.set(root, /* @__PURE__ */ new Set());
		knownStyleRoots.add(root);
		return style;
	}
	function installCssRule(root, record) {
		let installed = installedRules.get(root);
		if (!installed) {
			ensureStyleElement(root);
			installed = installedRules.get(root) ?? /* @__PURE__ */ new Set();
			installedRules.set(root, installed);
		}
		if (installed.has(record.className)) return;
		ensureStyleElement(root).appendChild((isDocument(root) ? root : root.ownerDocument).createTextNode(record.rule));
		installed.add(record.className);
	}
	function mountCss(element, root) {
		const className = element.getAttribute("data-rod-css-class");
		if (!className) return element;
		const record = [...cssRuleCache.values()].find((entry) => entry.className === className);
		if (!record) return element;
		installCssRule(styleRootFor(element, root), record);
		return element;
	}
	function applyCss(element, value, explicitRoot) {
		const compiled = compileCss(value);
		if (!compiled) return;
		const record = ruleForCss(compiled);
		element.classList.add(record.className);
		element.setAttribute("data-rod-css-class", record.className);
		installCssRule(styleRootFor(element, explicitRoot), record);
		queueMicrotask(() => {
			if (!element.isConnected) return;
			const currentRoot = element.getRootNode?.();
			if (isShadowRoot(currentRoot)) installCssRule(currentRoot, record);
		});
	}
	function applyProps(element, props) {
		if (!props) return null;
		let ref = null;
		for (const key of Object.keys(props)) {
			const value = props[key];
			if (key === "$ref") {
				if (typeof value === "function") ref = value;
				continue;
			}
			if (key === "$document" || key === "$namespace" || key === "$cssRoot") continue;
			switch (key) {
				case "text":
					element.textContent = value == null ? "" : String(value);
					continue;
				case "html":
					element.innerHTML = value == null ? "" : String(value);
					continue;
				case "css":
					if (value != null && value !== false) applyCss(element, value, props.$cssRoot);
					continue;
				case "class":
				case "className":
					appendClasses(element, value);
					continue;
				case "style":
					if (typeof value === "string" || value && typeof value === "object") applyStyle(element, value);
					continue;
				case "data":
				case "dataset":
					if (value && typeof value === "object") applyData(element, value);
					continue;
				case "attr":
				case "attrs":
					if (value && typeof value === "object") applyAttributes(element, value);
					continue;
				case "on":
					if (value && typeof value === "object") applyListeners(element, value);
					continue;
			}
			if (key.length > 2 && key.startsWith("on") && typeof value === "function") try {
				element[key.toLowerCase()] = value;
				continue;
			} catch {}
			applyGenericProp(element, key, value);
		}
		return ref;
	}
	function appendOne(parent, child, documentRef) {
		if (child == null || child === false || child === true) return;
		if (isNode(child)) {
			parent.appendChild(child);
			return;
		}
		if (Array.isArray(child)) {
			for (const nested of child) appendOne(parent, nested, documentRef);
			return;
		}
		parent.appendChild(documentRef.createTextNode(String(child)));
	}
	function append(parent, ...children) {
		if (!isNode(parent)) throw new TypeError("[RodElements] append(parent): parent must be a Node.");
		const documentRef = parent.ownerDocument ?? (isDocument(parent) ? parent : null) ?? resolveDocument();
		for (const child of children) appendOne(parent, child, documentRef);
		return parent;
	}
	function create(selector = "div", propsOrChild, ...children) {
		const parsed = parse(selector);
		const hasProps = isPropsObject(propsOrChild);
		const props = hasProps ? propsOrChild : null;
		const documentRef = resolveDocument(props?.$document);
		const namespace = props?.$namespace || HTML_NAMESPACE;
		const element = namespace === HTML_NAMESPACE ? documentRef.createElement(parsed.tag) : documentRef.createElementNS(namespace, parsed.tag);
		if (parsed.id) element.id = parsed.id;
		if (parsed.className) {
			if (namespace === HTML_NAMESPACE) element.className = parsed.className;
			else element.setAttribute("class", parsed.className);
		}
		for (const [name, value] of Object.entries(parsed.attrs)) setAttributeValue(element, name, value);
		const ref = applyProps(element, props);
		if (!hasProps && propsOrChild !== void 0) appendOne(element, propsOrChild, documentRef);
		for (const child of children) appendOne(element, child, documentRef);
		if (mutableConfig.debug) {
			try {
				element["__rodElement"] = selector || "div";
			} catch {}
			if (mutableConfig.debugAttribute) element.setAttribute("data-rod-element", selector || "div");
		}
		ref?.(element);
		return element;
	}
	function el(selector = "div", propsOrChild, ...children) {
		return create(selector, propsOrChild, ...children);
	}
	function svg(selector = "svg", propsOrChild, ...children) {
		const hasProps = isPropsObject(propsOrChild);
		const props = hasProps ? {
			...propsOrChild,
			$namespace: SVG_NAMESPACE
		} : { $namespace: SVG_NAMESPACE };
		if (hasProps) return create(selector, props, ...children);
		if (propsOrChild === void 0) return create(selector, props, ...children);
		return create(selector, props, propsOrChild, ...children);
	}
	function fragment(...children) {
		const documentRef = resolveDocument();
		const result = documentRef.createDocumentFragment();
		for (const child of children) appendOne(result, child, documentRef);
		return result;
	}
	function fragmentWithDocument(documentRef, ...children) {
		const resolved = resolveDocument(documentRef);
		const result = resolved.createDocumentFragment();
		for (const child of children) appendOne(result, child, resolved);
		return result;
	}
	function text(value, documentRef) {
		return resolveDocument(documentRef).createTextNode(value == null ? "" : String(value));
	}
	function configure(options = {}) {
		if (hasOwn.call(options, "cache")) mutableConfig.cache = Boolean(options.cache);
		if (hasOwn.call(options, "cssCache")) mutableConfig.cssCache = Boolean(options.cssCache);
		if (hasOwn.call(options, "debug")) mutableConfig.debug = Boolean(options.debug);
		if (hasOwn.call(options, "debugAttribute")) mutableConfig.debugAttribute = Boolean(options.debugAttribute);
		if (hasOwn.call(options, "publishUnsafeWindow")) mutableConfig.publishUnsafeWindow = Boolean(options.publishUnsafeWindow);
		if (hasOwn.call(options, "cacheSize")) {
			const value = Number(options.cacheSize);
			if (!Number.isFinite(value) || value < 0) throw new TypeError("[RodElements] cacheSize must be a non-negative finite number.");
			mutableConfig.cacheSize = Math.floor(value);
		}
		if (hasOwn.call(options, "document")) mutableConfig.document = resolveDocument(options.document);
		if (hasOwn.call(options, "cipo")) {
			if (options.cipo !== null && !isCipoRuntime(options.cipo)) throw new TypeError("[RodElements] cipo must expose css, sheet.css or compile.");
			mutableConfig.cipo = options.cipo ?? null;
			compiledCssCache.clear();
		}
		if (hasOwn.call(options, "styleNonce")) mutableConfig.styleNonce = String(options.styleNonce ?? "");
		trimSelectorCache();
		if (!mutableConfig.cssCache) compiledCssCache.clear();
		publishConfiguredRoots();
		return getConfig();
	}
	function getConfig() {
		return Object.freeze({
			cache: mutableConfig.cache,
			cacheSize: mutableConfig.cacheSize,
			cssCache: mutableConfig.cssCache,
			debug: mutableConfig.debug,
			debugAttribute: mutableConfig.debugAttribute,
			publishUnsafeWindow: mutableConfig.publishUnsafeWindow,
			document: mutableConfig.document,
			cipo: readGlobalCipo(),
			styleNonce: mutableConfig.styleNonce
		});
	}
	function isUnsafeRoot(root) {
		try {
			return typeof unsafeWindow !== "undefined" && root === unsafeWindow;
		} catch {
			return false;
		}
	}
	function publishConfiguredRoots() {
		for (const root of roots) {
			if (isUnsafeRoot(root) && !mutableConfig.publishUnsafeWindow) continue;
			try {
				root[GLOBAL_NAME] = api;
			} catch {}
		}
	}
	function clearCache(selector) {
		if (selector === void 0) {
			const hadEntries = selectorCache.size > 0;
			selectorCache.clear();
			return hadEntries;
		}
		return selectorCache.delete(String(selector).trim() || "div");
	}
	function clearCssCache() {
		const hadEntries = compiledCssCache.size > 0 || cssRuleCache.size > 0 || knownStyleRoots.size > 0;
		compiledCssCache.clear();
		cssRuleCache.clear();
		for (const root of knownStyleRoots) {
			styleElements.get(root)?.remove();
			styleElements.delete(root);
			installedRules.delete(root);
		}
		knownStyleRoots.clear();
		return hadEntries;
	}
	function getCacheStats() {
		return Object.freeze({
			enabled: mutableConfig.cache,
			size: selectorCache.size,
			maxSize: mutableConfig.cacheSize,
			keys: Object.freeze([...selectorCache.keys()]),
			css: Object.freeze({
				enabled: mutableConfig.cssCache,
				compiledEntries: compiledCssCache.size,
				scopedRules: cssRuleCache.size,
				styleRoots: knownStyleRoots.size
			})
		});
	}
	function noConflict() {
		for (const entry of previousValues) try {
			if (entry.root[GLOBAL_NAME] !== api) continue;
			if (entry.value === void 0) delete entry.root[GLOBAL_NAME];
			else entry.root[GLOBAL_NAME] = entry.value;
		} catch {}
		return api;
	}
	function withDocument(documentRef) {
		const boundDocument = resolveDocument(documentRef);
		function boundEl(selector = "div", propsOrChild, ...children) {
			const hasProps = isPropsObject(propsOrChild);
			const props = hasProps ? {
				...propsOrChild,
				$document: boundDocument
			} : { $document: boundDocument };
			if (hasProps) return create(selector, props, ...children);
			if (propsOrChild === void 0) return create(selector, props, ...children);
			return create(selector, props, propsOrChild, ...children);
		}
		function boundSvg(selector = "svg", propsOrChild, ...children) {
			const hasProps = isPropsObject(propsOrChild);
			const props = hasProps ? {
				...propsOrChild,
				$document: boundDocument,
				$namespace: SVG_NAMESPACE
			} : {
				$document: boundDocument,
				$namespace: SVG_NAMESPACE
			};
			if (hasProps) return create(selector, props, ...children);
			if (propsOrChild === void 0) return create(selector, props, ...children);
			return create(selector, props, propsOrChild, ...children);
		}
		return Object.freeze({
			el: boundEl,
			createElement: boundEl,
			svg: boundSvg,
			fragment: (...children) => fragmentWithDocument(boundDocument, ...children),
			text: (value) => text(value, boundDocument)
		});
	}
	api = {
		version: VERSION,
		el,
		createElement: el,
		svg,
		append,
		fragment,
		text,
		parse,
		isNode,
		compileCss,
		mountCss,
		configure,
		getConfig,
		clearCache,
		clearCssCache,
		getCacheStats,
		withDocument,
		noConflict
	};
	Object.defineProperty(api, SIGNATURE, {
		value: true,
		enumerable: false,
		configurable: false,
		writable: false
	});
	Object.freeze(api);
	publishConfiguredRoots();
	return api;
});

//#endregion