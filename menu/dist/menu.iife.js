/* Auto-generated from menu/menu.ts. at 8/14/2026, 6:57:33 PM Do not edit directly. */
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
	(function installRodMenu(rootWindow) {
		"use strict";
		const VERSION = "2.2.1";
		const GLOBAL_NAME = "RodMenu";
		const ROOT_ATTR = "data-rod-menu-host";
		const ACTIVE_ATTR = "data-rod-menu-active";
		const ID_PREFIX = "rod-menu";
		const DEFAULT_Z_INDEX = 2147482500;
		const STYLE_VERSION = "v2.2.1";
		const defaultDependencyUrls = {
			elements: [
				"https://rod.migos.club/elements/dist/elements.js",
				"https://rod.migos.club/elements/elements.js",
				"https://raw.githubusercontent.com/rodkisten/rodkisten.github.io/master/elements/elements.js"
			],
			toaster: ["https://rod.migos.club/userscripts/toaster.js?v=4.7.0", "https://rod.migos.club/userscripts/toaster.js"],
			cipo: ["https://rod.migos.club/bundler/cipo.iife.js"],
			broto: ["https://rod.migos.club/bundler/broto.iife.js"]
		};
		const defaultGestureConfig = {
			preventPullToRefresh: true,
			dragFromContent: true,
			dismissThresholdPx: 140,
			dismissThresholdRatio: .22,
			velocityThresholdPxMs: .65,
			activationDistancePx: 5
		};
		const defaultConfig = {
			shadowRoot: true,
			defaultPresentation: "bottom-sheet",
			zIndex: DEFAULT_Z_INDEX,
			autoLoadDependencies: true,
			dependencyTimeoutMs: 8e3,
			dependencyUrls: defaultDependencyUrls,
			toasterErrors: true,
			gestures: defaultGestureConfig,
			defaultSchema: {},
			theme: {},
			css: "",
			components: {},
			fieldTypes: {},
			refreshActiveOnConfigure: true
		};
		let globalConfig = {
			...defaultConfig,
			dependencyUrls: { ...defaultDependencyUrls },
			gestures: { ...defaultGestureConfig },
			defaultSchema: {},
			theme: {},
			components: {},
			fieldTypes: {}
		};
		let counter = 0;
		const activeHandles = /* @__PURE__ */ new Map();
		const registeredComponents = /* @__PURE__ */ new Map();
		const registeredFieldTypes = /* @__PURE__ */ new Map();
		const docState = /* @__PURE__ */ new WeakMap();
		const runtimeStatus = {
			elements: {
				name: "elements",
				state: "fallback"
			},
			toaster: {
				name: "toaster",
				state: "fallback"
			},
			cipo: {
				name: "cipo",
				state: "fallback"
			},
			broto: {
				name: "broto",
				state: "fallback"
			}
		};
		const dependencyPromises = /* @__PURE__ */ new Map();
		const elementFacadeByDocument = /* @__PURE__ */ new WeakMap();
		function getRealmCandidates() {
			const candidates = [];
			const add = (value) => {
				if (!value || typeof value !== "object" && typeof value !== "function") return;
				const realm = value;
				if (!candidates.includes(realm)) candidates.push(realm);
			};
			add(globalThis);
			add(rootWindow);
			try {
				if (typeof unsafeWindow !== "undefined") add(unsafeWindow);
				else add(globalThis["unsafeWindow"]);
			} catch {}
			try {
				add(rootWindow.parent);
			} catch {}
			try {
				add(rootWindow.top);
			} catch {}
			try {
				add(rootWindow.opener);
			} catch {}
			return candidates;
		}
		function readGlobal(names) {
			for (const realm of getRealmCandidates()) for (const name of names) try {
				const value = realm[name];
				if (value != null) return value;
			} catch {}
			return null;
		}
		function resolveRodElements() {
			const runtime = readGlobal(["RodElements"]);
			return runtime && typeof runtime.el === "function" ? runtime : null;
		}
		function resolveCipo() {
			const runtime = readGlobal(["Cipo", "CIPO"]);
			return runtime && typeof runtime === "object" ? runtime : null;
		}
		function resolveBroto() {
			const runtime = readGlobal(["Broto", "broto"]);
			return runtime && typeof runtime.store === "function" ? runtime : null;
		}
		function resolveToaster() {
			const runtime = readGlobal(["RodToaster", "toast"]);
			return runtime && typeof runtime === "object" || typeof runtime === "function" ? runtime : null;
		}
		function markDependency(name, state, source, error) {
			runtimeStatus[name] = {
				name,
				state,
				source,
				error: error == null ? void 0 : error instanceof Error ? error.message : String(error)
			};
		}
		function dependencyPresent(name) {
			switch (name) {
				case "elements": return resolveRodElements();
				case "toaster": return resolveToaster();
				case "cipo": return resolveCipo();
				case "broto": return resolveBroto();
			}
		}
		function waitForDependency(name, timeoutMs) {
			const startedAt = Date.now();
			return new Promise((resolve) => {
				const tick = () => {
					const existing = dependencyPresent(name);
					if (existing) {
						resolve(existing);
						return;
					}
					if (Date.now() - startedAt >= timeoutMs) {
						resolve(null);
						return;
					}
					rootWindow.setTimeout(tick, 32);
				};
				tick();
			});
		}
		function injectScriptTag(url) {
			return new Promise((resolve) => {
				const doc = resolveDocument();
				const script = doc.createElement("script");
				script.src = url;
				script.async = true;
				script.crossOrigin = "anonymous";
				script.dataset.rodMenuDependency = "true";
				let settled = false;
				const timer = rootWindow.setTimeout(() => done(false), globalConfig.dependencyTimeoutMs);
				const done = (ok) => {
					if (settled) return;
					settled = true;
					rootWindow.clearTimeout(timer);
					script.onload = null;
					script.onerror = null;
					if (!ok) script.remove();
					resolve(ok);
				};
				script.onload = () => done(true);
				script.onerror = () => done(false);
				(doc.head || doc.documentElement).append(script);
			});
		}
		async function tryGmAddElement(url) {
			const gmAdd = typeof GM_addElement === "function" ? GM_addElement : readGlobal(["GM_addElement"]);
			if (typeof gmAdd !== "function") return false;
			try {
				gmAdd("script", {
					src: url,
					type: "text/javascript"
				});
				return true;
			} catch {
				return false;
			}
		}
		function requestScriptText(url) {
			const direct = typeof GM_xmlhttpRequest === "function" ? GM_xmlhttpRequest : readGlobal(["GM_xmlhttpRequest"]);
			if (typeof direct === "function") return new Promise((resolve) => {
				try {
					direct({
						method: "GET",
						url,
						timeout: globalConfig.dependencyTimeoutMs,
						onload: (response) => {
							const text = response?.responseText;
							resolve(typeof text === "string" ? text : null);
						},
						onerror: () => resolve(null),
						ontimeout: () => resolve(null)
					});
				} catch {
					resolve(null);
				}
			});
			const gm = typeof GM !== "undefined" ? GM : readGlobal(["GM"]);
			if (gm && typeof gm.xmlHttpRequest === "function") return gm.xmlHttpRequest({
				method: "GET",
				url,
				timeout: globalConfig.dependencyTimeoutMs
			}).then((response) => {
				const text = response?.responseText;
				return typeof text === "string" ? text : null;
			}).catch(() => null);
			return Promise.resolve(null);
		}
		function executeScriptText(source) {
			const target = (() => {
				try {
					const unsafe = typeof unsafeWindow !== "undefined" ? unsafeWindow : globalThis["unsafeWindow"];
					if (unsafe && typeof unsafe === "object") return unsafe;
				} catch {}
				return rootWindow;
			})();
			try {
				const doc = target.document;
				const script = doc.createElement("script");
				script.textContent = `${source}\n//# sourceURL=rod-menu-dependency.js`;
				(doc.head || doc.documentElement).append(script);
				script.remove();
				return true;
			} catch {}
			try {
				const Executor = target.Function;
				Executor(`${source}\n//# sourceURL=rod-menu-dependency.js`).call(target);
				return true;
			} catch {}
			return false;
		}
		async function tryDynamicImport(url) {
			try {
				await new Function("url", "return import(url)")(url);
				return true;
			} catch {
				return false;
			}
		}
		async function tryRequire(url) {
			const req = typeof require === "function" ? require : readGlobal(["require"]);
			if (typeof req !== "function") return false;
			try {
				const result = req(url);
				if (result && typeof result.then === "function") await result;
				return true;
			} catch {}
			try {
				await new Promise((resolve, reject) => {
					req([url], () => resolve(), (error) => reject(error));
				});
				return true;
			} catch {
				return false;
			}
		}
		async function loadDependency(name) {
			const existing = dependencyPresent(name);
			if (existing) {
				markDependency(name, "native", "window");
				return existing;
			}
			const pending = dependencyPromises.get(name);
			if (pending) return pending;
			const promise = (async () => {
				markDependency(name, "loading");
				const urls = globalConfig.dependencyUrls[name];
				let lastError = null;
				for (const url of urls) try {
					if (await injectScriptTag(url)) {
						const loaded = await waitForDependency(name, 500);
						if (loaded) {
							markDependency(name, "loaded", `script:${url}`);
							return loaded;
						}
					}
					if (await tryGmAddElement(url)) {
						const loaded = await waitForDependency(name, 700);
						if (loaded) {
							markDependency(name, "loaded", `GM_addElement:${url}`);
							return loaded;
						}
					}
					const source = await requestScriptText(url);
					if (source && executeScriptText(source)) {
						const loaded = await waitForDependency(name, 150);
						if (loaded) {
							markDependency(name, "loaded", `GM_xhr:${url}`);
							return loaded;
						}
					}
					if (await tryDynamicImport(url)) {
						const loaded = await waitForDependency(name, 250);
						if (loaded) {
							markDependency(name, "loaded", `import:${url}`);
							return loaded;
						}
					}
					if (await tryRequire(url)) {
						const loaded = await waitForDependency(name, 250);
						if (loaded) {
							markDependency(name, "loaded", `require:${url}`);
							return loaded;
						}
					}
				} catch (error) {
					lastError = error;
				}
				markDependency(name, "fallback", void 0, lastError);
				return null;
			})();
			dependencyPromises.set(name, promise);
			return promise.finally(() => dependencyPromises.delete(name));
		}
		async function loadDependencies() {
			await loadDependency("cipo");
			await Promise.allSettled([
				loadDependency("elements"),
				loadDependency("broto"),
				loadDependency("toaster")
			]);
			return {
				elements: { ...runtimeStatus.elements },
				toaster: { ...runtimeStatus.toaster },
				cipo: { ...runtimeStatus.cipo },
				broto: { ...runtimeStatus.broto }
			};
		}
		function createElement(doc, tag) {
			const elements = resolveRodElements();
			if (elements) try {
				try {
					elements.configure?.({
						document: doc,
						cipo: resolveCipo()
					});
				} catch {}
				let facade = elementFacadeByDocument.get(doc);
				if (!facade) {
					facade = elements;
					elementFacadeByDocument.set(doc, facade);
				}
				const node = facade.el(tag, { $document: doc });
				if (node && node.ownerDocument === doc) return node;
			} catch {}
			return doc.createElement(tag);
		}
		function artifactCssText(value) {
			if (typeof value === "string") return value;
			if (!value || typeof value !== "object") return "";
			const record = value;
			for (const key of [
				"cssText",
				"css",
				"text",
				"code",
				"compiled",
				"value"
			]) {
				const candidate = record[key];
				if (typeof candidate === "string" && candidate.includes("{")) return candidate;
			}
			try {
				const stringified = String(value);
				return stringified !== "[object Object]" && stringified.includes("{") ? stringified : "";
			} catch {
				return "";
			}
		}
		function compileStylesheet(source) {
			const cipo = resolveCipo();
			if (!cipo) return source;
			try {
				const tag = cipo.sheet?.css;
				if (typeof tag === "function") {
					const cooked = [source];
					Object.defineProperty(cooked, "raw", { value: [source] });
					const cssText = artifactCssText(tag.call(cipo.sheet, cooked));
					if (cssText) return cssText;
				}
			} catch {}
			for (const compiler of [cipo.compileCss, cipo.compile]) {
				if (typeof compiler !== "function") continue;
				try {
					const cssText = artifactCssText(compiler.call(cipo, source, { mode: "sheet" }));
					if (cssText) return cssText;
				} catch {}
			}
			return source;
		}
		function setBrotoLeaf(store, name, value) {
			if (!store || typeof store !== "object") return false;
			const leaf = store[name];
			if (leaf && typeof leaf.set === "function") {
				leaf.set(value);
				return true;
			}
			return false;
		}
		function createReactiveStore(initial) {
			let snapshot = { ...initial };
			const broto = resolveBroto();
			let brotoStore = null;
			if (broto?.store) try {
				brotoStore = broto.store({ ...snapshot });
			} catch {}
			const run = (fn) => {
				if (broto?.batch) try {
					broto.batch(fn);
					return;
				} catch {}
				fn();
			};
			return {
				backend: brotoStore ? "broto" : "fallback",
				snapshot: () => snapshot,
				replace(next) {
					snapshot = { ...next };
					if (brotoStore) run(() => {
						for (const [name, value] of Object.entries(snapshot)) setBrotoLeaf(brotoStore, name, value);
					});
				},
				set(name, value) {
					snapshot[name] = value;
					if (brotoStore) run(() => {
						setBrotoLeaf(brotoStore, name, value);
					});
				},
				patch(values) {
					Object.assign(snapshot, values);
					if (brotoStore) run(() => {
						for (const [name, value] of Object.entries(values)) setBrotoLeaf(brotoStore, name, value);
					});
				}
			};
		}
		function getStorageAdapter(storage, win) {
			if (storage && typeof storage === "object") return storage;
			const kind = storage || "local";
			if (kind === "local" || kind === "session") {
				const nativeStorage = (() => {
					try {
						return kind === "local" ? win.localStorage : win.sessionStorage;
					} catch {
						return null;
					}
				})();
				if (!nativeStorage) return null;
				return {
					getItem(key) {
						try {
							return nativeStorage.getItem(key);
						} catch {
							return null;
						}
					},
					setItem(key, value) {
						try {
							nativeStorage.setItem(key, value);
						} catch {}
					},
					removeItem(key) {
						try {
							nativeStorage.removeItem(key);
						} catch {}
					}
				};
			}
			if (kind === "gm") {
				const legacyGet = typeof GM_getValue === "function" ? GM_getValue : readGlobal(["GM_getValue"]);
				const legacySet = typeof GM_setValue === "function" ? GM_setValue : readGlobal(["GM_setValue"]);
				const legacyDelete = typeof GM_deleteValue === "function" ? GM_deleteValue : readGlobal(["GM_deleteValue"]);
				const gmApi = typeof GM !== "undefined" ? GM : readGlobal(["GM"]);
				if ((!legacyGet || !legacySet) && (!gmApi?.getValue || !gmApi?.setValue)) return null;
				return {
					async getItem(key) {
						try {
							const value = gmApi?.getValue ? await gmApi.getValue(key, null) : legacyGet?.(key, null);
							return value == null ? null : String(value);
						} catch {
							return null;
						}
					},
					async setItem(key, value) {
						try {
							if (gmApi?.setValue) await gmApi.setValue(key, value);
							else legacySet?.(key, value);
						} catch {}
					},
					async removeItem(key) {
						try {
							if (gmApi?.deleteValue) await gmApi.deleteValue(key);
							else legacyDelete?.(key);
						} catch {}
					}
				};
			}
			return null;
		}
		function createPersistenceManager(store, storeConfig, id, win, onHydrated, onError) {
			const raw = storeConfig?.persist;
			const config = raw === true ? {
				key: `rod-menu:${id}`,
				storage: "local",
				hydrate: true,
				debounceMs: 120,
				persistOn: "change"
			} : raw && typeof raw === "object" ? raw : null;
			let persistenceState = config ? "idle" : "disabled";
			let timer = 0;
			let chain = Promise.resolve();
			let started = false;
			let resolveReady;
			const ready = new Promise((resolve) => {
				resolveReady = resolve;
			});
			const key = config?.key || `rod-menu:${id}`;
			const adapter = config ? getStorageAdapter(config.storage, win) : null;
			const persistOn = new Set(Array.isArray(config?.persistOn) ? config.persistOn : [config?.persistOn || "change"]);
			const parseStored = async (rawValue) => {
				if (!config) return null;
				const transform = config.transform;
				let stored;
				if (transform?.deserialize) stored = await transform.deserialize(rawValue);
				else {
					const parsed = JSON.parse(rawValue);
					if (parsed && typeof parsed === "object" && "__rodMenu" in parsed) {
						const envelope = parsed;
						if (config.version != null && envelope.version !== config.version) return null;
						stored = envelope.data;
					} else stored = parsed;
				}
				if (transform?.fromStorage) return await transform.fromStorage(stored) ?? null;
				return stored && typeof stored === "object" ? stored : null;
			};
			const serializeSnapshot = async () => {
				if (!config) return "";
				const transform = config.transform;
				const snapshot = store.snapshot();
				const stored = transform?.toStorage ? await transform.toStorage(snapshot) : snapshot;
				if (transform?.serialize) return await transform.serialize(stored);
				return JSON.stringify({
					__rodMenu: 1,
					version: config.version ?? 1,
					data: stored
				});
			};
			const hydrate = async () => {
				if (!config || !adapter || config.hydrate === false) return;
				persistenceState = "hydrating";
				try {
					const storedRaw = await adapter.getItem(key);
					if (storedRaw == null) {
						persistenceState = "ready";
						return;
					}
					const persisted = await parseStored(storedRaw);
					if (!persisted) {
						persistenceState = "ready";
						return;
					}
					const initial = store.snapshot();
					let next;
					if (typeof config.merge === "function") next = config.merge(initial, persisted);
					else if (config.merge === "initial-over-persisted") next = {
						...persisted,
						...initial
					};
					else next = {
						...initial,
						...persisted
					};
					store.replace(next);
					onHydrated(store.snapshot());
					persistenceState = "ready";
				} catch (error) {
					persistenceState = "error";
					onError(error);
				}
			};
			const persist = async () => {
				if (!config || !adapter) return;
				if (timer) {
					win.clearTimeout(timer);
					timer = 0;
				}
				persistenceState = "saving";
				try {
					const serialized = await serializeSnapshot();
					await adapter.setItem(key, serialized);
					persistenceState = "ready";
				} catch (error) {
					persistenceState = "error";
					onError(error);
				}
			};
			const enqueuePersist = () => {
				chain = chain.then(persist, persist);
				return chain;
			};
			const schedule = () => {
				if (!config || !adapter) return;
				const delay = Math.max(0, config.debounceMs ?? 120);
				if (timer) win.clearTimeout(timer);
				if (delay === 0) {
					enqueuePersist();
					return;
				}
				timer = win.setTimeout(() => {
					timer = 0;
					enqueuePersist();
				}, delay);
			};
			return {
				handle: {
					get backend() {
						return store.backend;
					},
					get persistence() {
						return persistenceState;
					},
					ready,
					snapshot: () => store.snapshot(),
					persist: enqueuePersist,
					hydrate,
					async clearPersisted() {
						if (!adapter) return;
						if (timer) {
							win.clearTimeout(timer);
							timer = 0;
						}
						try {
							await adapter.removeItem(key);
							persistenceState = "ready";
						} catch (error) {
							persistenceState = "error";
							onError(error);
						}
					}
				},
				start() {
					if (started) return;
					started = true;
					hydrate().finally(resolveReady);
					if (!config || !adapter || config.hydrate === false) resolveReady();
				},
				trigger(trigger) {
					if (!persistOn.has(trigger)) return;
					if (trigger === "change") schedule();
					else enqueuePersist();
				}
			};
		}
		function notifyToaster(kind, title, description) {
			const toaster = resolveToaster();
			const method = toaster?.[kind];
			if (typeof method !== "function") return false;
			try {
				method.call(toaster, {
					title,
					description
				});
				return true;
			} catch {
				try {
					method.call(toaster, title, description);
					return true;
				} catch {}
			}
			return false;
		}
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
* {
  box-sizing: border-box;
}
button, input, textarea, select {
  font: inherit;
}
button {
  -webkit-tap-highlight-color: transparent;
}
.rm-root {
  position: fixed;
  inset: 0;
  z-index: var(--rm-z);
  pointer-events: none;
  font-family: var(--rm-font);
  color: var(--rm-text);
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
}
.rm-root[data-open="true"] {
  pointer-events: auto;
}
.rm-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.38);
  backdrop-filter: blur(10px) saturate(130%);
  -webkit-backdrop-filter: blur(10px) saturate(130%);
  opacity: 0;
  transition: opacity 240ms var(--rm-ease);
  touch-action: none;
  overscroll-behavior: none;
}
.rm-root[data-open="true"] .rm-backdrop {
  opacity: 1;
}
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
  transition: transform 220ms var(--rm-ease), opacity 180ms ease;
  will-change: transform, opacity;
  overscroll-behavior: contain;
}
.rm-root[data-open="true"] .rm-shell {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
}
.rm-root[data-presentation="bottom-sheet"] .rm-shell {
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-height: min(92dvh, calc(var(--rm-vvh, 100vh) - 8px));
  border-radius: var(--rm-radius) var(--rm-radius) 0 0;
  --rm-sheet-x: 0px;
  --rm-drag-y: 0px;
  opacity: 0;
  transform: translate3d(var(--rm-sheet-x), calc(18px + var(--rm-drag-y)), 0) scale(.992);
}
.rm-root[data-presentation="bottom-sheet"][data-open="true"] .rm-shell {
  opacity: 1;
  transform: translate3d(var(--rm-sheet-x), var(--rm-drag-y), 0) scale(1);
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
.rm-root[data-presentation="drawer"] .rm-shell {
  border-radius: 0;
}
.rm-root[data-presentation="drawer"][data-side="right"] .rm-shell {
  top: 0;
  right: 0;
  bottom: 0;
  width: min(92vw, var(--rm-width, 520px));
  transform: translate3d(105%, 0, 0);
}
.rm-root[data-presentation="drawer"][data-side="left"] .rm-shell {
  top: 0;
  left: 0;
  bottom: 0;
  width: min(92vw, var(--rm-width, 520px));
  transform: translate3d(-105%, 0, 0);
}
.rm-root[data-presentation="drawer"][data-side="top"] .rm-shell {
  top: 0;
  left: 0;
  right: 0;
  max-height: 86dvh;
  transform: translate3d(0, -105%, 0);
}
.rm-root[data-presentation="drawer"][data-side="bottom"] .rm-shell {
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 86dvh;
  transform: translate3d(0, 105%, 0);
}
.rm-root[data-presentation="drawer"][data-open="true"] .rm-shell {
  transform: translate3d(0,0,0);
}
.rm-root[data-presentation="popover"] .rm-shell {
  left: var(--rm-popover-left, 50%);
  top: var(--rm-popover-top, 50%);
  width: min(calc(100vw - 24px), var(--rm-width, 520px));
  max-height: min(80dvh, calc(var(--rm-vvh, 100vh) - 16px));
  border-radius: 22px;
  transform-origin: var(--rm-popover-align, 50%) 0%;
  transform: translate3d(var(--rm-popover-shift, -50%), 10px, 0) scale(.96);
}
.rm-root[data-presentation="popover"][data-popover-above="true"] .rm-shell {
  transform-origin: var(--rm-popover-align, 50%) 100%;
  transform: translate3d(var(--rm-popover-shift, -50%), calc(-100% - 10px), 0) scale(.96);
}
.rm-root[data-presentation="popover"][data-open="true"] .rm-shell {
  transform: translate3d(var(--rm-popover-shift, -50%), 0, 0) scale(1);
}
.rm-root[data-presentation="popover"][data-popover-above="true"][data-open="true"] .rm-shell {
  transform: translate3d(var(--rm-popover-shift, -50%), -100%, 0) scale(1);
}
.rm-handle-wrap {
  display: flex;
  justify-content: center;
  padding: 10px 12px 0;
  touch-action: none;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}
.rm-handle-wrap:active {
  cursor: grabbing;
}
.rm-handle {
  width: 42px;
  height: 5px;
  border-radius: 99px;
  background: var(--rm-border);
}
.rm-header {
  display: grid;
  grid-template-columns: minmax(0,1fr) auto;
  gap: 16px;
  align-items: start;
  padding: 18px 20px 14px;
}
.rm-heading {
  min-width: 0;
}
.rm-eyebrow {
  font: 700 11px/1.2 var(--rm-font);
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--rm-accent);
  margin-bottom: 7px;
}
.rm-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.rm-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--rm-accent) 15%, transparent);
  flex: 0 0 auto;
}
.rm-title {
  margin: 0;
  font: 760 22px/1.12 var(--rm-font);
  letter-spacing: -.025em;
}
.rm-description {
  margin: 8px 0 0;
  font: 450 14px/1.45 var(--rm-font);
  color: var(--rm-muted);
}
.rm-close {
  appearance: none;
  border: 0;
  border-radius: 999px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  background: var(--rm-elevated);
  color: var(--rm-text);
  cursor: pointer;
  transition: transform 160ms ease, background 160ms ease;
}
.rm-close:active {
  transform: scale(.92);
}
.rm-body {
  overflow: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 0 16px 8px;
  scrollbar-width: thin;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
}
.rm-section {
  margin: 0 0 14px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--rm-elevated) 58%, transparent);
  border: 1px solid var(--rm-border);
  overflow: hidden;
}
.rm-section-head {
  padding: 14px 14px 6px;
}
.rm-section-title {
  margin: 0;
  font: 700 13px/1.25 var(--rm-font);
}
.rm-section-description {
  margin: 4px 0 0;
  color: var(--rm-muted);
  font: 430 12px/1.4 var(--rm-font);
}
.rm-section-toggle {
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:0;
}
.rm-fields {
  display: grid;
  gap: 0;
}
.rm-field {
  position: relative;
  padding: 12px 14px;
  border-top: 1px solid var(--rm-border);
  min-width: 0;
}
.rm-field:first-child {
  border-top: 0;
}
.rm-field[data-hidden="true"] {
  display: none !important;
}
.rm-label-row {
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:baseline;
  margin-bottom:7px;
}
.rm-label {
  font: 650 13px/1.25 var(--rm-font);
}
.rm-required {
  color: var(--rm-danger);
  margin-left: 3px;
}
.rm-help, .rm-description-field {
  font: 430 12px/1.35 var(--rm-font);
  color: var(--rm-muted);
}
.rm-help {
  margin-top: 7px;
}
.rm-error {
  margin-top: 7px;
  color: var(--rm-danger);
  font: 600 12px/1.35 var(--rm-font);
  display:none;
}
.rm-field[data-error="true"] .rm-error {
  display:block;
}
.rm-control, .rm-textarea, .rm-select {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--rm-border);
  border-radius: 13px;
  background: color-mix(in srgb, Canvas 87%, transparent);
  color: var(--rm-text);
  outline: none;
  padding: 10px 12px;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}
