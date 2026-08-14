/* Auto-generated from menu/menu.ts. at 8/14/2026, 3:33:26 PM Do not edit directly. */
var RodMenu = (function() {

//#region \0rolldown/runtime.js
	var __defProp = Object.defineProperty;
	var __exportAll = (all, no_symbols) => {
		let target = {};
		for (var name in all) {
			__defProp(target, name, {
				get: all[name],
				enumerable: true
			});
		}
		if (!no_symbols) {
			__defProp(target, Symbol.toStringTag, { value: "Module" });
		}
		return target;
	};

//#endregion
//#region menu/menu.ts
	var menu_exports = /* @__PURE__ */ __exportAll({});
	/**
	* RodMenu v1.0.0
	* Framework-free, browser-first declarative menu + form surface engine.
	*
	* Compile:
	*   tsc rod-menu.ts --target ES2022 --lib ES2022,DOM --strict --module none --outFile rod-menu.js
	*
	* Default behavior:
	* - bottom-sheet presentation
	* - Shadow DOM isolation
	* - modal focus trap
	* - visualViewport-aware mobile positioning
	* - best-effort publication to same-origin window hierarchy
	* - schema-driven fields/actions/validation
	*/
	(function installRodMenu(rootWindow) {
		"use strict";
		const VERSION = "1.0.0";
		const GLOBAL_NAME = "RodMenu";
		const ROOT_ATTR = "data-rod-menu-host";
		const ACTIVE_ATTR = "data-rod-menu-active";
		const ID_PREFIX = "rod-menu";
		const DEFAULT_Z_INDEX = 2147482500;
		const STYLE_VERSION = "v1";
		let globalConfig = {
			shadowRoot: true,
			defaultPresentation: "bottom-sheet",
			zIndex: DEFAULT_Z_INDEX
		};
		let counter = 0;
		const activeHandles = /* @__PURE__ */ new Map();
		const docState = /* @__PURE__ */ new WeakMap();
		const css = String.raw`
:host, .rm-host {
  all: initial;
  color-scheme: light dark;
  --rm-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  --rm-bg: color-mix(in srgb, Canvas 94%, transparent);
  --rm-panel: color-mix(in srgb, Canvas 98%, transparent);
  --rm-elevated: color-mix(in srgb, Canvas 92%, CanvasText 8%);
  --rm-text: CanvasText;
  --rm-muted: color-mix(in srgb, CanvasText 58%, transparent);
  --rm-border: color-mix(in srgb, CanvasText 14%, transparent);
  --rm-accent: #ff7a18;
  --rm-accent-strong: #ff5b00;
  --rm-danger: #ff453a;
  --rm-success: #30d158;
  --rm-radius: 26px;
  --rm-shadow: 0 28px 90px rgba(0, 0, 0, .24), 0 10px 30px rgba(0, 0, 0, .14);
  --rm-ease: cubic-bezier(.2,.8,.2,1);
  font-family: var(--rm-font);
}
* { box-sizing: border-box; }
button, input, textarea, select { font: inherit; }
button { -webkit-tap-highlight-color: transparent; }
.rm-root {
  position: fixed;
  inset: 0;
  z-index: var(--rm-z);
  pointer-events: none;
  font-family: var(--rm-font);
  color: var(--rm-text);
}
.rm-root[data-open="true"] { pointer-events: auto; }
.rm-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.38);
  backdrop-filter: blur(10px) saturate(130%);
  -webkit-backdrop-filter: blur(10px) saturate(130%);
  opacity: 0;
  transition: opacity 240ms var(--rm-ease);
}
.rm-root[data-open="true"] .rm-backdrop { opacity: 1; }
.rm-shell {
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--rm-panel);
  border: 1px solid var(--rm-border);
  box-shadow: var(--rm-shadow);
  overflow: hidden;
  opacity: 0;
  transform: translate3d(0, 30px, 0) scale(.985);
  transition: transform 280ms var(--rm-ease), opacity 220ms ease;
  will-change: transform, opacity;
}
.rm-root[data-open="true"] .rm-shell {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
}
.rm-root[data-presentation="bottom-sheet"] .rm-shell {
  left: max(8px, env(safe-area-inset-left));
  right: max(8px, env(safe-area-inset-right));
  bottom: max(8px, env(safe-area-inset-bottom));
  max-height: min(88dvh, calc(var(--rm-vvh, 100vh) - 16px));
  border-radius: var(--rm-radius);
  transform: translate3d(0, 110%, 0);
}
.rm-root[data-presentation="modal"] .rm-shell {
  left: 50%;
  top: 50%;
  width: min(calc(100vw - 28px), var(--rm-width, 640px));
  max-height: min(86dvh, calc(var(--rm-vvh, 100vh) - 28px));
  border-radius: var(--rm-radius);
  transform: translate3d(-50%, calc(-50% + 24px), 0) scale(.97);
}
.rm-root[data-presentation="modal"][data-open="true"] .rm-shell {
  transform: translate3d(-50%, -50%, 0) scale(1);
}
.rm-root[data-presentation="drawer"] .rm-shell { border-radius: 0; }
.rm-root[data-presentation="drawer"][data-side="right"] .rm-shell {
  top: 0; right: 0; bottom: 0; width: min(92vw, var(--rm-width, 520px));
  transform: translate3d(105%, 0, 0);
}
.rm-root[data-presentation="drawer"][data-side="left"] .rm-shell {
  top: 0; left: 0; bottom: 0; width: min(92vw, var(--rm-width, 520px));
  transform: translate3d(-105%, 0, 0);
}
.rm-root[data-presentation="drawer"][data-side="top"] .rm-shell {
  top: 0; left: 0; right: 0; max-height: 86dvh; transform: translate3d(0, -105%, 0);
}
.rm-root[data-presentation="drawer"][data-side="bottom"] .rm-shell {
  bottom: 0; left: 0; right: 0; max-height: 86dvh; transform: translate3d(0, 105%, 0);
}
.rm-root[data-presentation="drawer"][data-open="true"] .rm-shell { transform: translate3d(0,0,0); }
.rm-root[data-presentation="popover"] .rm-shell {
  left: 50%; top: 50%;
  width: min(calc(100vw - 24px), var(--rm-width, 520px));
  max-height: 80dvh;
  border-radius: 22px;
  transform: translate3d(-50%, calc(-50% + 18px), 0) scale(.96);
}
.rm-root[data-presentation="popover"][data-open="true"] .rm-shell { transform: translate3d(-50%,-50%,0) scale(1); }
.rm-handle-wrap { display: flex; justify-content: center; padding: 10px 12px 0; touch-action: none; }
.rm-handle { width: 42px; height: 5px; border-radius: 99px; background: var(--rm-border); }
.rm-header { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 16px; align-items: start; padding: 18px 20px 14px; }
.rm-heading { min-width: 0; }
.rm-eyebrow { font: 700 11px/1.2 var(--rm-font); letter-spacing: .12em; text-transform: uppercase; color: var(--rm-accent); margin-bottom: 7px; }
.rm-title-row { display: flex; align-items: center; gap: 10px; }
.rm-icon { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; background: color-mix(in srgb, var(--rm-accent) 15%, transparent); flex: 0 0 auto; }
.rm-title { margin: 0; font: 760 22px/1.12 var(--rm-font); letter-spacing: -.025em; }
.rm-description { margin: 8px 0 0; font: 450 14px/1.45 var(--rm-font); color: var(--rm-muted); }
.rm-close { appearance: none; border: 0; border-radius: 999px; width: 34px; height: 34px; display: grid; place-items: center; background: var(--rm-elevated); color: var(--rm-text); cursor: pointer; transition: transform 160ms ease, background 160ms ease; }
.rm-close:active { transform: scale(.92); }
.rm-body { overflow: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 0 16px 8px; scrollbar-width: thin; }
.rm-section { margin: 0 0 14px; border-radius: 20px; background: color-mix(in srgb, var(--rm-elevated) 58%, transparent); border: 1px solid var(--rm-border); overflow: hidden; }
.rm-section-head { padding: 14px 14px 6px; }
.rm-section-title { margin: 0; font: 700 13px/1.25 var(--rm-font); }
.rm-section-description { margin: 4px 0 0; color: var(--rm-muted); font: 430 12px/1.4 var(--rm-font); }
.rm-section-toggle { width: 100%; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; display:flex; justify-content:space-between; align-items:center; padding:0; }
.rm-fields { display: grid; gap: 0; }
.rm-field { position: relative; padding: 12px 14px; border-top: 1px solid var(--rm-border); min-width: 0; }
.rm-field:first-child { border-top: 0; }
.rm-field[data-hidden="true"] { display: none !important; }
.rm-label-row { display:flex; justify-content:space-between; gap:12px; align-items:baseline; margin-bottom:7px; }
.rm-label { font: 650 13px/1.25 var(--rm-font); }
.rm-required { color: var(--rm-danger); margin-left: 3px; }
.rm-help, .rm-description-field { font: 430 12px/1.35 var(--rm-font); color: var(--rm-muted); }
.rm-help { margin-top: 7px; }
.rm-error { margin-top: 7px; color: var(--rm-danger); font: 600 12px/1.35 var(--rm-font); display:none; }
.rm-field[data-error="true"] .rm-error { display:block; }
.rm-control, .rm-textarea, .rm-select {
  width: 100%; min-height: 44px; border: 1px solid var(--rm-border); border-radius: 13px; background: color-mix(in srgb, Canvas 87%, transparent); color: var(--rm-text); outline: none; padding: 10px 12px; transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}
.rm-control:focus, .rm-textarea:focus, .rm-select:focus { border-color: color-mix(in srgb, var(--rm-accent) 72%, white 10%); box-shadow: 0 0 0 3px color-mix(in srgb, var(--rm-accent) 18%, transparent); }
.rm-textarea { resize: vertical; min-height: 96px; }
.rm-check-row { display:flex; align-items:center; justify-content:space-between; gap:14px; }
.rm-check-label { min-width:0; }
.rm-native-check { width:20px; height:20px; accent-color: var(--rm-accent); }
.rm-switch { appearance:none; width:48px; height:28px; border:0; border-radius:999px; background: var(--rm-border); position:relative; cursor:pointer; transition:background 180ms ease; flex:0 0 auto; }
.rm-switch::after { content:""; position:absolute; width:22px; height:22px; top:3px; left:3px; border-radius:50%; background:white; box-shadow:0 2px 8px rgba(0,0,0,.25); transition:transform 180ms var(--rm-ease); }
.rm-switch:checked { background: var(--rm-accent); }
.rm-switch:checked::after { transform: translateX(20px); }
.rm-options { display:flex; flex-direction:column; gap:8px; }
.rm-options[data-direction="horizontal"] { flex-direction:row; flex-wrap:wrap; }
.rm-option { display:flex; gap:9px; align-items:flex-start; font: 500 13px/1.35 var(--rm-font); }
.rm-option input { accent-color: var(--rm-accent); margin-top:2px; }
.rm-option-copy { display:grid; gap:2px; }
.rm-option-desc { font-size:11px; color:var(--rm-muted); }
.rm-segmented { display:grid; grid-auto-flow:column; grid-auto-columns:minmax(0,1fr); gap:4px; padding:4px; background:var(--rm-elevated); border-radius:13px; }
.rm-segment { border:0; border-radius:10px; padding:9px 10px; color:var(--rm-muted); background:transparent; cursor:pointer; font-weight:650; }
.rm-segment[data-selected="true"] { background:var(--rm-panel); color:var(--rm-text); box-shadow:0 2px 9px rgba(0,0,0,.1); }
.rm-range-wrap { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center; }
.rm-range { width:100%; accent-color:var(--rm-accent); }
.rm-range-value { min-width:44px; text-align:right; font:650 12px/1 var(--rm-font); color:var(--rm-muted); }
.rm-color-row { display:flex; gap:10px; align-items:center; }
.rm-color { width:54px; height:42px; border:1px solid var(--rm-border); border-radius:11px; padding:3px; background:transparent; }
.rm-presets { display:flex; flex-wrap:wrap; gap:7px; }
.rm-swatch { width:28px; height:28px; border-radius:50%; border:2px solid color-mix(in srgb, CanvasText 18%, transparent); cursor:pointer; }
.rm-stars { display:flex; gap:4px; }
.rm-star { border:0; background:transparent; color:var(--rm-border); font-size:27px; padding:2px; cursor:pointer; line-height:1; }
.rm-star[data-on="true"] { color:#ffb020; }
.rm-chipbox { display:flex; flex-wrap:wrap; gap:7px; }
.rm-chip { border:1px solid var(--rm-border); background:var(--rm-panel); color:var(--rm-text); border-radius:999px; padding:8px 11px; cursor:pointer; font:600 12px/1 var(--rm-font); }
.rm-chip[data-selected="true"] { border-color:var(--rm-accent); background:color-mix(in srgb, var(--rm-accent) 13%, var(--rm-panel)); }
.rm-divider { height:1px; background:var(--rm-border); margin:4px 0; }
.rm-field-button { border:0; border-radius:13px; min-height:42px; padding:10px 13px; cursor:pointer; font-weight:700; }
.rm-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:9px; padding:12px 16px calc(12px + env(safe-area-inset-bottom)); border-top:1px solid var(--rm-border); background:color-mix(in srgb, var(--rm-panel) 88%, transparent); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); }
.rm-action { position:relative; border:0; min-height:44px; padding:10px 16px; border-radius:14px; cursor:pointer; font:700 13px/1 var(--rm-font); transition:transform 140ms ease, opacity 140ms ease, filter 140ms ease; display:inline-flex; align-items:center; justify-content:center; gap:8px; }
.rm-action:active { transform:scale(.96); }
.rm-action:disabled { opacity:.46; cursor:not-allowed; }
.rm-action[data-variant="primary"] { background:linear-gradient(135deg,var(--rm-accent),var(--rm-accent-strong)); color:white; }
.rm-action[data-variant="secondary"] { background:var(--rm-elevated); color:var(--rm-text); }
.rm-action[data-variant="ghost"] { background:transparent; color:var(--rm-text); }
.rm-action[data-variant="danger"] { background:var(--rm-danger); color:white; }
.rm-action[data-variant="success"] { background:var(--rm-success); color:#07250f; }
.rm-spinner { width:14px; height:14px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:rm-spin .65s linear infinite; }
.rm-root[data-loading="true"] .rm-body { opacity:.66; pointer-events:none; }
.rm-global-error { margin: 0 16px 10px; padding: 10px 12px; border-radius: 12px; background: color-mix(in srgb, var(--rm-danger) 12%, transparent); color: var(--rm-danger); font: 600 12px/1.4 var(--rm-font); display:none; }
.rm-global-error[data-show="true"] { display:block; }
@keyframes rm-spin { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .rm-backdrop, .rm-shell, .rm-action, .rm-close, .rm-switch, .rm-switch::after { transition-duration:.001ms !important; animation-duration:.001ms !important; }
}
@media (min-width: 760px) {
  .rm-root[data-presentation="bottom-sheet"] .rm-shell { left:50%; right:auto; width:min(calc(100vw - 40px), 720px); transform:translate3d(-50%,110%,0); }
  .rm-root[data-presentation="bottom-sheet"][data-open="true"] .rm-shell { transform:translate3d(-50%,0,0); }
}
`;
		function isObject(value) {
			return !!value && typeof value === "object" && !Array.isArray(value);
		}
		function cloneValue(value) {
			if (Array.isArray(value)) return value.slice();
			if (value instanceof Date) return new Date(value.getTime());
			if (isObject(value)) return { ...value };
			return value;
		}
		function nextId() {
			counter += 1;
			return `${ID_PREFIX}-${Date.now().toString(36)}-${counter.toString(36)}`;
		}
		function getOwnerWindow(doc) {
			return doc.defaultView || rootWindow;
		}
		function getHighestReachableWindow(start) {
			let current = start;
			for (;;) {
				try {
					if (current.parent && current.parent !== current && current.parent.document) {
						current = current.parent;
						continue;
					}
				} catch {}
				return current;
			}
		}
		function resolveDocument() {
			const highest = getHighestReachableWindow(rootWindow);
			try {
				return highest.document;
			} catch {
				return rootWindow.document;
			}
		}
		function publishEverywhere(api) {
			const visited = /* @__PURE__ */ new Set();
			const queue = [rootWindow];
			try {
				const top = getHighestReachableWindow(rootWindow);
				if (!queue.includes(top)) queue.push(top);
			} catch {}
			while (queue.length) {
				const win = queue.shift();
				if (!win || visited.has(win)) continue;
				visited.add(win);
				try {
					Object.defineProperty(win, GLOBAL_NAME, {
						configurable: true,
						enumerable: false,
						writable: true,
						value: api
					});
				} catch {
					try {
						win[GLOBAL_NAME] = api;
					} catch {}
				}
				try {
					if (win.parent && win.parent !== win) queue.push(win.parent);
				} catch {}
				try {
					if (win.top && win.top !== win) queue.push(win.top);
				} catch {}
				try {
					for (let i = 0; i < win.frames.length; i += 1) queue.push(win.frames[i]);
				} catch {}
				try {
					if (win.opener && !win.opener.closed) queue.push(win.opener);
				} catch {}
			}
		}
		function appendStyle(root) {
			const style = (root instanceof ShadowRoot ? root.ownerDocument : root.ownerDocument).createElement("style");
			style.dataset.rodMenuStyle = STYLE_VERSION;
			style.textContent = css;
			root.append(style);
		}
		function applyAttributes(element, attributes) {
			if (!attributes) return;
			for (const [key, raw] of Object.entries(attributes)) {
				if (raw === void 0 || raw === null || raw === false) continue;
				if (raw === true) element.setAttribute(key, "");
				else element.setAttribute(key, String(raw));
			}
		}
		function lockDocumentScroll(doc) {
			const state = docState.get(doc) ?? {
				count: 0,
				overflow: doc.documentElement.style.overflow,
				paddingRight: doc.documentElement.style.paddingRight
			};
			if (state.count === 0) {
				const win = getOwnerWindow(doc);
				const scrollbar = Math.max(0, win.innerWidth - doc.documentElement.clientWidth);
				state.overflow = doc.documentElement.style.overflow;
				state.paddingRight = doc.documentElement.style.paddingRight;
				doc.documentElement.style.overflow = "hidden";
				if (scrollbar > 0) doc.documentElement.style.paddingRight = `${scrollbar}px`;
			}
			state.count += 1;
			docState.set(doc, state);
		}
		function unlockDocumentScroll(doc) {
			const state = docState.get(doc);
			if (!state) return;
			state.count = Math.max(0, state.count - 1);
			if (state.count === 0) {
				doc.documentElement.style.overflow = state.overflow;
				doc.documentElement.style.paddingRight = state.paddingRight;
				docState.delete(doc);
			}
		}
		function getSizeWidth(size) {
			switch (size) {
				case "sm": return "440px";
				case "lg": return "760px";
				case "xl": return "960px";
				case "fullscreen": return "calc(100vw - 16px)";
				default: return "640px";
			}
		}
		function normalizePresentation(value, win) {
			const selected = value ?? globalConfig.defaultPresentation;
			if (selected !== "auto") return selected;
			return win.matchMedia?.("(max-width: 720px)").matches ? "bottom-sheet" : "modal";
		}
		class SurfaceController {
			id;
			doc;
			win;
			host;
			root;
			result;
			handle;
			context;
			schemaValue;
			valuesValue;
			initialValues;
			errorsValue = {};
			actionLoading = /* @__PURE__ */ new Set();
			loading = false;
			settled = false;
			destroyed = false;
			resolveResult;
			previousFocus = null;
			listeners = [];
			fieldNodes = /* @__PURE__ */ new Map();
			inputNodes = /* @__PURE__ */ new Map();
			customNodes = /* @__PURE__ */ new Map();
			constructor(schema) {
				this.schemaValue = { ...schema };
				this.id = schema.id || nextId();
				this.doc = resolveDocument();
				this.win = getOwnerWindow(this.doc);
				this.valuesValue = this.buildInitialValues(schema);
				this.initialValues = this.cloneValues(this.valuesValue);
				this.host = this.doc.createElement("div");
				this.host.setAttribute(ROOT_ATTR, this.id);
				this.host.className = "rm-host";
				const useShadow = globalConfig.shadowRoot && typeof this.host.attachShadow === "function";
				this.root = useShadow ? this.host.attachShadow({ mode: "open" }) : this.host;
				appendStyle(this.root);
				this.result = new Promise((resolve) => {
					this.resolveResult = resolve;
				});
				const controller = this;
				this.context = {
					get id() {
						return controller.id;
					},
					get values() {
						return controller.valuesValue;
					},
					get errors() {
						return controller.errorsValue;
					},
					get schema() {
						return controller.schemaValue;
					},
					get host() {
						return controller.host;
					},
					get root() {
						return controller.root;
					},
					get surface() {
						return controller.handle;
					},
					get(name) {
						return controller.valuesValue[name];
					},
					set(name, value) {
						controller.setValue(name, value);
					},
					setValues(values) {
						controller.setValues(values);
					},
					reset() {
						controller.reset();
					},
					validate() {
						return controller.validate();
					},
					close(data) {
						controller.finish("dismiss", data, "api");
					},
					dismiss(reason) {
						controller.finish("dismiss", void 0, reason ?? "api");
					},
					setLoading(loading) {
						controller.setLoading(loading);
					},
					setActionLoading(actionId, loading) {
						controller.setActionLoading(actionId, loading);
					},
					setFieldError(name, error) {
						controller.setFieldError(name, error);
					},
					clearErrors() {
						controller.clearErrors();
					},
					update(patch) {
						controller.update(patch);
					}
				};
				this.handle = {
					id: this.id,
					result: this.result,
					element: this.host,
					context: this.context,
					close: (data) => this.finish("dismiss", data, "api"),
					dismiss: (reason) => this.finish("dismiss", void 0, reason ?? "api"),
					update: (patch) => this.update(patch),
					setValue: (name, value) => this.setValue(name, value),
					setValues: (values) => this.setValues(values),
					getValue: (name) => this.valuesValue[name],
					validate: () => this.validate(),
					setLoading: (loading) => this.setLoading(loading),
					destroy: () => this.destroy()
				};
				this.mount();
			}
			buildInitialValues(schema) {
				const result = { ...schema.initialValues || {} };
				const fields = this.getAllFields(schema);
				for (const field of fields) {
					if (field.type === "divider" || field.type === "html" || field.type === "button") continue;
					if (Object.prototype.hasOwnProperty.call(result, field.name)) continue;
					if (field.value !== void 0) result[field.name] = cloneValue(field.value);
					else if (field.defaultValue !== void 0) result[field.name] = cloneValue(field.defaultValue);
					else result[field.name] = this.defaultForField(field);
				}
				return result;
			}
			defaultForField(field) {
				switch (field.type) {
					case "checkbox":
					case "switch": return false;
					case "multiselect":
					case "checkbox-group": return [];
					case "range": return field.min ?? 0;
					case "number": return "";
					case "rating": return field.allowZero === false ? 1 : 0;
					case "file": return [];
					default: return "";
				}
			}
			cloneValues(values) {
				const out = {};
				for (const [key, value] of Object.entries(values)) out[key] = cloneValue(value);
				return out;
			}
			getAllFields(schema = this.schemaValue) {
				const direct = schema.fields ? Array.from(schema.fields) : [];
				const sectionFields = schema.sections?.flatMap((section) => Array.from(section.fields)) ?? [];
				return [...direct, ...sectionFields];
			}
			mount() {
				this.previousFocus = this.doc.activeElement;
				(globalConfig.mount?.(this.doc) || this.doc.body || this.doc.documentElement).append(this.host);
				this.render();
				activeHandles.set(this.id, this.handle);
				if (this.schemaValue.scrollLock !== false) lockDocumentScroll(this.doc);
				this.bindGlobalEvents();
				this.setupVisualViewport();
				requestAnimationFrame(() => {
					const root = this.getRootElement();
					root.dataset.open = "true";
					this.host.setAttribute(ACTIVE_ATTR, "true");
					this.focusInitial();
					try {
						this.schemaValue.onOpen?.(this.context);
					} catch (error) {
						this.reportError(error);
					}
				});
			}
			render() {
				this.fieldNodes.clear();
				this.inputNodes.clear();
				this.customNodes.clear();
				this.root.querySelector?.(".rm-root")?.remove();
				const root = this.doc.createElement("div");
				root.className = `rm-root ${this.schemaValue.className || ""}`.trim();
				root.dataset.open = "false";
				root.dataset.loading = String(this.loading);
				root.dataset.presentation = normalizePresentation(this.schemaValue.presentation, this.win);
				root.dataset.side = this.schemaValue.drawerSide || "right";
				root.style.setProperty("--rm-z", String(this.schemaValue.zIndex ?? globalConfig.zIndex));
				root.style.setProperty("--rm-width", getSizeWidth(this.schemaValue.size));
				const backdrop = this.doc.createElement("div");
				backdrop.className = "rm-backdrop";
				if (this.schemaValue.closeOnBackdrop !== false && this.schemaValue.dismissible !== false) backdrop.addEventListener("pointerdown", (event) => {
					if (event.target === backdrop) this.finish("dismiss", void 0, "backdrop");
				});
				const shell = this.doc.createElement("section");
				shell.className = "rm-shell";
				shell.setAttribute("role", "dialog");
				shell.setAttribute("aria-modal", "true");
				shell.setAttribute("aria-label", this.schemaValue.title || "Menu");
				if (this.schemaValue.showHandle !== false && root.dataset.presentation === "bottom-sheet") {
					const wrap = this.doc.createElement("div");
					wrap.className = "rm-handle-wrap";
					wrap.innerHTML = "<div class=\"rm-handle\" aria-hidden=\"true\"></div>";
					shell.append(wrap);
					if (this.schemaValue.draggable !== false || this.schemaValue.swipeToDismiss !== false) this.bindSwipe(wrap, shell);
				}
				shell.append(this.renderHeader());
				const globalError = this.doc.createElement("div");
				globalError.className = "rm-global-error";
				globalError.dataset.show = "false";
				shell.append(globalError);
				const body = this.doc.createElement("div");
				body.className = "rm-body";
				if (this.schemaValue.fields?.length) body.append(this.renderSection({ fields: this.schemaValue.fields }));
				for (const section of this.schemaValue.sections || []) body.append(this.renderSection(section));
				shell.append(body);
				if (this.schemaValue.actions?.length) shell.append(this.renderActions());
				root.append(backdrop, shell);
				this.root.append(root);
				this.refreshDynamicState();
			}
			renderHeader() {
				const header = this.doc.createElement("header");
				header.className = "rm-header";
				const heading = this.doc.createElement("div");
				heading.className = "rm-heading";
				if (this.schemaValue.eyebrow) {
					const eyebrow = this.doc.createElement("div");
					eyebrow.className = "rm-eyebrow";
					eyebrow.textContent = this.schemaValue.eyebrow;
					heading.append(eyebrow);
				}
				if (this.schemaValue.title || this.schemaValue.icon) {
					const row = this.doc.createElement("div");
					row.className = "rm-title-row";
					if (this.schemaValue.icon) {
						const icon = this.doc.createElement("div");
						icon.className = "rm-icon";
						icon.innerHTML = this.schemaValue.icon;
						row.append(icon);
					}
					if (this.schemaValue.title) {
						const title = this.doc.createElement("h2");
						title.className = "rm-title";
						title.textContent = this.schemaValue.title;
						row.append(title);
					}
					heading.append(row);
				}
				if (this.schemaValue.description) {
					const description = this.doc.createElement("p");
					description.className = "rm-description";
					description.textContent = this.schemaValue.description;
					heading.append(description);
				}
				header.append(heading);
				if (this.schemaValue.dismissible !== false) {
					const close = this.doc.createElement("button");
					close.type = "button";
					close.className = "rm-close";
					close.setAttribute("aria-label", "Fechar");
					close.innerHTML = "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" aria-hidden=\"true\"><path d=\"M6 6l12 12M18 6L6 18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.1\" stroke-linecap=\"round\"/></svg>";
					close.addEventListener("click", () => this.finish("dismiss", void 0, "api"));
					header.append(close);
				}
				return header;
			}
			renderSection(section) {
				const wrapper = this.doc.createElement("section");
				wrapper.className = "rm-section";
				if (section.id) wrapper.dataset.section = section.id;
				if (section.visibleWhen && !this.safePredicate(section.visibleWhen)) wrapper.hidden = true;
				let collapsed = !!section.collapsed;
				let fieldsContainer;
				if (section.title || section.description) {
					const head = this.doc.createElement("div");
					head.className = "rm-section-head";
					const makeCopy = () => {
						const copy = this.doc.createElement("div");
						if (section.title) {
							const title = this.doc.createElement("h3");
							title.className = "rm-section-title";
							title.textContent = section.title;
							copy.append(title);
						}
						if (section.description) {
							const description = this.doc.createElement("p");
							description.className = "rm-section-description";
							description.textContent = section.description;
							copy.append(description);
						}
						return copy;
					};
					if (section.collapsible) {
						const toggle = this.doc.createElement("button");
						toggle.type = "button";
						toggle.className = "rm-section-toggle";
						toggle.append(makeCopy());
						const glyph = this.doc.createElement("span");
						glyph.textContent = collapsed ? "+" : "−";
						toggle.append(glyph);
						toggle.addEventListener("click", () => {
							collapsed = !collapsed;
							fieldsContainer.hidden = collapsed;
							glyph.textContent = collapsed ? "+" : "−";
						});
						head.append(toggle);
					} else head.append(makeCopy());
					wrapper.append(head);
				}
				fieldsContainer = this.doc.createElement("div");
				fieldsContainer.className = "rm-fields";
				fieldsContainer.hidden = collapsed;
				for (const field of section.fields) fieldsContainer.append(this.renderField(field));
				wrapper.append(fieldsContainer);
				return wrapper;
			}
			renderField(field) {
				const row = this.doc.createElement("div");
				row.className = `rm-field ${field.className || ""}`.trim();
				row.dataset.field = field.name;
				row.dataset.hidden = String(!!field.hidden);
				this.fieldNodes.set(field.name, row);
				if (field.type === "divider") {
					row.innerHTML = "<div class=\"rm-divider\" aria-hidden=\"true\"></div>";
					return row;
				}
				if (field.type !== "checkbox" && field.type !== "switch" && field.type !== "hidden" && field.type !== "button" && field.type !== "html") {
					const labelRow = this.doc.createElement("div");
					labelRow.className = "rm-label-row";
					const label = this.doc.createElement("label");
					label.className = "rm-label";
					label.htmlFor = `${this.id}-${field.name}`;
					label.textContent = field.label || field.name;
					if (field.required) {
						const req = this.doc.createElement("span");
						req.className = "rm-required";
						req.textContent = "*";
						label.append(req);
					}
					labelRow.append(label);
					if (field.description) {
						const desc = this.doc.createElement("span");
						desc.className = "rm-description-field";
						desc.textContent = field.description;
						labelRow.append(desc);
					}
					row.append(labelRow);
				}
				row.append(this.createControl(field));
				if (field.help) {
					const help = this.doc.createElement("div");
					help.className = "rm-help";
					help.textContent = field.help;
					row.append(help);
				}
				const error = this.doc.createElement("div");
				error.className = "rm-error";
				error.setAttribute("role", "alert");
				row.append(error);
				return row;
			}
			createControl(field) {
				const value = this.valuesValue[field.name];
				const baseInput = (type) => {
					const input = this.doc.createElement("input");
					input.id = `${this.id}-${field.name}`;
					input.name = field.name;
					input.type = type;
					input.className = "rm-control";
					input.placeholder = field.placeholder || "";
					input.disabled = !!field.disabled;
					input.readOnly = !!field.readonly;
					input.required = !!field.required;
					input.autofocus = !!field.autoFocus;
					applyAttributes(input, field.attributes);
					this.inputNodes.set(field.name, input);
					return input;
				};
				switch (field.type) {
					case "text":
					case "email":
					case "password":
					case "search":
					case "url":
					case "tel": {
						const input = baseInput(field.type);
						input.value = String(value ?? "");
						if (field.minLength != null) input.minLength = field.minLength;
						if (field.maxLength != null) input.maxLength = field.maxLength;
						if (field.pattern) input.pattern = field.pattern;
						if (field.autocomplete) input.setAttribute("autocomplete", field.autocomplete);
						if (field.inputmode) input.setAttribute("inputmode", field.inputmode);
						if (field.spellcheck != null) input.spellcheck = field.spellcheck;
						input.addEventListener("input", () => this.commitField(field, input.value));
						return input;
					}
					case "number": {
						const input = baseInput("number");
						input.value = value === "" || value == null ? "" : String(value);
						if (field.min != null) input.min = String(field.min);
						if (field.max != null) input.max = String(field.max);
						if (field.step != null) input.step = String(field.step);
						input.addEventListener("input", () => this.commitField(field, input.value === "" ? "" : input.valueAsNumber));
						return input;
					}
					case "textarea": {
						const input = this.doc.createElement("textarea");
						input.id = `${this.id}-${field.name}`;
						input.name = field.name;
						input.className = "rm-textarea";
						input.placeholder = field.placeholder || "";
						input.value = String(value ?? "");
						input.rows = field.rows ?? 4;
						input.disabled = !!field.disabled;
						input.readOnly = !!field.readonly;
						input.required = !!field.required;
						input.autofocus = !!field.autoFocus;
						if (field.minLength != null) input.minLength = field.minLength;
						if (field.maxLength != null) input.maxLength = field.maxLength;
						input.style.resize = field.resize || "vertical";
						applyAttributes(input, field.attributes);
						input.addEventListener("input", () => this.commitField(field, input.value));
						this.inputNodes.set(field.name, input);
						return input;
					}
					case "select": {
						const select = this.doc.createElement("select");
						select.id = `${this.id}-${field.name}`;
						select.name = field.name;
						select.className = "rm-select";
						select.disabled = !!field.disabled;
						for (const option of field.options) {
							const el = this.doc.createElement("option");
							el.value = option.value;
							el.textContent = option.label;
							el.disabled = !!option.disabled;
							select.append(el);
						}
						select.value = String(value ?? "");
						select.addEventListener("change", () => this.commitField(field, select.value));
						this.inputNodes.set(field.name, select);
						return select;
					}
					case "multiselect": {
						const box = this.doc.createElement("div");
						box.className = "rm-chipbox";
						const selected = new Set(Array.isArray(value) ? value.map(String) : []);
						for (const option of field.options) {
							const button = this.doc.createElement("button");
							button.type = "button";
							button.className = "rm-chip";
							button.textContent = option.label;
							button.disabled = !!option.disabled;
							const sync = () => button.dataset.selected = String(selected.has(option.value));
							sync();
							button.addEventListener("click", () => {
								selected.has(option.value) ? selected.delete(option.value) : selected.add(option.value);
								sync();
								this.commitField(field, Array.from(selected));
							});
							box.append(button);
						}
						this.inputNodes.set(field.name, box);
						return box;
					}
					case "radio":
					case "checkbox-group": {
						const options = this.doc.createElement("div");
						options.className = "rm-options";
						options.dataset.direction = field.direction || "vertical";
						const current = field.type === "checkbox-group" ? new Set(Array.isArray(value) ? value.map(String) : []) : null;
						for (const option of field.options) {
							const label = this.doc.createElement("label");
							label.className = "rm-option";
							const input = this.doc.createElement("input");
							input.type = field.type === "radio" ? "radio" : "checkbox";
							input.name = field.type === "radio" ? field.name : `${field.name}[]`;
							input.value = option.value;
							input.disabled = !!option.disabled;
							input.checked = field.type === "radio" ? String(value ?? "") === option.value : current.has(option.value);
							input.addEventListener("change", () => {
								if (field.type === "radio") this.commitField(field, option.value);
								else {
									input.checked ? current.add(option.value) : current.delete(option.value);
									this.commitField(field, Array.from(current));
								}
							});
							const copy = this.doc.createElement("span");
							copy.className = "rm-option-copy";
							const name = this.doc.createElement("span");
							name.textContent = option.label;
							copy.append(name);
							if (option.description) {
								const desc = this.doc.createElement("span");
								desc.className = "rm-option-desc";
								desc.textContent = option.description;
								copy.append(desc);
							}
							label.append(input, copy);
							options.append(label);
						}
						this.inputNodes.set(field.name, options);
						return options;
					}
					case "checkbox":
					case "switch": {
						const wrap = this.doc.createElement("label");
						wrap.className = "rm-check-row";
						const copy = this.doc.createElement("span");
						copy.className = "rm-check-label";
						const title = this.doc.createElement("span");
						title.className = "rm-label";
						title.textContent = field.label || field.name;
						copy.append(title);
						if (field.description) {
							const desc = this.doc.createElement("div");
							desc.className = "rm-description-field";
							desc.textContent = field.description;
							copy.append(desc);
						}
						const input = this.doc.createElement("input");
						input.id = `${this.id}-${field.name}`;
						input.name = field.name;
						input.type = "checkbox";
						input.checked = Boolean(value);
						input.disabled = !!field.disabled;
						input.className = field.type === "switch" ? "rm-switch" : "rm-native-check";
						input.addEventListener("change", () => this.commitField(field, input.checked));
						this.inputNodes.set(field.name, input);
						wrap.append(copy, input);
						return wrap;
					}
					case "range": {
						const wrap = this.doc.createElement("div");
						wrap.className = "rm-range-wrap";
						const input = this.doc.createElement("input");
						input.id = `${this.id}-${field.name}`;
						input.name = field.name;
						input.type = "range";
						input.className = "rm-range";
						input.min = String(field.min ?? 0);
						input.max = String(field.max ?? 100);
						input.step = String(field.step ?? 1);
						input.value = String(value ?? field.min ?? 0);
						const out = this.doc.createElement("output");
						out.className = "rm-range-value";
						out.textContent = input.value;
						input.addEventListener("input", () => {
							out.textContent = input.value;
							this.commitField(field, input.valueAsNumber);
						});
						wrap.append(input);
						if (field.showValue !== false) wrap.append(out);
						this.inputNodes.set(field.name, input);
						return wrap;
					}
					case "date":
					case "datetime-local":
					case "time":
					case "month":
					case "week": {
						const input = baseInput(field.type);
						input.value = String(value ?? "");
						if (field.min) input.min = field.min;
						if (field.max) input.max = field.max;
						if (field.step != null) input.step = String(field.step);
						input.addEventListener("input", () => this.commitField(field, input.value));
						return input;
					}
					case "color": {
						const wrap = this.doc.createElement("div");
						wrap.className = "rm-color-row";
						const input = this.doc.createElement("input");
						input.id = `${this.id}-${field.name}`;
						input.name = field.name;
						input.type = "color";
						input.className = "rm-color";
						input.value = typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#ff7a18";
						input.addEventListener("input", () => this.commitField(field, input.value));
						wrap.append(input);
						if (field.presets?.length) {
							const presets = this.doc.createElement("div");
							presets.className = "rm-presets";
							for (const color of field.presets) {
								const swatch = this.doc.createElement("button");
								swatch.type = "button";
								swatch.className = "rm-swatch";
								swatch.style.background = color;
								swatch.setAttribute("aria-label", color);
								swatch.addEventListener("click", () => {
									input.value = color;
									this.commitField(field, color);
								});
								presets.append(swatch);
							}
							wrap.append(presets);
						}
						this.inputNodes.set(field.name, input);
						return wrap;
					}
					case "file": {
						const input = baseInput("file");
						if (field.accept) input.accept = field.accept;
						input.multiple = !!field.multiple;
						if (field.capture) input.setAttribute("capture", field.capture);
						input.addEventListener("change", () => this.commitField(field, Array.from(input.files || [])));
						return input;
					}
					case "hidden": {
						const input = baseInput("hidden");
						input.value = String(value ?? "");
						input.addEventListener("change", () => this.commitField(field, input.value));
						return input;
					}
					case "segmented": {
						const segmented = this.doc.createElement("div");
						segmented.className = "rm-segmented";
						for (const option of field.options) {
							const button = this.doc.createElement("button");
							button.type = "button";
							button.className = "rm-segment";
							button.textContent = option.label;
							button.disabled = !!option.disabled;
							const sync = () => button.dataset.selected = String(String(this.valuesValue[field.name] ?? "") === option.value);
							sync();
							button.addEventListener("click", () => {
								this.commitField(field, option.value);
								segmented.querySelectorAll(".rm-segment").forEach((node) => node.dataset.selected = String(node === button));
							});
							segmented.append(button);
						}
						this.inputNodes.set(field.name, segmented);
						return segmented;
					}
					case "rating": {
						const stars = this.doc.createElement("div");
						stars.className = "rm-stars";
						const max = Math.max(1, field.max ?? 5);
						for (let i = 1; i <= max; i += 1) {
							const button = this.doc.createElement("button");
							button.type = "button";
							button.className = "rm-star";
							button.textContent = "★";
							const sync = () => button.dataset.on = String(Number(this.valuesValue[field.name] || 0) >= i);
							sync();
							button.addEventListener("click", () => {
								const next = field.allowZero !== false && Number(this.valuesValue[field.name]) === i ? 0 : i;
								this.commitField(field, next);
								stars.querySelectorAll(".rm-star").forEach((node, index) => node.dataset.on = String(index < next));
							});
							stars.append(button);
						}
						this.inputNodes.set(field.name, stars);
						return stars;
					}
					case "button": {
						const button = this.doc.createElement("button");
						button.type = "button";
						button.className = "rm-field-button rm-action";
						button.dataset.variant = field.variant || "secondary";
						button.textContent = field.text || field.label || field.name;
						button.addEventListener("click", async () => {
							try {
								await field.onPress?.(this.context);
							} catch (error) {
								this.reportError(error);
							}
						});
						return button;
					}
					case "html": {
						const html = this.doc.createElement("div");
						html.innerHTML = typeof field.html === "function" ? field.html(this.context) : field.html;
						return html;
					}
					case "custom": {
						const container = this.doc.createElement("div");
						container.dataset.customField = field.name;
						const rendered = field.render(this.context, field);
						if (typeof rendered === "string") container.innerHTML = rendered;
						else if (rendered) container.append(rendered);
						this.customNodes.set(field.name, container);
						return container;
					}
				}
				throw new Error(`Unsupported RodMenu field type: ${field.type}`);
			}
			renderActions() {
				const footer = this.doc.createElement("footer");
				footer.className = "rm-actions";
				for (const action of this.schemaValue.actions || []) {
					const button = this.doc.createElement("button");
					button.type = action.role === "submit" ? "submit" : "button";
					button.className = "rm-action";
					button.dataset.action = action.id;
					button.dataset.variant = action.variant || (action.role === "destructive" ? "danger" : action.role === "cancel" ? "secondary" : "primary");
					if (action.icon) {
						const icon = this.doc.createElement("span");
						icon.innerHTML = action.icon;
						button.append(icon);
					}
					const text = this.doc.createElement("span");
					text.textContent = action.label;
					button.append(text);
					button.addEventListener("click", () => void this.runAction(action));
					footer.append(button);
				}
				return footer;
			}
			commitField(field, raw) {
				const value = field.transform ? field.transform(raw, this.context) : raw;
				this.valuesValue[field.name] = value;
				this.setFieldError(field.name, null);
				try {
					field.onChange?.(value, this.context);
				} catch (error) {
					this.reportError(error);
				}
				try {
					this.schemaValue.onChange?.(this.context);
				} catch (error) {
					this.reportError(error);
				}
				this.refreshDynamicState();
			}
			async runAction(action) {
				if (this.actionLoading.has(action.id) || this.loading) return;
				if (action.validate !== false && action.role !== "cancel") {
					if (!await this.validate()) return;
				}
				this.setActionLoading(action.id, true);
				try {
					const data = action.handler ? await action.handler(this.context) : void 0;
					if (action.close ?? [
						"submit",
						"cancel",
						"destructive"
					].includes(action.role || "custom")) this.finish(action.id, data, "action");
				} catch (error) {
					this.reportError(error);
				} finally {
					this.setActionLoading(action.id, false);
				}
			}
			safePredicate(fn) {
				try {
					return !!fn(this.valuesValue, this.context);
				} catch (error) {
					this.reportError(error);
					return true;
				}
			}
			refreshDynamicState() {
				for (const field of this.getAllFields()) {
					const row = this.fieldNodes.get(field.name);
					if (!row) continue;
					const visible = !field.hidden && (!field.visibleWhen || this.safePredicate(field.visibleWhen));
					row.dataset.hidden = String(!visible);
					const disabled = !!field.disabled || !!field.disabledWhen?.(this.valuesValue, this.context);
					const input = this.inputNodes.get(field.name);
					if (input && "disabled" in input) input.disabled = disabled;
				}
				for (const action of this.schemaValue.actions || []) {
					const button = this.root.querySelector(`.rm-action[data-action="${CSS.escape(action.id)}"]`);
					if (!button) continue;
					button.hidden = !(!action.hidden && (!action.visibleWhen || action.visibleWhen(this.valuesValue, this.context)));
					button.disabled = this.loading || this.actionLoading.has(action.id) || !!action.disabled || !!action.disabledWhen?.(this.valuesValue, this.context);
				}
			}
			async validate() {
				this.clearErrors();
				let firstInvalid = null;
				const fields = this.getAllFields();
				for (const field of fields) {
					if ([
						"divider",
						"html",
						"button",
						"hidden"
					].includes(field.type)) continue;
					const row = this.fieldNodes.get(field.name);
					if (row?.dataset.hidden === "true") continue;
					const value = this.readFieldValue(field);
					if (field.required && this.isEmptyValue(value)) {
						this.setFieldError(field.name, "Campo obrigatório.");
						firstInvalid ||= this.inputNodes.get(field.name) || row || null;
						continue;
					}
					if (field.validate) try {
						const message = await field.validate(value, this.valuesValue, this.context);
						if (message) {
							this.setFieldError(field.name, message);
							firstInvalid ||= this.inputNodes.get(field.name) || row || null;
						}
					} catch (error) {
						this.setFieldError(field.name, error instanceof Error ? error.message : "Valor inválido.");
						firstInvalid ||= this.inputNodes.get(field.name) || row || null;
					}
				}
				if (this.schemaValue.validate) try {
					const result = await this.schemaValue.validate(this.valuesValue, this.context);
					if (typeof result === "string" && result) this.setGlobalError(result);
					else if (result && typeof result === "object") {
						for (const [name, message] of Object.entries(result)) if (message) this.setFieldError(name, message);
					}
				} catch (error) {
					this.setGlobalError(error instanceof Error ? error.message : "Não foi possível validar o formulário.");
				}
				const valid = Object.keys(this.errorsValue).length === 0 && !this.getGlobalError();
				if (!valid && firstInvalid) {
					firstInvalid.scrollIntoView({
						behavior: "smooth",
						block: "center"
					});
					if ("focus" in firstInvalid) firstInvalid.focus({ preventScroll: true });
				}
				return valid;
			}
			readFieldValue(field) {
				if (field.type === "custom" && field.read) {
					const node = this.customNodes.get(field.name);
					if (node) {
						const next = field.read(node, this.context);
						this.valuesValue[field.name] = next;
						return next;
					}
				}
				return this.valuesValue[field.name];
			}
			isEmptyValue(value) {
				return value == null || value === "" || Array.isArray(value) && value.length === 0 || value === false;
			}
			setFieldError(name, error) {
				const row = this.fieldNodes.get(name);
				if (!error) {
					delete this.errorsValue[name];
					if (row) {
						row.dataset.error = "false";
						const node = row.querySelector(".rm-error");
						if (node) node.textContent = "";
					}
					return;
				}
				this.errorsValue[name] = error;
				if (row) {
					row.dataset.error = "true";
					const node = row.querySelector(".rm-error");
					if (node) node.textContent = error;
				}
			}
			clearErrors() {
				this.errorsValue = {};
				this.setGlobalError("");
				for (const row of this.fieldNodes.values()) {
					row.dataset.error = "false";
					const node = row.querySelector(".rm-error");
					if (node) node.textContent = "";
				}
			}
			setGlobalError(message) {
				const node = this.root.querySelector(".rm-global-error");
				if (!node) return;
				node.textContent = message;
				node.dataset.show = String(!!message);
				if (message) this.errorsValue.__global = message;
				else delete this.errorsValue.__global;
			}
			getGlobalError() {
				return this.errorsValue.__global || "";
			}
			setValue(name, value) {
				this.valuesValue[name] = value;
				this.writeValueToControl(name, value);
				this.refreshDynamicState();
				try {
					this.schemaValue.onChange?.(this.context);
				} catch (error) {
					this.reportError(error);
				}
			}
			setValues(values) {
				for (const [name, value] of Object.entries(values)) {
					this.valuesValue[name] = value;
					this.writeValueToControl(name, value);
				}
				this.refreshDynamicState();
				try {
					this.schemaValue.onChange?.(this.context);
				} catch (error) {
					this.reportError(error);
				}
			}
			writeValueToControl(name, value) {
				const field = this.getAllFields().find((item) => item.name === name);
				if (!field) return;
				if (field.type === "custom" && field.write) {
					const container = this.customNodes.get(name);
					if (container) field.write(container, value, this.context);
					return;
				}
				const input = this.inputNodes.get(name);
				if (!input) return;
				if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
					if (input instanceof HTMLInputElement && ["checkbox", "radio"].includes(input.type)) input.checked = Boolean(value);
					else if (!(input instanceof HTMLInputElement && input.type === "file")) input.value = String(value ?? "");
				} else {
					this.render();
					requestAnimationFrame(() => {
						const root = this.getRootElement();
						root.dataset.open = "true";
					});
				}
			}
			reset() {
				this.valuesValue = this.cloneValues(this.initialValues);
				this.render();
				requestAnimationFrame(() => {
					this.getRootElement().dataset.open = "true";
				});
			}
			update(patch) {
				this.schemaValue = {
					...this.schemaValue,
					...patch
				};
				this.render();
				requestAnimationFrame(() => {
					this.getRootElement().dataset.open = "true";
				});
			}
			setLoading(loading) {
				this.loading = loading;
				const root = this.getRootElement();
				root.dataset.loading = String(loading);
				this.refreshDynamicState();
			}
			setActionLoading(actionId, loading) {
				loading ? this.actionLoading.add(actionId) : this.actionLoading.delete(actionId);
				const button = this.root.querySelector(`.rm-action[data-action="${CSS.escape(actionId)}"]`);
				if (!button) return;
				const existing = button.querySelector(".rm-spinner");
				if (loading && !existing) {
					const spinner = this.doc.createElement("span");
					spinner.className = "rm-spinner";
					button.prepend(spinner);
				} else if (!loading && existing) existing.remove();
				this.refreshDynamicState();
			}
			bindGlobalEvents() {
				const keydown = (event) => {
					if (this.destroyed || this.settled) return;
					if (event.key === "Escape" && this.schemaValue.dismissible !== false && this.schemaValue.closeOnEscape !== false) {
						event.preventDefault();
						this.finish("dismiss", void 0, "escape");
						return;
					}
					if (event.key === "Tab" && this.schemaValue.trapFocus !== false) this.handleTab(event);
					if (event.key === "Enter" && this.schemaValue.submitOnEnter !== false) {
						const target = event.target;
						if (target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
						const submit = this.schemaValue.actions?.find((action) => action.role === "submit");
						if (submit) {
							event.preventDefault();
							this.runAction(submit);
						}
					}
				};
				this.doc.addEventListener("keydown", keydown, true);
				this.listeners.push(() => this.doc.removeEventListener("keydown", keydown, true));
			}
			handleTab(event) {
				const focusable = this.getFocusable();
				if (!focusable.length) {
					event.preventDefault();
					return;
				}
				const first = focusable[0];
				const last = focusable[focusable.length - 1];
				const active = this.doc.activeElement;
				if (event.shiftKey && active === first) {
					event.preventDefault();
					last.focus();
				} else if (!event.shiftKey && active === last) {
					event.preventDefault();
					first.focus();
				}
			}
			getFocusable() {
				return Array.from(this.root.querySelectorAll("button:not([disabled]):not([hidden]), input:not([disabled]):not([type=\"hidden\"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex=\"-1\"])")).filter((node) => !node.hidden && node.offsetParent !== null);
			}
			focusInitial() {
				(this.root.querySelector("[autofocus]") || this.getFocusable()[0])?.focus({ preventScroll: true });
			}
			setupVisualViewport() {
				const viewport = this.win.visualViewport;
				if (!viewport) return;
				const sync = () => this.getRootElement().style.setProperty("--rm-vvh", `${viewport.height}px`);
				sync();
				viewport.addEventListener("resize", sync);
				viewport.addEventListener("scroll", sync);
				this.listeners.push(() => {
					viewport.removeEventListener("resize", sync);
					viewport.removeEventListener("scroll", sync);
				});
			}
			bindSwipe(handle, shell) {
				let startY = 0;
				let currentY = 0;
				let dragging = false;
				let pointerId = -1;
				const down = (event) => {
					if (event.button !== 0) return;
					dragging = true;
					pointerId = event.pointerId;
					startY = event.clientY;
					currentY = 0;
					handle.setPointerCapture?.(pointerId);
					shell.style.transition = "none";
				};
				const move = (event) => {
					if (!dragging || event.pointerId !== pointerId) return;
					currentY = Math.max(0, event.clientY - startY);
					shell.style.transform = `translate3d(0, ${currentY}px, 0)`;
				};
				const up = (event) => {
					if (!dragging || event.pointerId !== pointerId) return;
					dragging = false;
					shell.style.transition = "";
					if (currentY > Math.min(140, shell.getBoundingClientRect().height * .22) && this.schemaValue.swipeToDismiss !== false && this.schemaValue.dismissible !== false) this.finish("dismiss", void 0, "swipe");
					else shell.style.transform = "";
				};
				handle.addEventListener("pointerdown", down);
				handle.addEventListener("pointermove", move);
				handle.addEventListener("pointerup", up);
				handle.addEventListener("pointercancel", up);
				this.listeners.push(() => {
					handle.removeEventListener("pointerdown", down);
					handle.removeEventListener("pointermove", move);
					handle.removeEventListener("pointerup", up);
					handle.removeEventListener("pointercancel", up);
				});
			}
			finish(action, data, reason) {
				if (this.settled) return;
				this.settled = true;
				const result = {
					action,
					values: this.cloneValues(this.valuesValue),
					data,
					reason
				};
				const root = this.getRootElement();
				root.dataset.open = "false";
				this.host.removeAttribute(ACTIVE_ATTR);
				const finalize = () => {
					try {
						this.schemaValue.onClose?.(result);
					} catch (error) {
						this.reportError(error);
					}
					this.resolveResult(result);
					this.destroy(false);
				};
				this.win.setTimeout(finalize, 300);
			}
			destroy(resolveIfNeeded = true) {
				if (this.destroyed) return;
				this.destroyed = true;
				for (const off of this.listeners.splice(0)) try {
					off();
				} catch {}
				activeHandles.delete(this.id);
				if (this.schemaValue.scrollLock !== false) unlockDocumentScroll(this.doc);
				this.host.remove();
				if (this.schemaValue.restoreFocus !== false && this.previousFocus instanceof HTMLElement && this.previousFocus.isConnected) try {
					this.previousFocus.focus({ preventScroll: true });
				} catch {}
				if (resolveIfNeeded && !this.settled) {
					this.settled = true;
					this.resolveResult({
						action: "dismiss",
						values: this.cloneValues(this.valuesValue),
						reason: "api"
					});
				}
			}
			getRootElement() {
				const root = this.root.querySelector(".rm-root");
				if (!root) throw new Error("RodMenu root is not mounted.");
				return root;
			}
			reportError(error) {
				try {
					this.schemaValue.onError?.(error, this.context);
				} catch {}
				try {
					globalConfig.onError?.(error);
				} catch {}
				if (this.schemaValue.errorMode !== "silent") this.setGlobalError(error instanceof Error ? error.message : String(error));
				try {
					console.error("[RodMenu]", error);
				} catch {}
			}
		}
		const previousGlobal = rootWindow[GLOBAL_NAME];
		const api = {
			version: VERSION,
			get config() {
				return Object.freeze({ ...globalConfig });
			},
			open(schema) {
				return new SurfaceController(schema).handle;
			},
			async form(schema) {
				const actions = schema.actions || [{
					id: "cancel",
					label: "Cancelar",
					role: "cancel",
					variant: "secondary"
				}, {
					id: "submit",
					label: "Continuar",
					role: "submit",
					variant: "primary"
				}];
				return api.open({
					...schema,
					actions
				}).result;
			},
			async confirm(options) {
				return (await api.open({
					title: options.title,
					description: options.description,
					presentation: options.presentation,
					actions: [{
						id: "cancel",
						label: options.cancelLabel || "Cancelar",
						role: "cancel",
						variant: "secondary"
					}, {
						id: "confirm",
						label: options.confirmLabel || "Confirmar",
						role: options.danger ? "destructive" : "submit",
						variant: options.danger ? "danger" : "primary"
					}]
				}).result).action === "confirm";
			},
			async actions(options) {
				const result = await api.open({
					title: options.title,
					description: options.description,
					presentation: options.presentation,
					actions: [...options.items.map((item) => ({
						id: item.value,
						label: item.label,
						icon: item.icon,
						variant: item.variant || "secondary",
						role: "custom",
						close: true
					})), {
						id: "cancel",
						label: "Cancelar",
						variant: "ghost",
						role: "cancel"
					}]
				}).result;
				return result.action === "dismiss" || result.action === "cancel" ? null : result.action;
			},
			configure(config) {
				globalConfig = {
					...globalConfig,
					...config
				};
			},
			get(id) {
				return activeHandles.get(id);
			},
			closeAll(reason = "replaced") {
				for (const handle of Array.from(activeHandles.values())) handle.dismiss(reason);
			},
			noConflict() {
				try {
					rootWindow[GLOBAL_NAME] = previousGlobal;
				} catch {}
				return api;
			}
		};
		publishEverywhere(api);
	})(window);

//#endregion
//#region \0rod-iife-entry:browser:/home/runner/work/rodkisten.github.io/rodkisten.github.io/menu/menu.ts
	const __globalName = "RodMenu";
	const __roots = [];
	function __addRoot(value) {
		if (!value || typeof value !== "object" && typeof value !== "function") return;
		if (!__roots.includes(value)) __roots.push(value);
	}
	__addRoot(globalThis);
	try {
		if (typeof window !== "undefined") __addRoot(window);
	} catch {}
	try {
		if (typeof self !== "undefined") __addRoot(self);
	} catch {}
	try {
		if (typeof unsafeWindow !== "undefined") __addRoot(unsafeWindow);
	} catch {}
	try {
		if (typeof window !== "undefined") __addRoot(window.parent);
	} catch {}
	try {
		if (typeof window !== "undefined") __addRoot(window.top);
	} catch {}
	let __existing;
	for (const __root of __roots) try {
		const __candidate = __root[__globalName];
		if (__candidate !== void 0) {
			__existing = __candidate;
			break;
		}
	} catch {}
	const __hasExports = Object.keys(menu_exports).length > 0;
	const __value = Object.prototype.hasOwnProperty.call(menu_exports, "default") ? void 0 : Object.prototype.hasOwnProperty.call(menu_exports, __globalName) ? menu_exports[__globalName] : __hasExports ? menu_exports : __existing;
	function __publish(__root) {
		if (__value === void 0) return;
		try {
			Object.defineProperty(__root, __globalName, {
				value: __value,
				configurable: true,
				writable: true
			});
			return;
		} catch {}
		try {
			__root[__globalName] = __value;
		} catch {}
	}
	for (const __root of __roots) __publish(__root);

//#endregion
return __value;
})();