/**
 * MiniFabrica Lite
 * A tiny reactive DOM renderer for userscripts.
 *
 * Designed for:
 * - Tampermonkey / Violentmonkey / Userscripts for Safari
 * - ShadowRoot or regular Element roots
 * - Broto-compatible signals/effects
 * - Tagged-template rendering
 * - Dynamic components with <${Component} ...></${Component}>
 *
 * @version 1.0.0
 * @license MIT
 */
(function installMiniFabricaLite(global) {
  "use strict";

  const VERSION = "1.0.0";

  const TEMPLATE = Symbol("mini-fabrica.template");
  const COMPONENT = Symbol("mini-fabrica.component");
  const BINDING = Symbol("mini-fabrica.binding");
  const EVENT = Symbol("mini-fabrica.event");
  const DIRECTIVE = Symbol("mini-fabrica.directive");
  const NOTHING = Symbol("mini-fabrica.nothing");

  const TOKEN_PREFIX = "__MF_EXPR_";
  const TOKEN_RE_SOURCE = `${TOKEN_PREFIX}(\\d+)__`;
  const COMPONENT_TAG_PREFIX = "mf-component-";

  const isObjectLike = (value) =>
    value !== null && (typeof value === "object" || typeof value === "function");

  const isTemplate = (value) => Boolean(value?.[TEMPLATE]);
  const isComponent = (value) => Boolean(value?.[COMPONENT]);
  const isBinding = (value) => Boolean(value?.[BINDING]);
  const isEvent = (value) => Boolean(value?.[EVENT]);
  const isDirective = (value) => Boolean(value?.[DIRECTIVE]);

  const token = (index) => `${TOKEN_PREFIX}${index}__`;
  const tokenPattern = () => new RegExp(TOKEN_RE_SOURCE, "g");
  const exactTokenPattern = () => new RegExp(`^${TOKEN_RE_SOURCE}$`);

  function resolve(value) {
    return typeof value === "function" &&
      !isComponent(value) &&
      !isBinding(value) &&
      !isEvent(value) &&
      !isDirective(value)
      ? value()
      : value;
  }

  function resolveDeep(value) {
    const resolved = resolve(value);
    return isBinding(resolved) ? resolved.signal() : resolved;
  }

  function html(strings, ...values) {
    return Object.freeze({
      [TEMPLATE]: true,
      strings,
      values,
    });
  }

  const svg = html;

  function component(name, renderer) {
    if (typeof name === "function" && renderer === undefined) {
      renderer = name;
      name = renderer.name || "Anonymous";
    }

    if (typeof renderer !== "function") {
      throw new TypeError("component(name, renderer): renderer must be a function.");
    }

    const factory = function MiniFabricaComponent(props = {}) {
      return renderer(props, createComponentContext(props));
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

  function createComponentContext(props) {
    const lifecycle = props?.__mfLifecycle;

    return Object.freeze({
      html,
      svg,
      nothing: NOTHING,

      onMount(callback) {
        if (typeof callback === "function") lifecycle?.mounts.push(callback);
      },

      onCleanup(callback) {
        if (typeof callback === "function") lifecycle?.cleanups.push(callback);
      },

      queueAfterPaint(callback) {
        if (typeof callback === "function") lifecycle?.afterPaint.push(callback);
      },
    });
  }

  function bind(signal, options = {}) {
    if (typeof signal !== "function") {
      throw new TypeError("bind(signal): signal must be callable.");
    }

    return Object.freeze({
      [BINDING]: true,
      signal,
      event: options.event,
      parse: options.parse,
      format: options.format,
    });
  }

  function event(handler, options = undefined) {
    if (typeof handler !== "function") {
      throw new TypeError("event(handler): handler must be a function.");
    }

    return Object.freeze({
      [EVENT]: true,
      handler,
      options,
    });
  }

  for (const type of [
    "click",
    "input",
    "change",
    "submit",
    "keydown",
    "keyup",
    "pointerdown",
    "pointermove",
    "pointerup",
    "pointercancel",
    "focus",
    "blur",
    "scroll",
  ]) {
    event[type] = (handler, options) => event(handler, options);
  }

  function directive(apply) {
    if (typeof apply !== "function") {
      throw new TypeError("directive(apply): apply must be a function.");
    }

    return Object.freeze({
      [DIRECTIVE]: true,
      apply,
    });
  }

  function ref(callback) {
    return directive((element, context) => {
      context.refs.push(() => callback(element));
    });
  }

  function classMap(value) {
    return directive((element) => {
      const resolved = resolveDeep(value);
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

      visit(resolved);
      element.className = classes.join(" ");
    });
  }

  function styleMap(value) {
    return directive((element) => {
      const styles = resolveDeep(value);

      if (styles == null || styles === false) {
        element.removeAttribute("style");
        return;
      }

      if (typeof styles === "string") {
        element.setAttribute("style", styles);
        return;
      }

      for (const [property, raw] of Object.entries(styles)) {
        const current = resolveDeep(raw);

        if (current == null || current === false) {
          element.style.removeProperty(toKebabCase(property));
          continue;
        }

        if (property.startsWith("--")) {
          element.style.setProperty(property, String(current));
        } else {
          try {
            element.style[property] = String(current);
          } catch {
            element.style.setProperty(toKebabCase(property), String(current));
          }
        }
      }
    });
  }

  function attrs(value) {
    return directive((element) => {
      const attributes = resolveDeep(value) || {};

      for (const [name, raw] of Object.entries(attributes)) {
        setNormalAttribute(element, name, resolveDeep(raw));
      }
    });
  }

  function unsafeHTML(value) {
    return directive((element) => {
      element.innerHTML = String(resolveDeep(value) ?? "");
    });
  }

  function asSignal(value) {
    let current = value;

    const signal = () => current;
    signal.peek = () => current;
    signal.set = (next) => {
      current = typeof next === "function" ? next(current) : next;
      return current;
    };
    signal.update = signal.set;

    return signal;
  }

  function repeat(items, key, renderer) {
    if (typeof renderer !== "function") {
      throw new TypeError("repeat(items, key, renderer): renderer must be a function.");
    }

    return () => {
      const list = Array.from(resolveDeep(items) || []);
      const getKey =
        typeof key === "function"
          ? key
          : typeof key === "string"
            ? (item) => item?.[key]
            : (_item, index) => index;

      return list.map((item, index) => {
        const itemSignal = asSignal(item);
        const indexSignal = asSignal(index);
        const rendered = renderer({
          item: itemSignal,
          index: indexSignal,
          key: getKey(item, index),
          value: item,
        });

        return html`<mf-repeat-item style="display:contents" data-mf-key=${String(getKey(item, index))}>
          ${rendered}
        </mf-repeat-item>`;
      });
    };
  }

  function virtualRepeat(items, key, renderer, options = {}) {
    const height = () => Math.max(1, Number(resolveDeep(options.height)) || 420);
    const itemHeight = () => Math.max(1, Number(resolveDeep(options.itemHeight)) || 48);
    const overscan = () => Math.max(0, Number(resolveDeep(options.overscan)) || 6);

    return component("VirtualRepeat", (_props, { onMount }) => {
      const list = Array.from(resolveDeep(items) || []);
      const viewportHeight = height();
      const rowHeight = itemHeight();
      const initialCount = Math.min(
        list.length,
        Math.ceil(viewportHeight / rowHeight) + overscan() * 2,
      );

      onMount(() => {
        // The lightweight renderer intentionally does not mutate the tree while
        // scrolling. Consumers can wire scrollTop into a Broto signal when true
        // windowing is required.
      });

      return html`<div
        class="mf-virtual-repeat"
        style=${styleMap({
          height: `${viewportHeight}px`,
          overflow: "auto",
          minHeight: "0",
        })}
      >
        ${repeat(list.slice(0, initialCount), key, renderer)}
      </div>`;
    })();
  }

  function when(condition, truthy, falsy = NOTHING) {
    return () => (resolveDeep(condition) ? resolve(truthy) : resolve(falsy));
  }

  function choose(value, cases, fallback = NOTHING) {
    return () => {
      const current = resolveDeep(value);
      const selected =
        cases instanceof Map
          ? cases.get(current)
          : Object.prototype.hasOwnProperty.call(cases || {}, current)
            ? cases[current]
            : fallback;

      return resolve(selected);
    };
  }

  function boundary({ children, fallback }) {
    return () => {
      try {
        return resolve(children);
      } catch (error) {
        return typeof fallback === "function"
          ? fallback(error, () => {})
          : fallback ?? NOTHING;
      }
    };
  }

  function portal(target, children) {
    return directive((_element, context) => {
      const destination = resolveDeep(target);
      if (!destination?.append) return;

      const fragment = destination.ownerDocument.createDocumentFragment();
      appendValue(fragment, children, context);
      destination.replaceChildren(fragment);
    });
  }

  function keyed(key, children) {
    return html`<mf-keyed data-mf-key=${String(resolveDeep(key))}>${children}</mf-keyed>`;
  }

  function compile(template) {
    const componentNames = new Map();
    let componentCounter = 0;
    let source = "";

    for (let index = 0; index < template.strings.length; index += 1) {
      const part = template.strings[index];
      source += part;

      if (index >= template.values.length) continue;

      const value = template.values[index];
      const isOpeningTag = /<\s*$/.test(part);
      const isClosingTag = /<\/\s*$/.test(part);

      if ((isOpeningTag || isClosingTag) && isComponent(value)) {
        let tagName = componentNames.get(value);

        if (!tagName) {
          tagName = `${COMPONENT_TAG_PREFIX}${componentCounter++}`;
          componentNames.set(value, tagName);
        }

        source += tagName;
      } else {
        source += token(index);
      }
    }

    const componentsByTag = new Map(
      Array.from(componentNames, ([componentFactory, tagName]) => [
        tagName.toUpperCase(),
        componentFactory,
      ]),
    );

    return { source, componentsByTag };
  }

  function expressionValue(template, index) {
    return template.values[Number(index)];
  }

  function interpolate(raw, template) {
    const pattern = tokenPattern();

    return raw.replace(pattern, (_match, index) => {
      const value = expressionValue(template, index);
      const current = resolveDeep(value);
      return current == null || current === false ? "" : String(current);
    });
  }

  function getDocument(parent) {
    return parent?.ownerDocument ||
      (parent?.nodeType === 9 ? parent : null) ||
      global.document;
  }

  function isNode(value, documentRef) {
    const NodeCtor = documentRef?.defaultView?.Node || global.Node;
    return Boolean(NodeCtor && value instanceof NodeCtor);
  }

  function appendValue(parent, rawValue, context) {
    let value;

    try {
      value = resolve(rawValue);
    } catch (error) {
      context.reportError(error);
      return;
    }

    if (
      value == null ||
      value === false ||
      value === true ||
      value === NOTHING
    ) {
      return;
    }

    if (isBinding(value)) {
      appendValue(parent, value.signal(), context);
      return;
    }

    if (Array.isArray(value) || value instanceof Set) {
      for (const item of value) appendValue(parent, item, context);
      return;
    }

    if (
      value &&
      typeof value !== "string" &&
      typeof value[Symbol.iterator] === "function" &&
      !isNode(value, context.document)
    ) {
      for (const item of value) appendValue(parent, item, context);
      return;
    }

    if (isTemplate(value)) {
      parent.append(materialize(value, context));
      return;
    }

    if (isDirective(value)) {
      const anchor = context.document.createComment("mf:directive");
      parent.append(anchor);
      value.apply(anchor, context);
      return;
    }

    if (isNode(value, context.document)) {
      parent.append(value);
      return;
    }

    parent.append(context.document.createTextNode(String(value)));
  }

  function parseComponentProps(element, template, context) {
    const props = {
      __mfLifecycle: context,
    };

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name;
      const raw = attribute.value;
      const exact = raw.match(exactTokenPattern());

      if (exact) {
        props[toCamelCase(name)] = expressionValue(template, exact[1]);
      } else if (tokenPattern().test(raw)) {
        props[toCamelCase(name)] = interpolate(raw, template);
      } else if (raw === "") {
        props[toCamelCase(name)] = true;
      } else {
        props[toCamelCase(name)] = raw;
      }
    }

    if (element.childNodes.length > 0) {
      const children = context.document.createDocumentFragment();
      while (element.firstChild) children.append(element.firstChild);
      props.children = children;
    } else {
      props.children = NOTHING;
    }

    return props;
  }

  function materializeComponent(element, factory, template, context) {
    const props = parseComponentProps(element, template, context);
    const replacement = context.document.createDocumentFragment();

    try {
      appendValue(replacement, factory(props), context);
    } catch (error) {
      context.reportError(error);
    }

    element.replaceWith(replacement);
  }

  function applyAttribute(element, attribute, template, context) {
    const name = attribute.name;
    const raw = attribute.value;
    const matches = Array.from(raw.matchAll(tokenPattern()));

    if (!matches.length) return;

    if (matches.length === 1 && matches[0][0] === raw) {
      const value = expressionValue(template, matches[0][1]);

      if (name === "ref") {
        const callback = isDirective(value)
          ? value.apply
          : resolve(value);

        if (typeof callback === "function") {
          context.refs.push(() => callback(element, context));
        }

        element.removeAttribute(name);
        return;
      }

      if (name === "class" && isDirective(value)) {
        value.apply(element, context);
        return;
      }

      if (name === "style" && isDirective(value)) {
        value.apply(element, context);
        return;
      }

      if (name === "...") {
        const spread = resolveDeep(value) || {};
        for (const [spreadName, spreadValue] of Object.entries(spread)) {
          applyResolvedAttribute(element, spreadName, spreadValue, context);
        }
        element.removeAttribute(name);
        return;
      }

      if (name.startsWith("@")) {
        const eventName = name.slice(1);
        const descriptor = isEvent(value)
          ? value
          : event(resolve(value));

        element.addEventListener(
          eventName,
          descriptor.handler,
          descriptor.options,
        );

        context.cleanups.push(() => {
          element.removeEventListener(
            eventName,
            descriptor.handler,
            descriptor.options,
          );
        });

        element.removeAttribute(name);
        return;
      }

      if (name.startsWith(".")) {
        applyPropertyBinding(element, name.slice(1), value, context);
        element.removeAttribute(name);
        return;
      }

      if (name.startsWith("?")) {
        const attributeName = name.slice(1);
        if (Boolean(resolveDeep(value))) element.setAttribute(attributeName, "");
        else element.removeAttribute(attributeName);
        element.removeAttribute(name);
        return;
      }

      if (isDirective(value)) {
        value.apply(element, context);
        element.removeAttribute(name);
        return;
      }

      setNormalAttribute(element, name, resolveDeep(value));
      return;
    }

    element.setAttribute(name, interpolate(raw, template));
  }

  function applyResolvedAttribute(element, name, value, context) {
    if (name.startsWith("@")) {
      const eventName = name.slice(1);
      const descriptor = isEvent(value) ? value : event(value);
      element.addEventListener(eventName, descriptor.handler, descriptor.options);
      context.cleanups.push(() =>
        element.removeEventListener(eventName, descriptor.handler, descriptor.options),
      );
      return;
    }

    if (name.startsWith(".")) {
      applyPropertyBinding(element, name.slice(1), value, context);
      return;
    }

    if (name.startsWith("?")) {
      if (Boolean(resolveDeep(value))) element.setAttribute(name.slice(1), "");
      return;
    }

    setNormalAttribute(element, name, resolveDeep(value));
  }

  function applyPropertyBinding(element, property, rawValue, context) {
    const binding = isBinding(rawValue) ? rawValue : null;
    const current = binding
      ? binding.format
        ? binding.format(binding.signal())
        : binding.signal()
      : resolveDeep(rawValue);

    try {
      element[property] =
        current ??
        (property === "checked" || property === "disabled" ? false : "");
    } catch (error) {
      context.warn(`Failed to assign .${property}`, error);
    }

    if (!binding) return;

    const eventName =
      binding.event ||
      (property === "checked" || property === "selectedIndex"
        ? "change"
        : "input");

    const update = () => {
      let next;

      if (
        property === "value" &&
        element?.tagName === "INPUT" &&
        element.type === "number" &&
        element.value !== ""
      ) {
        next = Number(element.value);
      } else if (property === "checked") {
        next = Boolean(element.checked);
      } else {
        next = element[property];
      }

      if (binding.parse) next = binding.parse(next, element);
      binding.signal.set?.(next);
    };

    element.addEventListener(eventName, update);

    if (eventName !== "change") {
      element.addEventListener("change", update);
    }

    context.cleanups.push(() => {
      element.removeEventListener(eventName, update);
      if (eventName !== "change") element.removeEventListener("change", update);
    });
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

    element.setAttribute(name, String(value));
  }

  function materialize(template, parentContext) {
    const context = parentContext || createRenderContext(global.document);
    const { source, componentsByTag } = compile(template);
    const holder = context.document.createElement("template");

    holder.innerHTML = source;
    const fragment = holder.content;

    const walker = context.document.createTreeWalker(
      fragment,
      global.NodeFilter.SHOW_ELEMENT | global.NodeFilter.SHOW_TEXT,
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    // Components are replaced deepest-first, so nested component placeholders
    // are passed through as children instead of being consumed prematurely.
    const componentNodes = nodes
      .filter(
        (node) =>
          node.nodeType === 1 && componentsByTag.has(node.tagName),
      )
      .reverse();

    for (const element of componentNodes) {
      materializeComponent(
        element,
        componentsByTag.get(element.tagName),
        template,
        context,
      );
    }

    for (const node of nodes) {
      if (!node.isConnected && !fragment.contains(node)) continue;

      if (node.nodeType === 3) {
        replaceTextExpressions(node, template, context);
        continue;
      }

      if (node.nodeType === 1) {
        for (const attribute of Array.from(node.attributes)) {
          applyAttribute(node, attribute, template, context);
        }
      }
    }

    return fragment;
  }

  function replaceTextExpressions(node, template, context) {
    const text = node.nodeValue || "";
    const pattern = tokenPattern();

    if (!pattern.test(text)) return;

    const replacement = context.document.createDocumentFragment();
    let cursor = 0;

    for (const match of text.matchAll(tokenPattern())) {
      if (match.index > cursor) {
        replacement.append(
          context.document.createTextNode(text.slice(cursor, match.index)),
        );
      }

      appendValue(
        replacement,
        expressionValue(template, match[1]),
        context,
      );

      cursor = match.index + match[0].length;
    }

    if (cursor < text.length) {
      replacement.append(
        context.document.createTextNode(text.slice(cursor)),
      );
    }

    node.replaceWith(replacement);
  }

  function createRenderContext(documentRef, options = {}) {
    const context = {
      document: documentRef,
      refs: [],
      mounts: [],
      cleanups: [],
      afterPaint: [],
      warn(message, error) {
        options.onWarn?.(message, error);
        if (!options.onWarn) console.warn("[MiniFabrica]", message, error);
      },
      reportError(error) {
        if (options.onError) {
          options.onError(error);
          return;
        }
        throw error;
      },
    };

    return context;
  }

  function captureDOMState(root, options) {
    const active = root.contains(root.ownerDocument.activeElement)
      ? root.ownerDocument.activeElement
      : null;

    const focusKey =
      active?.getAttribute?.("data-mf-focus-key") ||
      active?.id ||
      null;

    const interactiveSelector =
      options.interactiveSelector ||
      "input,select,textarea,button,[contenteditable],[tabindex]";

    const interactive = Array.from(root.querySelectorAll(interactiveSelector));
    const activeIndex = active ? interactive.indexOf(active) : -1;

    const selection =
      active &&
      typeof active.selectionStart === "number"
        ? {
            start: active.selectionStart,
            end: active.selectionEnd,
            direction: active.selectionDirection,
          }
        : null;

    const scrollSelector =
      options.scrollSelector ||
      "[data-mf-preserve-scroll],.mf-virtual-repeat";

    const scroll = Array.from(root.querySelectorAll(scrollSelector)).map(
      (node, index) => ({
        key: node.getAttribute("data-mf-scroll-key") || String(index),
        top: node.scrollTop,
        left: node.scrollLeft,
      }),
    );

    return {
      focusKey,
      activeIndex,
      selection,
      scroll,
      interactiveSelector,
      scrollSelector,
    };
  }

  function restoreDOMState(root, state) {
    const scrollNodes = Array.from(root.querySelectorAll(state.scrollSelector));

    for (const position of state.scroll) {
      const node =
        root.querySelector(
          `[data-mf-scroll-key="${cssEscape(position.key)}"]`,
        ) ||
        scrollNodes[Number(position.key)];

      if (node) {
        node.scrollTop = position.top;
        node.scrollLeft = position.left;
      }
    }

    let nextActive = null;

    if (state.focusKey) {
      nextActive =
        root.querySelector(
          `[data-mf-focus-key="${cssEscape(state.focusKey)}"]`,
        ) ||
        root.querySelector(`#${cssEscape(state.focusKey)}`);
    }

    if (!nextActive && state.activeIndex >= 0) {
      nextActive =
        root.querySelectorAll(state.interactiveSelector)[state.activeIndex];
    }

    nextActive?.focus?.({ preventScroll: true });

    if (
      state.selection &&
      nextActive &&
      typeof nextActive.setSelectionRange === "function"
    ) {
      try {
        nextActive.setSelectionRange(
          state.selection.start,
          state.selection.end,
          state.selection.direction,
        );
      } catch {
        // Unsupported input type.
      }
    }
  }

  function resolveEffect(Broto) {
    if (typeof Broto?.effect === "function") return Broto.effect.bind(Broto);
    if (typeof Broto?.autorun === "function") return Broto.autorun.bind(Broto);

    return (callback) => {
      callback();
      return () => {};
    };
  }

  function render(root, tree, Broto, options = {}) {
    if (!root?.replaceChildren) {
      throw new TypeError("render(root, tree): root must be an Element or ShadowRoot.");
    }

    const documentRef = getDocument(root);
    const effect = resolveEffect(Broto);
    let disposed = false;
    let cleanups = [];

    const paint = () => {
      if (disposed) return;

      for (const cleanup of cleanups.splice(0)) {
        try {
          cleanup?.();
        } catch (error) {
          options.onWarn?.("Cleanup failed", error);
        }
      }

      const domState = options.preserveState === false
        ? null
        : captureDOMState(root, options);

      const context = createRenderContext(documentRef, {
        onError: options.onError,
        onWarn: options.onWarn,
      });

      try {
        const fragment = documentRef.createDocumentFragment();
        appendValue(fragment, tree, context);
        root.replaceChildren(fragment);

        for (const callback of context.refs) callback();

        if (domState) restoreDOMState(root, domState);

        for (const mount of context.mounts) {
          const cleanup = mount();
          if (typeof cleanup === "function") context.cleanups.push(cleanup);
        }

        cleanups = context.cleanups;

        queueMicrotask(() => {
          if (disposed) return;

          for (const callback of context.afterPaint) {
            try {
              callback();
            } catch (error) {
              context.warn("afterPaint callback failed", error);
            }
          }

          options.afterPaint?.(root);
        });
      } catch (error) {
        options.onError?.(error);

        if (!options.onError) {
          console.error("[MiniFabrica] render failed", error);
        }

        const fallback =
          typeof options.fallback === "function"
            ? options.fallback(error)
            : options.fallback;

        root.replaceChildren();

        if (fallback !== undefined) {
          const fallbackContext = createRenderContext(documentRef);
          const fragment = documentRef.createDocumentFragment();
          appendValue(fragment, fallback, fallbackContext);
          root.append(fragment);
        } else {
          root.append(
            documentRef.createTextNode(
              `Render failed: ${error?.message || String(error)}`,
            ),
          );
        }
      }
    };

    const disposeEffect = effect(paint, {
      scheduler: options.scheduler || "microtask",
      name: options.name || "mini-fabrica.render",
    });

    return () => {
      if (disposed) return;
      disposed = true;

      try {
        disposeEffect?.();
      } catch {}

      for (const cleanup of cleanups.splice(0)) {
        try {
          cleanup?.();
        } catch {}
      }

      if (options.clearOnDispose !== false) root.replaceChildren();
    };
  }

  function createRoot(root, Broto, options = {}) {
    let dispose = null;

    return Object.freeze({
      render(tree) {
        dispose?.();
        dispose = render(root, tree, Broto, {
          ...options,
          clearOnDispose: false,
        });
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

  function toCamelCase(value) {
    return String(value).replace(/-([a-z])/g, (_match, letter) =>
      letter.toUpperCase(),
    );
  }

  function toKebabCase(value) {
    return String(value)
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/_/g, "-")
      .toLowerCase();
  }

  function cssEscape(value) {
    if (global.CSS?.escape) return global.CSS.escape(String(value));
    return String(value).replace(/["\\]/g, "\\$&");
  }

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
    ref,
    attrs,
    classMap,
    styleMap,
    unsafeHTML,

    repeat,
    virtualRepeat,
    when,
    choose,
    boundary,
    portal,
    keyed,

    nothing: NOTHING,
  });

  Object.defineProperty(global, "MiniFabrica", {
    value: api,
    configurable: true,
    enumerable: false,
    writable: false,
  });
})(typeof globalThis !== "undefined" ? globalThis : window);

// Exemplo de uso:
//
// const {
//   html,
//   component,
//   render,
//   bind,
//   event,
//   repeat,
//   when,
//   classMap,
//   styleMap,
// } = MiniFabrica;
//
// const state = Broto.store({
//   title: "Mini Fábrica",
//   items: ["Um", "Dois", "Três"],
//   open: true,
// });
// const query = Broto.signal("");
//
// const Button = component("Button", ({ children, kind = "default", onClick }) => html`
//   <button
//     class=${classMap(["button", `button--${kind}`])}
//     @click=${event(onClick)}
//   >
//     ${children}
//   </button>
// `);
//
// const App = component("App", () => html`
//   <section style=${styleMap({ padding: "16px" })}>
//     <h1>${() => state.title}</h1>
//
//     <input
//       data-mf-focus-key="search"
//       .value=${bind(query)}
//       placeholder="Buscar"
//     />
//
//     <${Button}
//       kind="primary"
//       on-click=${() => { state.open = !state.open; }}
//     >
//       Alternar
//     </${Button}>
//
//     ${when(
//       () => state.open,
//       () => html`
//         <ul>
//           ${repeat(
//             () => state.items,
//             (item) => item,
//             ({ item, index }) => html`
//               <li>${index}. ${item}</li>
//             `,
//           )}
//         </ul>
//       `,
//     )}
//   </section>
// `);
//
// const dispose = render(
//   document.querySelector("#app"),
//   App(),
//   Broto,
//   {
//     name: "my-userscript.app",
//     afterPaint(root) {
//       // Ajustes de geometria, se necessários.
//     },
//   },
// );
