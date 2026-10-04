(function createTaskManagerApp(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  const records = new Set();
  const nav = [
    ["processes", "Processos", "assets/icons/taskmanager/details.png"], ["performance", "Desempenho", "assets/icons/taskmanager/performance.png"],
    ["history", "Histórico de aplicativos", "assets/icons/taskmanager/history.png"], ["startup", "Aplicativos de inicialização", "assets/icons/taskmanager/startup.png"],
    ["users", "Usuários", "assets/icons/taskmanager/users.png"], ["details", "Detalhes", "assets/icons/taskmanager/details.png"], ["services", "Serviços", "assets/icons/taskmanager/services.png"],
  ];

  function safe(value) { return OSLab.ui.escapeHtml(value); }
  function number(value, digits = 1) { return Number(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }); }
  function totals(processes) {
    const cpu = processes.reduce((sum, process) => sum + process.cpu, 0);
    const memory = processes.reduce((sum, process) => sum + process.memory, 0);
    const disk = processes.reduce((sum, process) => sum + process.disk, 0);
    const network = processes.reduce((sum, process) => sum + process.network, 0);
    return { cpu: Math.min(99, Math.round(cpu)), memory: Math.min(99, Math.round(memory / 40.96)), disk: Math.min(99, Math.round(disk)), network: Math.min(99, Math.round(network)) };
  }
  function sortProcesses(record, processes) {
    const key = record.taskSort || "memory"; const direction = record.taskSortDirection || "desc";
    return [...processes].sort((a, b) => {
      const av = key === "name" ? a.name : a[key]; const bv = key === "name" ? b.name : b[key];
      const result = typeof av === "string" ? av.localeCompare(bv, "pt-BR") : Number(av) - Number(bv);
      return direction === "asc" ? result : -result;
    });
  }

  function processTable(record) {
    const query = String(record.taskQuery || "").trim().toLocaleLowerCase("pt-BR");
    const all = OSLab.processManager.getProcesses();
    const processes = sortProcesses(record, all.filter((process) => process.name.toLocaleLowerCase("pt-BR").includes(query) || String(process.pid).includes(query)));
    const sum = totals(all); const maxValues = { cpu: Math.max(...all.map((p) => p.cpu), 1), memory: Math.max(...all.map((p) => p.memory), 1), disk: Math.max(...all.map((p) => p.disk), 0.1), network: Math.max(...all.map((p) => p.network), 0.1) };
    const head = (key, label, total = null) => `<button type="button" class="task-col-head ${record.taskSort === key ? "is-sorted" : ""}" data-task-sort="${key}">${total === null ? "" : `<strong>${total}%</strong>`}<span>${label}</span>${record.taskSort === key ? `<img src="assets/icons/ui/${record.taskSortDirection === "asc" ? "left" : "right"}.png" alt="" />` : ""}</button>`;
    const rows = processes.map((process) => {
      const group = process.groupCount > 1; const expanded = record.expandedProcesses?.has(process.pid);
      const heat = (key) => Math.min(0.88, 0.12 + Number(process[key]) / maxValues[key] * 0.72).toFixed(2);
      return `<div class="task-process-entry"><button type="button" class="task-process-row ${record.selectedProcessId === String(process.pid) ? "is-selected" : ""}" data-process-id="${process.pid}">
        <span class="task-process-name">${group ? `<span class="task-group-toggle" data-task-group="${process.pid}" aria-hidden="true"><img src="assets/icons/ui/right.png" alt="" /></span>` : `<i></i>`}<img src="${OSLab.icons.process(process)}" data-icon-kind="process" alt="" /><strong>${safe(process.name)}</strong></span>
        <span class="task-process-status">${process.efficient ? `<img src="assets/icons/settings-rows/nearshare.png" alt="Modo de eficiência" />` : ""}${process.status !== "Em execução" ? `<em>${safe(process.status)}</em>` : ""}</span>
        <span class="task-use" style="--heat:${heat("cpu")}">${process.cpu ? number(process.cpu) : "0"}%</span><span class="task-use" style="--heat:${heat("memory")}">${number(process.memory)} MB</span><span class="task-use" style="--heat:${heat("disk")}">${process.disk ? number(process.disk) : "0"} MB/s</span><span class="task-use" style="--heat:${heat("network")}">${process.network ? number(process.network) : "0"} Mbps</span>
      </button>${group && expanded ? `<div class="task-process-children"><span></span><span>${process.groupCount} processos do sistema agrupados</span></div>` : ""}</div>`;
    }).join("");
    processes.forEach((process) => OSLab.events.emit("process:located", { pid: process.pid, appId: process.appId, query }, "taskManager"));
    return `<div class="task-process-table" role="table" aria-label="Processos em execução"><div class="task-process-head" role="row">${head("name", "Nome")}${head("status", "Status")}${head("cpu", "CPU", sum.cpu)}${head("memory", "Memória", sum.memory)}${head("disk", "Disco", sum.disk)}${head("network", "Rede", sum.network)}</div><div class="task-process-rows">${rows || `<p class="task-no-results">Nenhum processo encontrado.</p>`}</div></div>`;
  }

  function startupTable(record) {
    const apps = OSLab.processManager.getStartupApps();
    const selected = apps.find((app) => app.id === record.selectedStartupId);
    return `<div class="taskmanager-commandbar"><div><h2>Aplicativos de inicialização</h2><p>Tempo estimado de inicialização: <strong>${OSLab.processManager.estimateBootTime()} segundos</strong></p></div><div><button type="button" data-task-action="startup-toggle" ${selected && !selected.protected ? "" : "disabled"}><img src="assets/icons/taskmanager/startup.png" alt="" /><span>${selected?.enabled ? "Desabilitar" : "Habilitar"}</span></button></div></div><div class="startup-table" role="table"><div class="startup-head"><span>Nome</span><span>Status</span><span>Impacto na inicialização</span></div>${apps.map((app) => `<button type="button" class="startup-row ${record.selectedStartupId === app.id ? "is-selected" : ""}" data-startup-id="${app.id}"><span><img src="${app.icon}" alt="" /><strong>${safe(app.name)}</strong>${app.protected ? `<small>Essencial</small>` : ""}</span><em>${app.enabled ? "Habilitado" : "Desabilitado"}</em><b class="impact-${app.impact.toLocaleLowerCase("pt-BR")}">${app.impact}</b></button>`).join("")}</div>`;
  }

  function render(record) {
    records.add(record); record.taskNav ||= "processes"; record.taskSort ||= "memory"; record.taskSortDirection ||= "desc"; record.expandedProcesses ||= new Set();
    const selected = record.selectedProcessId && OSLab.processManager.getProcessByPid(record.selectedProcessId);
    record.address.textContent = record.taskNav === "processes" ? "Processos" : nav.find(([id]) => id === record.taskNav)?.[1] || "Configurações";
    const workspace = record.taskNav === "processes"
      ? `<div class="taskmanager-commandbar"><h2>Processos</h2><div><button type="button" data-task-action="run"><img src="assets/icons/taskmanager/run.png" alt="" /><span>Executar nova tarefa</span></button><button type="button" data-task-action="end" ${selected ? "" : "disabled"}><img src="assets/icons/context/delete.png" alt="" /><span>Finalizar tarefa</span></button><button type="button" data-task-action="efficiency" ${selected && !selected.protected ? "" : "disabled"}><img src="assets/icons/taskmanager/performance.png" alt="" /><span>Modo de eficiência</span></button><button type="button" data-task-action="refresh" aria-label="Atualizar"><img src="assets/icons/taskmanager/more.png" alt="" /></button></div></div>${processTable(record)}`
      : record.taskNav === "startup" ? startupTable(record)
      : `<section class="taskmanager-info-page"><img src="${nav.find(([id]) => id === record.taskNav)?.[2] || "assets/icons/taskmanager/settings.png"}" alt="" /><h2>${safe(record.address.textContent)}</h2><p>Esta seção é informativa nesta versão do OSLab. Processos e Aplicativos de inicialização estão disponíveis.</p><button type="button" data-task-nav="processes">Voltar para Processos</button></section>`;
    record.content.innerHTML = `<section class="taskmanager-page"><aside class="taskmanager-sidebar"><div class="taskmanager-hamburger"><img src="assets/icons/taskmanager/more.png" alt="" /></div><nav>${nav.map(([id, label, icon]) => `<button type="button" class="${record.taskNav === id ? "is-active" : ""}" data-task-nav="${id}"><img src="${icon}" alt="" /><span>${label}</span></button>`).join("")}</nav><button type="button" class="taskmanager-settings ${record.taskNav === "settings" ? "is-active" : ""}" data-task-nav="settings"><img src="assets/icons/taskmanager/settings.png" alt="" /><span>Configurações</span></button></aside><div class="taskmanager-workspace">${workspace}</div></section>`;
    record.content.querySelectorAll("img[data-icon-kind]").forEach((image) => OSLab.icons.fallbackImage(image, image.dataset.iconKind));
    if (!record.taskManagerWired) {
      record.taskManagerWired = true;
      record.content.addEventListener("click", (event) => {
        const navId = event.target.closest("[data-task-nav]")?.dataset.taskNav;
        const row = event.target.closest("[data-process-id]"); const group = event.target.closest("[data-task-group]")?.dataset.taskGroup;
        const startupId = event.target.closest("[data-startup-id]")?.dataset.startupId;
        const sort = event.target.closest("[data-task-sort]")?.dataset.taskSort; const action = event.target.closest("[data-task-action]")?.dataset.taskAction;
        const selectedProcess = record.selectedProcessId && OSLab.processManager.getProcessByPid(record.selectedProcessId);
        if (navId) { record.taskNav = navId; render(record); return; }
        if (group) { const pid = Number(group); record.expandedProcesses.has(pid) ? record.expandedProcesses.delete(pid) : record.expandedProcesses.add(pid); render(record); return; }
        if (row) { record.selectedProcessId = row.dataset.processId; const process = OSLab.processManager.getProcessByPid(record.selectedProcessId); OSLab.events.emit("process:selected", { pid: process?.pid, appId: process?.appId }, "taskManager"); render(record); return; }
        if (startupId) { record.selectedStartupId = startupId; render(record); return; }
        if (sort) { if (record.taskSort === sort) record.taskSortDirection = record.taskSortDirection === "asc" ? "desc" : "asc"; else { record.taskSort = sort; record.taskSortDirection = sort === "name" ? "asc" : "desc"; } render(record); return; }
        if (action === "run") OSLab.ui.runTaskDialog(OSLab.shell.getRunnableApps());
        if (action === "end" && selectedProcess) { const result = OSLab.processManager.endProcess(selectedProcess.pid, { reason: "task-manager" }); if (!result.ok && result.reason === "protected") OSLab.ui.notify("Processo protegido", "Este processo do sistema não pode ser finalizado.", "warning"); record.selectedProcessId = null; render(record); }
        if (action === "efficiency" && selectedProcess) { OSLab.processManager.updateProcess(selectedProcess.pid, { efficient: !selectedProcess.efficient, cpu: Math.min(selectedProcess.cpu, 0.1), status: "Em execução" }); render(record); }
        if (action === "refresh") render(record);
        if (action === "startup-toggle" && record.selectedStartupId) {
          const app = OSLab.processManager.getStartupApps().find((item) => item.id === record.selectedStartupId);
          const result = OSLab.processManager.setStartupEnabled(app.id, !app.enabled);
          if (!result.ok && result.reason === "protected") OSLab.ui.notify("Aplicativo essencial", "A Segurança do Windows deve permanecer habilitada.", "warning");
          render(record);
        }
      });
    }
  }

  function setQuery(record, query) { record.taskQuery = query; render(record); }
  function renderAll() { records.forEach((record) => record.element?.isConnected ? render(record) : records.delete(record)); }
  OSLab.processManager.subscribe(renderAll);
  OSLab.taskManagerApp = { render, setQuery, renderAll };
})(window);
