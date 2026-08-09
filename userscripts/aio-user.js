// ==UserScript==
// @name               All-in-One Video Downloader HD
// @namespace          https://rod.migos.club/userscripts
// @version            1.48.0
// @description        Instagram + Twitter/X media relay with photo, video, carousel support and optional direct download.
// @author             @rodkisten
// @license            MIT
//
// @match              https://x.com/*
// @match              https://*.x.com/*
// @match              https://twitter.com/*
// @match              https://*.twitter.com/*
// @match              https://instagram.com/*
// @match              https://*.instagram.com/*
// @run-at             document-start
// @noframes
//
// @grant              unsafeWindow
// @grant              GM_xmlhttpRequest
// @grant              GM.xmlHttpRequest
// @grant              GM_openInTab
// @grant              GM.openInTab
//
// @connect            *
// @require            https://rod.migos.club/toaster/dist/toaster.iife.js?v=4.3.3
// ==/UserScript==

(async function AllInOneMediaRelay() {
  "use strict";

  const VERSION = "1.48.0";
  const PREFIX = `[AIO Downloader ${VERSION}]`;
  const DEBUG = false;

  const pageWindow = (() => {
    try {
      return typeof unsafeWindow !== "undefined" && unsafeWindow ? unsafeWindow : window;
    } catch {
      return window;
    }
  })();

  const IS_TWITTER = /(^|\.)(x|twitter)\.com$/i.test(location.hostname);
  const IS_INSTAGRAM = /(^|\.)instagram\.com$/i.test(location.hostname);

  if (!IS_TWITTER && !IS_INSTAGRAM) return;

  const ACTION = Object.freeze({
    telegram: "telegram",
    download: "download",
  });

  const MEDIA_KIND = Object.freeze({
    photo: "photo",
    video: "video",
  });

  const CONFIG = Object.freeze({
    features: Object.freeze({
      telegramButton: true,
      downloadButton: false,
    }),

    content: Object.freeze({
      expandMore: true,
      expandAttempts: 3,
      expandSettleMs: 90,
      maxTextLength: 32_000,
      maxTitleLength: 240,
    }),

    telegram: Object.freeze({
      url: "https://xtelegram-cf.migos.club/send",
      token: "12345678",
      timeout: 120_000,
      scriptableFallback: true,
      scriptableUrl: "scriptable:///run/KISTEN%20-%20ROUTER%20-%20VIDEO%20",
    }),

    instagram: Object.freeze({
      autoBookmarkOpenedReel: true,
      bookmarkAfterTelegram: true,
      sendToTelegramOnBookmark: true,
      bookmarkCollectionId: "1394391859209832",
      bookmarksId: "",
      graphqlUrl: "https://www.instagram.com/api/graphql",
      graphqlDocId: "27365486596441074",
      appId: "936619743392459",
    }),

    twitter: Object.freeze({
      bookmarkAfterTelegram: true,
      sendToTelegramOnBookmark: true,
      promptLikeAfterTelegram: true,
      promptLikeDurationMs: 3_000,
    }),

    ui: Object.freeze({
      scanInterval: 700,
      positionInterval: 260,
      padding: 10,
      minimumVisibleWidth: 50,
      minimumVisibleHeight: 50,
      dragThreshold: 7,
      dragStoragePrefix: "__aio_media_actions_drag__:v6",
      profileHeader: Object.freeze({
        enabled: true,
        refreshInterval: 1_800,
        avatarSize: 25,
        topOffset: 8,
      }),
      liquid: Object.freeze({
        // Safe mode is the default. It uses only CSS + pointer-driven optical
        // highlights and cannot fail because of WebGL, canvas snapshots or
        // cross-origin textures.
        fallbackEnabled: true,

        // Experimental renderer. Turn this on manually only when you want the
        // full WebGL refraction path. Keeping it false means the engine below
        // is never initialized and cannot affect media detection or clicks.
        realEnabled: true,

        buttonSize: 34,
        iconSize: 17,
        renderScale: 2,
        maxFps: 30,
        refraction: 0.69,
        chromaticAberration: 0.05,
        edgeHighlight: 0.075,
        specular: 0.22,
        fresnel: 1.0,
        distortion: 0.006,
        zRadius: 17,
        opacity: 0.96,
        saturation: 0.04,
        brightness: 0.015,
        tintStrength: 0.025,
        maxTiltDegrees: 3.2,
        maxShiftPixels: 0.85,
        highlightFollow: 0.30,
      }),
    }),

    historyKey: "__aio_media_action_history__:v5",

    hlsBundle:
      "https://gist.githubusercontent.com/rodkisten/1c69b953b51c7dac50ee3eb5c22050b6/raw/9f5b33d36ca50acea12221b258363c6722b606e6/hls-bundle.js?01",
  });

  const TELEGRAM_CHANNEL_ROUTES = Object.freeze([
    {
      sites: ["twitter", "x.com", "twitter.com"],
      channels: ["-621561106", "-324185513"],
    },
    {
      sites: ["instagram", "instagram.com"],
      channels: ["-324185513"],
    },
  ]);

  let Toast = null;

  const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));

  function truncate(value, max = 800) {
    const text = String(value ?? "");
    return text.length <= max ? text : `${text.slice(0, max)}…`;
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  // ---------------------------------------------------------------------------
  // Content expansion + payload sanitization
  // ---------------------------------------------------------------------------

  const PayloadSanitizer = Object.freeze({
    cleanText(value, options = {}) {
      const maximum = Number.isFinite(Number(options.maxLength))
        ? Math.max(0, Number(options.maxLength))
        : CONFIG.content.maxTextLength;

      let text = String(value ?? "")
        .replace(/\r\n?/g, "\n")
        .replace(/\u00a0/g, " ")
        .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();

      if (!text) return "";

      const uiOnly = /^(?:more|show more|read more|see more|mais|mostrar mais|ver mais|ler mais|translation|translate|see translation|ver tradução|ver traducao)$/i;
      const counterOnly = /^(?:\d[\d.,]*\s*)?(?:likes?|curtidas?|comments?|comentários?|comentarios|replies|respostas|reposts?|retweets?|views?|visualizações?|visualizacoes)$/i;
      const chromeOnly = /^(?:following|seguindo|follow|seguir|subscribe|inscrever-se|reply|responder|share|compartilhar|bookmark|save|salvar)$/i;

      const output = [];
      let previous = "";
      for (const rawLine of text.split("\n")) {
        let line = rawLine
          .replace(/^[\s·•]+|[\s·•]+$/g, "")
          .replace(/(?:\s|\u00a0)+(?:…|\.\.\.)?\s*(?:more|mais)$/i, "")
          .trim();

        if (!line || uiOnly.test(line) || counterOnly.test(line) || chromeOnly.test(line)) continue;
        if (line === previous) continue;
        previous = line;
        output.push(line);
      }

      text = output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
      if (maximum > 0 && text.length > maximum) text = text.slice(0, maximum).trimEnd();
      return text;
    },

    cleanTitle(value) {
      return this.cleanText(value, { maxLength: CONFIG.content.maxTitleLength })
        .replace(/\s*[·•]\s*\d+[smhdwy]\b.*$/i, "")
        .replace(/\s*[·•]\s*\d+\s*(?:s|min|h|d|sem|w|y)\b.*$/i, "")
        .trim();
    },

    cleanUrl(value) {
      try {
        const url = new URL(String(value || location.href), location.href);
        url.hash = "";
        for (const name of [
          "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
          "igsh", "igshid", "s", "t", "ref_src", "ref_url",
        ]) {
          url.searchParams.delete(name);
        }
        if (!url.searchParams.size) url.search = "";
        return url.href;
      } catch {
        return String(value || "").trim();
      }
    },

    metadata(value, depth = 0, seen = new WeakSet()) {
      if (value == null) return value;
      if (depth > 5) return undefined;

      const type = typeof value;
      if (type === "string") return this.cleanText(value, { maxLength: 4_000 });
      if (type === "number" || type === "boolean") return value;
      if (type === "bigint") return String(value);
      if (type === "function" || type === "symbol" || type === "undefined") return undefined;
      if (type !== "object") return String(value);
      if (seen.has(value)) return undefined;
      seen.add(value);

      if (Array.isArray(value)) {
        return value
          .slice(0, 100)
          .map((item) => this.metadata(item, depth + 1, seen))
          .filter((item) => item !== undefined);
      }

      const result = {};
      for (const [key, current] of Object.entries(value).slice(0, 100)) {
        if (/^(?:root|target|element|node|fiber|children|props)$/i.test(key)) continue;
        const sanitized = this.metadata(current, depth + 1, seen);
        if (sanitized !== undefined) result[key] = sanitized;
      }
      return result;
    },

    context(context = {}) {
      return {
        ...context,
        providerId: String(context.providerId || "generic").toLowerCase(),
        hostname: String(context.hostname || location.hostname).replace(/^www\./, ""),
        pageUrl: this.cleanUrl(context.pageUrl || location.href),
        title: this.cleanTitle(context.title || context.providerId || ""),
        text: this.cleanText(context.text || ""),
        metadata: this.metadata(context.metadata || {}) || {},
      };
    },
  });

  const MoreExpander = (() => {
    const clicked = new WeakSet();
    const inFlight = new WeakMap();

    const exactLabels = {
      twitter: /^(?:show more|read more|more|mostrar mais|ver mais|ler mais)$/i,
      instagram: /^(?:(?:…|\.\.\.)\s*)?(?:more|mais|ver mais|mostrar mais|ler mais)$/i,
    };

    function label(element) {
      if (!isElement(element)) return "";
      return normalizeText(
        element.getAttribute?.("aria-label") ||
          element.getAttribute?.("title") ||
          element.innerText ||
          element.textContent ||
          "",
      );
    }

    function candidates(root, provider) {
      if (!isElement(root)) return [];
      const result = [];
      const seen = new Set();
      const add = (element) => {
        if (!isElement(element) || seen.has(element) || clicked.has(element) || !element.isConnected) return;
        seen.add(element);
        result.push(element);
      };

      if (provider === "twitter") {
        root
          .querySelectorAll?.(
            '[data-testid="tweet-text-show-more-link"], [data-testid*="showMore" i], [data-testid*="show-more" i]',
          )
          .forEach(add);

        const textRoot = root.querySelector?.('[data-testid="tweetText"]');
        const scope = textRoot?.parentElement || textRoot || root;
        scope
          ?.querySelectorAll?.('button,a,[role="button"],span')
          ?.forEach((element) => {
            if (!exactLabels.twitter.test(label(element))) return;
            if (element.closest?.('[role="menu"],nav,header,footer')) return;
            add(element);
          });
      } else if (provider === "instagram") {
        root
          .querySelectorAll?.('button,[role="button"],span[role="button"],a')
          .forEach((element) => {
            if (!exactLabels.instagram.test(label(element))) return;
            if (element.closest?.('nav,header,footer,[role="menu"]')) return;
            if (/options?|opções|opcoes/i.test(label(element))) return;
            add(element);
          });
      }

      return result;
    }

    function click(element) {
      if (!isElement(element) || clicked.has(element)) return false;
      clicked.add(element);
      try {
        element.click();
        return true;
      } catch (error) {
        debug("Falha clicando em More", error);
        return false;
      }
    }

    async function expand(root, provider, options = {}) {
      if (!CONFIG.content.expandMore || !isElement(root)) return 0;
      const pending = inFlight.get(root);
      if (pending) return pending;

      const promise = (async () => {
        let total = 0;
        const attempts = options.settle === false
          ? 1
          : Math.max(1, Number(CONFIG.content.expandAttempts) || 1);

        for (let attempt = 0; attempt < attempts; attempt += 1) {
          let changed = 0;
          for (const candidate of candidates(root, provider)) {
            if (click(candidate)) changed += 1;
          }
          total += changed;
          if (!changed) break;
          if (options.settle !== false) await sleep(CONFIG.content.expandSettleMs);
        }

        if (total) {
          debug("Conteúdo expandido", { provider, total });
        }
        return total;
      })().finally(() => inFlight.delete(root));

      inFlight.set(root, promise);
      return promise;
    }

    return Object.freeze({
      expand,
      kick(root, provider) {
        void expand(root, provider, { settle: false }).catch((error) =>
          debug("Expansão oportunista falhou", error),
        );
      },
    });
  })();

  function safeStringify(value, space = 2) {
    const seen = new WeakSet();

    try {
      return JSON.stringify(
        value,
        (_key, current) => {
          if (typeof current === "bigint") return `${current}n`;
          if (typeof current === "function") {
            return `[Function ${current.name || "anonymous"}]`;
          }
          if (typeof current === "symbol") return String(current);
          if (!current || typeof current !== "object") return current;
          if (seen.has(current)) return "[Circular]";
          seen.add(current);

          if (current instanceof Error) {
            return {
              name: current.name,
              message: current.message,
              stack: current.stack,
              cause: current.cause,
            };
          }

          return current;
        },
        space,
      );
    } catch {
      return String(value);
    }
  }

  function isElement(value) {
    return Boolean(
      value &&
        typeof value === "object" &&
        value.nodeType === 1 &&
        typeof value.getBoundingClientRect === "function",
    );
  }

  function isVideoElement(value) {
    return isElement(value) && String(value.tagName || "").toUpperCase() === "VIDEO";
  }

  function isAudioElement(value) {
    return isElement(value) && String(value.tagName || "").toUpperCase() === "AUDIO";
  }

  function isMediaElement(value) {
    return isVideoElement(value) || isAudioElement(value);
  }

  function isImageElement(value) {
    return isElement(value) && String(value.tagName || "").toUpperCase() === "IMG";
  }

  function log(...args) {
    try {
      console.log(PREFIX, ...args);
    } catch {}
    try {
      const sink = window.DevTools?.ingestLogs?.({
        source: "aio-downloader",
        badge: "aio",
      });
      sink?.append?.("log", String(args[0] ?? ""), args.length > 1 ? args.slice(1) : null);
    } catch {}
  }

  function warn(...args) {
    try {
      console.warn(PREFIX, ...args);
    } catch {}
    try {
      const sink = window.DevTools?.ingestLogs?.({
        source: "aio-downloader",
        badge: "aio",
      });
      sink?.append?.("warning", String(args[0] ?? ""), args.length > 1 ? args.slice(1) : null);
    } catch {}
  }

  function debug(...args) {
    if (!DEBUG) return;
    try {
      console.debug(PREFIX, ...args);
    } catch {}
    try {
      Toast?.debug?.({
        title: "AIO debug",
        description: truncate(args.map((value) => safeStringify(value, 0)).join(" · "), 1600),
      });
    } catch {}
  }

  function gmRequest(details) {
    let fn = null;

    try {
      if (typeof GM_xmlhttpRequest === "function") fn = GM_xmlhttpRequest;
    } catch {}

    if (!fn) {
      try {
        if (typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function") {
          fn = GM.xmlHttpRequest.bind(GM);
        }
      } catch {}
    }

    if (!fn) return null;

    try {
      return fn(details);
    } catch (error) {
      warn("GM request falhou sincronamente", error);
      return null;
    }
  }

  function gmText(url, options = {}) {
    return new Promise((resolve, reject) => {
      const request = gmRequest({
        method: options.method || "GET",
        url: String(url),
        headers: options.headers || {},
        data: options.data,
        timeout: Number(options.timeout || 30_000),
        onload(response) {
          const status = Number(response.status || 0);
          const text = String(response.responseText || response.response || "");
          if (status < 200 || status >= 300) {
            reject(new Error(`HTTP ${status}: ${truncate(text)}`));
            return;
          }
          resolve(text);
        },
        onerror(event) {
          reject(new Error(`Falha de rede: ${safeStringify(event, 0)}`));
        },
        ontimeout() {
          reject(new Error("Timeout de rede."));
        },
      });

      if (!request) {
        fetch(String(url), {
          method: options.method || "GET",
          headers: options.headers || {},
          body: options.data,
          credentials: options.credentials || "omit",
        })
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
          })
          .then(resolve, reject);
      }
    });
  }

  function gmJson(url, options = {}) {
    return gmText(url, options).then((text) => JSON.parse(text));
  }

  function gmBlob(url, onProgress) {
    return new Promise((resolve, reject) => {
      const request = gmRequest({
        method: "GET",
        url: String(url),
        responseType: "blob",
        timeout: CONFIG.telegram.timeout,
        onprogress(event) {
          if (event.lengthComputable && event.total > 0) {
            onProgress?.(Math.round((event.loaded / event.total) * 100));
          }
        },
        onload(response) {
          const status = Number(response.status || 0);
          if (status < 200 || status >= 300) {
            reject(new Error(`HTTP ${status}`));
            return;
          }
          if (!(response.response instanceof Blob)) {
            reject(new Error("Resposta não é Blob."));
            return;
          }
          resolve({
            blob: response.response,
            finalUrl: response.finalUrl || url,
          });
        },
        onerror(event) {
          reject(new Error(`Falha de rede: ${safeStringify(event, 0)}`));
        },
        ontimeout() {
          reject(new Error("Timeout ao baixar mídia."));
        },
      });

      if (!request) {
        fetch(String(url))
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response
              .blob()
              .then((blob) => ({ blob, finalUrl: response.url || String(url) }));
          })
          .then(resolve, reject);
      }
    });
  }

  function gmOpen(url) {
    try {
      if (typeof GM_openInTab === "function") {
        return GM_openInTab(String(url), { active: true, insert: true });
      }
    } catch {}

    try {
      if (typeof GM !== "undefined" && typeof GM.openInTab === "function") {
        return GM.openInTab(String(url), { active: true, insert: true });
      }
    } catch {}

    try {
      return window.open(String(url), "_blank", "noopener,noreferrer");
    } catch {
      return null;
    }
  }

  async function waitForDom() {
    if (document.body) return;

    await new Promise((resolve) => {
      let observer = null;

      const done = () => {
        try {
          observer?.disconnect();
        } catch {}
        resolve();
      };

      observer = new MutationObserver(() => {
        if (document.body) done();
      });

      if (document.documentElement) {
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      }

      document.addEventListener("DOMContentLoaded", done, { once: true });
    });
  }

  // ---------------------------------------------------------------------------
  // RodToaster adapter. No visual fallback.
  //
  // The toaster source exposes a callable `RodToaster` / `toast` API with
  // info(), success(), warning(), error(), update(), dismiss(), configure(),
  // options(), etc. Some builds do not expose loading() or confirm().
  //
  // The downloader therefore builds its progress-task abstraction ON TOP of
  // RodToaster.info() + controller.update(), instead of requiring non-existent
  // methods and killing the whole userscript at startup.
  // ---------------------------------------------------------------------------

  function resolveRodToaster() {
    const entries = [];
    const seen = new Set();

    const add = (source, value) => {
      if (!value || seen.has(value)) return;
      seen.add(value);
      entries.push({ source, value });
    };

    try {
      if (typeof RodToaster !== "undefined") add("lexical.RodToaster", RodToaster);
    } catch {}

    try {
      if (typeof toast !== "undefined") add("lexical.toast", toast);
    } catch {}

    for (const [source, scope] of [
      ["window", window],
      ["globalThis", globalThis],
      ["pageWindow", pageWindow],
    ]) {
      try {
        add(`${source}.RodToaster`, scope?.RodToaster);
        add(`${source}.toast`, scope?.toast);
      } catch {}
    }

    for (const entry of entries) {
      const candidate = entry.value;
      if (
        typeof candidate === "function" &&
        typeof candidate.success === "function" &&
        typeof candidate.error === "function" &&
        (
          typeof candidate.info === "function" ||
          typeof candidate.warning === "function" ||
          typeof candidate.update === "function"
        )
      ) {
        return {
          api: candidate,
          source: entry.source,
        };
      }
    }

    return {
      api: null,
      source: "unavailable",
      diagnostics: entries.map(({ source, value }) => ({
        source,
        type: typeof value,
        ownKeys: (() => {
          try {
            return Reflect.ownKeys(value).map(String).slice(0, 100);
          } catch {
            return [];
          }
        })(),
      })),
    };
  }

  function createRodToasterAdapter() {
    const resolved = resolveRodToaster();
    const raw = resolved.api;

    // Notification rendering is deliberately isolated from the rest of the
    // application. A bad/missing @require must never remove media buttons or
    // disable bookmark interception. There is no alternate visual toaster.
    if (!raw) {
      warn(
        "RodToaster não foi encontrado. O downloader continua funcional, mas sem notificações visuais.",
        resolved.diagnostics || [],
      );

      const noopTask = Object.freeze({
        update() { return noopTask; },
        setProgress() { return noopTask; },
        success() { return noopTask; },
        error() { return noopTask; },
        dismiss() {},
      });

      return Object.freeze({
        raw: null,
        source: resolved.source,
        version: null,
        available: false,
        canConfirm: false,
        loading() { return noopTask; },
        success() { return null; },
        warning() { return null; },
        error() { return null; },
        info() { return null; },
        debug() { return null; },
        async confirm() { return false; },
        diagnostics() {
          return {
            available: false,
            source: resolved.source,
            diagnostics: resolved.diagnostics || [],
          };
        },
      });
    }

    try {
      raw.configure?.({
        position: "top-center",
        maxToasts: 20,
        duration: 15_000,
        dedupe: true,
        shouldDebug: DEBUG,
        stacked: true,
        stackVisible: 3,
        swipeToDismiss: true,
      });
    } catch (error) {
      // Unknown config keys are supposed to be ignored by RodToaster. Still,
      // configuration is cosmetic and may never take the app down.
      warn("RodToaster.configure() falhou; usando configuração interna do toaster.", error);
    }

    let sequence = 0;

    const option = (values = {}) => {
      try {
        if (typeof raw.options === "function") return raw.options(values);
      } catch {}
      return values;
    };

    const payloadParts = (payload, fallbackTitle = "") => {
      if (payload == null) return [fallbackTitle || ""];
      if (typeof payload !== "object") return [String(payload)];

      const title = normalizeText(payload.title || fallbackTitle);
      const description = normalizeText(payload.description || "");
      return [title, description].filter(Boolean);
    };

    const invoke = (method, payload, options = {}) => {
      const fn =
        typeof raw?.[method] === "function"
          ? raw[method].bind(raw)
          : typeof raw === "function"
            ? raw.bind(raw)
            : null;

      if (!fn) return null;

      const parts = payloadParts(payload, method);
      try {
        return fn(...parts, option(options));
      } catch (error) {
        warn(`RodToaster.${method}() falhou`, error);
        return null;
      }
    };

    const task = (payload = {}) => {
      sequence += 1;
      const id = `aio-progress-${VERSION}-${sequence}-${Date.now()}`;
      let currentPayload = {
        title: normalizeText(payload?.title || "Processando"),
        description: normalizeText(payload?.description || ""),
      };
      let currentType = "info";
      let controller = invoke("info", currentPayload, {
        id,
        duration: 0,
        dedupe: false,
        closeButton: true,
      });

      const updateController = (next = {}, type = currentType, duration = 0) => {
        currentPayload = {
          title: normalizeText(next?.title ?? currentPayload.title),
          description: normalizeText(next?.description ?? currentPayload.description),
        };
        currentType = type;

        const parts = payloadParts(currentPayload, type);
        const opts = option({
          id,
          type,
          duration,
          dedupe: false,
          closeButton: true,
        });

        try {
          if (controller && typeof controller.update === "function") {
            controller = controller.update(...parts, opts) || controller;
            return;
          }
        } catch (error) {
          warn("RodToaster controller.update() falhou", error);
        }

        // If the original controller disappeared, update by id when supported.
        try {
          if (typeof raw.update === "function") {
            controller = raw.update(id, ...parts, opts) || controller;
            if (controller) return;
          }
        } catch (error) {
          warn("RodToaster.update() falhou", error);
        }

        controller = invoke(type, currentPayload, {
          id,
          duration,
          dedupe: false,
          closeButton: true,
        }) || controller;
      };

      const api = {
        update(next = {}) {
          updateController(next, currentType, 0);
          return api;
        },

        setProgress(percentage, next = {}) {
          const normalized = Math.max(
            0,
            Math.min(100, Math.round(Number(percentage) || 0)),
          );
          const baseDescription =
            next?.description ??
            currentPayload.description ??
            "";
          const description =
            /\b\d{1,3}%\b/.test(String(baseDescription))
              ? String(baseDescription)
              : `${String(baseDescription || "Processando").trim()} · ${normalized}%`;

          updateController(
            {
              ...next,
              description,
            },
            currentType,
            0,
          );
          return api;
        },

        success(next = {}) {
          updateController(next, "success", 4_500);
          return api;
        },

        error(next = {}) {
          updateController(next, "error", 9_000);
          return api;
        },

        dismiss() {
          try {
            if (controller && typeof controller.dismiss === "function") {
              controller.dismiss();
              return;
            }
          } catch {}

          try {
            raw.dismiss?.(controller || id);
          } catch {}
        },
      };

      return api;
    };

    const hasConfirm = typeof raw.confirm === "function";

    log("RodToaster conectado", {
      source: resolved.source,
      version: raw.version || null,
      methods: {
        info: typeof raw.info,
        success: typeof raw.success,
        warning: typeof raw.warning,
        error: typeof raw.error,
        update: typeof raw.update,
        dismiss: typeof raw.dismiss,
        configure: typeof raw.configure,
        loading: typeof raw.loading,
        confirm: typeof raw.confirm,
      },
    });

    return Object.freeze({
      raw,
      source: resolved.source,
      version: raw.version || null,
      available: true,
      canConfirm: hasConfirm,

      loading(payload) {
        // Prefer a native loading() only when this toaster build actually has it.
        if (typeof raw.loading === "function") {
          try {
            const native = raw.loading(payload);
            if (native) return native;
          } catch (error) {
            warn("RodToaster.loading() falhou; usando task baseada em info/update.", error);
          }
        }
        return task(payload);
      },

      info(payload, options = {}) {
        return invoke("info", payload, options);
      },

      success(payload, options = {}) {
        return invoke("success", payload, options);
      },

      warning(payload, options = {}) {
        if (typeof raw.warning === "function") {
          return invoke("warning", payload, options);
        }
        return invoke("info", payload, options);
      },

      error(payload, options = {}) {
        return invoke("error", payload, options);
      },

      debug(payload, options = {}) {
        if (!DEBUG) return null;
        if (typeof raw.debug === "function") {
          return invoke("debug", payload, options);
        }
        return invoke("info", payload, options);
      },

      async confirm(payload) {
        if (!hasConfirm) return false;
        try {
          const result = await raw.confirm(payload);
          if (typeof result === "boolean") return result;
          return Boolean(result?.confirmed ?? result?.value ?? result?.ok);
        } catch (error) {
          warn("RodToaster.confirm() falhou", error);
          return false;
        }
      },

      diagnostics() {
        return {
          available: true,
          source: resolved.source,
          version: raw.version || null,
          canConfirm: hasConfirm,
          ownKeys: (() => {
            try {
              return Reflect.ownKeys(raw).map(String);
            } catch {
              return [];
            }
          })(),
        };
      },
    });
  }

  function configureRodToaster() {
    return createRodToasterAdapter();
  }

  // ---------------------------------------------------------------------------
  // Generic media helpers
  // ---------------------------------------------------------------------------

  const Media = {
    isHttp(url) {
      return /^https?:\/\//i.test(String(url || ""));
    },

    isBlob(url) {
      return /^blob:/i.test(String(url || ""));
    },

    isData(url) {
      return /^data:/i.test(String(url || ""));
    },

    isMp4(url) {
      return /\.mp4(?:$|[?#])/i.test(String(url || ""));
    },

    isHls(url) {
      return /\.m3u8(?:$|[?#])/i.test(String(url || ""));
    },

    isDash(url) {
      return /\.mpd(?:$|[?#])/i.test(String(url || ""));
    },

    imageUrlFromElement(image) {
      if (!isImageElement(image)) return "";

      const candidates = [];
      const srcset = String(image.getAttribute?.("srcset") || "");

      for (const entry of srcset.split(",")) {
        const trimmed = entry.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/\s+/);
        const url = parts[0];
        const descriptor = parts[1] || "";
        let weight = 0;
        const widthMatch = descriptor.match(/^(\d+)w$/i);
        const densityMatch = descriptor.match(/^([0-9.]+)x$/i);
        if (widthMatch) weight = Number(widthMatch[1]);
        else if (densityMatch) weight = Number(densityMatch[1]) * 10_000;
        candidates.push({ url, weight });
      }

      for (const url of [image.currentSrc, image.src, image.getAttribute?.("src")]) {
        if (url) candidates.push({ url: String(url), weight: 1 });
      }

      candidates.sort((a, b) => b.weight - a.weight);
      return candidates.find((entry) => /^(https?:|blob:|data:)/i.test(entry.url))?.url || "";
    },

    normalizeTwitterPhoto(url) {
      try {
        const parsed = new URL(String(url), location.href);
        if (!/pbs\.twimg\.com$/i.test(parsed.hostname)) return parsed.href;
        if (!/\/media\//i.test(parsed.pathname)) return parsed.href;

        if (!parsed.searchParams.get("format")) {
          const extension = parsed.pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1];
          if (extension) parsed.searchParams.set("format", extension);
        }
        parsed.searchParams.set("name", "orig");
        return parsed.href;
      } catch {
        return String(url || "");
      }
    },

    ownVideoUrls(video) {
      if (!isMediaElement(video)) return [];
      return [...new Set([
        video.currentSrc,
        video.src,
        ...[...(video.querySelectorAll?.("source[src]") || [])].map(
          (source) => source.src || source.getAttribute?.("src"),
        ),
      ].filter(Boolean).map(String))];
    },

    performance(filter = null) {
      const entries = performance?.getEntriesByType?.("resource") || [];
      return entries
        .map((entry) => String(entry.name || ""))
        .filter((url) => /^https?:/i.test(url))
        .filter((url) => !filter || filter.test(url));
    },

    visibleRect(element) {
      if (!isElement(element) || !element.isConnected) return null;

      let style;
      try {
        style = getComputedStyle(element);
      } catch {
        return null;
      }

      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) <= 0.01
      ) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft || 0;
      const viewportTop = viewport?.offsetTop || 0;
      const viewportWidth = Math.max(1, viewport?.width || innerWidth || 1);
      const viewportHeight = Math.max(1, viewport?.height || innerHeight || 1);
      const viewportRight = viewportLeft + viewportWidth;
      const viewportBottom = viewportTop + viewportHeight;

      const left = Math.max(rect.left, viewportLeft);
      const top = Math.max(rect.top, viewportTop);
      const right = Math.min(rect.right, viewportRight);
      const bottom = Math.min(rect.bottom, viewportBottom);
      const width = Math.max(0, right - left);
      const height = Math.max(0, bottom - top);

      if (
        width < CONFIG.ui.minimumVisibleWidth ||
        height < CONFIG.ui.minimumVisibleHeight
      ) {
        return null;
      }

      return {
        source: rect,
        left,
        top,
        right,
        bottom,
        width,
        height,
      };
    },

    visibleScore(element) {
      const rect = this.visibleRect(element);
      if (!rect) return -Infinity;
      let score = rect.width * rect.height;

      if (isMediaElement(element) && !element.paused && !element.ended) {
        score += 2_000_000_000;
      }

      if (isVideoElement(element)) score += 50_000;
      return score;
    },

    imageLooksLikeContent(image, provider) {
      if (!isImageElement(image)) return false;
      const url = this.imageUrlFromElement(image);
      if (!url) return false;

      const rect = image.getBoundingClientRect();
      const width = Math.max(Number(image.naturalWidth || 0), rect.width || 0);
      const height = Math.max(Number(image.naturalHeight || 0), rect.height || 0);

      if (width < 180 || height < 180) return false;

      if (provider === "twitter") {
        return (
          /pbs\.twimg\.com\/media\//i.test(url) ||
          Boolean(image.closest?.('[data-testid="tweetPhoto"]'))
        );
      }

      if (provider === "instagram") {
        if (!/cdninstagram\.com|fbcdn\.net/i.test(url)) return false;

        // Instagram has a LOT of images that are not post media: avatars,
        // story tray circles, profile-grid thumbnails, suggestions and chrome.
        // Only accept an image when it belongs to a real post/dialog, or when
        // the current route itself is a focused media viewer (story/reel/post).
        const routeMode = instagramRouteMode();
        const article = image.closest?.("article");
        const dialog = image.closest?.('[role="dialog"]');
        const focusedRoute = routeMode !== "ambient";

        if (!article && !dialog && !focusedRoute) return false;
        if (image.closest?.("header,nav,footer,aside")) return false;
        if (/profile|avatar|profile picture/i.test(String(image.alt || ""))) return false;

        // Story bubbles on feed/profile are navigation thumbnails, not the
        // currently opened story media.
        const storyLink = image.closest?.('a[href^="/stories/"]');
        if (storyLink && routeMode !== "story") return false;

        // Grid thumbnails are previews. They only become media after opening
        // the post/reel itself or a dialog.
        const postPreviewLink = image.closest?.('a[href*="/p/"],a[href*="/reel/"],a[href*="/tv/"]');
        if (postPreviewLink && !article && !dialog && !focusedRoute) return false;

        // On focused viewers we still reject tiny UI/decorative images even
        // when their source comes from Instagram's CDN.
        if (focusedRoute && !article && !dialog) {
          const visible = this.visibleRect(image);
          if (!visible || visible.width < 220 || visible.height < 220) return false;
          const viewportArea = Math.max(1, (window.visualViewport?.width || innerWidth || 1) * (window.visualViewport?.height || innerHeight || 1));
          if (visible.width * visible.height < viewportArea * 0.08) return false;
        }

        return true;
      }

      return true;
    },

    dedupeItems(items) {
      const output = [];
      const seen = new Set();

      for (const item of items || []) {
        const url = String(item?.url || "").trim();
        if (!url || !/^(https?:|blob:|data:)/i.test(url)) continue;
        const kind = item.kind === MEDIA_KIND.photo ? MEDIA_KIND.photo : MEDIA_KIND.video;
        const key = `${kind}|${url}`;
        if (seen.has(key)) continue;
        seen.add(key);
        output.push({
          ...item,
          url,
          kind,
        });
      }

      return output;
    },

    sortItems(items) {
      const values = this.dedupeItems(items);
      return values.sort((a, b) => {
        const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : 1e9;
        const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : 1e9;
        if (orderA !== orderB) return orderA - orderB;

        if (a.kind !== b.kind) {
          return a.kind === MEDIA_KIND.video ? -1 : 1;
        }

        return Number(b.score || 0) - Number(a.score || 0);
      });
    },

    extensionFromMime(mimeType, fallbackKind = MEDIA_KIND.video) {
      const mime = String(mimeType || "").toLowerCase();
      if (mime.includes("jpeg")) return "jpg";
      if (mime.includes("png")) return "png";
      if (mime.includes("webp")) return "webp";
      if (mime.includes("gif")) return "gif";
      if (mime.includes("avif")) return "avif";
      if (mime.includes("mp4")) return "mp4";
      if (mime.includes("webm")) return "webm";
      if (mime.includes("quicktime")) return "mov";
      return fallbackKind === MEDIA_KIND.photo ? "jpg" : "mp4";
    },

    extensionFromUrl(url, kind) {
      try {
        const parsed = new URL(String(url), location.href);
        const format = parsed.searchParams.get("format");
        if (/^[a-z0-9]{2,5}$/i.test(String(format || ""))) return format.toLowerCase();
        const extension = parsed.pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1];
        if (extension) return extension.toLowerCase();
      } catch {}
      return kind === MEDIA_KIND.photo ? "jpg" : "mp4";
    },

    filename(url, provider, kind, index = 0, total = 1, mimeType = "") {
      const extension = mimeType
        ? this.extensionFromMime(mimeType, kind)
        : this.extensionFromUrl(url, kind);
      const suffix = total > 1 ? `-${String(index + 1).padStart(2, "0")}` : "";
      return `${provider || "media"}-${Date.now()}${suffix}.${extension}`;
    },

    downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = "noopener noreferrer";
      anchor.style.position = "fixed";
      anchor.style.left = "-99999px";
      (document.body || document.documentElement)?.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  };

  function reactObjects(element) {
    if (!isElement(element)) return [];

    const objects = [];
    const seen = new Set();
    let current = element;
    let depth = 0;

    while (isElement(current) && depth < 12) {
      let names = [];
      try {
        names = Object.getOwnPropertyNames(current);
      } catch {}

      for (const name of names) {
        if (!/^__(?:reactProps|reactFiber|reactContainer|reactInternalInstance)\$/i.test(name)) {
          continue;
        }

        try {
          const value = current[name];
          if (!value || typeof value !== "object") continue;

          if (/^__reactProps\$/i.test(name)) {
            if (!seen.has(value)) {
              seen.add(value);
              objects.push(value);
            }
            continue;
          }

          let fiber = value;
          let fiberDepth = 0;
          while (fiber && typeof fiber === "object" && fiberDepth < 18) {
            for (const props of [fiber.memoizedProps, fiber.pendingProps]) {
              if (props && typeof props === "object" && !seen.has(props)) {
                seen.add(props);
                objects.push(props);
              }
            }
            fiber = fiber.return;
            fiberDepth += 1;
          }
        } catch {}
      }

      current = current.parentElement;
      depth += 1;
    }

    return objects;
  }

  // ---------------------------------------------------------------------------
  // Twitter capture. Stores photos and videos per tweet.
  // ---------------------------------------------------------------------------

  class TwitterCaptureService {
    posts = new Map();
    metadata = new Map();
    installed = false;
    syndication = new Map();

    ensurePost(id) {
      const key = String(id || "");
      let record = this.posts.get(key);
      if (!record) {
        record = new Map();
        this.posts.set(key, record);
      }
      return record;
    }

    remember(id, item, metadata = {}) {
      if (!id || !item?.url) return;

      const normalized = {
        ...item,
        kind: item.kind === MEDIA_KIND.photo ? MEDIA_KIND.photo : MEDIA_KIND.video,
        url:
          item.kind === MEDIA_KIND.photo
            ? Media.normalizeTwitterPhoto(item.url)
            : String(item.url),
      };

      if (normalized.kind === MEDIA_KIND.video) {
        if (!/video\.twimg\.com/i.test(normalized.url)) return;
        if (!Media.isMp4(normalized.url) && !Media.isHls(normalized.url)) return;
      }

      if (normalized.kind === MEDIA_KIND.photo) {
        if (!/pbs\.twimg\.com/i.test(normalized.url)) return;
      }

      const post = this.ensurePost(id);
      const key = `${normalized.kind}|${normalized.url}`;
      const previous = post.get(key);

      if (!previous || Number(normalized.score || 0) >= Number(previous.score || 0)) {
        post.set(key, normalized);
      }

      if (metadata && typeof metadata === "object") {
        this.metadata.set(String(id), {
          ...(this.metadata.get(String(id)) || {}),
          ...metadata,
        });
      }
    }

    ingest(value, inheritedId = null, depth = 0, seen = new WeakSet()) {
      if (depth > 85 || !value || typeof value !== "object" || seen.has(value)) return;
      seen.add(value);

      if (Array.isArray(value)) {
        for (const child of value) this.ingest(child, inheritedId, depth + 1, seen);
        return;
      }

      const node =
        value.__typename === "TweetWithVisibilityResults" && value.tweet
          ? value.tweet
          : value;
      const legacy = node.legacy || value.legacy || null;
      const looksLikeTweet = Boolean(
        node.__typename === "Tweet" ||
          value.__typename === "Tweet" ||
          legacy?.full_text != null ||
          legacy?.extended_entities,
      );

      const id =
        (looksLikeTweet && /^\d+$/.test(String(node.rest_id || "")) && String(node.rest_id)) ||
        (looksLikeTweet && /^\d+$/.test(String(legacy?.id_str || "")) && String(legacy.id_str)) ||
        inheritedId;

      const user = node.core?.user_results?.result;
      const userLegacy = user?.legacy || {};
      const metadata = {
        author:
          userLegacy.screen_name ||
          userLegacy.name ||
          user?.core?.screen_name ||
          "",
        text: legacy?.full_text || node.full_text || "",
      };

      for (const mediaList of [
        legacy?.extended_entities?.media,
        node.extended_entities?.media,
        value.mediaDetails,
        node.mediaDetails,
      ]) {
        if (!Array.isArray(mediaList) || !id) continue;

        mediaList.forEach((media, index) => {
          const mediaType = String(media?.type || "").toLowerCase();

          if (mediaType === "photo") {
            const imageUrl =
              media.media_url_https ||
              media.media_url ||
              media.url ||
              "";

            if (imageUrl) {
              this.remember(
                id,
                {
                  kind: MEDIA_KIND.photo,
                  url: imageUrl,
                  order: index,
                  score: Number(media.original_info?.width || 0) * Number(media.original_info?.height || 0),
                },
                metadata,
              );
            }
          }

          for (const variant of media?.video_info?.variants || media?.variants || []) {
            const url = String(variant?.url || "");
            if (!url) continue;
            this.remember(
              id,
              {
                kind: MEDIA_KIND.video,
                url,
                order: index,
                score: Number(variant?.bitrate || variant?.bit_rate || 0),
              },
              metadata,
            );
          }
        });
      }

      if (id) {
        for (const list of [
          value.video_info?.variants,
          node.video_info?.variants,
          value.variants,
          node.variants,
        ]) {
          if (!Array.isArray(list)) continue;
          for (const variant of list) {
            const url = String(variant?.url || "");
            if (!url) continue;
            this.remember(
              id,
              {
                kind: MEDIA_KIND.video,
                url,
                score: Number(variant?.bitrate || variant?.bit_rate || 0),
              },
              metadata,
            );
          }
        }
      }

      for (const child of Object.values(value)) {
        if (child && typeof child === "object") {
          this.ingest(child, id, depth + 1, seen);
        }
      }
    }

    ingestElement(element) {
      if (!isElement(element)) return;
      for (const value of reactObjects(element)) {
        try {
          this.ingest(value);
        } catch {}
      }
    }

    items(id) {
      const values = [...(this.posts.get(String(id))?.values() || [])];
      const mp4Videos = values.filter(
        (item) => item.kind === MEDIA_KIND.video && Media.isMp4(item.url),
      );
      const hlsVideos = values.filter(
        (item) => item.kind === MEDIA_KIND.video && Media.isHls(item.url),
      );
      const photos = values.filter((item) => item.kind === MEDIA_KIND.photo);

      if (mp4Videos.length) {
        const bestVideo = [...mp4Videos].sort(
          (a, b) => Number(b.score || 0) - Number(a.score || 0),
        )[0];
        return [bestVideo];
      }

      if (hlsVideos.length) {
        const bestVideo = [...hlsVideos].sort(
          (a, b) => Number(b.score || 0) - Number(a.score || 0),
        )[0];
        return [bestVideo];
      }

      return Media.sortItems(photos);
    }

    async fetchSyndication(id) {
      if (!id) return [];
      if (this.items(id).length) return this.items(id);
      if (this.syndication.has(id)) return this.syndication.get(id);

      const promise = (async () => {
        try {
          const token = Math.random().toString(36).slice(2, 14);
          const payload = await gmJson(
            `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(
              id,
            )}&lang=en&token=${encodeURIComponent(token)}`,
            { timeout: 20_000 },
          );
          this.ingest(payload, id);
        } catch (error) {
          debug("Twitter syndication falhou", error);
        }
        return this.items(id);
      })().finally(() => this.syndication.delete(id));

      this.syndication.set(id, promise);
      return promise;
    }

    install() {
      if (this.installed || !IS_TWITTER) return;
      this.installed = true;
      const marker = "__aioTwitterCapture148";

      try {
        const originalFetch = pageWindow.fetch;
        if (typeof originalFetch === "function" && !originalFetch[marker]) {
          const service = this;
          async function wrappedFetch(...args) {
            const response = await originalFetch.apply(this, args);
            try {
              response
                .clone()
                .json()
                .then((payload) => service.ingest(payload))
                .catch(() => {});
            } catch {}
            return response;
          }
          Object.defineProperty(wrappedFetch, marker, { value: true });
          pageWindow.fetch = wrappedFetch;
        }
      } catch (error) {
        debug("Twitter fetch hook", error);
      }

      try {
        const proto = pageWindow.XMLHttpRequest?.prototype;
        const originalSend = proto?.send;

        if (typeof originalSend === "function" && !originalSend[marker]) {
          const service = this;

          function wrappedSend(...args) {
            try {
              this.addEventListener(
                "load",
                function inspectTwitterXhr() {
                  try {
                    if (this.responseType === "json") {
                      service.ingest(this.response);
                    } else if (this.responseType === "" || this.responseType === "text") {
                      const text = String(this.responseText || "");
                      if (
                        text.includes("video_info") ||
                        text.includes("video.twimg.com") ||
                        text.includes("media_url_https")
                      ) {
                        service.ingest(JSON.parse(text));
                      }
                    }
                  } catch {}
                },
                { once: true },
              );
            } catch {}
            return originalSend.apply(this, args);
          }

          Object.defineProperty(wrappedSend, marker, { value: true });
          proto.send = wrappedSend;
        }
      } catch (error) {
        debug("Twitter XHR hook", error);
      }
    }
  }

  const TwitterStore = new TwitterCaptureService();
  TwitterStore.install();

  // ---------------------------------------------------------------------------
  // Instagram capture. Keeps carousel children, photos and videos by shortcode.
  // ---------------------------------------------------------------------------

  class InstagramCaptureService {
    posts = new Map();
    metadata = new Map();
    installed = false;

    ensurePost(shortcode) {
      const key = String(shortcode || "");
      let record = this.posts.get(key);
      if (!record) {
        record = new Map();
        this.posts.set(key, record);
      }
      return record;
    }

    rememberMetadata(shortcode, metadata = {}) {
      const key = String(shortcode || "");
      if (!key || !metadata || typeof metadata !== "object") return;
      const previous = this.metadata.get(key) || {};
      const next = { ...previous };

      for (const [name, value] of Object.entries(metadata)) {
        const clean = PayloadSanitizer.cleanText(value || "");
        if (!clean) continue;
        if (!next[name] || clean.length >= String(next[name]).length) next[name] = clean;
      }

      this.metadata.set(key, next);
    }

    remember(shortcode, item) {
      if (!shortcode || !item?.url) return;
      const post = this.ensurePost(shortcode);
      const kind = item.kind === MEDIA_KIND.photo ? MEDIA_KIND.photo : MEDIA_KIND.video;
      const url = String(item.url);
      const key = `${kind}|${url}`;
      const previous = post.get(key);
      if (!previous || Number(item.score || 0) >= Number(previous.score || 0)) {
        post.set(key, { ...item, kind, url });
      }
    }

    bestImageCandidate(value) {
      const candidates =
        value?.image_versions2?.candidates ||
        value?.image_versions?.candidates ||
        value?.image_versions2 ||
        [];

      if (!Array.isArray(candidates)) return null;

      return [...candidates]
        .filter((candidate) => candidate?.url)
        .sort(
          (a, b) =>
            Number(b.width || 0) * Number(b.height || 0) -
            Number(a.width || 0) * Number(a.height || 0),
        )[0] || null;
    }

    bestVideoCandidate(value) {
      const candidates =
        value?.video_versions ||
        value?.video_versions2 ||
        value?.video_candidates ||
        [];

      if (!Array.isArray(candidates)) return null;

      return [...candidates]
        .filter((candidate) => candidate?.url)
        .sort(
          (a, b) =>
            Number(b.width || 0) * Number(b.height || 0) -
            Number(a.width || 0) * Number(a.height || 0),
        )[0] || null;
    }

    ingest(value, inheritedShortcode = "", inheritedOrder = null, depth = 0, seen = new WeakSet()) {
      if (depth > 80 || !value || typeof value !== "object" || seen.has(value)) return;
      seen.add(value);

      if (Array.isArray(value)) {
        value.forEach((child, index) =>
          this.ingest(
            child,
            inheritedShortcode,
            inheritedOrder == null ? index : inheritedOrder,
            depth + 1,
            seen,
          ),
        );
        return;
      }

      const directShortcode = String(
        value.code ||
          value.shortcode ||
          value.media?.code ||
          value.media?.shortcode ||
          "",
      );
      const shortcode = directShortcode || String(inheritedShortcode || "");

      if (directShortcode) {
        const caption =
          value.caption?.text ||
          value.caption_text ||
          value.edge_media_to_caption?.edges?.[0]?.node?.text ||
          value.media?.caption?.text ||
          "";
        const username =
          value.user?.username ||
          value.owner?.username ||
          value.media?.user?.username ||
          value.media?.owner?.username ||
          "";
        this.rememberMetadata(shortcode, { caption, username });
      }

      const mediaType = Number(value.media_type || value.mediaType || 0);
      const productType = String(value.product_type || value.productType || "").toLowerCase();
      const order = inheritedOrder == null ? Number(value.carousel_index ?? value.index ?? 0) : inheritedOrder;

      const video = this.bestVideoCandidate(value);
      if (shortcode && video?.url && (mediaType === 2 || productType === "clips" || value.has_audio != null)) {
        this.remember(shortcode, {
          kind: MEDIA_KIND.video,
          url: video.url,
          order,
          score: Number(video.width || 0) * Number(video.height || 0),
        });
      }

      const image = this.bestImageCandidate(value);
      if (shortcode && image?.url && mediaType !== 2) {
        this.remember(shortcode, {
          kind: MEDIA_KIND.photo,
          url: image.url,
          order,
          score: Number(image.width || 0) * Number(image.height || 0),
        });
      }

      for (const directImage of [
        value.display_url,
        value.displayUrl,
        value.image_url,
        value.imageUrl,
        value.thumbnail_url,
      ]) {
        if (shortcode && directImage && mediaType !== 2) {
          this.remember(shortcode, {
            kind: MEDIA_KIND.photo,
            url: directImage,
            order,
            score: Number(value.original_width || value.width || 0) * Number(value.original_height || value.height || 0),
          });
        }
      }

      const carousel = value.carousel_media || value.carouselMedia || value.edge_sidecar_to_children?.edges;
      if (Array.isArray(carousel) && shortcode) {
        carousel.forEach((child, index) => {
          this.ingest(child?.node || child, shortcode, index, depth + 1, seen);
        });
      }

      for (const child of Object.values(value)) {
        if (child && typeof child === "object") {
          this.ingest(child, shortcode, inheritedOrder, depth + 1, seen);
        }
      }
    }

    ingestElement(element) {
      if (!isElement(element)) return;
      for (const value of reactObjects(element)) {
        try {
          this.ingest(value);
        } catch {}
      }
    }

    items(shortcode) {
      return Media.sortItems([...(this.posts.get(String(shortcode))?.values() || [])]);
    }

    meta(shortcode) {
      return this.metadata.get(String(shortcode || "")) || null;
    }

    install() {
      if (this.installed || !IS_INSTAGRAM) return;
      this.installed = true;
      const marker = "__aioInstagramCapture148";

      try {
        const originalFetch = pageWindow.fetch;
        if (typeof originalFetch === "function" && !originalFetch[marker]) {
          const service = this;
          async function wrappedFetch(...args) {
            const response = await originalFetch.apply(this, args);
            try {
              response
                .clone()
                .json()
                .then((payload) => service.ingest(payload))
                .catch(() => {});
            } catch {}
            return response;
          }
          Object.defineProperty(wrappedFetch, marker, { value: true });
          pageWindow.fetch = wrappedFetch;
        }
      } catch (error) {
        debug("Instagram fetch hook", error);
      }

      try {
        const proto = pageWindow.XMLHttpRequest?.prototype;
        const originalSend = proto?.send;

        if (typeof originalSend === "function" && !originalSend[marker]) {
          const service = this;

          function wrappedSend(...args) {
            try {
              this.addEventListener(
                "load",
                function inspectInstagramXhr() {
                  try {
                    if (this.responseType === "json") {
                      service.ingest(this.response);
                    } else if (this.responseType === "" || this.responseType === "text") {
                      const text = String(this.responseText || "");
                      if (
                        text.includes("carousel_media") ||
                        text.includes("image_versions2") ||
                        text.includes("video_versions")
                      ) {
                        service.ingest(JSON.parse(text));
                      }
                    }
                  } catch {}
                },
                { once: true },
              );
            } catch {}
            return originalSend.apply(this, args);
          }

          Object.defineProperty(wrappedSend, marker, { value: true });
          proto.send = wrappedSend;
        }
      } catch (error) {
        debug("Instagram XHR hook", error);
      }
    }
  }

  const InstagramStore = new InstagramCaptureService();
  InstagramStore.install();

  // ---------------------------------------------------------------------------
  // HLS runtime. Only used when URL-first Telegram fails or download is enabled.
  // ---------------------------------------------------------------------------

  async function remuxHlsSeparateTracks(videoTrack, audioTrack, provider, onProgress) {
    if (!(videoTrack?.blob instanceof Blob) || !(audioTrack?.blob instanceof Blob)) {
      throw new Error("Tracks HLS separados inválidos.");
    }

    if (typeof Worker !== "function" || typeof WebAssembly !== "object") {
      throw new Error("Worker/WebAssembly indisponível para juntar áudio e vídeo.");
    }

    const videoBuffer = await videoTrack.blob.arrayBuffer();
    const audioBuffer = await audioTrack.blob.arrayBuffer();
    const totalBytes = videoBuffer.byteLength + audioBuffer.byteLength;

    if (totalBytes > 220 * 1024 * 1024) {
      throw new Error("HLS excede 220 MB para remux local no Safari.");
    }

    const workerSource = `
      let ffmpeg = null;
      let loaded = false;
      const send = (type, payload = {}, transfer = []) => self.postMessage({ type, ...payload }, transfer);

      async function loadRuntime() {
        if (loaded) return;
        importScripts("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js");
        const createFFmpeg = self.FFmpeg && self.FFmpeg.createFFmpeg;
        if (typeof createFFmpeg !== "function") throw new Error("createFFmpeg indisponível no Worker.");
        ffmpeg = createFFmpeg({
          log: false,
          corePath: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js",
          progress: ({ ratio }) => send("progress", { ratio: Number(ratio || 0) }),
        });
        await ffmpeg.load();
        loaded = true;
        send("ready");
      }

      self.onmessage = async (event) => {
        const message = event.data || {};
        try {
          if (message.type === "load") {
            await loadRuntime();
            return;
          }

          if (message.type !== "remux") return;
          if (!loaded) await loadRuntime();

          ffmpeg.FS("writeFile", "video.mp4", new Uint8Array(message.videoBuffer));
          ffmpeg.FS("writeFile", "audio.m4a", new Uint8Array(message.audioBuffer));

          try {
            await ffmpeg.run(
              "-nostdin",
              "-hide_banner",
              "-loglevel", "warning",
              "-i", "video.mp4",
              "-i", "audio.m4a",
              "-map", "0:v:0",
              "-map", "1:a:0",
              "-c", "copy",
              "-movflags", "+faststart",
              "-shortest",
              "-y",
              "output.mp4"
            );

            const output = ffmpeg.FS("readFile", "output.mp4");
            const buffer = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
            send("complete", { buffer }, [buffer]);
          } finally {
            for (const name of ["video.mp4", "audio.m4a", "output.mp4"]) {
              try { ffmpeg.FS("unlink", name); } catch {}
            }
          }
        } catch (error) {
          send("error", { message: String(error?.message || error), stack: String(error?.stack || "") });
        }
      };
    `;

    const workerUrl = URL.createObjectURL(
      new Blob([workerSource], { type: "text/javascript" }),
    );
    const worker = new Worker(workerUrl, { name: "aio-hls-remux" });
    const outputName = `${provider || "hls"}-${Date.now()}.mp4`;

    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(
        () => finish(new Error("Timeout do FFmpeg Wasm.")),
        20 * 60_000,
      );

      const finish = (failure, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        if (failure) reject(failure);
        else resolve(value);
      };

      worker.onerror = (event) =>
        finish(new Error(event.message || "Worker FFmpeg falhou."));

      worker.onmessage = (event) => {
        const message = event.data || {};

        if (message.type === "ready") {
          onProgress?.(86);
          worker.postMessage(
            { type: "remux", videoBuffer, audioBuffer },
            [videoBuffer, audioBuffer],
          );
          return;
        }

        if (message.type === "progress") {
          const ratio = Math.max(0, Math.min(1, Number(message.ratio || 0)));
          onProgress?.(86 + Math.round(ratio * 13));
          return;
        }

        if (message.type === "error") {
          finish(
            new Error(`FFmpeg Wasm: ${message.message || "erro desconhecido"}`),
          );
          return;
        }

        if (message.type === "complete") {
          finish(null, {
            blob: new Blob([message.buffer], { type: "video/mp4" }),
            filename: outputName,
            contentType: "video/mp4",
          });
        }
      };

      worker.postMessage({ type: "load" });
    });
  }

  const HlsRuntime = {
    loading: null,

    loaded() {
      return Boolean(
        globalThis.HlsToolkit?.HlsDownloader ||
          pageWindow.HlsToolkit?.HlsDownloader ||
          globalThis.HlsDownloader ||
          pageWindow.HlsDownloader,
      );
    },

    async ensure() {
      if (this.loaded()) return;
      if (this.loading) return this.loading;

      this.loading = gmText(CONFIG.hlsBundle)
        .then((source) => {
          let evaluated = false;

          try {
            (0, eval)(`${source}\n//# sourceURL=${CONFIG.hlsBundle}`);
            evaluated = true;
          } catch (sandboxError) {
            debug("HLS sandbox eval falhou", sandboxError);
          }

          if (!this.loaded()) {
            try {
              pageWindow.eval(`${source}\n//# sourceURL=${CONFIG.hlsBundle}`);
              evaluated = true;
            } catch (pageError) {
              debug("HLS page eval falhou", pageError);
            }
          }

          if (!evaluated || !this.loaded()) {
            throw new Error("Runtime HLS não expôs HlsDownloader.");
          }
        })
        .finally(() => {
          this.loading = null;
        });

      return this.loading;
    },

    async prepare(url, provider, onProgress) {
      await this.ensure();

      const toolkit =
        globalThis.HlsToolkit ||
        pageWindow.HlsToolkit || {
          HlsDownloader: globalThis.HlsDownloader || pageWindow.HlsDownloader,
          createGmRequestAdapter:
            globalThis.createGmRequestAdapter || pageWindow.createGmRequestAdapter,
        };

      if (
        typeof toolkit.HlsDownloader !== "function" ||
        typeof toolkit.createGmRequestAdapter !== "function"
      ) {
        throw new Error("Runtime HLS incompleto.");
      }

      const adapter = toolkit.createGmRequestAdapter((details) => gmRequest(details));
      const downloader = new toolkit.HlsDownloader({
        fetchText: adapter.fetchText,
        fetchBinary: adapter.fetchBinary,
        concurrency: 6,
        retries: 2,
        retryDelayMs: 500,
        maxDepth: 12,
      });

      const result = await downloader.download(String(url), {
        resolveOptions: {
          variantOptions: { strategy: "highest" },
          renditionOptions: { includeSubtitles: false },
        },
        baseName: `hls-${Date.now()}`,
        onProgress(progress) {
          onProgress?.(Math.round(Number(progress.ratio || 0) * 100));
        },
      });

      if (result?.muxed?.blob) {
        return {
          blob: result.muxed.blob,
          filename: result.muxed.filename || `${provider}-${Date.now()}.mp4`,
          contentType:
            result.muxed.mimeType || result.muxed.blob.type || "video/mp4",
        };
      }

      if (result?.needsRemux && result?.video?.blob && result?.audio?.blob) {
        return remuxHlsSeparateTracks(
          result.video,
          result.audio,
          provider,
          onProgress,
        );
      }

      if (result?.video?.blob) {
        return {
          blob: result.video.blob,
          filename: result.video.filename || `${provider}-${Date.now()}.mp4`,
          contentType:
            result.video.mimeType || result.video.blob.type || "video/mp4",
        };
      }

      throw new Error("HLS não retornou um Blob utilizável.");
    },
  };

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------

  const History = (() => {
    const records = new Map();

    try {
      const stored = JSON.parse(localStorage.getItem(CONFIG.historyKey) || "[]");
      if (Array.isArray(stored)) {
        for (const entry of stored) {
          if (entry?.key) records.set(entry.key, entry);
        }
      }
    } catch {}

    function save() {
      try {
        localStorage.setItem(
          CONFIG.historyKey,
          JSON.stringify(
            [...records.values()]
              .sort((a, b) => Number(b.at || 0) - Number(a.at || 0))
              .slice(0, 2000),
          ),
        );
      } catch {}
    }

    return {
      identity(context) {
        if (context.providerId === "twitter" && context.metadata?.statusId) {
          return `twitter:${context.metadata.statusId}`;
        }
        if (
          context.providerId === "instagram" &&
          context.metadata?.instagramShortcode
        ) {
          return `instagram:${context.metadata.instagramShortcode}`;
        }
        return `${context.providerId}:${context.pageUrl}`;
      },

      get(context, action) {
        return records.get(`${this.identity(context)}|${action}`) || null;
      },

      mark(context, action, metadata = {}) {
        const key = `${this.identity(context)}|${action}`;
        records.set(key, {
          key,
          at: Date.now(),
          metadata,
        });
        save();
      },
    };
  })();

  function channels(provider, pageUrl) {
    let host = location.hostname.replace(/^www\./, "");
    try {
      host = new URL(String(pageUrl)).hostname.replace(/^www\./, "");
    } catch {}

    const output = [];

    for (const route of TELEGRAM_CHANNEL_ROUTES) {
      const matched = route.sites.some((site) => {
        const normalized = String(site).toLowerCase();
        return (
          normalized === String(provider).toLowerCase() ||
          normalized === host.toLowerCase() ||
          host.toLowerCase().endsWith(`.${normalized}`) ||
          (provider === "twitter" && normalized === "x.com")
        );
      });

      if (!matched) continue;
      for (const channel of route.channels) {
        if (!output.includes(channel)) output.push(channel);
      }
    }

    return output;
  }

  // ---------------------------------------------------------------------------
  // Telegram relay. Direct photo/video carousels are sent as one Telegram album when possible.
  // ---------------------------------------------------------------------------

  const Telegram = {
    caption(context) {
      const cleanContext = PayloadSanitizer.context(context);
      const escape = (value) =>
        String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      return [
        `<b>${escape(cleanContext.title || cleanContext.providerId)}</b>`,
        escape(cleanContext.text || ""),
        `<a href="${escape(cleanContext.pageUrl)}">${escape(
          cleanContext.hostname || location.hostname,
        )}</a>`,
      ]
        .filter(Boolean)
        .join("\n\n");
    },

    albumPayload(context, items) {
      const cleanContext = PayloadSanitizer.context(context);
      const targetChannels = channels(cleanContext.providerId, cleanContext.pageUrl);
      const total = items.length;

      return {
        mediaItems: items.map((item, index) => {
          const mediaUrl = String(item.url);
          const mediaType =
            item.kind === MEDIA_KIND.photo ? "photo" : "video";

          return {
            mediaUrl,
            mediaType,
            ...(mediaType === "photo"
              ? { photoUrl: mediaUrl }
              : { videoUrl: mediaUrl }),
            metadata: {
              carouselIndex: index,
              carouselTotal: total,
              carousel: true,
              mediaKind: item.kind,
            },
          };
        }),
        provider: cleanContext.providerId,
        channels: targetChannels.length ? targetChannels : undefined,
        channel: targetChannels.length === 1 ? targetChannels[0] : undefined,
        title: cleanContext.title || "",
        text: cleanContext.text || "",
        pageUrl: cleanContext.pageUrl,
        sourceUrl: cleanContext.pageUrl,
        frameUrl: location.href,
        caption: this.caption(cleanContext),
        parseMode: "HTML",
        metadata: {
          ...(cleanContext.metadata || {}),
          carousel: true,
          carouselTotal: total,
          mediaKinds: items.map((item) => item.kind).join(","),
        },
      };
    },

    payload(context, item, index, total, prepared = null) {
      const cleanContext = PayloadSanitizer.context(context);
      const targetChannels = channels(cleanContext.providerId, cleanContext.pageUrl);
      const isPhoto = item.kind === MEDIA_KIND.photo;
      const mediaUrl = String(item.url);
      const caption = index === 0 ? this.caption(cleanContext) : "";
      const contentType =
        prepared?.contentType ||
        (isPhoto
          ? "image/jpeg"
          : Media.isMp4(mediaUrl)
            ? "video/mp4"
            : Media.isHls(mediaUrl)
              ? "application/vnd.apple.mpegurl"
              : "application/octet-stream");

      const payload = {
        mediaUrl,
        provider: cleanContext.providerId,
        channels: targetChannels.length ? targetChannels : undefined,
        channel: targetChannels.length === 1 ? targetChannels[0] : undefined,
        title: index === 0 ? cleanContext.title || "" : "",
        text: index === 0 ? cleanContext.text || "" : "",
        pageUrl: cleanContext.pageUrl,
        frameUrl: location.href,
        caption,
        parseMode: "HTML",
        mediaType: isPhoto ? "photo" : "video",
        metadata: {
          ...(cleanContext.metadata || {}),
          filename:
            prepared?.filename ||
            Media.filename(
              mediaUrl,
              cleanContext.providerId,
              item.kind,
              index,
              total,
              contentType,
            ),
          contentType,
          size: Number(prepared?.blob?.size || 0),
          hls: Media.isHls(mediaUrl),
          transferMode: prepared?.blob ? "multipart-file" : "direct-media-url",
          carouselIndex: index,
          carouselTotal: total,
          carousel: total > 1,
          mediaKind: item.kind,
        },
      };

      if (isPhoto) payload.photoUrl = mediaUrl;
      else payload.videoUrl = mediaUrl;

      return payload;
    },

    request(payload, prepared = null) {
      return new Promise((resolve, reject) => {
        const headers = {
          Authorization: `Bearer ${CONFIG.telegram.token}`,
        };

        let data;

        if (prepared?.blob instanceof Blob) {
          const form = new FormData();
          form.append("payload", JSON.stringify(payload));
          form.append(
            "file",
            prepared.blob,
            prepared.filename || payload.metadata?.filename || "media.bin",
          );
          data = form;
        } else {
          headers["Content-Type"] = "application/json";
          data = JSON.stringify(payload);
        }

        const request = gmRequest({
          method: "POST",
          url: CONFIG.telegram.url,
          headers,
          data,
          timeout: CONFIG.telegram.timeout,
          onload(response) {
            const status = Number(response.status || 0);
            const raw = String(response.responseText || response.response || "");

            let body = {};
            try {
              body = raw ? JSON.parse(raw) : {};
            } catch {
              body = { raw };
            }

            if (
              status < 200 ||
              status >= 300 ||
              body?.ok === false ||
              body?.success === false
            ) {
              reject(
                new Error(
                  `Worker HTTP ${status}: ${
                    body?.error || body?.message || truncate(raw)
                  }`,
                ),
              );
              return;
            }

            resolve(body);
          },
          onerror(event) {
            reject(new Error(`Worker falhou: ${safeStringify(event, 0)}`));
          },
          ontimeout() {
            reject(new Error("Worker timeout."));
          },
        });

        if (!request) reject(new Error("GM_xmlhttpRequest indisponível."));
      });
    },

    async send(context, item, index, total, prepared = null) {
      const payload = this.payload(context, item, index, total, prepared);
      return this.request(payload, prepared);
    },

    async sendAlbum(context, items) {
      if (!Array.isArray(items) || items.length < 2) {
        throw new Error("Álbum precisa de pelo menos duas mídias.");
      }

      if (
        !items.every(
          (item) =>
            Media.isHttp(item?.url) &&
            !Media.isHls(item?.url) &&
            !Media.isDash(item?.url) &&
            [MEDIA_KIND.photo, MEDIA_KIND.video].includes(item?.kind),
        )
      ) {
        throw new Error("Álbum contém mídia que precisa de preparação local.");
      }

      return this.request(this.albumPayload(context, items), null);
    },

    async scriptable(context, item, index, total, failures) {
      if (!CONFIG.telegram.scriptableFallback) {
        throw new Error("Fallback Scriptable desativado.");
      }

      const payload = this.payload(context, item, index, total, null);
      payload.metadata.workerFailures = failures;
      payload.metadata.fallbackTransport = "scriptable";

      const separator = CONFIG.telegram.scriptableUrl.includes("?") ? "&" : "?";
      const url =
        `${CONFIG.telegram.scriptableUrl}${separator}payload=` +
        encodeURIComponent(JSON.stringify(payload));

      if (!gmOpen(url)) location.href = url;
      return { ok: true, transport: "scriptable" };
    },
  };

  // ---------------------------------------------------------------------------
  // Instagram bookmark mutation
  // ---------------------------------------------------------------------------

  const InstagramBookmark = {
    cookie(name) {
      try {
        const prefix = `${encodeURIComponent(name)}=`;
        const item = document.cookie
          .split(";")
          .map((value) => value.trim())
          .find((value) => value.startsWith(prefix));
        return item ? decodeURIComponent(item.slice(prefix.length)) : "";
      } catch {
        return "";
      }
    },

    shortcodeToId(shortcode) {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
      try {
        let value = 0n;
        for (const char of String(shortcode || "")) {
          const index = alphabet.indexOf(char);
          if (index < 0) return "";
          value = value * 64n + BigInt(index);
        }
        return value > 0n ? value.toString() : "";
      } catch {
        return "";
      }
    },

    async save(context, options = {}) {
      const csrf = this.cookie("csrftoken");
      const actorId = this.cookie("ds_user_id");
      const shortcode =
        context.metadata?.instagramShortcode ||
        context.pageUrl.match(/\/(?:p|reel|tv)\/([^/?#]+)/i)?.[1] ||
        "";

      const mediaId =
        context.metadata?.mediaId || this.shortcodeToId(shortcode);

      const collectionId = String(
        options.collectionId ||
          options.bookmarksId ||
          context.metadata?.collectionId ||
          context.metadata?.bookmarksId ||
          CONFIG.instagram.bookmarkCollectionId ||
          CONFIG.instagram.bookmarksId ||
          "",
      ).trim();

      if (!csrf || !actorId || !mediaId) {
        throw new Error(
          "Não foi possível montar a mutation de bookmark do Instagram.",
        );
      }

      const input = {
        actor_id: actorId,
        client_mutation_id: String(Date.now()),
        container_module: /\/reel\//i.test(context.pageUrl)
          ? "clips_viewer"
          : "feed_timeline",
        inventory_source: "media_or_ad",
        media_id: mediaId,
        nav_chain: /\/reel\//i.test(context.pageUrl)
          ? "PolarisClipsViewer:clipsViewer"
          : "PolarisFeedRoot:feedPage:3:topnav-link",
      };

      if (collectionId) input.collection_id = collectionId;

      const body = new URLSearchParams({
        av: actorId,
        __d: "www",
        __user: actorId,
        __a: "1",
        __req: "1",
        __comet_req: "7",
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "usePolarisSaveMediaSaveMutation",
        variables: JSON.stringify({ input }),
        doc_id: CONFIG.instagram.graphqlDocId,
      });

      const response = await fetch(CONFIG.instagram.graphqlUrl, {
        method: "POST",
        headers: {
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded",
          "x-csrftoken": csrf,
          "x-fb-friendly-name": "usePolarisSaveMediaSaveMutation",
          "x-ig-app-id": CONFIG.instagram.appId,
        },
        body: body.toString(),
        credentials: "include",
      });

      const raw = await response.text();
      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {}

      if (!response.ok || payload?.errors?.length) {
        throw new Error(
          `Instagram save falhou: HTTP ${response.status} · ${
            payload?.errors?.[0]?.message || truncate(raw)
          }`,
        );
      }

      return {
        ok: true,
        mediaId,
        collectionId: collectionId || null,
      };
    },
  };

  // ---------------------------------------------------------------------------
  // Context builders
  // ---------------------------------------------------------------------------

  function twitterStatusId(root) {
    const current = location.href.match(/\/status\/(\d+)/)?.[1] || null;

    if (
      current &&
      (root?.closest?.("#layers") ||
        root?.closest?.('[role="dialog"]') ||
        root?.matches?.('[role="dialog"]'))
    ) {
      return current;
    }

    const timeId = root
      ?.querySelector?.("time")
      ?.closest?.('a[href*="/status/"]')
      ?.href?.match(/\/status\/(\d+)/)?.[1];
    if (timeId) return timeId;

    for (const link of root?.querySelectorAll?.('a[href*="/status/"]') || []) {
      const id = String(link.href || "").match(/\/status\/(\d+)/)?.[1];
      if (id) return id;
    }

    return current;
  }

  function twitterRootFromElement(element) {
    if (!isElement(element)) return null;
    return (
      element.closest?.('[data-testid="tweet"]') ||
      element.closest?.('article[data-testid="tweet"]') ||
      element.closest?.("article") ||
      element.closest?.('[role="dialog"]') ||
      null
    );
  }

  function twitterDomItems(root) {
    const items = [];

    for (const video of root?.querySelectorAll?.("video") || []) {
      for (const url of Media.ownVideoUrls(video)) {
        items.push({
          kind: MEDIA_KIND.video,
          url,
          score: Media.isMp4(url) ? 10_000 : Media.isHls(url) ? 5_000 : 1_000,
        });
      }
    }

    let order = 0;
    for (const image of root?.querySelectorAll?.("img") || []) {
      if (!Media.imageLooksLikeContent(image, "twitter")) continue;
      const url = Media.imageUrlFromElement(image);
      if (!url) continue;
      items.push({
        kind: MEDIA_KIND.photo,
        url: Media.normalizeTwitterPhoto(url),
        order: order++,
        score:
          Number(image.naturalWidth || 0) * Number(image.naturalHeight || 0),
      });
    }

    return Media.sortItems(items);
  }

  function twitterMediaPresence(root) {
    if (!isElement(root)) {
      return { photos: [], videos: [], hasPhoto: false, hasVideo: false, hasMedia: false };
    }

    const photos = [...(root.querySelectorAll?.("img") || [])].filter((image) =>
      Media.imageLooksLikeContent(image, "twitter"),
    );
    const videos = [...(root.querySelectorAll?.("video") || [])].filter((video) =>
      isVideoElement(video) && video.isConnected,
    );

    return {
      photos,
      videos,
      hasPhoto: photos.length > 0,
      hasVideo: videos.length > 0,
      hasMedia: photos.length > 0 || videos.length > 0,
    };
  }

  function twitterTarget(root) {
    const presence = twitterMediaPresence(root);
    const candidates = [...presence.videos, ...presence.photos];

    return [...candidates].sort(
      (a, b) => Media.visibleScore(b) - Media.visibleScore(a),
    )[0] || null;
  }

  function twitterContext(root) {
    TwitterStore.ingestElement(root);
    const statusId = twitterStatusId(root);

    const pageUrl =
      root
        ?.querySelector?.("time")
        ?.closest?.('a[href*="/status/"]')?.href ||
      (statusId ? `https://x.com/i/status/${statusId}` : location.href.split("?")[0]);

    const captured = statusId ? TwitterStore.metadata.get(statusId) : null;
    const domTitle = root?.querySelector?.('[data-testid="User-Name"]')?.innerText || "";
    const domText = root?.querySelector?.('[data-testid="tweetText"]')?.innerText || "";
    const capturedText = captured?.text || "";
    const cleanDomText = PayloadSanitizer.cleanText(domText);
    const cleanCapturedText = PayloadSanitizer.cleanText(capturedText);

    const title = PayloadSanitizer.cleanTitle(
      captured?.author
        ? String(captured.author).startsWith("@")
          ? captured.author
          : `@${captured.author}`
        : domTitle || "Twitter/X",
    );
    const text =
      cleanCapturedText.length > cleanDomText.length
        ? cleanCapturedText
        : cleanDomText;

    const target = twitterTarget(root);

    return {
      providerId: "twitter",
      target,
      root,
      pageUrl: PayloadSanitizer.cleanUrl(pageUrl),
      hostname: "x.com",
      title,
      text,
      metadata: {
        statusId: statusId || "",
      },

      async refresh() {
        await MoreExpander.expand(root, "twitter", { settle: true });
        TwitterStore.ingestElement(root);
        return twitterContext(root);
      },

      async items() {
        let capturedItems = statusId ? TwitterStore.items(statusId) : [];
        if (statusId && !capturedItems.length) {
          capturedItems = await TwitterStore.fetchSyndication(statusId);
        }

        const presence = twitterMediaPresence(root);
        const domItems = twitterDomItems(root);
        const performanceItems = presence.hasVideo
          ? Media.performance(/video\.twimg\.com/i).map((url) => ({
              kind: MEDIA_KIND.video,
              url,
              score: Media.isMp4(url) ? 9_000 : 2_000,
            }))
          : [];

        const scopedCapturedItems = capturedItems.filter((item) =>
          item.kind === MEDIA_KIND.photo ? presence.hasPhoto : presence.hasVideo,
        );

        const values = Media.sortItems([
          ...scopedCapturedItems,
          ...domItems,
          ...performanceItems,
        ]);

        const videos = values.filter((item) => item.kind === MEDIA_KIND.video);
        if (videos.length) {
          const mp4 = videos.filter((item) => Media.isMp4(item.url));
          return [
            [...(mp4.length ? mp4 : videos)].sort(
              (left, right) => Number(right.score || 0) - Number(left.score || 0),
            )[0],
          ];
        }

        return values.filter((item) => item.kind === MEDIA_KIND.photo);
      },
    };
  }

  function instagramRouteMode(pathname = location.pathname) {
    const path = String(pathname || "/");
    if (/^\/stories(?:\/|$)/i.test(path)) return "story";
    if (/^\/(?:p|reel|tv)\/[^/?#]+/i.test(path)) return "post";
    if (/^\/reels(?:\/|$)/i.test(path)) return "reels";
    return "ambient";
  }

  function instagramRootFromElement(element) {
    if (!isElement(element)) return null;

    // Feed posts and opened post dialogs are the strongest semantic scopes.
    const article = element.closest?.("article");
    if (article) return article;

    const dialog = element.closest?.('[role="dialog"]');
    if (dialog) return dialog;

    // Never fall back to <main> on normal pages. That was the source of the
    // profile-grid/story-tray explosion: every avatar and thumbnail shared the
    // same giant root and received controls. <main> is allowed only when the
    // current URL is itself a focused media viewer.
    if (instagramRouteMode() !== "ambient") {
      const main = element.closest?.("main") || document.querySelector?.("main");
      if (main && main.contains(element)) return main;
    }

    return null;
  }

  function instagramElementBelongsToMediaScope(element, root) {
    if (!isElement(element) || !isElement(root) || !root.contains(element)) return false;
    if (element.closest?.("header,nav,footer,aside")) return false;

    const routeMode = instagramRouteMode();
    const article = element.closest?.("article");
    const dialog = element.closest?.('[role="dialog"]');

    // Inside feed article/dialog, the post scope itself is authoritative.
    if (article === root || dialog === root) return true;

    // For story/reel/permalink viewers that use <main>, only retain sizeable
    // visible media. This drops avatars, thumbnails, comments and navigation.
    if (root.tagName === "MAIN" && routeMode !== "ambient") {
      const visible = Media.visibleRect(element);
      if (!visible) return false;

      const minimum = isVideoElement(element) ? 160 : 220;
      if (visible.width < minimum || visible.height < minimum) return false;

      const viewportArea = Math.max(
        1,
        (window.visualViewport?.width || innerWidth || 1) *
          (window.visualViewport?.height || innerHeight || 1),
      );
      if (visible.width * visible.height < viewportArea * 0.08) return false;
    }

    return true;
  }

  function instagramPageUrl(root) {
    const rootLink = root?.querySelector?.(
      'a[href*="/p/"],a[href*="/reel/"],a[href*="/tv/"]',
    )?.href;
    if (rootLink) return String(rootLink).split("?")[0];

    const currentMatch = location.pathname.match(/^\/(?:p|reel|tv)\/[^/?#]+/i);
    if (currentMatch) {
      return `${location.origin}${currentMatch[0].replace(/\/$/, "")}/`;
    }

    return location.href.split("?")[0];
  }

  function instagramDomItems(root) {
    const items = [];
    let order = 0;

    for (const element of root?.querySelectorAll?.("video,img") || []) {
      if (!instagramElementBelongsToMediaScope(element, root)) continue;

      if (isVideoElement(element)) {
        for (const url of Media.ownVideoUrls(element)) {
          items.push({
            kind: MEDIA_KIND.video,
            url,
            order: order++,
            score: Media.isMp4(url) ? 10_000 : 4_000,
          });
        }
        continue;
      }

      if (!Media.imageLooksLikeContent(element, "instagram")) continue;
      const url = Media.imageUrlFromElement(element);
      if (!url) continue;

      items.push({
        kind: MEDIA_KIND.photo,
        url,
        order: order++,
        score:
          Number(element.naturalWidth || 0) *
          Number(element.naturalHeight || 0),
      });
    }

    return Media.sortItems(items);
  }

  function instagramTarget(root) {
    const candidates = [
      ...(root?.querySelectorAll?.("video") || []),
      ...(root?.querySelectorAll?.("img") || []),
    ].filter((element) => {
      if (!instagramElementBelongsToMediaScope(element, root)) return false;
      if (isVideoElement(element)) return true;
      return Media.imageLooksLikeContent(element, "instagram");
    });

    // Never anchor controls to the whole article/main as a fallback. A button
    // only exists when there is a concrete media node to pin it to.
    return [...candidates].sort(
      (a, b) => Media.visibleScore(b) - Media.visibleScore(a),
    )[0] || null;
  }

  function instagramCaptionCandidates(root) {
    if (!isElement(root)) return [];
    const candidates = [];
    const seen = new Set();

    for (const element of root.querySelectorAll?.('h1,div[dir="auto"],span[dir="auto"],span') || []) {
      if (!isElement(element) || seen.has(element)) continue;
      seen.add(element);
      if (element.closest?.('button,nav,header,footer,[role="menu"]')) continue;
      if (isElement(element.closest?.('#aio-media-actions-root'))) continue;

      const text = PayloadSanitizer.cleanText(element.innerText || element.textContent || "");
      if (!text || text.length < 2) continue;
      if (/^(?:liked by|curtido por|view all|ver todos|original audio|áudio original|audio original)\b/i.test(text)) continue;
      if (/^(?:\d+[,.]?\d*\s*)?(?:likes?|curtidas?|comments?|comentários?|comentarios)$/i.test(text)) continue;
      if (text.length > CONFIG.content.maxTextLength) continue;

      let score = Math.min(text.length, 2_500);
      if (/[#@][\p{L}\p{N}_.]+/u.test(text)) score += 500;
      if (element.tagName === "H1") score += 900;
      if (element.closest?.("article")) score += 250;
      candidates.push({ text, score });
    }

    return candidates.sort((left, right) => right.score - left.score);
  }

  function instagramDomCaption(root) {
    return instagramCaptionCandidates(root)[0]?.text || "";
  }

  function instagramAuthor(root, capturedMeta = null) {
    if (capturedMeta?.username) return `@${String(capturedMeta.username).replace(/^@/, "")}`;

    for (const link of root?.querySelectorAll?.('a[href^="/"]') || []) {
      if (link.closest?.('nav,footer')) continue;
      const href = String(link.getAttribute?.("href") || "");
      const match = href.match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
      if (!match) continue;
      const username = match[1];
      if (["explore", "reels", "stories", "direct", "accounts"].includes(username.toLowerCase())) continue;
      return `@${username}`;
    }

    return "Instagram";
  }

  function instagramContext(root) {
    InstagramStore.ingestElement(root);
    const pageUrl = instagramPageUrl(root);
    const shortcode =
      pageUrl.match(/\/(?:p|reel|tv)\/([^/?#]+)/i)?.[1] || "";
    const target = instagramTarget(root);
    const capturedMeta = shortcode ? InstagramStore.meta(shortcode) : null;
    const domCaption = instagramDomCaption(root);
    const capturedCaption = PayloadSanitizer.cleanText(capturedMeta?.caption || "");
    const text = capturedCaption.length >= domCaption.length ? capturedCaption : domCaption;

    return {
      providerId: "instagram",
      target,
      root,
      pageUrl: PayloadSanitizer.cleanUrl(pageUrl),
      hostname: location.hostname.replace(/^www\./, ""),
      title: PayloadSanitizer.cleanTitle(instagramAuthor(root, capturedMeta)),
      text: PayloadSanitizer.cleanText(text),
      metadata: shortcode
        ? {
            instagramShortcode: shortcode,
            mediaId: InstagramBookmark.shortcodeToId(shortcode),
            username: capturedMeta?.username || "",
          }
        : {},

      async refresh() {
        await MoreExpander.expand(root, "instagram", { settle: true });
        InstagramStore.ingestElement(root);
        return instagramContext(root);
      },

      async items() {
        const captured = shortcode ? InstagramStore.items(shortcode) : [];
        const dom = instagramDomItems(root);

        const performanceVideos = Media.performance(
          /cdninstagram\.com|fbcdn\.net/i,
        )
          .filter((url) => /\.mp4(?:$|[?#])/i.test(url))
          .map((url) => ({
            kind: MEDIA_KIND.video,
            url,
            score: 2_000,
          }));

        const merged = Media.sortItems([
          ...captured,
          ...dom,
          ...performanceVideos,
        ]);

        if (captured.length > 1) return captured;

        const videos = merged.filter((item) => item.kind === MEDIA_KIND.video);
        const photos = merged.filter((item) => item.kind === MEDIA_KIND.photo);

        if (/\/reel\//i.test(pageUrl) && videos.length) {
          const direct = videos.filter((item) => Media.isMp4(item.url));
          return [
            [...(direct.length ? direct : videos)].sort(
              (left, right) => Number(right.score || 0) - Number(left.score || 0),
            )[0],
          ];
        }

        if (photos.length > 1) return photos;
        if (videos.length && !photos.length) return [videos[0]];
        return merged;
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const Actions = {
    async inspect(context) {
      let current = context;

      try {
        if (typeof current?.refresh === "function") {
          current = (await current.refresh()) || current;
        } else if (isElement(current?.root)) {
          await MoreExpander.expand(current.root, current.providerId, { settle: true });
        }
      } catch (error) {
        debug("Falha expandindo conteúdo antes do envio", error);
      }

      current = PayloadSanitizer.context(current);
      const items = Media.dedupeItems(await current.items());
      return {
        context: current,
        items,
        primary: items[0] || null,
      };
    },

    async prepare(context, item, index, total, task) {
      if (item.kind === MEDIA_KIND.video && Media.isHls(item.url)) {
        task?.update?.({
          description: `Processando vídeo ${index + 1}/${total} via HLS…`,
        });

        return HlsRuntime.prepare(
          item.url,
          context.providerId,
          (percentage) =>
            task?.setProgress?.(percentage, {
              description: `Processando vídeo ${index + 1}/${total} · ${percentage}%`,
            }),
        );
      }

      task?.update?.({
        description: `${item.kind === MEDIA_KIND.photo ? "Baixando foto" : "Baixando vídeo"} ${index + 1}/${total}…`,
      });

      const downloaded = await gmBlob(item.url, (percentage) =>
        task?.setProgress?.(percentage, {
          description: `${item.kind === MEDIA_KIND.photo ? "Baixando foto" : "Baixando vídeo"} ${index + 1}/${total} · ${percentage}%`,
        }),
      );

      const contentType =
        downloaded.blob.type ||
        (item.kind === MEDIA_KIND.photo
          ? "image/jpeg"
          : Media.isMp4(downloaded.finalUrl)
            ? "video/mp4"
            : "application/octet-stream");

      return {
        blob: downloaded.blob,
        filename: Media.filename(
          downloaded.finalUrl,
          context.providerId,
          item.kind,
          index,
          total,
          contentType,
        ),
        contentType,
      };
    },

    async sendTelegramItem(context, item, index, total, task) {
      const failures = [];

      if (Media.isHttp(item.url)) {
        try {
          task?.update?.({
            description: `Enviando ${item.kind === MEDIA_KIND.photo ? "foto" : "vídeo"} ${index + 1}/${total}…`,
          });
          return await Telegram.send(context, item, index, total, null);
        } catch (error) {
          failures.push(`URL-first: ${String(error?.message || error)}`);
          debug("Telegram URL-first falhou", item.url, error);
        }
      }

      try {
        const prepared = await this.prepare(context, item, index, total, task);
        return await Telegram.send(context, item, index, total, prepared);
      } catch (error) {
        failures.push(`Multipart: ${String(error?.message || error)}`);
        debug("Telegram multipart falhou", item.url, error);
      }

      return Telegram.scriptable(context, item, index, total, failures);
    },

    async run(action, context, runOptions = {}) {
      const task = Toast.loading({
        title:
          action === ACTION.telegram
            ? "Enviando para Telegram"
            : "Preparando download",
        description: "Resolvendo mídia…",
        duration: 0,
      });

      try {
        const inspected = await this.inspect(context);
        context = inspected.context;
        if (!inspected.items.length) {
          throw new Error("Nenhuma foto ou vídeo foi encontrado neste post.");
        }

        const total = inspected.items.length;

        if (action === ACTION.telegram) {
          let sentAsAlbum = false;

          if (
            total > 1 &&
            inspected.items.every(
              (item) =>
                Media.isHttp(item?.url) &&
                !Media.isHls(item?.url) &&
                !Media.isDash(item?.url) &&
                [MEDIA_KIND.photo, MEDIA_KIND.video].includes(item?.kind),
            )
          ) {
            try {
              task?.update?.({
                description: `Enviando carrossel com ${total} mídias…`,
              });
              await Telegram.sendAlbum(context, inspected.items);
              sentAsAlbum = true;
            } catch (error) {
              debug(
                "Telegram album falhou; usando envio item-a-item",
                error,
              );
            }
          }

          if (!sentAsAlbum) {
            for (let index = 0; index < total; index += 1) {
              const item = inspected.items[index];
              await this.sendTelegramItem(context, item, index, total, task);
            }
          }

          History.mark(context, action, {
            count: total,
            kinds: inspected.items.map((item) => item.kind),
            trigger: String(runOptions.trigger || "button"),
          });

          task?.success?.({
            title: total > 1 ? `${total} mídias enviadas` : "Enviado",
            description:
              total > 1
                ? "Todo o carrossel foi enviado para o Telegram."
                : inspected.items[0].kind === MEDIA_KIND.photo
                  ? "Foto enviada para o Telegram."
                  : "Vídeo enviado para o Telegram.",
          });

          if (!runOptions.skipSocialAfterTelegram) {
            void Social.afterTelegram(context).catch((error) =>
              debug("Ações sociais pós-Telegram falharam", error),
            );
          }
          return;
        }

        if (!CONFIG.features.downloadButton) {
          throw new Error("O botão de download está desativado na configuração.");
        }

        for (let index = 0; index < total; index += 1) {
          const item = inspected.items[index];
          const prepared = await this.prepare(context, item, index, total, task);
          Media.downloadBlob(prepared.blob, prepared.filename);
          if (total > 1) await sleep(120);
        }

        History.mark(context, action, {
          count: total,
          kinds: inspected.items.map((item) => item.kind),
        });

        task?.success?.({
          title: total > 1 ? `${total} downloads iniciados` : "Download iniciado",
          description:
            total > 1
              ? "Todos os itens do post foram preparados para download."
              : "Download iniciado.",
        });
      } catch (error) {
        task?.error?.({
          title:
            action === ACTION.telegram ? "Falha ao enviar" : "Falha no download",
          description: truncate(error?.message || String(error)),
        });
        throw error;
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Social actions
  // ---------------------------------------------------------------------------

  const Social = {
    async afterTelegram(context) {
      if (
        context.providerId === "twitter" &&
        CONFIG.twitter.bookmarkAfterTelegram
      ) {
        const root = context.root || twitterRootFromElement(context.target);

        try {
          if (!root?.querySelector?.('[data-testid="removeBookmark"]')) {
            root?.querySelector?.('[data-testid="bookmark"]')?.click();
          }
        } catch {}

        if (
          CONFIG.twitter.promptLikeAfterTelegram &&
          Toast?.canConfirm === true &&
          !root?.querySelector?.('[data-testid="unlike"]')
        ) {
          const like = await Toast.confirm({
            title: "Deseja dar like também?",
            description: "A confirmação desaparece em 3 segundos.",
            duration: CONFIG.twitter.promptLikeDurationMs,
            dismissible: true,
            actions: [
              {
                id: "cancel",
                label: "Agora não",
                variant: "secondary",
                value: false,
                handle: () => false,
              },
              {
                id: "like",
                label: "Dar like",
                variant: "primary",
                value: true,
                handle: () => true,
              },
            ],
          });

          if (like === true) {
            try {
              root?.querySelector?.('[data-testid="like"]')?.click();
            } catch {}
          }
        }

        return;
      }

      if (
        context.providerId === "instagram" &&
        CONFIG.instagram.bookmarkAfterTelegram
      ) {
        try {
          await InstagramBookmark.save(context);
        } catch (error) {
          debug("Instagram bookmark after Telegram", error);
        }
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Native bookmark interception. A trusted bookmark click relays that post.
  // Programmatic clicks made by Social.afterTelegram are ignored by isTrusted,
  // preventing loops.
  // ---------------------------------------------------------------------------

  const BookmarkBridge = {
    installed: false,
    recent: new Map(),
    inFlight: new Set(),
    counters: {
      twitterClicks: 0,
      instagramClicks: 0,
      relayed: 0,
      skippedAlreadySent: 0,
      skippedNoContext: 0,
      failed: 0,
    },

    eventElements(event) {
      const values = [];
      const seen = new Set();

      const add = (value) => {
        if (!isElement(value) || seen.has(value)) return;
        seen.add(value);
        values.push(value);
      };

      try {
        for (const value of event.composedPath?.() || []) add(value);
      } catch {}

      add(event.target);
      return values;
    },

    closestFromEvent(event, selector) {
      for (const element of this.eventElements(event)) {
        try {
          const match = element.matches?.(selector)
            ? element
            : element.closest?.(selector);
          if (match) return match;
        } catch {}
      }
      return null;
    },

    labels(element) {
      if (!isElement(element)) return [];
      const values = new Set();
      const add = (value) => {
        const normalized = normalizeText(value).toLowerCase();
        if (normalized) values.add(normalized);
      };

      add(element.getAttribute?.("aria-label"));
      add(element.getAttribute?.("title"));
      add(element.textContent);

      for (const child of element.querySelectorAll?.("[aria-label],[title],title") || []) {
        add(child.getAttribute?.("aria-label"));
        add(child.getAttribute?.("title"));
        if (String(child.tagName || "").toUpperCase() === "TITLE") add(child.textContent);
      }

      return [...values];
    },

    instagramIsSaveButton(button) {
      if (!isElement(button)) return false;
      const labels = this.labels(button).join(" | ");
      if (!labels) return false;

      if (
        /\b(remove|unsave|unbookmark|remover|retirar|salvo|saved)\b/i.test(labels)
      ) {
        return false;
      }

      return /\b(save|bookmark|salvar|guardar|adicionar aos salvos|adicionar aos itens salvos)\b/i.test(labels);
    },

    twitterContextFromButton(button) {
      const root = twitterRootFromElement(button);
      if (!root) return null;
      const presence = twitterMediaPresence(root);
      if (!presence.hasMedia) return null;
      MoreExpander.kick(root, "twitter");
      const context = twitterContext(root);
      return isElement(context.target) ? context : null;
    },

    instagramContextFromButton(button) {
      let root = instagramRootFromElement(button);

      if (!root && instagramRouteMode() !== "ambient") {
        const candidates = [...document.querySelectorAll("video,img")]
          .filter((element) => {
            if (isVideoElement(element)) return Boolean(Media.visibleRect(element));
            return Media.imageLooksLikeContent(element, "instagram") && Boolean(Media.visibleRect(element));
          })
          .sort((a, b) => Media.visibleScore(b) - Media.visibleScore(a));
        root = candidates[0] ? instagramRootFromElement(candidates[0]) : null;
      }

      if (!root) return null;
      MoreExpander.kick(root, "instagram");
      const context = instagramContext(root);
      return isElement(context.target) ? context : null;
    },

    async relay(context, trigger) {
      if (!context) {
        this.counters.skippedNoContext += 1;
        return false;
      }

      const identity = History.identity(context);
      if (History.get(context, ACTION.telegram)) {
        this.counters.skippedAlreadySent += 1;
        return false;
      }

      const key = `${identity}|${trigger}`;
      const now = Date.now();
      if (now - Number(this.recent.get(key) || 0) < 2500) return false;
      if (this.inFlight.has(identity)) return false;

      this.recent.set(key, now);
      this.inFlight.add(identity);

      try {
        await Actions.run(ACTION.telegram, context, {
          trigger,
          skipSocialAfterTelegram: true,
        });
        this.counters.relayed += 1;
        return true;
      } catch (error) {
        this.counters.failed += 1;
        warn(`Relay automático após ${trigger} falhou`, error);
        return false;
      } finally {
        this.inFlight.delete(identity);
      }
    },

    install() {
      if (this.installed) return;
      this.installed = true;

      document.addEventListener(
        "click",
        (event) => {
          if (!event.isTrusted) return;

          const elements = this.eventElements(event);
          if (!elements.length) return;
          if (elements.some((element) => element.closest?.("#aio-media-actions-root"))) return;

          if (IS_TWITTER && CONFIG.twitter.sendToTelegramOnBookmark) {
            const removeBookmark = this.closestFromEvent(
              event,
              '[data-testid="removeBookmark"]',
            );
            if (removeBookmark) return;

            const bookmark = this.closestFromEvent(
              event,
              '[data-testid="bookmark"]',
            );

            if (bookmark) {
              this.counters.twitterClicks += 1;
              const context = this.twitterContextFromButton(bookmark);

              // Resolve context before X mutates/recycles the action row.
              setTimeout(
                () => void this.relay(context, "twitter-bookmark"),
                120,
              );
              return;
            }
          }

          if (IS_INSTAGRAM && CONFIG.instagram.sendToTelegramOnBookmark) {
            let actionElement = this.closestFromEvent(
              event,
              'button,[role="button"]',
            );

            if (!actionElement) {
              actionElement =
                elements.find((element) => this.instagramIsSaveButton(element)) ||
                null;
            }

            if (!actionElement || !this.instagramIsSaveButton(actionElement)) return;

            this.counters.instagramClicks += 1;
            const context = this.instagramContextFromButton(actionElement);

            setTimeout(
              () => void this.relay(context, "instagram-bookmark"),
              120,
            );
          }
        },
        true,
      );

      log("BookmarkBridge instalado", {
        twitter: IS_TWITTER && CONFIG.twitter.sendToTelegramOnBookmark,
        instagram: IS_INSTAGRAM && CONFIG.instagram.sendToTelegramOnBookmark,
      });
    },
  };

  // ---------------------------------------------------------------------------
  // Auto bookmark opened Instagram Reel
  // ---------------------------------------------------------------------------

  const InstagramOpenedReel = {
    completed: new Set(),
    inFlight: new Set(),
    lastPath: "",

    async check() {
      if (!IS_INSTAGRAM || !CONFIG.instagram.autoBookmarkOpenedReel) return;

      const match = location.pathname.match(/^\/reel\/([^/?#]+)/i);
      if (!match?.[1]) return;

      const shortcode = match[1];
      if (this.completed.has(shortcode) || this.inFlight.has(shortcode)) return;

      const root =
        [...document.querySelectorAll("article,[role='dialog']")]
          .sort((a, b) => Media.visibleScore(b) - Media.visibleScore(a))[0] ||
        document.body;

      const context = instagramContext(root);
      context.pageUrl = `${location.origin}/reel/${shortcode}/`;
      context.metadata = {
        ...(context.metadata || {}),
        instagramShortcode: shortcode,
        mediaId: InstagramBookmark.shortcodeToId(shortcode),
        collectionId: CONFIG.instagram.bookmarkCollectionId,
        bookmarksId: CONFIG.instagram.bookmarksId,
      };

      this.inFlight.add(shortcode);

      try {
        await InstagramBookmark.save(context, {
          collectionId: CONFIG.instagram.bookmarkCollectionId,
          bookmarksId: CONFIG.instagram.bookmarksId,
        });
        this.completed.add(shortcode);
      } catch (error) {
        debug("Auto bookmark Reel falhou", error);
      } finally {
        this.inFlight.delete(shortcode);
      }
    },

    install() {
      if (!IS_INSTAGRAM || !CONFIG.instagram.autoBookmarkOpenedReel) return;
      this.lastPath = location.pathname;

      setInterval(() => {
        if (location.pathname !== this.lastPath) {
          this.lastPath = location.pathname;
        }
        void this.check();
      }, 1_200);

      setTimeout(() => void this.check(), 500);
      setTimeout(() => void this.check(), 1_500);
    },
  };

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // WebGL Liquid Glass renderer
  //
  // Same optical model as @ybouane/liquidglass: one shared WebGL renderer,
  // rounded-surface height field, biconvex refraction, RGB dispersion,
  // Fresnel reflection and multi-light specular. The userscript samples the
  // concrete media node under the control instead of rasterising the full DOM.
  // ---------------------------------------------------------------------------

  const LiquidGlassEngine = (() => {
    const states = new Map();
    const decodedSources = new Map();
    let renderer = null;
    let frame = 0;

    const VS = `
      attribute vec2 a_pos;
      varying vec2 v_uv;
      void main() {
        v_uv = a_pos * 0.5 + 0.5;
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;

    const FS = `
      precision highp float;
      uniform sampler2D u_tex;
      uniform vec2 u_size;
      uniform vec2 u_centerUV;
      uniform vec2 u_pxToUV;
      uniform float u_hasSource;
      uniform float u_refract;
      uniform float u_chroma;
      uniform float u_edgeHL;
      uniform float u_spec;
      uniform float u_fresnel;
      uniform float u_distort;
      uniform float u_alpha;
      uniform float u_sat;
      uniform float u_brightness;
      uniform float u_tintStrength;
      uniform vec3 u_tintColor;
      uniform float u_zRadius;
      uniform float u_pressed;
      uniform vec2 u_pointer;
      uniform float u_time;
      varying vec2 v_uv;

      float rrSDF(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + vec2(r);
        return min(max(q.x, q.y), 0.0) + length(max(q, vec2(0.0))) - r;
      }

      float bevelHeight(float d, float zR) {
        if (d <= 0.0) return 0.0;
        if (d >= zR) return zR;
        return sqrt(max(0.0, d * (2.0 * zR - d)));
      }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec2 half_ = u_size * 0.5;
        float radius = min(half_.x, half_.y);
        vec2 localPx = (v_uv - 0.5) * u_size;
        float sdf = rrSDF(localPx, half_, radius);
        float mask = 1.0 - smoothstep(-1.25, 0.45, sdf);
        if (mask <= 0.002) {
          gl_FragColor = vec4(0.0);
          return;
        }

        float inside = -sdf;
        float maxD = min(half_.x, half_.y);
        float edge = smoothstep(maxD * 0.42, 0.0, inside);
        float zR = max(2.0, mix(u_zRadius, u_zRadius * 0.54, u_pressed));
        float e = 1.25;
        float dC = inside;
        float dR = -rrSDF(localPx + vec2(e, 0.0), half_, radius);
        float dL = -rrSDF(localPx - vec2(e, 0.0), half_, radius);
        float dU = -rrSDF(localPx + vec2(0.0, e), half_, radius);
        float dD = -rrSDF(localPx - vec2(0.0, e), half_, radius);
        float hC = bevelHeight(dC, zR);
        float hR = bevelHeight(dR, zR);
        float hL = bevelHeight(dL, zR);
        float hU = bevelHeight(dU, zR);
        float hD = bevelHeight(dD, zR);
        vec2 hGrad = vec2(hR - hL, hU - hD) / (2.0 * e);
        vec3 N = normalize(vec3(-hGrad, 1.0));
        float depth = smoothstep(0.0, zR, inside);

        float ior = 1.5;
        float refrPow = 1.0 - 1.0 / ior;
        float thickness = hC * 2.0;
        float thickNorm = thickness / max(zR * 2.0, 1.0);
        vec2 entryRefr = hGrad * refrPow;
        vec2 exitRefr = hGrad * refrPow;
        vec2 throughRefr = entryRefr * thickNorm * 0.5;
        float pressRefraction = mix(1.0, 0.52, u_pressed);
        vec2 refrPx = (entryRefr + exitRefr + throughRefr) * u_refract * 22.0 * pressRefraction;
        vec2 centerDir = -localPx / max(half_, vec2(1.0));
        refrPx += centerDir * u_refract * 3.2 * depth * pressRefraction;

        vec2 noisePos = localPx * 0.10 + vec2(u_time * 0.00009, -u_time * 0.00007);
        vec2 micro = (vec2(hash(noisePos), hash(noisePos + vec2(37.0))) - 0.5) * u_distort;
        vec2 base = u_centerUV + localPx * u_pxToUV + refrPx * u_pxToUV + micro;
        float caS = u_chroma * 12.0 * (edge * 0.72 + 0.28);
        vec2 caD = N.xy * caS * u_pxToUV;

        vec3 col = vec3(0.0);
        if (u_hasSource > 0.5) {
          col = vec3(
            texture2D(u_tex, clamp(base + caD, 0.001, 0.999)).r,
            texture2D(u_tex, clamp(base,       0.001, 0.999)).g,
            texture2D(u_tex, clamp(base - caD, 0.001, 0.999)).b
          );
          col *= 1.0 + u_brightness;
          float lum = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(vec3(lum), col, 1.0 + u_sat);
          col = mix(col, u_tintColor, u_tintStrength * (0.30 + edge * 0.70));
          col *= 1.0 + 0.045 * depth;
        }

        float fres = pow(1.0 - abs(N.z), 4.0) * u_fresnel;
        vec3 V = vec3(0.0, 0.0, 1.0);
        vec2 pointerN = (u_pointer - 0.5) * 2.0;
        vec3 L1 = normalize(vec3(0.35 + pointerN.x * 0.85, 0.72 - pointerN.y * 0.85, 1.0));
        vec3 H1 = normalize(L1 + V);
        float sp1 = pow(max(dot(N, H1), 0.0), 82.0);
        vec3 L2 = normalize(vec3(-0.45, -0.35, 1.0));
        vec3 H2 = normalize(L2 + V);
        float sp2 = pow(max(dot(N, H2), 0.0), 42.0) * 0.28;
        vec3 L3 = normalize(vec3(0.0, 0.92, 0.46));
        vec3 H3 = normalize(L3 + V);
        float sp3 = pow(max(dot(N, H3), 0.0), 115.0) * 0.52;
        float totalSpec = (sp1 + sp2 + sp3) * u_spec;

        float borderWidth = 1.15;
        float innerStroke = smoothstep(-borderWidth - 0.9, -borderWidth, sdf)
                          * (1.0 - smoothstep(-0.8, 0.0, sdf));
        float topBias = 0.5 + 0.5 * (-localPx.y / max(half_.y, 1.0));
        innerStroke *= 0.30 + 0.70 * topBias;
        float rim = edge * u_edgeHL * 0.20;
        float innerGlow = smoothstep(4.0, 0.0, -sdf) * u_edgeHL * 0.12;
        float env = (N.y * 0.5 + 0.5) * fres * 0.075;

        vec3 light = vec3(totalSpec + rim + innerGlow + innerStroke * u_edgeHL * 0.60 + env);
        vec3 fin = u_hasSource > 0.5 ? col + light : light;
        fin = mix(fin, vec3(1.0), fres * 0.16);
        float alpha = mask * (u_hasSource > 0.5 ? u_alpha : 0.34);
        gl_FragColor = vec4(fin, alpha);
      }
    `;

    function compile(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || "Shader WebGL inválido.";
        gl.deleteShader(shader);
        throw new Error(message);
      }
      return shader;
    }

    function createRenderer() {
      if (renderer?.unavailable) return null;
      if (renderer) return renderer;
      if (!CONFIG.ui.liquid.realEnabled) return null;

      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      const gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "low-power",
      });
      if (!gl) {
        renderer = { unavailable: true };
        return null;
      }

      try {
        const vs = compile(gl, gl.VERTEX_SHADER, VS);
        const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          throw new Error(gl.getProgramInfoLog(program) || "Programa WebGL inválido.");
        }

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        const names = [
          "u_tex", "u_size", "u_centerUV", "u_pxToUV", "u_hasSource", "u_refract",
          "u_chroma", "u_edgeHL", "u_spec", "u_fresnel", "u_distort", "u_alpha",
          "u_sat", "u_brightness", "u_tintStrength", "u_tintColor", "u_zRadius",
          "u_pressed", "u_pointer", "u_time",
        ];
        const uniforms = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
        renderer = { canvas, gl, program, buffer, texture, uniforms, aPos: gl.getAttribLocation(program, "a_pos") };
        return renderer;
      } catch (error) {
        warn("Liquid Glass WebGL indisponível", error);
        renderer = { unavailable: true };
        return null;
      }
    }

    function tintFor(button) {
      if (button.dataset.action === ACTION.download) return [0.16, 0.88, 0.66];
      if (button.dataset.kind === MEDIA_KIND.photo) return [0.78, 0.61, 1.0];
      return [0.50, 0.84, 1.0];
    }

    function sourceUrlFor(target) {
      if (!isElement(target)) return "";
      const tag = String(target.tagName || "").toUpperCase();
      if (tag === "IMG") return String(target.currentSrc || target.src || target.getAttribute?.("src") || "");
      if (tag === "VIDEO") return String(target.poster || "");
      return "";
    }

    function decodeBlob(blob) {
      if (typeof createImageBitmap === "function") return createImageBitmap(blob).catch(() => null);
      return new Promise((resolve) => {
        const url = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
        image.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        image.src = url;
      });
    }

    function requestDecodedSource(state, target) {
      const url = sourceUrlFor(target);
      if (!/^https?:/i.test(url)) return;
      if (state.fallbackUrl === url && (state.fallbackSource || state.fallbackPending)) return;
      state.fallbackUrl = url;
      state.fallbackSource = null;
      const cached = decodedSources.get(url);
      if (cached) {
        state.fallbackSource = cached;
        state.dirty = true;
        schedule();
        return;
      }
      state.fallbackPending = gmBlob(url)
        .then(({ blob }) => decodeBlob(blob))
        .then((source) => {
          if (!source) return null;
          decodedSources.set(url, source);
          state.fallbackSource = source;
          state.dirty = true;
          schedule();
          return source;
        })
        .catch((error) => { debug("Liquid Glass media snapshot indisponível", error); return null; })
        .finally(() => { state.fallbackPending = null; });
    }

    function intrinsicSize(source, target) {
      const tag = String(target?.tagName || "").toUpperCase();
      if (tag === "VIDEO") {
        return { width: Number(target.videoWidth || source?.videoWidth || source?.width || 0), height: Number(target.videoHeight || source?.videoHeight || source?.height || 0) };
      }
      return { width: Number(target?.naturalWidth || source?.naturalWidth || source?.width || 0), height: Number(target?.naturalHeight || source?.naturalHeight || source?.height || 0) };
    }

    function parseObjectPosition(value) {
      const parts = String(value || "50% 50%").trim().split(/\s+/);
      const parse = (part) => {
        const token = String(part || "50%").toLowerCase();
        if (token === "left" || token === "top") return 0;
        if (token === "right" || token === "bottom") return 1;
        if (token === "center") return 0.5;
        if (/%$/.test(token)) return Math.max(0, Math.min(1, Number.parseFloat(token) / 100));
        return 0.5;
      };
      return { x: parse(parts[0]), y: parse(parts[1] || parts[0]) };
    }

    function sampling(target, source, buttonRect) {
      const rect = target.getBoundingClientRect();
      const intrinsic = intrinsicSize(source, target);
      if (!rect.width || !rect.height || !intrinsic.width || !intrinsic.height) return null;
      let renderedWidth = rect.width;
      let renderedHeight = rect.height;
      let fit = "fill";
      let position = { x: 0.5, y: 0.5 };
      try {
        const style = getComputedStyle(target);
        fit = style.objectFit || "fill";
        position = parseObjectPosition(style.objectPosition);
      } catch {}
      if (fit !== "fill") {
        const contain = Math.min(rect.width / intrinsic.width, rect.height / intrinsic.height);
        const cover = Math.max(rect.width / intrinsic.width, rect.height / intrinsic.height);
        let scale = fit === "contain" ? contain : fit === "cover" ? cover : 1;
        if (fit === "scale-down") scale = Math.min(1, contain);
        renderedWidth = intrinsic.width * scale;
        renderedHeight = intrinsic.height * scale;
      }
      const renderedLeft = rect.left + (rect.width - renderedWidth) * position.x;
      const renderedTop = rect.top + (rect.height - renderedHeight) * position.y;
      const centerX = buttonRect.left + buttonRect.width * 0.5;
      const centerY = buttonRect.top + buttonRect.height * 0.5;
      const x = (centerX - renderedLeft) / renderedWidth;
      const y = (centerY - renderedTop) / renderedHeight;
      return {
        centerUV: [Math.max(0.001, Math.min(0.999, x)), Math.max(0.001, Math.min(0.999, 1 - y))],
        pxToUV: [1 / renderedWidth, 1 / renderedHeight],
      };
    }

    function tryUpload(gl, source) {
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        return true;
      } catch {
        return false;
      }
    }

    function resizeDisplayCanvas(state, widthCss, heightCss) {
      const scale = Math.max(1, Math.min(Number(CONFIG.ui.liquid.renderScale || 2), Number(devicePixelRatio || 1)));
      const width = Math.max(2, Math.round(widthCss * scale));
      const height = Math.max(2, Math.round(heightCss * scale));
      if (state.canvas.width !== width || state.canvas.height !== height) {
        state.canvas.width = width;
        state.canvas.height = height;
        state.canvas.style.width = `${widthCss}px`;
        state.canvas.style.height = `${heightCss}px`;
      }
      return { width, height };
    }

    function render(state, now) {
      const r = createRenderer();
      if (!r) return false;
      const button = state.button;
      const target = state.getTarget?.();
      if (!button?.isConnected || !isElement(target) || !target.isConnected) return false;
      const buttonRect = button.getBoundingClientRect();
      if (buttonRect.width < 4 || buttonRect.height < 4 || !Media.visibleRect(target)) return false;
      const { width, height } = resizeDisplayCanvas(state, buttonRect.width, buttonRect.height);
      const gl = r.gl;
      if (r.canvas.width !== width || r.canvas.height !== height) { r.canvas.width = width; r.canvas.height = height; }
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(r.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, r.buffer);
      gl.enableVertexAttribArray(r.aPos);
      gl.vertexAttribPointer(r.aPos, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, r.texture);

      let source = target;
      const tag = String(target.tagName || "").toUpperCase();
      const directReady = tag === "IMG" ? Boolean(target.complete && target.naturalWidth) : tag === "VIDEO" ? Number(target.readyState || 0) >= 2 && Number(target.videoWidth || 0) > 0 : false;
      let hasSource = false;
      if (directReady && state.directBlockedTarget !== target) {
        hasSource = tryUpload(gl, target);
        if (!hasSource) { state.directBlockedTarget = target; requestDecodedSource(state, target); }
      }
      if (!hasSource && state.fallbackSource) {
        source = state.fallbackSource;
        hasSource = tryUpload(gl, source);
      }
      if (!hasSource) requestDecodedSource(state, target);

      const sample = sampling(target, source, buttonRect) || { centerUV: [0.5, 0.5], pxToUV: [1 / Math.max(1, buttonRect.width), 1 / Math.max(1, buttonRect.height)] };
      const cfg = CONFIG.ui.liquid;
      const tint = tintFor(button);
      gl.uniform1i(r.uniforms.u_tex, 0);
      gl.uniform2f(r.uniforms.u_size, buttonRect.width, buttonRect.height);
      gl.uniform2f(r.uniforms.u_centerUV, sample.centerUV[0], sample.centerUV[1]);
      gl.uniform2f(r.uniforms.u_pxToUV, sample.pxToUV[0], sample.pxToUV[1]);
      gl.uniform1f(r.uniforms.u_hasSource, hasSource ? 1 : 0);
      gl.uniform1f(r.uniforms.u_refract, Number(cfg.refraction || 0.69));
      gl.uniform1f(r.uniforms.u_chroma, Number(cfg.chromaticAberration || 0.05));
      gl.uniform1f(r.uniforms.u_edgeHL, Number(cfg.edgeHighlight || 0.075));
      gl.uniform1f(r.uniforms.u_spec, Number(cfg.specular || 0.22));
      gl.uniform1f(r.uniforms.u_fresnel, Number(cfg.fresnel || 1));
      gl.uniform1f(r.uniforms.u_distort, Number(cfg.distortion || 0));
      gl.uniform1f(r.uniforms.u_alpha, Number(cfg.opacity || 0.96));
      gl.uniform1f(r.uniforms.u_sat, Number(cfg.saturation || 0));
      gl.uniform1f(r.uniforms.u_brightness, Number(cfg.brightness || 0));
      gl.uniform1f(r.uniforms.u_tintStrength, Number(cfg.tintStrength || 0));
      gl.uniform3f(r.uniforms.u_tintColor, tint[0], tint[1], tint[2]);
      gl.uniform1f(r.uniforms.u_zRadius, Math.max(4, Math.min(Number(cfg.zRadius || 17), buttonRect.width * 0.5)));
      gl.uniform1f(r.uniforms.u_pressed, state.pressed ? 1 : 0);
      gl.uniform2f(r.uniforms.u_pointer, state.pointerX, state.pointerY);
      gl.uniform1f(r.uniforms.u_time, now);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      state.context2d.clearRect(0, 0, width, height);
      state.context2d.drawImage(r.canvas, 0, 0, width, height);
      state.canvas.dataset.aioGlassSource = hasSource ? "media" : "optical-fallback";
      state.lastRender = now;
      state.dirty = false;
      return true;
    }

    function tick(now) {
      frame = 0;
      let keepRunning = false;
      const frameInterval = 1000 / Math.max(1, Number(CONFIG.ui.liquid.maxFps || 30));
      for (const [button, state] of states) {
        if (!button.isConnected) { states.delete(button); continue; }
        const target = state.getTarget?.();
        const videoDynamic = isVideoElement(target) && !target.paused && !target.ended;
        const interactive = state.pressed || state.active;
        if (videoDynamic || interactive) keepRunning = true;
        if (state.dirty || interactive || (videoDynamic && now - state.lastRender >= frameInterval)) render(state, now);
      }
      if (keepRunning) frame = requestAnimationFrame(tick);
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(tick);
    }

    return Object.freeze({
      register(button, getTarget) {
        if (!CONFIG.ui.liquid.realEnabled || !button) return null;
        const canvas = button.querySelector?.(".aio-liquid-canvas");
        if (!canvas) return null;
        let state = states.get(button);
        if (!state || state.canvas !== canvas) {
          state = {
            button,
            canvas,
            context2d: canvas.getContext("2d", { alpha: true }),
            getTarget,
            pointerX: 0.5,
            pointerY: 0.34,
            pressed: false,
            active: false,
            dirty: true,
            lastRender: 0,
            directBlockedTarget: null,
            fallbackUrl: "",
            fallbackSource: null,
            fallbackPending: null,
          };
          states.set(button, state);
        } else {
          state.getTarget = getTarget;
          state.dirty = true;
        }
        schedule();
        return state;
      },
      unregister(button) { states.delete(button); },
      mark(button) { const state = states.get(button); if (!state) return; state.dirty = true; schedule(); },
      setInteraction(button, next = {}) {
        const state = states.get(button);
        if (!state) return;
        if (Number.isFinite(next.x)) state.pointerX = Math.max(0, Math.min(1, Number(next.x)));
        if (Number.isFinite(next.y)) state.pointerY = Math.max(0, Math.min(1, Number(next.y)));
        if (typeof next.pressed === "boolean") state.pressed = next.pressed;
        if (typeof next.active === "boolean") state.active = next.active;
        state.dirty = true;
        schedule();
      },
      diagnostics() { return { webgl: Boolean(createRenderer()), controls: states.size, decodedSources: decodedSources.size }; },
    });
  })();


  // ---------------------------------------------------------------------------
  // Instagram logged-in account header
  // ---------------------------------------------------------------------------

  const InstagramAccountHeader = (() => {
    const RESERVED_PATHS = new Set([
      "accounts",
      "about",
      "api",
      "challenge",
      "developer",
      "direct",
      "directory",
      "emails",
      "explore",
      "legal",
      "oauth",
      "p",
      "privacy",
      "reel",
      "reels",
      "stories",
      "terms",
      "tv",
      "web",
    ]);

    let root = null;
    let style = null;
    let avatar = null;
    let profileLink = null;
    let usernameNode = null;
    let versionNode = null;
    let timer = 0;
    let installed = false;
    let identity = null;

    function normalizeUsername(value) {
      const username = String(value || "")
        .trim()
        .replace(/^@+/, "")
        .replace(/^\/+|\/+$/g, "");
      return /^[A-Za-z0-9._]{1,30}$/.test(username) ? username : "";
    }

    function usernameFromHref(value) {
      try {
        const url = new URL(String(value || ""), location.origin);
        if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return "";
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length !== 1) return "";
        const username = normalizeUsername(parts[0]);
        if (!username || RESERVED_PATHS.has(username.toLowerCase())) return "";
        return username;
      } catch {
        return "";
      }
    }

    function usernameFromAlt(value) {
      const text = normalizeText(value);
      if (!text) return "";

      const patterns = [
        /(?:profile picture|profile photo|avatar)\s+(?:of\s+)?@?([A-Za-z0-9._]{1,30})/i,
        /(?:foto|imagem)\s+(?:do|de)\s+perfil\s+(?:de\s+)?@?([A-Za-z0-9._]{1,30})/i,
        /@([A-Za-z0-9._]{1,30})/,
      ];

      for (const pattern of patterns) {
        const username = normalizeUsername(text.match(pattern)?.[1] || "");
        if (username) return username;
      }
      return "";
    }

    function avatarUrlFrom(value) {
      return String(
        value?.profile_pic_url_hd ||
        value?.profile_pic_url ||
        value?.profilePicUrl ||
        value?.profilePictureUrl ||
        value?.avatar_url ||
        "",
      ).trim();
    }

    function viewerFromGlobals() {
      const candidates = [];

      try { candidates.push(pageWindow?._sharedData?.config?.viewer); } catch {}
      try { candidates.push(pageWindow?.__initialData?.data?.viewer); } catch {}
      try { candidates.push(pageWindow?.__initialData?.data?.user); } catch {}
      try { candidates.push(globalThis?._sharedData?.config?.viewer); } catch {}

      for (const viewer of candidates) {
        if (!viewer || typeof viewer !== "object") continue;
        const username = normalizeUsername(viewer.username);
        if (!username) continue;
        const avatarUrl = avatarUrlFrom(viewer);
        return {
          username,
          avatarUrl,
          profileUrl: `https://www.instagram.com/${encodeURIComponent(username)}/`,
          source: "instagram-viewer-global",
        };
      }

      return null;
    }

    function domIdentity() {
      const candidates = [];
      const selectors = [
        'nav a[href] img',
        'header a[href] img',
        '[role="navigation"] a[href] img',
        'a[aria-label*="Profile" i][href] img',
        'a[aria-label*="Perfil" i][href] img',
        'a[title*="Profile" i][href] img',
        'a[title*="Perfil" i][href] img',
      ];

      const seen = new Set();

      for (const selector of selectors) {
        for (const image of document.querySelectorAll?.(selector) || []) {
          if (!isImageElement(image) || seen.has(image)) continue;
          seen.add(image);

          const anchor = image.closest?.("a[href]");
          if (!anchor) continue;
          if (anchor.closest?.("article,[role='dialog']")) continue;

          const hrefUsername = usernameFromHref(anchor.href || anchor.getAttribute("href"));
          const altUsername = usernameFromAlt(image.alt || image.getAttribute("aria-label"));
          const username = hrefUsername || altUsername;
          if (!username) continue;

          const avatarUrl = String(image.currentSrc || image.src || "").trim();
          if (!avatarUrl) continue;

          let score = 0;
          if (anchor.closest?.("nav,[role='navigation'],header")) score += 50;
          if (/profile|perfil/i.test(String(anchor.getAttribute("aria-label") || anchor.getAttribute("title") || ""))) score += 35;
          if (/profile|perfil|avatar/i.test(String(image.alt || ""))) score += 20;
          if (hrefUsername && altUsername && hrefUsername.toLowerCase() === altUsername.toLowerCase()) score += 30;

          const rect = image.getBoundingClientRect?.();
          if (rect && rect.width > 0 && rect.width <= 72 && rect.height > 0 && rect.height <= 72) score += 10;

          candidates.push({
            username,
            avatarUrl,
            profileUrl: `https://www.instagram.com/${encodeURIComponent(username)}/`,
            source: "instagram-navigation-dom",
            score,
          });
        }
      }

      candidates.sort((left, right) => Number(right.score || 0) - Number(left.score || 0));
      return candidates[0] || null;
    }

    function fnv1a(value) {
      let hash = 0x811c9dc5;
      const text = String(value || "").toLowerCase();
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
      }
      return hash >>> 0;
    }

    function hslToRgb(h, s, l) {
      const hue = (((Number(h) || 0) % 360) + 360) % 360 / 360;
      const saturation = Math.max(0, Math.min(1, Number(s) || 0));
      const lightness = Math.max(0, Math.min(1, Number(l) || 0));

      if (saturation === 0) {
        const channel = Math.round(lightness * 255);
        return [channel, channel, channel];
      }

      const q = lightness < 0.5
        ? lightness * (1 + saturation)
        : lightness + saturation - lightness * saturation;
      const p = 2 * lightness - q;

      const channel = (offset) => {
        let t = hue + offset;
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      return [
        Math.round(channel(1 / 3) * 255),
        Math.round(channel(0) * 255),
        Math.round(channel(-1 / 3) * 255),
      ];
    }

    function rgbToHex(rgb) {
      return `#${rgb
        .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()}`;
    }

    function relativeLuminance(rgb) {
      const values = rgb.map((channel) => {
        const value = Math.max(0, Math.min(255, Number(channel) || 0)) / 255;
        return value <= 0.03928
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
    }

    function contrastRatio(rgb, foreground = "white") {
      const backgroundLuminance = relativeLuminance(rgb);
      const foregroundLuminance = foreground === "black" ? 0 : 1;
      const light = Math.max(backgroundLuminance, foregroundLuminance);
      const dark = Math.min(backgroundLuminance, foregroundLuminance);
      return (light + 0.05) / (dark + 0.05);
    }

    function themeForUsername(username) {
      const hash = fnv1a(username);
      const hue = hash % 360;
      const saturation = 0.58 + ((hash >>> 8) % 18) / 100;
      let lightness = 0.39 + ((hash >>> 16) % 14) / 100;
      let rgb = hslToRgb(hue, saturation, lightness);

      let whiteContrast = contrastRatio(rgb, "white");
      let blackContrast = contrastRatio(rgb, "black");

      // Choose the strongest black/white contrast. The loop is defensive and
      // guarantees WCAG AA even if the color formula changes later.
      let foreground = whiteContrast >= blackContrast ? "white" : "black";
      let bestContrast = Math.max(whiteContrast, blackContrast);

      for (let attempt = 0; bestContrast < 7 && attempt < 20; attempt += 1) {
        lightness += foreground === "white" ? -0.025 : 0.025;
        lightness = Math.max(0.18, Math.min(0.82, lightness));
        rgb = hslToRgb(hue, saturation, lightness);
        whiteContrast = contrastRatio(rgb, "white");
        blackContrast = contrastRatio(rgb, "black");
        foreground = whiteContrast >= blackContrast ? "white" : "black";
        bestContrast = Math.max(whiteContrast, blackContrast);
      }

      const darkText = foreground === "black";
      return {
        hex: rgbToHex(rgb),
        foreground: darkText ? "#080A0D" : "#FFFFFF",
        muted: darkText ? "rgba(8,10,13,.68)" : "rgba(255,255,255,.76)",
        chip: darkText ? "rgba(255,255,255,.33)" : "rgba(0,0,0,.18)",
        ring: darkText ? "rgba(8,10,13,.18)" : "rgba(255,255,255,.34)",
        shadow: darkText ? "rgba(0,0,0,.20)" : "rgba(0,0,0,.30)",
        contrast: Number(bestContrast.toFixed(2)),
      };
    }

    function ensureStyle() {
      if (style?.isConnected) return style;

      const avatarSize = Math.max(20, Number(CONFIG.ui.profileHeader.avatarSize) || 25);
      style = document.createElement("style");
      style.id = "aio-instagram-account-header-style";
      style.textContent = `
        #aio-media-actions-root #aio-instagram-account-header{
          --aio-profile-bg:#171717;
          --aio-profile-fg:#fff;
          --aio-profile-muted:rgba(255,255,255,.76);
          --aio-profile-chip:rgba(0,0,0,.18);
          --aio-profile-ring:rgba(255,255,255,.34);
          --aio-profile-shadow:rgba(0,0,0,.30);
          position:fixed;
          top:calc(env(safe-area-inset-top) + ${Math.max(0, Number(CONFIG.ui.profileHeader.topOffset) || 8)}px);
          left:50%;
          z-index:2147483647;
          display:none;
          align-items:center;
          gap:7px;
          min-height:${avatarSize + 8}px;
          max-width:min(86vw,390px);
          padding:4px 8px 4px 4px;
          border:1px solid color-mix(in srgb,var(--aio-profile-fg) 20%,transparent);
          border-radius:999px;
          background:var(--aio-profile-bg);
          color:var(--aio-profile-fg);
          box-shadow:
            0 8px 26px var(--aio-profile-shadow),
            inset 0 1px rgba(255,255,255,.18);
          transform:translateX(-50%);
          pointer-events:auto;
          box-sizing:border-box;
          font:600 12px/1.15 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif;
          -webkit-font-smoothing:antialiased;
          user-select:none;
          -webkit-user-select:none;
          isolation:isolate
        }
        #aio-media-actions-root #aio-instagram-account-header[data-ready="true"]{display:flex}
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-link{
          display:grid;
          grid-template-columns:${avatarSize}px minmax(0,1fr);
          align-items:center;
          gap:7px;
          min-width:0;
          color:inherit;
          text-decoration:none;
          outline:0;
          border-radius:999px
        }
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-link:focus-visible{
          box-shadow:0 0 0 2px var(--aio-profile-fg)
        }
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-avatar{
          display:block;
          width:${avatarSize}px;
          height:${avatarSize}px;
          min-width:${avatarSize}px;
          border-radius:50%;
          object-fit:cover;
          background:var(--aio-profile-chip);
          box-shadow:
            0 0 0 1px var(--aio-profile-ring),
            0 2px 8px rgba(0,0,0,.22)
        }
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-username{
          min-width:0;
          max-width:190px;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          letter-spacing:-.01em
        }
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-version{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-height:22px;
          padding:0 7px;
          border:1px solid color-mix(in srgb,var(--aio-profile-fg) 15%,transparent);
          border-radius:999px;
          background:var(--aio-profile-chip);
          color:var(--aio-profile-muted);
          font-size:10px;
          font-weight:750;
          letter-spacing:.02em;
          white-space:nowrap;
          box-sizing:border-box
        }
        @supports not (color:color-mix(in srgb,white,black)){
          #aio-media-actions-root #aio-instagram-account-header{
            border-color:rgba(255,255,255,.22)
          }
          #aio-media-actions-root #aio-instagram-account-header .aio-profile-version{
            border-color:rgba(255,255,255,.18)
          }
        }
      `;
      (document.head || document.documentElement)?.appendChild(style);
      return style;
    }

    function ensureRoot() {
      if (!IS_INSTAGRAM || CONFIG.ui.profileHeader.enabled === false) return null;
      const uiRoot = Ui.ensureRoot();
      if (!uiRoot) return null;

      ensureStyle();

      if (root?.isConnected) return root;

      const existing = document.getElementById("aio-instagram-account-header");
      if (existing) {
        root = existing;
        profileLink = root.querySelector(".aio-profile-link");
        avatar = root.querySelector(".aio-profile-avatar");
        usernameNode = root.querySelector(".aio-profile-username");
        versionNode = root.querySelector(".aio-profile-version");
        return root;
      }

      root = document.createElement("div");
      root.id = "aio-instagram-account-header";
      root.dataset.ready = "false";
      root.setAttribute("role", "group");
      root.setAttribute("aria-label", `All-in-One Downloader ${VERSION}`);

      profileLink = document.createElement("a");
      profileLink.className = "aio-profile-link";
      profileLink.rel = "noopener";

      avatar = document.createElement("img");
      avatar.className = "aio-profile-avatar";
      avatar.alt = "";
      avatar.decoding = "async";

      usernameNode = document.createElement("span");
      usernameNode.className = "aio-profile-username";

      versionNode = document.createElement("span");
      versionNode.className = "aio-profile-version";
      versionNode.textContent = `Downloader v${VERSION}`;

      profileLink.append(avatar, usernameNode);
      root.append(profileLink, versionNode);
      uiRoot.appendChild(root);
      return root;
    }

    function findIdentity() {
      return viewerFromGlobals() || domIdentity();
    }

    function apply(next) {
      const node = ensureRoot();
      if (!node || !next?.username || !next?.avatarUrl) return false;

      const username = normalizeUsername(next.username);
      if (!username) return false;

      const theme = themeForUsername(username);
      identity = {
        username,
        avatarUrl: String(next.avatarUrl),
        profileUrl: next.profileUrl || `https://www.instagram.com/${encodeURIComponent(username)}/`,
        source: next.source || "unknown",
        color: theme.hex,
        contrast: theme.contrast,
      };

      profileLink.href = identity.profileUrl;
      profileLink.title = `Abrir @${username}`;
      profileLink.setAttribute("aria-label", `Abrir perfil @${username}`);
      avatar.src = identity.avatarUrl;
      avatar.alt = `@${username}`;
      usernameNode.textContent = `@${username}`;
      versionNode.textContent = `Downloader v${VERSION}`;

      node.style.setProperty("--aio-profile-bg", theme.hex);
      node.style.setProperty("--aio-profile-fg", theme.foreground);
      node.style.setProperty("--aio-profile-muted", theme.muted);
      node.style.setProperty("--aio-profile-chip", theme.chip);
      node.style.setProperty("--aio-profile-ring", theme.ring);
      node.style.setProperty("--aio-profile-shadow", theme.shadow);
      node.dataset.ready = "true";
      node.dataset.username = username;
      node.dataset.color = theme.hex;
      return true;
    }

    function refresh() {
      if (!IS_INSTAGRAM || CONFIG.ui.profileHeader.enabled === false) return null;

      try {
        const next = findIdentity();
        if (next) {
          const changed =
            !identity ||
            identity.username !== next.username ||
            identity.avatarUrl !== next.avatarUrl;

          if (changed || !root?.isConnected) apply(next);
          else ensureRoot();
        } else {
          ensureRoot();
        }
      } catch (error) {
        debug("Instagram account header refresh falhou", error);
      }

      return identity;
    }

    function install() {
      if (installed || !IS_INSTAGRAM || CONFIG.ui.profileHeader.enabled === false) return;
      installed = true;
      ensureRoot();
      refresh();

      timer = window.setInterval(
        refresh,
        Math.max(700, Number(CONFIG.ui.profileHeader.refreshInterval) || 1_800),
      );

      addEventListener("pageshow", refresh, { passive: true });
      addEventListener("popstate", refresh, { passive: true });
      addEventListener("hashchange", refresh, { passive: true });

      setTimeout(refresh, 250);
      setTimeout(refresh, 900);
      setTimeout(refresh, 2_000);
    }

    function diagnostics() {
      return {
        enabled: IS_INSTAGRAM && CONFIG.ui.profileHeader.enabled !== false,
        installed,
        ready: Boolean(root?.dataset?.ready === "true"),
        username: identity?.username || null,
        avatarUrl: identity?.avatarUrl || null,
        profileUrl: identity?.profileUrl || null,
        source: identity?.source || null,
        color: identity?.color || null,
        contrast: identity?.contrast || null,
        version: VERSION,
      };
    }

    return Object.freeze({
      install,
      refresh,
      diagnostics,
      themeForUsername,
    });
  })();

  const Ui = {
    root: null,
    style: null,
    sequence: 0,
    ids: new WeakMap(),
    groups: new Map(),

    repair() {
      const host = document.body || document.documentElement;
      if (!host) return null;

      if (this.root && !this.root.isConnected) {
        try { host.appendChild(this.root); } catch {}
      }

      const styleHost = document.head || document.documentElement;
      if (this.style && styleHost && !this.style.isConnected) {
        try { styleHost.appendChild(this.style); } catch {}
      }

      if (this.root?.isConnected) {
        for (const state of this.groups.values()) {
          if (
            state?.group &&
            !state.group.isConnected &&
            isElement(state.target) &&
            state.target.isConnected
          ) {
            try { this.root.appendChild(state.group); } catch {}
          }
        }
      }

      return this.root;
    },

    ensureRoot() {
      const host = document.body || document.documentElement;
      if (!host) return null;

      if (this.root?.isConnected) {
        this.ensureStyles();
        this.repair();
        return this.root;
      }

      const existing = document.getElementById("aio-media-actions-root");
      if (existing) {
        this.root = existing;
        this.ensureStyles();
        this.repair();
        return existing;
      }

      const root = document.createElement("div");
      root.id = "aio-media-actions-root";
      root.dataset.version = VERSION;
      root.style.cssText = [
        "all:initial!important",
        "position:fixed!important",
        "left:0!important",
        "top:0!important",
        "width:0!important",
        "height:0!important",
        "overflow:visible!important",
        "pointer-events:none!important",
        "z-index:2147483646!important",
      ].join(";");

      host.appendChild(root);
      this.root = root;
      this.ensureStyles();
      return root;
    },

    ensureStyles() {
      if (this.style?.isConnected) return;
      const size = CONFIG.ui.liquid.buttonSize;
      const iconSize = CONFIG.ui.liquid.iconSize;
      const style = document.createElement("style");
      style.id = "aio-media-actions-style";
      style.textContent = `
        #aio-media-actions-root .aio-group{
          position:fixed;z-index:2147483647;display:none;align-items:center;gap:5px;
          width:max-content;padding:1px;border:0;border-radius:999px;background:transparent;
          box-shadow:none;pointer-events:auto;touch-action:none;user-select:none;
          -webkit-user-select:none;box-sizing:border-box
        }

        /*
         * Stable Liquid fallback, enabled by default.
         * No canvas, shader, snapshot or filter URL is required. The apparent
         * volume comes from several independent optical layers, a moving
         * specular hotspot and inner/outer meniscus highlights.
         */
        #aio-media-actions-root .aio-button{
          --aio-liquid-x:50%;
          --aio-liquid-y:34%;
          --aio-liquid-shift-x:0px;
          --aio-liquid-shift-y:0px;
          --aio-liquid-tilt-x:0deg;
          --aio-liquid-tilt-y:0deg;
          --aio-liquid-scale:1;
          --aio-liquid-accent:210 92% 68%;
          position:relative;
          display:inline-grid;
          place-items:center;
          width:${size}px;
          min-width:${size}px;
          height:${size}px;
          min-height:${size}px;
          padding:0;
          overflow:hidden;
          border:.6px solid rgba(255,255,255,.24);
          border-radius:50%;
          outline:0;
          color:rgba(255,255,255,.91);
          cursor:pointer;
          appearance:none;
          -webkit-appearance:none;
          touch-action:none;
          box-sizing:border-box;
          isolation:isolate;
          background:
            radial-gradient(circle at var(--aio-liquid-x) var(--aio-liquid-y),
              rgba(255,255,255,.30) 0 5%,
              rgba(255,255,255,.10) 17%,
              rgba(255,255,255,.025) 37%,
              rgba(255,255,255,0) 58%),
            radial-gradient(circle at 73% 79%,
              hsla(var(--aio-liquid-accent)/.11) 0 10%,
              rgba(255,255,255,0) 49%),
            linear-gradient(145deg,
              rgba(255,255,255,.105) 0%,
              rgba(255,255,255,.028) 35%,
              rgba(8,13,22,.075) 70%,
              rgba(255,255,255,.045) 100%),
            rgba(20,28,40,.11);
          -webkit-backdrop-filter:blur(8px) saturate(1.14) contrast(1.015);
          backdrop-filter:blur(8px) saturate(1.14) contrast(1.015);
          box-shadow:
            0 5px 14px rgba(0,0,0,.16),
            0 1px 2px rgba(0,0,0,.11),
            inset 0 .8px .75px rgba(255,255,255,.38),
            inset .8px .2px 1.1px rgba(255,255,255,.13),
            inset 0 -1px 1.35px rgba(3,8,18,.18),
            0 0 0 .35px rgba(255,255,255,.08);
          transform-origin:50% 56%;
          transform:perspective(180px)
            translate3d(var(--aio-liquid-shift-x),var(--aio-liquid-shift-y),0)
            rotateX(var(--aio-liquid-tilt-x))
            rotateY(var(--aio-liquid-tilt-y))
            scale(var(--aio-liquid-scale));
          transition:
            transform 250ms cubic-bezier(.22,1,.36,1),
            opacity 150ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        #aio-media-actions-root .aio-button::before{
          content:"";
          position:absolute;
          inset:.7px;
          z-index:0;
          border-radius:inherit;
          pointer-events:none;
          background:
            radial-gradient(circle at var(--aio-liquid-x) var(--aio-liquid-y),
              rgba(255,255,255,.44) 0 2.5%,
              rgba(255,255,255,.18) 8%,
              rgba(255,255,255,0) 31%),
            linear-gradient(160deg,
              rgba(255,255,255,.19),
              rgba(255,255,255,.025) 36%,
              rgba(255,255,255,0) 63%);
          opacity:.72;
          mix-blend-mode:screen;
          transform:translateZ(0);
        }

        #aio-media-actions-root .aio-button::after{
          content:"";
          position:absolute;
          inset:1.2px;
          z-index:1;
          border-radius:inherit;
          pointer-events:none;
          border:.45px solid rgba(255,255,255,.13);
          box-shadow:
            inset 1.1px 1.6px 2px rgba(255,255,255,.09),
            inset -1px -1.2px 2px rgba(0,0,0,.10);
          background:
            radial-gradient(ellipse at 35% 8%,rgba(255,255,255,.12),transparent 43%),
            radial-gradient(ellipse at 78% 92%,hsla(var(--aio-liquid-accent)/.055),transparent 42%);
        }

        #aio-media-actions-root .aio-liquid-canvas{
          position:absolute;inset:0;z-index:0;display:none;width:100%;height:100%;
          border-radius:inherit;pointer-events:none;opacity:1
        }

        #aio-media-actions-root .aio-button[data-liquid-mode="real"] .aio-liquid-canvas{
          display:block
        }

        #aio-media-actions-root .aio-button[data-liquid-mode="real"]::before,
        #aio-media-actions-root .aio-button[data-liquid-mode="real"]::after{
          opacity:.34
        }

        #aio-media-actions-root .aio-liquid-content{
          position:relative;z-index:3;display:grid;place-items:center;width:100%;height:100%;
          pointer-events:none;filter:drop-shadow(0 1px .55px rgba(0,0,0,.28));transform:translateZ(0)
        }

        #aio-media-actions-root .aio-button:hover,
        #aio-media-actions-root .aio-button:focus-visible{
          --aio-liquid-scale:1.035;
          border-color:rgba(255,255,255,.32);
          box-shadow:
            0 6px 16px rgba(0,0,0,.18),
            inset 0 .9px .9px rgba(255,255,255,.44),
            inset 0 -1px 1.4px rgba(0,0,0,.13),
            0 0 0 .45px rgba(255,255,255,.11)
        }

        #aio-media-actions-root .aio-button[data-liquid-pressed="true"],
        #aio-media-actions-root .aio-button:active{
          --aio-liquid-scale:.94;
          transition-duration:85ms;
          box-shadow:
            0 2px 6px rgba(0,0,0,.15),
            inset 0 .5px .6px rgba(255,255,255,.24),
            inset 0 -1.2px 1.8px rgba(0,0,0,.19)
        }

        #aio-media-actions-root .aio-button[aria-busy="true"]{opacity:.42;pointer-events:none}
        #aio-media-actions-root .aio-button[data-action="telegram"][data-kind="photo"]{
          --aio-liquid-accent:273 84% 72%;
          color:rgba(250,247,255,.91);
          border-color:rgba(221,214,254,.25)
        }
        #aio-media-actions-root .aio-button[data-action="telegram"][data-kind="video"]{
          --aio-liquid-accent:200 94% 66%;
          color:rgba(244,251,255,.92);
          border-color:rgba(186,230,253,.25)
        }
        #aio-media-actions-root .aio-button[data-action="download"]{
          --aio-liquid-accent:158 72% 59%;
          color:rgba(240,253,248,.91);
          border-color:rgba(167,243,208,.23)
        }
        #aio-media-actions-root .aio-button[data-done="telegram"],
        #aio-media-actions-root .aio-button[data-done="download"]{
          border-color:rgba(255,255,255,.34);
          box-shadow:
            0 5px 14px rgba(0,0,0,.17),
            0 0 0 .45px rgba(255,255,255,.13),
            inset 0 .8px .9px rgba(255,255,255,.42)
        }
        #aio-media-actions-root .aio-button svg{
          width:${iconSize}px;height:${iconSize}px;overflow:visible;pointer-events:none
        }
        #aio-media-actions-root .aio-button .aio-icon-main{
          fill:none;stroke:currentColor;stroke-width:1.05;stroke-linecap:round;stroke-linejoin:round
        }
        #aio-media-actions-root .aio-button .aio-icon-plane{
          fill:currentColor;stroke:none;opacity:.84
        }
        @media(prefers-reduced-motion:reduce){
          #aio-media-actions-root .aio-button{transition-duration:.01ms!important;transform:none!important}
        }
        @media(prefers-contrast:more){
          #aio-media-actions-root .aio-button{border-color:rgba(255,255,255,.5)}
        }
      `;
      (document.head || document.documentElement)?.appendChild(style);
      this.style = style;
    },

    id(element) {
      if (!this.ids.has(element)) {
        this.sequence += 1;
        this.ids.set(element, this.sequence);
      }
      return this.ids.get(element);
    },

    photoTelegramIcon() {
      return `
        <svg viewBox="0 0 28 28" aria-hidden="true">
          <g class="aio-icon-main">
            <path d="M3.8 10.2h2.8l1.4-2.1h6.8l1.4 2.1h2.4v10.2H3.8z"/>
            <circle cx="11.2" cy="15.2" r="3.1"/>
            <path d="M6.4 12.4h.1"/>
          </g>
          <path class="aio-icon-plane" d="M25.1 3.1c.7-.3 1.3.2 1.1.9l-2.3 9.1c-.2.7-.7.9-1.3.5l-2.7-2-1.4 1.3c-.2.2-.4.3-.7.3l.2-3 5.2-4.7c.3-.2 0-.4-.3-.2l-6.4 4-2.7-.8c-.6-.2-.6-.6.1-.9z"/>
        </svg>
      `;
    },

    videoTelegramIcon() {
      return `
        <svg viewBox="0 0 28 28" aria-hidden="true">
          <g class="aio-icon-main">
            <rect x="3.6" y="8.8" width="15.2" height="11.8" rx="2"/>
            <path d="M6.3 8.8v11.8M16.1 8.8v11.8M3.6 12h3M3.6 17.4h3M16.1 12h2.7M16.1 17.4h2.7"/>
            <path d="m9.6 12.6 4.4 2.1-4.4 2.2z"/>
          </g>
          <path class="aio-icon-plane" d="M25.1 3.1c.7-.3 1.3.2 1.1.9l-2.3 9.1c-.2.7-.7.9-1.3.5l-2.7-2-1.4 1.3c-.2.2-.4.3-.7.3l.2-3 5.2-4.7c.3-.2 0-.4-.3-.2l-6.4 4-2.7-.8c-.6-.2-.6-.6.1-.9z"/>
        </svg>
      `;
    },

    downloadIcon() {
      return `
        <svg viewBox="0 0 28 28" aria-hidden="true">
          <g class="aio-icon-main">
            <path d="M14 4.5v12"/>
            <path d="m9.8 12.7 4.2 4.2 4.2-4.2"/>
            <path d="M6 21.5h16"/>
          </g>
        </svg>
      `;
    },

    liquidMarkup(icon) {
      const canvas = CONFIG.ui.liquid.realEnabled
        ? '<canvas class="aio-liquid-canvas" aria-hidden="true"></canvas>'
        : '';
      return `${canvas}<span class="aio-liquid-content">${icon}</span>`;
    },

    setButtonKind(button, kind) {
      if (!button) return;
      const normalizedKind = kind === MEDIA_KIND.photo ? MEDIA_KIND.photo : MEDIA_KIND.video;
      button.dataset.kind = normalizedKind;
      if (button.dataset.action === ACTION.telegram) {
        const icon = normalizedKind === MEDIA_KIND.photo ? this.photoTelegramIcon() : this.videoTelegramIcon();
        const content = button.querySelector?.(".aio-liquid-content");
        if (content) content.innerHTML = icon;
        else button.innerHTML = this.liquidMarkup(icon);
        button.title = normalizedKind === MEDIA_KIND.photo ? "Enviar foto(s) para o Telegram" : "Enviar vídeo para o Telegram";
        button.setAttribute("aria-label", button.title);
      }
      if (CONFIG.ui.liquid.realEnabled) {
        try {
          LiquidGlassEngine.mark(button);
        } catch (error) {
          debug("Liquid Glass mark falhou", error);
        }
      }
    },

    bindLiquidInteraction(button, state) {
      if (button.__aioLiquidBound) return;

      const fallbackEnabled = CONFIG.ui.liquid.fallbackEnabled !== false;
      const realEnabled = CONFIG.ui.liquid.realEnabled === true;
      if (!fallbackEnabled && !realEnabled) {
        button.dataset.liquidMode = "plain";
        return;
      }

      button.__aioLiquidBound = true;
      button.dataset.liquidMode = realEnabled ? "real" : "fallback";

      // The experimental engine is opt-in. In the default fallback mode not a
      // single WebGL call is made, which keeps the UI independent from canvas,
      // CORS texture rules and Safari WebGL quirks.
      if (realEnabled) {
        try {
          LiquidGlassEngine.register(button, () => state.target);
        } catch (error) {
          debug("Liquid Glass real falhou; mantendo fallback CSS.", error);
          button.dataset.liquidMode = "fallback";
          const canvas = button.querySelector?.(".aio-liquid-canvas");
          if (canvas) canvas.style.display = "none";
        }
      }

      let frame = 0;
      let targetX = 0.5;
      let targetY = 0.34;
      let currentX = targetX;
      let currentY = targetY;
      let pressed = false;
      let active = false;

      const apply = () => {
        frame = 0;
        const follow = Math.max(0.05, Math.min(1, CONFIG.ui.liquid.highlightFollow));
        currentX += (targetX - currentX) * follow;
        currentY += (targetY - currentY) * follow;

        const nx = (currentX - 0.5) * 2;
        const ny = (currentY - 0.5) * 2;
        button.style.setProperty("--aio-liquid-x", `${(currentX * 100).toFixed(2)}%`);
        button.style.setProperty("--aio-liquid-y", `${(currentY * 100).toFixed(2)}%`);
        button.style.setProperty("--aio-liquid-shift-x", `${(nx * CONFIG.ui.liquid.maxShiftPixels).toFixed(2)}px`);
        button.style.setProperty("--aio-liquid-shift-y", `${(ny * CONFIG.ui.liquid.maxShiftPixels).toFixed(2)}px`);
        button.style.setProperty("--aio-liquid-tilt-x", `${(-ny * CONFIG.ui.liquid.maxTiltDegrees).toFixed(2)}deg`);
        button.style.setProperty("--aio-liquid-tilt-y", `${(nx * CONFIG.ui.liquid.maxTiltDegrees).toFixed(2)}deg`);
        button.dataset.liquidPressed = String(pressed);

        if (button.dataset.liquidMode === "real") {
          try {
            LiquidGlassEngine.setInteraction(button, {
              x: currentX,
              y: currentY,
              pressed,
              active,
            });
          } catch (error) {
            debug("Liquid Glass interaction falhou; voltando ao fallback.", error);
            button.dataset.liquidMode = "fallback";
          }
        }

        if (
          Math.abs(targetX - currentX) > 0.002 ||
          Math.abs(targetY - currentY) > 0.002
        ) {
          frame = requestAnimationFrame(apply);
        }
      };

      const scheduleInteraction = () => {
        if (!frame) frame = requestAnimationFrame(apply);
      };

      const point = (event) => {
        const rect = button.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        targetY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        scheduleInteraction();
      };

      const relax = () => {
        pressed = false;
        active = false;
        targetX = 0.5;
        targetY = 0.34;
        scheduleInteraction();
      };

      button.addEventListener("pointerenter", (event) => {
        active = true;
        point(event);
      }, { passive: true });
      button.addEventListener("pointermove", point, { passive: true });
      button.addEventListener("pointerdown", (event) => {
        active = true;
        pressed = true;
        point(event);
      }, { passive: true });
      button.addEventListener("pointerup", relax, { passive: true });
      button.addEventListener("pointercancel", relax, { passive: true });
      button.addEventListener("pointerleave", relax, { passive: true });
      scheduleInteraction();
    },

    async detectKind(state) {
      try {
        const context = state.getContext();
        const items = Media.dedupeItems(await context.items());
        const hasVideo = items.some((item) => item.kind === MEDIA_KIND.video);
        return hasVideo ? MEDIA_KIND.video : MEDIA_KIND.photo;
      } catch {
        return isVideoElement(state.target) ? MEDIA_KIND.video : MEDIA_KIND.photo;
      }
    },

    position(group, target) {
      const visible = Media.visibleRect(target);
      if (!visible) {
        group.style.display = "none";
        group.style.visibility = "";
        return;
      }

      // Make the group measurable before calculating its fixed position.
      group.style.visibility = "hidden";
      group.style.display = "inline-flex";

      const width = Math.max(38, Number(group.offsetWidth || 38));
      const height = Math.max(38, Number(group.offsetHeight || 38));
      const padding = CONFIG.ui.padding;
      const viewport = window.visualViewport;
      const viewportLeft = Number(viewport?.offsetLeft || 0);
      const viewportTop = Number(viewport?.offsetTop || 0);
      const viewportWidth = Math.max(1, Number(viewport?.width || innerWidth || 1));
      const viewportHeight = Math.max(1, Number(viewport?.height || innerHeight || 1));
      const viewportRight = viewportLeft + viewportWidth;
      const viewportBottom = viewportTop + viewportHeight;

      let left = visible.left + padding;
      let top = visible.top + Math.max(0, (visible.height - height) / 2);

      const saved = (() => {
        try {
          return JSON.parse(
            localStorage.getItem(
              `${CONFIG.ui.dragStoragePrefix}:${location.hostname}:${group.id}`,
            ) || "null",
          );
        } catch {
          return null;
        }
      })();

      if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
        const rect = target.getBoundingClientRect();
        left = rect.left + saved.x * Math.max(0, rect.width - width);
        top = rect.top + saved.y * Math.max(0, rect.height - height);
      }

      left = Math.max(
        viewportLeft + padding,
        Math.min(viewportRight - width - padding, left),
      );
      top = Math.max(
        viewportTop + padding,
        Math.min(viewportBottom - height - padding, top),
      );

      group.style.position = "fixed";
      group.style.left = `${Math.round(left)}px`;
      group.style.top = `${Math.round(top)}px`;
      group.style.right = "auto";
      group.style.bottom = "auto";
      group.style.visibility = "";
      group.style.display = "inline-flex";
      group.removeAttribute("aria-hidden");
    },

    makeDraggable(group, state) {
      let pointerId = null;
      let startX = 0;
      let startY = 0;
      let startLeft = 0;
      let startTop = 0;
      let dragging = false;
      let suppressClick = false;

      group.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        const rect = group.getBoundingClientRect();
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = rect.left;
        startTop = rect.top;
        dragging = false;
      });

      group.addEventListener("pointermove", (event) => {
        if (event.pointerId !== pointerId) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;

        if (!dragging && Math.hypot(dx, dy) < CONFIG.ui.dragThreshold) return;

        dragging = true;
        suppressClick = true;
        event.preventDefault();

        const width = Number(group.offsetWidth || 38);
        const height = Number(group.offsetHeight || 38);
        const viewport = window.visualViewport;
        const viewportLeft = Number(viewport?.offsetLeft || 0);
        const viewportTop = Number(viewport?.offsetTop || 0);
        const viewportWidth = Math.max(1, Number(viewport?.width || innerWidth || 1));
        const viewportHeight = Math.max(1, Number(viewport?.height || innerHeight || 1));
        const padding = 8;

        const left = Math.max(
          viewportLeft + padding,
          Math.min(viewportLeft + viewportWidth - width - padding, startLeft + dx),
        );
        const top = Math.max(
          viewportTop + padding,
          Math.min(viewportTop + viewportHeight - height - padding, startTop + dy),
        );

        group.style.left = `${Math.round(left)}px`;
        group.style.top = `${Math.round(top)}px`;
        group.style.display = "inline-flex";
      });

      const finish = (event) => {
        if (event.pointerId !== pointerId) return;

        const target = state.target;
        if (dragging && isElement(target)) {
          const targetRect = target.getBoundingClientRect();
          const groupRect = group.getBoundingClientRect();
          const x = Math.max(
            0,
            Math.min(
              1,
              (groupRect.left - targetRect.left) /
                Math.max(1, targetRect.width - groupRect.width),
            ),
          );
          const y = Math.max(
            0,
            Math.min(
              1,
              (groupRect.top - targetRect.top) /
                Math.max(1, targetRect.height - groupRect.height),
            ),
          );

          try {
            localStorage.setItem(
              `${CONFIG.ui.dragStoragePrefix}:${location.hostname}:${group.id}`,
              JSON.stringify({ x, y }),
            );
          } catch {}
        }

        pointerId = null;
        dragging = false;
        if (suppressClick) {
          setTimeout(() => {
            suppressClick = false;
          }, 0);
        }
      };

      group.addEventListener("pointerup", finish);
      group.addEventListener("pointercancel", finish);
      group.addEventListener(
        "click",
        (event) => {
          if (!suppressClick) return;
          event.preventDefault();
          event.stopImmediatePropagation();
        },
        true,
      );
    },

    actions() {
      const actions = [];
      if (CONFIG.features.telegramButton) actions.push(ACTION.telegram);
      if (CONFIG.features.downloadButton) actions.push(ACTION.download);
      return actions;
    },

    attach(id, target, getContext) {
      const root = this.ensureRoot();
      if (!root || !isElement(target)) return;

      const existing = this.groups.get(id);
      if (existing?.group?.isConnected) {
        existing.target = target;
        existing.getContext = getContext;
        void this.refresh(existing);
        this.position(existing.group, existing.target);
        return;
      }

      const group = document.createElement("div");
      group.id = id;
      group.className = "aio-group";

      const state = {
        group,
        target,
        getContext,
        buttons: new Map(),
      };

      for (const action of this.actions()) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "aio-button";
        button.dataset.action = action;

        if (action === ACTION.download) {
          button.dataset.kind = "download";
          button.innerHTML = this.liquidMarkup(this.downloadIcon());
          button.title = "Baixar mídia";
          button.setAttribute("aria-label", "Baixar mídia");
        } else {
          this.setButtonKind(
            button,
            isVideoElement(target) ? MEDIA_KIND.video : MEDIA_KIND.photo,
          );
        }

        this.bindLiquidInteraction(button, state);
        state.buttons.set(action, button);

        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (button.getAttribute("aria-busy") === "true") return;
          button.setAttribute("aria-busy", "true");

          try {
            const context = state.getContext();

            if (History.get(context, action) && Toast?.canConfirm === true) {
              const repeat = await Toast.confirm({
                title:
                  action === ACTION.telegram
                    ? "Enviar novamente?"
                    : "Baixar novamente?",
                description: "Essa ação já foi concluída para este post.",
                duration: 0,
                dismissible: true,
                actions: [
                  {
                    id: "cancel",
                    label: "Cancelar",
                    variant: "secondary",
                    value: false,
                    handle: () => false,
                  },
                  {
                    id: "repeat",
                    label: "Repetir",
                    variant: "primary",
                    value: true,
                    handle: () => true,
                  },
                ],
              });

              if (repeat !== true) return;
            }

            await Actions.run(action, context);
            await this.refresh(state);
          } catch (error) {
            debug("Ação do botão falhou", error);
          } finally {
            button.removeAttribute("aria-busy");
          }
        });

        group.appendChild(button);
      }

      root.appendChild(group);
      this.makeDraggable(group, state);
      this.groups.set(id, state);
      void this.refresh(state);
      this.position(group, target);
    },

    async refresh(state) {
      const context = state.getContext();
      const kind = await this.detectKind(state);

      for (const [action, button] of state.buttons) {
        if (action === ACTION.telegram) this.setButtonKind(button, kind);

        if (History.get(context, action)) {
          button.dataset.done = action;
        } else {
          delete button.dataset.done;
        }
      }
    },

    repositionAll() {
      this.ensureRoot();
      this.repair();

      for (const state of this.groups.values()) {
        if (
          !state.group.isConnected &&
          this.root?.isConnected &&
          isElement(state.target) &&
          state.target.isConnected
        ) {
          try { this.root.appendChild(state.group); } catch {}
        }

        if (!state.group.isConnected) continue;

        if (!isElement(state.target) || !state.target.isConnected) {
          state.group.style.display = "none";
          continue;
        }

        this.position(state.group, state.target);
      }
    },

    detach(id) {
      const state = this.groups.get(id);
      if (!state) return false;
      state.group.querySelectorAll?.(".aio-button").forEach((button) => LiquidGlassEngine.unregister(button));
      try { state.group.remove(); } catch {}
      this.groups.delete(id);
      return true;
    },

    diagnostics() {
      const groups = [...this.groups.values()];
      return {
        groups: groups.length,
        visibleGroups: groups.filter(
          (state) =>
            state.group.isConnected &&
            getComputedStyle(state.group).display !== "none",
        ).length,
        liquidGlass: {
          fallbackEnabled: CONFIG.ui.liquid.fallbackEnabled !== false,
          realEnabled: CONFIG.ui.liquid.realEnabled === true,
          mode: CONFIG.ui.liquid.realEnabled === true
            ? "real-webgl"
            : CONFIG.ui.liquid.fallbackEnabled !== false
              ? "fallback-css"
              : "plain",
          buttonSize: CONFIG.ui.liquid.buttonSize,
          iconSize: CONFIG.ui.liquid.iconSize,
          engine: CONFIG.ui.liquid.realEnabled
            ? LiquidGlassEngine.diagnostics()
            : { webgl: false, controls: 0, decodedSources: 0, cold: true },
        },
      };
    },
  };

  // ---------------------------------------------------------------------------
  // Providers
  // ---------------------------------------------------------------------------

  const TwitterProvider = {
    roots: new WeakMap(),

    groupId(root, create = true) {
      let id = this.roots.get(root);
      if (!id && create) {
        id = Ui.id(root);
        this.roots.set(root, id);
      }
      return id ? `aio-twitter-${id}` : null;
    },

    unmount(root) {
      const groupId = this.groupId(root, false);
      if (groupId) Ui.detach(groupId);
    },

    mount(root) {
      if (!isElement(root) || !root.isConnected) return;
      MoreExpander.kick(root, "twitter");

      // Importante no X: articles são reciclados pela timeline. Só existe UI
      // quando o tweet ATUAL possui mídia de conteúdo real. Avatar, emoji,
      // preview pequeno e tweet apenas textual não contam.
      const presence = twitterMediaPresence(root);
      if (!presence.hasMedia) {
        this.unmount(root);
        return;
      }

      TwitterStore.ingestElement(root);
      const context = twitterContext(root);
      const target = context.target;
      if (!isElement(target)) {
        this.unmount(root);
        return;
      }

      Ui.attach(this.groupId(root), target, () => twitterContext(root));
    },

    scan(root = document) {
      if (isElement(root)) {
        TwitterStore.ingestElement(root);
        const tweet = twitterRootFromElement(root);
        if (tweet) this.mount(tweet);
      }

      root
        .querySelectorAll?.('[data-testid="tweet"],article[data-testid="tweet"],article')
        .forEach((tweet) => this.mount(tweet));
    },
  };

  const InstagramProvider = {
    roots: new WeakMap(),
    mountedRoots: new Set(),

    groupId(root, create = true) {
      let id = this.roots.get(root);
      if (!id && create) {
        id = Ui.id(root);
        this.roots.set(root, id);
      }
      return id ? `aio-instagram-${id}` : null;
    },

    unmount(root) {
      const groupId = this.groupId(root, false);
      if (groupId) Ui.detach(groupId);
      this.mountedRoots.delete(root);
    },

    mount(root) {
      if (!isElement(root) || !root.isConnected) return;
      MoreExpander.kick(root, "instagram");
      InstagramStore.ingestElement(root);

      const context = instagramContext(root);
      const target = context.target;
      if (!isElement(target)) {
        this.unmount(root);
        return;
      }

      this.mountedRoots.add(root);
      Ui.attach(this.groupId(root), target, () => instagramContext(root));
    },

    cleanup() {
      for (const root of [...this.mountedRoots]) {
        if (!isElement(root) || !root.isConnected) {
          this.unmount(root);
          continue;
        }

        const context = instagramContext(root);
        if (!isElement(context.target)) this.unmount(root);
      }
    },

    scan(root = document) {
      if (isElement(root)) {
        InstagramStore.ingestElement(root);
        const container = instagramRootFromElement(root);
        if (container) this.mount(container);
      }

      // We still observe media nodes because Instagram recycles DOM aggressively,
      // but only semantic/focused roots are eligible. Profile grids, story tray,
      // avatars and navigation images return null from instagramRootFromElement().
      root.querySelectorAll?.("video,img").forEach((media) => {
        const container = instagramRootFromElement(media);
        if (!container) return;

        if (
          isImageElement(media) &&
          !Media.imageLooksLikeContent(media, "instagram")
        ) {
          return;
        }

        if (!instagramElementBelongsToMediaScope(media, container)) return;
        this.mount(container);
      });

      this.cleanup();
    },
  };

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  await waitForDom();

  // None of these optional subsystems is allowed to take the whole userscript
  // down. The media UI and bookmark bridge stay alive independently.
  try {
    Toast = configureRodToaster();
  } catch (error) {
    warn("Inicialização do RodToaster falhou", error);
    Toast = createRodToasterAdapter();
  }

  try {
    Ui.ensureRoot();
  } catch (error) {
    warn("Ui.ensureRoot() falhou", error);
  }

  try {
    InstagramAccountHeader.install();
  } catch (error) {
    warn("InstagramAccountHeader.install() falhou", error);
  }

  const scan = (root = document) => {
    try {
      if (IS_TWITTER) TwitterProvider.scan(root);
    } catch (error) {
      warn("TwitterProvider.scan() falhou", error);
    }

    try {
      if (IS_INSTAGRAM) InstagramProvider.scan(root);
    } catch (error) {
      warn("InstagramProvider.scan() falhou", error);
    }
  };

  try {
    BookmarkBridge.install();
  } catch (error) {
    warn("BookmarkBridge.install() falhou", error);
  }

  try {
    InstagramOpenedReel.install();
  } catch (error) {
    warn("InstagramOpenedReel.install() falhou", error);
  }

  scan(document);
  Ui.repositionAll();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!isElement(node)) continue;
        if (node.closest?.("#aio-media-actions-root")) continue;
        scan(node);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  setInterval(() => scan(document), CONFIG.ui.scanInterval);
  setInterval(() => Ui.repositionAll(), CONFIG.ui.positionInterval);

  addEventListener("scroll", () => Ui.repositionAll(), {
    capture: true,
    passive: true,
  });
  addEventListener("resize", () => Ui.repositionAll(), { passive: true });
  window.visualViewport?.addEventListener(
    "scroll",
    () => Ui.repositionAll(),
    { passive: true },
  );
  window.visualViewport?.addEventListener(
    "resize",
    () => Ui.repositionAll(),
    { passive: true },
  );

  const diagnostics = () => ({
    version: VERSION,
    href: location.href,
    content: {
      expandMore: CONFIG.content.expandMore,
      expandAttempts: CONFIG.content.expandAttempts,
      sanitizeBeforeWorker: true,
    },
    provider: IS_TWITTER ? "twitter" : "instagram",
    features: CONFIG.features,
    ui: Ui.diagnostics(),
    instagramAccountHeader: InstagramAccountHeader.diagnostics(),
    twitterCapturedIds: [...TwitterStore.posts.keys()],
    instagramCapturedShortcodes: [...InstagramStore.posts.keys()],
    instagramAutoBookmark: {
      completed: [...InstagramOpenedReel.completed],
      inFlight: [...InstagramOpenedReel.inFlight],
    },
    bookmarkBridge: {
      ...BookmarkBridge.counters,
      inFlight: [...BookmarkBridge.inFlight],
      twitterEnabled: CONFIG.twitter.sendToTelegramOnBookmark,
      instagramEnabled: CONFIG.instagram.sendToTelegramOnBookmark,
    },
    toaster: Toast?.diagnostics?.() || {
      available: false,
    },
  });

  const api = {
    version: VERSION,
    config: CONFIG,
    diagnostics,
    rescan() {
      scan(document);
      Ui.repositionAll();
      return diagnostics();
    },
    telegram: {
      async current() {
        const state = [...Ui.groups.values()]
          .filter((entry) => Media.visibleRect(entry.target))
          .sort(
            (a, b) => Media.visibleScore(b.target) - Media.visibleScore(a.target),
          )[0];
        if (!state) throw new Error("Nenhum post visível encontrado.");
        return Actions.run(ACTION.telegram, state.getContext());
      },
    },
    instagram: {
      bookmark: (context, options) => InstagramBookmark.save(context, options),
      autoBookmarkOpenedReel: () => InstagramOpenedReel.check(),
      capture: InstagramStore,
      bookmarkBridge: BookmarkBridge,
      accountHeader: InstagramAccountHeader,
    },
    twitter: {
      capture: TwitterStore,
      bookmarkBridge: BookmarkBridge,
    },
  };

  try {
    window.__AIO_DOWNLOADER__ = api;
  } catch {}
  try {
    pageWindow.__AIO_DOWNLOADER__ = api;
  } catch {}

  try {
    log("Pronto", diagnostics());
  } catch (error) {
    warn("Diagnóstico final falhou sem interromper o userscript", error);
  }
})().catch((error) => {
  try {
    console.error("[AIO Downloader] Falha fatal", error);
  } catch {}

  const show = () => {
    const host = document.documentElement;
    if (!host) return;

    document.getElementById("aio-downloader-fatal-error")?.remove();

    const node = document.createElement("div");
    node.id = "aio-downloader-fatal-error";
    node.style.cssText = [
      "position:fixed",
      "top:max(12px,env(safe-area-inset-top))",
      "left:12px",
      "right:12px",
      "z-index:2147483647",
      "box-sizing:border-box",
      "max-height:70vh",
      "overflow:auto",
      "padding:14px",
      "border:1px solid rgba(255,255,255,.2)",
      "border-radius:16px",
      "background:rgba(127,29,29,.97)",
      "color:#fff",
      "box-shadow:0 16px 50px rgba(0,0,0,.45)",
      "font:600 13px/1.4 system-ui,-apple-system,sans-serif",
      "white-space:pre-wrap",
      "overflow-wrap:anywhere",
      "pointer-events:auto",
    ].join(";");

    node.textContent =
      "AIO Downloader falhou ao iniciar.\n\n" +
      String(error?.stack || error?.message || error);

    node.onclick = () => node.remove();
    host.appendChild(node);
  };

  if (document.documentElement) show();
  else document.addEventListener("DOMContentLoaded", show, { once: true });
});
