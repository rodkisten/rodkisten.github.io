// Media Resolver Router for Scriptable
//
// Receives a URL from Apple Shortcuts, Scriptable Share Sheet, args.urls,
// args.plainTexts, Clipboard or manual input. It detects the source, runs
// compatible providers in fallback order, downloads the resolved media and
// enriches social metadata and sends it to the Telegram Worker using a
// URL-first strategy with an automatic multipart file fallback.








/**
 * Input accepted by the resolver.
 *
 * @typedef {Object} ResolverInput
 * @property {string} url URL received from Shortcuts, Share Sheet, Clipboard
 * or manual input.
 * @property {unknown} original Original unprocessed input.
 * @property {string} source Name of the Scriptable input channel.
 */

/**
 * Normalized media item returned by a provider.
 *
 * The `url` field is kept intact after proxy unwrapping. In particular, signed
 * Instagram CDN search parameters must not be decoded or rebuilt afterward.
 *
 * @typedef {Object} ResolvedMediaItem
 * @property {number} index
 * @property {string} id
 * @property {string} url Final direct media URL.
 * @property {string|null} directUrl
 * @property {string|null} providerUrl
 * @property {string|null} [nestedMediaUrl] Decoded inner CDN URL used only as metadata.
 * @property {"video"|"audio"|"image"|"unknown"} type
 * @property {string|null} quality
 * @property {string|null} mimeType
 * @property {string} filename
 * @property {string|null} title
 * @property {string|null} thumb
 * @property {number|null} width
 * @property {number|null} height
 * @property {number|null} duration
 * @property {string} sourceProvider
 * @property {string} resolverProvider
 */

/**
 * Response shape returned by the Twirrl Twitter provider.
 *
 * The API stores media variants under `d.i`. Each item can contain one or
 * more nested objects with a direct URL in the `u` field.
 *
 * @typedef {Object} TwirrlTwitterOutput
 * @property {{i?: Array<Record<string, {u?:string}|unknown>>}} [d]
 * @property {string} [error]
 * @property {string} [message]
 */

/**
 * Final successful resolver output.
 *
 * @typedef {Object} ResolverOutput
 * @property {true} ok
 * @property {string} inputUrl
 * @property {string} inputSource
 * @property {{provider:string,host:string,contentId:string|null,directMedia:boolean}} source
 * @property {string} provider
 * @property {string} providerName
 * @property {string|null} title
 * @property {string|null} caption
 * @property {Object|null} author
 * @property {string|null} thumbnail
 * @property {ResolvedMediaItem[]} media
 * @property {number} mediaCount
 * @property {Object[]} attempts
 * @property {TelegramDeliveryOutput|null} telegram
 * @property {string} resolvedAt
 */

/**
 * JSON object placed in the multipart `payload` field sent to the Worker.
 *
 * This intentionally mirrors the userscript payload.
 *
 * @typedef {Object} TelegramWorkerInput
 * @property {string} mediaUrl Exact resolved URL, including all query params.
 * @property {string} videoUrl Compatibility alias for mediaUrl.
 * @property {string} sourceUrl Canonical Tweet/post URL.
 * @property {string} provider
 * @property {string|undefined} channel
 * @property {string[]|undefined} channels
 * @property {string} title
 * @property {string} text
 * @property {string} pageUrl
 * @property {string} frameUrl
 * @property {Record<string,string>} mediaHeaders Headers the Worker may use
 * when downloading mediaUrl directly.
 * @property {string} caption
 * @property {"HTML"|"Markdown"|"MarkdownV2"} parseMode
 * @property {"video"|"audio"} mediaType
 * @property {Record<string,string|number|boolean|null>} metadata
 */

/**
 * One Worker response.
 *
 * @typedef {Object} TelegramWorkerOutput
 * @property {boolean} ok
 * @property {unknown} [result]
 * @property {unknown[]} [results]
 * @property {string} [message]
 * @property {string} [description]
 * @property {string} [error]
 */

/**
 * Aggregate Telegram delivery result for all resolved media items.
 *
 * @typedef {Object} TelegramDeliveryOutput
 * @property {boolean} ok
 * @property {number} sentCount
 * @property {number} failedCount
 * @property {Array<{
 *   index:number,
 *   mediaId:string,
 *   filename:string,
 *   ok:boolean,
 *   mode:"url"|"file"|null,
 *   worker:string|null,
 *   response:TelegramWorkerOutput|null,
 *   error:Object|null
 * }>} items
 */

/* Configuration */

const CONFIG = {
  debug: true,
  stopAfterFirstSuccess: true,
  copyStandaloneResult: false,
  showStandaloneResult: true,
  useClipboardFallback: true,
  unwrapProxyUrls: true,
  requestTimeoutSeconds: 30,
  maximumResponseLogLength: 6000,

  // Sends every resolved media item to the Telegram Worker after resolution.
  // Items are sent sequentially to avoid memory spikes and Worker races.
  telegram: {
    enabled: true,
    sendAllMedia: true,
    stopOnFirstFailure: false,
    showResultInStandaloneTable: true,
    primary: {
      url: "https://xtelegram-cf.migos.club/send",
      token: "12345678",
      timeoutSeconds: 120,
    },
    fallback: {
      enabled: true,
      url: "https://eondcdb2jzz8j99.m.pipedream.net",
      token: "12345678",
      timeoutSeconds: 120,
    },
    channelRoutes: [
      {
        sites: [
          "xvideos",
          "pornhub",
          "gayporntube",
          "justthegays.com",
          "xhamster.com",
          "pornhub.com",
        ],
        channels: ["-621561106"],
      },
      {
        sites: ["twitter"],
        channels: ["-621561106", "-324185513"],
      },
      {
        sites: ["instagram", "youtube", "youtu.be"],
        channels: ["-324185513"],
      },
    ],
  },
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  providers: {
    directMedia: true,
    zoraaHubInstagram: true,
    twirrlTwitter: true,
    webpageMetadata: false,
    customJson: false,
  },

  // Twitter/X provider used by the TVDL Shortcut shown in the screenshot.
  // `versionToken` is the complete value sent in the JSON field `v`. The
  // screenshot truncates it, so the resolver can also read it from:
  // 1. args.queryParameters.twirrlVersion
  // 2. args.shortcutParameter.twirrlVersion
  // 3. Keychain key "media-resolver.twirrl-version"
  twirrlTwitterProvider: {
    endpoint: "https://api.twirrl.app/video",
    operatingSystem: "iOS",
    versionToken: "ab8222fb13a47e82c36032c4ddcc622dc0d33f0e8f852b5b420085b9fd32c94e",
    keychainKey: "media-resolver.twirrl-version",
    sendOnlyBestVideo: true,
  },
  twitterEnrichment: {
    enabled: true,
    timeoutSeconds: 18,
    openTweetAfterShare: true,
    openOnlyAfterDelivery: true,
  },
  customJsonProvider: {
    id: "custom-json",
    name: "Custom JSON Provider",
    endpoint: "",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    bodyType: "json-url",
    itemsPath: "videos",
    fields: {
      url: "url",
      thumb: "thumb",
      quality: "quality",
      isVideo: "isVideo",
      title: "title",
      filename: "filename",
    },
  },
};

/* Debug logger */

const Debug = {
  entries: [],

  log(level, message, data) {
    const entry = {
      time: new Date().toISOString(),
      level,
      message,
    };

    if (data !== undefined) {
      entry.data = makeSerializable(data);
    }

    this.entries.push(entry);

    if (!CONFIG.debug) {
      return;
    }

    const prefix = `[MediaResolver:${String(level).toUpperCase()}]`;

    if (data === undefined) {
      console.log(`${prefix} ${message}`);
      return;
    }

    console.log(`${prefix} ${message}`);
    console.log(safeStringify(data, 2));
  },

  info(message, data) {
    this.log("info", message, data);
  },

  success(message, data) {
    this.log("success", message, data);
  },

  warning(message, data) {
    this.log("warning", message, data);
  },

  error(message, data) {
    this.log("error", message, data);
  },
};

/**
 * Emits a numerically ordered pipeline log.
 *
 * @param {number|string} number
 * @param {string} message
 * @param {unknown} [data]
 */
function logStep(number, message, data) {
  const step = String(number).padStart(2, "0");
  Debug.info(`[STEP ${step}] ${message}`, data);
}

/* Scriptable-safe URL parser */

