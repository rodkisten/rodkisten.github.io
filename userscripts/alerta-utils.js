// ==UserScript==
// @name         ⛱️ 000 / Alerta / Expanded Utils
// @namespace    https://rod.dev/userscripts
// @version      1.5.0
// @description  Shared utilities for Alerta Docked Inspector.
// @author       Rod
// @match        *://*/*
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/es-toolkit@^1
// @require      https://unpkg.com/lucide@0.468.0/dist/umd/lucide.js?v1
// @require      https://rodkisten.github.io/bundler/cipo.iife.js?v7
// @require      https://rodkisten.github.io/bundler/fabrica.iife.js?v7
// @weight       999
// @grant        none
// ==/UserScript==

(async function InstallRodUtils() {
  "use strict";

  try {
  

    /*const testStyles = Cipo.inline.css`color: $red; py: 2`
     console.log(testStyles, String(testStyles))
     
     return;*/
    /* ******************** */
    /* Constants            */
    /* ******************** */

    const GLOBAL_NAME = "RodUtils";
    const VERSION = "1.4.3";
    const DEBUG_FLAG = "__ROD_DEBUG__";
    
    window.__ROD_DEBUG__ = true;
    
    const STYLE_LOADER_PREFIX = "rod-utils-style-";
    const SCRIPT_LOADER_PREFIX = "rod-utils-script-";

    const REACT_PROPS_PREFIX = "__reactProps$";
    const REACT_FIBER_PREFIX = "__reactFiber$";
    const REACT_LEGACY_INSTANCE_PREFIX = "__reactInternalInstance$";

    const SIGNAL_SYMBOL = Symbol.for("rod.signal");

    const MAX_PRETTY_SOURCE_LENGTH = 250_000;
    const DEFAULT_TIMEOUT_MS = 10_000;
    const DEFAULT_LOADER_TIMEOUT_MS = 12_000;

    const MAX_INLINE_KEYS = 8;
    const MAX_TREE_KEYS = 120;
    const MAX_TABLE_ROWS = 120;
    const MAX_TABLE_COLUMNS = 24;

    const VIEWPORT_CONTENT =
      "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover";

    const CURRENT_EFFECT_STACK = [];
    const EFFECT_DEPS = new WeakMap();

    const loadedScripts = new Map();
    const loadedStyles = new Map();

    const eventListenerRegistry = new WeakMap();
    const eventListenerTargets = new Set();

    const nativeConsole = window.nativeConsole || console;
    const nativeAddEventListener = EventTarget.prototype.addEventListener;
    const nativeRemoveEventListener = EventTarget.prototype.removeEventListener;

    const module = { exports: {} };
    const exports = module.exports;

    /* ******************** */
    /* General Helpers      */
    /* ******************** */

    function defineGlobal(name, value, options = {}) {
      const immutable = options.immutable === true;
      const enumerable = options.enumerable === true;

      try {
        Object.defineProperty(window, name, {
          value,
          configurable: !immutable,
          enumerable,
          writable: !immutable,
        });

        return true;
      } catch {
        try {
          window[name] = value;
          return true;
        } catch {
          return false;
        }
      }
    }

    function hashText(value) {
      let hash = 5381;
      const text = String(value);

      for (let index = 0; index < text.length; index += 1) {
        hash = (hash * 33) ^ text.charCodeAt(index);
      }

      return Math.abs(hash >>> 0).toString(36);
    }

    function safeCall(callback, fallback = null) {
      try {
        return callback();
      } catch {
        return fallback;
      }
    }

    function safeRead(object, key, fallback = "[Throws]") {
      try {
        return object[key];
      } catch {
        return fallback;
      }
    }

    function isObjectLike(value) {
      return (
        value !== null &&
        (typeof value === "object" || typeof value === "function")
      );
    }

    function isPlainObject(value) {
      if (!value || typeof value !== "object") return false;
      const prototype = Object.getPrototypeOf(value);
      return prototype === null || prototype === Object.prototype;
    }

    function isPrimitive(value) {
      return (
        value === null ||
        (typeof value !== "object" && typeof value !== "function")
      );
    }

    function isInspectable(value) {
      return (
        value !== null &&
        (typeof value === "object" || typeof value === "function")
      );
    }

    function isObject(value) {
      return (
        value !== null && typeof value === "object" && !Array.isArray(value)
      );
    }

    function isNodeListLike(value) {
      return (
        value instanceof NodeList ||
        value instanceof HTMLCollection ||
        Boolean(
          value &&
          typeof value.length === "number" &&
          typeof value !== "string" &&
          typeof value.item === "function",
        )
      );
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function trimText(value, limit = 240) {
      const text = String(value ?? "");
      return text.length > limit ? `${text.slice(0, limit)}…` : text;
    }

    function dedent(value) {
      const text = String(value ?? "").replace(/\r\n?/g, "\n");
      const lines = text.split("\n");

      while (lines.length && !lines[0].trim()) lines.shift();
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

      const indents = lines
        .filter((line) => line.trim())
        .map((line) => line.match(/^\s*/)[0].length);

      const minIndent = indents.length ? Math.min(...indents) : 0;

      return lines.map((line) => line.slice(minIndent)).join("\n");
    }

    function formatBytes(bytes) {
      if (bytes == null || Number.isNaN(Number(bytes))) return "n/a";

      const units = ["B", "KB", "MB", "GB"];
      let value = Math.abs(Number(bytes));
      let unit = 0;

      while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
      }

      return `${bytes < 0 ? "-" : ""}${value.toFixed(2)} ${units[unit]}`;
    }

    function getMemorySnapshot() {
      const memory = performance?.memory;
      if (!memory) return null;

      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }

    function line(text, symbol = "•", size = 60, log = console.warn) {
      const label = ` ${text} `;
      const available = Math.max(0, size - label.length);
      const left = Math.floor(available / 2);
      const right = available - left;
      const output = `${symbol.repeat(left)}${label}${symbol.repeat(right)}`;

      log(output);

      return output;
    }

    /* ******************** */
    /* Logger               */
    /* ******************** */

    function isDebugEnabled() {
      return Boolean(window[DEBUG_FLAG]);
    }

    function setDebugEnabled(enabled) {
      defineGlobal(DEBUG_FLAG, Boolean(enabled), { immutable: false });
    }

    function createLogger(namespace) {
      function prefix(fn) {
        return `[${namespace}] [${fn || "anonymous"}]`;
      }

      function createMethod(level) {
        return function loggerMethod(fn, ...args) {
          if (!isDebugEnabled()) return;

          const output = nativeConsole[level] || nativeConsole.log;

          output.call(
            nativeConsole,
            `%c${prefix(fn)}`,
            "color:#a78bfa;font-weight:700;",
            ...args,
          );
        };
      }

      return Object.freeze({
        log: createMethod("log"),
        info: createMethod("info"),
        warn: createMethod("warn"),
        error: createMethod("error"),
        debug: createMethod("debug"),
        group: createMethod("group"),
        groupEnd() {
          nativeConsole.groupEnd?.();
        },
      });
    }

    function formatDebugNamespace(namespace) {
      return `Alerta:${String(namespace || "core")}`;
    }

    function writeDebug(namespace, level, message, ...payload) {
      if (!isDebugEnabled() && level !== "error" && level !== "warn") return;

      const method =
        nativeConsole[level] || nativeConsole.debug || nativeConsole.log;
      const badgeStyle =
        "color:#7dd3fc;background:rgba(125,211,252,.12);padding:2px 6px;border-radius:8px;font-weight:900";
      const textStyle =
        level === "error"
          ? "color:#ff7b72"
          : level === "warn"
            ? "color:#fbbf24"
            : "color:#e5e7eb";

      method.call(
        nativeConsole,
        `%c${formatDebugNamespace(namespace)}%c ${message}`,
        badgeStyle,
        textStyle,
        ...payload,
      );
    }

    function createDebugLogger(namespace) {
      const scopedName = String(namespace || "core");

      return {
        get enabled() {
          return isDebugEnabled();
        },

        setEnabled: setDebugEnabled,

        child(childNamespace) {
          return createDebugLogger(`${scopedName}:${childNamespace}`);
        },

        log(message, ...payload) {
          writeDebug(scopedName, "log", message, ...payload);
        },

        info(message, ...payload) {
          writeDebug(scopedName, "info", message, ...payload);
        },

        warn(message, ...payload) {
          writeDebug(scopedName, "warn", message, ...payload);
        },

        error(message, ...payload) {
          writeDebug(scopedName, "error", message, ...payload);
        },

        trace(message, ...payload) {
          if (!isDebugEnabled()) return;
          const tracer =
            nativeConsole.trace || nativeConsole.debug || nativeConsole.log;
          tracer.call(
            nativeConsole,
            `${formatDebugNamespace(scopedName)} ${message}`,
            ...payload,
          );
        },

        group(message, ...payload) {
          if (!isDebugEnabled()) return;
          const grouper =
            nativeConsole.groupCollapsed ||
            nativeConsole.group ||
            nativeConsole.log;
          grouper.call(
            nativeConsole,
            `${formatDebugNamespace(scopedName)} ${message}`,
            ...payload,
          );
        },

        groupEnd() {
          if (!isDebugEnabled()) return;
          nativeConsole.groupEnd?.();
        },

        time(label) {
          if (!isDebugEnabled()) return;
          nativeConsole.time?.(`${formatDebugNamespace(scopedName)}:${label}`);
        },

        timeEnd(label) {
          if (!isDebugEnabled()) return;
          nativeConsole.timeEnd?.(
            `${formatDebugNamespace(scopedName)}:${label}`,
          );
        },
      };
    }

    const logger = createLogger("RodUtils");
    const debugFormatter = createDebugLogger("RodUtils:formatter");

    /* ******************** */
    /* Event Helpers        */
    /* ******************** */

    const EVENT_HELPERS_CACHE = new WeakMap();

    function on(target = document) {
      if (EVENT_HELPERS_CACHE.has(target)) {
        return EVENT_HELPERS_CACHE.get(target);
      }

      const helpers = new Proxy(
        {},
        {
          get(_, eventName) {
            return function listen(handler, options) {
              const name = String(eventName);
              target.addEventListener(name, handler, options);

              return function cleanup() {
                target.removeEventListener(name, handler, options);
              };
            };
          },
        },
      );

      EVENT_HELPERS_CACHE.set(target, helpers);

      return helpers;
    }

    const onWindow = on(window);
    const onDocument = on(document);
    const onDoc = on(document);

    function onBody() {
      return on(document.body || document.documentElement);
    }

    function onHead() {
      return on(document.head || document.documentElement);
    }

    /* ******************** */
    /* Fatal Guards         */
    /* ******************** */

    onWindow.error((event) => {
      nativeConsole.error(
        "[RodUtils Fatal]",
        event.error || event.message,
        event,
      );
    });

    onWindow.unhandledrejection((event) => {
      nativeConsole.error("[RodUtils Promise Fatal]", event.reason, event);
    });

    /* ******************** */
    /* Create Element CSS   */
    /* ******************** */
    
    
    /* ******************** */
/* Element Alias        */
/* ******************** */

function enhanceElement(element) {
  if (!(element instanceof Element)) return element;

  defineElementMethod(element, "props", function setProps(nextProps = {}) {
    applyProps(element, nextProps);
    return element;
  });

  defineElementMethod(element, "child", function addChild(child) {
    appendChild(element, child);
    return element;
  });

  defineElementMethod(element, "children", function addChildren(nextChildren = []) {
    const list = Array.isArray(nextChildren) ? nextChildren : [nextChildren];

    for (const child of list) {
      appendChild(element, child);
    }

    return element;
  });

  defineElementMethod(element, "css", function setCss(input, ...values) {
    const stylesFactory =
      typeof CipoCSS?.inline?.css !== "undefined"
        ? CipoCSS.inline.css
        : String.raw;

    element.style.cssText = toCssText(stylesFactory(input, ...values));
    return element;
  });

  defineElementMethod(element, "on", function addEvent(eventName, handler, options) {
    if (typeof handler === "function") {
      element.addEventListener(eventName, handler, options);
    }

    return element;
  });

  return element;
}

function enhanceElementList(elements) {
  const list = Array.from(elements || []).map(enhanceElement);

  Object.defineProperty(list, "first", {
    get() {
      return list[0] || null;
    },
    configurable: true,
    enumerable: false,
  });

  Object.defineProperty(list, "last", {
    get() {
      return list[list.length - 1] || null;
    },
    configurable: true,
    enumerable: false,
  });

  defineElementMethod(list, "each", function each(callback) {
    list.forEach((element, index) => callback(element, index, list));
    return list;
  });

  defineElementMethod(list, "props", function setPropsForAll(nextProps = {}) {
    return list.each((element) => element.props(nextProps));
  });

  defineElementMethod(list, "css", function setCssForAll(input, ...values) {
    return list.each((element) => element.css(input, ...values));
  });

  defineElementMethod(list, "on", function addEventForAll(eventName, handler, options) {
    return list.each((element) => element.on(eventName, handler, options));
  });

  defineElementMethod(list, "child", function addChildForAll(child) {
    return list.each((element) => element.child(child));
  });

  defineElementMethod(list, "children", function addChildrenForAll(children) {
    return list.each((element) => element.children(children));
  });

  return list;
}

function isCreateElementSyntax(input) {
  const source = String(input || "").trim();

  return source.startsWith("<") && source.endsWith(">");
}

function unwrapCreateElementSyntax(input) {
  return String(input || "")
    .trim()
    .replace(/^<\s*/, "")
    .replace(/\s*>$/, "")
    .trim();
}

function el(input = "div", props = {}, children = []) {
  const source = String(input || "div").trim();

  if (isCreateElementSyntax(source)) {
    return createElement(unwrapCreateElementSyntax(source), props, children);
  }

  return enhanceElementList(document.querySelectorAll(source));
}


    const ROD_CSS_CACHE = new Map();
    const ROD_CSS_TYPE = Symbol("rod.css");

    function normalizeInlineCss(input) {
      return String(input || "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\s+/g, " ")
        .replace(/\s*([:;,])\s*/g, "$1")
        .replace(/;+/g, ";")
        .trim();
    }

    function css(strings, ...values) {
      const cacheKey =
        strings.length === 1
          ? strings[0]
          : strings.raw.join("%%") + values.join("%%");

      if (ROD_CSS_CACHE.has(cacheKey)) {
        return ROD_CSS_CACHE.get(cacheKey);
      }

      let output = "";

      for (let index = 0; index < strings.length; index++) {
        output += strings[index];

        if (index < values.length) {
          const value = values[index];

          if (value == null || value === false) continue;

          output += String(value);
        }
      }

      const result = {
        [ROD_CSS_TYPE]: true,
        cssText: normalizeInlineCss(output),
        toString() {
          return this.cssText;
        },
      };

      ROD_CSS_CACHE.set(cacheKey, result);

      return result;
    }

    function defineElementMethod(element, name, method) {
      try {
        Object.defineProperty(element, name, {
          value: method,
          configurable: true,
          enumerable: false,
          writable: true,
        });

        return true;
      } catch {}

      try {
        const safeName = `$${name}`;

        Object.defineProperty(element, safeName, {
          value: method,
          configurable: true,
          enumerable: false,
          writable: true,
        });

        return true;
      } catch {}

      return false;
    }

    function isRodCss(value) {
      return Boolean(value && value[ROD_CSS_TYPE] === true);
    }

    function toCssText(value, ...values) {
      if (value?.kind && value.kind === "cipo.inline-css") return String(value);
      if (isRodCss(value)) return value.cssText;

      if (Array.isArray(value) && "raw" in value) {
        return css(value, ...values).cssText;
      }

      return normalizeInlineCss(value);
    }

    function parseEmmet(input) {
      const source = String(input || "div").trim();
      const attrs = {};
      const attrPattern = /\[([^\]=\s]+)(?:=(["']?)(.*?)\2)?\]/g;

      let clean = source.replace(attrPattern, (_, key, _quote, value) => {
        attrs[key] = value ?? "";
        return "";
      });

      let tag = "div";
      let id = "";
      const classes = [];

      const tagMatch = clean.match(/^[a-zA-Z][\w-]*/);

      if (tagMatch) {
        tag = tagMatch[0];
        clean = clean.slice(tag.length);
      }

      const tokenPattern = /([#.])([\w-]+)/g;
      let match;

      while ((match = tokenPattern.exec(clean))) {
        const [, type, value] = match;

        if (type === "#") id = value;
        else classes.push(value);
      }

      return { tag, id, classes, attrs };
    }

    function applyStyle(element, value) {
      if (!value) return;

      if (isRodCss(value)) {
        element.style.cssText += element.style.cssText
          ? `;${value.cssText}`
          : value.cssText;
        return;
      }

      if (typeof value === "string") {
        element.style.cssText += element.style.cssText ? `;${value}` : value;
        return;
      }

      if (!isObject(value)) return;

      for (const [styleKey, styleValue] of Object.entries(value)) {
        if (styleValue == null || styleValue === false) continue;

        if (styleKey.startsWith("--")) {
          element.style.setProperty(styleKey, String(styleValue));
          continue;
        }

        element.style[styleKey] = String(styleValue);
      }
    }

    function applyProps(element, props = {}) {
      if (!props) return;

      for (const [key, value] of Object.entries(props)) {
        if (value == null || value === false) continue;

        if (key === "text") {
          element.textContent = String(value);
          continue;
        }

        if (key === "html") {
          element.innerHTML = String(value);
          continue;
        }

        if (key === "textContent") {
          element.textContent = isRodCss(value) ? value.cssText : String(value);
          continue;
        }

        if (key === "innerHTML") {
          element.innerHTML = String(value);
          continue;
        }

        if (key === "class" || key === "className") {
          element.className = String(value);
          continue;
        }

        if (key === "style") {
          applyStyle(element, value);
          continue;
        }

        if (key === "dataset" && isObject(value)) {
          Object.assign(element.dataset, value);
          continue;
        }

        if (key === "data" && isObject(value)) {
          for (const [attrKey, attrValue] of Object.entries(value)) {
            if (attrValue != null && attrValue !== false) {
              element.dataset[attrKey] = String(attrValue);
            }
          }

          continue;
        }

        if (key === "attr" && isObject(value)) {
          for (const [attrKey, attrValue] of Object.entries(value)) {
            if (attrValue != null && attrValue !== false) {
              element.setAttribute(attrKey, String(attrValue));
            }
          }

          continue;
        }

        if (key === "on" && isObject(value)) {
          for (const [eventName, handler] of Object.entries(value)) {
            if (typeof handler === "function") {
              element.addEventListener(eventName, handler);
            }
          }

          continue;
        }

        if (key.startsWith("on") && typeof value === "function") {
          element.addEventListener(key.slice(2).toLowerCase(), value);
          continue;
        }

        if (key in element) {
          try {
            element[key] = value;
            continue;
          } catch {}
        }

        element.setAttribute(key, String(value));
      }
    }

    function createTextNode(node) {
      return document.createTextNode(String(node));
    }

    function appendChild(parent, child) {
      if (child == null || child === false) return;

      if (Array.isArray(child)) {
        for (const item of child) {
          appendChild(parent, item);
        }

        return;
      }

      if (child instanceof Node) {
        parent.appendChild(child);
        return;
      }

      parent.appendChild(createTextNode(child));
    }

    function createElement(emmet = "div", props = {}, children = []) {
      const parsed = parseEmmet(emmet);
      const element = enhanceElement(document.createElement(parsed.tag));

      defineElementMethod(element, "props", function setProps(nextProps = {}) {
        applyProps(element, nextProps);
        return element;
      });

      defineElementMethod(element, "child", function addChild(child) {
        appendChild(element, child);
        return element;
      });

      defineElementMethod(element, "css", function setCss(input, ...values) {
        const stylesFactory =
          typeof CipoCSS?.inline?.css !== "undefined"
            ? CipoCSS.inline.css
            : String.raw;

        element.style.cssText = toCssText(stylesFactory(input, ...values));
        return element;
      });

      defineElementMethod(
        element,
        "children",
        function addChildren(nextChildren = []) {
          const list = Array.isArray(nextChildren)
            ? nextChildren
            : [nextChildren];

          for (const child of list) {
            appendChild(element, child);
          }

          return element;
        },
      );

      if (parsed.id) element.id = parsed.id;
      if (parsed.classes.length) element.className = parsed.classes.join(" ");

      for (const [key, value] of Object.entries(parsed.attrs)) {
        element.setAttribute(key, value);
      }

      element.props(props);

      try {
        Object.defineProperty(element, "___rodCreateElement", {
          value: emmet,
          configurable: true,
          enumerable: false,
          writable: true,
        });
      } catch {}

      try {
        element.dataset.rodElement = emmet;
      } catch {}

      element.children(children);

      return element;
    }

    //createElement.css = css;

    /* ******************** */
    /* Text / JSON          */
    /* ******************** */

    async function copyText(value) {
      const text = String(value ?? "");

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {}
      }

      const textarea = createElement("textarea", {
        value: text,
        attr: {
          readonly: "",
        },
      }).css`
        position: fixed;
        top: -999px;
        left: -999px;
        opacity: 0;
      `;

      document.documentElement.appendChild(textarea);
      textarea.select();

      try {
        return document.execCommand("copy");
      } catch {
        return false;
      } finally {
        textarea.remove();
      }
    }

    function safeJson(value, space = 2) {
      const seen = new WeakSet();

      return JSON.stringify(
        value,
        function replacer(_key, currentValue) {
          if (typeof currentValue === "object" && currentValue !== null) {
            if (seen.has(currentValue)) return "[Circular]";
            seen.add(currentValue);
          }

          if (typeof currentValue === "function") {
            return `[Function ${currentValue.name || "anonymous"}]`;
          }

          if (typeof currentValue === "bigint") return `${currentValue}n`;

          if (typeof Node !== "undefined" && currentValue instanceof Node) {
            return getNodeLabel(currentValue);
          }

          return currentValue;
        },
        space,
      );
    }

    /* ******************** */
    /* Async / Loaders      */
    /* ******************** */

    async function waitForGlobal(globals, timeout = DEFAULT_TIMEOUT_MS) {
      const keys = Array.isArray(globals) ? globals : [globals];
      const startedAt = performance.now();

      while (performance.now() - startedAt < timeout) {
        const values = keys.map((key) => window[key]);

        if (values.every((value) => value !== undefined)) return values;

        await new Promise((resolve) => setTimeout(resolve, 16));
      }

      throw new Error(
        `[RodUtils.waitForGlobal] Timeout waiting for: ${keys.join(", ")}`,
      );
    }

    function promiseTimeout(promise, ms) {
      let timer = 0;

      return Promise.race([
        promise.finally?.(() => clearTimeout(timer)) || promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`Timeout after ${ms}ms`));
          }, ms);
        }),
      ]);
    }

    function timeoutImport(url, timeout = 4_000) {
      return promiseTimeout(import(/* @vite-ignore */ url), timeout);
    }

    function loadScriptOnce(url, options = {}) {
      const id = options.id || `${SCRIPT_LOADER_PREFIX}${hashText(url)}`;
      const timeout = options.timeout || DEFAULT_LOADER_TIMEOUT_MS;

      if (loadedScripts.has(id)) return loadedScripts.get(id);

      const existing = document.getElementById(id);

      if (existing instanceof HTMLScriptElement) {
        const promise = Promise.resolve(existing);
        loadedScripts.set(id, promise);
        return promise;
      }

      const promise = new Promise((resolve, reject) => {
        const script = createElement("script");
        const timer = setTimeout(() => {
          script.remove();
          loadedScripts.delete(id);
          reject(new Error(`[RodUtils.loadScriptOnce] Timeout loading ${url}`));
        }, timeout);

        script.props({
          id,
          src: url,
          async: true,
        });

        script.onload = () => {
          clearTimeout(timer);
          resolve(script);
        };

        script.onerror = () => {
          clearTimeout(timer);
          loadedScripts.delete(id);
          reject(new Error(`[RodUtils.loadScriptOnce] Failed loading ${url}`));
        };

        (document.head || document.documentElement).appendChild(script);
      });

      loadedScripts.set(id, promise);

      return promise;
    }

    function injectStylesheet(href, options = {}) {
      const {
        id = `style-${hashText(href)}`,
        root = document,
        media = "all",
        timeout = DEFAULT_LOADER_TIMEOUT_MS,
        crossOrigin,
        referrerPolicy,
      } = options;

      const existing = root.getElementById?.(id) || document.getElementById(id);

      if (existing instanceof HTMLLinkElement) {
        return Promise.resolve(existing);
      }

      return new Promise((resolve, reject) => {
        const link = createElement("link");
        const timer = setTimeout(() => {
          link.remove();
          reject(
            new Error(`[RodUtils.injectStylesheet] Timeout loading ${href}`),
          );
        }, timeout);

        link.props({
          id,
          rel: "stylesheet",
          href,
          media,
        });

        if (crossOrigin) link.crossOrigin = crossOrigin;
        if (referrerPolicy) link.referrerPolicy = referrerPolicy;

        link.onload = () => {
          clearTimeout(timer);
          resolve(link);
        };

        link.onerror = () => {
          clearTimeout(timer);
          link.remove();
          reject(
            new Error(`[RodUtils.injectStylesheet] Failed loading ${href}`),
          );
        };

        const target =
          root === document ? document.head || document.documentElement : root;

        target.appendChild(link);
      });
    }

    function installStyleOnce(cssText, id = "", root = document) {
      const styleId = id || `${STYLE_LOADER_PREFIX}${hashText(cssText)}`;
      const key = `${styleId}:${root === document ? "document" : hashText(String(root))}`;

      if (loadedStyles.has(key)) return loadedStyles.get(key);

      const existing =
        root.getElementById?.(styleId) || document.getElementById(styleId);

      if (existing instanceof HTMLStyleElement) {
        loadedStyles.set(key, existing);
        return existing;
      }

      const style = createElement("style", {
        id: styleId,
        textContent: isRodCss(cssText) ? cssText.cssText : String(cssText),
      });

      if (root === document) {
        (document.head || document.documentElement).appendChild(style);
      } else {
        root.appendChild(style);
      }

      loadedStyles.set(key, style);

      return style;
    }

    /* ******************** */
    /* Safe Import Loader   */
    /* ******************** */

    const IMPORT_CACHE = new Map();

    async function importSafe(url, options = {}) {
      const {
        globalName,
        timeout = 15_000,
        useEval = true,
        debug = false,
      } = options;

      const cacheKey = `${url}:${globalName || ""}:${useEval ? "eval" : "noeval"}`;

      if (IMPORT_CACHE.has(cacheKey)) {
        return IMPORT_CACHE.get(cacheKey);
      }

      const promise = _importSafe(url, {
        globalName,
        timeout,
        useEval,
        debug,
      });

      IMPORT_CACHE.set(cacheKey, promise);

      return promise;
    }

    async function _importSafe(url, options) {
      const { globalName, timeout, useEval, debug } = options;

      const log = (...args) => {
        if (debug) nativeConsole.log("[importSafe]", ...args);
      };

      const fail = (...args) => {
        if (debug) nativeConsole.warn("[importSafe]", ...args);
      };

      try {
        log("Trying native import()", url);

        const importedModule = await promiseTimeout(
          import(/* @vite-ignore */ url),
          timeout,
        );

        if (importedModule) {
          log("Native import() success");
          return normalizeModule(importedModule, globalName);
        }
      } catch (error) {
        fail("Native import() failed", error);
      }

      try {
        log("Trying fetch + blob import", url);

        const source = await fetchText(url, timeout);
        const blobUrl = createBlobScriptUrl(source);

        try {
          const importedModule = await promiseTimeout(
            import(/* @vite-ignore */ blobUrl),
            timeout,
          );

          log("Fetch + blob import success");

          return normalizeModule(importedModule, globalName);
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      } catch (error) {
        fail("Fetch + blob import failed", error);
      }

      if (useEval) {
        try {
          log("Trying fetch + eval", url);

          const source = await fetchText(url, timeout);
          const result = evalCommonJs(source, url);

          log("Fetch + eval success");

          return normalizeModule(result, globalName);
        } catch (error) {
          fail("Fetch + eval failed", error);
        }
      }

      try {
        log("Trying script injection", url);

        await loadScriptOnce(url, {
          id: `${SCRIPT_LOADER_PREFIX}${hashText(`import-safe:${url}`)}`,
          timeout,
        });

        if (globalName && globalThis[globalName]) {
          log("Script injection success");
          return globalThis[globalName];
        }

        log("Script loaded without globalName");
        return true;
      } catch (error) {
        fail("Script injection failed", error);
      }

      if (typeof GM_xmlhttpRequest === "function") {
        try {
          log("Trying GM_xmlhttpRequest", url);

          const source = await gmFetchText(url, timeout);

          if (useEval) {
            const result = evalCommonJs(source, url);

            log("GM eval success");

            return normalizeModule(result, globalName);
          }

          const blobUrl = createBlobScriptUrl(source);

          try {
            const importedModule = await promiseTimeout(
              import(/* @vite-ignore */ blobUrl),
              timeout,
            );

            log("GM blob import success");

            return normalizeModule(importedModule, globalName);
          } finally {
            URL.revokeObjectURL(blobUrl);
          }
        } catch (error) {
          fail("GM_xmlhttpRequest failed", error);
        }
      }

      fail("All import strategies failed");

      return null;
    }

    function normalizeModule(importedModule, globalName) {
      if (!importedModule) return null;

      if (globalName && globalThis[globalName]) {
        return globalThis[globalName];
      }

      if (importedModule.default) {
        return importedModule.default;
      }

      return importedModule;
    }

    async function fetchText(url, timeout = 15_000) {
      const response = await promiseTimeout(fetch(url), timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} loading ${url}`);
      }

      return response.text();
    }

    function createBlobScriptUrl(source) {
      const blob = new Blob([source], { type: "text/javascript" });
      return URL.createObjectURL(blob);
    }

    function evalCommonJs(source, url = "") {
      if (/\bimport\s+|\bexport\s+/m.test(source)) {
        throw new SyntaxError(
          "[RodUtils.importSafe] Source looks like ESM. Refusing eval fallback.",
        );
      }

      const localExports = {};
      const localModule = { exports: localExports };

      const fn = new Function(
        "exports",
        "module",
        "globalThis",
        "window",
        `"use strict";\n${source}\n//# sourceURL=${url}`,
      );

      fn(localExports, localModule, globalThis, window);

      return localModule.exports || localExports;
    }

    function gmFetchText(url, timeout = 15_000) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          timeout,

          onload(response) {
            resolve(response.responseText);
          },

          onerror(error) {
            reject(error);
          },

          ontimeout() {
            reject(new Error(`GM request timeout: ${url}`));
          },
        });
      });
    }

    /* ******************** */
    /* Formatting           */
    /* ******************** */

    const MiniHLJS = createMiniHighlighter();

    function createMiniHighlighter() {
      const KEYWORDS =
        "as async await break case catch class const constructor continue debugger default delete do else export extends false finally for from function get if import in instanceof let new null of return set static super switch this throw true try typeof undefined var void while with yield";

      const BUILT_INS =
        "Array Boolean Date Error Function JSON Map Math Number Object Promise Proxy Reflect RegExp Set String Symbol WeakMap WeakSet console document window globalThis localStorage sessionStorage fetch requestAnimationFrame";

      const TYPES =
        "any unknown never void string number boolean object bigint symbol null undefined Record Partial Pick Omit Promise Array HTMLElement Element Node Event Document Window";

      const keywordRe = new RegExp(
        `\\b(${KEYWORDS.split(" ").join("|")})\\b`,
        "g",
      );
      const builtInRe = new RegExp(
        `\\b(${BUILT_INS.split(" ").join("|")})\\b`,
        "g",
      );
      const typeRe = new RegExp(`\\b(${TYPES.split(" ").join("|")})\\b`, "g");

      function span(className, value) {
        return `<span class="${className}">${value}</span>`;
      }

      function m(className) {
        return (value) => span(className, value);
      }

      function highlightHtml(code) {
        return escapeHtml(code)
          .replace(/(&lt;!--[\s\S]*?--&gt;)/g, m("hljs-comment"))
          .replace(/(&lt;!doctype[\s\S]*?&gt;)/gi, m("hljs-meta"))
          .replace(
            /(&lt;\/?)([a-zA-Z][\w:-]*)([\s\S]*?)(\/?&gt;)/g,
            (_, open, tag, attrs, close) => {
              const attrHtml = attrs.replace(
                /([\w:@.-]+)(=)(&quot;[\s\S]*?&quot;|'[\s\S]*?'|[^\s&]+)/g,
                (_, name, eq, value) =>
                  `${span("hljs-attr", name)}${eq}${span("hljs-string", value)}`,
              );

              return `${open}${span("hljs-name", tag)}${attrHtml}${close}`;
            },
          );
      }

      function highlightCss(code) {
        return escapeHtml(code)
          .replace(/(\/\*[\s\S]*?\*\/)/g, m("hljs-comment"))
          .replace(/(@[\w-]+)/g, m("hljs-keyword"))
          .replace(/([.#][\w-]+)/g, (_, v) =>
            span(v[0] === "." ? "hljs-selector-class" : "hljs-selector-id", v),
          )
          .replace(
            /([\w-]+)(\s*:)/g,
            (_, prop, colon) => `${span("hljs-attribute", prop)}${colon}`,
          )
          .replace(/(:\s*)([^;{}\n]+)(;?)/g, (_, prefix, value, end) => {
            const out = value
              .replace(/#[0-9a-fA-F]{3,8}\b/g, m("hljs-number"))
              .replace(
                /\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|vmin|vmax|%|s|ms|deg)?\b/g,
                m("hljs-number"),
              )
              .replace(
                /\b(url|rgb|rgba|hsl|hsla|oklab|oklch|var|calc|min|max|clamp)\b/g,
                m("hljs-built_in"),
              );

            return `${prefix}${out}${end}`;
          });
      }

      function highlightJsTs(code, isTs) {
        let out = escapeHtml(code)
          .replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g, m("hljs-comment"))
          .replace(
            /(`(?:\\[\s\S]|[^`])*`|'(?:\\.|[^'])*'|&quot;(?:\\.|(?!&quot;)[\s\S])*&quot;)/g,
            m("hljs-string"),
          )
          .replace(/\b(0x[\da-fA-F]+|\d+(?:\.\d+)?n?)\b/g, m("hljs-number"))
          .replace(/\b([A-Za-z_$][\w$]*)(?=\s*\()/g, m("hljs-title function_"))
          .replace(builtInRe, m("hljs-built_in"))
          .replace(keywordRe, m("hljs-keyword"));

        if (isTs) {
          out = out
            .replace(
              /\b(type|interface|enum|implements|namespace|readonly|declare|abstract|public|private|protected|override|satisfies|keyof|infer)\b/g,
              m("hljs-keyword"),
            )
            .replace(typeRe, m("hljs-type"))
            .replace(
              /(:\s*)([A-Z_a-z][\w$<>,[\] |&.?]*)/g,
              (_, colon, type) => `${colon}${span("hljs-type", type)}`,
            );
        }

        return out;
      }

      function highlight(code, language = "plaintext") {
        const lang = String(language || "").toLowerCase();

        if (lang === "html" || lang === "xml" || lang === "svg")
          return highlightHtml(code);
        if (lang === "css") return highlightCss(code);
        if (lang === "js" || lang === "javascript" || lang === "jsx")
          return highlightJsTs(code, false);
        if (lang === "ts" || lang === "typescript" || lang === "tsx")
          return highlightJsTs(code, true);

        return escapeHtml(code);
      }

      function highlightAuto(code) {
        const text = String(code ?? "").trim();

        if (/^<\/?[a-z][\s\S]*>/i.test(text))
          return { language: "html", value: highlightHtml(code) };
        if (/[.#][\w-]+\s*\{|@media|:\s*[^;{}]+;/.test(text)) {
          return { language: "css", value: highlightCss(code) };
        }
        if (
          /\b(type|interface|enum|implements|readonly|namespace)\b/.test(text)
        ) {
          return { language: "typescript", value: highlightJsTs(code, true) };
        }

        return { language: "javascript", value: highlightJsTs(code, false) };
      }

      function highlightElement(element) {
        const className = element.className || "";
        const language =
          (className.match(/language-([\w-]+)/) ||
            className.match(/lang-([\w-]+)/) ||
            [])[1] ||
          element.dataset.language ||
          "plaintext";

        element.innerHTML = highlight(element.textContent || "", language);
        element.classList.add("hljs");
        element.dataset.highlighted = "yes";
      }

      function highlightAll(root = document) {
        root
          .querySelectorAll("pre code:not([data-highlighted])")
          .forEach(highlightElement);
      }

      return {
        highlight,
        highlightAuto,
        highlightElement,
        highlightAll,
      };
    }

    function normalizeHighlightLanguage(language) {
      const value = String(language || "javascript").toLowerCase();

      if (value === "xml" || value === "html" || value === "svg") return "xml";
      if (
        value === "js" ||
        value === "jsx" ||
        value === "ts" ||
        value === "tsx" ||
        value === "babel"
      ) {
        return "javascript";
      }

      return value;
    }

    function highlightCode(value, language = "javascript") {
      const code = String(value ?? "");
      const normalized = normalizeHighlightLanguage(language);

      if (window.hljs?.highlight) {
        try {
          return window.hljs.highlight(code, {
            language: normalized,
            ignoreIllegals: true,
          }).value;
        } catch {
          debugFormatter.log("Using MiniHLJS fallback", {
            language: normalized,
          });
          return MiniHLJS.highlight(code, normalized);
        }
      }

      if (window.hljs?.highlightAuto) {
        try {
          return window.hljs.highlightAuto(code).value;
        } catch {
          return MiniHLJS.highlightAuto(code).value;
        }
      }

      return MiniHLJS.highlight(code, normalized);
    }

    function miniPrettier(source) {
      return String(source ?? "")
        .replace(/\r\n?/g, "\n")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\s*([{}[\]();,:>])\s*/g, "$1")
        .replace(/([{};>])\s*/g, "$1\n")
        .replace(/\n+/g, "\n")
        .split("\n")
        .map((sourceLine) => sourceLine.trim())
        .filter(Boolean)
        .reduce(
          (state, sourceLine) => {
            if (/^[}\])]/.test(sourceLine))
              state.indent = Math.max(0, state.indent - 1);

            state.lines.push(`${"  ".repeat(state.indent)}${sourceLine}`);

            if (/[{[(]$/.test(sourceLine) && !/^[}\])]/.test(sourceLine))
              state.indent += 1;

            return state;
          },
          { indent: 0, lines: [] },
        )
        .lines.join("\n");
    }

    function prettyCss(source) {
      return String(source ?? "")
        .replace(/\/\*[\s\S]*?\*\//g, (comment) => `\n${comment}\n`)
        .replace(/\s+/g, " ")
        .replace(/\s*([{}:;,>+~])\s*/g, "$1")
        .replace(/;/g, ";\n")
        .replace(/{/g, " {\n")
        .replace(/}/g, "\n}\n\n")
        .replace(/,/g, ", ")
        .split("\n")
        .map((sourceLine) => sourceLine.trim())
        .filter(Boolean)
        .reduce(
          (state, sourceLine) => {
            const depth = Math.max(
              0,
              state.depth + (sourceLine.startsWith("}") ? -1 : 0),
            );
            state.out.push(`${"  ".repeat(depth)}${sourceLine}`);
            state.depth = depth + (sourceLine.endsWith("{") ? 1 : 0);
            return state;
          },
          { out: [], depth: 0 },
        )
        .out.join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    function formatHtml(source) {
      return miniPrettier(String(source ?? ""));
    }

    function formatCss(source) {
      return prettyCss(String(source ?? ""));
    }

    function prettySource(source, language = "javascript", options = {}) {
      const code = String(source ?? "");
      const shouldHighlight = Boolean(options === true || options.highlight);
      const maxLength = Number(options.maxLength || MAX_PRETTY_SOURCE_LENGTH);
      const normalizedLanguage = normalizeHighlightLanguage(language);

      if (code.length > maxLength) {
        return shouldHighlight ? highlightCode(code, normalizedLanguage) : code;
      }

      let output = code;

      try {
        if (window.prettier && window.prettierPlugins) {
          const parser =
            normalizedLanguage === "css"
              ? "css"
              : normalizedLanguage === "xml"
                ? "html"
                : "babel";
          const formatted = window.prettier.format(code, {
            parser,
            plugins: window.prettierPlugins,
          });
          output = typeof formatted === "string" ? formatted : output;
        }
      } catch {
        output = miniPrettier(code);
      }

      if (output === code) {
        if (normalizedLanguage === "css") output = formatCss(code);
        else if (normalizedLanguage === "xml") output = formatHtml(code);
        else output = miniPrettier(code);
      }

      return shouldHighlight
        ? highlightCode(output, normalizedLanguage)
        : output;
    }

    function splitHighlightedLines(highlightedHtml) {
      const lines = String(highlightedHtml || "").split(/\n/);
      return lines.length ? lines : [""];
    }

    function sanitizeConsoleStyle(value) {
      return String(value ?? "")
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .filter(
          (part) =>
            !/url\s*\(|expression\s*\(|behavior\s*:|javascript:/i.test(part),
        )
        .join(";");
    }

    /* ******************** */
    /* Reactivity           */
    /* ******************** */

    function cleanupEffect(runner) {
      const deps = EFFECT_DEPS.get(runner);
      if (!deps) return;

      for (const dep of deps) dep.delete(runner);

      deps.clear();
    }

    function trackEffect(subscribers) {
      const currentEffect =
        CURRENT_EFFECT_STACK[CURRENT_EFFECT_STACK.length - 1];

      if (!currentEffect || subscribers.has(currentEffect)) return;

      subscribers.add(currentEffect);

      let deps = EFFECT_DEPS.get(currentEffect);

      if (!deps) {
        deps = new Set();
        EFFECT_DEPS.set(currentEffect, deps);
      }

      deps.add(subscribers);
    }

    function isSignalLike(value) {
      return Boolean(
        value && typeof value === "function" && value[SIGNAL_SYMBOL] === true,
      );
    }

    function signal(initialValue) {
      let value = initialValue;
      const subscribers = new Set();

      function read() {
        trackEffect(subscribers);
        return value;
      }

      Object.defineProperty(read, SIGNAL_SYMBOL, {
        value: true,
        enumerable: false,
        configurable: false,
      });

      read.set = function set(nextValue) {
        if (Object.is(value, nextValue)) return;

        value = nextValue;

        Array.from(subscribers).forEach((subscriber) => {
          subscriber();
        });
      };

      read.update = function update(updater) {
        read.set(updater(value));
      };

      read.peek = function peek() {
        return value;
      };

      return read;
    }

    function effect(callback) {
      function run() {
        cleanupEffect(run);
        CURRENT_EFFECT_STACK.push(run);

        try {
          callback();
        } finally {
          CURRENT_EFFECT_STACK.pop();
        }
      }

      run();

      return function dispose() {
        cleanupEffect(run);
      };
    }

    function computed(callback) {
      const output = signal(undefined);

      effect(function computeEffect() {
        output.set(callback());
      });

      return output;
    }

    /* ******************** */
    /* DOM / React          */
    /* ******************** */

    function formatElement(element) {
      const tag = element.tagName ? element.tagName.toLowerCase() : "element";
      const id = element.id ? ` id="${escapeHtml(element.id)}"` : "";
      const className =
        typeof element.className === "string" && element.className.trim()
          ? ` class="${escapeHtml(element.className.trim().split(/\s+/).slice(0, 6).join(" "))}"`
          : "";

      return `<${tag}${id}${className}>`;
    }

    function formatDomLabel(element) {
      const tag = element.tagName?.toLowerCase?.() || "element";
      const id = element.id ? `#${element.id}` : "";
      const classes =
        typeof element.className === "string" && element.className.trim()
          ? `.${element.className.trim().split(/\s+/).slice(0, 4).join(".")}`
          : "";

      return `<${tag}${id}${classes}>`;
    }

    function getNodeLabel(value) {
      if (value === null) return "null";
      if (value === undefined) return "undefined";
      if (typeof value === "string") return `"${trimText(value, 260)}"`;
      if (typeof value === "number" || typeof value === "boolean")
        return String(value);
      if (typeof value === "bigint") return `${value}n`;
      if (typeof value === "symbol") return value.toString();
      if (typeof value === "function")
        return `ƒ ${value.name || "anonymous"}()`;
      if (value instanceof Window) return "Window";
      if (value instanceof Document) return "Document";
      if (value instanceof Element) return formatDomLabel(value);
      if (value instanceof Text)
        return `Text("${trimText(value.textContent || "", 160)}")`;
      if (value instanceof Comment) return "Comment";
      if (value instanceof Node) return `Node ${value.nodeName}`;
      if (value instanceof Error) return `${value.name}: ${value.message}`;
      if (Array.isArray(value)) return `Array(${value.length})`;
      if (value instanceof Map) return `Map(${value.size})`;
      if (value instanceof Set) return `Set(${value.size})`;
      if (value instanceof NodeList) return `NodeList(${value.length})`;
      if (value instanceof HTMLCollection)
        return `HTMLCollection(${value.length})`;
      if (isPlainObject(value)) return "Object";

      return value?.constructor?.name || "Object";
    }

    function findReactPrivateKey(element, prefix) {
      if (!element) return undefined;
      return Object.keys(element).find((key) => key.startsWith(prefix));
    }

    function getReactProps(element) {
      const key = findReactPrivateKey(element, REACT_PROPS_PREFIX);
      return key ? element[key] : null;
    }

    function findReact(element) {
      if (!element) return null;

      const fiberKey = findReactPrivateKey(element, REACT_FIBER_PREFIX);
      if (fiberKey) return element[fiberKey];

      const legacyKey = findReactPrivateKey(
        element,
        REACT_LEGACY_INSTANCE_PREFIX,
      );
      if (legacyKey) return element[legacyKey];

      return null;
    }

    function isReactElement(value) {
      return (
        value instanceof Element &&
        Boolean(findReact(value) || getReactProps(value))
      );
    }

    function getReactOwnerInfo(element) {
      const fiber = findReact(element);

      if (!fiber) return null;

      return {
        fiber,
        props: getReactProps(element),
        type:
          fiber.type?.name || fiber.elementType?.name || fiber.tag || "unknown",
        key: fiber.key ?? null,
        stateNode: fiber.stateNode ?? null,
        owner: fiber._debugOwner ?? null,
      };
    }

    function getElementFromObject(value) {
      if (value instanceof Element) return value;
      if (value?.target instanceof Element) return value.target;
      if (value?.currentTarget instanceof Element) return value.currentTarget;
      if (value?.element instanceof Element) return value.element;
      if (value?.node instanceof Element) return value.node;
      if (value?.el instanceof Element) return value.el;
      if (value?.$el instanceof Element) return value.$el;
      if (isNodeListLike(value))
        return (
          Array.from(value).find((node) => node instanceof Element) || null
        );

      return null;
    }

    /* ******************** */
    /* Event Tracker        */
    /* ******************** */

    function normalizeListenerOptions(options) {
      if (typeof options === "boolean") {
        return {
          capture: options,
          once: false,
          passive: undefined,
          signal: undefined,
        };
      }

      return {
        capture: Boolean(options?.capture),
        once: Boolean(options?.once),
        passive: options?.passive,
        signal: options?.signal,
      };
    }

    function getEventTargetBucket(target) {
      let bucket = eventListenerRegistry.get(target);

      if (!bucket) {
        bucket = new Map();
        eventListenerRegistry.set(target, bucket);
        eventListenerTargets.add(target);
      }

      return bucket;
    }

    function recordEventListener(target, type, listener, options) {
      if (!target || !type || !listener) return;

      const bucket = getEventTargetBucket(target);
      const eventType = String(type);
      const records = bucket.get(eventType) || [];
      const normalizedOptions = normalizeListenerOptions(options);
      const duplicate = records.some(
        (record) =>
          record.listener === listener &&
          record.capture === normalizedOptions.capture,
      );

      if (duplicate) return;

      records.push({
        target,
        type: eventType,
        listener,
        options,
        capture: normalizedOptions.capture,
        once: normalizedOptions.once,
        passive: normalizedOptions.passive,
        signal: normalizedOptions.signal,
        addedAt: Date.now(),
        stack: isDebugEnabled()
          ? new Error("[RodUtils] Event listener added here").stack
          : "",
      });

      bucket.set(eventType, records);
    }

    function unrecordEventListener(target, type, listener, options) {
      const bucket = eventListenerRegistry.get(target);
      if (!bucket) return;

      const eventType = String(type);
      const records = bucket.get(eventType);
      if (!records?.length) return;

      const normalizedOptions = normalizeListenerOptions(options);
      const nextRecords = records.filter(
        (record) =>
          !(
            record.listener === listener &&
            record.capture === normalizedOptions.capture
          ),
      );

      if (nextRecords.length) {
        bucket.set(eventType, nextRecords);
        return;
      }

      bucket.delete(eventType);

      if (bucket.size === 0) {
        eventListenerRegistry.delete(target);
        eventListenerTargets.delete(target);
      }
    }

    function installEventListenerTracker() {
      if (EventTarget.prototype.addEventListener.__rodUtilsTracked === true)
        return false;

      function trackedAddEventListener(type, listener, options) {
        recordEventListener(this, type, listener, options);
        return nativeAddEventListener.call(this, type, listener, options);
      }

      function trackedRemoveEventListener(type, listener, options) {
        unrecordEventListener(this, type, listener, options);
        return nativeRemoveEventListener.call(this, type, listener, options);
      }

      Object.defineProperty(trackedAddEventListener, "__rodUtilsTracked", {
        value: true,
        enumerable: false,
        configurable: false,
      });

      Object.defineProperty(trackedRemoveEventListener, "__rodUtilsTracked", {
        value: true,
        enumerable: false,
        configurable: false,
      });

      EventTarget.prototype.addEventListener = trackedAddEventListener;
      EventTarget.prototype.removeEventListener = trackedRemoveEventListener;

      return true;
    }

    function uninstallEventListenerTracker() {
      EventTarget.prototype.addEventListener = nativeAddEventListener;
      EventTarget.prototype.removeEventListener = nativeRemoveEventListener;
    }

    function getEventListeners(target, type) {
      if (!target) return [];

      const bucket = eventListenerRegistry.get(target);
      if (!bucket) return [];

      if (type) return Array.from(bucket.get(String(type)) || []);

      const output = [];

      for (const records of bucket.values()) {
        output.push(...records);
      }

      return output;
    }

    function getEventListenersByType(target) {
      const bucket = eventListenerRegistry.get(target);
      const output = {};

      if (!bucket) return output;

      for (const [type, records] of bucket.entries()) {
        output[type] = Array.from(records);
      }

      return output;
    }

    function getAllTrackedEventListeners() {
      const output = [];

      for (const target of eventListenerTargets) {
        const listeners = getEventListeners(target);

        if (!listeners.length) continue;

        output.push({
          target,
          label: getNodeLabel(target),
          listeners,
        });
      }

      return output;
    }

    /* ******************** */
    /* Virtualization       */
    /* ******************** */

    function splitLines(source) {
      return String(source ?? "")
        .replace(/\r\n?/g, "\n")
        .split("\n");
    }

    function getVirtualSlice(options) {
      const rowHeight = Math.max(1, Number(options.rowHeight || 20));
      const viewportHeight = Math.max(
        rowHeight,
        Number(options.viewportHeight || 300),
      );
      const total = Math.max(0, Number(options.total || 0));
      const overscan = Math.max(0, Number(options.overscan || 20));
      const start = Math.max(
        0,
        Math.floor(Number(options.scrollTop || 0) / rowHeight) - overscan,
      );
      const count = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
      const end = Math.min(total, start + count);

      return {
        start,
        end,
        before: start * rowHeight,
        after: Math.max(0, (total - end) * rowHeight),
      };
    }

    function createVirtualTextComponent({
      container,
      text,
      lineHeight = 20,
      overscan = 20,
    }) {
      if (!(container instanceof HTMLElement)) {
        throw new TypeError(
          "createVirtualTextComponent needs a valid container.",
        );
      }

      let lines = String(text || "").split("\n");
      let scrollTop = 0;
      let frame = 0;

      const root = createElement("div").css`
        position: relative;
        height: 100%;
        overflow: auto;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        line-height: ${lineHeight}px;
        white-space: pre;
        contain: strict;
      `;

      const spacer = createElement("div").css`
        position: relative;
        width: 100%;
        height: ${lines.length * lineHeight}px;
      `;

      const viewport = createElement("div").css`
        position: absolute;
        inset: 0 auto auto 0;
        width: 100%;
        will-change: transform;
      `;

      spacer.appendChild(viewport);
      root.appendChild(spacer);
      container.replaceChildren(root);

      function scheduleRender() {
        if (frame) return;

        frame = requestAnimationFrame(() => {
          frame = 0;
          render();
        });
      }

      function render() {
        const height = root.clientHeight || 1;
        const start = Math.max(
          0,
          Math.floor(scrollTop / lineHeight) - overscan,
        );
        const visibleCount = Math.ceil(height / lineHeight) + overscan * 2;
        const end = Math.min(lines.length, start + visibleCount);
        const offsetY = start * lineHeight;

        let html = "";

        for (let index = start; index < end; index += 1) {
          html += `<div style="height:${lineHeight}px">${escapeHtml(lines[index] || " ")}</div>`;
        }

        viewport.style.transform = `translateY(${offsetY}px)`;
        viewport.innerHTML = html;
        spacer.style.height = `${lines.length * lineHeight}px`;
      }

      on(root).scroll(
        () => {
          scrollTop = root.scrollTop;
          scheduleRender();
        },
        { passive: true },
      );

      render();

      return {
        root,

        setText(nextText) {
          lines = String(nextText || "").split("\n");
          scrollTop = root.scrollTop;
          scheduleRender();
        },

        scrollToLine(lineNumber) {
          root.scrollTop = Math.max(0, Number(lineNumber || 0) * lineHeight);
        },

        destroy() {
          if (frame) cancelAnimationFrame(frame);
          container.replaceChildren();
        },
      };
    }

    /* ******************** */
    /* Store / Event Bus    */
    /* ******************** */

    function createStore(initialState, onChange = function noop() {}) {
      const proxyCache = new WeakMap();

      function proxify(target, path = []) {
        if (target === null || typeof target !== "object") return target;
        if (proxyCache.has(target)) return proxyCache.get(target);

        const proxy = new Proxy(target, {
          get(object, key) {
            if (typeof key === "symbol") return object[key];
            return proxify(object[key], path.concat(String(key)));
          },

          set(object, key, value) {
            const previousValue = object[key];

            if (Object.is(previousValue, value)) return true;

            object[key] = value;

            onChange({
              key: String(key),
              path: path.concat(String(key)),
              value,
              previousValue,
              target: object,
            });

            return true;
          },

          deleteProperty(object, key) {
            if (!Reflect.has(object, key)) return true;

            const previousValue = object[key];
            const deleted = Reflect.deleteProperty(object, key);

            if (deleted) {
              onChange({
                key: String(key),
                path: path.concat(String(key)),
                value: undefined,
                previousValue,
                deleted: true,
                target: object,
              });
            }

            return deleted;
          },
        });

        proxyCache.set(target, proxy);

        return proxy;
      }

      return proxify(initialState);
    }

    function createEventBus(options = {}) {
      const listeners = new Map();
      const onError =
        typeof options.onError === "function"
          ? options.onError
          : (name, error) =>
              nativeConsole.error("[EventBus handler failed]", name, error);

      function getBucket(event) {
        let bucket = listeners.get(event);

        if (!bucket) {
          bucket = new Set();
          listeners.set(event, bucket);
        }

        return bucket;
      }

      const bus = {
        on(event, handler) {
          const bucket = getBucket(event);
          bucket.add(handler);

          return () => {
            bus.off(event, handler);
          };
        },

        once(event, handler) {
          const dispose = bus.on(event, function onceHandler(payload) {
            dispose();
            handler(payload);
          });

          return dispose;
        },

        off(event, handler) {
          const bucket = listeners.get(event);
          if (!bucket) return false;

          if (!handler) {
            listeners.delete(event);
            return true;
          }

          const deleted = bucket.delete(handler);

          if (bucket.size === 0) listeners.delete(event);

          return deleted;
        },

        emit(event, payload) {
          const bucket = listeners.get(event);
          if (!bucket || bucket.size === 0) return;

          for (const handler of Array.from(bucket)) {
            try {
              handler(payload);
            } catch (error) {
              onError(`[EventBus:${event}]`, error);
            }
          }
        },

        clear(event) {
          if (event) {
            listeners.delete(event);
            return;
          }

          listeners.clear();
        },

        listenerCount(event) {
          if (event) return listeners.get(event)?.size || 0;

          let total = 0;

          for (const bucket of listeners.values()) {
            total += bucket.size;
          }

          return total;
        },
      };

      return Object.freeze(bus);
    }

    /* ******************** */
    /* Console Helpers      */
    /* ******************** */

    function getInspectableEntries(value) {
      if (value instanceof Element) {
        return [
          { key: "tagName", value: value.tagName },
          { key: "id", value: value.id },
          { key: "className", value: value.className },
          {
            key: "attributes",
            value: Array.from(value.attributes).map((attr) => ({
              name: attr.name,
              value: attr.value,
            })),
          },
          { key: "dataset", value: { ...value.dataset } },
          { key: "children", value: Array.from(value.children) },
          { key: "outerHTML", value: value.outerHTML },
        ];
      }

      if (value instanceof Text) {
        return [{ key: "textContent", value: value.textContent }];
      }

      if (Array.isArray(value)) {
        return value
          .slice(0, MAX_TREE_KEYS)
          .map((item, index) => ({ key: String(index), value: item }));
      }

      if (value instanceof Map) {
        return Array.from(value.entries())
          .slice(0, MAX_TREE_KEYS)
          .map(([key, item]) => ({ key: String(key), value: item }));
      }

      if (value instanceof Set) {
        return Array.from(value.values())
          .slice(0, MAX_TREE_KEYS)
          .map((item, index) => ({ key: String(index), value: item }));
      }

      if (!isObjectLike(value)) return [];

      return Reflect.ownKeys(value)
        .slice(0, MAX_TREE_KEYS)
        .map((key) => ({
          key: String(key),
          value: safeRead(value, key),
        }));
    }

    function formatPrimitivePlaceholder(value) {
      if (typeof value === "string") return value;
      if (typeof value === "number" || typeof value === "boolean")
        return String(value);
      if (value === null) return "null";
      if (value === undefined) return "undefined";
      if (typeof value === "bigint") return `${value}n`;
      if (typeof value === "symbol") return String(value);

      return createInlinePreview(value);
    }

    function formatPreviewItem(value) {
      if (typeof value === "string") return `"${trimText(value, 42)}"`;
      if (isPrimitive(value)) return String(value);
      if (value instanceof Element) return formatDomLabel(value);
      if (Array.isArray(value)) return `Array(${value.length})`;
      if (isPlainObject(value)) return "{…}";

      return getNodeLabel(value);
    }

    function createInlinePreview(value) {
      if (isPrimitive(value)) return formatPrimitivePlaceholder(value);
      if (value instanceof Element) return formatDomLabel(value);
      if (value instanceof Text)
        return `#text "${trimText(value.textContent || "", 80)}"`;
      if (Array.isArray(value)) {
        return `(${value.length}) [${value.slice(0, MAX_INLINE_KEYS).map(formatPreviewItem).join(", ")}${
          value.length > MAX_INLINE_KEYS ? ", …" : ""
        }]`;
      }
      if (value instanceof Map) return `Map(${value.size})`;
      if (value instanceof Set) return `Set(${value.size})`;
      if (value instanceof Date) return value.toISOString();
      if (value instanceof RegExp) return String(value);
      if (value instanceof Error) return `${value.name}: ${value.message}`;
      if (typeof value === "function")
        return `ƒ ${value.name || "anonymous"}()`;

      if (isPlainObject(value)) {
        const keys = Object.keys(value).slice(0, MAX_INLINE_KEYS);
        const body = keys
          .map((key) => `${key}: ${formatPreviewItem(safeRead(value, key))}`)
          .join(", ");
        const suffix = Object.keys(value).length > MAX_INLINE_KEYS ? ", …" : "";
        return `{${body}${suffix}}`;
      }

      return getNodeLabel(value);
    }

    function formatPlaceholder(token, value) {
      if (token === "d" || token === "i")
        return String(Number.parseInt(String(value), 10));
      if (token === "f") return String(Number.parseFloat(String(value)));
      if (token === "s") return String(value);
      return formatPrimitivePlaceholder(value);
    }

    function parseConsoleValues(values) {
      const parts = [];
      const rawParts = [];
      const objectTokens = [];

      if (!values.length) return { parts, raw: "", objectTokens };

      if (typeof values[0] !== "string") {
        for (let index = 0; index < values.length; index += 1) {
          const value = values[index];

          if (isInspectable(value)) {
            parts.push({ type: "object", index });
            objectTokens.push({ index, value });
            rawParts.push(createInlinePreview(value));
          } else {
            const text = formatPrimitivePlaceholder(value);
            parts.push({ type: "text", text });
            rawParts.push(text);
          }

          if (index < values.length - 1)
            parts.push({ type: "text", text: " " });
        }

        return { parts, raw: rawParts.join(" "), objectTokens };
      }

      const format = String(values[0]);
      const args = values.slice(1);
      const matcher = /%([%csdiffoO])/g;

      let activeStyle = "";
      let argIndex = 0;
      let lastIndex = 0;
      let match;

      function pushText(text) {
        if (!text) return;
        const part = activeStyle
          ? { type: "styled", text, style: activeStyle }
          : { type: "text", text };
        parts.push(part);
        rawParts.push(text);
      }

      while ((match = matcher.exec(format))) {
        if (match.index > lastIndex)
          pushText(format.slice(lastIndex, match.index));

        const token = match[1];

        if (token === "%") {
          pushText("%");
        } else if (token === "c") {
          activeStyle = sanitizeConsoleStyle(args[argIndex++]);
        } else {
          const originalIndex = argIndex + 1;
          const argValue = args[argIndex++];

          if (token === "o" || token === "O") {
            parts.push({ type: "object", index: originalIndex });
            objectTokens.push({ index: originalIndex, value: argValue });
            rawParts.push(createInlinePreview(argValue));
          } else {
            pushText(formatPlaceholder(token, argValue));
          }
        }

        lastIndex = matcher.lastIndex;
      }

      if (lastIndex < format.length) pushText(format.slice(lastIndex));

      for (let index = argIndex; index < args.length; index += 1) {
        const value = args[index];

        if (parts.length) pushText(" ");

        if (isInspectable(value)) {
          const originalIndex = index + 1;
          parts.push({ type: "object", index: originalIndex });
          objectTokens.push({ index: originalIndex, value });
          rawParts.push(createInlinePreview(value));
        } else {
          pushText(formatPrimitivePlaceholder(value));
        }
      }

      return { parts, raw: rawParts.join(""), objectTokens };
    }

    function objectToRow(value) {
      if (isPlainObject(value) || Array.isArray(value)) {
        const row = {};

        for (const key of Object.keys(value).slice(0, MAX_TABLE_COLUMNS)) {
          row[key] = value[key];
        }

        return row;
      }

      return { Value: value };
    }

    function normalizeTableRows(value) {
      if (Array.isArray(value)) {
        return value.map((item, index) => ({
          index: String(index),
          values: objectToRow(item),
        }));
      }

      if (value instanceof Map) {
        return Array.from(value.entries()).map(([key, item]) => ({
          index: String(key),
          values: objectToRow(item),
        }));
      }

      if (value instanceof Set) {
        return Array.from(value.values()).map((item, index) => ({
          index: String(index),
          values: objectToRow(item),
        }));
      }

      if (isPlainObject(value)) {
        return Object.keys(value).map((key) => ({
          index: key,
          values: objectToRow(value[key]),
        }));
      }

      return [{ index: "0", values: objectToRow(value) }];
    }

    function createTableModel(value, requestedColumns) {
      const rows = normalizeTableRows(value);
      const columnSet = new Set();
      const requested = Array.isArray(requestedColumns)
        ? requestedColumns.map(String)
        : typeof requestedColumns === "string"
          ? [requestedColumns]
          : null;

      for (const row of rows.slice(0, MAX_TABLE_ROWS)) {
        for (const key of Object.keys(row.values)) {
          columnSet.add(key);
          if (columnSet.size >= MAX_TABLE_COLUMNS) break;
        }
      }

      return {
        columns: requested || Array.from(columnSet).slice(0, MAX_TABLE_COLUMNS),
        rows: rows.slice(0, MAX_TABLE_ROWS),
      };
    }

    /* ******************** */
    /* Safari Zoom Lock     */
    /* ******************** */

    function whenHeadReady(callback) {
      if (document.head) {
        callback();
        return;
      }

      document.addEventListener("DOMContentLoaded", callback, { once: true });
    }

    function getOrCreateViewportMeta() {
      let element = document.querySelector('meta[name="viewport"]');
      let created = false;

      if (!element) {
        element = createElement("meta", {
          name: "viewport",
        });

        created = true;
        (document.head || document.documentElement).appendChild(element);
      }

      return { element, created };
    }

    function getOrCreateZoomStyle() {
      const id = "rod-utils-zoom-lock-style";
      let style = document.getElementById(id);

      if (!style) {
        style = createElement(`style#${id}`);
        (document.head || document.documentElement).appendChild(style);
      }

      return style;
    }

    function lockZoom() {
      let cleanup = () => {};

      whenHeadReady(() => {
        let lastTouchEnd = 0;

        const viewport = getOrCreateViewportMeta();
        const previousViewportContent =
          viewport.element.getAttribute("content");

        const style = getOrCreateZoomStyle();
        const previousStyleText = style.textContent;

        viewport.element.setAttribute("content", VIEWPORT_CONTENT);

        style.textContent = css`
          html,
          body,
          input,
          textarea,
          select,
          button {
            -webkit-text-size-adjust: 100% !important;
            text-size-adjust: 100% !important;
            touch-action: manipulation !important;
          }

          input,
          textarea,
          select {
            font-size: max(16px, 1em) !important;
          }

          * {
            -webkit-tap-highlight-color: transparent !important;
          }
        `.cssText;

        function block(event) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        }

        function blockMultiTouch(event) {
          if (event.touches && event.touches.length > 1) block(event);
        }

        function blockDoubleTap(event) {
          const now = Date.now();

          if (now - lastTouchEnd <= 350) block(event);

          lastTouchEnd = now;
        }

        function blockShortcutZoom(event) {
          const isKeyboardEvent = "key" in event;
          const isZoomKey =
            isKeyboardEvent &&
            (event.key === "+" ||
              event.key === "-" ||
              event.key === "=" ||
              event.key === "0");

          if ((event.ctrlKey || event.metaKey) && isZoomKey) block(event);
        }

        const blockingOptions = {
          passive: false,
          capture: true,
        };

        const offGestureStart = onDoc.gesturestart(block, blockingOptions);
        const offGestureChange = onDoc.gesturechange(block, blockingOptions);
        const offGestureEnd = onDoc.gestureend(block, blockingOptions);
        const offTouchStart = onDoc.touchstart(
          blockMultiTouch,
          blockingOptions,
        );
        const offTouchMove = onDoc.touchmove(blockMultiTouch, blockingOptions);
        const offTouchEnd = onDoc.touchend(blockDoubleTap, blockingOptions);
        const offWheel = onDoc.wheel(blockShortcutZoom, blockingOptions);
        const offKeyDown = onDoc.keydown(blockShortcutZoom, blockingOptions);

        cleanup = function unlockSafariZoom() {
          offGestureStart();
          offGestureChange();
          offGestureEnd();
          offTouchStart();
          offTouchMove();
          offTouchEnd();
          offWheel();
          offKeyDown();

          if (viewport.created) {
            viewport.element.remove();
          } else if (previousViewportContent == null) {
            viewport.element.removeAttribute("content");
          } else {
            viewport.element.setAttribute("content", previousViewportContent);
          }

          style.textContent = previousStyleText || "";
        };
      });

      return function unlockZoomWhenReady() {
        cleanup();
      };
    }

    /* ******************** */
    /* Visual Debug         */
    /* ******************** */

    function debugElementOutlines(options = {}) {
      const {
        id = "rod-debug-element-outlines",
        root = document,
        enabled = true,
      } = options;
      const existing = root.getElementById?.(id) || document.getElementById(id);

      if (!enabled) {
        existing?.remove();
        return null;
      }

      if (existing instanceof HTMLStyleElement) return existing;

      const style = createElement(`style#${id}`, {
        textContent: css`
          * {
            outline: 1px solid rgba(255, 0, 0, 0.55) !important;
            outline-offset: -1px !important;
          }

          * * {
            outline-color: rgba(0, 180, 255, 0.45) !important;
          }

          * * * {
            outline-color: rgba(120, 255, 120, 0.38) !important;
          }

          * * * * {
            outline-color: rgba(255, 210, 0, 0.36) !important;
          }

          * * * * * {
            outline-color: rgba(255, 0, 180, 0.34) !important;
          }
        `.cssText,
      });

      const target =
        root === document ? document.head || document.documentElement : root;

      target.appendChild(style);

      return style;
    }

    /* *************** */
    /* Viewport Utils  */
    /* *************** */

    function getViewportRect() {
      const viewport = window.visualViewport;
      return {
        left: viewport?.offsetLeft || 0,
        top: viewport?.offsetTop || 0,
        width: viewport?.width || window.innerWidth,
        height: viewport?.height || window.innerHeight,
      };
    }

    function clampNumber(value, min, max) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return min;
      }
      return Math.min(max, Math.max(min, numeric));
    }

    function clampPanelRect(input, options = {}) {
      const viewport = getViewportRect();
      const {
        minWidth = 320,
        minHeight = 260,
        screenGap = 10,
        minX = 6,
        minY = 6,
      } = options;
      const maxWidth = Math.max(minWidth, viewport.width - screenGap * 2);
      const maxHeight = Math.max(minHeight, viewport.height - screenGap * 2);
      const width = clampNumber(input.width, minWidth, maxWidth);
      const height = clampNumber(input.height, minHeight, maxHeight);
      const safeMinX = viewport.left + minX;
      const safeMinY = viewport.top + minY;
      const maxX = viewport.left + viewport.width - width - screenGap;
      const maxY = viewport.top + viewport.height - height - screenGap;
      return {
        x: clampNumber(input.x, safeMinX, Math.max(safeMinX, maxX)),
        y: clampNumber(input.y, safeMinY, Math.max(safeMinY, maxY)),
        width,
        height,
      };
    }

    function createStorageDriver(storage = localStorage) {
      return {
        read(key, fallback = {}) {
          return readStorageValue(key, fallback, storage);
        },

        write(key, value, fallback = null) {
          return writeStorageValue(key, value, fallback, storage);
        },

        remove(key) {
          try {
            storage.removeItem(key);
            return true;
          } catch {
            return false;
          }
        },

        clear() {
          try {
            storage.clear();
            return true;
          } catch {
            return false;
          }
        },
      };
    }

    function readStorageValue(key, fallback = {}, storage = localStorage) {
      try {
        if (typeof key !== "string" || key.trim() === "") return fallback;

        const rawValue = storage.getItem(key);

        if (rawValue == null || rawValue === "") return fallback;

        return JSON.parse(rawValue);
      } catch {
        return fallback;
      }
    }

    function writeStorageValue(
      key,
      value,
      fallback = null,
      storage = localStorage,
    ) {
      try {
        if (typeof key !== "string" || key.trim() === "") return false;

        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        try {
          storage.setItem(
            key,
            JSON.stringify(fallback !== null ? fallback : {}),
          );
          return true;
        } catch {
          return false;
        }
      }
    }

    /* ******************** */
    /* Builders Export      */
    /* ******************** */
    
    
    

    const [CipoCSS, FabricaHTML] = await waitForGlobal(["Cipo", "Fabrica"]);

    const cipoInlineCss =
      CipoCSS?.inline?.css || CipoCSS?.inline || CipoCSS?.css || css;


     /*
function scoped(api) {
  return function run(callback) {
    return callback(api);
  };
}


usage: 

const {
  html,
  render,
  signal,
} = createScope(Fabrica);

function createScope(api) {
  const reservedWords = new Set([
    "await",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "enum",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "new",
    "null",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "yield",
    "let",
    "static",
  ]);

  function isSafeIdentifier(key) {
    return /^[A-Za-z_$][\w$]*$/.test(key) && !reservedWords.has(key);
  }

  const keys = Object.keys(api).filter(isSafeIdentifier);
  const aliases = Object.keys(api)
    .filter((key) => !isSafeIdentifier(key))
    .map((key) => {
      const alias = `$${String(key).replace(/[^\w$]+/g, "_")}`;
      return { key, alias };
    });

  const destructured = [
    ...keys,
    ...aliases.map(({ key, alias }) => `${JSON.stringify(key)}: ${alias}`),
  ];

  const returned = [
    ...keys,
    ...aliases.map(({ key, alias }) => `${JSON.stringify(key)}: ${alias}`),
  ];

  return new Function(
    "api",
    `
    const {
      ${destructured.join(",\n      ")}
    } = api;

    return {
      ${returned.join(",\n      ")}
    };
    `,
  )(api);
}
*/


  /**
   * Wraps a function and logs time, memory delta, status, and errors.
   *
   * @template {(...args: any[]) => any} T
   * @param {string} label Log label.
   * @param {T} fn Function to wrap.
   * @param {{
   *   namespace?: string;
   *   logger?: Console;
   *   showArgs?: boolean;
   *   alwaysLog?: boolean;
   * }} [options] Options.
   * @returns {T} Wrapped function.
   *
   * @example
   * const run = RodUtils.timed("parseCss", () => parseCss(source));
   * run();
   */
 function timed(label, fn, options = {}) {
    const namespace = options.namespace || "RodUtils";
    const logTarget = options.logger || console;
    const showArgs = true || options.showArgs === true;
    const alwaysLog = options.alwaysLog === true;
    const shouldDebug = alwaysLog || window[DEBUG_FLAG] === true;
    const scopedLogger = createLogger(namespace);

    /**
     * Runs the wrapped callback.
     *
     * @param {any[]} args Function args.
     * @param {() => *} invoke Invoke function.
     * @returns {*} Function result.
     */
    function runWithoutReport(args, invoke) {
      if (!shouldDebug) {
        window.alerta?.setFunction?.(label);
//
        try {
          return invoke();
        } finally {
          window.alerta?.clear?.();
        }
      }

      scopedLogger.debug(label, "Started", showArgs ? args : "");

      return invoke();
    }

    /**
     * Prints the final report.
     *
     * @param {"ok"|"error"} status Status.
     * @param {number} startedAt Start time.
     * @param {{ used: number; total: number; limit: number }|null} memoryBefore Memory before.
     * @param {*|null} error Error.
     * @param {any[]} args Function args.
     * @returns {void}
     */
    function printReport(status, startedAt, memoryBefore, error, args) {
      const duration = performance.now() - startedAt;
      const memoryAfter = exports.getMemorySnapshot();
      const memoryDelta = memoryBefore && memoryAfter ? memoryAfter.used - memoryBefore.used : null;

      const rows = [
        ["Namespace", namespace],
        ["Task", label],
        ["Status", status],
        ["Time", `${duration.toFixed(2)} ms`],
        ["Heap Δ", exports.formatBytes(memoryDelta)],
        ["Heap used", memoryAfter ? exports.formatBytes(memoryAfter.used) : "n/a"],
      ];

      if (showArgs) rows.push(["Args", exports.trimText(exports.safeJson(args), 240)]);
      if (error) rows.push(["Error", error?.message || String(error)]);

      const width = Math.min(80, Math.max(34, Math.max(...rows.map(([key, value]) => `${key}: ${value}`.length)) + 6));
      const bar = "─".repeat(width - 2);
      const icon = status === "ok" ? "✅" : "💥";
      const method = status === "ok" ? "log" : "error";

      logTarget[method](
        [
          `╭${bar}╮`,
          `│ ${icon} ${"Timed Function".padEnd(width - 5)}│`,
          `├${bar}┤`,
          ...rows.map(([key, value]) => {
            const text = `${key}: ${value}`;
            return `│ ${text.padEnd(width - 4)} │`;
          }),
          `╰${bar}╯`,
        ].join("\n"),
      );
    }

    return function wrapped(...args) {
      return runWithoutReport(args, () => {
        const startedAt = performance.now();
        const memoryBefore = exports.getMemorySnapshot();

        try {
          const result = fn.apply(this, args);

          if (result && typeof result.then === "function") {
            return result
              .then((value) => {
                if (shouldDebug) printReport("ok", startedAt, memoryBefore, null, args);
                return value;
              })
              .catch((error) => {
                if (shouldDebug) printReport("error", startedAt, memoryBefore, error, args);
                throw error;
              });
          }

          if (shouldDebug) printReport("ok", startedAt, memoryBefore, null, args);

          return result;
        } catch (error) {
          if (shouldDebug) printReport("error", startedAt, memoryBefore, error, args);
          throw error;
        }
      });
    };
  };
  
    /* ******************** */ 
    /* Public Export        */
    /* ******************** */

    Object.assign(exports, {
      VERSION,
      SIGNAL_SYMBOL,

      toolkit: window.esToolkit || window._ || {},
      logger,
      nativeAddEventListener,
      nativeRemoveEventListener,

      createLogger,
      createDebugLogger,
      isDebugEnabled,
      setDebugEnabled,

      defineGlobal,
      hashText,
      safeCall,
      safeRead,
      isObject,
      isObjectLike,
      isPlainObject,
      isPrimitive,
      isInspectable,
      isNodeListLike,
      escapeHtml,
      trimText,
      dedent,
      copyText,
      formatBytes,
      getMemorySnapshot,
      safeJson,
      line,

      on,
      onWindow,
      onDocument,
      onDoc,
      onBody,
      onHead,

      waitForGlobal,
      timeoutImport,
      promiseTimeout,
      loadScriptOnce,
      injectStylesheet,
      installStyleOnce,
      importSafe,

      MiniHLJS,
      normalizeHighlightLanguage,
      highlightCode,
      miniPrettier,
      prettyCss,
      formatHtml,
      formatCss,
      prettySource,
      splitHighlightedLines,
      sanitizeConsoleStyle,

      cleanupEffect,
      trackEffect,
      isSignalLike,
      signal,
      signalOld: signal,
      effect,
      computed,

      formatElement,
      formatDomLabel,
      getNodeLabel,
      findReactPrivateKey,
      getReactProps,
      findReact,
      FindReact: findReact,
      isReactElement,
      getReactOwnerInfo,
      getElementFromObject,

      installEventListenerTracker,
      uninstallEventListenerTracker,
      getEventListeners,
      getEventListenersByType,
      getAllTrackedEventListeners,

      splitLines,
      getVirtualSlice,
      createVirtualTextComponent,

      createStore,
      createEventBus,
      writeStorageValue,
      readStorageValue,
      createStorageDriver,

      getInspectableEntries,
      formatPrimitivePlaceholder,
      formatPreviewItem,
      createInlinePreview,
      formatPlaceholder,
      parseConsoleValues,
      objectToRow,
      normalizeTableRows,
      createTableModel,

      lockZoom,

      createElement,
      el,
      tinyCss: cipoInlineCss,
      css: cipoInlineCss,
      isRodCss,
      toCssText,
      normalizeInlineCss,
      parseEmmet,
      applyProps,
      applyStyle,
      appendChild,

      debugElementOutlines,
      timed,

      getViewportRect,
      clampNumber,
      clampPanelRect,

      lucide: window?.lucide,
      createIcons: window?.lucide?.createIcons,
      icons: window?.lucide?.icons,
      
      
      Cipo: CipoCSS,
      Fabrica: FabricaHTML,
    });

    installEventListenerTracker();

    defineGlobal(GLOBAL_NAME, exports, {
      immutable: false,
    });
    
    
    
    
    
    
    
    
    /**
    
    const button = el("<button.primary#save[type=button]>", {
      text: "Salvar",
    }).css`
      color: white;
      background: black;
    `;

    el(".card")
      .css`
        border-radius: 16px;
        padding: 12px;
      `
      .on("click", console.log);

    document.body.appendChild(el("#app").first?.child(button));

    console.log("GLOBAL VARS", { hljs, RodCDN });


    **/





    logger.debug("install", `Installed ${GLOBAL_NAME} v${VERSION}`, exports);
  } catch (error) {
    window.console.error("Erro no RodUtils", error);
  }
})();
