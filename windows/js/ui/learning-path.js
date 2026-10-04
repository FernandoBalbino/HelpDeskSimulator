(function createLearningPath(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const ICON_ROOT = "assets/learning/icons";
  const lanes = [0, 1, 2, 1];

  function safe(value) { return OSLab.ui.escapeHtml(value); }
  function icon(name) { return `${ICON_ROOT}/${name}.svg`; }
  function statusLabel(status, feminine = false) {
    const labels = feminine
      ? { completed: "Concluída", active: "Em andamento", available: "Disponível", locked: "Bloqueada" }
      : { completed: "Concluído", active: "Em andamento", available: "Disponível", locked: "Bloqueado" };
    return labels[status] || status;
  }
  function statusIcon(status) {
    return icon(status === "completed" ? "checkmark_circle" : status === "locked" ? "lock_closed" : status === "active" ? "play" : "target_arrow");
  }
  function connectorDirection(from, to) {
    if (to > from) return "is-down-right";
    if (to < from) return "is-down-left";
    return "is-down";
  }
  function nodeMarkup(item, index, selectedId, kind, hasNext) {
    const lane = lanes[index % lanes.length];
    const nextLane = lanes[(index + 1) % lanes.length];
    const isMission = kind === "mission" || kind === "vpn-mission" || kind === "install-mission" || kind === "browser-mission";
    const feminine = isMission;
    const selectAttr = kind === "mission"
      ? "data-mission-select"
      : kind === "vpn-mission"
        ? "data-vpn-mission-select"
        : kind === "install-mission"
          ? "data-install-mission-select"
          : kind === "browser-mission"
            ? "data-browser-mission-select"
        : "data-exercise-select";
    const connector = !hasNext ? "" : `<img class="learning-connector lane-${lane} ${connectorDirection(lane, nextLane)}" src="${icon("arrow_right")}" alt="" aria-hidden="true" />`;
    return `<div class="learning-step lane-${lane}">
      <button type="button" class="learning-node is-${item.status} ${item.id === selectedId ? "is-selected" : ""}" ${selectAttr}="${safe(item.id)}" ${item.status === "locked" ? "disabled" : ""} ${item.status === "active" ? 'aria-current="step"' : ""} aria-label="${safe(`${isMission ? "Missão" : "Exercício"} ${item.order}: ${item.title}. ${statusLabel(item.status, feminine)}`)}">
        <span class="learning-node-face"><img src="${safe(item.icon)}" alt="" /></span>
        <span class="learning-node-state"><img src="${statusIcon(item.status)}" alt="" /></span>
        <span class="learning-node-number">${String(item.order).padStart(2, "0")}</span>
      </button>
      <span class="learning-node-label"><strong>${safe(item.title)}</strong><small>${statusLabel(item.status, feminine)}</small></span>
    </div>${connector}`;
  }

  function renderSections(items, sections, selectedId, kind) {
    return sections.map((section) => {
      const sectionItems = items.filter((item) => section.orders.includes(item.order));
      return `<section class="learning-unit" aria-labelledby="${kind}-unit-${section.slug}">
        <header><span><img src="${icon(section.icon || "ribbon")}" alt="" /></span><div><small>${safe(section.kicker)}</small><h2 id="${kind}-unit-${section.slug}">${safe(section.title)}</h2><p>${safe(section.description)}</p></div></header>
        <div class="learning-path" role="list">${sectionItems.map((item, index) => nodeMarkup(item, index, selectedId, kind, index < sectionItems.length - 1)).join("")}</div>
      </section>`;
    }).join("");
  }

  function renderHint(hint, label = "Dica passo a passo") {
    if (!hint) return "";
    return `<section class="learning-hint" data-learning-hint><header><img src="${icon("lightbulb")}" alt="" /><span><small>${safe(label)}</small><strong>${safe(hint.title)}</strong></span></header><p>${safe(hint.intro)}</p><ol>${hint.steps.map((step) => `<li>${safe(step)}</li>`).join("")}</ol><div class="learning-hint-check"><img src="${icon("checkmark_circle")}" alt="" /><span><strong>Como conferir</strong>${safe(hint.check)}</span></div></section>`;
  }

  function actionIcon(name) { return `<img src="${icon(name)}" alt="" />`; }

  OSLab.learningPath = {
    icon,
    safe,
    statusLabel,
    statusIcon,
    renderSections,
    renderHint,
    actionIcon,
  };
})(window);