function parseUrl(value, baseUrl = null) {
  const original = String(value ?? "").trim();

  if (!original) {
    return null;
  }

  let absoluteUrl = decodeHtmlEntities(original);

  if (baseUrl && !hasUrlScheme(absoluteUrl)) {
    absoluteUrl = resolveRelativeUrlWithoutNativeUrl(absoluteUrl, baseUrl);
  }

  if (absoluteUrl.startsWith("//")) {
    absoluteUrl = `https:${absoluteUrl}`;
  } else if (!hasUrlScheme(absoluteUrl)) {
    absoluteUrl = `https://${absoluteUrl}`;
  }

  const match = absoluteUrl.match(/^([a-z][a-z\d+.-]*):\/\/(?:([^@\s/]+)@)?(\[[^\]]+]|[^:/?#\s]+)(?::(\d+))?([^?#\s]*)?(?:\?([^#\s]*))?(?:#(.*))?$/i);

  if (!match) {
    return null;
  }

  const protocol = `${match[1].toLowerCase()}:`;
  const username = match[2] || "";
  const hostname = match[3].replace(/^\[|\]$/g, "").toLowerCase();
  const port = match[4] || "";
  const pathname = match[5] || "/";
  const search = match[6] ? `?${match[6]}` : "";
  const hash = match[7] ? `#${match[7]}` : "";
  const host = port ? `${hostname}:${port}` : hostname;
  const origin = `${protocol}//${host}`;
  const searchParams = createSearchParams(search);

  return {
    href: `${origin}${pathname}${search}${hash}`,
    protocol,
    username,
    hostname,
    host,
    port,
    origin,
    pathname,
    search,
    hash,
    searchParams,
    toString() {
      const query = searchParams.toString();
      return `${origin}${normalizePathname(pathname)}${query ? `?${query}` : ""}${hash}`;
    },
  };
}

function hasUrlScheme(value) {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(String(value || ""));
}

function createSearchParams(search) {
  const entries = new Map();
  const source = String(search || "").replace(/^\?/, "");

  if (source) {
    for (const pair of source.split("&")) {
      if (!pair) {
        continue;
      }

      const separatorIndex = pair.indexOf("=");
      const rawKey = separatorIndex >= 0 ? pair.slice(0, separatorIndex) : pair;
      const rawValue = separatorIndex >= 0 ? pair.slice(separatorIndex + 1) : "";
      const key = decodeUrlComponent(rawKey.replace(/\+/g, " "));
      const decodedValue = decodeUrlComponent(rawValue.replace(/\+/g, " "));

      if (!entries.has(key)) {
        entries.set(key, []);
      }

      entries.get(key).push(decodedValue);
    }
  }

  return {
    get(key) {
      const values = entries.get(String(key));
      return values?.[0] ?? null;
    },

    getAll(key) {
      return [...(entries.get(String(key)) || [])];
    },

    has(key) {
      return entries.has(String(key));
    },

    set(key, value) {
      entries.set(String(key), [String(value)]);
    },

    append(key, value) {
      const normalizedKey = String(key);

      if (!entries.has(normalizedKey)) {
        entries.set(normalizedKey, []);
      }

      entries.get(normalizedKey).push(String(value));
    },

    delete(key) {
      entries.delete(String(key));
    },

    entries() {
      const pairs = [];

      for (const [key, values] of entries) {
        for (const value of values) {
          pairs.push([key, value]);
        }
      }

      return pairs;
    },

    toString() {
      const pairs = [];

      for (const [key, values] of entries) {
        for (const value of values) {
          pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
      }

      return pairs.join("&");
    },
  };
}

function resolveRelativeUrlWithoutNativeUrl(value, baseUrl) {
  const relative = String(value ?? "").trim();
  const base = parseUrl(baseUrl);

  if (!relative || !base) {
    return relative;
  }

  if (hasUrlScheme(relative)) {
    return relative;
  }

  if (relative.startsWith("//")) {
    return `${base.protocol}${relative}`;
  }

  if (relative.startsWith("?")) {
    return `${base.origin}${normalizePathname(base.pathname)}${relative}`;
  }

  if (relative.startsWith("#")) {
    return `${base.origin}${normalizePathname(base.pathname)}${base.search}${relative}`;
  }

  if (relative.startsWith("/")) {
    return `${base.origin}${normalizePathname(relative)}`;
  }

  const directory = base.pathname.endsWith("/") ? base.pathname : base.pathname.replace(/\/[^/]*$/, "/");
  return `${base.origin}${normalizePathname(`${directory}${relative}`)}`;
}

function normalizePathname(pathname) {
  const source = String(pathname || "/");
  const hasTrailingSlash = source.endsWith("/");
  const normalized = [];

  for (const segment of source.split("/")) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      normalized.pop();
      continue;
    }

    normalized.push(segment);
  }

  let result = `/${normalized.join("/")}`;

  if (hasTrailingSlash && result !== "/") {
    result += "/";
  }

  return result;
}

function decodeUrlComponent(value) {
  try {
    return decodeURIComponent(String(value));
  } catch {
    return String(value);
  }
}

/* Provider registry */

const PROVIDERS = [
  {
    id: "direct-media",
    name: "Direct media URL",
    priority: 1000,
    enabled: () => CONFIG.providers.directMedia,

    supports(context) {
      return isProbablyDirectMediaUrl(context.inputUrl);
    },

    async resolve(context) {
      const mediaType = inferMediaTypeFromUrl(context.inputUrl);

      return createProviderResult({
        provider: this,
        context,
        title: filenameFromUrl(context.inputUrl),
        media: [
          normalizeMediaItem({
            url: context.inputUrl,
            directUrl: context.inputUrl,
            type: mediaType,
            quality: "original",
            filename: filenameFromUrl(context.inputUrl),
          }, context, this),
        ],
      });
    },
  },

  {
    id: "zoraahub-instagram",
    name: "ZoraaHub Instagram",
    priority: 900,
    enabled: () => CONFIG.providers.zoraaHubInstagram,

    supports(context) {
      Debug.info("Checking ZoraaHub Instagram support.", {
        provider: context.source.provider,
        host: context.source.host,
        inputUrl: context.inputUrl,
      });

      return context.source.provider === "instagram";
    },

    async resolve(context) {
      const response = await requestData({
        providerId: this.id,
        url: "https://api.zoraahub.com/fetch.php",
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          Origin: "https://downreels.com",
          Referer: "https://downreels.com/",
          "User-Agent": CONFIG.userAgent,
        },
        body: JSON.stringify({ url: context.inputUrl }),
        responseType: "json",
      });

      if (!response.data || response.data.status !== "ok") {
        throw new Error(response.data?.message || response.data?.error || "ZoraaHub returned an unsuccessful response.");
      }

      const videos = ensureArray(response.data.videos);
      const media = videos.map((item, index) => {
        /*
         * ZoraaHub signs the complete download.php URL. The outer `exp` and
         * `sig` parameters authenticate the wrapper itself, while the encoded
         * `url` parameter contains the Instagram CDN URL and its own query.
         *
         * Never replace `providerUrl` with the nested URL for downloading.
         * Doing so discards `name`, `exp` and `sig`, and can also leave only the
         * first inner parameter after an unsafe decode/reparse cycle.
         */
        const providerUrl = normalizeProviderDownloadUrl(
          firstNonEmptyString(
            item?.url,
            item?.download,
            item?.downloadUrl,
            item?.src,
          ),
        );
        const nestedMediaUrl = extractInstagramUrl(providerUrl);

        return normalizeMediaItem({
          index,
          // The signed wrapper is the actual downloadable URL.
          url: providerUrl,
          directUrl: providerUrl,
          providerUrl: null,
          nestedMediaUrl,
          thumb: firstNonEmptyString(
            item?.thumb,
            item?.thumbnail,
            item?.cover,
          ),
          type: resolveZoraaMediaType(
            item,
            nestedMediaUrl || providerUrl,
          ),
          quality: firstNonEmptyString(
            item?.quality,
            item?.resolution,
          ),
          filename: firstNonEmptyString(
            item?.filename,
            item?.name,
            filenameFromUrl(nestedMediaUrl || providerUrl),
          ),
          width: toNullableNumber(item?.width),
          height: toNullableNumber(item?.height),
          duration: toNullableNumber(item?.duration),
          raw: CONFIG.debug ? item : undefined,
        }, context, this);
      }).filter(isUsableMediaItem);

      return createProviderResult({
        provider: this,
        context,
        title: firstNonEmptyString(response.data.title, response.data.caption, response.data.meta?.title),
        caption: firstNonEmptyString(response.data.caption, response.data.description),
        author: normalizeAuthor(response.data.author || response.data.owner || response.data.user || response.data.username),
        thumbnail: firstNonEmptyString(response.data.thumbnail, response.data.thumb, media[0]?.thumb),
        media,
        raw: CONFIG.debug ? response.data : undefined,
      });
    },
  },

  {
    id: "twirrl-twitter",
    name: "Twirrl Twitter/X",
    priority: 850,
    enabled: () => CONFIG.providers.twirrlTwitter,

    supports(context) {
      return context.source.provider === "twitter";
    },

    /**
     * Sends the same JSON body used by the TVDL Shortcut:
     *
     *     { u: tweetUrl, o: "iOS", v: versionToken }
     *
     * The response is then parsed with the same `d.i -> nested values -> u`
     * traversal from the standalone Scriptable supplied by the user.
     *
     * @param {Object} context
     * @returns {Promise<Object>}
     */
    async resolve(context) {
      const versionToken = resolveTwirrlVersionToken(context.originalInput);
      const requestBody = removeUndefinedValues({
        u: context.inputUrl,
        o: CONFIG.twirrlTwitterProvider.operatingSystem,
        v: versionToken || undefined,
      });

      if (!versionToken) {
        Debug.warning(
          "Twirrl version token is not configured. The request will be " +
            "attempted without the `v` field.",
          {
            keychainKey: CONFIG.twirrlTwitterProvider.keychainKey,
          },
        );
      }

      const response = await requestData({
        providerId: this.id,
        url: CONFIG.twirrlTwitterProvider.endpoint,
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "User-Agent": CONFIG.userAgent,
        },
        body: JSON.stringify(requestBody),
        responseType: "json",
      });

      /** @type {TwirrlTwitterOutput} */
      const data = response.data;
      const variants = extractTwirrlVideoVariants(data);

      if (!variants.length) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Twirrl returned no valid Twitter video variants.",
        );
      }

      const selected = CONFIG.twirrlTwitterProvider.sendOnlyBestVideo
        ? [variants[0]]
        : variants;
      const media = selected.map((variant, index) => {
        return normalizeMediaItem({
          index,
          url: variant.url,
          directUrl: variant.url,
          providerUrl: null,
          type: "video",
          quality:
            variant.width && variant.height
              ? `${variant.width}x${variant.height}`
              : "best",
          width: variant.width || null,
          height: variant.height || null,
          filename: buildFallbackFilename(
            "twitter",
            context.source.contentId,
            index,
            variant.url,
          ),
          raw: CONFIG.debug ? variant.raw : undefined,
        }, context, this);
      }).filter(isUsableMediaItem);

      return createProviderResult({
        provider: this,
        context,
        title: context.source.contentId
          ? `Twitter video ${context.source.contentId}`
          : "Twitter video",
        media,
        raw: CONFIG.debug ? data : undefined,
      });
    },
  },

  {
    id: "custom-json",
    name: "Custom JSON Provider",
    priority: 500,
    enabled: () => CONFIG.providers.customJson,

    supports() {
      return Boolean(CONFIG.customJsonProvider.endpoint);
    },

    async resolve(context) {
      const definition = CONFIG.customJsonProvider;

      if (!definition.endpoint) {
        throw new Error("Custom JSON provider endpoint is empty.");
      }

      const providerRequest = buildCustomProviderRequest(definition, context.inputUrl);
      const response = await requestData({
        providerId: this.id,
        url: providerRequest.url,
        method: providerRequest.method,
        headers: providerRequest.headers,
        body: providerRequest.body,
        responseType: "json",
      });

      const items = ensureArray(getValueAtPath(response.data, definition.itemsPath));
      const media = items.map((item, index) => {
        const fields = definition.fields || {};
        const providerUrl = firstNonEmptyString(getValueAtPath(item, fields.url), item?.url, item?.src);
        const directUrl = unwrapMediaUrl(providerUrl);

        return normalizeMediaItem({
          index,
          url: directUrl || providerUrl,
          directUrl: directUrl || providerUrl,
          providerUrl,
          thumb: firstNonEmptyString(getValueAtPath(item, fields.thumb), item?.thumbnail),
          quality: firstNonEmptyString(getValueAtPath(item, fields.quality), item?.resolution),
          type: resolveCustomMediaType(item, fields, directUrl),
          title: firstNonEmptyString(getValueAtPath(item, fields.title), item?.title),
          filename: firstNonEmptyString(getValueAtPath(item, fields.filename), filenameFromUrl(directUrl || providerUrl)),
          raw: CONFIG.debug ? item : undefined,
        }, context, this);
      }).filter(isUsableMediaItem);

      return createProviderResult({
        provider: this,
        context,
        title: firstNonEmptyString(response.data?.title, response.data?.meta?.title),
        caption: firstNonEmptyString(response.data?.caption, response.data?.description),
        author: normalizeAuthor(response.data?.author || response.data?.user || response.data?.username),
        media,
        raw: CONFIG.debug ? response.data : undefined,
      });
    },
  },

  {
    id: "webpage-metadata",
    name: "Webpage metadata",
    priority: 100,
    enabled: () => CONFIG.providers.webpageMetadata,

    supports(context) {
      return /^https?:\/\//i.test(context.inputUrl);
    },

    async resolve(context) {
      const response = await requestData({
        providerId: this.id,
        url: context.inputUrl,
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent": CONFIG.userAgent,
        },
        responseType: "text",
      });

      const metadata = extractHtmlMetadata(response.text || "", response.finalUrl);
      const candidates = uniqueStrings([
        metadata.ogVideoSecureUrl,
        metadata.ogVideoUrl,
        metadata.ogVideo,
        metadata.twitterPlayerStream,
        metadata.twitterVideo,
        metadata.videoSrc,
        ...metadata.jsonLdMediaUrls,
      ]);
      const imageCandidates = uniqueStrings([metadata.ogImageSecureUrl, metadata.ogImage, metadata.twitterImage]);
      const media = [];

      for (const candidate of candidates) {
        const absoluteUrl = resolveRelativeUrl(candidate, response.finalUrl);
        const directUrl = unwrapMediaUrl(absoluteUrl);

        media.push(normalizeMediaItem({
          url: directUrl || absoluteUrl,
          directUrl: directUrl || absoluteUrl,
          providerUrl: absoluteUrl,
          type: inferMediaTypeFromUrl(directUrl || absoluteUrl, "video"),
          quality: "metadata",
          thumb: firstNonEmptyString(...imageCandidates),
          filename: filenameFromUrl(directUrl || absoluteUrl),
        }, context, this));
      }

      if (!media.length) {
        for (const candidate of imageCandidates) {
          const absoluteUrl = resolveRelativeUrl(candidate, response.finalUrl);
          media.push(normalizeMediaItem({
            url: absoluteUrl,
            directUrl: absoluteUrl,
            type: "image",
            quality: "metadata",
            thumb: absoluteUrl,
            filename: filenameFromUrl(absoluteUrl),
          }, context, this));
        }
      }

      return createProviderResult({
        provider: this,
        context,
        title: metadata.title,
        caption: firstNonEmptyString(metadata.description, metadata.ogDescription),
        author: normalizeAuthor(metadata.author),
        thumbnail: firstNonEmptyString(...imageCandidates),
        media: deduplicateMedia(media.filter(isUsableMediaItem)),
        raw: CONFIG.debug ? metadata : undefined,
      });
    },
  },
];


