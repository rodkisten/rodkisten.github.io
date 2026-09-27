(() => {
  "use strict";

  let CONFIG = window.REVIEW_CONFIG || { version: "fallback", labels: [], groups: [] };

  const state = {
    loaded: false,
    finished: false,
    index: 0,
    items: []
  };

  const $ = (id) => document.getElementById(id);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeConfig(value) {
    const raw = value && typeof value === "object" ? clone(value) : {};
    return {
      version: String(raw.version || "unknown"),
      schema: raw.schema || null,
      labels: Array.isArray(raw.labels) ? raw.labels : [],
      groups: Array.isArray(raw.groups) ? raw.groups : []
    };
  }

  function normalizeToken(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");
  }

  function collectPredictionTokens(prediction) {
    const tokens = new Set();

    function walk(value, keyHint = "") {
      if (value == null) return;

      if (typeof value === "string") {
        tokens.add(normalizeToken(value));
        if (keyHint) tokens.add(normalizeToken(keyHint + ":" + value));
        return;
      }

      if (typeof value === "boolean") {
        if (value && keyHint) tokens.add(normalizeToken(keyHint));
        return;
      }

      if (typeof value === "number") return;

      if (Array.isArray(value)) {
        for (const entry of value) walk(entry, keyHint);
        return;
      }

      if (typeof value === "object") {
        if (typeof value.label === "string") {
          const score =
            typeof value.score === "number" ? value.score :
            typeof value.confidence === "number" ? value.confidence :
            1;

          if (score >= 0.5) tokens.add(normalizeToken(value.label));
        }

        for (const [key, child] of Object.entries(value)) {
          if (child === true) tokens.add(normalizeToken(key));
          walk(child, key);
        }
      }
    }

    walk(prediction);
    return tokens;
  }

  function aliasMatches(tokens, aliases) {
    return (aliases || []).some((alias) => tokens.has(normalizeToken(alias)));
  }

  function predictionValueForGroup(prediction, group) {
    const keys = [group.id, ...(group.aliases || [])];

    for (const key of keys) {
      const direct =
        prediction?.attributes?.[key] ??
        prediction?.predictions?.[key] ??
        prediction?.[key];

      const directValue =
        typeof direct === "string" ? direct :
        direct && typeof direct === "object"
          ? direct.value ?? direct.label ?? direct.class
          : null;

      if (directValue != null) return normalizeToken(directValue);
    }

    return null;
  }

  function suggestionState(prediction) {
    const tokens = collectPredictionTokens(prediction);
    const labels = {};
    const groups = {};

    for (const def of CONFIG.labels) {
      labels[def.id] = aliasMatches(tokens, [def.id, ...(def.aliases || [])]);
    }

    for (const group of CONFIG.groups) {
      groups[group.id] = null;

      for (const option of group.options || []) {
        if (aliasMatches(tokens, [option.id, ...(option.aliases || [])])) {
          groups[group.id] = option.id;
          break;
        }
      }

      const directValue = predictionValueForGroup(prediction, group);

      if (directValue) {
        const matching = (group.options || []).find((option) =>
          [option.id, ...(option.aliases || [])]
            .map(normalizeToken)
            .includes(directValue)
        );

        if (matching) groups[group.id] = matching.id;
      }
    }

    return { labels, groups };
  }

  function prepareItem(raw, index) {
    const prediction = raw.prediction || raw.predictions || {};
    const suggested = suggestionState(prediction);

    return {
      index,
      source_index:
        Number.isInteger(raw.source_index) ? raw.source_index :
        Number.isInteger(raw?.source?.index) ? raw.source.index :
        index,
      id: raw.id || raw.asset_id || raw.sha256 || `item-${index + 1}`,
      name: raw.name || raw.filename || `Imagem ${index + 1}`,
      source: raw.source || null,
      image_data_url: raw.image_data_url || null,
      prediction,
      suggested,
      selected_labels: { ...suggested.labels },
      selected_groups: { ...suggested.groups },
      reviewed: false,
      skipped: false,
      changed: false
    };
  }

  function keywordsFor(item) {
    const keywords = [];

    for (const def of CONFIG.labels) {
      if (item.selected_labels[def.id] && def.keyword) {
        keywords.push(def.keyword);
      }
    }

    for (const group of CONFIG.groups) {
      const selected = item.selected_groups[group.id];
      const option = (group.options || []).find((entry) => entry.id === selected);
      if (option?.keyword) keywords.push(option.keyword);
    }

    return [...new Set(keywords)];
  }

  function positiveLabelsFor(item) {
    const labels = [];

    for (const def of CONFIG.labels) {
      if (item.selected_labels[def.id]) labels.push(def.id);
    }

    for (const group of CONFIG.groups) {
      const selected = item.selected_groups[group.id];
      if (selected) labels.push(selected);
    }

    return [...new Set(labels)];
  }

  function exportItem(item) {
    return {
      index: item.index,
      source_index: item.source_index,
      id: item.id,
      name: item.name,
      source: clone(item.source),
      reviewed: item.reviewed,
      skipped: item.skipped,
      changed: item.changed,
      labels: clone(item.selected_labels),
      attributes: clone(item.selected_groups),
      positive_labels: positiveLabelsFor(item),
      keywords: keywordsFor(item),
      model_suggestions: clone(item.suggested),
      prediction: clone(item.prediction)
    };
  }

  function exportResult() {
    const reviewed = state.items.filter((item) => item.reviewed && !item.skipped).length;
    const skipped = state.items.filter((item) => item.skipped).length;

    return {
      ok: true,
      schema: "photo-review-v3",
      ui_version: CONFIG.version,
      finished: state.finished,
      total: state.items.length,
      reviewed_count: reviewed,
      skipped_count: skipped,
      pending_count: state.items.length - reviewed - skipped,
      current_index: state.index,
      items: state.items.map(exportItem)
    };
  }

  function toggleLabel(id) {
    const item = state.items[state.index];
    item.selected_labels[id] = !item.selected_labels[id];
    item.changed = true;
    item.skipped = false;
    render();
  }

  function toggleGroup(groupId, optionId) {
    const item = state.items[state.index];
    item.selected_groups[groupId] =
      item.selected_groups[groupId] === optionId ? null : optionId;
    item.changed = true;
    item.skipped = false;
    render();
  }

  function acceptSuggestions() {
    const item = state.items[state.index];
    item.selected_labels = { ...item.suggested.labels };
    item.selected_groups = { ...item.suggested.groups };
    item.changed = false;
    item.skipped = false;
    render();
  }

  function clearSelections() {
    const item = state.items[state.index];

    for (const def of CONFIG.labels) item.selected_labels[def.id] = false;
    for (const group of CONFIG.groups) item.selected_groups[group.id] = null;

    item.changed = true;
    item.skipped = false;
    render();
  }

  function saveCurrent() {
    const item = state.items[state.index];
    item.reviewed = true;
    item.skipped = false;

    if (state.index < state.items.length - 1) state.index += 1;
    render();
  }

  function skipCurrent() {
    const item = state.items[state.index];
    item.skipped = true;
    item.reviewed = false;

    if (state.index < state.items.length - 1) state.index += 1;
    render();
  }

  function finish() {
    state.finished = true;
    const result = exportResult();

    $("doneSummary").textContent =
      `${result.reviewed_count} revisada(s) · ` +
      `${result.pending_count} pendente(s) · ` +
      `${result.skipped_count} pulada(s)`;

    $("doneOverlay").hidden = false;
  }

  function chip(def, selected, suggested, onclick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "chip" +
      (selected ? " is-selected" : "") +
      (suggested ? " is-suggested" : "");

    button.textContent = def.title;
    button.addEventListener("click", onclick);
    return button;
  }

  function renderPhoto(item) {
    const shell = document.createElement("section");
    shell.className = "photo-shell";

    if (item.image_data_url) {
      const image = document.createElement("img");
      image.src = item.image_data_url;
      image.alt = "";
      shell.appendChild(image);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "empty-state";
      fallback.innerHTML = "<p>Preview indisponível</p>";
      shell.appendChild(fallback);
    }

    const meta = document.createElement("div");
    meta.className = "photo-meta";
    meta.innerHTML =
      `<span>${escapeHTML(item.name)}</span>` +
      `<span>#${item.index + 1}</span>`;

    shell.appendChild(meta);
    return shell;
  }

  function groupedLabelSections() {
    const sections = new Map();

    for (const def of CONFIG.labels) {
      const id = def.group_id || "details";
      const title = def.group_title || "Detalhes";

      if (!sections.has(id)) sections.set(id, { id, title, labels: [] });
      sections.get(id).labels.push(def);
    }

    return [...sections.values()];
  }

  function renderLabelSection(item, section) {
    if (!section.labels.length) return null;

    const panel = document.createElement("section");
    panel.className = "panel";

    const heading = document.createElement("div");
    heading.className = "panel-line";
    heading.innerHTML =
      `<h2 class="panel-title">${escapeHTML(section.title)}</h2>` +
      `<span class="panel-help">toque = confirmar · vazio = incerto</span>`;

    panel.appendChild(heading);

    const chips = document.createElement("div");
    chips.className = "chips";

    for (const def of section.labels) {
      chips.appendChild(
        chip(
          def,
          Boolean(item.selected_labels[def.id]),
          Boolean(item.suggested.labels[def.id]),
          () => toggleLabel(def.id)
        )
      );
    }

    panel.appendChild(chips);
    return panel;
  }

  function renderGroupPanel(item, group) {
    const panel = document.createElement("section");
    panel.className = "panel";

    const heading = document.createElement("div");
    heading.className = "panel-line";
    heading.innerHTML =
      `<h2 class="panel-title">${escapeHTML(group.title)}</h2>` +
      `<span class="panel-help">${escapeHTML(group.help || "sem seleção = incerto")}</span>`;

    panel.appendChild(heading);

    const chips = document.createElement("div");
    chips.className = "chips";

    for (const option of group.options || []) {
      chips.appendChild(
        chip(
          option,
          item.selected_groups[group.id] === option.id,
          item.suggested.groups[group.id] === option.id,
          () => toggleGroup(group.id, option.id)
        )
      );
    }

    panel.appendChild(chips);
    return panel;
  }

  function hasSuggestions(item) {
    return (
      Object.values(item.suggested.labels || {}).some(Boolean) ||
      Object.values(item.suggested.groups || {}).some(Boolean)
    );
  }

  function render() {
    if (!state.loaded || !state.items.length) return;

    const item = state.items[state.index];
    const app = $("app");
    app.replaceChildren();

    app.appendChild(renderPhoto(item));

    for (const section of groupedLabelSections()) {
      const panel = renderLabelSection(item, section);
      if (panel) app.appendChild(panel);
    }

    for (const group of CONFIG.groups) {
      app.appendChild(renderGroupPanel(item, group));
    }

    const quickRow = document.createElement("div");
    quickRow.className = "quick-row";

    if (hasSuggestions(item)) {
      const accept = document.createElement("button");
      accept.type = "button";
      accept.className = "quick-action";
      accept.textContent = "↺ Sugestões do modelo";
      accept.addEventListener("click", acceptSuggestions);
      quickRow.appendChild(accept);
    }

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "quick-action";
    clear.textContent = "Limpar seleção";
    clear.addEventListener("click", clearSelections);
    quickRow.appendChild(clear);

    app.appendChild(quickRow);

    if (item.prediction && Object.keys(item.prediction).length) {
      const details = document.createElement("details");
      details.className = "prediction-details";
      details.innerHTML =
        `<summary>Predição original</summary>` +
        `<pre>${escapeHTML(JSON.stringify(item.prediction, null, 2))}</pre>`;
      app.appendChild(details);
    }

    const reviewed = state.items.filter((entry) => entry.reviewed && !entry.skipped).length;

    $("position").textContent = `${state.index + 1} / ${state.items.length}`;
    $("reviewCounter").textContent = `${reviewed} revisadas`;
    $("progressBar").style.width =
      `${((state.index + 1) / state.items.length) * 100}%`;

    $("previousButton").disabled = state.index === 0;
    $("nextButton").disabled = state.index === state.items.length - 1;
  }

  function escapeHTML(value) {
    const node = document.createElement("div");
    node.textContent = String(value ?? "");
    return node.innerHTML;
  }

  $("previousButton").addEventListener("click", () => {
    if (state.index > 0) {
      state.index -= 1;
      render();
    }
  });

  $("nextButton").addEventListener("click", () => {
    if (state.index < state.items.length - 1) {
      state.index += 1;
      render();
    }
  });

  $("saveButton").addEventListener("click", saveCurrent);
  $("skipButton").addEventListener("click", skipCurrent);
  $("finishButton").addEventListener("click", finish);

  window.ReviewApp = {
    ready: true,

    load(payload) {
      if (!payload || !Array.isArray(payload.items)) {
        throw new Error("Payload inválido: items[] é obrigatório.");
      }

      CONFIG = normalizeConfig(payload.taxonomy || window.REVIEW_CONFIG);
      state.items = payload.items.map(prepareItem);
      state.index = Math.max(
        0,
        Math.min(Number(payload.start_index || 0), Math.max(0, state.items.length - 1))
      );
      state.finished = false;
      state.loaded = true;
      $("doneOverlay").hidden = true;

      render();
      return {
        ok: true,
        total: state.items.length,
        ui_version: CONFIG.version,
        taxonomy_schema: CONFIG.schema || null
      };
    },

    exportResult,

    dismissOverlay() {
      $("doneOverlay").hidden = true;
    }
  };
})();
