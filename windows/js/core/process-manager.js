(function createProcessManager(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const listeners = new Set();
  let sequence = 6500;
  const TOTAL_MEMORY_MB = 4096;

  const baseline = [
    { pid: 1268, appId: "antimalware", name: "Antimalware Service Executable", icon: "assets/icons/taskmanager/services.png", cpu: 0.2, memory: 78.2, disk: 0, network: 0, protected: true },
    { pid: 3184, appId: "explorer-system", name: "Windows Explorer", icon: "assets/icons/explorer.png", cpu: 0.1, memory: 92.7, disk: 0, network: 0, protected: true },
    { pid: 4916, appId: "search-system", name: "Pesquisa (7)", icon: "assets/icons/search.png", cpu: 0, memory: 36.1, disk: 0, network: 0, protected: true, groupCount: 7 },
    { pid: 136, appId: "secure-system", name: "Secure System", icon: "assets/icons/taskmanager/details.png", cpu: 0, memory: 24.6, disk: 0, network: 0, protected: true },
    { pid: 1540, appId: "dwm", name: "Gerenciador de Janelas da Área de Trabalho", icon: "assets/icons/taskmanager/details.png", cpu: 0.1, memory: 44.8, disk: 0, network: 0, protected: true },
    { pid: 5208, appId: "start-system", name: "Iniciar", icon: "assets/icons/start.png", cpu: 0, memory: 18.9, disk: 0, network: 0, protected: true },
    { pid: 2440, appId: "sihost", name: "Host de Experiência do Windows", icon: "assets/icons/taskmanager/details.png", cpu: 0, memory: 17.3, disk: 0, network: 0, protected: true },
    { pid: 2788, appId: "wmi", name: "WMI Provider Host", icon: "assets/icons/taskmanager/services.png", cpu: 0.1, memory: 15.8, disk: 0, network: 0, protected: true },
    { pid: 896, appId: "services", name: "Host de Serviço: Sistema Local", icon: "assets/icons/taskmanager/services.png", cpu: 0, memory: 13.4, disk: 0, network: 0, protected: true, groupCount: 3 },
  ].map((item) => ({ ...item, id: `process-${item.pid}`, windowId: null, status: "Em execução", efficient: false, startedAt: Date.now(), missionId: null }));

  let processes = baseline.map((item) => ({ ...item }));
  let startupApps = [
    { id: "windows-security", name: "Segurança do Windows", icon: "assets/icons/settings-rows/lock.png", impact: "Médio", enabled: true, protected: true, seconds: 2 },
    { id: "cloud-sync", name: "Sincronizador em Nuvem", icon: "assets/icons/settings-rows/nearshare.png", impact: "Alto", enabled: false, protected: false, seconds: 8 },
    { id: "game-launcher", name: "Inicializador de Jogos", icon: "assets/settings/Gaming.webp", impact: "Alto", enabled: false, protected: false, seconds: 9 },
    { id: "media-helper", name: "Assistente de Mídia", icon: "assets/icons/settings-rows/video.png", impact: "Médio", enabled: false, protected: false, seconds: 5 },
    { id: "meeting-app", name: "Aplicativo de Reuniões", icon: "assets/settings/Apps.webp", impact: "Alto", enabled: false, protected: false, seconds: 7 },
  ];

  function notify(change) {
    const snapshot = getProcesses();
    listeners.forEach((listener) => listener(snapshot, change));
  }

  function nextPid() {
    sequence += Math.floor(Math.random() * 41) + 3;
    while (processes.some((process) => process.pid === sequence)) sequence += 1;
    return sequence;
  }

  function normalize(input) {
    const pid = Number(input.pid) || nextPid();
    return {
      id: input.id || `process-${pid}`,
      pid,
      appId: input.appId || `app-${pid}`,
      windowId: input.windowId || null,
      name: input.name || "Aplicativo",
      icon: input.icon || OSLab.icons.get("process"),
      status: input.status || "Em execução",
      cpu: Number(input.cpu) || 0,
      memory: Number(input.memory) || 24,
      disk: Number(input.disk) || 0,
      network: Number(input.network) || 0,
      startedAt: input.startedAt || Date.now(),
      missionId: input.missionId || null,
      protected: Boolean(input.protected),
      efficient: Boolean(input.efficient),
      groupCount: Number(input.groupCount) || 0,
    };
  }

  function createProcess(input) {
    const existing = input.windowId && processes.find((process) => process.windowId === input.windowId);
    if (existing) return existing;
    const process = normalize(input);
    processes.push(process);
    notify({ type: "created", process: { ...process } });
    OSLab.events.emit("process:created", { process: { ...process }, pid: process.pid, appId: process.appId }, "processManager");
    return process;
  }

  function getProcesses() {
    return processes.map((process) => ({ ...process }));
  }

  function getProcessByPid(pid) {
    return processes.find((process) => process.pid === Number(pid)) || null;
  }

  function getUsage() {
    const cpuPercent = Math.min(100, processes.reduce((sum, process) => sum + Number(process.cpu || 0), 0));
    const memoryUsedMb = Math.min(TOTAL_MEMORY_MB, processes.reduce((sum, process) => sum + Number(process.memory || 0), 0));
    return { cpuPercent, memoryUsedMb, memoryFreeMb: Math.max(0, TOTAL_MEMORY_MB - memoryUsedMb), memoryPercent: memoryUsedMb / TOTAL_MEMORY_MB * 100, totalMemoryMb: TOTAL_MEMORY_MB };
  }

  function updateProcess(pid, patch) {
    const process = getProcessByPid(pid);
    if (!process) return null;
    Object.assign(process, patch, { pid: process.pid, id: process.id });
    notify({ type: "updated", process: { ...process } });
    OSLab.events.emit("process:updated", { process: { ...process }, pid: process.pid }, "processManager");
    return process;
  }

  function endProcess(pid, options = {}) {
    const process = getProcessByPid(pid);
    if (!process) return { ok: false, reason: "missing" };
    if (process.protected && !options.force) {
      OSLab.events.emit("process:blocked", { process: { ...process }, pid: process.pid }, "processManager");
      return { ok: false, reason: "protected", process };
    }
    if (process.windowId && OSLab.windowManager?.forceCloseById) {
      OSLab.windowManager.forceCloseById(process.windowId, { fromProcessManager: true });
    }
    processes = processes.filter((item) => item.pid !== process.pid);
    notify({ type: "ended", process: { ...process } });
    OSLab.events.emit("process:ended", { process: { ...process }, pid: process.pid, appId: process.appId, missionId: process.missionId, reason: options.reason || "task-manager" }, "processManager");
    return { ok: true, process };
  }

  OSLab.processManager = {
    createProcess,
    getProcesses,
    getProcessByPid,
    getUsage,
    updateProcess,
    endProcess,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    ensureAppProcess(app) {
      const existing = processes.find((process) => process.windowId === app.windowId || (!app.windowId && process.appId === app.appId && !process.protected));
      return existing || createProcess(app);
    },
    endByWindow(windowId, options = {}) {
      const process = processes.find((item) => item.windowId === windowId);
      if (!process) return null;
      processes = processes.filter((item) => item.pid !== process.pid);
      notify({ type: "ended", process: { ...process } });
      if (!options.silent) OSLab.events.emit("process:ended", { process: { ...process }, pid: process.pid, appId: process.appId, reason: options.reason || "window-closed" }, "processManager");
      return process;
    },
    resetMissionProcesses(missionId) {
      const removed = processes.filter((process) => process.missionId === missionId);
      processes = processes.filter((process) => process.missionId !== missionId);
      removed.forEach((process) => {
        if (process.windowId) OSLab.windowManager?.forceCloseById?.(process.windowId, { fromProcessManager: true });
      });
      notify({ type: "mission-reset", missionId });
      return removed;
    },
    getStartupApps() { return startupApps.map((app) => ({ ...app })); },
    setStartupEnabled(id, enabled) {
      const app = startupApps.find((entry) => entry.id === id);
      if (!app) return { ok: false, reason: "missing" };
      if (app.protected && !enabled) return { ok: false, reason: "protected", app: { ...app } };
      app.enabled = Boolean(enabled);
      notify({ type: "startup", app: { ...app } });
      OSLab.events.emit("startup:changed", { app: { ...app }, id, enabled: app.enabled }, "processManager");
      return { ok: true, app: { ...app } };
    },
    estimateBootTime() { return 7 + startupApps.filter((app) => app.enabled).reduce((sum, app) => sum + app.seconds, 0); },
    snapshot() { return { processes: getProcesses(), startupApps: startupApps.map((app) => ({ ...app })), sequence }; },
    restoreSnapshot(input) {
      if (!input) return;
      processes = Array.isArray(input.processes) ? input.processes.map((process) => ({ ...process })) : baseline.map((item) => ({ ...item }));
      startupApps = Array.isArray(input.startupApps) ? input.startupApps.map((app) => ({ ...app })) : startupApps;
      sequence = Number(input.sequence) || sequence;
      notify({ type: "snapshot-restored" });
    },
    reset() { processes = baseline.map((item) => ({ ...item, startedAt: Date.now() })); notify({ type: "reset" }); },
  };
})(window);