/* Twitter metadata enrichment */

/**
 * Loads a Tweet in a Scriptable WebView and extracts visible content and
 * Open Graph metadata. The WebView is used only for enrichment; media
 * resolution remains the responsibility of Twirrl.
 *
 * @param {string} tweetUrl
 * @returns {Promise<{
 *   title:string|null,
 *   text:string|null,
 *   author:{name:string|null,username:string|null,url:string|null}|null,
 *   publishedAt:string|null,
 *   canonicalUrl:string,
 *   raw:Object|null
 * }>}
 */
async function enrichTwitterContext(tweetUrl) {
  logStep(2, "Loading Twitter to enrich Tweet metadata.", {
    tweetUrl,
  });

  const fallback = {
    title: null,
    text: null,
    author: extractTwitterAuthorFromUrl(tweetUrl),
    publishedAt: null,
    canonicalUrl: tweetUrl,
    raw: null,
  };

  try {
    const webView = new WebView();
    webView.shouldAllowRequest = (request) => {
      const url = String(request?.url || "");
      return !/^https?:\/\/(?:ads|analytics)\./i.test(url);
    };

    const loadPromise = webView.loadURL(tweetUrl);
    const timeoutPromise = new Promise((_, reject) => {
      Timer.schedule(
        CONFIG.twitterEnrichment.timeoutSeconds,
        false,
        () => reject(new Error("Twitter enrichment timed out.")),
      );
    });

    await Promise.race([loadPromise, timeoutPromise]);

    /*
     * Give the client-rendered Tweet a brief chance to populate its article.
     * The extraction remains resilient when X serves only Open Graph tags.
     */
    await sleep(1800);

    const result = await webView.evaluateJavaScript(`
      (() => {
        const clean = (value) =>
          String(value || "").replace(/\\s+/g, " ").trim() || null;

        const meta = (property) =>
          document.querySelector(
            'meta[property="' + property + '"],meta[name="' + property + '"]'
          )?.content || null;

        const article =
          document.querySelector('article[data-testid="tweet"]') ||
          document.querySelector('article');

        const tweetText =
          article?.querySelector('[data-testid="tweetText"]')?.innerText ||
          meta("og:description") ||
          meta("twitter:description");

        const userLink =
          article?.querySelector('a[href^="/"][role="link"]') ||
          null;

        const timeElement = article?.querySelector("time");
        const canonical =
          document.querySelector('link[rel="canonical"]')?.href ||
          location.href;

        return {
          title: clean(
            meta("og:title") ||
            meta("twitter:title") ||
            document.title
          ),
          text: clean(tweetText),
          authorName: clean(
            article?.querySelector('[data-testid="User-Name"]')?.innerText
          ),
          authorHref: userLink?.href || null,
          publishedAt:
            timeElement?.dateTime ||
            timeElement?.getAttribute("datetime") ||
            null,
          canonicalUrl: canonical,
          ogDescription: clean(meta("og:description")),
          documentUrl: location.href,
        };
      })();
    `);

    const urlAuthor = extractTwitterAuthorFromUrl(
      result?.canonicalUrl || tweetUrl,
    );
    const parsedAuthor = parseTwitterAuthorText(
      result?.authorName,
      result?.authorHref,
    );

    const enriched = {
      title: firstNonEmptyString(
        parsedAuthor?.name && result?.text
          ? `${parsedAuthor.name} on X`
          : null,
        result?.title,
      ),
      text: firstNonEmptyString(
        result?.text,
        result?.ogDescription,
      ),
      author: parsedAuthor || urlAuthor,
      publishedAt: result?.publishedAt || null,
      canonicalUrl:
        normalizeTwitterUrl(result?.canonicalUrl) ||
        normalizeTwitterUrl(tweetUrl) ||
        tweetUrl,
      raw: CONFIG.debug ? result : null,
    };

    Debug.success("[STEP 02] Twitter metadata enriched.", enriched);
    return enriched;
  } catch (error) {
    Debug.warning(
      "[STEP 02] Twitter enrichment failed; continuing with URL metadata.",
      serializeError(error),
    );
    return fallback;
  }
}

/**
 * @param {string} value
 * @returns {{name:string|null,username:string|null,url:string|null}|null}
 */
