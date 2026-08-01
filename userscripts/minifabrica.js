/**
 * MiniFabrica Lite v2.1 Fast
 * Reactive DOM renderer for userscripts.
 *
 * Features:
 * - Compiled/cached tagged templates
 * - Fine-grained reactive parts
 * - Dynamic components: <${Component} ...></${Component}>
 * - Component lifecycle and scoped cleanup
 * - Keyed repeat reconciliation
 * - Real fixed-height virtualRepeat
 * - SVG templates
 * - Element/content/attribute directives
 * - Safe portals with owned ranges
 * - Error boundaries with reset
 * - Broto adapter, with a non-reactive fallback
 * - ShadowRoot, iframe and userscript-sandbox friendly
 *
 * @version 2.1.0
 * @license MIT
 */
(function installMiniFabricaLiteV2(global) {
  "use strict";

  const VERSION = "2.1.0";
  const HTML_NS = "http://www.w3.org/1999/xhtml";
  const SVG_NS = "http://www.w3.org/2000/svg";

  const TEMPLATE = Symbol("mini-fabrica.template");
  const COMPONENT = Symbol("mini-fabrica.component");
  const BINDING = Symbol("mini-fabrica.binding");
  const EVENT = Symbol("mini-fabrica.event");
  const DIRECTIVE = Symbol("mini-fabrica.directive");
  const NOTHING = Symbol("mini-fabrica.nothing");
  const RAW_CHILDREN = Symbol("mini-fabrica.raw-children");

  const PART_NODE = "node";
  const PART_ATTRIBUTE = "attribute";
  const PART_ELEMENT = "element";

  const TOKEN_PREFIX = "__MF2_EXPR_";
  const COMPONENT_PREFIX = "mf2-component-";
  const NODE_MARKER_PREFIX = "mf2-node:";
  const ATTRIBUTE_MARKER_PREFIX = "data-mf2-a-";

  const templateCache = new WeakMap();

  function token(index) {
    return `${TOKEN_PREFIX}${index}__`;
  }

  function tokenPattern() {
    return new RegExp(`${TOKEN_PREFIX}(\\d+)__`, "g");
  }

  function exactTokenPattern() {
    return new RegExp(`^${TOKEN_PREFIX}(\\d+)__$`);
  }

  function isTemplate(value) {
    return Boolean(value?.[TEMPLATE]);
  }

  function isComponent(value) {
    return Boolean(value?.[COMPONENT]);
  }

  function isBinding(value) {
    return Boolean(value?.[BINDING]);
  }

  function isEventDescriptor(value) {
    return Boolean(value?.[EVENT]);
  }

  function isDirective(value, kind) {
    return Boolean(value?.[DIRECTIVE] && (!kind || value.kind === kind));
  }

  function isFunctionValue(value) {
    return typeof value === "function" && !isComponent(value);
  }

  function resolve(value) {
    return isFunctionValue(value) && !isBinding(value) && !isEventDescriptor(value) && !isDirective(value)
      ? value()
      : value;
  }

  function resolveDeep(value) {
    const current = resolve(value);
    return isBinding(current) ? current.get() : current;
  }

  function html(strings, ...values) {
    return Object.freeze({
      [TEMPLATE]: true,
      namespace: HTML_NS,
      strings,
      values,
    });
  }

  function svg(strings, ...values) {
    return Object.freeze({
      [TEMPLATE]: true,
      namespace: SVG_NS,
      strings,
      values,
    });
  }

  function component(name, renderer) {
    if (typeof name === "function" && renderer === undefined) {
      renderer = name;
      name = renderer.name || "Anonymous";
    }

    if (typeof renderer !== "function") {
      throw new TypeError("component(name, renderer): renderer must be a function.");
    }

    const factory = function MiniFabricaComponent(props = {}) {
      return renderer(props, props.__mf2Context || EMPTY_COMPONENT_CONTEXT);
    };

    Object.defineProperties(factory, {
      [COMPONENT]: { value: true },
      displayName: {
        value: String(name || renderer.name || "Anonymous"),
        configurable: true,
      },
    });

    return factory;
  }

  const EMPTY_COMPONENT_CONTEXT = Object.freeze({
    html,
    svg,
    nothing: NOTHING,
    onMount() {},
    onCleanup() {},
    afterPaint() {},
    onError() {},
  });

  function bind(source, setterOrOptions, maybeOptions) {
    let get;
    let set;
    let options;

    if (typeof setterOrOptions === "function") {
      get = typeof source === "function" ? source : () => source;
      set = setterOrOptions;
      options = maybeOptions || {};
    } else {
      options = setterOrOptions || {};

      if (source && typeof source === "object" && typeof source.get === "function") {
        get = source.get.bind(source);
        set = source.set?.bind(source);
      } else if (typeof source === "function") {
        get = source;
        set = source.set?.bind(source);
      } else {
        get = () => source;
      }
    }

    if (typeof get !== "function") {
      throw new TypeError("bind(source): source must be callable or expose get().");
    }

    return Object.freeze({
      [BINDING]: true,
      get,
      set,
      event: options.event,
      commitEvent: options.commitEvent,
      parse: options.parse,
      format: options.format,
    });
  }

  function event(handler, options = {}) {
    if (typeof handler !== "function") {
      throw new TypeError("event(handler): handler must be a function.");
    }

    const normalized = {
      capture: Boolean(options.capture),
      once: Boolean(options.once),
      passive: Boolean(options.passive),
      prevent: Boolean(options.prevent),
      stop: Boolean(options.stop),
      stopImmediate: Boolean(options.stopImmediate),
      self: Boolean(options.self),
    };

    const listener = function miniFabricaEventListener(domEvent) {
      if (normalized.self && domEvent.target !== domEvent.currentTarget) return;
      if (normalized.prevent) domEvent.preventDefault();
      if (normalized.stop) domEvent.stopPropagation();
      if (normalized.stopImmediate) domEvent.stopImmediatePropagation();
      return handler.call(this, domEvent);
    };

    return Object.freeze({
      [EVENT]: true,
      handler: listener,
      options: {
        capture: normalized.capture,
        once: normalized.once,
        passive: normalized.passive,
      },
    });
  }

  event.prevent = (handler, options) => event(handler, { ...options, prevent: true });
  event.stop = (handler, options) => event(handler, { ...options, stop: true });
  event.once = (handler, options) => event(handler, { ...options, once: true });
  event.self = (handler, options) => event(handler, { ...options, self: true });

  for (const type of [
    "click", "input", "change", "submit", "keydown", "keyup",
    "pointerdown", "pointermove", "pointerup", "pointercancel",
    "focus", "blur", "scroll",
  ]) {
    event[type] = (handler, options) => event(handler, options);
  }

  function directive(kind, apply) {
    if (typeof apply !== "function") {
      throw new TypeError("directive(kind, apply): apply must be a function.");
    }

    return Object.freeze({
      [DIRECTIVE]: true,
      kind,
      apply,
    });
  }

  function nodeDirective(apply) {
    return directive(PART_NODE, apply);
  }

  function elementDirective(apply) {
    return directive(PART_ELEMENT, apply);
  }

  function attributeDirective(apply) {
    return directive(PART_ATTRIBUTE, apply);
  }

  function ref(callback) {
    return elementDirective((element, scope) => {
      scope.refs.push(() => callback(element));
    });
  }

  function classMap(value) {
    return attributeDirective((part) => {
      part.setEffect(() => {
        const classes = [];

        const visit = (entry) => {
          const current = resolveDeep(entry);
          if (!current) return;

          if (Array.isArray(current) || current instanceof Set) {
            for (const item of current) visit(item);
            return;
          }

          if (typeof current === "object") {
            for (const [name, enabled] of Object.entries(current)) {
              if (resolveDeep(enabled)) classes.push(name);
            }
            return;
          }

          classes.push(String(current));
        };

        visit(value);
        part.element.className = classes.join(" ");
      });
    });
  }

  function styleMap(value) {
    return attributeDirective((part) => {
      let previous = new Set();

      part.setEffect(() => {
        const styles = resolveDeep(value);

        if (styles == null || styles === false) {
          part.element.removeAttribute("style");
          previous.clear();
          return;
        }

        if (typeof styles === "string") {
          part.element.setAttribute("style", styles);
          previous.clear();
          return;
        }

        const next = new Set();

        for (const [rawName, rawValue] of Object.entries(styles)) {
          const name = rawName.startsWith("--") ? rawName : toKebabCase(rawName);
          const current = resolveDeep(rawValue);
          next.add(name);

          if (current == null || current === false) {
            part.element.style.removeProperty(name);
          } else {
            part.element.style.setProperty(name, String(current));
          }
        }

        for (const oldName of previous) {
          if (!next.has(oldName)) part.element.style.removeProperty(oldName);
        }

        previous = next;
      });
    });
  }

  function attrs(value) {
    return elementDirective((element, scope) => {
      let previous = new Set();

      const dispose = scope.adapter.effect(() => {
        const object = resolveDeep(value) || {};
        const next = new Set(Object.keys(object));

        for (const oldName of previous) {
          if (!next.has(oldName)) element.removeAttribute(oldName);
        }

        for (const [name, raw] of Object.entries(object)) {
          applyResolvedAttribute(element, name, resolveDeep(raw), scope);
        }

        previous = next;
      }, { name: "mini-fabrica.attrs" });

      scope.addCleanup(dispose);
    });
  }

  function unsafeHTML(value) {
    return nodeDirective((part) => {
      part.setEffect(() => {
        const holder = part.document.createElement("template");
        holder.innerHTML = String(resolveDeep(value) ?? "");
        part.replace(holder.content.cloneNode(true));
      });
    });
  }

  function text(value) {
    return nodeDirective((part) => {
      part.setEffect(() => {
        part.replace(part.document.createTextNode(String(resolveDeep(value) ?? "")));
      });
    });
  }

  function when(condition, truthy, falsy = NOTHING) {
    return () => (resolveDeep(condition) ? resolve(truthy) : resolve(falsy));
  }

  function choose(value, cases, fallback = NOTHING) {
    return () => {
      const current = resolveDeep(value);
      const selected = cases instanceof Map
        ? cases.get(current)
        : Object.prototype.hasOwnProperty.call(cases || {}, current)
          ? cases[current]
          : fallback;
      return resolve(selected);
    };
  }

  function keyed(key, children) {
    return nodeDirective((part) => {
      let previousKey = Symbol("unset");
      let childScope = null;

      part.setEffect(() => {
        const nextKey = resolveDeep(key);
        if (Object.is(previousKey, nextKey)) return;

        previousKey = nextKey;
        childScope?.dispose();
        childScope = part.scope.child("keyed");
        part.replaceValue(resolve(children), childScope);
      });

      part.scope.addCleanup(() => childScope?.dispose());
    });
  }

  function boundary({ children, fallback }) {
    return nodeDirective((part) => {
      let childScope = null;
      let failed = false;

      const renderChildren = () => {
        failed = false;
        childScope?.dispose();
        childScope = part.scope.child("boundary");
        childScope.errorHandler = renderFallback;

        try {
          part.replaceValue(resolve(children), childScope);
        } catch (error) {
          renderFallback(error);
        }
      };

      const reset = () => renderChildren();

      const renderFallback = (error) => {
        if (failed) return;
        failed = true;
        childScope?.dispose();
        childScope = part.scope.child("boundary-fallback");

        const output = typeof fallback === "function"
          ? fallback(error, reset)
          : fallback ?? NOTHING;

        part.replaceValue(output, childScope);
      };

      renderChildren();
      part.scope.addCleanup(() => childScope?.dispose());
    });
  }

  function portal(target, children) {
    return nodeDirective((part) => {
      let portalScope = null;
      let start = null;
      let end = null;
      let currentTarget = null;

      const destroyPortal = () => {
        portalScope?.dispose();
        portalScope = null;
        removeRange(start, end, true);
        start = end = currentTarget = null;
      };

      part.setEffect(() => {
        const destination = resolveDeep(target);
        if (!destination?.append) {
          destroyPortal();
          return;
        }

        if (destination !== currentTarget) {
          destroyPortal();
          currentTarget = destination;
          start = destination.ownerDocument.createComment("mf2:portal:start");
          end = destination.ownerDocument.createComment("mf2:portal:end");
          destination.append(start, end);
        }

        portalScope?.dispose();
        portalScope = part.scope.child("portal", destination.ownerDocument);
        replaceRangeValue(start, end, resolve(children), portalScope);
      });

      part.scope.addCleanup(destroyPortal);
    });
  }

  function repeat(items, key, renderer) {
    if (typeof renderer !== "function") {
      throw new TypeError("repeat(items, key, renderer): renderer must be a function.");
    }

    return nodeDirective((part) => {
      const records = new Map();

      const keyOf = typeof key === "function"
        ? key
        : typeof key === "string"
          ? (item) => item?.[key]
          : (_item, index) => index;

      part.setEffect(() => {
        const list = Array.from(resolveDeep(items) || []);
        const nextRecords = new Map();
        const ordered = [];

        for (let index = 0; index < list.length; index += 1) {
          const item = list[index];
          const recordKey = keyOf(item, index);

          if (nextRecords.has(recordKey)) {
            throw new Error(`repeat(): duplicate key ${String(recordKey)}.`);
          }

          let record = records.get(recordKey);

          if (!record) {
            record = createRepeatRecord(part, recordKey, item, index, renderer);
          } else {
            record.update(item, index);
          }

          nextRecords.set(recordKey, record);
          ordered.push(record);
        }

        for (const [recordKey, record] of records) {
          if (!nextRecords.has(recordKey)) record.dispose();
        }

        let cursor = part.end;
        for (let index = ordered.length - 1; index >= 0; index -= 1) {
          const record = ordered[index];
          moveRangeBefore(record.start, record.end, cursor);
          cursor = record.start;
        }

        records.clear();
        for (const [recordKey, record] of nextRecords) records.set(recordKey, record);
      });

      part.scope.addCleanup(() => {
        for (const record of records.values()) record.dispose();
        records.clear();
      });
    });
  }

  function createRepeatRecord(part, recordKey, value, index, renderer) {
    const scope = part.scope.child(`repeat:${String(recordKey)}`);
    const start = part.document.createComment(`mf2:repeat:${String(recordKey)}:start`);
    const end = part.document.createComment(`mf2:repeat:${String(recordKey)}:end`);
    part.end.parentNode.insertBefore(start, part.end);
    part.end.parentNode.insertBefore(end, part.end);

    const itemSignal = createLocalSignal(value, scope.adapter);
    const indexSignal = createLocalSignal(index, scope.adapter);

    const renderRecord = () => {
      const output = renderer({
        item: itemSignal,
        index: indexSignal,
        key: recordKey,
        value: itemSignal(),
      });
      replaceRangeValue(start, end, output, scope, true);
      scope.flushRefs();
      scope.mountOnce();
      scope.flushAfterPaint();
    };

    let renderDispose = null;
    if (scope.adapter.hasNativeSignals) {
      renderDispose = scope.adapter.effect(renderRecord, {
        name: `mini-fabrica.repeat:${String(recordKey)}`,
      });
      scope.addCleanup(renderDispose);
    } else {
      renderRecord();
    }

    return {
      key: recordKey,
      start,
      end,
      item: itemSignal,
      index: indexSignal,
      update(nextItem, nextIndex) {
        const itemChanged = !Object.is(itemSignal(), nextItem);
        const indexChanged = !Object.is(indexSignal(), nextIndex);
        itemSignal.set?.(nextItem);
        indexSignal.set?.(nextIndex);
        if (!scope.adapter.hasNativeSignals && (itemChanged || indexChanged)) renderRecord();
      },
      dispose() {
        scope.dispose();
        removeRange(start, end, true);
      },
    };
  }

  function virtualRepeat(items, key, renderer, options = {}) {
    const VirtualRepeat = component("VirtualRepeat", (_props, context) => {
      const scrollTop = context.signal(0);
      const height = () => Math.max(1, Number(resolveDeep(options.height)) || 420);
      const itemHeight = () => Math.max(1, Number(resolveDeep(options.itemHeight || options.estimateSize)) || 48);
      const overscan = () => Math.max(0, Number(resolveDeep(options.overscan)) || 6);
      const list = () => Array.from(resolveDeep(items) || []);

      const visible = () => {
        const source = list();
        const rowHeight = itemHeight();
        const viewport = height();
        const top = scrollTop();
        const start = Math.max(0, Math.floor(top / rowHeight) - overscan());
        const end = Math.min(source.length, Math.ceil((top + viewport) / rowHeight) + overscan());

        return source.slice(start, end).map((item, offset) => ({
          item,
          index: start + offset,
        }));
      };

      context.onCleanup(() => scrollTop.dispose?.());

      return html`<div
        class="mf2-virtual-repeat"
        data-mf-preserve-scroll
        style=${styleMap({
          height: () => `${height()}px`,
          overflow: "auto",
          minHeight: "0",
          position: "relative",
        })}
        @scroll=${event((event) => scrollTop.set(event.currentTarget.scrollTop), { passive: true })}
      >
        <div style=${styleMap({
          height: () => `${list().length * itemHeight()}px`,
          position: "relative",
        })}>
          <div style=${styleMap({
            position: "absolute",
            insetInline: "0",
            top: "0",
            transform: () => {
              const source = list();
              const rowHeight = itemHeight();
              const start = Math.max(0, Math.floor(scrollTop() / rowHeight) - overscan());
              return `translateY(${Math.min(start, source.length) * rowHeight}px)`;
            },
          })}>
            ${repeat(
              visible,
              ({ item, index }) => typeof key === "function"
                ? key(item, index)
                : typeof key === "string"
                  ? item?.[key]
                  : index,
              ({ item }) => renderer({
                item: () => item().item,
                index: () => item().index,
                key: typeof key === "function"
                  ? key(item().item, item().index)
                  : typeof key === "string"
                    ? item().item?.[key]
                    : item().index,
                value: item().item,
              }),
            )}
          </div>
        </div>
      </div>`;
    });

    return VirtualRepeat();
  }

  function compileTemplate(template) {
    let cachedByNamespace = templateCache.get(template.strings);
    if (!cachedByNamespace) {
      cachedByNamespace = new Map();
      templateCache.set(template.strings, cachedByNamespace);
    }

    const cached = cachedByNamespace.get(template.namespace);
    if (cached) return cached;

    const componentNames = new Map();
    const componentByTag = new Map();
    const values = template.values;
    let componentIndex = 0;
    let source = "";

    for (let index = 0; index < template.strings.length; index += 1) {
      const stringPart = template.strings[index];
      source += stringPart;

      if (index >= values.length) continue;
      const value = values[index];
      const tagPosition = detectTagPosition(stringPart);

      if (tagPosition && isComponent(value)) {
        let tag = componentNames.get(value);
        if (!tag) {
          tag = `${COMPONENT_PREFIX}${componentIndex++}`;
          componentNames.set(value, tag);
          componentByTag.set(tag.toUpperCase(), value);
        }
        source += tag;
      } else {
        source += token(index);
      }
    }

    source = normalizeSelfClosingComponents(source);

    const documentRef = global.document;
    const holder = documentRef.createElement("template");

    if (template.namespace === SVG_NS) {
      holder.innerHTML = `<svg xmlns="${SVG_NS}">${source}</svg>`;
    } else {
      holder.innerHTML = source;
    }

    const content = template.namespace === SVG_NS
      ? extractSvgContent(holder, documentRef)
      : holder.content;

    const descriptors = annotateTemplate(content);

    const compiled = {
      namespace: template.namespace,
      content: content.cloneNode(true),
      descriptors,
      componentByTag,
    };

    cachedByNamespace.set(template.namespace, compiled);
    return compiled;
  }

  function detectTagPosition(stringPart) {
    return /<\/?\s*$/.test(stringPart);
  }

  function normalizeSelfClosingComponents(source) {
    return source.replace(
      new RegExp(`<(${COMPONENT_PREFIX}\\d+)([^<>]*?)\\s*\\/>`, "gi"),
      "<$1$2></$1>",
    );
  }

  function extractSvgContent(holder, documentRef) {
    const fragment = documentRef.createDocumentFragment();
    const wrapper = holder.content.firstElementChild;
    while (wrapper?.firstChild) fragment.append(wrapper.firstChild);
    return fragment;
  }

  function annotateTemplate(content) {
    const descriptors = [];
    const documentRef = content.ownerDocument;
    const NodeFilterCtor = documentRef.defaultView?.NodeFilter || global.NodeFilter;
    const walker = documentRef.createTreeWalker(
      content,
      NodeFilterCtor.SHOW_ELEMENT | NodeFilterCtor.SHOW_TEXT,
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      if (node.nodeType === 3) {
        annotateTextNode(node, descriptors);
      } else if (node.nodeType === 1) {
        annotateElement(node, descriptors);
      }
    }

    return descriptors;
  }

  function annotateTextNode(node, descriptors) {
    const source = node.nodeValue || "";
    const matches = Array.from(source.matchAll(tokenPattern()));
    if (!matches.length) return;

    const fragment = node.ownerDocument.createDocumentFragment();
    let cursor = 0;

    for (const match of matches) {
      if (match.index > cursor) {
        fragment.append(node.ownerDocument.createTextNode(source.slice(cursor, match.index)));
      }

      const markerId = descriptors.length;
      const marker = node.ownerDocument.createComment(`${NODE_MARKER_PREFIX}${markerId}`);
      fragment.append(marker);
      descriptors.push({ type: "node", markerId, expression: Number(match[1]) });
      cursor = match.index + match[0].length;
    }

    if (cursor < source.length) {
      fragment.append(node.ownerDocument.createTextNode(source.slice(cursor)));
    }

    node.replaceWith(fragment);
  }

  function annotateElement(element, descriptors) {
    for (const attribute of Array.from(element.attributes)) {
      const matches = Array.from(attribute.value.matchAll(tokenPattern()));
      if (!matches.length) continue;

      const markerId = descriptors.length;
      element.setAttribute(`${ATTRIBUTE_MARKER_PREFIX}${markerId}`, "");
      descriptors.push({
        type: "attribute",
        markerId,
        name: attribute.name,
        raw: attribute.value,
        expressions: matches.map((match) => Number(match[1])),
      });
      element.removeAttribute(attribute.name);
    }
  }

  function instantiateTemplate(template, scope) {
    const compiled = compileTemplate(template);
    const fragment = compiled.content.cloneNode(true);
    const nodeMarkers = new Map();
    const attributeMarkers = new Map();
    const documentRef = scope.document;
    const NodeFilterCtor = documentRef.defaultView?.NodeFilter || global.NodeFilter;
    const walker = documentRef.createTreeWalker(
      fragment,
      NodeFilterCtor.SHOW_ELEMENT | NodeFilterCtor.SHOW_COMMENT,
    );

    while (walker.nextNode()) {
      const node = walker.currentNode;

      if (node.nodeType === 8 && node.nodeValue?.startsWith(NODE_MARKER_PREFIX)) {
        nodeMarkers.set(Number(node.nodeValue.slice(NODE_MARKER_PREFIX.length)), node);
      }

      if (node.nodeType === 1) {
        for (const attribute of Array.from(node.attributes)) {
          if (!attribute.name.startsWith(ATTRIBUTE_MARKER_PREFIX)) continue;
          const markerId = Number(attribute.name.slice(ATTRIBUTE_MARKER_PREFIX.length));
          attributeMarkers.set(markerId, node);
          node.removeAttribute(attribute.name);
        }
      }
    }

    materializeComponentPlaceholders(fragment, compiled.componentByTag, template, scope);

    for (const descriptor of compiled.descriptors) {
      if (descriptor.type === "node") {
        const marker = nodeMarkers.get(descriptor.markerId);
        if (!marker?.parentNode) continue;

        const end = documentRef.createComment(`mf2-node-end:${descriptor.markerId}`);
        marker.after(end);
        const part = new NodePart(marker, end, scope);
        part.setValue(template.values[descriptor.expression]);
      } else {
        const element = attributeMarkers.get(descriptor.markerId);
        if (!element?.isConnected && !fragment.contains(element)) continue;
        const part = new AttributePart(element, descriptor, template, scope);
        part.mount();
      }
    }

    return fragment;
  }

  function materializeComponentPlaceholders(root, componentByTag, template, scope) {
    if (!componentByTag.size) return;

    const elements = [];
    const documentRef = scope.document;
    const NodeFilterCtor = documentRef.defaultView?.NodeFilter || global.NodeFilter;
    const walker = documentRef.createTreeWalker(root, NodeFilterCtor.SHOW_ELEMENT);
    while (walker.nextNode()) {
      if (componentByTag.has(walker.currentNode.tagName)) elements.push(walker.currentNode);
    }

    for (let index = 0; index < elements.length; index += 1) {
      const element = elements[index];
      if (!element.parentNode) continue;
      const factory = componentByTag.get(element.tagName);
      materializeComponent(element, factory, template, scope);
    }
  }

  function materializeComponent(element, factory, template, parentScope) {
    const componentScope = parentScope.child(`component:${factory.displayName || "Anonymous"}`);
    const props = parseComponentProps(element, template, componentScope);
    const start = element.ownerDocument.createComment(`mf2:${factory.displayName || "component"}:start`);
    const end = element.ownerDocument.createComment(`mf2:${factory.displayName || "component"}:end`);
    element.replaceWith(start, end);

    const context = createComponentContext(componentScope);
    props.__mf2Context = context;

    try {
      // Components are instantiated once. Fine-grained expressions and directives
      // inside their returned template own subsequent reactive updates. This keeps
      // children, refs and third-party DOM stable instead of remounting the shell.
      const output = componentScope.adapter.untrack(() => factory(props));
      replaceRangeValue(start, end, output, componentScope, true);
      componentScope.flushRefs();
      componentScope.mountOnce();
      componentScope.flushAfterPaint();
    } catch (error) {
      componentScope.handleError(error);
    }
  }

  function parseComponentProps(element, template, scope) {
    const props = {};

    for (const attribute of Array.from(element.attributes)) {
      const rawName = attribute.name;
      const name = rawName.startsWith(".") || rawName.startsWith("?")
        ? rawName.slice(1)
        : rawName;
      const propertyName = toCamelCase(name);
      const exact = attribute.value.match(exactTokenPattern());

      if (exact) {
        const rawValue = template.values[Number(exact[1])];
        props[propertyName] = rawName.startsWith("?")
          ? Boolean(resolveDeep(rawValue))
          : rawValue;
      } else if (tokenPattern().test(attribute.value)) {
        props[propertyName] = interpolate(attribute.value, template.values);
      } else {
        props[propertyName] = attribute.value === "" ? true : attribute.value;
      }
    }

    const childFragment = element.ownerDocument.createDocumentFragment();
    while (element.firstChild) childFragment.append(element.firstChild);
    props.children = childFragment.childNodes.length
      ? Object.freeze({ [RAW_CHILDREN]: true, fragment: childFragment })
      : NOTHING;

    return props;
  }

  function createComponentContext(scope) {
    return Object.freeze({
      html,
      svg,
      nothing: NOTHING,
      onMount(callback) {
        if (typeof callback === "function") scope.mounts.push(callback);
      },
      onCleanup(callback) {
        if (typeof callback === "function") scope.addCleanup(callback);
      },
      afterPaint(callback) {
        if (typeof callback === "function") scope.afterPaint.push(callback);
      },
      onError(callback) {
        if (typeof callback === "function") scope.errorHandler = callback;
      },
      signal(initialValue) {
        return scope.adapter.createSignal(initialValue);
      },
      batch(callback) {
        return scope.adapter.batch(callback);
      },
      untrack(callback) {
        return scope.adapter.untrack(callback);
      },
    });
  }

  class AttributePart {
    constructor(element, descriptor, template, scope) {
      this.element = element;
      this.descriptor = descriptor;
      this.template = template;
      this.scope = scope;
      this.dispose = null;
      this.listenerCleanup = null;
    }

    mount() {
      const { name, raw, expressions } = this.descriptor;

      if (expressions.length === 1 && raw === token(expressions[0])) {
        this.mountExact(name, this.template.values[expressions[0]]);
        return;
      }

      const reactive = expressions.some((index) => {
        const value = this.template.values[index];
        return isFunctionValue(value) || isBinding(value);
      });

      const update = () => this.element.setAttribute(name, interpolate(raw, this.template.values));
      if (reactive) this.setEffect(update);
      else update();
    }

    mountExact(name, rawValue) {
      if (name === "ref") {
        const value = resolve(rawValue);
        if (isDirective(value, PART_ELEMENT)) value.apply(this.element, this.scope);
        else if (typeof value === "function") this.scope.refs.push(() => value(this.element));
        return;
      }

      if (name === "...") {
        attrs(rawValue).apply(this.element, this.scope);
        return;
      }

      if (name.startsWith("@")) {
        this.mountEvent(name.slice(1), rawValue);
        return;
      }

      if (name.startsWith(".")) {
        this.mountProperty(name.slice(1), rawValue);
        return;
      }

      if (name.startsWith("?")) {
        const attributeName = name.slice(1);
        this.setEffect(() => {
          if (Boolean(resolveDeep(rawValue))) this.element.setAttribute(attributeName, "");
          else this.element.removeAttribute(attributeName);
        });
        return;
      }

      const value = isFunctionValue(rawValue) ? rawValue : resolve(rawValue);

      if (isDirective(value, PART_ATTRIBUTE)) {
        value.apply(this, this.scope);
        return;
      }

      if (isDirective(value, PART_ELEMENT)) {
        value.apply(this.element, this.scope);
        return;
      }

      if (isFunctionValue(rawValue) || isBinding(rawValue)) {
        this.setEffect(() => setNormalAttribute(this.element, name, resolveDeep(rawValue)));
      } else {
        setNormalAttribute(this.element, name, value);
      }
    }

    mountEvent(type, rawValue) {
      // Keep a single stable DOM listener. Dynamic descriptors are resolved only
      // when the event fires, avoiding effect churn and remove/add cycles.
      const listener = (domEvent) => {
        const current = isEventDescriptor(rawValue)
          ? rawValue
          : typeof rawValue === "function"
            ? rawValue
            : resolve(rawValue);

        if (!current) return;
        if (isEventDescriptor(current)) return current.handler.call(this.element, domEvent);
        return current.call?.(this.element, domEvent);
      };

      const initial = isEventDescriptor(rawValue) ? rawValue : null;
      this.listenerCleanup = addDOMListener(
        this.element,
        type,
        listener,
        initial?.options || {},
        this.scope,
      );
      this.scope.addCleanup(this.listenerCleanup);
    }

    mountProperty(property, rawValue) {
      const binding = isBinding(rawValue) ? rawValue : null;

      const updateProperty = () => {
        const current = binding
          ? binding.format
            ? binding.format(binding.get())
            : binding.get()
          : resolveDeep(rawValue);

        try {
          const normalized = current ?? (BOOLEAN_PROPERTIES.has(property) ? false : "");
          if (!Object.is(this.element[property], normalized)) this.element[property] = normalized;
        } catch (error) {
          this.scope.warn(`Failed to assign .${property}`, error);
        }
      };

      if (binding || isFunctionValue(rawValue)) this.setEffect(updateProperty);
      else updateProperty();

      if (!binding?.set) return;

      const eventName = binding.event || inferBindingEvent(this.element, property);
      const commitEvent = binding.commitEvent;
      const update = () => {
        let next = readBoundProperty(this.element, property);
        if (binding.parse) next = binding.parse(next, this.element);
        binding.set(next);
      };

      this.scope.addCleanup(addDOMListener(this.element, eventName, update, {}, this.scope));
      if (commitEvent && commitEvent !== eventName) {
        this.scope.addCleanup(addDOMListener(this.element, commitEvent, update, {}, this.scope));
      }
    }

    setEffect(callback) {
      this.dispose?.();
      this.dispose = this.scope.adapter.effect(() => {
        try {
          callback();
        } catch (error) {
          this.scope.handleError(error);
        }
      }, { name: `mini-fabrica.attribute:${this.descriptor.name}` });
      this.scope.addCleanup(this.dispose);
    }
  }

  class NodePart {
    constructor(start, end, scope) {
      this.start = start;
      this.end = end;
      this.scope = scope;
      this.document = start.ownerDocument;
      this.valueScope = null;
      this.effectDispose = null;
    }

    setValue(rawValue) {
      // Do not eagerly call reactive getters here. Doing so leaks their
      // dependencies into whichever parent effect is currently mounting us.
      if (isFunctionValue(rawValue)) {
        this.setEffect(() => this.replaceValue(resolve(rawValue)));
        return;
      }

      const resolved = resolve(rawValue);
      if (isDirective(resolved, PART_NODE)) {
        resolved.apply(this, this.scope);
        return;
      }

      this.replaceValue(resolved);
    }

    setEffect(callback) {
      this.effectDispose?.();
      this.effectDispose = this.scope.adapter.effect(() => {
        try {
          callback();
        } catch (error) {
          this.scope.handleError(error);
        }
      }, { name: "mini-fabrica.node" });
      this.scope.addCleanup(this.effectDispose);
    }

    replace(value) {
      this.valueScope?.dispose();
      this.valueScope = this.scope.child("node-value");
      replaceRange(this.start, this.end, value);
    }

    replaceValue(value, explicitScope) {
      this.valueScope?.dispose();
      this.valueScope = explicitScope || this.scope.child("node-value");
      replaceRangeValue(this.start, this.end, value, this.valueScope);
    }
  }

  class Scope {
    constructor(adapter, documentRef, name = "scope", parent = null) {
      this.adapter = adapter;
      this.document = documentRef;
      this.name = name;
      this.parent = parent;
      this.cleanups = [];
      this.refs = [];
      this.mounts = [];
      this.afterPaint = [];
      this.mounted = false;
      this.disposed = false;
      this.errorHandler = null;
    }

    child(name, documentRef = this.document) {
      return new Scope(this.adapter, documentRef, name, this);
    }

    addCleanup(callback) {
      if (typeof callback === "function") this.cleanups.push(callback);
      return callback;
    }

    flushRefs() {
      for (const callback of this.refs.splice(0)) {
        try { callback(); } catch (error) { this.handleError(error); }
      }
    }

    mountOnce() {
      if (this.mounted) return;
      this.mounted = true;

      for (const callback of this.mounts.splice(0)) {
        try {
          const cleanup = callback();
          if (typeof cleanup === "function") this.addCleanup(cleanup);
        } catch (error) {
          this.handleError(error);
        }
      }
    }

    flushAfterPaint() {
      const callbacks = this.afterPaint.splice(0);
      if (!callbacks.length) return;

      queueMicrotask(() => {
        if (this.disposed) return;
        for (const callback of callbacks) {
          try { callback(); } catch (error) { this.handleError(error); }
        }
      });
    }

    warn(message, error) {
      console.warn(`[MiniFabrica:${this.name}] ${message}`, error);
    }

    handleError(error) {
      if (typeof this.errorHandler === "function") {
        this.errorHandler(error);
        return;
      }

      if (this.parent) {
        this.parent.handleError(error);
        return;
      }

      console.error("[MiniFabrica] uncaught render error", error);
    }

    dispose() {
      if (this.disposed) return;
      this.disposed = true;

      for (let index = this.cleanups.length - 1; index >= 0; index -= 1) {
        try { this.cleanups[index]?.(); } catch (error) { this.warn("Cleanup failed", error); }
      }

      this.cleanups.length = 0;
      this.refs.length = 0;
      this.mounts.length = 0;
      this.afterPaint.length = 0;
    }
  }

  function createAdapter(Broto) {
    if (Broto && typeof Broto.effect === "function") {
      return {
        hasNativeSignals: typeof Broto.signal === "function",
        createSignal(initialValue) {
          return typeof Broto.signal === "function"
            ? Broto.signal(initialValue)
            : createStandaloneSignal(initialValue);
        },
        effect(callback, options) {
          return Broto.effect(callback, options) || (() => {});
        },
        batch(callback) {
          return typeof Broto.batch === "function" ? Broto.batch(callback) : callback();
        },
        untrack(callback) {
          return typeof Broto.untrack === "function" ? Broto.untrack(callback) : callback();
        },
      };
    }

    return {
      hasNativeSignals: false,
      createSignal(initialValue) { return createStandaloneSignal(initialValue); },
      effect(callback) {
        callback();
        return () => {};
      },
      batch(callback) { return callback(); },
      untrack(callback) { return callback(); },
    };
  }

  function createLocalSignal(initialValue, adapter) {
    return typeof adapter.createSignal === "function"
      ? adapter.createSignal(initialValue)
      : createStandaloneSignal(initialValue);
  }

  function createStandaloneSignal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();

    const signal = () => value;
    signal.peek = () => value;
    signal.set = (next) => {
      const resolved = typeof next === "function" ? next(value) : next;
      if (Object.is(value, resolved)) return value;
      value = resolved;
      for (const subscriber of subscribers) subscriber(value);
      return value;
    };
    signal.subscribe = (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    };
    signal.dispose = () => subscribers.clear();
    return signal;
  }

  function render(root, tree, Broto, options = {}) {
    if (!root?.replaceChildren) {
      throw new TypeError("render(root, tree): root must be an Element or ShadowRoot.");
    }

    const documentRef = root.ownerDocument || global.document;
    const adapter = createAdapter(Broto);
    const scope = new Scope(adapter, documentRef, options.name || "root");
    const start = documentRef.createComment("mf2:root:start");
    const end = documentRef.createComment("mf2:root:end");
    root.replaceChildren(start, end);

    scope.errorHandler = (error) => {
      options.onError?.(error);
      if (!options.onError) console.error("[MiniFabrica] render failed", error);

      const fallback = typeof options.fallback === "function"
        ? options.fallback(error)
        : options.fallback ?? `Render failed: ${error?.message || String(error)}`;

      replaceRangeValue(start, end, fallback, scope.child("root-fallback"));
    };

    try {
      // The root is mounted once. Only explicit reactive NodeParts and
      // AttributeParts subscribe to state, preventing full-tree remounts.
      adapter.untrack(() => {
        const rootPart = new NodePart(start, end, scope);
        rootPart.setValue(tree);
      });
      scope.flushRefs();
      scope.mountOnce();
      scope.flushAfterPaint();
      options.afterPaint?.(root);
    } catch (error) {
      scope.handleError(error);
    }

    return () => {
      scope.dispose();
      if (options.clearOnDispose !== false) root.replaceChildren();
    };
  }

  function createRoot(root, Broto, options = {}) {
    let dispose = null;

    return Object.freeze({
      render(tree) {
        dispose?.();
        dispose = render(root, tree, Broto, { ...options, clearOnDispose: false });
        return this;
      },
      dispose() {
        dispose?.();
        dispose = null;
        if (options.clearOnDispose !== false) root.replaceChildren();
      },
      get element() {
        return root;
      },
    });
  }

  function replaceRangeValue(start, end, value, scope, preserveAnchors = false) {
    clearBetween(start, end);
    const fragment = start.ownerDocument.createDocumentFragment();
    appendValue(fragment, value, scope);
    end.parentNode.insertBefore(fragment, end);

    if (!preserveAnchors) {
      scope.flushRefs();
      scope.mountOnce();
      scope.flushAfterPaint();
    }
  }

  function appendValue(parent, rawValue, scope) {
    const value = resolve(rawValue);

    if (value == null || value === false || value === true || value === NOTHING) return;

    if (isBinding(value)) {
      appendValue(parent, value.get(), scope);
      return;
    }

    if (value?.[RAW_CHILDREN]) {
      parent.append(value.fragment);
      return;
    }

    if (Array.isArray(value) || value instanceof Set) {
      for (const item of value) appendValue(parent, item, scope);
      return;
    }

    if (
      value &&
      typeof value !== "string" &&
      typeof value[Symbol.iterator] === "function" &&
      !isNode(value, scope.document)
    ) {
      for (const item of value) appendValue(parent, item, scope);
      return;
    }

    if (isTemplate(value)) {
      parent.append(instantiateTemplate(value, scope));
      return;
    }

    if (isDirective(value, PART_NODE)) {
      const start = scope.document.createComment("mf2:directive:start");
      const end = scope.document.createComment("mf2:directive:end");
      parent.append(start, end);
      value.apply(new NodePart(start, end, scope), scope);
      return;
    }

    if (isNode(value, scope.document)) {
      parent.append(value);
      return;
    }

    parent.append(scope.document.createTextNode(String(value)));
  }

  function replaceRange(start, end, value) {
    clearBetween(start, end);
    if (!value) return;
    end.parentNode.insertBefore(value, end);
  }

  function clearBetween(start, end) {
    let node = start.nextSibling;
    while (node && node !== end) {
      const next = node.nextSibling;
      node.remove();
      node = next;
    }
  }

  function removeRange(start, end, includeAnchors = false) {
    if (!start || !end) return;
    let node = includeAnchors ? start : start.nextSibling;
    const stop = includeAnchors ? end.nextSibling : end;
    while (node && node !== stop) {
      const next = node.nextSibling;
      node.remove();
      node = next;
    }
  }

  function moveRangeBefore(start, end, reference) {
    if (!start?.parentNode || !end?.parentNode || !reference?.parentNode) return;
    if (end.nextSibling === reference) return;
    const fragment = start.ownerDocument.createDocumentFragment();
    let node = start;
    const stop = end.nextSibling;
    while (node && node !== stop) {
      const next = node.nextSibling;
      fragment.append(node);
      node = next;
    }
    reference.parentNode.insertBefore(fragment, reference);
  }

  function interpolate(raw, values) {
    return raw.replace(tokenPattern(), (_match, index) => {
      const value = resolveDeep(values[Number(index)]);
      return value == null || value === false ? "" : String(value);
    });
  }

  function applyResolvedAttribute(element, name, value, scope) {
    if (name.startsWith("@")) {
      const descriptor = isEventDescriptor(value) ? value : event(value);
      scope.addCleanup(addDOMListener(element, name.slice(1), descriptor.handler, descriptor.options, scope));
      return;
    }

    if (name.startsWith(".")) {
      try { element[name.slice(1)] = value; } catch (error) { scope.warn(`Failed to assign ${name}`, error); }
      return;
    }

    if (name.startsWith("?")) {
      const attribute = name.slice(1);
      if (Boolean(value)) element.setAttribute(attribute, "");
      else element.removeAttribute(attribute);
      return;
    }

    setNormalAttribute(element, name, value);
  }

  function setNormalAttribute(element, name, value) {
    if (name === "className") name = "class";

    if (value == null || value === false) {
      element.removeAttribute(name);
      return;
    }

    if (value === true) {
      element.setAttribute(name, "");
      return;
    }

    if (URL_ATTRIBUTES.has(name.toLowerCase())) {
      const sanitized = sanitizeURL(value);
      if (sanitized == null) {
        element.removeAttribute(name);
        return;
      }
      value = sanitized;
    }

    element.setAttribute(name, String(value));
  }

  function sanitizeURL(value) {
    const raw = String(value).trim();
    if (/^(?:javascript|vbscript):/i.test(raw)) return null;
    if (/^data:/i.test(raw) && !/^data:image\/(?:png|gif|jpe?g|webp|svg\+xml);/i.test(raw)) return null;
    return raw;
  }

  function addDOMListener(element, type, handler, options, scope) {
    const view = element.ownerDocument?.defaultView || global;
    const AbortControllerCtor = view.AbortController || global.AbortController;

    if (AbortControllerCtor) {
      try {
        const controller = new AbortControllerCtor();
        element.addEventListener(type, handler, { ...options, signal: controller.signal });
        return () => controller.abort();
      } catch {
        // Old Safari can expose AbortController but reject signal in addEventListener.
      }
    }

    element.addEventListener(type, handler, options);
    return () => element.removeEventListener(type, handler, options);
  }

  function inferBindingEvent(element, property) {
    if (property === "checked" || property === "selectedIndex") return "change";
    if (element.matches?.("select,input[type=checkbox],input[type=radio],input[type=file]")) return "change";
    return "input";
  }

  function readBoundProperty(element, property) {
    const view = element.ownerDocument?.defaultView || global;
    const InputCtor = view.HTMLInputElement;
    const SelectCtor = view.HTMLSelectElement;

    if (property === "checked") return Boolean(element.checked);

    if (InputCtor && element instanceof InputCtor) {
      if (element.type === "number" || element.type === "range") {
        return element.value === "" ? "" : Number(element.value);
      }
      if (element.type === "file") return element.files;
    }

    if (SelectCtor && element instanceof SelectCtor && element.multiple) {
      return Array.from(element.selectedOptions, (option) => option.value);
    }

    return element[property];
  }

  function isNode(value, documentRef) {
    const NodeCtor = documentRef?.defaultView?.Node || global.Node;
    return Boolean(NodeCtor && value instanceof NodeCtor);
  }

  function toCamelCase(value) {
    return String(value).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
  }

  function toKebabCase(value) {
    return String(value)
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/_/g, "-")
      .toLowerCase();
  }

  const BOOLEAN_PROPERTIES = new Set(["checked", "disabled", "hidden", "multiple", "open", "readOnly", "required", "selected"]);
  const URL_ATTRIBUTES = new Set(["href", "src", "action", "formaction", "poster", "xlink:href"]);

  const api = Object.freeze({
    version: VERSION,

    html,
    svg,
    component,
    render,
    createRoot,

    bind,
    event,
    directive,
    nodeDirective,
    elementDirective,
    attributeDirective,
    ref,
    attrs,
    classMap,
    styleMap,
    unsafeHTML,
    text,

    repeat,
    virtualRepeat,
    when,
    choose,
    keyed,
    boundary,
    portal,

    sanitizeURL,
    nothing: NOTHING,
  });

  Object.defineProperty(global, "MiniFabrica", {
    value: api,
    configurable: true,
    enumerable: false,
    writable: false,
  });
})(typeof globalThis !== "undefined" ? globalThis : window);

