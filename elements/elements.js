/* Generated from elements/elements.ts. Do not edit directly. */
//#region elements/elements.ts
/**
* RodElements v1.2.0
*
* Ultra-small, strict, cross-realm-safe DOM factory optimized for hot-path
* element creation, userscripts and high-frequency UI rendering.
*
* Performance architecture:
*
* - Bounded selector plan cache.
* - Flat precompiled selector attribute plans.
* - O(1) CSS rule lookup by compiled source and generated class.
* - O(1) element -> CSS rule association through WeakMap.
* - Batched ShadowRoot CSS remount detection: one microtask per tick.
* - No props cloning in svg() or withDocument().
* - Cached positive Cipó compiler strategy.
* - Minimal default-document validation on the hot path.
* - Class aggregation instead of repeated classList.add().
* - Allocation-conscious object traversal.
* - Cross-realm-safe public Node detection.
* - Faster internal Node detection for trusted hot paths.
*
* Main guarantees:
*
* - One standalone TypeScript file.
* - Compiles under `strict` without `@ts-ignore`.
* - Global IIFE publication as `RodElements`.
* - Tiny Emmet-like selector parser with bounded cache.
* - HTML and SVG creation.
* - Cross-realm-safe Node detection.
* - Variadic and recursively nested children.
* - `text` writes to `textContent`.
* - `html` writes to `innerHTML` and is intentionally unsanitized.
* - `css` accepts Cipó tagged-template output or a plain CSS string.
* - Plain CSS strings are routed through Cipó when available.
* - Style, data, attributes, listeners, native properties and refs.
* - Document-bound facade.
* - Fragments.
* - noConflict().
* - Diagnostics.
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
* Cipó:
*
*   el("section.card", {
*     css: Cipo.css`
*       p: 4;
*       radius: xl;
*       bg: alpha(#111827 / 92%);
*     `,
*   });
*
* `html` is a direct innerHTML sink.
* Never pass untrusted HTML.
*
* @license MIT
*/
(function installRodElements(factory) {
	"use strict";
	const VERSION = "1.2.0";
	const SIGNATURE = "__rodElements__";
	const GLOBAL_NAME = "RodElements";
	const roots = [];
	const localRoot = globalThis;
	function isObjectLike(value) {
		return value !== null && (typeof value === "object" || typeof value === "function");
	}
	function isDocument(value) {
		if (value === null || typeof value !== "object") return false;
		const candidate = value;
		return candidate.nodeType === 9 && typeof candidate.createElement === "function";
	}
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
	let defaultDocument = null;
	for (let index = 0; index < roots.length; index += 1) {
		const candidate = roots[index].document;
		if (isDocument(candidate)) {
			defaultDocument = candidate;
			break;
		}
	}
	if (!defaultDocument && typeof document !== "undefined") defaultDocument = document;
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
	const EMPTY_CLASSES = Object.freeze([]);
	const EMPTY_ATTRS = Object.freeze(Object.create(null));
	const EMPTY_ATTR_PAIRS = Object.freeze([]);
	const DIV_PLAN = Object.freeze({
		tag: "div",
		id: "",
		classes: EMPTY_CLASSES,
		className: "",
		attrs: EMPTY_ATTRS,
		attrPairs: EMPTY_ATTR_PAIRS
	});
	const selectorCache = /* @__PURE__ */ new Map();
	const compiledCssCache = /* @__PURE__ */ new Map();
	/**
	* O(1):
	*
	* compiled CSS -> rule
	*/
	const cssRuleByCompiled = /* @__PURE__ */ new Map();
	/**
	* O(1):
	*
	* generated class -> rule
	*/
	const cssRuleByClass = /* @__PURE__ */ new Map();
	/**
	* Style element owned by each Document/ShadowRoot.
	*/
	const styleElements = /* @__PURE__ */ new WeakMap();
	/**
	* Classes already inserted into each style root.
	*/
	const installedRules = /* @__PURE__ */ new WeakMap();
	/**
	* Strong references are intentionally kept so clearCssCache()
	* can remove previously-created runtime <style> elements.
	*/
	const knownStyleRoots = /* @__PURE__ */ new Set();
	/**
	* element -> generated CSS record.
	*
	* Replaces data-rod-css-class DOM attributes.
	*/
	let elementCssRecords = /* @__PURE__ */ new WeakMap();
	/**
	* Batched detached-element ShadowRoot relocation checks.
	*
	* N CSS elements created synchronously = one microtask.
	*/
	const pendingCssMounts = /* @__PURE__ */ new Map();
	let cssMountScheduled = false;
	/**
	* Positive compiler strategy cache.
	*
	* `null` means no strategy has been resolved yet.
	*
	* Negative lookups aren't permanently cached because Cipó may be loaded
	* after RodElements in userscript environments.
	*/
	let cssCompilerAdapter = null;
	let cssCompilerRuntime = null;
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
	/**
	* Public, intentionally conservative cross-realm Node test.
	*/
	function isNode(value) {
		if (value === null || typeof value !== "object") return false;
		const candidate = value;
		return typeof candidate.nodeType === "number" && typeof candidate.nodeName === "string";
	}
	/**
	* Internal hot-path Node test.
	*
	* Child values already come from application code and don't need the
	* additional nodeName validation performed by the public API.
	*/
	function isNodeFast(value) {
		return value !== null && typeof value === "object" && typeof value.nodeType === "number";
	}
	function isDocument(value) {
		return isNodeFast(value) && value.nodeType === 9 && typeof value.createElement === "function";
	}
	function isShadowRoot(value) {
		return Boolean(value && typeof value === "object" && value.nodeType === 11 && "host" in value && typeof value.appendChild === "function");
	}
	function isPropsObject(value) {
		return value !== null && typeof value === "object" && !Array.isArray(value) && !isNodeFast(value);
	}
	/**
	* Fast path:
	*
	* mutableConfig.document has already been validated when configured, so
	* normal el() calls don't repeatedly perform structural Document checks.
	*/
	function resolveDocument(preferred) {
		if (preferred != null) {
			if (!isDocument(preferred)) throw new TypeError("[RodElements] Invalid document reference.");
			return preferred;
		}
		const configured = mutableConfig.document;
		if (configured) return configured;
		throw new Error("[RodElements] No usable document is available. Provide one with RodElements.configure({ document }).");
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
	function parsePlan(input = "div") {
		let source = String(input ?? "div").trim();
		if (!source) source = "div";
		/**
		* World's cheapest selector parser.
		*/
		if (source === "div") return DIV_PLAN;
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
		const attrPairs = [];
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
				const isId = marker === 35;
				cursor += 1;
				const start = cursor;
				while (cursor < length && isNameCode(source.charCodeAt(cursor))) cursor += 1;
				if (cursor === start) throw new SyntaxError(`[RodElements] Invalid selector token in: ${source}`);
				const token = source.slice(start, cursor);
				if (isId) id = token;
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
				attrPairs.push(name, value);
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
		const frozenPairs = Object.freeze(attrPairs.slice());
		const plan = Object.freeze({
			tag,
			id,
			classes: frozenClasses,
			className: frozenClasses.join(" "),
			attrs: frozenAttrs,
			attrPairs: frozenPairs
		});
		if (mutableConfig.cache) {
			selectorCache.set(source, plan);
			trimSelectorCache();
		}
		return plan;
	}
	function parse(input = "div") {
		return parsePlan(input);
	}
	function setAttributeValue(element, name, value, namespace = null) {
		if (value == null || value === false) return;
		const normalized = value === true ? "" : String(value);
		if (namespace) {
			element.setAttributeNS(namespace, name, normalized);
			return;
		}
		element.setAttribute(name, normalized);
	}
	function applySelectorAttributes(element, attrPairs) {
		for (let index = 0; index < attrPairs.length; index += 2) element.setAttribute(attrPairs[index], attrPairs[index + 1]);
	}
	function applyAttributes(element, values) {
		for (const key in values) {
			if (!hasOwn.call(values, key)) continue;
			const value = values[key];
			if (key.startsWith("xlink:")) {
				setAttributeValue(element, key, value, XLINK_NAMESPACE);
				continue;
			}
			if (key.startsWith("xml:")) {
				setAttributeValue(element, key, value, XML_NAMESPACE);
				continue;
			}
			setAttributeValue(element, key, value);
		}
	}
	function applyStyle(element, value) {
		const style = element.style;
		if (!style) return;
		if (typeof value === "string") {
			style.cssText = value;
			return;
		}
		for (const key in value) {
			if (!hasOwn.call(value, key)) continue;
			const styleValue = value[key];
			if (styleValue == null || styleValue === false) continue;
			const normalized = String(styleValue);
			if (key.charCodeAt(0) === 45 || key.includes("-")) {
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
	/**
	* Converts:
	*
	*   userId
	*
	* to:
	*
	*   data-user-id
	*
	* without regex callbacks.
	*/
	function dataAttributeName(key) {
		let firstUppercase = -1;
		for (let index = 0; index < key.length; index += 1) {
			const code = key.charCodeAt(index);
			if (code >= 65 && code <= 90) {
				firstUppercase = index;
				break;
			}
		}
		if (firstUppercase < 0) return `data-${key}`;
		let result = "data-" + key.slice(0, firstUppercase);
		for (let index = firstUppercase; index < key.length; index += 1) {
			const code = key.charCodeAt(index);
			if (code >= 65 && code <= 90) result += "-" + String.fromCharCode(code + 32);
			else result += key.charAt(index);
		}
		return result;
	}
	function applyData(element, values) {
		for (const key in values) {
			if (!hasOwn.call(values, key)) continue;
			const value = values[key];
			if (value == null || value === false) continue;
			element.setAttribute(dataAttributeName(key), String(value));
		}
	}
	function applyListeners(element, listeners) {
		for (const eventName in listeners) {
			if (!hasOwn.call(listeners, eventName)) continue;
			const declaration = listeners[eventName];
			if (!declaration) continue;
			let handler;
			let options;
			if (Array.isArray(declaration)) {
				handler = declaration[0];
				options = declaration[1];
			} else if (typeof declaration === "object" && "handler" in declaration && !isNodeFast(declaration)) {
				handler = declaration.handler;
				options = declaration.options;
			} else handler = declaration;
			if (typeof handler === "function" || handler && typeof handler === "object" && typeof handler.handleEvent === "function") element.addEventListener(eventName, handler, options);
		}
	}
	/**
	* Flattens classes into a single string.
	*
	* We intentionally avoid classList.add() for every token because every call
	* crosses the JS -> DOM boundary.
	*/
	function collectClassValue(value, output) {
		if (value == null || value === false || value === true) return;
		if (typeof value === "string" || typeof value === "number") {
			const textValue = String(value).trim();
			if (textValue) output.push(textValue);
			return;
		}
		if (Array.isArray(value)) {
			for (let index = 0; index < value.length; index += 1) collectClassValue(value[index], output);
			return;
		}
		for (const key in value) if (hasOwn.call(value, key) && value[key]) output.push(key);
	}
	function appendClassString(element, className) {
		if (!className) return;
		if (element.namespaceURI === HTML_NAMESPACE) {
			const htmlElement = element;
			const existing = htmlElement.className;
			htmlElement.className = existing ? `${existing} ${className}` : className;
			return;
		}
		const existing = element.getAttribute("class");
		element.setAttribute("class", existing ? `${existing} ${className}` : className);
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
	function isCipoRuntime(value) {
		if (!value || typeof value !== "object" && typeof value !== "function") return false;
		const candidate = value;
		return typeof candidate.css === "function" || typeof candidate.sheet?.css === "function" || typeof candidate.compile === "function";
	}
	function readGlobalCipo() {
		if (mutableConfig.cipo) return mutableConfig.cipo;
		try {
			if (typeof Cipo !== "undefined" && isCipoRuntime(Cipo)) return Cipo;
		} catch {}
		for (let index = 0; index < roots.length; index += 1) try {
			const candidate = roots[index].Cipo;
			if (isCipoRuntime(candidate)) return candidate;
		} catch {}
		return null;
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
		if (!output || typeof output !== "object") return "";
		const record = output;
		const cssText = record.cssText;
		if (typeof cssText === "string") return cssText;
		const css = record.css;
		if (typeof css === "string") return css;
		const code = record.code;
		if (typeof code === "string") return code;
		const value = record.value;
		if (typeof value === "string") return value;
		const text = record.text;
		if (typeof text === "string") return text;
		const toStringValue = record.toString;
		if (typeof toStringValue === "function") try {
			const result = Reflect.apply(toStringValue, output, []);
			if (typeof result === "string" && result !== "[object Object]") return result;
		} catch {}
		return "";
	}
	/**
	* Attempts one compiler invocation and normalizes the result.
	*/
	function tryCssCompiler(owner, compiler, argument) {
		if (typeof compiler !== "function") return "";
		try {
			return cssOutputToString(Reflect.apply(compiler, owner, [argument])).trim();
		} catch {
			return "";
		}
	}
	/**
	* Resolves the runtime invocation shape once.
	*
	* Cipó APIs may expose:
	*
	*   sheet.css(template)
	*   sheet.css(string)
	*   css(template)
	*   css(string)
	*   compile(template)
	*   compile(string)
	*
	* Once one works, RodElements skips all probing on subsequent calls.
	*/
	function compileWithCipo(source) {
		const runtime = readGlobalCipo();
		if (!runtime) return "";
		if (cssCompilerAdapter && cssCompilerRuntime === runtime) return cssCompilerAdapter(source);
		cssCompilerAdapter = null;
		cssCompilerRuntime = runtime;
		const template = templateFromString(source);
		const candidates = [
			[runtime.sheet, runtime.sheet?.css],
			[runtime, runtime.css],
			[runtime, runtime.compile]
		];
		for (let index = 0; index < candidates.length; index += 1) {
			const owner = candidates[index][0];
			const compiler = candidates[index][1];
			if (typeof compiler !== "function") continue;
			let result = tryCssCompiler(owner, compiler, template);
			if (result) {
				cssCompilerAdapter = (nextSource) => {
					const nextTemplate = templateFromString(nextSource);
					return tryCssCompiler(owner, compiler, nextTemplate);
				};
				return result;
			}
			result = tryCssCompiler(owner, compiler, source);
			if (result) {
				cssCompilerAdapter = (nextSource) => tryCssCompiler(owner, compiler, nextSource);
				return result;
			}
		}
		return "";
	}
	function compileCss(input) {
		const source = cssInputToString(input).trim();
		if (!source) return "";
		if (mutableConfig.cssCache) {
			const cached = compiledCssCache.get(source);
			if (cached !== void 0) return cached;
		}
		const result = (compileWithCipo(source) || source).trim();
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
		const existing = cssRuleByCompiled.get(compiled);
		if (existing) return existing;
		const base = `rod-cipo-${hashCss(compiled)}`;
		let className = base;
		let collisionIndex = 0;
		/**
		* O(1) collision lookup.
		*
		* Hash collisions should be astronomically rare, but correctness costs
		* almost nothing here.
		*/
		while (true) {
			const collision = cssRuleByClass.get(className);
			if (!collision) break;
			if (collision.compiled === compiled) return collision;
			collisionIndex += 1;
			className = `${base}-${collisionIndex}`;
		}
		const record = Object.freeze({
			className,
			compiled,
			rule: `\n.${className}{\n${compiled}\n}\n`
		});
		cssRuleByCompiled.set(compiled, record);
		cssRuleByClass.set(className, record);
		return record;
	}
	function styleRootFor(element, explicit) {
		if (isDocument(explicit) || isShadowRoot(explicit)) return explicit;
		const currentRoot = element.getRootNode?.();
		if (isShadowRoot(currentRoot)) return currentRoot;
		return element.ownerDocument ?? resolveDocument();
	}
	/**
	* Important:
	*
	* We deliberately do NOT use style.isConnected here.
	*
	* A perfectly valid <style> can live inside a detached ShadowRoot and
	* therefore report isConnected === false.
	*/
	function styleBelongsToRoot(style, root) {
		if (isDocument(root)) return style.ownerDocument === root && style.parentNode !== null;
		return style.parentNode === root;
	}
	function ensureStyleElement(root) {
		const cached = styleElements.get(root);
		if (cached && styleBelongsToRoot(cached, root)) return cached;
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
		let style = styleElements.get(root);
		if (!style || !styleBelongsToRoot(style, root)) {
			style = ensureStyleElement(root);
			installed = installedRules.get(root);
		}
		if (!installed) {
			installed = /* @__PURE__ */ new Set();
			installedRules.set(root, installed);
		}
		if (installed.has(record.className)) return;
		style.appendChild((isDocument(root) ? root : root.ownerDocument).createTextNode(record.rule));
		installed.add(record.className);
	}
	function flushPendingCssMounts() {
		cssMountScheduled = false;
		for (const [element, record] of pendingCssMounts) {
			const currentRoot = element.getRootNode?.();
			if (isShadowRoot(currentRoot)) installCssRule(currentRoot, record);
		}
		pendingCssMounts.clear();
	}
	function scheduleCssMount(element, record) {
		pendingCssMounts.set(element, record);
		if (cssMountScheduled) return;
		cssMountScheduled = true;
		queueMicrotask(flushPendingCssMounts);
	}
	function mountCss(element, root) {
		const record = elementCssRecords.get(element);
		if (!record) return element;
		installCssRule(styleRootFor(element, root), record);
		return element;
	}
	/**
	* Returns the generated class instead of immediately mutating classList.
	*
	* applyProps() can aggregate it with all other dynamic classes and perform
	* one class attribute update.
	*/
	function applyCss(element, value, explicitRoot) {
		const compiled = compileCss(value);
		if (!compiled) return "";
		const record = ruleForCss(compiled);
		elementCssRecords.set(element, record);
		installCssRule(styleRootFor(element, explicitRoot), record);
		/**
		* Explicit destinations don't need relocation detection.
		*/
		if (!explicitRoot) {
			const currentRoot = element.getRootNode?.();
			/**
			* If the element already belongs to a ShadowRoot, styleRootFor() has
			* installed the rule correctly. Otherwise schedule one shared check to
			* catch:
			*
			*   const node = el(... css ...)
			*   shadow.append(node)
			*
			* in the same synchronous turn.
			*/
			if (!isShadowRoot(currentRoot)) scheduleCssMount(element, record);
		}
		return record.className;
	}
	function applyProps(element, props) {
		if (!props) return {
			ref: null,
			className: ""
		};
		let ref = null;
		let classes = null;
		const propsRecord = props;
		for (const key in propsRecord) {
			if (!hasOwn.call(propsRecord, key)) continue;
			const value = propsRecord[key];
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
					if (value != null && value !== false) {
						const generatedClass = applyCss(element, value, props.$cssRoot);
						if (generatedClass) {
							if (!classes) classes = [];
							classes.push(generatedClass);
						}
					}
					continue;
				case "class":
				case "className":
					if (!classes) classes = [];
					collectClassValue(value, classes);
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
			/**
			* Direct event properties:
			*
			*   onclick
			*   oninput
			*   onchange
			*
			* stay direct properties rather than addEventListener().
			*/
			if (key.length > 2 && key.charCodeAt(0) === 111 && key.charCodeAt(1) === 110 && typeof value === "function") try {
				element[key.toLowerCase()] = value;
				continue;
			} catch {}
			applyGenericProp(element, key, value);
		}
		return {
			ref,
			className: classes ? classes.join(" ") : ""
		};
	}
	function appendOne(parent, child, documentRef) {
		if (child == null || child === false || child === true) return;
		if (isNodeFast(child)) {
			parent.appendChild(child);
			return;
		}
		if (Array.isArray(child)) {
			for (let index = 0; index < child.length; index += 1) appendOne(parent, child[index], documentRef);
			return;
		}
		parent.appendChild(documentRef.createTextNode(String(child)));
	}
	function appendChildren(parent, children, documentRef) {
		for (let index = 0; index < children.length; index += 1) appendOne(parent, children[index], documentRef);
	}
	function append(parent, ...children) {
		if (!isNode(parent)) throw new TypeError("[RodElements] append(parent): parent must be a Node.");
		appendChildren(parent, children, parent.ownerDocument ?? (isDocument(parent) ? parent : null) ?? resolveDocument());
		return parent;
	}
	function createCore(selector, propsOrChild, children, documentOverride, namespaceOverride) {
		const plan = parsePlan(selector);
		const hasProps = isPropsObject(propsOrChild);
		const props = hasProps ? propsOrChild : null;
		/**
		* withDocument() / bound facade wins over user-supplied $document,
		* preserving v1.1 semantics without cloning props.
		*/
		const documentRef = resolveDocument(documentOverride ?? props?.$document);
		/**
		* svg() override wins over props.$namespace, preserving existing behavior
		* without creating { ...props, $namespace }.
		*/
		const namespace = namespaceOverride ?? props?.$namespace ?? HTML_NAMESPACE;
		const element = namespace === HTML_NAMESPACE ? documentRef.createElement(plan.tag) : documentRef.createElementNS(namespace, plan.tag);
		if (plan.id) element.id = plan.id;
		/**
		* Selector classes are one DOM write.
		*/
		if (plan.className) {
			if (namespace === HTML_NAMESPACE) element.className = plan.className;
			else element.setAttribute("class", plan.className);
		}
		/**
		* Flat attribute plan avoids Object.entries(plan.attrs) per creation.
		*/
		if (plan.attrPairs.length) applySelectorAttributes(element, plan.attrPairs);
		const result = applyProps(element, props);
		/**
		* All dynamic classes, including CSS-generated classes, cross the DOM
		* boundary once.
		*/
		if (result.className) appendClassString(element, result.className);
		if (!hasProps && propsOrChild !== void 0) appendOne(element, propsOrChild, documentRef);
		if (children.length) appendChildren(element, children, documentRef);
		if (mutableConfig.debug) {
			try {
				element["__rodElement"] = selector || "div";
			} catch {}
			if (mutableConfig.debugAttribute) element.setAttribute("data-rod-element", selector || "div");
		}
		result.ref?.(element);
		return element;
	}
	function el(selector = "div", propsOrChild, ...children) {
		return createCore(selector, propsOrChild, children, void 0, void 0);
	}
	function svg(selector = "svg", propsOrChild, ...children) {
		return createCore(selector, propsOrChild, children, void 0, SVG_NAMESPACE);
	}
	function fragment(...children) {
		const documentRef = resolveDocument();
		const result = documentRef.createDocumentFragment();
		appendChildren(result, children, documentRef);
		return result;
	}
	function fragmentWithDocument(documentRef, ...children) {
		const resolved = resolveDocument(documentRef);
		const result = resolved.createDocumentFragment();
		appendChildren(result, children, resolved);
		return result;
	}
	function text(value, documentRef) {
		return resolveDocument(documentRef).createTextNode(value == null ? "" : String(value));
	}
	function resetCssCompiler() {
		cssCompilerAdapter = null;
		cssCompilerRuntime = null;
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
			resetCssCompiler();
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
		for (let index = 0; index < roots.length; index += 1) {
			const root = roots[index];
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
		const normalized = String(selector).trim() || "div";
		if (normalized === "div")
 /**
		* DIV_PLAN is a static constant and therefore doesn't need clearing.
		*/
		return false;
		return selectorCache.delete(normalized);
	}
	function clearCssCache() {
		const hadEntries = compiledCssCache.size > 0 || cssRuleByCompiled.size > 0 || cssRuleByClass.size > 0 || knownStyleRoots.size > 0 || pendingCssMounts.size > 0;
		compiledCssCache.clear();
		cssRuleByCompiled.clear();
		cssRuleByClass.clear();
		pendingCssMounts.clear();
		cssMountScheduled = false;
		/**
		* WeakMap has no clear().
		*
		* Replacing it invalidates every previously associated element without
		* needing to retain strong references to DOM nodes.
		*/
		elementCssRecords = /* @__PURE__ */ new WeakMap();
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
				scopedRules: cssRuleByCompiled.size,
				styleRoots: knownStyleRoots.size,
				pendingMounts: pendingCssMounts.size,
				compilerResolved: cssCompilerAdapter !== null
			})
		});
	}
	function noConflict() {
		for (let index = 0; index < previousValues.length; index += 1) {
			const entry = previousValues[index];
			try {
				if (entry.root[GLOBAL_NAME] !== api) continue;
				if (entry.value === void 0) delete entry.root[GLOBAL_NAME];
				else entry.root[GLOBAL_NAME] = entry.value;
			} catch {}
		}
		return api;
	}
	function withDocument(documentRef) {
		const boundDocument = resolveDocument(documentRef);
		function boundEl(selector = "div", propsOrChild, ...children) {
			return createCore(selector, propsOrChild, children, boundDocument, void 0);
		}
		function boundSvg(selector = "svg", propsOrChild, ...children) {
			return createCore(selector, propsOrChild, children, boundDocument, SVG_NAMESPACE);
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
