/**
 * RodElements v1.0.0
 * Ultra-fast tiny DOM factory for userscripts and browser scripts.
 *
 * Features:
 * - Global IIFE API exposed as `RodElements`
 * - Tiny Emmet-like selectors
 * - HTML and SVG element creation
 * - Selector parsing cache with configurable size
 * - Cross-realm-safe Node detection
 * - Variadic and nested children
 * - DocumentFragment helpers
 * - Fast direct DOM event properties (`onclick`, `oninput`, etc.)
 * - `addEventListener` support with listener options
 * - Style objects, CSS custom properties and cssText
 * - Dataset and attribute helpers
 * - Optional debugging metadata
 * - Optional publication into `unsafeWindow`
 * - `noConflict()` support
 * - No dependencies
 *
 * Supported selector syntax:
 *
 *   div
 *   div#app
 *   div.card
 *   div.card.large
 *   #app
 *   .card
 *   button.primary#save
 *   button.primary[type=button]
 *   input[name=email][placeholder="Email"]
 *   input[disabled]
 *   div[data-state='open']
 *
 * Selectors describe exactly one element. Tree operators such as `>`, `+`,
 * `*`, `^` and `{text}` are intentionally not supported.
 *
 * Basic usage:
 *
 *   const { el } = RodElements;
 *
 *   const button = el("button.primary#save[type=button]", {
 *     text: "Salvar",
 *     onclick: () => console.log("saved"),
 *   });
 *
 * Variadic children:
 *
 *   const card = el(
 *     "section.card",
 *     null,
 *     el("h2", "Título"),
 *     el("p", "Conteúdo"),
 *   );
 *
 * Nested child arrays:
 *
 *   const list = el(
 *     "ul.items",
 *     null,
 *     items.map((item) => el("li.item", item.name)),
 *   );
 *
 * SVG:
 *
 *   const icon = RodElements.svg(
 *     "svg.icon",
 *     {
 *       attr: {
 *         viewBox: "0 0 24 24",
 *         "aria-hidden": "true",
 *       },
 *     },
 *     RodElements.svg("path", {
 *       attr: {
 *         d: "M6 6l12 12M18 6L6 18",
 *         stroke: "currentColor",
 *       },
 *     }),
 *   );
 *
 * Configuration:
 *
 *   RodElements.configure({
 *     cache: true,
 *     cacheSize: 256,
 *     debug: false,
 *     debugAttribute: false,
 *     publishUnsafeWindow: true,
 *   });
 *
 * @license MIT
 */
