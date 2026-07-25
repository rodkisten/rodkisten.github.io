(function patchGMRegisterMenuCommand(global) {
  "use strict";

  const PATCH_KEY = "__ROD_GM_MENU_PATCH__";
  const HOST_ID = "rod-gm-menu-host";
  const MAX_Z_INDEX = "2147483647";

  if (global[PATCH_KEY]?.register) {
    global.GM_registerMenuCommand = global[PATCH_KEY].register;
    return;
  }

  const nativeRegisterMenuCommand =
    typeof global.GM_registerMenuCommand === "function"
      ? global.GM_registerMenuCommand.bind(global)
      : null;

  const modernRegisterMenuCommand =
    typeof global.GM !== "undefined" &&
    typeof global.GM.registerMenuCommand === "function"
      ? global.GM.registerMenuCommand.bind(global.GM)
      : null;

  const commands = new Map();

  let commandSequence = 0;
  let host = null;
  let shadowRoot = null;
  let triggerButton = null;
  let menu = null;
  let commandsContainer = null;
  let emptyState = null;
  let isOpen = false;
  let mountScheduled = false;

  const icons = {
    logo: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 21 19H3L12 3Z" fill="currentColor"/>
      </svg>
    `,
    command: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 8h8v8H8z" fill="none" stroke="currentColor" stroke-width="1.8"/>
        <path d="M5 12h14M12 5v14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `,
    close: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `,
    arrow: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
    check: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 12 4 4 8-8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
    warning: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4 21 20H3L12 4Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
        <path d="M12 9v5M12 17.2v.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `,
  };

  const css = `
    :host {
      all: initial;
      color-scheme: light dark;
      --rod-menu-bg: rgba(255, 255, 255, 0.94);
      --rod-menu-surface: #ffffff;
      --rod-menu-hover: #f5f5f5;
      --rod-menu-border: rgba(0, 0, 0, 0.10);
      --rod-menu-border-strong: rgba(0, 0, 0, 0.16);
      --rod-menu-text: #171717;
      --rod-menu-muted: #737373;
      --rod-menu-shadow: 0 18px 48px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08);
      --rod-menu-radius: 12px;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    @media (prefers-color-scheme: dark) {
      :host {
        --rod-menu-bg: rgba(18, 18, 18, 0.94);
        --rod-menu-surface: #111111;
        --rod-menu-hover: #1f1f1f;
        --rod-menu-border: rgba(255, 255, 255, 0.10);
        --rod-menu-border-strong: rgba(255, 255, 255, 0.17);
        --rod-menu-text: #ededed;
        --rod-menu-muted: #a1a1a1;
        --rod-menu-shadow: 0 18px 48px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.35);
      }
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    button {
      font: inherit;
    }

    .root {
      position: fixed;
      right: max(10px, env(safe-area-inset-right));
      bottom: max(10px, env(safe-area-inset-bottom));
      z-index: ${MAX_Z_INDEX};
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 7px;
      pointer-events: none;
      -webkit-tap-highlight-color: transparent;
    }

    .trigger {
      pointer-events: auto;
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      padding: 0;
      border: 1px solid var(--rod-menu-border-strong);
      border-radius: 10px;
      background: var(--rod-menu-surface);
      color: var(--rod-menu-text);
      box-shadow: 0 5px 18px rgba(0, 0, 0, 0.16);
      cursor: pointer;
      touch-action: manipulation;
      transition:
        transform 140ms ease,
        background-color 140ms ease,
        border-color 140ms ease,
        opacity 140ms ease;
    }

    .trigger:hover {
      background: var(--rod-menu-hover);
      border-color: var(--rod-menu-border-strong);
    }

    .trigger:active {
      transform: scale(0.94);
    }

    .trigger:focus-visible,
    .command:focus-visible,
    .close:focus-visible {
      outline: 2px solid #0070f3;
      outline-offset: 2px;
    }

    .trigger svg {
      width: 15px;
      height: 15px;
    }

    .trigger[data-open="true"] svg {
      transform: rotate(180deg);
    }

    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      display: grid;
      place-items: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border: 2px solid var(--rod-menu-surface);
      border-radius: 999px;
      background: var(--rod-menu-text);
      color: var(--rod-menu-surface);
      font-size: 9px;
      font-weight: 700;
      line-height: 1;
      pointer-events: none;
    }

    .trigger-wrap {
      position: relative;
      pointer-events: auto;
    }

    .menu {
      pointer-events: auto;
      width: min(270px, calc(100vw - 20px));
      max-height: min(420px, calc(100vh - 70px));
      overflow: hidden;
      border: 1px solid var(--rod-menu-border);
      border-radius: var(--rod-menu-radius);
      background: var(--rod-menu-bg);
      color: var(--rod-menu-text);
      box-shadow: var(--rod-menu-shadow);
      backdrop-filter: blur(18px) saturate(1.2);
      -webkit-backdrop-filter: blur(18px) saturate(1.2);
      transform-origin: bottom right;
      transition:
        opacity 130ms ease,
        transform 130ms ease,
        visibility 130ms ease;
    }

    .menu[hidden] {
      display: block;
      visibility: hidden;
      opacity: 0;
      transform: translateY(5px) scale(0.97);
      pointer-events: none;
    }

    .menu:not([hidden]) {
      visibility: visible;
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .header {
      display: flex;
      align-items: center;
      gap: 9px;
      min-height: 43px;
      padding: 8px 8px 8px 11px;
      border-bottom: 1px solid var(--rod-menu-border);
    }

    .header-icon {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      flex: 0 0 auto;
      border: 1px solid var(--rod-menu-border);
      border-radius: 6px;
      background: var(--rod-menu-hover);
    }

    .header-icon svg {
      width: 12px;
      height: 12px;
    }

    .header-copy {
      min-width: 0;
      flex: 1;
    }

    .title {
      overflow: hidden;
      color: var(--rod-menu-text);
      font-size: 12px;
      font-weight: 600;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subtitle {
      margin-top: 1px;
      color: var(--rod-menu-muted);
      font-size: 10px;
      line-height: 1.25;
    }

    .close {
      display: grid;
      place-items: center;
      width: 27px;
      height: 27px;
      padding: 0;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: var(--rod-menu-muted);
      cursor: pointer;
      touch-action: manipulation;
    }

    .close:hover {
      background: var(--rod-menu-hover);
      color: var(--rod-menu-text);
    }

    .close svg {
      width: 13px;
      height: 13px;
    }

    .commands {
      display: grid;
      gap: 1px;
      max-height: min(355px, calc(100vh - 130px));
      padding: 5px;
      overflow: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
    }

    .command {
      display: grid;
      grid-template-columns: 26px minmax(0, 1fr) 16px;
      align-items: center;
      gap: 7px;
      width: 100%;
      min-height: 39px;
      padding: 5px 7px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--rod-menu-text);
      text-align: left;
      cursor: pointer;
      touch-action: manipulation;
      transition:
        background-color 100ms ease,
        transform 100ms ease;
    }

    .command:hover {
      background: var(--rod-menu-hover);
    }

    .command:active {
      transform: scale(0.985);
    }

    .command[disabled] {
      cursor: wait;
      opacity: 0.62;
    }

    .command-icon {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border: 1px solid var(--rod-menu-border);
      border-radius: 7px;
      background: var(--rod-menu-surface);
      color: var(--rod-menu-muted);
    }

    .command-icon svg {
      width: 13px;
      height: 13px;
    }

    .command-content {
      min-width: 0;
    }

    .command-label {
      overflow: hidden;
      color: var(--rod-menu-text);
      font-size: 11px;
      font-weight: 550;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .command-description {
      display: -webkit-box;
      overflow: hidden;
      margin-top: 2px;
      color: var(--rod-menu-muted);
      font-size: 9.5px;
      line-height: 1.25;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .command-arrow {
      display: grid;
      place-items: center;
      color: var(--rod-menu-muted);
    }

    .command-arrow svg {
      width: 12px;
      height: 12px;
    }

    .empty {
      padding: 18px 12px;
      color: var(--rod-menu-muted);
      font-size: 10px;
      line-height: 1.5;
      text-align: center;
    }

    .footer {
      padding: 6px 10px;
      border-top: 1px solid var(--rod-menu-border);
      color: var(--rod-menu-muted);
      font-size: 9px;
      line-height: 1.3;
      text-align: center;
    }

    .toast {
      position: absolute;
      right: 0;
      bottom: 43px;
      display: flex;
      align-items: center;
      gap: 7px;
      width: max-content;
      max-width: min(270px, calc(100vw - 20px));
      padding: 8px 10px;
      border: 1px solid var(--rod-menu-border);
      border-radius: 9px;
      background: var(--rod-menu-surface);
      color: var(--rod-menu-text);
      box-shadow: var(--rod-menu-shadow);
      font-size: 10px;
      line-height: 1.3;
      opacity: 0;
      transform: translateY(5px);
      transition:
        opacity 150ms ease,
        transform 150ms ease;
      pointer-events: none;
    }

    .toast[data-visible="true"] {
      opacity: 1;
      transform: translateY(0);
    }

    .toast svg {
      width: 13px;
      height: 13px;
      flex: 0 0 auto;
    }

    @media (max-width: 480px) {
      .root {
        right: max(8px, env(safe-area-inset-right));
        bottom: max(8px, env(safe-area-inset-bottom));
      }

      .menu {
        width: min(260px, calc(100vw - 16px));
      }

      .command {
        min-height: 42px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        scroll-behavior: auto !important;
        transition-duration: 0.001ms !important;
        animation-duration: 0.001ms !important;
      }
    }
  `;

  function normalizeOptions(accessKeyOrOptions) {
    if (
      accessKeyOrOptions &&
      typeof accessKeyOrOptions === "object" &&
      !Array.isArray(accessKeyOrOptions)
    ) {
      return {
        accessKey:
          typeof accessKeyOrOptions.accessKey === "string"
            ? accessKeyOrOptions.accessKey
            : undefined,
        autoClose: accessKeyOrOptions.autoClose !== false,
        description:
          accessKeyOrOptions.description ??
          accessKeyOrOptions.title ??
          accessKeyOrOptions.tooltip ??
          "",
        icon: accessKeyOrOptions.icon ?? "",
        id:
          typeof accessKeyOrOptions.id === "string"
            ? accessKeyOrOptions.id
            : undefined,
        native: accessKeyOrOptions.native !== false,
      };
    }

    return {
      accessKey:
        typeof accessKeyOrOptions === "string"
          ? accessKeyOrOptions
          : undefined,
      autoClose: true,
      description: "",
      icon: "",
      id: undefined,
      native: true,
    };
  }

  function createCommandId(options) {
    if (options.id) {
      return options.id;
    }

    commandSequence += 1;
    return `rod-gm-command-${commandSequence}`;
  }

  function getPageTitle() {
    const title = document.title?.trim();

    if (title) {
      return title.length > 44 ? `${title.slice(0, 41)}…` : title;
    }

    return location.hostname || "Userscript";
  }

  function ensureMounted() {
    if (host?.isConnected && shadowRoot) {
      return true;
    }

    if (!document.documentElement) {
      scheduleMount();
      return false;
    }

    const staleHost = document.getElementById(HOST_ID);

    if (staleHost) {
      staleHost.remove();
    }

    host = document.createElement("div");
    host.id = HOST_ID;
    host.setAttribute("data-rod-gm-menu", "");

    Object.assign(host.style, {
      all: "initial",
      position: "fixed",
      inset: "auto 0 0 auto",
      zIndex: MAX_Z_INDEX,
    });

    shadowRoot = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = css;

    const root = document.createElement("div");
    root.className = "root";

    menu = document.createElement("section");
    menu.className = "menu";
    menu.hidden = true;
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Userscript actions");

    const header = document.createElement("header");
    header.className = "header";
    header.innerHTML = `
      <span class="header-icon">${icons.logo}</span>
      <span class="header-copy">
        <span class="title">${escapeHTML(getPageTitle())}</span>
        <span class="subtitle">Userscript actions</span>
      </span>
      <button class="close" type="button" aria-label="Fechar menu">
        ${icons.close}
      </button>
    `;

    commandsContainer = document.createElement("div");
    commandsContainer.className = "commands";
    commandsContainer.setAttribute("role", "presentation");

    emptyState = document.createElement("div");
    emptyState.className = "empty";
    emptyState.textContent = "Nenhuma ação registrada.";

    const footer = document.createElement("footer");
    footer.className = "footer";
    footer.textContent = "Toque em uma ação para executá-la";

    const triggerWrap = document.createElement("div");
    triggerWrap.className = "trigger-wrap";

    triggerButton = document.createElement("button");
    triggerButton.className = "trigger";
    triggerButton.type = "button";
    triggerButton.innerHTML = icons.logo;
    triggerButton.title = "Abrir ações do userscript";
    triggerButton.setAttribute("aria-label", "Abrir ações do userscript");
    triggerButton.setAttribute("aria-expanded", "false");
    triggerButton.dataset.open = "false";

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.setAttribute("aria-hidden", "true");

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    menu.append(header, commandsContainer, footer);
    triggerWrap.append(triggerButton, badge);
    root.append(menu, triggerWrap, toast);
    shadowRoot.append(style, root);
    document.documentElement.appendChild(host);

    triggerButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(!isOpen);
    });

    header.querySelector(".close").addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    });

    shadowRoot.addEventListener("click", event => {
      event.stopPropagation();
    });

    document.addEventListener(
      "pointerdown",
      event => {
        if (!isOpen || event.composedPath().includes(host)) {
          return;
        }

        setOpen(false);
      },
      true,
    );

    document.addEventListener(
      "keydown",
      event => {
        if (event.key === "Escape" && isOpen) {
          setOpen(false);
          triggerButton?.focus();
        }
      },
      true,
    );

    renderCommands();
    return true;
  }

  function scheduleMount() {
    if (mountScheduled) {
      return;
    }

    mountScheduled = true;

    const tryMount = () => {
      mountScheduled = false;

      if (!ensureMounted()) {
        setTimeout(scheduleMount, 25);
      }
    };

    if (document.documentElement) {
      queueMicrotask(tryMount);
      return;
    }

    document.addEventListener("readystatechange", tryMount, { once: true });
    setTimeout(tryMount, 0);
  }

  function setOpen(nextOpen) {
    if (!ensureMounted()) {
      return;
    }

    isOpen = Boolean(nextOpen);
    menu.hidden = !isOpen;
    triggerButton.dataset.open = String(isOpen);
    triggerButton.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      const firstCommand = commandsContainer.querySelector(".command");
      requestAnimationFrame(() => firstCommand?.focus());
    }
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderIcon(command) {
    if (typeof command.icon === "string" && command.icon.trim()) {
      const icon = command.icon.trim();

      if (
        icon.startsWith("<svg") ||
        icon.startsWith("data:image/") ||
        icon.startsWith("http://") ||
        icon.startsWith("https://")
      ) {
        if (icon.startsWith("<svg")) {
          return icon;
        }

        return `<img src="${escapeHTML(icon)}" alt="" style="width:13px;height:13px;object-fit:contain">`;
      }

      return `<span aria-hidden="true">${escapeHTML(icon)}</span>`;
    }

    return icons.command;
  }

  function renderCommands() {
    if (!ensureMounted()) {
      return;
    }

    commandsContainer.replaceChildren();

    const commandList = Array.from(commands.values());

    if (commandList.length === 0) {
      commandsContainer.append(emptyState);
    } else {
      for (const command of commandList) {
        const button = document.createElement("button");

        button.className = "command";
        button.type = "button";
        button.dataset.commandId = command.id;
        button.setAttribute("role", "menuitem");

        if (command.accessKey) {
          button.accessKey = command.accessKey;
        }

        const description = command.description
          ? `<span class="command-description">${escapeHTML(command.description)}</span>`
          : "";

        button.innerHTML = `
          <span class="command-icon">${renderIcon(command)}</span>
          <span class="command-content">
            <span class="command-label">${escapeHTML(command.caption)}</span>
            ${description}
          </span>
          <span class="command-arrow">${icons.arrow}</span>
        `;

        button.addEventListener("click", () => {
          executeCommand(command, button);
        });

        commandsContainer.append(button);
      }
    }

    const badge = shadowRoot.querySelector(".badge");
    const count = commandList.length;

    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
    host.style.display = count === 0 ? "none" : "";
  }

  async function executeCommand(command, button) {
    if (command.running) {
      return;
    }

    command.running = true;
    button.disabled = true;

    const arrow = button.querySelector(".command-arrow");
    const previousArrow = arrow.innerHTML;

    arrow.innerHTML = `
      <span style="
        display:block;
        width:11px;
        height:11px;
        border:1.5px solid currentColor;
        border-right-color:transparent;
        border-radius:999px;
        animation:rod-gm-spin .65s linear infinite
      "></span>
      <style>
        @keyframes rod-gm-spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;

    try {
      await command.callback();

      arrow.innerHTML = icons.check;
      showToast(`“${command.caption}” executado`, "success");

      if (command.autoClose) {
        setTimeout(() => setOpen(false), 160);
      }
    } catch (error) {
      console.error(
        `[GM menu patch] A ação "${command.caption}" falhou:`,
        error,
      );

      arrow.innerHTML = icons.warning;
      showToast(
        error instanceof Error
          ? error.message
          : `Falha ao executar “${command.caption}”`,
        "error",
      );
    } finally {
      command.running = false;

      setTimeout(() => {
        if (button.isConnected) {
          button.disabled = false;
          arrow.innerHTML = previousArrow;
        }
      }, 900);
    }
  }

  let toastTimer = null;

  function showToast(message, type) {
    if (!ensureMounted()) {
      return;
    }

    const toast = shadowRoot.querySelector(".toast");

    clearTimeout(toastTimer);

    toast.innerHTML = `
      ${type === "error" ? icons.warning : icons.check}
      <span>${escapeHTML(message)}</span>
    `;

    toast.dataset.visible = "true";

    toastTimer = setTimeout(() => {
      toast.dataset.visible = "false";
    }, type === "error" ? 3500 : 1800);
  }

  function registerMenuCommand(caption, callback, accessKeyOrOptions) {
    if (typeof caption !== "string" || !caption.trim()) {
      throw new TypeError(
        "GM_registerMenuCommand: caption precisa ser uma string.",
      );
    }

    if (typeof callback !== "function") {
      throw new TypeError(
        "GM_registerMenuCommand: callback precisa ser uma função.",
      );
    }

    const options = normalizeOptions(accessKeyOrOptions);
    const id = createCommandId(options);

    commands.set(id, {
      id,
      caption: caption.trim(),
      callback,
      accessKey: options.accessKey,
      autoClose: options.autoClose,
      description: String(options.description || ""),
      icon: options.icon,
      running: false,
    });

    scheduleMount();

    /*
     * Também preserva o menu nativo do Tampermonkey/Violentmonkey quando
     * disponível. Passe { native: false } para registrar somente o botão.
     */
    if (options.native) {
      try {
        if (nativeRegisterMenuCommand) {
          nativeRegisterMenuCommand(
            caption,
            callback,
            options.accessKey,
          );
        } else if (modernRegisterMenuCommand) {
          modernRegisterMenuCommand(caption, callback, {
            id,
            accessKey: options.accessKey,
            autoClose: options.autoClose,
            title: options.description || caption,
          });
        }
      } catch (error) {
        console.warn(
          `[GM menu patch] Não foi possível registrar "${caption}" no menu nativo:`,
          error,
        );
      }
    }

    return id;
  }

  function unregisterMenuCommand(commandId) {
    const removed = commands.delete(String(commandId));

    if (removed) {
      renderCommands();
    }

    return removed;
  }

  const api = {
    commands,
    register: registerMenuCommand,
    unregister: unregisterMenuCommand,
    open() {
      setOpen(true);
    },
    close() {
      setOpen(false);
    },
    toggle() {
      setOpen(!isOpen);
    },
    destroy() {
      host?.remove();
      host = null;
      shadowRoot = null;
      triggerButton = null;
      menu = null;
      commandsContainer = null;
      emptyState = null;
      isOpen = false;
    },
  };

  global[PATCH_KEY] = api;
  global.GM_registerMenuCommand = registerMenuCommand;
  global.GM_unregisterMenuCommand = unregisterMenuCommand;

  scheduleMount();
})(globalThis);
