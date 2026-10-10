// Photo Manager web controller
// Module version: 1.8.0
// Package version: 4.7.0

const $ = (s) => document.querySelector(s),
        $$ = (s) => [...document.querySelectorAll(s)];
      let config = {},
        lastStatus = null,
        saveTimer = null,
        online = false;
      let terminalSeq = 0,
        terminalRows = new Map(),
        terminalLastError = null;
      let terminalOpen = false;
      let duplicateState = {
        groups: [],
        selected: new Set(),
        result: null,
        status: null,
        drive: null,
        lastCompletedScanId: null,
      };
      let deferredInstallPrompt = null;

      function fmtBytes(n) {
        n = Number(n || 0);
        if (!Number.isFinite(n) || n <= 0) return "0 B";
        const u = ["B", "KB", "MB", "GB", "TB"];
        let i = 0;
        while (n >= 1024 && i < u.length - 1) {
          n /= 1024;
          i++;
        }
        return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
      }
      function htmlEscape(value) {
        return String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      }

      function formatPercent(value) {
        const n = Math.max(0, Math.min(100, Number(value || 0)));
        if (n > 0 && n < 1) return `${n.toFixed(2)}%`;
        if (n < 10) return `${n.toFixed(1)}%`;
        return `${n.toFixed(0)}%`;
      }

      function photosAssetUuid(localId) {
        return String(localId || "").split("/")[0].trim();
      }

      function openPhotosAsset(localId) {
        const uuid = photosAssetUuid(localId);
        if (!uuid) return;

        const encoded = encodeURIComponent(uuid);
        const direct = `photos-navigation://asset?uuid=${encoded}`;
        const fallback =
          `photos-navigation://album?name=recents&revealassetuuid=${encoded}`;

        let fallbackTimer = null;
        const onVisibility = () => {
          if (document.hidden && fallbackTimer) {
            clearTimeout(fallbackTimer);
            fallbackTimer = null;
            document.removeEventListener("visibilitychange", onVisibility);
          }
        };

        document.addEventListener("visibilitychange", onVisibility);

        fallbackTimer = setTimeout(() => {
          document.removeEventListener("visibilitychange", onVisibility);
          if (!document.hidden) window.location.href = fallback;
        }, 700);

        window.location.href = direct;
      }

      function albumText(item) {
        const created = Array.isArray(item?.created_albums)
          ? item.created_albums.filter(Boolean)
          : [];
        const source = Array.isArray(item?.albums)
          ? item.albums.filter(Boolean)
          : [];
        const albums = created.length ? created : source;
        return albums.length ? albums.join(" · ") : "Fototeca";
      }

      function fmtDur(sec) {
        if (sec == null || !Number.isFinite(Number(sec))) return "—";
        sec = Math.max(0, Math.round(Number(sec)));
        const h = Math.floor(sec / 3600),
          m = Math.floor((sec % 3600) / 60),
          s = sec % 60;
        if (h) return `${h}h ${m}m`;
        if (m) return `${m}m ${s}s`;
        return `${s}s`;
      }
      function toast(msg) {
        const el = $("#toast");
        el.textContent = msg;
        try { if (!el.matches(":popover-open")) el.showPopover(); } catch {}
        el.classList.add("show");
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(() => {
          el.classList.remove("show");
          try { if (el.matches(":popover-open")) el.hidePopover(); } catch {}
        }, 2200);
      }
      // A hosted shell is static. The API and thumbnails remain on this iPhone.
      const hostedShell = location.hostname !== "127.0.0.1" &&
        location.hostname !== "localhost";
      const BRIDGE_URL_KEY = "photo-manager:bridge-url:v1";
      const BRIDGE_TOKEN_KEY = "photo-manager:bridge-token:v1";
      let bridgeBase = hostedShell
        ? (localStorage.getItem(BRIDGE_URL_KEY) || "http://127.0.0.1:8765")
        : location.origin;
      let bridgeToken = hostedShell ? localStorage.getItem(BRIDGE_TOKEN_KEY) : "";
      let mediaTicket = "";
      let ticketRefreshAt = 0;

      function normalizeBridgeUrl(value) {
        const url = new URL(String(value).trim());
        if (url.username || url.password || url.search || url.hash ||
            !["http:", "https:"].includes(url.protocol)) {
          throw new Error("URL do servidor inválida");
        }
        // HTTP must be loopback: never send access tokens over LAN HTTP.
        if (url.protocol === "http:" && !["127.0.0.1", "localhost"].includes(url.hostname)) {
          throw new Error("HTTP é permitido apenas para o servidor local");
        }
        return url.origin;
      }

      function mediaUrl(path) {
        if (!path) return "";
        if (/^(?:photos-navigation|shareddocuments):/i.test(path)) return path;
        const pathname = String(path);
        if (!pathname.startsWith("/")) return pathname;
        if (!hostedShell) return pathname;
        if (!mediaTicket) return "";
        const url = new URL(pathname, bridgeBase);
        url.searchParams.set("ticket", mediaTicket);
        return url.toString();
      }

      async function api(path, opts = {}) {
        if (hostedShell && !bridgeToken) throw new Error("bridge_pairing_required");
        const headers = {
          "Content-Type": "application/json",
          ...(hostedShell ? { Authorization: `Bearer ${bridgeToken}` } : {}),
          ...(opts.headers || {}),
        };
        const r = await fetch(hostedShell ? bridgeBase + path : path, {
          cache: "no-store", ...opts, headers,
        });
        const j = await r.json().catch(() => ({ ok: false, error: "invalid_json" }));
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        return j;
      }

      function openBridge(message = "") {
        const dialog = $("#bridgeDialog");
        if (!dialog) return;
        $("#bridgeServerUrl").value = bridgeBase;
        $("#bridgeMessage").textContent = message;
        if (!dialog.open) dialog.showModal();
      }

      async function refreshMediaTicket() {
        if (!hostedShell || !bridgeToken) return;
        const status = await api("/api/bridge/status");
        if (!status.paired || !status.ticket) {
          bridgeToken = "";
          mediaTicket = "";
          localStorage.removeItem(BRIDGE_TOKEN_KEY);
          throw new Error("Pareamento expirado ou inválido");
        }
        mediaTicket = status.ticket;
        ticketRefreshAt = Date.now() + 20 * 60 * 1000;
      }

      function initBridge() {
        $("#bridgeOpenBtn")?.addEventListener("click", () => {
          if (!hostedShell) return toast("Servidor local: já conectado ao Pyto");
          openBridge(bridgeToken ? "Para trocar o servidor, conecte novamente." : "");
        });
        $("#bridgeCloseBtn")?.addEventListener("click", () => $("#bridgeDialog").close());
        $("#bridgeForm")?.addEventListener("submit", async event => {
          event.preventDefault();
          const button = $("#bridgePairBtn");
          const message = $("#bridgeMessage");
          button.disabled = true;
          message.textContent = "Verificando código…";
          try {
            const base = normalizeBridgeUrl($("#bridgeServerUrl").value);
            const code = $("#bridgePairCode").value.trim();
            const response = await fetch(base + "/api/bridge/pair", {
              method: "POST", cache: "no-store",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({code}),
            });
            const result = await response.json();
            if (!response.ok || !result.token) throw new Error(result.error || "Pareamento falhou");
            bridgeBase = base;
            bridgeToken = result.token;
            mediaTicket = result.ticket || "";
            localStorage.setItem(BRIDGE_URL_KEY, bridgeBase);
            localStorage.setItem(BRIDGE_TOKEN_KEY, bridgeToken);
            $("#bridgePairCode").value = "";
            $("#bridgeDialog").close();
            location.reload();
          } catch (error) {
            message.textContent = `${error}. Verifique se o Pyto está aberto e o código está correto.`;
          } finally { button.disabled = false; }
        });
        if (hostedShell) {
          setInterval(async () => {
            if (bridgeToken && Date.now() >= ticketRefreshAt) {
              try { await refreshMediaTicket(); }
              catch { setConnected(false); openBridge("Não foi possível renovar a conexão."); }
            }
          }, 60000);
        }
      }

      async function updateCacheStats() {
        try {
          const payload = await api("/api/previews/cache");
          const cache = payload.cache || {};
          $("#cacheUsage").textContent = `${fmtBytes(cache.bytes)} / ${fmtBytes(cache.limit_bytes)}`;
          $("#cacheCount").textContent = `${Number(cache.count || 0).toLocaleString("pt-BR")} previews, sem duplicar arquivos`;
          $("#cacheMeterFill").style.width =
            `${Math.min(100, 100 * (cache.bytes || 0) / Math.max(1, cache.limit_bytes || 1))}%`;
          $("#cacheLimitMb").value = String(cache.limit_mb || 256);
        } catch { $("#cacheUsage").textContent = "Cache indisponível"; }
      }

      function setConnected(ok) {
        online = ok;
        $("#connDot").classList.toggle("ok", ok);
        $("#connText").textContent = ok ? "conectado" : "offline";
      }
      function value(id) {
        const el = $("#" + id);
        if (!el) return undefined;
        return el.type === "checkbox"
          ? el.checked
          : el.type === "number"
            ? Number(el.value)
            : el.value;
      }
      function setValue(id, v) {
        const el = $("#" + id);
        if (!el || v == null) return;
        if (el.type === "checkbox") el.checked = !!v;
        else el.value = v;
      }
      function selectedMedia() {
        return $$(".media:checked")
          .map((x) => x.value)
          .join(",");
      }
      function applyConfig(c) {
        config = { ...c };
        [
          "quality",
          "destination_album_name",
          "commit_mode",
          "delete_strategy",
          "sort",
          "allow_icloud",
          "preserve_albums",
          "dedupe_created",
          "metadata_strict",
          "min_saving_percent",
          "sync_source_max_mb",
          "icloud_retry_count",
          "icloud_retry_base_delay",
          "icloud_retry_max_delay",
          "icloud_circuit_failures",
          "icloud_circuit_cooldown",
          "icloud_circuit_max_cycles",
          "icloud_inter_request_delay",
          "max_megapixels",
          "max_items",
          "memory_reserve_mb",
          "memory_cleanup_available_mb",
          "checkpoint_every",
          "direction",
          "favorite",
          "hidden",
          "auto_run",
          "auto_action",
          "notify_enabled",
          "notify_device_id",
          "notify_title",
          "notify_symbol",
          "notify_tint",
          "notify_update_interval",
          "notify_keep_for",
          "notify_eta",
          "notify_metrics",
          "duplicates_source_photos",
          "duplicates_source_drive",
          "duplicates_photo_scope",
          "duplicates_allow_icloud",
          "duplicates_include_photos",
          "duplicates_include_screenshots",
          "duplicates_include_live",
          "duplicates_drive_images",
          "duplicates_drive_documents",
          "duplicates_drive_recursive",
          "duplicates_drive_hidden",
          "duplicates_exact",
          "duplicates_visual",
          "duplicates_dhash_distance",
          "duplicates_aspect_tolerance_percent",
          "duplicates_size_tolerance_percent",
          "duplicates_time_window_days",
          "duplicates_min_size_mb",
          "duplicates_max_visual_candidates",
          "duplicates_keeper",
          "quality_photo_scope",
          "quality_allow_icloud",
          "quality_include_photos",
          "quality_include_screenshots",
          "quality_include_live",
          "quality_include_hidden",
          "quality_only_flagged",
          "quality_blur_threshold",
          "quality_min_megapixels",
          "quality_dark_fraction",
          "quality_bright_fraction",
          "quality_min_contrast",
          "quality_scan_limit",
          "search_analyze_limit",
          "search_allow_icloud",
          "search_ocr",
        ].forEach((k) => setValue(k, c[k]));
        if ($("#dupDhashValue")) {
          $("#dupDhashValue").textContent = String(
            c.duplicates_dhash_distance ?? 5,
          );
        }
        $("#notify_token").value = "";
        $("#notifyTokenHint").textContent = c.notify_token_saved
          ? "· salvo ✓"
          : "";
        $("#notify_token").placeholder = c.notify_token_saved
          ? "token salvo · digite para substituir"
          : "cole uma vez";
        $("#qualityValue").textContent = c.quality ?? 90;
        $$(".media").forEach(
          (x) =>
            (x.checked = String(c.media_filter || "")
              .split(",")
              .includes(x.value)),
        );
        $$("#sourceScope button").forEach((b) =>
          b.classList.toggle(
            "active",
            b.dataset.value === (c.source_scope || "local"),
          ),
        );
      }
      function readConfig() {
        const c = { ...config };
        [
          "quality",
          "destination_album_name",
          "commit_mode",
          "delete_strategy",
          "sort",
          "allow_icloud",
          "preserve_albums",
          "dedupe_created",
          "metadata_strict",
          "min_saving_percent",
          "sync_source_max_mb",
          "icloud_retry_count",
          "icloud_retry_base_delay",
          "icloud_retry_max_delay",
          "icloud_circuit_failures",
          "icloud_circuit_cooldown",
          "icloud_circuit_max_cycles",
          "icloud_inter_request_delay",
          "max_megapixels",
          "max_items",
          "memory_reserve_mb",
          "memory_cleanup_available_mb",
          "checkpoint_every",
          "direction",
          "favorite",
          "hidden",
          "auto_run",
          "auto_action",
          "notify_enabled",
          "notify_device_id",
          "notify_title",
          "notify_symbol",
          "notify_tint",
          "notify_update_interval",
          "notify_keep_for",
          "notify_eta",
          "notify_metrics",
          "duplicates_source_photos",
          "duplicates_source_drive",
          "duplicates_photo_scope",
          "duplicates_allow_icloud",
          "duplicates_include_photos",
          "duplicates_include_screenshots",
          "duplicates_include_live",
          "duplicates_drive_images",
          "duplicates_drive_documents",
          "duplicates_drive_recursive",
          "duplicates_drive_hidden",
          "duplicates_exact",
          "duplicates_visual",
          "duplicates_dhash_distance",
          "duplicates_aspect_tolerance_percent",
          "duplicates_size_tolerance_percent",
          "duplicates_time_window_days",
          "duplicates_min_size_mb",
          "duplicates_max_visual_candidates",
          "duplicates_keeper",
          "quality_photo_scope",
          "quality_allow_icloud",
          "quality_include_photos",
          "quality_include_screenshots",
          "quality_include_live",
          "quality_include_hidden",
          "quality_only_flagged",
          "quality_blur_threshold",
          "quality_min_megapixels",
          "quality_dark_fraction",
          "quality_bright_fraction",
          "quality_min_contrast",
          "quality_scan_limit",
          "search_analyze_limit",
          "search_allow_icloud",
          "search_ocr",
        ].forEach((k) => (c[k] = value(k)));
        c.notify_token = $("#notify_token").value.trim();
        c.media_filter = selectedMedia() || "photo,screenshot,live_photo";
        c.source_scope =
          $("#sourceScope button.active")?.dataset.value || "local";
        c.auto_prepare_manifest = true;
        c.threads = 1;
        c.terminal_progress = false;
        return c;
      }
      function scheduleSave() {
        $("#saveState").textContent = "salvando…";
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          try {
            config = readConfig();
            await api("/api/config", {
              method: "POST",
              body: JSON.stringify({ config }),
            });
            $("#saveState").textContent = "config salva";
          } catch (e) {
            $("#saveState").textContent = "falha ao salvar";
          }
        }, 350);
      }
      function renderAlbums(albums) {
        const values = Array.isArray(albums) ? albums : [];
        $("#albumList").innerHTML = values
          .map(
            (a) =>
              `<option value="${String(a).replaceAll('"', "&quot;")}">`,
          )
          .join("");
      }

      async function loadAlbums() {
        try {
          const j = await api("/api/albums");
          renderAlbums(j.albums || []);
        } catch {}
      }

      async function startJob(action) {
        config = readConfig();
        try {
          const j = await api("/api/job/start", {
            method: "POST",
            body: JSON.stringify({ action, config, replace: true }),
          });
          toast(
            j.replacing
              ? "Job atual será parado e substituído"
              : "Job enfileirado",
          );
          scheduleSave();
          setTimeout(() => {
            refresh();
            refreshTerminal();
          }, 80);
        } catch (e) {
          toast(`Erro: ${e.message}`);
        }
      }
      async function stopJob() {
        try {
          await api("/api/job/stop", { method: "POST", body: "{}" });
          toast("Parada solicitada");
        } catch (e) {
          toast(e.message);
        }
      }
      function renderNotifyPreview(notify, fallbackPct, current) {
        const payload = notify?.last_payload || {};
        const rawProgress =
          payload.progress == null
            ? Number(fallbackPct || 0)
            : Number(payload.progress || 0);
        const pct = Math.max(0, Math.min(100, rawProgress));

        $("#notifyPreviewTitle").textContent =
          config.notify_title || "Photo Manager";
        $("#notifyPreviewPct").textContent = formatPercent(pct);
        $("#notifyPreviewFill").style.width = `${pct}%`;

        const fallbackBody = current
          ? current.tool === "scanner"
            ? "Scanning photo library"
            : "Compressing photos"
          : "Aguardando processamento…";

        $("#notifyPreviewBody").textContent =
          payload.body || fallbackBody;

        const metrics = Array.isArray(payload.metrics)
          ? payload.metrics
          : [];

        $("#notifyPreviewMetrics").innerHTML = metrics.length
          ? metrics
              .slice(0, 6)
              .map(
                (m) =>
                  `<span class="notify-live-metric">${htmlEscape(m.label || "")}: ${htmlEscape(m.value || "")}</span>`,
              )
              .join("")
          : `<span class="notify-live-metric">PROGRESS: ${htmlEscape(formatPercent(pct))}</span>`;
      }

      const jobLabels = {
        locality: "Scanner de localidade",
        snapshot_generate: "Gerando snapshot",
        catalog_update: "Atualizando catálogo",
        catalog_rebuild: "Reconstruindo catálogo",
        process: "Comprimindo fotos",
        scan_then_process: "Scan e compressão",
        flush_replacements: "Confirmando substituições",
        duplicates_pick_drive: "Escolhendo pasta do Drive",
        duplicates_scan: "Procurando duplicadas",
        duplicates_apply: "Aplicando seleção de duplicadas",
        quality_scan: "Analisando qualidade",
        search_index: "Indexando metadados",
        search_analyze: "Analisando imagens",
        search_import_labels: "Importando etiquetas",
        search_import_vectors: "Importando vetores",
        search_group_faces: "Agrupando rostos",
        search_retry_previews: "Recuperando previews",
        search_export_metadata: "Exportando metadados",
      };

      function catalogProgress(status = {}) {
        const stages = Object.values(status.catalog?.stages || {});
        const active = stages.find((stage) => ["running", "building", "checking"].includes(String(stage?.status || "")));
        if (active) return Number(active.progress_percent || 0);
        const known = stages.filter((stage) => Number.isFinite(Number(stage?.progress_percent)));
        return known.length
          ? known.reduce((sum, stage) => sum + Number(stage.progress_percent || 0), 0) / known.length
          : 0;
      }

      function setPageJobIndicator(page, visible, title = "", detail = "", progress = 0) {
        const box = $(`#${page}JobIndicator`);
        if (!box) return;
        box.hidden = !visible;
        if (!visible) return;
        const pct = Math.max(0, Math.min(100, Number(progress || 0)));
        $(`#${page}JobTitle`).textContent = title;
        $(`#${page}JobText`).textContent = detail;
        $(`#${page}JobPct`).textContent = formatPercent(pct);
        $(`#${page}JobFill`).style.width = `${pct}%`;
      }

      function renderPageJobIndicators(status, cur, ap) {
        const action = String(cur?.action || "");
        const tool = String(cur?.tool || "");
        const stage = String(cur?.stage || "");
        const isCatalog = ["catalog_update", "catalog_rebuild"].includes(action) || tool === "catalog";
        const isDuplicates = tool === "duplicates" || action.startsWith("duplicates_");
        const isQuality = tool === "quality" || action === "quality_scan";
        const isSearch = tool === "search" || action.startsWith("search_") || isCatalog;
        const isOverview = !!cur && ((!isDuplicates && !isQuality && !isSearch) || isCatalog);
        const pct = isCatalog ? catalogProgress(status) : Number(ap?.progress_percent || 0);
        const cursor = Number(ap?.cursor || 0);
        const total = Number(ap?.total || 0);
        const detail = `${stage || tool || "iniciando"}${total > 0 ? ` · ${cursor.toLocaleString("pt-BR")} / ${total.toLocaleString("pt-BR")}` : ""}`;
        const title = jobLabels[action] || (action ? action.replaceAll("_", " ") : "Job em execução");
        setPageJobIndicator("overview", isOverview, title, detail, pct);
        setPageJobIndicator("duplicates", !!cur && isDuplicates, title, detail, pct);
        setPageJobIndicator("quality", !!cur && isQuality, title, detail, pct);
        setPageJobIndicator("search", !!cur && isSearch, title, detail, pct);
        const toggle = $("#terminalToggleBtn");
        toggle?.classList.toggle("running", !!cur);
        if (toggle) toggle.title = cur ? `${title} · ${detail}` : "Abrir terminal";
      }

      function setTerminalOpen(open) {
        terminalOpen = !!open;
        const panel = $("#floatingTerminal");
        const button = $("#terminalToggleBtn");
        if (!panel || !button) return;
        panel.hidden = !terminalOpen;
        button.classList.toggle("active", terminalOpen);
        button.setAttribute("aria-expanded", terminalOpen ? "true" : "false");
        if (terminalOpen && $("#terminalAutoscroll")?.checked) {
          const term = $("#terminal");
          requestAnimationFrame(() => { term.scrollTop = term.scrollHeight; });
        }
      }

      function renderStatus(s) {
        lastStatus = s;
        const r = s.runtime || {},
          cur = r.current,
          ap = s.active_progress,
          worker = s.worker || {};
        const workerOk = worker.responsive === true;
        $("#workerBadge").textContent = cur
          ? `rodando · ${jobLabels[cur.action] || cur.action || cur.tool}`
          : workerOk
            ? `worker ${worker.phase || "ready"}`
            : `worker ${worker.phase || "parado"}`;
        $("#workerBadge").classList.toggle("ok", workerOk);
        $("#workerBadge").classList.toggle("bad", !workerOk);
        $("#workerBadge").classList.toggle("live", !!cur);
        const comp = s.compressor || {},
          scan = s.scanner || {},
          notify = s.notify || {};
        renderCatalog(s.catalog || {}, s.search || {});
        renderPageJobIndicators(s, cur, ap);
        const nb = $("#notifyBadge");
        if (!notify.effective_enabled && !notify.enabled) {
          nb.textContent = "off";
          nb.className = "worker-badge";
        } else if (!notify.configured) {
          nb.textContent = "configurar";
          nb.className = "worker-badge warn";
        } else if (notify.active) {
          nb.textContent = "LIVE";
          nb.className = "worker-badge live";
        } else if (notify.last_error) {
          nb.textContent = "erro";
          nb.className = "worker-badge bad";
        } else {
          nb.textContent = "pronto";
          nb.className = "worker-badge ok";
        }
        let pct = 0,
          label = "ocioso",
          title = "Pronto para começar",
          sub = "Nenhum job ativo.";
        if (cur && ap) {
          pct = ap.progress_percent || 0;
          label = cur.tool === "scanner" ? "scanner" : "compressor";

          const compressorState =
            String(comp.status || "").toLowerCase();
          const compressorReachedEnd =
            cur.tool === "compressor" &&
            Number(ap.total || 0) > 0 &&
            Number(ap.cursor || 0) >= Number(ap.total || 0);

          title =
            cur.tool === "scanner"
              ? "Mapeando a fototeca"
              : compressorReachedEnd ||
                  compressorState === "complete"
                ? "Finalizando lote"
                : "Comprimindo fotos";

          sub = `${(ap.cursor || 0).toLocaleString()} de ${(ap.total || 0).toLocaleString()} · ${cur.stage || ""}`;
        } else if (r.pending) {
          label = "fila";
          title = "Próximo job preparado";
          sub = `${r.pending.action}`;
        }
        $("#ring").style.setProperty("--p", Math.max(0, Math.min(100, pct)));
        $("#progressPct").textContent = formatPercent(pct);
        renderNotifyPreview(notify, pct, cur);
        $("#progressLabel").textContent = label;
        $("#jobTitle").textContent = title;
        $("#jobSub").textContent = sub;
        $("#etaPill").textContent = `ETA ${fmtDur(ap?.eta_seconds)}`;
        $("#ratePill").textContent = ap?.rate_per_second
          ? `${ap.rate_per_second.toFixed(2)}/s`
          : "0/s";
        $("#sourcePill").textContent =
          `fonte ${config.source_scope || "local"}`;
        $("#savingPill").textContent =
          `${fmtBytes(comp.saved_bytes)} economizados`;
        $("#mProcessed").textContent = (comp.processed || 0).toLocaleString();
        $("#mCompressed").textContent = (comp.compressed || 0).toLocaleString();
        $("#mSaved").textContent = fmtBytes(comp.saved_bytes);
        $("#mSavedPct").textContent =
          `${Number(comp.saving_percent || 0).toFixed(1)}% acumulado`;
        $("#mProjected").textContent = fmtBytes(comp.projected_savings_bytes);
        $("#mCloud").textContent = (scan.icloud_only || 0).toLocaleString();
        $("#mLocal").textContent =
          `${(scan.local || 0).toLocaleString()} locais`;
        const pending = Number(s.pending_replacements?.count || 0);
        $("#flushBtn").textContent =
          `🗑 Confirmar exclusão em lote · ${pending.toLocaleString()} pendente${pending === 1 ? "" : "s"}`;
        $("#flushBtn").disabled = pending === 0;
        const inflight = s.current_item || {};
        const cooldown = inflight.phase === "icloud_cooldown";
        const permLabel = s.permission?.status || "Photos";
        const permSource = s.permission?.source
          ? `/${s.permission.source}`
          : "";
        const dc = Number(s.http?.client_disconnects || 0);
        const dcText = dc > 0 ? ` · ${dc} polls cancelados pelo Safari` : "";
        $("#footerStatus").textContent = cur
          ? `${cooldown ? `iCloud cooldown ${Math.round(Number(inflight.retry_in_seconds || 0))}s` : title} · memória livre ${fmtBytes(s.memory?.available_bytes)} · disco ${fmtBytes(s.disk?.free_bytes)} · ${pending} exclusões pendentes${dcText}`
          : `Servidor ativo · ${permLabel}${permSource} · ${pending} exclusões pendentes${dcText}`;
        const compressorTerminalState = [
          "complete",
          "paused",
          "error",
        ].includes(
          String(comp.status || "").toLowerCase(),
        );

        renderPreview({
          current: s.current_preview || null,
          successful: s.previews || [],
          inflight: s.current_item || null,
          running:
            !!cur &&
            cur.tool === "compressor" &&
            !compressorTerminalState,
        });
      }
      function renderCatalog(catalog, search = {}) {
        const labels = {idle:"Aguardando", running:"Em andamento", building:"Em andamento",
          complete:"Concluído", complete_with_warnings:"Concluído com avisos",
          unchanged:"Sem alterações", error:"Falhou", stopped:"Interrompido",
          pending:"Pendente", checking:"Verificando mudanças"};
        for (const [key, prefix] of [["scan","Scan"],["index","Index"],["categorize","Categorize"]]) {
          const stage = catalog.stages?.[key] || {};
          const pct = Math.max(0, Math.min(100, Number(stage.progress_percent || 0)));
          const pending = catalog.pending?.[key] || {};
          const cursor = Number(pending.cursor ?? stage.effective_cursor ?? stage.cursor ?? 0);
          const total = Number(pending.total ?? stage.total ?? 0);
          const ids = Array.isArray(pending.ids) ? pending.ids : [];
          $("#catalog" + prefix + "Fill").style.width = `${pct}%`;
          $("#catalog" + prefix + "Pct").textContent = formatPercent(pct);
          $("#catalog" + prefix + "Text").textContent = labels[stage.status] || stage.phase || stage.status || "Aguardando";
          $("#catalog" + prefix + "Cursor").textContent =
            `cursor ${cursor.toLocaleString("pt-BR")} / ${total.toLocaleString("pt-BR")} · ${Number(pending.count || 0).toLocaleString("pt-BR")} pendentes`;
          $("#catalog" + prefix + "Pending").textContent = ids.length
            ? ids.join(" · ")
            : "nenhum ID pendente";
        }
        const message = $("#catalogMessage");
        message.textContent = catalog.message || "Aguardando verificação da Fototeca.";
        message.className = `catalog-message ${catalog.status === "unchanged" ? "unchanged" : catalog.status === "error" ? "error" : ""}`;

        const retry = search.retry || {};
        $("#catalogRetryText").textContent = Number(retry.total || 0)
          ? `${Number(retry.total).toLocaleString("pt-BR")} na fila · ${Number(retry.due || 0).toLocaleString("pt-BR")} prontos agora`
          : "Nenhum retry pendente";
        $("#catalogRetryBtn").disabled = Number(retry.total || 0) === 0;

        const exports = Array.isArray(search.exports) ? search.exports : [];
        $("#catalogExports").innerHTML = exports.length
          ? exports.slice(0, 5).map((item) =>
              `<a href="${hostedShell ? "#" : htmlEscape(item.download_url)}" data-export-url="${htmlEscape(item.download_url)}" download>${htmlEscape(item.name)}</a>`,
            ).join("")
          : "Nenhuma exportação gerada.";

        const history = Array.isArray(catalog.history) ? catalog.history : [];
        $("#catalogHistoryList").innerHTML = history.length
          ? history.map((item) => {
              const date = item.recorded_at
                ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.recorded_at))
                : "—";
              const status = labels[item.status] || item.status || "—";
              const mode = item.mode === "rebuild" ? "rebuild" : "delta";
              const ids = [...(item.changed_ids || []), ...(item.deleted_ids || [])]
                .slice(0, 4).join(" · ");
              return `<div class="catalog-history-item"><strong>${htmlEscape(status)}</strong><span>${htmlEscape(date)} · ${mode}</span><b>+${Number(item.change_count || 0).toLocaleString("pt-BR")} / −${Number(item.deleted_count || 0).toLocaleString("pt-BR")}</b>${ids ? `<code title="${htmlEscape(ids)}">${htmlEscape(ids)}</code>` : ""}</div>`;
            }).join("")
          : "Nenhuma atualização registrada.";
      }
      function renderPreview({ current, successful, inflight, running }) {
        let p = null,
          live = false;

        const inflightId =
          String(inflight?.local_id || "");
        const currentId =
          String(current?.local_id || "");

        const currentMatchesInflight =
          !!current &&
          (
            !inflightId ||
            !currentId ||
            currentId === inflightId
          );

        if (
          running &&
          currentMatchesInflight
        ) {
          p = current;
          live = true;
        } else if (
          !running &&
          successful?.length
        ) {
          p = successful[0];
        }

        if (!p) {
          $("#previewImg").hidden = true;
          $("#previewMeta").hidden = true;
          $("#previewAlbums").textContent = "";
          $("#previewOpen").hidden = true;
          $("#previewOpen").dataset.photosId = "";
          $("#previewEmpty").hidden = false;
          $("#previewEmpty").textContent =
            running && inflight
              ? `Processando ${inflight.source_filename || inflight.local_id || "imagem"}…`
              : "O último comprimido aparece aqui ✦";
          return;
        }

        $("#previewEmpty").hidden = true;
        $("#previewMeta").hidden = false;

        const imageAvailable = p.image_available !== false && !!p.url;
        $("#previewImg").hidden = !imageAvailable;

        if (imageAvailable) {
          const key = `${p.url}|${p.nonce || p.created_at || ""}`;
          if ($("#previewImg").dataset.src !== key) {
            $("#previewImg").src =
              mediaUrl(p.url) + (mediaUrl(p.url).includes("?") ? "&" : "?") +
              "t=" + encodeURIComponent(p.nonce || Date.now());
            $("#previewImg").dataset.src = key;
          }
        }

        const status = String(p.status || "compressed");
        const reason = String(p.reason || "");
        const badge = $("#previewBadge");
        badge.className =
          "badge " +
          (status === "compressed"
            ? "ok"
            : status === "skipped"
              ? "skip"
              : status === "error"
                ? "err"
                : "");
        badge.textContent = live
          ? status === "encoded"
            ? "analisando"
            : status === "compressed"
              ? "comprimida"
              : status === "skipped"
                ? "skip"
                : status
          : "última comprimida";

        $("#previewName").textContent = p.filename || "imagem";

        const saved = Number(p.saved_bytes || 0);
        const pct = Number(p.saved_percent || 0);
        const stillInput = Number(p.encoder_source_bytes || 0);
        const motion = Number(p.live_motion_bytes || 0);
        const output = Number(p.output_bytes || 0);
        const isLiveBasis = String(p.savings_basis || "").startsWith(
          "live_photo",
        );
        

        let saving =
          saved > 0
            ? `−${fmtBytes(saved)} · ${pct.toFixed(1)}% menor`
            : saved < 0
              ? `+${fmtBytes(Math.abs(saved))} maior`
              : "sem economia";

        if (isLiveBasis && motion > 0) {
          const stillDelta = stillInput - output;
          const frameNote =
            stillDelta >= 0
              ? `frame −${fmtBytes(stillDelta)}`
              : `frame +${fmtBytes(Math.abs(stillDelta))}`;
          saving = `${saving} no Live Photo · ${frameNote}`;
        }

        $("#previewSaving").textContent = reason
          ? `${saving} · ${reason.replaceAll("_", " ")}`
          : saving;

        $("#previewAlbums").textContent =
          `Álbuns: ${albumText(p)}`;

        const photosId = p.photos_local_id || "";
        $("#previewOpen").hidden = !photosId;
        $("#previewOpen").dataset.photosId = photosId;
      }
      $("#previewOpen").addEventListener("click", () => {
        const id = $("#previewOpen").dataset.photosId;
        if (id) openPhotosAsset(id);
      });

      function eventBadge(r) {
        const st = String(r.status || "");
        if (st === "compressed") return ["ok", "ok"];
        if (st.includes("error") || r.ok === false) return ["erro", "err"];
        return ["skip", "skip"];
      }
      async function refreshEvents() {
        try {
          const j = await api("/api/results?limit=30"),
            previews = new Map((j.previews || []).map((p) => [p.local_id, p]));
          $("#eventCount").textContent = `${j.results.length} itens`;
          $("#eventList").innerHTML =
            j.results
              .map((r) => {
                const p = previews.get(r.local_id),
                  [txt, cls] = eventBadge(r);
                const name =
                  r.resolved_resource_filename ||
                  p?.filename ||
                  r.local_id ||
                  "item";
                const sb = Number(r.saved_bytes || 0);
                const liveBasis = String(r.savings_basis || "").startsWith(
                  "live_photo",
                );
                const save =
                  sb > 0
                    ? ` · −${fmtBytes(sb)}${liveBasis ? " total Live" : ""}`
                    : sb < 0
                      ? ` · +${fmtBytes(Math.abs(sb))}`
                      : "";
                let reason = String(r.reason || r.source_mode || "").replaceAll(
                  "_",
                  " ",
                );
                if (reason === "sync image request error")
                  reason = "iCloud/Photos download error";
                if (reason === "icloud download failed")
                  reason = "iCloud download failed";
                const photosId =
                  r.photos_local_id ||
                  r.new_local_id ||
                  r.commit?.created?.new_local_id ||
                  p?.photos_local_id ||
                  "";
                const clickable =
                  String(r.status || "") === "compressed" && !!photosId;
                const albums = albumText({
                  albums: r.albums || p?.albums,
                  created_albums: r.created_albums || p?.created_albums,
                });

                return `<div class="event ${clickable ? "event-clickable" : ""}" ${clickable ? `data-photos-id="${htmlEscape(photosId)}" role="button" tabindex="0" title="Abrir no Fotos"` : ""}>
        <div class="thumb">${p ? `<img src="${htmlEscape(mediaUrl(p.url))}" alt="">` : "◫"}</div>
        <div>
          <div class="name">${htmlEscape(name)}</div>
          <div class="meta">${htmlEscape(r.kind || "")}${htmlEscape(save)}${reason ? ` · ${htmlEscape(reason)}` : ""}</div>
          <div class="albums">Álbuns: ${htmlEscape(albums)}</div>
          ${clickable ? `<div class="event-open">Abrir no Fotos ↗</div>` : ""}
        </div>
        <div class="badge ${cls}">${txt}</div>
      </div>`;
              })
              .join("") ||
            `<div class="preview-empty">Nada processado ainda.</div>`;
        } catch {}
      }
      $("#catalogExports").addEventListener("click", async event => {
        const link = event.target.closest("[data-export-url]");
        if (!link || !hostedShell) return;
        event.preventDefault();
        try {
          const path = link.dataset.exportUrl;
          const response = await fetch(bridgeBase + path, {
            headers: { Authorization: `Bearer ${bridgeToken}` }, cache: "no-store",
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blobUrl = URL.createObjectURL(await response.blob());
          const anchor = document.createElement("a");
          anchor.href = blobUrl;
          anchor.download = link.textContent.trim() || "export.jsonl";
          anchor.click();
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } catch (error) { toast(`Exportação: ${error.message}`); }
      });

      $("#eventList").addEventListener("click", (event) => {
        const card = event.target.closest("[data-photos-id]");
        if (!card) return;
        openPhotosAsset(card.dataset.photosId);
      });

      $("#eventList").addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const card = event.target.closest("[data-photos-id]");
        if (!card) return;
        event.preventDefault();
        openPhotosAsset(card.dataset.photosId);
      });

      function routeParams() { return new URLSearchParams(location.search); }
      function writeRouteState(replace = true) {
        const params = routeParams();
        const active = $(".app-tab[aria-selected='true']")?.dataset.tab || "overview";
        params.set("tab", active);
        if (active === "search") {
          const query = $("#searchInput")?.value.trim() || "";
          query ? params.set("q", query) : params.delete("q");
          params.set("sort", $("#searchSort")?.value || "newest");
          searchState?.similarTo ? params.set("similar", searchState.similarTo) : params.delete("similar");
          params.set("distance", $("#searchDistance")?.value || "8");
          searchState?.selected?.local_id ? params.set("photo", searchState.selected.local_id) : params.delete("photo");
        } else {
          ["q","sort","similar","distance","photo"].forEach(key => params.delete(key));
        }
        const url = `${location.pathname}?${params.toString()}#${active}`;
        history[replace ? "replaceState" : "pushState"]({tab: active}, "", url);
      }

      function setActiveTab(name, updateUrl = true, replace = false) {
        const normalized = ["overview", "duplicates", "quality", "search"].includes(name)
          ? name
          : "overview";

        $$(".app-tab").forEach((button) => {
          const active = button.dataset.tab === normalized;
          button.setAttribute("aria-selected", active ? "true" : "false");
          button.tabIndex = active ? 0 : -1;
        });

        $("#viewOverview").hidden = normalized !== "overview";
        $("#viewDuplicates").hidden = normalized !== "duplicates";
        $("#viewQuality").hidden = normalized !== "quality";
        $("#viewSearch").hidden = normalized !== "search";

        if (updateUrl) writeRouteState(replace);

        if (normalized === "duplicates") refreshDuplicates(true);
        if (normalized === "quality") refreshQuality(true);
        if (normalized === "search") refreshSearch(true);
      }

      function initTabs() {
        $$(".app-tab").forEach((button) => {
          button.addEventListener("click", () => {
            setActiveTab(button.dataset.tab, true, false);
          });

          button.addEventListener("keydown", (event) => {
            if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
            event.preventDefault();
            const tabs = $$(".app-tab");
            const index = tabs.indexOf(button);
            const direction = event.key === "ArrowRight" ? 1 : -1;
            const next = tabs[(index + direction + tabs.length) % tabs.length];
            next.focus();
            setActiveTab(next.dataset.tab);
          });
        });

        const requestedTab = routeParams().get("tab") || location.hash.slice(1);
        setActiveTab(
          requestedTab === "duplicates"
            ? "duplicates"
            : requestedTab === "search"
              ? "search"
            : requestedTab === "quality"
              ? "quality"
              : "overview",
          false,
        );
      }

      function duplicateLabel(type) {
        if (type === "exact") return "EXATO";
        if (type === "exact_still") return "LIVE STILL";
        return "VISUAL";
      }

      function duplicateSourceLabel(item) {
        return item.source === "photos" ? "FOTOS" : "DRIVE";
      }

      function duplicateDate(item) {
        const raw = item.creation_date || item.modified_at;
        if (!raw) return "";
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) return "";
        return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
      }

      function updateDuplicateStats(summary = {}) {
        $("#dupStatGroups").textContent = Number(summary.groups || 0).toLocaleString();
        $("#dupStatExact").textContent = Number(summary.exact_groups || 0).toLocaleString();
        $("#dupStatVisual").textContent = Number(summary.visual_groups || 0).toLocaleString();
        $("#dupStatItems").textContent = Number(summary.items_in_groups || 0).toLocaleString();
        $("#dupStatBytes").textContent = fmtBytes(summary.reclaimable_bytes || 0);
      }

      function renderDuplicateStatus(status = {}, drive = {}) {
        duplicateState.status = status;
        duplicateState.drive = drive || status.drive || {};

        const phase = String(status.phase || "idle");
        const pct = Number(status.progress_percent || 0);
        const current = status.current_item;
        const labels = {
          inventory: "Montando inventário",
          exact_hash: "Confirmando SHA-256",
          visual_hash: "Comparando visualmente",
          complete: "Scanner concluído",
          stopped: "Scanner pausado",
          idle: "Pronto",
        };

        $("#dupProgressFill").style.width = `${Math.max(0, Math.min(100, pct))}%`;
        $("#dupProgressPct").textContent = formatPercent(pct);
        $("#dupProgressLabel").textContent = current?.name
          ? `${labels[phase] || phase} · ${current.name}`
          : labels[phase] || phase;

        const driveState = duplicateState.drive || {};
        $("#dupDriveTitle").textContent = driveState.configured
          ? driveState.root_name || "Pasta selecionada"
          : "Nenhuma pasta escolhida";
        $("#dupDriveRoot").textContent = driveState.configured
          ? `${driveState.readable ? "✓ " : "⚠ "}${driveState.root || ""}`
          : "Escolha uma pasta pelo seletor nativo do Files.";

        if (status.summary) updateDuplicateStats(status.summary);
      }

      function duplicateItemHtml(item, group) {
        const itemId = String(item.item_id || "");
        const selected = duplicateState.selected.has(itemId);
        const keeper = String(group.keeper_id || "") === itemId;
        const preview = item.preview_url;
        const date = duplicateDate(item);
        const ext = String(item.suffix || item.name?.split(".").pop() || "FILE")
          .replace(".", "")
          .slice(0, 8);

        const media = preview
          ? `<img src="${htmlEscape(mediaUrl(preview))}" alt="Preview de ${htmlEscape(item.name || "arquivo")}" loading="lazy">`
          : `<div class="document-preview"><div><div class="document-glyph">${item.category === "document" ? "▤" : "◫"}</div><div class="document-ext">${htmlEscape(ext)}</div></div></div>`;

        const openText = item.source === "photos" ? "Fotos" : "Arquivos";

        return `<article class="duplicate-item ${selected ? "selected" : ""}" data-item-id="${htmlEscape(itemId)}">
          <div class="duplicate-media" data-preview-item="${htmlEscape(itemId)}" role="button" tabindex="0" aria-label="Ampliar ${htmlEscape(item.name || "preview")}">
            ${media}
            <label class="duplicate-select" title="Selecionar para remover">
              <input type="checkbox" data-duplicate-select="${htmlEscape(itemId)}" ${selected ? "checked" : ""} />
            </label>
            <span class="duplicate-source">${duplicateSourceLabel(item)}</span>
            ${keeper ? '<span class="keeper-flag">MANTER</span>' : ""}
          </div>
          <div class="duplicate-item-info">
            <div class="duplicate-item-name" title="${htmlEscape(item.name || "")}">${htmlEscape(item.name || itemId || "Arquivo")}</div>
            <div class="duplicate-item-meta">
              ${fmtBytes(item.bytes || 0)}
              ${item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
              ${date ? ` · ${htmlEscape(date)}` : ""}
              ${item.albums?.length ? `<br>${htmlEscape(item.albums.join(" · "))}` : ""}
            </div>
            <div class="duplicate-item-actions">
              <button class="mini-btn" type="button" data-keep-item="${htmlEscape(itemId)}" data-group-id="${htmlEscape(group.group_id || "")}">Manter</button>
              <button class="mini-btn" type="button" data-open-item="${htmlEscape(itemId)}">Abrir em ${openText}</button>
            </div>
          </div>
        </article>`;
      }

      function renderDuplicateGroups(groups) {
        duplicateState.groups = Array.isArray(groups) ? groups : [];

        if (!duplicateState.groups.length) {
          $("#duplicateGroups").innerHTML = `<div class="panel duplicate-empty"><div><strong>Nenhum grupo para mostrar</strong>Ajuste os parâmetros ou rode um novo scan.</div></div>`;
          updateDuplicateSelectionBar();
          return;
        }

        $("#duplicateGroups").innerHTML = duplicateState.groups
          .map((group, index) => {
            const type = String(group.match_type || "visual");
            const exactButton = group.bulk_safe
              ? `<button class="btn" type="button" data-select-group="${htmlEscape(group.group_id || "")}">Selecionar cópias</button>`
              : "";

            return `<section class="panel duplicate-group">
              <div class="duplicate-group-head">
                <div class="duplicate-group-copy">
                  <div class="duplicate-group-title">
                    <span class="match-badge ${htmlEscape(type)}">${duplicateLabel(type)}</span>
                    Grupo ${index + 1} · ${Number(group.count || 0)} itens
                  </div>
                  <div class="duplicate-group-meta">${htmlEscape(group.reason || "")} · confiança ${Number(group.confidence || 0).toFixed(1)}% · ${fmtBytes(group.reclaimable_bytes || 0)} recuperáveis</div>
                </div>
                ${exactButton}
              </div>
              <div class="duplicate-items">${(group.items || []).map((item) => duplicateItemHtml(item, group)).join("")}</div>
            </section>`;
          })
          .join("");

        updateDuplicateSelectionBar();
      }

      function findDuplicateItem(itemId) {
        for (const group of duplicateState.groups) {
          const item = (group.items || []).find(
            (candidate) => String(candidate.item_id) === String(itemId),
          );
          if (item) return { item, group };
        }
        return null;
      }

      function setGroupKeeper(groupId, itemId) {
        const group = duplicateState.groups.find(
          (candidate) => String(candidate.group_id) === String(groupId),
        );
        if (!group) return;
        group.keeper_id = itemId;
        duplicateState.selected.delete(String(itemId));
        renderDuplicateGroups(duplicateState.groups);
      }

      function selectGroupExtras(groupId) {
        const group = duplicateState.groups.find(
          (candidate) => String(candidate.group_id) === String(groupId),
        );
        if (!group) return;
        for (const item of group.items || []) {
          const id = String(item.item_id || "");
          if (!id) continue;
          if (id === String(group.keeper_id || "")) duplicateState.selected.delete(id);
          else duplicateState.selected.add(id);
        }
        renderDuplicateGroups(duplicateState.groups);
      }

      function selectAllExactExtras() {
        for (const group of duplicateState.groups) {
          if (!group.bulk_safe || group.match_type !== "exact") continue;
          for (const item of group.items || []) {
            const id = String(item.item_id || "");
            if (!id) continue;
            if (id === String(group.keeper_id || "")) duplicateState.selected.delete(id);
            else duplicateState.selected.add(id);
          }
        }
        renderDuplicateGroups(duplicateState.groups);
      }

      function updateDuplicateSelectionBar() {
        let bytes = 0;
        for (const id of duplicateState.selected) {
          const found = findDuplicateItem(id);
          if (found) bytes += Number(found.item.bytes || 0);
        }

        const count = duplicateState.selected.size;
        $("#duplicateSelectionBar").classList.toggle("show", count > 0);
        $("#dupSelectedCount").textContent = `${count.toLocaleString()} selecionado${count === 1 ? "" : "s"}`;
        $("#dupSelectedBytes").textContent = fmtBytes(bytes);

        $$("[data-duplicate-select]").forEach((input) => {
          const selected = duplicateState.selected.has(String(input.dataset.duplicateSelect || ""));
          input.checked = selected;
          input.closest(".duplicate-item")?.classList.toggle("selected", selected);
        });
      }

      function showDuplicatePreview(itemId) {
        const found = findDuplicateItem(itemId);
        if (!found) return;
        const { item } = found;
        const dialog = $("#duplicateDialog");
        const media = $("#duplicateDialogMedia");

        media.innerHTML = item.preview_url
          ? `<img src="${htmlEscape(mediaUrl(item.preview_url))}" alt="${htmlEscape(item.name || "Preview")}">`
          : `<div class="document-preview"><div><div class="document-glyph">▤</div><div class="document-ext">${htmlEscape(item.suffix || "documento")}</div></div></div>`;

        $("#duplicateDialogTitle").textContent = item.name || "Preview";
        $("#duplicateDialogMeta").textContent = `${duplicateSourceLabel(item)} · ${fmtBytes(item.bytes || 0)}`;
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
      }

      function openDuplicateItem(itemId) {
        const found = findDuplicateItem(itemId);
        if (!found) return;
        const { item } = found;
        if (item.source === "photos" && item.local_id) {
          openPhotosAsset(item.local_id);
          return;
        }
        if (item.source === "drive") {
          window.location.href = "shareddocuments://";
        }
      }

      async function refreshDuplicateResults() {
        const result = await api("/api/duplicates/results?offset=0&limit=250");
        duplicateState.result = result;
        updateDuplicateStats(result.summary || {});
        renderDuplicateGroups(result.groups || []);
        $("#dupResultsSubtitle").textContent = result.created_at
          ? `${Number(result.total_groups || 0).toLocaleString()} grupos · scan ${new Date(result.created_at).toLocaleString("pt-BR")}`
          : "Rode o scanner para montar os grupos.";
        return result;
      }

      async function refreshDuplicateStatus() {
        try {
          const response = await api("/api/duplicates/status");
          const status = response.duplicates || {};
          renderDuplicateStatus(status, response.drive || {});

          if (
            status.status === "complete" &&
            status.scan_id &&
            status.scan_id !== duplicateState.lastCompletedScanId
          ) {
            duplicateState.lastCompletedScanId = status.scan_id;
            await refreshDuplicateResults();
          }
        } catch {}
      }

      async function refreshDuplicates(includeResults = false) {
        await refreshDuplicateStatus();
        if (includeResults) {
          try {
            const result = await refreshDuplicateResults();
            if (result.scan_id) duplicateState.lastCompletedScanId = result.scan_id;
          } catch {}
        }
      }

      async function startDuplicateAction(action, payload = null) {
        config = readConfig();
        const result = await api("/api/job/start", {
          method: "POST",
          body: JSON.stringify({
            action,
            replace: true,
            config,
            payload,
          }),
        });
        scheduleSave();
        return result;
      }

      async function applyDuplicateSelection() {
        if (!duplicateState.selected.size) return;
        const visualSelected = [...duplicateState.selected].some((id) => {
          const found = findDuplicateItem(id);
          return found?.group?.match_type === "visual";
        });
        const message = visualSelected
          ? "Há imagens apenas visualmente parecidas na seleção. Fotos serão enviadas para Apagados do Photos e arquivos do Drive serão movidos para “_PhotoManager Duplicates”. Continuar?"
          : "Remover as cópias selecionadas? O Photo Manager preserva pelo menos 1 item de cada grupo.";
        if (!window.confirm(message)) return;

        await startDuplicateAction("duplicates_apply", {
          item_ids: [...duplicateState.selected],
        });
        duplicateState.selected.clear();
        updateDuplicateSelectionBar();
        toast("Remoção enfileirada");
        setTimeout(() => refreshDuplicates(true), 1400);
      }

      function initDuplicateEvents() {
        $("#duplicates_dhash_distance")?.addEventListener("input", (event) => {
          $("#dupDhashValue").textContent = String(event.target.value);
          scheduleSave();
        });

        $("#duplicatesScanBtn")?.addEventListener("click", async () => {
          try {
            await startDuplicateAction("duplicates_scan");
            toast("Scanner de duplicados iniciado");
            setTimeout(refreshDuplicateStatus, 350);
          } catch (error) {
            toast(`Duplicates: ${error.message}`);
          }
        });

        $("#duplicatesPickDriveBtn")?.addEventListener("click", async () => {
          try {
            await startDuplicateAction("duplicates_pick_drive");
            toast("Volte ao Pyto e escolha a pasta no Files");
          } catch (error) {
            toast(`Files: ${error.message}`);
          }
        });

        $("#dupSelectExactBtn")?.addEventListener("click", selectAllExactExtras);
        $("#dupClearSelectionBtn")?.addEventListener("click", () => {
          duplicateState.selected.clear();
          updateDuplicateSelectionBar();
        });
        $("#dupApplyBtn")?.addEventListener("click", applyDuplicateSelection);

        $("#duplicateGroups")?.addEventListener("change", (event) => {
          const input = event.target.closest("[data-duplicate-select]");
          if (!input) return;
          const id = String(input.dataset.duplicateSelect || "");
          if (input.checked) {
            const found = findDuplicateItem(id);
            if (found && String(found.group.keeper_id || "") === id) {
              toast("Esse item está marcado para manter. Escolha outro keeper primeiro.");
              input.checked = false;
              return;
            }
            duplicateState.selected.add(id);
          } else {
            duplicateState.selected.delete(id);
          }
          updateDuplicateSelectionBar();
        });

        $("#duplicateGroups")?.addEventListener("click", (event) => {
          const selectGroup = event.target.closest("[data-select-group]");
          if (selectGroup) {
            selectGroupExtras(selectGroup.dataset.selectGroup);
            return;
          }
          const keep = event.target.closest("[data-keep-item]");
          if (keep) {
            setGroupKeeper(keep.dataset.groupId, keep.dataset.keepItem);
            return;
          }
          const open = event.target.closest("[data-open-item]");
          if (open) {
            openDuplicateItem(open.dataset.openItem);
            return;
          }
          const preview = event.target.closest("[data-preview-item]");
          if (preview && !event.target.closest("input,label")) {
            showDuplicatePreview(preview.dataset.previewItem);
          }
        });

        $("#duplicateGroups")?.addEventListener("keydown", (event) => {
          if (!["Enter", " "].includes(event.key)) return;
          const preview = event.target.closest("[data-preview-item]");
          if (!preview) return;
          event.preventDefault();
          showDuplicatePreview(preview.dataset.previewItem);
        });

        $("#duplicateDialogClose")?.addEventListener("click", () => {
          $("#duplicateDialog").close();
        });
      }

      function initPwa() {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.register("./sw.js").catch(() => {});
        }

        window.addEventListener("beforeinstallprompt", (event) => {
          event.preventDefault();
          deferredInstallPrompt = event;
        });

        $("#pwaInstallBtn")?.addEventListener("click", async () => {
          if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice.catch(() => null);
            deferredInstallPrompt = null;
            return;
          }
          const dialog = $("#pwaDialog");
          if (typeof dialog.showModal === "function") dialog.showModal();
          else dialog.setAttribute("open", "");
        });

        $("#pwaDialogClose")?.addEventListener("click", () => {
          $("#pwaDialog").close();
        });
      }

      function terminalEscape(s) {
        return String(s ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
      }
      function terminalErrorPayload(row) {
        return {
          seq: row.seq,
          created_at: row.created_at,
          updated_at: row.updated_at,
          event: row.event,
          level: row.level,
          message: row.message,
          data: row.data,
        };
      }
      function showTerminalError(row) {
        if (!row || String(row.level || "").toLowerCase() !== "error") return;
        terminalLastError = terminalErrorPayload(row);
        $("#terminalErrorPanel").hidden = false;
        $("#terminalErrorTitle").textContent =
          row.message || row.event || "Erro";
        $("#terminalErrorJson").textContent = JSON.stringify(
          terminalLastError,
          null,
          2,
        );
      }
      function renderTerminalRow(row) {
        const count = Number(row.count || 1);
        const level = String(row.level || "info").toLowerCase();
        const isError = level === "error";
        const data = row.data == null ? "" : JSON.stringify(row.data, null, 2);
        return `<details class="term-entry ${isError ? "error" : ""}" data-seq="${row.seq}" ${isError ? "open" : ""}>
    <summary class="term-summary">
      <span class="term-time">${String(row.updated_at || row.created_at || "").slice(11, 19)}</span>
      <span class="term-level ${terminalEscape(level)}">${terminalEscape(level)}</span>
      <span class="term-msg">${terminalEscape(row.message || row.event || "evento")}</span>
      ${count > 1 ? `<span class="term-count">×${count}</span>` : ""}
    </summary>
    ${data ? `<pre class="term-pre">${terminalEscape(data)}</pre>` : ""}
  </details>`;
      }
      function updateTerminal(rows, latest) {
        const term = $("#terminal");
        if (!rows?.length) {
          terminalSeq = Math.max(terminalSeq, Number(latest || 0));
          return;
        }
        term.querySelector(".terminal-empty")?.remove();
        for (const row of rows) {
          terminalRows.set(Number(row.seq), row);
          const old = term.querySelector(`[data-seq="${row.seq}"]`);
          const tmp = document.createElement("div");
          tmp.innerHTML = renderTerminalRow(row);
          const node = tmp.firstElementChild;
          if (old) old.replaceWith(node);
          else term.appendChild(node);
          if (String(row.level || "").toLowerCase() === "error")
            showTerminalError(row);
          terminalSeq = Math.max(terminalSeq, Number(row.seq || 0));
        }
        const max = 180;
        while (term.children.length > max)
          term.removeChild(term.firstElementChild);
        $("#terminalStats").textContent =
          `${terminalRows.size} grupos · seq ${terminalSeq}`;
        const errorCount = [...terminalRows.values()].filter(
          (row) => String(row.level || "").toLowerCase() === "error",
        ).length;
        const badge = $("#terminalToggleBadge");
        badge.textContent = String(errorCount);
        badge.hidden = errorCount === 0;
        if ($("#terminalAutoscroll").checked)
          term.scrollTop = term.scrollHeight;
      }
      async function refreshTerminal() {
        try {
          // Ask for the tail, not only strictly-new seqs, because grouped entries keep
          // the same seq while their ×count is updated.
          const after = Math.max(0, terminalSeq - 12);
          const j = await api(`/api/logs?after=${after}&limit=160`);
          updateTerminal(j.logs || [], j.latest_seq || terminalSeq);
        } catch {}
      }
      async function refresh() {
        try {
          const s = await api("/api/status");
          setConnected(true);
          renderStatus(s);
        } catch (e) {
          setConnected(false);
        }
      }
      const qualityFlagLabels = {
        blurry: "borrada",
        low_resolution: "baixa resolução",
        too_dark: "escura",
        overexposed: "estourada",
        low_contrast: "baixo contraste",
      };
      let qualityLastScanId = null;

      function renderQualityStatus(status = {}) {
        const progress = Number(status.progress_percent || 0);
        $("#qualityProgressFill").style.width = `${Math.max(0, Math.min(100, progress))}%`;
        $("#qualityProgressPct").textContent = formatPercent(progress);
        $("#qualityProgressLabel").textContent = status.status === "running"
          ? `${status.phase || "analisando"} · ${Number(status.cursor || 0).toLocaleString()} / ${Number(status.total || 0).toLocaleString()}`
          : status.status === "complete"
            ? "Concluído"
            : status.status === "stopped" ? "Parado" : "Pronto";
        const summary = status.summary || {};
        $("#qualityStatFlagged").textContent = Number(summary.flagged || 0).toLocaleString();
        $("#qualityStatBlurry").textContent = Number(summary.blurry || 0).toLocaleString();
        $("#qualityStatResolution").textContent = Number(summary.low_resolution || 0).toLocaleString();
        $("#qualityStatExposure").textContent = Number(summary.exposure || 0).toLocaleString();
        $("#qualityStatErrors").textContent = Number(summary.errors || 0).toLocaleString();
      }

      function renderQualityResults(result = {}) {
        const items = Array.isArray(result.items) ? result.items : [];
        const root = $("#qualityResults");
        $("#qualityResultsSubtitle").textContent = result.created_at
          ? `${Number(result.total_items || 0).toLocaleString()} sinalizadas · ${new Date(result.created_at).toLocaleString("pt-BR")}`
          : "Rode o scanner para analisar a Fototeca.";
        if (!items.length) {
          root.innerHTML = `<div class="panel duplicate-empty"><div><strong>Nenhuma foto sinalizada</strong>Com os critérios atuais, nada apareceu como baixa qualidade.</div></div>`;
          return;
        }
        root.innerHTML = items.map((item) => {
          const flags = (item.flags || []).map((flag) =>
            `<span class="quality-flag">${htmlEscape(qualityFlagLabels[flag] || flag)}</span>`
          ).join("");
          const albums = Array.isArray(item.albums) && item.albums.length
            ? item.albums.join(" · ")
            : "Fototeca";
          return `<article class="panel quality-card" data-quality-id="${htmlEscape(item.local_id || "")}">
            <div class="quality-media">
              ${item.preview_url ? `<img loading="lazy" src="${htmlEscape(mediaUrl(item.preview_url))}" alt="${htmlEscape(item.name || "Foto")}">` : ""}
              <span class="quality-score">score ${Number(item.quality_score || 0).toFixed(0)}</span>
            </div>
            <div class="quality-card-body">
              <div class="duplicate-item-name">${htmlEscape(item.name || item.local_id || "Foto")}</div>
              <div class="duplicate-item-meta">${Number(item.megapixels || 0).toFixed(1)} MP · ${htmlEscape(albums)}</div>
              <div class="quality-flags">${flags}</div>
              <div class="quality-metrics">nitidez ${Number(item.sharpness || 0).toFixed(0)} · contraste ${Number(item.contrast || 0).toFixed(0)} · brilho ${Number(item.brightness || 0).toFixed(0)}</div>
              <div class="duplicate-item-actions"><button class="mini-btn" type="button" data-quality-open="${htmlEscape(item.local_id || "")}">Abrir no Fotos ↗</button></div>
            </div>
          </article>`;
        }).join("");
      }

      async function refreshQuality(includeResults = false) {
        try {
          const response = await api("/api/quality/status");
          const status = response.quality || {};
          renderQualityStatus(status);
          if (status.status === "complete" && status.scan_id && status.scan_id !== qualityLastScanId) {
            qualityLastScanId = status.scan_id;
            includeResults = true;
          }
          if (includeResults) {
            const result = await api("/api/quality/results?offset=0&limit=500");
            renderQualityResults(result);
            if (result.scan_id) qualityLastScanId = result.scan_id;
          }
        } catch {}
      }

      function initQualityEvents() {
        $("#qualityScanBtn")?.addEventListener("click", async () => {
          try {
            await startJob("quality_scan");
            toast("Scanner de qualidade iniciado");
            setTimeout(() => refreshQuality(false), 300);
          } catch (error) {
            toast(`Qualidade: ${error.message}`);
          }
        });
        $("#qualityResults")?.addEventListener("click", (event) => {
          const button = event.target.closest("[data-quality-open]");
          if (button) openPhotosAsset(button.dataset.qualityOpen);
        });
      }

      // Search Lab 1.0.0: server-side paging, lazy previews and safe labeling.
      const searchState = {
        offset: 0, total: 0, query: "", similarTo: "", busy: false,
        items: new Map(), selected: null, status: null,
      };
      const initialSearchRoute = new URLSearchParams(location.search);
      searchState.query = initialSearchRoute.get("q") || "";
      searchState.similarTo = initialSearchRoute.get("similar") || "";
      let routePhotoPending = initialSearchRoute.get("photo") || "";

      function searchQueryParams(offset = 0) {
        const params = new URLSearchParams({
          q: searchState.query, offset: String(offset), limit: "60",
          sort: $("#searchSort").value,
          similar_to: searchState.similarTo,
          distance: $("#searchDistance").value,
        });
        return params.toString();
      }

      function searchCard(item) {
        const id = htmlEscape(item.local_id);
        const photo = item.preview_url
          ? `<img src="${htmlEscape(mediaUrl(item.preview_url))}" loading="lazy" decoding="async" alt="${htmlEscape(item.name)}" />`
          : `<div class="search-no-preview"><span>◈</span><small>Preview não indexado</small></div>`;
        const labels = [item.people, item.tags, item.auto_tags].filter(Boolean).join(" · ");
        return `<button class="search-card" type="button" data-search-id="${id}" aria-label="Inspecionar ${htmlEscape(item.name)}">
          <div class="search-card-image">${photo}
            ${item.distance != null ? `<span class="search-card-distance">Δ ${item.distance}</span>` : ""}
          </div>
          <div class="search-card-info"><strong title="${htmlEscape(item.name)}">${htmlEscape(item.name)}</strong>
            <span>${fmtBytes(item.bytes)} · ${item.created ? htmlEscape(String(item.created).slice(0, 10)) : "Sem data"}</span>
            ${labels ? `<em>${htmlEscape(labels)}</em>` : ""}
          </div></button>`;
      }

      async function runSearch(reset = true) {
        if (searchState.busy) return;
        searchState.busy = true;
        try {
          const offset = reset ? 0 : searchState.offset;
          const result = await api(`/api/search/query?${searchQueryParams(offset)}`);
          if (!result.ok) throw new Error(result.hint || result.error || "Falha na busca");
          searchState.total = Number(result.total || 0);
          if (reset) {
            searchState.offset = 0;
            searchState.items.clear();
            $("#searchResults").replaceChildren();
          }
          const fragment = document.createDocumentFragment();
          const wrapper = document.createElement("div");
          wrapper.className = "search-page-fragment";
          wrapper.innerHTML = (result.items || []).map(searchCard).join("");
          while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild);
          $("#searchResults").appendChild(fragment);
          for (const item of result.items || []) searchState.items.set(item.local_id, item);
          searchState.offset += (result.items || []).length;
          $("#searchResultSummary").textContent =
            `${searchState.total.toLocaleString("pt-BR")} imagens encontradas · ${searchState.offset.toLocaleString("pt-BR")} exibidas`;
          $("#searchMoreBtn").hidden = searchState.offset >= searchState.total;
          if (!searchState.total) $("#searchResults").innerHTML =
            `<div class="search-empty">Nenhuma imagem corresponde à consulta. Experimente outros filtros.</div>`;
          writeRouteState(true);
          if (routePhotoPending && searchState.items.has(routePhotoPending)) {
            const pending = routePhotoPending;
            routePhotoPending = "";
            searchDetail(searchState.items.get(pending));
          }
        } catch (error) {
          toast(`Busca: ${error.message}`);
          $("#searchResultSummary").textContent = error.message;
        } finally { searchState.busy = false; }
      }

      async function refreshSearch(queryAgain = false) {
        try {
          const response = await api("/api/search/status");
          const status = response.search || {};
          const previous = searchState.status;
          searchState.status = status;
          $("#searchIndexed").textContent = Number(status.indexed || 0).toLocaleString("pt-BR");
          $("#searchAnalyzed").textContent = Number(status.analyzed || 0).toLocaleString("pt-BR");
          $("#searchProgressFill").style.width = `${Math.max(0, Math.min(100, Number(status.progress_percent || 0)))}%`;
          const terminalError = status.status === "error" || status.status === "failed";
          const terminalWarning = status.status === "complete_with_warnings";
          const errorText = status.error_message || status.message || status.last_error;
          const statusLabel = {
            idle: "Aguardando",
            running: "Em andamento",
            complete: "Concluída",
            complete_with_warnings: "Concluída com avisos",
            stopped: "Interrompida",
            error: "Falha",
            failed: "Falha",
          }[status.status] || status.status || "Aguardando";
          const progressText = status.status === "running"
            ? `${status.phase || "indexando"} · ${Number(status.cursor || 0).toLocaleString("pt-BR")} / ${Number(status.total || 0).toLocaleString("pt-BR")} · ${formatPercent(status.progress_percent)}`
            : `${statusLabel} · ${Number(status.indexed || 0).toLocaleString("pt-BR")} catalogadas`;
          $("#searchProgressText").textContent = terminalError || terminalWarning
            ? `${progressText}${errorText ? ` · ${errorText}` : ""}`
            : progressText;
          $("#searchProgressText").setAttribute("role", terminalError ? "alert" : "status");
          if (queryAgain || (!previous && status.indexed) ||
              (previous?.status === "running" && ["complete", "complete_with_warnings"].includes(status.status))) {
            runSearch(true);
          }
        } catch (error) { $("#searchProgressText").textContent = `Sem conexão: ${error.message}`; }
      }

      async function searchDetail(item) {
        searchState.selected = item;
        $("#searchDetailName").textContent = item.name || "Imagem";
        $("#searchDetailMeta").textContent =
          `${fmtBytes(item.bytes)} · ${item.width || "?"} × ${item.height || "?"} · ${item.created || "sem data"} · ${item.locality || "localidade desconhecida"}`;
        $("#searchPeople").value = item.people || "";
        $("#searchTags").value = item.tags || "";
        $("#searchOcr").value = item.ocr || "";
        $("#searchDetailMedia").innerHTML = item.preview_url
          ? `<img src="${htmlEscape(mediaUrl(item.preview_url))}" alt="${htmlEscape(item.name)}" />`
          : `<div class="search-no-preview">Sem preview. Execute a análise visual para gerar.</div>`;
        $("#searchMetadataJson").textContent = "Carregando metadados completos…";
        $("#searchDetail").showModal();
        writeRouteState(true);
        try {
          const details = await api(`/api/search/metadata?local_id=${encodeURIComponent(item.local_id)}`);
          $("#searchMetadataJson").textContent = JSON.stringify(details, null, 2);
        } catch (error) {
          $("#searchMetadataJson").textContent = `Metadados indisponíveis: ${error.message}`;
        }
      }

      async function startSearchIntelligenceJob(action, extra = {}) {
        try {
          const result = await api("/api/job/start", {method:"POST",
            body:JSON.stringify({action,config,payload:extra})});
          if (!result.ok) throw new Error(result.error || "Não foi possível iniciar");
          toast("Tarefa iniciada: " + action);
        } catch(error) { toast(error.message); }
      }

      async function refreshIntelligence() {
        try {
          const response = await api("/api/search/intelligence");
          if (!response.ok) throw new Error(response.error);
          const stats = response.stats || {};
          const vectors = stats.vectors || [];
          const select = $("#searchEmbeddingModel");
          const previous = select.value;
          const models = [...new Set(["apple-vision-image-print", ...vectors.filter(v => v.kind === "image").map(v => v.model)])];
          select.replaceChildren(...models.map(model => {
            const option = document.createElement("option");
            option.value = model;
            option.textContent = model === "apple-vision-image-print" ? "Apple Vision · imagem" : model;
            return option;
          }));
          if (models.includes(previous)) select.value = previous;
          $("#searchVectorStats").textContent = vectors.length
            ? vectors.map(v => `${v.kind}: ${Number(v.n).toLocaleString("pt-BR")} · ${v.model}`).join(" | ")
            : "Sem vetores. Ative Apple Vision e analise um lote pequeno.";
          const groups = response.faces?.groups || [];
          $("#searchFaceGroups").innerHTML = groups.length ? groups.map(g => `
            <article class="search-face-card" data-face-group="${htmlEscape(g.group_id)}">
              <div class="search-face-avatar">${g.preview_url
                ? `<img src="${htmlEscape(mediaUrl(g.preview_url))}" alt="Exemplo do grupo" loading="lazy" />`
                : '<span aria-hidden="true">◉</span>'}</div>
              <div class="search-face-info">
                <strong>${Number(g.face_count)} rosto(s) · ${g.reviewed ? "Revisado" : "A revisar"}</strong>
                <input aria-label="Nome deste grupo" placeholder="Nome da pessoa" value="${htmlEscape(g.name || "")}" />
                <label class="search-check"><input data-face-apply type="checkbox" /> Confirmar e aplicar nome às fotos</label>
                <button type="button" class="btn" data-face-save="${htmlEscape(g.group_id)}">Salvar grupo ↗</button>
              </div>
            </article>`).join("") : '<div class="search-muted">Nenhum rosto agrupado ainda.</div>';
        } catch(error) { $("#searchVectorStats").textContent = error.message; }
      }

      function initSearchEvents() {
        $("#searchInput").value = searchState.query;
        $("#searchSort").value = initialSearchRoute.get("sort") || "newest";
        $("#searchDistance").value = initialSearchRoute.get("distance") || "8";
        $("#searchSimilar").hidden = !searchState.similarTo;
        $("#searchForm").addEventListener("submit", (event) => {
          event.preventDefault();
          searchState.query = $("#searchInput").value.trim();
          searchState.similarTo = "";
          $("#searchSimilar").hidden = true;
          runSearch(true);
        });
        $$("[data-search-chip]").forEach((chip) => chip.addEventListener("click", () => {
          const input = $("#searchInput");
          input.value = [input.value.trim(), chip.dataset.searchChip].filter(Boolean).join(" ");
          input.focus();
          searchState.query = input.value;
          runSearch(true);
        }));
        $("#searchSort").addEventListener("change", () => runSearch(true));
        $("#searchMoreBtn").addEventListener("click", () => runSearch(false));
        $("#searchDistance").addEventListener("change", () => runSearch(true));
        $("#searchClearSimilar").addEventListener("click", () => {
          searchState.similarTo = "";
          $("#searchSimilar").hidden = true;
          runSearch(true);
        });
        $("#searchResults").addEventListener("click", (event) => {
          const card = event.target.closest("[data-search-id]");
          if (card) searchDetail(searchState.items.get(card.dataset.searchId));
        });
        $("#searchCloseDetail").addEventListener("click", () => { $("#searchDetail").close(); searchState.selected = null; writeRouteState(true); });
        $("#searchDetail").addEventListener("click", (event) => {
          if (event.target === $("#searchDetail")) { $("#searchDetail").close(); searchState.selected = null; writeRouteState(true); }
        });
        $("#searchDetail").addEventListener("close", () => {
          searchState.selected = null;
          writeRouteState(true);
        });
        $("#searchSaveLabels").addEventListener("click", async () => {
          const item = searchState.selected;
          if (!item) return;
          try {
            const result = await api("/api/search/label", {
              method: "POST", body: JSON.stringify({local_id: item.local_id,
                people: $("#searchPeople").value, tags: $("#searchTags").value,
                ocr: $("#searchOcr").value}),
            });
            if (!result.ok) throw new Error(result.error);
            Object.assign(item, {people: $("#searchPeople").value,
              tags: $("#searchTags").value, ocr: $("#searchOcr").value});
            toast("Etiquetas salvas no índice local");
            $("#searchDetail").close();
            runSearch(true);
          } catch (error) { toast(`Etiquetas: ${error.message}`); }
        });
        $("#searchFindSimilar").addEventListener("click", () => {
          const item = searchState.selected;
          if (!item) return;
          searchState.similarTo = item.local_id;
          $("#searchSimilar").hidden = false;
          $("#searchSimilarLabel").textContent = `Semelhantes a ${item.name}`;
          $("#searchDetail").close();
          runSearch(true);
        });
        $("#searchFindEmbeddings").addEventListener("click", async () => {
          const item = searchState.selected;
          if (!item) return;
          $("#searchDetail").close();
          $("#searchResultSummary").textContent = "Buscando vizinhos por embeddings…";
          try {
            const model = $("#searchEmbeddingModel").value;
            const result = await api(`/api/search/nearest?local_id=${encodeURIComponent(item.local_id)}&model=${encodeURIComponent(model)}&limit=120`);
            if (!result.ok) throw new Error(result.hint || result.error);
            searchState.similarTo = "";
            $("#searchSimilar").hidden = true;
            searchState.items.clear();
            searchState.total = result.total || 0;
            searchState.offset = result.total || 0;
            $("#searchResults").innerHTML = (result.items || []).map(searchCard).join("") ||
              '<div class="search-empty">Nenhuma imagem com embeddings compatíveis.</div>';
            for (const entry of result.items || []) searchState.items.set(entry.local_id, entry);
            $("#searchMoreBtn").hidden = true;
            $("#searchResultSummary").textContent = `${result.total || 0} imagens relacionadas · ${result.model}`;
            toast("Similaridade por embeddings concluída");
          } catch (error) { toast(`Embeddings: ${error.message}`); }
        });

        $("#searchExportOne").addEventListener("click", () => {
          const item = searchState.selected;
          if (!item) return;
          startSearchIntelligenceJob("search_export_metadata", {
            search_export_local_ids: [item.local_id],
          });
        });

        $("#searchOpenPhotos").addEventListener("click", () => {
          if (searchState.selected) openPhotosAsset(searchState.selected.local_id);
        });
        for (const [id, action] of [["searchIndexBtn", "search_index"], ["searchAnalyzeBtn", "search_analyze"]]) {
          $("#" + id).addEventListener("click", async () => {
            try {
              const response = await api("/api/job/start", {
                method: "POST", body: JSON.stringify({action, config: {
                  ...config,
                  search_analyze_limit: Number($("#search_analyze_limit").value),
                  search_allow_icloud: $("#search_allow_icloud").checked,
                  search_ocr: $("#search_ocr").checked,
                  search_classify: $("#search_classify").checked,
                  search_features: $("#search_features").checked,
                  search_faces: $("#search_faces").checked,
                  search_max_faces: 4,
                }}),
              });
              if (!response.ok) throw new Error(response.error || "Não foi possível iniciar");
              toast(action === "search_index" ? "Indexação enfileirada" : "Análise visual enfileirada");
              setTimeout(() => refreshSearch(false), 350);
            } catch (error) { toast(error.message); }
          });
        }
        $("#searchImportBtn").addEventListener("click", async () => {
          const path = $("#searchLabelsPath").value.trim();
          if (!path) { toast("Informe o caminho completo do JSONL no Pyto"); return; }
          try {
            const response = await api("/api/job/start", {
              method: "POST", body: JSON.stringify({action: "search_import_labels",
                config: {...config, search_labels_path: path}}),
            });
            if (!response.ok) throw new Error(response.error || "Falha ao importar");
            toast("Importação enfileirada");
          } catch (error) { toast(error.message); }
        });
        $("#search_face_threshold").addEventListener("input", (event) => {
          $("#searchFaceThresholdValue").textContent = `${event.target.value}%`;
        });
        $("#searchRefreshFaces").addEventListener("click", refreshIntelligence);
        $("#searchGroupFaces").addEventListener("click", () =>
          startSearchIntelligenceJob("search_group_faces", {
            search_face_threshold: Number($("#search_face_threshold").value) / 100,
            search_face_limit: 500,
          }));
        $("#searchImportVectors").addEventListener("click", () => {
          const path = $("#searchVectorsPath").value.trim();
          if (!path) return toast("Informe o caminho de um JSONL de embeddings");
          startSearchIntelligenceJob("search_import_vectors", {search_vectors_path:path});
        });
        $("#searchFaceGroups").addEventListener("click", async (event) => {
          const button = event.target.closest("[data-face-save]");
          if (!button) return;
          const id = button.dataset.faceSave;
          const card = button.closest("[data-face-group]");
          const name = card.querySelector("input").value.trim();
          const apply = card.querySelector("[data-face-apply]").checked;
          if (!name) return toast("Informe o nome antes de salvar");
          if (apply && !window.confirm(`Aplicar o nome '${name}' a todas as fotos deste grupo? Revise se os rostos são da mesma pessoa.`)) return;
          try {
            const result = await api("/api/search/face-name", {method:"POST",
              body:JSON.stringify({group_id:id,name,apply})});
            if (!result.ok) throw new Error(result.error);
            toast(apply ? "Nome aplicado às fotos do grupo" : "Nome salvo como rascunho");
            await refreshIntelligence();
          } catch(error) { toast(error.message); }
        });

        $("#searchStopBtn").addEventListener("click", async () => {
          try { await api("/api/job/stop", {method:"POST", body:"{}"}); toast("Parada solicitada"); }
          catch (error) { toast(error.message); }
        });
      }

      async function init() {
        initBridge();
        if (hostedShell) {
          try { await refreshMediaTicket(); }
          catch (error) { openBridge(bridgeToken ? error.message : "Digite o código do console do Pyto para conectar."); }
        }
        try {
          const boot = await api("/api/bootstrap");

          applyConfig(boot.config || {});
          renderAlbums(boot.albums || []);

          if (boot.status) {
            lastStatus = boot.status;
            setConnected(true);
            renderStatus(boot.status);
          } else {
            setConnected(true);
          }

          const initialResults =
            Array.isArray(boot.results)
              ? boot.results
              : boot.results?.results || [];
          renderEvents(initialResults);

          const initialLogs =
            boot.logs?.logs || [];
          updateTerminal(
            initialLogs,
            boot.logs?.latest_seq || 0,
          );

          if (boot.duplicates || boot.drive) {
            renderDuplicateStatus(
              boot.duplicates || {},
              boot.drive || {},
            );
          }
          if (boot.quality) renderQualityStatus(boot.quality);
        } catch (e) {
          setConnected(false);
          // Fall back to light endpoints only. Never trigger native Photos
          // work just because the page loaded.
          try {
            const j = await api("/api/config");
            applyConfig(j.config || {});
          } catch {}
        }

        initSearchEvents();
        initTabs();
        updateCacheStats();
        setInterval(updateCacheStats, 60000);
        initDuplicateEvents();
        initQualityEvents();
        refreshIntelligence();
        initPwa();

        setTimeout(refresh, 500);
        setTimeout(refreshDuplicateStatus, 900);
        setTimeout(() => refreshQuality(false), 1050);
        setTimeout(refreshTerminal, 800);
        setTimeout(refreshEvents, 1200);

        setInterval(refresh, 1500);
        setInterval(refreshTerminal, 2200);
        setInterval(refreshEvents, 5000);
        setInterval(() => {
          if (!$("#viewDuplicates")?.hidden) refreshDuplicateStatus();
          if (!$("#viewQuality")?.hidden) refreshQuality(false);
          if (!$("#viewSearch")?.hidden) refreshSearch(false);
        }, 1800);
      }

      $("#quality").addEventListener("input", (e) => {
        $("#qualityValue").textContent = e.target.value;
        scheduleSave();
      });
      $$("input,select").forEach((el) => {
        if (el.closest("#bridgeDialog") || el.id === "cacheLimitMb") return;
        el.addEventListener("change", scheduleSave);
      });
      $("#cacheLimitMb").addEventListener("change", async event => {
        try {
          await api("/api/previews/cache", {method: "POST",
            body: JSON.stringify({limit_mb: Number(event.target.value)})});
          await updateCacheStats();
          toast("Limite do cache atualizado");
        } catch (error) { toast(error.message); }
      });
      $("#delete_strategy").addEventListener("change", (e) => {
        if (e.target.value === "immediate")
          toast("Modo antigo: o iOS pode pedir confirmação em cada foto.");
      });
      $$(".media").forEach((el) => el.addEventListener("change", scheduleSave));
      $$("#sourceScope button").forEach((b) =>
        b.addEventListener("click", () => {
          $$("#sourceScope button").forEach((x) =>
            x.classList.remove("active"),
          );
          b.classList.add("active");
          scheduleSave();
        }),
      );
      async function notifyTest() {
        config = readConfig();
        try {
          const j = await api("/api/notify/test", {
            method: "POST",
            body: JSON.stringify({ config }),
          });
          $("#notify_token").value = "";
          toast(
            j.ok ? "Live Activity enviada ✦" : `Notify!: ${j.error || "erro"}`,
          );
          setTimeout(() => {
            refresh();
            refreshTerminal();
          }, 120);
        } catch (e) {
          toast(`Notify!: ${e.message}`);
        }
      }
      async function notifyEnd() {
        try {
          await api("/api/notify/end", { method: "POST", body: "{}" });
          toast("Live Activity encerrada");
          setTimeout(() => {
            refresh();
            refreshTerminal();
          }, 120);
        } catch (e) {
          toast(`Notify!: ${e.message}`);
        }
      }
      $("#scanBtn").onclick = () => startJob("locality");
      $("#snapshotBtn").onclick = () => startJob("snapshot_generate");
      $("#catalogBtn").onclick = () => startJob("catalog_update");
      $("#catalogRebuildBtn").onclick = () => {
        if (!confirm(
          "Reconstruir TODO o catálogo?\n\nEsta ação manual recria snapshot, localidade, índice, previews e categorização. O auto-run continuará incremental.",
        )) return;
        startJob("catalog_rebuild");
      };
      $("#catalogRetryBtn").onclick = () =>
        startSearchIntelligenceJob("search_retry_previews", {
          search_retry_force: true,
        });
      $("#catalogExportBtn").onclick = () => {
        if (!confirm(
          "Exportar os metadados completos de toda a fototeca em JSONL? O arquivo pode ficar grande.",
        )) return;
        startJob("search_export_metadata");
      };
      $("#processBtn").onclick = () => startJob("process");
      $("#bothBtn").onclick = () => startJob("scan_then_process");
      $("#stopBtn").onclick = stopJob;
      $("#notifyTestBtn").onclick = notifyTest;
      $("#notifyEndBtn").onclick = notifyEnd;
      $("#flushBtn").onclick = async () => {
        const count = Number(lastStatus?.pending_replacements?.count || 0);
        if (!count) return;
        if (
          !confirm(
            `Excluir os ${count} originais validados em UMA única operação do Fotos?\n\nO iOS deve mostrar uma única confirmação para o lote.`,
          )
        )
          return;
        await startJob("flush_replacements");
      };
      $("#refreshBtn").onclick = () => {
        refresh();
        refreshEvents();
        refreshTerminal();
        if (!$("#viewDuplicates")?.hidden) refreshDuplicates(true);
        if (!$("#viewQuality")?.hidden) refreshQuality(true);
      };
      $("#terminalToggleBtn").onclick = () => setTerminalOpen(!terminalOpen);
      $("#terminalCloseBtn").onclick = () => setTerminalOpen(false);
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && terminalOpen) setTerminalOpen(false);
      });
      $("#terminalCopyErrorBtn").onclick = async () => {
        if (!terminalLastError) return;
        const value = JSON.stringify(terminalLastError, null, 2);
        try {
          await navigator.clipboard.writeText(value);
          toast("JSON do erro copiado");
        } catch {
          const ta = document.createElement("textarea");
          ta.value = value;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          toast("JSON do erro copiado");
        }
      };
      $("#terminalClearBtn").onclick = async () => {
        try {
          await api("/api/logs/clear", { method: "POST", body: "{}" });
          terminalSeq = 0;
          terminalRows.clear();
          terminalLastError = null;
          $("#terminal").innerHTML =
            '<div class="terminal-empty">Terminal limpo.</div>';
          $("#terminalErrorPanel").hidden = true;
          $("#terminalErrorJson").textContent = "";
          $("#terminalStats").textContent = "0 eventos";
          $("#terminalToggleBadge").hidden = true;
          refreshTerminal();
        } catch (e) {
          toast(e.message);
        }
      };
      $("#serverStopBtn").onclick = async () => {
        if (confirm("Fechar o servidor localhost e o job atual?")) {
          await api("/api/server/stop", { method: "POST", body: "{}" }).catch(
            () => {},
          );
          toast("Servidor encerrando…");
        }
      };
      window.addEventListener("popstate", () => {
        const params = routeParams();
        setActiveTab(params.get("tab") || location.hash.slice(1) || "overview", false);
        if ((params.get("tab") || "overview") === "search") {
          searchState.query = params.get("q") || "";
          searchState.similarTo = params.get("similar") || "";
          $("#searchInput").value = searchState.query;
          $("#searchSort").value = params.get("sort") || "newest";
          $("#searchDistance").value = params.get("distance") || "8";
          routePhotoPending = params.get("photo") || "";
          runSearch(true);
        }
      });

      init();
