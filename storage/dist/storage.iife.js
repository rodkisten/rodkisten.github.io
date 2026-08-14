/* Auto-generated from storage/storage.ts. at 8/14/2026, 6:20:16 PM Do not edit directly. */
var RodStorage = (function() {

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
//#region storage/storage.ts
	var storage_exports = /* @__PURE__ */ __exportAll({});
	/**
	* RodStorage v1.0.0
	* Central storage manager for browser userscripts.
	*
	* - Single-file TypeScript IIFE, browser-first and bundler-optional.
	* - Publishes globalThis.RodStorage / window.RodStorage.
	* - IndexedDB-first with GM, localStorage and memory fallbacks.
	* - Always-async API, typed schemas, sequential migrations and rollback snapshots.
	* - Structured serialization, transforms, gzip, AES-GCM, TTL, cleanup and cache.
	* - Cross-tab BroadcastChannel sync, locks, atomic updates and reactive stores.
	* - Namespaces, import/export, diagnostics, quota estimates, healthcheck and noConflict.
	*
	* Compile with:
	*   tsc rod-storage.ts --target ES2022 --lib ES2022,DOM --strict --outFile dist/rod-storage.js
	*/
	(() => {
		"use strict";
		const MULTIPLIERS = {
			ms: 1,
			s: 1e3,
			m: 6e4,
			h: 36e5,
			d: 864e5,
			w: 6048e5
		};
		function durationToMs(value) {
			if (value === void 0) return void 0;
			if (typeof value === "number") return Math.max(0, value);
			const match = /^(\d+(?:\.\d+)?)(ms|s|m|h|d|w)$/.exec(value);
			if (!match) throw new TypeError(`Invalid duration: ${value}`);
			return Number(match[1]) * MULTIPLIERS[match[2]];
		}
		class StorageError extends Error {
			cause;
			name = "StorageError";
			constructor(message, cause) {
				super(message);
				this.cause = cause;
			}
		}
		class StorageUnavailableError extends StorageError {
			name = "StorageUnavailableError";
		}
		class StorageQuotaError extends StorageError {
			name = "StorageQuotaError";
		}
		class StorageSerializationError extends StorageError {
			name = "StorageSerializationError";
		}
		class StorageMigrationError extends StorageError {
			name = "StorageMigrationError";
		}
		class StorageValidationError extends StorageError {
			name = "StorageValidationError";
		}
		class StorageTransactionError extends StorageError {
			name = "StorageTransactionError";
		}
		function normalizeStorageError(error) {
			if (error instanceof StorageError) return error;
			if (error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")) return new StorageQuotaError(error.message, error);
			if (error instanceof Error) return new StorageError(error.message, error);
			return new StorageError(String(error), error);
		}
		const TYPE = "__rodStorageType";
		async function encodeSpecial(value) {
			if (typeof value === "bigint") return {
				[TYPE]: "BigInt",
				value: value.toString()
			};
			if (typeof value === "number") {
				if (Number.isNaN(value)) return { [TYPE]: "NaN" };
				if (value === Infinity) return { [TYPE]: "Infinity" };
				if (value === -Infinity) return { [TYPE]: "-Infinity" };
			}
			if (value === void 0) return { [TYPE]: "Undefined" };
			if (value instanceof Date) return {
				[TYPE]: "Date",
				value: value.toISOString()
			};
			if (value instanceof RegExp) return {
				[TYPE]: "RegExp",
				source: value.source,
				flags: value.flags
			};
			if (value instanceof URL) return {
				[TYPE]: "URL",
				value: value.href
			};
			if (value instanceof Map) return {
				[TYPE]: "Map",
				value: await Promise.all([...value.entries()].map(async ([k, v]) => [await encodeSpecial(k), await encodeSpecial(v)]))
			};
			if (value instanceof Set) return {
				[TYPE]: "Set",
				value: await Promise.all([...value].map(encodeSpecial))
			};
			if (value instanceof Error) return {
				[TYPE]: "Error",
				name: value.name,
				message: value.message,
				...value.stack === void 0 ? {} : { stack: value.stack }
			};
			if (typeof Blob !== "undefined" && value instanceof Blob) return {
				[TYPE]: "Blob",
				mime: value.type,
				value: Array.from(new Uint8Array(await value.arrayBuffer()))
			};
			if (value instanceof ArrayBuffer) return {
				[TYPE]: "ArrayBuffer",
				value: Array.from(new Uint8Array(value))
			};
			if (value instanceof DataView) return {
				[TYPE]: "DataView",
				value: Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
			};
			if (ArrayBuffer.isView(value)) return {
				[TYPE]: value.constructor.name,
				value: Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
			};
			if (Array.isArray(value)) return Promise.all(value.map(encodeSpecial));
			if (value && typeof value === "object") {
				const out = {};
				for (const [k, v] of Object.entries(value)) out[k] = await encodeSpecial(v);
				return out;
			}
			return value;
		}
		function decodeSpecial(value) {
			if (Array.isArray(value)) return value.map(decodeSpecial);
			if (!value || typeof value !== "object") return value;
			const tagged = value;
			const tag = tagged[TYPE];
			if (typeof tag === "string") switch (tag) {
				case "Undefined": return;
				case "NaN": return NaN;
				case "Infinity": return Infinity;
				case "-Infinity": return -Infinity;
				case "BigInt": return BigInt(String(tagged.value));
				case "Date": return new Date(String(tagged.value));
				case "URL": return new URL(String(tagged.value));
				case "RegExp": return new RegExp(String(tagged.source), String(tagged.flags ?? ""));
				case "Map": return new Map(tagged.value.map(([k, v]) => [decodeSpecial(k), decodeSpecial(v)]));
				case "Set": return new Set(tagged.value.map(decodeSpecial));
				case "Error": {
					const error = new Error(String(tagged.message ?? ""));
					error.name = String(tagged.name ?? "Error");
					if (typeof tagged.stack === "string") error.stack = tagged.stack;
					return error;
				}
				case "Blob": return new Blob([new Uint8Array(tagged.value)], { type: String(tagged.mime ?? "") });
				case "ArrayBuffer": return new Uint8Array(tagged.value).buffer;
				case "DataView": return new DataView(new Uint8Array(tagged.value).buffer);
				default: {
					const ctor = globalThis[tag];
					if (typeof ctor === "function" && /Array$/.test(tag)) {
						const bytes = new Uint8Array(tagged.value);
						try {
							return new ctor(bytes.buffer);
						} catch {
							return bytes;
						}
					}
				}
			}
			const out = {};
			for (const [k, v] of Object.entries(value)) out[k] = decodeSpecial(v);
			return out;
		}
		const structuredSerializer = {
			async encode(value) {
				try {
					return await encodeSpecial(value);
				} catch (error) {
					throw new StorageSerializationError("Failed to serialize value", error);
				}
			},
			async decode(value) {
				try {
					return decodeSpecial(value);
				} catch (error) {
					throw new StorageSerializationError("Failed to deserialize value", error);
				}
			}
		};
		function bytesToBase64(bytes) {
			let binary = "";
			const step = 32768;
			for (let i = 0; i < bytes.length; i += step) binary += String.fromCharCode(...bytes.subarray(i, i + step));
			return btoa(binary);
		}
		function base64ToBytes(base64) {
			const binary = atob(base64);
			const bytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
			return bytes;
		}
		async function streamBytes(stream) {
			return new Uint8Array(await new Response(stream).arrayBuffer());
		}
		function compressionTransform(format = "gzip") {
			return {
				name: `compression:${format}`,
				async write(value) {
					if (!("CompressionStream" in globalThis)) throw new StorageUnavailableError("CompressionStream is unavailable");
					const json = JSON.stringify(value);
					return {
						__rodTransform: "compression",
						format,
						data: bytesToBase64(await streamBytes(new Blob([json]).stream().pipeThrough(new CompressionStream(format))))
					};
				},
				async read(value) {
					const payload = value;
					if (payload?.__rodTransform !== "compression" || !payload.data) return value;
					if (!("DecompressionStream" in globalThis)) throw new StorageUnavailableError("DecompressionStream is unavailable");
					const input = new Blob([base64ToBytes(payload.data)]).stream().pipeThrough(new DecompressionStream(payload.format ?? format));
					return JSON.parse(new TextDecoder().decode(await streamBytes(input)));
				}
			};
		}
		async function deriveKey(input, iterations, salt) {
			if (typeof CryptoKey !== "undefined" && input instanceof CryptoKey) return input;
			if (!crypto?.subtle) throw new StorageUnavailableError("Web Crypto is unavailable");
			const material = typeof input === "string" ? new TextEncoder().encode(input) : input;
			const base = await crypto.subtle.importKey("raw", material, "PBKDF2", false, ["deriveKey"]);
			return crypto.subtle.deriveKey({
				name: "PBKDF2",
				salt: new TextEncoder().encode(salt),
				iterations,
				hash: "SHA-256"
			}, base, {
				name: "AES-GCM",
				length: 256
			}, false, ["encrypt", "decrypt"]);
		}
		function encryptionTransform(options) {
			const iterations = options.iterations ?? 15e4;
			const salt = options.salt ?? "RodStorage:v1";
			let keyPromise;
			const key = () => keyPromise ??= deriveKey(options.key, iterations, salt);
			return {
				name: "encryption:aes-gcm",
				async write(value) {
					try {
						const iv = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(12));
						const plaintext = new TextEncoder().encode(JSON.stringify(value));
						const encrypted = await crypto.subtle.encrypt({
							name: "AES-GCM",
							iv
						}, await key(), plaintext);
						return {
							__rodTransform: "aes-gcm",
							iv: bytesToBase64(iv),
							data: bytesToBase64(new Uint8Array(encrypted))
						};
					} catch (error) {
						throw new StorageSerializationError("Encryption transform failed", error);
					}
				},
				async read(value) {
					const payload = value;
					if (payload?.__rodTransform !== "aes-gcm" || !payload.iv || !payload.data) return value;
					try {
						const decrypted = await crypto.subtle.decrypt({
							name: "AES-GCM",
							iv: base64ToBytes(payload.iv)
						}, await key(), base64ToBytes(payload.data));
						return JSON.parse(new TextDecoder().decode(decrypted));
					} catch (error) {
						throw new StorageSerializationError("Decryption transform failed", error);
					}
				}
			};
		}
		class IndexedDBAdapter {
			databaseName;
			name = "indexeddb";
			db;
			constructor(databaseName = "rod-storage") {
				this.databaseName = databaseName;
			}
			async init() {
				if (!("indexedDB" in globalThis)) throw new StorageUnavailableError("IndexedDB is unavailable");
				this.db = await new Promise((resolve, reject) => {
					const req = indexedDB.open(this.databaseName, 1);
					req.onupgradeneeded = () => {
						const db = req.result;
						if (!db.objectStoreNames.contains("records")) db.createObjectStore("records", { keyPath: "id" });
					};
					req.onsuccess = () => resolve(req.result);
					req.onerror = () => reject(req.error ?? /* @__PURE__ */ new Error("Failed to open IndexedDB"));
					req.onblocked = () => reject(new StorageUnavailableError("IndexedDB upgrade was blocked"));
				});
			}
			store(mode) {
				if (!this.db) throw new StorageUnavailableError("IndexedDB adapter not initialized");
				return this.db.transaction("records", mode).objectStore("records");
			}
			request(request) {
				return new Promise((resolve, reject) => {
					request.onsuccess = () => resolve(request.result);
					request.onerror = () => reject(request.error ?? /* @__PURE__ */ new Error("IndexedDB request failed"));
				});
			}
			async get(key) {
				return (await this.request(this.store("readonly").get(key)))?.value;
			}
			async set(key, value) {
				await this.request(this.store("readwrite").put({
					id: key,
					value
				}));
			}
			async delete(key) {
				await this.request(this.store("readwrite").delete(key));
			}
			async has(key) {
				return await this.request(this.store("readonly").count(key)) > 0;
			}
			async keys(prefix = "") {
				return (await this.request(this.store("readonly").getAllKeys())).map(String).filter((k) => k.startsWith(prefix));
			}
			async clear(prefix = "") {
				if (!prefix) {
					await this.request(this.store("readwrite").clear());
					return;
				}
				for (const key of await this.keys(prefix)) await this.delete(key);
			}
			async entries(prefix = "") {
				return (await this.request(this.store("readonly").getAll())).filter((row) => row.id.startsWith(prefix)).map((row) => [row.id, row.value]);
			}
			async transaction(fn) {
				try {
					return await fn();
				} catch (error) {
					throw new StorageTransactionError("IndexedDB transaction failed", error);
				}
			}
			async estimate() {
				if (!navigator.storage?.estimate) return {};
				const estimate = await navigator.storage.estimate();
				return {
					...estimate.usage === void 0 ? {} : { usage: estimate.usage },
					...estimate.quota === void 0 ? {} : { quota: estimate.quota }
				};
			}
			close() {
				this.db?.close();
			}
		}
		class LocalStorageAdapter {
			prefix;
			name = "localstorage";
			constructor(prefix = "__rod_storage__:") {
				this.prefix = prefix;
			}
			key(key) {
				return `${this.prefix}${key}`;
			}
			async init() {
				try {
					const probe = this.key(`probe:${Math.random()}`);
					localStorage.setItem(probe, "1");
					localStorage.removeItem(probe);
				} catch (error) {
					throw new StorageUnavailableError("localStorage is unavailable", error);
				}
			}
			async get(key) {
				try {
					const raw = localStorage.getItem(this.key(key));
					return raw === null ? void 0 : JSON.parse(raw);
				} catch (error) {
					throw normalizeStorageError(error);
				}
			}
			async set(key, value) {
				try {
					localStorage.setItem(this.key(key), JSON.stringify(value));
				} catch (error) {
					throw normalizeStorageError(error);
				}
			}
			async delete(key) {
				localStorage.removeItem(this.key(key));
			}
			async has(key) {
				return localStorage.getItem(this.key(key)) !== null;
			}
			async keys(prefix = "") {
				const match = this.key(prefix);
				const out = [];
				for (let i = 0; i < localStorage.length; i++) {
					const k = localStorage.key(i);
					if (k?.startsWith(match)) out.push(k.slice(this.prefix.length));
				}
				return out;
			}
			async clear(prefix = "") {
				for (const key of await this.keys(prefix)) localStorage.removeItem(this.key(key));
			}
			async entries(prefix = "") {
				const out = [];
				for (const key of await this.keys(prefix)) out.push([key, await this.get(key)]);
				return out;
			}
		}
		class GMAdapter {
			api;
			name = "gm";
			constructor(api) {
				this.api = api;
			}
			async init() {
				if (!this.api.getValue || !this.api.setValue || !this.api.deleteValue || !this.api.listValues) throw new StorageUnavailableError("GM storage API is incomplete");
			}
			async get(key) {
				return this.api.getValue(key);
			}
			async set(key, value) {
				await this.api.setValue(key, value);
			}
			async delete(key) {
				await this.api.deleteValue(key);
			}
			async has(key) {
				return (await this.api.listValues()).includes(key);
			}
			async keys(prefix = "") {
				return (await this.api.listValues()).filter((k) => k.startsWith(prefix));
			}
			async clear(prefix = "") {
				for (const key of await this.keys(prefix)) await this.delete(key);
			}
			async entries(prefix = "") {
				const out = [];
				for (const key of await this.keys(prefix)) out.push([key, await this.get(key)]);
				return out;
			}
		}
		class MemoryAdapter {
			name = "memory";
			map = /* @__PURE__ */ new Map();
			async init() {}
			async get(key) {
				return this.map.get(key);
			}
			async set(key, value) {
				this.map.set(key, value);
			}
			async delete(key) {
				this.map.delete(key);
			}
			async has(key) {
				return this.map.has(key);
			}
			async keys(prefix = "") {
				return [...this.map.keys()].filter((k) => k.startsWith(prefix));
			}
			async clear(prefix = "") {
				for (const key of await this.keys(prefix)) this.map.delete(key);
			}
			async entries(prefix = "") {
				return [...this.map.entries()].filter(([k]) => k.startsWith(prefix));
			}
			async transaction(fn) {
				return fn();
			}
		}
		class StorageSyncChannel {
			name;
			channel;
			listeners = /* @__PURE__ */ new Set();
			constructor(name, enabled) {
				this.name = name;
				if (enabled && "BroadcastChannel" in globalThis) {
					this.channel = new BroadcastChannel(name);
					this.channel.onmessage = (event) => this.emitLocal(event.data);
				}
			}
			publish(event) {
				this.channel?.postMessage(event);
			}
			subscribe(listener) {
				this.listeners.add(listener);
				return () => this.listeners.delete(listener);
			}
			emitLocal(event) {
				for (const listener of this.listeners) listener({
					...event,
					source: "external"
				});
			}
			close() {
				this.channel?.close();
				this.listeners.clear();
			}
		}
		const localLocks = /* @__PURE__ */ new Map();
		async function withLock(name, fn) {
			const locks = typeof navigator !== "undefined" ? navigator.locks : void 0;
			if (locks?.request) return locks.request(name, { mode: "exclusive" }, fn);
			const previous = localLocks.get(name) ?? Promise.resolve();
			let release;
			const current = new Promise((resolve) => {
				release = resolve;
			});
			const chained = previous.then(() => current);
			localLocks.set(name, chained);
			await previous;
			try {
				return await fn();
			} finally {
				release();
				if (localLocks.get(name) === chained) localLocks.delete(name);
			}
		}
		class RodStore {
			storage;
			key;
			options;
			constructor(storage, key, options = {}) {
				this.storage = storage;
				this.key = key;
				this.options = options;
			}
			async get() {
				const value = await this.storage.get(this.key, this.options.transforms);
				if (value !== void 0) return this.validate(value);
				if (this.options.default !== void 0) {
					const resolved = typeof this.options.default === "function" ? await this.options.default() : this.options.default;
					await this.set(resolved);
					return resolved;
				}
				return value;
			}
			async set(value, options = {}) {
				this.validate(value);
				const ttl = options.ttl ?? this.options.ttl;
				return this.storage.set(this.key, value, ttl === void 0 ? {} : { ttl }, this.options.transforms);
			}
			async update(updater) {
				return this.storage.atomic(this.key, async (current) => {
					let base = current;
					if (base === void 0 && this.options.default !== void 0) base = typeof this.options.default === "function" ? await this.options.default() : this.options.default;
					return updater(base);
				}, {}, this.options.transforms);
			}
			async patch(patch) {
				return this.update((value) => ({
					...value,
					...patch
				}));
			}
			async delete() {
				return this.storage.delete(this.key);
			}
			async reset() {
				if (this.options.default === void 0) return this.delete();
				const value = typeof this.options.default === "function" ? await this.options.default() : this.options.default;
				await this.storage.set(this.key, value, this.options.ttl === void 0 ? {} : { ttl: this.options.ttl }, this.options.transforms, "reset");
				return value;
			}
			subscribe(listener, immediate = false) {
				const unsubscribe = this.storage.subscribe(this.key, async (event) => {
					if (event.value !== void 0) listener(this.validate(event.value), event);
				});
				if (immediate) this.get().then((value) => listener(value, {
					namespace: this.storage.namespaceName,
					key: this.key,
					operation: "set",
					value,
					source: "local",
					timestamp: Date.now()
				}));
				return unsubscribe;
			}
			select(selector, listener, options = {}) {
				const equals = options.equals ?? Object.is;
				let initialized = false;
				let previous;
				return this.subscribe((value) => {
					const next = selector(value);
					if (!initialized || !equals(previous, next)) {
						initialized = true;
						previous = next;
						listener(next, value);
					}
				}, options.immediate ?? false);
			}
			validate(value) {
				if (this.options.validate && !this.options.validate(value)) throw new StorageValidationError(`Validation failed for store ${this.key}`);
				return value;
			}
		}
		const META_KEY = "__meta__";
		const INTERNAL_PREFIX = "__rod_internal__/";
		function estimateBytes(value) {
			try {
				return new Blob([JSON.stringify(value)]).size;
			} catch {
				return 0;
			}
		}
		class RodStorageInstance {
			options;
			namespaceName;
			adapter;
			serializer;
			transforms;
			cache = /* @__PURE__ */ new Map();
			cacheHits = 0;
			cacheMisses = 0;
			cacheEnabled;
			cacheMaxEntries;
			metadata;
			channel;
			listeners = /* @__PURE__ */ new Map();
			cleanupTimer;
			readyPromise;
			constructor(options) {
				this.options = options;
				if (!options.namespace?.trim()) throw new TypeError("RodStorage requires a non-empty namespace");
				this.namespaceName = options.namespace.trim();
				this.serializer = options.serializer ?? structuredSerializer;
				this.transforms = options.transforms ?? [];
				const cache = typeof options.cache === "object" ? options.cache : { enabled: options.cache ?? true };
				this.cacheEnabled = cache.enabled ?? true;
				this.cacheMaxEntries = cache.maxEntries ?? 500;
				this.channel = new StorageSyncChannel(`rod-storage:${this.namespaceName}`, options.sync ?? true);
				this.channel.subscribe((event) => {
					this.cache.delete(event.key);
					this.dispatch(event);
				});
				this.readyPromise = this.initialize();
			}
			ready() {
				return this.readyPromise;
			}
			get backend() {
				return { name: this.adapter?.name };
			}
			async initialize() {
				this.adapter = await this.selectAdapter();
				await this.initializeMetadataAndMigrate();
				await this.applyDefaults();
				if (this.options.cleanupIntervalMs && this.options.cleanupIntervalMs > 0) this.cleanupTimer = setInterval(() => void this.cleanup(), this.options.cleanupIntervalMs);
				return this;
			}
			candidateNames() {
				const backend = this.options.backend ?? "auto";
				const defaults = [
					"indexeddb",
					"gm",
					"localstorage",
					"memory"
				];
				if (backend === "auto") return defaults;
				if (typeof backend === "string") return [backend, ...defaults.filter((x) => x !== backend)];
				const preferred = backend.preferred ?? "indexeddb";
				return [preferred, ...(backend.fallbacks ?? defaults).filter((x) => x !== preferred)];
			}
			makeAdapter(name) {
				switch (name) {
					case "indexeddb": return new IndexedDBAdapter(this.options.databaseName ?? "rod-storage");
					case "localstorage": return new LocalStorageAdapter(this.options.localStoragePrefix ?? "__rod_storage__:");
					case "gm": {
						const globalGM = globalThis.GM;
						const legacy = globalThis;
						const api = this.options.gm ?? {
							getValue: globalGM?.getValue?.bind(globalGM) ?? legacy.GM_getValue,
							setValue: globalGM?.setValue?.bind(globalGM) ?? legacy.GM_setValue,
							deleteValue: globalGM?.deleteValue?.bind(globalGM) ?? legacy.GM_deleteValue,
							listValues: globalGM?.listValues?.bind(globalGM) ?? legacy.GM_listValues
						};
						return new GMAdapter(api);
					}
					case "memory": return new MemoryAdapter();
				}
			}
			async selectAdapter() {
				const errors = [];
				for (const name of [...new Set(this.candidateNames())]) {
					const adapter = this.makeAdapter(name);
					try {
						await adapter.init();
						return adapter;
					} catch (error) {
						errors.push(error);
						this.options.onError?.(error);
					}
				}
				throw new StorageUnavailableError(`No storage backend available: ${errors.map(String).join(" | ")}`);
			}
			physicalKey(key) {
				return `${this.namespaceName}/${key}`;
			}
			async readRaw(key) {
				return this.adapter.get(this.physicalKey(key));
			}
			async writeRaw(key, value) {
				await this.adapter.set(this.physicalKey(key), value);
			}
			async deleteRaw(key) {
				await this.adapter.delete(this.physicalKey(key));
			}
			async initializeMetadataAndMigrate() {
				const now = Date.now();
				const raw = await this.readRaw(META_KEY);
				this.metadata = raw ?? {
					format: "RodStorage",
					formatVersion: 1,
					schemaVersion: 0,
					createdAt: now,
					updatedAt: now,
					migrationHistory: []
				};
				const target = Math.max(0, this.options.version ?? 1);
				if (this.metadata.schemaVersion > target) throw new StorageMigrationError(`Stored schema v${this.metadata.schemaVersion} is newer than requested v${target}`);
				for (let version = this.metadata.schemaVersion + 1; version <= target; version++) {
					const migration = this.options.migrations?.[version];
					if (migration) try {
						await this.transaction(async () => migration(this.migrationContext(version - 1, version)));
					} catch (error) {
						this.metadata.lastMigrationError = error instanceof Error ? error.message : String(error);
						await this.writeRaw(META_KEY, this.metadata);
						throw new StorageMigrationError(`Migration to v${version} failed`, error);
					}
					this.metadata.schemaVersion = version;
					this.metadata.updatedAt = Date.now();
					if (!this.metadata.migrationHistory.includes(version)) this.metadata.migrationHistory.push(version);
					delete this.metadata.lastMigrationError;
					await this.writeRaw(META_KEY, this.metadata);
				}
			}
			migrationContext(fromVersion, toVersion) {
				const rawGet = async (key) => {
					const raw = await this.readRaw(key);
					if (!raw) return void 0;
					if (raw.expiresAt !== void 0 && raw.expiresAt <= Date.now()) {
						await this.deleteRaw(key);
						return;
					}
					return this.decodeValue(key, raw.value);
				};
				const rawSet = async (key, value) => {
					const now = Date.now();
					const existing = await this.readRaw(key);
					await this.writeRaw(key, {
						value: await this.encodeValue(key, value),
						createdAt: existing?.createdAt ?? now,
						updatedAt: now
					});
				};
				return {
					fromVersion,
					toVersion,
					get: rawGet,
					set: rawSet,
					delete: (key) => this.deleteRaw(key),
					has: async (key) => await rawGet(key) !== void 0,
					keys: async () => {
						const prefix = this.physicalKey("");
						return (await this.adapter.keys(prefix)).map((k) => k.slice(prefix.length)).filter((k) => k !== META_KEY && !k.startsWith(INTERNAL_PREFIX));
					}
				};
			}
			async applyDefaults() {
				const configured = this.options.defaults;
				if (!configured) return;
				const defaults = typeof configured === "function" ? await configured() : configured;
				const ctx = this.migrationContext(this.metadata.schemaVersion, this.metadata.schemaVersion);
				for (const [key, value] of Object.entries(defaults)) {
					const typedKey = key;
					if (!await ctx.has(typedKey)) await ctx.set(typedKey, value);
				}
			}
			touchCache(key, value, expiresAt) {
				if (!this.cacheEnabled) return;
				this.cache.delete(key);
				this.cache.set(key, {
					value,
					...expiresAt === void 0 ? {} : { expiresAt }
				});
				while (this.cache.size > this.cacheMaxEntries) this.cache.delete(this.cache.keys().next().value);
			}
			async encodeValue(key, value, transforms = []) {
				let current = await this.serializer.encode(value);
				for (const transform of [...this.transforms, ...transforms]) current = await transform.write(current, {
					namespace: this.namespaceName,
					key
				});
				return current;
			}
			async decodeValue(key, value, transforms = []) {
				let current = value;
				for (const transform of [...this.transforms, ...transforms].reverse()) current = await transform.read(current, {
					namespace: this.namespaceName,
					key
				});
				return this.serializer.decode(current);
			}
			async get(key, transforms = []) {
				await this.readyPromise;
				if (this.cacheEnabled && this.cache.has(key)) {
					const cached = this.cache.get(key);
					if (cached.expiresAt === void 0 || cached.expiresAt > Date.now()) {
						this.cacheHits++;
						return cached.value;
					}
					this.cache.delete(key);
				}
				this.cacheMisses++;
				const raw = await this.readRaw(key);
				if (!raw) return void 0;
				if (raw.expiresAt !== void 0 && raw.expiresAt <= Date.now()) {
					let previousValue;
					try {
						previousValue = await this.decodeValue(key, raw.value, transforms);
					} catch {}
					await this.deleteRaw(key);
					this.cache.delete(key);
					this.emit({
						namespace: this.namespaceName,
						key,
						operation: "expire",
						...previousValue === void 0 ? {} : { previousValue },
						source: "local",
						timestamp: Date.now()
					});
					return;
				}
				const value = await this.decodeValue(key, raw.value, transforms);
				this.touchCache(key, value, raw.expiresAt);
				return value;
			}
			async setUnlocked(key, value, options = {}, transforms = [], operation = "set", previousValue) {
				const now = Date.now();
				const existing = await this.readRaw(key);
				const ttlMs = durationToMs(options.ttl);
				const envelope = {
					value: await this.encodeValue(key, value, transforms),
					createdAt: existing?.createdAt ?? now,
					updatedAt: now,
					...ttlMs === void 0 ? {} : { expiresAt: now + ttlMs }
				};
				try {
					await this.writeRaw(key, envelope);
				} catch (error) {
					throw normalizeStorageError(error);
				}
				this.metadata.updatedAt = now;
				await this.writeRaw(META_KEY, this.metadata);
				this.touchCache(key, value, envelope.expiresAt);
				this.emit({
					namespace: this.namespaceName,
					key,
					operation,
					...previousValue === void 0 ? {} : { previousValue },
					value,
					source: "local",
					timestamp: now
				});
				return value;
			}
			async set(key, value, options = {}, transforms = [], operation = "set") {
				await this.readyPromise;
				return withLock(`rod-storage:${this.namespaceName}:${key}`, async () => {
					const previousValue = await this.get(key, transforms);
					return this.setUnlocked(key, value, options, transforms, operation, previousValue);
				});
			}
			async update(key, updater, options = {}, transforms = []) {
				return this.atomic(key, updater, options, transforms);
			}
			async atomic(key, updater, options = {}, transforms = []) {
				await this.readyPromise;
				return withLock(`rod-storage:${this.namespaceName}:${key}`, async () => {
					const current = await this.get(key, transforms);
					const next = await updater(current);
					return this.setUnlocked(key, next, options, transforms, "update", current);
				});
			}
			async delete(key, operation = "delete") {
				await this.readyPromise;
				const previousValue = await this.get(key);
				await this.deleteRaw(key);
				this.cache.delete(key);
				this.emit({
					namespace: this.namespaceName,
					key,
					operation,
					previousValue,
					source: "local",
					timestamp: Date.now()
				});
			}
			async has(key) {
				await this.readyPromise;
				const raw = await this.readRaw(key);
				if (!raw) return false;
				if (raw.expiresAt !== void 0 && raw.expiresAt <= Date.now()) {
					await this.deleteRaw(key);
					this.cache.delete(key);
					return false;
				}
				return true;
			}
			async keys() {
				await this.readyPromise;
				const prefix = this.physicalKey("");
				return (await this.adapter.keys(prefix)).map((k) => k.slice(prefix.length)).filter((k) => k !== META_KEY && !k.startsWith(INTERNAL_PREFIX));
			}
			async clear() {
				await this.readyPromise;
				const keys = await this.keys();
				for (const key of keys) await this.delete(key);
				this.emit({
					namespace: this.namespaceName,
					key: "*",
					operation: "clear",
					source: "local",
					timestamp: Date.now()
				});
			}
			async cleanup() {
				await this.readyPromise;
				let removed = 0;
				for (const key of await this.keys()) {
					const raw = await this.readRaw(key);
					if (raw?.expiresAt !== void 0 && raw.expiresAt <= Date.now()) {
						await this.delete(key, "expire");
						removed++;
					}
				}
				return removed;
			}
			subscribe(key, listener) {
				const bucket = this.listeners.get(key) ?? /* @__PURE__ */ new Set();
				bucket.add(listener);
				this.listeners.set(key, bucket);
				return () => bucket.delete(listener);
			}
			dispatch(event) {
				for (const listener of this.listeners.get(event.key) ?? []) listener(event);
				for (const listener of this.listeners.get("*") ?? []) listener(event);
			}
			emit(event) {
				this.dispatch(event);
				this.channel.publish(event);
			}
			async transaction(fn) {
				const prefix = this.physicalKey("");
				return withLock(`rod-storage:${this.namespaceName}:transaction`, async () => {
					const snapshot = await this.adapter.entries(prefix);
					try {
						return await fn();
					} catch (error) {
						try {
							await this.adapter.clear(prefix);
							for (const [key, value] of snapshot) await this.adapter.set(key, value);
							this.cache.clear();
						} catch (rollbackError) {
							this.options.onError?.(rollbackError);
						}
						throw error;
					}
				});
			}
			async lock(name, fn) {
				return withLock(`rod-storage:${this.namespaceName}:${name}`, fn);
			}
			store(key, options = {}) {
				return new RodStore(this, key, options);
			}
			namespace(child, options = {}) {
				return new RodStorageInstance({
					...this.options,
					...options,
					namespace: `${this.namespaceName}/${child}`
				});
			}
			async export() {
				await this.readyPromise;
				const records = {};
				for (const key of await this.keys()) records[key] = await this.get(key);
				return {
					format: "RodStorage",
					formatVersion: 1,
					namespace: this.namespaceName,
					schemaVersion: this.metadata.schemaVersion,
					exportedAt: Date.now(),
					records
				};
			}
			async import(payload, options = {}) {
				await this.readyPromise;
				if (payload.format !== "RodStorage" || payload.formatVersion !== 1) throw new TypeError("Invalid RodStorage export");
				const strategy = options.strategy ?? "merge";
				if (strategy === "overwrite") await this.clear();
				for (const [key, value] of Object.entries(payload.records)) {
					if (strategy === "skip-existing" && await this.has(key)) continue;
					await this.set(key, value, {}, [], "import");
				}
			}
			async diagnostics() {
				await this.readyPromise;
				const exported = await this.export();
				const quota = await this.adapter.estimate?.();
				return {
					backend: this.adapter.name,
					namespace: this.namespaceName,
					schemaVersion: this.metadata.schemaVersion,
					entries: Object.keys(exported.records).length,
					estimatedBytes: estimateBytes(exported.records),
					cache: {
						enabled: this.cacheEnabled,
						size: this.cache.size,
						hits: this.cacheHits,
						misses: this.cacheMisses
					},
					migrations: {
						applied: [...this.metadata.migrationHistory],
						...this.metadata.lastMigrationError ? { lastError: this.metadata.lastMigrationError } : {}
					},
					...quota ? { quota } : {}
				};
			}
			async healthcheck() {
				await this.readyPromise;
				const started = performance.now();
				const key = `${INTERNAL_PREFIX}health:${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
				try {
					const value = {
						ok: true,
						at: Date.now()
					};
					await this.writeRaw(key, value);
					const read = await this.readRaw(key);
					await this.deleteRaw(key);
					if (JSON.stringify(read) !== JSON.stringify(value)) throw new Error("Healthcheck read mismatch");
					return {
						ok: true,
						backend: this.adapter.name,
						durationMs: performance.now() - started
					};
				} catch (error) {
					return {
						ok: false,
						backend: this.adapter.name,
						durationMs: performance.now() - started,
						error: error instanceof Error ? error.message : String(error)
					};
				}
			}
			close() {
				if (this.cleanupTimer) clearInterval(this.cleanupTimer);
				this.channel.close();
				this.adapter?.close?.();
				this.cache.clear();
			}
		}
		const VERSION = "1.0.0";
		const Errors = Object.freeze({
			StorageError,
			StorageUnavailableError,
			StorageQuotaError,
			StorageSerializationError,
			StorageMigrationError,
			StorageValidationError,
			StorageTransactionError,
			normalizeStorageError
		});
		const RodStorage = Object.freeze({
			version: VERSION,
			create(options) {
				return new RodStorageInstance(options);
			},
			serializer: structuredSerializer,
			errors: Errors,
			transforms: Object.freeze({
				compression: compressionTransform,
				encryption: encryptionTransform
			}),
			noConflict: (() => {
				const previous = globalThis.RodStorage;
				return () => {
					if (globalThis.RodStorage === RodStorage) globalThis.RodStorage = previous;
					return RodStorage;
				};
			})()
		});
		globalThis.RodStorage = RodStorage;
	})();

//#endregion
//#region \0rod-iife-entry:browser:/home/runner/work/rodkisten.github.io/rodkisten.github.io/storage/storage.ts
	const __globalName = "RodStorage";
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
	const __hasExports = Object.keys(storage_exports).length > 0;
	const __value = Object.prototype.hasOwnProperty.call(storage_exports, "default") ? void 0 : Object.prototype.hasOwnProperty.call(storage_exports, __globalName) ? storage_exports[__globalName] : __hasExports ? storage_exports : __existing;
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