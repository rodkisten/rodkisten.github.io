// ==UserScript==
// @name         Rod Inspector · DOM + Network + Console
// @namespace    https://rod.migos.club/
// @version      0.4.0
// @description  Dock de diagnóstico minimalista (Vercel/shadcn) para Safari
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
(() => {
  "use strict";

  if (
    location.hostname === "rod.migos.club" &&
    location.pathname.startsWith("/userscripts/inspector")
  ) {
    return;
  }

  const TARGET = "https://rod.migos.club/userscripts/inspector.html";
  const ORIGIN = "https://rod.migos.club";
  const POS_KEY = "__rod_inspector_pos_v1";
  const HIDE_KEY = "__rod_inspector_hidden_tab_v1";
  const MAX_BODY_SIZE = 15000;

  const session = crypto.randomUUID();
  const network = [];
  const logs = [];

  let popup = null;
  let pickerActive = false;
  let pickerOverlay = null;
  let pickerTarget = null;
  let dockHost = null;
  let scrollTimer = null;

  // ============================================================================
  // 1. SANITIZAÇÃO E SERIALIZAÇÃO DE REDE
  // ============================================================================

  const clean = (v) => {
    try {
      return JSON.parse(
        JSON.stringify(v, (k, x) =>
          /authorization|cookie|token|secret|password|session|api.?key/i.test(k)
            ? "[REDACTED]"
            : x
        )
      );
    } catch {
      return String(v).slice(0, 3000);
    }
  };

  function extractHeaders(rawHeaders) {
    const result = {};
    if (!rawHeaders) return result;
    try {
      if (rawHeaders instanceof Headers) {
        rawHeaders.forEach((value, key) => {
          result[key] = value;
        });
      } else if (Array.isArray(rawHeaders)) {
        for (const [key, value] of rawHeaders) {
          if (key) result[key] = String(value);
        }
      } else if (typeof rawHeaders === "object") {
        for (const [key, value] of Object.entries(rawHeaders)) {
          result[key] = String(value);
        }
      }
    } catch {
      return { _error: "Falha ao ler headers" };
    }
    return clean(result);
  }

  function parseRawHeaders(headerStr) {
    const result = {};
    if (!headerStr) return result;
    for (const line of headerStr.trim().split(/[\r\n]+/)) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const key = line.slice(0, idx).trim().toLowerCase();
        const val = line.slice(idx + 1).trim();
        result[key] = result[key] ? `${result[key]}, ${val}` : val;
      }
    }
    return clean(result);
  }

  async function serializeBody(body) {
    if (body === null || body === undefined) return null;
    try {
      if (typeof body === "string") return body.slice(0, MAX_BODY_SIZE);
      if (body instanceof URLSearchParams)
        return body.toString().slice(0, MAX_BODY_SIZE);
      if (body instanceof FormData) {
        const entries = {};
        for (const [k, v] of body.entries()) {
          entries[k] =
            v instanceof File
              ? `[File: ${v.name} (${v.type || "unknown"}, ${v.size} bytes)]`
              : String(v).slice(0, 1000);
        }
        return clean(entries);
      }
      if (body instanceof Blob) {
        if (body.type && /json|text|xml|javascript|form/.test(body.type)) {
          return (await body.text()).slice(0, MAX_BODY_SIZE);
        }
        return `[Blob: ${body.type || "application/octet-stream"}, ${body.size} bytes]`;
      }
      if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
        try {
          return new TextDecoder("utf-8", { fatal: true })
            .decode(body)
            .slice(0, MAX_BODY_SIZE);
        } catch {
          return `[Binary Buffer: ${body.byteLength} bytes]`;
        }
      }
      if (typeof ReadableStream !== "undefined" && body instanceof ReadableStream) {
        return "[ReadableStream]";
      }
      return clean(body);
    } catch (err) {
      return `[Body não serializável: ${String(err)}]`;
    }
  }

  async function extractFetchResponseBody(responseClone) {
    try {
      const contentType = responseClone.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) return "[SSE EventStream]";
      if (/image|video|audio|font|octet-stream|pdf|zip/.test(contentType)) {
        const blob = await responseClone.blob();
        return `[Binary ${contentType}: ${blob.size} bytes]`;
      }
      return (await responseClone.text()).slice(0, MAX_BODY_SIZE);
    } catch (err) {
      return `[Erro ao ler response body: ${String(err)}]`;
    }
  }

  // ============================================================================
  // 2. MENSAGERIA E SNAPSHOT
  // ============================================================================

  function send(payload) {
    if (popup && !popup.closed) {
      popup.postMessage({ rodInspector: 1, payload }, ORIGIN);
    }
  }

  const push = (channel, data) => {
    const list = channel === "network" ? network : logs;
    list.push(data);
    if (list.length > 400) list.shift();
    if (popup && !popup.closed) {
      popup.postMessage(
        { rodInspector: 1, payload: { kind: "event", session, channel, data } },
        ORIGIN
      );
    }
  };

  function snapshot() {
    return {
      kind: "snapshot",
      session,
      url: location.href,
      title: document.title,
      time: new Date().toISOString(),
      userAgent: navigator.userAgent,
      html: document.documentElement?.outerHTML || "",
      network: network.slice(),
      console: logs.slice(),
    };
  }

  function transmit() {
    if (!popup || popup.closed) return;
    popup.postMessage({ rodInspector: 1, payload: snapshot() }, ORIGIN);
  }

  // ============================================================================
  // 3. INTERCEPTADORES DE REDE (FETCH, XHR, BEACON) & CONSOLE
  // ============================================================================

  const originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = async function (...args) {
      const start = performance.now();
      const time = new Date().toISOString();
      const [input, init = {}] = args;

      let url = "";
      let method = "GET";
      let reqHeaders = {};
      let reqBodyPromise = Promise.resolve(null);

      try {
        if (input instanceof Request) {
          url = input.url;
          method = (init.method || input.method || "GET").toUpperCase();
          reqHeaders = extractHeaders(init.headers || input.headers);

          if (init.body !== undefined) {
            reqBodyPromise = serializeBody(init.body);
          } else if (!["GET", "HEAD"].includes(method) && input.body !== null) {
            reqBodyPromise = input
              .clone()
              .text()
              .then((t) => t.slice(0, MAX_BODY_SIZE))
              .catch(() => "[Request Stream já consumido]");
          }
        } else {
          url = input instanceof URL ? input.href : String(input);
          method = (init.method || "GET").toUpperCase();
          reqHeaders = extractHeaders(init.headers);
          if (init.body !== undefined) {
            reqBodyPromise = serializeBody(init.body);
          }
        }
      } catch {
        url = String(input);
      }

      try {
        const response = await originalFetch.apply(this, args);
        const ms = Math.round(performance.now() - start);
        const resHeaders = extractHeaders(response.headers);
        const resClone = response.clone();

        Promise.all([reqBodyPromise, extractFetchResponseBody(resClone)]).then(
          ([requestBody, responseBody]) => {
            push("network", {
              type: "fetch",
              method,
              url,
              status: response.status,
              statusText: response.statusText,
              ms,
              time,
              requestHeaders: reqHeaders,
              requestBody,
              responseHeaders: resHeaders,
              responseBody,
            });
          }
        );

        return response;
      } catch (error) {
        const ms = Math.round(performance.now() - start);
        const requestBody = await reqBodyPromise;
        push("network", {
          type: "fetch",
          method,
          url,
          status: 0,
          error: String(error),
          ms,
          time,
          requestHeaders: reqHeaders,
          requestBody,
        });
        throw error;
      }
    };
  }

  const origXhrOpen = XMLHttpRequest.prototype.open;
  const origXhrSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  const origXhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__rodRequest = {
      type: "xhr",
      method: String(method || "GET").toUpperCase(),
      url: url instanceof URL ? url.href : String(url),
      requestHeaders: {},
      start: 0,
    };
    return origXhrOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
    if (this.__rodRequest && header) {
      const key = String(header);
      this.__rodRequest.requestHeaders[key] = this.__rodRequest.requestHeaders[key]
        ? `${this.__rodRequest.requestHeaders[key]}, ${value}`
        : String(value);
    }
    return origXhrSetHeader.call(this, header, value);
  };

  XMLHttpRequest.prototype.send = function (body) {
    const record = this.__rodRequest;
    if (record) {
      record.start = performance.now();
      record.time = new Date().toISOString();
      const reqBodyPromise = serializeBody(body);

      this.addEventListener(
        "loadend",
        async () => {
          const ms = Math.round(performance.now() - record.start);
          const requestBody = await reqBodyPromise;
          const responseHeaders = parseRawHeaders(this.getAllResponseHeaders());
          let responseBody = null;

          try {
            if (!this.responseType || this.responseType === "text") {
              responseBody = String(this.responseText || "").slice(0, MAX_BODY_SIZE);
            } else if (this.responseType === "json") {
              responseBody =
                this.response !== null
                  ? JSON.stringify(this.response).slice(0, MAX_BODY_SIZE)
                  : null;
            } else if (this.responseType === "document" && this.responseXML) {
              responseBody = new XMLSerializer()
                .serializeToString(this.responseXML)
                .slice(0, MAX_BODY_SIZE);
            } else if (
              this.response instanceof Blob ||
              this.response instanceof ArrayBuffer
            ) {
              responseBody = await serializeBody(this.response);
            }
          } catch (err) {
            responseBody = `[Erro ao ler XHR response: ${String(err)}]`;
          }

          push("network", {
            type: "xhr",
            method: record.method,
            url: record.url,
            status: this.status,
            statusText: this.statusText,
            ms,
            time: record.time,
            requestHeaders: clean(record.requestHeaders),
            requestBody,
            responseHeaders,
            responseBody,
          });
        },
        { once: true }
      );
    }
    return origXhrSend.call(this, body);
  };

  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      const time = new Date().toISOString();
      const ok = origBeacon(url, data);
      serializeBody(data).then((requestBody) => {
        push("network", {
          type: "beacon",
          method: "POST",
          url: url instanceof URL ? url.href : String(url),
          status: ok ? 200 : 0,
          ms: 0,
          time,
          requestHeaders: {},
          requestBody,
        });
      });
      return ok;
    };
  }

  for (const level of ["log", "warn", "error", "info"]) {
    const old = console[level];
    console[level] = function (...args) {
      push("console", {
        level,
        time: new Date().toISOString(),
        args: args.map((x) =>
          typeof x === "string" ? x.slice(0, 2000) : clean(x)
        ),
      });
      return old.apply(this, args);
    };
  }

  // ============================================================================
  // 4. SELETOR DE ELEMENTOS DOM (ELEMENT PICKER)
  // ============================================================================

  const nodePath = (node) => {
    const indices = [];
    let n = node;
    while (n && n !== document.documentElement && indices.length < 128) {
      const p = n.parentNode;
      if (!p) break;
      indices.unshift(Array.prototype.indexOf.call(p.childNodes, n));
      n = p;
    }
    return n === document.documentElement ? indices : null;
  };

  const nodeByPath = (indices) => {
    let n = document.documentElement;
    for (const i of indices || []) {
      n = n?.childNodes?.[i];
      if (!n) return null;
    }
    return n;
  };

  function clearOverlay() {
    pickerOverlay?.remove();
    pickerOverlay = null;
    pickerTarget = null;
  }

  function showOverlay(node) {
    if (!(node instanceof Element)) return;
    pickerTarget = node;
    if (!pickerOverlay) {
      pickerOverlay = document.createElement("div");
      pickerOverlay.style.cssText =
        "position:fixed!important;z-index:2147483646!important;pointer-events:none!important;border:1.5px solid #fafafa!important;background:rgba(255,255,255,0.08)!important;border-radius:4px!important;box-shadow:0 0 0 1px rgba(0,0,0,0.6)!important;transition:all .06s ease!important;";
      document.documentElement.append(pickerOverlay);
    }
    const r = node.getBoundingClientRect();
    Object.assign(pickerOverlay.style, {
      left: r.left + "px",
      top: r.top + "px",
      width: r.width + "px",
      height: r.height + "px",
    });
  }

  function stopPicker() {
    pickerActive = false;
    document.removeEventListener("pointermove", hoverPicker, true);
    document.removeEventListener("click", selectPicker, true);
    document.removeEventListener("touchstart", touchPicker, true);
    clearOverlay();
  }

  function hoverPicker(e) {
    if (pickerActive && !e.target.closest?.("#rod-inspector-dock")) {
      showOverlay(e.target);
    }
  }

  function touchPicker(e) {
    if (pickerActive && !e.target.closest?.("#rod-inspector-dock")) {
      showOverlay(
        document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY)
      );
    }
  }

  function cssSelector(node) {
    if (!(node instanceof Element)) return "";
    const parts = [];
    let n = node;
    while (n && n.nodeType === 1 && parts.length < 24) {
      let part = n.localName;
      if (n.id) {
        part += "#" + CSS.escape(n.id);
        parts.unshift(part);
        break;
      }
      const siblings = n.parentElement
        ? Array.from(n.parentElement.children).filter(
            (x) => x.localName === n.localName
          )
        : [];
      if (siblings.length > 1) {
        part += ":nth-of-type(" + (siblings.indexOf(n) + 1) + ")";
      }
      parts.unshift(part);
      n = n.parentElement;
    }
    return parts.join(" > ");
  }

  function selectPicker(e) {
    if (!pickerActive || e.target.closest?.("#rod-inspector-dock")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const node = pickerTarget || e.target;
    const path = nodePath(node);
    stopPicker();
    if (path) {
      send({
        kind: "selection",
        session,
        path,
        selector: cssSelector(node),
        outerHTML: node.outerHTML?.slice(0, 30000),
      });
    }
  }

  function startPicker() {
    stopPicker();
    pickerActive = true;
    document.addEventListener("pointermove", hoverPicker, true);
    document.addEventListener("touchstart", touchPicker, true);
    document.addEventListener("click", selectPicker, true);
  }

  window.addEventListener("message", (e) => {
    if (e.origin !== ORIGIN || e.source !== popup || e.data?.rodInspector !== 1) {
      return;
    }
    if (e.data.kind === "ready") {
      transmit();
    } else if (e.data.kind === "pick") {
      startPicker();
    } else if (e.data.kind === "highlight") {
      const node =
        (e.data.selector ? document.querySelector(e.data.selector) : null) ||
        nodeByPath(e.data.path);
      if (node instanceof Element) {
        node.scrollIntoView({ block: "center", inline: "nearest" });
        showOverlay(node);
        setTimeout(() => {
          if (!pickerActive) clearOverlay();
        }, 2500);
      }
    }
  });

  // ============================================================================
  // 5. DOCK MINIMALISTA (SHADCN/VERCEL) + DRAG + SCROLL DIM + TAB HIDE/RESTORE
  // ============================================================================

  function getSavedPos() {
    try {
      const raw = JSON.parse(localStorage.getItem(POS_KEY) || "null");
      if (raw && (raw.side === "left" || raw.side === "right") && typeof raw.topPct === "number") {
        return {
          side: raw.side,
          topPct: Math.min(92, Math.max(4, raw.topPct)),
        };
      }
    } catch {}
    return { side: "right", topPct: 45 };
  }

  function savePos(side, topPct) {
    try {
      localStorage.setItem(
        POS_KEY,
        JSON.stringify({
          side,
          topPct: Math.round(Math.min(92, Math.max(4, topPct)) * 10) / 10,
        })
      );
    } catch {}
  }

  function isTabHidden() {
    try {
      return sessionStorage.getItem(HIDE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function setTabHidden(hidden) {
    try {
      if (hidden) sessionStorage.setItem(HIDE_KEY, "1");
      else sessionStorage.removeItem(HIDE_KEY);
    } catch {}

    if (dockHost) {
      dockHost.style.setProperty("display", hidden ? "none" : "block", "important");
      if (!hidden) {
        dockHost.style.setProperty("opacity", "1", "important");
      }
    }
  }

  function applyHostPosition(host, side, topPct, animate = true) {
    host.style.setProperty(
      "transition",
      animate
        ? "opacity 0.25s ease, top 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), right 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)"
        : "opacity 0.25s ease",
      "important"
    );
    host.style.setProperty("top", `${topPct}%`, "important");
    if (side === "left") {
      host.style.setProperty("left", "6px", "important");
      host.style.setProperty("right", "auto", "important");
    } else {
      host.style.setProperty("right", "6px", "important");
      host.style.setProperty("left", "auto", "important");
    }
  }

  // Esmaecer durante o scroll
  function handleScrollDim() {
    if (!dockHost || isTabHidden()) return;
    dockHost.style.setProperty("opacity", "0.16", "important");
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      if (dockHost && !isTabHidden()) {
        dockHost.style.setProperty("opacity", "1", "important");
      }
    }, 650);
  }

  window.addEventListener("scroll", handleScrollDim, { passive: true, capture: true });

  // Restaurar dock fechado na aba: Toque triplo (3 taps rápidos) ou Alt+Shift+D
  let tapCount = 0;
  let lastTapTime = 0;
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!isTabHidden()) return;
      const now = Date.now();
      if (now - lastTapTime < 350) {
        tapCount++;
        if (tapCount >= 3) {
          tapCount = 0;
          setTabHidden(false);
        }
      } else {
        tapCount = 1;
      }
      lastTapTime = now;
    },
    { passive: true, capture: true }
  );

  window.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
      setTabHidden(!isTabHidden());
    }
  });

  function mount() {
    if (document.getElementById("rod-inspector-dock")) return;

    const pos = getSavedPos();
    const host = document.createElement("div");
    host.id = "rod-inspector-dock";
    dockHost = host;

    // Isolamento total contra transform/z-index/fixed de elementos da página
    host.style.cssText = [
      "all: initial !important",
      "position: fixed !important",
      "z-index: 2147483647 !important",
      "margin: 0 !important",
      "padding: 0 !important",
      "contain: layout style !important",
      "user-select: none !important",
      "-webkit-user-select: none !important",
      "touch-action: none !important",
      isTabHidden() ? "display: none !important" : "display: block !important",
      "opacity: 1 !important",
    ].join(";");

    applyHostPosition(host, pos.side, pos.topPct, false);

    const shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          height: 24px;
          padding: 0 3px 0 7px;
          gap: 4px;
          border-radius: 9999px;
          background: rgba(9, 9, 11, 0.88);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);
          color: #fafafa;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: -0.02em;
          cursor: grab;
          touch-action: none;
          transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
        }
        .pill:hover {
          background: #09090b;
          border-color: rgba(255, 255, 255, 0.28);
        }
        .pill.dragging {
          cursor: grabbing;
          transform: scale(1.04);
          border-color: rgba(255, 255, 255, 0.45);
        }
        .trigger {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: 0;
          padding: 0;
          margin: 0;
          color: inherit;
          font: inherit;
          cursor: inherit;
          outline: none;
        }
        .dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #fafafa;
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
          flex-shrink: 0;
        }
        .close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          border: 0;
          background: transparent;
          color: #71717a;
          font-size: 11px;
          line-height: 1;
          padding: 0;
          margin: 0;
          cursor: pointer;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .close:hover {
          color: #fafafa;
          background: rgba(255, 255, 255, 0.12);
        }
      </style>
      <div class="pill" part="pill" title="Arraste para mover · Clique para abrir">
        <button type="button" class="trigger" aria-label="Abrir Rod Inspector">
          <span class="dot"></span>
          <span>dev</span>
        </button>
        <button type="button" class="close" aria-label="Ocultar nesta aba (3 toques na tela para restaurar)" title="Fechar nesta aba">×</button>
      </div>
    `;

    const pill = shadow.querySelector(".pill");
    const triggerBtn = shadow.querySelector(".trigger");
    const closeBtn = shadow.querySelector(".close");

    // Drag & Drop fluido com Snap nas bordas e persistência
    let isDragging = false;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;

    pill.addEventListener("pointerdown", (e) => {
      if (e.target === closeBtn) return;
      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;

      const rect = host.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;

      pill.setPointerCapture(e.pointerId);
      pill.classList.add("dragging");
      host.style.setProperty("opacity", "1", "important");
      host.style.setProperty("transition", "none", "important");
      host.style.setProperty("right", "auto", "important");
      host.style.setProperty("left", `${origLeft}px`, "important");
      host.style.setProperty("top", `${origTop}px`, "important");
    });

    pill.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMoved = true;
      }

      if (hasMoved) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const rect = host.getBoundingClientRect();

        const nextLeft = Math.min(vw - rect.width - 4, Math.max(4, origLeft + dx));
        const nextTop = Math.min(vh - rect.height - 4, Math.max(4, origTop + dy));

        host.style.setProperty("left", `${nextLeft}px`, "important");
        host.style.setProperty("top", `${nextTop}px`, "important");
      }
    });

    const endDrag = (e) => {
      if (!isDragging) return;
      isDragging = false;
      pill.classList.remove("dragging");
      try {
        pill.releasePointerCapture(e.pointerId);
      } catch {}

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = host.getBoundingClientRect();

      // Snap para a borda mais próxima (esquerda ou direita)
      const side = rect.left + rect.width / 2 < vw / 2 ? "left" : "right";
      const topPct = (rect.top / vh) * 100;

      applyHostPosition(host, side, topPct, true);
      savePos(side, topPct);
    };

    pill.addEventListener("pointerup", endDrag);
    pill.addEventListener("pointercancel", endDrag);

    // Abrir inspetor (somente se não foi arrasto)
    triggerBtn.addEventListener("click", (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      popup = window.open(TARGET, "_blank");
      if (!popup) {
        alert("Permita pop-ups para abrir o Rod Inspector.");
      } else {
        setTimeout(transmit, 750);
      }
    });

    // Fechar apenas nesta aba
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setTabHidden(true);
    });

    // Anexa no <html> (documentElement) e reanexa caso algum framework SPA (React/Next) limpe o DOM
    document.documentElement.append(host);
  }

  if (document.documentElement) {
    mount();
  } else {
    new MutationObserver((_mutations, observer) => {
      if (document.documentElement) {
        observer.disconnect();
        mount();
      }
    }).observe(document, { childList: true });
  }

  // Garante sobrevivência caso o body/html seja substituído dinamicamente
  setInterval(() => {
    if (document.documentElement && !document.getElementById("rod-inspector-dock")) {
      mount();
    }
  }, 2000);
})();
