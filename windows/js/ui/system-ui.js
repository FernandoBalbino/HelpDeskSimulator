(function createSystemUI(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  let toastRoot;
  let modalRoot;

  function ensureRoots() {
    if (!toastRoot) {
      toastRoot = document.createElement("section");
      toastRoot.className = "oslab-toast-stack";
      toastRoot.setAttribute("aria-live", "polite");
      document.body.appendChild(toastRoot);
    }
    if (!modalRoot) {
      modalRoot = document.createElement("div");
      modalRoot.className = "oslab-modal-root is-hidden";
      document.body.appendChild(modalRoot);
    }
  }

  function notify(title, message, kind = "info", timeout = 4200) {
    ensureRoots();
    const toast = document.createElement("article");
    toast.className = `oslab-toast is-${kind}`;
    toast.innerHTML = `<img src="${OSLab.icons.get(kind, "info")}" alt="" /><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(message)}</small></span><button type="button" aria-label="Fechar notificação"><img src="assets/icons/ui/close.png" alt="" /></button>`;
    toastRoot.appendChild(toast);
    toast.querySelector("button").addEventListener("click", () => toast.remove());
    window.setTimeout(() => { toast.classList.add("is-leaving"); window.setTimeout(() => toast.remove(), 180); }, timeout);
    return toast;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
  }

  function closeModal(result = false) {
    const resolve = modalRoot?._resolve;
    if (modalRoot) { modalRoot.classList.add("is-hidden"); modalRoot.innerHTML = ""; modalRoot._resolve = null; }
    resolve?.(result);
  }

  function confirm(options = {}) {
    ensureRoots();
    if (modalRoot._resolve) closeModal(false);
    modalRoot.classList.remove("is-hidden");
    modalRoot.innerHTML = `<section class="oslab-dialog" role="dialog" aria-modal="true" aria-labelledby="oslab-dialog-title">
      <header><img src="${OSLab.icons.get(options.kind || "warning", "warning")}" alt="" /><div><h2 id="oslab-dialog-title">${escapeHtml(options.title || "Confirmar ação")}</h2><p>${escapeHtml(options.message || "Deseja continuar?")}</p></div></header>
      <footer><button type="button" data-modal-result="false">${escapeHtml(options.cancelLabel || "Cancelar")}</button><button class="is-primary" type="button" data-modal-result="true">${escapeHtml(options.confirmLabel || "Confirmar")}</button></footer>
    </section>`;
    const promise = new Promise((resolve) => { modalRoot._resolve = resolve; });
    modalRoot.querySelectorAll("[data-modal-result]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.modalResult === "true")));
    modalRoot.querySelector(".is-primary")?.focus();
    return promise;
  }

  function showMissionResult(result) {
    ensureRoots();
    modalRoot.classList.remove("is-hidden");
    modalRoot.innerHTML = `<section class="oslab-dialog mission-result-dialog" role="dialog" aria-modal="true" aria-labelledby="mission-result-title">
      <div class="mission-result-emblem"><img src="assets/learning/mascot/oslab-mascot-celebrate.png" alt="Mascote do OSLab comemorando" /></div>
      <h2 id="mission-result-title">Missão concluída!</h2><h3>${escapeHtml(result.title)}</h3><p>${escapeHtml(result.concept)}</p>
      <div class="mission-result-stats"><span><strong>${result.score}</strong><small>Pontos</small></span><span><strong>${result.mistakes}</strong><small>Erros</small></span><span><strong>${result.hintsUsed}</strong><small>Dicas</small></span></div>
      <footer><button type="button" data-result-action="system">Voltar ao sistema</button><button type="button" data-result-action="repeat">Repetir missão</button><button class="is-primary" type="button" data-result-action="next">Próxima missão</button></footer>
    </section>`;
    modalRoot.querySelectorAll("[data-result-action]").forEach((button) => button.addEventListener("click", () => {
      const action = button.dataset.resultAction; modalRoot.classList.add("is-hidden"); modalRoot.innerHTML = "";
      if (action === "repeat") OSLab.missions.start(result.missionId);
      if (action === "next") { const next = OSLab.missions.getMissions().find((mission) => mission.order === (OSLab.missionCatalog.find((entry) => entry.id === result.missionId)?.order || 0) + 1); if (next) { OSLab.shell?.openApp?.("missions"); OSLab.missions.start(next.id); } else OSLab.shell?.openApp?.("missions"); }
    }));
  }

  function renderWidget() { OSLab.assistantRobot?.render?.(); }

  function runTaskDialog(apps) {
    ensureRoots();
    modalRoot.classList.remove("is-hidden");
    modalRoot.innerHTML = `<section class="oslab-dialog run-task-dialog" role="dialog" aria-modal="true"><header><img src="assets/icons/taskmanager/run.png" alt="" /><div><h2>Executar nova tarefa</h2><p>Escolha um aplicativo do OSLab.</p></div></header><div class="run-task-list">${apps.map((app) => `<button type="button" data-run-app="${app.id}"><img src="${app.icon}" alt="" /><span>${escapeHtml(app.title)}</span></button>`).join("")}</div><footer><button type="button" data-run-cancel>Cancelar</button></footer></section>`;
    modalRoot.querySelector("[data-run-cancel]").addEventListener("click", () => closeModal(false));
    modalRoot.querySelectorAll("[data-run-app]").forEach((button) => button.addEventListener("click", () => { OSLab.shell.openApp(button.dataset.runApp); closeModal(true); }));
  }

  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modalRoot && !modalRoot.classList.contains("is-hidden")) closeModal(false); });
  document.addEventListener("DOMContentLoaded", ensureRoots);
  OSLab.events.subscribe("mission:completed", (event) => showMissionResult(event.detail.result));

  OSLab.ui = { notify, confirm, showMissionResult, renderWidget, runTaskDialog, escapeHtml };
})(window);
