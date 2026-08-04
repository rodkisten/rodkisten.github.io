// @global RodToaster
// @outfile dist/toaster.js
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

/* Userscript managers may expose these globals lexically instead of on Window. */
declare const unsafeWindow: unknown;
declare const Cipo: unknown;

type Nullish = null | undefined;
type AttributePrimitive = string | number | bigint | boolean | Nullish;
type StylePrimitive = string | number | boolean | Nullish;
type CssInput = string | String | { readonly cssText: string } | { toString(): string };

type RodChild =
  | Node
  | string
  | number
  | bigint
  | boolean
  | Nullish
  | readonly RodChild[];

type ClassValue =
  | string
  | number
  | boolean
  | Nullish
  | readonly ClassValue[]
  | Readonly<Record<string, unknown>>;

type StyleObject = Readonly<Record<string, StylePrimitive>>;
type AttributeMap = Readonly<Record<string, AttributePrimitive>>;
type DatasetMap = Readonly<Record<string, AttributePrimitive>>;

type ListenerOptions = boolean | AddEventListenerOptions;
type ListenerHandler = EventListenerOrEventListenerObject;
type ListenerDeclaration =
  | ListenerHandler
  | readonly [ListenerHandler, ListenerOptions?]
  | {
      readonly handler: ListenerHandler;
      readonly options?: ListenerOptions;
    }
  | false
  | Nullish;

type ListenerMap = Readonly<Record<string, ListenerDeclaration>>;

type SpecialPropKey =
  | "text"
  | "html"
  | "css"
  | "class"
  | "className"
  | "style"
  | "data"
  | "dataset"
  | "attr"
  | "attrs"
  | "on"
  | "$ref"
  | "$document"
  | "$namespace"
  | "$cssRoot";

type NativeProps<TElement extends Element> = Partial<
  Omit<TElement, SpecialPropKey | "children" | "childNodes" | "parentNode" | "ownerDocument">
>;

type RodElementProps<TElement extends Element = Element> = NativeProps<TElement> & {
  /** Writes directly to `element.textContent`. */
  readonly text?: unknown;
  /** Writes directly to `element.innerHTML`. Content is not sanitized. */
  readonly html?: unknown;
  /**
   * Scoped Cipó/CSS declaration block.
   *
   * A plain string is compiled through Cipó when available. The result is
   * installed as `.generated-class { ... }` and the class is added to the
   * element. CSS nesting with `&` is supported by modern browsers.
   */
  readonly css?: CssInput | false | Nullish;
  readonly class?: ClassValue;
  readonly className?: ClassValue;
  readonly style?: string | StyleObject;
  readonly data?: DatasetMap;
  readonly dataset?: DatasetMap;
  readonly attr?: AttributeMap;
  readonly attrs?: AttributeMap;
  readonly on?: ListenerMap;
  readonly $ref?: ((element: TElement) => void) | Nullish;
  readonly $document?: Document | Nullish;
  readonly $namespace?: string | Nullish;
  /** Explicit style destination for elements that will live in a ShadowRoot. */
  readonly $cssRoot?: Document | ShadowRoot | Nullish;
};

interface ParsedSelector {
  readonly tag: string;
  readonly id: string;
  readonly classes: readonly string[];
  readonly className: string;
  readonly attrs: Readonly<Record<string, string>>;
}

interface RodElementsConfig {
  readonly cache: boolean;
  readonly cacheSize: number;
  readonly cssCache: boolean;
  readonly debug: boolean;
  readonly debugAttribute: boolean;
  readonly publishUnsafeWindow: boolean;
  readonly document: Document | null;
  readonly cipo: CipoRuntimeLike | null;
  readonly styleNonce: string;
}

type RodElementsConfigureOptions = Partial<{
  cache: boolean;
  cacheSize: number;
  cssCache: boolean;
  debug: boolean;
  debugAttribute: boolean;
  publishUnsafeWindow: boolean;
  document: Document;
  cipo: CipoRuntimeLike | null;
  styleNonce: string;
}>;

interface SelectorCacheStats {
  readonly enabled: boolean;
  readonly size: number;
  readonly maxSize: number;
  readonly keys: readonly string[];
}

interface CssCacheStats {
  readonly enabled: boolean;
  readonly compiledEntries: number;
  readonly scopedRules: number;
  readonly styleRoots: number;
}

interface RodElementsCacheStats extends SelectorCacheStats {
  readonly css: CssCacheStats;
}

interface CipoCssContainer {
  readonly css?: unknown;
}

interface CipoRuntimeLike {
  readonly version?: string;
  readonly css?: unknown;
  readonly sheet?: CipoCssContainer | null;
  readonly compile?: unknown;
}