function extractTwitterAuthorFromUrl(value) {
  const parsed = parseUrl(value);
  const username = parsed?.pathname?.match(
    /^\/([^/?#]+)\/status\/\d+/i,
  )?.[1];

  if (!username || username.toLowerCase() === "i") {
    return null;
  }

  return {
    name: null,
    username: `@${username}`,
    url: `https://x.com/${username}`,
  };
}

/**
 * @param {string|null|undefined} text
 * @param {string|null|undefined} href
 * @returns {{name:string|null,username:string|null,url:string|null}|null}
 */
function parseTwitterAuthorText(text, href) {
  const normalized = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  const username =
    normalized.match(/@([A-Za-z0-9_]{1,15})/)?.[1] ||
    String(href || "").match(/(?:twitter|x)\.com\/([^/?#]+)/i)?.[1] ||
    null;
  const name = normalized
    ? normalized.replace(/@[A-Za-z0-9_]{1,15}.*$/i, "").trim() || null
    : null;

  if (!name && !username) {
    return null;
  }

  return {
    name,
    username: username ? `@${username}` : null,
    url: username ? `https://x.com/${username}` : href || null,
  };
}

/**
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
function normalizeTwitterUrl(value) {
  const parsed = parseUrl(value);

  if (!parsed) {
    return null;
  }

  const match = parsed.pathname.match(
    /^\/(?:i\/status\/|([^/?#]+)\/status\/)(\d+)/i,
  );

  if (!match) {
    return parsed.href;
  }

  return match[1]
    ? `https://x.com/${match[1]}/status/${match[2]}`
    : `https://x.com/i/status/${match[2]}`;
}

/**
 * Promise-based sleep compatible with Scriptable.
 *
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
function sleep(milliseconds) {
  return new Promise((resolve) => {
    Timer.schedule(
      Math.max(0, Number(milliseconds) || 0) / 1000,
      false,
      resolve,
    );
  });
}


/* Main flow */

async function main() {
  const runMode = detectRunMode();

  Debug.info("Starting media resolver.", {
    runMode,
    runsInApp: config.runsInApp,
    runsWithSiri: config.runsWithSiri,
    runsInWidget: config.runsInWidget,
  });

  try {
    const input = await resolveInput();

    if (!input.url) {
      throw new Error("No valid URL was supplied.");
    }

    const normalizedUrl = normalizeInputUrl(input.url);
    const source = detectSource(normalizedUrl);
    const context = {
      inputUrl: normalizedUrl,
      originalInput: input.original,
      inputSource: input.source,
      runMode,
      source,
      startedAt: new Date().toISOString(),
      tweet: null,
    };

    logStep(1, "Input resolved.", context);

    /*
     * Twitter enrichment is performed before media resolution so the final
     * Telegram caption already contains author, publication time, Tweet text
     * and a canonical link. WebView loads the Tweet without requiring the user
     * to manually copy its text.
     */
    if (
      source.provider === "twitter" &&
      CONFIG.twitterEnrichment.enabled
    ) {
      context.tweet = await enrichTwitterContext(normalizedUrl);
    }

    logStep(3, "Resolving media providers.", {
      provider: source.provider,
      inputUrl: normalizedUrl,
    });

    const resolution = await resolveThroughProviders(context);
    /** @type {ResolverOutput} */
    const output = {
      ok: true,
      inputUrl: normalizedUrl,
      inputSource: input.source,
      source,
      provider: resolution.provider,
      providerName: resolution.providerName,
      title:
        context.tweet?.title ||
        resolution.title ||
        null,
      caption:
        context.tweet?.text ||
        resolution.caption ||
        null,
      author:
        context.tweet?.author ||
        resolution.author ||
        null,
      publishedAt: context.tweet?.publishedAt || null,
      tweet: context.tweet,
      thumbnail: resolution.thumbnail || resolution.media[0]?.thumb || null,
      media: resolution.media,
      mediaCount: resolution.media.length,
      attempts: resolution.attempts,
      telegram: null,
      resolvedAt: new Date().toISOString(),
    };

    /*
     * Telegram delivery runs after normalization. The selected direct URL is
     * copied verbatim into the Worker payload and is never parsed/rebuilt here.
     */
    if (CONFIG.telegram.enabled) {
      logStep(4, "Starting URL-first Telegram delivery.", {
        mediaCount: output.media.length,
      });
      output.telegram = await sendResolvedMediaToTelegram(output);
    }

    if (CONFIG.debug) {
      output.debug = {
        entries: Debug.entries,
        providerRaw: resolution.raw,
      };
    }

    Debug.success("Resolution completed.", {
      provider: output.provider,
      mediaCount: output.mediaCount,
    });

    await deliverOutput(output, runMode);

    /*
     * When invoked from the Share Sheet, open the canonical Tweet only after
     * resolution and Telegram delivery. Opening earlier could suspend the
     * extension and interrupt network requests.
     */
    if (
      runMode === "share-sheet" &&
      source.provider === "twitter" &&
      CONFIG.twitterEnrichment.openTweetAfterShare &&
      (!CONFIG.twitterEnrichment.openOnlyAfterDelivery ||
        output.telegram?.sentCount > 0)
    ) {
      logStep(8, "Opening the Tweet in Twitter/Safari.", {
        url: normalizedUrl,
      });
      Safari.open(normalizedUrl);
    }
  } catch (error) {
    const failure = {
      ok: false,
      error: serializeError(error),
      resolvedAt: new Date().toISOString(),
    };

    if (CONFIG.debug) {
      failure.debug = { entries: Debug.entries };
    }

    Debug.error("Resolver failed.", error);
    await deliverOutput(failure, detectRunMode());
  } finally {
    Script.complete();
  }
}

async function resolveThroughProviders(context) {
  const attempts = [];
  const successfulResults = [];
  const providers = [...PROVIDERS].sort((left, right) => right.priority - left.priority);

  for (const provider of providers) {
    let enabled = false;
    let supported = false;

    try {
      enabled = provider.enabled ? Boolean(provider.enabled(context)) : true;
    } catch (error) {
      Debug.warning(`Provider "${provider.id}" enabled check failed.`, error);
    }

    if (!enabled) {
      attempts.push({ provider: provider.id, providerName: provider.name, status: "disabled" });
      continue;
    }

    try {
      supported = provider.supports ? Boolean(await provider.supports(context)) : true;
    } catch (error) {
      attempts.push({
        provider: provider.id,
        providerName: provider.name,
        status: "supports-error",
        error: serializeError(error),
      });
      continue;
    }

    if (!supported) {
      attempts.push({ provider: provider.id, providerName: provider.name, status: "unsupported" });
      continue;
    }

    const attemptStartedAt = Date.now();
    Debug.info(`Trying provider "${provider.name}".`, { provider: provider.id, url: context.inputUrl });

    try {
      const result = await provider.resolve(context);
      const media = deduplicateMedia(ensureArray(result?.media).filter(isUsableMediaItem));

      if (!media.length) {
        attempts.push({
          provider: provider.id,
          providerName: provider.name,
          status: "empty",
          durationMs: Date.now() - attemptStartedAt,
        });
        Debug.warning(`Provider "${provider.name}" returned no media.`);
        continue;
      }

      const successfulResult = { ...result, media, provider: provider.id, providerName: provider.name };
      successfulResults.push(successfulResult);
      attempts.push({
        provider: provider.id,
        providerName: provider.name,
        status: "success",
        mediaCount: media.length,
        durationMs: Date.now() - attemptStartedAt,
      });

      Debug.success(`Provider "${provider.name}" succeeded.`, { mediaCount: media.length });

      if (CONFIG.stopAfterFirstSuccess) {
        return { ...successfulResult, attempts };
      }
    } catch (error) {
      const serializedError = serializeError(error);
      attempts.push({
        provider: provider.id,
        providerName: provider.name,
        status: "error",
        durationMs: Date.now() - attemptStartedAt,
        error: serializedError,
      });
      Debug.warning(`Provider "${provider.name}" failed.`, serializedError);
    }
  }

  if (successfulResults.length) {
    return mergeSuccessfulResults(successfulResults, attempts);
  }

  const error = new Error("No provider could extract media from the supplied URL.");
  error.attempts = attempts;
  throw error;
}

/* Input handling */

async function resolveInput() {
  const candidates = [];

  collectInputCandidates(candidates, args.shortcutParameter, "shortcutParameter");
  collectInputCandidates(candidates, args.urls, "shareSheetUrl");
  collectInputCandidates(candidates, args.plainTexts, "shareSheetText");
  collectInputCandidates(candidates, args.queryParameters, "queryParameters");

  for (const candidate of candidates) {
    const url = extractFirstUrl(candidate.value);

    if (url) {
      return { url, original: candidate.value, source: candidate.source };
    }
  }

  if (CONFIG.useClipboardFallback) {
    try {
      const clipboard = Pasteboard.pasteString();
      const clipboardUrl = extractFirstUrl(clipboard);

      if (clipboardUrl) {
        return { url: clipboardUrl, original: clipboard, source: "clipboard" };
      }
    } catch (error) {
      Debug.warning("Could not inspect the clipboard.", error);
    }
  }

  if (!config.runsInApp) {
    return { url: null, original: null, source: "none" };
  }

  const alert = new Alert();
  alert.title = "Media Resolver";
  alert.message = "Cole a URL que deseja processar.";
  alert.addTextField("https://...", "");
  alert.addAction("Resolver");
  alert.addCancelAction("Cancelar");

  const selected = await alert.present();

  if (selected < 0) {
    return { url: null, original: null, source: "cancelled" };
  }

  const typedValue = alert.textFieldValue(0);
  return { url: extractFirstUrl(typedValue), original: typedValue, source: "manual" };
}

function collectInputCandidates(target, value, source) {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === "string" || typeof value === "number") {
    target.push({ value: String(value), source });
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectInputCandidates(target, item, source);
    }
    return;
  }

  if (typeof value === "object") {
    const preferredKeys = ["url", "URL", "link", "href", "text", "input", "value", "webpageURL", "pageUrl", "mediaUrl"];

    for (const key of preferredKeys) {
      if (value[key] !== undefined) {
        collectInputCandidates(target, value[key], `${source}.${key}`);
      }
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      if (!preferredKeys.includes(key)) {
        collectInputCandidates(target, nestedValue, `${source}.${key}`);
      }
    }
  }
}

function extractFirstUrl(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = typeof value === "string" ? value.trim() : safeStringify(value, 0);

  if (!text) {
    return null;
  }

  if (/^https?:\/\//i.test(text) && text.search(/\s/) === -1) {
    return trimUrlPunctuation(text);
  }

  const match = text.match(/https?:\/\/[^\s<>"'`]+/i);
  return match ? trimUrlPunctuation(match[0]) : null;
}

function trimUrlPunctuation(value) {
  return String(value).trim().replace(/[)\]}>.,;!?]+$/g, "");
}

/* Source detection */

function detectSource(inputUrl) {
  const host = getHostname(inputUrl).toLowerCase();

  Debug.info("Detected URL host.", { inputUrl, host });

  let provider = "generic";
  let contentId = null;

  if (host === "instagram.com" || host.endsWith(".instagram.com") || host === "instagr.am" || host.endsWith(".instagr.am")) {
    provider = "instagram";
    contentId = extractInstagramContentId(inputUrl);
  } else if (host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com")) {
    provider = "twitter";
    contentId = extractPathMatch(inputUrl, /\/status\/(\d+)/i);
  } else if (host === "tiktok.com" || host.endsWith(".tiktok.com") || host === "vm.tiktok.com") {
    provider = "tiktok";
    contentId = extractPathMatch(inputUrl, /\/video\/(\d+)/i);
  } else if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") {
    provider = "youtube";
    contentId = extractYouTubeId(inputUrl);
  } else if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch") {
    provider = "facebook";
  } else if (host === "reddit.com" || host.endsWith(".reddit.com") || host === "redd.it" || host.endsWith(".redd.it")) {
    provider = "reddit";
  } else if (host === "threads.net" || host.endsWith(".threads.net")) {
    provider = "threads";
  }

  return {
    provider,
    host,
    contentId,
    directMedia: isProbablyDirectMediaUrl(inputUrl),
  };
}

function extractInstagramContentId(inputUrl) {
  return extractPathMatch(inputUrl, /\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
}

function extractYouTubeId(inputUrl) {
  const parsed = parseUrl(inputUrl);

  if (!parsed) {
    return null;
  }

  if (parsed.hostname === "youtu.be" || parsed.hostname.endsWith(".youtu.be")) {
    return parsed.pathname.split("/").filter(Boolean)[0] || null;
  }

  return parsed.searchParams.get("v") || extractPathMatch(inputUrl, /\/shorts\/([A-Za-z0-9_-]+)/i) || extractPathMatch(inputUrl, /\/embed\/([A-Za-z0-9_-]+)/i);
}

function extractPathMatch(inputUrl, pattern) {
  return String(inputUrl).match(pattern)?.[1] || null;
}

/* Provider processors */

/**
 * Normalizes a provider URL without decoding any query parameter.
 *
 * JSON may represent slashes as `\/`; JSON.parse normally removes that
 * escaping, but this defensive normalization also supports values copied from
 * logs or passed through Shortcuts as literal escaped text. Percent escapes,
 * ampersands and parameter order are deliberately preserved byte-for-byte.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
function normalizeProviderDownloadUrl(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value)
    .trim()
    .replace(/\\\//g, "/")
    .replace(/&amp;/gi, "&");

  return /^https?:\/\//i.test(normalized) ? normalized : null;
}

function extractInstagramUrl(value) {
  if (!value) {
    return null;
  }

  /*
   * This helper is metadata-only for ZoraaHub results. It extracts the nested
   * Instagram URL for extension/type inspection, but the signed outer wrapper
   * remains the URL used by the downloader and Telegram Worker.
   */
  let current = String(value).trim();

  for (let depth = 0; depth < 5; depth += 1) {
    const decoded = decodeRepeatedly(current);
    const unwrapped = unwrapKnownProxyUrl(decoded);

    if (!unwrapped || unwrapped === current || unwrapped === decoded) {
      current = decoded;
      break;
    }

    current = unwrapped;
  }

  return decodeRepeatedly(current);
}

