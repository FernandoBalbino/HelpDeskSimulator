(function createLearningAssistant(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  let root = null;
  let collapsed = false;

  function safe(value) { return OSLab.ui.escapeHtml(value); }
  function icon(name) { return OSLab.learningPath.icon(name); }
  function mascot(state) { return `assets/learning/mascot/oslab-mascot-${state}.png`; }
  function ensure() {
    if (root) return root;
    root = document.createElement("aside");
    root.className = "learning-assistant is-hidden";
    root.setAttribute("aria-live", "polite");
    root.addEventListener("click", handleClick);
    document.querySelector("#desktop")?.appendChild(root);
    return root;
  }
  function place() {
    const focusedLayout = document.querySelector(".missions-window.is-focused .learning-layout, .exercises-window.is-focused .learning-layout, .vpn-lab-window.is-focused .learning-layout, .install-lab-window.is-focused .learning-layout, .browser-trail-window.is-focused .learning-layout");
    const host = focusedLayout || document.querySelector("#desktop");
    if (host && root.parentElement !== host) host.appendChild(root);
    root.classList.toggle("is-docked", Boolean(focusedLayout));
  }
  function hintMarkup(hint, label) {
    return hint ? OSLab.learningPath.renderHint(hint, label) : "";
  }
  function objectiveMarkup(mission, active) {
    return `<ul class="assistant-checklist">${mission.objectives.map((objective) => `<li class="${active.checklist[objective.id] ? "is-done" : ""}"><img src="${icon(active.checklist[objective.id] ? "checkmark_circle" : "target_arrow")}" alt="" /><span>${safe(objective.label)}</span></li>`).join("")}</ul>`;
  }
  function exercisePhaseLabel(phase) {
    return ({ preparing: "Preparando ambiente", investigating: "Investigando", partial: "Continue investigando", "awaiting-test": "Pronto para testar", testing: "Testando correção", completed: "Exercício concluído" })[phase] || "Atividade em andamento";
  }
  function renderMission(progress) {
    const active = progress.active;
    const mission = OSLab.missionCatalog.find((entry) => entry.id === active.id);
    const hint = OSLab.missions.getHint();
    const nextObjective = mission.objectives.find((objective) => !active.checklist[objective.id]);
    return {
      kind: "mission",
      mascot: hint ? "help" : "neutral",
      eyebrow: "Missão ativa",
      title: mission.title,
      message: nextObjective ? `Próximo objetivo: ${nextObjective.label}` : "Objetivos concluídos. Aguarde a confirmação da missão.",
      body: `${objectiveMarkup(mission, active)}${hintMarkup(hint, "Dica da missão")}`,
      actions: `<button type="button" data-assistant-action="mission-hint"><img src="${icon("lightbulb")}" alt="" />${hint ? "Reabrir dica" : "Dica"}</button><button type="button" data-assistant-action="mission-open"><img src="${icon("target_arrow")}" alt="" />Abrir trilha</button><button type="button" data-assistant-action="mission-restart"><img src="${icon("arrow_reset")}" alt="" />Reiniciar</button><button type="button" data-assistant-action="mission-exit"><img src="${icon("dismiss")}" alt="" />Sair</button>`,
    };
  }
  function renderExercise(session) {
    const exercise = OSLab.exerciseCatalog.find((entry) => entry.id === session.id);
    const hint = OSLab.exercises.getHint();
    const completed = session.phase === "completed";
    return {
      kind: "exercise",
      mascot: completed ? "celebrate" : hint ? "help" : "neutral",
      eyebrow: exercisePhaseLabel(session.phase),
      title: exercise.title,
      message: session.speech,
      body: `${hint && !completed ? hintMarkup(hint, "Dica passo a passo") : ""}${completed ? `<div class="assistant-result"><span><strong>Causa</strong>${safe(session.result.cause)}</span><span><strong>Ferramenta</strong>${safe(session.result.tool)}</span><span><strong>Dica</strong>${session.result.hintUsed ? "Utilizada" : "Não utilizada"}</span></div>` : ""}`,
      actions: completed
        ? `<button type="button" data-assistant-action="exercise-return"><img src="${icon("arrow_left")}" alt="" />Voltar</button><button type="button" data-assistant-action="exercise-repeat"><img src="${icon("arrow_reset")}" alt="" />Refazer</button><button class="is-primary" type="button" data-assistant-action="exercise-next"><img src="${icon("arrow_right")}" alt="" />Próximo</button>`
        : `<button type="button" data-assistant-action="exercise-hint"><img src="${icon("lightbulb")}" alt="" />${hint ? "Reabrir dica" : "Dica"}</button><button type="button" data-assistant-action="exercise-repeat-speech"><img src="${icon("more_horizontal")}" alt="" />Repetir fala</button><button class="is-primary" type="button" data-assistant-action="exercise-test"><img src="${icon("play")}" alt="" />Testar</button><button type="button" data-assistant-action="exercise-restart"><img src="${icon("arrow_reset")}" alt="" />Reiniciar</button><button type="button" data-assistant-action="exercise-exit"><img src="${icon("dismiss")}" alt="" />Sair</button>`,
    };
  }
  function renderVpnLab(progress) {
    const active = progress.active;
    const mission = OSLab.vpnMissionCatalog.find((entry) => entry.id === active.id);
    const hint = OSLab.vpnLab.getHint();
    const completed = active.phase === "completed";
    const hasNext = mission.order < OSLab.vpnMissionCatalog.length;
    const nextObjective = mission.objectives.find((objective) => !active.checklist?.[objective.id]);
    const checklist = `<ul class="assistant-checklist">${mission.objectives.map((objective) => `<li class="${active.checklist?.[objective.id] ? "is-done" : ""}"><img src="${icon(active.checklist?.[objective.id] ? "checkmark_circle" : "target_arrow")}" alt="" /><span>${safe(objective.label)}</span></li>`).join("")}</ul>`;
    return {
      kind: "vpn-lab",
      mascot: completed ? "celebrate" : hint ? "help" : "neutral",
      eyebrow: completed ? "Missão VPN concluída" : "Laboratório VPN",
      title: mission.title,
      message: completed ? mission.success : nextObjective ? `Próximo objetivo: ${nextObjective.label}` : "Observe o resultado no sistema e atualize a página quando necessário.",
      body: `${completed ? `<div class="assistant-result"><span><strong>Conceito</strong>${safe(mission.success)}</span></div>` : checklist}${hint && !completed ? hintMarkup(hint, `Dica ${active.hintsUsed} de ${mission.hints.length}`) : ""}`,
      actions: completed
        ? `<button type="button" data-assistant-action="vpn-lab-return"><img src="${icon("arrow_left")}" alt="" />Voltar</button><button type="button" data-assistant-action="vpn-lab-repeat"><img src="${icon("arrow_reset")}" alt="" />Refazer</button><button class="is-primary" type="button" data-assistant-action="vpn-lab-next"><img src="${icon(hasNext ? "arrow_right" : "target_arrow")}" alt="" />${hasNext ? "Próxima" : "Ver trilha"}</button>`
        : `<button type="button" data-assistant-action="vpn-lab-hint"><img src="${icon("lightbulb")}" alt="" />${active.hintsUsed >= mission.hints.length ? `Rever dica ${mission.hints.length}/${mission.hints.length}` : active.hintsUsed ? `Próxima dica ${active.hintsUsed + 1}/${mission.hints.length}` : "Dica 1/3"}</button><button type="button" data-assistant-action="vpn-lab-browser"><img src="${icon("globe_search")}" alt="" />Navegador</button><button type="button" data-assistant-action="vpn-lab-vpn"><img src="${icon("shield_checkmark")}" alt="" />VPN</button><button type="button" data-assistant-action="vpn-lab-open"><img src="${icon("target_arrow")}" alt="" />Trilha</button><button type="button" data-assistant-action="vpn-lab-exit"><img src="${icon("dismiss")}" alt="" />Sair</button>`,
    };
  }
  function renderInstallLab(progress) {
    const active = progress.active;
    const mission = OSLab.installMissionCatalog.find((entry) => entry.id === active.id);
    const hint = OSLab.installLab.getHint();
    const completed = active.phase === "completed";
    const hasNext = mission.order < OSLab.installMissionCatalog.length;
    const nextObjective = mission.objectives.find((objective) => !active.checklist?.[objective.id]);
    const checklist = `<ul class="assistant-checklist">${mission.objectives.map((objective) => `<li class="${active.checklist?.[objective.id] ? "is-done" : ""}"><img src="${icon(active.checklist?.[objective.id] ? "checkmark_circle" : "target_arrow")}" alt="" /><span>${safe(objective.label)}</span></li>`).join("")}</ul>`;
    return {
      kind: "install-lab",
      mascot: completed ? "celebrate" : hint ? "help" : "neutral",
      eyebrow: completed ? "Missão concluída" : "Instalação de Programas",
      title: mission.title,
      message: completed ? mission.success : nextObjective ? `Próximo objetivo: ${nextObjective.label}` : mission.instruction,
      body: `${completed ? `<div class="assistant-result"><span><strong>Aprendizado</strong>${safe(mission.success)}</span></div>` : checklist}${hint && !completed ? hintMarkup(hint, "Dica da missão") : ""}`,
      actions: completed
        ? `<button type="button" data-assistant-action="install-lab-return"><img src="${icon("arrow_left")}" alt="" />Voltar</button><button type="button" data-assistant-action="install-lab-repeat"><img src="${icon("arrow_reset")}" alt="" />Refazer</button><button class="is-primary" type="button" data-assistant-action="install-lab-next"><img src="${icon(hasNext ? "arrow_right" : "target_arrow")}" alt="" />${hasNext ? "Próxima" : "Ver trilha"}</button>`
        : `<button type="button" data-assistant-action="install-lab-hint"><img src="${icon("lightbulb")}" alt="" />${hint ? "Reabrir dica" : "Dica"}</button><button type="button" data-assistant-action="install-lab-tool"><img src="${icon(mission.order === 12 ? "apps" : "globe_search")}" alt="" />${mission.order === 12 ? "Painel de Controle" : "Navegador"}</button><button type="button" data-assistant-action="install-lab-open"><img src="${icon("target_arrow")}" alt="" />Trilha</button><button type="button" data-assistant-action="install-lab-exit"><img src="${icon("dismiss")}" alt="" />Sair</button>`,
    };
  }
  function renderBrowserTrail(progress) {
    const active = progress.active;
    const mission = OSLab.browserTrail.catalog.find((item) => item.id === active.id);
    if (!mission) return null;
    const completed = active.phase === "completed";
    const next = mission.objectives.find((item) => !active.checklist[item.id]);
    return {
      kind: "browser-trail", mascot: completed ? "celebrate" : "neutral",
      eyebrow: completed ? "Missão concluída" : "Navegadores e Internet",
      title: mission.title,
      message: completed ? mission.success : mission.order === 13 ? "Agora faça tudo sozinho. Siga os objetivos em ordem." : mission.order === 6 && active.index === 0 ? "Clique em Abrir Google abaixo para voltar à página de pesquisa." : next ? next.label : mission.instruction,
      body: `${mission.order === 10 && !completed ? "<p>Use Ctrl+Shift+T. Se o navegador do computador reservar o atalho, use Histórico → Abas fechadas recentemente.</p>" : ""}<ul class="assistant-checklist">${mission.objectives.map((item) => `<li class="${active.checklist[item.id] ? "is-done" : ""}"><img src="${icon(active.checklist[item.id] ? "checkmark_circle" : "target_arrow")}" alt="" /><span>${safe(item.label)}</span></li>`).join("")}</ul>`,
      actions: completed ? `<button type="button" data-assistant-action="browser-trail-return">Voltar</button><button type="button" data-assistant-action="browser-trail-repeat">Refazer</button><button class="is-primary" type="button" data-assistant-action="browser-trail-next">${mission.order === 13 ? "Ver trilha" : "Próxima"}</button>` : `<button type="button" data-assistant-action="browser-trail-browser">${mission.order === 6 ? "Abrir Google" : "Navegador"}</button><button type="button" data-assistant-action="browser-trail-open">Trilha</button><button type="button" data-assistant-action="browser-trail-exit">Sair</button>`,
    };
  }
  function render() {
    ensure();
    const missionProgress = OSLab.missions?.getProgress?.();
    const exerciseSession = OSLab.exercises?.getSession?.();
    const vpnLabProgress = OSLab.vpnLab?.getProgress?.();
    const installLabProgress = OSLab.installLab?.getProgress?.();
    const browserTrailProgress = OSLab.browserTrail?.getProgress?.();
    const view = browserTrailProgress?.active ? renderBrowserTrail(browserTrailProgress) : installLabProgress?.active ? renderInstallLab(installLabProgress) : vpnLabProgress?.active ? renderVpnLab(vpnLabProgress) : exerciseSession ? renderExercise(exerciseSession) : missionProgress?.active ? renderMission(missionProgress) : null;
    if (view?.kind === "browser-trail" && (document.querySelector(".browser-museum-window.is-focused:not(.is-minimized)") || OSLab.browserMuseum?.getSelected?.())) {
      document.body.classList.remove("has-learning-assistant");
      root.className = "learning-assistant is-hidden";
      root.innerHTML = "";
      place();
      return;
    }
    document.body.classList.toggle("has-learning-assistant", Boolean(view));
    if (!view) { root.className = "learning-assistant is-hidden"; root.innerHTML = ""; place(); return; }
    root.className = `learning-assistant is-${view.kind} ${collapsed ? "is-collapsed" : ""}`;
    root.innerHTML = `<div class="assistant-shell"><header><img class="assistant-mascot" src="${mascot(view.mascot)}" alt="Mascote assistente do OSLab" /><span><small>${safe(view.eyebrow)}</small><strong>${safe(view.title)}</strong></span><button type="button" data-assistant-action="toggle" aria-expanded="${!collapsed}" aria-label="${collapsed ? "Expandir assistente" : "Recolher assistente"}"><img src="${icon("panel_right")}" alt="" /></button></header><div class="assistant-body"><p>${safe(view.message)}</p>${view.body}<footer>${view.actions}</footer></div></div>`;
    place();
  }

  async function handleClick(event) {
    const action = event.target.closest("[data-assistant-action]")?.dataset.assistantAction;
    if (!action) return;
    if (action === "toggle") { collapsed = !collapsed; render(); return; }
    if (action === "mission-hint") { OSLab.missions.useHint(); collapsed = false; render(); }
    if (action === "mission-open") OSLab.shell.openApp("missions");
    if (action === "mission-restart" && await OSLab.ui.confirm({ title: "Reiniciar missão?", message: "O cenário será preparado novamente.", confirmLabel: "Reiniciar" })) OSLab.missions.restart();
    if (action === "mission-exit" && await OSLab.ui.confirm({ title: "Sair da missão?", message: "Os itens temporários da missão serão removidos.", confirmLabel: "Sair" })) OSLab.missions.abandon();
    if (action === "exercise-hint") { OSLab.exercises.useHint(); collapsed = false; render(); }
    if (action === "exercise-repeat-speech") { const speech = OSLab.exercises.repeatSpeech(); if (speech) OSLab.ui.notify("Assistente OSLab", speech, "info", 5200); }
    if (action === "exercise-test") OSLab.exercises.runTest();
    if (action === "exercise-restart" && await OSLab.ui.confirm({ title: "Reiniciar exercício?", message: "O ambiente será restaurado e preparado novamente.", confirmLabel: "Reiniciar" })) OSLab.exercises.restart();
    if (action === "exercise-exit" && await OSLab.ui.confirm({ title: "Sair do exercício?", message: "O sistema voltará ao estado anterior.", confirmLabel: "Sair" })) OSLab.exercises.exit();
    if (action === "exercise-return") OSLab.exercises.finish("return");
    if (action === "exercise-repeat") OSLab.exercises.finish("repeat");
    if (action === "exercise-next") OSLab.exercises.finish("next");
    if (action === "vpn-lab-hint") { OSLab.vpnLab.useHint(); collapsed = false; render(); }
    if (action === "vpn-lab-browser") OSLab.shell.openApp("google");
    if (action === "vpn-lab-vpn") OSLab.shell.openApp("vpn");
    if (action === "vpn-lab-open") OSLab.shell.openApp("vpnlab");
    if (action === "vpn-lab-exit" && await OSLab.ui.confirm({ title: "Sair da missão VPN?", message: "A conexão VPN atual será mantida, mas esta tentativa será encerrada.", confirmLabel: "Sair" })) OSLab.vpnLab.exit();
    if (action === "vpn-lab-return") OSLab.vpnLab.finish("return");
    if (action === "vpn-lab-repeat") OSLab.vpnLab.finish("repeat");
    if (action === "vpn-lab-next") OSLab.vpnLab.finish("next");
    if (action === "install-lab-hint") { OSLab.installLab.useHint(); collapsed = false; render(); }
    if (action === "install-lab-tool") { const mission = OSLab.installMissionCatalog.find((entry) => entry.id === OSLab.installLab.getProgress().active?.id); OSLab.shell.openApp(mission?.order === 12 ? "controlpanel" : "google"); }
    if (action === "install-lab-open") OSLab.shell.openApp("installlab");
    if (action === "install-lab-exit" && await OSLab.ui.confirm({ title: "Sair da missão?", message: "O estado dos downloads e programas será mantido, mas esta tentativa será encerrada.", confirmLabel: "Sair" })) OSLab.installLab.exit();
    if (action === "install-lab-return") OSLab.installLab.finish("return");
    if (action === "install-lab-repeat") OSLab.installLab.finish("repeat");
    if (action === "install-lab-next") OSLab.installLab.finish("next");
    if (action === "browser-trail-browser") { const record = OSLab.shell.openApp("google"); if (record && OSLab.browserTrail?.getProgress?.().active?.id === "browser-6") OSLab.browserApp.openGoogle(record); }
    if (action === "browser-trail-open") OSLab.shell.openApp("browsertrail");
    if (action === "browser-trail-exit" && await OSLab.ui.confirm({ title: "Sair da missão?", message: "Esta tentativa será encerrada.", confirmLabel: "Sair" })) OSLab.browserTrail.exit();
    if (action === "browser-trail-return") OSLab.browserTrail.finish("return");
    if (action === "browser-trail-repeat") OSLab.browserTrail.finish("repeat");
    if (action === "browser-trail-next") OSLab.browserTrail.finish("next");
  }

  document.addEventListener("DOMContentLoaded", render);
  document.addEventListener("oslab:window-focused", () => window.requestAnimationFrame(render));
  OSLab.missions?.subscribe?.(render);
  OSLab.exercises?.subscribe?.(render);
  OSLab.vpnLab?.subscribe?.(render);
  OSLab.installLab?.subscribe?.(render);
  OSLab.browserTrail?.subscribe?.(render);
  ["app:opened", "app:closed", "window:minimized", "window:maximized", "window:restored"].forEach((type) => OSLab.events?.subscribe?.(type, () => window.requestAnimationFrame(render)));
  OSLab.assistantRobot = { render, expand() { collapsed = false; render(); }, collapse() { collapsed = true; render(); } };
})(window);