interface BoundRodElements {
  el(): HTMLDivElement;
  el<TSelector extends string>(
    selector: TSelector,
    propsOrChild?: RodElementProps<HtmlElementForSelector<TSelector>> | RodChild,
    ...children: RodChild[]
  ): HtmlElementForSelector<TSelector>;
  el<TElement extends HTMLElement>(
    selector: string,
    propsOrChild?: RodElementProps<TElement> | RodChild,
    ...children: RodChild[]
  ): TElement;
  createElement: BoundRodElements["el"];
  svg(): SVGSVGElement;
  svg<TSelector extends string>(
    selector: TSelector,
    propsOrChild?: RodElementProps<SvgElementForSelector<TSelector>> | RodChild,
    ...children: RodChild[]
  ): SvgElementForSelector<TSelector>;
  svg<TElement extends SVGElement>(
    selector: string,
    propsOrChild?: RodElementProps<TElement> | RodChild,
    ...children: RodChild[]
  ): TElement;
  fragment(...children: RodChild[]): DocumentFragment;
  text(value: unknown): Text;
}

interface RodElementsApi extends BoundRodElements {
  readonly version: string;
  append<TNode extends Node>(parent: TNode, ...children: RodChild[]): TNode;
  parse(selector?: string): ParsedSelector;
  isNode(value: unknown): value is Node;
  compileCss(input: CssInput): string;
  mountCss(element: Element, root?: Document | ShadowRoot): Element;
  configure(options?: RodElementsConfigureOptions): RodElementsConfig;
  getConfig(): RodElementsConfig;
  clearCache(selector?: string): boolean;
  clearCssCache(): boolean;
  getCacheStats(): RodElementsCacheStats;
  withDocument(documentRef: Document): BoundRodElements;
  noConflict(): RodElementsApi;
  readonly __rodElements__?: true;
}

/** Ambient global exposed by the emitted IIFE. */
declare const RodElements: RodElementsApi;

interface Window {
  RodElements: RodElementsApi;
}

interface GlobalRoot extends Record<string, unknown> {
  document?: Document;
  RodElements?: RodElementsApi;
  Cipo?: unknown;
}

interface PreviousGlobalValue {
  readonly root: GlobalRoot;
  readonly value: unknown;
}

interface FactoryEnvironment {
  readonly version: string;
  readonly signature: string;
  readonly globalName: string;
  readonly defaultDocument: Document | null;
  readonly roots: readonly GlobalRoot[];
  readonly previousValues: readonly PreviousGlobalValue[];
}

interface CssRuleRecord {
  readonly className: string;
  readonly compiled: string;
  readonly rule: string;
}


type SelectorTag<TSelector extends string> =
  TSelector extends `${infer TTag}#${string}`
    ? TTag
    : TSelector extends `${infer TTag}.${string}`
      ? TTag
      : TSelector extends `${infer TTag}[${string}`
        ? TTag
        : TSelector;

type HtmlElementForSelector<TSelector extends string> =
  SelectorTag<TSelector> extends keyof HTMLElementTagNameMap
    ? HTMLElementTagNameMap[SelectorTag<TSelector>]
    : HTMLElement;

type SvgElementForSelector<TSelector extends string> =
  SelectorTag<TSelector> extends keyof SVGElementTagNameMap
    ? SVGElementTagNameMap[SelectorTag<TSelector>]
    : SVGElement;

type StyleRoot = Document | ShadowRoot;
type UnknownCallable = (...args: unknown[]) => unknown;

