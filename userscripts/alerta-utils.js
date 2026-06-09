// ==UserScript==
// @name         ⛱️ 000 / Alerta / Shared Utils
// @namespace    https://rod.dev/userscripts
// @version      1.4.1
// @description  Shared utilities for Alerta Docked Inspector.
// @author       Rod
// @match        *://*/*
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/es-toolkit@^1
// @require      https://unpkg.com/lucide@0.468.0/dist/umd/lucide.js?v1
// @weight       999
// @grant        none
// ==/UserScript==

(function InstallRodUtils() {
  "use strict";

  /* ******************** */
  /* Fatal Guards         */
  /* ******************** */

  window.addEventListener("error", (event) => {
    console.error("[RodUtils Fatal]", event.error || event.message, event);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[RodUtils Promise Fatal]", event.reason, event);
  });

  /********************
   * Constants
   ********************/

  const GLOBAL_NAME = "RodUtils";
  const VERSION = "1.4.1";
  const DEBUG_FLAG = "__ROD_DEBUG__";
  const STYLE_LOADER_PREFIX = "rod-utils-style-";
  const SCRIPT_LOADER_PREFIX = "rod-utils-script-";

  const REACT_PROPS_PREFIX = "__reactProps$";
  const REACT_FIBER_PREFIX = "__reactFiber$";
  const REACT_LEGACY_INSTANCE_PREFIX = "__reactInternalInstance$";

  const MAX_PRETTY_SOURCE_LENGTH = 250_000;
  const DEFAULT_TIMEOUT_MS = 10_000;
  const DEFAULT_LOADER_TIMEOUT_MS = 12_000;

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

  /********************
   * Logger
   ********************/

  /**
   * Creates a namespaced console logger.
   *
   * @param {string} namespace Logger namespace.
   * @returns {{
   *   log: (fn: string, ...args: any[]) => void;
   *   info: (fn: string, ...args: any[]) => void;
   *   warn: (fn: string, ...args: any[]) => void;
   *   error: (fn: string, ...args: any[]) => void;
   *   debug: (fn: string, ...args: any[]) => void;
   *   group: (fn: string, ...args: any[]) => void;
   *   groupEnd: () => void;
   * }}
   *
   * @example
   * const logger = RodUtils.createLogger("UTILS");
   * logger.log("boot", "Ready");
   */
  exports.createLogger = function createLogger(namespace) {
    /**
     * Formats the visible console prefix.
     *
     * @param {string} fn Function name.
     * @returns {string} Console prefix.
     */
    function prefix(fn) {
      return `[${namespace}] [${fn || "anonymous"}]`;
    }

    /**
     * Creates a console method wrapper.
     *
     * @param {"log"|"info"|"warn"|"error"|"debug"|"group"} level Console level.
     * @returns {(fn: string, ...args: any[]) => void} Wrapped method.
     */
    function createMethod(level) {
      return function loggerMethod(fn, ...args) {
        const output = console[level] || console.log;

        output.call(
          console,
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
        if (console.groupEnd) console.groupEnd();
      },
    });
  };

  const logger = exports.createLogger("RodUtils");

  /********************
   * General Helpers
   ********************/

  /**
   * Defines a global property.
   *
   * @param {string} name Global name.
   * @param {*} value Global value.
   * @param {{ immutable?: boolean; enumerable?: boolean }} [options] Options.
   * @returns {boolean} Success state.
   *
   * @example
   * RodUtils.defineGlobal("MyApi", api, { immutable: true });
   */
  exports.defineGlobal = function defineGlobal(name, value, options = {}) {
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
  };

  /**
   * Hashes text into a compact id.
   *
   * @param {*} value Value.
   * @returns {string} Hash.
   *
   * @example
   * RodUtils.hashText("hello");
   */
  exports.hashText = function hashText(value) {
    let hash = 5381;
    const text = String(value);

    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 33) ^ text.charCodeAt(index);
    }

    return Math.abs(hash >>> 0).toString(36);
  };

  /**
   * Safely runs a callback.
   *
   * @template T
   * @param {() => T} callback Callback.
   * @param {*} [fallback=null] Fallback.
   * @returns {T|*} Result.
   *
   * @example
   * const data = RodUtils.safeCall(() => JSON.parse(raw), {});
   */
  exports.safeCall = function safeCall(callback, fallback = null) {
    try {
      return callback();
    } catch {
      return fallback;
    }
  };

  /**
   * Checks whether a value is object-like.
   *
   * @param {*} value Value.
   * @returns {boolean} True when object-like.
   *
   * @example
   * RodUtils.isObjectLike({});
   */
  exports.isObjectLike = function isObjectLike(value) {
    return value !== null && (typeof value === "object" || typeof value === "function");
  };

  /**
   * Checks whether a value is a plain object.
   *
   * @param {*} value Value.
   * @returns {boolean} True when plain object.
   *
   * @example
   * RodUtils.isPlainObject({ ok: true });
   */
  exports.isPlainObject = function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;

    const prototype = Object.getPrototypeOf(value);

    return prototype === null || prototype === Object.prototype;
  };

  /**
   * Checks whether a value looks like a node list.
   *
   * @param {*} value Value.
   * @returns {boolean} True when node-list-like.
   *
   * @example
   * RodUtils.isNodeListLike(document.querySelectorAll("div"));
   */
  exports.isNodeListLike = function isNodeListLike(value) {
    return (
      value instanceof NodeList ||
      value instanceof HTMLCollection ||
      Boolean(value && typeof value.length === "number" && typeof value !== "string" && typeof value.item === "function")
    );
  };

  /**
   * Escapes HTML text.
   *
   * @param {*} value Raw value.
   * @returns {string} Escaped value.
   *
   * @example
   * RodUtils.escapeHtml("<div>");
   */
  exports.escapeHtml = function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  };

  /**
   * Trims long text.
   *
   * @param {*} value Value.
   * @param {number} [limit=240] Max length.
   * @returns {string} Trimmed text.
   *
   * @example
   * RodUtils.trimText("abcdef", 3);
   */
  exports.trimText = function trimText(value, limit = 240) {
    const text = String(value ?? "");
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
  };

  /**
   * Dedents template-like text.
   *
   * @param {*} value Raw text.
   * @returns {string} Dedented text.
   *
   * @example
   * RodUtils.dedent("  hello");
   */
  exports.dedent = function dedent(value) {
    const text = String(value ?? "").replace(/\r\n?/g, "\n");
    const lines = text.split("\n");

    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

    const indents = lines
      .filter((line) => line.trim())
      .map((line) => line.match(/^\s*/)[0].length);

    const minIndent = indents.length ? Math.min(...indents) : 0;

    return lines.map((line) => line.slice(minIndent)).join("\n");
  };

  /**
   * Copies text to the clipboard with a fallback.
   *
   * @param {*} value Text value.
   * @returns {Promise<boolean>} Success state.
   *
   * @example
   * await RodUtils.copyText("hello");
   */
  exports.copyText = async function copyText(value) {
    const text = String(value ?? "");

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {}
    }

    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:fixed;top:-999px;left:-999px;opacity:0";

    document.documentElement.appendChild(textarea);
    textarea.select();

    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  };

  /**
   * Formats bytes.
   *
   * @param {number|null|undefined} bytes Byte size.
   * @returns {string} Human-readable size.
   *
   * @example
   * RodUtils.formatBytes(1024);
   */
  exports.formatBytes = function formatBytes(bytes) {
    if (bytes == null || Number.isNaN(Number(bytes))) return "n/a";

    const units = ["B", "KB", "MB", "GB"];
    let value = Math.abs(Number(bytes));
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }

    return `${bytes < 0 ? "-" : ""}${value.toFixed(2)} ${units[unit]}`;
  };

  /**
   * Reads JS heap memory when the browser exposes it.
   *
   * @returns {{ used: number; total: number; limit: number }|null} Memory info.
   *
   * @example
   * RodUtils.getMemorySnapshot();
   */
  exports.getMemorySnapshot = function getMemorySnapshot() {
    const memory = performance && performance.memory;

    if (!memory) return null;

    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
    };
  };

  /**
   * Creates a centered terminal line.
   *
   * @param {string} text Label.
   * @param {string} [symbol="•"] Fill symbol.
   * @param {number} [size=60] Width.
   * @param {(message: string) => void} [log=console.warn] Logger.
   * @returns {string} Generated line.
   *
   * @example
   * RodUtils.line("Summary");
   */
  exports.line = function line(text, symbol = "•", size = 60, log = console.warn) {
    const label = ` ${text} `;
    const available = Math.max(0, size - label.length);
    const left = Math.floor(available / 2);
    const right = available - left;
    const output = `${symbol.repeat(left)}${label}${symbol.repeat(right)}`;

    log(output);

    return output;
  };

  /**
   * Creates circular-safe JSON.
   *
   * @param {*} value Value.
   * @param {number} [space=2] Indentation.
   * @returns {string} JSON text.
   *
   * @example
   * RodUtils.safeJson(window);
   */
  exports.safeJson = function safeJson(value, space = 2) {
    const seen = new WeakSet();

    return JSON.stringify(
      value,
      function replacer(_key, currentValue) {
        if (typeof currentValue === "object" && currentValue !== null) {
          if (seen.has(currentValue)) return "[Circular]";
          seen.add(currentValue);
        }

        if (typeof currentValue === "function") return `[Function ${currentValue.name || "anonymous"}]`;
        if (typeof currentValue === "bigint") return `${currentValue}n`;
        if (typeof Node !== "undefined" && currentValue instanceof Node) return exports.getNodeLabel(currentValue);

        return currentValue;
      },
      space,
    );
  };

  /********************
   * Async / Loading
   ********************/

  /**
   * Waits until requested globals exist.
   *
   * @param {string|string[]} globals Global names.
   * @param {number} [timeout=10000] Timeout.
   * @returns {Promise<*[]>} Global values.
   *
   * @example
   * const [utils] = await RodUtils.waitForGlobal("RodUtils");
   */
  exports.waitForGlobal = async function waitForGlobal(globals, timeout = DEFAULT_TIMEOUT_MS) {
    const keys = Array.isArray(globals) ? globals : [globals];
    const startedAt = performance.now();

    while (performance.now() - startedAt < timeout) {
      const values = keys.map((key) => window[key]);

      if (values.every((value) => value !== undefined)) return values;

      await new Promise((resolve) => setTimeout(resolve, 16));
    }

    throw new Error(`[RodUtils.waitForGlobal] Timeout waiting for: ${keys.join(", ")}`);
  };

  /**
   * Imports an ESM module with a timeout.
   *
   * @param {string} url Module URL.
   * @param {number} [timeout=4000] Timeout.
   * @returns {Promise<*>} Imported module.
   *
   * @example
   * const mod = await RodUtils.timeoutImport("https://esm.sh/lit");
   */
  exports.timeoutImport = function timeoutImport(url, timeout = 4_000) {
    return Promise.race([
      import(url),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`[RodUtils.timeoutImport] Timeout importing ${url}`)), timeout);
      }),
    ]);
  };

  /**
   * Loads a script once.
   *
   * @param {string} url Script URL.
   * @param {{ id?: string; timeout?: number }} [options] Options.
   * @returns {Promise<HTMLScriptElement>} Script element.
   *
   * @example
   * await RodUtils.loadScriptOnce("https://example.com/app.js");
   */
  exports.loadScriptOnce = function loadScriptOnce(url, options = {}) {
    const id = options.id || `${SCRIPT_LOADER_PREFIX}${exports.hashText(url)}`;
    const timeout = options.timeout || DEFAULT_LOADER_TIMEOUT_MS;

    if (loadedScripts.has(id)) return loadedScripts.get(id);

    const existing = document.getElementById(id);

    if (existing instanceof HTMLScriptElement) {
      const promise = Promise.resolve(existing);
      loadedScripts.set(id, promise);
      return promise;
    }

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const timer = setTimeout(() => {
        script.remove();
        loadedScripts.delete(id);
        reject(new Error(`[RodUtils.loadScriptOnce] Timeout loading ${url}`));
      }, timeout);

      script.id = id;
      script.src = url;
      script.async = true;

      script.onload = () => {
        clearTimeout(timer);
        resolve(script);
      };

      script.onerror = () => {
        clearTimeout(timer);
        loadedScripts.delete(id);
        reject(new Error(`[RodUtils.loadScriptOnce] Failed loading ${url}`));
      };

      document.documentElement.appendChild(script);
    });

    loadedScripts.set(id, promise);

    return promise;
  };

  /**
   * Loads one stylesheet via <link rel="stylesheet"> and deduplicates by id/url.
   *
   * @param {string} href Stylesheet URL.
   * @param {{
   *   id?: string;
   *   root?: Document | ShadowRoot;
   *   media?: string;
   *   timeout?: number;
   *   crossOrigin?: string;
   *   referrerPolicy?: ReferrerPolicy;
   * }} [options] Options.
   * @returns {Promise<HTMLLinkElement>} Link element.
   *
   * @example
   * await RodUtils.injectStylesheet("https://cdn.example.com/app.css");
   */
  exports.injectStylesheet = function injectStylesheet(href, options = {}) {
    const {
      id = `style-${exports.hashText(href)}`,
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
      const link = document.createElement("link");
      const timer = setTimeout(() => {
        link.remove();
        reject(new Error(`[RodUtils.injectStylesheet] Timeout loading ${href}`));
      }, timeout);

      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      link.media = media;

      if (crossOrigin) link.crossOrigin = crossOrigin;
      if (referrerPolicy) link.referrerPolicy = referrerPolicy;

      link.onload = () => {
        clearTimeout(timer);
        resolve(link);
      };

      link.onerror = () => {
        clearTimeout(timer);
        link.remove();
        reject(new Error(`[RodUtils.injectStylesheet] Failed loading ${href}`));
      };

      const target = root === document ? document.head || document.documentElement : root;

      target.appendChild(link);
    });
  };

  /**
   * Installs a style tag once.
   *
   * @param {string} cssText CSS text.
   * @param {string} [id=""] Optional id.
   * @param {Document|ShadowRoot} [root=document] Target root.
   * @returns {HTMLStyleElement} Style element.
   *
   * @example
   * RodUtils.installStyleOnce(".x{color:red}");
   */
  exports.installStyleOnce = function installStyleOnce(cssText, id = "", root = document) {
    const styleId = id || `${STYLE_LOADER_PREFIX}${exports.hashText(cssText)}`;
    const key = `${styleId}:${root === document ? "document" : exports.hashText(String(root))}`;

    if (loadedStyles.has(key)) return loadedStyles.get(key);

    const existing = root.getElementById?.(styleId) || document.getElementById(styleId);

    if (existing instanceof HTMLStyleElement) {
      loadedStyles.set(key, existing);
      return existing;
    }

    const style = document.createElement("style");

    style.id = styleId;
    style.textContent = String(cssText);

    if (root === document) {
      (document.head || document.documentElement).appendChild(style);
    } else {
      root.appendChild(style);
    }

    loadedStyles.set(key, style);

    return style;
  };

  /**
   * Loads a remote script using GM_xmlhttpRequest when available.
   *
   * @param {string} url Script URL.
   * @returns {Promise<void>} Resolves when the script is injected.
   *
   * @example
   * await RodUtils.loadScriptWithGmXhr("https://example.com/lib.js");
   */
  exports.loadScriptWithGmXhr = function loadScriptWithGmXhr(url) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== "function") {
        reject(new Error("GM_xmlhttpRequest is not available."));
        return;
      }

      GM_xmlhttpRequest({
        method: "GET",
        url,
        responseType: "text",
        onload(response) {
          if (response.status < 200 || response.status >= 300) {
            reject(new Error(`Failed to load ${url}: ${response.status}`));
            return;
          }

          const script = document.createElement("script");
          script.textContent = `${response.responseText}\n//# sourceURL=${url}`;
          document.documentElement.appendChild(script);
          script.remove();

          resolve();
        },
        onerror() {
          reject(new Error(`Network error while loading ${url}`));
        },
        ontimeout() {
          reject(new Error(`Timeout while loading ${url}`));
        },
      });
    });
  };

  /********************
   * Timing / Debug
   ********************/

  /**
   * Checks whether debug mode is enabled.
   *
   * @returns {boolean} Enabled state.
   *
   * @example
   * RodUtils.isDebugEnabled();
   */
  exports.isDebugEnabled = function isDebugEnabled() {
    return Boolean(window[DEBUG_FLAG]);
  };

  /**
   * Enables or disables debug logs.
   *
   * @param {boolean} enabled Enabled state.
   * @returns {void}
   *
   * @example
   * RodUtils.setDebugEnabled(true);
   */
  exports.setDebugEnabled = function setDebugEnabled(enabled) {
    exports.defineGlobal(DEBUG_FLAG, Boolean(enabled), {
      immutable: false,
    });
  };

  /**
   * Formats a debug namespace.
   *
   * @param {string} namespace Namespace.
   * @returns {string} Formatted namespace.
   */
  function formatDebugNamespace(namespace) {
    return `Alerta:${String(namespace || "core")}`;
  }

  /**
   * Writes a namespaced debug log.
   *
   * @param {string} namespace Namespace.
   * @param {string} level Console level.
   * @param {string} message Message.
   * @param {...*} payload Payload.
   * @returns {void}
   */
  function writeDebug(namespace, level, message, ...payload) {
    if (!exports.isDebugEnabled() && level !== "error") return;

    const name = formatDebugNamespace(namespace);
    const method = nativeConsole[level] || nativeConsole.debug || nativeConsole.log;
    const badgeStyle = "color:#7dd3fc;background:rgba(125,211,252,.12);padding:2px 6px;border-radius:8px;font-weight:900";
    const textStyle = level === "error" ? "color:#ff7b72" : level === "warn" ? "color:#fbbf24" : "color:#e5e7eb";

    method.call(nativeConsole, `%c${name}%c ${message}`, badgeStyle, textStyle, ...payload);
  }

  /**
   * Creates a namespaced logger for shell and plugins.
   *
   * @param {string} namespace Namespace.
   * @returns {object} Debug logger.
   *
   * @example
   * const debug = RodUtils.createDebugLogger("plugin");
   * debug.info("ready");
   */
  exports.createDebugLogger = function createDebugLogger(namespace) {
    const scopedName = String(namespace || "core");

    return {
      get enabled() {
        return exports.isDebugEnabled();
      },

      setEnabled: exports.setDebugEnabled,

      child(childNamespace) {
        return exports.createDebugLogger(`${scopedName}:${childNamespace}`);
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
        if (!exports.isDebugEnabled()) return;

        const tracer = nativeConsole.trace || nativeConsole.debug || nativeConsole.log;

        tracer.call(
          nativeConsole,
          `%c${formatDebugNamespace(scopedName)}%c ${message}`,
          "color:#c084fc;font-weight:900",
          "color:#e5e7eb",
          ...payload,
        );
      },

      group(message, ...payload) {
        if (!exports.isDebugEnabled()) return;

        const grouper = nativeConsole.groupCollapsed || nativeConsole.group || nativeConsole.log;

        grouper.call(
          nativeConsole,
          `%c${formatDebugNamespace(scopedName)}%c ${message}`,
          "color:#7dd3fc;font-weight:900",
          "color:#e5e7eb",
          ...payload,
        );
      },

      groupEnd() {
        if (!exports.isDebugEnabled()) return;
        nativeConsole.groupEnd?.();
      },

      time(label) {
        if (!exports.isDebugEnabled()) return;
        nativeConsole.time?.(`${formatDebugNamespace(scopedName)}:${label}`);
      },

      timeEnd(label) {
        if (!exports.isDebugEnabled()) return;
        nativeConsole.timeEnd?.(`${formatDebugNamespace(scopedName)}:${label}`);
      },
    };
  };

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
  exports.timed = function timed(label, fn, options = {}) {
    const namespace = options.namespace || "RodUtils";
    const logTarget = options.logger || console;
    const showArgs = options.showArgs === true;
    const alwaysLog = options.alwaysLog === true;
    const shouldDebug = alwaysLog || window[DEBUG_FLAG] === true;
    const scopedLogger = exports.createLogger(namespace);

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

  /********************
   * Formatting
   ********************/

  /**
   * Highlights code when highlight.js exists.
   *
   * @param {*} value Source code.
   * @param {string} [language="javascript"] Language.
   * @returns {string} HTML string.
   *
   * @example
   * RodUtils.highlightCode("const x = 1", "javascript");
   */
  exports.highlightCode = function highlightCode(value, language = "javascript") {
    const code = String(value ?? "");

    if (window.hljs?.highlight) {
      try {
        return window.hljs.highlight(code, { language, ignoreIllegals: true }).value;
      } catch {}
    }

    if (window.hljs?.highlightAuto) {
      try {
        return window.hljs.highlightAuto(code).value;
      } catch {}
    }

    return exports.escapeHtml(code);
  };

  /**
   * Pretty-formats small source text without external libraries.
   *
   * @param {string} source Raw source.
   * @returns {string} Pretty-ish source.
   *
   * @example
   * RodUtils.miniPrettier("a{color:red}");
   */
  exports.miniPrettier = function miniPrettier(source) {
    return String(source ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\s*([{}[\]();,:>])\s*/g, "$1")
      .replace(/([{};>])\s*/g, "$1\n")
      .replace(/\n+/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .reduce(
        (state, line) => {
          if (/^[}\])]/.test(line)) state.indent = Math.max(0, state.indent - 1);

          state.lines.push(`${"  ".repeat(state.indent)}${line}`);

          if (/[{[(]$/.test(line) && !/^[}\])]/.test(line)) state.indent += 1;

          return state;
        },
        { indent: 0, lines: [] },
      )
      .lines.join("\n");
  };

  /**
   * Formats HTML-ish text.
   *
   * @param {*} source Raw source.
   * @returns {string} Formatted text.
   *
   * @example
   * RodUtils.formatHtml("<div><span>x</span></div>");
   */
  exports.formatHtml = function formatHtml(source) {
    return exports.miniPrettier(String(source ?? ""));
  };

  /**
   * Formats CSS-ish text.
   *
   * @param {*} source Raw source.
   * @returns {string} Formatted text.
   *
   * @example
   * RodUtils.formatCss("a{color:red}");
   */
  exports.formatCss = function formatCss(source) {
    return exports.miniPrettier(String(source ?? ""));
  };

  /**
   * Pretty-formats source using Prettier when available.
   *
   * @param {string} source Source.
   * @param {string} [language="javascript"] Language.
   * @param {boolean} [highlight=false] Whether to return highlighted HTML.
   * @returns {Promise<string>} Formatted source or highlighted HTML.
   *
   * @example
   * await RodUtils.prettySource("const x=1", "javascript", true);
   */
  exports.prettySource = async function prettySource(source, language = "javascript", highlight = false) {
    const text = String(source ?? "");
    let output = text;

    if (text.length > MAX_PRETTY_SOURCE_LENGTH) {
      return highlight ? exports.highlightCode(output, language) : output;
    }

    if (!window.prettier || !window.prettierPlugins) {
      output = exports.miniPrettier(text);
      return highlight ? exports.highlightCode(output, language) : output;
    }

    try {
      const parser = language === "css" ? "css" : language === "html" || language === "xml" ? "html" : "babel";
      const result = window.prettier.format(text, {
        parser,
        plugins: window.prettierPlugins,
      });

      output = typeof result === "string" ? result : await result;
    } catch (error) {
      logger.warn("prettySource", "Prettier failed, using miniPrettier.", error);
      output = exports.miniPrettier(text);
    }

    return highlight ? exports.highlightCode(output, language) : output;
  };

  /**
   * Sanitizes console CSS style text.
   *
   * @param {*} value Style text.
   * @returns {string} Safe-ish style.
   *
   * @example
   * RodUtils.sanitizeConsoleStyle("color:red");
   */
  exports.sanitizeConsoleStyle = function sanitizeConsoleStyle(value) {
    return String(value ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => !/url\s*\(|expression\s*\(|behavior\s*:/i.test(part))
      .join(";");
  };

  /********************
   * Reactivity
   ********************/

  /**
   * Removes dependencies from an effect runner.
   *
   * @param {Function} runner Runner.
   * @returns {void}
   */
  exports.cleanupEffect = function cleanupEffect(runner) {
    const deps = EFFECT_DEPS.get(runner);
    if (!deps) return;

    for (const dep of deps) dep.delete(runner);

    deps.clear();
  };

  /**
   * Tracks the current effect.
   *
   * @param {Set<Function>} subscribers Subscribers.
   * @returns {void}
   */
  exports.trackEffect = function trackEffect(subscribers) {
    const currentEffect = CURRENT_EFFECT_STACK[CURRENT_EFFECT_STACK.length - 1];

    if (!currentEffect || subscribers.has(currentEffect)) return;

    subscribers.add(currentEffect);

    let deps = EFFECT_DEPS.get(currentEffect);

    if (!deps) {
      deps = new Set();
      EFFECT_DEPS.set(currentEffect, deps);
    }

    deps.add(subscribers);
  };

  /* ****************************** */
  /* Symbols                        */
  /* ****************************** */

  const SIGNAL_SYMBOL = Symbol.for("rod.signal");
  exports.SIGNAL_SYMBOL = SIGNAL_SYMBOL;

  /**
   * Checks if a value is a signal.
   *
   * @param {*} value Possible signal.
   * @returns {boolean} True when signal.
   *
   * @example
   * RodUtils.isSignalLike(RodUtils.signal(1));
   */
  exports.isSignalLike = function isSignalLike(value) {
    return Boolean(value && typeof value === "function" && value[SIGNAL_SYMBOL] === true);
  };

  /**
   * Creates a reactive signal.
   *
   * @param {*} initialValue Initial value.
   * @returns {Function} Signal reader.
   *
   * @example
   * const count = RodUtils.signal(0);
   * count.set(1);
   */
  exports.signal = function signal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();

    function read() {
      exports.trackEffect(subscribers);
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
  };

  /**
   * Creates a legacy signal.
   *
   * @template T
   * @param {T} initialValue Initial value.
   * @returns {Function} Signal getter.
   *
   * @example
   * const value = RodUtils.signalOld("x");
   */
  exports.signalOld = function signalOld(initialValue) {
    return exports.signal(initialValue);
  };

  /**
   * Runs a reactive effect.
   *
   * @param {Function} callback Effect callback.
   * @returns {Function} Dispose callback.
   *
   * @example
   * const dispose = RodUtils.effect(() => console.log(signal()));
   */
  exports.effect = function effect(callback) {
    function run() {
      exports.cleanupEffect(run);
      CURRENT_EFFECT_STACK.push(run);

      try {
        callback();
      } finally {
        CURRENT_EFFECT_STACK.pop();
      }
    }

    run();

    return function dispose() {
      exports.cleanupEffect(run);
    };
  };

  /**
   * Creates a computed signal.
   *
   * @param {Function} callback Compute callback.
   * @returns {Function} Computed signal.
   *
   * @example
   * const double = RodUtils.computed(() => count() * 2);
   */
  exports.computed = function computed(callback) {
    const output = exports.signal(undefined);

    exports.effect(function computeEffect() {
      output.set(callback());
    });

    return output;
  };

  /********************
   * DOM / React
   ********************/

  /**
   * Formats an element as a compact tag.
   *
   * @param {Element} element Element.
   * @returns {string} Element label.
   *
   * @example
   * RodUtils.formatElement(document.body);
   */
  exports.formatElement = function formatElement(element) {
    const tag = element.tagName ? element.tagName.toLowerCase() : "element";
    const id = element.id ? ` id="${exports.escapeHtml(element.id)}"` : "";
    const className =
      typeof element.className === "string" && element.className.trim()
        ? ` class="${exports.escapeHtml(element.className.trim().split(/\s+/).slice(0, 6).join(" "))}"`
        : "";

    return `<${tag}${id}${className}>`;
  };

  /**
   * Gets a compact label for any common value.
   *
   * @param {*} value Value.
   * @returns {string} Label.
   *
   * @example
   * RodUtils.getNodeLabel(document.body);
   */
  exports.getNodeLabel = function getNodeLabel(value) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return `"${exports.trimText(value, 260)}"`;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (typeof value === "bigint") return `${value}n`;
    if (typeof value === "symbol") return value.toString();
    if (typeof value === "function") return `ƒ ${value.name || "anonymous"}()`;
    if (value instanceof Window) return "Window";
    if (value instanceof Document) return "Document";
    if (value instanceof Element) return exports.formatElement(value);
    if (value instanceof Text) return `Text("${exports.trimText(value.textContent || "", 160)}")`;
    if (value instanceof Comment) return "Comment";
    if (value instanceof Node) return `Node ${value.nodeName}`;
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (value instanceof Map) return `Map(${value.size})`;
    if (value instanceof Set) return `Set(${value.size})`;
    if (value instanceof NodeList) return `NodeList(${value.length})`;
    if (value instanceof HTMLCollection) return `HTMLCollection(${value.length})`;

    return value?.constructor?.name || "Object";
  };

  /**
   * Finds a private React key.
   *
   * @param {Element} element Element.
   * @param {string} prefix React prefix.
   * @returns {string|undefined} Private key.
   *
   * @example
   * RodUtils.findReactPrivateKey(node, "__reactFiber$");
   */
  exports.findReactPrivateKey = function findReactPrivateKey(element, prefix) {
    if (!element) return undefined;

    return Object.keys(element).find((key) => key.startsWith(prefix));
  };

  /**
   * Gets React props from a DOM element.
   *
   * @param {Element} element Element.
   * @returns {*|null} Props.
   *
   * @example
   * RodUtils.getReactProps(document.body);
   */
  exports.getReactProps = function getReactProps(element) {
    const key = exports.findReactPrivateKey(element, REACT_PROPS_PREFIX);
    return key ? element[key] : null;
  };

  /**
   * Finds a React fiber.
   *
   * @param {Element} element Element.
   * @returns {*|null} Fiber.
   *
   * @example
   * RodUtils.findReact(document.body);
   */
  exports.findReact = function findReact(element) {
    if (!element) return null;

    const fiberKey = exports.findReactPrivateKey(element, REACT_FIBER_PREFIX);
    if (fiberKey) return element[fiberKey];

    const legacyKey = exports.findReactPrivateKey(element, REACT_LEGACY_INSTANCE_PREFIX);
    if (legacyKey) return element[legacyKey];

    return null;
  };

  exports.FindReact = exports.findReact;

  /**
   * Checks whether an element has React internals.
   *
   * @param {*} value Possible element.
   * @returns {boolean} True when React internals exist.
   *
   * @example
   * RodUtils.isReactElement(document.body);
   */
  exports.isReactElement = function isReactElement(value) {
    return value instanceof Element && Boolean(exports.findReact(value) || exports.getReactProps(value));
  };

  /**
   * Gets simple React owner info from a DOM element.
   *
   * @param {Element} element Element.
   * @returns {object|null} React owner info.
   *
   * @example
   * RodUtils.getReactOwnerInfo(document.body);
   */
  exports.getReactOwnerInfo = function getReactOwnerInfo(element) {
    const fiber = exports.findReact(element);

    if (!fiber) {
      return null;
    }

    return {
      fiber,
      props: exports.getReactProps(element),
      type: fiber.type?.name || fiber.elementType?.name || fiber.tag || "unknown",
      key: fiber.key ?? null,
      stateNode: fiber.stateNode ?? null,
      owner: fiber._debugOwner ?? null,
    };
  };

  /**
   * Extracts an element from common wrappers.
   *
   * @param {*} value Value.
   * @returns {Element|null} Element.
   *
   * @example
   * RodUtils.getElementFromObject(document.body);
   */
  exports.getElementFromObject = function getElementFromObject(value) {
    if (value instanceof Element) return value;
    if (value?.target instanceof Element) return value.target;
    if (value?.currentTarget instanceof Element) return value.currentTarget;
    if (value?.element instanceof Element) return value.element;
    if (value?.node instanceof Element) return value.node;
    if (value?.el instanceof Element) return value.el;
    if (value?.$el instanceof Element) return value.$el;

    return null;
  };

  /********************
   * Event Listener Tracker
   ********************/

  /**
   * Normalizes event listener options.
   *
   * @param {boolean|AddEventListenerOptions|undefined} options Listener options.
   * @returns {{ capture: boolean; once: boolean; passive: boolean|undefined; signal: AbortSignal|undefined }} Normalized options.
   */
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

  /**
   * Gets one target registry bucket.
   *
   * @param {EventTarget} target Event target.
   * @returns {Map<string, Array<object>>} Target registry.
   */
  function getEventTargetBucket(target) {
    let bucket = eventListenerRegistry.get(target);

    if (!bucket) {
      bucket = new Map();
      eventListenerRegistry.set(target, bucket);
      eventListenerTargets.add(target);
    }

    return bucket;
  }

  /**
   * Records one listener.
   *
   * @param {EventTarget} target Event target.
   * @param {string} type Event type.
   * @param {EventListenerOrEventListenerObject} listener Listener.
   * @param {boolean|AddEventListenerOptions|undefined} options Options.
   * @returns {void}
   */
  function recordEventListener(target, type, listener, options) {
    if (!target || !type || !listener) return;

    const bucket = getEventTargetBucket(target);
    const eventType = String(type);
    const records = bucket.get(eventType) || [];
    const normalizedOptions = normalizeListenerOptions(options);
    const duplicate = records.some((record) => record.listener === listener && record.capture === normalizedOptions.capture);

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
      stack: exports.isDebugEnabled() ? new Error("[RodUtils] Event listener added here").stack : "",
    });

    bucket.set(eventType, records);
  }

  /**
   * Removes one recorded listener.
   *
   * @param {EventTarget} target Event target.
   * @param {string} type Event type.
   * @param {EventListenerOrEventListenerObject} listener Listener.
   * @param {boolean|EventListenerOptions|undefined} options Options.
   * @returns {void}
   */
  function unrecordEventListener(target, type, listener, options) {
    const bucket = eventListenerRegistry.get(target);
    if (!bucket) return;

    const eventType = String(type);
    const records = bucket.get(eventType);
    if (!records?.length) return;

    const normalizedOptions = normalizeListenerOptions(options);
    const nextRecords = records.filter((record) => !(record.listener === listener && record.capture === normalizedOptions.capture));

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

  /**
   * Installs global addEventListener/removeEventListener tracking once.
   *
   * @returns {boolean} True when installed.
   *
   * @example
   * RodUtils.installEventListenerTracker();
   */
  exports.installEventListenerTracker = function installEventListenerTracker() {
    if (EventTarget.prototype.addEventListener.__rodUtilsTracked === true) {
      return false;
    }

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
  };

  /**
   * Gets tracked event listeners for one element or event target.
   *
   * @param {EventTarget} target Event target.
   * @param {string} [type] Optional event type filter.
   * @returns {Array<object>} Listener records.
   *
   * @example
   * RodUtils.getEventListeners(document.body);
   *
   * @example
   * RodUtils.getEventListeners(document.body, "click");
   */
  exports.getEventListeners = function getEventListeners(target, type) {
    if (!target) return [];

    const bucket = eventListenerRegistry.get(target);
    if (!bucket) return [];

    if (type) {
      return Array.from(bucket.get(String(type)) || []);
    }

    const output = [];

    for (const records of bucket.values()) {
      output.push(...records);
    }

    return output;
  };

  /**
   * Gets tracked event listeners grouped by event type.
   *
   * @param {EventTarget} target Event target.
   * @returns {Record<string, Array<object>>} Grouped listeners.
   *
   * @example
   * RodUtils.getEventListenersByType(document.body);
   */
  exports.getEventListenersByType = function getEventListenersByType(target) {
    const bucket = eventListenerRegistry.get(target);
    const output = {};

    if (!bucket) return output;

    for (const [type, records] of bucket.entries()) {
      output[type] = Array.from(records);
    }

    return output;
  };

  /**
   * Gets all currently tracked targets and listeners.
   *
   * @returns {Array<{ target: EventTarget; label: string; listeners: Array<object> }>} Tracked entries.
   *
   * @example
   * RodUtils.getAllTrackedEventListeners();
   */
  exports.getAllTrackedEventListeners = function getAllTrackedEventListeners() {
    const output = [];

    for (const target of eventListenerTargets) {
      const listeners = exports.getEventListeners(target);

      if (!listeners.length) continue;

      output.push({
        target,
        label: exports.getNodeLabel(target),
        listeners,
      });
    }

    return output;
  };

  /**
   * Restores native event listener methods.
   *
   * @returns {void}
   *
   * @example
   * RodUtils.uninstallEventListenerTracker();
   */
  exports.uninstallEventListenerTracker = function uninstallEventListenerTracker() {
    EventTarget.prototype.addEventListener = nativeAddEventListener;
    EventTarget.prototype.removeEventListener = nativeRemoveEventListener;
  };

  /********************
   * Virtualization
   ********************/

  /**
   * Splits source into normalized lines.
   *
   * @param {string} source Source.
   * @returns {string[]} Lines.
   *
   * @example
   * RodUtils.splitLines("a\nb");
   */
  exports.splitLines = function splitLines(source) {
    return String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  };

  /**
   * Creates a virtual list slice.
   *
   * @param {{
   *   scrollTop: number;
   *   viewportHeight: number;
   *   rowHeight: number;
   *   total: number;
   *   overscan?: number;
   * }} options Options.
   * @returns {{ start: number; end: number; before: number; after: number }} Slice.
   *
   * @example
   * RodUtils.getVirtualSlice({ scrollTop: 0, viewportHeight: 300, rowHeight: 20, total: 1000 });
   */
  exports.getVirtualSlice = function getVirtualSlice(options) {
    const rowHeight = Math.max(1, Number(options.rowHeight || 20));
    const viewportHeight = Math.max(rowHeight, Number(options.viewportHeight || 300));
    const total = Math.max(0, Number(options.total || 0));
    const overscan = Math.max(0, Number(options.overscan || 20));
    const start = Math.max(0, Math.floor(Number(options.scrollTop || 0) / rowHeight) - overscan);
    const count = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
    const end = Math.min(total, start + count);

    return {
      start,
      end,
      before: start * rowHeight,
      after: Math.max(0, (total - end) * rowHeight),
    };
  };

  /**
   * Creates a virtualized text viewer.
   *
   * @param {object} options Options.
   * @param {HTMLElement} options.container Container element.
   * @param {string} options.text Full text content.
   * @param {number} [options.lineHeight=20] Fixed line height in pixels.
   * @param {number} [options.overscan=20] Extra lines rendered above/below viewport.
   * @returns {object} Virtual text controller.
   *
   * @example
   * const viewer = RodUtils.createVirtualTextComponent({
   *   container: document.querySelector("#viewer"),
   *   text: hugeSourceCode,
   *   lineHeight: 22,
   * });
   */
  exports.createVirtualTextComponent = function createVirtualTextComponent({ container, text, lineHeight = 20, overscan = 20 }) {
    if (!(container instanceof HTMLElement)) {
      throw new TypeError("createVirtualTextComponent needs a valid container.");
    }

    let lines = String(text || "").split("\n");
    let scrollTop = 0;
    let frame = 0;

    const root = document.createElement("div");
    const spacer = document.createElement("div");
    const viewport = document.createElement("div");

    root.style.cssText = `
      position: relative;
      height: 100%;
      overflow: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: ${lineHeight}px;
      white-space: pre;
      contain: strict;
    `;

    spacer.style.cssText = `
      position: relative;
      width: 100%;
      height: ${lines.length * lineHeight}px;
    `;

    viewport.style.cssText = `
      position: absolute;
      inset: 0 auto auto 0;
      width: 100%;
      will-change: transform;
    `;

    spacer.appendChild(viewport);
    root.appendChild(spacer);
    container.replaceChildren(root);

    /**
     * Schedules a cheap render pass.
     *
     * @returns {void}
     */
    function scheduleRender() {
      if (frame) return;

      frame = requestAnimationFrame(() => {
        frame = 0;
        render();
      });
    }

    /**
     * Renders only visible lines.
     *
     * @returns {void}
     */
    function render() {
      const height = root.clientHeight || 1;
      const start = Math.max(0, Math.floor(scrollTop / lineHeight) - overscan);
      const visibleCount = Math.ceil(height / lineHeight) + overscan * 2;
      const end = Math.min(lines.length, start + visibleCount);
      const offsetY = start * lineHeight;

      let html = "";

      for (let index = start; index < end; index += 1) {
        html += `<div style="height:${lineHeight}px">${exports.escapeHtml(lines[index] || " ")}</div>`;
      }

      viewport.style.transform = `translateY(${offsetY}px)`;
      viewport.innerHTML = html;
      spacer.style.height = `${lines.length * lineHeight}px`;
    }

    root.addEventListener(
      "scroll",
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
        root.scrollTop = Math.max(0, lineNumber * lineHeight);
      },

      destroy() {
        if (frame) cancelAnimationFrame(frame);
        container.replaceChildren();
      },
    };
  };

  /********************
   * Store
   ********************/

  /**
   * Creates a tiny deep reactive store.
   *
   * @template {Record<string, any>} T
   * @param {T} initialState Initial state.
   * @param {(change: {
   *   key: string;
   *   path: string[];
   *   value: any;
   *   previousValue: any;
   *   deleted?: boolean;
   *   target: object;
   * }) => void} [onChange] Change callback.
   * @returns {T} Reactive proxy store.
   *
   * @example
   * const state = RodUtils.createStore({ count: 0 }, console.log);
   */
  exports.createStore = function createStore(initialState, onChange = function noop() {}) {
    const proxyCache = new WeakMap();

    /**
     * Recursively proxifies objects.
     *
     * @param {*} target Target object.
     * @param {string[]} path Current path.
     * @returns {*} Proxy or primitive.
     */
    function proxify(target, path = []) {
      if (target === null || typeof target !== "object") {
        return target;
      }

      if (proxyCache.has(target)) {
        return proxyCache.get(target);
      }

      const proxy = new Proxy(target, {
        get(object, key) {
          if (typeof key === "symbol") {
            return object[key];
          }

          return proxify(object[key], path.concat(String(key)));
        },

        set(object, key, value) {
          const previousValue = object[key];

          if (Object.is(previousValue, value)) {
            return true;
          }

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
          if (!Reflect.has(object, key)) {
            return true;
          }

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
  };

  /**
   * Creates a tiny event bus with on/off/once/emit support.
   *
   * @returns {{
   *   on: (event: string, handler: Function) => () => void;
   *   once: (event: string, handler: Function) => () => void;
   *   off: (event: string, handler?: Function) => boolean;
   *   emit: (event: string, payload?: any) => void;
   *   clear: (event?: string) => void;
   *   listenerCount: (event?: string) => number;
   * }}
   *
   * @example
   * const bus = RodUtils.createEventBus();
   * const dispose = bus.on("save", console.log);
   * bus.emit("save", { id: 1 });
   * dispose();
   */
  exports.createEventBus = function createEventBus() {
    const listeners = new Map();

    /**
     * Gets or creates one listener bucket.
     *
     * @param {string} event Event name.
     * @returns {Set<Function>} Listener bucket.
     */
    function getBucket(event) {
      let bucket = listeners.get(event);

      if (!bucket) {
        bucket = new Set();
        listeners.set(event, bucket);
      }

      return bucket;
    }

    return Object.freeze({
      on(event, handler) {
        const bucket = getBucket(event);

        bucket.add(handler);

        return () => {
          this.off(event, handler);
        };
      },

      once(event, handler) {
        const dispose = this.on(event, function onceHandler(payload) {
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

        if (bucket.size === 0) {
          listeners.delete(event);
        }

        return deleted;
      },

      emit(event, payload) {
        const bucket = listeners.get(event);

        if (!bucket || bucket.size === 0) return;

        const handlers = Array.from(bucket);

        for (let index = 0; index < handlers.length; index += 1) {
          try {
            handlers[index](payload);
          } catch (error) {
            console.error(`[EventBus:${event}]`, error);
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
        if (event) {
          return listeners.get(event)?.size || 0;
        }

        let total = 0;

        for (const bucket of listeners.values()) {
          total += bucket.size;
        }

        return total;
      },
    });
  };

  /********************
   * Visual Debug
   ********************/

  /**
   * Injects a visual debug outline over every element on the page.
   *
   * @param {{
   *   id?: string;
   *   root?: Document | ShadowRoot;
   *   enabled?: boolean;
   * }} [options] Options.
   * @returns {HTMLStyleElement|null} Style node.
   *
   * @example
   * RodUtils.debugElementOutlines();
   *
   * @example
   * RodUtils.debugElementOutlines({ enabled: false });
   */
  exports.debugElementOutlines = function debugElementOutlines(options = {}) {
    const { id = "rod-debug-element-outlines", root = document, enabled = true } = options;
    const existing = root.getElementById?.(id) || document.getElementById(id);

    if (!enabled) {
      existing?.remove();
      return null;
    }

    if (existing instanceof HTMLStyleElement) {
      return existing;
    }

    const style = document.createElement("style");

    style.id = id;
    style.textContent = `
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
    `.trim();

    const target = root === document ? document.head || document.documentElement : root;

    target.appendChild(style);

    return style;
  };

  /********************
   * Public Export
   ********************/

//exports.toolkit = window.esToolkit || window._ || {};
  exports.VERSION = VERSION;
  exports.logger = logger;
  exports.nativeAddEventListener = nativeAddEventListener;
  exports.nativeRemoveEventListener = nativeRemoveEventListener;

  exports.installEventListenerTracker();

  exports.defineGlobal(GLOBAL_NAME, exports, {
    immutable: false,
  });

  logger.debug("install", `Installed ${GLOBAL_NAME} v${VERSION}`, exports);
})();