.rm-control:focus, .rm-textarea:focus, .rm-select:focus {
  border-color: color-mix(in srgb, var(--rm-accent) 72%, white 10%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--rm-accent) 18%, transparent);
}
.rm-textarea {
  resize: vertical;
  min-height: 96px;
}
.rm-check-row {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
}
.rm-check-label {
  min-width:0;
}
.rm-native-check {
  width:20px;
  height:20px;
  accent-color: var(--rm-accent);
}
.rm-switch {
  appearance:none;
  width:48px;
  height:28px;
  border:0;
  border-radius:999px;
  background: var(--rm-border);
  position:relative;
  cursor:pointer;
  transition:background 180ms ease;
  flex:0 0 auto;
}
.rm-switch::after {
  content:"";
  position:absolute;
  width:22px;
  height:22px;
  top:3px;
  left:3px;
  border-radius:50%;
  background:white;
  box-shadow:0 2px 8px rgba(0,0,0,.25);
  transition:transform 180ms var(--rm-ease);
}
.rm-switch:checked {
  background: var(--rm-accent);
}
.rm-switch:checked::after {
  transform: translateX(20px);
}
.rm-options {
  display:flex;
  flex-direction:column;
  gap:8px;
}
.rm-options[data-direction="horizontal"] {
  flex-direction:row;
  flex-wrap:wrap;
}
.rm-option {
  display:flex;
  gap:9px;
  align-items:flex-start;
  font: 500 13px/1.35 var(--rm-font);
}
.rm-option input {
  accent-color: var(--rm-accent);
  margin-top:2px;
}
.rm-option-copy {
  display:grid;
  gap:2px;
}
.rm-option-desc {
  font-size:11px;
  color:var(--rm-muted);
}
.rm-segmented {
  display:grid;
  grid-auto-flow:column;
  grid-auto-columns:minmax(0,1fr);
  gap:4px;
  padding:4px;
  background:var(--rm-elevated);
  border-radius:13px;
}
.rm-segment {
  border:0;
  border-radius:10px;
  padding:9px 10px;
  color:var(--rm-muted);
  background:transparent;
  cursor:pointer;
  font-weight:650;
}
.rm-segment[data-selected="true"] {
  background:var(--rm-panel);
  color:var(--rm-text);
  box-shadow:0 2px 9px rgba(0,0,0,.1);
}
.rm-range-wrap {
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:10px;
  align-items:center;
}
.rm-range {
  width:100%;
  accent-color:var(--rm-accent);
}
.rm-range-value {
  min-width:44px;
  text-align:right;
  font:650 12px/1 var(--rm-font);
  color:var(--rm-muted);
}
.rm-color-row {
  display:flex;
  gap:10px;
  align-items:center;
}
.rm-color {
  width:54px;
  height:42px;
  border:1px solid var(--rm-border);
  border-radius:11px;
  padding:3px;
  background:transparent;
}
.rm-presets {
  display:flex;
  flex-wrap:wrap;
  gap:7px;
}
.rm-swatch {
  width:28px;
  height:28px;
  border-radius:50%;
  border:2px solid color-mix(in srgb, CanvasText 18%, transparent);
  cursor:pointer;
}
.rm-stars {
  display:flex;
  gap:4px;
}
.rm-star {
  border:0;
  background:transparent;
  color:var(--rm-border);
  font-size:27px;
  padding:2px;
  cursor:pointer;
  line-height:1;
}
.rm-star[data-on="true"] {
  color:#ffb020;
}
.rm-chipbox {
  display:flex;
  flex-wrap:wrap;
  gap:7px;
}
.rm-chip {
  border:1px solid var(--rm-border);
  background:var(--rm-panel);
  color:var(--rm-text);
  border-radius:999px;
  padding:8px 11px;
  cursor:pointer;
  font:600 12px/1 var(--rm-font);
}
.rm-chip[data-selected="true"] {
  border-color:var(--rm-accent);
  background:color-mix(in srgb, var(--rm-accent) 13%, var(--rm-panel));
}
.rm-divider {
  height:1px;
  background:var(--rm-border);
  margin:4px 0;
}
.rm-field-button {
  border:0;
  border-radius:13px;
  min-height:42px;
  padding:10px 13px;
  cursor:pointer;
  font-weight:700;
}
.rm-actions {
  display:flex;
  flex-wrap:wrap;
  justify-content:flex-end;
  gap:9px;
  padding:12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top:1px solid var(--rm-border);
  background:color-mix(in srgb, var(--rm-panel) 88%, transparent);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
}
.rm-action {
  position:relative;
  border:0;
  min-height:44px;
  padding:10px 16px;
  border-radius:14px;
  cursor:pointer;
  font:700 13px/1 var(--rm-font);
  transition:transform 140ms ease, opacity 140ms ease, filter 140ms ease;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
}
.rm-action:active {
  transform:scale(.96);
}
.rm-action:disabled {
  opacity:.46;
  cursor:not-allowed;
}
.rm-action[data-variant="primary"] {
  background:linear-gradient(135deg,var(--rm-accent),var(--rm-accent-strong));
  color:white;
}
.rm-action[data-variant="secondary"] {
  background:var(--rm-elevated);
  color:var(--rm-text);
}
.rm-action[data-variant="ghost"] {
  background:transparent;
  color:var(--rm-text);
}
.rm-action[data-variant="danger"] {
  background:var(--rm-danger);
  color:white;
}
.rm-action[data-variant="success"] {
  background:var(--rm-success);
  color:#07250f;
}
.rm-spinner {
  width:14px;
  height:14px;
  border:2px solid currentColor;
  border-right-color:transparent;
  border-radius:50%;
  animation:rm-spin .65s linear infinite;
}
.rm-root[data-loading="true"] .rm-body {
  opacity:.66;
  pointer-events:none;
}
.rm-global-error {
  margin: 0 16px 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--rm-danger) 12%, transparent);
  color: var(--rm-danger);
  font: 600 12px/1.4 var(--rm-font);
  display:none;
}
.rm-global-error[data-show="true"] {
  display:block;
}
@keyframes rm-spin {
  to {
    transform:rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .rm-backdrop, .rm-shell, .rm-action, .rm-close, .rm-switch, .rm-switch::after {
    transition-duration:.001ms !important;
    animation-duration:.001ms !important;
  }
}

.rm-control-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: stretch;
}
.rm-trailing-action,
.rm-mini-button {
  border: 1px solid var(--rm-border);
  border-radius: 12px;
  background: color-mix(in srgb, Canvas 86%, transparent);
  color: var(--rm-text);
  min-height: 40px;
  padding: 8px 11px;
  font: 650 12px/1 var(--rm-font);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}