(function installRodElements(
  factory: (environment: FactoryEnvironment) => RodElementsApi,
): void {
  "use strict";

  const VERSION = "1.1.0";
  const SIGNATURE = "__rodElements__";
  const GLOBAL_NAME = "RodElements";
  const roots: GlobalRoot[] = [];

  const localRoot = globalThis as unknown as GlobalRoot;

  function addRoot(value: unknown): void {
    if (!value || (typeof value !== "object" && typeof value !== "function")) return;
    const root = value as GlobalRoot;
    if (!roots.includes(root)) roots.push(root);
  }

  addRoot(localRoot);
  if (typeof window !== "undefined") addRoot(window);
  if (typeof self !== "undefined") addRoot(self);

  try {
    if (typeof unsafeWindow !== "undefined") addRoot(unsafeWindow);
  } catch {
    // Some userscript managers expose a throwing lexical binding.
  }

  let existing: RodElementsApi | null = null;

  for (const root of roots) {
    try {
      const candidate = root[GLOBAL_NAME];
      if (
        isObjectLike(candidate) &&
        candidate[SIGNATURE] === true &&
        candidate.version === VERSION
      ) {
        existing = candidate as unknown as RodElementsApi;
        break;
      }
    } catch {
      // A cross-realm global may reject property reads.
    }
  }

  if (existing) {
    for (const root of roots) {
      try {
        if (!root[GLOBAL_NAME]) root[GLOBAL_NAME] = existing;
      } catch {
        // Publication is best effort across userscript realms.
      }
    }
    return;
  }

  const defaultDocument =
    roots.find((root) => isDocument(root.document))?.document ??
    (typeof document !== "undefined" ? document : null);

  const previousValues: PreviousGlobalValue[] = [];
  for (const root of roots) {
    try {
      previousValues.push({ root, value: root[GLOBAL_NAME] });
    } catch {
      // Ignore inaccessible realm.
    }
  }

  const api = factory({
    version: VERSION,
    signature: SIGNATURE,
    globalName: GLOBAL_NAME,
    defaultDocument,
    roots,
    previousValues,
  });

  for (const root of roots) {
    try {
      root[GLOBAL_NAME] = api;
    } catch {
      // Publication is best effort.
    }
  }

  function isObjectLike(value: unknown): value is Record<string, unknown> {
    return value !== null && (typeof value === "object" || typeof value === "function");
  }

  function isDocument(value: unknown): value is Document {
    return Boolean(
      value &&
        typeof value === "object" &&
        typeof (value as Partial<Document>).createElement === "function" &&
        (value as Partial<Document>).nodeType === 9,
    );
  }
})(function createRodElements(environment: FactoryEnvironment): RodElementsApi {
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
  const selectorCache = new Map<string, ParsedSelector>();
  const compiledCssCache = new Map<string, string>();
  const cssRuleCache = new Map<string, CssRuleRecord>();
  const styleElements = new WeakMap<StyleRoot, HTMLStyleElement>();
  const installedRules = new WeakMap<StyleRoot, Set<string>>();
  const knownStyleRoots = new Set<StyleRoot>();

  const mutableConfig: {
    cache: boolean;
    cacheSize: number;
    cssCache: boolean;
    debug: boolean;
    debugAttribute: boolean;
    publishUnsafeWindow: boolean;
    document: Document | null;
    cipo: CipoRuntimeLike | null;
    styleNonce: string;
  } = {
    cache: true,
    cacheSize: 256,
    cssCache: true,
    debug: false,
    debugAttribute: false,
    publishUnsafeWindow: true,
    document: environment.defaultDocument,
    cipo: null,
    styleNonce: "",
  };

  let api!: RodElementsApi;

  function isNode(value: unknown): value is Node {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Partial<Node>;
    return typeof candidate.nodeType === "number" && typeof candidate.nodeName === "string";
  }

  function isElement(value: unknown): value is Element {
    return isNode(value) && value.nodeType === 1 && typeof (value as Partial<Element>).setAttribute === "function";
  }

  function isDocument(value: unknown): value is Document {
    return isNode(value) && value.nodeType === 9 && typeof (value as Partial<Document>).createElement === "function";
  }

  function isShadowRoot(value: unknown): value is ShadowRoot {
    return Boolean(
      value &&
        typeof value === "object" &&
        (value as Partial<ShadowRoot>).nodeType === 11 &&
        "host" in value &&
        typeof (value as Partial<ShadowRoot>).appendChild === "function",
    );
  }

  function isPropsObject(value: unknown): value is RodElementProps<Element> {
    return value !== null && typeof value === "object" && !Array.isArray(value) && !isNode(value);
  }

  function resolveDocument(preferred?: Document | Nullish): Document {
    const resolved = preferred ?? mutableConfig.document;
    if (!isDocument(resolved)) {
      throw new Error(
        "[RodElements] No usable document is available. " +
          "Provide one with RodElements.configure({ document }).",
      );
    }
    return resolved;
  }

  function trimSelectorCache(): void {
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

  function isNameCode(code: number): boolean {
    return (
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      (code >= 48 && code <= 57) ||
      code === 45 ||
      code === 95
    );
  }

  function parse(input: string = "div"): ParsedSelector {
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
    const classes: string[] = [];
    const attrs: Record<string, string> = Object.create(null) as Record<string, string>;

    const first = source.charCodeAt(0);
    if ((first >= 65 && first <= 90) || (first >= 97 && first <= 122)) {
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
        if (cursor === start) {
          throw new SyntaxError(`[RodElements] Invalid selector token in: ${source}`);
        }
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
            if (cursor >= length) {
              throw new SyntaxError(`[RodElements] Unclosed quoted attribute in selector: ${source}`);
            }
            value = source.slice(valueStart, cursor);
            cursor += 1;
          } else {
            const valueStart = cursor;
            while (cursor < length && source.charCodeAt(cursor) !== 93) cursor += 1;
            value = source.slice(valueStart, cursor).trim();
          }

          while (cursor < length && source.charCodeAt(cursor) <= 32) cursor += 1;
        }

        if (source.charCodeAt(cursor) !== 93) {
          throw new SyntaxError(`[RodElements] Unclosed attribute in selector: ${source}`);
        }
        cursor += 1;
        attrs[name] = value;
        continue;
      }

      if (marker <= 32) {
        cursor += 1;
        continue;
      }

      throw new SyntaxError(
        `[RodElements] Unsupported selector syntax near \`${source.slice(cursor)}\` in: ${source}`,
      );
    }

    const frozenClasses = Object.freeze(classes.slice());
    const frozenAttrs = Object.freeze({ ...attrs });
    const parsed: ParsedSelector = Object.freeze({
      tag,
      id,
      classes: frozenClasses,
      className: frozenClasses.join(" "),
      attrs: frozenAttrs,
    });

    if (mutableConfig.cache) {
      selectorCache.set(source, parsed);
      trimSelectorCache();
    }

    return parsed;
  }

  function setAttributeValue(
    element: Element,
    name: string,
    value: AttributePrimitive,
    namespace: string | null = null,
  ): void {
    if (value == null || value === false) return;
    const normalized = value === true ? "" : String(value);
    if (namespace) element.setAttributeNS(namespace, name, normalized);
    else element.setAttribute(name, normalized);
  }

  function applyStyle(element: Element, value: string | StyleObject): void {
    const style = (element as HTMLElement | SVGElement).style;
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
        (style as unknown as Record<string, unknown>)[key] = styleValue;
      } catch {
        style.setProperty(key, normalized);
      }
    }
  }

  function dataAttributeName(key: string): string {
    return `data-${key.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)}`;
  }

  function applyData(element: Element, values: DatasetMap): void {
    for (const [key, value] of Object.entries(values)) {
      if (value == null || value === false) continue;
      element.setAttribute(dataAttributeName(key), String(value));
    }
  }

  function applyAttributes(element: Element, values: AttributeMap): void {
    for (const [key, value] of Object.entries(values)) {
      if (key.startsWith("xlink:")) setAttributeValue(element, key, value, XLINK_NAMESPACE);
      else if (key.startsWith("xml:")) setAttributeValue(element, key, value, XML_NAMESPACE);
      else setAttributeValue(element, key, value);
    }
  }

  function applyListeners(element: Element, listeners: ListenerMap): void {
    for (const [eventName, declaration] of Object.entries(listeners)) {
      if (!declaration) continue;

      let handler: ListenerHandler;
      let options: ListenerOptions | undefined;

      if (Array.isArray(declaration)) {
        handler = declaration[0];
        options = declaration[1];
      } else if (
        typeof declaration === "object" &&
        "handler" in declaration &&
        !isNode(declaration)
      ) {
        handler = declaration.handler;
        options = declaration.options;
      } else {
        handler = declaration as ListenerHandler;
      }

      if (
        typeof handler === "function" ||
        (handler && typeof handler === "object" && typeof handler.handleEvent === "function")
      ) {
        element.addEventListener(eventName, handler, options);
      }
    }
  }

  function appendClasses(element: Element, value: ClassValue): void {
    if (value == null || value === false || value === true) return;

    if (typeof value === "string" || typeof value === "number") {
      const textValue = String(value).trim();
      if (textValue) {
        for (const token of textValue.split(/\s+/)) {
          if (token) element.classList.add(token);
        }
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) appendClasses(element, item);
      return;
    }

    for (const [key, enabled] of Object.entries(value)) {
      if (enabled) appendClasses(element, key);
    }
  }

  function applyGenericProp(element: Element, key: string, value: unknown): void {
    if (value == null) return;
    const record = element as unknown as Record<string, unknown>;

    if (key in element) {
      try {
        record[key] = value;
        return;
      } catch {
        // Fall through to attribute semantics.
      }
    }

    if (value === false) {
      element.removeAttribute(key);
      return;
    }

    setAttributeValue(element, key, value as AttributePrimitive);
  }

  function readGlobalCipo(): CipoRuntimeLike | null {
    if (mutableConfig.cipo) return mutableConfig.cipo;

    try {
      if (typeof Cipo !== "undefined" && isCipoRuntime(Cipo)) return Cipo;
    } catch {
      // Lexical Cipo access can fail in isolated worlds.
    }

    for (const root of roots) {
      try {
        const candidate = root.Cipo;
        if (isCipoRuntime(candidate)) return candidate;
      } catch {
        // Ignore inaccessible realm.
      }
    }

    return null;
  }

  function isCipoRuntime(value: unknown): value is CipoRuntimeLike {
    if (!value || (typeof value !== "object" && typeof value !== "function")) return false;
    const candidate = value as CipoRuntimeLike;
    return (
      typeof candidate.css === "function" ||
      typeof candidate.sheet?.css === "function" ||
      typeof candidate.compile === "function"
    );
  }

  function cssInputToString(input: CssInput): string {
    if (typeof input === "string" || input instanceof String) return String(input);
    if ("cssText" in input && typeof input.cssText === "string") return input.cssText;
    const output = input.toString();
    return output === "[object Object]" ? "" : output;
  }

  function templateFromString(source: string): TemplateStringsArray {
    const strings = [source] as unknown as TemplateStringsArray;
    Object.defineProperty(strings, "raw", {
      value: [source],
      enumerable: false,
      configurable: false,
      writable: false,
    });
    return strings;
  }

  function cssOutputToString(output: unknown): string {
    if (typeof output === "string" || output instanceof String) return String(output);
    if (output && typeof output === "object") {
      const record = output as Record<string, unknown>;
      for (const key of ["cssText", "css", "code", "value", "text"]) {
        if (typeof record[key] === "string") return record[key] as string;
      }
      const toStringValue = record.toString;
      if (typeof toStringValue === "function") {
        const result = Reflect.apply(toStringValue as UnknownCallable, output, []);
        if (typeof result === "string" && result !== "[object Object]") return result;
      }
    }
    return "";
  }

  function callCssCompiler(owner: unknown, compiler: unknown, source: string): string {
    if (typeof compiler !== "function") return "";
    const callable = compiler as UnknownCallable;
    const template = templateFromString(source);

    for (const args of [[template], [source]] as const) {
      try {
        const output = Reflect.apply(callable, owner, [...args]);
        const textValue = cssOutputToString(output).trim();
        if (textValue) return textValue;
      } catch {
        // Try the next supported invocation shape.
      }
    }

    return "";
  }

  function compileCss(input: CssInput): string {
    const source = cssInputToString(input).trim();
    if (!source) return "";

    if (mutableConfig.cssCache) {
      const cached = compiledCssCache.get(source);
      if (cached !== undefined) return cached;
    }

    const cipo = readGlobalCipo();
    let compiled = "";

    if (cipo) {
      compiled =
        callCssCompiler(cipo.sheet, cipo.sheet?.css, source) ||
        callCssCompiler(cipo, cipo.css, source) ||
        callCssCompiler(cipo, cipo.compile, source);
    }

    const result = (compiled || source).trim();
    if (mutableConfig.cssCache) compiledCssCache.set(source, result);
    return result;
  }

  function hashCss(value: string): string {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function ruleForCss(compiled: string): CssRuleRecord {
    const cached = cssRuleCache.get(compiled);
    if (cached) return cached;

    const base = `rod-cipo-${hashCss(compiled)}`;
    let className = base;
    let collisionIndex = 0;

    while ([...cssRuleCache.values()].some((entry) => entry.className === className && entry.compiled !== compiled)) {
      collisionIndex += 1;
      className = `${base}-${collisionIndex}`;
    }

    const record: CssRuleRecord = Object.freeze({
      className,
      compiled,
      rule: `\n.${className}{\n${compiled}\n}\n`,
    });
    cssRuleCache.set(compiled, record);
    return record;
  }

  function styleRootFor(element: Element, explicit?: Document | ShadowRoot | Nullish): StyleRoot {
    if (isDocument(explicit) || isShadowRoot(explicit)) return explicit;
    const currentRoot = element.getRootNode?.();
    if (isShadowRoot(currentRoot)) return currentRoot;
    return element.ownerDocument ?? resolveDocument();
  }

  function ensureStyleElement(root: StyleRoot): HTMLStyleElement {
    const cached = styleElements.get(root);
    if (cached?.isConnected) return cached;

    const documentRef = isDocument(root) ? root : root.ownerDocument;
    const style = documentRef.createElement("style");
    style.id = `rod-elements-cipo-runtime-${VERSION.replace(/\W+/g, "-")}`;
    style.dataset["rodElements"] = VERSION;
    if (mutableConfig.styleNonce) style.nonce = mutableConfig.styleNonce;

    if (isDocument(root)) {
      (root.head || root.documentElement).appendChild(style);
    } else {
      root.appendChild(style);
    }

    styleElements.set(root, style);
    installedRules.set(root, new Set());
    knownStyleRoots.add(root);
    return style;
  }

  function installCssRule(root: StyleRoot, record: CssRuleRecord): void {
    let installed = installedRules.get(root);
    if (!installed) {
      ensureStyleElement(root);
      installed = installedRules.get(root) ?? new Set<string>();
      installedRules.set(root, installed);
    }
    if (installed.has(record.className)) return;

    ensureStyleElement(root).appendChild(
      (isDocument(root) ? root : root.ownerDocument).createTextNode(record.rule),
    );
    installed.add(record.className);
  }

  function mountCss(element: Element, root?: Document | ShadowRoot): Element {
    const className = element.getAttribute("data-rod-css-class");
    if (!className) return element;
    const record = [...cssRuleCache.values()].find((entry) => entry.className === className);
    if (!record) return element;
    installCssRule(styleRootFor(element, root), record);
    return element;
  }

  function applyCss(
    element: Element,
    value: CssInput,
    explicitRoot?: Document | ShadowRoot | Nullish,
  ): void {
    const compiled = compileCss(value);
    if (!compiled) return;

    const record = ruleForCss(compiled);
    element.classList.add(record.className);
    element.setAttribute("data-rod-css-class", record.className);
    installCssRule(styleRootFor(element, explicitRoot), record);

    // Most callers append synchronously. This second mount catches elements
    // inserted into a ShadowRoot immediately after creation.
    queueMicrotask(() => {
      if (!element.isConnected) return;
      const currentRoot = element.getRootNode?.();
      if (isShadowRoot(currentRoot)) installCssRule(currentRoot, record);
    });
  }

  function applyProps<TElement extends Element>(
    element: TElement,
    props: RodElementProps<TElement> | null,
  ): ((element: TElement) => void) | null {
    if (!props) return null;
    let ref: ((element: TElement) => void) | null = null;

    for (const key of Object.keys(props)) {
      const value = (props as unknown as Record<string, unknown>)[key];

      if (key === "$ref") {
        if (typeof value === "function") ref = value as (element: TElement) => void;
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
            applyCss(element, value as CssInput, props.$cssRoot);
          }
          continue;
        case "class":
        case "className":
          appendClasses(element, value as ClassValue);
          continue;
        case "style":
          if (typeof value === "string" || (value && typeof value === "object")) {
            applyStyle(element, value as string | StyleObject);
          }
          continue;
        case "data":
        case "dataset":
          if (value && typeof value === "object") applyData(element, value as DatasetMap);
          continue;
        case "attr":
        case "attrs":
          if (value && typeof value === "object") applyAttributes(element, value as AttributeMap);
          continue;
        case "on":
          if (value && typeof value === "object") applyListeners(element, value as ListenerMap);
          continue;
      }

      if (key.length > 2 && key.startsWith("on") && typeof value === "function") {
        try {
          (element as unknown as Record<string, unknown>)[key.toLowerCase()] = value;
          continue;
        } catch {
          // Generic fallback below.
        }
      }

      applyGenericProp(element, key, value);
    }

    return ref;
  }

  function appendOne(parent: Node, child: RodChild, documentRef: Document): void {
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

  function append<TNode extends Node>(parent: TNode, ...children: RodChild[]): TNode {
    if (!isNode(parent)) {
      throw new TypeError("[RodElements] append(parent): parent must be a Node.");
    }
    const documentRef =
      parent.ownerDocument ??
      (isDocument(parent) ? parent : null) ??
      resolveDocument();
    for (const child of children) appendOne(parent, child, documentRef);
    return parent;
  }

  function create<TElement extends Element>(
    selector: string = "div",
    propsOrChild?: RodElementProps<TElement> | RodChild,
    ...children: RodChild[]
  ): TElement {
    const parsed = parse(selector);
    const hasProps = isPropsObject(propsOrChild);
    const props = (hasProps ? propsOrChild : null) as RodElementProps<TElement> | null;
    const documentRef = resolveDocument(props?.$document);
    const namespace = props?.$namespace || HTML_NAMESPACE;

    const element = (
      namespace === HTML_NAMESPACE
        ? documentRef.createElement(parsed.tag)
        : documentRef.createElementNS(namespace, parsed.tag)
    ) as TElement;

    if (parsed.id) element.id = parsed.id;
    if (parsed.className) {
      if (namespace === HTML_NAMESPACE) (element as unknown as HTMLElement).className = parsed.className;
      else element.setAttribute("class", parsed.className);
    }
    for (const [name, value] of Object.entries(parsed.attrs)) {
      setAttributeValue(element, name, value);
    }

    const ref = applyProps(element, props);
    if (!hasProps && propsOrChild !== undefined) appendOne(element, propsOrChild as RodChild, documentRef);
    for (const child of children) appendOne(element, child, documentRef);

    if (mutableConfig.debug) {
      try {
        (element as unknown as Record<string, unknown>)["__rodElement"] = selector || "div";
      } catch {
        // Debug metadata is best effort.
      }
      if (mutableConfig.debugAttribute) element.setAttribute("data-rod-element", selector || "div");
    }

    ref?.(element);
    return element;
  }

  function el(): HTMLDivElement;
  function el<TSelector extends string>(
    selector: TSelector,
    propsOrChild?: RodElementProps<HtmlElementForSelector<TSelector>> | RodChild,
    ...children: RodChild[]
  ): HtmlElementForSelector<TSelector>;
  function el<TElement extends HTMLElement>(
    selector: string,
    propsOrChild?: RodElementProps<TElement> | RodChild,
    ...children: RodChild[]
  ): TElement;
  function el<TElement extends HTMLElement = HTMLDivElement>(
    selector: string = "div",
    propsOrChild?: RodElementProps<TElement> | RodChild,
    ...children: RodChild[]
  ): TElement {
    return create<TElement>(selector, propsOrChild, ...children);
  }

  function svg(): SVGSVGElement;
  function svg<TSelector extends string>(
    selector: TSelector,
    propsOrChild?: RodElementProps<SvgElementForSelector<TSelector>> | RodChild,
    ...children: RodChild[]
  ): SvgElementForSelector<TSelector>;
  function svg<TElement extends SVGElement>(
    selector: string,
    propsOrChild?: RodElementProps<TElement> | RodChild,
    ...children: RodChild[]
  ): TElement;
  function svg<TElement extends SVGElement = SVGSVGElement>(
    selector: string = "svg",
    propsOrChild?: RodElementProps<TElement> | RodChild,
    ...children: RodChild[]
  ): TElement {
    const hasProps = isPropsObject(propsOrChild);
    const props = (hasProps
      ? { ...(propsOrChild as RodElementProps<TElement>), $namespace: SVG_NAMESPACE }
      : { $namespace: SVG_NAMESPACE }) as unknown as RodElementProps<TElement>;

    if (hasProps) return create<TElement>(selector, props, ...children);
    if (propsOrChild === undefined) return create<TElement>(selector, props, ...children);
    return create<TElement>(selector, props, propsOrChild as RodChild, ...children);
  }

  function fragment(...children: RodChild[]): DocumentFragment {
    const documentRef = resolveDocument();
    const result = documentRef.createDocumentFragment();
    for (const child of children) appendOne(result, child, documentRef);
    return result;
  }

  function fragmentWithDocument(documentRef: Document, ...children: RodChild[]): DocumentFragment {
    const resolved = resolveDocument(documentRef);
    const result = resolved.createDocumentFragment();
    for (const child of children) appendOne(result, child, resolved);
    return result;
  }

  function text(value: unknown, documentRef?: Document): Text {
    return resolveDocument(documentRef).createTextNode(value == null ? "" : String(value));
  }

  function configure(options: RodElementsConfigureOptions = {}): RodElementsConfig {
    if (hasOwn.call(options, "cache")) mutableConfig.cache = Boolean(options.cache);
    if (hasOwn.call(options, "cssCache")) mutableConfig.cssCache = Boolean(options.cssCache);
    if (hasOwn.call(options, "debug")) mutableConfig.debug = Boolean(options.debug);
    if (hasOwn.call(options, "debugAttribute")) {
      mutableConfig.debugAttribute = Boolean(options.debugAttribute);
    }
    if (hasOwn.call(options, "publishUnsafeWindow")) {
      mutableConfig.publishUnsafeWindow = Boolean(options.publishUnsafeWindow);
    }
    if (hasOwn.call(options, "cacheSize")) {
      const value = Number(options.cacheSize);
      if (!Number.isFinite(value) || value < 0) {
        throw new TypeError("[RodElements] cacheSize must be a non-negative finite number.");
      }
      mutableConfig.cacheSize = Math.floor(value);
    }
    if (hasOwn.call(options, "document")) mutableConfig.document = resolveDocument(options.document);
    if (hasOwn.call(options, "cipo")) {
      if (options.cipo !== null && !isCipoRuntime(options.cipo)) {
        throw new TypeError("[RodElements] cipo must expose css, sheet.css or compile.");
      }
      mutableConfig.cipo = options.cipo ?? null;
      compiledCssCache.clear();
    }
    if (hasOwn.call(options, "styleNonce")) {
      mutableConfig.styleNonce = String(options.styleNonce ?? "");
    }

    trimSelectorCache();
    if (!mutableConfig.cssCache) compiledCssCache.clear();
    publishConfiguredRoots();
    return getConfig();
  }

  function getConfig(): RodElementsConfig {
    return Object.freeze({
      cache: mutableConfig.cache,
      cacheSize: mutableConfig.cacheSize,
      cssCache: mutableConfig.cssCache,
      debug: mutableConfig.debug,
      debugAttribute: mutableConfig.debugAttribute,
      publishUnsafeWindow: mutableConfig.publishUnsafeWindow,
      document: mutableConfig.document,
      cipo: readGlobalCipo(),
      styleNonce: mutableConfig.styleNonce,
    });
  }

  function isUnsafeRoot(root: GlobalRoot): boolean {
    try {
      return typeof unsafeWindow !== "undefined" && root === (unsafeWindow as GlobalRoot);
    } catch {
      return false;
    }
  }

  function publishConfiguredRoots(): void {
    for (const root of roots) {
      if (isUnsafeRoot(root) && !mutableConfig.publishUnsafeWindow) continue;
      try {
        root[GLOBAL_NAME] = api;
      } catch {
        // Best effort publication.
      }
    }
  }

  function clearCache(selector?: string): boolean {
    if (selector === undefined) {
      const hadEntries = selectorCache.size > 0;
      selectorCache.clear();
      return hadEntries;
    }
    return selectorCache.delete(String(selector).trim() || "div");
  }

  function clearCssCache(): boolean {
    const hadEntries = compiledCssCache.size > 0 || cssRuleCache.size > 0 || knownStyleRoots.size > 0;
    compiledCssCache.clear();
    cssRuleCache.clear();

    for (const root of knownStyleRoots) {
      const style = styleElements.get(root);
      style?.remove();
      styleElements.delete(root);
      installedRules.delete(root);
    }
    knownStyleRoots.clear();
    return hadEntries;
  }

  function getCacheStats(): RodElementsCacheStats {
    return Object.freeze({
      enabled: mutableConfig.cache,
      size: selectorCache.size,
      maxSize: mutableConfig.cacheSize,
      keys: Object.freeze([...selectorCache.keys()]),
      css: Object.freeze({
        enabled: mutableConfig.cssCache,
        compiledEntries: compiledCssCache.size,
        scopedRules: cssRuleCache.size,
        styleRoots: knownStyleRoots.size,
      }),
    });
  }

  function noConflict(): RodElementsApi {
    for (const entry of previousValues) {
      try {
        if (entry.root[GLOBAL_NAME] !== api) continue;
        if (entry.value === undefined) delete entry.root[GLOBAL_NAME];
        else entry.root[GLOBAL_NAME] = entry.value;
      } catch {
        // Best effort restoration.
      }
    }
    return api;
  }

  function withDocument(documentRef: Document): BoundRodElements {
    const boundDocument = resolveDocument(documentRef);

    function boundEl(): HTMLDivElement;
    function boundEl<TSelector extends string>(
      selector: TSelector,
      propsOrChild?: RodElementProps<HtmlElementForSelector<TSelector>> | RodChild,
      ...children: RodChild[]
    ): HtmlElementForSelector<TSelector>;
    function boundEl<TElement extends HTMLElement>(
      selector: string,
      propsOrChild?: RodElementProps<TElement> | RodChild,
      ...children: RodChild[]
    ): TElement;
    function boundEl<TElement extends HTMLElement = HTMLDivElement>(
      selector: string = "div",
      propsOrChild?: RodElementProps<TElement> | RodChild,
      ...children: RodChild[]
    ): TElement {
      const hasProps = isPropsObject(propsOrChild);
      const props = (hasProps
        ? { ...(propsOrChild as RodElementProps<TElement>), $document: boundDocument }
        : { $document: boundDocument }) as unknown as RodElementProps<TElement>;
      if (hasProps) return create<TElement>(selector, props, ...children);
      if (propsOrChild === undefined) return create<TElement>(selector, props, ...children);
      return create<TElement>(selector, props, propsOrChild as RodChild, ...children);
    }

    function boundSvg(): SVGSVGElement;
    function boundSvg<TSelector extends string>(
      selector: TSelector,
      propsOrChild?: RodElementProps<SvgElementForSelector<TSelector>> | RodChild,
      ...children: RodChild[]
    ): SvgElementForSelector<TSelector>;
    function boundSvg<TElement extends SVGElement>(
      selector: string,
      propsOrChild?: RodElementProps<TElement> | RodChild,
      ...children: RodChild[]
    ): TElement;
    function boundSvg<TElement extends SVGElement = SVGSVGElement>(
      selector: string = "svg",
      propsOrChild?: RodElementProps<TElement> | RodChild,
      ...children: RodChild[]
    ): TElement {
      const hasProps = isPropsObject(propsOrChild);
      const props = (hasProps
        ? {
            ...(propsOrChild as RodElementProps<TElement>),
            $document: boundDocument,
            $namespace: SVG_NAMESPACE,
          }
        : { $document: boundDocument, $namespace: SVG_NAMESPACE }) as unknown as RodElementProps<TElement>;
      if (hasProps) return create<TElement>(selector, props, ...children);
      if (propsOrChild === undefined) return create<TElement>(selector, props, ...children);
      return create<TElement>(selector, props, propsOrChild as RodChild, ...children);
    }

    return Object.freeze({
      el: boundEl,
      createElement: boundEl,
      svg: boundSvg,
      fragment: (...children: RodChild[]) => fragmentWithDocument(boundDocument, ...children),
      text: (value: unknown) => text(value, boundDocument),
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
    noConflict,
  };

  Object.defineProperty(api, SIGNATURE, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  Object.freeze(api);
  publishConfiguredRoots();
  return api;
});
