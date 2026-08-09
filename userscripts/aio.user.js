// ==UserScript==
// @name               AIO downloader
// @namespace          https://rod.migos.club/userscripts
// @version            1.53.0
// @description        Universal media downloader + Telegram relay with mixed-carousel selection, X bookmark/repost interception and worker-first HLS transfer.
// @author             @rodkisten
// @license            MIT
//
// @match              *://*/*
// @run-at             document-start
//
// @grant              unsafeWindow
// @grant              GM_xmlhttpRequest
// @grant              GM.xmlHttpRequest
// @grant              GM_openInTab
// @grant              GM.openInTab
//
// @connect            *
// @require            https://rod.migos.club/toaster/dist/toaster.js?v=4.3.2&aio=1.53.0
// ==/UserScript==

(async function AIODownloader() {
  "use strict";

  const VERSION = "1.53.0";
  const PREFIX = `[AIO downloader ${VERSION}]`;
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

  const ACTION = Object.freeze({
    telegram: "telegram",
    download: "download",
  });

  const MEDIA_KIND = Object.freeze({
    photo: "photo",
    video: "video",
    audio: "audio",
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

      // Single posts stay scoped to the current media. Real carousels are
      // resolved as the complete ordered set, including mixed photo/video slides.
      carouselAllMedia: true,
      carouselSelection: true,
      carouselProbeDelayMs: 135,
      carouselProbeMaxSteps: 24,
      carouselPickerMaxHeightRatio: 0.72,
      minViewportIntersection: 0.56,
      siblingVisibleAreaRatio: 0.42,

      bookmarkCollectionId: "",
      bookmarksId: "",
      graphqlUrl: "https://www.instagram.com/api/graphql",
      graphqlDocId: "27365486596441074",
      appId: "936619743392459",
    }),

    twitter: Object.freeze({
      bookmarkAfterTelegram: true,
      sendToTelegramOnBookmark: true,
      sendToTelegramOnRepost: true,
      repostConfirmWindowMs: 2_800,
      promptLikeAfterTelegram: true,
      promptLikeDurationMs: 3_000,
    }),

    providers: Object.freeze({
      enabled: true,
      genericMedia: true,
      directMedia: true,
      scanInterval: 900,
      playerScanInterval: 900,
      networkWindowMs: 45_000,
      playerWindowMs: 300_000,
      minVideoWidth: 120,
      minVideoHeight: 80,
    }),

    ui: Object.freeze({
      scanInterval: 700,
      positionInterval: 260,
      padding: 10,
      minimumVisibleWidth: 50,
      minimumVisibleHeight: 50,
      dragThreshold: 7,
      dragStoragePrefix: "__aio_media_actions_drag__:v7",
      profileHeader: Object.freeze({
        enabled: true,
        refreshInterval: 1_800,
        avatarSize: 25,
        topOffset: 8,
      }),
      button: Object.freeze({
        size: 36,
        iconSize: 19,
        carouselLiftMin: 52,
        carouselLiftMax: 86,
      }),
    }),

    historyKey: "__aio_media_action_history__:v5",

    // Stores compact media fingerprints + action metadata in this site's
    // localStorage. The media bytes themselves are never stored here.
    mediaUsageKey: "__aio_media_usage_history__:v1",
    mediaUsageMaxEntries: 4000,

    hlsBundle:
      "https://gist.githubusercontent.com/rodkisten/1c69b953b51c7dac50ee3eb5c22050b6/raw/9f5b33d36ca50acea12221b258363c6722b606e6/hls-bundle.js?01",
  });

  const TELEGRAM_CHANNEL_ROUTES = Object.freeze([
    {
      sites: ["twitter", "x.com", "twitter.com"],
      channels: ["-621561106", "-324185513"],
    },
    {
      sites: ["instagram", "instagram.com", "youtube", "youtube.com", "youtu.be"],
      channels: ["-324185513"],
    },
    {
      sites: ["xvideos", "pornhub", "gayporntube", "justthegays.com", "xhamster.com", "pornhub.com"],
      channels: ["-621561106"],
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


  function isBlobLike(value) {
    if (!value || typeof value !== "object") return false;
    if (typeof Blob !== "undefined" && value instanceof Blob) return true;
    const tag = (() => {
      try { return Object.prototype.toString.call(value); } catch { return ""; }
    })();
    return (
      tag === "[object Blob]" ||
      (
        Number.isFinite(Number(value.size)) &&
        typeof value.type === "string" &&
        typeof value.arrayBuffer === "function"
      )
    );
  }

  async function coerceLocalBlob(value, fallbackType = "application/octet-stream") {
    if (!isBlobLike(value)) {
      throw new TypeError("Valor preparado não é um Blob utilizável.");
    }

    try {
      if (typeof Blob !== "undefined" && value instanceof Blob) return value;
    } catch {}

    const buffer = await value.arrayBuffer();
    return new Blob([buffer], {
      type: String(value.type || fallbackType || "application/octet-stream"),
    });
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
        canSelectImages: false,
        loading() { return noopTask; },
        success() { return null; },
        warning() { return null; },
        error() { return null; },
        info() { return null; },
        debug() { return null; },
        async confirm() { return false; },
        async selectImages() { return null; },
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
    const hasSelectImages = typeof raw.selectImages === "function";

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
        selectImages: typeof raw.selectImages,
      },
    });

    return Object.freeze({
      raw,
      source: resolved.source,
      version: raw.version || null,
      available: true,
      canConfirm: hasConfirm,
      canSelectImages: hasSelectImages,

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

      async selectImages(payload) {
        if (!hasSelectImages) return null;
        try {
          return await raw.selectImages(payload);
        } catch (error) {
          warn("RodToaster.selectImages() falhou; usando seletor inline.", error);
          throw error;
        }
      },

      diagnostics() {
        return {
          available: true,
          source: resolved.source,
          version: raw.version || null,
          canConfirm: hasConfirm,
          canSelectImages: hasSelectImages,
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

    isAudioUrl(url) {
      return /\.(?:mp3|m4a|aac|ogg|oga|opus|wav|flac)(?:$|[?#])/i.test(String(url || ""));
    },

    isVideoUrl(url) {
      const value = String(url || "");
      return this.isMp4(value) || this.isHls(value) || this.isDash(value) ||
        /\.(?:webm|mov|m4v|mkv|ts)(?:$|[?#])/i.test(value) ||
        /googlevideo\.com\/videoplayback|video\.twimg\.com|vimeocdn\.com|akamaized\.net|tiktokcdn|douyinvod|fbcdn\.net|cdninstagram\.com/i.test(value) ||
        /[?&](?:mime|type)=video(?:%2F|\/)/i.test(value);
    },

    isLikelyMediaUrl(url) {
      const value = String(url || "");
      if (!/^(?:https?:|blob:|data:)/i.test(value)) return false;
      if (this.isVideoUrl(value) || this.isAudioUrl(value)) return true;
      return /\/(?:videoplayback|manifest|playlist)(?:[/?#]|$)/i.test(value) ||
        /[?&](?:mime|type)=(?:video|audio)(?:%2F|\/)/i.test(value);
    },

    kindFromUrl(url, fallback = MEDIA_KIND.video) {
      if (this.isAudioUrl(url)) return MEDIA_KIND.audio;
      if (this.isVideoUrl(url)) return MEDIA_KIND.video;
      return fallback;
    },

    mediaCandidateScore(url, kind = MEDIA_KIND.video) {
      const value = String(url || "");
      let score = 0;
      if (/^https?:/i.test(value)) score += 5_000;
      if (this.isMp4(value)) score += 100_000;
      else if (this.isHls(value)) score += 88_000;
      else if (this.isAudioUrl(value)) score += kind === MEDIA_KIND.audio ? 95_000 : 30_000;
      else if (/\.(?:webm|mov|m4v)(?:$|[?#])/i.test(value)) score += 84_000;
      else if (this.isDash(value)) score += 70_000;
      if (/googlevideo\.com\/videoplayback/i.test(value)) score += 66_000;
      if (/[?&](?:mime|type)=video%2Fmp4/i.test(value)) score += 30_000;
      if (/[?&](?:mime|type)=audio%2F/i.test(value)) score += kind === MEDIA_KIND.audio ? 30_000 : -20_000;
      if (/\.(?:m4s|ts)(?:$|[?#])/i.test(value) || /[?&](?:range|sq)=/i.test(value)) score -= 55_000;
      if (/^blob:/i.test(value)) score -= 20_000;
      if (/^data:/i.test(value)) score -= 40_000;
      return score;
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
        const kind = item.kind === MEDIA_KIND.photo
          ? MEDIA_KIND.photo
          : item.kind === MEDIA_KIND.audio
            ? MEDIA_KIND.audio
            : MEDIA_KIND.video;
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
          const priority = { [MEDIA_KIND.video]: 0, [MEDIA_KIND.audio]: 1, [MEDIA_KIND.photo]: 2 };
          return Number(priority[a.kind] ?? 9) - Number(priority[b.kind] ?? 9);
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
      if (mime.includes("mpeg")) return fallbackKind === MEDIA_KIND.audio ? "mp3" : "mp4";
      if (mime.includes("aac")) return "aac";
      if (mime.includes("ogg")) return "ogg";
      if (mime.includes("opus")) return "opus";
      if (mime.includes("wav")) return "wav";
      if (mime.includes("flac")) return "flac";
      if (mime.includes("mp4") && fallbackKind === MEDIA_KIND.audio) return "m4a";
      return fallbackKind === MEDIA_KIND.photo ? "jpg" : fallbackKind === MEDIA_KIND.audio ? "m4a" : "mp4";
    },

    extensionFromUrl(url, kind) {
      try {
        const parsed = new URL(String(url), location.href);
        const format = parsed.searchParams.get("format");
        if (/^[a-z0-9]{2,5}$/i.test(String(format || ""))) return format.toLowerCase();
        const extension = parsed.pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1];
        if (extension) return extension.toLowerCase();
      } catch {}
      return kind === MEDIA_KIND.photo ? "jpg" : kind === MEDIA_KIND.audio ? "m4a" : "mp4";
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


  // ---------------------------------------------------------------------------
  // Universal network + player interception. Restored from the pre-social-only
  // AIO architecture, with a broader player surface and bounded caches.
  // ---------------------------------------------------------------------------

  const GlobalMediaCapture = (() => {
    const records = new Map();
    let installed = false;

    function remember(url, source = "network") {
      const value = String(url || "").replace(/\\u0026/g, "&").replace(/\\\//g, "/");
      if (!Media.isLikelyMediaUrl(value)) return;
      records.set(value, { url: value, source, at: performance.now() });
      if (records.size > 900) {
        const oldest = [...records.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 150);
        oldest.forEach(([key]) => records.delete(key));
      }
    }

    function inspectValue(value, source = "network", depth = 0, seen = new WeakSet()) {
      if (value == null || depth > 5) return;
      if (typeof value === "string") {
        if (value.length < 4096) {
          try { remember(new URL(value, location.href).href, source); } catch {}
        }
        return;
      }
      if (typeof value !== "object" || seen.has(value)) return;
      seen.add(value);
      const values = Array.isArray(value) ? value.slice(0, 120) : (() => {
        try { return Object.values(value).slice(0, 160); } catch { return []; }
      })();
      values.forEach((child) => inspectValue(child, source, depth + 1, seen));
    }

    function inspectText(text, source) {
      const raw = String(text || "");
      if (!raw || raw.length > 2_500_000) return;
      const mediaHint = /m3u8|mpd|mp4|webm|videoplayback|googlevideo|video_url|playAddr|play_addr|downloadAddr|audio_url|manifest/i;
      if (!mediaHint.test(raw)) return;
      try {
        const parsed = JSON.parse(raw);
        inspectValue(parsed, source);
        return;
      } catch {}
      const regex = /https?:\/\/[^"'<>\s]+|https?:\\\/\\\/[^"'<>\s]+/gi;
      let match;
      let count = 0;
      while ((match = regex.exec(raw)) && count < 180) {
        remember(match[0], source);
        count += 1;
      }
    }

    function candidates(maxAge = CONFIG.providers.networkWindowMs) {
      const now = performance.now();
      const values = [];
      for (const [key, record] of records) {
        if (now - record.at > maxAge) {
          records.delete(key);
          continue;
        }
        values.push(record);
      }
      return values.sort((a, b) => b.at - a.at).map((record) => record.url);
    }

    function install() {
      if (installed || CONFIG.providers.enabled === false) return;
      installed = true;
      const root = pageWindow;
      const marker = "__aioUniversalMedia150";

      try {
        const originalFetch = root.fetch;
        if (typeof originalFetch === "function" && !originalFetch[marker]) {
          async function aioUniversalFetch(...args) {
            const requestUrl = String(args?.[0]?.url || args?.[0] || "");
            remember(requestUrl, "fetch-request");
            const response = await originalFetch.apply(this, args);
            try {
              remember(response?.url, "fetch-response-url");
              const contentType = String(response?.headers?.get?.("content-type") || "");
              if (/json|text|javascript/i.test(contentType)) {
                response.clone().text().then((body) => inspectText(body, "fetch-response")).catch(() => {});
              }
            } catch {}
            return response;
          }
          Object.defineProperty(aioUniversalFetch, marker, { value: true });
          root.fetch = aioUniversalFetch;
        }
      } catch (error) {
        debug("Universal fetch interception falhou", error);
      }

      try {
        const prototype = root.XMLHttpRequest?.prototype;
        const originalOpen = prototype?.open;
        const originalSend = prototype?.send;
        if (typeof originalOpen === "function" && !originalOpen[marker]) {
          function aioOpen(method, url, ...rest) {
            try { this.__aioMediaRequestUrl150 = String(url || ""); } catch {}
            remember(url, "xhr-request");
            return originalOpen.call(this, method, url, ...rest);
          }
          Object.defineProperty(aioOpen, marker, { value: true });
          prototype.open = aioOpen;
        }
        if (typeof originalSend === "function" && !originalSend[marker]) {
          function aioSend(...args) {
            try {
              this.addEventListener("load", function inspectUniversalXhr() {
                try {
                  remember(this.responseURL || this.__aioMediaRequestUrl150, "xhr-response-url");
                  if (this.responseType === "json") inspectValue(this.response, "xhr-json");
                  else if (this.responseType === "" || this.responseType === "text") inspectText(this.responseText, "xhr-text");
                } catch {}
              }, { once: true });
            } catch {}
            return originalSend.apply(this, args);
          }
          Object.defineProperty(aioSend, marker, { value: true });
          prototype.send = aioSend;
        }
      } catch (error) {
        debug("Universal XHR interception falhou", error);
      }
    }

    return Object.freeze({ install, remember, inspectValue, candidates, diagnostics: () => ({ installed, records: records.size }) });
  })();

  class PlayerInterceptorService {
    targetRecords = new WeakMap();
    globalRecords = new Map();
    installed = false;

    remember(url, player, target = null) {
      if (!Media.isLikelyMediaUrl(url)) return;
      const value = String(url);
      const record = { url: value, player: String(player || "player"), at: performance.now() };
      this.globalRecords.set(`${record.player}|${value}`, record);
      GlobalMediaCapture.remember(value, `player:${record.player}`);
      if (isMediaElement(target)) {
        const bucket = this.targetRecords.get(target) || new Map();
        bucket.set(`${record.player}|${value}`, record);
        this.targetRecords.set(target, bucket);
      }
    }

    collect(value, depth = 0, seen = new WeakSet()) {
      if (value == null || depth > 5) return [];
      if (typeof value === "string") {
        try {
          const url = new URL(value, location.href).href;
          return Media.isLikelyMediaUrl(url) ? [url] : [];
        } catch { return []; }
      }
      if (typeof value !== "object" && typeof value !== "function") return [];
      if (typeof value === "object" && seen.has(value)) return [];
      if (typeof value === "object") seen.add(value);
      if (isMediaElement(value)) return Media.ownVideoUrls(value);
      const output = [];
      const values = Array.isArray(value) ? value.slice(0, 120) : (() => {
        try { return Object.values(value).slice(0, 140); } catch { return []; }
      })();
      values.forEach((child) => output.push(...this.collect(child, depth + 1, seen)));
      return output;
    }

    media(instance) {
      if (!instance || (typeof instance !== "object" && typeof instance !== "function")) return null;
      for (const value of [
        instance.media, instance.video, instance.audio, instance.element,
        instance.mediaElement, instance.videoElement, instance.audioElement,
        instance.plyr?.media, instance.player?.media, instance.provider?.media,
        instance.el?.(), instance.getMediaElement?.(),
      ]) {
        if (isMediaElement(value)) return value;
        if (isElement(value)) {
          const media = value.querySelector?.("video,audio");
          if (isMediaElement(media)) return media;
        }
      }
      return null;
    }

    inspect(player, instance) {
      if (!instance || (typeof instance !== "object" && typeof instance !== "function")) return;
      const target = this.media(instance);
      for (const key of [
        "source", "sources", "src", "currentSrc", "playlist", "options", "config",
        "currentItem", "media", "video", "audio", "provider", "state", "hls", "dash",
        "manifest", "streamingData", "tech_", "cache_",
      ]) {
        try { this.collect(instance[key]).forEach((url) => this.remember(url, `${player}.${key}`, target)); } catch {}
      }
      for (const methodName of [
        "load", "loadSource", "attachSource", "setSource", "setSrc", "src", "attachMedia",
        "setMedia", "setPlaylist", "playlist", "setup", "configure", "open", "loadVideo",
      ]) {
        let original;
        try { original = instance[methodName]; } catch { continue; }
        if (typeof original !== "function" || original.__aioPlayerSource150) continue;
        const interceptor = this;
        function wrapped(...args) {
          try { interceptor.collect(args).forEach((url) => interceptor.remember(url, `${player}.${methodName}()`, interceptor.media(this) || target)); } catch {}
          return original.apply(this, args);
        }
        Object.defineProperty(wrapped, "__aioPlayerSource150", { value: true });
        try { instance[methodName] = wrapped; } catch {}
      }
    }

    addCollection(name, value, output) {
      if (!value) return;
      if (Array.isArray(value)) value.forEach((entry) => output.push([name, entry]));
      else if (value instanceof Map) value.forEach((entry) => output.push([name, entry]));
      else if (typeof value === "object") {
        const values = (() => { try { return Object.values(value); } catch { return []; } })();
        if (values.length && values.length < 100) values.forEach((entry) => output.push([name, entry]));
        else output.push([name, value]);
      } else if (typeof value === "function") output.push([name, value]);
    }

    scan() {
      if (CONFIG.providers.enabled === false) return;
      const root = pageWindow;
      const instances = [];
      try { this.addCollection("Video.js", root.videojs?.getAllPlayers?.(), instances); } catch {}
      try { this.addCollection("Video.js", root.videojs?.players, instances); } catch {}
      try { this.addCollection("Plyr", root.Plyr?.instances, instances); } catch {}
      try { this.addCollection("Plyr", root.plyr, instances); } catch {}
      try { this.addCollection("Flowplayer", root.flowplayer?.instances || root.flowplayer?.players || root.flowplayerPlayer, instances); } catch {}
      try { this.addCollection("MediaElement.js", root.mejs?.players || root.mediaelementplayer, instances); } catch {}
      try { if (typeof root.jwplayer === "function") instances.push(["JW Player", root.jwplayer()]); } catch {}

      [
        ["Hls.js", root.hls || root.hlsPlayer || root.hlsInstance],
        ["Shaka Player", root.shakaPlayer || root.shaka_player],
        ["Presto Player", root.prestoPlayer || root.presto],
        ["Fluid Player", root.fplayer || root.myFluidPlayer || root.fluidPlayer],
        ["Vidstack", root.vidstackPlayer || root.vidstack],
        ["Clappr", root.clapprPlayer || root.clappr],
        ["Bitmovin", root.bitmovinPlayer || root.bitmovin],
        ["Dash.js", root.dashPlayer || root.dashjsPlayer || root.dashjs],
        ["Artplayer", root.artplayer || root.artPlayer],
        ["DPlayer", root.dp || root.dplayer || root.DPlayerInstance],
        ["xgplayer", root.xgplayer || root.playerInstance],
        ["Brightcove", root.bcPlayer || root.brightcovePlayer],
        ["THEOplayer", root.theoplayer || root.THEOplayerInstance],
        ["Kaltura", root.kalturaPlayer || root.kdp],
        ["RxPlayer", root.rxPlayer || root.rxplayer],
        ["Generic player", root.player],
        ["Generic videoPlayer", root.videoPlayer],
        ["Generic mediaPlayer", root.mediaPlayer],
      ].forEach((entry) => instances.push(entry));

      instances.forEach(([name, instance]) => {
        try { this.inspect(name, instance); } catch {}
      });

      document.querySelectorAll?.("video,audio").forEach((media) => {
        Media.ownVideoUrls(media).forEach((url) => this.remember(url, "DOM", media));
      });

      const minimum = performance.now() - CONFIG.providers.playerWindowMs;
      for (const [key, record] of this.globalRecords) {
        if (record.at < minimum) this.globalRecords.delete(key);
      }
    }

    targetCandidates(target) {
      this.scan();
      const now = performance.now();
      return [...new Set(
        [...(this.targetRecords.get(target)?.values() || [])]
          .filter((record) => now - record.at <= CONFIG.providers.playerWindowMs)
          .sort((a, b) => b.at - a.at)
          .map((record) => record.url),
      )];
    }

    candidates(target) {
      this.scan();
      const now = performance.now();
      const exact = [...(this.targetRecords.get(target)?.values() || [])]
        .filter((record) => now - record.at <= CONFIG.providers.playerWindowMs);
      const global = [...this.globalRecords.values()]
        .filter((record) => now - record.at <= Math.min(CONFIG.providers.playerWindowMs, 45_000));
      return [...new Set([...exact, ...global].sort((a, b) => b.at - a.at).map((record) => record.url))];
    }

    install() {
      if (this.installed || CONFIG.providers.enabled === false) return;
      this.installed = true;
      this.scan();
      setInterval(() => this.scan(), Math.max(500, CONFIG.providers.playerScanInterval));
    }

    diagnostics() {
      return { installed: this.installed, globalRecords: this.globalRecords.size };
    }
  }

  const PlayerInterceptor = new PlayerInterceptorService();

  const ProviderSourceResolvers = Object.freeze({
    youtube() {
      const responses = [];
      try { if (pageWindow.ytInitialPlayerResponse) responses.push(pageWindow.ytInitialPlayerResponse); } catch {}
      try { if (window.ytInitialPlayerResponse) responses.push(window.ytInitialPlayerResponse); } catch {}
      try {
        const raw = pageWindow.ytplayer?.config?.args?.player_response;
        if (raw) responses.push(typeof raw === "string" ? JSON.parse(raw) : raw);
      } catch {}
      const urls = [];
      for (const response of responses) {
        const streamingData = response?.streamingData;
        if (!streamingData) continue;
        for (const format of [...(streamingData.formats || []), ...(streamingData.adaptiveFormats || [])]) {
          if (format?.url) urls.push(format.url);
        }
        if (streamingData.hlsManifestUrl) urls.push(streamingData.hlsManifestUrl);
        if (streamingData.dashManifestUrl) urls.push(streamingData.dashManifestUrl);
      }
      return urls;
    },
  });

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
      const marker = "__aioTwitterCapture153";

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
    carouselPosts = new Map();
    carouselLengths = new Map();
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

    ensureCarousel(shortcode) {
      const key = String(shortcode || "");
      let record = this.carouselPosts.get(key);
      if (!record) {
        record = new Map();
        this.carouselPosts.set(key, record);
      }
      return record;
    }

    rememberCarouselItem(shortcode, index, item, total = 0) {
      const key = String(shortcode || "");
      const order = Number(index);
      if (!key || !Number.isInteger(order) || order < 0 || !item?.url) return;

      const record = this.ensureCarousel(key);
      const kind = item.kind === MEDIA_KIND.video ? MEDIA_KIND.video : MEDIA_KIND.photo;
      const next = { ...item, kind, order, url: String(item.url), carousel: true };
      const previous = record.get(order);

      const shouldReplace =
        !previous ||
        (kind === MEDIA_KIND.video && previous.kind !== MEDIA_KIND.video) ||
        (kind === previous.kind && Number(next.score || 0) >= Number(previous.score || 0));

      if (shouldReplace) record.set(order, next);

      const count = Math.max(0, Number(total) || 0);
      if (count > 1) {
        this.carouselLengths.set(
          key,
          Math.max(count, Number(this.carouselLengths.get(key) || 0)),
        );
      }
    }

    carouselCaption(value) {
      if (!value || typeof value !== "object") return "";
      return PayloadSanitizer.cleanText(
        value.caption?.text ||
          value.caption_text ||
          value.edge_media_to_caption?.edges?.[0]?.node?.text ||
          value.accessibility_caption ||
          value.accessibilityCaption ||
          "",
        { maxLength: 4_000 },
      );
    }

    extractCarouselItem(value, index, depth = 0) {
      if (!value || typeof value !== "object" || depth > 8) return null;
      const node = value?.node || value;
      if (!node || typeof node !== "object") return null;

      const mediaType = Number(node.media_type || node.mediaType || 0);
      const productType = String(node.product_type || node.productType || "").toLowerCase();
      const bestImage = this.bestImageCandidate(node);
      const previewUrl =
        bestImage?.url ||
        node.display_url ||
        node.displayUrl ||
        node.image_url ||
        node.imageUrl ||
        node.thumbnail_url ||
        "";
      const caption = this.carouselCaption(node);

      const directVideo =
        node.video_url ||
        node.videoUrl ||
        node.video_versions?.[0]?.url ||
        node.video_versions2?.[0]?.url ||
        node.video_candidates?.[0]?.url ||
        "";
      const bestVideo = this.bestVideoCandidate(node);
      const videoSignal =
        mediaType === 2 ||
        node.is_video === true ||
        node.isVideo === true ||
        productType === "clips" ||
        Boolean(node.has_audio != null && (bestVideo?.url || directVideo)) ||
        Boolean(bestVideo?.url || directVideo);

      if (videoSignal) {
        const url = bestVideo?.url || directVideo;
        if (url) {
          return {
            kind: MEDIA_KIND.video,
            url,
            previewUrl,
            caption,
            order: Number(index),
            score:
              Number(bestVideo?.width || node.original_width || node.width || 0) *
              Number(bestVideo?.height || node.original_height || node.height || 0),
          };
        }
      }

      if (previewUrl) {
        return {
          kind: MEDIA_KIND.photo,
          url: previewUrl,
          previewUrl,
          caption,
          order: Number(index),
          score:
            Number(bestImage?.width || node.original_width || node.width || 0) *
            Number(bestImage?.height || node.original_height || node.height || 0),
        };
      }

      for (const child of [node.media, node.item, node.media_or_ad, node.node]) {
        if (child && child !== node && typeof child === "object") {
          const nested = this.extractCarouselItem(child, index, depth + 1);
          if (nested) {
            if (!nested.caption && caption) nested.caption = caption;
            return nested;
          }
        }
      }

      return null;
    }

    carouselInfo(shortcode) {
      const key = String(shortcode || "");
      const expected = Math.max(0, Number(this.carouselLengths.get(key) || 0));
      const explicit = new Map(this.carouselPosts.get(key) || []);

      if (expected > 1) {
        for (const item of this.items(key)) {
          const order = Number(item?.order);
          if (!Number.isInteger(order) || order < 0 || order >= expected) continue;
          const previous = explicit.get(order);
          const prefer =
            !previous ||
            (item.kind === MEDIA_KIND.video && previous.kind !== MEDIA_KIND.video) ||
            (item.kind === previous.kind && Number(item.score || 0) > Number(previous.score || 0));
          if (prefer) explicit.set(order, { ...item, order, carousel: true });
        }
      }

      const items = [...explicit.values()]
        .filter((item) => item?.url)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

      return {
        isCarousel: expected > 1 || items.length > 1,
        expected,
        complete: expected > 1 ? items.length >= expected : items.length > 1,
        items,
      };
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
      if (Array.isArray(carousel) && shortcode && carousel.length > 1) {
        this.carouselLengths.set(
          shortcode,
          Math.max(carousel.length, Number(this.carouselLengths.get(shortcode) || 0)),
        );

        carousel.forEach((child, index) => {
          const node = child?.node || child;
          const carouselItem = this.extractCarouselItem(node, index);
          if (carouselItem) {
            this.rememberCarouselItem(shortcode, index, carouselItem, carousel.length);
          }
          this.ingest(node, shortcode, index, depth + 1, seen);
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
      const marker = "__aioInstagramCapture153";

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

  // ---------------------------------------------------------------------------
  // Persistent per-media usage history
  // ---------------------------------------------------------------------------

  const MediaUsage = (() => {
    const records = new Map();

    try {
      const stored = JSON.parse(localStorage.getItem(CONFIG.mediaUsageKey) || "[]");
      if (Array.isArray(stored)) {
        for (const entry of stored) {
          if (entry?.key) records.set(String(entry.key), entry);
        }
      }
    } catch {}

    const ephemeralQueryName = /^(?:utm_|igsh|igshid|ref_|token|access_token|auth|authorization|expire|expires|expiry|signature|sig|policy|key-pair-id|x-amz-|x-goog-|x-oss-|x-cdn-|__gda__|oh|oe|hmac|jwt)/i;

    function hash(value) {
      const text = String(value || "");
      let h1 = 0x811c9dc5;
      let h2 = 0x9e3779b9;
      for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index);
        h1 ^= code;
        h1 = Math.imul(h1, 0x01000193);
        h2 ^= code + ((h2 << 6) >>> 0) + (h2 >>> 2);
        h2 = Math.imul(h2, 0x85ebca6b);
      }
      return `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}${text.length.toString(36)}`;
    }

    function canonicalHttpUrl(value) {
      try {
        const url = new URL(String(value), location.href);
        url.hash = "";
        const host = url.hostname.toLowerCase();

        // Instagram/Facebook/Twitter CDN paths are durable media identities;
        // query strings are usually signatures, image sizing or expiry data.
        if (/(?:^|\.)(?:cdninstagram\.com|fbcdn\.net|twimg\.com)$/i.test(host)) {
          return `${url.protocol}//${url.host}${url.pathname}`;
        }

        for (const name of [...url.searchParams.keys()]) {
          if (ephemeralQueryName.test(name)) url.searchParams.delete(name);
        }

        // googlevideo uses one generic path, so keep stable content identifiers.
        if (/(?:^|\.)googlevideo\.com$/i.test(host)) {
          const stable = new URLSearchParams();
          for (const name of ["id", "itag", "mime", "clen", "dur", "source"]) {
            const stableValue = url.searchParams.get(name);
            if (stableValue) stable.set(name, stableValue);
          }
          url.search = stable.toString() ? `?${stable}` : "";
        } else if (!url.searchParams.size) {
          url.search = "";
        }

        return url.href;
      } catch {
        return String(value || "").trim();
      }
    }

    function sourceIdentity(context, item, index = 0) {
      const kind = item?.kind === MEDIA_KIND.photo
        ? MEDIA_KIND.photo
        : item?.kind === MEDIA_KIND.audio
          ? MEDIA_KIND.audio
          : MEDIA_KIND.video;
      const raw = String(item?.url || "").trim();

      if (/^https?:/i.test(raw)) return `${kind}|${canonicalHttpUrl(raw)}`;

      // blob:/data: URLs are ephemeral. Tie them to the page/post + media slot.
      return `${kind}|${History.identity(context)}|slot:${Number(index) || 0}|${String(item?.source || "runtime")}`;
    }

    function key(context, item, index, action) {
      return `${String(action)}|${hash(sourceIdentity(context, item, index))}`;
    }

    function save() {
      try {
        const limit = Math.max(100, Number(CONFIG.mediaUsageMaxEntries) || 4000);
        const values = [...records.values()]
          .sort((a, b) => Number(b.at || 0) - Number(a.at || 0))
          .slice(0, limit);
        records.clear();
        for (const value of values) records.set(value.key, value);
        localStorage.setItem(CONFIG.mediaUsageKey, JSON.stringify(values));
      } catch {}
    }

    function get(context, item, index, action) {
      return records.get(key(context, item, index, action)) || null;
    }

    function mark(context, item, index, action, metadata = {}) {
      const recordKey = key(context, item, index, action);
      const now = Date.now();
      const previous = records.get(recordKey);
      records.set(recordKey, {
        key: recordKey,
        at: now,
        firstAt: Number(previous?.firstAt || previous?.at || now),
        count: Math.max(0, Number(previous?.count || 0)) + 1,
        action: String(action),
        kind: item?.kind || MEDIA_KIND.video,
        provider: String(context?.providerId || "generic"),
        pageUrl: PayloadSanitizer.cleanUrl(context?.pageUrl || location.href),
        source: truncate(sourceIdentity(context, item, index), 320),
        metadata: PayloadSanitizer.metadata(metadata) || {},
      });
      save();
      return records.get(recordKey);
    }

    function markMany(context, items, action, metadata = {}) {
      const values = Media.dedupeItems(items);
      values.forEach((item, index) => mark(context, item, index, action, metadata));
      return values.length;
    }

    function status(context, items, action) {
      const values = Media.dedupeItems(items);
      const matches = values.map((item, index) => get(context, item, index, action));
      const used = matches.filter(Boolean);
      return {
        total: values.length,
        usedCount: used.length,
        anyUsed: used.length > 0,
        allUsed: values.length > 0 && used.length === values.length,
        latestAt: used.reduce((latest, entry) => Math.max(latest, Number(entry?.at || 0)), 0),
        records: matches,
      };
    }

    function diagnostics() {
      return {
        key: CONFIG.mediaUsageKey,
        records: records.size,
        latestAt: [...records.values()].reduce(
          (latest, entry) => Math.max(latest, Number(entry?.at || 0)),
          0,
        ),
      };
    }

    return Object.freeze({ get, mark, markMany, status, diagnostics });
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

    itemCaption(context, item, index = 0) {
      const cleanContext = PayloadSanitizer.context(context);
      const escape = (value) =>
        String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      const itemText = PayloadSanitizer.cleanText(item?.caption || "", {
        maxLength: 4_000,
      });

      if (itemText) {
        return [
          index === 0 ? `<b>${escape(cleanContext.title || cleanContext.providerId)}</b>` : "",
          escape(itemText),
          index === 0
            ? `<a href="${escape(cleanContext.pageUrl)}">${escape(cleanContext.hostname || location.hostname)}</a>`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n");
      }

      return index === 0 ? this.caption(cleanContext) : "";
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
            caption: this.itemCaption(cleanContext, item, index),
            parseMode: "HTML",
            metadata: {
              carouselIndex: Number.isInteger(Number(item?.order))
                ? Number(item.order)
                : index,
              selectionIndex: index,
              carouselTotal: total,
              carousel: true,
              mediaKind: item.kind,
              sourceCaption: PayloadSanitizer.cleanText(item?.caption || "", {
                maxLength: 4_000,
              }),
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
      const isAudio = item.kind === MEDIA_KIND.audio;
      const mediaUrl = String(item.url);
      const caption = this.itemCaption(cleanContext, item, index);
      const contentType =
        prepared?.contentType ||
        (isPhoto
          ? "image/jpeg"
          : isAudio
            ? (Media.isAudioUrl(mediaUrl) ? "audio/mpeg" : "application/octet-stream")
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
        mediaType: isPhoto ? "photo" : isAudio ? "audio" : "video",
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
          carouselIndex: Number.isInteger(Number(item?.order))
            ? Number(item.order)
            : index,
          selectionIndex: index,
          carouselTotal: total,
          carousel: total > 1,
          mediaKind: item.kind,
          sourceCaption: PayloadSanitizer.cleanText(item?.caption || "", {
            maxLength: 4_000,
          }),
        },
      };

      if (isPhoto) payload.photoUrl = mediaUrl;
      else if (isAudio) payload.audioUrl = mediaUrl;
      else payload.videoUrl = mediaUrl;

      return payload;
    },

    async request(payload, prepared = null) {
      const headers = {
        Authorization: `Bearer ${CONFIG.telegram.token}`,
      };

      let data;

      if (prepared?.blob && isBlobLike(prepared.blob)) {
        const localBlob = await coerceLocalBlob(
          prepared.blob,
          prepared.contentType || payload.metadata?.contentType || "application/octet-stream",
        );
        const form = new FormData();
        form.append("payload", JSON.stringify(payload));
        form.append(
          "file",
          localBlob,
          prepared.filename || payload.metadata?.filename || "media.bin",
        );
        data = form;
      } else {
        headers["Content-Type"] = "application/json";
        data = JSON.stringify(payload);
      }

      return new Promise((resolve, reject) => {
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

  function twitterImageLooksLikeMedia(image) {
    if (!isImageElement(image) || !image.isConnected) return false;
    if (image.closest?.('[data-testid="videoPlayer"],[data-testid="videoComponent"]')) {
      return false;
    }

    const url = Media.imageUrlFromElement(image);
    if (!url) return false;

    if (
      /pbs\.twimg\.com\/media\//i.test(url) ||
      image.closest?.('[data-testid="tweetPhoto"]')
    ) {
      const rect = image.getBoundingClientRect?.();
      if (!rect) return true;
      return Math.max(rect.width, rect.height) >= 80;
    }

    return Media.imageLooksLikeContent(image, "twitter");
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
    for (const image of root?.querySelectorAll?.(
      '[data-testid="tweetPhoto"] img,img[src*="pbs.twimg.com/media/"],img',
    ) || []) {
      if (!twitterImageLooksLikeMedia(image)) continue;
      const url = Media.imageUrlFromElement(image);
      if (!url) continue;
      items.push({
        kind: MEDIA_KIND.photo,
        url: Media.normalizeTwitterPhoto(url),
        order: order++,
        score:
          Number(image.naturalWidth || image.getBoundingClientRect?.().width || 0) *
          Number(image.naturalHeight || image.getBoundingClientRect?.().height || 0),
      });
    }

    return Media.sortItems(items);
  }

  function twitterMediaPresence(root) {
    if (!isElement(root)) {
      return {
        photos: [],
        videos: [],
        videoContainers: [],
        hasPhoto: false,
        hasVideo: false,
        hasMedia: false,
      };
    }

    const photos = [
      ...(root.querySelectorAll?.(
        '[data-testid="tweetPhoto"] img,img[src*="pbs.twimg.com/media/"],img',
      ) || []),
    ].filter(twitterImageLooksLikeMedia);

    const videos = [
      ...(root.querySelectorAll?.("video") || []),
    ].filter((video) => isVideoElement(video) && video.isConnected);

    const videoContainers = [
      ...(root.querySelectorAll?.(
        '[data-testid="videoPlayer"],[data-testid="videoComponent"]',
      ) || []),
    ].filter((element) => isElement(element) && element.isConnected);

    const hasPhoto = photos.length > 0;
    const hasVideo = videos.length > 0 || videoContainers.length > 0;

    return {
      photos,
      videos,
      videoContainers,
      hasPhoto,
      hasVideo,
      hasMedia: hasPhoto || hasVideo,
    };
  }

  function twitterTarget(root) {
    const presence = twitterMediaPresence(root);
    const candidates = [
      ...presence.videos,
      ...presence.videoContainers,
      ...presence.photos,
    ];

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
    if (element.closest?.("#aio-media-actions-root,.aio-carousel-picker")) return false;
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

  function instagramCarouselControlLabel(element) {
    if (!isElement(element)) return "";
    const values = [
      element.getAttribute?.("aria-label"),
      element.getAttribute?.("title"),
      element.textContent,
    ];
    for (const child of element.querySelectorAll?.("[aria-label],[title],title") || []) {
      values.push(child.getAttribute?.("aria-label"));
      values.push(child.getAttribute?.("title"));
      if (String(child.tagName || "").toUpperCase() === "TITLE") values.push(child.textContent);
    }
    return normalizeText(values.filter(Boolean).join(" ")).toLowerCase();
  }

  function instagramCarouselControls(root) {
    const result = { previous: null, next: null };
    if (!isElement(root)) return result;

    const candidates = [
      ...(root.querySelectorAll?.(
        'button,[role="button"],[aria-label],[title]',
      ) || []),
    ];
    const candidateSet = new Set(candidates);

    for (const svg of root.querySelectorAll?.("svg") || []) {
      const owner =
        svg.closest?.('button,[role="button"],[aria-label],[title]') ||
        svg.parentElement;
      if (isElement(owner) && !candidateSet.has(owner)) {
        candidateSet.add(owner);
        candidates.push(owner);
      }
    }

    for (const element of candidates) {
      if (!isElement(element) || element.closest?.("header,nav,footer")) continue;
      const label = instagramCarouselControlLabel(element);
      if (!label) continue;

      if (
        !result.previous &&
        /(?:^|\b)(?:previous|prev|back|anterior|voltar|zurück|précédent|precedente)(?:\b|$)/i.test(label)
      ) {
        result.previous = element;
      }

      if (
        !result.next &&
        /(?:^|\b)(?:next|próximo|proximo|seguinte|weiter|suivant|successivo)(?:\b|$)/i.test(label)
      ) {
        result.next = element;
      }
    }

    if (!result.previous || !result.next) {
      const target = instagramTarget(root);
      const targetRect = target?.getBoundingClientRect?.();
      if (targetRect && targetRect.width > 120 && targetRect.height > 120) {
        const centerY = targetRect.top + targetRect.height / 2;
        const maxVerticalDelta = targetRect.height * 0.30;

        for (const element of candidates) {
          if (!isElement(element) || !element.isConnected) continue;
          if (!element.querySelector?.("svg") && String(element.tagName || "").toUpperCase() !== "BUTTON") {
            continue;
          }

          const rect = element.getBoundingClientRect?.();
          if (!rect || rect.width < 18 || rect.height < 18 || rect.width > 88 || rect.height > 88) continue;

          const elementCenterY = rect.top + rect.height / 2;
          if (Math.abs(elementCenterY - centerY) > maxVerticalDelta) continue;

          const elementCenterX = rect.left + rect.width / 2;
          const leftEdge = targetRect.left + targetRect.width * 0.22;
          const rightEdge = targetRect.right - targetRect.width * 0.22;

          if (!result.previous && elementCenterX <= leftEdge) result.previous = element;
          if (!result.next && elementCenterX >= rightEdge) result.next = element;
        }
      }
    }

    return result;
  }

  function instagramCarouselControlUsable(element) {
    if (!isElement(element) || !element.isConnected) return false;
    if (element.hasAttribute?.("disabled") || element.getAttribute?.("aria-disabled") === "true") return false;
    const rect = element.getBoundingClientRect?.();
    if (!rect || rect.width < 8 || rect.height < 8) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0.02;
  }

  function instagramCarouselDomInfo(root) {
    const controls = instagramCarouselControls(root);
    let current = 0;
    let total = 0;

    for (const element of root?.querySelectorAll?.('[aria-label],[title],span,div') || []) {
      const text = normalizeText(
        element.getAttribute?.("aria-label") ||
          element.getAttribute?.("title") ||
          element.textContent ||
          "",
      );
      const match = text.match(
        /(?:slide\s*)?(\d{1,2})\s*(?:of|\/|de)\s*(\d{1,2})(?:\s*slides?)?/i,
      );
      if (!match) continue;
      const a = Number(match[1]);
      const b = Number(match[2]);
      if (b > 1 && b <= 50 && a >= 1 && a <= b) {
        current = a;
        total = b;
        break;
      }
    }

    const routeMode = instagramRouteMode();
    const routeCanCarousel = routeMode !== "story" && routeMode !== "reels";
    const isCarousel =
      routeCanCarousel &&
      (
        total > 1 ||
        instagramCarouselControlUsable(controls.previous) ||
        instagramCarouselControlUsable(controls.next)
      );

    return { isCarousel, current, total, ...controls };
  }

  function instagramLogicalCarouselItems(items, expected = 0) {
    const groups = new Map();
    const limit = Math.max(0, Number(expected) || 0);

    for (const item of Media.dedupeItems(items || [])) {
      const order = Number(item?.order);
      if (!Number.isInteger(order) || order < 0) continue;
      if (limit > 1 && order >= limit) continue;

      const previous = groups.get(order);
      const prefer =
        !previous ||
        (item.kind === MEDIA_KIND.video && previous.kind !== MEDIA_KIND.video) ||
        (
          item.kind === previous.kind &&
          (
            Number(item.score || 0) > Number(previous.score || 0) ||
            (!previous.caption && item.caption)
          )
        );

      if (prefer) groups.set(order, { ...item, order, carousel: true });
    }

    return [...groups.values()].sort(
      (a, b) => Number(a.order || 0) - Number(b.order || 0),
    );
  }

  function instagramCurrentSlideItem(root, shortcode = "", order = null) {
    const target = instagramTarget(root);
    if (!isElement(target)) return null;
    const numericOrder = Number.isInteger(Number(order)) ? Number(order) : 0;
    const captured = shortcode ? InstagramStore.items(shortcode) : [];
    const capturedCarousel = shortcode
      ? InstagramStore.carouselInfo(shortcode).items
      : [];
    const stored = capturedCarousel.find(
      (item) => Number(item?.order) === numericOrder,
    );

    if (isVideoElement(target)) {
      const item = instagramVideoItemFromElement(target, captured);
      if (!item) return stored?.kind === MEDIA_KIND.video ? stored : null;
      return {
        ...stored,
        ...item,
        previewUrl:
          stored?.previewUrl ||
          target.poster ||
          target.getAttribute?.("poster") ||
          "",
        caption: PayloadSanitizer.cleanText(stored?.caption || "", { maxLength: 4_000 }),
        order: numericOrder,
        carousel: true,
      };
    }

    if (isImageElement(target)) {
      const item = instagramPhotoItemFromElement(target);
      if (!item) return stored?.kind === MEDIA_KIND.photo ? stored : null;
      return {
        ...stored,
        ...item,
        previewUrl: item.url,
        caption: PayloadSanitizer.cleanText(stored?.caption || "", { maxLength: 4_000 }),
        order: numericOrder,
        carousel: true,
      };
    }

    return stored || null;
  }

  function instagramSlideSignature(root) {
    const target = instagramTarget(root);
    if (!isElement(target)) return "none";

    if (isVideoElement(target)) {
      const own =
        Media.ownVideoUrls(target)[0] ||
        target.currentSrc ||
        target.src ||
        target.poster ||
        "";
      return `video:${String(own)}`;
    }

    if (isImageElement(target)) {
      return `photo:${Media.imageUrlFromElement(target) || target.currentSrc || target.src || ""}`;
    }

    return `${String(target.tagName || "node")}:${Media.visibleScore(target)}`;
  }

  async function instagramWaitForSlideChange(root, previousSignature, delay) {
    const timeout = Math.max(250, Number(delay || 135) * 7);
    const started = Date.now();

    while (Date.now() - started < timeout) {
      await sleep(Math.min(75, Math.max(30, Number(delay || 135) / 2)));
      InstagramStore.ingestElement(root);
      const next = instagramSlideSignature(root);
      if (next && next !== previousSignature && next !== "none") return next;
    }

    await sleep(Math.max(40, Number(delay || 135)));
    return instagramSlideSignature(root);
  }

  async function instagramClickCarouselControl(root, control, delay) {
    if (!instagramCarouselControlUsable(control)) return false;
    const before = instagramSlideSignature(root);

    try {
      control.click();
    } catch {
      return false;
    }

    const after = await instagramWaitForSlideChange(root, before, delay);
    return Boolean(after && after !== before);
  }

  async function instagramProbeCarousel(root, shortcode, expectedHint = 0) {
    if (!isElement(root)) return [];

    const delay = Math.max(70, Number(CONFIG.instagram.carouselProbeDelayMs) || 135);
    const maxSteps = Math.max(2, Math.min(32, Number(CONFIG.instagram.carouselProbeMaxSteps) || 24));
    const expectedHintNumber = Math.max(0, Number(expectedHint) || 0);

    let originalOffset = 0;
    let currentIndex = 0;
    const collected = new Map();

    const rememberCurrent = (order) => {
      InstagramStore.ingestElement(root);
      const item = instagramCurrentSlideItem(root, shortcode, order);
      if (!item?.url) return false;

      const previous = collected.get(order);
      const prefer =
        !previous ||
        (item.kind === MEDIA_KIND.video && previous.kind !== MEDIA_KIND.video) ||
        (item.kind === previous.kind && Number(item.score || 0) >= Number(previous.score || 0));

      if (prefer) collected.set(order, { ...item, order, carousel: true });

      if (shortcode) {
        InstagramStore.rememberCarouselItem(
          shortcode,
          order,
          item,
          Math.max(expectedHintNumber, instagramCarouselDomInfo(root).total || 0),
        );
      }
      return true;
    };

    try {
      for (let step = 0; step < maxSteps; step += 1) {
        const previous = instagramCarouselControls(root).previous;
        if (!instagramCarouselControlUsable(previous)) break;
        const changed = await instagramClickCarouselControl(root, previous, delay);
        if (!changed) break;
        originalOffset += 1;
      }

      currentIndex = 0;
      rememberCurrent(currentIndex);
      const seenSignatures = new Set([instagramSlideSignature(root)]);

      for (let step = 0; step < maxSteps - 1; step += 1) {
        const info = instagramCarouselDomInfo(root);

        // Traverse until Instagram removes the Next control. Accessibility totals
        // are useful metadata, but they are not trusted as a stopping condition:
        // stale "2 of 2" text is common while React is recycling carousel nodes.
        const next = info.next || instagramCarouselControls(root).next;
        if (!instagramCarouselControlUsable(next)) break;

        const before = instagramSlideSignature(root);
        const changed = await instagramClickCarouselControl(root, next, delay);
        if (!changed) break;

        const signature = instagramSlideSignature(root);
        if (!signature || signature === before || seenSignatures.has(signature)) break;

        seenSignatures.add(signature);
        currentIndex += 1;
        rememberCurrent(currentIndex);
      }
    } finally {
      const restoreSteps = Math.max(0, currentIndex - originalOffset);
      for (let step = 0; step < restoreSteps; step += 1) {
        const previous = instagramCarouselControls(root).previous;
        if (!instagramCarouselControlUsable(previous)) break;
        const changed = await instagramClickCarouselControl(root, previous, Math.min(delay, 100));
        if (!changed) break;
      }
    }

    return [...collected.values()].sort(
      (a, b) => Number(a.order || 0) - Number(b.order || 0),
    );
  }

  async function instagramCarouselItems(root, shortcode, target) {
    const domInfo = instagramCarouselDomInfo(root);
    let storeInfo = shortcode
      ? InstagramStore.carouselInfo(shortcode)
      : { isCarousel: false, expected: 0, complete: false, items: [] };

    const isCarousel = storeInfo.isCarousel || domInfo.isCarousel;
    if (!isCarousel) return null;

    const expected = Math.max(
      Number(storeInfo.expected) || 0,
      Number(domInfo.total) || 0,
    );

    let items = instagramLogicalCarouselItems(storeInfo.items, expected);

    if (
      CONFIG.instagram.carouselAllMedia !== false &&
      (
        instagramCarouselControlUsable(domInfo.previous) ||
        instagramCarouselControlUsable(domInfo.next) ||
        items.length < 2 ||
        (expected > 1 && items.length < expected)
      )
    ) {
      const probed = await instagramProbeCarousel(root, shortcode, expected);
      InstagramStore.ingestElement(root);
      storeInfo = shortcode ? InstagramStore.carouselInfo(shortcode) : storeInfo;

      items = instagramLogicalCarouselItems(
        [...storeInfo.items, ...items, ...probed],
        Math.max(expected, Number(storeInfo.expected) || 0, Number(domInfo.total) || 0),
      );
    }

    if (items.length > 1) return Media.dedupeItems(items);

    const current = instagramViewportItems(
      root,
      instagramTarget(root) || target,
      shortcode ? InstagramStore.items(shortcode) : [],
    );
    return Media.dedupeItems(current);
  }

  function instagramMediaVisibility(element, root) {
    if (!instagramElementBelongsToMediaScope(element, root)) return null;
    if (isImageElement(element) && !Media.imageLooksLikeContent(element, "instagram")) return null;

    const visible = Media.visibleRect(element);
    if (!visible) return null;

    const source = visible.source;
    const sourceArea = Math.max(1, Number(source.width || 0) * Number(source.height || 0));
    const visibleArea = Math.max(0, visible.width * visible.height);
    const intersection = Math.max(0, Math.min(1, visibleArea / sourceArea));

    const viewport = window.visualViewport;
    const viewportLeft = Number(viewport?.offsetLeft || 0);
    const viewportTop = Number(viewport?.offsetTop || 0);
    const viewportWidth = Math.max(1, Number(viewport?.width || innerWidth || 1));
    const viewportHeight = Math.max(1, Number(viewport?.height || innerHeight || 1));
    const viewportCenterX = viewportLeft + viewportWidth / 2;
    const viewportCenterY = viewportTop + viewportHeight / 2;
    const centerX = visible.left + visible.width / 2;
    const centerY = visible.top + visible.height / 2;
    const centerDistance = Math.hypot(
      (centerX - viewportCenterX) / viewportWidth,
      (centerY - viewportCenterY) / viewportHeight,
    );

    let score = visibleArea * (0.65 + intersection * 1.35) - centerDistance * 10_000;
    if (isVideoElement(element) && !element.paused && !element.ended && intersection >= 0.35) {
      score += 2_000_000_000;
    }

    return { element, visible, visibleArea, intersection, centerDistance, score };
  }

  function instagramVisibleMedia(root) {
    const entries = [];
    for (const element of root?.querySelectorAll?.("video,img") || []) {
      const entry = instagramMediaVisibility(element, root);
      if (entry) entries.push(entry);
    }
    return entries.sort((a, b) => b.score - a.score);
  }

  function instagramVideoItemFromElement(video, captured = []) {
    const values = [];
    const add = (url, source, extraScore = 0) => {
      const value = String(url || "").trim();
      if (!value || (!Media.isLikelyMediaUrl(value) && !Media.isBlob(value))) return;
      values.push({
        kind: MEDIA_KIND.video,
        url: value,
        source,
        score: Media.mediaCandidateScore(value, MEDIA_KIND.video) + extraScore,
      });
    };

    Media.ownVideoUrls(video).forEach((url) => add(url, "visible-dom", 80_000));
    PlayerInterceptor.targetCandidates(video).forEach((url) => add(url, "visible-player", 55_000));

    // Captured GraphQL data is only a last-resort enrichment when it is
    // unambiguous. Never select one video out of a captured multi-video post.
    const capturedVideos = Media.dedupeItems(captured).filter(
      (item) => item.kind === MEDIA_KIND.video,
    );
    if (!values.some((item) => Media.isHttp(item.url)) && capturedVideos.length === 1) {
      add(capturedVideos[0].url, "captured-single-video", 30_000);
    }

    const ordered = Media.dedupeItems(values).sort(
      (a, b) => Number(b.score || 0) - Number(a.score || 0),
    );
    const nonBlob = ordered.filter((item) => !Media.isBlob(item.url) && !Media.isData(item.url));
    return (nonBlob.length ? nonBlob : ordered)[0] || null;
  }

  function instagramPhotoItemFromElement(image) {
    const url = Media.imageUrlFromElement(image);
    if (!url) return null;
    return {
      kind: MEDIA_KIND.photo,
      url,
      source: "visible-dom",
      score:
        Number(image.naturalWidth || image.getBoundingClientRect?.().width || 0) *
        Number(image.naturalHeight || image.getBoundingClientRect?.().height || 0),
    };
  }

  function instagramViewportItems(root, target, captured = []) {
    if (!isElement(target)) return [];

    const visibleEntries = instagramVisibleMedia(root);
    const targetEntry =
      visibleEntries.find((entry) => entry.element === target) ||
      instagramMediaVisibility(target, root);
    if (!targetEntry) return [];

    // A visible video is always a single logical action. This is the key guard
    // against a normal Reel/feed video accidentally becoming a 10-item album.
    if (isVideoElement(target)) {
      const item = instagramVideoItemFromElement(target, captured);
      return item ? [item] : [];
    }

    // For a photo/carousel, only include photo nodes that are materially visible
    // in the same current viewport frame. Hidden/offscreen carousel slides and
    // GraphQL siblings are never included.
    const minimumIntersection = Math.max(
      0.15,
      Math.min(1, Number(CONFIG.instagram.minViewportIntersection || 0.56)),
    );
    const minimumAreaRatio = Math.max(
      0.1,
      Math.min(1, Number(CONFIG.instagram.siblingVisibleAreaRatio || 0.42)),
    );

    const targetTop = targetEntry.visible.top;
    const targetBottom = targetEntry.visible.bottom;
    const targetHeight = Math.max(1, targetEntry.visible.height);

    const photoEntries = visibleEntries.filter((entry) => {
      if (!isImageElement(entry.element)) return false;
      if (entry.intersection < minimumIntersection) return false;
      if (entry.visibleArea < targetEntry.visibleArea * minimumAreaRatio) return false;

      const overlap = Math.max(
        0,
        Math.min(targetBottom, entry.visible.bottom) - Math.max(targetTop, entry.visible.top),
      );
      const overlapRatio = overlap / Math.max(1, Math.min(targetHeight, entry.visible.height));
      return overlapRatio >= 0.62;
    });

    const selected = photoEntries.length
      ? photoEntries
      : [{ ...targetEntry, element: target }];

    return Media.dedupeItems(
      selected
        .map((entry) => instagramPhotoItemFromElement(entry.element))
        .filter(Boolean),
    );
  }

  function instagramDomItems(root) {
    const target = instagramTarget(root);
    return instagramViewportItems(root, target, []);
  }

  function instagramTarget(root) {
    return instagramVisibleMedia(root)[0]?.element || null;
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
    const capturedCarousel = shortcode
      ? InstagramStore.carouselInfo(shortcode)
      : { isCarousel: false, expected: 0, complete: false, items: [] };
    const domCarousel = instagramCarouselDomInfo(root);
    const isCarousel = Boolean(capturedCarousel.isCarousel || domCarousel.isCarousel);
    const carouselCount = Math.max(
      Number(capturedCarousel.expected) || 0,
      Number(domCarousel.total) || 0,
      isCarousel ? Number(capturedCarousel.items.length) || 0 : 0,
    );

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
            selectionMode: isCarousel ? "carousel-all" : "viewport-current",
            isCarousel,
            carouselCount,
          }
        : {
            selectionMode: isCarousel ? "carousel-all" : "viewport-current",
            isCarousel,
            carouselCount,
          },

      async refresh() {
        await MoreExpander.expand(root, "instagram", { settle: true });
        InstagramStore.ingestElement(root);
        return instagramContext(root);
      },

      async items(options = {}) {
        const captured = shortcode ? InstagramStore.items(shortcode) : [];
        const currentTarget = instagramTarget(root) || target;

        if (isCarousel && CONFIG.instagram.carouselAllMedia !== false) {
          const info = shortcode
            ? InstagramStore.carouselInfo(shortcode)
            : { isCarousel: false, expected: 0, complete: false, items: [] };

          if (options?.forAction) {
            const carouselItems = await instagramCarouselItems(
              root,
              shortcode,
              currentTarget,
            );
            if (carouselItems?.length > 1) {
              return Media.dedupeItems(carouselItems);
            }
          }

          // Passive refreshes never operate the carousel. They may still use the
          // complete captured set so the icon knows this is a mixed carousel.
          if (info.items.length > 1) {
            return Media.dedupeItems(info.items);
          }
        }

        return Media.dedupeItems(
          instagramViewportItems(root, currentTarget, captured),
        );
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Carousel media selection. RodToaster.selectImages() is preferred when the
  // installed toaster exposes it. Otherwise a compact checkbox grid is rendered
  // visually inside the post. All media starts selected.
  // ---------------------------------------------------------------------------

  const CarouselSelection = (() => {
    let style = null;
    let active = null;

    function ensureStyle() {
      if (style?.isConnected) return;
      style = document.createElement("style");
      style.id = "aio-carousel-picker-style";
      style.textContent = `
        .aio-carousel-picker{
          position:fixed;z-index:2147483647;display:flex;flex-direction:column;
          width:min(430px,calc(100vw - 20px));max-height:min(72vh,680px);
          overflow:hidden;border:1px solid rgba(255,255,255,.20);border-radius:18px;
          background:rgba(10,12,16,.96);color:#fff;box-shadow:0 18px 60px rgba(0,0,0,.48);
          font:500 13px/1.35 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;
          -webkit-font-smoothing:antialiased;isolation:isolate;pointer-events:auto
        }
        .aio-carousel-picker *{box-sizing:border-box}
        .aio-carousel-picker__header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 14px 10px;border-bottom:1px solid rgba(255,255,255,.10)}
        .aio-carousel-picker__title{font-size:15px;font-weight:750;letter-spacing:-.015em}
        .aio-carousel-picker__subtitle{margin-top:3px;color:rgba(255,255,255,.66);font-size:12px}
        .aio-carousel-picker__close{display:grid;place-items:center;width:30px;height:30px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:19px}
        .aio-carousel-picker__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:10px;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
        .aio-carousel-picker__item{position:relative;display:block;min-width:0;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:#15181e;cursor:pointer}
        .aio-carousel-picker__item:has(input:checked){border-color:rgba(255,255,255,.75);box-shadow:inset 0 0 0 1px rgba(255,255,255,.24)}
        .aio-carousel-picker__media{position:relative;aspect-ratio:1/1;overflow:hidden;background:#080a0d}
        .aio-carousel-picker__media img,.aio-carousel-picker__media video{display:block;width:100%;height:100%;object-fit:cover}
        .aio-carousel-picker__placeholder{display:grid;place-items:center;width:100%;height:100%;font-size:26px;color:rgba(255,255,255,.72)}
        .aio-carousel-picker__check{position:absolute;top:7px;right:7px;display:grid;place-items:center;width:23px;height:23px;border:1px solid rgba(255,255,255,.7);border-radius:50%;background:rgba(0,0,0,.55);backdrop-filter:blur(4px)}
        .aio-carousel-picker__check input{position:absolute;opacity:0;pointer-events:none}
        .aio-carousel-picker__check svg{width:14px;height:14px;opacity:.18;transition:opacity 100ms ease}
        .aio-carousel-picker__item:has(input:checked) .aio-carousel-picker__check{background:#fff;color:#05070a}
        .aio-carousel-picker__item:has(input:checked) .aio-carousel-picker__check svg{opacity:1}
        .aio-carousel-picker__badge{position:absolute;left:7px;top:7px;padding:3px 6px;border-radius:999px;background:rgba(0,0,0,.68);color:#fff;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
        .aio-carousel-picker__caption{display:-webkit-box;min-height:34px;padding:7px 8px 8px;overflow:hidden;color:rgba(255,255,255,.72);font-size:10px;-webkit-line-clamp:2;-webkit-box-orient:vertical}
        .aio-carousel-picker__footer{display:grid;grid-template-columns:auto 1fr auto;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.10)}
        .aio-carousel-picker__button{min-height:38px;padding:0 12px;border:1px solid rgba(255,255,255,.15);border-radius:11px;background:rgba(255,255,255,.08);color:#fff;font:700 12px/1 -apple-system,BlinkMacSystemFont,system-ui,sans-serif}
        .aio-carousel-picker__button[data-primary="true"]{background:#fff;color:#07090c;border-color:#fff}
        .aio-carousel-picker__button:disabled{opacity:.42}
        @media(max-width:380px){.aio-carousel-picker__grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      `;
      (document.head || document.documentElement)?.appendChild(style);
    }

    function itemCaption(context, item, index) {
      const explicit = PayloadSanitizer.cleanText(item?.caption || "", {
        maxLength: 4_000,
      });
      if (explicit) return explicit;
      return index === 0
        ? PayloadSanitizer.cleanText(context?.text || "", { maxLength: 4_000 })
        : "";
    }

    function entries(context, items) {
      return items.map((item, index) => {
        const id = `media-${index}`;
        const caption = itemCaption(context, item, index);
        const previewUrl = String(
          item?.previewUrl ||
            (item?.kind === MEDIA_KIND.photo ? item?.url : "") ||
            "",
        );

        return {
          id,
          value: id,
          index,
          selected: true,
          checked: true,
          kind: item.kind,
          type: item.kind,
          mediaType: item.kind,
          url: String(item.url || ""),
          src: previewUrl || String(item.url || ""),
          previewUrl,
          thumbnail: previewUrl,
          label: `${index + 1}. ${item.kind === MEDIA_KIND.video ? "Vídeo" : item.kind === MEDIA_KIND.photo ? "Foto" : "Áudio"}`,
          caption,
          item: {
            ...item,
            caption,
          },
        };
      });
    }

    function normalizeResult(result, sourceEntries) {
      if (result === false || result?.cancelled === true || result?.canceled === true) {
        return [];
      }
      if (result === true || result === "all" || result?.all === true || result?.selectAll === true) {
        return sourceEntries.map((entry) => entry.item);
      }

      let selected =
        Array.isArray(result)
          ? result
          : result?.selectedItems ??
            result?.selectedImages ??
            result?.selected ??
            result?.selectedIds ??
            result?.selectedIndices ??
            result?.values ??
            result?.value ??
            result?.items ??
            null;

      if (selected && !Array.isArray(selected) && typeof selected === "object") {
        selected = Object.entries(selected)
          .filter(([, enabled]) => Boolean(enabled))
          .map(([id]) => id);
      }

      if (!Array.isArray(selected)) return null;

      const ids = new Set();
      for (const value of selected) {
        if (typeof value === "number") {
          ids.add(`media-${value}`);
        } else if (typeof value === "string") {
          const direct = sourceEntries.find(
            (entry) => entry.id === value || entry.url === value,
          );
          ids.add(direct?.id || value);
        } else if (value && typeof value === "object") {
          if (value.selected === false || value.checked === false) continue;
          const id = value.id ?? value.value ?? value.key ?? value.index;
          if (typeof id === "number") ids.add(`media-${id}`);
          else if (id != null) ids.add(String(id));
          else if (value.url) {
            const match = sourceEntries.find((entry) => entry.url === String(value.url));
            if (match) ids.add(match.id);
          }
        }
      }

      return sourceEntries
        .filter((entry) => ids.has(entry.id))
        .map((entry) => entry.item);
    }

    async function toasterPicker(context, sourceEntries) {
      if (Toast?.canSelectImages !== true) return null;

      const descriptor = {
        title: "Carrossel detectado",
        description: `Selecione as mídias que quer enviar. Todas as ${sourceEntries.length} estão selecionadas por padrão.`,
        multiple: true,
        selectAll: true,
        allSelected: true,
        defaultSelected: sourceEntries.map((entry) => entry.id),
        selected: sourceEntries.map((entry) => entry.id),
        confirmLabel: "Enviar selecionadas",
        selectAllLabel: "Enviar todos",
        cancelLabel: "Cancelar",
        items: sourceEntries.map((entry) => ({
          id: entry.id,
          value: entry.id,
          src: entry.src,
          url: entry.url,
          image: entry.previewUrl || entry.src,
          previewUrl: entry.previewUrl,
          thumbnail: entry.thumbnail,
          mediaType: entry.mediaType,
          type: entry.type,
          label: entry.label,
          caption: entry.caption,
          selected: true,
          checked: true,
        })),
        images: sourceEntries.map((entry) => ({
          id: entry.id,
          value: entry.id,
          src: entry.src,
          url: entry.url,
          previewUrl: entry.previewUrl,
          mediaType: entry.mediaType,
          type: entry.type,
          label: entry.label,
          caption: entry.caption,
          selected: true,
          checked: true,
        })),
        metadata: {
          provider: context.providerId,
          pageUrl: context.pageUrl,
          total: sourceEntries.length,
        },
      };

      try {
        const result = await Toast.selectImages(descriptor);
        return normalizeResult(result, sourceEntries);
      } catch {
        return null;
      }
    }

    function positionPicker(node, context) {
      const viewport = window.visualViewport;
      const vx = Number(viewport?.offsetLeft || 0);
      const vy = Number(viewport?.offsetTop || 0);
      const vw = Math.max(1, Number(viewport?.width || innerWidth || 1));
      const vh = Math.max(1, Number(viewport?.height || innerHeight || 1));
      const rootRect = context?.root?.getBoundingClientRect?.();

      const width = Math.min(
        430,
        Math.max(280, Math.min(vw - 20, Number(rootRect?.width || vw) - 16)),
      );
      node.style.width = `${Math.round(width)}px`;

      const measured = node.getBoundingClientRect();
      let left = Number(rootRect?.right || vx + vw) - measured.width - 8;
      let top = Number(rootRect?.top || vy + 10) + 8;

      left = Math.max(vx + 10, Math.min(vx + vw - measured.width - 10, left));
      top = Math.max(vy + 10, Math.min(vy + vh - Math.min(measured.height, vh - 20) - 10, top));

      node.style.left = `${Math.round(left)}px`;
      node.style.top = `${Math.round(top)}px`;
      node.style.maxHeight = `${Math.round(
        Math.max(240, vh * Math.min(0.88, Number(CONFIG.instagram.carouselPickerMaxHeightRatio) || 0.72)),
      )}px`;
    }

    function inlinePicker(context, sourceEntries) {
      ensureStyle();

      if (active?.node?.isConnected) {
        try { active.cancel(); } catch {}
      }

      return new Promise((resolve) => {
        const node = document.createElement("section");
        node.className = "aio-carousel-picker";
        node.setAttribute("role", "dialog");
        node.setAttribute("aria-modal", "true");
        node.setAttribute("aria-label", "Selecionar mídias do carrossel");
        node.addEventListener("click", (event) => event.stopPropagation());
        node.addEventListener("pointerdown", (event) => event.stopPropagation());

        const header = document.createElement("div");
        header.className = "aio-carousel-picker__header";
        const heading = document.createElement("div");
        heading.innerHTML = `<div class="aio-carousel-picker__title">Carrossel detectado</div><div class="aio-carousel-picker__subtitle">Todas selecionadas. Desmarque o que não quiser enviar.</div>`;
        const close = document.createElement("button");
        close.type = "button";
        close.className = "aio-carousel-picker__close";
        close.textContent = "×";
        close.setAttribute("aria-label", "Cancelar");
        header.append(heading, close);

        const grid = document.createElement("div");
        grid.className = "aio-carousel-picker__grid";
        const checkboxes = [];

        for (const entry of sourceEntries) {
          const label = document.createElement("label");
          label.className = "aio-carousel-picker__item";

          const media = document.createElement("div");
          media.className = "aio-carousel-picker__media";

          if (entry.kind === MEDIA_KIND.photo || entry.previewUrl) {
            const image = document.createElement("img");
            image.alt = entry.label;
            image.loading = "eager";
            image.decoding = "async";
            image.referrerPolicy = "no-referrer";
            image.src = entry.previewUrl || entry.url;
            media.appendChild(image);
          } else if (entry.kind === MEDIA_KIND.video && Media.isHttp(entry.url) && !Media.isHls(entry.url)) {
            const video = document.createElement("video");
            video.muted = true;
            video.playsInline = true;
            video.preload = "metadata";
            video.src = entry.url;
            media.appendChild(video);
          } else {
            const placeholder = document.createElement("div");
            placeholder.className = "aio-carousel-picker__placeholder";
            placeholder.textContent = entry.kind === MEDIA_KIND.video ? "▶" : "◉";
            media.appendChild(placeholder);
          }

          const badge = document.createElement("span");
          badge.className = "aio-carousel-picker__badge";
          badge.textContent = entry.kind === MEDIA_KIND.video ? "Vídeo" : entry.kind === MEDIA_KIND.photo ? "Foto" : "Áudio";

          const checkWrap = document.createElement("span");
          checkWrap.className = "aio-carousel-picker__check";
          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = true;
          input.value = entry.id;
          input.dataset.index = String(entry.index);
          const checkSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          checkSvg.setAttribute("viewBox", "0 0 16 16");
          checkSvg.innerHTML = '<path d="m3.2 8.1 3 3.1 6.7-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
          checkWrap.append(input, checkSvg);

          media.append(badge, checkWrap);
          label.appendChild(media);

          const caption = document.createElement("span");
          caption.className = "aio-carousel-picker__caption";
          caption.textContent = entry.caption || `Mídia ${entry.index + 1}`;
          label.appendChild(caption);

          grid.appendChild(label);
          checkboxes.push(input);
        }

        const footer = document.createElement("div");
        footer.className = "aio-carousel-picker__footer";
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "aio-carousel-picker__button";
        cancel.textContent = "Cancelar";

        const all = document.createElement("button");
        all.type = "button";
        all.className = "aio-carousel-picker__button";
        all.textContent = "Todos";

        const send = document.createElement("button");
        send.type = "button";
        send.className = "aio-carousel-picker__button";
        send.dataset.primary = "true";

        footer.append(cancel, all, send);
        node.append(header, grid, footer);

        let settled = false;
        const update = () => {
          const count = checkboxes.filter((input) => input.checked).length;
          send.disabled = count === 0;
          send.textContent = count === sourceEntries.length
            ? `Enviar todos (${count})`
            : `Enviar ${count}`;
          all.textContent = count === sourceEntries.length ? "Desmarcar todos" : "Selecionar todos";
        };

        const cleanup = () => {
          removeEventListener("resize", reposition);
          window.visualViewport?.removeEventListener("resize", reposition);
          window.visualViewport?.removeEventListener("scroll", reposition);
          document.removeEventListener("keydown", onKey, true);
          try { node.remove(); } catch {}
          if (active?.node === node) active = null;
        };

        const settle = (value) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(value);
        };

        const selected = () =>
          sourceEntries
            .filter((entry) => checkboxes[entry.index]?.checked)
            .map((entry) => entry.item);

        const cancelPicker = () => settle([]);
        const reposition = () => positionPicker(node, context);
        const onKey = (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelPicker();
          }
        };

        close.addEventListener("click", cancelPicker);
        cancel.addEventListener("click", cancelPicker);
        send.addEventListener("click", () => settle(selected()));
        all.addEventListener("click", () => {
          const allChecked = checkboxes.every((input) => input.checked);
          for (const input of checkboxes) input.checked = !allChecked;
          update();
        });
        for (const input of checkboxes) input.addEventListener("change", update);

        const host = isElement(context?.root) && context.root.isConnected
          ? context.root
          : (document.body || document.documentElement);
        host.appendChild(node);
        active = { node, cancel: cancelPicker };

        addEventListener("resize", reposition, { passive: true });
        window.visualViewport?.addEventListener("resize", reposition, { passive: true });
        window.visualViewport?.addEventListener("scroll", reposition, { passive: true });
        document.addEventListener("keydown", onKey, true);

        update();
        requestAnimationFrame(reposition);
      });
    }

    async function select(context, items) {
      const cleanItems = Media.dedupeItems(items || []);
      if (
        CONFIG.instagram.carouselSelection === false ||
        cleanItems.length < 2
      ) {
        return cleanItems;
      }

      Toast?.info?.(
        {
          title: "Carrossel detectado",
          description: `Selecione as mídias que quer enviar ou mantenha todas as ${cleanItems.length} selecionadas.`,
        },
        { duration: 3_500, dedupe: true },
      );

      const sourceEntries = entries(context, cleanItems);
      const toasterResult = await toasterPicker(context, sourceEntries);

      if (toasterResult !== null) return toasterResult;
      return inlinePicker(context, sourceEntries);
    }

    return Object.freeze({ select });
  })();

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
      const items = Media.dedupeItems(await current.items({ forAction: true }));
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
        description: `${item.kind === MEDIA_KIND.photo ? "Baixando foto" : item.kind === MEDIA_KIND.audio ? "Baixando áudio" : "Baixando vídeo"} ${index + 1}/${total}…`,
      });

      const downloaded = await gmBlob(item.url, (percentage) =>
        task?.setProgress?.(percentage, {
          description: `${item.kind === MEDIA_KIND.photo ? "Baixando foto" : item.kind === MEDIA_KIND.audio ? "Baixando áudio" : "Baixando vídeo"} ${index + 1}/${total} · ${percentage}%`,
        }),
      );

      const contentType =
        downloaded.blob.type ||
        (item.kind === MEDIA_KIND.photo
          ? "image/jpeg"
          : item.kind === MEDIA_KIND.audio
            ? "audio/mpeg"
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
      const requiresPreparedWorkerUpload =
        item.kind === MEDIA_KIND.video &&
        (Media.isHls(item.url) || Media.isDash(item.url));

      // HLS/DASH must end at the Worker. Do not hand a manifest to Scriptable
      // after the expensive local preparation has already succeeded.
      if (requiresPreparedWorkerUpload) {
        task?.update?.({
          description: `Preparando vídeo ${index + 1}/${total} para o Worker…`,
        });

        const prepared = await this.prepare(
          context,
          item,
          index,
          total,
          task,
        );

        task?.update?.({
          description: `Enviando vídeo processado ${index + 1}/${total} ao Worker…`,
        });

        try {
          return await Telegram.send(
            context,
            item,
            index,
            total,
            prepared,
          );
        } catch (error) {
          throw new Error(
            `Worker recusou o vídeo processado: ${String(error?.message || error)}`,
          );
        }
      }

      if (Media.isHttp(item.url)) {
        try {
          task?.update?.({
            description: `Enviando ${item.kind === MEDIA_KIND.photo ? "foto" : item.kind === MEDIA_KIND.audio ? "áudio" : "vídeo"} ${index + 1}/${total}…`,
          });
          return await Telegram.send(context, item, index, total, null);
        } catch (error) {
          failures.push(`URL-first: ${String(error?.message || error)}`);
          debug("Telegram URL-first falhou", item.url, error);
        }
      }

      try {
        const prepared = await this.prepare(context, item, index, total, task);
        task?.update?.({
          description: `Enviando arquivo preparado ${index + 1}/${total} ao Worker…`,
        });
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
        const inspected = runOptions.inspected || await this.inspect(context);
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
                description: context.metadata?.selectionMode === "viewport-current"
                  ? `Enviando ${total} mídias visíveis…`
                  : `Enviando carrossel com ${total} mídias…`,
              });
              await Telegram.sendAlbum(context, inspected.items);
              MediaUsage.markMany(context, inspected.items, action, {
                transport: "telegram-album",
                trigger: String(runOptions.trigger || "button"),
              });
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
              MediaUsage.mark(context, item, index, action, {
                transport: "telegram-item",
                trigger: String(runOptions.trigger || "button"),
              });
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
                ? context.metadata?.selectionMode === "viewport-current"
                  ? "As mídias atualmente visíveis foram enviadas para o Telegram."
                  : "Todo o carrossel foi enviado para o Telegram."
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
          MediaUsage.mark(context, item, index, action, {
            transport: "browser-download",
            filename: prepared.filename,
          });
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
    pendingTwitterRepost: null,
    counters: {
      twitterClicks: 0,
      twitterReposts: 0,
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

    twitterIsRepostMenuAction(element) {
      if (!isElement(element)) return false;
      const labels = this.labels(element).join(" | ");
      if (!labels) return false;

      if (
        /\b(?:undo|unrepost|unretweet|desfazer|remover repost|remove repost)\b/i.test(labels)
      ) {
        return false;
      }

      return /\b(?:repost|retweet|repostar|republicar|repostear)\b/i.test(labels);
    },

    twitterContextFromButton(button) {
      const root = twitterRootFromElement(button);
      if (!root) return null;
      const presence = twitterMediaPresence(root);
      if (!presence.hasMedia) return null;
      MoreExpander.kick(root, "twitter");
      TwitterStore.ingestElement(root);
      const context = twitterContext(root);
      return isElement(context.target) ? context : null;
    },

    instagramContextFromButton(button) {
      let root = instagramRootFromElement(button);

      if (!root && instagramRouteMode() !== "ambient") {
        const candidates = [...document.querySelectorAll("video,img")]
          .filter((element) => {
            if (element.closest?.(".aio-carousel-picker")) return false;
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

    watchTwitterRepostConfirmation(root, context) {
      if (!isElement(root) || !context) return;

      const timeout = Math.max(
        900,
        Number(CONFIG.twitter.repostConfirmWindowMs) || 2_800,
      );
      const started = Date.now();

      const check = () => {
        if (Date.now() - started > timeout) return;

        if (
          root.querySelector?.('[data-testid="unretweet"]') ||
          root.querySelector?.('[data-testid="unrepost"]')
        ) {
          void this.relay(context, "twitter-repost");
          return;
        }

        setTimeout(check, 160);
      };

      setTimeout(check, 140);
    },

    rememberPendingRepost(button, context) {
      const root = twitterRootFromElement(button);
      this.pendingTwitterRepost = {
        context,
        root,
        at: Date.now(),
      };
      this.watchTwitterRepostConfirmation(root, context);
    },

    consumePendingRepost() {
      const pending = this.pendingTwitterRepost;
      if (!pending) return null;

      const maximum = Math.max(
        1_000,
        Number(CONFIG.twitter.repostConfirmWindowMs) || 2_800,
      ) + 1_200;

      if (Date.now() - Number(pending.at || 0) > maximum) {
        this.pendingTwitterRepost = null;
        return null;
      }

      return pending;
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
          if (
            elements.some(
              (element) =>
                element.closest?.("#aio-media-actions-root") ||
                element.closest?.(".aio-carousel-picker"),
            )
          ) {
            return;
          }

          if (IS_TWITTER) {
            if (CONFIG.twitter.sendToTelegramOnBookmark) {
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

                setTimeout(
                  () => void this.relay(context, "twitter-bookmark"),
                  120,
                );
                return;
              }
            }

            if (CONFIG.twitter.sendToTelegramOnRepost) {
              const undo = this.closestFromEvent(
                event,
                '[data-testid="unretweet"],[data-testid="unrepost"]',
              );
              if (undo) return;

              const repostButton = this.closestFromEvent(
                event,
                '[data-testid="retweet"],[data-testid="repost"]',
              );

              if (repostButton) {
                const context = this.twitterContextFromButton(repostButton);
                if (context) {
                  this.counters.twitterReposts += 1;
                  this.rememberPendingRepost(repostButton, context);
                }
                return;
              }

              const menuAction = this.closestFromEvent(
                event,
                '[role="menuitem"],div[role="menuitem"],button,[role="button"]',
              );

              if (menuAction && this.twitterIsRepostMenuAction(menuAction)) {
                const pending = this.consumePendingRepost();
                if (pending?.context) {
                  this.counters.twitterReposts += 1;
                  setTimeout(
                    () => void this.relay(pending.context, "twitter-repost"),
                    120,
                  );
                  return;
                }
              }
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
        twitterBookmark:
          IS_TWITTER && CONFIG.twitter.sendToTelegramOnBookmark,
        twitterRepost:
          IS_TWITTER && CONFIG.twitter.sendToTelegramOnRepost,
        instagram:
          IS_INSTAGRAM && CONFIG.instagram.sendToTelegramOnBookmark,
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
  // ---------------------------------------------------------------------------
  // Instagram account header
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
    let avatarShell = null;
    let avatarFallback = null;
    let avatarObjectUrl = "";
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
        if (!avatarUrl) continue;
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
        'a[href] img[alt*="profile picture" i]',
        'a[href] img[alt*="foto do perfil" i]',
        'img[alt*="profile picture" i]',
        'img[alt*="foto do perfil" i]',
        'a[href] img',
      ];

      const seen = new Set();

      for (const selector of selectors) {
        for (const image of document.querySelectorAll?.(selector) || []) {
          if (!isImageElement(image) || seen.has(image)) continue;
          seen.add(image);

          const anchor = image.closest?.("a[href]") || image.parentElement?.closest?.("a[href]");
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
      const avatarSize = Math.max(22, Number(CONFIG.ui.profileHeader.avatarSize) || 27);
      style = document.createElement("style");
      style.id = "aio-instagram-account-header-style";
      style.textContent = `
        #aio-media-actions-root #aio-instagram-account-header{
          --aio-profile-bg:#171717;--aio-profile-fg:#fff;--aio-profile-muted:rgba(255,255,255,.76);
          --aio-profile-chip:rgba(255,255,255,.16);--aio-profile-ring:rgba(255,255,255,.34);
          position:fixed;top:calc(env(safe-area-inset-top) + ${Math.max(0, Number(CONFIG.ui.profileHeader.topOffset) || 8)}px);
          left:50%;z-index:2147483647;display:none;align-items:center;gap:7px;min-height:${avatarSize + 10}px;
          max-width:min(90vw,430px);padding:5px 8px 5px 5px;border:.7px solid rgba(255,255,255,.26);
          border-radius:999px;background:color-mix(in srgb,var(--aio-profile-bg) 86%,transparent);color:var(--aio-profile-fg);
          -webkit-backdrop-filter:blur(14px) saturate(1.16);backdrop-filter:blur(14px) saturate(1.16);
          box-shadow:inset 0 .125em .125em #0000000d,inset 0 -.125em .125em #ffffff40,0 .125em .125em -.125em #0003,
            inset 0 0 .1em .18em #ffffff22,0 .225em .05em #0000000d,0 .2em #ffffff42,inset 0 .2em .05em #00000020;
          transform:translateX(-50%);pointer-events:auto;box-sizing:border-box;
          font:650 12px/1.15 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif;
          -webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none;isolation:isolate
        }
        #aio-media-actions-root #aio-instagram-account-header[data-ready="true"]{display:flex}
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-link{display:grid;grid-template-columns:${avatarSize}px minmax(0,1fr);align-items:center;gap:7px;min-width:0;color:inherit;text-decoration:none;outline:0;border-radius:999px}
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-avatar-shell{position:relative;display:grid;place-items:center;width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;overflow:hidden;background:var(--aio-profile-chip);
          box-shadow:0 0 0 1px var(--aio-profile-ring),inset 0 .08em .1em rgba(255,255,255,.28),0 .18em .42em rgba(0,0,0,.22);transition:box-shadow 100ms ease,transform 100ms ease}
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-link:active .aio-profile-avatar-shell{
          box-shadow:inset 0 .125em .125em #0000000d,inset 0 -.125em .125em #ffffff80,0 .125em .125em -.125em #0003,
            inset 0 0 .1em .25em #fff3,0 .225em .05em #0000000d,0 .25em #ffffffbf,inset 0 .25em .05em #00000026;
          transform:translateY(.04em) scale(.96)
        }
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-avatar{position:absolute;inset:0;display:block;width:100%;height:100%;border-radius:50%;object-fit:cover;opacity:0;transition:opacity 150ms ease}
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-avatar-shell[data-loaded="true"] .aio-profile-avatar{opacity:1}
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-avatar-fallback{display:grid;place-items:center;width:100%;height:100%;color:var(--aio-profile-fg);opacity:.84}
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-avatar-shell[data-loaded="true"] .aio-profile-avatar-fallback{opacity:0}
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-avatar-fallback svg{width:62%;height:62%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-username{min-width:0;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.01em}
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-version{display:inline-flex;align-items:center;justify-content:center;min-height:22px;padding:0 7px;border:.7px solid rgba(255,255,255,.20);border-radius:999px;background:var(--aio-profile-chip);color:var(--aio-profile-muted);font-size:10px;font-weight:760;letter-spacing:.02em;white-space:nowrap}
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
        avatarShell = root.querySelector(".aio-profile-avatar-shell");
        avatarFallback = root.querySelector(".aio-profile-avatar-fallback");
        usernameNode = root.querySelector(".aio-profile-username");
        versionNode = root.querySelector(".aio-profile-version");
        return root;
      }

      root = document.createElement("div");
      root.id = "aio-instagram-account-header";
      root.dataset.ready = "false";
      root.setAttribute("role", "group");
      root.setAttribute("aria-label", `AIO downloader ${VERSION}`);

      profileLink = document.createElement("a");
      profileLink.className = "aio-profile-link";
      profileLink.rel = "noopener";

      avatarShell = document.createElement("span");
      avatarShell.className = "aio-profile-avatar-shell";
      avatarShell.dataset.loaded = "false";

      avatar = document.createElement("img");
      avatar.className = "aio-profile-avatar";
      avatar.alt = "";
      avatar.decoding = "async";
      avatar.loading = "eager";

      avatarFallback = document.createElement("span");
      avatarFallback.className = "aio-profile-avatar-fallback";
      avatarFallback.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.8 19c.8-3.7 3-5.5 6.2-5.5s5.4 1.8 6.2 5.5"/></svg>';
      avatarShell.append(avatar, avatarFallback);

      usernameNode = document.createElement("span");
      usernameNode.className = "aio-profile-username";

      versionNode = document.createElement("span");
      versionNode.className = "aio-profile-version";
      versionNode.textContent = `AIO downloader v${VERSION}`;

      profileLink.append(avatarShell, usernameNode);
      root.append(profileLink, versionNode);
      uiRoot.appendChild(root);
      return root;
    }

    function findIdentity() {
      const fromGlobal = viewerFromGlobals();
      const fromDom = domIdentity();
      if (fromGlobal && fromDom && fromGlobal.username.toLowerCase() === fromDom.username.toLowerCase()) {
        return { ...fromGlobal, ...fromDom, avatarUrl: fromDom.avatarUrl || fromGlobal.avatarUrl, source: `${fromGlobal.source}+${fromDom.source}` };
      }
      return fromDom || fromGlobal;
    }

    function setAvatarSource(url, username) {
      const value = String(url || "").trim();
      if (!avatar || !avatarShell || !value) return;
      avatarShell.dataset.loaded = "false";
      avatar.alt = `@${username}`;

      const loaded = () => { avatarShell.dataset.loaded = "true"; };
      avatar.onload = loaded;
      avatar.onerror = () => {
        if (avatar.dataset.proxyAttempted === "true") return;
        avatar.dataset.proxyAttempted = "true";
        void gmBlob(value).then(({ blob }) => {
          if (avatarObjectUrl) { try { URL.revokeObjectURL(avatarObjectUrl); } catch {} }
          avatarObjectUrl = URL.createObjectURL(blob);
          avatar.src = avatarObjectUrl;
        }).catch((error) => debug("Avatar Instagram via GM falhou", error));
      };
      avatar.dataset.proxyAttempted = "false";
      avatar.src = value;
      if (avatar.complete && avatar.naturalWidth > 0) loaded();
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
      setAvatarSource(identity.avatarUrl, username);
      usernameNode.textContent = `@${username}`;
      versionNode.textContent = `AIO downloader v${VERSION}`;

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
      const size = CONFIG.ui.button.size;
      const iconSize = CONFIG.ui.button.iconSize;
      const style = document.createElement("style");
      style.id = "aio-media-actions-style";
      style.textContent = `
        #aio-media-actions-root .aio-group{
          position:fixed;z-index:2147483647;display:none;align-items:center;gap:6px;
          width:max-content;padding:0;border:0;background:transparent;box-shadow:none;
          pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;box-sizing:border-box
        }
        #aio-media-actions-root .aio-button-wrap{
          position:relative;display:grid;place-items:center;width:${size}px;height:${size}px;pointer-events:auto
        }
        #aio-media-actions-root .aio-button{
          --aio-media-color:#075985;
          position:relative;display:grid;place-items:center;width:${size}px;min-width:${size}px;
          height:${size}px;min-height:${size}px;padding:0;overflow:visible;border:1px solid rgba(255,255,255,.82);
          border-radius:50%;outline:0;color:var(--aio-media-color);cursor:pointer;appearance:none;-webkit-appearance:none;
          touch-action:manipulation;box-sizing:border-box;isolation:isolate;
          background:rgba(10,12,16,.68);
          box-shadow:0 3px 11px rgba(0,0,0,.34),inset 0 0 0 1px rgba(0,0,0,.18);
          transform:scale(1);transition:transform 110ms ease,opacity 120ms ease,background-color 120ms ease,border-color 120ms ease
        }
        #aio-media-actions-root .aio-button::before{
          content:"";position:absolute;inset:-1px;border:1px solid #fff;border-radius:inherit;
          opacity:.72;mix-blend-mode:difference;pointer-events:none
        }
        #aio-media-actions-root .aio-button:hover,#aio-media-actions-root .aio-button:focus-visible{
          background:rgba(4,6,10,.80);border-color:#fff
        }
        #aio-media-actions-root .aio-button:active{transform:scale(.94)}
        #aio-media-actions-root .aio-button:disabled,#aio-media-actions-root .aio-button[aria-busy="true"]{
          cursor:wait;pointer-events:none;opacity:.72
        }
        #aio-media-actions-root .aio-button-content{
          position:relative;display:grid;place-items:center;width:100%;height:100%;pointer-events:none
        }
        #aio-media-actions-root .aio-icon-slot,#aio-media-actions-root .aio-spinner{
          grid-area:1/1;display:grid;place-items:center
        }
        #aio-media-actions-root .aio-button[aria-busy="true"] .aio-icon-slot{display:none}
        #aio-media-actions-root .aio-spinner{
          display:none;width:${iconSize}px;height:${iconSize}px;animation:aio-spin .72s linear infinite
        }
        #aio-media-actions-root .aio-button[aria-busy="true"] .aio-spinner{display:block}
        #aio-media-actions-root .aio-icon-slot svg{width:${iconSize}px;height:${iconSize}px;overflow:visible;pointer-events:none}
        #aio-media-actions-root .aio-glyph-halo{
          fill:none;stroke:rgba(255,255,255,.94);stroke-width:4.6;stroke-linecap:round;stroke-linejoin:round;
          filter:drop-shadow(0 1px 1px rgba(0,0,0,.72))
        }
        #aio-media-actions-root .aio-media-glyph{
          fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round
        }
        #aio-media-actions-root .aio-used-dot,#aio-media-actions-root .aio-used-check{opacity:0;transition:opacity 120ms ease}
        #aio-media-actions-root .aio-used-dot{fill:#14532d;stroke:#fff;stroke-width:1.15}
        #aio-media-actions-root .aio-used-check{fill:none;stroke:#fff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        #aio-media-actions-root .aio-button[data-used="true"] .aio-used-dot,
        #aio-media-actions-root .aio-button[data-used="true"] .aio-used-check,
        #aio-media-actions-root .aio-button[data-used="partial"] .aio-used-dot,
        #aio-media-actions-root .aio-button[data-used="partial"] .aio-used-check{opacity:1}
        #aio-media-actions-root .aio-button[data-used="partial"] .aio-used-dot,
        #aio-media-actions-root .aio-button[data-used="partial"] .aio-used-check{opacity:.72}
        #aio-media-actions-root .aio-button[data-used="true"]{border-color:#86efac;background:rgba(5,26,14,.78)}
        #aio-media-actions-root .aio-spinner circle{
          fill:none;stroke:rgba(255,255,255,.92);stroke-width:4.4;stroke-linecap:round;opacity:.94
        }
        #aio-media-actions-root .aio-spinner path{
          fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round
        }
        #aio-media-actions-root .aio-button[data-kind="photo"]{--aio-media-color:#6D28D9}
        #aio-media-actions-root .aio-button[data-kind="video"]{--aio-media-color:#075985}
        #aio-media-actions-root .aio-button[data-kind="audio"]{--aio-media-color:#0F766E}
        @keyframes aio-spin{to{transform:rotate(360deg)}}
        @media(prefers-reduced-motion:reduce){
          #aio-media-actions-root .aio-button{transition:none!important}
          #aio-media-actions-root .aio-spinner{animation-duration:1.4s}
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

    mediaGlyphIcon() {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <g class="aio-glyph-halo">
            <rect x="3.25" y="5.25" width="17.5" height="13.5" rx="3.1"/>
            <path d="m10.1 9.15 5.25 2.85-5.25 2.85z"/>
          </g>
          <g class="aio-media-glyph">
            <rect x="3.25" y="5.25" width="17.5" height="13.5" rx="3.1"/>
            <path d="m10.1 9.15 5.25 2.85-5.25 2.85z"/>
          </g>
          <circle class="aio-used-dot" cx="18.25" cy="18.15" r="4.25"/>
          <path class="aio-used-check" d="m16.35 18.15 1.25 1.3 2.65-2.85"/>
        </svg>
      `;
    },

    spinnerIcon() {
      return '<svg class="aio-spinner" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2"/><path d="M12 3.8a8.2 8.2 0 0 1 7.7 5.35"/></svg>';
    },

    buttonMarkup(icon) {
      return `<span class="aio-button-content"><span class="aio-icon-slot">${icon}</span>${this.spinnerIcon()}</span>`;
    },

    setButtonKind(button, kind) {
      if (!button) return;
      const normalizedKind = kind === MEDIA_KIND.photo
        ? MEDIA_KIND.photo
        : kind === MEDIA_KIND.audio
          ? MEDIA_KIND.audio
          : MEDIA_KIND.video;
      button.dataset.kind = normalizedKind;
      const slot = button.querySelector?.(".aio-icon-slot");
      if (slot) slot.innerHTML = this.mediaGlyphIcon();
      else button.innerHTML = this.buttonMarkup(this.mediaGlyphIcon());

      if (button.dataset.action === ACTION.telegram) {
        button.title = normalizedKind === MEDIA_KIND.photo
          ? "Enviar foto para o Telegram"
          : normalizedKind === MEDIA_KIND.audio
            ? "Enviar áudio para o Telegram"
            : "Enviar vídeo para o Telegram";
      } else {
        button.title = normalizedKind === MEDIA_KIND.photo
          ? "Baixar foto"
          : normalizedKind === MEDIA_KIND.audio
            ? "Baixar áudio"
            : "Baixar vídeo";
      }
      button.setAttribute("aria-label", button.title);
    },

    async detectKind(state) {
      try {
        const context = state.getContext();
        const items = Media.dedupeItems(await context.items());
        const hasVideo = items.some((item) => item.kind === MEDIA_KIND.video);
        const hasAudio = items.some((item) => item.kind === MEDIA_KIND.audio);
        if (hasVideo) return MEDIA_KIND.video;
        if (hasAudio) return MEDIA_KIND.audio;
        return MEDIA_KIND.photo;
      } catch {
        return isVideoElement(state.target) ? MEDIA_KIND.video : isAudioElement(state.target) ? MEDIA_KIND.audio : MEDIA_KIND.photo;
      }
    },

    position(group, target) {
      const visible = Media.visibleRect(target);
      if (!visible) {
        group.style.display = "none";
        group.style.visibility = "";
        return;
      }

      group.style.visibility = "hidden";
      group.style.display = "inline-flex";

      const fallbackSize = Math.max(36, Number(CONFIG.ui.button.size) || 36);
      const width = Math.max(fallbackSize, Number(group.offsetWidth || fallbackSize));
      const height = Math.max(fallbackSize, Number(group.offsetHeight || fallbackSize));
      const padding = CONFIG.ui.padding;
      const viewport = window.visualViewport;
      const viewportLeft = Number(viewport?.offsetLeft || 0);
      const viewportTop = Number(viewport?.offsetTop || 0);
      const viewportWidth = Math.max(1, Number(viewport?.width || innerWidth || 1));
      const viewportHeight = Math.max(1, Number(viewport?.height || innerHeight || 1));
      const viewportRight = viewportLeft + viewportWidth;
      const viewportBottom = viewportTop + viewportHeight;
      const mediaRight = Number(visible.right ?? (visible.left + visible.width));

      // Default placement is center-right, inset inside the media. Carousel arrows
      // also live at the vertical center, so carousel controls are lifted above it.
      let left = mediaRight - width - padding;
      let top = visible.top + Math.max(0, (visible.height - height) / 2);

      if (group.dataset.carousel === "true") {
        const liftMin = Math.max(36, Number(CONFIG.ui.button.carouselLiftMin) || 52);
        const liftMax = Math.max(liftMin, Number(CONFIG.ui.button.carouselLiftMax) || 86);
        const lift = Math.max(liftMin, Math.min(liftMax, Number(visible.height || 0) * 0.14));
        top -= lift;
      }

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

      const state = { group, target, getContext, buttons: new Map() };

      for (const action of this.actions()) {
        const wrap = document.createElement("span");
        wrap.className = "aio-button-wrap";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "aio-button";
        button.dataset.action = action;
        button.innerHTML = this.buttonMarkup(this.mediaGlyphIcon());
        this.setButtonKind(button, isVideoElement(target) ? MEDIA_KIND.video : isAudioElement(target) ? MEDIA_KIND.audio : MEDIA_KIND.photo);
        state.buttons.set(action, button);

        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (button.__aioActionPending || button.disabled || button.getAttribute("aria-busy") === "true") return;
          button.__aioActionPending = true;

          try {
            const initialContext = state.getContext();
            let inspected = await Actions.inspect(initialContext);

            const selectableCarousel =
              inspected.items.length > 1 &&
              (
                inspected.context?.metadata?.isCarousel === true ||
                inspected.context?.providerId === "twitter"
              );

            if (selectableCarousel) {
              const selectedItems = await CarouselSelection.select(
                inspected.context,
                inspected.items,
              );
              if (!selectedItems.length) return;

              inspected = {
                ...inspected,
                items: selectedItems,
                primary: selectedItems[0] || null,
                context: {
                  ...inspected.context,
                  metadata: {
                    ...(inspected.context.metadata || {}),
                    selectionMode: "carousel-selected",
                    selectedMediaCount: selectedItems.length,
                    originalMediaCount: inspected.items.length,
                  },
                },
              };
            }

            const usage = MediaUsage.status(inspected.context, inspected.items, action);

            if (usage.anyUsed) {
              if (Toast?.canConfirm !== true) {
                Toast?.warning?.({
                  title: "Mídia já utilizada",
                  description: "O RodToaster carregado não oferece confirmação interativa. A ação foi cancelada para evitar repetir sem querer.",
                  duration: 5_000,
                });
                return;
              }

              const noun = usage.total === 1
                ? inspected.items[0]?.kind === MEDIA_KIND.photo
                  ? "Esta foto"
                  : inspected.items[0]?.kind === MEDIA_KIND.audio
                    ? "Este áudio"
                    : "Este vídeo"
                : `${usage.usedCount} de ${usage.total} mídias`;
              const verb = action === ACTION.telegram ? "já foi enviada" : "já foi baixada";
              const pluralVerb = action === ACTION.telegram ? "já foram enviadas" : "já foram baixadas";

              const repeat = await Toast.confirm({
                title: action === ACTION.telegram ? "Enviar novamente?" : "Baixar novamente?",
                description: usage.total === 1
                  ? `${noun} ${verb} antes. Deseja repetir?`
                  : `${noun} ${pluralVerb} antes. Deseja repetir a seleção atual?`,
                duration: 0,
                dismissible: true,
                actions: [
                  { id: "cancel", label: "Cancelar", variant: "secondary", value: false, handle: () => false },
                  { id: "repeat", label: action === ACTION.telegram ? "Enviar de novo" : "Baixar de novo", variant: "primary", value: true, handle: () => true },
                ],
              });
              if (repeat !== true) return;
            }

            button.disabled = true;
            button.setAttribute("aria-busy", "true");
            wrap.dataset.busy = "true";
            await Actions.run(action, inspected.context, { inspected });
            await this.refresh(state);
          } catch (error) {
            debug("Ação do botão falhou", error);
          } finally {
            button.__aioActionPending = false;
            button.removeAttribute("aria-busy");
            button.disabled = false;
            wrap.dataset.busy = "false";
          }
        });

        wrap.append(button);
        group.appendChild(wrap);
      }

      root.appendChild(group);
      this.makeDraggable(group, state);
      this.groups.set(id, state);
      void this.refresh(state);
      this.position(group, target);
    },

    async refresh(state) {
      const context = state.getContext();
      let items = [];

      try {
        items = Media.dedupeItems(await context.items());
      } catch {}

      const hasVideo = items.some((item) => item.kind === MEDIA_KIND.video);
      const hasAudio = items.some((item) => item.kind === MEDIA_KIND.audio);
      const kind = hasVideo
        ? MEDIA_KIND.video
        : hasAudio
          ? MEDIA_KIND.audio
          : items.length
            ? MEDIA_KIND.photo
            : await this.detectKind(state);
      const isCarousel = Boolean(context.metadata?.isCarousel);

      state.group.dataset.carousel = String(isCarousel);
      state.group.dataset.mediaCount = String(items.length);

      for (const [action, button] of state.buttons) {
        this.setButtonKind(button, kind);

        if (isCarousel && items.length > 1) {
          button.title = action === ACTION.telegram
            ? `Enviar carrossel (${items.length} mídias) para o Telegram`
            : `Baixar carrossel (${items.length} mídias)`;
          button.setAttribute("aria-label", button.title);
        }

        const usage = MediaUsage.status(context, items, action);

        if (usage.allUsed) {
          button.dataset.used = "true";
          button.dataset.done = action;
        } else if (usage.anyUsed) {
          button.dataset.used = "partial";
          delete button.dataset.done;
        } else {
          button.dataset.used = "false";
          delete button.dataset.done;
        }

        button.dataset.usedCount = String(usage.usedCount);
        button.dataset.mediaCount = String(usage.total);

        if (usage.anyUsed) {
          const baseTitle = String(button.title || "").replace(/ · .*$/, "");
          button.title = usage.allUsed
            ? `${baseTitle} · já utilizado`
            : `${baseTitle} · ${usage.usedCount}/${usage.total} já utilizados`;
          button.setAttribute("aria-label", button.title);
        }
      }

      this.position(state.group, state.target);
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
        buttonDesign: {
          mode: "contrast-difference",
          liquidGlass: false,
          defaultPosition: "center-right",
          carouselLift: true,
          buttonSize: CONFIG.ui.button.size,
          iconSize: CONFIG.ui.button.iconSize,
        },
      };
    },
  };


  // ---------------------------------------------------------------------------
  // Restored universal providers. Instagram/X keep their specialized post/photo
  // logic; every other site gets deep video/audio/player interception.
  // ---------------------------------------------------------------------------

  const ProviderIdentity = Object.freeze({
    fromHost(hostname = location.hostname) {
      const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
      const table = [
        ["youtube", /(^|\.)youtube\.com$|^youtu\.be$/],
        ["tiktok", /(^|\.)tiktok\.com$/],
        ["threads", /(^|\.)threads\.com$/],
        ["douyin", /(^|\.)douyin\.com$/],
        ["xiaohongshu", /(^|\.)(xiaohongshu\.com|xhslink\.com)$/],
        ["ted", /(^|\.)ted\.com$/],
        ["facebook", /(^|\.)(facebook\.com|fb\.watch)$/],
        ["pinterest", /(^|\.)pinterest\./],
        ["snapchat", /(^|\.)snapchat\.com$/],
        ["spotify", /(^|\.)spotify\.com$/],
        ["telegram-web", /^web\.telegram\.org$/],
        ["vimeo", /(^|\.)vimeo\.com$/],
        ["dailymotion", /(^|\.)dailymotion\.com$/],
        ["twitch", /(^|\.)twitch\.tv$/],
        ["reddit", /(^|\.)reddit\.com$/],
      ];
      return table.find(([, pattern]) => pattern.test(host))?.[0] || "generic";
    },
  });

  function genericPageUrl(providerId) {
    if (["tiktok", "instagram", "twitter", "threads"].includes(providerId)) return location.href.split("?")[0];
    return location.href;
  }

  function genericMediaContext(media) {
    const providerId = ProviderIdentity.fromHost();
    const kind = isAudioElement(media) ? MEDIA_KIND.audio : MEDIA_KIND.video;
    return {
      providerId,
      target: media,
      root: media,
      pageUrl: genericPageUrl(providerId),
      hostname: location.hostname.replace(/^www\./, ""),
      title: PayloadSanitizer.cleanTitle(document.title || providerId),
      text: "",
      metadata: { universalPlayer: true, tagName: String(media.tagName || "").toLowerCase() },
      async items() {
        const values = [];
        const add = (url, source, extraScore = 0) => {
          const value = String(url || "").trim();
          if (!Media.isLikelyMediaUrl(value)) return;
          const inferred = kind === MEDIA_KIND.audio ? MEDIA_KIND.audio : Media.kindFromUrl(value, MEDIA_KIND.video);
          if (kind === MEDIA_KIND.audio && inferred !== MEDIA_KIND.audio && !Media.isAudioUrl(value)) return;
          values.push({ kind: kind === MEDIA_KIND.audio ? MEDIA_KIND.audio : MEDIA_KIND.video, url: value, source, score: Media.mediaCandidateScore(value, kind) + extraScore });
        };

        Media.ownVideoUrls(media).forEach((url) => add(url, "dom", 40_000));
        PlayerInterceptor.candidates(media).forEach((url) => add(url, "player", 25_000));
        GlobalMediaCapture.candidates().forEach((url) => add(url, "network", 8_000));
        Media.performance().forEach((url) => add(url, "performance", 2_000));
        if (providerId === "youtube") ProviderSourceResolvers.youtube().forEach((url) => add(url, "youtube-player-response", 55_000));

        const ordered = Media.dedupeItems(values).sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
        const nonBlob = ordered.filter((item) => !Media.isBlob(item.url) && !Media.isData(item.url));
        const usable = nonBlob.length ? nonBlob : ordered;
        return usable.length ? [usable[0]] : [];
      },
    };
  }

  const GenericMediaProvider = {
    ids: new WeakMap(),
    mounted: new Set(),
    sequence: 0,

    eligible(media) {
      if (!isMediaElement(media) || !media.isConnected) return false;
      if (IS_TWITTER || IS_INSTAGRAM) return false;
      const rect = media.getBoundingClientRect?.();
      if (!rect) return false;
      if (isVideoElement(media)) {
        const width = Math.max(Number(rect.width || 0), Number(media.videoWidth || 0));
        const height = Math.max(Number(rect.height || 0), Number(media.videoHeight || 0));
        if (width < CONFIG.providers.minVideoWidth || height < CONFIG.providers.minVideoHeight) return false;
      }
      return true;
    },

    id(media) {
      if (!this.ids.has(media)) {
        this.sequence += 1;
        this.ids.set(media, `aio-universal-media-${this.sequence}`);
      }
      return this.ids.get(media);
    },

    mount(media) {
      if (!this.eligible(media)) return;
      this.mounted.add(media);
      Ui.attach(this.id(media), media, () => genericMediaContext(media));
    },

    scan(root = document) {
      if (CONFIG.providers.genericMedia === false || IS_TWITTER || IS_INSTAGRAM) return;
      if (isMediaElement(root)) this.mount(root);
      root.querySelectorAll?.("video,audio").forEach((media) => this.mount(media));
      for (const media of [...this.mounted]) {
        if (!media.isConnected) {
          Ui.detach(this.id(media));
          this.mounted.delete(media);
        }
      }
    },
  };

  const DirectMediaProvider = {
    mounted: false,
    run() {
      if (this.mounted || CONFIG.providers.directMedia === false) return;
      const type = String(document.contentType || "").toLowerCase();
      const direct = /^(?:video|audio)\//.test(type) || Media.isLikelyMediaUrl(location.href);
      if (!direct) return;
      const media = document.querySelector?.("video,audio");
      if (isMediaElement(media)) GenericMediaProvider.mount(media);
      this.mounted = true;
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

  try { GlobalMediaCapture.install(); } catch (error) { warn("GlobalMediaCapture.install() falhou", error); }
  try { PlayerInterceptor.install(); } catch (error) { warn("PlayerInterceptor.install() falhou", error); }

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

    try {
      if (!IS_TWITTER && !IS_INSTAGRAM) GenericMediaProvider.scan(root);
    } catch (error) {
      warn("GenericMediaProvider.scan() falhou", error);
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
  try { DirectMediaProvider.run(); } catch (error) { warn("DirectMediaProvider.run() falhou", error); }
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
    provider: IS_TWITTER ? "twitter" : IS_INSTAGRAM ? "instagram" : ProviderIdentity.fromHost(),
    features: CONFIG.features,
    ui: Ui.diagnostics(),
    instagramAccountHeader: InstagramAccountHeader.diagnostics(),
    universal: {
      network: GlobalMediaCapture.diagnostics(),
      players: PlayerInterceptor.diagnostics(),
      genericMounted: GenericMediaProvider.mounted.size,
    },
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
    universal: {
      players: PlayerInterceptor,
      network: GlobalMediaCapture,
      generic: GenericMediaProvider,
      provider: () => ProviderIdentity.fromHost(),
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