(function installRodElements(factory) {
  "use strict";

  var VERSION = "1.0.0";
  var SIGNATURE = "__rodElements__";
  var GLOBAL_NAME = "RodElements";
  var roots = [];
  var localRoot =
    typeof globalThis !== "undefined"
      ? globalThis
      : typeof window !== "undefined"
        ? window
        : typeof self !== "undefined"
          ? self
          : this;

  function addRoot(root) {
    if (!root) return;

    for (var index = 0; index < roots.length; index += 1) {
      if (roots[index] === root) return;
    }

    roots.push(root);
  }

  addRoot(localRoot);

  if (typeof window !== "undefined") {
    addRoot(window);
  }

  if (typeof self !== "undefined") {
    addRoot(self);
  }

  if (typeof unsafeWindow !== "undefined") {
    try {
      addRoot(unsafeWindow);
    } catch (_) {}
  }

  var existing = null;

  for (var rootIndex = 0; rootIndex < roots.length; rootIndex += 1) {
    try {
      var candidate = roots[rootIndex][GLOBAL_NAME];

      if (
        candidate &&
        candidate[SIGNATURE] === true &&
        candidate.version === VERSION
      ) {
        existing = candidate;
        break;
      }
    } catch (_) {}
  }

  if (existing) {
    for (var existingIndex = 0; existingIndex < roots.length; existingIndex += 1) {
      try {
        if (!roots[existingIndex][GLOBAL_NAME]) {
          roots[existingIndex][GLOBAL_NAME] = existing;
        }
      } catch (_) {}
    }

    return;
  }

  var defaultDocument =
    localRoot && localRoot.document
      ? localRoot.document
      : typeof document !== "undefined"
        ? document
        : null;

  var previousValues = [];

  for (var previousIndex = 0; previousIndex < roots.length; previousIndex += 1) {
    try {
      previousValues.push({
        root: roots[previousIndex],
        value: roots[previousIndex][GLOBAL_NAME],
      });
    } catch (_) {}
  }

  var api = factory({
    version: VERSION,
    signature: SIGNATURE,
    globalName: GLOBAL_NAME,
    defaultDocument: defaultDocument,
    roots: roots,
    previousValues: previousValues,
  });

  for (var publishIndex = 0; publishIndex < roots.length; publishIndex += 1) {
    try {
      roots[publishIndex][GLOBAL_NAME] = api;
    } catch (_) {}
  }
})(function createRodElements(environment) {
  "use strict";

  var VERSION = environment.version;
  var SIGNATURE = environment.signature;
  var GLOBAL_NAME = environment.globalName;
  var roots = environment.roots;
  var previousValues = environment.previousValues;

  var HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
  var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  var XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
  var XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";

  var hasOwn = Object.prototype.hasOwnProperty;
  var selectorCache = new Map();

  var config = {
    cache: true,
    cacheSize: 256,
    debug: false,
    debugAttribute: false,
    publishUnsafeWindow: true,
    document: environment.defaultDocument,
  };

  /**
   * Tests whether a value behaves like a DOM Node without using
   * `instanceof Node`, which is unreliable across iframes and userscript
   * sandbox/page realms.
   *
   * @param {*} value
   * @returns {boolean}
   */
  function isNode(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      typeof value.nodeType === "number" &&
      typeof value.nodeName === "string"
    );
  }

  /**
   * Tests whether a value can be treated as a props object.
   *
   * Arrays and DOM Nodes are children, not props.
   *
   * @param {*} value
   * @returns {boolean}
   */
  function isPropsObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !isNode(value)
    );
  }

  /**
   * Returns a usable Document.
   *
   * @param {Document|null|undefined} preferred
   * @returns {Document}
   */
  function resolveDocument(preferred) {
    var resolved = preferred || config.document;

    if (!resolved || typeof resolved.createElement !== "function") {
      throw new Error(
        "[RodElements] No usable document is available. " +
          "Provide one with RodElements.configure({ document }).",
      );
    }

    return resolved;
  }

  /**
   * Trims the selector cache to the configured maximum.
   *
   * The cache is intentionally FIFO instead of full LRU. FIFO has lower
   * bookkeeping overhead and works well for repeated UI selector sets.
   *
   * @returns {void}
   */
  function trimSelectorCache() {
    var max = config.cacheSize;

    if (!config.cache || max <= 0) {
      selectorCache.clear();
      return;
    }

    while (selectorCache.size > max) {
      var oldest = selectorCache.keys().next();

      if (oldest.done) break;
      selectorCache.delete(oldest.value);
    }
  }

  /**
   * Parses one tiny Emmet-like selector.
   *
   * Supported:
   * - tag
   * - #id
   * - .class
   * - multiple classes
   * - [attribute]
   * - [attribute=value]
   * - quoted attribute values
   *
   * Unsupported by design:
   * - child/sibling operators
   * - multiplication
   * - text blocks
   * - selector groups
   *
   * Returned parsed objects are frozen when possible because cached parser
   * results must never be mutated by consumers.
   *
   * @param {string} input
   * @returns {{
   *   tag: string,
   *   id: string,
   *   classes: string[],
   *   className: string,
   *   attrs: Record<string, string>
   * }}
   */
  function parse(input) {
    var source = input == null ? "div" : String(input).trim();

    if (!source) source = "div";

    if (config.cache) {
      var cached = selectorCache.get(source);
      if (cached) return cached;
    }

    var length = source.length;
    var cursor = 0;
    var tag = "div";
    var id = "";
    var classes = [];
    var attrs = Object.create(null);

    var first = source.charCodeAt(0);

    if (
      (first >= 65 && first <= 90) ||
      (first >= 97 && first <= 122)
    ) {
      var tagStart = cursor;
      cursor += 1;

      while (cursor < length) {
        var tagCode = source.charCodeAt(cursor);

        if (
          (tagCode >= 65 && tagCode <= 90) ||
          (tagCode >= 97 && tagCode <= 122) ||
          (tagCode >= 48 && tagCode <= 57) ||
          tagCode === 45 ||
          tagCode === 95
        ) {
          cursor += 1;
        } else {
          break;
        }
      }

      tag = source.slice(tagStart, cursor);
    }

    while (cursor < length) {
      var marker = source.charCodeAt(cursor);

      if (marker === 35 || marker === 46) {
        var isId = marker === 35;
        cursor += 1;

        var tokenStart = cursor;

        while (cursor < length) {
          var tokenCode = source.charCodeAt(cursor);

          if (
            (tokenCode >= 65 && tokenCode <= 90) ||
            (tokenCode >= 97 && tokenCode <= 122) ||
            (tokenCode >= 48 && tokenCode <= 57) ||
            tokenCode === 45 ||
            tokenCode === 95
          ) {
            cursor += 1;
          } else {
            break;
          }
        }

        if (cursor === tokenStart) {
          throw new SyntaxError(
            "[RodElements] Invalid selector token in: " + source,
          );
        }

        var token = source.slice(tokenStart, cursor);

        if (isId) {
          id = token;
        } else {
          classes.push(token);
        }

        continue;
      }

      if (marker === 91) {
        cursor += 1;

        while (cursor < length && source.charCodeAt(cursor) <= 32) {
          cursor += 1;
        }

        var attrNameStart = cursor;

        while (cursor < length) {
          var attrNameCode = source.charCodeAt(cursor);

          if (
            attrNameCode === 61 ||
            attrNameCode === 93 ||
            attrNameCode <= 32
          ) {
            break;
          }

          cursor += 1;
        }

        var attrName = source.slice(attrNameStart, cursor);

        if (!attrName) {
          throw new SyntaxError(
            "[RodElements] Empty attribute name in selector: " + source,
          );
        }

        while (cursor < length && source.charCodeAt(cursor) <= 32) {
          cursor += 1;
        }

        var attrValue = "";

        if (source.charCodeAt(cursor) === 61) {
          cursor += 1;

          while (cursor < length && source.charCodeAt(cursor) <= 32) {
            cursor += 1;
          }

          var quote = source.charCodeAt(cursor);

          if (quote === 34 || quote === 39) {
            cursor += 1;
            var quotedStart = cursor;

            while (cursor < length && source.charCodeAt(cursor) !== quote) {
              cursor += 1;
            }

            if (cursor >= length) {
              throw new SyntaxError(
                "[RodElements] Unclosed quoted attribute in selector: " +
                  source,
              );
            }

            attrValue = source.slice(quotedStart, cursor);
            cursor += 1;
          } else {
            var unquotedStart = cursor;

            while (
              cursor < length &&
              source.charCodeAt(cursor) !== 93
            ) {
              cursor += 1;
            }

            attrValue = source.slice(unquotedStart, cursor).trim();
          }

          while (cursor < length && source.charCodeAt(cursor) <= 32) {
            cursor += 1;
          }
        }

        if (source.charCodeAt(cursor) !== 93) {
          throw new SyntaxError(
            "[RodElements] Unclosed attribute in selector: " + source,
          );
        }

        cursor += 1;
        attrs[attrName] = attrValue;
        continue;
      }

      if (marker <= 32) {
        cursor += 1;
        continue;
      }

      throw new SyntaxError(
        "[RodElements] Unsupported selector syntax near `" +
          source.slice(cursor) +
          "` in: " +
          source,
      );
    }

    var parsed = {
      tag: tag,
      id: id,
      classes: classes,
      className: classes.length ? classes.join(" ") : "",
      attrs: attrs,
    };

    if (typeof Object.freeze === "function") {
      try {
        Object.freeze(classes);
        Object.freeze(attrs);
        Object.freeze(parsed);
      } catch (_) {}
    }

    if (config.cache) {
      selectorCache.set(source, parsed);
      trimSelectorCache();
    }

    return parsed;
  }

  /**
   * Applies an attribute using boolean-friendly creation semantics.
   *
   * - null / undefined / false: ignored
   * - true: creates an empty attribute
   * - everything else: stringified
   *
   * For a literal false attribute value, pass the string `"false"`.
   *
   * @param {Element} element
   * @param {string} name
   * @param {*} value
   * @param {string|null} namespace
   * @returns {void}
   */
  function setAttributeValue(element, name, value, namespace) {
    if (value == null || value === false) return;

    var normalized = value === true ? "" : String(value);

    if (namespace) {
      element.setAttributeNS(namespace, name, normalized);
    } else {
      element.setAttribute(name, normalized);
    }
  }

  /**
   * Applies an object or string to `element.style`.
   *
   * Supported:
   *
   *   style: "color:red"
   *
   *   style: {
   *     color: "red",
   *     backgroundColor: "black",
   *     "--accent": "tomato",
   *   }
   *
   * null / undefined / false values are skipped.
   *
   * @param {HTMLElement|SVGElement} element
   * @param {string|Record<string, *>} value
   * @returns {void}
   */
  function applyStyle(element, value) {
    if (typeof value === "string") {
      element.style.cssText = value;
      return;
    }

    if (!value || typeof value !== "object") return;

    var style = element.style;

    for (var key in value) {
      if (!hasOwn.call(value, key)) continue;

      var styleValue = value[key];
      if (styleValue == null || styleValue === false) continue;

      if (key.charCodeAt(0) === 45 && key.charCodeAt(1) === 45) {
        style.setProperty(key, String(styleValue));
      } else {
        try {
          style[key] = styleValue;
        } catch (_) {
          style.setProperty(key, String(styleValue));
        }
      }
    }
  }

  /**
   * Converts camelCase dataset keys to data-* attribute names.
   *
   * `recordId` becomes `data-record-id`.
   *
   * @param {string} key
   * @returns {string}
   */
  function dataAttributeName(key) {
    return (
      "data-" +
      String(key).replace(/[A-Z]/g, function uppercaseToDash(character) {
        return "-" + character.toLowerCase();
      })
    );
  }

  /**
   * Applies dataset values.
   *
   * Both `data` and `dataset` props use this implementation.
   *
   * @param {Element} element
   * @param {Record<string, *>} values
   * @returns {void}
   */
  function applyData(element, values) {
    if (!values || typeof values !== "object") return;

    for (var key in values) {
      if (!hasOwn.call(values, key)) continue;

      var value = values[key];
      if (value == null || value === false) continue;

      element.setAttribute(dataAttributeName(key), String(value));
    }
  }

  /**
   * Applies arbitrary attributes.
   *
   * Special namespace prefixes:
   * - xlink:href
   * - xml:space
   *
   * @param {Element} element
   * @param {Record<string, *>} values
   * @returns {void}
   */
  function applyAttributes(element, values) {
    if (!values || typeof values !== "object") return;

    for (var key in values) {
      if (!hasOwn.call(values, key)) continue;

      var value = values[key];

      if (key.slice(0, 6) === "xlink:") {
        setAttributeValue(element, key, value, XLINK_NAMESPACE);
      } else if (key.slice(0, 4) === "xml:") {
        setAttributeValue(element, key, value, XML_NAMESPACE);
      } else {
        setAttributeValue(element, key, value, null);
      }
    }
  }

  /**
   * Adds listeners declared through the `on` prop.
   *
   * Supported forms:
   *
   *   on: {
   *     click: handler,
   *   }
   *
   *   on: {
   *     scroll: [handler, { passive: true }],
   *   }
   *
   *   on: {
   *     click: {
   *       handler,
   *       options: { once: true },
   *     },
   *   }
   *
   * @param {Element} element
   * @param {Record<string, *>} listeners
   * @returns {void}
   */
  function applyListeners(element, listeners) {
    if (!listeners || typeof listeners !== "object") return;

    for (var eventName in listeners) {
      if (!hasOwn.call(listeners, eventName)) continue;

      var declaration = listeners[eventName];
      var handler = declaration;
      var options;

      if (Array.isArray(declaration)) {
        handler = declaration[0];
        options = declaration[1];
      } else if (
        declaration &&
        typeof declaration === "object" &&
        !isNode(declaration)
      ) {
        handler = declaration.handler;
        options = declaration.options;
      }

      if (
        typeof handler === "function" ||
        (handler &&
          typeof handler === "object" &&
          typeof handler.handleEvent === "function")
      ) {
        element.addEventListener(eventName, handler, options);
      }
    }
  }

  /**
   * Adds classes from a string, an array or an object map.
   *
   * Supported:
   *
   *   class: "active large"
   *   class: ["active", condition && "large"]
   *   class: { active: true, disabled: false }
   *
   * Classes from props are merged with classes declared in the selector.
   *
   * @param {Element} element
   * @param {*} value
   * @returns {void}
   */
  function appendClasses(element, value) {
    if (value == null || value === false) return;

    if (typeof value === "string" || typeof value === "number") {
      var text = String(value).trim();

      if (text) {
        var tokens = text.split(/\s+/);

        for (var tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
          if (tokens[tokenIndex]) {
            element.classList.add(tokens[tokenIndex]);
          }
        }
      }

      return;
    }

    if (Array.isArray(value)) {
      for (var arrayIndex = 0; arrayIndex < value.length; arrayIndex += 1) {
        appendClasses(element, value[arrayIndex]);
      }

      return;
    }

    if (typeof value === "object") {
      for (var key in value) {
        if (hasOwn.call(value, key) && value[key]) {
          appendClasses(element, key);
        }
      }
    }
  }

  /**
   * Applies one property using the generic fallback.
   *
   * Property assignment is preferred when the key exists on the element.
   * If assignment throws or the property does not exist, an attribute is
   * created instead.
   *
   * @param {Element} element
   * @param {string} key
   * @param {*} value
   * @returns {void}
   */
  function applyGenericProp(element, key, value) {
    if (value == null || value === false) return;

    if (key in element) {
      try {
        element[key] = value;
        return;
      } catch (_) {}
    }

    setAttributeValue(element, key, value, null);
  }

  /**
   * Applies props to an element.
   *
   * Special props:
   *
   * - text
   *   Sets textContent.
   *
   * - html
   *   Sets innerHTML. Content is not sanitized.
   *
   * - class / className
   *   Adds classes without removing selector classes.
   *
   * - style
   *   Accepts cssText or a style object.
   *
   * - data / dataset
   *   Adds data-* attributes.
   *
   * - attr / attrs
   *   Adds arbitrary attributes.
   *
   * - on
   *   Adds listeners through addEventListener.
   *
   * - onclick / oninput / onchange / ...
   *   Assigns direct native event properties when passed a function.
   *   This is the fastest event path for newly created elements.
   *
   * - $ref
   *   Invoked after props and children are fully applied.
   *
   * - $document
   *   Used only during creation and never applied to the DOM.
   *
   * - $namespace
   *   Used only during creation and never applied to the DOM.
   *
   * @param {Element} element
   * @param {Record<string, *>} props
   * @returns {Function|null}
   */
  function applyProps(element, props) {
    if (!props) return null;

    var ref = null;

    for (var key in props) {
      if (!hasOwn.call(props, key)) continue;

      var value = props[key];

      if (key === "$ref") {
        if (typeof value === "function") ref = value;
        continue;
      }

      if (key === "$document" || key === "$namespace") {
        continue;
      }

      if (value == null || value === false) {
        continue;
      }

      switch (key) {
        case "text":
          element.textContent = String(value);
          continue;

        case "html":
          element.innerHTML = String(value);
          continue;

        case "class":
        case "className":
          appendClasses(element, value);
          continue;

        case "style":
          applyStyle(element, value);
          continue;

        case "data":
        case "dataset":
          applyData(element, value);
          continue;

        case "attr":
        case "attrs":
          applyAttributes(element, value);
          continue;

        case "on":
          applyListeners(element, value);
          continue;
      }

      if (
        key.length > 2 &&
        key.charCodeAt(0) === 111 &&
        key.charCodeAt(1) === 110 &&
        typeof value === "function"
      ) {
        try {
          element[key.toLowerCase()] = value;
          continue;
        } catch (_) {}
      }

      applyGenericProp(element, key, value);
    }

    return ref;
  }

  /**
   * Recursively appends children without relying on `instanceof Node`.
   *
   * Semantics:
   * - null / undefined / booleans: ignored
   * - Node: appended
   * - arrays: recursively flattened
   * - string / number / bigint: converted to text
   * - other values: converted with String()
   *
   * Functions are not executed. Pass their result explicitly.
   *
   * @param {Node} parent
   * @param {*} child
   * @param {Document} documentRef
   * @returns {void}
   */
  function appendOne(parent, child, documentRef) {
    if (
      child == null ||
      child === false ||
      child === true
    ) {
      return;
    }

    if (isNode(child)) {
      parent.appendChild(child);
      return;
    }

    if (Array.isArray(child)) {
      for (var index = 0; index < child.length; index += 1) {
        appendOne(parent, child[index], documentRef);
      }

      return;
    }

    parent.appendChild(documentRef.createTextNode(String(child)));
  }

  /**
   * Appends any number of children to a parent.
   *
   * @param {Node} parent
   * @param {...*} children
   * @returns {Node}
   */
  function append(parent) {
    if (!isNode(parent)) {
      throw new TypeError("[RodElements] append(parent): parent must be a Node.");
    }

    var documentRef =
      parent.ownerDocument ||
      (parent.nodeType === 9 ? parent : null) ||
      resolveDocument();

    for (var index = 1; index < arguments.length; index += 1) {
      appendOne(parent, arguments[index], documentRef);
    }

    return parent;
  }

  /**
   * Creates an HTML or namespaced element.
   *
   * Signatures:
   *
   *   el()
   *   el("div")
   *   el(".card")
   *   el("div.card", props)
   *   el("div.card", props, ...children)
   *   el("div", "text child")
   *   el("div", childNode)
   *   el("div", [child1, child2])
   *
   * When the second argument is not a plain props object, it is treated as
   * the first child.
   *
   * @param {string} selector
   * @param {Record<string, *>|*} props
   * @param {...*} children
   * @returns {HTMLElement|SVGElement}
   */
  function create(selector, props) {
    var parsed = parse(selector);
    var propsAreObject = isPropsObject(props);
    var actualProps = propsAreObject ? props : null;
    var documentRef = resolveDocument(
      actualProps && actualProps.$document,
    );
    var namespace =
      actualProps && actualProps.$namespace
        ? actualProps.$namespace
        : HTML_NAMESPACE;

    var element =
      namespace === HTML_NAMESPACE
        ? documentRef.createElement(parsed.tag)
        : documentRef.createElementNS(namespace, parsed.tag);

    if (parsed.id) {
      element.id = parsed.id;
    }

    if (parsed.className) {
      if (namespace === HTML_NAMESPACE) {
        element.className = parsed.className;
      } else {
        element.setAttribute("class", parsed.className);
      }
    }

    var selectorAttrs = parsed.attrs;

    for (var attrName in selectorAttrs) {
      if (hasOwn.call(selectorAttrs, attrName)) {
        setAttributeValue(
          element,
          attrName,
          selectorAttrs[attrName],
          null,
        );
      }
    }

    var ref = applyProps(element, actualProps);

    var childStart = propsAreObject ? 2 : 1;

    if (!propsAreObject && arguments.length > 1) {
      appendOne(element, props, documentRef);
      childStart = 2;
    }

    for (var childIndex = childStart; childIndex < arguments.length; childIndex += 1) {
      appendOne(element, arguments[childIndex], documentRef);
    }

    if (config.debug) {
      try {
        element.__rodElement = String(selector == null ? "div" : selector);
      } catch (_) {}

      if (config.debugAttribute) {
        try {
          element.setAttribute(
            "data-rod-element",
            String(selector == null ? "div" : selector),
          );
        } catch (_) {}
      }
    }

    if (ref) {
      ref(element);
    }

    return element;
  }

  /**
   * Public HTML element factory.
   *
   * @param {string} selector
   * @param {Record<string, *>|*} props
   * @param {...*} children
   * @returns {HTMLElement}
   */
  function el(selector, props) {
    return create.apply(null, arguments);
  }

  /**
   * Public SVG element factory.
   *
   * It uses the SVG namespace for the created element.
   *
   * @param {string} selector
   * @param {Record<string, *>|*} props
   * @param {...*} children
   * @returns {SVGElement}
   */
  function svg(selector, props) {
    var argsLength = arguments.length;
    var propsAreObject = isPropsObject(props);
    var actualProps;

    if (propsAreObject) {
      actualProps = Object.create(null);

      for (var key in props) {
        if (hasOwn.call(props, key)) {
          actualProps[key] = props[key];
        }
      }

      actualProps.$namespace = SVG_NAMESPACE;
    } else {
      actualProps = {
        $namespace: SVG_NAMESPACE,
      };
    }

    var args = new Array(argsLength + (propsAreObject ? 0 : 1));
    args[0] = selector;
    args[1] = actualProps;

    if (propsAreObject) {
      for (var index = 2; index < argsLength; index += 1) {
        args[index] = arguments[index];
      }
    } else {
      if (argsLength > 1) {
        args[2] = props;
      }

      for (var childIndex = 2; childIndex < argsLength; childIndex += 1) {
        args[childIndex + 1] = arguments[childIndex];
      }
    }

    return create.apply(null, args);
  }

  /**
   * Creates a DocumentFragment and appends all provided children.
   *
   * Optional final document selection:
   *
   *   fragment.withDocument(otherDocument, child1, child2)
   *
   * @param {...*} children
   * @returns {DocumentFragment}
   */
  function fragment() {
    var documentRef = resolveDocument();
    var result = documentRef.createDocumentFragment();

    for (var index = 0; index < arguments.length; index += 1) {
      appendOne(result, arguments[index], documentRef);
    }

    return result;
  }

  fragment.withDocument = function fragmentWithDocument(documentRef) {
    var resolved = resolveDocument(documentRef);
    var result = resolved.createDocumentFragment();

    for (var index = 1; index < arguments.length; index += 1) {
      appendOne(result, arguments[index], resolved);
    }

    return result;
  };

  /**
   * Creates a Text node.
   *
   * @param {*} value
   * @param {Document} [documentRef]
   * @returns {Text}
   */
  function text(value, documentRef) {
    return resolveDocument(documentRef).createTextNode(
      value == null ? "" : String(value),
    );
  }

  /**
   * Updates runtime configuration.
   *
   * Supported options:
   *
   * - cache: boolean
   * - cacheSize: non-negative integer
   * - debug: boolean
   * - debugAttribute: boolean
   * - publishUnsafeWindow: boolean
   * - document: Document
   *
   * Returns a shallow configuration snapshot.
   *
   * @param {Partial<typeof config>} options
   * @returns {Record<string, *>}
   */
  function configure(options) {
    if (!options || typeof options !== "object") {
      return getConfig();
    }

    if (hasOwn.call(options, "cache")) {
      config.cache = Boolean(options.cache);
    }

    if (hasOwn.call(options, "cacheSize")) {
      var cacheSize = Number(options.cacheSize);

      if (
        !Number.isFinite(cacheSize) ||
        cacheSize < 0
      ) {
        throw new TypeError(
          "[RodElements] cacheSize must be a non-negative finite number.",
        );
      }

      config.cacheSize = Math.floor(cacheSize);
    }

    if (hasOwn.call(options, "debug")) {
      config.debug = Boolean(options.debug);
    }

    if (hasOwn.call(options, "debugAttribute")) {
      config.debugAttribute = Boolean(options.debugAttribute);
    }

    if (hasOwn.call(options, "publishUnsafeWindow")) {
      config.publishUnsafeWindow = Boolean(options.publishUnsafeWindow);
    }

    if (hasOwn.call(options, "document")) {
      config.document = resolveDocument(options.document);
    }

    trimSelectorCache();
    publishConfiguredRoots();

    return getConfig();
  }

  /**
   * Returns a shallow configuration snapshot.
   *
   * @returns {Record<string, *>}
   */
  function getConfig() {
    return {
      cache: config.cache,
      cacheSize: config.cacheSize,
      debug: config.debug,
      debugAttribute: config.debugAttribute,
      publishUnsafeWindow: config.publishUnsafeWindow,
      document: config.document,
    };
  }

  /**
   * Publishes the API to configured roots.
   *
   * @returns {void}
   */
  function publishConfiguredRoots() {
    for (var index = 0; index < roots.length; index += 1) {
      var root = roots[index];

      if (!root) continue;

      if (
        typeof unsafeWindow !== "undefined" &&
        root === unsafeWindow &&
        !config.publishUnsafeWindow
      ) {
        continue;
      }

      try {
        root[GLOBAL_NAME] = api;
      } catch (_) {}
    }
  }

  /**
   * Clears all cached selectors, or one specific selector.
   *
   * @param {string} [selector]
   * @returns {boolean}
   */
  function clearCache(selector) {
    if (arguments.length === 0) {
      var hadEntries = selectorCache.size > 0;
      selectorCache.clear();
      return hadEntries;
    }

    return selectorCache.delete(String(selector).trim() || "div");
  }

  /**
   * Returns selector cache diagnostics.
   *
   * @returns {{
   *   enabled: boolean,
   *   size: number,
   *   maxSize: number,
   *   keys: string[]
   * }}
   */
  function getCacheStats() {
    return {
      enabled: config.cache,
      size: selectorCache.size,
      maxSize: config.cacheSize,
      keys: Array.from(selectorCache.keys()),
    };
  }

  /**
   * Restores previous global values and returns this API instance.
   *
   * @returns {typeof api}
   */
  function noConflict() {
    for (var index = 0; index < previousValues.length; index += 1) {
      var entry = previousValues[index];

      try {
        if (entry.root[GLOBAL_NAME] === api) {
          if (entry.value === undefined) {
            try {
              delete entry.root[GLOBAL_NAME];
            } catch (_) {
              entry.root[GLOBAL_NAME] = undefined;
            }
          } else {
            entry.root[GLOBAL_NAME] = entry.value;
          }
        }
      } catch (_) {}
    }

    return api;
  }

  /**
   * Creates a factory permanently bound to another Document.
   *
   * The returned facade has `el`, `svg`, `fragment` and `text`.
   *
   * @param {Document} documentRef
   * @returns {{
   *   el: Function,
   *   svg: Function,
   *   fragment: Function,
   *   text: Function
   * }}
   */
  function withDocument(documentRef) {
    var boundDocument = resolveDocument(documentRef);

    function boundEl(selector, props) {
      var argsLength = arguments.length;
      var propsAreObject = isPropsObject(props);
      var actualProps;
      var args;

      if (propsAreObject) {
        actualProps = Object.create(null);

        for (var key in props) {
          if (hasOwn.call(props, key)) {
            actualProps[key] = props[key];
          }
        }

        actualProps.$document = boundDocument;
        args = new Array(argsLength);

        for (var index = 0; index < argsLength; index += 1) {
          args[index] = arguments[index];
        }

        args[1] = actualProps;
      } else {
        actualProps = {
          $document: boundDocument,
        };

        args = new Array(argsLength + 1);
        args[0] = selector;
        args[1] = actualProps;

        if (argsLength > 1) {
          args[2] = props;
        }

        for (var childIndex = 2; childIndex < argsLength; childIndex += 1) {
          args[childIndex + 1] = arguments[childIndex];
        }
      }

      return create.apply(null, args);
    }

    function boundSvg(selector, props) {
      var argsLength = arguments.length;
      var propsAreObject = isPropsObject(props);
      var actualProps;
      var args;

      if (propsAreObject) {
        actualProps = Object.create(null);

        for (var key in props) {
          if (hasOwn.call(props, key)) {
            actualProps[key] = props[key];
          }
        }

        actualProps.$document = boundDocument;
        args = new Array(argsLength);

        for (var index = 0; index < argsLength; index += 1) {
          args[index] = arguments[index];
        }

        args[1] = actualProps;
      } else {
        actualProps = {
          $document: boundDocument,
        };

        args = new Array(argsLength + 1);
        args[0] = selector;
        args[1] = actualProps;

        if (argsLength > 1) {
          args[2] = props;
        }

        for (var childIndex = 2; childIndex < argsLength; childIndex += 1) {
          args[childIndex + 1] = arguments[childIndex];
        }
      }

      return svg.apply(null, args);
    }

    return {
      el: boundEl,
      createElement: boundEl,
      svg: boundSvg,
      fragment: function boundFragment() {
        var args = new Array(arguments.length + 1);
        args[0] = boundDocument;

        for (var index = 0; index < arguments.length; index += 1) {
          args[index + 1] = arguments[index];
        }

        return fragment.withDocument.apply(null, args);
      },
      text: function boundText(value) {
        return text(value, boundDocument);
      },
    };
  }

  var api = {
    version: VERSION,

    el: el,
    createElement: el,
    svg: svg,

    append: append,
    fragment: fragment,
    text: text,

    parse: parse,
    isNode: isNode,

    configure: configure,
    getConfig: getConfig,
    clearCache: clearCache,
    getCacheStats: getCacheStats,

    withDocument: withDocument,
    noConflict: noConflict,
  };

  try {
    Object.defineProperty(api, SIGNATURE, {
      value: true,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  } catch (_) {
    api[SIGNATURE] = true;
  }

  try {
    Object.freeze(api);
  } catch (_) {}

  publishConfiguredRoots();

  return api;
});