.rm-trailing-action:disabled,
.rm-mini-button:disabled {
  opacity: .48;
  cursor: default;
}
.rm-trailing-action[data-loading="true"] {
  opacity: .7;
}
.rm-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--rm-accent) 18%, transparent);
  color: var(--rm-accent-strong);
  font: 750 10px/1 var(--rm-font);
  white-space: nowrap;
}
.rm-shortcut {
  margin-left: auto;
  border: 1px solid var(--rm-border);
  border-radius: 7px;
  background: color-mix(in srgb, Canvas 82%, transparent);
  color: var(--rm-muted);
  padding: 3px 5px;
  font: 600 9px/1 var(--rm-font);
}
.rm-action-icon,
.rm-tab-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.rm-tabs-wrap {
  display: grid;
  gap: 10px;
}
.rm-tabs {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 2px 8px;
  scrollbar-width: none;
  background: linear-gradient(var(--rm-panel) 72%, transparent);
}
.rm-tabs::-webkit-scrollbar {
  display: none;
}
.rm-tab {
  border: 1px solid var(--rm-border);
  border-radius: 999px;
  background: color-mix(in srgb, Canvas 86%, transparent);
  color: var(--rm-muted);
  min-height: 36px;
  padding: 7px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
  font: 650 12px/1 var(--rm-font);
}
.rm-tab[data-active="true"] {
  background: color-mix(in srgb, var(--rm-accent) 16%, Canvas 84%);
  color: var(--rm-text);
  border-color: color-mix(in srgb, var(--rm-accent) 45%, var(--rm-border));
}
.rm-tab-panel {
  min-width: 0;
  transform-origin: center center;
}
.rm-tab-panel[data-entering="true"] {
  animation: rm-tab-panel-enter 170ms cubic-bezier(.2,.75,.25,1) both;
}
@keyframes rm-tab-panel-enter {
  from {
    opacity: 0;
    transform: translate3d(10px, 0, 0);
    filter: blur(1.5px);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    filter: blur(0);
  }
}
.rm-media-preview {
  display: grid;
  grid-template-columns: minmax(90px, 34%) minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid var(--rm-border);
  border-radius: 16px;
  background: color-mix(in srgb, Canvas 88%, transparent);
}
.rm-media-preview[data-compact="true"] {
  grid-template-columns: 84px minmax(0, 1fr);
}
.rm-media-thumb,
.rm-media-placeholder {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 112px;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  background: color-mix(in srgb, CanvasText 8%, Canvas 92%);
}
.rm-media-placeholder {
  display: grid;
  place-items: center;
  color: var(--rm-muted);
  font: 800 11px/1 var(--rm-font);
  letter-spacing: .08em;
}
.rm-media-copy {
  min-width: 0;
  padding: 11px 11px 11px 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
}
.rm-media-copy strong,
.rm-media-item-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: 700 13px/1.2 var(--rm-font);
}
.rm-media-copy p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  color: var(--rm-muted);
  font: 430 12px/1.35 var(--rm-font);
}
.rm-media-copy small,
.rm-media-item-copy small {
  color: var(--rm-muted);
  font: 500 10px/1.3 var(--rm-font);
}
.rm-media-open {
  color: var(--rm-accent-strong);
  text-decoration: none;
  font: 650 11px/1.2 var(--rm-font);
}
.rm-media-picker {
  display: grid;
  gap: 9px;
}
.rm-picker-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--rm-muted);
  font: 600 11px/1.2 var(--rm-font);
}
.rm-media-grid {
  display: grid;
  grid-template-columns: repeat(var(--rm-media-columns, 2), minmax(0, 1fr));
  gap: 8px;
}
.rm-media-item {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--rm-border);
  border-radius: 14px;
  background: color-mix(in srgb, Canvas 88%, transparent);
  color: var(--rm-text);
  padding: 0;
  text-align: left;
  cursor: pointer;
}
.rm-media-item[data-selected="true"] {
  border-color: var(--rm-accent);
  box-shadow: inset 0 0 0 1px var(--rm-accent);
}
.rm-media-item img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  background: color-mix(in srgb, CanvasText 7%, Canvas 93%);
}
.rm-media-item-copy {
  min-width: 0;
  padding: 8px 9px 9px;
  display: grid;
  gap: 3px;
}
.rm-media-check {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--rm-accent);
  color: white;
  opacity: 0;
  transform: scale(.8);
  transition: opacity 140ms ease, transform 140ms ease;
  font: 800 12px/1 var(--rm-font);
}
.rm-media-item[data-selected="true"] .rm-media-check {
  opacity: 1;
  transform: scale(1);
}
.rm-provider-list,
.rm-request-log,
.rm-channel-picker,
.rm-debug-json {
  display: grid;
  gap: 7px;
}
.rm-provider {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border: 1px solid var(--rm-border);
  border-radius: 12px;
  background: color-mix(in srgb, Canvas 88%, transparent);
}
.rm-provider-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--rm-muted);
}
.rm-provider[data-state="success"] .rm-provider-dot {
  background: var(--rm-success);
}
.rm-provider[data-state="error"] .rm-provider-dot {
  background: var(--rm-danger);
}
.rm-provider[data-state="loading"] .rm-provider-dot {
  background: var(--rm-accent);
  animation: rmPulse 1s ease-in-out infinite;
}
.rm-provider-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.rm-provider-copy strong {
  font: 650 12px/1.2 var(--rm-font);
}
.rm-provider-copy small,
.rm-provider-duration {
  color: var(--rm-muted);
  font: 500 10px/1.2 var(--rm-font);
}
.rm-request-log {
  overflow: auto;
  overscroll-behavior: contain;
}
.rm-request-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--rm-border);
  background: transparent;
  color: inherit;
  padding: 8px 2px;
  text-align: left;
}
.rm-request-method {
  color: var(--rm-accent-strong);
  font: 800 10px/1 var(--rm-font);
}
.rm-request-url {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: 500 11px/1.3 var(--rm-font);
}
.rm-request-status {
  color: var(--rm-muted);
  font: 600 10px/1 var(--rm-font);
}
.rm-debug-json pre {
  margin: 0;
  overflow: auto;
  overscroll-behavior: contain;
  border: 1px solid var(--rm-border);
  border-radius: 12px;
  background: color-mix(in srgb, CanvasText 6%, Canvas 94%);
  padding: 10px;
  color: var(--rm-text);
  font: 500 10px/1.45 ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.rm-channel-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 7px;
}
.rm-channel-option {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--rm-border);
  border-radius: 13px;
  background: color-mix(in srgb, Canvas 88%, transparent);
  color: var(--rm-text);
  padding: 9px 10px;
  text-align: left;
  cursor: pointer;
}
.rm-channel-option[data-selected="true"] {
  border-color: var(--rm-accent);
  background: color-mix(in srgb, var(--rm-accent) 12%, Canvas 88%);
}
.rm-channel-option > span:last-child {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.rm-channel-option strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: 650 12px/1.2 var(--rm-font);
}
.rm-channel-option small {
  color: var(--rm-muted);
  font: 500 10px/1.2 var(--rm-font);
}
.rm-history-list {
  display: grid;
  gap: 7px;
}
.rm-history-item {
  min-width: 0;
  border: 1px solid var(--rm-border);
  border-radius: 12px;
  background: color-mix(in srgb, Canvas 88%, transparent);
  padding: 10px 11px;
  color: var(--rm-text);
  font: 500 12px/1.35 var(--rm-font);
  overflow-wrap: anywhere;
}
@keyframes rmPulse {
  0%, 100% { opacity: .45; transform: scale(.8); }
  50% { opacity: 1; transform: scale(1.15); }
}

