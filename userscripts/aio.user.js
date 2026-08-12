// ==UserScript==
// @name               AIO downloader
// @namespace          https://rod.migos.club/userscripts
// @version            4.0.0
// @description        Atomic D1 relay dedupe, IndexedDB v2 Saved/Bookmarks sync, safe Telegram captions, RodToaster multi-loading and ultra-low Safari overhead.
// @author             @rodkisten
// @license            MIT
//
// @match              *://*/*
// @run-at             document-start
//
// @grant              unsafeWindow
// @grant              GM_xmlhttpRequest
// @grant              GM.xmlHttpRequest
// @grant              GM_registerMenuCommand
// @grant              GM.registerMenuCommand
// @grant              GM_getValue
// @grant              GM_setValue
// @grant              GM_deleteValue
//
// @connect            *
// @require            https://rod.migos.club/toaster/dist/toaster.js?v=4.7.0
// ==/UserScript==

(async function AIODownloader() {
  "use strict";

  const VERSION = "4.0.0";
  const PREFIX = `[AIO downloader ${VERSION}]`;
  const BOOT_DEBUG = false;

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
    }),

    instagram: Object.freeze({
      autoBookmarkOpenedReel: true,
      bookmarkAfterTelegram: false,
      autoLikeAfterTelegram: false,
      sendToTelegramOnBookmark: true,
      sendToTelegramOnLike: false,

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
      bookmarkAfterTelegram: false,
      autoLikeAfterTelegram: false,
      sendToTelegramOnBookmark: true,
      sendToTelegramOnRepost: true,
      sendToTelegramOnLike: false,
      repostConfirmWindowMs: 2_800,
      socialMutationFeedbackMs: 2_400,
      socialMutationSuppressMs: 4_000,
      immersiveTargetGraceMs: 1_800,
      promptLikeAfterTelegram: true,
      promptLikeDurationMs: 3_000,

      twirrl: Object.freeze({
        enabled: true,
        endpoint: "https://api.twirrl.app/video",
        operatingSystem: "iOS",
        versionToken: "ab8222fb13a47e82c36032c4ddcc622dc0d33f0e8f852b5b420085b9fd32c94e",
        timeout: 22_000,
        cacheTtlMs: 10 * 60_000,
      }),
    }),

    providers: Object.freeze({
      enabled: true,
      genericMedia: true,
      directMedia: true,
      networkWindowMs: 45_000,
      playerWindowMs: 300_000,
      captureStoreMaxPosts: 180,
      networkRecordLimit: 640,
      performanceRecordLimit: 480,
      twirrlCacheLimit: 120,
      minVideoWidth: 120,
      minVideoHeight: 80,
    }),

    ui: Object.freeze({
      // v3 schedules scanning/layout on mutations, visibility and RAF.
      dirtyRootsPerFrame: 48,
      padding: 10,
      minimumVisibleWidth: 50,
      minimumVisibleHeight: 50,
      dragThreshold: 7,
      dragStoragePrefix: "__aio_media_actions_drag__:v7",
      profileHeader: Object.freeze({
        enabled: true,
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

    // Channel-aware cache of relay-confirmed successful deliveries. It is an
    // optimization/UI cache only; D1 remains authoritative for unknown entries.
    deliveryCacheKey: "__aio_relay_delivery_cache__:v1",
    deliveryCacheMaxEntries: 2500,

    savedSyncKey: "__aio_saved_sync__:v1",
    savedSyncDbName: "aio-downloader-saved-media-v1",
    savedSyncDbStore: "posts",

    hlsBundle:
      "https://gist.githubusercontent.com/rodkisten/1c69b953b51c7dac50ee3eb5c22050b6/raw/9f5b33d36ca50acea12221b258363c6722b606e6/hls-bundle.js?01",
  });


  // ---------------------------------------------------------------------------
  // Persistent Settings Center
  // ---------------------------------------------------------------------------

  const SETTINGS_SCHEMA = 10;
  const SETTINGS_STORAGE_KEY = "__aio_downloader_settings__:v1";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
    return value;
  }

  function clonePlain(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch { return value; }
  }

  const DEFAULT_SETTINGS = deepFreeze({
    general: {
      enabled: true,
      telegram: true,
      directDownload: false,
      universalPlayers: true,
    },
    relay: {
      url: CONFIG.telegram.url,
      // relay.token is resolved through SecretStore. GM storage is preferred; page localStorage is compatibility-only when GM storage is unavailable.
      token: "",
      timeoutSeconds: Math.round(CONFIG.telegram.timeout / 1000),
      providerRouting: true,
      defaultChannels: "",
      twitterChannels: "-621561106,-324185513",
      instagramChannels: "-324185513",
      youtubeChannels: "-324185513",
      adultChannels: "-621561106",
      mediaChannelMode: "replace",
      photoChannels: "",
      videoChannels: "",
      audioChannels: "",
    },
    appearance: {
      preset: "contrast",
      position: "center-right",
      draggable: true,
      buttonSize: 36,
      iconSize: 19,
      opacity: 0.92,
      photoColor: "#6D28D9",
      videoColor: "#075985",
      audioColor: "#0F766E",
      showUsedIndicator: true,
      customPosition: { x: 0.92, y: 0.5 },
    },
    instagram: {
      enabled: true,
      expandMore: true,
      bookmarkTrigger: true,
      likeTrigger: false,
      bookmarkAfterSend: false,
      autoLikeAfterSend: false,
      autoBookmarkOpenedReel: true,
      accountHeader: true,
    },
    twitter: {
      enabled: true,
      expandMore: true,
      bookmarkTrigger: true,
      repostTrigger: true,
      likeTrigger: false,
      networkSocialInterception: true,
      networkSocialFeedback: true,
      bookmarkAfterSend: false,
      repostAfterAttempt: false,
      autoLikeAfterSend: false,
      promptLikeAfterSend: true,
      twirrlResolver: true,
    },
    carousel: {
      selectionDialog: true,
      selectAllByDefault: true,
      individualCaptions: true,
    },
    players: {
      interceptNetwork: true,
      interceptPlayers: true,
      hls: true,
      dash: true,
      workerFirstManifests: true,
      localRemuxFallback: false,
    },
    history: {
      enabled: true,
      confirmBeforeRepeat: true,
      maxEntries: 4000,
    },
    savedSync: {
      enabled: true,
      batchSize: 50,
      relayBatchConcurrency: 3,
      enrichCaptions: false,
      enrichmentTimeoutSeconds: 16,
      selectPendingByDefault: false,
      persistSeen: true,
      captureNetworkMedia: true,
      directMediaFirst: true,
      maxArchivedPosts: 12000,
      relayLookupEnabled: true,
      relayLookupBatchSize: 100,
      relayLookupDebounceMs: 140,
      relayLookupFreshMs: 60000,
      relayPositiveTtlHours: 168,
      relayDataEpoch: "v4",
      directMediaMaxAgeMinutes: 30,
      captionNegativeTtlHours: 24,
      captionFailureTtlMinutes: 15,
    },
    advanced: {
      debug: false,
    },
  });

  const SECRET_STORAGE_KEY = "__aio_downloader_relay_token__:v1";

  const SecretStore = (() => {
    let memory = null;
    let backend = "memory";

    function readRaw() {
      if (memory !== null) return memory;
      try {
        if (typeof GM_getValue === "function") {
          backend = "GM";
          const value = GM_getValue(SECRET_STORAGE_KEY, "");
          memory = String(value ?? "").trim();
          return memory;
        }
      } catch {}

      // Compatibility fallback only. It is intentionally separated from the
      // normal settings document so supported userscript managers keep the
      // bearer token outside the page origin's localStorage.
      try {
        backend = "localStorage-fallback";
        memory = String(localStorage.getItem(SECRET_STORAGE_KEY) || "").trim();
      } catch {
        memory = "";
      }
      return memory;
    }

    function get() {
      return readRaw() || CONFIG.telegram.token;
    }

    function set(value) {
      memory = String(value ?? "").trim();
      try {
        if (typeof GM_setValue === "function") {
          backend = "GM";
          GM_setValue(SECRET_STORAGE_KEY, memory);
          try { localStorage.removeItem(SECRET_STORAGE_KEY); } catch {}
          return memory;
        }
      } catch {}
      try {
        backend = "localStorage-fallback";
        localStorage.setItem(SECRET_STORAGE_KEY, memory);
      } catch {}
      return memory;
    }

    function reset() {
      memory = CONFIG.telegram.token;
      try {
        if (typeof GM_setValue === "function") {
          backend = "GM";
          GM_setValue(SECRET_STORAGE_KEY, memory);
          try { localStorage.removeItem(SECRET_STORAGE_KEY); } catch {}
          return memory;
        }
      } catch {}
      try { localStorage.setItem(SECRET_STORAGE_KEY, memory); } catch {}
      return memory;
    }

    function migrate(value) {
      const candidate = String(value ?? "").trim();
      if (!candidate) return false;
      const existing = readRaw();
      if (existing) return false;
      set(candidate);
      return true;
    }

    return Object.freeze({ key: SECRET_STORAGE_KEY, get, set, reset, migrate, diagnostics: () => ({ backend, configured: Boolean(get()) }) });
  })();

  const Settings = (() => {
    const subscribers = new Set();
    const allowedPresets = new Set(["contrast", "dark", "light", "minimal"]);
    const allowedPositions = new Set([
      "center-left", "center-right", "top-left", "top-right",
      "bottom-left", "bottom-right", "custom",
    ]);
    const allowedMediaChannelModes = new Set(["replace", "append"]);

    const clampNumber = (value, min, max, fallback) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return fallback;
      return Math.max(min, Math.min(max, numeric));
    };

    const normalizeHex = (value, fallback) => {
      const text = String(value || "").trim();
      const short = text.match(/^#([0-9a-f]{3})$/i)?.[1];
      if (short) return `#${short.split("").map((c) => c + c).join("").toUpperCase()}`;
      const full = text.match(/^#([0-9a-f]{6})$/i)?.[1];
      return full ? `#${full.toUpperCase()}` : fallback;
    };

    const normalizeRelayUrl = (value, fallback) => {
      const text = String(value || "").trim();
      if (!text) return fallback;
      try {
        const parsed = new URL(text);
        return /^https?:$/i.test(parsed.protocol) ? parsed.href : fallback;
      } catch {
        return fallback;
      }
    };

    const normalizeChatIds = (value) => {
      const result = [];
      for (const token of String(value || "").split(/[\s,;]+/)) {
        const item = token.trim();
        if (item && !result.includes(item)) result.push(item);
      }
      return result.join(",");
    };

    function mergeByDefaults(defaultValue, inputValue) {
      if (Array.isArray(defaultValue)) return Array.isArray(inputValue) ? clonePlain(inputValue) : clonePlain(defaultValue);
      if (!defaultValue || typeof defaultValue !== "object") {
        if (typeof defaultValue === "boolean") return typeof inputValue === "boolean" ? inputValue : defaultValue;
        if (typeof defaultValue === "number") return Number.isFinite(Number(inputValue)) ? Number(inputValue) : defaultValue;
        if (typeof defaultValue === "string") return typeof inputValue === "string" ? inputValue : defaultValue;
        return inputValue ?? defaultValue;
      }
      const output = {};
      const source = inputValue && typeof inputValue === "object" && !Array.isArray(inputValue) ? inputValue : {};
      for (const [key, childDefault] of Object.entries(defaultValue)) {
        output[key] = mergeByDefaults(childDefault, source[key]);
      }
      return output;
    }

    function normalize(input) {
      const candidate = input && typeof input === "object" && input.settings && typeof input.settings === "object"
        ? input.settings
        : input;
      const next = mergeByDefaults(DEFAULT_SETTINGS, candidate || {});

      next.appearance.preset = allowedPresets.has(next.appearance.preset)
        ? next.appearance.preset
        : DEFAULT_SETTINGS.appearance.preset;
      next.appearance.position = allowedPositions.has(next.appearance.position)
        ? next.appearance.position
        : DEFAULT_SETTINGS.appearance.position;
      next.appearance.buttonSize = clampNumber(next.appearance.buttonSize, 30, 56, DEFAULT_SETTINGS.appearance.buttonSize);
      next.appearance.iconSize = clampNumber(next.appearance.iconSize, 14, 32, DEFAULT_SETTINGS.appearance.iconSize);
      next.appearance.opacity = clampNumber(next.appearance.opacity, 0.35, 1, DEFAULT_SETTINGS.appearance.opacity);
      next.appearance.photoColor = normalizeHex(next.appearance.photoColor, DEFAULT_SETTINGS.appearance.photoColor);
      next.appearance.videoColor = normalizeHex(next.appearance.videoColor, DEFAULT_SETTINGS.appearance.videoColor);
      next.appearance.audioColor = normalizeHex(next.appearance.audioColor, DEFAULT_SETTINGS.appearance.audioColor);
      next.appearance.customPosition = {
        x: clampNumber(next.appearance.customPosition?.x, 0, 1, DEFAULT_SETTINGS.appearance.customPosition.x),
        y: clampNumber(next.appearance.customPosition?.y, 0, 1, DEFAULT_SETTINGS.appearance.customPosition.y),
      };

      next.relay.url = normalizeRelayUrl(next.relay.url, DEFAULT_SETTINGS.relay.url);
      next.relay.token = "";
      next.relay.timeoutSeconds = Math.round(
        clampNumber(next.relay.timeoutSeconds, 5, 300, DEFAULT_SETTINGS.relay.timeoutSeconds),
      );
      next.relay.mediaChannelMode = allowedMediaChannelModes.has(next.relay.mediaChannelMode)
        ? next.relay.mediaChannelMode
        : DEFAULT_SETTINGS.relay.mediaChannelMode;
      for (const path of [
        "defaultChannels",
        "twitterChannels",
        "instagramChannels",
        "youtubeChannels",
        "adultChannels",
        "photoChannels",
        "videoChannels",
        "audioChannels",
      ]) {
        next.relay[path] = normalizeChatIds(next.relay[path]);
      }

      next.history.maxEntries = Math.round(clampNumber(next.history.maxEntries, 100, 10_000, DEFAULT_SETTINGS.history.maxEntries));
      return next;
    }

    function diff(defaultValue, currentValue) {
      if (!defaultValue || typeof defaultValue !== "object" || Array.isArray(defaultValue)) {
        return Object.is(defaultValue, currentValue) ? undefined : currentValue;
      }
      const output = {};
      let changed = false;
      for (const [key, childDefault] of Object.entries(defaultValue)) {
        const child = diff(childDefault, currentValue?.[key]);
        if (child !== undefined) {
          output[key] = child;
          changed = true;
        }
      }
      return changed ? output : undefined;
    }

    function load() {
      try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!raw) return normalize(DEFAULT_SETTINGS);
        const parsed = JSON.parse(raw);
        const candidate = parsed?.settings && typeof parsed.settings === "object" ? parsed.settings : parsed;
        const legacyToken = candidate?.relay?.token;
        if (legacyToken) SecretStore.migrate(legacyToken);
        if (candidate?.relay && typeof candidate.relay === "object") delete candidate.relay.token;
        return normalize(candidate);
      } catch {
        return normalize(DEFAULT_SETTINGS);
      }
    }

    let current = load();

    let saveTimer = 0;

    function write() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = 0;
      }
      try {
        const changed = diff(DEFAULT_SETTINGS, current) || {};
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
          schema: SETTINGS_SCHEMA,
          updatedAt: Date.now(),
          settings: changed,
        }));
      } catch {}
    }

    function save(immediate = false) {
      if (immediate) {
        write();
        return;
      }
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = window.setTimeout(write, 100);
    }

    try { addEventListener("pagehide", write, { capture: true }); } catch {}

    function getPath(path) {
      if (!path) return current;
      return String(path).split(".").reduce((value, key) => value?.[key], current);
    }

    function notify(paths, reason = "update") {
      const event = {
        paths: Array.isArray(paths) ? paths : [String(paths || "")],
        reason,
        settings: clonePlain(current),
      };
      for (const listener of [...subscribers]) {
        try { listener(event); } catch (error) { try { console.warn("[AIO Settings] subscriber failed", error); } catch {} }
      }
      try {
        window.dispatchEvent(new CustomEvent("aio:settings-changed", { detail: event }));
      } catch {}
    }

    function setPath(path, value, reason = "set") {
      const keys = String(path || "").split(".").filter(Boolean);
      if (!keys.length) return false;
      if (keys.join(".") === "relay.token") {
        const previous = SecretStore.get();
        const next = SecretStore.set(value);
        if (previous === next) return false;
        notify(["relay.token"], reason);
        return true;
      }
      const candidate = clonePlain(current);
      let cursor = candidate;
      for (let index = 0; index < keys.length - 1; index += 1) {
        const key = keys[index];
        if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
        cursor = cursor[key];
      }
      cursor[keys.at(-1)] = value;
      const normalized = normalize(candidate);
      const before = JSON.stringify(current);
      const after = JSON.stringify(normalized);
      if (before === after) return false;
      current = normalized;
      save();
      notify([keys.join(".")], reason);
      return true;
    }

    function patch(partial, reason = "patch") {
      const base = clonePlain(current);
      const paths = [];
      const apply = (target, source, prefix = "") => {
        for (const [key, value] of Object.entries(source || {})) {
          const path = prefix ? `${prefix}.${key}` : key;
          if (value && typeof value === "object" && !Array.isArray(value)) {
            if (!target[key] || typeof target[key] !== "object") target[key] = {};
            apply(target[key], value, path);
          } else {
            target[key] = value;
            paths.push(path);
          }
        }
      };
      apply(base, partial || {});
      const normalized = normalize(base);
      if (JSON.stringify(current) === JSON.stringify(normalized)) return false;
      current = normalized;
      save();
      notify(paths.length ? paths : [""], reason);
      return true;
    }

    function reset() {
      current = normalize(DEFAULT_SETTINGS);
      SecretStore.reset();
      save(true);
      notify(["*"], "reset");
      return clonePlain(current);
    }

    function importSettings(input) {
      const parsed = typeof input === "string" ? JSON.parse(input) : input;
      if (!parsed || typeof parsed !== "object") throw new TypeError("Configuração importada precisa ser um objeto JSON.");
      if (parsed.app != null && String(parsed.app) !== "aio-downloader") {
        throw new TypeError("Este JSON não pertence ao AIO Downloader.");
      }
      if (parsed.schema != null && Number(parsed.schema) > SETTINGS_SCHEMA) {
        throw new TypeError(`Schema ${parsed.schema} é mais novo que o suportado (${SETTINGS_SCHEMA}).`);
      }
      const candidate = parsed?.settings && typeof parsed.settings === "object" ? clonePlain(parsed.settings) : clonePlain(parsed);
      const importedToken = candidate?.relay?.token;
      if (importedToken) SecretStore.set(importedToken);
      if (candidate?.relay && typeof candidate.relay === "object") delete candidate.relay.token;
      current = normalize(candidate);
      save(true);
      notify(["*"], "import");
      return clonePlain(current);
    }

    function exportSettings(pretty = true, includeSecrets = false) {
      const settings = clonePlain(current);
      if (includeSecrets) settings.relay.token = SecretStore.get();
      else delete settings.relay.token;
      return JSON.stringify({
        app: "aio-downloader",
        schema: SETTINGS_SCHEMA,
        version: VERSION,
        exportedAt: new Date().toISOString(),
        includesSecrets: Boolean(includeSecrets),
        settings,
      }, null, pretty ? 2 : 0);
    }

    return Object.freeze({
      key: SETTINGS_STORAGE_KEY,
      schema: SETTINGS_SCHEMA,
      defaults: DEFAULT_SETTINGS,
      get(path, fallback) {
        if (String(path || "") === "relay.token") {
          const value = SecretStore.get();
          return value === undefined ? fallback : value;
        }
        const value = getPath(path);
        return value === undefined ? fallback : value;
      },
      set: setPath,
      patch,
      reset,
      import: importSettings,
      export: exportSettings,
      snapshot: () => clonePlain(current),
      persisted: () => diff(DEFAULT_SETTINGS, current) || {},
      subscribe(listener) {
        if (typeof listener !== "function") return () => {};
        subscribers.add(listener);
        return () => subscribers.delete(listener);
      },
    });
  })();

  let SettingsPanel = null;

  function debugEnabled() {
    try { return Settings.get("advanced.debug", BOOT_DEBUG) === true; }
    catch { return BOOT_DEBUG; }
  }

  const TELEGRAM_CHANNEL_ROUTES = Object.freeze([
    {
      id: "twitter",
      sites: ["twitter", "x", "x.com", "twitter.com"],
      setting: "relay.twitterChannels",
    },
    {
      id: "instagram",
      sites: ["instagram", "instagram.com"],
      setting: "relay.instagramChannels",
    },
    {
      id: "youtube",
      sites: ["youtube", "youtube.com", "youtu.be"],
      setting: "relay.youtubeChannels",
    },
    {
      id: "adult",
      sites: ["xvideos", "pornhub", "gayporntube", "justthegays.com", "xhamster.com", "pornhub.com"],
      setting: "relay.adultChannels",
    },
  ]);

  let Toast = null;

  const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));

  function truncate(value, max = 800) {
    const text = String(value ?? "");
    return text.length <= max ? text : `${text.slice(0, max)}…`;
  }

  function formatBytes(value) {
    const bytes = Math.max(0, Number(value) || 0);
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let amount = bytes / 1024;
    let index = 0;
    while (amount >= 1024 && index < units.length - 1) {
      amount /= 1024;
      index += 1;
    }
    return `${amount >= 10 ? amount.toFixed(1) : amount.toFixed(2)} ${units[index]}`;
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
    const lastKick = new WeakMap();

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
      if (!isElement(root)) return 0;
      if (provider === "twitter" && !Settings.get("twitter.expandMore", true)) return 0;
      if (provider === "instagram" && !Settings.get("instagram.expandMore", true)) return 0;
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
        if (!isElement(root)) return;
        const now = performance.now();
        if (now - Number(lastKick.get(root) || 0) < 1_200) return;
        lastKick.set(root, now);
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
    if (!debugEnabled()) return;
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


  async function gmJson(url, options = {}) {
    const text = await gmText(url, options);
    try {
      return text ? JSON.parse(text) : {};
    } catch (error) {
      let host = "provider";
      try { host = new URL(String(url), location.href).hostname || host; } catch {}
      throw new Error(`Resposta JSON inválida de ${host}: ${String(error?.message || error)}`);
    }
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
        async onload(response) {
          const status = Number(response.status || 0);
          if (status < 200 || status >= 300) {
            reject(new Error(`HTTP ${status}`));
            return;
          }
          if (!isBlobLike(response.response)) {
            reject(new Error("Resposta não é Blob utilizável (inclusive cross-realm)."));
            return;
          }
          let localBlob;
          try {
            localBlob = await coerceLocalBlob(response.response);
          } catch (error) {
            reject(error);
            return;
          }
          resolve({
            blob: localBlob,
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
  // Official RodToaster integration.
  //
  // Source of truth: https://rod.migos.club/toaster/dist/toaster.js
  // We use only APIs that the official toaster exposes: configure(), scope(),
  // loading(), info(), success(), warning(), error(), confirm(), select(),
  // picker(), multiLoading(), task(), promise(), update() and dismiss(). RodToaster v4.7+
  // accepts real images as icons, native media picker and multi-item task loading. No custom
  // visual toaster fallback.
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

    const required = [
      "loading",
      "info",
      "success",
      "warning",
      "error",
      "confirm",
      "select",
      "multiLoading",
      "configure",
    ];

    for (const entry of entries) {
      const candidate = entry.value;
      if (
        typeof candidate === "function" &&
        required.every((method) => typeof candidate?.[method] === "function")
      ) {
        return { api: candidate, source: entry.source, diagnostics: [] };
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
            return Reflect.ownKeys(value).map(String).slice(0, 120);
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

    // There is intentionally no visual replacement for RodToaster. The media
    // pipeline remains alive if @require fails, but notifications become no-op.
    if (!raw) {
      warn("RodToaster oficial não foi encontrado.", resolved.diagnostics || []);

      const noopTask = Object.freeze({
        update() { return noopTask; },
        setProgress() { return noopTask; },
        success() { return noopTask; },
        error() { return noopTask; },
        info() { return noopTask; },
        warning() { return noopTask; },
        dismiss() {},
      });

      return Object.freeze({
        raw: null,
        scope: null,
        source: resolved.source,
        version: null,
        available: false,
        canConfirm: false,
        canSelect: false,
        canPicker: false,
        canPrompt: false,
        canMultiLoading: false,
        loading() { return noopTask; },
        multiLoading() { return null; },
        task() { return null; },
        promise(input) { return Promise.resolve(typeof input === "function" ? input({}) : input); },
        info() { return null; },
        success() { return null; },
        warning() { return null; },
        error() { return null; },
        debug() { return null; },
        async confirm() { return false; },
        async select() { return null; },
        async picker() { return null; },
        async prompt() { return null; },
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
      raw.configure({
        position: "top-center",
        maxToasts: 20,
        duration: 15_000,
        dedupe: true,
        dedupeWindow: 900,
        pauseOnInteraction: true,
        stacked: true,
        stackVisible: 3,
        stackToolbar: true,
        swipeToDismiss: true,
        persistAcrossSpaNavigation: true,
        minimizeOnSpaNavigation: false,
        size: "compact",
        shouldDebug: debugEnabled(),
        showPrototype: false,
        showNonEnumerable: false,
      });
    } catch (error) {
      warn("RodToaster.configure() falhou; mantendo a configuração oficial atual.", error);
    }

    const scoped = typeof raw.scope === "function"
      ? raw.scope("aio-downloader", {
          dedupe: false,
          pauseOnInteraction: true,
          dismissible: true,
        })
      : raw;

    const call = (method, ...args) => {
      const fn = scoped?.[method];
      if (typeof fn !== "function") return null;
      try {
        return fn.apply(scoped, args);
      } catch (error) {
        warn(`RodToaster.${method}() falhou`, error);
        return null;
      }
    };

    const semantic = (method, payload, options = {}) => {
      const hasOptions = options && typeof options === "object" && Object.keys(options).length > 0;
      if (payload && typeof payload === "object" && !(payload instanceof Error)) {
        return call(method, { ...payload, ...(hasOptions ? options : {}) });
      }
      if (hasOptions) {
        try {
          return call(method, payload, typeof raw.options === "function" ? raw.options(options) : options);
        } catch {}
      }
      return call(method, payload);
    };

    log("RodToaster oficial conectado", {
      source: resolved.source,
      version: raw.version || null,
      scoped: scoped !== raw,
      methods: {
        loading: typeof scoped?.loading,
        confirm: typeof scoped?.confirm,
        select: typeof scoped?.select,
        picker: typeof scoped?.picker,
        task: typeof scoped?.task,
        promise: typeof scoped?.promise,
        group: typeof scoped?.group,
        multiLoading: typeof scoped?.multiLoading,
      },
    });

    return Object.freeze({
      raw,
      scope: scoped,
      source: resolved.source,
      version: raw.version || null,
      available: true,
      canConfirm: typeof scoped?.confirm === "function",
      canSelect: typeof scoped?.select === "function",
      canPicker: typeof scoped?.picker === "function",
      canPrompt: typeof scoped?.prompt === "function",
      canMultiLoading: typeof scoped?.multiLoading === "function",

      loading(descriptor = {}) {
        return call("loading", descriptor);
      },

      multiLoading(descriptor = {}) {
        return call("multiLoading", descriptor);
      },

      task(descriptor = {}) {
        return call("task", descriptor);
      },

      promise(input, descriptor = {}) {
        const fn = scoped?.promise;
        if (typeof fn === "function") {
          return fn.call(scoped, input, descriptor);
        }
        return Promise.resolve(typeof input === "function" ? input({}) : input);
      },

      info(payload, options = {}) {
        return semantic("info", payload, options);
      },

      success(payload, options = {}) {
        return semantic("success", payload, options);
      },

      warning(payload, options = {}) {
        return semantic("warning", payload, options);
      },

      error(payload, options = {}) {
        return semantic("error", payload, options);
      },

      debug(payload, options = {}) {
        if (!debugEnabled()) return null;
        if (typeof scoped?.debug === "function") return semantic("debug", payload, options);
        return semantic("info", payload, options);
      },

      async confirm(descriptor = {}) {
        if (typeof scoped?.confirm !== "function") return false;
        try {
          return await scoped.confirm(descriptor);
        } catch (error) {
          warn("RodToaster.confirm() falhou", error);
          return false;
        }
      },

      async select(descriptor = {}) {
        if (typeof scoped?.select !== "function") return null;
        try {
          return await scoped.select(descriptor);
        } catch (error) {
          warn("RodToaster.select() falhou", error);
          return null;
        }
      },

      async picker(descriptor = {}) {
        if (typeof scoped?.picker !== "function") return null;
        try {
          return await scoped.picker(descriptor);
        } catch (error) {
          warn("RodToaster.picker() falhou", error);
          return null;
        }
      },

      async prompt(descriptor = {}) {
        if (typeof scoped?.prompt !== "function") return null;
        try {
          return await scoped.prompt(descriptor);
        } catch (error) {
          warn("RodToaster.prompt() falhou", error);
          return null;
        }
      },

      diagnostics() {
        return {
          available: true,
          source: resolved.source,
          version: raw.version || null,
          scoped: scoped !== raw,
          canConfirm: typeof scoped?.confirm === "function",
          canSelect: typeof scoped?.select === "function",
          canPicker: typeof scoped?.picker === "function",
          canPrompt: typeof scoped?.prompt === "function",
          canMultiLoading: typeof scoped?.multiLoading === "function",
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

  function touchBoundedMap(map, key, value, limit = 200) {
    if (!(map instanceof Map)) return value;
    if (map.has(key)) map.delete(key);
    map.set(key, value);
    const cap = Math.max(1, Number(limit) || 200);
    while (map.size > cap) {
      const oldest = map.keys().next().value;
      if (oldest === undefined) break;
      map.delete(oldest);
    }
    return value;
  }

  function pruneExpiredMap(map, maxAgeMs, now = Date.now()) {
    if (!(map instanceof Map)) return 0;
    let removed = 0;
    for (const [key, value] of map) {
      const at = Number(value?.at ?? value ?? 0);
      if (!at || now - at <= maxAgeMs) continue;
      map.delete(key);
      removed += 1;
    }
    return removed;
  }

  const ResourcePerformanceCache = (() => {
    const records = new Map();
    let installed = false;
    let observer = null;
    let observed = 0;

    function rememberEntry(entry) {
      const url = String(entry?.name || "");
      if (!/^https?:/i.test(url)) return;
      observed += 1;
      touchBoundedMap(
        records,
        url,
        { url, at: performance.now(), initiatorType: String(entry?.initiatorType || "") },
        CONFIG.providers.performanceRecordLimit,
      );
    }

    function install() {
      if (installed) return;
      installed = true;
      try {
        for (const entry of performance?.getEntriesByType?.("resource") || []) rememberEntry(entry);
      } catch {}
      try {
        if (typeof PerformanceObserver === "function") {
          observer = new PerformanceObserver((list) => {
            try { list.getEntries().forEach(rememberEntry); } catch {}
          });
          try { observer.observe({ type: "resource", buffered: true }); }
          catch { observer.observe({ entryTypes: ["resource"] }); }
        }
      } catch (error) {
        debug("PerformanceObserver indisponível", error);
      }
    }

    function values(filter = null) {
      install();
      const output = [];
      for (const record of records.values()) {
        if (!filter || filter.test(record.url)) output.push(record.url);
      }
      return output;
    }

    function diagnostics() {
      return { installed, observer: Boolean(observer), records: records.size, observed };
    }

    return Object.freeze({ install, rememberEntry, values, diagnostics });
  })();

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
      return ResourcePerformanceCache.values(filter);
    },

    visibleRect(element, checkStyle = true) {
      if (!isElement(element) || !element.isConnected) return null;

      // Geometry is cheaper than forcing style resolution. Reject offscreen/tiny
      // nodes first and only inspect computed style for callers that need strict
      // visibility semantics. UI positioning already has IntersectionObserver
      // state, so it can opt out of the style read on hot scroll frames.
      let rect;
      try {
        rect = element.getBoundingClientRect();
      } catch {
        return null;
      }

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

      if (checkStyle !== false) {
        try {
          const style = getComputedStyle(element);
          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            Number(style.opacity) <= 0.01
          ) {
            return null;
          }
        } catch {
          return null;
        }
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
  // Twitter/X direct video resolver (Twirrl / TVDL provider)
  // ---------------------------------------------------------------------------

  const TwitterDirectResolver = (() => {
    const cache = new Map();
    const inFlight = new Map();
    let requests = 0;
    let successes = 0;
    let failures = 0;

    function enabled() {
      return Boolean(CONFIG.twitter.twirrl.enabled && Settings.get("twitter.twirrlResolver", true));
    }

    function canonicalTweetUrl(context) {
      const explicit = String(context?.pageUrl || "").trim();
      if (/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[^?#]+\/status\/\d+/i.test(explicit)) {
        return explicit.split("#")[0];
      }
      const statusId = String(context?.metadata?.statusId || "").match(/\d+/)?.[0];
      return statusId ? `https://x.com/i/status/${statusId}` : explicit;
    }

    function resolution(url) {
      const match = String(url || "").match(/\/(\d+)x(\d+)\//);
      const width = Number(match?.[1] || 0);
      const height = Number(match?.[2] || 0);
      return { width, height, pixels: width * height };
    }

    function extractVariantGroups(data) {
      const source = Array.isArray(data?.d?.i) ? data.d.i : [];
      const groups = [];
      source.forEach((item, mediaIndex) => {
        if (!item || typeof item !== "object") return;
        const variants = [];
        const seen = new Set();
        for (const value of Object.values(item)) {
          if (!value || typeof value !== "object" || typeof value.u !== "string") continue;
          const url = String(value.u).trim().replace(/&amp;/gi, "&");
          if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
          seen.add(url);
          const size = resolution(url);
          variants.push({ url, width: size.width, height: size.height, pixels: size.pixels, raw: value });
        }
        variants.sort((left, right) =>
          Number(right.pixels || 0) - Number(left.pixels || 0) ||
          Number(right.height || 0) - Number(left.height || 0) ||
          Number(right.width || 0) - Number(left.width || 0)
        );
        if (variants.length) groups.push({ mediaIndex, variants, best: variants[0] });
      });
      return groups;
    }

    function extractVariants(data) {
      return extractVariantGroups(data)
        .flatMap((group) => group.variants)
        .sort((left, right) => Number(right.pixels || 0) - Number(left.pixels || 0));
    }

    function posterFromContext(context) {
      const root = isElement(context?.root) ? context.root : null;
      const target = context?.target;
      const videos = [
        ...(isVideoElement(target) ? [target] : []),
        ...((root?.querySelectorAll?.("video") || [])),
      ];
      for (const video of videos) {
        const poster = String(video?.poster || video?.getAttribute?.("poster") || "").trim();
        if (/^(?:https?:|blob:|data:image\/)/i.test(poster)) return poster;
      }
      return "";
    }

    async function fetchGroups(context, force = false) {
      if (!enabled()) return [];
      const tweetUrl = canonicalTweetUrl(context);
      if (!tweetUrl || !/\/status\/\d+/i.test(tweetUrl)) return [];
      const key = String(context?.metadata?.statusId || tweetUrl);
      const now = Date.now();
      const cached = cache.get(key);
      if (!force && cached && now - cached.at < CONFIG.twitter.twirrl.cacheTtlMs) {
        touchBoundedMap(cache, key, cached, CONFIG.providers.twirrlCacheLimit);
        return cached.groups;
      }
      if (cached) cache.delete(key);
      if (!force && inFlight.has(key)) return inFlight.get(key);

      const operation = (async () => {
        requests += 1;
        try {
          const data = await gmJson(CONFIG.twitter.twirrl.endpoint, {
            method: "POST",
            timeout: CONFIG.twitter.twirrl.timeout,
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
            },
            data: JSON.stringify({
              u: tweetUrl,
              o: CONFIG.twitter.twirrl.operatingSystem,
              v: CONFIG.twitter.twirrl.versionToken,
            }),
          });
          const groups = extractVariantGroups(data);
          if (!groups.length) {
            throw new Error(String(data?.error || data?.message || "Twirrl não retornou variantes de vídeo."));
          }
          successes += 1;
          touchBoundedMap(cache, key, { at: Date.now(), groups }, CONFIG.providers.twirrlCacheLimit);
          debug("Twirrl resolveu vídeo(s) do X/Twitter", {
            tweetUrl,
            groups: groups.map((group) => ({
              mediaIndex: group.mediaIndex,
              variants: group.variants.map(({ url, width, height }) => ({ url, width, height })),
            })),
          });
          return groups;
        } catch (error) {
          failures += 1;
          debug("Twirrl falhou; mantendo fallbacks locais do X/Twitter", error);
          return [];
        } finally {
          inFlight.delete(key);
        }
      })();
      inFlight.set(key, operation);
      return operation;
    }

    async function fetchVariants(context, force = false) {
      const groups = await fetchGroups(context, force);
      return groups.flatMap((group) => group.variants);
    }

    function applyVariant(currentItem, selected, context) {
      const poster = posterFromContext(context);
      return {
        ...currentItem,
        kind: MEDIA_KIND.video,
        url: selected.url,
        directUrl: selected.url,
        poster: currentItem?.poster || poster || undefined,
        thumbnail: currentItem?.thumbnail || poster || undefined,
        width: selected.width || currentItem?.width || null,
        height: selected.height || currentItem?.height || null,
        score: Math.max(Number(currentItem?.score || 0), 50_000 + Number(selected.pixels || 0)),
        source: "twirrl-twitter",
        resolverProvider: "twirrl-twitter",
        resolvedByTwirrl: true,
      };
    }

    async function resolveItems(context, items = [], force = false) {
      const groups = await fetchGroups(context, force);
      if (!groups.length) return Media.dedupeItems(items || []);
      const source = [...(items || [])];
      const usedGroups = new Set();
      let videoSlot = 0;
      const resolved = source.map((item) => {
        if (item?.kind !== MEDIA_KIND.video) return item;
        const order = Number(item?.order);
        let group = Number.isInteger(order)
          ? groups.find((candidate) => Number(candidate.mediaIndex) === order && !usedGroups.has(candidate.mediaIndex))
          : null;
        if (!group) {
          group = groups.find((candidate) => !usedGroups.has(candidate.mediaIndex)) || groups[Math.min(videoSlot, groups.length - 1)];
        }
        videoSlot += 1;
        if (group) usedGroups.add(group.mediaIndex);
        return group?.best ? applyVariant(item, group.best, context) : item;
      });
      if (!source.some((item) => item?.kind === MEDIA_KIND.video)) {
        for (const group of groups) {
          if (group?.best) resolved.push(applyVariant({ order: group.mediaIndex }, group.best, context));
        }
      }
      return Media.dedupeItems(resolved).sort((a, b) => {
        const ao = Number.isFinite(Number(a?.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
        const bo = Number.isFinite(Number(b?.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
        return ao - bo;
      });
    }

    async function item(context, currentItem = null, force = false) {
      const groups = await fetchGroups(context, force);
      const order = Number(currentItem?.order);
      const group = Number.isInteger(order)
        ? groups.find((candidate) => Number(candidate.mediaIndex) === order) || groups[0]
        : groups[0];
      const selected = group?.best;
      return selected ? applyVariant(currentItem || {}, selected, context) : null;
    }

    function diagnostics() {
      return {
        enabled: enabled(),
        endpoint: CONFIG.twitter.twirrl.endpoint,
        cacheEntries: cache.size,
        inFlight: inFlight.size,
        requests,
        successes,
        failures,
      };
    }

    return Object.freeze({ enabled, fetchGroups, fetchVariants, resolveItems, item, diagnostics });
  })();

  // ---------------------------------------------------------------------------
  // Media previews for RodToaster v4.7+
  // ---------------------------------------------------------------------------

  const MediaToast = Object.freeze({
    imageSource(value) {
      const source = String(value || "").trim();
      if (!source) return "";
      return /^(?:https?:|blob:|data:image\/)/i.test(source) ? source : "";
    },

    previewFromItem(item) {
      if (!item || typeof item !== "object") return "";
      const values = [
        item.previewUrl,
        item.preview,
        item.poster,
        item.thumbnail,
        item.thumbnailUrl,
      ];
      if (item.kind === MEDIA_KIND.photo) values.push(item.url);
      for (const value of values) {
        const source = this.imageSource(value);
        if (source) return source;
      }
      return "";
    },

    visibleImageFromRoot(context) {
      const root = isElement(context?.root)
        ? context.root
        : isElement(context?.target)
          ? context.target.closest?.("article,[role='dialog'],main") || context.target.parentElement
          : null;
      if (!isElement(root)) return "";

      const provider = context?.providerId || "";
      const candidates = [...(root.querySelectorAll?.("img") || [])]
        .filter((image) => {
          if (!isImageElement(image)) return false;
          if (provider === "instagram" || provider === "twitter") {
            return Media.imageLooksLikeContent(image, provider);
          }
          return Boolean(Media.visibleRect(image));
        })
        .sort((left, right) => Media.visibleScore(right) - Media.visibleScore(left));

      return candidates.length ? Media.imageUrlFromElement(candidates[0]) : "";
    },

    previewSync(context, items = []) {
      for (const item of items || []) {
        const source = this.previewFromItem(item);
        if (source) return source;
      }

      const metadata = context?.metadata || {};
      for (const value of [
        metadata.previewUrl,
        metadata.thumbnailUrl,
        metadata.thumbnail,
        metadata.poster,
        context?.previewUrl,
        context?.thumbnailUrl,
        context?.poster,
      ]) {
        const source = this.imageSource(value);
        if (source) return source;
      }

      const target = context?.target;
      if (isImageElement(target)) {
        const source = this.imageSource(Media.imageUrlFromElement(target));
        if (source) return source;
      }
      if (isVideoElement(target)) {
        const source = this.imageSource(
          target.poster || target.getAttribute?.("poster") || "",
        );
        if (source) return source;
      }

      if (isElement(context?.root)) {
        for (const video of context.root.querySelectorAll?.("video[poster]") || []) {
          const source = this.imageSource(video.poster || video.getAttribute?.("poster"));
          if (source) return source;
        }
      }

      return this.visibleImageFromRoot(context);
    },

    async captureVideoFrame(context) {
      const target = isVideoElement(context?.target)
        ? context.target
        : isElement(context?.root)
          ? [...(context.root.querySelectorAll?.("video") || [])]
              .filter((video) => Media.visibleRect(video))
              .sort((left, right) => Media.visibleScore(right) - Media.visibleScore(left))[0]
          : null;

      if (!isVideoElement(target)) return "";
      const width = Number(target.videoWidth || 0);
      const height = Number(target.videoHeight || 0);
      if (width < 2 || height < 2 || Number(target.readyState || 0) < 2) return "";

      try {
        const maxSide = 220;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return "";
        ctx.drawImage(target, 0, 0, canvas.width, canvas.height);
        return this.imageSource(canvas.toDataURL("image/jpeg", 0.76));
      } catch {
        return "";
      }
    },

    async preview(context, items = []) {
      return this.previewSync(context, items) || (await this.captureVideoFrame(context));
    },

    descriptor(source, alt = "Media preview") {
      const src = this.imageSource(source);
      if (!src) return null;
      return {
        src,
        alt: String(alt || "Media preview"),
        fit: "cover",
        objectPosition: "center",
        decoding: "async",
        loading: "eager",
      };
    },

    placeholder(context, items = []) {
      const first = items?.[0] || null;
      const kind = first?.kind ||
        (isVideoElement(context?.target) ? MEDIA_KIND.video :
          isImageElement(context?.target) ? MEDIA_KIND.photo : MEDIA_KIND.video);
      const glyph = kind === MEDIA_KIND.photo ? "▧" : kind === MEDIA_KIND.audio ? "♪" : "▶";
      const provider = String(context?.providerId || "AIO")
        .replace(/[^a-z0-9]/gi, " ")
        .trim()
        .slice(0, 12)
        .toUpperCase() || "AIO";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#111318"/><circle cx="64" cy="54" r="31" fill="#20242c" stroke="#ffffff" stroke-opacity=".18"/><text x="64" y="68" text-anchor="middle" fill="#f8fafc" font-size="34" font-family="system-ui,sans-serif">${glyph}</text><text x="64" y="108" text-anchor="middle" fill="#cbd5e1" font-size="12" font-weight="700" font-family="system-ui,sans-serif">${provider}</text></svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    },

    descriptorSync(context, items = [], fallback = "image") {
      const alt = context?.title || context?.providerId || "Media preview";
      return this.descriptor(this.previewSync(context, items), alt) ||
        this.descriptor(this.placeholder(context, items), alt) ||
        fallback;
    },

    async icon(context, items = [], fallback = "image") {
      const alt = context?.title || context?.providerId || "Media preview";
      return this.descriptor(await this.preview(context, items), alt) ||
        this.descriptor(this.placeholder(context, items), alt) ||
        fallback;
    },
  });

  // ---------------------------------------------------------------------------
  // Universal network + player interception. Restored from the pre-social-only
  // AIO architecture, with a broader player surface and bounded caches.
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Unified network broker.
  //
  // Exactly one fetch wrapper and one XHR open/send wrapper are installed.
  // Consumers subscribe with cheap URL predicates. Response bodies are cloned
  // at most once and only when at least one active consumer requests them.
  // ---------------------------------------------------------------------------

  const NetworkBroker = (() => {
    const subscribers = new Map();
    let installed = false;
    let sequence = 0;
    const counters = {
      fetch: 0,
      xhr: 0,
      responseBodies: 0,
      responseBodyBytes: 0,
      subscriberErrors: 0,
    };

    const nextId = () => `net-${++sequence}`;

    function subscribe(id, descriptor = {}) {
      const key = String(id || `subscriber-${subscribers.size + 1}`);
      subscribers.set(key, { ...descriptor, id: key });
      return () => subscribers.delete(key);
    }

    function activeSubscribers(event, phase) {
      const result = [];
      for (const subscriber of subscribers.values()) {
        try {
          if (typeof subscriber.enabled === "function" && !subscriber.enabled(event)) continue;
          const predicate = phase === "request" ? subscriber.matchRequest : subscriber.matchResponse;
          if (typeof predicate === "function" && !predicate(event)) continue;
          result.push(subscriber);
        } catch (error) {
          counters.subscriberErrors += 1;
          debug(`NetworkBroker predicate ${subscriber.id}`, error);
        }
      }
      return result;
    }

    function dispatchRequest(event) {
      for (const subscriber of activeSubscribers(event, "request")) {
        if (typeof subscriber.onRequest !== "function") continue;
        try { void Promise.resolve(subscriber.onRequest(event)).catch((error) => debug(`NetworkBroker request ${subscriber.id}`, error)); }
        catch (error) { counters.subscriberErrors += 1; debug(`NetworkBroker request ${subscriber.id}`, error); }
      }
    }

    async function dispatchResponse(event, response = null) {
      const active = activeSubscribers(event, "response");
      if (!active.length) return;

      const bodyConsumers = active.filter((subscriber) => {
        try { return typeof subscriber.wantsBody === "function" ? Boolean(subscriber.wantsBody(event)) : false; }
        catch { return false; }
      });

      let text = null;
      let json = null;
      let bodyError = null;

      if (bodyConsumers.length) {
        const contentLength = Number(event.contentLength || 0);
        const maxBody = 2_500_000;
        if (!contentLength || contentLength <= maxBody) {
          try {
            if (event.transport === "fetch" && response?.clone) {
              text = await response.clone().text();
            } else if (event.transport === "xhr") {
              if (event.responseType === "json") {
                json = event.response ?? null;
                try { text = json == null ? "" : JSON.stringify(json); } catch { text = ""; }
              } else if (event.responseType === "" || event.responseType === "text") {
                text = String(event.responseText || "");
              }
            }
            if (typeof text === "string") {
              counters.responseBodies += 1;
              counters.responseBodyBytes += text.length;
              if (text.length <= maxBody && (/json/i.test(event.contentType) || /^[\s\r\n]*[\[{]/.test(text))) {
                try { json = JSON.parse(text); } catch {}
              }
            }
          } catch (error) {
            bodyError = error;
          }
        }
      }

      const payload = { ...event, text, json, bodyError };
      for (const subscriber of active) {
        if (typeof subscriber.onResponse !== "function") continue;
        try { void Promise.resolve(subscriber.onResponse(payload)).catch((error) => debug(`NetworkBroker response ${subscriber.id}`, error)); }
        catch (error) { counters.subscriberErrors += 1; debug(`NetworkBroker response ${subscriber.id}`, error); }
      }
    }

    function requestBodyReader(input, init) {
      let cache = undefined;
      return async () => {
        if (cache !== undefined) return cache;
        if (init?.body != null) {
          cache = init.body;
          return cache;
        }
        try {
          if (input && typeof input.clone === "function") {
            cache = await input.clone().text();
            return cache;
          }
        } catch {}
        cache = null;
        return cache;
      };
    }

    function install() {
      if (installed) return;
      installed = true;
      const root = pageWindow;
      const marker = "__aioNetworkBroker300";

      try {
        const originalFetch = root.fetch;
        if (typeof originalFetch === "function" && !originalFetch[marker]) {
          async function aioBrokerFetch(...args) {
            counters.fetch += 1;
            const requestId = nextId();
            const input = args?.[0];
            const init = args?.[1] || {};
            const url = typeof input === "string" ? input : String(input?.url || input?.href || "");
            const method = String(init?.method || input?.method || "GET").toUpperCase();
            const requestEvent = {
              requestId,
              transport: "fetch",
              url,
              method,
              input,
              init,
              getBody: requestBodyReader(input, init),
              at: performance.now(),
            };
            dispatchRequest(requestEvent);
            let response;
            try {
              response = await originalFetch.apply(this, args);
            } catch (error) {
              void dispatchResponse({
                ...requestEvent,
                requestUrl: url,
                status: 0,
                ok: false,
                contentType: "",
                contentLength: 0,
                error,
              }, null);
              throw error;
            }
            const contentType = String(response?.headers?.get?.("content-type") || "");
            const contentLength = Number(response?.headers?.get?.("content-length") || 0);
            void dispatchResponse({
              ...requestEvent,
              url: String(response?.url || url),
              requestUrl: url,
              status: Number(response?.status || 0),
              ok: response?.ok !== false,
              contentType,
              contentLength,
            }, response);
            return response;
          }
          Object.defineProperty(aioBrokerFetch, marker, { value: true });
          Object.defineProperty(aioBrokerFetch, "__aioOriginalFetch", { value: originalFetch });
          root.fetch = aioBrokerFetch;
        }
      } catch (error) {
        debug("NetworkBroker fetch install", error);
      }

      try {
        const proto = root.XMLHttpRequest?.prototype;
        if (!proto) return;
        const originalOpen = proto.open;
        const originalSend = proto.send;
        if (typeof originalOpen === "function" && !originalOpen[marker]) {
          function aioBrokerOpen(method, url, ...rest) {
            try {
              this.__aioBrokerRequest300 = {
                requestId: nextId(),
                transport: "xhr",
                method: String(method || "GET").toUpperCase(),
                url: String(url || ""),
                at: performance.now(),
              };
            } catch {}
            return originalOpen.call(this, method, url, ...rest);
          }
          Object.defineProperty(aioBrokerOpen, marker, { value: true });
          proto.open = aioBrokerOpen;
        }
        if (typeof originalSend === "function" && !originalSend[marker]) {
          function aioBrokerSend(body) {
            counters.xhr += 1;
            const requestEvent = this.__aioBrokerRequest300 || {
              requestId: nextId(), transport: "xhr", method: "GET", url: "", at: performance.now(),
            };
            requestEvent.rawBody = body;
            requestEvent.getBody = async () => body;
            dispatchRequest(requestEvent);
            try {
              this.addEventListener("loadend", function aioBrokerLoadEnd() {
                let contentType = "";
                let contentLength = 0;
                try { contentType = String(this.getResponseHeader?.("content-type") || ""); } catch {}
                try { contentLength = Number(this.getResponseHeader?.("content-length") || 0); } catch {}
                void dispatchResponse({
                  ...requestEvent,
                  url: String(this.responseURL || requestEvent.url || ""),
                  requestUrl: requestEvent.url,
                  status: Number(this.status || 0),
                  ok: Number(this.status || 0) >= 200 && Number(this.status || 0) < 400,
                  contentType,
                  contentLength,
                  responseType: String(this.responseType || ""),
                  response: this.response,
                  responseText: (() => { try { return this.responseText; } catch { return ""; } })(),
                });
              }, { once: true });
            } catch {}
            return originalSend.call(this, body);
          }
          Object.defineProperty(aioBrokerSend, marker, { value: true });
          proto.send = aioBrokerSend;
        }
      } catch (error) {
        debug("NetworkBroker XHR install", error);
      }
    }

    function diagnostics() {
      return { installed, subscribers: [...subscribers.keys()], ...counters };
    }

    return Object.freeze({ install, subscribe, diagnostics });
  })();

  NetworkBroker.install();

  const GlobalMediaCapture = (() => {
    const records = new Map();
    let installed = false;

    function remember(url, source = "network") {
      if (!Settings.get("general.universalPlayers", true) || !Settings.get("players.interceptNetwork", true)) return;
      const value = String(url || "").replace(/\\u0026/g, "&").replace(/\\\//g, "/");
      if (!Media.isLikelyMediaUrl(value)) return;
      touchBoundedMap(
        records,
        value,
        { url: value, source, at: performance.now() },
        CONFIG.providers.networkRecordLimit,
      );
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
      if (!Settings.get("general.universalPlayers", true) || !Settings.get("players.interceptNetwork", true)) return [];
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
      if (installed) return;
      installed = true;
      NetworkBroker.subscribe("global-media-capture", {
        enabled: () => Settings.get("general.universalPlayers", true) && Settings.get("players.interceptNetwork", true),
        onRequest(event) {
          remember(event.url, `${event.transport}-request`);
        },
        matchResponse: () => true,
        wantsBody(event) {
          const type = String(event.contentType || "");
          if (!/json|text|javascript/i.test(type)) return false;
          const length = Math.max(0, Number(event.contentLength || 0));
          if (length > 1_000_000) return false;
          const url = String(event.requestUrl || event.url || "");
          // Direct media request/response URLs are remembered without reading
          // bodies. Deep body inspection is reserved for endpoints likely to
          // carry media manifests/metadata. Provider-specific subscribers can
          // still request the same body, and NetworkBroker clones it only once.
          return /(?:graphql|\/api\/|ajax|feed|media|video|audio|player|stream|manifest|playlist|source|embed|watch|download|\.json(?:$|[?#]))/i.test(url);
        },
        onResponse(event) {
          remember(event.url, `${event.transport}-response-url`);
          if (event.json && typeof event.json === "object") inspectValue(event.json, `${event.transport}-json`);
          else if (event.text) inspectText(event.text, `${event.transport}-text`);
        },
      });
    }

    return Object.freeze({
      install,
      remember,
      inspectValue,
      candidates,
      diagnostics: () => ({ installed, records: records.size, broker: true }),
    });
  })();

  class PlayerInterceptorService {
    targetRecords = new WeakMap();
    globalRecords = new Map();
    installed = false;

    remember(url, player, target = null) {
      if (!Settings.get("general.universalPlayers", true) || !Settings.get("players.interceptPlayers", true)) return;
      if (!Media.isLikelyMediaUrl(url)) return;
      const value = String(url);
      const record = { url: value, player: String(player || "player"), at: performance.now() };
      touchBoundedMap(this.globalRecords, `${record.player}|${value}`, record, 480);
      GlobalMediaCapture.remember(value, `player:${record.player}`);
      if (isMediaElement(target)) {
        const bucket = this.targetRecords.get(target) || new Map();
        touchBoundedMap(bucket, `${record.player}|${value}`, record, 48);
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
        if (typeof original !== "function" || original.__aioPlayerSource300) continue;
        const interceptor = this;
        function wrapped(...args) {
          try { interceptor.collect(args).forEach((url) => interceptor.remember(url, `${player}.${methodName}()`, interceptor.media(this) || target)); } catch {}
          return original.apply(this, args);
        }
        Object.defineProperty(wrapped, "__aioPlayerSource300", { value: true });
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
      if (!Settings.get("general.universalPlayers", true) || !Settings.get("players.interceptPlayers", true)) return;
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
      if (!Settings.get("general.universalPlayers", true) || !Settings.get("players.interceptPlayers", true)) return [];
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
      if (!Settings.get("general.universalPlayers", true) || !Settings.get("players.interceptPlayers", true)) return [];
      this.scan();
      const now = performance.now();
      const exact = [...(this.targetRecords.get(target)?.values() || [])]
        .filter((record) => now - record.at <= CONFIG.providers.playerWindowMs);
      const global = [...this.globalRecords.values()]
        .filter((record) => now - record.at <= Math.min(CONFIG.providers.playerWindowMs, 45_000));
      return [...new Set([...exact, ...global].sort((a, b) => b.at - a.at).map((record) => record.url))];
    }

    install() {
      if (this.installed) return;
      this.installed = true;
      // v3 is lazy/event-driven. Full player introspection runs only when a
      // target asks for candidates or a dirty media root is scanned.
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

  const ReactObjectCache = new WeakMap();

  function reactObjects(element, options = {}) {
    if (!isElement(element)) return [];
    const now = performance.now();
    const cached = ReactObjectCache.get(element);
    if (!options.force && cached && now - cached.at < 1_500) return cached.objects;

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

    ReactObjectCache.set(element, { at: now, objects });
    return objects;
  }

  // ---------------------------------------------------------------------------
  // Durable Saved / Bookmarks media archive.
  //
  // Virtualized timelines recycle DOM nodes aggressively. This archive stores
  // only compact metadata and direct media URLs in IndexedDB, never media
  // bytes. Network capture can enrich a record after its DOM card disappeared.
  // ---------------------------------------------------------------------------

  const SavedMediaArchive = (() => {
    const DB_VERSION = 2;
    const COMPOUND_INDEX = "providerLastSeen";
    const memory = new Map();
    const listeners = new Set();
    const pendingWrites = new Map();
    const loadedProviders = new Set();
    let dbPromise = null;
    let flushTimer = 0;
    let retryTimer = 0;
    let writes = 0;
    let reads = 0;
    let pruned = 0;
    let networkCaptures = 0;
    let domCaptures = 0;
    let failures = 0;
    let retries = 0;

    function activeProvider() {
      if (!Settings.get("savedSync.enabled", true) || !Settings.get("savedSync.persistSeen", true)) return null;
      if (IS_TWITTER && /^\/(?:i\/bookmarks|bookmarks)(?:\/|$)/i.test(location.pathname)) return "twitter";
      if (IS_INSTAGRAM && (/(?:^|\/)saved(?:\/|$)/i.test(location.pathname) || /\/your_activity\/interactions\/saved(?:\/|$)/i.test(location.pathname))) return "instagram";
      return null;
    }

    function isActiveProvider(provider) {
      return activeProvider() === String(provider || "").toLowerCase();
    }

    function defaultPostUrl(provider, mediaId) {
      const id = encodeURIComponent(String(mediaId || ""));
      if (provider === "twitter") return `https://x.com/i/status/${id}`;
      if (provider === "instagram") return `https://www.instagram.com/p/${id}/`;
      return location.href;
    }

    function mediaIdentity(item, index = 0) {
      const order = Number.isInteger(Number(item?.order)) ? Number(item.order) : index;
      return `${order}:${String(item?.kind || "media")}`;
    }

    function normalizeMedia(provider, item, index = 0) {
      if (!item?.url) return null;
      const kind = item.kind === MEDIA_KIND.video ? MEDIA_KIND.video : item.kind === MEDIA_KIND.audio ? MEDIA_KIND.audio : MEDIA_KIND.photo;
      let url = String(item.url || "");
      if (!/^https?:/i.test(url)) return null;
      if (provider === "twitter" && kind === MEDIA_KIND.photo) url = Media.normalizeTwitterPhoto(url);
      return {
        kind,
        url,
        previewUrl: String(item.previewUrl || item.thumbnail || ""),
        caption: PayloadSanitizer.cleanText(item.caption || "", { maxLength: 32_000 }),
        order: Number.isInteger(Number(item.order)) ? Number(item.order) : index,
        score: Math.max(0, Number(item.score || 0)),
        capturedAt: Number(item.capturedAt || Date.now()),
        source: String(item.source || "capture"),
      };
    }

    function mergeMedia(provider, previous = [], incoming = []) {
      const slots = new Map();
      const all = [...(Array.isArray(previous) ? previous : []), ...(Array.isArray(incoming) ? incoming : [])];
      all.forEach((raw, index) => {
        const item = normalizeMedia(provider, raw, index);
        if (!item) return;
        const key = mediaIdentity(item, index);
        const old = slots.get(key);
        if (!old) { slots.set(key, item); return; }
        const prefer =
          (!/^https?:/i.test(old.url) && /^https?:/i.test(item.url)) ||
          (item.kind === MEDIA_KIND.video && old.kind !== MEDIA_KIND.video) ||
          (item.kind === old.kind && Number(item.score || 0) > Number(old.score || 0)) ||
          (item.kind === old.kind && Number(item.score || 0) === Number(old.score || 0) && Number(item.capturedAt || 0) > Number(old.capturedAt || 0));
        if (prefer) slots.set(key, { ...old, ...item });
        else if (!old.caption && item.caption) slots.set(key, { ...old, caption: item.caption });
      });
      return [...slots.values()].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    }

    function normalizeCaptionState(record) {
      const caption = PayloadSanitizer.cleanText(record?.caption || "").trim();
      const explicit = String(record?.captionLookupState || "").toLowerCase();
      if (caption) return explicit === "full" ? "full" : "captured";
      if (["absent", "failed"].includes(explicit)) return explicit;
      return "unknown";
    }

    function compact(record) {
      if (!record?.key) return null;
      const caption = PayloadSanitizer.cleanText(record.caption || "", { maxLength: 32_000 });
      return {
        key: String(record.key),
        provider: String(record.provider || "generic"),
        mediaId: String(record.mediaId || ""),
        url: String(record.url || ""),
        kind: record.kind === MEDIA_KIND.video ? MEDIA_KIND.video : record.kind === MEDIA_KIND.audio ? MEDIA_KIND.audio : MEDIA_KIND.photo,
        title: PayloadSanitizer.cleanText(record.title || "", { maxLength: 240 }),
        caption,
        thumbnail: String(record.thumbnail || ""),
        media: mergeMedia(String(record.provider || "generic"), [], record.media || []),
        firstSeenAt: Number(record.firstSeenAt || Date.now()),
        lastSeenAt: Number(record.lastSeenAt || record.firstSeenAt || Date.now()),
        seenCount: Math.max(0, Number(record.seenCount ?? (record.domCaptured ? 1 : 0))),
        networkCaptured: Boolean(record.networkCaptured),
        domCaptured: Boolean(record.domCaptured),
        captionSource: String(record.captionSource || ""),
        captionLookupState: normalizeCaptionState({ ...record, caption }),
        captionLookupAt: Number(record.captionLookupAt || record.captionEnrichedAt || (caption ? Date.now() : 0)),
        captionEnriched: Boolean(caption),
        captionEnrichedAt: Number(record.captionEnrichedAt || (caption ? record.captionLookupAt || record.lastSeenAt || Date.now() : 0)),
        relayKnownBySignature: record.relayKnownBySignature && typeof record.relayKnownBySignature === "object" ? record.relayKnownBySignature : {},
      };
    }

    function mergeRecord(previous, patch) {
      const now = Date.now();
      const provider = String(patch?.provider || previous?.provider || "generic");
      const mediaId = String(patch?.mediaId || previous?.mediaId || "");
      const key = String(patch?.key || previous?.key || (mediaId ? `${provider}:${mediaId}` : ""));
      if (!key) return null;
      const caption = PayloadSanitizer.cleanText(patch?.caption || previous?.caption || "", { maxLength: 32_000 });
      const next = {
        ...(previous || {}),
        ...(patch || {}),
        key,
        provider,
        mediaId,
        url: String(patch?.url || previous?.url || defaultPostUrl(provider, mediaId)),
        title: PayloadSanitizer.cleanText(patch?.title || previous?.title || "", { maxLength: 240 }),
        caption,
        thumbnail: String(patch?.thumbnail || previous?.thumbnail || ""),
        kind: patch?.kind || previous?.kind || MEDIA_KIND.photo,
        media: mergeMedia(provider, previous?.media || [], patch?.media || []),
        firstSeenAt: Number(previous?.firstSeenAt || patch?.firstSeenAt || now),
        lastSeenAt: Number(patch?.lastSeenAt || previous?.lastSeenAt || now),
        seenCount: Math.max(0, Number(previous?.seenCount || 0) + (patch?.incrementSeen ? 1 : 0)),
        networkCaptured: Boolean(previous?.networkCaptured || patch?.networkCaptured),
        domCaptured: Boolean(previous?.domCaptured || patch?.domCaptured),
        captionSource: String(patch?.captionSource || previous?.captionSource || ""),
        captionLookupState: normalizeCaptionState({
          caption,
          captionLookupState: patch?.captionLookupState || previous?.captionLookupState,
        }),
        captionLookupAt: Math.max(Number(previous?.captionLookupAt || 0), Number(patch?.captionLookupAt || 0), patch?.caption ? now : 0),
        captionEnriched: Boolean(caption),
        captionEnrichedAt: Math.max(Number(previous?.captionEnrichedAt || 0), Number(patch?.captionEnrichedAt || 0), patch?.caption ? now : 0),
        relayKnownBySignature: {
          ...(previous?.relayKnownBySignature && typeof previous.relayKnownBySignature === "object" ? previous.relayKnownBySignature : {}),
          ...(patch?.relayKnownBySignature && typeof patch.relayKnownBySignature === "object" ? patch.relayKnownBySignature : {}),
        },
      };
      delete next.node;
      delete next.mediaNode;
      delete next.contextRoot;
      delete next.selected;
      delete next.failed;
      delete next.incrementSeen;
      if (!next.thumbnail) next.thumbnail = next.media.find((item) => item.previewUrl)?.previewUrl || next.media.find((item) => item.kind === MEDIA_KIND.photo)?.url || "";
      return compact(next);
    }

    function fingerprint(record) {
      if (!record) return "";
      return [
        record.url,
        record.kind,
        record.title,
        record.caption,
        record.thumbnail,
        record.captionLookupState,
        record.captionLookupAt,
        JSON.stringify(record.media || []),
        JSON.stringify(record.relayKnownBySignature || {}),
        Boolean(record.domCaptured),
        Boolean(record.networkCaptured),
      ].join("\u001f");
    }

    function notify(record) {
      for (const listener of listeners) {
        try { listener(record); } catch (error) { debug("SavedMediaArchive listener", error); }
      }
    }

    function resetDbPromise() {
      dbPromise = null;
    }

    function openDb() {
      if (dbPromise) return dbPromise;
      if (typeof indexedDB === "undefined") return Promise.resolve(null);
      dbPromise = new Promise((resolve) => {
        try {
          const request = indexedDB.open(CONFIG.savedSyncDbName, DB_VERSION);
          request.onupgradeneeded = () => {
            const db = request.result;
            let store;
            if (!db.objectStoreNames.contains(CONFIG.savedSyncDbStore)) {
              store = db.createObjectStore(CONFIG.savedSyncDbStore, { keyPath: "key" });
            } else {
              store = request.transaction.objectStore(CONFIG.savedSyncDbStore);
            }
            if (!store.indexNames.contains("provider")) store.createIndex("provider", "provider", { unique: false });
            if (!store.indexNames.contains("lastSeenAt")) store.createIndex("lastSeenAt", "lastSeenAt", { unique: false });
            if (!store.indexNames.contains(COMPOUND_INDEX)) store.createIndex(COMPOUND_INDEX, ["provider", "lastSeenAt"], { unique: false });
          };
          request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => { try { db.close(); } catch {} resetDbPromise(); loadedProviders.clear(); };
            resolve(db);
          };
          request.onerror = () => { failures += 1; resetDbPromise(); resolve(null); };
          request.onblocked = () => { failures += 1; resetDbPromise(); resolve(null); };
        } catch {
          failures += 1;
          resetDbPromise();
          resolve(null);
        }
      });
      return dbPromise;
    }

    function scheduleFlush(delay = 180) {
      if (flushTimer) return;
      flushTimer = window.setTimeout(() => { flushTimer = 0; void flush(); }, Math.max(40, delay));
    }

    async function flush() {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = 0; }
      if (!pendingWrites.size) return true;
      const snapshot = new Map(pendingWrites);
      const db = await openDb();
      if (!db) {
        failures += 1;
        retries += 1;
        scheduleFlush(Math.min(3_000, 250 * Math.max(1, retries)));
        return false;
      }
      const ok = await new Promise((resolve) => {
        try {
          const transaction = db.transaction(CONFIG.savedSyncDbStore, "readwrite");
          const store = transaction.objectStore(CONFIG.savedSyncDbStore);
          for (const record of snapshot.values()) store.put(record);
          transaction.oncomplete = () => resolve(true);
          transaction.onerror = () => resolve(false);
          transaction.onabort = () => resolve(false);
        } catch { resolve(false); }
      });
      if (ok) {
        for (const [key, value] of snapshot) if (pendingWrites.get(key) === value) pendingWrites.delete(key);
        writes += snapshot.size;
        retries = 0;
        return true;
      }
      failures += 1;
      retries += 1;
      scheduleFlush(Math.min(3_000, 300 * Math.max(1, retries)));
      return false;
    }

    function schedulePersist(record) {
      if (!Settings.get("savedSync.persistSeen", true) || !record?.key) return;
      pendingWrites.set(record.key, record);
      scheduleFlush(180);
    }

    function upsert(patch, source = "dom") {
      if (!patch?.key) return null;
      const key = String(patch.key);
      const previous = memory.get(key);
      const now = Date.now();
      const seenInterval = 4_000;
      const incrementSeen = source === "dom" && (!previous || now - Number(previous.lastSeenAt || 0) >= seenInterval);
      const next = mergeRecord(previous, {
        ...patch,
        incrementSeen,
        lastSeenAt: source === "dom" ? (incrementSeen ? now : Number(previous?.lastSeenAt || now)) : Number(patch.lastSeenAt || previous?.lastSeenAt || now),
        domCaptured: source === "dom" || patch.domCaptured,
        networkCaptured: source === "network" || patch.networkCaptured,
      });
      if (!next) return null;
      const changed = !previous || fingerprint(previous) !== fingerprint(next) || incrementSeen;
      memory.set(next.key, next);
      if (source === "network") networkCaptures += 1;
      else if (source === "dom" && incrementSeen) domCaptures += 1;
      if (changed) {
        schedulePersist(next);
        notify(next);
      }
      return next;
    }

    function captureMedia(provider, mediaId, item, metadata = {}) {
      provider = String(provider || "").toLowerCase();
      if (!Settings.get("savedSync.captureNetworkMedia", true) || !isActiveProvider(provider) || !mediaId || !item?.url) return null;
      const normalized = normalizeMedia(provider, { ...item, source: "network", capturedAt: Date.now() });
      if (!normalized) return null;
      const caption = metadata.text || metadata.caption || "";
      return upsert({
        key: `${provider}:${mediaId}`,
        provider,
        mediaId: String(mediaId),
        url: defaultPostUrl(provider, mediaId),
        kind: normalized.kind,
        media: [normalized],
        caption,
        title: metadata.title || "",
        captionSource: caption ? "network-intercept" : "",
        captionLookupState: caption ? "captured" : undefined,
        captionLookupAt: caption ? Date.now() : 0,
        networkCaptured: true,
      }, "network");
    }

    function captureMetadata(provider, mediaId, metadata = {}) {
      provider = String(provider || "").toLowerCase();
      if (!isActiveProvider(provider) || !mediaId) return null;
      const caption = metadata.text || metadata.caption || "";
      return upsert({
        key: `${provider}:${mediaId}`,
        provider,
        mediaId: String(mediaId),
        url: defaultPostUrl(provider, mediaId),
        caption,
        title: metadata.title || "",
        captionSource: caption ? "network-intercept" : "",
        captionLookupState: caption ? "captured" : undefined,
        captionLookupAt: caption ? Date.now() : 0,
        networkCaptured: true,
      }, "network");
    }

    async function loadProvider(provider) {
      provider = String(provider || "").toLowerCase();
      if (!provider) return [];
      if (loadedProviders.has(provider)) return [...memory.values()].filter((record) => record.provider === provider);
      const db = await openDb();
      if (!db) return [];
      const maximum = Math.max(250, Number(Settings.get("savedSync.maxArchivedPosts", 12000)) || 12000);
      const result = await new Promise((resolve) => {
        try {
          const transaction = db.transaction(CONFIG.savedSyncDbStore, "readwrite");
          const store = transaction.objectStore(CONFIG.savedSyncDbStore);
          const index = store.index(COMPOUND_INDEX);
          const range = IDBKeyRange.bound([provider, 0], [provider, Number.MAX_SAFE_INTEGER]);
          const values = [];
          let seen = 0;
          const request = index.openCursor(range, "prev");
          request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) return;
            seen += 1;
            if (values.length < maximum) values.push(cursor.value);
            else { cursor.delete(); pruned += 1; }
            cursor.continue();
          };
          transaction.oncomplete = () => resolve({ ok: true, values, seen });
          transaction.onerror = () => resolve({ ok: false, values: [], seen: 0 });
          transaction.onabort = () => resolve({ ok: false, values: [], seen: 0 });
        } catch { resolve({ ok: false, values: [], seen: 0 }); }
      });
      if (!result.ok) { failures += 1; return []; }
      loadedProviders.add(provider);
      reads += result.values.length;
      for (const value of result.values) {
        const next = mergeRecord(memory.get(value.key), value);
        if (next) memory.set(next.key, next);
      }
      return result.values.map((value) => memory.get(value.key)).filter(Boolean);
    }

    async function clear(provider = null) {
      const normalizedProvider = provider == null ? null : String(provider).toLowerCase();
      // Clear queued writes before touching IndexedDB, otherwise an already
      // scheduled flush could resurrect records after the user explicitly
      // cleared the archive.
      if (normalizedProvider == null) {
        pendingWrites.clear();
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = 0; }
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = 0; }
      } else {
        for (const [key, record] of pendingWrites) {
          if (String(record?.provider || "").toLowerCase() === normalizedProvider) pendingWrites.delete(key);
        }
      }

      const db = await openDb();
      if (normalizedProvider == null) { memory.clear(); loadedProviders.clear(); }
      else {
        for (const [key, record] of memory) {
          if (String(record?.provider || "").toLowerCase() === normalizedProvider) memory.delete(key);
        }
        loadedProviders.delete(normalizedProvider);
      }
      if (!db) return;
      await new Promise((resolve) => {
        try {
          const transaction = db.transaction(CONFIG.savedSyncDbStore, "readwrite");
          const store = transaction.objectStore(CONFIG.savedSyncDbStore);
          if (normalizedProvider == null) store.clear();
          else {
            const request = store.index("provider").openCursor(IDBKeyRange.only(normalizedProvider));
            request.onsuccess = () => { const cursor = request.result; if (!cursor) return; cursor.delete(); cursor.continue(); };
          }
          transaction.oncomplete = resolve;
          transaction.onerror = resolve;
          transaction.onabort = resolve;
        } catch { resolve(); }
      });
    }

    async function clearRelayKnowledge(provider = null) {
      const normalizedProvider = provider == null ? null : String(provider).toLowerCase();
      for (const [key, record] of memory) {
        if (normalizedProvider && String(record?.provider || "").toLowerCase() !== normalizedProvider) continue;
        const next = { ...record, relayKnownBySignature: {} };
        memory.set(key, next);
        const queued = pendingWrites.get(key);
        if (queued) pendingWrites.set(key, { ...queued, relayKnownBySignature: {} });
      }

      const db = await openDb();
      if (!db) return false;
      const ok = await new Promise((resolve) => {
        try {
          const transaction = db.transaction(CONFIG.savedSyncDbStore, "readwrite");
          const store = transaction.objectStore(CONFIG.savedSyncDbStore);
          const request = normalizedProvider
            ? store.index("provider").openCursor(IDBKeyRange.only(normalizedProvider))
            : store.openCursor();
          request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) return;
            cursor.update({ ...cursor.value, relayKnownBySignature: {} });
            cursor.continue();
          };
          transaction.oncomplete = () => resolve(true);
          transaction.onerror = () => resolve(false);
          transaction.onabort = () => resolve(false);
        } catch { resolve(false); }
      });
      if (!ok) failures += 1;
      return ok;
    }

    function subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    function get(key) { return memory.get(String(key || "")) || null; }
    function list(provider = null) { return [...memory.values()].filter((record) => !provider || record.provider === provider); }
    try {
      addEventListener("pagehide", () => { void flush(); }, { capture: true });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") void flush();
      }, { passive: true });
    } catch {}

    function diagnostics() {
      return {
        backend: typeof indexedDB === "undefined" ? "unavailable" : "indexedDB-v2",
        activeProvider: activeProvider(),
        records: memory.size,
        queuedWrites: pendingWrites.size,
        loadedProviders: [...loadedProviders],
        reads,
        writes,
        pruned,
        networkCaptures,
        domCaptures,
        failures,
        retries,
      };
    }

    return Object.freeze({
      activeProvider,
      isActiveProvider,
      isLoaded: (provider) => loadedProviders.has(String(provider || "").toLowerCase()),
      upsert,
      captureMedia,
      captureMetadata,
      loadProvider,
      flush,
      clear,
      clearRelayKnowledge,
      subscribe,
      get,
      list,
      diagnostics,
    });
  })();

  // ---------------------------------------------------------------------------
  // Twitter capture. Stores photos and videos per tweet.
  // ---------------------------------------------------------------------------

  class TwitterCaptureService {
    posts = new Map();
    metadata = new Map();
    installed = false;
    syndication = new Map();
    recentPosts = new Map();

    touch(id) {
      const key = String(id || "");
      if (!key) return;
      if (this.recentPosts.has(key)) this.recentPosts.delete(key);
      this.recentPosts.set(key, Date.now());
      const limit = Math.max(40, Number(CONFIG.providers.captureStoreMaxPosts) || 180);
      while (this.recentPosts.size > limit) {
        const oldest = this.recentPosts.keys().next().value;
        if (oldest == null) break;
        this.recentPosts.delete(oldest);
        this.posts.delete(oldest);
        this.metadata.delete(oldest);
        this.syndication.delete(oldest);
      }
    }

    ensurePost(id) {
      const key = String(id || "");
      let record = this.posts.get(key);
      if (!record) {
        record = new Map();
        this.posts.set(key, record);
      }
      this.touch(key);
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

      try {
        SavedMediaArchive.captureMedia("twitter", String(id), normalized, metadata);
      } catch {}
    }

    ingest(value, inheritedId = null, depth = 0, seen = new WeakSet()) {
      if (depth > 48 || !value || typeof value !== "object" || seen.has(value)) return;
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
      const key = String(id || "");
      this.touch(key);
      const values = [...(this.posts.get(key)?.values() || [])];
      const slots = new Map();

      for (const item of values) {
        const order = Number(item?.order);
        const slotKey = Number.isInteger(order) && order >= 0
          ? `slot:${order}`
          : item.kind === MEDIA_KIND.video
            ? "slot:video-unordered"
            : `photo:${item.url}`;
        const previous = slots.get(slotKey);
        if (!previous) {
          slots.set(slotKey, item);
          continue;
        }

        // Same Twitter media slot may expose many video variants. Prefer MP4,
        // then bitrate/score. Never let a variant erase a photo in another slot.
        if (previous.kind === MEDIA_KIND.video && item.kind === MEDIA_KIND.video) {
          const previousMp4 = Media.isMp4(previous.url);
          const nextMp4 = Media.isMp4(item.url);
          if ((nextMp4 && !previousMp4) || (nextMp4 === previousMp4 && Number(item.score || 0) > Number(previous.score || 0))) {
            slots.set(slotKey, item);
          }
          continue;
        }

        if (Number(item.score || 0) > Number(previous.score || 0)) slots.set(slotKey, item);
      }

      return [...slots.values()].sort((a, b) => {
        const ao = Number.isFinite(Number(a?.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
        const bo = Number.isFinite(Number(b?.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
        return ao - bo || Number(b.score || 0) - Number(a.score || 0);
      });
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
      const service = this;
      NetworkBroker.subscribe("twitter-capture", {
        enabled: () => IS_TWITTER && Settings.get("twitter.enabled", true),
        matchResponse(event) {
          const url = String(event.requestUrl || event.url || "");
          return /(?:x|twitter)\.com|api\.twitter\.com/i.test(url) && /\/graphql\/|\/i\/api\/|Tweet|Timeline|syndication/i.test(url);
        },
        wantsBody() {
          return true;
        },
        onResponse(event) {
          if (event.json && typeof event.json === "object") service.ingest(event.json);
          else if (event.text && /video_info|video\.twimg\.com|media_url_https|extended_entities/i.test(event.text)) {
            try { service.ingest(JSON.parse(event.text)); } catch {}
          }
        },
      });
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
    recentPosts = new Map();

    touch(shortcode) {
      const key = String(shortcode || "");
      if (!key) return;
      if (this.recentPosts.has(key)) this.recentPosts.delete(key);
      this.recentPosts.set(key, Date.now());
      const limit = Math.max(40, Number(CONFIG.providers.captureStoreMaxPosts) || 180);
      while (this.recentPosts.size > limit) {
        const oldest = this.recentPosts.keys().next().value;
        if (oldest == null) break;
        this.recentPosts.delete(oldest);
        this.posts.delete(oldest);
        this.metadata.delete(oldest);
        this.carouselPosts.delete(oldest);
        this.carouselLengths.delete(oldest);
      }
    }

    ensurePost(shortcode) {
      const key = String(shortcode || "");
      let record = this.posts.get(key);
      if (!record) {
        record = new Map();
        this.posts.set(key, record);
      }
      this.touch(key);
      return record;
    }

    rememberMetadata(shortcode, metadata = {}) {
      const key = String(shortcode || "");
      if (!key || !metadata || typeof metadata !== "object") return;
      this.touch(key);
      const previous = this.metadata.get(key) || {};
      const next = { ...previous };

      for (const [name, value] of Object.entries(metadata)) {
        const clean = PayloadSanitizer.cleanText(value || "");
        if (!clean) continue;
        if (!next[name] || clean.length >= String(next[name]).length) next[name] = clean;
      }

      this.metadata.set(key, next);
      try { SavedMediaArchive.captureMetadata("instagram", key, next); } catch {}
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
      try { SavedMediaArchive.captureMedia("instagram", String(shortcode), { ...item, kind, url }, this.metadata.get(String(shortcode)) || {}); } catch {}
    }

    ensureCarousel(shortcode) {
      const key = String(shortcode || "");
      let record = this.carouselPosts.get(key);
      if (!record) {
        record = new Map();
        this.carouselPosts.set(key, record);
      }
      this.touch(key);
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
      try { SavedMediaArchive.captureMedia("instagram", key, next, this.metadata.get(key) || {}); } catch {}
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
      this.touch(key);
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
      if (depth > 44 || !value || typeof value !== "object" || seen.has(value)) return;
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
      const key = String(shortcode || "");
      this.touch(key);
      return Media.sortItems([...(this.posts.get(key)?.values() || [])]);
    }

    meta(shortcode) {
      const key = String(shortcode || "");
      this.touch(key);
      return this.metadata.get(key) || null;
    }

    install() {
      if (this.installed || !IS_INSTAGRAM) return;
      this.installed = true;
      const service = this;
      NetworkBroker.subscribe("instagram-capture", {
        enabled: () => IS_INSTAGRAM && Settings.get("instagram.enabled", true),
        matchResponse(event) {
          const url = String(event.requestUrl || event.url || "");
          return /instagram\.com/i.test(url) && /\/api\/|graphql|ajax|feed|media|reels?/i.test(url);
        },
        wantsBody() {
          return true;
        },
        onResponse(event) {
          if (event.json && typeof event.json === "object") service.ingest(event.json);
          else if (event.text && /carousel_media|image_versions2|video_versions|edge_sidecar_to_children/i.test(event.text)) {
            try { service.ingest(JSON.parse(event.text)); } catch {}
          }
        },
      });
    }
  }

  const InstagramStore = new InstagramCaptureService();
  InstagramStore.install();

  // ---------------------------------------------------------------------------
  // HLS runtime. Only used when URL-first Telegram fails or download is enabled.
  // ---------------------------------------------------------------------------

  async function remuxHlsSeparateTracks(videoTrack, audioTrack, provider, onProgress) {
    if (!isBlobLike(videoTrack?.blob) || !isBlobLike(audioTrack?.blob)) {
      throw new Error("Tracks HLS separados inválidos.");
    }

    videoTrack = { ...videoTrack, blob: await coerceLocalBlob(videoTrack.blob) };
    audioTrack = { ...audioTrack, blob: await coerceLocalBlob(audioTrack.blob) };

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
    const MAX_RECORDS = 2_000;
    let saveTimer = 0;

    try {
      const stored = JSON.parse(localStorage.getItem(CONFIG.historyKey) || "[]");
      if (Array.isArray(stored)) {
        const ordered = stored
          .filter((entry) => entry?.key)
          .sort((a, b) => Number(b?.at || 0) - Number(a?.at || 0))
          .slice(0, MAX_RECORDS)
          .reverse();
        for (const entry of ordered) touchBoundedMap(records, String(entry.key), entry, MAX_RECORDS);
      }
    } catch {}

    function flush() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = 0;
      }
      try {
        while (records.size > MAX_RECORDS) {
          const oldest = records.keys().next().value;
          if (oldest === undefined) break;
          records.delete(oldest);
        }
        // Map order is oldest -> newest because mark() delete/sets the key.
        // Persist newest first without an O(n log n) sort on the main thread.
        const values = [...records.values()].reverse();
        localStorage.setItem(CONFIG.historyKey, JSON.stringify(values));
      } catch {}
    }

    function save(immediate = false) {
      if (immediate) {
        flush();
        return;
      }
      if (saveTimer) return;
      saveTimer = window.setTimeout(flush, 180);
    }

    try { addEventListener("pagehide", flush, { capture: true }); } catch {}

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
        if (!Settings.get("history.enabled", true)) return null;
        const key = `${this.identity(context)}|${action}`;
        return records.get(key) || null;
      },

      mark(context, action, metadata = {}) {
        if (!Settings.get("history.enabled", true)) return null;
        const key = `${this.identity(context)}|${action}`;
        const record = {
          key,
          at: Date.now(),
          metadata,
        };
        touchBoundedMap(records, key, record, MAX_RECORDS);
        save();
        return record;
      },

      clear() {
        records.clear();
        if (saveTimer) {
          clearTimeout(saveTimer);
          saveTimer = 0;
        }
        try { localStorage.removeItem(CONFIG.historyKey); } catch {}
      },

      size() {
        return records.size;
      },

      diagnostics() {
        return {
          key: CONFIG.historyKey,
          records: records.size,
          maxRecords: MAX_RECORDS,
          persistPending: Boolean(saveTimer),
        };
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
        // Normalize once at startup. Runtime writes stay O(n), not O(n log n).
        const limit = Math.max(100, Number(Settings.get("history.maxEntries", CONFIG.mediaUsageMaxEntries)) || 4000);
        const ordered = stored
          .filter((entry) => entry?.key)
          .sort((a, b) => Number(a?.at || 0) - Number(b?.at || 0))
          .slice(-limit);
        for (const entry of ordered) records.set(String(entry.key), entry);
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

    let saveTimer = 0;

    function flush() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = 0;
      }
      try {
        const limit = Math.max(100, Number(Settings.get("history.maxEntries", CONFIG.mediaUsageMaxEntries)) || 4000);
        while (records.size > limit) {
          const oldest = records.keys().next().value;
          if (oldest === undefined) break;
          records.delete(oldest);
        }
        // upsert() keeps Map order oldest -> newest. Reverse only for the
        // persisted representation so newest records are easiest to inspect.
        const values = [...records.values()].reverse();
        localStorage.setItem(CONFIG.mediaUsageKey, JSON.stringify(values));
      } catch {}
    }

    function save(immediate = false) {
      if (immediate) {
        flush();
        return;
      }
      if (saveTimer) return;
      saveTimer = window.setTimeout(flush, 180);
    }

    try { addEventListener("pagehide", flush, { capture: true }); } catch {}

    function get(context, item, index, action) {
      if (!Settings.get("history.enabled", true)) return null;
      return records.get(key(context, item, index, action)) || null;
    }

    function upsert(context, item, index, action, metadata = {}) {
      const recordKey = key(context, item, index, action);
      const now = Date.now();
      const previous = records.get(recordKey);
      const record = {
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
      };
      if (records.has(recordKey)) records.delete(recordKey);
      records.set(recordKey, record);
      return record;
    }

    function mark(context, item, index, action, metadata = {}) {
      if (!Settings.get("history.enabled", true)) return null;
      const record = upsert(context, item, index, action, metadata);
      save();
      return record;
    }

    function markMany(context, items, action, metadata = {}) {
      if (!Settings.get("history.enabled", true)) return 0;
      const values = Media.dedupeItems(items);
      values.forEach((item, index) => upsert(context, item, index, action, metadata));
      save();
      return values.length;
    }

    function status(context, items, action) {
      const values = Media.dedupeItems(items);
      if (!Settings.get("history.enabled", true)) {
        return { total: values.length, usedCount: 0, anyUsed: false, allUsed: false, latestAt: 0, records: values.map(() => null) };
      }
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

    function clear() {
      records.clear();
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = 0;
      }
      try { localStorage.removeItem(CONFIG.mediaUsageKey); } catch {}
    }

    function diagnostics() {
      return {
        key: CONFIG.mediaUsageKey,
        enabled: Settings.get("history.enabled", true),
        maxEntries: Settings.get("history.maxEntries", CONFIG.mediaUsageMaxEntries),
        records: records.size,
        latestAt: [...records.values()].reduce(
          (latest, entry) => Math.max(latest, Number(entry?.at || 0)),
          0,
        ),
      };
    }

    return Object.freeze({ get, mark, markMany, status, clear, compact: flush, diagnostics });
  })();

  // ---------------------------------------------------------------------------
  // Relay-confirmed delivery cache. This is channel-aware UI/navigation memory,
  // never an authority that removes channels from a send request. D1/claims
  // remain authoritative; SavedSync only uses same-navigation positives as a
  // short-lived fast path.
  // ---------------------------------------------------------------------------

  const DeliveryCache = (() => {
    const records = new Map();
    let saveTimer = 0;

    function cleanUrl(value) {
      try {
        const url = new URL(String(value || ""), location.href);
        url.hash = "";
        for (const name of [...url.searchParams.keys()]) {
          if (/^(?:utm_|igsh|igshid|ref_|fbclid|gclid)/i.test(name)) url.searchParams.delete(name);
        }
        return url.href;
      } catch {
        return String(value || "").trim();
      }
    }

    function inferProviderAndId(value, fallbackProvider = "generic") {
      const url = cleanUrl(value);
      let provider = String(fallbackProvider || "generic").toLowerCase();
      let mediaId = "";
      try {
        const parsed = new URL(url, location.href);
        const host = parsed.hostname.toLowerCase();
        if (/(?:^|\.)instagram\.com$/.test(host)) {
          provider = "instagram";
          mediaId = parsed.pathname.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i)?.[1] || "";
        } else if (/(?:^|\.)(?:x|twitter)\.com$/.test(host)) {
          provider = "twitter";
          mediaId = parsed.pathname.match(/\/status\/(\d+)/i)?.[1] || "";
        } else if (/(?:^|\.)tiktok\.com$/.test(host)) {
          provider = "tiktok";
          mediaId = parsed.pathname.match(/\/(?:video|photo)\/(\d+)/i)?.[1] || "";
        } else if (/(?:^|\.)(?:youtube\.com|youtu\.be)$/.test(host)) {
          provider = "youtube";
          mediaId = parsed.searchParams.get("v") || parsed.pathname.match(/\/(?:shorts|embed)\/([A-Za-z0-9_-]+)/i)?.[1] || (host.endsWith("youtu.be") ? parsed.pathname.split("/").filter(Boolean)[0] : "") || "";
        }
      } catch {}
      return { provider, mediaId: String(mediaId || "").trim() || null, url };
    }

    function identityFromPayload(payload = {}) {
      const mediaKey = String(payload?.mediaKey || "").trim();
      if (mediaKey) return mediaKey;
      const source = inferProviderAndId(payload?.sourceUrl || payload?.pageUrl || payload?.url || payload?.mediaUrl || location.href, payload?.provider || "generic");
      const provider = String(payload?.provider || source.provider || "generic").toLowerCase();
      const mediaId = String(payload?.mediaId || source.mediaId || "").trim();
      if (mediaId) return `${provider}:${mediaId}`;
      return `${provider}:url:${cleanUrl(source.url)}`;
    }

    function load() {
      try {
        const stored = JSON.parse(localStorage.getItem(CONFIG.deliveryCacheKey) || "[]");
        if (!Array.isArray(stored)) return;
        const limit = Math.max(100, Number(CONFIG.deliveryCacheMaxEntries) || 2500);
        for (const entry of stored.slice(-limit)) {
          if (!entry?.key || !entry?.channels || typeof entry.channels !== "object") continue;
          records.set(String(entry.key), entry);
        }
      } catch {}
    }

    function flush() {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; }
      try {
        const limit = Math.max(100, Number(CONFIG.deliveryCacheMaxEntries) || 2500);
        while (records.size > limit) {
          const oldest = records.keys().next().value;
          if (oldest === undefined) break;
          records.delete(oldest);
        }
        localStorage.setItem(CONFIG.deliveryCacheKey, JSON.stringify([...records.values()]));
      } catch {}
    }

    function save() {
      if (saveTimer) return;
      saveTimer = window.setTimeout(flush, 180);
    }

    function record(identity, channelIds, metadata = {}) {
      const key = String(identity || "").trim();
      const channels = uniqueChannelIds(channelIds);
      if (!key || !channels.length) return null;
      const now = Date.now();
      const previous = records.get(key) || { key, channels: {}, firstAt: now };
      const nextChannels = { ...(previous.channels || {}) };
      for (const channelId of channels) {
        const old = nextChannels[channelId] || {};
        nextChannels[channelId] = { at: now, firstAt: Number(old.firstAt || old.at || now), count: Math.max(0, Number(old.count || 0)) + 1 };
      }
      const next = { ...previous, key, channels: nextChannels, at: now, metadata: { ...(previous.metadata || {}), ...metadata } };
      if (records.has(key)) records.delete(key);
      records.set(key, next);
      save();
      return next;
    }

    function recordResult(identity, result, metadata = {}) {
      return record(identity, getSuccessfulChannels(result), metadata);
    }

    function status(identity, requestedChannels = []) {
      const key = String(identity || "").trim();
      const requested = uniqueChannelIds(requestedChannels);
      const entry = records.get(key) || null;
      const successful = requested.filter((channelId) => Boolean(entry?.channels?.[channelId]));
      const pending = requested.filter((channelId) => !successful.includes(channelId));
      return { key, entry, requested, successful, pending, anySuccessful: successful.length > 0, allSuccessful: requested.length > 0 && successful.length === requested.length };
    }

    function clear() {
      records.clear();
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; }
      try { localStorage.removeItem(CONFIG.deliveryCacheKey); } catch {}
    }

    function diagnostics() {
      return { key: CONFIG.deliveryCacheKey, records: records.size, maxEntries: CONFIG.deliveryCacheMaxEntries, persistPending: Boolean(saveTimer) };
    }

    load();
    try { addEventListener("pagehide", flush, { capture: true }); } catch {}
    return Object.freeze({ identityFromPayload, inferProviderAndId, record, recordResult, status, clear, compact: flush, diagnostics });
  })();

  function parseChatIds(value) {
    const output = [];
    for (const token of String(value || "").split(/[\s,;]+/)) {
      const channel = token.trim();
      if (channel && !output.includes(channel)) output.push(channel);
    }
    return output;
  }

  function relaySettings() {
    return {
      url: String(Settings.get("relay.url", CONFIG.telegram.url) || CONFIG.telegram.url).trim(),
      token: String(Settings.get("relay.token", CONFIG.telegram.token) || "").trim(),
      timeout: Math.max(
        5_000,
        Math.min(
          300_000,
          Math.round(Number(Settings.get("relay.timeoutSeconds", CONFIG.telegram.timeout / 1000)) || 120) * 1000,
        ),
      ),
      providerRouting: Settings.get("relay.providerRouting", true) !== false,
      mediaChannelMode: Settings.get("relay.mediaChannelMode", "replace") === "append"
        ? "append"
        : "replace",
    };
  }

  const RelayRoutingCache = (() => {
    let snapshot = null;

    function get() {
      if (snapshot) return snapshot;
      snapshot = {
        providerRouting: Settings.get("relay.providerRouting", true) !== false,
        mediaChannelMode: Settings.get("relay.mediaChannelMode", "replace") === "append" ? "append" : "replace",
        defaultChannels: parseChatIds(Settings.get("relay.defaultChannels", "")),
        routeChannels: new Map(TELEGRAM_CHANNEL_ROUTES.map((route) => [route.setting, parseChatIds(Settings.get(route.setting, ""))])),
        photoChannels: parseChatIds(Settings.get("relay.photoChannels", "")),
        videoChannels: parseChatIds(Settings.get("relay.videoChannels", "")),
        audioChannels: parseChatIds(Settings.get("relay.audioChannels", "")),
      };
      return snapshot;
    }

    function invalidate() { snapshot = null; }
    return Object.freeze({ get, invalidate });
  })();

  function baseChannels(provider, pageUrl) {
    let host = location.hostname.replace(/^www\./, "");
    try {
      host = new URL(String(pageUrl)).hostname.replace(/^www\./, "");
    } catch {}

    const normalizedProvider = String(provider || "").toLowerCase();
    const normalizedHost = host.toLowerCase();
    const routing = RelayRoutingCache.get();

    if (routing.providerRouting) {
      for (const route of TELEGRAM_CHANNEL_ROUTES) {
        const matched = route.sites.some((site) => {
          const normalized = String(site).toLowerCase();
          return (
            normalized === normalizedProvider ||
            normalized === normalizedHost ||
            normalizedHost.endsWith(`.${normalized}`) ||
            (normalizedProvider === "twitter" && ["x", "x.com", "twitter.com"].includes(normalized))
          );
        });

        if (matched) {
          const routed = routing.routeChannels.get(route.setting) || [];
          if (routed.length) return [...routed];
        }
      }
    }

    return [...routing.defaultChannels];
  }

  function channels(provider, pageUrl, kind = null) {
    const inherited = baseChannels(provider, pageUrl);
    const routing = RelayRoutingCache.get();
    const override = kind === MEDIA_KIND.photo
      ? routing.photoChannels
      : kind === MEDIA_KIND.audio
        ? routing.audioChannels
        : kind === MEDIA_KIND.video
          ? routing.videoChannels
          : [];

    if (!override.length) return inherited;
    if (routing.mediaChannelMode === "append") return [...new Set([...inherited, ...override])];
    return [...override];
  }

  // ---------------------------------------------------------------------------
  // Telegram relay. Direct photo/video carousels are sent as one Telegram album when possible.
  // ---------------------------------------------------------------------------

  /**
   * @typedef {Object} ChannelNotSent
   * @property {string} channelId
   * @property {string} reason
   * @property {string=} error
   */

  /**
   * @typedef {Object} SendChannelsResult
   * @property {string[]} requested
   * @property {string[]} attempted
   * @property {string[]} inserted
   * @property {ChannelNotSent[]} notSent
   */

  /**
   * @typedef {"idle"|"preparing"|"sending"|"waiting-confirmation"|"resending"|"success"|"partial"|"error"|"cancelled"} SendOperationState
   */

  /**
   * @typedef {"sent"|"already_sent"|"partially_sent"|"duplicate_in_batch"|"pending"|"failed"|"cancelled"} BatchItemState
   */

  class RelayProtocolError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.name = "RelayProtocolError";
      this.httpStatus = Number(options.httpStatus || 0);
      this.payload = options.payload ?? null;
      this.raw = String(options.raw || "");
    }
  }

  function uniqueChannelIds(values) {
    return [...new Set((Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean))];
  }

  function isAlreadySentReason(value) {
    return String(value || "").trim().toLowerCase() === "already_sent";
  }

  function isDuplicateInBatchReason(value) {
    return String(value || "").trim().toLowerCase() === "duplicate_in_batch";
  }

  function normalizeChannelFailure(value) {
    if (!value || typeof value !== "object") return null;
    const channelId = String(value.channelId ?? value.channel ?? value.chatId ?? "").trim();
    if (!channelId) return null;
    const reason = String(value.reason || "telegram_error").trim() || "telegram_error";
    const error = String(value.error ?? value.description ?? "").trim();
    const duplicateOfIndex = Number.isFinite(Number(value.duplicateOfIndex)) ? Number(value.duplicateOfIndex) : null;
    return { channelId, reason, ...(error ? { error } : {}), ...(duplicateOfIndex != null ? { duplicateOfIndex } : {}) };
  }

  function normalizeSendChannels(payload, fallbackRequested = []) {
    const source = payload?.channels && !Array.isArray(payload.channels)
      ? payload.channels
      : {};
    const requested = uniqueChannelIds(source.requested?.length ? source.requested : fallbackRequested);
    const attempted = uniqueChannelIds(source.attempted || []);
    const inserted = uniqueChannelIds(source.inserted || []);
    const covered = uniqueChannelIds(source.covered || []);
    const notSent = (Array.isArray(source.notSent) ? source.notSent : [])
      .map(normalizeChannelFailure)
      .filter(Boolean);
    return { requested, attempted, inserted, covered, notSent };
  }

  function getAlreadySentChannels(result) {
    return uniqueChannelIds(
      (result?.channels?.notSent || [])
        .filter((item) => isAlreadySentReason(item?.reason))
        .map((item) => item.channelId),
    );
  }

  function getSuccessfulChannels(result) {
    return uniqueChannelIds(result?.channels?.inserted || []);
  }

  function getCoveredChannels(result) {
    return uniqueChannelIds([
      ...(result?.channels?.inserted || []),
      ...(result?.channels?.covered || []),
      ...getAlreadySentChannels(result),
    ]);
  }

  function getInProgressChannels(result) {
    return uniqueChannelIds((result?.channels?.notSent || [])
      .filter((item) => String(item?.reason || "").toLowerCase() === "delivery_in_progress")
      .map((item) => item.channelId));
  }

  function getFailedChannels(result) {
    return (result?.channels?.notSent || []).filter(
      (item) => !isAlreadySentReason(item?.reason) && !isDuplicateInBatchReason(item?.reason) && String(item?.reason || "").toLowerCase() !== "delivery_in_progress",
    );
  }

  function isDuplicateConflict(result) {
    return Boolean(
      result?.httpStatus === 409 ||
      result?.payload?.conflict === true ||
      getAlreadySentChannels(result).length,
    );
  }

  function classifySendResult(result) {
    const requested = uniqueChannelIds(result?.channels?.requested || []);
    const inserted = getSuccessfulChannels(result);
    const duplicates = getAlreadySentChannels(result);
    const covered = getCoveredChannels(result);
    const failed = getFailedChannels(result);
    const inProgress = getInProgressChannels(result);
    const allCovered = requested.length > 0 && requested.every((channelId) => covered.includes(channelId));
    if (allCovered && failed.length === 0 && inProgress.length === 0) {
      if (!inserted.length && duplicates.length) return "duplicate";
      return "success";
    }
    if (covered.length) return "partial";
    if (inProgress.length && !failed.length) return "pending";
    return "error";
  }

  function mergeSendResults(first, resend) {
    if (!resend) return first;
    const successfulResends = new Set(getSuccessfulChannels(resend));
    const resendFailures = new Map(
      (resend.channels?.notSent || []).map((item) => [String(item.channelId), item]),
    );
    const remainingFirstFailures = (first.channels?.notSent || []).filter((item) => {
      if (!isAlreadySentReason(item.reason)) return true;
      const channelId = String(item.channelId);
      return !successfulResends.has(channelId) && !resendFailures.has(channelId);
    });
    const mergedNotSent = [
      ...remainingFirstFailures,
      ...(resend.channels?.notSent || []),
    ];
    const channels = {
      requested: uniqueChannelIds(first.channels?.requested || []),
      attempted: uniqueChannelIds([
        ...(first.channels?.attempted || []),
        ...(resend.channels?.attempted || []),
      ]),
      inserted: uniqueChannelIds([
        ...(first.channels?.inserted || []),
        ...(resend.channels?.inserted || []),
      ]),
      covered: uniqueChannelIds([
        ...(first.channels?.covered || []),
        ...(resend.channels?.covered || []),
      ]),
      notSent: mergedNotSent,
    };
    const httpStatus = channels.inserted.length
      ? channels.notSent.length ? 207 : 200
      : resend.httpStatus || first.httpStatus;
    return {
      ...first,
      ok: channels.inserted.length > 0 && channels.notSent.length === 0,
      partial: channels.inserted.length > 0 && channels.notSent.length > 0,
      conflict: channels.inserted.length === 0 && channels.notSent.length > 0 && channels.notSent.every((item) => isAlreadySentReason(item.reason)),
      httpStatus,
      channels,
      firstAttempt: first,
      resendAttempt: resend,
    };
  }

  const RelayIdentity = Object.freeze({
    resolve(context) {
      const provider = String(context?.providerId || "generic").toLowerCase();
      const metadata = context?.metadata || {};
      const explicitMediaKey = String(metadata.mediaKey || "").trim();
      if (explicitMediaKey) return { provider, mediaKey: explicitMediaKey, mediaId: null };

      let mediaId = "";
      if (provider === "twitter") {
        mediaId = String(metadata.statusId || "").trim();
      } else if (provider === "instagram") {
        // Shortcode is the canonical public-post ID and is more stable than CDN URLs.
        mediaId = String(metadata.instagramShortcode || "").trim();
      } else if (provider === "tiktok") {
        mediaId = String(metadata.mediaId || context?.pageUrl?.match?.(/\/(?:video|photo)\/(\d+)/i)?.[1] || "").trim();
      } else if (provider === "youtube") {
        try {
          const parsed = new URL(String(context?.pageUrl || ""));
          mediaId = String(
            parsed.searchParams.get("v") ||
            parsed.pathname.match(/\/(?:shorts|embed)\/([A-Za-z0-9_-]+)/i)?.[1] ||
            (parsed.hostname === "youtu.be" ? parsed.pathname.split("/").filter(Boolean)[0] : "") ||
            "",
          ).trim();
        } catch {}
      } else {
        mediaId = String(metadata.mediaId || "").trim();
      }
      return { provider, mediaKey: null, mediaId: mediaId || null };
    },
  });

  const RelayClient = (() => {
    function endpoint(pathname = "/send") {
      const relay = relaySettings();
      if (!/^https?:\/\//i.test(relay.url)) {
        throw new Error("URL do relay inválida. Abra Settings → Relay & chats.");
      }
      if (pathname === "/send") return relay.url;
      const url = new URL(relay.url, location.href);
      if (/\/send\/?$/i.test(url.pathname)) {
        url.pathname = url.pathname.replace(/\/send\/?$/i, pathname);
      } else {
        url.pathname = `${url.pathname.replace(/\/$/, "")}${pathname}`;
      }
      url.search = "";
      url.hash = "";
      return url.href;
    }

    function parseJsonSafely(raw, httpStatus) {
      const text = String(raw || "");
      if (!text.trim()) return {};
      try {
        return JSON.parse(text);
      } catch (error) {
        throw new RelayProtocolError(
          `O relay retornou JSON inválido (HTTP ${httpStatus || "?"}).`,
          { httpStatus, raw: text },
        );
      }
    }

    function normalizeResponse(httpStatus, payload, requestedChannels) {
      const channelsResult = normalizeSendChannels(payload, requestedChannels);
      return {
        httpStatus,
        ok: payload?.ok === true,
        partial: payload?.partial === true || httpStatus === 207,
        conflict: payload?.conflict === true || httpStatus === 409,
        channels: channelsResult,
        payload,
      };
    }

    function request(pathname, payload, options = {}) {
      const relay = relaySettings();
      const channelsOverride = Array.isArray(options.channels)
        ? uniqueChannelIds(options.channels)
        : null;
      const requestPayload = {
        ...payload,
        ...(channelsOverride ? {
          channels: channelsOverride,
          channel: channelsOverride.length === 1 ? channelsOverride[0] : undefined,
        } : {}),
        ...(options.force === true ? { force: true } : {}),
      };
      if (channelsOverride && channelsOverride.length !== 1) delete requestPayload.channel;
      if (options.force !== true && Object.prototype.hasOwnProperty.call(requestPayload, "force")) {
        delete requestPayload.force;
      }

      const headers = { Accept: "application/json, text/plain, */*" };
      if (relay.token) headers.Authorization = `Bearer ${relay.token}`;
      let data;
      const prepared = options.prepared || null;

      if (prepared?.blob && isBlobLike(prepared.blob)) {
        data = new FormData();
        data.append("payload", JSON.stringify(requestPayload));
        const appendPrepared = async () => {
          const localBlob = await coerceLocalBlob(
            prepared.blob,
            prepared.contentType || requestPayload.metadata?.contentType || "application/octet-stream",
          );
          data.append(
            "file",
            localBlob,
            prepared.filename || requestPayload.metadata?.filename || "media.bin",
          );
        };
        return appendPrepared().then(() => execute());
      }

      headers["Content-Type"] = "application/json";
      data = JSON.stringify(requestPayload);
      return execute();

      function execute() {
        return new Promise((resolve, reject) => {
          let settled = false;
          const request = gmRequest({
            method: "POST",
            url: endpoint(pathname),
            headers,
            data,
            timeout: relay.timeout,
            onprogress(event) {
              if (!options.onProgress) return;
              const loaded = Number(event?.loaded || 0);
              const total = Number(event?.total || 0);
              options.onProgress(loaded, total);
            },
            onload(response) {
              if (settled) return;
              settled = true;
              const httpStatus = Number(response.status || 0);
              const raw = String(response.responseText || response.response || "");
              let body;
              try {
                body = parseJsonSafely(raw, httpStatus);
              } catch (error) {
                reject(error);
                return;
              }
              const normalized = normalizeResponse(
                httpStatus,
                body,
                uniqueChannelIds(requestPayload.channels || (requestPayload.channel ? [requestPayload.channel] : [])),
              );

              // Channel-aware responses (including 207, 409 and 502) are data,
              // not transport exceptions. The controller decides success/partial/conflict.
              if (
                normalized.channels.requested.length ||
                normalized.channels.inserted.length ||
                normalized.channels.notSent.length ||
                Array.isArray(body?.results) ||
                httpStatus === 409
              ) {
                resolve(normalized);
                return;
              }

              if (httpStatus >= 200 && httpStatus < 300 && body?.ok !== false && body?.success !== false) {
                resolve(normalized);
                return;
              }

              reject(new RelayProtocolError(
                String(body?.error || body?.message || `Relay HTTP ${httpStatus}`),
                { httpStatus, payload: body, raw },
              ));
            },
            onerror(event) {
              if (settled) return;
              settled = true;
              reject(new RelayProtocolError(`Falha de rede no relay: ${safeStringify(event, 0)}`));
            },
            ontimeout() {
              if (settled) return;
              settled = true;
              reject(new RelayProtocolError("Timeout no relay Telegram."));
            },
            onabort() {
              if (settled) return;
              settled = true;
              const error = new DOMException("Operação cancelada.", "AbortError");
              reject(error);
            },
          });
          if (!request) {
            settled = true;
            reject(new RelayProtocolError("GM_xmlhttpRequest indisponível."));
            return;
          }

          const signal = options.signal;
          if (signal) {
            const abort = () => {
              if (settled) return;
              settled = true;
              try { request.abort?.(); } catch {}
              reject(signal.reason instanceof Error ? signal.reason : new DOMException("Operação cancelada.", "AbortError"));
            };
            if (signal.aborted) abort();
            else signal.addEventListener("abort", abort, { once: true });
          }
        });
      }
    }

    function send(payload, options = {}) {
      return request("/send", payload, options);
    }

    function sendBatch(payload, options = {}) {
      return request("/batch", payload, options);
    }

    async function checkMedia(items, options = {}) {
      const normalizedItems = Array.isArray(items) ? items : [];
      if (normalizedItems.length > 100) {
        throw new RangeError(`POST /media/check aceita no máximo 100 mídias por chamada; recebido: ${normalizedItems.length}.`);
      }
      if (!normalizedItems.length) {
        return { results: [], meta: { requested: 0, valid: 0, invalid: 0, unique: 0, found: 0, missing: 0, foundInputs: 0, queryCount: 0, channelFilterCount: 0 } };
      }
      const channels = uniqueChannelIds(options.channels || []);
      const response = await request(
        "/media/check",
        { items: normalizedItems, ...(channels.length ? { channels } : {}) },
        { ...options, channels: null, force: false },
      );
      const payload = response?.payload && typeof response.payload === "object" ? response.payload : {};
      if (Number(response?.httpStatus || 0) < 200 || Number(response?.httpStatus || 0) >= 300 || payload?.ok === false) {
        throw new RelayProtocolError(
          String(payload?.error || payload?.message || `Media check HTTP ${response?.httpStatus || "?"}`),
          { httpStatus: response?.httpStatus || 0, payload },
        );
      }
      const rawResults = Array.isArray(payload.results)
        ? payload.results
        : Array.isArray(payload.items)
          ? payload.items
          : Array.isArray(payload.data)
            ? payload.data
            : [];
      return {
        ...payload,
        results: rawResults,
        httpStatus: response.httpStatus,
      };
    }

    return Object.freeze({ endpoint, request, send, sendBatch, checkMedia, normalizeResponse });
  })();

  // ---------------------------------------------------------------------------
  // Telegram caption builder. All media captions share one HTML-safe 1024-char
  // visible-text budget so SavedSync and manual sends cannot diverge.
  // ---------------------------------------------------------------------------

  const TelegramCaptionBuilder = Object.freeze({
    limit: 1024,

    escape(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    },

    truncate(value, maximum) {
      const text = PayloadSanitizer.cleanText(value || "", { maxLength: 32_000 });
      const limit = Math.max(0, Number(maximum) || 0);
      if (!limit) return "";
      const chars = Array.from(text);
      if (chars.length <= limit) return text;
      if (limit <= 1) return chars.slice(0, limit).join("");
      return `${chars.slice(0, limit - 1).join("").trimEnd()}…`;
    },

    build({ title = "", text = "", pageUrl = "", linkLabel = "", includeTitle = true, includeLink = true } = {}) {
      const cleanTitle = includeTitle ? PayloadSanitizer.cleanTitle(title || "") : "";
      const cleanLabel = includeLink ? PayloadSanitizer.cleanText(linkLabel || "", { maxLength: 120 }) : "";
      const safeUrl = (() => {
        try {
          const url = new URL(String(pageUrl || ""), location.href);
          return /^https?:$/i.test(url.protocol) ? url.href : "";
        } catch { return ""; }
      })();
      const separators = [cleanTitle, text, cleanLabel && safeUrl ? cleanLabel : ""].filter(Boolean).length - 1;
      const fixedVisible = Array.from(cleanTitle).length + (cleanLabel && safeUrl ? Array.from(cleanLabel).length : 0) + Math.max(0, separators) * 2;
      const textBudget = Math.max(0, this.limit - fixedVisible);
      const cleanText = this.truncate(text, textBudget);
      const parts = [];
      if (cleanTitle) parts.push(`<b>${this.escape(cleanTitle)}</b>`);
      if (cleanText) parts.push(this.escape(cleanText));
      if (cleanLabel && safeUrl) parts.push(`<a href="${this.escape(safeUrl)}">${this.escape(cleanLabel)}</a>`);
      return parts.join("\n\n");
    },

    fromContext(context, textOverride = null, options = {}) {
      const cleanContext = PayloadSanitizer.context(context || {});
      return this.build({
        title: cleanContext.title || cleanContext.providerId || "",
        text: textOverride == null ? cleanContext.text || "" : textOverride,
        pageUrl: cleanContext.pageUrl || "",
        linkLabel: cleanContext.hostname || (() => { try { return new URL(cleanContext.pageUrl).hostname; } catch { return location.hostname; } })(),
        includeTitle: options.includeTitle !== false,
        includeLink: options.includeLink !== false,
      });
    },
  });

  // ---------------------------------------------------------------------------
  // Telegram payload builder. HTTP details live only in RelayClient.
  // ---------------------------------------------------------------------------

  const Telegram = {
    mediaHeaders(context, item) {
      const provider = String(context?.providerId || "").toLowerCase();
      const url = String(item?.url || "");
      if (provider === "twitter" || /(?:^|\.)twimg\.com/i.test((() => {
        try { return new URL(url).hostname; } catch { return ""; }
      })())) {
        return { Referer: "https://x.com/", "User-Agent": navigator.userAgent };
      }
      if (provider === "instagram") {
        return { Referer: "https://www.instagram.com/", "User-Agent": navigator.userAgent };
      }
      return { "User-Agent": navigator.userAgent };
    },

    identityFields(context) {
      const identity = RelayIdentity.resolve(context);
      return {
        provider: identity.provider,
        ...(identity.mediaId ? { mediaId: identity.mediaId } : {}),
        ...(identity.mediaKey ? { mediaKey: identity.mediaKey } : {}),
      };
    },

    caption(context) {
      return TelegramCaptionBuilder.fromContext(context);
    },

    itemCaption(context, item, index = 0) {
      const itemText = PayloadSanitizer.cleanText(item?.caption || "", { maxLength: 32_000 });
      if (itemText) {
        return TelegramCaptionBuilder.fromContext(context, itemText, {
          includeTitle: index === 0,
          includeLink: index === 0,
        });
      }
      return index === 0 ? this.caption(context) : "";
    },

    albumPayload(context, items, targetChannels = null) {
      const cleanContext = PayloadSanitizer.context(context);
      const resolvedChannels = targetChannels || channels(cleanContext.providerId, cleanContext.pageUrl, items[0]?.kind);
      const total = items.length;
      return {
        ...this.identityFields(cleanContext),
        mediaItems: items.map((item, index) => {
          const mediaUrl = String(item.url);
          const mediaType = item.kind === MEDIA_KIND.photo ? "photo" : "video";
          return {
            mediaUrl,
            mediaType,
            ...(mediaType === "photo" ? { photoUrl: mediaUrl } : { videoUrl: mediaUrl }),
            caption: this.itemCaption(cleanContext, item, index),
            parseMode: "HTML",
            mediaHeaders: this.mediaHeaders(cleanContext, item),
            metadata: {
              carouselIndex: Number.isInteger(Number(item?.order)) ? Number(item.order) : index,
              selectionIndex: index,
              carouselTotal: total,
              carousel: true,
              mediaKind: item.kind,
              sourceCaption: PayloadSanitizer.cleanText(item?.caption || "", { maxLength: 4_000 }),
            },
          };
        }),
        channels: resolvedChannels.length ? resolvedChannels : undefined,
        channel: resolvedChannels.length === 1 ? resolvedChannels[0] : undefined,
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

    payload(context, item, index, total, prepared = null, targetChannels = null) {
      const cleanContext = PayloadSanitizer.context(context);
      const resolvedChannels = targetChannels || channels(cleanContext.providerId, cleanContext.pageUrl, item.kind);
      const isPhoto = item.kind === MEDIA_KIND.photo;
      const isAudio = item.kind === MEDIA_KIND.audio;
      const mediaUrl = String(item.url);
      const caption = this.itemCaption(cleanContext, item, index);
      const contentType = prepared?.contentType || (isPhoto ? "image/jpeg" : isAudio ? (Media.isAudioUrl(mediaUrl) ? "audio/mpeg" : "application/octet-stream") : Media.isMp4(mediaUrl) ? "video/mp4" : Media.isHls(mediaUrl) ? "application/vnd.apple.mpegurl" : Media.isDash(mediaUrl) ? "application/dash+xml" : "application/octet-stream");
      const payload = {
        ...this.identityFields(cleanContext),
        mediaUrl,
        channels: resolvedChannels.length ? resolvedChannels : undefined,
        channel: resolvedChannels.length === 1 ? resolvedChannels[0] : undefined,
        title: index === 0 ? cleanContext.title || "" : "",
        text: index === 0 ? cleanContext.text || "" : "",
        pageUrl: cleanContext.pageUrl,
        sourceUrl: cleanContext.pageUrl,
        frameUrl: location.href,
        caption,
        parseMode: "HTML",
        mediaType: isPhoto ? "photo" : isAudio ? "audio" : "video",
        mediaHeaders: this.mediaHeaders(cleanContext, item),
        metadata: {
          ...(cleanContext.metadata || {}),
          filename: prepared?.filename || Media.filename(mediaUrl, cleanContext.providerId, item.kind, index, total, contentType),
          contentType,
          size: Number(prepared?.blob?.size || 0),
          hls: Media.isHls(mediaUrl),
          dash: Media.isDash(mediaUrl),
          transferMode: prepared?.blob ? "multipart-file" : "direct-media-url",
          carouselIndex: Number.isInteger(Number(item?.order)) ? Number(item.order) : index,
          selectionIndex: index,
          carouselTotal: total,
          carousel: total > 1,
          mediaKind: item.kind,
          resolverProvider: item?.resolverProvider || item?.source || "",
          resolvedByTwirrl: Boolean(item?.resolvedByTwirrl),
          sourceCaption: PayloadSanitizer.cleanText(item?.caption || "", { maxLength: 4_000 }),
        },
      };
      if (isPhoto) payload.photoUrl = mediaUrl;
      else if (isAudio) payload.audioUrl = mediaUrl;
      else payload.videoUrl = mediaUrl;
      return payload;
    },

    createSingleOperation(context, item, index, total, prepared = null, targetChannels = null) {
      const payload = this.payload(context, item, index, total, prepared, targetChannels);
      return TelegramSendController.createOperation({
        kind: "single",
        context,
        items: [item],
        payload,
        prepared,
        channels: uniqueChannelIds(payload.channels || (payload.channel ? [payload.channel] : [])),
      });
    },

    createAlbumOperation(context, items, targetChannels = null) {
      const payload = this.albumPayload(context, items, targetChannels);
      return TelegramSendController.createOperation({
        kind: "album",
        context,
        items,
        payload,
        prepared: null,
        channels: uniqueChannelIds(payload.channels || (payload.channel ? [payload.channel] : [])),
      });
    },
  };

  // ---------------------------------------------------------------------------
  // Telegram send controller. D1 is the dedupe source of truth.
  // ---------------------------------------------------------------------------

  const TelegramSendController = (() => {
    const active = new Map();
    let sequence = 0;

    function createOperation(input) {
      sequence += 1;
      return {
        id: `aio-send-${Date.now().toString(36)}-${sequence.toString(36)}`,
        kind: input.kind || "single",
        context: input.context,
        items: Array.isArray(input.items) ? input.items : [],
        payload: input.payload,
        prepared: input.prepared || null,
        channels: uniqueChannelIds(input.channels || []),
        identity: DeliveryCache.identityFromPayload(input.payload || {}),
        state: "idle",
        createdAt: Date.now(),
      };
    }

    function setState(operation, state) {
      operation.state = state;
      operation.updatedAt = Date.now();
      return operation;
    }

    function details(result) {
      return {
        enviados: getSuccessfulChannels(result),
        jaEnviados: getAlreadySentChannels(result),
        naoEnviados: getFailedChannels(result).map((item) => ({
          canal: item.channelId,
          motivo: item.reason,
          erro: item.error || null,
        })),
      };
    }

    async function confirmDuplicate(operation, first, mediaIcon) {
      const duplicateChannels = getAlreadySentChannels(first);
      if (!duplicateChannels.length) return { confirmed: false, skipped: true };
      setState(operation, "waiting-confirmation");
      const requestedCount = first.channels?.requested?.length || operation.channels.length;
      const duplicateCount = duplicateChannels.length;
      const description = requestedCount <= 1
        ? "Esta mídia já foi enviada para este canal. Deseja enviar novamente?"
        : `Esta mídia já foi enviada para ${duplicateCount} dos ${requestedCount} canais selecionados. Deseja reenviar somente para ${duplicateCount === 1 ? "este canal" : "esses canais"}?`;
      const decision = await Toast.confirm({
        title: "Mídia já enviada",
        description,
        icon: mediaIcon || "refresh",
        duration: 0,
        dismissible: true,
        dismissValue: "cancel",
        actions: [
          { id: "cancel", label: "Cancelar", variant: "secondary", value: "cancel" },
          { id: "resend", label: "Enviar novamente", variant: "primary", value: "resend" },
        ],
      });
      return { confirmed: decision === "resend", channels: duplicateChannels };
    }

    async function sendOnce(operation, options = {}) {
      setState(operation, options.force ? "resending" : "sending");
      const result = await RelayClient.send(operation.payload, {
        prepared: operation.prepared,
        force: options.force === true,
        channels: options.channels || operation.channels,
        signal: options.signal || null,
        onProgress: options.onProgress,
      });
      DeliveryCache.recordResult(operation.identity, result, {
        provider: operation.payload?.provider || operation.context?.providerId || "generic",
        mediaId: operation.payload?.mediaId || null,
        sourceUrl: operation.payload?.sourceUrl || operation.payload?.pageUrl || "",
        force: options.force === true,
      });
      return result;
    }

    async function sendWithDuplicateConfirmation(operation, options = {}) {
      if (active.has(operation.id)) return active.get(operation.id);
      const promise = (async () => {
        // D1 is authoritative. DeliveryCache is only a same-navigation UI hint
        // and never removes channels from the first request.
        const first = await sendOnce(operation, {
          channels: operation.channels,
          signal: options.signal,
          onProgress: options.onProgress,
        });
        let finalResult = first;
        let resendCancelled = false;
        const relayDuplicates = getAlreadySentChannels(first);

        if (relayDuplicates.length) {
          DeliveryCache.record(operation.identity, relayDuplicates, { source: "relay-already-sent" });
          const decision = await confirmDuplicate(operation, first, options.mediaIcon);
          if (!decision.confirmed) {
            resendCancelled = true;
            Toast?.info?.({
              title: "Reenvio cancelado",
              description: getSuccessfulChannels(first).length
                ? "Os canais enviados agora foram mantidos; nenhum canal duplicado foi reenviado."
                : "Nenhuma segunda chamada de envio foi feita.",
              icon: options.mediaIcon || "circle-x",
              duration: 2_200,
            });
          } else {
            const resend = await sendOnce(operation, {
              force: true,
              channels: decision.channels,
              signal: options.signal,
              onProgress: options.onProgress,
            });
            finalResult = mergeSendResults(first, resend);
          }
        }

        const classification = classifySendResult(finalResult);
        if (classification === "success" || classification === "duplicate") setState(operation, "success");
        else if (classification === "partial" || classification === "pending") setState(operation, "partial");
        else if (resendCancelled) setState(operation, "cancelled");
        else setState(operation, "error");

        return {
          operation,
          result: finalResult,
          classification,
          syncState: classification === "success" || classification === "duplicate" ? "synced" : classification === "partial" ? "partial" : classification === "pending" ? "pending" : "failed",
          resendCancelled,
          details: details(finalResult),
          deliveredCount: getSuccessfulChannels(finalResult).length,
          coveredCount: getCoveredChannels(finalResult).length,
        };
      })().finally(() => active.delete(operation.id));
      active.set(operation.id, promise);
      return promise;
    }

    function syncStateForResult(result) {
      const requested = uniqueChannelIds(result?.channels?.requested || []);
      const covered = getCoveredChannels(result);
      const failed = getFailedChannels(result);
      const inProgress = getInProgressChannels(result);
      if (requested.length && requested.every((channelId) => covered.includes(channelId))) return "synced";
      if (covered.length) return "partial";
      if (inProgress.length && !failed.length) return "pending";
      return "failed";
    }

    function normalizeBatchItem(item, fallbackIndex) {
      const index = Number.isFinite(Number(item?.index)) ? Number(item.index) : fallbackIndex;
      const httpStatus = Number(item?.status || item?.httpStatus || 0);
      const result = {
        httpStatus,
        ok: item?.ok === true,
        partial: item?.partial === true || httpStatus === 207,
        conflict: item?.conflict === true || httpStatus === 409,
        channels: normalizeSendChannels(item, item?.channels?.requested || []),
        payload: item,
      };
      const inserted = getSuccessfulChannels(result);
      const dupes = getAlreadySentChannels(result);
      const duplicateInBatch = (result.channels?.notSent || []).filter((entry) => isDuplicateInBatchReason(entry?.reason));
      const failed = getFailedChannels(result);
      const inProgress = getInProgressChannels(result);
      let state = "failed";
      if (inserted.length && (dupes.length || duplicateInBatch.length || failed.length || inProgress.length)) state = "partially_sent";
      else if (inserted.length) state = "sent";
      else if (dupes.length && !failed.length && !duplicateInBatch.length && !inProgress.length) state = "already_sent";
      else if (duplicateInBatch.length && !failed.length && !dupes.length && !inProgress.length) state = "duplicate_in_batch";
      else if (inProgress.length && !failed.length) state = "pending";
      return { index, state, syncState: syncStateForResult(result), result };
    }

    function reconcileBatchDuplicateCoverage(items, originals) {
      const identities = originals.map((payload) => DeliveryCache.identityFromPayload(payload || {}));
      return items.map((entry) => {
        const duplicateFailures = (entry.result?.channels?.notSent || []).filter((failure) => isDuplicateInBatchReason(failure?.reason));
        if (!duplicateFailures.length) return { ...entry, syncState: syncStateForResult(entry.result) };
        const covered = new Set(entry.result?.channels?.covered || []);
        for (const failure of duplicateFailures) {
          const channelId = String(failure.channelId || "");
          if (!channelId) continue;
          let sibling = Number.isFinite(Number(failure.duplicateOfIndex)) ? items.find((candidate) => candidate.index === Number(failure.duplicateOfIndex)) : null;
          if (!sibling) {
            sibling = items.find((candidate) => candidate.index !== entry.index && identities[candidate.index] === identities[entry.index] && getCoveredChannels(candidate.result).includes(channelId));
          }
          if (sibling && getCoveredChannels(sibling.result).includes(channelId)) covered.add(channelId);
        }
        const result = {
          ...entry.result,
          channels: { ...entry.result.channels, covered: uniqueChannelIds([...covered]) },
        };
        return { ...entry, result, syncState: syncStateForResult(result) };
      });
    }

    async function sendBatch(operation, options = {}) {
      if (active.has(operation.id)) return active.get(operation.id);
      const promise = (async () => {
        setState(operation, "sending");
        const firstEnvelope = await RelayClient.sendBatch(operation.payload, {
          signal: options.signal || null,
          onProgress: options.onProgress,
        });
        const rawResults = Array.isArray(firstEnvelope.payload?.results) ? firstEnvelope.payload.results : [];
        const originalsForCache = Array.isArray(operation.payload.items)
          ? operation.payload.items
          : (operation.payload.links || []).map((url) => ({ url }));
        const firstItems = reconcileBatchDuplicateCoverage(rawResults.map(normalizeBatchItem), originalsForCache);
        firstItems.forEach((entry) => {
          const payload = originalsForCache[entry.index] || {};
          const identity = DeliveryCache.identityFromPayload(payload);
          DeliveryCache.recordResult(identity, entry.result, { source: "batch" });
          if (options.cacheConfirmedDuplicates === true) {
            DeliveryCache.record(identity, getAlreadySentChannels(entry.result), { source: "batch-already-sent" });
          }
        });
        const conflicts = firstItems
          .map((entry) => ({
            entry,
            channels: getAlreadySentChannels(entry.result),
          }))
          .filter((entry) => entry.channels.length);

        if (!conflicts.length) {
          const synced = firstItems.filter((item) => item.syncState === "synced").length;
          const partial = firstItems.filter((item) => item.syncState === "partial" || item.syncState === "pending").length;
          setState(operation, synced === firstItems.length ? "success" : (synced || partial) ? "partial" : "error");
          return { operation, envelope: firstEnvelope, items: firstItems, resendCancelled: false };
        }

        if (options.confirmDuplicates === false) {
          const synced = firstItems.filter((item) => item.syncState === "synced").length;
          const partial = firstItems.filter((item) => ["partial", "pending"].includes(item.syncState)).length;
          setState(operation, synced === firstItems.length ? "success" : (synced || partial) ? "partial" : "error");
          return { operation, envelope: firstEnvelope, items: firstItems, resendCancelled: false, duplicatesSkipped: true };
        }

        setState(operation, "waiting-confirmation");
        const conflictItemCount = conflicts.length;
        const decision = await Toast.confirm({
          title: "Mídias já enviadas",
          description: `${conflictItemCount} ${conflictItemCount === 1 ? "mídia já foi enviada" : "mídias já foram enviadas"} anteriormente. Deseja reenviar somente ${conflictItemCount === 1 ? "essa mídia" : `essas ${conflictItemCount} mídias`}?`,
          icon: options.mediaIcon || "refresh",
          duration: 0,
          dismissible: true,
          dismissValue: "cancel",
          actions: [
            { id: "cancel", label: "Cancelar", variant: "secondary", value: "cancel" },
            { id: "resend", label: `Reenviar ${conflictItemCount} ${conflictItemCount === 1 ? "mídia" : "mídias"}`, variant: "primary", value: "resend" },
          ],
        });

        if (decision !== "resend") {
          const cancelled = firstItems.map((item) => item.state === "already_sent" ? { ...item, state: "cancelled" } : item);
          setState(operation, firstItems.some((item) => ["sent", "partially_sent"].includes(item.state)) ? "partial" : "cancelled");
          Toast?.info?.({ title: "Reenvio do batch cancelado", description: "Nenhuma segunda chamada para os itens duplicados foi feita.", icon: options.mediaIcon || "circle-x", duration: 2_200 });
          return { operation, envelope: firstEnvelope, items: cancelled, resendCancelled: true };
        }

        const originals = Array.isArray(operation.payload.items)
          ? operation.payload.items
          : (operation.payload.links || []).map((url) => ({ url }));
        const resendItems = conflicts.map(({ entry, channels: conflictChannels }) => ({
          ...(originals[entry.index] || {}),
          channels: conflictChannels,
          force: true,
        }));
        setState(operation, "resending");
        const resendEnvelope = await RelayClient.sendBatch({
          ...operation.payload,
          links: undefined,
          channels: undefined,
          channel: undefined,
          force: undefined,
          items: resendItems,
        }, {
          signal: options.signal || null,
          onProgress: options.onProgress,
        });
        const resendRaw = Array.isArray(resendEnvelope.payload?.results) ? resendEnvelope.payload.results : [];
        const resendByOriginalIndex = new Map();
        resendRaw.forEach((item, resendIndex) => {
          const originalIndex = conflicts[resendIndex]?.entry.index;
          if (originalIndex == null) return;
          resendByOriginalIndex.set(originalIndex, normalizeBatchItem(item, resendIndex));
        });

        let mergedItems = firstItems.map((firstItem) => {
          const resent = resendByOriginalIndex.get(firstItem.index);
          if (!resent) return firstItem;
          const merged = mergeSendResults(firstItem.result, resent.result);
          const inserted = getSuccessfulChannels(merged);
          const dupes = getAlreadySentChannels(merged);
          const failures = getFailedChannels(merged);
          let state = "failed";
          if (inserted.length && (dupes.length || failures.length)) state = "partially_sent";
          else if (inserted.length) state = "sent";
          else if (dupes.length && !failures.length) state = "already_sent";
          return { ...firstItem, state, syncState: syncStateForResult(merged), result: merged };
        });
        mergedItems = reconcileBatchDuplicateCoverage(mergedItems, originals);
        mergedItems.forEach((entry) => {
          const payload = originals[entry.index] || {};
          DeliveryCache.recordResult(DeliveryCache.identityFromPayload(payload), entry.result, { source: "batch-resend" });
        });
        const successful = mergedItems.filter((item) => item.syncState === "synced").length;
        const partial = mergedItems.filter((item) => ["partial", "pending"].includes(item.syncState)).length;
        setState(operation, successful === mergedItems.length ? "success" : (successful || partial) ? "partial" : "error");
        return { operation, envelope: firstEnvelope, resendEnvelope, items: mergedItems, resendCancelled: false };
      })().finally(() => active.delete(operation.id));
      active.set(operation.id, promise);
      return promise;
    }

    async function sendBatchWithUi(payload, options = {}) {
      const operation = createBatchOperation(payload);
      const items = Array.isArray(payload?.items)
        ? payload.items
        : (payload?.links || []).map((url) => ({ url }));
      const manager = Toast.multiLoading({
        id: `aio:relay-batch:${operation.id}`,
        title: options.title || "Enviando ao Telegram",
        viewportRatio: 0.5,
        successDuration: 1_800,
        successMorphDelay: 180,
        successFadeDuration: 260,
        cancellable: true,
        cancelAllLabel: "Cancelar todos",
        autoDismiss: true,
        showSummary: true,
        metadata: { operationId: operation.id, source: options.source || "relay-batch" },
      });

      const rowIds = items.map((item, index) => {
        const identity = DeliveryCache.identityFromPayload(item || {});
        const rowId = `${operation.id}:${index}:${String(item?.id || item?.mediaId || identity || `media-${index + 1}`)}`;
        const title = String(
          item?.filename ||
          item?.title ||
          item?.metadata?.filename ||
          `${item?.provider || "mídia"} ${index + 1}`,
        );
        const icon = item?.thumbnail || item?.thumb || item?.poster || options.mediaIcon || "upload";
        manager?.add?.({
          id: rowId,
          title,
          description: "Aguardando…",
          icon: typeof icon === "string" && /^https?:|^blob:|^data:/i.test(icon)
            ? { src: icon, fit: "cover", loading: "lazy", decoding: "async" }
            : icon,
          cancellable: true,
          metadata: { index, provider: item?.provider || null, mediaId: item?.mediaId || null },
          retry: async ({ signal, progress, update }) => {
            update({ description: "Tentando novamente…", progress: null });
            const retryPayload = {
              ...payload,
              links: undefined,
              items: [{ ...item, channels: item?.channels || payload?.channels }],
            };
            const retryOperation = createBatchOperation(retryPayload);
            const retryOutput = await sendBatch(retryOperation, {
              ...options,
              signal,
            });
            const entry = retryOutput.items?.[0];
            if (!entry || entry.syncState === "failed" || entry.state === "cancelled") {
              throw new Error(entry?.result?.payload?.error || "Falha no retry da mídia.");
            }
            update({ description: entry.syncState === "synced" ? "Sincronizada" : "Processada pelo relay", progress: 1 });
            return retryOutput;
          },
        });
        return rowId;
      });

      if (!manager || !items.length) {
        return sendBatch(operation, options);
      }

      let sharedPromise = null;
      let sharedStarted = false;
      const batchController = new AbortController();
      const abortedRows = new Set();
      const parentSignal = options.signal || null;
      const abortBatchFromParent = () => {
        try { batchController.abort(parentSignal?.reason || new DOMException("Batch cancelado.", "AbortError")); } catch {}
      };
      if (parentSignal) {
        if (parentSignal.aborted) abortBatchFromParent();
        else parentSignal.addEventListener("abort", abortBatchFromParent, { once: true });
      }

      const runShared = () => {
        if (!sharedPromise) {
          sharedStarted = true;
          for (const rowId of rowIds) {
            manager.update?.(rowId, { description: "Processando no relay…", progress: null, cancellable: false });
          }
          sharedPromise = sendBatch(operation, {
            ...options,
            signal: batchController.signal,
            onProgress() {
              // /batch is synchronous. HTTP transfer bytes are not Telegram task
              // progress, so keep rows indeterminate until their result arrives.
            },
          }).finally(() => {
            try { parentSignal?.removeEventListener?.("abort", abortBatchFromParent); } catch {}
          });
        }
        return sharedPromise;
      };

      const settled = await Promise.allSettled(
        rowIds.map((rowId, index) =>
          manager.run(rowId, async ({ signal, progress, update }) => {
            const onAbort = () => {
              abortedRows.add(rowId);
              if (abortedRows.size === rowIds.length && !batchController.signal.aborted) {
                try { batchController.abort(signal.reason || new DOMException("Batch cancelado.", "AbortError")); } catch {}
              }
            };
            if (signal.aborted) onAbort();
            else signal.addEventListener("abort", onAbort, { once: true });
            update({ description: sharedStarted ? "Processando no relay…" : "Preparando lote…", progress: null });
            const output = await runShared();
            const entry = output.items?.find((candidate) => Number(candidate.index) === index) || output.items?.[index];
            if (!entry) throw new Error("O relay não retornou resultado para esta mídia.");

            if (entry.state === "failed") {
              const failure = entry.result?.channels?.notSent?.[0];
              throw new Error(failure?.error || entry.result?.payload?.error || "Falha no envio desta mídia.");
            }
            if (entry.state === "cancelled") {
              const error = new DOMException("Envio cancelado.", "AbortError");
              throw error;
            }

            const sent = getSuccessfulChannels(entry.result).length;
            const duplicates = getAlreadySentChannels(entry.result).length;
            const failed = getFailedChannels(entry.result).length;
            update({
              description:
                entry.syncState === "synced" && entry.state === "already_sent"
                  ? "Já sincronizada"
                  : entry.syncState === "synced" && entry.state === "duplicate_in_batch"
                    ? "Coberta por outro item do batch"
                    : entry.syncState === "synced"
                      ? `Sincronizada em ${getCoveredChannels(entry.result).length} ${getCoveredChannels(entry.result).length === 1 ? "canal" : "canais"}`
                      : entry.syncState === "pending"
                        ? "Entrega já em andamento no relay"
                        : entry.syncState === "partial"
                          ? `${getCoveredChannels(entry.result).length} coberto(s) · ${failed} falha(s)`
                          : `Enviada para ${sent} ${sent === 1 ? "canal" : "canais"}`,
              progress: 1,
              metadata: { state: entry.state, sent, duplicates, failed },
            });
            return entry;
          }),
        ),
      );

      const output = await sharedPromise;
      const logical = output.items.reduce((accumulator, item) => {
        accumulator[item.syncState] = (accumulator[item.syncState] || 0) + 1;
        return accumulator;
      }, {});
      const transport = output.items.reduce((accumulator, item) => {
        accumulator[item.state] = (accumulator[item.state] || 0) + 1;
        return accumulator;
      }, {});
      const failed = Number(logical.failed || 0);
      const partial = Number(logical.partial || 0);
      const pending = Number(logical.pending || 0);
      const cancelled = Number(transport.cancelled || 0);
      const synced = Number(logical.synced || 0);

      if (failed || partial || pending || cancelled) {
        Toast?.warning?.({
          title: "Batch concluído com detalhes",
          description: [
            synced ? `${synced} sincronizada(s)` : "",
            partial ? `${partial} parcial(is)` : "",
            pending ? `${pending} em andamento` : "",
            failed ? `${failed} falha(s)` : "",
            cancelled ? `${cancelled} cancelada(s)` : "",
          ].filter(Boolean).join(" · "),
          icon: options.mediaIcon || "upload",
          details: { syncStates: logical, transportStates: transport, items: output.items },
          duration: 5_000,
        });
      }

      return { ...output, uiSettled: settled };
    }

    function createBatchOperation(payload) {
      return createOperation({ kind: "batch", context: null, items: [], payload, prepared: null, channels: uniqueChannelIds(payload.channels || (payload.channel ? [payload.channel] : [])) });
    }

    return Object.freeze({
      createOperation,
      createBatchOperation,
      sendWithDuplicateConfirmation,
      sendBatch,
      sendBatchWithUi,
      getAlreadySentChannels,
      getSuccessfulChannels,
      getCoveredChannels,
      getInProgressChannels,
      getFailedChannels,
      isDuplicateConflict,
      activeCount: () => active.size,
    });
  })();

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

  function twitterContainerHasMediaCandidate(root) {
    if (!isElement(root)) return false;
    return Boolean(
      root.matches?.('video,[data-testid="videoPlayer"],[data-testid="videoComponent"],[data-testid="tweetPhoto"]') ||
      root.querySelector?.('video,[data-testid="videoPlayer"],[data-testid="videoComponent"],[data-testid="tweetPhoto"] img,img[src*="pbs.twimg.com/media/"]')
    );
  }

  function twitterIsImmersiveRoot(root) {
    if (!isElement(root) || !root.isConnected) return false;
    const semantic = Boolean(
      root.matches?.('[data-testid="media-viewer"],[data-testid="swipe-to-dismiss"],[role="dialog"],[aria-modal="true"]') ||
      root.closest?.('#layers,[data-testid="media-viewer"]')
    );
    if (!semantic || !twitterContainerHasMediaCandidate(root)) return false;
    const visible = Media.visibleRect(root);
    return Boolean(visible || root.querySelector?.('video'));
  }

  function twitterImmersiveRoots(scope = document) {
    const candidates = [];
    const seen = new Set();
    const add = (value) => {
      if (!isElement(value) || seen.has(value) || !twitterIsImmersiveRoot(value)) return;
      seen.add(value);
      candidates.push(value);
    };

    if (isElement(scope)) {
      add(scope);
      add(scope.closest?.('[data-testid="media-viewer"]'));
      add(scope.closest?.('[data-testid="swipe-to-dismiss"]'));
      add(scope.closest?.('[role="dialog"]'));
      add(scope.closest?.('[aria-modal="true"]'));
    }

    for (const candidate of scope.querySelectorAll?.(
      '[data-testid="media-viewer"],[data-testid="swipe-to-dismiss"],[role="dialog"],[aria-modal="true"]',
    ) || []) add(candidate);

    return candidates.sort((left, right) => Media.visibleScore(right) - Media.visibleScore(left));
  }

  function twitterRootFromElement(element) {
    if (!isElement(element)) return null;

    // Media viewer nodes are aggressively replaced by X when the user taps a
    // video. Prefer the stable immersive shell over a recycled nested article.
    for (const selector of [
      '[data-testid="media-viewer"]',
      '[data-testid="swipe-to-dismiss"]',
      '[role="dialog"]',
      '[aria-modal="true"]',
    ]) {
      const candidate = element.closest?.(selector);
      if (twitterIsImmersiveRoot(candidate)) return candidate;
    }

    return (
      element.closest?.('[data-testid="tweet"]') ||
      element.closest?.('article[data-testid="tweet"]') ||
      element.closest?.("article") ||
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

      async items(options = {}) {
        const forAction = options?.forAction === true;
        let capturedItems = statusId ? TwitterStore.items(statusId) : [];
        // Syndication and Twirrl are action-only. UI refreshes never trigger
        // provider traffic merely to decide which icon to draw.
        if (forAction && statusId && !capturedItems.length) {
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

        const scopedCapturedItems = forAction
          ? capturedItems
          : capturedItems.filter((item) =>
              item.kind === MEDIA_KIND.photo ? presence.hasPhoto : presence.hasVideo,
            );
        const capturedPhotos = scopedCapturedItems.filter((item) => item.kind === MEDIA_KIND.photo);
        const capturedVideos = scopedCapturedItems.filter((item) => item.kind === MEDIA_KIND.video);
        const domPhotos = domItems.filter((item) => item.kind === MEDIA_KIND.photo);
        const domVideos = domItems.filter((item) => item.kind === MEDIA_KIND.video);
        const localVideoCandidates = Media.sortItems([...capturedVideos, ...domVideos, ...performanceItems]);
        const mp4 = localVideoCandidates.filter((item) => Media.isMp4(item.url));
        const localBest = localVideoCandidates.length
          ? [...(mp4.length ? mp4 : localVideoCandidates)].sort(
              (left, right) => Number(right.score || 0) - Number(left.score || 0),
            )[0]
          : null;

        // Captured slots are authoritative for mixed-media Tweets. DOM photos
        // are only a fallback, and a single local video is appended only when
        // capture did not already identify video slots.
        let items = Media.dedupeItems([
          ...(capturedPhotos.length ? capturedPhotos : domPhotos),
          ...capturedVideos,
          ...(!capturedVideos.length && localBest ? [localBest] : []),
        ]).sort((a, b) => {
          const ao = Number.isFinite(Number(a?.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
          const bo = Number.isFinite(Number(b?.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
          return ao - bo;
        });

        if (forAction && presence.hasVideo && TwitterDirectResolver.enabled()) {
          items = await TwitterDirectResolver.resolveItems(
            {
              providerId: "twitter",
              root,
              target,
              pageUrl: PayloadSanitizer.cleanUrl(pageUrl),
              metadata: { statusId: statusId || "" },
            },
            items,
          );
        }

        return items;
      },
    };
  }

  function twitterRootForStatusId(statusId) {
    const id = String(statusId || "").trim();
    if (!id) return null;

    for (const immersive of twitterImmersiveRoots(document)) {
      if (twitterStatusId(immersive) === id || location.href.includes(`/status/${id}`)) return immersive;
    }

    const links = [
      ...document.querySelectorAll?.(`a[href*="/status/${id}"]`) || [],
    ];
    for (const link of links) {
      const root = twitterRootFromElement(link);
      if (root && twitterStatusId(root) === id) return root;
    }

    for (const candidate of document.querySelectorAll?.(
      '[data-testid="tweet"],article[data-testid="tweet"],article',
    ) || []) {
      if (twitterStatusId(candidate) === id) return candidate;
    }

    return null;
  }

  function twitterContextFromStatusId(statusId) {
    const id = String(statusId || "").trim();
    if (!id) return null;
    const root = twitterRootForStatusId(id);
    if (root) return twitterContext(root);

    const visibleTarget = [
      ...document.querySelectorAll?.('video,[data-testid="videoPlayer"],[data-testid="videoComponent"],[data-testid="tweetPhoto"] img,img[src*="pbs.twimg.com/media/"]') || [],
    ]
      .filter((element) => isElement(element) && element.isConnected && Media.visibleRect(element))
      .sort((left, right) => Media.visibleScore(right) - Media.visibleScore(left))[0] || null;

    const pageUrl = `https://x.com/i/status/${id}`;
    return {
      providerId: "twitter",
      target: visibleTarget,
      root: twitterRootFromElement(visibleTarget),
      pageUrl,
      hostname: "x.com",
      title: "Twitter/X",
      text: "",
      metadata: { statusId: id, syntheticFromNetwork: true },
      async refresh() {
        const nextRoot = twitterRootForStatusId(id);
        return nextRoot ? twitterContext(nextRoot) : twitterContextFromStatusId(id);
      },
      async items(options = {}) {
        let values = TwitterStore.items(id);
        if (!values.length) values = await TwitterStore.fetchSyndication(id);
        values = Media.dedupeItems(values).sort((a, b) => {
          const ao = Number.isFinite(Number(a?.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
          const bo = Number.isFinite(Number(b?.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
          return ao - bo;
        });
        if (TwitterDirectResolver.enabled() && values.some((item) => item.kind === MEDIA_KIND.video)) {
          try {
            values = await TwitterDirectResolver.resolveItems(
              { providerId: "twitter", target: visibleTarget, root: null, pageUrl, metadata: { statusId: id } },
              values,
            );
          } catch {}
        }
        return values;
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
    if (element.closest?.("#aio-media-actions-root")) return false;
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
  // Carousel media selection via the OFFICIAL RodToaster v4.7 media picker.
  //
  // The picker renders real image/video previews, knows mixed carousels and
  // returns the selected ids. Every item begins selected by default unless the
  // user changes that preference in Settings Center.
  // ---------------------------------------------------------------------------

  const CarouselSelection = (() => {
    function itemCaption(context, item, index) {
      const individualCaptions = Settings.get("carousel.individualCaptions", true);
      const explicit = individualCaptions
        ? PayloadSanitizer.cleanText(item?.caption || "", { maxLength: 4_000 })
        : "";
      if (explicit) return explicit;

      return index === 0
        ? PayloadSanitizer.cleanText(context?.text || "", { maxLength: 4_000 })
        : "";
    }

    function entries(context, items) {
      return items.map((item, index) => {
        const id = `media-${index}`;
        const caption = itemCaption(context, item, index);
        const kindLabel =
          item.kind === MEDIA_KIND.video
            ? "VÍDEO"
            : item.kind === MEDIA_KIND.photo
              ? "FOTO"
              : "ÁUDIO";
        const captionPreview = PayloadSanitizer.cleanText(caption, {
          maxLength: 72,
        });

        return {
          id,
          index,
          label: `${String(index + 1).padStart(2, "0")} · ${kindLabel}${captionPreview ? ` · ${captionPreview}` : ""}`,
          item: {
            ...item,
            caption,
            order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
          },
        };
      });
    }

    function pickerItems(context, sourceEntries) {
      return sourceEntries.map((entry) => {
        const item = entry.item;
        // Do not borrow the currently visible slide as another video's poster.
        // When a video has no captured poster, RodToaster v4.7 renders the video
        // source itself, which is more truthful than duplicating another slide.
        const preview = MediaToast.previewFromItem(item);
        const video = item.kind === MEDIA_KIND.video;
        return {
          id: entry.id,
          type: video ? "video" : "image",
          kind: video ? "video" : "photo",
          src: String(item.url || ""),
          ...(video && preview ? { poster: preview } : {}),
          label: entry.label,
          title: entry.item.caption || entry.label,
          alt: entry.label,
          selected: Settings.get("carousel.selectAllByDefault", true),
        };
      });
    }

    async function selectWithOfficialToaster(context, sourceEntries) {
      if (Toast?.available !== true || Toast?.canPicker !== true) {
        const icon = await MediaToast.icon(
          context,
          sourceEntries.map((entry) => entry.item),
          "image",
        );
        Toast?.warning?.({
          title: "RodToaster media picker indisponível",
          description:
            "O AIO precisa do RodToaster v4.7+ para mostrar as mídias do carrossel. " +
            "Para não descartar arquivos, todas as mídias serão enviadas.",
          icon,
          duration: 7_000,
        });
        return sourceEntries.map((entry) => entry.item);
      }

      const selectAllByDefault = Settings.get("carousel.selectAllByDefault", true);
      const media = pickerItems(context, sourceEntries);
      const icon = await MediaToast.icon(
        context,
        sourceEntries.map((entry) => entry.item),
        "image",
      );

      const result = await Toast.picker({
        title: "Carrossel detectado",
        description:
          `${sourceEntries.length} mídias encontradas. ` +
          "Selecione fotos e vídeos para enviar. Todas ficam selecionadas por padrão.",
        icon,
        items: media,
        multiple: true,
        minSelected: 1,
        maxSelected: sourceEntries.length,
        defaultAllSelected: selectAllByDefault,
        defaultSelected: selectAllByDefault ? "all" : [],
        columns: 2,
        itemMinWidth: 112,
        aspectRatio: "1 / 1",
        gap: 8,
        showLabels: true,
        showType: true,
        showSelectionTools: true,
        selectAllLabel: "Selecionar todas",
        clearAllLabel: "Limpar",
        imageLabel: "Foto",
        videoLabel: "Vídeo",
        emptyMessage: "Nenhuma mídia disponível neste carrossel.",
        videoPreload: "metadata",
        returnType: "ids",
        returnMeta: true,
        countLabel: "{selected} de {total}",
        confirmLabel: "Enviar selecionadas",
        confirmIcon: "upload",
        dynamicConfirmLabel: true,
        dismissValue: null,
        detailsLabel: "Captions",
        details: sourceEntries.map((entry) => ({
          index: entry.index + 1,
          type: entry.item.kind,
          caption: entry.item.caption || "",
          preview: MediaToast.previewFromItem(entry.item) || "",
          url: entry.item.url,
        })),
        metadata: {
          provider: context.providerId,
          pageUrl: context.pageUrl,
          total: sourceEntries.length,
          picker: "rod-toaster-v4.7",
        },
      });

      if (!result) return [];

      // picker({ returnMeta: true }) returns a metadata object even when the
      // dialog is cancelled/closed. Never treat its still-selected thumbnails
      // as an implicit confirmation.
      const resultValue =
        result && typeof result === "object" && "value" in result
          ? result.value
          : result;
      const resultReason = String(result?.reason || "").toLowerCase();
      if (
        resultValue == null ||
        result?.actionId === "cancel" ||
        ["close", "swipe", "dismiss", "escape", "cancel"].includes(resultReason)
      ) {
        return [];
      }

      const selectedIds = Array.isArray(result?.selectedIds)
        ? result.selectedIds.map(String)
        : Array.isArray(resultValue)
          ? resultValue.map(String)
          : [];

      if (!selectedIds.length) return [];
      const selectedSet = new Set(selectedIds);
      return sourceEntries
        .filter((entry) => selectedSet.has(entry.id))
        .map((entry) => entry.item);
    }

    async function select(context, items) {
      const cleanItems = Media.sortItems(items || []);
      if (
        Settings.get("carousel.selectionDialog", true) === false ||
        cleanItems.length < 2
      ) {
        return cleanItems;
      }

      return selectWithOfficialToaster(context, entries(context, cleanItems));
    }

    return Object.freeze({ select, entries, pickerItems });
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
      if (
        context?.providerId === "twitter" &&
        item?.kind === MEDIA_KIND.video &&
        !Media.isMp4(item?.url) &&
        TwitterDirectResolver.enabled()
      ) {
        task?.update?.({ description: `Resolvendo URL direta do vídeo ${index + 1}/${total} no X/Twitter…` });
        const directItem = await TwitterDirectResolver.item(context, item);
        if (directItem?.url) item = directItem;
      }

      if (item.kind === MEDIA_KIND.video && Media.isHls(item.url) && !Settings.get("players.hls", true)) {
        throw new Error("HLS está desativado nas configurações do AIO Downloader.");
      }
      if (item.kind === MEDIA_KIND.video && Media.isDash(item.url) && !Settings.get("players.dash", true)) {
        throw new Error("DASH está desativado nas configurações do AIO Downloader.");
      }
      if (item.kind === MEDIA_KIND.video && Media.isDash(item.url)) {
        throw new Error("DASH/MPD deve ser resolvido pelo Worker. Download local do manifesto não representa o vídeo final.");
      }
      if (item.kind === MEDIA_KIND.video && Media.isHls(item.url)) {
        if (!Settings.get("players.localRemuxFallback", false)) {
          throw new Error("Remux HLS local está desativado. O fluxo padrão é Worker-first para evitar WASM/CORS no Safari.");
        }
        task?.update?.({
          description: `Fallback local HLS ${index + 1}/${total}…`,
        });

        return HlsRuntime.prepare(
          item.url,
          context.providerId,
          (percentage) =>
            task?.setProgress?.(percentage, {
              description: `Fallback HLS local ${index + 1}/${total} · ${percentage}%`,
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

    async sendTelegramItem(context, item, index, total, task, mediaIcon = null, targetChannels = null, signal = null) {
      if (
        context?.providerId === "twitter" &&
        item?.kind === MEDIA_KIND.video &&
        !Media.isMp4(item?.url) &&
        TwitterDirectResolver.enabled()
      ) {
        task?.update?.({ description: `Obtendo MP4 direto do X/Twitter ${index + 1}/${total}…` });
        const directItem = await TwitterDirectResolver.item(context, item);
        if (directItem?.url) item = directItem;
      }

      const manifest = item.kind === MEDIA_KIND.video && (Media.isHls(item.url) || Media.isDash(item.url));
      if (Media.isHls(item.url) && !Settings.get("players.hls", true)) throw new Error("HLS está desativado nas configurações.");
      if (Media.isDash(item.url) && !Settings.get("players.dash", true)) throw new Error("DASH está desativado nas configurações.");

      // First request is always URL-first. The v2.8 relay claims D1 delivery slots before HLS
      // preparation/download, so duplicate detection costs no local remux or blob.
      if (Media.isHttp(item.url)) {
        task?.update?.({
          description: manifest
            ? `Consultando relay e enviando manifesto ${index + 1}/${total}…`
            : `Enviando ${item.kind === MEDIA_KIND.photo ? "foto" : item.kind === MEDIA_KIND.audio ? "áudio" : "vídeo"} ${index + 1}/${total}…`,
        });
        const operation = Telegram.createSingleOperation(context, item, index, total, null, targetChannels);
        try {
          return await TelegramSendController.sendWithDuplicateConfirmation(operation, {
            mediaIcon,
            signal,
            onProgress(current, totalBytes) {
              task?.setProgress?.(totalBytes > 0 ? current / totalBytes : null, {
                description: totalBytes > 0
                  ? `${formatBytes(current)} / ${formatBytes(totalBytes)}`
                  : "Processando no relay…",
              });
            },
          });
        } catch (error) {
          // Only a preparation/protocol failure with no channel-level delivery can
          // enter the existing local HLS/file fallback. Partial Telegram outcomes
          // are never retried automatically.
          const status = Number(error?.httpStatus || 0);
          if (manifest && status !== 422) throw error;
          if (!manifest && status && status !== 422) throw error;
          debug("Relay URL-first não conseguiu preparar a mídia; avaliando fallback local", error);
        }
      }

      if (Media.isDash(item.url)) {
        throw new Error("O relay não conseguiu preparar o DASH/MPD. O AIO não baixa o XML do manifesto como se fosse vídeo.");
      }
      if (Media.isHls(item.url) && !Settings.get("players.localRemuxFallback", false)) {
        throw new Error("O relay não conseguiu preparar o HLS e o fallback FFmpeg/WASM local está desligado.");
      }

      const prepared = await this.prepare(context, item, index, total, task);
      task?.update?.({ description: `Enviando arquivo já preparado ${index + 1}/${total}…` });
      const operation = Telegram.createSingleOperation(context, item, index, total, prepared, targetChannels);
      return TelegramSendController.sendWithDuplicateConfirmation(operation, {
        mediaIcon,
        signal,
        onProgress(current, totalBytes) {
          task?.setProgress?.(totalBytes > 0 ? current / totalBytes : null, {
            description: totalBytes > 0
              ? `${formatBytes(current)} / ${formatBytes(totalBytes)}`
              : "Processando no relay…",
          });
        },
      });
    },

    carouselRouteGroups(context, items) {
      const cleanContext = PayloadSanitizer.context(context);
      const channelToIndexes = new Map();
      items.forEach((item, index) => {
        for (const channelId of channels(cleanContext.providerId, cleanContext.pageUrl, item.kind)) {
          const values = channelToIndexes.get(channelId) || [];
          values.push(index);
          channelToIndexes.set(channelId, values);
        }
      });
      const groups = new Map();
      for (const [channelId, indexes] of channelToIndexes) {
        const signature = indexes.join(",");
        const group = groups.get(signature) || { indexes, channels: [] };
        group.channels.push(channelId);
        groups.set(signature, group);
      }
      return [...groups.values()].map((group) => ({
        channels: uniqueChannelIds(group.channels),
        items: group.indexes.map((index) => items[index]).filter(Boolean),
        indexes: group.indexes,
      }));
    },

    async sendCarousel(context, items, task, mediaIcon) {
      const groups = this.carouselRouteGroups(context, items);
      if (!groups.length) throw new Error("Nenhum canal Telegram foi configurado para este carrossel.");
      const outcomes = [];
      for (const group of groups) {
        if (!group.items.length) continue;
        if (group.items.length === 1) {
          const originalIndex = group.indexes[0] ?? 0;
          outcomes.push(await this.sendTelegramItem(
            context,
            group.items[0],
            originalIndex,
            items.length,
            task,
            mediaIcon,
            group.channels,
          ));
          continue;
        }
        const albumCompatible = group.items.every(
          (item) => Media.isHttp(item?.url) && !Media.isHls(item?.url) && !Media.isDash(item?.url) && [MEDIA_KIND.photo, MEDIA_KIND.video].includes(item?.kind),
        );
        if (!albumCompatible) {
          // A logical carousel cannot be decomposed into multiple sends to the
          // same channel because D1 correctly treats the publication as one key.
          // Social carousels normally expose direct photo/MP4 URLs; fail clearly
          // rather than creating a broken duplicate history.
          throw new Error("Este carrossel contém mídia que não pode ser enviada como um único álbum lógico. O relay precisa receber URLs diretas de foto/vídeo para preservar a deduplicação da publicação.");
        }
        task?.update?.({ description: `Enviando carrossel com ${group.items.length} mídias…` });
        const operation = Telegram.createAlbumOperation(context, group.items, group.channels);
        outcomes.push(await TelegramSendController.sendWithDuplicateConfirmation(operation, { mediaIcon }));
      }
      return outcomes;
    },

    async run(action, context, runOptions = {}) {
      if (!Settings.get("general.enabled", true)) {
        throw new Error("AIO Downloader está desativado nas configurações.");
      }
      if (action === ACTION.telegram && !Settings.get("general.telegram", true)) {
        throw new Error("Envio para Telegram está desativado nas configurações.");
      }
      const seededContext = runOptions.inspected?.context || context;
      const seededItems = runOptions.inspected?.items || [];
      let mediaIcon = MediaToast.descriptorSync(
        seededContext,
        seededItems,
        action === ACTION.telegram ? "upload" : "download",
      );

      const task = Toast.loading({
        title:
          action === ACTION.telegram
            ? "Enviando para Telegram"
            : "Preparando download",
        description: "Resolvendo mídia…",
        icon: mediaIcon,
        animation: "spinner",
        duration: 0,
      });

      try {
        const inspected = runOptions.inspected || await this.inspect(context);
        context = inspected.context;
        if (!inspected.items.length) {
          throw new Error("Nenhuma foto ou vídeo foi encontrado neste post.");
        }

        mediaIcon = await MediaToast.icon(
          context,
          inspected.items,
          action === ACTION.telegram ? "upload" : "download",
        );
        task?.update?.({ icon: mediaIcon });

        const total = inspected.items.length;

        if (action === ACTION.telegram) {
          const isLogicalCarousel = total > 1 && Boolean(
            context.providerId === "twitter" ||
            context.metadata?.isCarousel === true ||
            context.metadata?.selectionMode === "carousel-all" ||
            context.metadata?.selectionMode === "carousel-selected",
          );
          let outcomes = [];

          if (isLogicalCarousel) {
            outcomes = await this.sendCarousel(context, inspected.items, task, mediaIcon);
          } else if (total > 1 && Toast?.canMultiLoading) {
            task?.dismiss?.("multi-loading");
            const manualBatchId = `aio:telegram:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`;
            const manager = Toast.multiLoading({
              id: manualBatchId,
              title: "Enviando ao Telegram",
              viewportRatio: 0.5,
              successDuration: 1_700,
              successMorphDelay: 160,
              successFadeDuration: 240,
              cancellable: true,
              cancelAllLabel: "Cancelar todos",
              autoDismiss: true,
              showSummary: true,
              metadata: { source: "aio-manual-send", provider: context.providerId, count: total },
            });

            const rowIds = inspected.items.map((item, index) => {
              const rowId = `${manualBatchId}:${index}`;
              const preview = MediaToast.previewFromItem(item);
              manager.add({
                id: rowId,
                title: Media.filename(item?.url || "", context.providerId, item?.kind, index, total),
                description: "Aguardando…",
                icon: preview ? { src: preview, fit: "cover", loading: "lazy", decoding: "async" } : mediaIcon,
                cancellable: true,
                metadata: { index, kind: item?.kind || null },
              });
              return rowId;
            });

            for (let index = 0; index < total; index += 1) {
              const rowId = rowIds[index];
              try {
                const outcome = await manager.run(rowId, async ({ signal, progress, update }) => {
                  const itemTask = {
                    update(next = {}) { update(next); return itemTask; },
                    setProgress(value, next = {}) { progress(value, next); return itemTask; },
                  };
                  return this.sendTelegramItem(
                    context,
                    inspected.items[index],
                    index,
                    total,
                    itemTask,
                    MediaToast.descriptorSync(context, [inspected.items[index]], "upload"),
                    null,
                    signal,
                  );
                });
                outcomes.push(outcome);
              } catch (error) {
                if (error?.name === "AbortError") {
                  outcomes.push({ operation: { state: "cancelled" }, result: null, error });
                  continue;
                }
                outcomes.push({ operation: { state: "error" }, result: null, error });
              }
            }
          } else {
            for (let index = 0; index < total; index += 1) {
              outcomes.push(await this.sendTelegramItem(
                context,
                inspected.items[index],
                index,
                total,
                task,
                mediaIcon,
              ));
            }
          }

          const channelResults = outcomes.map((entry) => entry?.result).filter(Boolean);
          const requested = uniqueChannelIds(channelResults.flatMap((result) => result?.channels?.requested || []));
          const inserted = uniqueChannelIds(channelResults.flatMap((result) => getSuccessfulChannels(result)));
          const duplicates = uniqueChannelIds(channelResults.flatMap((result) => getAlreadySentChannels(result)));
          const covered = uniqueChannelIds(channelResults.flatMap((result) => getCoveredChannels(result)));
          const inProgress = uniqueChannelIds(channelResults.flatMap((result) => getInProgressChannels(result)));
          const failures = channelResults.flatMap((result) => getFailedChannels(result));
          const cancelled = outcomes.some((entry) => entry?.operation?.state === "cancelled");
          const allCovered = requested.length > 0 && requested.every((channelId) => covered.includes(channelId));

          // Local history is only a visual convenience. It is updated after an
          // actual D1-backed delivery but is never consulted to block Telegram.
          if (inserted.length) {
            MediaUsage.markMany(context, inspected.items, action, {
              transport: isLogicalCarousel ? "telegram-logical-carousel" : "telegram-relay",
              trigger: String(runOptions.trigger || "button"),
              channels: inserted,
            });
            History.mark(context, action, {
              count: total,
              kinds: inspected.items.map((item) => item.kind),
              trigger: String(runOptions.trigger || "button"),
              channels: inserted,
            });
          }

          const detailPayload = {
            enviadosAgora: inserted,
            jaEnviados: duplicates,
            cobertos: covered,
            emAndamento: inProgress,
            naoEnviados: failures.map((item) => ({
              canal: item.channelId,
              motivo: item.reason,
              erro: item.error || null,
            })),
          };

          if (allCovered && !failures.length && !inProgress.length) {
            task?.success?.({
              title: inserted.length
                ? `Sincronizado em ${covered.length} ${covered.length === 1 ? "canal" : "canais"}`
                : "Já sincronizado",
              icon: mediaIcon,
              description: inserted.length && duplicates.length
                ? `${inserted.length} enviado(s) agora · ${duplicates.length} já existia(m) no D1.`
                : inserted.length
                  ? (isLogicalCarousel ? `${total} mídias do carrossel foram entregues.` : "Entrega concluída pelo relay.")
                  : "Todos os canais solicitados já possuíam esta mídia.",
              details: detailPayload,
            });
          } else if (covered.length || inProgress.length) {
            task?.dismiss?.("partial-result");
            Toast?.warning?.({
              title: covered.length ? "Sincronização parcial" : "Entrega em andamento",
              icon: mediaIcon,
              description: [
                covered.length ? `${covered.length} ${covered.length === 1 ? "canal coberto" : "canais cobertos"}` : "",
                failures.length ? `${failures.length} ${failures.length === 1 ? "falha" : "falhas"}` : "",
                inProgress.length ? `${inProgress.length} em andamento` : "",
              ].filter(Boolean).join(" · "),
              details: detailPayload,
              duration: 6_000,
            });
          } else if (cancelled) {
            task?.dismiss?.("duplicate-cancelled");
          } else {
            const error = new Error(failures[0]?.error || (inProgress.length ? "A entrega ainda está em andamento no relay." : "Nenhum canal recebeu a mídia."));
            error.relayDetails = detailPayload;
            throw error;
          }

          if (!runOptions.skipSocialAfterTelegram && inserted.length) {
            void Social.afterTelegram(context, { delivered: true }).catch((error) =>
              debug("Ações sociais pós-Telegram falharam", error),
            );
          }
          return { requested, inserted, duplicates, covered, inProgress, failures, cancelled, outcomes };
        }

        if (!Settings.get("general.directDownload", false)) {
          throw new Error("O botão de download está desativado na configuração.");
        }

        if (total > 1 && Toast?.canMultiLoading) {
          task?.dismiss?.("multi-loading");
          const downloadBatchId = `aio:download:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`;
          const manager = Toast.multiLoading({
            id: downloadBatchId,
            title: "Preparando downloads",
            viewportRatio: 0.5,
            successDuration: 1_500,
            cancellable: true,
            cancelAllLabel: "Cancelar todos",
            autoDismiss: true,
            showSummary: true,
            metadata: { source: "aio-download", count: total },
          });
          const rowIds = inspected.items.map((item, index) => {
            const rowId = `${downloadBatchId}:${index}`;
            const preview = MediaToast.previewFromItem(item);
            manager.add({
              id: rowId,
              title: Media.filename(item?.url || "", context.providerId, item?.kind, index, total),
              description: "Aguardando…",
              icon: preview ? { src: preview, fit: "cover", loading: "lazy", decoding: "async" } : mediaIcon,
              cancellable: true,
            });
            return rowId;
          });

          for (let index = 0; index < total; index += 1) {
            const item = inspected.items[index];
            try {
              await manager.run(rowIds[index], async ({ signal, progress, update }) => {
                if (signal.aborted) throw signal.reason;
                const itemTask = {
                  update(next = {}) { update(next); return itemTask; },
                  setProgress(value, next = {}) { progress(value, next); return itemTask; },
                };
                const prepared = await this.prepare(context, item, index, total, itemTask);
                if (signal.aborted) throw signal.reason;
                Media.downloadBlob(prepared.blob, prepared.filename);
                MediaUsage.mark(context, item, index, action, {
                  transport: "browser-download",
                  filename: prepared.filename,
                });
                progress(1, { description: "Download iniciado" });
              });
            } catch (error) {
              if (error?.name !== "AbortError") debug("Download individual falhou", error);
            }
            await sleep(80);
          }
        } else {
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
        }

        History.mark(context, action, {
          count: total,
          kinds: inspected.items.map((item) => item.kind),
        });

        task?.success?.({
          title: total > 1 ? `${total} downloads iniciados` : "Download iniciado",
          icon: mediaIcon,
          description:
            total > 1
              ? "Todos os itens do post foram preparados para download."
              : "Download iniciado.",
        });
      } catch (error) {
        if (
          action === ACTION.telegram &&
          context?.providerId === "twitter" &&
          !runOptions.skipSocialAfterTelegram &&
          Settings.get("twitter.repostAfterAttempt", false)
        ) {
          void Social.afterTelegram(context, { delivered: false, error }).catch((socialError) =>
            debug("Retweet pós-tentativa falhou", socialError),
          );
        }

        task?.error?.({
          title:
            action === ACTION.telegram ? "Falha ao enviar" : "Falha no download",
          description: truncate(error?.message || String(error)),
          icon: mediaIcon,
        });
        throw error;
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Social actions
  // ---------------------------------------------------------------------------

  const Social = {
    async twitterRepost(context) {
      const statusId = String(context?.metadata?.statusId || "").trim();
      let root = context?.root || twitterRootFromElement(context?.target);
      if ((!root || !root.isConnected) && statusId) root = twitterRootForStatusId(statusId);
      if (!root) return false;
      if (root.querySelector?.('[data-testid="unretweet"],[data-testid="unrepost"]')) return true;

      const repostButton = root.querySelector?.('[data-testid="retweet"],[data-testid="repost"]');
      if (!repostButton) return false;

      try { TwitterSocialNetworkBridge?.suppress?.("repost", statusId); } catch {}
      try { repostButton.click(); } catch { return false; }

      const started = Date.now();
      const timeout = Math.max(1_000, Number(CONFIG.twitter.repostConfirmWindowMs) || 2_800);
      while (Date.now() - started < timeout) {
        if (root.querySelector?.('[data-testid="unretweet"],[data-testid="unrepost"]')) return true;

        const menuItems = [
          ...document.querySelectorAll?.('[role="menuitem"],div[role="menuitem"]') || [],
        ];
        const action = menuItems.find((element) => BookmarkBridge.twitterIsRepostMenuAction(element));
        if (action) {
          try { action.click(); } catch {}
          await sleep(140);
          return true;
        }
        await sleep(70);
      }
      return false;
    },

    async afterTelegram(context, options = {}) {
      const provider = context?.providerId;
      const delivered = options.delivered !== false;
      const mediaIcon = await MediaToast.icon(context, [], "image");

      if (provider === "twitter") {
        const statusId = String(context?.metadata?.statusId || "").trim();
        let root = context.root || twitterRootFromElement(context.target);
        if ((!root || !root.isConnected) && statusId) root = twitterRootForStatusId(statusId);

        // This option intentionally runs for both successful Worker delivery and
        // failed attempts. It is independent of the "Repost → Telegram" trigger.
        if (Settings.get("twitter.repostAfterAttempt", false)) {
          try {
            const reposted = await this.twitterRepost({ ...context, root });
            if (reposted && Settings.get("twitter.networkSocialFeedback", true)) {
              Toast?.info?.({
                title: delivered ? "Repost pós-envio" : "Repost pós-tentativa",
                description: delivered
                  ? "O Tweet foi repostado depois do envio."
                  : "O Tweet foi repostado mesmo com falha no Worker.",
                icon: mediaIcon,
                duration: 2_400,
              });
            }
          } catch (error) {
            debug("Twitter repost after attempt", error);
          }
        }

        if (!delivered) return;

        if (Settings.get("twitter.bookmarkAfterSend", false)) {
          try {
            if (!root?.querySelector?.('[data-testid="removeBookmark"]')) {
              try { TwitterSocialNetworkBridge?.suppress?.("bookmark", statusId); } catch {}
              root?.querySelector?.('[data-testid="bookmark"]')?.click();
            }
          } catch (error) {
            debug("Twitter bookmark after Telegram", error);
          }
        }

        const alreadyLiked = Boolean(root?.querySelector?.('[data-testid="unlike"]'));
        if (
          Settings.get("twitter.autoLikeAfterSend", false) &&
          !alreadyLiked
        ) {
          try {
            try { TwitterSocialNetworkBridge?.suppress?.("like", statusId); } catch {}
            root?.querySelector?.('[data-testid="like"]')?.click();
          } catch (error) {
            debug("Twitter auto-like after Telegram", error);
          }
          return;
        }

        if (
          Settings.get("twitter.promptLikeAfterSend", true) &&
          Toast?.canConfirm === true &&
          !alreadyLiked
        ) {
          const like = await Toast.confirm({
            title: "Deseja dar like também?",
            description: "A confirmação desaparece em 3 segundos.",
            icon: mediaIcon,
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
              try { TwitterSocialNetworkBridge?.suppress?.("like", statusId); } catch {}
              root?.querySelector?.('[data-testid="like"]')?.click();
            } catch {}
          }
        }

        return;
      }

      if (provider === "instagram" && delivered) {
        if (Settings.get("instagram.bookmarkAfterSend", false)) {
          try {
            await InstagramBookmark.save(context);
          } catch (error) {
            debug("Instagram bookmark after Telegram", error);
          }
        }

        if (Settings.get("instagram.autoLikeAfterSend", false)) {
          try {
            const root = context.root || instagramRootFromElement(context.target);
            const likeButton = BookmarkBridge.instagramLikeButton(root);
            likeButton?.click();
          } catch (error) {
            debug("Instagram auto-like after Telegram", error);
          }
        }
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Native social interception. Trusted Like/Bookmark/Repost actions can relay that post.
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
      twitterLikes: 0,
      twitterReposts: 0,
      instagramClicks: 0,
      instagramLikes: 0,
      relayed: 0,
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

    instagramIsLikeButton(button) {
      if (!isElement(button)) return false;
      const labels = this.labels(button).join(" | ");
      if (!labels) return false;
      if (
        /\b(unlike|descurtir|remover curtida|remover like|remove like|liked|curtido)\b/i.test(labels)
      ) {
        return false;
      }
      return /(?:^|\b)(?:like|curtir|dar like|gostei)(?:\b|$)/i.test(labels);
    },

    instagramLikeButton(root) {
      if (!isElement(root)) return null;
      for (const button of root.querySelectorAll?.('button,[role="button"]') || []) {
        if (this.instagramIsLikeButton(button)) return button;
      }
      return null;
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
      const key = `${identity}|${trigger}`;
      const now = Date.now();
      if (now - Number(this.recent.get(key) || 0) < 2500) return false;
      if (this.inFlight.has(identity)) return false;

      pruneExpiredMap(this.recent, 60_000, now);
      touchBoundedMap(this.recent, key, now, 256);
      this.inFlight.add(identity);

      try {
        const relayResult = await Actions.run(ACTION.telegram, context, {
          trigger,
          skipSocialAfterTelegram: true,
        });
        const delivered = Array.isArray(relayResult?.inserted) && relayResult.inserted.length > 0;
        if (delivered) this.counters.relayed += 1;
        return delivered;
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
          if (!event.isTrusted || !Settings.get("general.enabled", true) || !Settings.get("general.telegram", true)) return;

          const elements = this.eventElements(event);
          if (!elements.length) return;
          if (
            elements.some(
              (element) =>
                element.closest?.("#aio-media-actions-root") ||
                false,
            )
          ) {
            return;
          }

          if (IS_TWITTER && Settings.get("twitter.enabled", true)) {
            if (Settings.get("twitter.likeTrigger", false)) {
              const unlike = this.closestFromEvent(event, '[data-testid="unlike"]');
              if (unlike) return;

              const likeButton = this.closestFromEvent(event, '[data-testid="like"]');
              if (likeButton) {
                this.counters.twitterLikes += 1;
                const context = this.twitterContextFromButton(likeButton);
                setTimeout(
                  () => void this.relay(context, "twitter-like"),
                  120,
                );
                return;
              }
            }

            if (Settings.get("twitter.bookmarkTrigger", true)) {
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

            if (Settings.get("twitter.repostTrigger", true)) {
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

          if (IS_INSTAGRAM && Settings.get("instagram.enabled", true)) {
            let actionElement = this.closestFromEvent(
              event,
              'button,[role="button"]',
            );

            if (!actionElement) {
              actionElement = elements.find(
                (element) =>
                  this.instagramIsLikeButton(element) ||
                  this.instagramIsSaveButton(element),
              ) || null;
            }

            if (!actionElement) return;

            if (
              Settings.get("instagram.likeTrigger", false) &&
              this.instagramIsLikeButton(actionElement)
            ) {
              this.counters.instagramLikes += 1;
              const context = this.instagramContextFromButton(actionElement);
              setTimeout(
                () => void this.relay(context, "instagram-like"),
                120,
              );
              return;
            }

            if (
              Settings.get("instagram.bookmarkTrigger", true) &&
              this.instagramIsSaveButton(actionElement)
            ) {
              this.counters.instagramClicks += 1;
              const context = this.instagramContextFromButton(actionElement);

              setTimeout(
                () => void this.relay(context, "instagram-bookmark"),
                120,
              );
            }
          }
        },
        true,
      );

      log("BookmarkBridge instalado", {
        twitterBookmark:
          IS_TWITTER && Settings.get("twitter.bookmarkTrigger", true),
        twitterRepost:
          IS_TWITTER && Settings.get("twitter.repostTrigger", true),
        twitterLike:
          IS_TWITTER && Settings.get("twitter.likeTrigger", false),
        instagramBookmark:
          IS_INSTAGRAM && Settings.get("instagram.bookmarkTrigger", true),
        instagramLike:
          IS_INSTAGRAM && Settings.get("instagram.likeTrigger", false),
      });
    },
  };

  // ---------------------------------------------------------------------------
  // Twitter/X GraphQL social mutation interceptor.
  //
  // DOM clicks are useful for immediate context, but X can recycle the action
  // bar before the relay starts. This bridge confirms the real fetch/XHR
  // mutation (CreateBookmark/CreateRetweet/FavoriteTweet), extracts tweet_id
  // and resolves the post again by status id. Programmatic post-send actions
  // are explicitly suppressed so they never create relay loops.
  // ---------------------------------------------------------------------------

  const TwitterSocialNetworkBridge = (() => {
    let installed = false;
    const suppression = new Map();
    const recent = new Map();
    const pending = new Map();
    const counters = {
      fetchRequests: 0,
      xhrRequests: 0,
      matched: 0,
      bookmarks: 0,
      reposts: 0,
      likes: 0,
      suppressed: 0,
      relays: 0,
      relayFailures: 0,
      last: null,
    };

    function operationFromUrl(url) {
      let text = String(url || "");
      try { text = decodeURIComponent(text); } catch {}
      const graph = text.match(/\/graphql\/[^/]+\/([^/?#]+)/i)?.[1] || "";
      const operation = graph || text;
      if (/DeleteBookmark|RemoveBookmark/i.test(operation)) return { kind: "bookmark", create: false };
      if (/CreateBookmark|BookmarkTweet|AddBookmark/i.test(operation)) return { kind: "bookmark", create: true };
      if (/DeleteRetweet|UndoRetweet|Unretweet|Unrepost/i.test(operation)) return { kind: "repost", create: false };
      if (/CreateRetweet|CreateRepost|RetweetTweet/i.test(operation)) return { kind: "repost", create: true };
      if (/UnfavoriteTweet|UnlikeTweet/i.test(operation)) return { kind: "like", create: false };
      if (/FavoriteTweet|LikeTweet/i.test(operation)) return { kind: "like", create: true };
      return null;
    }

    function bodyText(value) {
      if (value == null) return "";
      if (typeof value === "string") return value;
      try {
        if (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) return value.toString();
      } catch {}
      try { return JSON.stringify(value); } catch { return String(value || ""); }
    }

    function findTweetIdInObject(value, depth = 0, seen = new WeakSet()) {
      if (!value || typeof value !== "object" || depth > 8) return null;
      if (seen.has(value)) return null;
      seen.add(value);
      for (const [key, child] of Object.entries(value)) {
        if (/^(?:tweet_?id|status_?id|rest_?id|tweetId)$/i.test(key)) {
          const id = String(child || "").match(/\d{5,}/)?.[0];
          if (id) return id;
        }
      }
      for (const child of Object.values(value)) {
        const id = findTweetIdInObject(child, depth + 1, seen);
        if (id) return id;
      }
      return null;
    }

    function statusIdFrom(url, rawBody) {
      const direct = String(url || "").match(/\/status\/(\d+)/)?.[1];
      if (direct) return direct;
      const text = bodyText(rawBody);
      for (const pattern of [
        /["']tweet_id["']\s*:\s*["']?(\d{5,})/i,
        /["']tweetId["']\s*:\s*["']?(\d{5,})/i,
        /["']status_id["']\s*:\s*["']?(\d{5,})/i,
        /tweet_id%22%3A%22?(\d{5,})/i,
      ]) {
        const id = text.match(pattern)?.[1];
        if (id) return id;
      }
      try {
        const parsed = JSON.parse(text);
        const id = findTweetIdInObject(parsed);
        if (id) return id;
      } catch {}
      try {
        const match = String(url || "").match(/[?&]variables=([^&#]+)/i)?.[1];
        if (match) {
          const parsed = JSON.parse(decodeURIComponent(match));
          const id = findTweetIdInObject(parsed);
          if (id) return id;
        }
      } catch {}
      return location.href.match(/\/status\/(\d+)/)?.[1] || null;
    }


    function suppressionKey(kind, statusId) {
      return `${String(kind || "")}|${String(statusId || "*")}`;
    }

    function suppress(kind, statusId, duration = CONFIG.twitter.socialMutationSuppressMs) {
      const until = Date.now() + Math.max(1_000, Number(duration) || 4_000);
      touchBoundedMap(suppression, suppressionKey(kind, statusId || "*"), until, 128);
    }

    function isSuppressed(kind, statusId) {
      const now = Date.now();
      for (const key of [suppressionKey(kind, statusId), suppressionKey(kind, "*")]) {
        const until = Number(suppression.get(key) || 0);
        if (until > now) {
          suppression.delete(key);
          return true;
        }
        if (until) suppression.delete(key);
      }
      return false;
    }

    async function feedback(descriptor, context, transport, status, relayEnabled) {
      if (!Settings.get("twitter.networkSocialFeedback", true)) return;
      const noun = descriptor.kind === "bookmark" ? "Bookmark" : descriptor.kind === "repost" ? "Repost" : "Like";
      const icon = await MediaToast.icon(context, [], "image");
      Toast?.info?.({
        title: `${noun} interceptado pela rede`,
        description: `${transport.toUpperCase()} · HTTP ${status || "OK"}${relayEnabled ? " · relay acionado" : " · relay desativado"}`,
        icon,
        duration: Math.max(1_200, Number(CONFIG.twitter.socialMutationFeedbackMs) || 2_400),
        dedupe: true,
      });
    }

    async function handle(descriptor, transport, status = 200) {
      if (
        !descriptor?.create ||
        !Settings.get("general.enabled", true) ||
        !Settings.get("twitter.enabled", true) ||
        !Settings.get("twitter.networkSocialInterception", true)
      ) return;
      const dedupeKey = `${descriptor.kind}|${descriptor.statusId || "*"}`;
      const now = Date.now();
      pruneExpiredMap(recent, 2_500, now);
      if (now - Number(recent.get(dedupeKey) || 0) < 1_200) return;
      touchBoundedMap(recent, dedupeKey, now, 128);
      counters.matched += 1;
      if (descriptor.kind === "bookmark") counters.bookmarks += 1;
      if (descriptor.kind === "repost") counters.reposts += 1;
      if (descriptor.kind === "like") counters.likes += 1;
      counters.last = { ...descriptor, transport, status, at: Date.now() };

      if (isSuppressed(descriptor.kind, descriptor.statusId)) {
        counters.suppressed += 1;
        return;
      }

      const context = descriptor.statusId
        ? twitterContextFromStatusId(descriptor.statusId)
        : twitterContextFromStatusId(location.href.match(/\/status\/(\d+)/)?.[1]);
      const triggerEnabled =
        descriptor.kind === "bookmark"
          ? Settings.get("twitter.bookmarkTrigger", true)
          : descriptor.kind === "repost"
            ? Settings.get("twitter.repostTrigger", true)
            : Settings.get("twitter.likeTrigger", false);
      const relayEnabled = Boolean(triggerEnabled && Settings.get("general.telegram", true));

      void feedback(descriptor, context, transport, status, relayEnabled).catch(() => {});
      if (!relayEnabled || !context) return;

      try {
        const relayed = await BookmarkBridge.relay(context, `twitter-${descriptor.kind}-network`);
        if (relayed) counters.relays += 1;
      } catch (error) {
        counters.relayFailures += 1;
        debug("Twitter social network relay falhou", error);
      }
    }

    async function inspectBrokerRequest(event) {
      const operation = operationFromUrl(event?.url);
      if (!operation) return null;
      let body = event?.rawBody;
      if (body == null && typeof event?.getBody === "function") {
        try { body = await event.getBody(); } catch {}
      }
      return {
        ...operation,
        url: String(event?.url || ""),
        statusId: statusIdFrom(event?.url, body),
        body: bodyText(body),
      };
    }

    function install() {
      if (installed || !IS_TWITTER) return;
      installed = true;
      NetworkBroker.subscribe("twitter-social-mutations", {
        enabled: () => IS_TWITTER && Settings.get("twitter.networkSocialInterception", true),
        matchRequest(event) {
          return Boolean(operationFromUrl(event?.url));
        },
        onRequest(event) {
          if (event.transport === "fetch") counters.fetchRequests += 1;
          else if (event.transport === "xhr") counters.xhrRequests += 1;
          const promise = inspectBrokerRequest(event).catch(() => null);
          touchBoundedMap(pending, event.requestId, { at: Date.now(), promise }, 64);
        },
        matchResponse(event) {
          return pending.has(event.requestId);
        },
        async onResponse(event) {
          const entry = pending.get(event.requestId);
          pending.delete(event.requestId);
          if (!entry || event.ok === false) return;
          const descriptor = await entry.promise;
          if (descriptor) await handle(descriptor, event.transport, Number(event.status || 200));
        },
      });
    }

    function diagnostics() {
      return {
        installed,
        enabled: IS_TWITTER && Settings.get("twitter.networkSocialInterception", true),
        feedback: Settings.get("twitter.networkSocialFeedback", true),
        suppression: suppression.size,
        recent: recent.size,
        pending: pending.size,
        broker: true,
        ...counters,
      };
    }

    return Object.freeze({ install, suppress, diagnostics });
  })();

  // ---------------------------------------------------------------------------
  // SPA navigation observer. Replaces route polling with pushState/replaceState
  // hooks plus native navigation events.
  // ---------------------------------------------------------------------------

  const NavigationObserver = (() => {
    const listeners = new Set();
    let installed = false;
    let lastHref = location.href;

    function emit(reason = "navigation") {
      const href = location.href;
      if (href === lastHref && reason !== "pageshow") return;
      const previous = lastHref;
      lastHref = href;
      for (const listener of [...listeners]) {
        try { listener({ href, previous, reason }); } catch (error) { debug("NavigationObserver listener", error); }
      }
      try { dispatchEvent(new CustomEvent("aio:navigation", { detail: { href, previous, reason } })); } catch {}
    }

    function install() {
      if (installed) return;
      installed = true;
      const marker = "__aioNavigation300";
      for (const method of ["pushState", "replaceState"]) {
        try {
          const current = history[method];
          if (typeof current !== "function" || current[marker]) continue;
          function wrappedHistory(...args) {
            const result = current.apply(this, args);
            queueMicrotask(() => emit(method));
            return result;
          }
          Object.defineProperty(wrappedHistory, marker, { value: true });
          history[method] = wrappedHistory;
        } catch {}
      }
      addEventListener("popstate", () => emit("popstate"), { passive: true });
      addEventListener("hashchange", () => emit("hashchange"), { passive: true });
      addEventListener("pageshow", () => emit("pageshow"), { passive: true });
    }

    function subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      install();
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    return Object.freeze({ install, subscribe, diagnostics: () => ({ installed, listeners: listeners.size, href: lastHref }) });
  })();

  // ---------------------------------------------------------------------------
  // Auto bookmark opened Instagram Reel
  // ---------------------------------------------------------------------------

  const InstagramOpenedReel = {
    completed: new Set(),
    inFlight: new Set(),
    lastPath: "",
    installed: false,
    unsubscribeNavigation: null,
    lastAttempts: new Map(),

    async check() {
      if (!IS_INSTAGRAM || !Settings.get("general.enabled", true) || !Settings.get("instagram.enabled", true) || !Settings.get("instagram.autoBookmarkOpenedReel", true)) return;

      const match = location.pathname.match(/^\/reel\/([^/?#]+)/i);
      if (!match?.[1]) return;

      const shortcode = match[1];
      if (this.completed.has(shortcode) || this.inFlight.has(shortcode)) return;
      const now = Date.now();
      pruneExpiredMap(this.lastAttempts, 30_000, now);
      if (now - Number(this.lastAttempts.get(shortcode) || 0) < 5_000) return;
      touchBoundedMap(this.lastAttempts, shortcode, now, 64);

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
        this.completed.delete(shortcode);
        this.completed.add(shortcode);
        while (this.completed.size > 256) {
          const oldest = this.completed.values().next().value;
          if (oldest === undefined) break;
          this.completed.delete(oldest);
        }
      } catch (error) {
        debug("Auto bookmark Reel falhou", error);
      } finally {
        this.inFlight.delete(shortcode);
      }
    },

    install() {
      if (this.installed || !IS_INSTAGRAM) return;
      this.installed = true;
      this.lastPath = location.pathname;
      this.unsubscribeNavigation = NavigationObserver.subscribe(() => {
        this.lastPath = location.pathname;
        if (Settings.get("general.enabled", true) && Settings.get("instagram.enabled", true) && Settings.get("instagram.autoBookmarkOpenedReel", true)) {
          queueMicrotask(() => void this.check());
        }
      });
      queueMicrotask(() => void this.check());
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
    let settingsButton = null;
    let installed = false;
    let unsubscribeNavigation = null;
    let identity = null;
    let lastRefreshAt = 0;

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
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-settings{display:grid;place-items:center;width:26px;height:26px;padding:0;border:.7px solid rgba(255,255,255,.20);border-radius:999px;background:var(--aio-profile-chip);color:var(--aio-profile-fg);appearance:none;-webkit-appearance:none;cursor:pointer}
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-settings svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        #aio-media-actions-root #aio-instagram-account-header .aio-profile-settings:active{transform:scale(.92)}
      `;
      (document.head || document.documentElement)?.appendChild(style);
      return style;
    }

    function ensureRoot() {
      if (!IS_INSTAGRAM || !Settings.get("general.enabled", true) || !Settings.get("instagram.enabled", true) || Settings.get("instagram.accountHeader", true) === false) return null;
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
        settingsButton = root.querySelector(".aio-profile-settings");
        if (!settingsButton) {
          settingsButton = document.createElement("button");
          settingsButton.type = "button";
          settingsButton.className = "aio-profile-settings";
          settingsButton.title = "Configurações do AIO Downloader";
          settingsButton.setAttribute("aria-label", settingsButton.title);
          settingsButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"/><path d="M19.2 13.1v-2.2l-2-.7a7.7 7.7 0 0 0-.7-1.7l.9-1.9-1.6-1.6-1.9.9a7.7 7.7 0 0 0-1.7-.7l-.7-2H9.3l-.7 2a7.7 7.7 0 0 0-1.7.7L5 5l-1.6 1.6.9 1.9a7.7 7.7 0 0 0-.7 1.7l-2 .7v2.2l2 .7c.2.6.4 1.2.7 1.7l-.9 1.9L5 19l1.9-.9c.5.3 1.1.5 1.7.7l.7 2h2.2l.7-2c.6-.2 1.2-.4 1.7-.7l1.9.9 1.6-1.6-.9-1.9c.3-.5.5-1.1.7-1.7l2-.7Z"/></svg>';
          settingsButton.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); SettingsPanel?.open?.("general"); });
          root.append(settingsButton);
        }
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

      settingsButton = document.createElement("button");
      settingsButton.type = "button";
      settingsButton.className = "aio-profile-settings";
      settingsButton.title = "Configurações do AIO Downloader";
      settingsButton.setAttribute("aria-label", settingsButton.title);
      settingsButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"/><path d="M19.2 13.1v-2.2l-2-.7a7.7 7.7 0 0 0-.7-1.7l.9-1.9-1.6-1.6-1.9.9a7.7 7.7 0 0 0-1.7-.7l-.7-2H9.3l-.7 2a7.7 7.7 0 0 0-1.7.7L5 5l-1.6 1.6.9 1.9a7.7 7.7 0 0 0-.7 1.7l-2 .7v2.2l2 .7c.2.6.4 1.2.7 1.7l-.9 1.9L5 19l1.9-.9c.5.3 1.1.5 1.7.7l.7 2h2.2l.7-2c.6-.2 1.2-.4 1.7-.7l1.9.9 1.6-1.6-.9-1.9c.3-.5.5-1.1.7-1.7l2-.7Z"/></svg>';
      settingsButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        SettingsPanel?.open?.("general");
      });

      profileLink.append(avatarShell, usernameNode);
      root.append(profileLink, versionNode, settingsButton);
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

    function refresh(force = false) {
      if (!IS_INSTAGRAM || !Settings.get("general.enabled", true) || !Settings.get("instagram.enabled", true) || Settings.get("instagram.accountHeader", true) === false) {
        if (root) root.dataset.ready = "false";
        return null;
      }

      const now = performance.now();
      if (!force && now - lastRefreshAt < 500 && root?.isConnected) return identity;
      lastRefreshAt = now;

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
      if (installed || !IS_INSTAGRAM) return;
      installed = true;
      if (Settings.get("general.enabled", true) && Settings.get("instagram.enabled", true) && Settings.get("instagram.accountHeader", true) !== false) {
        ensureRoot();
        refresh();
      }
      unsubscribeNavigation = NavigationObserver.subscribe(() => {
        if (Settings.get("general.enabled", true) && Settings.get("instagram.enabled", true) && Settings.get("instagram.accountHeader", true) !== false) refresh(true);
      });
    }

    function diagnostics() {
      return {
        enabled: IS_INSTAGRAM && Settings.get("general.enabled", true) && Settings.get("instagram.enabled", true) && Settings.get("instagram.accountHeader", true) !== false,
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

  let requestLayout = () => {};
  let queueDirtyRoot = () => {};

  const Ui = {
    root: null,
    style: null,
    sequence: 0,
    ids: new WeakMap(),
    groups: new Map(),
    targetStates: new WeakMap(),
    intersectionObserver: null,
    resizeObserver: null,

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
        return this.root;
      }

      const existing = document.getElementById("aio-media-actions-root");
      if (existing) {
        this.root = existing;
        this.ensureStyles();
        this.applySettings();
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
      this.applySettings();
      return root;
    },

    ensureStyles() {
      if (this.style?.isConnected) return;
      const style = document.createElement("style");
      style.id = "aio-media-actions-style";
      style.textContent = `
        #aio-media-actions-root{
          --aio-button-size:36px;--aio-icon-size:19px;--aio-button-opacity:.92;
          --aio-photo-color:#6D28D9;--aio-video-color:#075985;--aio-audio-color:#0F766E;
          --aio-button-bg:rgba(10,12,16,.72);--aio-button-border:rgba(255,255,255,.82);
          --aio-button-hover:rgba(4,6,10,.84);--aio-halo:rgba(255,255,255,.96)
        }
        #aio-media-actions-root .aio-group{
          position:fixed;z-index:2147483647;display:none;align-items:center;gap:6px;
          width:max-content;padding:0;border:0;background:transparent;box-shadow:none;
          pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;box-sizing:border-box
        }
        #aio-media-actions-root .aio-button-wrap{
          position:relative;display:grid;place-items:center;width:var(--aio-button-size);height:var(--aio-button-size);pointer-events:auto
        }
        #aio-media-actions-root .aio-button{
          --aio-media-color:var(--aio-video-color);
          position:relative;display:grid;place-items:center;width:var(--aio-button-size);min-width:var(--aio-button-size);
          height:var(--aio-button-size);min-height:var(--aio-button-size);padding:0;overflow:visible;
          border:1px solid var(--aio-button-border);border-radius:50%;outline:0;color:var(--aio-media-color);
          cursor:pointer;appearance:none;-webkit-appearance:none;touch-action:manipulation;box-sizing:border-box;
          isolation:isolate;background:var(--aio-button-bg);opacity:var(--aio-button-opacity);
          box-shadow:0 3px 12px rgba(0,0,0,.38),inset 0 0 0 1px rgba(0,0,0,.16);
          transform:scale(1);transition:transform 110ms ease,opacity 120ms ease,background-color 120ms ease,border-color 120ms ease
        }
        #aio-media-actions-root .aio-button::before{
          content:"";position:absolute;inset:-1px;border:1px solid #fff;border-radius:inherit;
          opacity:.76;mix-blend-mode:difference;pointer-events:none
        }
        #aio-media-actions-root[data-preset="dark"]{--aio-button-bg:rgba(3,5,8,.92);--aio-button-border:rgba(255,255,255,.28);--aio-button-hover:rgba(0,0,0,.98)}
        #aio-media-actions-root[data-preset="dark"] .aio-button::before{display:none}
        #aio-media-actions-root[data-preset="light"]{--aio-button-bg:rgba(250,250,252,.91);--aio-button-border:rgba(0,0,0,.20);--aio-button-hover:#fff;--aio-halo:rgba(0,0,0,.88)}
        #aio-media-actions-root[data-preset="light"] .aio-button::before{display:none}
        #aio-media-actions-root[data-preset="minimal"]{--aio-button-bg:rgba(0,0,0,.30);--aio-button-border:rgba(255,255,255,.24);--aio-button-hover:rgba(0,0,0,.50)}
        #aio-media-actions-root[data-preset="minimal"] .aio-button{box-shadow:0 2px 8px rgba(0,0,0,.22)}
        #aio-media-actions-root[data-preset="minimal"] .aio-button::before{opacity:.48}
        #aio-media-actions-root .aio-button:hover,#aio-media-actions-root .aio-button:focus-visible{background:var(--aio-button-hover)}
        #aio-media-actions-root .aio-button:active{transform:scale(.94)}
        #aio-media-actions-root .aio-button:disabled,#aio-media-actions-root .aio-button[aria-busy="true"]{cursor:wait;pointer-events:none;opacity:.68}
        #aio-media-actions-root .aio-button-content{position:relative;display:grid;place-items:center;width:100%;height:100%;pointer-events:none}
        #aio-media-actions-root .aio-icon-slot,#aio-media-actions-root .aio-spinner{grid-area:1/1;display:grid;place-items:center}
        #aio-media-actions-root .aio-button[aria-busy="true"] .aio-icon-slot{display:none}
        #aio-media-actions-root .aio-spinner{display:none;width:var(--aio-icon-size);height:var(--aio-icon-size);animation:aio-spin .72s linear infinite}
        #aio-media-actions-root .aio-button[aria-busy="true"] .aio-spinner{display:block}
        #aio-media-actions-root .aio-icon-slot svg{width:var(--aio-icon-size);height:var(--aio-icon-size);overflow:visible;pointer-events:none}
        #aio-media-actions-root .aio-glyph-halo{fill:none;stroke:var(--aio-halo);stroke-width:4.6;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 1px 1px rgba(0,0,0,.72))}
        #aio-media-actions-root .aio-media-glyph{fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
        #aio-media-actions-root .aio-used-dot,#aio-media-actions-root .aio-used-check{opacity:0;transition:opacity 120ms ease}
        #aio-media-actions-root .aio-used-dot{fill:#14532d;stroke:#fff;stroke-width:1.15}
        #aio-media-actions-root .aio-used-check{fill:none;stroke:#fff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        #aio-media-actions-root .aio-button[data-used="true"] .aio-used-dot,#aio-media-actions-root .aio-button[data-used="true"] .aio-used-check,
        #aio-media-actions-root .aio-button[data-used="partial"] .aio-used-dot,#aio-media-actions-root .aio-button[data-used="partial"] .aio-used-check{opacity:1}
        #aio-media-actions-root .aio-button[data-used="partial"] .aio-used-dot,#aio-media-actions-root .aio-button[data-used="partial"] .aio-used-check{opacity:.72}
        #aio-media-actions-root[data-used-indicator="false"] .aio-used-dot,#aio-media-actions-root[data-used-indicator="false"] .aio-used-check{display:none!important}
        #aio-media-actions-root .aio-button[data-used="true"]{border-color:#86efac;background:rgba(5,26,14,.82)}
        #aio-media-actions-root .aio-spinner circle{fill:none;stroke:var(--aio-halo);stroke-width:4.4;stroke-linecap:round;opacity:.96}
        #aio-media-actions-root .aio-spinner path{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
        #aio-media-actions-root .aio-button[data-kind="photo"]{--aio-media-color:var(--aio-photo-color)}
        #aio-media-actions-root .aio-button[data-kind="video"]{--aio-media-color:var(--aio-video-color)}
        #aio-media-actions-root .aio-button[data-kind="audio"]{--aio-media-color:var(--aio-audio-color)}
        @keyframes aio-spin{to{transform:rotate(360deg)}}
        @media(prefers-reduced-motion:reduce){#aio-media-actions-root .aio-button{transition:none!important}#aio-media-actions-root .aio-spinner{animation-duration:1.4s}}
      `;
      (document.head || document.documentElement)?.appendChild(style);
      this.style = style;
      this.applySettings();
    },

    applySettings() {
      const root = this.root;
      if (!root) return;
      const size = Math.max(30, Math.min(56, Number(Settings.get("appearance.buttonSize", 36)) || 36));
      const iconSize = Math.max(14, Math.min(32, Number(Settings.get("appearance.iconSize", 19)) || 19));
      const opacity = Math.max(.35, Math.min(1, Number(Settings.get("appearance.opacity", .92)) || .92));
      root.style.setProperty("--aio-button-size", `${size}px`);
      root.style.setProperty("--aio-icon-size", `${iconSize}px`);
      root.style.setProperty("--aio-button-opacity", String(opacity));
      root.style.setProperty("--aio-photo-color", String(Settings.get("appearance.photoColor", "#6D28D9")));
      root.style.setProperty("--aio-video-color", String(Settings.get("appearance.videoColor", "#075985")));
      root.style.setProperty("--aio-audio-color", String(Settings.get("appearance.audioColor", "#0F766E")));
      root.dataset.preset = String(Settings.get("appearance.preset", "contrast"));
      root.dataset.usedIndicator = String(Settings.get("appearance.showUsedIndicator", true));
    },

    ensureIntersectionObserver() {
      if (this.intersectionObserver || typeof IntersectionObserver !== "function") return this.intersectionObserver;
      this.intersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const states = this.targetStates.get(entry.target);
          if (!states) continue;
          for (const state of states) {
            state.intersecting = Boolean(entry.isIntersecting || entry.intersectionRatio > 0);
            if (!state.intersecting && state.group?.isConnected) state.group.style.display = "none";
          }
        }
        requestLayout();
      }, { root: null, rootMargin: "160px 120px", threshold: [0, 0.01] });
      return this.intersectionObserver;
    },

    ensureResizeObserver() {
      if (this.resizeObserver || typeof ResizeObserver !== "function") return this.resizeObserver;
      this.resizeObserver = new ResizeObserver((entries) => {
        if (!entries?.length) return;
        requestLayout();
      });
      return this.resizeObserver;
    },

    observeState(state, previousTarget = null) {
      const intersectionObserver = this.ensureIntersectionObserver();
      const resizeObserver = this.ensureResizeObserver();
      if (previousTarget && previousTarget !== state.target) {
        const previousStates = this.targetStates.get(previousTarget);
        if (previousStates) {
          previousStates.delete(state);
          if (!previousStates.size) {
            this.targetStates.delete(previousTarget);
            try { intersectionObserver?.unobserve(previousTarget); } catch {}
            try { resizeObserver?.unobserve(previousTarget); } catch {}
          }
        }
      }
      if (!isElement(state.target)) return;
      let states = this.targetStates.get(state.target);
      if (!states) {
        states = new Set();
        this.targetStates.set(state.target, states);
        try { intersectionObserver?.observe(state.target); } catch {}
        try { resizeObserver?.observe(state.target); } catch {}
      }
      states.add(state);
      state.intersecting = state.intersecting !== false;
    },

    unobserveState(state) {
      const target = state?.target;
      if (!isElement(target)) return;
      const states = this.targetStates.get(target);
      if (!states) return;
      states.delete(state);
      if (!states.size) {
        this.targetStates.delete(target);
        try { this.intersectionObserver?.unobserve(target); } catch {}
        try { this.resizeObserver?.unobserve(target); } catch {}
      }
    },

    pruneDisconnected() {
      const remove = [];
      const now = Date.now();
      for (const [id, state] of this.groups) {
        const groupConnected = Boolean(state?.group?.isConnected);
        const targetConnected = isElement(state?.target) && state.target.isConnected;
        const grace = Math.max(0, Number(state?.targetLossGraceMs || 0));

        if (groupConnected && targetConnected) continue;
        if (grace > 0 && groupConnected) {
          const elapsed = now - Number(state?.lastTargetSeenAt || 0);
          if (elapsed <= grace) continue;
        }
        remove.push(id);
      }
      remove.forEach((id) => this.detach(id));
      return remove.length;
    },

    clearGroups() {
      for (const state of this.groups.values()) {
        this.unobserveState(state);
        try { state.group.remove(); } catch {}
      }
      this.groups.clear();
    },

    hideAll() {
      for (const state of this.groups.values()) state.group.style.display = "none";
    },

    refreshAll() {
      for (const state of this.groups.values()) void this.refresh(state);
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

    position(group, target) {
      const visible = Media.visibleRect(target, false);
      if (!visible || !Settings.get("general.enabled", true)) {
        if (group.style.display !== "none") group.style.display = "none";
        group.style.visibility = "";
        return;
      }

      const fallbackSize = Math.max(30, Number(Settings.get("appearance.buttonSize", 36)) || 36);
      const actionCount = Math.max(1, Number(group.children?.length || 1));
      const width = fallbackSize * actionCount + Math.max(0, actionCount - 1) * 6;
      const height = fallbackSize;
      const padding = CONFIG.ui.padding;
      const viewport = window.visualViewport;
      const viewportLeft = Number(viewport?.offsetLeft || 0);
      const viewportTop = Number(viewport?.offsetTop || 0);
      const viewportWidth = Math.max(1, Number(viewport?.width || innerWidth || 1));
      const viewportHeight = Math.max(1, Number(viewport?.height || innerHeight || 1));
      const viewportRight = viewportLeft + viewportWidth;
      const viewportBottom = viewportTop + viewportHeight;
      const mediaLeft = Number(visible.left || 0);
      const mediaRight = Number(visible.right ?? (visible.left + visible.width));
      const mediaTop = Number(visible.top || 0);
      const mediaBottom = Number(visible.bottom ?? (visible.top + visible.height));
      const position = String(Settings.get("appearance.position", "center-right"));
      const centerTop = mediaTop + Math.max(0, (visible.height - height) / 2);

      let left = mediaRight - width - padding;
      let top = centerTop;

      if (position === "center-left") {
        left = mediaLeft + padding;
        top = centerTop;
      } else if (position === "top-left") {
        left = mediaLeft + padding;
        top = mediaTop + padding;
      } else if (position === "top-right") {
        left = mediaRight - width - padding;
        top = mediaTop + padding;
      } else if (position === "bottom-left") {
        left = mediaLeft + padding;
        top = mediaBottom - height - padding;
      } else if (position === "bottom-right") {
        left = mediaRight - width - padding;
        top = mediaBottom - height - padding;
      } else if (position === "custom") {
        const custom = Settings.get("appearance.customPosition", { x: .92, y: .5 }) || {};
        const x = Math.max(0, Math.min(1, Number(custom.x) || 0));
        const y = Math.max(0, Math.min(1, Number(custom.y) || 0));
        const rect = visible.source;
        left = rect.left + x * Math.max(0, rect.width - width);
        top = rect.top + y * Math.max(0, rect.height - height);
      }

      if (group.dataset.carousel === "true" && /^center-/.test(position)) {
        const liftMin = Math.max(36, Number(CONFIG.ui.button.carouselLiftMin) || 52);
        const liftMax = Math.max(liftMin, Number(CONFIG.ui.button.carouselLiftMax) || 86);
        const lift = Math.max(liftMin, Math.min(liftMax, Number(visible.height || 0) * 0.14));
        top -= lift;
      }

      left = Math.max(viewportLeft + padding, Math.min(viewportRight - width - padding, left));
      top = Math.max(viewportTop + padding, Math.min(viewportBottom - height - padding, top));

      const roundedLeft = Math.round(left);
      const roundedTop = Math.round(top);
      const layoutKey = `${roundedLeft}|${roundedTop}|${width}|${height}`;
      if (group.__aioLayoutKey !== layoutKey) {
        group.__aioLayoutKey = layoutKey;
        group.style.position = "fixed";
        group.style.left = `${roundedLeft}px`;
        group.style.top = `${roundedTop}px`;
        group.style.right = "auto";
        group.style.bottom = "auto";
      }
      group.style.visibility = "";
      if (group.style.display !== "inline-flex") group.style.display = "inline-flex";
      if (group.hasAttribute("aria-hidden")) group.removeAttribute("aria-hidden");
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
        if (event.button !== 0 || !Settings.get("appearance.draggable", true)) return;
        const rect = group.getBoundingClientRect();
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = rect.left;
        startTop = rect.top;
        dragging = false;
      });

      group.addEventListener("pointermove", (event) => {
        if (event.pointerId !== pointerId || !Settings.get("appearance.draggable", true)) return;
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
        const left = Math.max(viewportLeft + padding, Math.min(viewportLeft + viewportWidth - width - padding, startLeft + dx));
        const top = Math.max(viewportTop + padding, Math.min(viewportTop + viewportHeight - height - padding, startTop + dy));
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
          const x = Math.max(0, Math.min(1, (groupRect.left - targetRect.left) / Math.max(1, targetRect.width - groupRect.width)));
          const y = Math.max(0, Math.min(1, (groupRect.top - targetRect.top) / Math.max(1, targetRect.height - groupRect.height)));
          Settings.patch({ appearance: { position: "custom", customPosition: { x, y } } }, "drag-position");
        }
        pointerId = null;
        dragging = false;
        if (suppressClick) setTimeout(() => { suppressClick = false; }, 0);
      };

      group.addEventListener("pointerup", finish);
      group.addEventListener("pointercancel", finish);
      group.addEventListener("click", (event) => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);
    },

    bindLongPress(button) {
      let timer = 0;
      let pointerId = null;
      let startX = 0;
      let startY = 0;
      const cancel = () => {
        if (timer) clearTimeout(timer);
        timer = 0;
        pointerId = null;
      };
      button.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        timer = window.setTimeout(() => {
          timer = 0;
          button.__aioLongPressTriggered = true;
          try { navigator.vibrate?.(12); } catch {}
          SettingsPanel?.open?.("appearance");
        }, 650);
      });
      button.addEventListener("pointermove", (event) => {
        if (event.pointerId !== pointerId) return;
        if (Math.hypot(event.clientX - startX, event.clientY - startY) > 9) cancel();
      });
      button.addEventListener("pointerup", cancel);
      button.addEventListener("pointercancel", cancel);
      button.addEventListener("contextmenu", (event) => {
        if (button.__aioLongPressTriggered) event.preventDefault();
      });
    },

    actions() {
      const actions = [];
      if (Settings.get("general.telegram", true)) actions.push(ACTION.telegram);
      if (Settings.get("general.directDownload", false)) actions.push(ACTION.download);
      return actions;
    },

    attach(id, target, getContext) {
      const root = this.ensureRoot();
      if (!root || !isElement(target)) return;
      const desiredActions = this.actions();
      if (!desiredActions.length) {
        this.detach(id);
        return;
      }

      const existing = this.groups.get(id);
      if (existing?.group?.isConnected) {
        const previousTarget = existing.target;
        const targetChanged = previousTarget !== target;
        existing.target = target;
        existing.getContext = getContext;
        existing.lastTargetSeenAt = Date.now();
        if (id === "aio-twitter-immersive") {
          existing.targetLossGraceMs = Math.max(700, Number(CONFIG.twitter.immersiveTargetGraceMs) || 1_800);
        }
        if (targetChanged) {
          existing.intersecting = true;
          this.observeState(existing, previousTarget);
          void this.refresh(existing);
          requestLayout();
        }
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
        intersecting: true,
        lastTargetSeenAt: Date.now(),
        targetLossGraceMs: id === "aio-twitter-immersive"
          ? Math.max(700, Number(CONFIG.twitter.immersiveTargetGraceMs) || 1_800)
          : 0,
      };

      for (const action of desiredActions) {
        const wrap = document.createElement("span");
        wrap.className = "aio-button-wrap";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "aio-button";
        button.dataset.action = action;
        button.innerHTML = this.buttonMarkup(this.mediaGlyphIcon());
        this.setButtonKind(button, isVideoElement(target) ? MEDIA_KIND.video : isAudioElement(target) ? MEDIA_KIND.audio : MEDIA_KIND.photo);
        this.bindLongPress(button);
        state.buttons.set(action, button);

        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (button.__aioLongPressTriggered) {
            button.__aioLongPressTriggered = false;
            return;
          }
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

            if (action !== ACTION.telegram && usage.anyUsed && Settings.get("history.confirmBeforeRepeat", true)) {
              const usageIcon = await MediaToast.icon(
                inspected.context,
                inspected.items,
                "refresh",
              );

              if (Toast?.canConfirm !== true) {
                Toast?.warning?.({
                  title: "Mídia já utilizada",
                  description: "O RodToaster carregado não oferece confirmação interativa. A ação foi cancelada para evitar repetir sem querer.",
                  icon: usageIcon,
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
                icon: usageIcon,
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
      this.observeState(state);
      void this.refresh(state);
      requestLayout();
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
            : isVideoElement(state.target) || Boolean(state.target?.querySelector?.("video"))
              ? MEDIA_KIND.video
              : isAudioElement(state.target) || Boolean(state.target?.querySelector?.("audio"))
                ? MEDIA_KIND.audio
                : MEDIA_KIND.photo;
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

      requestLayout();
    },

    repositionAll() {
      if (!this.root?.isConnected) this.ensureRoot();
      this.pruneDisconnected();

      for (const state of this.groups.values()) {
        if (state.intersecting === false && Number(state.targetLossGraceMs || 0) <= 0) continue;
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
          let recovered = null;
          try {
            const context = state.getContext?.();
            if (isElement(context?.target) && context.target.isConnected) recovered = context.target;
          } catch {}
          if (recovered) {
            const previousTarget = state.target;
            state.target = recovered;
            state.intersecting = true;
            this.observeState(state, previousTarget);
            state.lastTargetSeenAt = Date.now();
          } else if (
            Number(state.targetLossGraceMs || 0) > 0 &&
            Date.now() - Number(state.lastTargetSeenAt || 0) <= Number(state.targetLossGraceMs || 0)
          ) {
            // Keep the last fixed position visible while X swaps immersive DOM.
            continue;
          } else {
            state.group.style.display = "none";
            continue;
          }
        } else {
          state.lastTargetSeenAt = Date.now();
        }

        this.position(state.group, state.target);
      }
    },

    detach(id) {
      const state = this.groups.get(id);
      if (!state) return false;
      this.unobserveState(state);
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
        observers: {
          intersection: Boolean(this.intersectionObserver),
          resize: Boolean(this.resizeObserver),
        },
        buttonDesign: {
          mode: "contrast-difference",
          liquidGlass: false,
          defaultPosition: Settings.get("appearance.position", "center-right"),
          carouselLift: true,
          preset: Settings.get("appearance.preset", "contrast"),
          buttonSize: Settings.get("appearance.buttonSize", CONFIG.ui.button.size),
          iconSize: Settings.get("appearance.iconSize", CONFIG.ui.button.iconSize),
        },
      };
    },
  };


  // ---------------------------------------------------------------------------
  // Settings Center UI. Shadow DOM keeps host-page CSS from poisoning controls.
  // ---------------------------------------------------------------------------

  SettingsPanel = (() => {
    let host = null;
    let shadow = null;
    let installed = false;
    let unsubscribe = null;

    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    const toggle = (path, title, description = "") => `
      <label class="row row-toggle"><span class="copy"><strong>${esc(title)}</strong>${description ? `<small>${esc(description)}</small>` : ""}</span><input type="checkbox" data-setting="${esc(path)}"><span class="switch" aria-hidden="true"></span></label>`;
    const color = (path, title) => `
      <label class="row"><span class="copy"><strong>${esc(title)}</strong><small data-color-value="${esc(path)}"></small></span><input class="color" type="color" data-setting="${esc(path)}"></label>`;
    const range = (path, title, min, max, step, suffix = "", description = "") => `
      <label class="stack"><span class="range-head"><span class="copy"><strong>${esc(title)}</strong>${description ? `<small>${esc(description)}</small>` : ""}</span><output data-output-for="${esc(path)}"></output></span><input type="range" data-setting="${esc(path)}" min="${min}" max="${max}" step="${step}" data-suffix="${esc(suffix)}"></label>`;
    const select = (path, title, options) => `
      <label class="stack"><strong>${esc(title)}</strong><select data-setting="${esc(path)}">${options.map(([value,label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join("")}</select></label>`;
    const textInput = (path, title, description = "", type = "text", placeholder = "") => `
      <label class="stack"><span class="copy"><strong>${esc(title)}</strong>${description ? `<small>${esc(description)}</small>` : ""}</span><input class="text-input" type="${esc(type)}" data-setting="${esc(path)}" placeholder="${esc(placeholder)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>`;
    const section = (id, icon, title, body, open = false) => `
      <details class="section" data-section="${id}" ${open ? "open" : ""}><summary><span class="section-icon">${icon}</span><span>${esc(title)}</span><svg viewBox="0 0 24 24"><path d="m8 10 4 4 4-4"/></svg></summary><div class="section-body">${body}</div></details>`;

    function markup() {
      const positions = [
        ["center-right", "Centro · direita"], ["center-left", "Centro · esquerda"],
        ["top-right", "Topo · direita"], ["top-left", "Topo · esquerda"],
        ["bottom-right", "Base · direita"], ["bottom-left", "Base · esquerda"],
        ["custom", "Posição arrastada"],
      ];
      const presets = [["contrast","Contrast"],["dark","Dark"],["light","Light"],["minimal","Minimal"]];
      return `
        <button class="recovery" data-open-settings aria-label="Abrir configurações do AIO Downloader" title="AIO Settings">⚙</button>
        <div class="backdrop" data-close></div>
        <aside class="sheet" role="dialog" aria-modal="true" aria-label="AIO Downloader settings">
          <header class="header"><div><span class="eyebrow">AIO DOWNLOADER</span><h1>Settings Center</h1><p>v${VERSION} · settings por domínio · token isolado via GM quando disponível</p></div><button class="icon-button" data-close aria-label="Fechar"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
          <main class="content">
            ${section("general","◉","Geral",[
              toggle("general.enabled","AIO Downloader","Oculta controles e pausa scans de UI."),
              toggle("general.telegram","Telegram","Exibe e permite o botão de envio."),
              toggle("general.directDownload","Download direto","Exibe o botão de download no navegador."),
              toggle("general.universalPlayers","Providers universais","Detecta players e mídia fora de Instagram/X."),
            ].join(""), true)}
            ${section("relay","↗","Relay & chats",[
              textInput("relay.url","URL do relay","Endpoint HTTP(S) que recebe o payload do AIO.","url","https://worker.example/send"),
              textInput("relay.token","Bearer token","Enviado no Authorization. Em userscript managers compatíveis fica isolado via GM_getValue/GM_setValue, fora do localStorage da página.","password","token"),
              range("relay.timeoutSeconds","Timeout do relay",5,300,5,"s"),
              toggle("relay.providerRouting","Rotas por provider","Usa chats específicos para X, Instagram, YouTube e sites adultos. Se desligado, usa apenas Chats padrão."),
              textInput("relay.defaultChannels","Chats padrão / fallback","IDs separados por vírgula, espaço ou quebra de linha. Também aceita @username.","text","-100123,@canal"),
              textInput("relay.twitterChannels","Chats · X / Twitter","Rota base para fotos e vídeos do X.","text","-621561106,-324185513"),
              textInput("relay.instagramChannels","Chats · Instagram","Rota base do Instagram.","text","-324185513"),
              textInput("relay.youtubeChannels","Chats · YouTube","Rota base do YouTube.","text","-324185513"),
              textInput("relay.adultChannels","Chats · sites adultos","Rota base dos providers adultos configurados.","text","-621561106"),
              select("relay.mediaChannelMode","Override por tipo de mídia",[
                ["replace","Substituir rota do provider"],
                ["append","Adicionar à rota do provider"],
              ]),
              textInput("relay.photoChannels","Override · fotos","Se preenchido, fotos usam estes chats. Vazio herda a rota do provider.","text","-100123"),
              textInput("relay.videoChannels","Override · vídeos","Se preenchido, vídeos usam estes chats. Vazio herda a rota do provider.","text",""),
              textInput("relay.audioChannels","Override · áudios","Se preenchido, áudios usam estes chats. Vazio herda a rota do provider.","text",""),
              '<div class="storage-note"><span>Carrossel misto com rotas diferentes é enviado item-a-item para que cada foto/vídeo chegue ao chat correto.</span></div>',
            ].join(""))}
            ${section("appearance","◐","Aparência",[
              select("appearance.preset","Preset",presets),
              select("appearance.position","Posição padrão",positions),
              toggle("appearance.draggable","Arrastar controles","Ao arrastar, a posição vira Custom e vale para todos os posts."),
              range("appearance.buttonSize","Tamanho do botão",30,56,1,"px"),
              range("appearance.iconSize","Tamanho do ícone",14,32,1,"px"),
              range("appearance.opacity","Opacidade",0.35,1,0.01,""),
              color("appearance.photoColor","Cor · foto"),
              color("appearance.videoColor","Cor · vídeo"),
              color("appearance.audioColor","Cor · áudio"),
              toggle("appearance.showUsedIndicator","Indicador de mídia usada","Mostra o check persistido no ícone."),
              '<button class="secondary full" data-action="reset-position">Resetar posição do botão</button>',
            ].join(""))}
            ${section("instagram","◎","Instagram",[
              toggle("instagram.enabled","Ativar provider do Instagram"),
              toggle("instagram.expandMore","Expandir “more” antes de capturar"),
              toggle("instagram.bookmarkTrigger","Bookmark → Telegram","Intercepta o Save/Bookmark nativo."),
              toggle("instagram.likeTrigger","Like → Telegram / Worker","Ao curtir um post ou Reel, dispara o mesmo fluxo de captura e envio. Desligado por padrão."),
              toggle("instagram.bookmarkAfterSend","Bookmark após envio","Desligado por padrão."),
              toggle("instagram.autoLikeAfterSend","Like automático após envio","Clica em Like somente depois de o Worker concluir. Desligado por padrão."),
              toggle("instagram.autoBookmarkOpenedReel","Auto-bookmark de Reel aberto"),
              toggle("instagram.accountHeader","Header da conta","Avatar, @username, versão e acesso às configurações."),
            ].join(""))}
            ${section("twitter","𝕏","X / Twitter",[
              toggle("twitter.enabled","Ativar provider do X/Twitter"),
              toggle("twitter.expandMore","Expandir “Show more” antes de capturar"),
              toggle("twitter.bookmarkTrigger","Bookmark → Telegram"),
              toggle("twitter.repostTrigger","Repost → Telegram"),
              toggle("twitter.likeTrigger","Like → Telegram / Worker","Mesmo gatilho social do Instagram. Desligado por padrão."),
              toggle("twitter.networkSocialInterception","Confirmar Bookmark/Repost pela rede","Intercepta as mutations GraphQL reais via fetch/XHR em vez de depender apenas do clique no DOM."),
              toggle("twitter.networkSocialFeedback","Mostrar toast da interceptação","Exibe uma confirmação com thumbnail quando a mutation do X é detectada."),
              toggle("twitter.bookmarkAfterSend","Bookmark após envio","Desligado por padrão."),
              toggle("twitter.repostAfterAttempt","Retweet após tentativa","Reposta depois de clicar no AIO mesmo se o Worker falhar ou nenhuma mídia for entregue. Desligado por padrão."),
              toggle("twitter.autoLikeAfterSend","Like automático após envio","Desligado por padrão."),
              toggle("twitter.promptLikeAfterSend","Perguntar se quer dar like","Usado quando o like automático está desligado."),
              toggle("twitter.twirrlResolver","Resolver vídeo via Twirrl","Prefere MP4 direto do provider TVDL/Twirrl e evita FFmpeg/WASM local no X/Twitter."),
            ].join(""))}
            ${section("saved-sync","⇄","Saved / Bookmarks sync",[
              toggle("savedSync.enabled","Ativar sync em Saved/Bookmarks","Adiciona controles de sync nas páginas de itens salvos do Instagram e Bookmarks do X."),
              range("savedSync.batchSize","Itens por batch",1,50,1,""),
              range("savedSync.relayBatchConcurrency","Concorrência do relay",1,5,1,"","O /batch v2.8 processa de 1 a 5 posts simultaneamente. Default 3."),
              toggle("savedSync.enrichCaptions","Enriquecer captions antes do sync","Usa fetch autenticado da própria página para capturar metadados/caption sem abrir abas. Dados já interceptados pela rede continuam tendo prioridade."),
              range("savedSync.enrichmentTimeoutSeconds","Timeout por enriquecimento",5,45,1,"s"),
              toggle("savedSync.selectPendingByDefault","Selecionar pendentes automaticamente","Novos cards ainda não confirmados localmente já entram marcados para Sync selecionados."),
              toggle("savedSync.persistSeen","Persistir posts vistos em IndexedDB","Mantém posts já vistos mesmo quando a lista virtualizada remove o card do DOM."),
              toggle("savedSync.captureNetworkMedia","Capturar mídia do fetch/XHR","Reutiliza o NetworkBroker para guardar URLs diretas e a melhor variante encontrada nas respostas."),
              toggle("savedSync.directMediaFirst","Enviar mídia direta no sync","Usa mediaUrl/mediaItems capturados em vez de pedir ao relay para resolver novamente o link da postagem."),
              toggle("savedSync.relayLookupEnabled","Verificar status no relay em lote","Usa POST /media/check como fonte primária para saber se cada mídia já foi enviada."),
              range("savedSync.relayLookupBatchSize","Mídias por check D1",1,100,1,""),
              range("savedSync.relayLookupFreshMs","Freshness do check remoto",5000,300000,5000,"ms"),
              range("savedSync.maxArchivedPosts","Máximo de posts vistos persistidos",250,20000,250,""),
              '<button class="secondary full" data-action="revalidate-relay">Revalidar status no D1</button>',
              '<button class="danger full" data-action="clear-saved-archive">Limpar posts vistos / URLs salvas</button>',
              '<div class="storage-note"><span>Posts vistos e URLs de mídia ficam em IndexedDB v2, sem blobs. Conhecimento positivo do D1 usa cache longo com epoch; unknown/false é revalidado. /batch v2.8 faz o preflight final antes do trabalho caro.</span></div>',
            ].join(""))}
            ${section("carousel","▦","Carrossel",[
              toggle("carousel.selectionDialog","Selecionar mídias antes de enviar","Usa o media picker oficial do RodToaster com previews reais."),
              toggle("carousel.selectAllByDefault","Selecionar todas por padrão"),
              toggle("carousel.individualCaptions","Captions individuais","Preserva caption específico por mídia quando capturado."),
            ].join(""))}
            ${section("players","▶","Players",[
              toggle("players.interceptNetwork","Interceptar fetch/XHR"),
              toggle("players.interceptPlayers","Interceptar APIs de players"),
              toggle("players.hls","Aceitar HLS / m3u8"),
              toggle("players.dash","Aceitar DASH / mpd"),
              toggle("players.workerFirstManifests","Worker-first para HLS/DASH","Envia manifestos ao relay antes de qualquer processamento local."),
              toggle("players.localRemuxFallback","Fallback FFmpeg/WASM local","Desligado por padrão. Só usa remux HLS local se o Worker falhar. Pode consumir muita memória no Safari."),
            ].join(""))}
            ${section("history","✓","Histórico",[
              toggle("history.enabled","Rastrear mídias usadas"),
              toggle("history.confirmBeforeRepeat","Confirmar antes de repetir"),
              range("history.maxEntries","Máximo de registros",100,10000,100,""),
              '<button class="danger full" data-action="clear-history">Limpar histórico de mídia</button>',
            ].join(""))}
            ${section("advanced","⌘","Avançado",[
              toggle("advanced.debug","Debug","Logs detalhados e toasts de diagnóstico."),
              '<div class="button-grid"><button class="secondary" data-action="export">Exportar seguro</button><button class="secondary" data-action="export-secrets">Exportar + token</button></div><button class="secondary full" data-action="copy-diagnostics">Copiar diagnóstico</button>',
              '<label class="stack"><strong>Importar JSON</strong><textarea data-import-json rows="7" spellcheck="false" placeholder="Cole aqui um export do AIO Downloader…"></textarea></label>',
              '<button class="secondary full" data-action="import">Importar configurações</button>',
              '<button class="danger full" data-action="reset-all">Resetar todas as configurações</button>',
              `<div class="storage-note"><code>${SETTINGS_STORAGE_KEY}</code><span>Settings e histórico usam chaves separadas.</span></div>`,
            ].join(""))}
          </main>
          <footer class="footer"><button class="secondary" data-action="reset-settings">Restaurar defaults</button><button class="primary" data-close>Concluído</button></footer>
        </aside>`;
    }

    function ensure() {
      if (host?.isConnected && shadow) return host;
      host = document.getElementById("aio-settings-host");
      if (!host) {
        host = document.createElement("div");
        host.id = "aio-settings-host";
        host.dataset.open = "false";
        (document.body || document.documentElement)?.appendChild(host);
      }
      shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
      shadow.innerHTML = `<style>
        :host{all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif}
        *,*::before,*::after{box-sizing:border-box}
        .backdrop{position:fixed;inset:0;background:rgba(0,0,0,.48);opacity:0;transition:opacity 180ms ease;pointer-events:none;touch-action:none}
        .sheet{position:fixed;right:0;bottom:0;left:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;max-height:min(90dvh,920px);overflow:hidden;border:1px solid rgba(255,255,255,.12);border-bottom:0;border-radius:24px 24px 0 0;background:rgba(12,13,17,.985);color:#f5f5f7;box-shadow:0 -24px 80px rgba(0,0,0,.48);transform:translateY(102%);transition:transform 220ms cubic-bezier(.22,.61,.36,1);pointer-events:auto}
        :host([data-open="true"]){pointer-events:auto}:host([data-open="true"]) .backdrop{opacity:1;pointer-events:auto}:host([data-open="true"]) .sheet{transform:translateY(0)}
        .recovery{display:none;position:fixed;top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));z-index:2;width:36px;height:36px;padding:0;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(12,13,17,.92);color:#f5f5f7;box-shadow:0 6px 22px rgba(0,0,0,.35);font:700 16px/1 system-ui;pointer-events:auto}
        :host([data-disabled="true"][data-open="false"]) .recovery{display:grid;place-items:center}
        .header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 16px 13px;border-bottom:1px solid rgba(255,255,255,.08);padding-top:max(16px,env(safe-area-inset-top))}.eyebrow{display:block;color:#9ca3af;font:760 9px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em}.header h1{margin:3px 0 0;font:720 20px/1.1 inherit;letter-spacing:-.03em}.header p{margin:4px 0 0;color:#8d9199;font:520 11px/1.2 inherit}.icon-button{display:grid;place-items:center;width:38px;height:38px;padding:0;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:#191b20;color:#e5e7eb}.icon-button svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}
        .content{overflow:auto;overscroll-behavior:contain;padding:10px 10px calc(18px + env(safe-area-inset-bottom));-webkit-overflow-scrolling:touch}.section{overflow:hidden;margin-bottom:8px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:#111318}.section summary{list-style:none;display:grid;grid-template-columns:28px minmax(0,1fr) 20px;align-items:center;gap:8px;min-height:50px;padding:0 13px;cursor:pointer;color:#f7f7f8;font:680 13px/1.2 inherit}.section summary::-webkit-details-marker{display:none}.section summary svg{width:18px;height:18px;fill:none;stroke:#7f848e;stroke-width:1.8;transition:transform 150ms ease}.section[open] summary svg{transform:rotate(180deg)}.section-icon{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:#1b1e25;color:#d4d7dd;font:700 12px/1 inherit}.section-body{display:grid;gap:1px;padding:0 10px 10px}
        .row,.stack{min-width:0;border-top:1px solid rgba(255,255,255,.055);padding:11px 4px}.row:first-child,.stack:first-child{border-top:0}.row{display:flex;align-items:center;justify-content:space-between;gap:14px}.stack{display:grid;gap:8px}.copy{display:grid;gap:3px;min-width:0}.row strong,.stack strong,.range-head strong{color:#eff0f2;font:620 12px/1.3 inherit}.copy small{color:#858a94;font:480 10px/1.35 inherit}.range-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.range-head output{color:#a7abb3;font:650 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
        .row-toggle{position:relative}.row-toggle input{position:absolute;opacity:0;pointer-events:none}.switch{position:relative;flex:0 0 auto;width:42px;height:24px;border-radius:999px;background:#30333a;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);transition:background 140ms ease}.switch::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 2px 5px rgba(0,0,0,.35);transition:transform 160ms cubic-bezier(.2,.8,.2,1)}.row-toggle input:checked+.switch{background:#2f7df6}.row-toggle input:checked+.switch::after{transform:translateX(18px)}
        select,textarea,.text-input{appearance:none;-webkit-appearance:none;width:100%;min-width:0;border:1px solid rgba(255,255,255,.10);border-radius:11px;background:#1a1c22;color:#f2f3f5;outline:0;font:16px/1.35 inherit}select,.text-input{height:42px;padding:0 12px}textarea{padding:10px 11px;resize:vertical;min-height:110px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}.text-input[type="password"]{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em}.color{width:42px;height:30px;padding:0;border:1px solid rgba(255,255,255,.14);border-radius:9px;background:transparent}.color::-webkit-color-swatch-wrapper{padding:2px}.color::-webkit-color-swatch{border:0;border-radius:6px}.copy [data-color-value]{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
        input[type="range"]{width:100%;accent-color:#5b91ff}.button-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 4px}.primary,.secondary,.danger{appearance:none;-webkit-appearance:none;min-height:40px;padding:0 13px;border-radius:11px;font:650 12px/1 inherit}.primary{border:1px solid #f5f5f7;background:#f5f5f7;color:#111216}.secondary{border:1px solid rgba(255,255,255,.12);background:#1a1c22;color:#e6e7e9}.danger{border:1px solid rgba(248,113,113,.24);background:rgba(127,29,29,.20);color:#fca5a5}.full{width:100%;margin-top:8px}.storage-note{display:grid;gap:5px;margin:10px 4px 4px;padding:10px;border-radius:11px;background:#0c0d10;color:#7f848e;font:10px/1.4 inherit}.storage-note code{color:#b7bbc3;overflow-wrap:anywhere}
        .footer{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 12px max(10px,env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.08);background:#0d0f13}
        button{cursor:pointer}button:active{transform:scale(.98)}
        @media(min-width:700px){.sheet{top:12px;right:12px;bottom:12px;left:auto;width:min(440px,calc(100vw - 24px));max-height:none;border-bottom:1px solid rgba(255,255,255,.12);border-radius:22px;transform:translateX(calc(100% + 24px))}:host([data-open="true"]) .sheet{transform:translateX(0)}.header{padding-top:16px}}
        @media(prefers-reduced-motion:reduce){.sheet,.backdrop,.switch,.switch::after{transition:none!important}}
      </style>${markup()}`;
      bind();
      sync();
      return host;
    }

    function sync() {
      if (!shadow) return;
      if (host) host.dataset.disabled = String(!Settings.get("general.enabled", true));
      shadow.querySelectorAll("[data-setting]").forEach((input) => {
        const path = input.dataset.setting;
        const value = Settings.get(path);
        if (input.type === "checkbox") input.checked = Boolean(value);
        else input.value = String(value ?? "");
        const output = shadow.querySelector(`[data-output-for="${CSS.escape(path)}"]`);
        if (output) {
          const suffix = input.dataset.suffix || "";
          const display = path === "appearance.opacity" ? `${Math.round(Number(value) * 100)}%` : `${value}${suffix}`;
          output.textContent = display;
        }
        const colorValue = shadow.querySelector(`[data-color-value="${CSS.escape(path)}"]`);
        if (colorValue) colorValue.textContent = String(value || "");
      });
    }

    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(String(text));
        return true;
      } catch {}
      try {
        const textarea = document.createElement("textarea");
        textarea.value = String(text);
        textarea.style.position = "fixed";
        textarea.style.left = "-99999px";
        document.body.append(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        textarea.remove();
        return ok;
      } catch { return false; }
    }

    async function confirmAction(descriptor) {
      if (Toast?.canConfirm === true) return Toast.confirm(descriptor);
      return false;
    }

    async function action(name) {
      if (name === "reset-position") {
        Settings.patch({ appearance: { position: "center-right", customPosition: { x: .92, y: .5 } } }, "reset-position");
        Toast?.success?.({ title: "Posição resetada", description: "Center right restaurado." });
        return;
      }
      if (name === "revalidate-relay") {
        const ok = await confirmAction({
          title: "Revalidar status no D1?",
          description: "Remove somente o cache positivo local do relay para este provider e consulta novamente os cards visíveis. Mídias, captions e histórico no D1 permanecem intactos.",
          actions: [{ id:"cancel",label:"Cancelar",value:false,variant:"secondary" },{ id:"refresh",label:"Revalidar",value:true,variant:"primary" }],
        });
        if (ok !== true) return;
        const provider = SavedMediaArchive.activeProvider();
        DeliveryCache.clear();
        await SavedMediaArchive.clearRelayKnowledge(provider || null);
        try { SavedSync?.resetLocalState?.({ clearRelayKnowledge: true }); } catch {}
        const visible = [...(SavedSync?.records?.values?.() || [])].filter((record) => record?.node?.isConnected);
        try { if (visible.length) await SavedSync?.check?.(visible, { force: true }); } catch (error) { debug("Revalidação D1 falhou", error); }
        Toast?.success?.({ title: "Status revalidado", description: visible.length ? `${visible.length} card(s) visível(is) consultados.` : "Cache local limpo; os próximos cards serão consultados ao aparecer." });
        return;
      }
      if (name === "clear-saved-archive") {
        const ok = await confirmAction({ title: "Limpar posts vistos?", description: "Apaga do IndexedDB os posts/URLs capturados no Saved/Bookmarks. O histórico de entregas e o D1 não são alterados.", actions: [{ id:"cancel",label:"Cancelar",value:false,variant:"secondary" },{ id:"clear",label:"Limpar",value:true,variant:"danger" }] });
        if (ok !== true) return;
        await SavedMediaArchive.clear();
        try { SavedSync?.resetLocalState?.({ clearArchivedRecords: true, clearRelayKnowledge: true }); } catch {}
        Toast?.success?.({ title: "Arquivo de posts vistos limpo" });
        return;
      }
      if (name === "clear-history") {
        const ok = await confirmAction({ title: "Limpar histórico?", description: "Apaga os checks e registros de mídias usadas. Suas configurações permanecem.", actions: [{ id:"cancel",label:"Cancelar",value:false,variant:"secondary" },{ id:"clear",label:"Limpar",value:true,variant:"danger" }] });
        if (ok !== true) return;
        History.clear();
        MediaUsage.clear();
        DeliveryCache.clear();
        await SavedMediaArchive.clearRelayKnowledge();
        try { SavedSync?.resetLocalState?.({ clearRelayKnowledge: true }); } catch {}
        Ui.refreshAll();
        Toast?.success?.({ title: "Histórico limpo" });
        return;
      }
      if (name === "export" || name === "export-secrets") {
        const includeSecrets = name === "export-secrets";
        if (includeSecrets) {
          const ok = await confirmAction({
            title: "Exportar Bearer token?",
            description: "Esse JSON contém a credencial do relay. Compartilhe somente com você mesmo.",
            actions: [
              { id: "cancel", label: "Cancelar", value: false, variant: "secondary" },
              { id: "export", label: "Exportar com token", value: true, variant: "danger" },
            ],
          });
          if (ok !== true) return;
        }
        const json = Settings.export(true, includeSecrets);
        const textarea = shadow?.querySelector("[data-import-json]");
        if (textarea) textarea.value = json;
        const copied = await copyText(json);
        Toast?.success?.({
          title: includeSecrets ? "Export completo copiado" : "Export seguro copiado",
          description: copied ? (includeSecrets ? "JSON inclui o Bearer token." : "Bearer token foi omitido.") : "JSON colocado no campo de importação.",
        });
        return;
      }
      if (name === "import") {
        const textarea = shadow?.querySelector("[data-import-json]");
        const raw = String(textarea?.value || "").trim();
        if (!raw) {
          Toast?.warning?.({ title: "Cole um JSON primeiro", description: "Use um export do AIO Downloader." });
          return;
        }
        try {
          Settings.import(raw);
          Toast?.success?.({ title: "Configurações importadas" });
          sync();
        } catch (error) {
          Toast?.error?.({ title: "JSON inválido", description: truncate(error?.message || String(error), 700) });
        }
        return;
      }
      if (name === "copy-diagnostics") {
        const data = window.__AIO_DOWNLOADER__?.diagnostics?.() || { version: VERSION, settings: Settings.snapshot() };
        const copied = await copyText(JSON.stringify(data, null, 2));
        copied ? Toast?.success?.({ title: "Diagnóstico copiado" }) : Toast?.warning?.({ title: "Não foi possível copiar" });
        return;
      }
      if (name === "reset-settings" || name === "reset-all") {
        const ok = await confirmAction({ title: "Restaurar configurações?", description: name === "reset-all" ? "Todos os ajustes voltam ao padrão. O histórico de mídias não será apagado." : "Os defaults do AIO Downloader serão restaurados.", actions: [{ id:"cancel",label:"Cancelar",value:false,variant:"secondary" },{ id:"reset",label:"Restaurar",value:true,variant:"danger" }] });
        if (ok !== true) return;
        Settings.reset();
        sync();
        Toast?.success?.({ title: "Defaults restaurados" });
      }
    }

    function bind() {
      shadow.querySelectorAll("[data-close]").forEach((node) => node.addEventListener("click", close));
      shadow.querySelectorAll("[data-open-settings]").forEach((node) => node.addEventListener("click", () => open("general")));
      shadow.querySelectorAll("[data-setting]").forEach((input) => {
        const handler = () => {
          const path = input.dataset.setting;
          let value = input.type === "checkbox" ? input.checked : input.value;
          if (input.type === "range") value = Number(value);
          Settings.set(path, value, "panel");
          sync();
        };
        input.addEventListener(input.type === "range" || input.type === "color" ? "input" : "change", handler);
      });
      shadow.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => void action(button.dataset.action)));
      shadow.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
    }

    function open(sectionId = "general") {
      ensure();
      host.dataset.open = "true";
      document.documentElement.style.setProperty("--aio-settings-open", "1");
      const section = shadow.querySelector(`[data-section="${CSS.escape(String(sectionId || "general"))}"]`);
      if (section) section.open = true;
      requestAnimationFrame(() => shadow.querySelector(".sheet")?.focus?.({ preventScroll: true }));
    }

    function close() {
      if (!host) return;
      host.dataset.open = "false";
      document.documentElement.style.removeProperty("--aio-settings-open");
    }

    function registerMenu() {
      const label = `⚙️ AIO Downloader v${VERSION} · Settings`;
      try {
        if (typeof GM_registerMenuCommand === "function") {
          GM_registerMenuCommand(label, () => open("general"));
          return true;
        }
      } catch {}
      try {
        if (typeof GM !== "undefined" && typeof GM.registerMenuCommand === "function") {
          GM.registerMenuCommand(label, () => open("general"));
          return true;
        }
      } catch {}
      return false;
    }

    function install() {
      if (installed) return ensure();
      installed = true;
      ensure();
      unsubscribe = Settings.subscribe(() => sync());
      registerMenu();
      return host;
    }

    function diagnostics() {
      return { installed, open: host?.dataset?.open === "true", storageKey: SETTINGS_STORAGE_KEY, schema: SETTINGS_SCHEMA };
    }

    return Object.freeze({ install, open, close, sync, diagnostics });
  })();


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
      async items(options = {}) {
        const forAction = options?.forAction === true;
        const values = [];
        const add = (url, source, extraScore = 0) => {
          const value = String(url || "").trim();
          if (!Media.isLikelyMediaUrl(value)) return;
          if (Media.isHls(value) && !Settings.get("players.hls", true)) return;
          if (Media.isDash(value) && !Settings.get("players.dash", true)) return;
          const inferred = kind === MEDIA_KIND.audio ? MEDIA_KIND.audio : Media.kindFromUrl(value, MEDIA_KIND.video);
          if (kind === MEDIA_KIND.audio && inferred !== MEDIA_KIND.audio && !Media.isAudioUrl(value)) return;
          values.push({ kind: kind === MEDIA_KIND.audio ? MEDIA_KIND.audio : MEDIA_KIND.video, url: value, source, score: Media.mediaCandidateScore(value, kind) + extraScore });
        };

        Media.ownVideoUrls(media).forEach((url) => add(url, "dom", 40_000));
        if (forAction) PlayerInterceptor.candidates(media).forEach((url) => add(url, "player", 25_000));
        GlobalMediaCapture.candidates().forEach((url) => add(url, "network", 8_000));
        Media.performance().forEach((url) => add(url, "performance", 2_000));
        if (forAction && providerId === "youtube") ProviderSourceResolvers.youtube().forEach((url) => add(url, "youtube-player-response", 55_000));

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

    cleanup() {
      for (const media of [...this.mounted]) {
        if (!media.isConnected) {
          Ui.detach(this.id(media));
          this.mounted.delete(media);
        }
      }
    },

    scan(root = document, options = {}) {
      if (!Settings.get("general.enabled", true) || !Settings.get("general.universalPlayers", true) || CONFIG.providers.genericMedia === false || IS_TWITTER || IS_INSTAGRAM) return;
      if (isMediaElement(root)) this.mount(root);
      root.querySelectorAll?.("video,audio").forEach((media) => this.mount(media));
      if (options.cleanup !== false) this.cleanup();
    },
  };

  const DirectMediaProvider = {
    mounted: false,
    run() {
      if (this.mounted || !Settings.get("general.enabled", true) || !Settings.get("general.universalPlayers", true) || CONFIG.providers.directMedia === false) return;
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
    mountedRoots: new Set(),

    groupId(root, create = true) {
      if (twitterIsImmersiveRoot(root)) return "aio-twitter-immersive";
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
      this.mountedRoots.delete(root);
    },

    mount(root) {
      if (!Settings.get("general.enabled", true) || !Settings.get("twitter.enabled", true)) return;
      if (!isElement(root) || !root.isConnected) return;
      MoreExpander.kick(root, "twitter");

      // Importante no X: articles são reciclados pela timeline. Só existe UI
      // quando o tweet ATUAL possui mídia de conteúdo real. Avatar, emoji,
      // preview pequeno e tweet apenas textual não contam.
      const presence = twitterMediaPresence(root);
      if (!presence.hasMedia) {
        // During the immersive transition X disconnects/reconnects the player
        // several times. Keep the stable immersive group alive and let the next
        // scan retarget it instead of visibly blinking out.
        if (!twitterIsImmersiveRoot(root)) this.unmount(root);
        return;
      }

      const target = twitterTarget(root);
      if (!isElement(target)) {
        this.unmount(root);
        return;
      }

      this.mountedRoots.add(root);
      Ui.attach(this.groupId(root), target, () => twitterContext(root));
    },

    cleanup() {
      for (const root of [...this.mountedRoots]) {
        if (isElement(root) && root.isConnected) continue;
        const groupId = this.groupId(root, false);
        const state = groupId ? Ui.groups.get(groupId) : null;
        if (
          groupId === "aio-twitter-immersive" &&
          state &&
          Date.now() - Number(state.lastTargetSeenAt || 0) <= Number(state.targetLossGraceMs || CONFIG.twitter.immersiveTargetGraceMs)
        ) {
          continue;
        }
        this.unmount(root);
      }
    },

    scan(root = document, options = {}) {
      if (!Settings.get("general.enabled", true) || !Settings.get("twitter.enabled", true)) return;
      const candidates = new Set();
      if (isElement(root)) {
        const tweet = twitterRootFromElement(root);
        if (tweet) candidates.add(tweet);
      }
      root.querySelectorAll?.('[data-testid="tweet"],article[data-testid="tweet"],article')
        .forEach((tweet) => candidates.add(tweet));
      twitterImmersiveRoots(root).forEach((viewer) => candidates.add(viewer));
      candidates.forEach((candidate) => this.mount(candidate));
      if (options.cleanup !== false) {
        this.cleanup();
        const immersiveRoots = [...candidates].filter((candidate) => twitterIsImmersiveRoot(candidate));
        const immersiveState = Ui.groups.get("aio-twitter-immersive");
        if (
          immersiveState &&
          !immersiveRoots.length &&
          (!isElement(immersiveState.target) || !immersiveState.target.isConnected) &&
          Date.now() - Number(immersiveState.lastTargetSeenAt || 0) >
            Math.max(700, Number(CONFIG.twitter.immersiveTargetGraceMs) || 1_800)
        ) {
          Ui.detach("aio-twitter-immersive");
        }
      }
    },

    installImmersiveRecovery() {
      if (!IS_TWITTER || this.__immersiveRecoveryInstalled) return;
      this.__immersiveRecoveryInstalled = true;
      document.addEventListener("click", (event) => {
        const elements = (() => {
          try { return event.composedPath?.() || [event.target]; } catch { return [event.target]; }
        })();
        const touchedMedia = elements.some((element) =>
          isElement(element) && Boolean(
            element.matches?.('video,[data-testid="videoPlayer"],[data-testid="videoComponent"],[data-testid="tweetPhoto"]') ||
            element.closest?.('video,[data-testid="videoPlayer"],[data-testid="videoComponent"],[data-testid="tweetPhoto"]'),
          ),
        );
        if (!touchedMedia) return;
        const touched = elements.find((element) => isElement(element) && (
          element.matches?.('video,[data-testid="videoPlayer"],[data-testid="videoComponent"],[data-testid="tweetPhoto"]') ||
          element.closest?.('video,[data-testid="videoPlayer"],[data-testid="videoComponent"],[data-testid="tweetPhoto"]')
        ));
        queueDirtyRoot(twitterRootFromElement(touched) || touched || document.documentElement);
        requestLayout();
      }, true);
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
      if (!Settings.get("general.enabled", true) || !Settings.get("instagram.enabled", true)) return;
      if (!isElement(root) || !root.isConnected) return;
      MoreExpander.kick(root, "instagram");

      const target = instagramTarget(root);
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
        const groupId = this.groupId(root, false);
        const state = groupId ? Ui.groups.get(groupId) : null;
        if (state && isElement(state.target) && state.target.isConnected) continue;
        if (!isElement(instagramTarget(root))) this.unmount(root);
      }
    },

    scan(root = document, options = {}) {
      if (!Settings.get("general.enabled", true) || !Settings.get("instagram.enabled", true)) return;
      const containers = new Set();
      if (isElement(root)) {
        const container = instagramRootFromElement(root);
        if (container) containers.add(container);
      }

      root.querySelectorAll?.("video,img").forEach((media) => {
        const container = instagramRootFromElement(media);
        if (!container) return;
        if (isImageElement(media) && !Media.imageLooksLikeContent(media, "instagram")) return;
        if (!instagramElementBelongsToMediaScope(media, container)) return;
        containers.add(container);
      });

      containers.forEach((container) => this.mount(container));
      if (options.cleanup !== false) this.cleanup();
    },
  };

  // ---------------------------------------------------------------------------
  // Saved / Bookmarks bulk sync. No new MutationObserver is created: this
  // subsystem consumes the same dirty-root scans already used by providers.
  // ---------------------------------------------------------------------------

  const SavedSync = (() => {
    const records = new Map();
    const nodeRecords = new WeakMap();
    let toolbar = null;
    let panel = null;
    let stylesInstalled = false;
    let syncing = false;
    let archiveHydratedFor = null;
    const navigationStartedAt = Date.now();
    const relayCheckQueue = new Map();
    const relayCheckInFlight = new Map();
    const relayCheckByRecord = new Map();
    const pendingRecheckTimers = new Map();
    let relayCheckTimer = 0;
    let shellRefreshTimer = 0;
    let shellRefreshPending = false;
    let relayChecks = 0;
    let relayCheckItems = 0;
    let relayCheckFailures = 0;

    function mergeArchiveIntoRecord(archived, options = {}) {
      if (!archived?.key || archived.provider !== routeMode()) return null;
      const existing = records.get(archived.key);
      if (!existing && !archived.domCaptured) return null;
      const record = existing
        ? Object.assign(existing, {
            ...archived,
            node: existing.node || null,
            mediaNode: existing.mediaNode || null,
            contextRoot: existing.contextRoot || null,
            selected: Boolean(existing.selected),
            failed: Boolean(existing.failed),
          })
        : { ...archived, node: null, mediaNode: null, contextRoot: null, selected: false, failed: false };
      records.set(record.key, record);
      const visible = Boolean(record.node?.isConnected);
      if (visible) renderRecord(record);
      // Loading a large virtualized archive must not trigger thousands of D1
      // checks. Only records actually mounted/updated in this navigation enter
      // the navigation lookup queue. Sync All relies on /batch's own preflight.
      if (visible && options.check !== false) scheduleRelayCheck(record);
      if (options.refresh !== false) refreshShell();
      return record;
    }

    SavedMediaArchive.subscribe((archived) => {
      try { mergeArchiveIntoRecord(archived); } catch (error) { debug("SavedSync archive update", error); }
    });

    const svg = Object.freeze({
      sync: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7h-5V2M4 17h5v5M19 12a7 7 0 0 0-12-5L4 10M5 12a7 7 0 0 0 12 5l3-3"/></svg>',
      pending: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
      sent: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.3 2.4 4.9-5"/></svg>',
      failed: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="m9 9 6 6m0-6-6 6"/></svg>',
      checkbox: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
      caption: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14v9H9l-4 3v-12Z"/><path d="M8 10h8M8 13h5"/></svg>',
    });

    function routeMode() {
      if (IS_TWITTER && /^\/(?:i\/bookmarks|bookmarks)(?:\/|$)/i.test(location.pathname)) return "twitter";
      if (IS_INSTAGRAM && (/(?:^|\/)saved(?:\/|$)/i.test(location.pathname) || /\/your_activity\/interactions\/saved(?:\/|$)/i.test(location.pathname))) return "instagram";
      return null;
    }

    function normalizeSourceUrl(value) {
      try {
        const url = new URL(String(value || ""), location.href);
        url.hash = "";
        for (const key of [...url.searchParams.keys()]) if (/^(?:utm_|igsh|igshid|ref_)/i.test(key)) url.searchParams.delete(key);
        return url.href;
      } catch { return String(value || "").trim(); }
    }

    function capturedMedia(provider, mediaId) {
      try {
        if (provider === "twitter") return TwitterStore.items(mediaId);
        if (provider === "instagram") {
          const carousel = InstagramStore.carouselInfo(mediaId);
          if (carousel?.items?.length) return carousel.items;
          return InstagramStore.items(mediaId);
        }
      } catch {}
      return [];
    }

    function capturedCaption(provider, mediaId) {
      try {
        if (provider === "twitter") return String(TwitterStore.metadata.get(String(mediaId))?.text || "");
        if (provider === "instagram") return String(InstagramStore.meta(mediaId)?.caption || "");
      } catch {}
      return "";
    }

    function recordFromInstagramLink(link) {
      if (!isElement(link)) return null;
      const href = normalizeSourceUrl(link.href || link.getAttribute("href"));
      const match = href.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
      if (!match) return null;
      const mediaId = match[1];
      const mediaNode = link.querySelector?.("img,video") || link.closest?.("div")?.querySelector?.("img,video") || link;
      const captured = capturedMedia("instagram", mediaId);
      const isVideo = captured.some((item) => item.kind === MEDIA_KIND.video) || /\/(?:reel|reels|tv)\//i.test(href) || Boolean(link.querySelector?.("video"));
      const domImageUrl = isImageElement(mediaNode) ? Media.imageUrlFromElement(mediaNode) : "";
      const domMedia = domImageUrl
        ? [{ kind: MEDIA_KIND.photo, url: domImageUrl, order: 0, score: Number(mediaNode.naturalWidth || mediaNode.width || 0) * Number(mediaNode.naturalHeight || mediaNode.height || 0), source: "dom" }]
        : [];
      const allMedia = [...captured, ...domMedia];
      const bestPreview = isImageElement(mediaNode) ? domImageUrl : mediaNode?.poster || allMedia.find((item) => item.previewUrl)?.previewUrl || allMedia.find((item) => item.kind === MEDIA_KIND.photo)?.url || "";
      return {
        key: `instagram:${mediaId}`,
        provider: "instagram",
        mediaId,
        url: href,
        kind: isVideo ? MEDIA_KIND.video : MEDIA_KIND.photo,
        caption: capturedCaption("instagram", mediaId),
        thumbnail: bestPreview,
        media: allMedia,
        node: link,
        mediaNode,
      };
    }

    function recordFromTwitterArticle(article) {
      if (!isElement(article)) return null;
      const context = (() => { try { return twitterContext(article); } catch { return null; } })();
      const contextStatusId = String(context?.metadata?.statusId || twitterStatusId(article) || "").trim();
      const links = [...article.querySelectorAll?.('a[href*="/status/"]') || []];
      const canonicalLink = contextStatusId
        ? links.find((link) => String(link.href || "").includes(`/status/${contextStatusId}`))
        : null;
      const href = normalizeSourceUrl(canonicalLink?.href || context?.pageUrl || (contextStatusId ? `https://x.com/i/status/${contextStatusId}` : ""));
      const statusId = contextStatusId || href.match(/\/status\/(\d+)/i)?.[1];
      if (!statusId) return null;
      const video = article.querySelector?.("video");
      const image = [...article.querySelectorAll?.('img[src*="pbs.twimg.com/media/"],[data-testid="tweetPhoto"] img') || []].find((img) => Media.imageLooksLikeContent(img, "twitter")) || [...article.querySelectorAll?.("img") || []].find((img) => Media.imageLooksLikeContent(img, "twitter"));
      const visualNode = video?.closest?.('[data-testid="videoPlayer"],[data-testid="videoComponent"]') || image?.closest?.('[data-testid="tweetPhoto"]') || image?.parentElement || article;
      const captured = capturedMedia("twitter", statusId);
      const domImageUrl = image ? Media.normalizeTwitterPhoto(Media.imageUrlFromElement(image)) : "";
      const domMedia = domImageUrl
        ? [{ kind: MEDIA_KIND.photo, url: domImageUrl, order: 0, score: Number(image.naturalWidth || image.width || 0) * Number(image.naturalHeight || image.height || 0), source: "dom" }]
        : [];
      const allMedia = [...captured, ...domMedia];
      const isVideo = Boolean(video) || allMedia.some((item) => item.kind === MEDIA_KIND.video);
      return {
        key: `twitter:${statusId}`,
        provider: "twitter",
        mediaId: statusId,
        url: href,
        kind: isVideo ? MEDIA_KIND.video : MEDIA_KIND.photo,
        caption: String(context?.text || capturedCaption("twitter", statusId) || ""),
        thumbnail: video?.poster || domImageUrl || allMedia.find((item) => item.kind === MEDIA_KIND.photo)?.url || "",
        media: allMedia,
        node: visualNode,
        contextRoot: article,
        mediaNode: video || image || article,
      };
    }

    function channelsFor(record) {
      return channels(record.provider, record.url, record.kind);
    }

    function checkInput(record) {
      if (!record) return null;
      if (record.provider && record.mediaId) return { provider: record.provider, mediaId: record.mediaId };
      if (record.key && !String(record.key).includes(":url:")) return { mediaKey: record.key };
      return record.url || null;
    }

    function channelSignature(requestedChannels) {
      return uniqueChannelIds(requestedChannels).sort().join("|");
    }

    function persistedRelayState(record, requestedChannels = channelsFor(record)) {
      const requested = uniqueChannelIds(requestedChannels);
      if (!requested.length) return null;
      const epoch = String(Settings.get("savedSync.relayDataEpoch", "v4") || "v4");
      const ttlMs = Math.max(1, Number(Settings.get("savedSync.relayPositiveTtlHours", 168)) || 168) * 60 * 60 * 1000;
      const now = Date.now();
      const knowledge = record?.relayKnownBySignature && typeof record.relayKnownBySignature === "object"
        ? Object.values(record.relayKnownBySignature)
        : [];

      // Delivery is monotonic per media+channel. Merge only positive channel facts
      // from still-valid epochs/TTLs, even when the current route uses a subset or
      // superset of an older channel signature. Negative knowledge is never reused.
      const positiveByChannel = new Map();
      let newestCheckedAt = 0;
      for (const entry of knowledge) {
        if (!entry || String(entry.epoch || "") !== epoch) continue;
        const checkedAt = Number(entry.checkedAt || 0);
        if (!checkedAt || now - checkedAt > ttlMs) continue;
        const map = entry.requestedChannels && typeof entry.requestedChannels === "object"
          ? entry.requestedChannels
          : {};
        for (const [channelId, value] of Object.entries(map)) {
          if (value?.sent === true) positiveByChannel.set(String(channelId), { ...value, checkedAt });
        }
        newestCheckedAt = Math.max(newestCheckedAt, checkedAt);
      }

      const successful = requested.filter((channelId) => positiveByChannel.has(channelId));
      if (successful.length !== requested.length) return null;
      return {
        key: record.key,
        entry: { requestedChannels: Object.fromEntries(successful.map((channelId) => [channelId, positiveByChannel.get(channelId)])), epoch },
        requested,
        successful,
        pending: [],
        anySuccessful: true,
        allSuccessful: true,
        exists: true,
        source: "indexeddb-positive",
        checkedAt: newestCheckedAt,
      };
    }

    function persistRelayKnowledge(record, requestedChannels, requestedMap, metadata = {}) {
      if (!record?.key) return null;
      const requested = uniqueChannelIds(requestedChannels);
      if (!requested.length) return null;
      const signature = channelSignature(requested);
      const normalizedMap = Object.fromEntries(requested.map((channelId) => {
        const value = requestedMap?.[channelId] || {};
        return [channelId, {
          sent: Boolean(value.sent),
          sendCount: Math.max(0, Number(value.sendCount || 0)),
        }];
      }));
      const allSuccessful = requested.every((channelId) => normalizedMap[channelId]?.sent === true);
      const entry = {
        checkedAt: Date.now(),
        allSuccessful,
        requestedChannels: normalizedMap,
        source: String(metadata.source || "relay"),
        epoch: String(Settings.get("savedSync.relayDataEpoch", "v4") || "v4"),
      };
      record.relayKnownBySignature = {
        ...(record.relayKnownBySignature || {}),
        [signature]: entry,
      };
      SavedMediaArchive.upsert({
        key: record.key,
        provider: record.provider,
        mediaId: record.mediaId,
        url: record.url,
        kind: record.kind,
        caption: record.caption,
        title: record.title,
        thumbnail: record.thumbnail,
        media: record.media || [],
        captionSource: record.captionSource || "",
        captionLookupState: record.captionLookupState || (record.caption ? "captured" : "unknown"),
        captionLookupAt: Number(record.captionLookupAt || 0),
        captionEnriched: Boolean(record.captionEnriched || record.caption),
        captionEnrichedAt: Number(record.captionEnrichedAt || 0),
        relayKnownBySignature: record.relayKnownBySignature,
      }, "network");
      return entry;
    }

    function relayState(record, requestedChannels = channelsFor(record)) {
      const requested = uniqueChannelIds(requestedChannels);
      const check = record?.relayCheck || null;
      const freshMs = Math.max(5_000, Number(Settings.get("savedSync.relayLookupFreshMs", 60_000)) || 60_000);
      if (!check || Date.now() - Number(check.at || 0) > freshMs) return null;
      const requestedMap = check.requestedChannels && typeof check.requestedChannels === "object" ? check.requestedChannels : {};
      const successful = requested.filter((channelId) => Boolean(requestedMap[channelId]?.sent));
      const pending = requested.filter((channelId) => !successful.includes(channelId));
      return {
        key: record.key,
        entry: check,
        requested,
        successful,
        pending,
        anySuccessful: successful.length > 0,
        allSuccessful: requested.length > 0 && successful.length === requested.length,
        exists: Boolean(check.exists),
        source: "relay",
        checkedAt: Number(check.at || 0),
      };
    }

    function cacheState(record) {
      const requested = channelsFor(record);
      const remote = relayState(record, requested);
      if (remote) return remote;
      const persisted = persistedRelayState(record, requested);
      if (persisted) return persisted;

      // localStorage is deliberately only a same-navigation accelerator.
      // Persisted entries from previous navigations never outrank /media/check.
      const local = DeliveryCache.status(record.key, requested);
      const localAt = Number(local.entry?.at || 0);
      if (local.entry && localAt >= navigationStartedAt && Date.now() - localAt <= 120_000) {
        return { ...local, source: "local-fresh", checkedAt: localAt };
      }
      return {
        key: record.key,
        entry: null,
        requested,
        successful: [],
        pending: requested,
        anySuccessful: false,
        allSuccessful: false,
        exists: false,
        source: "unknown",
        checkedAt: 0,
      };
    }

    function normalizeRelayCheckResult(raw, record, requestedChannels) {
      const requested = uniqueChannelIds(requestedChannels);
      const requestedMap = raw?.requestedChannels && typeof raw.requestedChannels === "object"
        ? raw.requestedChannels
        : Object.fromEntries(requested.map((channelId) => {
            const channel = Array.isArray(raw?.channels)
              ? raw.channels.find((entry) => String(entry?.channelId || "") === channelId)
              : null;
            return [channelId, {
              sent: Boolean(channel && Number(channel.sendCount || 0) > 0),
              sendCount: Math.max(0, Number(channel?.sendCount || 0)),
            }];
          }));
      return {
        at: Date.now(),
        mediaKey: String(raw?.mediaKey || record.key || ""),
        exists: Boolean(raw?.exists),
        channels: Array.isArray(raw?.channels) ? raw.channels : [],
        requestedChannels: requestedMap,
      };
    }

    async function checkRecordsNow(inputRecords, options = {}) {
      if (!Settings.get("savedSync.relayLookupEnabled", true)) return [];
      const unique = [...new Map((inputRecords || []).filter((record) => record?.key).map((record) => [record.key, record])).values()];
      const force = options.force === true;
      const waiting = [];
      const candidates = [];

      for (const record of unique) {
        const inFlight = relayCheckByRecord.get(record.key);
        if (inFlight) { waiting.push(inFlight); continue; }
        if (!force) {
          const current = cacheState(record);
          // Reuse fresh relay state and positive IndexedDB knowledge. Only
          // unknown/stale-negative records reach D1.
          if (current.allSuccessful || relayState(record)) continue;
        }
        candidates.push(record);
      }

      const groups = new Map();
      for (const record of candidates) {
        const channelIds = channelsFor(record);
        const signature = channelIds.join("|");
        if (!groups.has(signature)) groups.set(signature, { channels: channelIds, records: [] });
        groups.get(signature).records.push(record);
      }

      const maxBatch = Math.max(1, Math.min(100, Number(Settings.get("savedSync.relayLookupBatchSize", 100)) || 100));
      const outputs = [];
      for (const group of groups.values()) {
        for (let offset = 0; offset < group.records.length; offset += maxBatch) {
          const batchRecords = group.records.slice(offset, offset + maxBatch);
          const requestItems = batchRecords.map(checkInput);
          batchRecords.forEach((record) => { record.relayChecking = true; renderRecord(record); });
          refreshShell();
          const inFlightKey = `${group.channels.join(",")}::${batchRecords.map((record) => record.key).join(",")}`;
          let promise = relayCheckInFlight.get(inFlightKey);
          if (!promise) {
            relayChecks += 1;
            relayCheckItems += batchRecords.length;
            promise = RelayClient.checkMedia(requestItems, { channels: group.channels, signal: options.signal });
            relayCheckInFlight.set(inFlightKey, promise);
          }
          batchRecords.forEach((record) => relayCheckByRecord.set(record.key, promise));
          try {
            const response = await promise;
            const results = Array.isArray(response?.results) ? response.results : [];
            batchRecords.forEach((record, index) => {
              const raw = results[index] || {};
              record.relayCheck = normalizeRelayCheckResult(raw, record, group.channels);
              record.relayChecking = false;
              persistRelayKnowledge(record, group.channels, record.relayCheck.requestedChannels, { source: "media-check" });
              if (relayState(record, group.channels)?.allSuccessful) {
                record.deliveryInProgressChannels = [];
                clearPendingRecheck(record);
              }
              outputs.push(record.relayCheck);
              renderRecord(record);
            });
          } catch (error) {
            relayCheckFailures += 1;
            batchRecords.forEach((record) => { record.relayChecking = false; renderRecord(record); });
            debug("SavedSync /media/check falhou", error);
          } finally {
            relayCheckInFlight.delete(inFlightKey);
            for (const record of batchRecords) if (relayCheckByRecord.get(record.key) === promise) relayCheckByRecord.delete(record.key);
          }
        }
      }

      if (waiting.length) await Promise.allSettled([...new Set(waiting)]);
      refreshShell();
      return unique.map((record) => relayState(record) || persistedRelayState(record)).filter(Boolean);
    }

    function scheduleRelayCheck(record) {
      if (!record?.key || !Settings.get("savedSync.relayLookupEnabled", true)) return;
      if (cacheState(record).allSuccessful || relayState(record) || relayCheckByRecord.has(record.key) || record.relayChecking) return;
      relayCheckQueue.set(record.key, record);
      if (relayCheckTimer) return;
      const delay = Math.max(40, Math.min(2_000, Number(Settings.get("savedSync.relayLookupDebounceMs", 140)) || 140));
      relayCheckTimer = setTimeout(() => {
        relayCheckTimer = 0;
        const queued = [...relayCheckQueue.values()];
        relayCheckQueue.clear();
        void checkRecordsNow(queued).catch((error) => debug("SavedSync relay lookup queue", error));
      }, delay);
    }

    function ensureStyles() {
      if (stylesInstalled) return;
      stylesInstalled = true;
      const style = document.createElement("style");
      style.id = "aio-saved-sync-style";
      style.textContent = `
        [data-aio-saved-card]{position:relative!important}
        .aio-saved-control{position:absolute!important;z-index:2147483500!important;display:grid!important;place-items:center!important;width:44px!important;height:44px!important;padding:4px!important;border:0!important;background:transparent!important;color:#fff!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important}
        .aio-saved-control>span{display:grid!important;place-items:center!important;width:30px!important;height:30px!important;border:1px solid rgba(255,255,255,.82)!important;border-radius:999px!important;background:rgba(8,10,14,.78)!important;box-shadow:0 2px 12px rgba(0,0,0,.28)!important}
        .aio-saved-control svg,.aio-saved-toolbar svg{width:17px!important;height:17px!important;fill:none!important;stroke:currentColor!important;stroke-width:2!important;stroke-linecap:round!important;stroke-linejoin:round!important}
        .aio-saved-status{top:2px!important;right:2px!important}.aio-saved-check{top:2px!important;left:2px!important}
        .aio-saved-status[data-state="sent"]>span{background:rgba(5,46,22,.9)!important;color:#bbf7d0!important;border-color:#86efac!important}.aio-saved-status[data-state="checking"]>span{background:rgba(30,41,59,.92)!important;color:#bfdbfe!important;border-color:#93c5fd!important}.aio-saved-status[data-state="partial"]>span{background:rgba(120,53,15,.92)!important;color:#fde68a!important;border-color:#fbbf24!important}.aio-saved-status[data-state="checking"] svg{animation:aio-saved-spin .8s linear infinite!important}.aio-saved-status[data-state="failed"]>span{background:rgba(69,10,10,.9)!important;color:#fecaca!important;border-color:#fca5a5!important}@keyframes aio-saved-spin{to{transform:rotate(360deg)}}.aio-saved-check[data-selected="true"]>span{background:rgba(30,64,175,.92)!important;border-color:#bfdbfe!important}
        .aio-saved-media-target{transition:filter .22s ease,-webkit-filter .22s ease,opacity .22s ease!important}
        .aio-saved-media-target.aio-saved-unsynced-media{filter:grayscale(1) saturate(.03) brightness(.7) contrast(1.1)!important;-webkit-filter:grayscale(1) saturate(.03) brightness(.7) contrast(1.1)!important}
        .aio-saved-media-target:not(.aio-saved-unsynced-media){filter:none!important;-webkit-filter:none!important}
        .aio-saved-syncing-media{opacity:.78!important}
        .aio-saved-caption-badge{position:absolute!important;right:5px!important;bottom:5px!important;z-index:2147483501!important;display:inline-flex!important;align-items:center!important;gap:3px!important;min-height:22px!important;padding:0 7px!important;border:1px solid rgba(134,239,172,.86)!important;border-radius:999px!important;background:rgba(5,46,22,.9)!important;color:#dcfce7!important;box-shadow:0 2px 12px rgba(0,0,0,.3)!important;font:750 9px/1 system-ui,-apple-system,sans-serif!important;pointer-events:none!important}.aio-saved-caption-badge svg{width:12px!important;height:12px!important;fill:none!important;stroke:currentColor!important;stroke-width:2!important}
        #aio-saved-sync-toolbar{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(18px,calc(env(safe-area-inset-bottom) + 12px));z-index:2147483600;display:flex;align-items:center;gap:9px;min-height:48px;padding:6px 13px 6px 8px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(10,12,16,.94);color:#fff;box-shadow:0 10px 32px rgba(0,0,0,.38);font:650 12px/1.1 system-ui,-apple-system,sans-serif;touch-action:manipulation}
        #aio-saved-sync-toolbar .aio-saved-toolbar{display:grid;place-items:center;width:34px;height:34px;border-radius:999px;background:#20242b;color:#fff}#aio-saved-sync-toolbar small{display:block;margin-top:2px;color:#a7abb4;font:520 10px/1.1 inherit}
        #aio-saved-sync-panel{position:fixed;left:max(10px,env(safe-area-inset-left));right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));z-index:2147483640;display:none;max-width:480px;margin:auto;padding:14px;border:1px solid rgba(255,255,255,.14);border-radius:20px;background:#0e1014;color:#f5f5f7;box-shadow:0 24px 80px rgba(0,0,0,.55);font:500 13px/1.35 system-ui,-apple-system,sans-serif}
        #aio-saved-sync-panel[data-open="true"]{display:block}#aio-saved-sync-panel h3{margin:0 0 4px;font-size:17px}#aio-saved-sync-panel p{margin:0 0 12px;color:#a7abb4;font-size:11px}#aio-saved-sync-panel .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}#aio-saved-sync-panel button{min-height:44px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:#1b1e24;color:#fff;font:650 12px/1 system-ui}#aio-saved-sync-panel button.primary{background:#f4f4f5;color:#111;border-color:#fff}#aio-saved-sync-panel .full{grid-column:1/-1}#aio-saved-sync-panel .meta{display:flex;justify-content:space-between;gap:8px;margin-top:10px;color:#8f949e;font-size:10px}
      `;
      document.documentElement.appendChild(style);
    }

    function ensureShell() {
      if (!routeMode() || !Settings.get("savedSync.enabled", true)) { hideShell(); return; }
      ensureStyles();
      if (!toolbar) {
        toolbar = document.createElement("button");
        toolbar.type = "button";
        toolbar.id = "aio-saved-sync-toolbar";
        toolbar.innerHTML = `<span class="aio-saved-toolbar">${svg.sync}</span><span><b>Sync saved</b><small data-count>0 pendentes</small></span>`;
        toolbar.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); togglePanel(); }, true);
        document.documentElement.appendChild(toolbar);
      }
      if (!panel) {
        panel = document.createElement("section");
        panel.id = "aio-saved-sync-panel";
        panel.innerHTML = `<h3>Saved / Bookmarks sync</h3><p>D1 é a fonte de entrega. O arquivo local guarda navegação/mídia e positivos recentes; unknown/false é revalidado. O /batch v2.8 corta duplicatas antes do trabalho caro.</p><div class="grid"><button data-sync-selected class="primary">Sync selecionados</button><button data-sync-all>Sync all</button><button data-select-all>Selecionar pendentes</button><button data-clear-selection>Limpar seleção</button><button data-enrich class="full">Enriquecer captions selecionados</button><button data-close class="full">Fechar</button></div><div class="meta"><span data-stats></span><span data-batch></span></div>`;
        panel.addEventListener("click", (event) => {
          const button = event.target?.closest?.("button");
          if (!button || syncing) return;
          event.preventDefault(); event.stopPropagation();
          if (button.matches("[data-sync-selected]")) void syncRecords([...records.values()].filter((record) => record.selected));
          else if (button.matches("[data-sync-all]")) void syncRecords([...records.values()]);
          else if (button.matches("[data-select-all]")) { for (const record of records.values()) record.selected = !cacheState(record).allSuccessful; refreshAll(); }
          else if (button.matches("[data-clear-selection]")) { for (const record of records.values()) record.selected = false; refreshAll(); }
          else if (button.matches("[data-enrich]")) void enrichMany([...records.values()].filter((record) => record.selected));
          else if (button.matches("[data-close]")) panel.dataset.open = "false";
        }, true);
        document.documentElement.appendChild(panel);
      }
      refreshShell();
    }

    function hideShell() {
      if (toolbar) toolbar.style.display = "none";
      if (panel) panel.dataset.open = "false";
    }

    function togglePanel() {
      if (!panel) return;
      panel.dataset.open = panel.dataset.open === "true" ? "false" : "true";
      refreshShell();
    }

    function refreshShell(immediate = false) {
      if (!toolbar) return;
      shellRefreshPending = true;
      if (immediate) {
        if (shellRefreshTimer) { clearTimeout(shellRefreshTimer); shellRefreshTimer = 0; }
        refreshShellNow();
        return;
      }
      if (shellRefreshTimer) return;
      // Counts span the durable virtualized archive. They do not need 60fps
      // updates while the user scrolls, so batch them away from the hot path.
      shellRefreshTimer = window.setTimeout(() => {
        shellRefreshTimer = 0;
        refreshShellNow();
      }, 240);
    }

    function refreshShellNow() {
      if (!toolbar || !shellRefreshPending) return;
      shellRefreshPending = false;
      toolbar.style.display = routeMode() && Settings.get("savedSync.enabled", true) ? "flex" : "none";
      const values = [...records.values()];
      let visible = 0;
      let sent = 0;
      let unknown = 0;
      let selected = 0;
      for (const record of values) {
        if (record.node?.isConnected) visible += 1;
        if (record.selected) selected += 1;
        const state = cacheState(record);
        if (state.allSuccessful) sent += 1;
        else if (state.source === "unknown") unknown += 1;
      }
      const pending = Math.max(0, values.length - sent);
      toolbar.querySelector("[data-count]").textContent = `${pending} pendente${pending === 1 ? "" : "s"} · ${unknown} sem check · ${values.length} vistos`;
      if (panel) {
        panel.querySelector("[data-stats]").textContent = `${values.length} vistos · ${visible} na tela · ${sent} enviados · ${unknown} sem check · ${selected} selecionados`;
        panel.querySelector("[data-batch]").textContent = `batch ${Settings.get("savedSync.batchSize", 50)} · conc ${Settings.get("savedSync.relayBatchConcurrency", 3)} · check ${Settings.get("savedSync.relayLookupBatchSize", 100)} · D1`;
      }
    }

    function refreshAll() {
      for (const record of records.values()) {
        if (record.node?.isConnected) renderRecord(record);
      }
      refreshShell();
    }

    function hasHydratedCaption(record) {
      return Boolean(PayloadSanitizer.cleanText(record?.caption || "").trim());
    }

    function captionLookupFresh(record) {
      const state = String(record?.captionLookupState || (hasHydratedCaption(record) ? "captured" : "unknown"));
      if (hasHydratedCaption(record)) return true;
      const at = Number(record?.captionLookupAt || 0);
      if (!at) return false;
      if (state === "absent") {
        const ttl = Math.max(1, Number(Settings.get("savedSync.captionNegativeTtlHours", 24)) || 24) * 60 * 60 * 1000;
        return Date.now() - at < ttl;
      }
      if (state === "failed") {
        const ttl = Math.max(1, Number(Settings.get("savedSync.captionFailureTtlMinutes", 15)) || 15) * 60 * 1000;
        return Date.now() - at < ttl;
      }
      return false;
    }

    function needsCaptionLookup(record) {
      return Boolean(record?.url) && !hasHydratedCaption(record) && !captionLookupFresh(record);
    }

    function visualMediaTarget(record) {
      const direct = record?.mediaNode;
      if (isImageElement(direct) || isVideoElement(direct)) return direct;
      const root = isElement(direct) ? direct : record?.node;
      if (!isElement(root)) return null;
      if (record.provider === "twitter") {
        return root.querySelector?.('video,img[src*="pbs.twimg.com/media/"],[data-testid="tweetPhoto"] img') || null;
      }
      return root.querySelector?.("video,img") || null;
    }

    function clearVisualMediaState(record) {
      const target = isElement(record?.visualMediaNode) ? record.visualMediaNode : visualMediaTarget(record);
      if (isElement(target)) {
        target.classList.remove("aio-saved-media-target", "aio-saved-unsynced-media", "aio-saved-syncing-media");
        try { delete target.dataset.aioSavedMedia; } catch {}
      }
      if (record) record.visualMediaNode = null;
    }

    function renderRecord(record) {
      const node = record.node;
      if (!isElement(node) || !node.isConnected) return;
      node.dataset.aioSavedCard = "true";
      let status = node.querySelector?.(':scope > .aio-saved-status');
      if (!status) {
        status = document.createElement("span");
        status.setAttribute("role", "button");
        status.tabIndex = 0;
        status.className = "aio-saved-control aio-saved-status";
        status.addEventListener("click", (event) => {
          event.preventDefault(); event.stopPropagation();
          const current = nodeRecords.get(node);
          if (current) void sendIndividual(current);
        }, true);
        status.addEventListener("keydown", (event) => {
          if (!["Enter", " "].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation();
          const current = nodeRecords.get(node);
          if (current) void sendIndividual(current);
        }, true);
        node.appendChild(status);
      }
      let check = node.querySelector?.(':scope > .aio-saved-check');
      if (!check) {
        check = document.createElement("span");
        check.setAttribute("role", "checkbox");
        check.tabIndex = 0;
        check.className = "aio-saved-control aio-saved-check";
        const toggleSelection = (event) => {
          event.preventDefault(); event.stopPropagation();
          const current = nodeRecords.get(node);
          if (!current) return;
          current.selected = !current.selected;
          renderRecord(current);
          refreshShell();
        };
        check.addEventListener("click", toggleSelection, true);
        check.addEventListener("keydown", (event) => { if (!["Enter", " "].includes(event.key)) return; toggleSelection(event); }, true);
        node.appendChild(check);
      }
      const delivery = cacheState(record);
      const state = record.failed
        ? "failed"
        : delivery.allSuccessful
          ? "sent"
          : delivery.anySuccessful
            ? "partial"
            : record.relayChecking
              ? "checking"
              : "pending";
      node.dataset.aioSavedState = state;
      const visualTarget = visualMediaTarget(record);
      if (isElement(record.visualMediaNode) && record.visualMediaNode !== visualTarget) {
        record.visualMediaNode.classList.remove("aio-saved-media-target", "aio-saved-unsynced-media", "aio-saved-syncing-media");
        try { delete record.visualMediaNode.dataset.aioSavedMedia; } catch {}
      }
      record.visualMediaNode = isElement(visualTarget) ? visualTarget : null;
      if (isElement(visualTarget)) {
        visualTarget.dataset.aioSavedMedia = "true";
        visualTarget.classList.add("aio-saved-media-target");
        visualTarget.classList.toggle("aio-saved-unsynced-media", record.kind === MEDIA_KIND.photo && state !== "sent");
        visualTarget.classList.toggle("aio-saved-syncing-media", state === "checking");
      }
      status.dataset.state = state;
      status.setAttribute("aria-label", state === "sent" ? "Já enviado segundo o relay. Toque para reenviar." : state === "partial" ? "Enviado para parte dos canais. Toque para completar o envio." : state === "checking" ? "Verificando no relay…" : state === "failed" ? "Falhou. Toque para tentar novamente." : "Pendente no relay. Toque para enviar agora.");
      status.innerHTML = `<span>${state === "sent" ? svg.sent : state === "failed" ? svg.failed : svg.pending}</span>`;
      check.dataset.selected = String(Boolean(record.selected));
      check.setAttribute("aria-checked", String(Boolean(record.selected)));
      check.setAttribute("aria-label", record.selected ? "Remover da seleção" : "Adicionar à seleção");
      check.innerHTML = `<span>${svg.checkbox}</span>`;

      let captionBadge = node.querySelector?.(':scope > .aio-saved-caption-badge');
      if (hasHydratedCaption(record)) {
        if (!captionBadge) {
          captionBadge = document.createElement("span");
          captionBadge.className = "aio-saved-caption-badge";
          captionBadge.setAttribute("aria-label", "Caption já enriquecida");
          node.appendChild(captionBadge);
        }
        captionBadge.innerHTML = `${svg.caption}<span>CAPTION</span>`;
      } else {
        captionBadge?.remove?.();
      }
    }

    function upsert(candidate) {
      if (!candidate?.key || !isElement(candidate.node)) return null;
      const archived = SavedMediaArchive.get(candidate.key);
      const existing = records.get(candidate.key);
      const previous = existing || archived || null;
      const incomingCaption = PayloadSanitizer.cleanText(candidate.caption || "", { maxLength: 32_000 });
      const previousCaption = PayloadSanitizer.cleanText(previous?.caption || "", { maxLength: 32_000 });
      const base = {
        ...(archived || {}),
        ...(existing || {}),
        ...candidate,
        caption: incomingCaption || previousCaption,
        captionSource: incomingCaption
          ? (candidate.captionSource || previous?.captionSource || "dom-or-network")
          : (previous?.captionSource || candidate.captionSource || ""),
        captionLookupState: incomingCaption
          ? (candidate.captionLookupState || previous?.captionLookupState || "captured")
          : (previous?.captionLookupState || candidate.captionLookupState || "unknown"),
        captionLookupAt: incomingCaption
          ? Math.max(Number(candidate.captionLookupAt || 0), Number(previous?.captionLookupAt || 0), Date.now())
          : Math.max(Number(previous?.captionLookupAt || 0), Number(candidate.captionLookupAt || 0)),
      };
      const selectedDefault = Settings.get("savedSync.selectPendingByDefault", false) && !cacheState(base).allSuccessful;
      const record = existing
        ? Object.assign(existing, base, { selected: Boolean(existing.selected), failed: Boolean(existing.failed) })
        : { ...base, selected: selectedDefault, failed: false };
      const previousNodeRecord = nodeRecords.get(record.node);
      if (previousNodeRecord && previousNodeRecord.key !== record.key) {
        clearVisualMediaState(previousNodeRecord);
        previousNodeRecord.node = null;
        previousNodeRecord.mediaNode = null;
        previousNodeRecord.contextRoot = null;
        previousNodeRecord.visualMediaNode = null;
      }
      records.set(record.key, record);
      nodeRecords.set(record.node, record);

      const persisted = SavedMediaArchive.upsert({
        key: record.key,
        provider: record.provider,
        mediaId: record.mediaId,
        url: record.url,
        kind: record.kind,
        caption: record.caption,
        title: record.title,
        thumbnail: record.thumbnail,
        media: record.media || [],
        captionSource: record.captionSource || (record.caption ? "dom-or-network" : ""),
        captionLookupState: record.captionLookupState || (record.caption ? "captured" : "unknown"),
        captionLookupAt: Number(record.captionLookupAt || (record.caption ? Date.now() : 0)),
        captionEnriched: Boolean(record.caption),
        captionEnrichedAt: Number(record.captionEnrichedAt || (record.caption ? record.captionLookupAt || Date.now() : 0)),
        relayKnownBySignature: record.relayKnownBySignature || {},
        lastSeenAt: Date.now(),
      }, "dom");
      if (persisted) Object.assign(record, persisted, {
        node: candidate.node,
        mediaNode: candidate.mediaNode || null,
        contextRoot: candidate.contextRoot || null,
        selected: record.selected,
        failed: record.failed,
      });
      renderRecord(record);
      scheduleRelayCheck(record);
      return record;
    }

    async function hydrateArchive() {
      const provider = routeMode();
      if (!provider || archiveHydratedFor === provider) return;
      const archived = await SavedMediaArchive.loadProvider(provider);
      // A transient IndexedDB open/read failure must stay retryable. The archive
      // marks a provider loaded only after a completed transaction.
      if (!SavedMediaArchive.isLoaded(provider)) return;
      archiveHydratedFor = provider;
      for (const value of archived) {
        if (value.domCaptured) mergeArchiveIntoRecord(value, { check: false, refresh: false });
      }
      refreshShell(true);
    }

    function scan(root = document) {
      if (!routeMode() || !Settings.get("savedSync.enabled", true)) { hideShell(); return; }
      ensureShell();
      void hydrateArchive();
      if (routeMode() === "instagram") {
        const links = [];
        if (isElement(root) && root.matches?.('a[href*="/p/"],a[href*="/reel/"],a[href*="/tv/"]')) links.push(root);
        root.querySelectorAll?.('a[href*="/p/"],a[href*="/reel/"],a[href*="/tv/"]').forEach((link) => links.push(link));
        for (const link of links) upsert(recordFromInstagramLink(link));
      } else {
        const articles = [];
        const own = isElement(root) ? root.closest?.('article,[data-testid="tweet"]') : null;
        if (own) articles.push(own);
        root.querySelectorAll?.('article,[data-testid="tweet"]').forEach((article) => articles.push(article));
        for (const article of new Set(articles)) upsert(recordFromTwitterArticle(article));
      }
      cleanup();
      refreshShell();
    }

    function cleanup() {
      // Virtualized feeds remove cards from the DOM. Keep the lightweight
      // record and only release DOM references so Sync All still sees it.
      for (const record of records.values()) {
        if (record.node?.isConnected) continue;
        clearVisualMediaState(record);
        record.node = null;
        record.mediaNode = null;
        record.contextRoot = null;
      }
    }

    function directUrlNeedsFreshness(record, url) {
      let parsed;
      try { parsed = new URL(String(url || "")); } catch { return true; }
      const host = parsed.hostname.toLowerCase();
      if (record?.provider === "twitter" && host === "pbs.twimg.com" && /\/media\//i.test(parsed.pathname)) return false;
      if (record?.provider === "instagram" || /(?:^|\.)(?:cdninstagram\.com|fbcdn\.net)$/i.test(host)) return true;
      const signedKeys = [
        "expires", "expire", "expiration", "oe", "oh", "token", "sig", "signature",
        "x-amz-signature", "x-amz-expires", "x-amz-credential", "policy", "key-pair-id",
      ];
      for (const key of signedKeys) if (parsed.searchParams.has(key)) return true;
      return [...parsed.searchParams.keys()].some((key) => /^_nc_|^x-amz-/i.test(key));
    }

    function directMediaUsable(record, item) {
      const url = String(item?.url || "");
      if (!/^https?:/i.test(url)) return false;
      if (!directUrlNeedsFreshness(record, url)) return true;
      const maxAge = Math.max(1, Number(Settings.get("savedSync.directMediaMaxAgeMinutes", 30)) || 30) * 60_000;
      const capturedAt = Number(item?.capturedAt || record?.lastSeenAt || 0);
      return capturedAt > 0 && Date.now() - capturedAt <= maxAge;
    }

    function freshThumbnailUrl(record) {
      const url = /^https?:/i.test(String(record?.thumbnail || "")) ? String(record.thumbnail) : "";
      if (!url) return "";
      if (!directUrlNeedsFreshness(record, url)) return url;
      const maxAge = Math.max(1, Number(Settings.get("savedSync.directMediaMaxAgeMinutes", 30)) || 30) * 60_000;
      return Number(record?.lastSeenAt || 0) > 0 && Date.now() - Number(record.lastSeenAt) <= maxAge ? url : "";
    }

    function normalizedRecordMedia(record, options = {}) {
      const freshOnly = options.freshOnly !== false;
      const stored = Array.isArray(record?.media) ? record.media : [];
      const bySlot = new Map();
      stored.forEach((item, index) => {
        if (!item?.url || !/^https?:/i.test(String(item.url))) return;
        if (freshOnly && !directMediaUsable(record, item)) return;
        const kind = item.kind === MEDIA_KIND.video ? MEDIA_KIND.video : item.kind === MEDIA_KIND.audio ? MEDIA_KIND.audio : MEDIA_KIND.photo;
        let url = String(item.url);
        if (record.provider === "twitter" && kind === MEDIA_KIND.photo) url = Media.normalizeTwitterPhoto(url);
        const order = Number.isInteger(Number(item.order)) ? Number(item.order) : index;
        const key = `${order}:${kind}`;
        const next = { ...item, kind, url, order };
        const previous = bySlot.get(key);
        if (!previous || Number(next.score || 0) >= Number(previous.score || 0)) bySlot.set(key, next);
      });
      return [...bySlot.values()].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    }

    function mediaHeadersForRecord(record, item) {
      if (record.provider === "twitter") return { Referer: "https://x.com/", "User-Agent": navigator.userAgent };
      if (record.provider === "instagram") return { Referer: "https://www.instagram.com/", "User-Agent": navigator.userAgent };
      return { "User-Agent": navigator.userAgent };
    }

    function savedCaption(record, text = null, options = {}) {
      const value = text == null ? record?.caption || "" : text;
      let hostname = "";
      try { hostname = new URL(record?.url || location.href).hostname; } catch { hostname = location.hostname; }
      return TelegramCaptionBuilder.build({
        title: record?.title || (record?.provider === "twitter" ? "X / Twitter" : record?.provider || "Mídia"),
        text: value,
        pageUrl: record?.url || "",
        linkLabel: hostname,
        includeTitle: options.includeTitle !== false,
        includeLink: options.includeLink !== false,
      });
    }

    function batchItem(record) {
      const caption = savedCaption(record);
      const base = {
        provider: record.provider,
        mediaId: record.mediaId,
        pageUrl: record.url,
        sourceUrl: record.url,
        caption: caption || undefined,
        text: PayloadSanitizer.cleanText(record.caption || "", { maxLength: 32_000 }) || undefined,
        title: PayloadSanitizer.cleanTitle(record.title || "") || undefined,
        parseMode: "HTML",
        channels: channelsFor(record),
        metadata: {
          source: "aio-saved-sync",
          savedSync: true,
          seenArchive: true,
          captionLookupState: String(record.captionLookupState || (record.caption ? "captured" : "unknown")),
          enrichedCaption: Boolean(record.caption),
          directMedia: false,
        },
      };

      if (!Settings.get("savedSync.directMediaFirst", true)) return { ...base, url: record.url };
      const media = normalizedRecordMedia(record, { freshOnly: true });
      if (!media.length) {
        // Only use a DOM thumbnail as direct media while it is still fresh. Old
        // signed Instagram CDN URLs fall back to the stable social URL.
        const thumbnail = freshThumbnailUrl(record);
        if (thumbnail && record.kind === MEDIA_KIND.photo) {
          media.push({
            kind: MEDIA_KIND.photo,
            url: record.provider === "twitter" ? Media.normalizeTwitterPhoto(thumbnail) : thumbnail,
            order: 0,
            capturedAt: Number(record.lastSeenAt || Date.now()),
          });
        }
      }
      if (!media.length) return {
        ...base,
        url: record.url,
        metadata: { ...base.metadata, directMedia: false, directMediaFallback: "stale-or-missing" },
      };

      if (media.length === 1) {
        const item = media[0];
        const mediaType = item.kind === MEDIA_KIND.photo ? "photo" : item.kind === MEDIA_KIND.audio ? "audio" : "video";
        return {
          ...base,
          mediaUrl: item.url,
          mediaType,
          ...(mediaType === "photo" ? { photoUrl: item.url } : mediaType === "audio" ? { audioUrl: item.url } : { videoUrl: item.url }),
          mediaHeaders: mediaHeadersForRecord(record, item),
          metadata: { ...base.metadata, directMedia: true, directMediaCount: 1, mediaKind: item.kind },
        };
      }

      return {
        ...base,
        mediaItems: media.map((item, index) => {
          const mediaType = item.kind === MEDIA_KIND.photo ? "photo" : "video";
          const itemText = PayloadSanitizer.cleanText(item.caption || (index === 0 ? record.caption || "" : ""), { maxLength: 32_000 });
          const itemCaption = itemText
            ? savedCaption(record, itemText, { includeTitle: index === 0, includeLink: index === 0 })
            : (index === 0 ? caption : "");
          return {
            mediaUrl: item.url,
            mediaType,
            ...(mediaType === "photo" ? { photoUrl: item.url } : { videoUrl: item.url }),
            caption: itemCaption,
            parseMode: "HTML",
            mediaHeaders: mediaHeadersForRecord(record, item),
            metadata: { carouselIndex: item.order ?? index, savedSync: true },
          };
        }),
        metadata: { ...base.metadata, directMedia: true, directMediaCount: media.length, carousel: true },
      };
    }

    function chunk(values, size) {
      const out = [];
      const n = Math.max(1, Math.min(50, Number(size) || 10));
      for (let index = 0; index < values.length; index += n) out.push(values.slice(index, index + n));
      return out;
    }

    async function sendIndividual(record) {
      if (syncing || !record) return;
      let current = cacheState(record);
      // Positive IndexedDB/fresh relay knowledge does not need another lookup.
      // Unknown/stale/negative state is checked once; /batch still performs its
      // own race-safe preflight before any expensive media work.
      if (!current.allSuccessful && current.source === "unknown") {
        await checkRecordsNow([record]);
        current = cacheState(record);
      }
      if (current.allSuccessful) {
        const decision = await Toast.confirm({
          title: "Mídia já enviada",
          description: "Esta publicação já está sincronizada nos canais configurados. Deseja enviar novamente?",
          icon: record.thumbnail ? { src: record.thumbnail, fit: "cover", loading: "lazy", decoding: "async" } : "refresh",
          duration: 0,
          dismissible: true,
          actions: [
            { id: "cancel", label: "Cancelar", variant: "secondary", value: "cancel" },
            { id: "resend", label: "Enviar novamente", variant: "primary", value: "resend" },
          ],
        });
        if (decision !== "resend") return;
        const item = { ...batchItem(record), force: true };
        const output = await TelegramSendController.sendBatchWithUi(
          { items: [item], channels: channelsFor(record), concurrency: 1 },
          { mediaIcon: record.thumbnail || "upload", confirmDuplicates: false },
        );
        const entry = output?.items?.[0];
        if (entry?.result) applyBatchResultToRecord(record, entry.result);
      } else {
        await syncRecords([record], { enrich: false });
      }
      renderRecord(record);
      refreshShell();
    }

    function clearPendingRecheck(recordOrKey) {
      const key = String(recordOrKey?.key || recordOrKey || "");
      const timer = pendingRecheckTimers.get(key);
      if (timer) clearTimeout(timer);
      pendingRecheckTimers.delete(key);
    }

    function schedulePendingRecheck(record, attempt = 0) {
      if (!record?.key || attempt >= 3 || pendingRecheckTimers.has(record.key)) return;
      const delays = [2_000, 4_500, 9_000];
      const timer = window.setTimeout(async () => {
        pendingRecheckTimers.delete(record.key);
        try {
          await checkRecordsNow([record], { force: true });
          if (cacheState(record).allSuccessful) {
            record.deliveryInProgressChannels = [];
            renderRecord(record);
            refreshShell();
            return;
          }
        } catch (error) {
          debug("Recheck de entrega em andamento falhou", { key: record.key, attempt, error });
        }
        if (Array.isArray(record.deliveryInProgressChannels) && record.deliveryInProgressChannels.length) {
          schedulePendingRecheck(record, attempt + 1);
        }
      }, delays[Math.min(attempt, delays.length - 1)]);
      pendingRecheckTimers.set(record.key, timer);
    }

    function applyBatchResultToRecord(record, result) {
      if (!record || !result) return;
      const requested = uniqueChannelIds(result.channels?.requested || channelsFor(record));
      const covered = new Set(getCoveredChannels(result));
      const requestedMap = Object.fromEntries(requested.map((channelId) => [channelId, {
        sent: covered.has(channelId),
        sendCount: covered.has(channelId) ? 1 : 0,
      }]));
      record.relayCheck = {
        at: Date.now(),
        mediaKey: record.key,
        exists: requested.some((channelId) => requestedMap[channelId]?.sent),
        channels: requested.filter((channelId) => requestedMap[channelId]?.sent).map((channelId) => ({ channelId, sendCount: 1 })),
        requestedChannels: requestedMap,
      };
      record.relayChecking = false;
      record.deliveryInProgressChannels = getInProgressChannels(result);
      persistRelayKnowledge(record, requested, requestedMap, { source: "batch-v2.8" });
      if (record.deliveryInProgressChannels.length) schedulePendingRecheck(record);
      else clearPendingRecheck(record);
    }

    async function syncRecords(inputRecords, options = {}) {
      if (syncing) return;
      const values = [...new Map((inputRecords || []).filter(Boolean).map((record) => [record.key, record])).values()];
      if (!values.length) {
        Toast?.info?.({ title: "Nada para sincronizar", description: "Selecione itens pendentes ou use Sync all." });
        return;
      }

      syncing = true;
      panel?.setAttribute("data-busy", "true");
      const cancelledKeys = new Set();
      let activeBatchKeys = new Set();
      let activeBatchController = null;

      try {
        if (options.enrich !== false && Settings.get("savedSync.enrichCaptions", false)) {
          await enrichMany(values);
        }

        const pending = values.filter((record) => !cacheState(record).allSuccessful);
        if (!pending.length) {
          Toast?.success?.({ title: "Tudo sincronizado", description: "Nenhum envio necessário.", icon: "check", duration: 2_200 });
          return;
        }

        const manager = Toast.multiLoading({
          id: `aio:saved-sync:${Date.now().toString(36)}`,
          title: routeMode() === "twitter" ? "Sincronizando bookmarks" : "Sincronizando salvos",
          viewportRatio: 0.5,
          successDuration: 1_700,
          successMorphDelay: 160,
          successFadeDuration: 240,
          cancelledDuration: 1_300,
          cancellable: true,
          cancelAllLabel: "Cancelar todos",
          autoDismiss: true,
          showSummary: true,
          metadata: { source: "aio-saved-sync", count: pending.length },
        });

        for (const record of pending) {
          manager?.add?.({
            id: record.key,
            title: record.title || `${record.provider === "twitter" ? "Tweet" : "Instagram"} · ${record.mediaId}`,
            description: "Aguardando…",
            icon: record.thumbnail
              ? { src: record.thumbnail, fit: "cover", loading: "lazy", decoding: "async" }
              : "upload",
            cancellable: true,
            metadata: { provider: record.provider, mediaId: record.mediaId, url: record.url },
            cancel: async ({ reason } = {}) => {
              // Once a batch has entered the Worker, an individual row cannot be
              // truthfully cancelled. The UI hides its X at that point. Cancel All
              // is still allowed and aborts the HTTP request for the whole batch.
              const cancelAll = reason === "cancel-all" || reason === "user-all";
              if (activeBatchKeys.has(record.key) && !cancelAll) return;
              cancelledKeys.add(record.key);
              record.selected = false;
              if (activeBatchKeys.has(record.key) && [...activeBatchKeys].every((key) => cancelledKeys.has(key))) {
                try { activeBatchController?.abort(new DOMException("Batch cancelado pelo usuário.", "AbortError")); } catch {}
              }
              renderRecord(record);
              refreshShell();
            },
            retry: async ({ signal, update }) => {
              update({ description: "Tentando novamente…", progress: null, cancellable: false });
              const operation = TelegramSendController.createBatchOperation({
                items: [batchItem(record)],
                channels: channelsFor(record),
                concurrency: 1,
                metadata: { source: "aio-saved-sync-retry", relayBatchVersion: "2.8" },
              });
              const output = await TelegramSendController.sendBatch(operation, {
                confirmDuplicates: false,
                cacheConfirmedDuplicates: true,
                signal,
              });
              const entry = output.items?.[0];
              if (!entry) throw new Error("O relay não retornou resultado para o retry.");
              applyBatchResultToRecord(record, entry.result);
              record.failed = entry.syncState === "failed";
              renderRecord(record);
              refreshShell();
              if (entry.syncState !== "synced") {
                const inProgress = getInProgressChannels(entry.result).length;
                const failure = getFailedChannels(entry.result)[0];
                throw new Error(
                  inProgress && !failure
                    ? "Entrega ainda em andamento no relay; o status será atualizado automaticamente."
                    : failure?.error || failure?.reason || "O retry não sincronizou todos os canais.",
                );
              }
              record.selected = false;
              return output;
            },
          });
        }

        const batches = chunk(pending, Settings.get("savedSync.batchSize", 50));
        let processed = 0;
        let syncedCount = 0;
        let failedCount = 0;
        let partialCount = 0;
        let pendingCount = 0;
        let cancelledCount = 0;
        const relayMetrics = {
          preflightQueries: 0,
          claimQueries: 0,
          dbRoundTrips: 0,
          dbStatements: 0,
          mediaResolutions: 0,
          telegramAttempts: 0,
          skippedAlreadySent: 0,
          skippedDuplicateInBatch: 0,
        };

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
          const originalBatch = batches[batchIndex];
          const currentBatch = originalBatch.filter((record) => !cancelledKeys.has(record.key));
          for (const record of originalBatch) {
            if (!cancelledKeys.has(record.key)) continue;
            cancelledCount += 1;
            await manager?.cancel?.(record.key, "cancelled-before-send");
          }
          if (!currentBatch.length) continue;

          activeBatchKeys = new Set(currentBatch.map((record) => record.key));
          activeBatchController = new AbortController();
          for (const record of currentBatch) {
            manager?.update?.(record.key, {
              description: `Batch ${batchIndex + 1}/${batches.length} · preflight D1…`,
              status: "loading",
              progress: null,
              cancellable: false,
            });
          }

          const items = currentBatch.map(batchItem);
          const operation = TelegramSendController.createBatchOperation({
            items,
            channels: channelsFor(currentBatch[0]),
            concurrency: Math.max(1, Math.min(5, Number(Settings.get("savedSync.relayBatchConcurrency", 3)) || 3)),
            metadata: { source: "aio-saved-sync", batchIndex, itemOffset: processed, relayBatchVersion: "2.8" },
          });

          try {
            const output = await TelegramSendController.sendBatch(operation, {
              confirmDuplicates: false,
              cacheConfirmedDuplicates: true,
              signal: activeBatchController.signal,
            });

            const relaySummary = output.envelope?.payload?.summary || {};
            for (const key of Object.keys(relayMetrics)) relayMetrics[key] += Number(relaySummary[key] || 0);

            for (let index = 0; index < output.items.length; index += 1) {
              const entry = output.items[index];
              const originalIndex = Number.isFinite(Number(entry?.index)) ? Number(entry.index) : index;
              const record = currentBatch[originalIndex] || currentBatch[index];
              if (!record) continue;
              record.failed = entry.syncState === "failed";
              applyBatchResultToRecord(record, entry.result);
              if (entry.syncState === "synced") record.selected = false;

              const coveredChannels = getCoveredChannels(entry.result).length;
              const failedChannels = getFailedChannels(entry.result).length;
              const inProgressChannels = getInProgressChannels(entry.result).length;
              if (entry.syncState === "synced") {
                syncedCount += 1;
                const description = entry.state === "already_sent"
                  ? "Já sincronizada no relay"
                  : entry.state === "duplicate_in_batch"
                    ? "Coberta por outro item do batch"
                    : `Sincronizada em ${coveredChannels} ${coveredChannels === 1 ? "canal" : "canais"}`;
                manager?.success?.(record.key, { description, progress: 1 });
              } else if (inProgressChannels > 0 && failedChannels === 0) {
                pendingCount += 1;
                record.failed = false;
                manager?.update?.(record.key, {
                  status: "loading",
                  progress: null,
                  cancellable: false,
                  description: coveredChannels
                    ? `${coveredChannels} sincronizado(s) · ${inProgressChannels} entrega(s) em andamento`
                    : `${inProgressChannels} entrega(s) já em andamento no relay`,
                });
                // RodToaster 4.7 has no neutral terminal state. Remove the task
                // without calling cancel(), which would incorrectly label it Cancelled.
                manager?.remove?.(record.key, false);
              } else if (entry.syncState === "partial") {
                partialCount += 1;
                manager?.error?.(
                  record.key,
                  new Error("Sincronização parcial"),
                  { description: `${coveredChannels} sincronizado(s) · ${failedChannels} falha(s)` },
                );
              } else if (entry.state === "cancelled") {
                cancelledCount += 1;
                await manager?.cancel?.(record.key, "cancelled");
              } else {
                failedCount += 1;
                const failure = getFailedChannels(entry.result)[0];
                manager?.error?.(
                  record.key,
                  new Error(failure?.error || "Falha ao sincronizar"),
                  { description: failure?.reason || "Falha no relay" },
                );
              }
              renderRecord(record);
            }
          } catch (error) {
            const aborted = error?.name === "AbortError" || activeBatchController.signal.aborted;
            currentBatch.forEach((record) => {
              if (cancelledKeys.has(record.key) || aborted) {
                cancelledCount += 1;
                void manager?.cancel?.(record.key, error);
              } else {
                failedCount += 1;
                record.failed = true;
                manager?.error?.(record.key, error, { description: truncate(error?.message || String(error), 140) });
              }
              renderRecord(record);
            });
            debug("SavedSync batch falhou", error);
          } finally {
            activeBatchKeys = new Set();
            activeBatchController = null;
          }

          processed += currentBatch.length;
          refreshShell();
        }

        const summary = [
          syncedCount ? `${syncedCount} sincronizada(s)` : "",
          partialCount ? `${partialCount} parcial(is)` : "",
          pendingCount ? `${pendingCount} em andamento` : "",
          failedCount ? `${failedCount} falha(s)` : "",
          cancelledCount ? `${cancelledCount} cancelada(s)` : "",
          relayMetrics.preflightQueries ? `${relayMetrics.preflightQueries} preflight D1` : "",
          relayMetrics.telegramAttempts ? `${relayMetrics.telegramAttempts} tentativa(s) Telegram` : "",
        ].filter(Boolean).join(" · ");

        if (failedCount || partialCount || cancelledCount) {
          Toast?.warning?.({ title: "Sync concluído com detalhes", description: summary, icon: "refresh", duration: 5_000 });
        } else if (pendingCount) {
          Toast?.info?.({ title: "Sync processado", description: summary, icon: "info", duration: 4_000 });
        } else {
          Toast?.success?.({ title: "Sync concluído", description: summary || "Todos os itens foram processados.", icon: "check", duration: 3_000 });
        }
      } finally {
        syncing = false;
        panel?.removeAttribute("data-busy");
        refreshShell();
      }
    }

    function extractCaptionFromHtml(html, record) {
      const text = String(html || "");
      if (!text.trim()) return { caption: "", title: "" };
      let documentNode = null;
      try { documentNode = new DOMParser().parseFromString(text, "text/html"); } catch {}
      const meta = (...selectors) => {
        for (const selector of selectors) {
          const value = documentNode?.querySelector?.(selector)?.getAttribute?.("content");
          if (value && String(value).trim()) return String(value).trim();
        }
        return "";
      };
      let caption = meta(
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
        'meta[name="description"]',
      );
      let title = meta('meta[property="og:title"]', 'meta[name="twitter:title"]') || String(documentNode?.title || "").trim();

      // Prefer structured descriptions when the HTML exposes them.
      try {
        for (const script of documentNode?.querySelectorAll?.('script[type="application/ld+json"]') || []) {
          const parsed = JSON.parse(script.textContent || "null");
          const stack = Array.isArray(parsed) ? [...parsed] : [parsed];
          while (stack.length) {
            const value = stack.shift();
            if (!value || typeof value !== "object") continue;
            if (!caption && typeof value.description === "string") caption = value.description;
            if (!caption && typeof value.articleBody === "string") caption = value.articleBody;
            if (!title && typeof value.headline === "string") title = value.headline;
            for (const nested of Object.values(value)) if (nested && typeof nested === "object") stack.push(nested);
          }
        }
      } catch {}

      caption = PayloadSanitizer.cleanText(caption || "", { maxLength: 4_000 });
      title = PayloadSanitizer.cleanText(title || "", { maxLength: 240 });

      // Instagram often wraps the caption in: “N likes ... - user on Instagram: \"caption\"”.
      if (record?.provider === "instagram" && caption) {
        const match = caption.match(/\bon Instagram:\s*[“\"]?([\s\S]*?)[”\"]?\s*$/i);
        if (match?.[1]) caption = PayloadSanitizer.cleanText(match[1], { maxLength: 4_000 });
      }
      return { caption, title };
    }

    async function fetchCaption(record, options = {}) {
      const captured = capturedCaption(record.provider, record.mediaId);
      if (captured) return { caption: captured, title: record.title || "", source: "network-capture", state: "captured" };
      const controller = new AbortController();
      const timeoutMs = Math.max(5, Number(Settings.get("savedSync.enrichmentTimeoutSeconds", 16)) || 16) * 1000;
      const timeout = setTimeout(() => controller.abort(new DOMException("Timeout ao enriquecer caption.", "TimeoutError")), timeoutMs);
      const parentSignal = options.signal;
      const onAbort = () => controller.abort(parentSignal?.reason || new DOMException("Operação cancelada.", "AbortError"));
      if (parentSignal) {
        if (parentSignal.aborted) onAbort();
        else parentSignal.addEventListener("abort", onAbort, { once: true });
      }
      try {
        const response = await fetch(record.url, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          redirect: "follow",
          headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.7" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} ao buscar a publicação.`);
        const html = await response.text();
        const extracted = extractCaptionFromHtml(html, record);
        return { ...extracted, source: "fetch-html", state: extracted.caption ? "full" : "absent" };
      } finally {
        clearTimeout(timeout);
        try { parentSignal?.removeEventListener?.("abort", onAbort); } catch {}
      }
    }

    function persistCaptionLookup(record, source = "caption-lookup") {
      SavedMediaArchive.upsert({
        key: record.key,
        provider: record.provider,
        mediaId: record.mediaId,
        url: record.url,
        kind: record.kind,
        caption: record.caption,
        title: record.title,
        thumbnail: record.thumbnail,
        media: record.media || [],
        captionSource: record.captionSource || "",
        captionLookupState: record.captionLookupState || (record.caption ? "captured" : "unknown"),
        captionLookupAt: Number(record.captionLookupAt || 0),
        captionEnriched: Boolean(record.caption),
        captionEnrichedAt: Number(record.captionEnrichedAt || 0),
        relayKnownBySignature: record.relayKnownBySignature || {},
      }, source);
    }

    async function enrichRecord(record, options = {}) {
      if (!record?.url || !needsCaptionLookup(record)) return record;
      try {
        const enriched = await fetchCaption(record, options);
        const now = Date.now();
        if (enriched.caption) {
          record.caption = enriched.caption;
          record.captionSource = enriched.source || "fetch-html";
          record.captionLookupState = enriched.state === "captured" ? "captured" : "full";
          record.captionLookupAt = now;
          record.captionEnriched = true;
          record.captionEnrichedAt = now;
        } else {
          record.captionLookupState = "absent";
          record.captionLookupAt = now;
          record.captionSource = enriched.source || record.captionSource || "fetch-html";
        }
        if (enriched.title) record.title = enriched.title;
        persistCaptionLookup(record);
        renderRecord(record);
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        record.captionLookupState = "failed";
        record.captionLookupAt = Date.now();
        persistCaptionLookup(record, "caption-failed");
        renderRecord(record);
        debug("Fetch de caption falhou", { key: record.key, error });
      }
      return record;
    }

    async function enrichMany(values) {
      const recordsToEnrich = (values || []).filter((record) => needsCaptionLookup(record));
      if (!recordsToEnrich.length) {
        Toast?.info?.({ title: "Captions já hidratadas", description: "Nenhuma busca adicional foi necessária.", icon: "check", duration: 2_000 });
        return values;
      }

      const manager = Toast.multiLoading({
        id: `aio:caption-enrichment:${Date.now().toString(36)}`,
        title: "Enriquecendo captions via fetch",
        viewportRatio: 0.5,
        successDuration: 1_500,
        cancellable: true,
        cancelAllLabel: "Cancelar todos",
        autoDismiss: true,
        showSummary: true,
        metadata: { source: "aio-caption-fetch", count: recordsToEnrich.length },
      });

      for (const record of recordsToEnrich) {
        manager?.add?.({
          id: record.key,
          title: record.title || `${record.provider === "twitter" ? "Tweet" : "Instagram"} · ${record.mediaId}`,
          description: "Aguardando…",
          icon: record.thumbnail ? { src: record.thumbnail, fit: "cover", loading: "lazy", decoding: "async" } : "info",
          cancellable: true,
          metadata: { provider: record.provider, mediaId: record.mediaId },
        });
      }

      if (!manager) {
        for (const record of recordsToEnrich) await enrichRecord(record);
        return values;
      }

      // Sequential by design on iPhone: no burst of authenticated full-page fetches.
      for (const record of recordsToEnrich) {
        if (manager.get(record.key)?.status === "cancelled") continue;
        try {
          await manager.run(record.key, async ({ signal, update }) => {
            if (signal.aborted) throw signal.reason;
            update({ description: "Buscando metadados da publicação…", progress: null });
            const result = await enrichRecord(record, { signal });
            update({
              description: result.caption
                ? "Caption capturada"
                : result.captionLookupState === "absent"
                  ? "Publicação sem caption detectável"
                  : "Caption indisponível temporariamente",
              progress: 1,
            });
            return result;
          });
        } catch (error) {
          if (error?.name !== "AbortError") debug("Falha enriquecendo caption", error);
        }
      }
      return values;
    }

    async function runEnrichmentAgent() {
      // Legacy compatibility entrypoint. v4 enriches through fetch and no longer
      // opens background tabs or coordinates via localStorage.
      return false;
    }

    function resetLocalState(options = {}) {
      if (relayCheckTimer) { clearTimeout(relayCheckTimer); relayCheckTimer = 0; }
      relayCheckQueue.clear();
      relayCheckInFlight.clear();
      relayCheckByRecord.clear();
      for (const timer of pendingRecheckTimers.values()) clearTimeout(timer);
      pendingRecheckTimers.clear();
      archiveHydratedFor = null;

      const clearRelayKnowledge = options.clearRelayKnowledge !== false;
      const clearArchivedRecords = options.clearArchivedRecords === true;
      for (const [key, record] of records) {
        record.relayChecking = false;
        record.failed = false;
        record.selected = false;
        if (clearRelayKnowledge) {
          record.relayCheck = null;
          record.relayKnownBySignature = {};
        }
        if (clearArchivedRecords && !record.node?.isConnected) {
          records.delete(key);
          continue;
        }
        renderRecord(record);
      }
      refreshShell(true);
    }

    function diagnostics() { const values=[...records.values()]; return { route: routeMode(), records: values.length, visible: values.filter((r)=>r.node?.isConnected).length, archived: values.filter((r)=>!r.node?.isConnected).length, directMediaRecords: values.filter((r)=>normalizedRecordMedia(r).length > 0).length, sent: values.filter((r)=>cacheState(r).allSuccessful).length, remoteKnown: values.filter((r)=>["relay","indexeddb-positive"].includes(cacheState(r).source)).length, persistedPositive: values.filter((r)=>cacheState(r).source === "indexeddb-positive").length, localFresh: values.filter((r)=>cacheState(r).source === "local-fresh").length, unknown: values.filter((r)=>cacheState(r).source === "unknown").length, enrichedCaptions: values.filter((r)=>hasHydratedCaption(r)).length, selected: values.filter((r)=>r.selected).length, syncing, batchSize: Settings.get("savedSync.batchSize",50), relayBatchConcurrency: Settings.get("savedSync.relayBatchConcurrency",3), relayLookupBatchSize: Settings.get("savedSync.relayLookupBatchSize",100), relayLookupFreshMs: Settings.get("savedSync.relayLookupFreshMs",60000), relayChecks, relayCheckItems, relayCheckFailures, relayCheckQueued: relayCheckQueue.size, relayCheckInFlight: relayCheckInFlight.size, relayCheckByRecord: relayCheckByRecord.size, pendingRechecks: pendingRecheckTimers.size, captionStates: Object.fromEntries(["unknown","captured","full","absent","failed"].map((state)=>[state,values.filter((r)=>String(r.captionLookupState || (r.caption ? "captured" : "unknown"))===state).length])), enrichCaptions: Settings.get("savedSync.enrichCaptions",false), archive: SavedMediaArchive.diagnostics() }; }

    return Object.freeze({ scan, cleanup, hydrateArchive, syncAll: () => syncRecords([...records.values()]), syncSelected: () => syncRecords([...records.values()].filter((record) => record.selected)), enrichSelected: () => enrichMany([...records.values()].filter((record) => record.selected)), check: (inputRecords = [...records.values()], options = {}) => checkRecordsNow(inputRecords, options), runEnrichmentAgent, refreshAll, resetLocalState, diagnostics, records });
  })();

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
    if (Settings.get("instagram.enabled", true)) InstagramAccountHeader.install();
  } catch (error) {
    warn("InstagramAccountHeader.install() falhou", error);
  }

  try { void SavedSync.hydrateArchive(); } catch (error) { debug("SavedSync archive hydrate", error); }
  try { void SavedSync.runEnrichmentAgent(); } catch (error) { debug("SavedSync enrichment agent", error); }

  const scan = (root = document, options = {}) => {
    try { SavedSync.scan(root); } catch (error) { debug("SavedSync.scan() falhou", error); }
    if (!Settings.get("general.enabled", true)) {
      Ui.hideAll();
      return;
    }

    try {
      if (IS_TWITTER && Settings.get("twitter.enabled", true)) TwitterProvider.scan(root, options);
    } catch (error) {
      warn("TwitterProvider.scan() falhou", error);
    }

    try {
      if (IS_INSTAGRAM && Settings.get("instagram.enabled", true)) InstagramProvider.scan(root, options);
    } catch (error) {
      warn("InstagramProvider.scan() falhou", error);
    }

    try {
      if (!IS_TWITTER && !IS_INSTAGRAM && Settings.get("general.universalPlayers", true)) GenericMediaProvider.scan(root, options);
    } catch (error) {
      warn("GenericMediaProvider.scan() falhou", error);
    }
  };

  const LayoutScheduler = (() => {
    let frame = 0;
    let requests = 0;
    let runs = 0;

    const raf = typeof requestAnimationFrame === "function"
      ? requestAnimationFrame.bind(window)
      : (callback) => window.setTimeout(() => callback(performance.now()), 16);

    function request() {
      requests += 1;
      if (frame) return;
      frame = raf(() => {
        frame = 0;
        runs += 1;
        try { Ui.repositionAll(); } catch (error) { debug("LayoutScheduler", error); }
      });
    }

    return Object.freeze({ request, diagnostics: () => ({ scheduled: Boolean(frame), requests, runs }) });
  })();

  const DirtyRootScheduler = (() => {
    const pending = new Set();
    let frame = 0;
    let queued = 0;
    let scans = 0;
    let flushes = 0;
    let collapsed = 0;
    let overflows = 0;

    const raf = typeof requestAnimationFrame === "function"
      ? requestAnimationFrame.bind(window)
      : (callback) => window.setTimeout(() => callback(performance.now()), 16);

    function normalizeRoot(value) {
      if (value === document) return document.documentElement;
      if (isElement(value)) return value;
      return isElement(value?.parentElement) ? value.parentElement : null;
    }

    function schedule() {
      if (frame) return;
      frame = raf(flush);
    }

    function mark(value) {
      const root = normalizeRoot(value);
      if (!root || !root.isConnected) return false;
      if (root.closest?.("#aio-media-actions-root,#aio-settings-host")) return false;

      for (const existing of pending) {
        if (existing === root || existing.contains?.(root)) {
          collapsed += 1;
          return false;
        }
        if (root.contains?.(existing)) {
          pending.delete(existing);
          collapsed += 1;
        }
      }

      pending.add(root);
      queued += 1;
      const softCap = Math.max(32, (Number(CONFIG.ui.dirtyRootsPerFrame) || 48) * 2);
      if (pending.size > softCap) {
        const semantic = new Set();
        for (const candidate of pending) {
          const scoped = candidate.closest?.('article,[data-testid="tweet"],[role="main"],main') || candidate;
          if (scoped?.isConnected) semantic.add(scoped);
          if (semantic.size > softCap) break;
        }
        pending.clear();
        if (semantic.size && semantic.size <= softCap) {
          semantic.forEach((entry) => pending.add(entry));
        } else {
          pending.add(document.querySelector('main,[role="main"]') || document.documentElement);
        }
        overflows += 1;
      }
      schedule();
      return true;
    }

    function flush() {
      frame = 0;
      flushes += 1;
      if (!pending.size) return;

      const limit = Math.max(8, Number(CONFIG.ui.dirtyRootsPerFrame) || 48);
      const batch = [...pending].slice(0, limit);
      batch.forEach((root) => pending.delete(root));

      for (const root of batch) {
        scans += 1;
        scan(root, { cleanup: false });
      }

      // One cleanup pass per animation frame, never once per mutation root.
      try {
        if (IS_TWITTER) TwitterProvider.cleanup();
        else if (IS_INSTAGRAM) InstagramProvider.cleanup();
        else GenericMediaProvider.cleanup();
      } catch {}
      try { Ui.pruneDisconnected(); } catch {}
      if (IS_INSTAGRAM) {
        try { InstagramAccountHeader.refresh(); } catch {}
        if (/^\/reel\//i.test(location.pathname)) {
          try { void InstagramOpenedReel.check(); } catch {}
        }
      }
      LayoutScheduler.request();
      if (pending.size) schedule();
    }

    return Object.freeze({ mark, flush, diagnostics: () => ({ pending: pending.size, scheduled: Boolean(frame), queued, scans, flushes, collapsed, overflows }) });
  })();

  requestLayout = () => LayoutScheduler.request();
  queueDirtyRoot = (root) => DirtyRootScheduler.mark(root);

  const settingsStructurePaths = [
    "general.enabled", "general.telegram", "general.directDownload", "general.universalPlayers",
    "instagram.enabled", "twitter.enabled", "twitter.twirrlResolver",
  ];

  const relayRoutingPaths = new Set([
    "relay.providerRouting", "relay.defaultChannels", "relay.twitterChannels", "relay.instagramChannels",
    "relay.youtubeChannels", "relay.adultChannels", "relay.mediaChannelMode", "relay.photoChannels",
    "relay.videoChannels", "relay.audioChannels", "savedSync.relayDataEpoch",
  ]);
  const relayBackendIdentityPaths = new Set(["relay.url", "relay.token"]);

  Settings.subscribe(({ paths = [] }) => {
    const changed = Array.isArray(paths) ? paths : [];
    Ui.applySettings();

    if (changed.some((path) => path === "*" || relayRoutingPaths.has(path))) {
      RelayRoutingCache.invalidate();
      // Channel routing changed. Drop only transient check state; monotonic
      // per-channel positives remain safe and missing channels will be queried.
      try { SavedSync?.resetLocalState?.({ clearRelayKnowledge: false }); } catch {}
    }
    if (changed.some((path) => path === "*" || relayBackendIdentityPaths.has(path))) {
      // A different relay URL/token may point at a different D1 database. Never
      // carry positive delivery knowledge across backend identities.
      DeliveryCache.clear();
      void SavedMediaArchive.clearRelayKnowledge().finally(() => {
        try { SavedSync?.resetLocalState?.({ clearRelayKnowledge: true }); } catch {}
        try { DirtyRootScheduler.mark(document.documentElement); } catch {}
      });
    }

    if (changed.some((path) => path === "*" || settingsStructurePaths.includes(path))) {
      Ui.clearGroups();
      if (Settings.get("general.enabled", true)) DirtyRootScheduler.mark(document.documentElement);
    } else {
      Ui.refreshAll();
      LayoutScheduler.request();
    }

    if (changed.some((path) => path === "*" || path === "players.interceptNetwork" || path === "general.universalPlayers")) {
      try { GlobalMediaCapture.install(); } catch (error) { debug("Network interceptor reconfigure falhou", error); }
    }
    if (changed.some((path) => path === "*" || path === "players.interceptPlayers" || path === "general.universalPlayers")) {
      try { PlayerInterceptor.install(); } catch (error) { debug("Player interceptor reconfigure falhou", error); }
    }
    if (changed.some((path) => path === "*" || path === "general.enabled" || path === "instagram.accountHeader" || path === "instagram.enabled")) {
      try {
        if (Settings.get("instagram.accountHeader", true) && Settings.get("instagram.enabled", true)) InstagramAccountHeader.install();
        InstagramAccountHeader.refresh();
      } catch {}
    }
    if (changed.some((path) => path === "*" || path === "instagram.autoBookmarkOpenedReel")) {
      try { if (Settings.get("instagram.autoBookmarkOpenedReel", true)) InstagramOpenedReel.install(); } catch {}
    }
    if (changed.some((path) => path === "*" || path === "advanced.debug")) {
      try { Toast?.raw?.configure?.({ shouldDebug: debugEnabled() }); } catch {}
    }
    if (changed.some((path) => path === "history.maxEntries" || path === "*")) {
      try { MediaUsage.compact(); } catch {}
    }
    if (changed.some((path) => path === "history.enabled" || path === "appearance.showUsedIndicator" || path === "*")) {
      Ui.refreshAll();
    }
  });

  try {
    SettingsPanel.install();
  } catch (error) {
    warn("SettingsPanel.install() falhou", error);
  }

  try {
    BookmarkBridge.install();
  } catch (error) {
    warn("BookmarkBridge.install() falhou", error);
  }

  try {
    TwitterSocialNetworkBridge.install();
  } catch (error) {
    warn("TwitterSocialNetworkBridge.install() falhou", error);
  }

  try {
    TwitterProvider.installImmersiveRecovery();
  } catch (error) {
    warn("TwitterProvider.installImmersiveRecovery() falhou", error);
  }

  try {
    InstagramOpenedReel.install();
  } catch (error) {
    warn("InstagramOpenedReel.install() falhou", error);
  }

  scan(document);
  try { DirectMediaProvider.run(); } catch (error) { warn("DirectMediaProvider.run() falhou", error); }
  LayoutScheduler.request();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        DirtyRootScheduler.mark(mutation.target);
        continue;
      }

      let added = false;
      for (const node of mutation.addedNodes) {
        if (!isElement(node)) continue;
        if (node.closest?.("#aio-media-actions-root,#aio-settings-host")) continue;
        DirtyRootScheduler.mark(node);
        added = true;
      }
      // Removed/recycled nodes need only parent cleanup, not a document scan.
      if (!added && mutation.removedNodes?.length) DirtyRootScheduler.mark(mutation.target);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset", "poster", "href"],
  });

  const scheduleLayout = () => LayoutScheduler.request();
  addEventListener("scroll", scheduleLayout, { capture: true, passive: true });
  addEventListener("resize", scheduleLayout, { passive: true });
  window.visualViewport?.addEventListener("scroll", scheduleLayout, { passive: true });
  window.visualViewport?.addEventListener("resize", scheduleLayout, { passive: true });
  addEventListener("pageshow", () => {
    DirtyRootScheduler.mark(document.documentElement);
    LayoutScheduler.request();
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      DirtyRootScheduler.mark(document.documentElement);
      LayoutScheduler.request();
    }
  }, { passive: true });
  NavigationObserver.subscribe(() => {
    DirtyRootScheduler.mark(document.documentElement);
    LayoutScheduler.request();
  });

  const diagnostics = () => ({
    version: VERSION,
    href: location.href,
    content: {
      twitterExpandMore: Settings.get("twitter.expandMore", true),
      instagramExpandMore: Settings.get("instagram.expandMore", true),
      expandAttempts: CONFIG.content.expandAttempts,
      sanitizeBeforeWorker: true,
    },
    provider: IS_TWITTER ? "twitter" : IS_INSTAGRAM ? "instagram" : ProviderIdentity.fromHost(),
    features: {
      enabled: Settings.get("general.enabled", true),
      telegramButton: Settings.get("general.telegram", true),
      downloadButton: Settings.get("general.directDownload", false),
      universalPlayers: Settings.get("general.universalPlayers", true),
    },
    settings: (() => {
      const values = Settings.snapshot();
      const overrides = Settings.persisted();
      if (values?.relay?.token) values.relay.token = "[configured]";
      if (overrides?.relay?.token) overrides.relay.token = "[configured]";
      return {
        storageKey: Settings.key,
        secret: SecretStore.diagnostics(),
        schema: Settings.schema,
        values,
        overrides,
        panel: SettingsPanel?.diagnostics?.() || null,
      };
    })(),
    history: {
      post: History.diagnostics(),
      media: MediaUsage.diagnostics(),
      delivery: DeliveryCache.diagnostics(),
    },
    savedSync: SavedSync.diagnostics(),
    ui: Ui.diagnostics(),
    instagramAccountHeader: InstagramAccountHeader.diagnostics(),
    architecture: {
      eventDriven: true,
      pollingIntervals: 0,
      networkBroker: NetworkBroker.diagnostics(),
      dirtyRoots: DirtyRootScheduler.diagnostics(),
      layout: LayoutScheduler.diagnostics(),
      navigation: NavigationObserver.diagnostics(),
      performanceObserver: ResourcePerformanceCache.diagnostics(),
    },
    universal: {
      network: GlobalMediaCapture.diagnostics(),
      players: PlayerInterceptor.diagnostics(),
      genericMounted: GenericMediaProvider.mounted.size,
      manifestDelivery: {
        workerFirst: Settings.get("players.workerFirstManifests", true),
        localRemuxFallback: Settings.get("players.localRemuxFallback", false),
        hlsEnabled: Settings.get("players.hls", true),
        dashEnabled: Settings.get("players.dash", true),
      },
    },
    captureStores: {
      maxPosts: CONFIG.providers.captureStoreMaxPosts,
      twitter: {
        posts: TwitterStore.posts.size,
        metadata: TwitterStore.metadata.size,
        recent: TwitterStore.recentPosts.size,
        syndicationInFlight: TwitterStore.syndication.size,
      },
      instagram: {
        posts: InstagramStore.posts.size,
        metadata: InstagramStore.metadata.size,
        carousels: InstagramStore.carouselPosts.size,
        carouselLengths: InstagramStore.carouselLengths.size,
        recent: InstagramStore.recentPosts.size,
      },
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
      twitterEnabled: Settings.get("twitter.enabled", true) && Settings.get("twitter.bookmarkTrigger", true),
      twitterRepostEnabled: Settings.get("twitter.enabled", true) && Settings.get("twitter.repostTrigger", true),
      twitterLikeEnabled: Settings.get("twitter.enabled", true) && Settings.get("twitter.likeTrigger", false),
      twitterRepostAfterAttempt: Settings.get("twitter.repostAfterAttempt", false),
      twitterNetworkSocial: TwitterSocialNetworkBridge.diagnostics(),
      twirrlResolver: TwitterDirectResolver.diagnostics(),
      instagramBookmarkEnabled: Settings.get("instagram.enabled", true) && Settings.get("instagram.bookmarkTrigger", true),
      instagramLikeEnabled: Settings.get("instagram.enabled", true) && Settings.get("instagram.likeTrigger", false),
    },
    toaster: Toast?.diagnostics?.() || {
      available: false,
    },
  });

  const api = {
    version: VERSION,
    config: CONFIG,
    settings: {
      get: (path, fallback) => Settings.get(path, fallback),
      set: (path, value) => Settings.set(path, value, "api"),
      patch: (value) => Settings.patch(value, "api"),
      reset: () => Settings.reset(),
      snapshot: () => Settings.snapshot(),
      export: (pretty = true, includeSecrets = false) => Settings.export(pretty, includeSecrets),
      import: (value) => Settings.import(value),
      open: (section = "general") => SettingsPanel.open(section),
      close: () => SettingsPanel.close(),
    },
    diagnostics,
    rescan() {
      DirtyRootScheduler.mark(document.documentElement);
      DirtyRootScheduler.flush();
      LayoutScheduler.request();
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
      batch: (payload, options = {}) => TelegramSendController.sendBatchWithUi(payload, options),
      deliveryCache: DeliveryCache,
      relay: Object.freeze({
        client: RelayClient,
        controller: TelegramSendController,
        identity: RelayIdentity,
        checkMedia: (items, options = {}) => RelayClient.checkMedia(items, options),
      }),
    },
    savedSync: {
      syncAll: () => SavedSync.syncAll(),
      syncSelected: () => SavedSync.syncSelected(),
      enrichSelected: () => SavedSync.enrichSelected(),
      diagnostics: () => SavedSync.diagnostics(),
      check: (records, options = {}) => SavedSync.check?.(records, options),
      archive: Object.freeze({
        list: (provider = null) => SavedMediaArchive.list(provider),
        clear: (provider = null) => SavedMediaArchive.clear(provider),
        clearRelayKnowledge: (provider = null) => SavedMediaArchive.clearRelayKnowledge(provider),
        flush: () => SavedMediaArchive.flush(),
        diagnostics: () => SavedMediaArchive.diagnostics(),
      }),
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
      socialNetwork: TwitterSocialNetworkBridge,
      contextFromStatusId: twitterContextFromStatusId,
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