function unwrapMediaUrl(value) {
  if (!value) {
    return null;
  }

  return CONFIG.unwrapProxyUrls ? extractInstagramUrl(value) : value;
}

function unwrapKnownProxyUrl(value) {
  const parsed = parseUrl(value);

  if (!parsed) {
    return value;
  }

  const pathname = parsed.pathname.toLowerCase();
  const isZoraaDownload = parsed.hostname === "media.zoraahub.com" && pathname.includes("/download.php");
  const proxyKeys = isZoraaDownload ? ["url"] : ["mediaUrl", "media_url", "target", "source", "src", "url"];

  for (const key of proxyKeys) {
    const nestedValue = parsed.searchParams.get(key);

    if (!nestedValue) {
      continue;
    }

    const decoded = decodeRepeatedly(nestedValue);

    if (/^https?:\/\//i.test(decoded)) {
      return decoded;
    }
  }

  return value;
}

function resolveZoraaMediaType(item, url) {
  if (typeof item?.isVideo === "boolean") {
    return item.isVideo ? "video" : "image";
  }

  if (typeof item?.is_video === "boolean") {
    return item.is_video ? "video" : "image";
  }

  return inferMediaTypeFromUrl(url);
}

/**
 * Resolves the Twirrl `v` token without hard-coding an incomplete value.
 *
 * @param {unknown} originalInput
 * @returns {string}
 */
function resolveTwirrlVersionToken(originalInput) {
  const configured = firstNonEmptyString(
    CONFIG.twirrlTwitterProvider.versionToken,
    args.queryParameters?.twirrlVersion,
    args.queryParameters?.v,
    originalInput?.twirrlVersion,
    originalInput?.twirrl_version,
  );

  if (configured) {
    return configured;
  }

  try {
    const key = CONFIG.twirrlTwitterProvider.keychainKey;

    if (key && Keychain.contains(key)) {
      return String(Keychain.get(key) || "").trim();
    }
  } catch (error) {
    Debug.warning("Could not read the Twirrl token from Keychain.", error);
  }

  return "";
}

/**
 * Reads a resolution embedded in a Twitter video URL.
 *
 * @param {string} url
 * @returns {{width:number,height:number,pixels:number}}
 */
function getTwirrlVideoResolution(url) {
  const match = String(url || "").match(/\/(\d+)x(\d+)\//);

  if (!match) {
    return {
      width: 0,
      height: 0,
      pixels: 0,
    };
  }

  const width = Number(match[1]);
  const height = Number(match[2]);

  return {
    width,
    height,
    pixels: width * height,
  };
}

/**
 * Implements the exact traversal used by the supplied standalone TVDL parser.
 * Variants are sorted from highest to lowest pixel count.
 *
 * @param {TwirrlTwitterOutput} data
 * @returns {Array<{
 *   url:string,
 *   width:number,
 *   height:number,
 *   pixels:number,
 *   raw:unknown
 * }>}
 */
function extractTwirrlVideoVariants(data) {
  const items = data?.d?.i;

  if (!Array.isArray(items)) {
    return [];
  }

  const variants = [];
  const seen = new Set();

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }

    for (const value of Object.values(item)) {
      if (
        !value ||
        typeof value !== "object" ||
        typeof value.u !== "string"
      ) {
        continue;
      }

      const url = normalizeProviderDownloadUrl(value.u);

      if (!url || seen.has(url) || !/^https?:\/\//i.test(url)) {
        continue;
      }

      seen.add(url);
      variants.push({
        url,
        ...getTwirrlVideoResolution(url),
        raw: value,
      });
    }
  }

  variants.sort((left, right) => {
    return (
      right.pixels - left.pixels ||
      right.height - left.height ||
      right.width - left.width
    );
  });

  return variants;
}

function buildCustomProviderRequest(definition, inputUrl) {
  const headers = {
    Accept: "application/json, text/plain, */*",
    "User-Agent": CONFIG.userAgent,
    ...(definition.headers || {}),
  };
  const method = String(definition.method || "POST").toUpperCase();
  const bodyType = definition.bodyType || "json-url";
  let url = definition.endpoint;
  let body = null;

  if (method === "GET") {
    url = appendQueryParameter(url, "url", inputUrl);
  } else if (bodyType === "form-url") {
    headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
    body = `url=${encodeURIComponent(inputUrl)}`;
  } else if (bodyType === "raw-url") {
    body = inputUrl;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ url: inputUrl });
  }

  return { url, method, headers, body };
}

function resolveCustomMediaType(item, fields, url) {
  const isVideo = getValueAtPath(item, fields.isVideo);
  return typeof isVideo === "boolean" ? (isVideo ? "video" : "image") : inferMediaTypeFromUrl(url);
}

/* HTTP */