@media (min-width: 760px) {
  .rm-root[data-presentation="bottom-sheet"] .rm-shell {
    left: 50%;
    right: auto;
    bottom: max(12px, env(safe-area-inset-bottom));
    width: min(calc(100vw - 40px), 720px);
    border-radius: var(--rm-radius);
    --rm-sheet-x: -50%;
  }
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
		function appendStyle(root, instanceCss = "") {
			const doc = root.ownerDocument;
			const style = createElement(doc, "style");
			style.dataset.rodMenuStyle = STYLE_VERSION;
			const extra = [globalConfig.css, instanceCss].filter(Boolean).join("\n\n");
			style.textContent = compileStylesheet(extra ? `${css}\n\n${extra}` : css);
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
			const win = getOwnerWindow(doc);
			const body = doc.body;
			const state = docState.get(doc) ?? {
				count: 0,
				overflow: doc.documentElement.style.overflow,
				paddingRight: doc.documentElement.style.paddingRight,
				overscrollBehavior: doc.documentElement.style.overscrollBehavior,
				bodyPosition: body?.style.position || "",
				bodyTop: body?.style.top || "",
				bodyLeft: body?.style.left || "",
				bodyRight: body?.style.right || "",
				bodyWidth: body?.style.width || "",
				bodyOverflow: body?.style.overflow || "",
				scrollX: win.scrollX,
				scrollY: win.scrollY
			};
			if (state.count === 0) {
				const scrollbar = Math.max(0, win.innerWidth - doc.documentElement.clientWidth);
				state.overflow = doc.documentElement.style.overflow;
				state.paddingRight = doc.documentElement.style.paddingRight;
				state.overscrollBehavior = doc.documentElement.style.overscrollBehavior;
				state.scrollX = win.scrollX;
				state.scrollY = win.scrollY;
				doc.documentElement.style.overflow = "hidden";
				doc.documentElement.style.overscrollBehavior = "none";
				if (scrollbar > 0) doc.documentElement.style.paddingRight = `${scrollbar}px`;
				if (body) {
					state.bodyPosition = body.style.position;
					state.bodyTop = body.style.top;
					state.bodyLeft = body.style.left;
					state.bodyRight = body.style.right;
					state.bodyWidth = body.style.width;
					state.bodyOverflow = body.style.overflow;
					body.style.position = "fixed";
					body.style.top = `${-state.scrollY}px`;
					body.style.left = `${-state.scrollX}px`;
					body.style.right = "0";
					body.style.width = "100%";
					body.style.overflow = "hidden";
				}
			}
			state.count += 1;
			docState.set(doc, state);
		}
		function unlockDocumentScroll(doc) {
			const state = docState.get(doc);
			if (!state) return;
			state.count = Math.max(0, state.count - 1);
			if (state.count === 0) {
				const win = getOwnerWindow(doc);
				const body = doc.body;
				doc.documentElement.style.overflow = state.overflow;
				doc.documentElement.style.paddingRight = state.paddingRight;
				doc.documentElement.style.overscrollBehavior = state.overscrollBehavior;
				if (body) {
					body.style.position = state.bodyPosition;
					body.style.top = state.bodyTop;
					body.style.left = state.bodyLeft;
					body.style.right = state.bodyRight;
					body.style.width = state.bodyWidth;
					body.style.overflow = state.bodyOverflow;
				}
				docState.delete(doc);
				try {
					win.scrollTo(state.scrollX, state.scrollY);
				} catch {}
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
		function matchesShortcut(event, shortcut) {
			const parts = shortcut.toLowerCase().split("+").map((part) => part.trim()).filter(Boolean);
			if (!parts.length) return false;
			const key = parts[parts.length - 1];
			if (!(!(parts.includes("mod") || parts.includes("meta") || parts.includes("cmd") || parts.includes("ctrl")) || (parts.includes("ctrl") ? event.ctrlKey : parts.includes("meta") || parts.includes("cmd") ? event.metaKey : event.metaKey || event.ctrlKey))) return false;
			if (parts.includes("shift") !== event.shiftKey) return false;
			if (parts.includes("alt") !== event.altKey) return false;
			return (event.key.toLowerCase() === " " ? "space" : event.key.toLowerCase()) === key || event.code.toLowerCase() === key;
		}
		function normalizePresentation(value, win, hasAnchor = false) {
			const selected = value ?? globalConfig.defaultPresentation;
			if (selected !== "auto") return selected;
			if (win.matchMedia?.("(max-width: 720px)").matches) return "bottom-sheet";
			return hasAnchor ? "popover" : "modal";
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
			stateStore;
			persistenceManager;
			storeHandle;
			initialValues;
			activeTabId = null;
			errorsValue = {};
			actionLoading = /* @__PURE__ */ new Set();
			loading = false;
			settled = false;
			destroyed = false;
			resolveResult;
			previousFocus = null;
			listeners = [];
			renderListeners = [];
			fieldNodes = /* @__PURE__ */ new Map();
			inputNodes = /* @__PURE__ */ new Map();
			customNodes = /* @__PURE__ */ new Map();
			constructor(schema) {
				this.schemaValue = {
					...globalConfig.defaultSchema,
					...schema
				};
				this.id = schema.id || nextId();
				this.doc = resolveDocument();
				this.win = getOwnerWindow(this.doc);
				this.valuesValue = this.buildInitialValues(schema);
				this.stateStore = createReactiveStore(this.valuesValue);
				this.valuesValue = this.stateStore.snapshot();
				this.initialValues = this.cloneValues(this.valuesValue);
				this.activeTabId = schema.initialTab || schema.tabs?.[0]?.id || null;
				this.host = createElement(this.doc, "div");
				this.host.setAttribute(ROOT_ATTR, this.id);
				this.host.className = "rm-host";
				const useShadow = globalConfig.shadowRoot && typeof this.host.attachShadow === "function";
				this.root = useShadow ? this.host.attachShadow({ mode: "open" }) : this.host;
				appendStyle(this.root, this.schemaValue.css || "");
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
					get store() {
						return controller.storeHandle;
					},
					get activeTab() {
						return controller.activeTabId;
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
					},
					setActiveTab(tabId) {
						controller.setActiveTab(tabId);
					},
					persist() {
						return controller.storeHandle.persist();
					},
					hydrate() {
						return controller.storeHandle.hydrate();
					},
					clearPersisted() {
						return controller.storeHandle.clearPersisted();
					},
					component(name, props = {}) {
						return controller.renderNamedComponent(name, props);
					}
				};
				this.persistenceManager = createPersistenceManager(this.stateStore, this.schemaValue.store, this.id, this.win, (values) => {
					this.valuesValue = values;
					if (!this.destroyed) {
						this.render();
						requestAnimationFrame(() => {
							if (!this.destroyed) this.getRootElement().dataset.open = "true";
						});
					}
					try {
						this.schemaValue.onHydrate?.(this.context);
					} catch (error) {
						this.reportError(error);
					}
				}, (error) => this.reportError(error));
				this.storeHandle = this.persistenceManager.handle;
				this.handle = {
					id: this.id,
					result: this.result,
					ready: this.storeHandle.ready,
					store: this.storeHandle,
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
					setActiveTab: (tabId) => this.setActiveTab(tabId),
					persist: () => this.storeHandle.persist(),
					hydrate: () => this.storeHandle.hydrate(),
					clearPersisted: () => this.storeHandle.clearPersisted(),
					destroy: () => this.destroy()
				};
				this.mount();
				this.persistenceManager.start();
			}
			buildInitialValues(schema) {
				const result = { ...schema.initialValues || {} };
				const fields = this.getAllFields(schema);
				for (const field of fields) {
					if ([
						"divider",
						"html",
						"button",
						"media-preview",
						"provider-status",
						"request-log",
						"debug-json"
					].includes(field.type)) continue;
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
					case "checkbox-group":
					case "media-picker": return [];
					case "channel-picker": return field.multiple ? [] : "";
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
				const tabFields = schema.tabs?.flatMap((tab) => [...tab.fields ? Array.from(tab.fields) : [], ...tab.sections?.flatMap((section) => Array.from(section.fields)) ?? []]) ?? [];
				return [
					...direct,
					...sectionFields,
					...tabFields
				];
			}
			mount() {
				this.previousFocus = this.doc.activeElement;
				(globalConfig.mount?.(this.doc) || this.doc.body || this.doc.documentElement).append(this.host);
				this.render();
				activeHandles.set(this.id, this.handle);
				if (this.schemaValue.scrollLock !== false) lockDocumentScroll(this.doc);
				this.bindGlobalEvents();
				this.setupVisualViewport();
				this.setupAnchorTracking();
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
				for (const off of this.renderListeners.splice(0)) try {
					off();
				} catch {}
				this.fieldNodes.clear();
				this.inputNodes.clear();
				this.customNodes.clear();
				this.root.querySelector?.(".rm-root")?.remove();
				const root = this.renderComponent("root", () => createElement(this.doc, "div"));
				root.className = `rm-root ${this.schemaValue.className || ""}`.trim();
				root.dataset.open = "false";
				root.dataset.loading = String(this.loading);
				root.dataset.presentation = normalizePresentation(this.schemaValue.presentation, this.win, !!this.schemaValue.anchor);
				root.dataset.side = this.schemaValue.drawerSide || "right";
				root.style.setProperty("--rm-z", String(this.schemaValue.zIndex ?? globalConfig.zIndex));
				root.style.setProperty("--rm-width", getSizeWidth(this.schemaValue.size));
				const theme = {
					...globalConfig.theme,
					...this.schemaValue.theme || {}
				};
				for (const [name, value] of Object.entries(theme)) {
					const variable = name.startsWith("--") ? name : `--rm-${name}`;
					root.style.setProperty(variable, String(value));
				}
				const backdrop = this.renderComponent("backdrop", () => createElement(this.doc, "div"));
				backdrop.classList.add("rm-backdrop");
				if (this.schemaValue.closeOnBackdrop !== false && this.schemaValue.dismissible !== false) backdrop.addEventListener("pointerdown", (event) => {
					if (event.target === backdrop) this.finish("dismiss", void 0, "backdrop");
				});
				const shell = this.renderComponent("shell", () => createElement(this.doc, "section"));
				shell.classList.add("rm-shell");
				shell.setAttribute("role", "dialog");
				shell.setAttribute("aria-modal", "true");
				shell.setAttribute("aria-label", this.schemaValue.title || "Menu");
				if (this.schemaValue.showHandle !== false && root.dataset.presentation === "bottom-sheet") {
					const wrap = this.renderComponent("handle", () => {
						const node = createElement(this.doc, "div");
						node.innerHTML = "<div class=\"rm-handle\" aria-hidden=\"true\"></div>";
						return node;
					});
					wrap.classList.add("rm-handle-wrap");
					shell.append(wrap);
				}
				shell.append(this.renderHeader());
				const globalError = createElement(this.doc, "div");
				globalError.className = "rm-global-error";
				globalError.dataset.show = "false";
				shell.append(globalError);
				const body = this.renderComponent("body", () => createElement(this.doc, "div"));
				body.classList.add("rm-body");
				if (this.schemaValue.fields?.length) body.append(this.renderSection({ fields: this.schemaValue.fields }));
				for (const section of this.schemaValue.sections || []) body.append(this.renderSection(section));
				if (this.schemaValue.tabs?.length) body.append(this.renderTabs());
				shell.append(body);
				this.positionFromAnchor(root, shell);
				if (this.schemaValue.actions?.length) shell.append(this.renderActions());
				root.append(backdrop, shell);
				this.root.append(root);
				if (root.dataset.presentation === "bottom-sheet") this.bindBottomSheetGestures(root, shell);
				this.refreshDynamicState();
			}
			renderHeader() {
				return this.renderComponent("header", () => this.renderHeaderDefault());
			}
			renderTabs() {
				return this.renderComponent("tabs", () => this.renderTabsDefault(), { activeTab: this.activeTabId });
			}
			renderSection(section) {
				return this.renderComponent("section", () => this.renderSectionDefault(section), { section });
			}
			renderActions() {
				return this.renderComponent("actions", () => this.renderActionsDefault(), { actions: this.schemaValue.actions || [] });
			}
			renderTabsDefault() {
				const wrapper = createElement(this.doc, "div");
				wrapper.className = "rm-tabs-wrap";
				const visibleTabs = (this.schemaValue.tabs || []).filter((tab) => !tab.visibleWhen || this.safePredicate(tab.visibleWhen));
				if (!visibleTabs.length) return wrapper;
				if (!this.activeTabId || !visibleTabs.some((tab) => tab.id === this.activeTabId)) this.activeTabId = visibleTabs[0].id;
				const nav = createElement(this.doc, "div");
				nav.className = "rm-tabs";
				nav.setAttribute("role", "tablist");
				for (const tab of visibleTabs) {
					const button = createElement(this.doc, "button");
					button.type = "button";
					button.className = "rm-tab";
					button.dataset.active = String(tab.id === this.activeTabId);
					button.dataset.tabId = tab.id;
					button.setAttribute("role", "tab");
					button.setAttribute("aria-selected", String(tab.id === this.activeTabId));
					if (tab.icon) {
						const icon = createElement(this.doc, "span");
						icon.className = "rm-tab-icon";
						icon.innerHTML = tab.icon;
						button.append(icon);
					}
					const label = createElement(this.doc, "span");
					label.textContent = tab.label;
					button.append(label);
					if (tab.badge != null) {
						const badge = createElement(this.doc, "span");
						badge.className = "rm-badge";
						badge.textContent = String(tab.badge);
						button.append(badge);
					}
					button.addEventListener("click", () => this.setActiveTab(tab.id));
					nav.append(button);
				}
				wrapper.append(nav);
				const active = visibleTabs.find((tab) => tab.id === this.activeTabId) || visibleTabs[0];
				const panel = createElement(this.doc, "div");
				panel.className = "rm-tab-panel";
				panel.dataset.tabPanel = active.id;
				panel.setAttribute("role", "tabpanel");
				if (active.fields?.length) panel.append(this.renderSection({ fields: active.fields }));
				for (const section of active.sections || []) panel.append(this.renderSection(section));
				wrapper.append(panel);
				return wrapper;
			}
			resolveAnchorRect() {
				const anchor = this.schemaValue.anchor;
				if (!anchor) return null;
				try {
					const resolved = typeof anchor === "function" ? anchor() : anchor;
					if (!resolved) return null;
					if (resolved instanceof this.win.Element) return resolved.getBoundingClientRect();
					if (typeof resolved.left === "number" && typeof resolved.top === "number") return resolved;
				} catch (error) {
					this.reportError(error);
				}
				return null;
			}
			positionFromAnchor(root, shell) {
				const rect = this.resolveAnchorRect();
				if (!rect) return;
				const centerX = rect.left + rect.width / 2;
				const centerY = rect.top + rect.height / 2;
				root.style.setProperty("--rm-origin-x", `${centerX}px`);
				root.style.setProperty("--rm-origin-y", `${centerY}px`);
				if (root.dataset.presentation !== "popover") return;
				const offset = Math.max(0, this.schemaValue.anchorOffset ?? 10);
				const align = this.schemaValue.anchorAlign ?? "center";
				const viewportWidth = this.win.innerWidth;
				const viewportHeight = this.win.innerHeight;
				const preferredX = align === "start" ? rect.left : align === "end" ? rect.right : centerX;
				const left = Math.max(8, Math.min(viewportWidth - 8, preferredX));
				const spaceBelow = viewportHeight - rect.bottom;
				const placeAbove = spaceBelow < 280 && rect.top > spaceBelow;
				const top = placeAbove ? Math.max(8, rect.top - offset) : Math.min(viewportHeight - 8, rect.bottom + offset);
				root.dataset.popoverAbove = String(placeAbove);
				shell.style.setProperty("--rm-popover-left", `${left}px`);
				shell.style.setProperty("--rm-popover-top", `${top}px`);
				shell.style.setProperty("--rm-popover-align", align === "start" ? "0%" : align === "end" ? "100%" : "50%");
				shell.style.setProperty("--rm-popover-shift", align === "start" ? "0%" : align === "end" ? "-100%" : "-50%");
			}
			renderHeaderDefault() {
				const header = createElement(this.doc, "header");
				header.className = "rm-header";
				const heading = createElement(this.doc, "div");
				heading.className = "rm-heading";
				if (this.schemaValue.eyebrow) {
					const eyebrow = createElement(this.doc, "div");
					eyebrow.className = "rm-eyebrow";
					eyebrow.textContent = this.schemaValue.eyebrow;
					heading.append(eyebrow);
				}
				if (this.schemaValue.title || this.schemaValue.icon) {
					const row = createElement(this.doc, "div");
					row.className = "rm-title-row";
					if (this.schemaValue.icon) {
						const icon = createElement(this.doc, "div");
						icon.className = "rm-icon";
						icon.innerHTML = this.schemaValue.icon;
						row.append(icon);
					}
					if (this.schemaValue.title) {
						const title = createElement(this.doc, "h2");
						title.className = "rm-title";
						title.textContent = this.schemaValue.title;
						row.append(title);
					}
					heading.append(row);
				}
				if (this.schemaValue.description) {
					const description = createElement(this.doc, "p");
					description.className = "rm-description";
					description.textContent = this.schemaValue.description;
					heading.append(description);
				}
				header.append(heading);
				if (this.schemaValue.dismissible !== false) {
					const close = this.renderComponent("closeButton", () => createElement(this.doc, "button"));
					close.setAttribute("type", "button");
					close.classList.add("rm-close");
					close.setAttribute("aria-label", close.getAttribute("aria-label") || "Fechar");
					if (!close.childNodes.length) close.innerHTML = "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" aria-hidden=\"true\"><path d=\"M6 6l12 12M18 6L6 18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.1\" stroke-linecap=\"round\"/></svg>";
					close.addEventListener("click", () => this.finish("dismiss", void 0, "api"));
					header.append(close);
				}
				return header;
			}
			renderSectionDefault(section) {
				const wrapper = createElement(this.doc, "section");
				wrapper.className = "rm-section";
				if (section.id) wrapper.dataset.section = section.id;
				if (section.visibleWhen && !this.safePredicate(section.visibleWhen)) wrapper.hidden = true;
				let collapsed = !!section.collapsed;
				let fieldsContainer;
				if (section.title || section.description) {
					const head = createElement(this.doc, "div");
					head.className = "rm-section-head";
					const makeCopy = () => {
						const copy = createElement(this.doc, "div");
						if (section.title) {
							const title = createElement(this.doc, "h3");
							title.className = "rm-section-title";
							title.textContent = section.title;
							copy.append(title);
						}
						if (section.description) {
							const description = createElement(this.doc, "p");
							description.className = "rm-section-description";
							description.textContent = section.description;
							copy.append(description);
						}
						return copy;
					};
					if (section.collapsible) {
						const toggle = createElement(this.doc, "button");
						toggle.type = "button";
						toggle.className = "rm-section-toggle";
						toggle.append(makeCopy());
						const glyph = createElement(this.doc, "span");
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
				fieldsContainer = createElement(this.doc, "div");
				fieldsContainer.className = "rm-fields";
				fieldsContainer.hidden = collapsed;
				for (const field of section.fields) fieldsContainer.append(this.renderField(field));
				wrapper.append(fieldsContainer);
				return wrapper;
			}
			renderField(field) {
				const renderType = () => {
					const registered = this.resolveFieldTypeRenderer(field.type);
					if (registered) {
						const rendered = registered({
							type: field.type,
							field,
							value: this.valuesValue[field.name],
							document: this.doc,
							window: this.win,
							context: this.context,
							create: (tag, className) => {
								const node = createElement(this.doc, tag);
								if (className) node.className = className;
								return node;
							},
							commit: (value) => this.commitField(field, value),
							defaultRender: () => this.renderFieldDefault(field)
						});
						if (rendered) return rendered;
					}
					return this.renderFieldDefault(field);
				};
				return this.renderComponent("field", renderType, {
					field,
					value: this.valuesValue[field.name]
				});
			}
			renderFieldDefault(field) {
				const row = createElement(this.doc, "div");
				row.className = `rm-field ${field.className || ""}`.trim();
				row.dataset.field = field.name;
				row.dataset.hidden = String(!!field.hidden);
				this.fieldNodes.set(field.name, row);
				if (field.type === "divider") {
					row.innerHTML = "<div class=\"rm-divider\" aria-hidden=\"true\"></div>";
					return row;
				}
				if (field.type !== "checkbox" && field.type !== "switch" && field.type !== "hidden" && field.type !== "button" && field.type !== "html") {
					const labelRow = createElement(this.doc, "div");
					labelRow.className = "rm-label-row";
					const label = createElement(this.doc, "label");
					label.className = "rm-label";
					label.htmlFor = `${this.id}-${field.name}`;
					label.textContent = field.label || field.name;
					if (field.required) {
						const req = createElement(this.doc, "span");
						req.className = "rm-required";
						req.textContent = "*";
						label.append(req);
					}
					labelRow.append(label);
					if (field.description) {
						const desc = createElement(this.doc, "span");
						desc.className = "rm-description-field";
						desc.textContent = field.description;
						labelRow.append(desc);
					}
					row.append(labelRow);
				}
				const control = this.createControl(field);
				if (field.trailingAction) {
					const controlRow = createElement(this.doc, "div");
					controlRow.className = "rm-control-row";
					controlRow.append(control);
					const trailing = field.trailingAction;
					const action = createElement(this.doc, "button");
					action.type = "button";
					action.className = "rm-trailing-action";
					action.dataset.variant = trailing.variant || "secondary";
					action.dataset.trailingAction = trailing.id || field.name;
					action.title = trailing.title || trailing.label;
					action.disabled = !!trailing.disabled || !!trailing.disabledWhen?.(this.valuesValue, this.context);
					if (trailing.icon) {
						const icon = createElement(this.doc, "span");
						icon.className = "rm-action-icon";
						icon.innerHTML = trailing.icon;
						action.append(icon);
					}
					const label = createElement(this.doc, "span");
					label.textContent = trailing.label;
					action.append(label);
					action.addEventListener("click", async () => {
						if (action.disabled) return;
						action.disabled = true;
						action.dataset.loading = "true";
						try {
							await trailing.handler(this.context);
						} catch (error) {
							this.reportError(error);
						} finally {
							action.dataset.loading = "false";
							action.disabled = !!trailing.disabled || !!trailing.disabledWhen?.(this.valuesValue, this.context);
						}
					});
					controlRow.append(action);
					row.append(controlRow);
				} else row.append(control);
				if (field.help) {
					const help = createElement(this.doc, "div");
					help.className = "rm-help";
					help.textContent = field.help;
					row.append(help);
				}
				const error = createElement(this.doc, "div");
				error.className = "rm-error";
				error.setAttribute("role", "alert");
				row.append(error);
				return row;
			}
			createControl(field) {
				const value = this.valuesValue[field.name];
				const baseInput = (type) => {
					const input = createElement(this.doc, "input");
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
						const input = createElement(this.doc, "textarea");
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
						const select = createElement(this.doc, "select");
						select.id = `${this.id}-${field.name}`;
						select.name = field.name;
						select.className = "rm-select";
						select.disabled = !!field.disabled;
						for (const option of field.options) {
							const el = createElement(this.doc, "option");
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
						const box = createElement(this.doc, "div");
						box.className = "rm-chipbox";
						const selected = new Set(Array.isArray(value) ? value.map(String) : []);
						for (const option of field.options) {
							const button = createElement(this.doc, "button");
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
						const options = createElement(this.doc, "div");
						options.className = "rm-options";
						options.dataset.direction = field.direction || "vertical";
						const current = field.type === "checkbox-group" ? new Set(Array.isArray(value) ? value.map(String) : []) : null;
						for (const option of field.options) {
							const label = createElement(this.doc, "label");
							label.className = "rm-option";
							const input = createElement(this.doc, "input");
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
							const copy = createElement(this.doc, "span");
							copy.className = "rm-option-copy";
							const name = createElement(this.doc, "span");
							name.textContent = option.label;
							copy.append(name);
							if (option.description) {
								const desc = createElement(this.doc, "span");
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
						const wrap = createElement(this.doc, "label");
						wrap.className = "rm-check-row";
						const copy = createElement(this.doc, "span");
						copy.className = "rm-check-label";
						const title = createElement(this.doc, "span");
						title.className = "rm-label";
						title.textContent = field.label || field.name;
						copy.append(title);
						if (field.description) {
							const desc = createElement(this.doc, "div");
							desc.className = "rm-description-field";
							desc.textContent = field.description;
							copy.append(desc);
						}
						const input = createElement(this.doc, "input");
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
						const wrap = createElement(this.doc, "div");
						wrap.className = "rm-range-wrap";
						const input = createElement(this.doc, "input");
						input.id = `${this.id}-${field.name}`;
						input.name = field.name;
						input.type = "range";
						input.className = "rm-range";
						input.min = String(field.min ?? 0);
						input.max = String(field.max ?? 100);
						input.step = String(field.step ?? 1);
						input.value = String(value ?? field.min ?? 0);
						const out = createElement(this.doc, "output");
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
						const wrap = createElement(this.doc, "div");
						wrap.className = "rm-color-row";
						const input = createElement(this.doc, "input");
						input.id = `${this.id}-${field.name}`;
						input.name = field.name;
						input.type = "color";
						input.className = "rm-color";
						input.value = typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#ff7a18";
						input.addEventListener("input", () => this.commitField(field, input.value));
						wrap.append(input);
						if (field.presets?.length) {
							const presets = createElement(this.doc, "div");
							presets.className = "rm-presets";
							for (const color of field.presets) {
								const swatch = createElement(this.doc, "button");
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
						const segmented = createElement(this.doc, "div");
						segmented.className = "rm-segmented";
						for (const option of field.options) {
							const button = createElement(this.doc, "button");
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
						const stars = createElement(this.doc, "div");
						stars.className = "rm-stars";
						const max = Math.max(1, field.max ?? 5);
						for (let i = 1; i <= max; i += 1) {
							const button = createElement(this.doc, "button");
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
						const button = createElement(this.doc, "button");
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
					case "media-preview": {
						const item = typeof field.item === "function" ? field.item(this.context) : field.item;
						const card = createElement(this.doc, "article");
						card.className = "rm-media-preview";
						card.dataset.compact = String(!!field.compact);
						if (item.thumbnail) {
							const image = createElement(this.doc, "img");
							image.className = "rm-media-thumb";
							image.src = item.thumbnail;
							image.alt = item.title || item.type || "Media preview";
							image.loading = "lazy";
							card.append(image);
						} else {
							const placeholder = createElement(this.doc, "div");
							placeholder.className = "rm-media-placeholder";
							placeholder.textContent = item.type === "video" ? "VIDEO" : item.type === "audio" ? "AUDIO" : "MEDIA";
							card.append(placeholder);
						}
						const copy = createElement(this.doc, "div");
						copy.className = "rm-media-copy";
						const title = createElement(this.doc, "strong");
						title.textContent = item.title || item.source || item.id;
						copy.append(title);
						if (item.description) {
							const description = createElement(this.doc, "p");
							description.textContent = item.description;
							copy.append(description);
						}
						const meta = [
							item.type,
							item.quality,
							item.width && item.height ? `${item.width}×${item.height}` : null,
							item.provider,
							field.showSource !== false ? item.source : null
						].filter(Boolean).join(" · ");
						if (meta) {
							const metadata = createElement(this.doc, "small");
							metadata.textContent = meta;
							copy.append(metadata);
						}
						if (item.url) {
							const open = createElement(this.doc, "a");
							open.className = "rm-media-open";
							open.href = item.url;
							open.target = "_blank";
							open.rel = "noopener noreferrer";
							open.textContent = "Abrir origem";
							copy.append(open);
						}
						card.append(copy);
						return card;
					}
					case "media-picker": {
						const items = typeof field.items === "function" ? field.items(this.context) : field.items;
						const wrap = createElement(this.doc, "div");
						wrap.className = "rm-media-picker";
						wrap.style.setProperty("--rm-media-columns", String(field.columns ?? 2));
						let selected = new Set(Array.isArray(value) ? value.map(String) : []);
						const sync = () => {
							wrap.querySelectorAll("[data-media-id]").forEach((node) => {
								node.dataset.selected = String(selected.has(node.dataset.mediaId || ""));
							});
						};
						if (field.selectAll !== false && items.length > 1) {
							const toolbar = createElement(this.doc, "div");
							toolbar.className = "rm-picker-toolbar";
							const count = createElement(this.doc, "span");
							const updateCount = () => {
								count.textContent = `${selected.size} de ${items.length} selecionados`;
							};
							updateCount();
							const all = createElement(this.doc, "button");
							all.type = "button";
							all.className = "rm-mini-button";
							all.textContent = "Selecionar tudo";
							all.addEventListener("click", () => {
								selected = new Set(items.filter((item) => !item.disabled).map((item) => item.id));
								this.commitField(field, Array.from(selected));
								sync();
								updateCount();
							});
							toolbar.append(count, all);
							wrap.append(toolbar);
						}
						const grid = createElement(this.doc, "div");
						grid.className = "rm-media-grid";
						for (const item of items) {
							const card = createElement(this.doc, "button");
							card.type = "button";
							card.className = "rm-media-item";
							card.dataset.mediaId = item.id;
							card.dataset.selected = String(selected.has(item.id));
							card.disabled = !!item.disabled;
							if (item.thumbnail) {
								const image = createElement(this.doc, "img");
								image.src = item.thumbnail;
								image.alt = item.title || item.id;
								image.loading = "lazy";
								card.append(image);
							}
							const detail = createElement(this.doc, "span");
							detail.className = "rm-media-item-copy";
							const title = createElement(this.doc, "strong");
							title.textContent = item.title || item.quality || item.id;
							detail.append(title);
							const meta = [
								item.type,
								item.quality,
								item.width && item.height ? `${item.width}×${item.height}` : null,
								item.provider
							].filter(Boolean).join(" · ");
							if (meta) {
								const small = createElement(this.doc, "small");
								small.textContent = meta;
								detail.append(small);
							}
							card.append(detail);
							const check = createElement(this.doc, "span");
							check.className = "rm-media-check";
							check.textContent = "✓";
							card.append(check);
							card.addEventListener("click", () => {
								if (selected.has(item.id)) selected.delete(item.id);
								else {
									if (field.maxSelected && selected.size >= field.maxSelected) return;
									selected.add(item.id);
								}
								this.commitField(field, Array.from(selected));
								sync();
							});
							grid.append(card);
						}
						wrap.append(grid);
						this.inputNodes.set(field.name, wrap);
						return wrap;
					}
					case "provider-status": {
						const providers = typeof field.providers === "function" ? field.providers(this.context) : field.providers;
						const list = createElement(this.doc, "div");
						list.className = "rm-provider-list";
						for (const provider of providers) {
							const row = createElement(this.doc, "div");
							row.className = "rm-provider";
							row.dataset.state = provider.state;
							const dot = createElement(this.doc, "span");
							dot.className = "rm-provider-dot";
							const copy = createElement(this.doc, "span");
							copy.className = "rm-provider-copy";
							const label = createElement(this.doc, "strong");
							label.textContent = provider.label;
							copy.append(label);
							const description = createElement(this.doc, "small");
							description.textContent = provider.error || provider.description || provider.state;
							copy.append(description);
							const duration = createElement(this.doc, "span");
							duration.className = "rm-provider-duration";
							duration.textContent = provider.durationMs != null ? `${provider.durationMs} ms` : "";
							row.append(dot, copy, duration);
							list.append(row);
						}
						return list;
					}
					case "request-log": {
						const entries = typeof field.entries === "function" ? field.entries(this.context) : field.entries;
						const list = createElement(this.doc, "div");
						list.className = "rm-request-log";
						if (field.maxHeight) list.style.maxHeight = `${field.maxHeight}px`;
						for (const entry of entries) {
							const row = createElement(this.doc, "button");
							row.type = "button";
							row.className = "rm-request-row";
							const status = entry.status == null ? "" : String(entry.status);
							row.innerHTML = `<span class="rm-request-method"></span><span class="rm-request-url"></span><span class="rm-request-status"></span>`;
							const method = row.querySelector(".rm-request-method");
							const url = row.querySelector(".rm-request-url");
							const statusNode = row.querySelector(".rm-request-status");
							if (method) method.textContent = entry.method || "GET";
							if (url) url.textContent = entry.url;
							if (statusNode) statusNode.textContent = [status, entry.durationMs != null ? `${entry.durationMs}ms` : ""].filter(Boolean).join(" · ");
							if (field.onSelect) row.addEventListener("click", () => field.onSelect?.(entry, this.context));
							list.append(row);
						}
						return list;
					}
					case "debug-json": {
						const data = typeof field.data === "function" ? field.data(this.context) : field.data;
						const wrap = createElement(this.doc, "div");
						wrap.className = "rm-debug-json";
						const toolbar = createElement(this.doc, "div");
						toolbar.className = "rm-picker-toolbar";
						const label = createElement(this.doc, "span");
						label.textContent = "JSON";
						const copy = createElement(this.doc, "button");
						copy.type = "button";
						copy.className = "rm-mini-button";
						copy.textContent = "Copiar";
						const text = (() => {
							try {
								return JSON.stringify(data, null, field.pretty === false ? 0 : 2);
							} catch {
								return String(data);
							}
						})();
						copy.addEventListener("click", async () => {
							try {
								await this.win.navigator.clipboard?.writeText(text);
								notifyToaster("success", "Copiado", "JSON copiado para a área de transferência.");
							} catch (error) {
								this.reportError(error);
							}
						});
						toolbar.append(label, copy);
						const pre = createElement(this.doc, "pre");
						pre.textContent = text;
						if (field.maxHeight) pre.style.maxHeight = `${field.maxHeight}px`;
						wrap.append(toolbar, pre);
						return wrap;
					}
					case "channel-picker": {
						const wrap = createElement(this.doc, "div");
						wrap.className = "rm-channel-picker";
						const optionsHost = createElement(this.doc, "div");
						optionsHost.className = "rm-channel-options";
						let selected = new Set(field.multiple ? Array.isArray(value) ? value.map(String) : [] : [String(value ?? "")].filter(Boolean));
						const renderOptions = (query = "") => {
							optionsHost.replaceChildren();
							const q = query.trim().toLowerCase();
							for (const option of field.options) {
								if (q && !`${option.label} ${option.description || ""}`.toLowerCase().includes(q)) continue;
								const button = createElement(this.doc, "button");
								button.type = "button";
								button.className = "rm-channel-option";
								button.dataset.selected = String(selected.has(option.value));
								button.disabled = !!option.disabled;
								if (option.icon) {
									const icon = createElement(this.doc, "span");
									icon.innerHTML = option.icon;
									button.append(icon);
								}
								const copy = createElement(this.doc, "span");
								const title = createElement(this.doc, "strong");
								title.textContent = option.label;
								copy.append(title);
								if (option.description) {
									const small = createElement(this.doc, "small");
									small.textContent = option.description;
									copy.append(small);
								}
								button.append(copy);
								button.addEventListener("click", () => {
									if (field.multiple) {
										selected.has(option.value) ? selected.delete(option.value) : selected.add(option.value);
										this.commitField(field, Array.from(selected));
									} else {
										selected = /* @__PURE__ */ new Set([option.value]);
										this.commitField(field, option.value);
									}
									renderOptions(q);
								});
								optionsHost.append(button);
							}
						};
						if (field.searchable) {
							const search = createElement(this.doc, "input");
							search.type = "search";
							search.className = "rm-control rm-channel-search";
							search.placeholder = field.placeholder || "Buscar…";
							search.addEventListener("input", () => renderOptions(search.value));
							wrap.append(search);
						}
						renderOptions();
						wrap.append(optionsHost);
						this.inputNodes.set(field.name, wrap);
						return wrap;
					}
					case "html": {
						const html = createElement(this.doc, "div");
						html.innerHTML = typeof field.html === "function" ? field.html(this.context) : field.html;
						return html;
					}
					case "custom": {
						const container = createElement(this.doc, "div");
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
			renderActionsDefault() {
				const footer = createElement(this.doc, "footer");
				footer.className = "rm-actions";
				for (const action of this.schemaValue.actions || []) {
					const button = this.renderComponent("action", () => {
						return createElement(this.doc, "button");
					}, { action });
					button.setAttribute("type", action.role === "submit" ? "submit" : "button");
					button.className = "rm-action";
					button.dataset.action = action.id;
					button.dataset.variant = action.variant || (action.role === "destructive" ? "danger" : action.role === "cancel" ? "secondary" : "primary");
					if (action.ariaLabel) button.setAttribute("aria-label", action.ariaLabel);
					if (action.icon) {
						const icon = createElement(this.doc, "span");
						icon.className = "rm-action-icon";
						icon.innerHTML = action.icon;
						button.append(icon);
					}
					const text = createElement(this.doc, "span");
					text.className = "rm-action-label";
					text.textContent = action.label;
					button.append(text);
					if (action.badge != null) {
						const badge = createElement(this.doc, "span");
						badge.className = "rm-badge rm-action-badge";
						badge.dataset.actionBadge = action.id;
						const rawBadge = typeof action.badge === "function" ? action.badge(this.context) : action.badge;
						badge.textContent = rawBadge == null ? "" : String(rawBadge);
						badge.hidden = rawBadge == null || rawBadge === "";
						button.append(badge);
					}
					if (action.shortcut) {
						const shortcut = createElement(this.doc, "kbd");
						shortcut.className = "rm-shortcut";
						shortcut.textContent = action.shortcut;
						button.append(shortcut);
					}
					button.addEventListener("click", () => void this.runAction(action));
					footer.append(button);
				}
				return footer;
			}
			commitField(field, raw) {
				const value = field.transform ? field.transform(raw, this.context) : raw;
				this.stateStore.set(field.name, value);
				this.valuesValue = this.stateStore.snapshot();
				this.persistenceManager.trigger("change");
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
					if (action.role === "submit") this.persistenceManager.trigger("submit");
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
					button.hidden = !(!action.hidden && (!action.visibleWhen || this.safePredicate(action.visibleWhen)));
					button.disabled = this.loading || this.actionLoading.has(action.id) || !!action.disabled || !!(action.disabledWhen && this.safePredicate(action.disabledWhen));
					const badge = button.querySelector(".rm-action-badge");
					if (badge && action.badge != null) try {
						const value = typeof action.badge === "function" ? action.badge(this.context) : action.badge;
						badge.textContent = value == null ? "" : String(value);
						badge.hidden = value == null || value === "";
					} catch (error) {
						this.reportError(error);
					}
				}
				for (const field of this.getAllFields()) {
					const trailing = field.trailingAction;
					if (!trailing) continue;
					const button = this.root.querySelector(`.rm-trailing-action[data-trailing-action="${CSS.escape(trailing.id || field.name)}"]`);
					if (!button || button.dataset.loading === "true") continue;
					button.disabled = !!trailing.disabled || !!(trailing.disabledWhen && this.safePredicate(trailing.disabledWhen));
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
						"hidden",
						"media-preview",
						"provider-status",
						"request-log",
						"debug-json"
					].includes(field.type)) continue;
					const row = this.fieldNodes.get(field.name);
					if (row?.dataset.hidden === "true") continue;
					const value = this.readFieldValue(field);
					if (field.required && this.isEmptyValue(value)) {
						this.setFieldError(field.name, "Campo obrigatório.");
						firstInvalid ||= this.inputNodes.get(field.name) || row || null;
						continue;
					}
					if (field.type === "media-picker" && field.minSelected && Array.isArray(value) && value.length < field.minSelected) {
						this.setFieldError(field.name, `Selecione pelo menos ${field.minSelected} item(ns).`);
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
						this.stateStore.set(field.name, next);
						this.valuesValue = this.stateStore.snapshot();
						this.persistenceManager.trigger("change");
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
				this.stateStore.set(name, value);
				this.valuesValue = this.stateStore.snapshot();
				this.persistenceManager.trigger("change");
				this.writeValueToControl(name, value);
				this.refreshDynamicState();
				try {
					this.schemaValue.onChange?.(this.context);
				} catch (error) {
					this.reportError(error);
				}
			}
			setValues(values) {
				this.stateStore.patch(values);
				this.valuesValue = this.stateStore.snapshot();
				this.persistenceManager.trigger("change");
				for (const [name, value] of Object.entries(values)) this.writeValueToControl(name, value);
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
				this.stateStore.replace(this.cloneValues(this.initialValues));
				this.valuesValue = this.stateStore.snapshot();
				this.persistenceManager.trigger("change");
				this.render();
				requestAnimationFrame(() => {
					this.getRootElement().dataset.open = "true";
				});
			}
			setActiveTab(tabId) {
				const tabs = this.schemaValue.tabs || [];
				const nextTab = tabs.find((tab) => tab.id === tabId);
				if (!nextTab || this.activeTabId === tabId || this.destroyed) return;
				const root = this.getRootElement();
				const shell = root.querySelector(".rm-shell");
				const wrapper = root.querySelector(".rm-tabs-wrap");
				const oldPanel = wrapper?.querySelector(".rm-tab-panel");
				if (!shell || !wrapper || !oldPanel) {
					this.activeTabId = tabId;
					this.render();
					requestAnimationFrame(() => {
						if (!this.destroyed) this.getRootElement().dataset.open = "true";
					});
					return;
				}
				const currentHeight = shell.getBoundingClientRect().height;
				if (currentHeight > 0) {
					shell.style.height = `${Math.round(currentHeight)}px`;
					shell.style.maxHeight = `min(92dvh, calc(var(--rm-vvh, 100vh) - 8px))`;
				}
				for (const tab of tabs) {
					for (const field of tab.fields || []) {
						this.fieldNodes.delete(field.name);
						this.inputNodes.delete(field.name);
						this.customNodes.delete(field.name);
					}
					for (const section of tab.sections || []) for (const field of section.fields || []) {
						this.fieldNodes.delete(field.name);
						this.inputNodes.delete(field.name);
						this.customNodes.delete(field.name);
					}
				}
				this.activeTabId = tabId;
				for (const button of Array.from(wrapper.querySelectorAll(".rm-tab"))) {
					const isActive = button.getAttribute("data-tab-id") === tabId;
					button.dataset.active = String(isActive);
					button.setAttribute("aria-selected", String(isActive));
				}
				const panel = createElement(this.doc, "div");
				panel.className = "rm-tab-panel";
				panel.dataset.tabPanel = nextTab.id;
				panel.dataset.entering = "true";
				panel.setAttribute("role", "tabpanel");
				if (nextTab.fields?.length) panel.append(this.renderSection({ fields: nextTab.fields }));
				for (const section of nextTab.sections || []) panel.append(this.renderSection(section));
				oldPanel.replaceWith(panel);
				this.refreshDynamicState();
				requestAnimationFrame(() => {
					if (this.destroyed) return;
					panel.addEventListener("animationend", () => panel.removeAttribute("data-entering"), { once: true });
				});
			}
			refreshStyles() {
				const style = this.root.querySelector(`style[data-rod-menu-style="${STYLE_VERSION}"]`);
				if (!style) return;
				const extra = [globalConfig.css, this.schemaValue.css || ""].filter(Boolean).join("\n\n");
				style.textContent = compileStylesheet(extra ? `${css}\n\n${extra}` : css);
			}
			update(patch) {
				this.schemaValue = {
					...this.schemaValue,
					...patch
				};
				this.refreshStyles();
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
					const spinner = createElement(this.doc, "span");
					spinner.className = "rm-spinner";
					button.prepend(spinner);
				} else if (!loading && existing) existing.remove();
				this.refreshDynamicState();
			}
			bindGlobalEvents() {
				const keydown = (event) => {
					if (this.destroyed || this.settled) return;
					const shortcutAction = this.schemaValue.actions?.find((action) => action.shortcut && matchesShortcut(event, action.shortcut));
					if (shortcutAction) {
						event.preventDefault();
						this.runAction(shortcutAction);
						return;
					}
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
			setupAnchorTracking() {
				if (!this.schemaValue.anchor) return;
				const sync = () => {
					if (this.destroyed) return;
					const root = this.root.querySelector(".rm-root");
					const shell = this.root.querySelector(".rm-shell");
					if (root && shell) this.positionFromAnchor(root, shell);
				};
				this.win.addEventListener("resize", sync, { passive: true });
				this.win.addEventListener("scroll", sync, {
					passive: true,
					capture: true
				});
				this.listeners.push(() => {
					this.win.removeEventListener("resize", sync);
					this.win.removeEventListener("scroll", sync, true);
				});
			}
			getGestureConfig() {
				return {
					...globalConfig.gestures,
					...this.schemaValue.gestures || {}
				};
			}
			findScrollableAncestor(target, boundary) {
				let node = target instanceof this.win.Element ? target : null;
				while (node && node !== boundary) {
					if (node instanceof this.win.HTMLElement) {
						const overflowY = this.win.getComputedStyle(node).overflowY;
						if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight + 1) return node;
					}
					node = node.parentElement;
				}
				const body = boundary.querySelector(".rm-body");
				return body && body.scrollHeight > body.clientHeight + 1 ? body : null;
			}
			bindBottomSheetGestures(root, shell) {
				const config = this.getGestureConfig();
				if (!config.preventPullToRefresh && this.schemaValue.draggable === false && this.schemaValue.swipeToDismiss === false) return;
				let tracking = false;
				let dragging = false;
				let startedOnHandle = false;
				let startX = 0;
				let startY = 0;
				let lastY = 0;
				let startTime = 0;
				let currentY = 0;
				let scrollable = null;
				let directionLocked = false;
				let verticalGesture = false;
				const reset = () => {
					tracking = false;
					dragging = false;
					startedOnHandle = false;
					currentY = 0;
					scrollable = null;
					directionLocked = false;
					verticalGesture = false;
					shell.style.transition = "";
				};
				const touchStart = (event) => {
					if (event.touches.length !== 1) return;
					const touch = event.touches[0];
					tracking = true;
					dragging = false;
					startX = touch.clientX;
					startY = touch.clientY;
					lastY = touch.clientY;
					startTime = performance.now();
					currentY = 0;
					directionLocked = false;
					verticalGesture = false;
					const target = event.composedPath()[0];
					startedOnHandle = !!(target instanceof this.win.Element ? target : null)?.closest?.(".rm-handle-wrap");
					scrollable = this.findScrollableAncestor(target || event.target, shell);
				};
				const touchMove = (event) => {
					if (!tracking || event.touches.length !== 1) return;
					const touch = event.touches[0];
					const dx = touch.clientX - startX;
					const dy = touch.clientY - startY;
					lastY = touch.clientY;
					if (!directionLocked && Math.max(Math.abs(dx), Math.abs(dy)) >= config.activationDistancePx) {
						directionLocked = true;
						verticalGesture = Math.abs(dy) >= Math.abs(dx);
					}
					if (!directionLocked || !verticalGesture) return;
					const contentAtTop = !scrollable || scrollable.scrollTop <= 0;
					const canDrag = this.schemaValue.draggable !== false && (startedOnHandle || config.dragFromContent);
					const pullingDown = dy > 0;
					if (pullingDown && contentAtTop) {
						if (event.cancelable && config.preventPullToRefresh) event.preventDefault();
						event.stopPropagation();
						if (canDrag) {
							if (!dragging) {
								dragging = true;
								shell.style.transition = "none";
							}
							currentY = Math.max(0, dy);
							shell.style.setProperty("--rm-drag-y", `${currentY}px`);
						}
						return;
					}
					if (dragging) {
						if (event.cancelable) event.preventDefault();
						currentY = Math.max(0, dy);
						shell.style.setProperty("--rm-drag-y", `${currentY}px`);
						return;
					}
					if (pullingDown && !scrollable && config.preventPullToRefresh && event.cancelable) {
						event.preventDefault();
						event.stopPropagation();
					}
				};
				const finishGesture = () => {
					if (!tracking) return;
					const elapsed = Math.max(1, performance.now() - startTime);
					const velocity = Math.max(0, (lastY - startY) / elapsed);
					const threshold = Math.min(config.dismissThresholdPx, shell.getBoundingClientRect().height * config.dismissThresholdRatio);
					const shouldDismiss = dragging && this.schemaValue.swipeToDismiss !== false && this.schemaValue.dismissible !== false && (currentY >= threshold || currentY > config.activationDistancePx * 2 && velocity >= config.velocityThresholdPxMs);
					shell.style.transition = "";
					if (shouldDismiss) this.finish("dismiss", void 0, "swipe");
					else shell.style.removeProperty("--rm-drag-y");
					reset();
				};
				let pointerDragging = false;
				let pointerId = -1;
				let pointerStartY = 0;
				let pointerCurrentY = 0;
				let pointerStartTime = 0;
				const handle = shell.querySelector(".rm-handle-wrap");
				const pointerDown = (event) => {
					if (!handle || event.pointerType === "touch" || event.button !== 0 || this.schemaValue.draggable === false) return;
					pointerDragging = true;
					pointerId = event.pointerId;
					pointerStartY = event.clientY;
					pointerCurrentY = 0;
					pointerStartTime = performance.now();
					handle.setPointerCapture?.(pointerId);
					shell.style.transition = "none";
					event.preventDefault();
				};
				const pointerMove = (event) => {
					if (!pointerDragging || event.pointerId !== pointerId) return;
					pointerCurrentY = Math.max(0, event.clientY - pointerStartY);
					shell.style.setProperty("--rm-drag-y", `${pointerCurrentY}px`);
					event.preventDefault();
				};
				const pointerUp = (event) => {
					if (!pointerDragging || event.pointerId !== pointerId) return;
					const elapsed = Math.max(1, performance.now() - pointerStartTime);
					const velocity = pointerCurrentY / elapsed;
					const threshold = Math.min(config.dismissThresholdPx, shell.getBoundingClientRect().height * config.dismissThresholdRatio);
					pointerDragging = false;
					shell.style.transition = "";
					if (this.schemaValue.swipeToDismiss !== false && this.schemaValue.dismissible !== false && (pointerCurrentY >= threshold || velocity >= config.velocityThresholdPxMs)) this.finish("dismiss", void 0, "swipe");
					else shell.style.removeProperty("--rm-drag-y");
				};
				const rootTouchMove = (event) => {
					if (!config.preventPullToRefresh || !event.cancelable) return;
					if (!event.composedPath().includes(shell)) {
						event.preventDefault();
						event.stopPropagation();
					}
				};
				shell.addEventListener("touchstart", touchStart, { passive: true });
				shell.addEventListener("touchmove", touchMove, { passive: false });
				shell.addEventListener("touchend", finishGesture, { passive: true });
				shell.addEventListener("touchcancel", finishGesture, { passive: true });
				root.addEventListener("touchmove", rootTouchMove, {
					passive: false,
					capture: true
				});
				handle?.addEventListener("pointerdown", pointerDown);
				handle?.addEventListener("pointermove", pointerMove);
				handle?.addEventListener("pointerup", pointerUp);
				handle?.addEventListener("pointercancel", pointerUp);
				this.renderListeners.push(() => {
					shell.removeEventListener("touchstart", touchStart);
					shell.removeEventListener("touchmove", touchMove);
					shell.removeEventListener("touchend", finishGesture);
					shell.removeEventListener("touchcancel", finishGesture);
					root.removeEventListener("touchmove", rootTouchMove, true);
					handle?.removeEventListener("pointerdown", pointerDown);
					handle?.removeEventListener("pointermove", pointerMove);
					handle?.removeEventListener("pointerup", pointerUp);
					handle?.removeEventListener("pointercancel", pointerUp);
				});
			}
			resolveComponentRenderer(name) {
				return this.schemaValue.components?.[name] || registeredComponents.get(name) || globalConfig.components[name];
			}
			resolveFieldTypeRenderer(type) {
				return this.schemaValue.fieldTypes?.[type] || registeredFieldTypes.get(type) || globalConfig.fieldTypes[type];
			}
			renderNamedComponent(name, props = {}) {
				const renderer = this.resolveComponentRenderer(name);
				if (!renderer) return null;
				return renderer({
					name,
					document: this.doc,
					window: this.win,
					schema: this.schemaValue,
					context: this.context,
					props,
					defaultRender: () => createElement(this.doc, "div"),
					create: (tag, className) => {
						const node = createElement(this.doc, tag);
						if (className) node.className = className;
						return node;
					},
					render: (nestedName, nestedProps = {}) => this.renderNamedComponent(nestedName, nestedProps)
				}) || null;
			}
			renderComponent(name, defaultRender, props = {}) {
				const renderer = this.resolveComponentRenderer(name);
				if (!renderer) return defaultRender();
				const renderNested = (nestedName, nestedProps = {}) => this.renderNamedComponent(nestedName, nestedProps);
				return renderer({
					name,
					document: this.doc,
					window: this.win,
					schema: this.schemaValue,
					context: this.context,
					props,
					defaultRender,
					create: (tag, className) => {
						const node = createElement(this.doc, tag);
						if (className) node.className = className;
						return node;
					},
					render: renderNested
				}) || defaultRender();
			}
			finish(action, data, reason) {
				if (this.settled) return;
				this.settled = true;
				this.persistenceManager.trigger("close");
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
				for (const off of this.renderListeners.splice(0)) try {
					off();
				} catch {}
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
				const message = error instanceof Error ? error.message : String(error);
				const mode = this.schemaValue.errorMode ?? (globalConfig.toasterErrors ? "both" : "inline");
				if (mode === "inline" || mode === "both") this.setGlobalError(message);
				if (mode === "toaster" || mode === "both") {
					if (!notifyToaster("error", this.schemaValue.title || "RodMenu", message) && globalConfig.autoLoadDependencies) loadDependency("toaster");
				}
				try {
					console.error("[RodMenu]", error);
				} catch {}
			}
		}
		for (const name of [
			"elements",
			"toaster",
			"cipo",
			"broto"
		]) if (dependencyPresent(name)) markDependency(name, "native", "window");
		const previousGlobal = rootWindow[GLOBAL_NAME];
		const readyPromise = globalConfig.autoLoadDependencies ? loadDependencies() : Promise.resolve({
			elements: { ...runtimeStatus.elements },
			toaster: { ...runtimeStatus.toaster },
			cipo: { ...runtimeStatus.cipo },
			broto: { ...runtimeStatus.broto }
		});
		const presetApi = {
			media(options) {
				const fields = [];
				if (options.source) fields.push({
					type: "media-preview",
					name: "sourcePreview",
					item: options.source,
					showSource: true
				});
				fields.push({
					type: "media-picker",
					name: "selectedMedia",
					label: options.media.length === 1 ? "Mídia" : "Mídias",
					items: options.media,
					value: options.media.filter((item) => !item.disabled).map((item) => item.id),
					selectAll: options.media.length > 1,
					minSelected: 1
				});
				if (options.channels?.length) fields.push({
					type: "channel-picker",
					name: "channel",
					label: "Canal",
					options: options.channels,
					searchable: options.channels.length > 8
				});
				if (options.extraFields?.length) fields.push(...options.extraFields);
				const actions = options.actions || [{
					id: "cancel",
					label: "Cancelar",
					role: "cancel",
					variant: "ghost"
				}, {
					id: "run",
					label: "Executar",
					role: "submit",
					variant: "primary",
					badge: (context) => {
						const selected = context.get("selectedMedia");
						return Array.isArray(selected) && selected.length > 1 ? selected.length : null;
					},
					disabledWhen: (values) => !Array.isArray(values.selectedMedia) || values.selectedMedia.length === 0
				}];
				return api.open({
					title: options.title || "Mídia detectada",
					description: options.description || "Escolha o que fazer com a mídia encontrada.",
					presentation: options.presentation || "auto",
					anchor: options.anchor,
					fields,
					actions,
					initialValues: options.initialValues,
					store: options.store
				});
			},
			settings(schema) {
				return api.open({
					...schema,
					title: schema.title || "Configurações",
					store: schema.store || { persist: {
						key: `rod-menu:settings:${schema.id || "default"}`,
						storage: "local"
					} },
					actions: schema.actions || [{
						id: "reset",
						label: "Restaurar",
						role: "custom",
						variant: "ghost",
						close: false,
						handler: (context) => context.reset()
					}, {
						id: "done",
						label: "Concluir",
						role: "submit",
						variant: "primary"
					}]
				});
			},
			history(options) {
				return api.open({
					title: options.title || "Histórico",
					description: options.description,
					presentation: options.presentation || "bottom-sheet",
					fields: [{
						type: "custom",
						name: "history",
						render(context) {
							const list = createElement(context.host.ownerDocument, "div");
							list.className = "rm-history-list";
							options.items.forEach((item, index) => {
								const row = createElement(context.host.ownerDocument, "div");
								row.className = "rm-history-item";
								const rendered = options.renderItem?.(item, index, context);
								if (typeof rendered === "string") row.textContent = rendered;
								else if (rendered) row.append(rendered);
								else try {
									row.textContent = typeof item === "string" ? item : JSON.stringify(item);
								} catch {
									row.textContent = String(item);
								}
								list.append(row);
							});
							return list;
						}
					}],
					actions: [{
						id: "close",
						label: "Fechar",
						role: "cancel",
						variant: "secondary"
					}]
				});
			},
			debug(options) {
				const tabs = [];
				if (options.summary !== void 0) tabs.push({
					id: "summary",
					label: "Resumo",
					fields: [{
						type: "debug-json",
						name: "debugSummary",
						data: options.summary,
						maxHeight: 360
					}]
				});
				if (options.media?.length) tabs.push({
					id: "media",
					label: "Mídia",
					badge: options.media.length,
					fields: [{
						type: "media-picker",
						name: "debugMedia",
						items: options.media,
						selectAll: false
					}]
				});
				if (options.providers?.length) tabs.push({
					id: "providers",
					label: "Providers",
					badge: options.providers.length,
					fields: [{
						type: "provider-status",
						name: "debugProviders",
						providers: options.providers
					}]
				});
				if (options.requests?.length) tabs.push({
					id: "requests",
					label: "Requests",
					badge: options.requests.length,
					fields: [{
						type: "request-log",
						name: "debugRequests",
						entries: options.requests,
						maxHeight: 420
					}]
				});
				if (options.relay !== void 0) tabs.push({
					id: "relay",
					label: "Relay",
					fields: [{
						type: "debug-json",
						name: "debugRelay",
						data: options.relay,
						maxHeight: 420
					}]
				});
				if (options.logs !== void 0) tabs.push({
					id: "logs",
					label: "Logs",
					fields: [{
						type: "debug-json",
						name: "debugLogs",
						data: options.logs,
						maxHeight: 420
					}]
				});
				if (!tabs.length) tabs.push({
					id: "summary",
					label: "Resumo",
					fields: [{
						type: "html",
						name: "empty",
						html: "<p>Sem dados de debug.</p>"
					}]
				});
				return api.open({
					title: options.title || "Debug",
					description: options.description,
					presentation: options.presentation || "bottom-sheet",
					size: "lg",
					tabs,
					actions: [{
						id: "close",
						label: "Fechar",
						role: "cancel",
						variant: "secondary"
					}]
				});
			},
			async channelPicker(options) {
				const result = await api.open({
					title: options.title || "Escolha o canal",
					description: options.description,
					presentation: options.presentation || "auto",
					anchor: options.anchor,
					fields: [{
						type: "channel-picker",
						name: "channel",
						options: options.channels,
						multiple: options.multiple,
						searchable: options.searchable,
						value: options.value,
						required: true
					}],
					actions: [{
						id: "cancel",
						label: "Cancelar",
						role: "cancel",
						variant: "ghost"
					}, {
						id: "select",
						label: "Selecionar",
						role: "submit",
						variant: "primary"
					}]
				}).result;
				return result.action === "select" ? result.values.channel : null;
			}
		};
		const api = {
			version: VERSION,
			get config() {
				return api.getConfig();
			},
			get runtime() {
				return Object.freeze({
					elements: { ...runtimeStatus.elements },
					toaster: { ...runtimeStatus.toaster },
					cipo: { ...runtimeStatus.cipo },
					broto: { ...runtimeStatus.broto }
				});
			},
			ready: readyPromise,
			presets: presetApi,
			aio: presetApi,
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
				const handle = api.open({
					...schema,
					actions
				});
				await handle.ready;
				return handle.result;
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
					anchor: options.anchor,
					actions: [...options.items.map((item) => ({
						id: item.value,
						label: item.label,
						icon: item.icon,
						badge: item.badge,
						shortcut: item.shortcut,
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
					...config,
					dependencyUrls: config.dependencyUrls ? {
						...globalConfig.dependencyUrls,
						...config.dependencyUrls
					} : globalConfig.dependencyUrls,
					gestures: config.gestures ? {
						...globalConfig.gestures,
						...config.gestures
					} : globalConfig.gestures,
					defaultSchema: config.defaultSchema ? {
						...globalConfig.defaultSchema,
						...config.defaultSchema
					} : globalConfig.defaultSchema,
					theme: config.theme ? {
						...globalConfig.theme,
						...config.theme
					} : globalConfig.theme,
					components: config.components ? {
						...globalConfig.components,
						...config.components
					} : globalConfig.components,
					fieldTypes: config.fieldTypes ? {
						...globalConfig.fieldTypes,
						...config.fieldTypes
					} : globalConfig.fieldTypes
				};
				if (config.autoLoadDependencies === true) loadDependencies();
				if (globalConfig.refreshActiveOnConfigure) api.refreshAll();
				return api;
			},
			getConfig() {
				return Object.freeze({
					...globalConfig,
					dependencyUrls: Object.freeze({ ...globalConfig.dependencyUrls }),
					gestures: Object.freeze({ ...globalConfig.gestures }),
					defaultSchema: Object.freeze({ ...globalConfig.defaultSchema }),
					theme: Object.freeze({ ...globalConfig.theme }),
					components: Object.freeze({ ...globalConfig.components }),
					fieldTypes: Object.freeze({ ...globalConfig.fieldTypes })
				});
			},
			resetConfig() {
				globalConfig = {
					...defaultConfig,
					dependencyUrls: { ...defaultDependencyUrls },
					gestures: { ...defaultGestureConfig },
					defaultSchema: {},
					theme: {},
					components: {},
					fieldTypes: {}
				};
				registeredComponents.clear();
				registeredFieldTypes.clear();
				api.refreshAll();
				return api;
			},
			refreshAll() {
				for (const handle of Array.from(activeHandles.values())) try {
					handle.update({});
				} catch (error) {
					try {
						globalConfig.onError?.(error);
					} catch {}
				}
			},
			registerComponent(name, renderer) {
				if (!name || typeof renderer !== "function") throw new TypeError("registerComponent(name, renderer) requires a name and renderer function.");
				registeredComponents.set(name, renderer);
				if (globalConfig.refreshActiveOnConfigure) api.refreshAll();
				return api;
			},
			unregisterComponent(name) {
				const deleted = registeredComponents.delete(name);
				if (deleted && globalConfig.refreshActiveOnConfigure) api.refreshAll();
				return deleted;
			},
			getComponent(name) {
				return registeredComponents.get(name) || globalConfig.components[name];
			},
			registerFieldType(type, renderer) {
				if (!type || typeof renderer !== "function") throw new TypeError("registerFieldType(type, renderer) requires a type and renderer function.");
				registeredFieldTypes.set(type, renderer);
				if (globalConfig.refreshActiveOnConfigure) api.refreshAll();
				return api;
			},
			unregisterFieldType(type) {
				const deleted = registeredFieldTypes.delete(type);
				if (deleted && globalConfig.refreshActiveOnConfigure) api.refreshAll();
				return deleted;
			},
			hasFieldType(type) {
				return registeredFieldTypes.has(type) || typeof globalConfig.fieldTypes[type] === "function";
			},
			field(type, config) {
				return {
					...config,
					type
				};
			},
			loadDependencies,
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