/*
USAGE
=====

const {
  html,
  component,
  render,
  bind,
  event,
  repeat,
  virtualRepeat,
  when,
  boundary,
  portal,
  classMap,
  styleMap,
} = MiniFabrica;

const state = Broto.store({
  query: "",
  open: true,
  items: [
    { id: 1, label: "One" },
    { id: 2, label: "Two" },
  ],
});

const Button = component("Button", ({ children, kind = "default", onClick }, { onMount }) => {
  onMount(() => {
    console.log("mounted");
    return () => console.log("unmounted");
  });

  return html`
    <button
      class=${classMap(["button", { "button--primary": kind === "primary" }])}
      @click=${event(onClick)}
    >
      ${children}
    </button>
  `;
});

const App = component("App", () => html`
  <section style=${styleMap({ padding: "16px" })}>
    <input
      .value=${bind(
        () => state.query,
        (value) => { state.query = value; },
      )}
      placeholder="Search"
    />

    <${Button}
      kind="primary"
      .onClick=${() => { state.open = !state.open; }}
    >
      Toggle
    </${Button}>

    ${when(
      () => state.open,
      () => html`
        <ul>
          ${repeat(
            () => state.items,
            "id",
            ({ item, index }) => html`
              <li>${index}. ${() => item().label}</li>
            `,
          )}
        </ul>
      `,
    )}

    ${boundary({
      children: () => riskyView(),
      fallback: (error, reset) => html`
        <button @click=${reset}>Retry: ${error.message}</button>
      `,
    })}

    ${portal(
      () => document.body,
      () => html`<div class="toast">Portal content</div>`,
    )}
  </section>
`);

const dispose = render(document.querySelector("#app"), App(), Broto, {
  name: "my-userscript",
  fallback: (error) => html`<pre>${error.stack}</pre>`,
});
*/