async function requestData(options) {
  const request = new Request(options.url);
  request.method = options.method || "GET";
  request.timeoutInterval = CONFIG.requestTimeoutSeconds;
  request.headers = options.headers || {};

  if (options.body !== null && options.body !== undefined) {
    request.body = options.body;
  }

  Debug.info(`HTTP ${request.method} ${options.url}`, {
    provider: options.providerId,
    headers: redactHeaders(request.headers),
    body: truncateDebugValue(options.body),
  });

  let text;

  try {
    text = await request.loadString();
  } catch (error) {
    throw enhanceRequestError(error, request, options);
  }

  const response = request.response || {};
  const statusCode = response.statusCode || null;
  const finalUrl = response.url || options.url;

  Debug.info("HTTP response received.", {
    provider: options.providerId,
    statusCode,
    finalUrl,
    headers: response.headers,
    body: truncateDebugValue(text),
  });

  if (statusCode && (statusCode < 200 || statusCode >= 400)) {
    const error = new Error(`HTTP request failed with status ${statusCode}.`);
    error.statusCode = statusCode;
    error.url = finalUrl;
    error.responseBody = truncateDebugValue(text);
    throw error;
  }

  if (options.responseType === "text") {
    return { text, data: null, statusCode, finalUrl, headers: response.headers || {} };
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch (error) {
    const parseError = new Error(`The provider returned invalid JSON: ${error.message}`);
    parseError.url = finalUrl;
    parseError.responseBody = truncateDebugValue(text);
    throw parseError;
  }

  return { text, data, statusCode, finalUrl, headers: response.headers || {} };
}

function enhanceRequestError(error, request, options) {
  const enhanced = new Error(`${options.providerId || "provider"} request failed: ${error?.message || String(error)}`);
  enhanced.url = options.url;
  enhanced.method = request.method;
  enhanced.originalError = serializeError(error);
  return enhanced;
}

/* HTML metadata provider */

function extractHtmlMetadata(html, baseUrl) {
  const metadata = {
    title: decodeHtmlEntities(firstNonEmptyString(extractMetaContent(html, "property", "og:title"), extractMetaContent(html, "name", "twitter:title"), extractHtmlTagText(html, "title"))),
    description: decodeHtmlEntities(extractMetaContent(html, "name", "description")),
    ogDescription: decodeHtmlEntities(extractMetaContent(html, "property", "og:description")),
    author: decodeHtmlEntities(firstNonEmptyString(extractMetaContent(html, "name", "author"), extractMetaContent(html, "property", "article:author"))),
    ogVideo: extractMetaContent(html, "property", "og:video"),
    ogVideoUrl: extractMetaContent(html, "property", "og:video:url"),
    ogVideoSecureUrl: extractMetaContent(html, "property", "og:video:secure_url"),
    twitterPlayerStream: extractMetaContent(html, "name", "twitter:player:stream"),
    twitterVideo: extractMetaContent(html, "name", "twitter:video"),
    ogImage: extractMetaContent(html, "property", "og:image"),
    ogImageSecureUrl: extractMetaContent(html, "property", "og:image:secure_url"),
    twitterImage: firstNonEmptyString(extractMetaContent(html, "name", "twitter:image"), extractMetaContent(html, "name", "twitter:image:src")),
    videoSrc: extractFirstVideoSource(html),
    jsonLdMediaUrls: extractJsonLdMediaUrls(html),
  };

  for (const key of Object.keys(metadata)) {
    if (typeof metadata[key] === "string") {
      metadata[key] = resolveRelativeUrl(decodeHtmlEntities(metadata[key]), baseUrl);
    }
  }

  metadata.jsonLdMediaUrls = metadata.jsonLdMediaUrls.map((url) => resolveRelativeUrl(decodeHtmlEntities(url), baseUrl));
  return metadata;
}

function extractMetaContent(html, attributeName, attributeValue) {
  const escapedValue = escapeRegExp(attributeValue);
  const patterns = [
    new RegExp(`<meta\\b[^>]*${attributeName}\\s*=\\s*["']${escapedValue}["'][^>]*content\\s*=\\s*["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta\\b[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*${attributeName}\\s*=\\s*["']${escapedValue}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractHtmlTagText(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1]?.replace(/<[^>]+>/g, " ").trim() || null;
}

function extractFirstVideoSource(html) {
  return html.match(/<(?:video|source)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || null;
}

function extractJsonLdMediaUrls(html) {
  const urls = [];
  const scriptPattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptPattern.exec(html))) {
    const jsonText = decodeHtmlEntities(match[1]).trim();

    if (!jsonText) {
      continue;
    }

    try {
      walkObject(JSON.parse(jsonText), (key, value) => {
        if (typeof value === "string" && ["contentUrl", "contentURL", "embedUrl", "embedURL", "thumbnailUrl"].includes(key)) {
          urls.push(value);
        }
      });
    } catch {
      // Ignore malformed JSON-LD and continue with other metadata.
    }
  }

  return uniqueStrings(urls);
}

/* Normalization */

function createProviderResult(options) {
  return {
    provider: options.provider.id,
    providerName: options.provider.name,
    title: options.title || null,
    caption: options.caption || null,
    author: options.author || null,
    thumbnail: options.thumbnail || null,
    media: deduplicateMedia(ensureArray(options.media).filter(isUsableMediaItem)),
    raw: options.raw,
  };
}

function normalizeMediaItem(item, context, provider) {
  const providerUrl = firstNonEmptyString(item.providerUrl, item.url, item.directUrl);
  const directUrl = firstNonEmptyString(item.directUrl, unwrapMediaUrl(providerUrl), providerUrl);
  const finalUrl = firstNonEmptyString(directUrl, providerUrl);

  return removeUndefinedValues({
    index: Number.isFinite(item.index) ? item.index : 0,
    id: item.id || createMediaId(finalUrl, item.index),
    url: finalUrl,
    directUrl: directUrl || null,
    providerUrl: providerUrl && providerUrl !== directUrl ? providerUrl : null,
    nestedMediaUrl: item.nestedMediaUrl || null,
    type: item.type || inferMediaTypeFromUrl(
      item.nestedMediaUrl || finalUrl,
    ),
    quality: item.quality || null,
    mimeType: item.mimeType || inferMimeType(finalUrl),
    filename: item.filename || buildFallbackFilename(context.source.provider, context.source.contentId, item.index, finalUrl),
    title: item.title || null,
    thumb: item.thumb || null,
    width: toNullableNumber(item.width),
    height: toNullableNumber(item.height),
    duration: toNullableNumber(item.duration),
    sourceProvider: context.source.provider,
    resolverProvider: provider.id,
    raw: item.raw,
  });
}

function isUsableMediaItem(item) {
  return Boolean(item && typeof item.url === "string" && /^https?:\/\//i.test(item.url));
}

function deduplicateMedia(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = canonicalMediaKey(item.url);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({ ...item, index: result.length });
  }

  return result;
}

function canonicalMediaKey(value) {
  const parsed = parseUrl(value);

  if (!parsed) {
    return String(value ?? "");
  }

  const query = parsed.searchParams.toString();
  return `${parsed.origin}${normalizePathname(parsed.pathname)}${query ? `?${query}` : ""}`;
}

function mergeSuccessfulResults(results, attempts) {
  const allMedia = deduplicateMedia(results.flatMap((result) => ensureArray(result.media)));

  return {
    provider: results.map((result) => result.provider).join(","),
    providerName: results.map((result) => result.providerName).join(", "),
    title: firstNonEmptyString(...results.map((result) => result.title)) || null,
    caption: firstNonEmptyString(...results.map((result) => result.caption)) || null,
    author: results.find((result) => result.author)?.author || null,
    thumbnail: firstNonEmptyString(...results.map((result) => result.thumbnail), allMedia[0]?.thumb) || null,
    media: allMedia,
    attempts,
    raw: CONFIG.debug ? results.map((result) => ({ provider: result.provider, raw: result.raw })) : undefined,
  };
}


/* Telegram Worker delivery */

/**
 * Returns the Telegram channel list for the current source.
 *
 * @param {{provider:string,host:string}} source
 * @returns {string[]}
 */
function resolveTelegramChannels(source) {
  const provider = String(source?.provider || "generic").toLowerCase();
  const hostname = String(source?.host || "").toLowerCase();
  const channels = [];

  for (const route of CONFIG.telegram.channelRoutes || []) {
    const matched = ensureArray(route.sites).some((siteValue) => {
      const site = String(siteValue || "").toLowerCase();

      return (
        site === provider ||
        site === hostname ||
        hostname.endsWith(`.${site}`) ||
        (provider === "twitter" &&
          ["twitter", "twitter.com", "x", "x.com"].includes(site))
      );
    });

    if (!matched) {
      continue;
    }

    for (const channel of ensureArray(route.channels)) {
      const normalized = String(channel);

      if (normalized && !channels.includes(normalized)) {
        channels.push(normalized);
      }
    }
  }

  return channels;
}

/**
 * Escapes text for Telegram HTML parse mode.
 *
 * @param {unknown} value
 * @param {boolean} [attribute]
 * @returns {string}
 */
function escapeTelegramHtml(value, attribute = false) {
  let text = String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (attribute) {
    text = text.replace(/"/g, "&quot;");
  }

  return text;
}

/**
 * Builds the default Telegram caption.
 *
 * @param {ResolverOutput} output
 * @returns {string}
 */
function buildTelegramCaption(output) {
  const authorName = firstNonEmptyString(
    output.author?.name,
    output.author?.username,
    output.source.provider,
  );
  const authorUsername = firstNonEmptyString(
    output.author?.username,
  );
  const authorUrl = firstNonEmptyString(
    output.author?.url,
    output.inputUrl,
  );
  const publishedAt = formatTelegramDate(output.publishedAt);
  const tweetText = escapeTelegramHtml(
    output.caption || output.title || "",
  );
  const directTweetUrl = escapeTelegramHtml(output.inputUrl, true);
  const safeAuthorUrl = escapeTelegramHtml(authorUrl, true);
  const authorLabel = escapeTelegramHtml(
    [authorName, authorUsername]
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(" · "),
  );

  return [
    authorLabel
      ? `<b><a href="${safeAuthorUrl}">${authorLabel}</a></b>`
      : "",
    publishedAt ? `🕒 ${escapeTelegramHtml(publishedAt)}` : "",
    tweetText,
    directTweetUrl
      ? `🔗 <a href="${directTweetUrl}">Abrir Tweet original</a>`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Formats an ISO timestamp for a readable Telegram caption.
 *
 * @param {string|null|undefined} value
 * @returns {string}
 */
function formatTelegramDate(value) {
  if (!value) {
    return "";
  }

  try {
    const date = new Date(value);
    const formatter = new DateFormatter();

    formatter.locale = "pt_BR";
    formatter.dateFormat = "dd/MM/yyyy 'às' HH:mm";
    return formatter.string(date);
  } catch {
    return String(value);
  }
}

/**
 * Builds the JSON payload expected by the existing Telegram Worker.
 *
 * @param {ResolverOutput} output
 * @param {ResolvedMediaItem} media
 * @returns {TelegramWorkerInput}
 */
function buildTelegramWorkerPayload(output, media) {
  const channels = resolveTelegramChannels(output.source);
  const sourceUrl = String(media.url || "");
  const referer = buildMediaReferer(output, media);

  return removeUndefinedValues({
    mediaUrl: sourceUrl,
    videoUrl: sourceUrl,
    sourceUrl: output.inputUrl,
    provider: output.source.provider,
    channel: channels.length === 1 ? channels[0] : undefined,
    channels: channels.length ? channels : undefined,
    title:
      output.title ||
      media.title ||
      `${output.source.provider} media`,
    text: output.caption || "",
    pageUrl: output.inputUrl,
    frameUrl: output.inputUrl,
    caption: buildTelegramCaption(output),
    parseMode: "HTML",
    mediaType: media.type === "audio" ? "audio" : "video",
    mediaHeaders: removeUndefinedValues({
      Referer: referer,
      "User-Agent": CONFIG.userAgent,
    }),
    metadata: removeUndefinedValues({
      provider: output.source.provider,
      filename: media.filename,
      contentType:
        media.mimeType ||
        (media.type === "audio" ? "audio/mpeg" : "video/mp4"),
      sourceMediaUrl: sourceUrl,
      resolverProvider: media.resolverProvider,
      sourceProvider: media.sourceProvider,
      quality: media.quality,
      width: media.width,
      height: media.height,
      duration: media.duration,
      mediaId: media.id,
      mediaIndex: media.index,
      tweetAuthor: output.author?.name || null,
      tweetUsername: output.author?.username || null,
      tweetPublishedAt: output.publishedAt || null,
    }),
  });
}

/**
 * @param {ResolverOutput} output
 * @param {ResolvedMediaItem} media
 * @returns {string}
 */
function buildMediaReferer(output, media) {
  const mediaHost = parseUrl(media.url)?.hostname || "";

  if (/twimg\.com$/i.test(mediaHost)) {
    return "https://x.com/";
  }

  if (/cdninstagram\.com$|fbcdn\.net$/i.test(mediaHost)) {
    return "https://www.instagram.com/";
  }

  return output.inputUrl;
}

/**
 * Downloads one resolved URL into Scriptable's temporary directory.
 *
 * Scriptable's multipart API uploads files by path. The download is therefore
 * stored temporarily, posted to the Worker, and deleted in `finally`.
 *
 * @param {ResolvedMediaItem} media
 * @returns {Promise<{
 *   path:string,
 *   filename:string,
 *   byteLength:number,
 *   contentType:string
 * }>}
 */
async function downloadMediaToTemporaryFile(media) {
  const request = new Request(media.url);

  request.method = "GET";
  request.timeoutInterval = CONFIG.telegram.primary.timeoutSeconds;
  request.headers = {
    Accept: "*/*",
    "User-Agent": CONFIG.userAgent,
  };

  Debug.info("Downloading media for Telegram.", {
    mediaId: media.id,
    url: media.url,
    filename: media.filename,
  });

  const data = await request.load();
  const response = request.response || {};
  const statusCode = response.statusCode || null;

  if (statusCode && (statusCode < 200 || statusCode >= 400)) {
    const error = new Error(
      `Media download failed with HTTP ${statusCode}.`,
    );

    error.statusCode = statusCode;
    error.url = response.url || media.url;
    throw error;
  }

  if (!(data instanceof Data) || data.length <= 0) {
    throw new Error("The resolved media download returned no data.");
  }

  const fileManager = FileManager.local();
  const temporaryDirectory = fileManager.temporaryDirectory();
  const safeFilename =
    sanitizeFilename(media.filename || "") ||
    buildFallbackFilename(
      media.sourceProvider,
      null,
      media.index,
      media.url,
    );
  const uniqueFilename =
    `${Date.now()}-${media.id}-${safeFilename}`;
  const path = fileManager.joinPath(
    temporaryDirectory,
    uniqueFilename,
  );

  fileManager.write(path, data);

  return {
    path,
    filename: safeFilename,
    byteLength: data.length,
    contentType:
      media.mimeType ||
      response.headers?.["Content-Type"] ||
      response.headers?.["content-type"] ||
      "application/octet-stream",
  };
}

/**
 * Sends multipart/form-data with the same two fields used by the userscript:
 *
 * - `payload`: serialized TelegramWorkerInput JSON.
 * - `file`: downloaded media file.
 *
 * Scriptable creates the multipart boundary automatically. Do not set a
 * multipart Content-Type header manually.
 *
 * @param {{url:string,token:string,timeoutSeconds:number,role:string}} worker
 * @param {TelegramWorkerInput} payload
 * @param {{path:string,filename:string}} temporaryFile
 * @returns {Promise<TelegramWorkerOutput>}
 */

/**
 * First attempt: asks the Worker to fetch mediaUrl directly.
 *
 * No file is downloaded by Scriptable in this step. This is faster, avoids
 * memory pressure and lets the Worker apply `mediaHeaders` itself.
 *
 * @param {{url:string,token:string,timeoutSeconds:number,role:string}} worker
 * @param {TelegramWorkerInput} payload
 * @returns {Promise<TelegramWorkerOutput>}
 */
async function postUrlToTelegramWorker(worker, payload) {
  const request = new Request(worker.url);

  request.method = "POST";
  request.timeoutInterval = worker.timeoutSeconds;
  request.headers = {
    Accept: "application/json, text/plain, */*",
    Authorization: `Bearer ${worker.token}`,
    "Content-Type": "application/json",
    "User-Agent": CONFIG.userAgent,
  };
  request.body = JSON.stringify(payload);

  logStep(4, `Trying direct media URL on ${worker.role} Worker.`, {
    workerUrl: worker.url,
    mediaUrl: payload.mediaUrl,
    sourceUrl: payload.sourceUrl,
  });

  const responseText = await request.loadString();
  const response = request.response || {};
  const statusCode = response.statusCode || null;
  const body = parseTelegramWorkerResponse(
    responseText,
    statusCode,
    worker,
  );

  assertTelegramWorkerSuccess(body, statusCode, worker);
  return body;
}

/**
 * @param {string} responseText
 * @param {number|null} statusCode
 * @param {{role:string,url:string}} worker
 * @returns {TelegramWorkerOutput}
 */
function parseTelegramWorkerResponse(
  responseText,
  statusCode,
  worker,
) {
  try {
    return responseText ? JSON.parse(responseText) : {};
  } catch {
    return {
      ok: false,
      error: "The Telegram Worker returned invalid JSON.",
      statusCode,
      worker: worker.role,
      workerUrl: worker.url,
      rawResponse: truncateText(
        responseText,
        CONFIG.maximumResponseLogLength,
      ),
    };
  }
}

/**
 * @param {TelegramWorkerOutput} body
 * @param {number|null} statusCode
 * @param {{role:string,url:string}} worker
 */
function assertTelegramWorkerSuccess(body, statusCode, worker) {
  if (
    !statusCode ||
    statusCode < 200 ||
    statusCode >= 300 ||
    body?.ok === false
  ) {
    const error = new Error(
      body?.error ||
        body?.description ||
        `Telegram Worker returned HTTP ${statusCode || "unknown"}.`,
    );

    error.statusCode = statusCode;
    error.worker = worker.role;
    error.workerUrl = worker.url;
    error.responseBody = body;
    throw error;
  }
}

async function postToTelegramWorker(worker, payload, temporaryFile) {
  const request = new Request(worker.url);

  request.method = "POST";
  request.timeoutInterval = worker.timeoutSeconds;
  request.headers = {
    Accept: "application/json, text/plain, */*",
    Authorization: `Bearer ${worker.token}`,
    "User-Agent": CONFIG.userAgent,
  };

  request.addParameterToMultipart(
    "payload",
    JSON.stringify(payload),
  );
  /*
   * Scriptable's signature is addFileToMultipart(filePath, fieldName).
   * Passing fieldName first makes Scriptable try to read a path named "file".
   */
  request.addFileToMultipart(
    temporaryFile.path,
    "file",
  );

  Debug.info(`Posting media to ${worker.role} Telegram Worker.`, {
    workerUrl: worker.url,
    payload,
    file: {
      filename: temporaryFile.filename,
      path: temporaryFile.path,
    },
  });

  const responseText = await request.loadString();
  const response = request.response || {};
  const statusCode = response.statusCode || null;
  const body = parseTelegramWorkerResponse(
    responseText,
    statusCode,
    worker,
  );

  assertTelegramWorkerSuccess(body, statusCode, worker);
  return body;
}

/**
 * Sends one media item through primary Worker and optional fallback.
 *
 * @param {ResolverOutput} output
 * @param {ResolvedMediaItem} media
 * @returns {Promise<{
 *   index:number,
 *   mediaId:string,
 *   filename:string,
 *   ok:boolean,
 *   worker:string|null,
 *   response:TelegramWorkerOutput|null,
 *   error:Object|null
 * }>}
 */
async function sendMediaItemToTelegram(output, media) {
  const payload = buildTelegramWorkerPayload(output, media);
  const workers = [
    {
      ...CONFIG.telegram.primary,
      role: "primary",
    },
  ];

  if (CONFIG.telegram.fallback?.enabled) {
    workers.push({
      ...CONFIG.telegram.fallback,
      role: "fallback",
    });
  }

  const failures = [];
  let temporaryFile = null;
  const fileManager = FileManager.local();

  try {
    for (const worker of workers) {
      /*
       * Attempt A for each Worker: send JSON containing mediaUrl. If the
       * Worker can fetch the MP4 itself, Scriptable never downloads the file.
       */
      try {
        const response = await postUrlToTelegramWorker(
          worker,
          payload,
        );

        Debug.success(
          `[STEP 04] Direct URL delivery succeeded on ${worker.role}.`,
          response,
        );

        return {
          index: media.index,
          mediaId: media.id,
          filename: media.filename,
          ok: true,
          mode: "url",
          worker: worker.role,
          response,
          error: null,
        };
      } catch (error) {
        failures.push({
          worker: worker.role,
          mode: "url",
          error: serializeError(error),
        });

        Debug.warning(
          `[STEP 04] Direct URL failed on ${worker.role}; ` +
            "falling back to file upload.",
          serializeError(error),
        );
      }

      /*
       * Attempt B for the same Worker: download once and upload multipart.
       * The temporary file is reused for the fallback Worker if necessary.
       */
      try {
        if (!temporaryFile) {
          logStep(5, "Downloading media locally for multipart fallback.", {
            mediaId: media.id,
            mediaUrl: media.url,
          });
          temporaryFile = await downloadMediaToTemporaryFile(media);
        }

        logStep(6, `Uploading file to ${worker.role} Worker.`, {
          filename: temporaryFile.filename,
          byteLength: temporaryFile.byteLength,
        });

        const response = await postToTelegramWorker(
          worker,
          payload,
          temporaryFile,
        );

        Debug.success(
          `[STEP 06] Multipart delivery succeeded on ${worker.role}.`,
          response,
        );

        return {
          index: media.index,
          mediaId: media.id,
          filename: temporaryFile.filename,
          ok: true,
          mode: "file",
          worker: worker.role,
          response,
          error: null,
        };
      } catch (error) {
        failures.push({
          worker: worker.role,
          mode: "file",
          error: serializeError(error),
        });

        Debug.warning(
          `[STEP 06] Multipart failed on ${worker.role}.`,
          serializeError(error),
        );
      }

      logStep(7, `Advancing after ${worker.role} Worker failure.`, {
        failures,
      });
    }

    return {
      index: media.index,
      mediaId: media.id,
      filename: temporaryFile?.filename || media.filename,
      ok: false,
      mode: null,
      worker: null,
      response: null,
      error: {
        name: "TelegramDeliveryError",
        message: "All URL and multipart Worker attempts failed.",
        failures,
      },
    };
  } finally {
    if (temporaryFile?.path) {
      try {
        if (fileManager.fileExists(temporaryFile.path)) {
          fileManager.remove(temporaryFile.path);
        }
      } catch (error) {
        Debug.warning(
          "Could not remove the temporary media file.",
          serializeError(error),
        );
      }
    }
  }
}

/**
 * Sends resolved media sequentially.
 *
 * @param {ResolverOutput} output
 * @returns {Promise<TelegramDeliveryOutput>}
 */
async function sendResolvedMediaToTelegram(output) {
  const mediaItems = CONFIG.telegram.sendAllMedia
    ? output.media
    : output.media.slice(0, 1);
  const items = [];

  Debug.info("Starting Telegram delivery.", {
    mediaCount: mediaItems.length,
    worker: CONFIG.telegram.primary.url,
  });

  for (const media of mediaItems) {
    const result = await sendMediaItemToTelegram(output, media);

    items.push(result);

    if (!result.ok && CONFIG.telegram.stopOnFirstFailure) {
      break;
    }
  }

  const sentCount = items.filter((item) => item.ok).length;
  const failedCount = items.length - sentCount;

  const delivery = {
    ok: sentCount > 0 && failedCount === 0,
    sentCount,
    failedCount,
    items,
  };

  if (failedCount) {
    Debug.warning("Telegram delivery completed with failures.", delivery);
  } else {
    Debug.success("Telegram delivery completed.", delivery);
  }

  return delivery;
}


/* Output */

async function deliverOutput(output, runMode) {
  if (runMode === "shortcut" || runMode === "siri") {
    Script.setShortcutOutput(output);
    return;
  }

  if (CONFIG.copyStandaloneResult) {
    Pasteboard.copyString(safeStringify(output, 2));
  }

  if (CONFIG.showStandaloneResult && config.runsInApp) {
    await presentStandaloneResult(output);
  }
}

async function presentStandaloneResult(output) {
  const table = new UITable();
  table.showSeparators = true;

  const header = new UITableRow();
  header.isHeader = true;
  header.addText(output.ok ? "Media resolvida" : "Falha ao resolver", output.ok ? `${output.mediaCount} item(ns) via ${output.providerName}` : output.error?.message || "Erro desconhecido");
  table.addRow(header);

  if (output.ok) {
    addTableValue(table, "Origem", output.source?.provider);
    addTableValue(table, "Host", output.source?.host);
    addTableValue(table, "Provider", output.providerName);
    addTableValue(table, "Título", output.title);
    addTableValue(table, "Autor", formatAuthor(output.author));
    addTableValue(
      table,
      "Publicado",
      formatTelegramDate(output.publishedAt),
    );
    addTableValue(table, "Legenda", output.caption);

    if (output.telegram) {
      addTableValue(
        table,
        "Telegram",
        output.telegram.ok
          ? `${output.telegram.sentCount} item(ns) enviado(s)`
          : `${output.telegram.sentCount} enviado(s), ` +
            `${output.telegram.failedCount} falha(s)`,
      );
    }

    for (const media of output.media) {
      const row = new UITableRow();
      const title = `${media.index + 1}. ${media.type || "media"}${media.quality ? ` · ${media.quality}` : ""}`;
      const subtitle = media.filename || truncateText(media.url, 90);
      const cell = row.addText(title, subtitle);
      cell.widthWeight = 100;

      row.onSelect = async () => {
        const action = new Alert();
        action.title = title;
        action.message = media.url;
        action.addAction("Copiar URL");
        action.addAction("Abrir");
        action.addAction("Quick Look JSON");
        action.addCancelAction("Cancelar");
        const selected = await action.presentSheet();

        if (selected === 0) {
          Pasteboard.copyString(media.url);
        } else if (selected === 1) {
          Safari.open(media.url);
        } else if (selected === 2) {
          await QuickLook.present(safeStringify(media, 2), false);
        }
      };

      table.addRow(row);
    }
  }

  if (
    output.telegram &&
    CONFIG.telegram.showResultInStandaloneTable
  ) {
    const telegramRow = new UITableRow();
    telegramRow.addText(
      "Resultado do Telegram",
      `${output.telegram.sentCount} enviado(s) · ` +
        `${output.telegram.failedCount} falha(s)`,
    );
    telegramRow.onSelect = async () => {
      await QuickLook.present(
        safeStringify(output.telegram, 2),
        false,
      );
    };
    table.addRow(telegramRow);
  }

  const jsonRow = new UITableRow();
  jsonRow.addText("Ver JSON completo", "Abrir o objeto normalizado");
  jsonRow.onSelect = async () => QuickLook.present(safeStringify(output, 2), false);
  table.addRow(jsonRow);

  const copyRow = new UITableRow();
  copyRow.addText("Copiar JSON", "Copiar para a área de transferência");
  copyRow.onSelect = () => Pasteboard.copyString(safeStringify(output, 2));
  table.addRow(copyRow);

  if (CONFIG.debug) {
    const debugRow = new UITableRow();
    debugRow.addText("Debug", `${Debug.entries.length} registro(s)`);
    debugRow.onSelect = async () => QuickLook.present(safeStringify({ attempts: output.attempts, debug: output.debug }, 2), false);
    table.addRow(debugRow);
  }

  await table.present(false);
}

function addTableValue(table, title, value) {
  if (!value) {
    return;
  }

  const row = new UITableRow();
  row.addText(title, truncateText(String(value), 300));
  table.addRow(row);
}

/* URL and media helpers */

function normalizeInputUrl(value) {
  const text = String(value ?? "").trim().replace(/&amp;/gi, "&");
  const parsed = parseUrl(text);

  if (!parsed) {
    return text;
  }

  const query = parsed.searchParams.toString();
  return `${parsed.origin}${normalizePathname(parsed.pathname)}${query ? `?${query}` : ""}`;
}

function isProbablyDirectMediaUrl(value) {
  const pathname = getPathname(value).toLowerCase();
  return /\.(?:mp4|m4v|mov|webm|mkv|avi|m3u8|mpd|mp3|m4a|aac|wav|ogg|opus|flac|jpg|jpeg|png|webp|gif|avif)(?:$|\?)/i.test(`${pathname}${getSearch(value)}`);
}

function inferMediaTypeFromUrl(value, fallback = "unknown") {
  const pathname = getPathname(value).toLowerCase();

  if (/\.(?:mp4|m4v|mov|webm|mkv|avi|m3u8|mpd)$/i.test(pathname)) {
    return "video";
  }

  if (/\.(?:mp3|m4a|aac|wav|ogg|opus|flac)$/i.test(pathname)) {
    return "audio";
  }

  if (/\.(?:jpg|jpeg|png|webp|gif|avif)$/i.test(pathname)) {
    return "image";
  }

  return fallback;
}

function inferMimeType(value) {
  const mimeTypes = {
    mp4: "video/mp4",
    m4v: "video/x-m4v",
    mov: "video/quicktime",
    webm: "video/webm",
    mkv: "video/x-matroska",
    m3u8: "application/vnd.apple.mpegurl",
    mpd: "application/dash+xml",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    ogg: "audio/ogg",
    opus: "audio/opus",
    flac: "audio/flac",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
  };

  return mimeTypes[getFileExtension(value)] || null;
}

function filenameFromUrl(value) {
  const parsed = parseUrl(value);

  if (!parsed) {
    return null;
  }

  const filename = decodeUrlComponent(parsed.pathname).split("/").filter(Boolean).pop();

  if (!filename || !filename.includes(".")) {
    return null;
  }

  return sanitizeFilename(filename);
}

function buildFallbackFilename(sourceProvider, contentId, index, mediaUrl) {
  const extension = getFileExtension(mediaUrl) || "bin";
  const parts = [sourceProvider || "media", contentId, Number.isFinite(index) ? String(index + 1) : null].filter(Boolean);
  return `${parts.join("-")}.${extension}`;
}

function sanitizeFilename(value) {
  return String(value).replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
}

function getFileExtension(value) {
  return getPathname(value).match(/\.([A-Za-z0-9]{2,8})$/)?.[1]?.toLowerCase() || null;
}

function getHostname(value) {
  return parseUrl(value)?.hostname || "";
}

function getPathname(value) {
  const parsed = parseUrl(value);
  return parsed ? parsed.pathname : String(value || "").split(/[?#]/)[0];
}

function getSearch(value) {
  return parseUrl(value)?.search || "";
}

function resolveRelativeUrl(value, baseUrl) {
  if (!value) {
    return null;
  }

  return hasUrlScheme(value) ? value : resolveRelativeUrlWithoutNativeUrl(value, baseUrl);
}

function appendQueryParameter(url, key, value) {
  const parsed = parseUrl(url);

  if (!parsed) {
    const separator = String(url).includes("?") ? "&" : "?";
    return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }

  parsed.searchParams.set(key, value);
  const query = parsed.searchParams.toString();
  return `${parsed.origin}${normalizePathname(parsed.pathname)}${query ? `?${query}` : ""}`;
}

function createMediaId(url, index) {
  const input = `${url || "media"}:${index || 0}`;
  let hash = 2166136261;

  for (let position = 0; position < input.length; position += 1) {
    hash ^= input.charCodeAt(position);
    hash = Math.imul(hash, 16777619);
  }

  return `media-${(hash >>> 0).toString(16)}`;
}

/* Generic utilities */

function getValueAtPath(object, path) {
  if (!path) {
    return object;
  }

  return String(path).split(".").filter(Boolean).reduce((value, key) => {
    if (value === null || value === undefined) {
      return undefined;
    }

    const arrayMatch = key.match(/^(.+)\[(\d+)]$/);
    return arrayMatch ? value[arrayMatch[1]]?.[Number(arrayMatch[2])] : value[key];
  }, object);
}

function walkObject(value, visitor, visited = new Set()) {
  if (!value || typeof value !== "object" || visited.has(value)) {
    return;
  }

  visited.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      walkObject(item, visitor, visited);
    }
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    visitor(key, nestedValue);
    walkObject(nestedValue, visitor, visited);
  }
}

function normalizeAuthor(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const username = value.trim();
    return username ? { name: null, username, url: null } : null;
  }

  if (typeof value !== "object") {
    return null;
  }

  return removeUndefinedValues({
    name: firstNonEmptyString(value.name, value.fullName, value.full_name, value.displayName),
    username: firstNonEmptyString(value.username, value.userName, value.handle, value.uniqueId),
    url: firstNonEmptyString(value.url, value.profileUrl, value.profile_url),
    avatar: firstNonEmptyString(value.avatar, value.avatarUrl, value.profilePicUrl, value.profile_pic_url),
  });
}

function formatAuthor(author) {
  if (!author) {
    return null;
  }

  if (typeof author === "string") {
    return author;
  }

  return firstNonEmptyString(
    author.name && author.username ? `${author.name} (@${author.username.replace(/^@/, "")})` : null,
    author.name,
    author.username ? `@${author.username.replace(/^@/, "")}` : null,
  );
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (value !== null && value !== undefined && typeof value !== "object" && String(value).trim()) {
      return String(value).trim();
    }
  }

  return null;
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];

  for (const value of values.flat(Infinity)) {
    if (typeof value !== "string" || !value.trim()) {
      continue;
    }

    const normalized = value.trim();

    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
}

function decodeRepeatedly(value) {
  let current = String(value);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    let decoded;

    try {
      decoded = decodeURIComponent(current);
    } catch {
      break;
    }

    if (decoded === current) {
      break;
    }

    current = decoded;
  }

  return current;
}

function decodeHtmlEntities(value) {
  if (!value) {
    return value;
  }

  const entities = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };

  return String(value).replace(/&(#x?[0-9a-f]+|amp|quot|apos|lt|gt|nbsp);/gi, (original, entity) => {
    if (entity[0] === "#") {
      const hexadecimal = entity[1]?.toLowerCase() === "x";
      const numberText = hexadecimal ? entity.slice(2) : entity.slice(1);
      const codePoint = Number.parseInt(numberText, hexadecimal ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : original;
    }

    return entities[entity.toLowerCase()] ?? original;
  }).replace(/\\u0026/gi, "&").replace(/\\\//g, "/");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function removeUndefinedValues(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined));
}

function truncateText(value, maximumLength) {
  const text = String(value || "");
  return text.length <= maximumLength ? text : `${text.slice(0, maximumLength - 1)}…`;
}

function truncateDebugValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  return truncateText(typeof value === "string" ? value : safeStringify(value, 2), CONFIG.maximumResponseLogLength);
}

function redactHeaders(headers) {
  const redacted = {};

  for (const [key, value] of Object.entries(headers || {})) {
    redacted[key] = /authorization|cookie|token|secret|api[-_]?key/i.test(key) ? "[REDACTED]" : value;
  }

  return redacted;
}

function makeSerializable(value, visited = new WeakSet()) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "bigint") {
    return `${value}n`;
  }

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  if (typeof value === "symbol") {
    return String(value);
  }

  if (typeof value !== "object") {
    return value;
  }

  if (visited.has(value)) {
    return "[Circular]";
  }

  visited.add(value);

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => makeSerializable(item, visited));
  }

  const result = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    result[key] = makeSerializable(nestedValue, visited);
  }

  return result;
}

function safeStringify(value, indentation = 2) {
  try {
    return JSON.stringify(makeSerializable(value), null, indentation);
  } catch (error) {
    return JSON.stringify({ serializationError: error?.message || String(error), originalError: String(error), value: String(value) }, null, indentation);
  }
}

function serializeError(error) {
  if (!error) {
    return { name: "Error", message: "Unknown error" };
  }

  if (typeof error === "string") {
    return { name: "Error", message: error };
  }

  const serialized = {
    name: error.name || "Error",
    message: error.message || String(error),
    stack: error.stack || null,
  };

  for (const [key, value] of Object.entries(error)) {
    if (!(key in serialized)) {
      serialized[key] = makeSerializable(value);
    }
  }

  return serialized;
}

function detectRunMode() {
  if (config.runsWithSiri) {
    return "siri";
  }

  if (args.shortcutParameter !== null && args.shortcutParameter !== undefined) {
    return "shortcut";
  }

  if (ensureArray(args.urls).length || ensureArray(args.plainTexts).length) {
    return "share-sheet";
  }

  if (config.runsInWidget) {
    return "widget";
  }

  return "standalone";
}

/* Start */

await main();
