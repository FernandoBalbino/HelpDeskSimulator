"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const results = [];

function test(name, callback) {
  try { callback(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error }); }
}

function filesIn(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(target, extension) : entry.name.endsWith(extension) ? [target] : [];
  });
}

test("todos os JavaScripts passam no node --check", () => {
  const scripts = [path.join(root, "script.js"), ...filesIn(path.join(root, "js"), ".js")];
  scripts.forEach((file) => {
    const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    assert.equal(check.status, 0, `${path.relative(root, file)}: ${check.stderr}`);
  });
});

test("todas as referências de assets estáticos existem", () => {
  const sources = [path.join(root, "index.html"), path.join(root, "styles.css"), ...filesIn(path.join(root, "css"), ".css"), path.join(root, "script.js"), ...filesIn(path.join(root, "js"), ".js")];
  const missing = new Set();
  const assetPattern = /(?:assets\/[A-Za-z0-9_./ -]+|bg\d*|logow11)\.(?:png|jpe?g|webp|svg|ttf)/gi;
  sources.forEach((source) => {
    const contents = fs.readFileSync(source, "utf8");
    (contents.match(assetPattern) || []).forEach((reference) => {
      if (!fs.existsSync(path.join(root, reference.replaceAll("/", path.sep)))) missing.add(reference);
    });
  });
  assert.deepEqual([...missing], []);
});

test("catálogo possui 12 missões lineares e executáveis", () => {
  const context = { window: { OSLab: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/missions/mission-catalog.js"), "utf8"), context);
  const catalog = context.window.OSLab.missionCatalog;
  assert.equal(catalog.length, 12);
  assert.deepEqual(Array.from(catalog, (mission) => mission.order), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.equal(new Set(catalog.map((mission) => mission.id)).size, 12);
  catalog.forEach((mission) => {
    assert.ok(mission.title && mission.description && mission.concept);
    assert.ok(mission.objectives.length > 0);
    assert.ok(mission.hint.title && mission.hint.intro && mission.hint.check);
    assert.ok(Array.isArray(mission.hint.steps) && mission.hint.steps.length >= 4 && mission.hint.steps.length <= 6);
    assert.ok(mission.icon && fs.existsSync(path.join(root, mission.icon)));
    assert.equal(typeof mission.setup, "function");
    assert.equal(typeof mission.validate, "function");
  });
});

test("sistema de arquivos preserva ID ao mover e sourceId ao copiar", () => {
  const emitted = [];
  const context = { window: { OSLab: { events: { emit: (...args) => emitted.push(args) } } } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/core/file-system.js"), "utf8"), context);
  const api = context.window.OSLab.fileSystem;
  const state = { version: 2, desktopFolders: [], desktopFiles: [], recycleBin: [] };
  api.bind(state, () => {});
  const folder = api.create({ parentId: api.roots.documents, kind: "folder", name: "Informática" });
  const file = api.create({ parentId: api.roots.desktop, kind: "file", name: "atividade.docx" });
  const large = api.create({ parentId: api.roots.documents, kind: "file", name: "video.mp4", sizeBytes: 5000 });
  assert.equal(api.bytesForItem(large.id), 5000);
  const usedBeforeTrash = api.usedBytes();
  api.delete(large.id);
  assert.equal(api.usedBytes(), usedBeforeTrash, "mover para a Lixeira não libera espaço");
  api.emptyRecycleBin();
  assert.equal(api.usedBytes(), usedBeforeTrash - 5000, "esvaziar a Lixeira libera o tamanho do arquivo");
  assert.equal(api.move(file.id, folder.id).id, file.id);
  const copy = api.copy(file.id, api.roots.documents);
  assert.notEqual(copy.id, file.id);
  assert.equal(copy.sourceId, file.id);
  api.delete(folder.id);
  assert.ok(api.get(file.id).trashedAt);
  api.restore(folder.id);
  assert.equal(api.get(file.id).parentId, folder.id);
  assert.equal(api.search("atividade", api.roots.documents).length, 2);
  assert.ok(emitted.some(([type]) => type === "recycle:restored"));
});

test("processos essenciais são protegidos e aplicativos podem encerrar", () => {
  const emitted = []; const closed = [];
  const context = { window: { OSLab: {
    events: { emit: (...args) => emitted.push(args) }, icons: { get: () => "assets/icons/taskmanager/services.png" },
    windowManager: { forceCloseById: (id) => closed.push(id) },
  } } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/core/process-manager.js"), "utf8"), context);
  const api = context.window.OSLab.processManager;
  assert.ok(api.getProcesses().every((entry) => entry.icon && entry.memory < 100));
  assert.equal(api.endProcess(136).reason, "protected");
  const app = api.createProcess({ appId: "texteditor", windowId: "texteditor", name: "Editor de Texto" });
  assert.equal(api.endProcess(app.pid, { reason: "task-manager" }).ok, true);
  assert.deepEqual(closed, ["texteditor"]);
  assert.ok(emitted.some(([type, detail]) => type === "process:ended" && detail.pid === app.pid));
  const security = api.getStartupApps().find((entry) => entry.id === "windows-security");
  assert.equal(api.setStartupEnabled(security.id, false).reason, "protected");
  const cloud = api.getStartupApps().find((entry) => entry.id === "cloud-sync");
  const before = api.estimateBootTime();
  api.setStartupEnabled(cloud.id, true);
  assert.ok(api.estimateBootTime() > before);
});

test("catálogo possui os 10 exercícios de diagnóstico completos", () => {
  const context = { window: { OSLab: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/exercises/exercise-catalog.js"), "utf8"), context);
  const catalog = context.window.OSLab.exerciseCatalog;
  assert.equal(catalog.length, 10);
  assert.deepEqual(Array.from(catalog, (exercise) => exercise.order), Array.from({ length: 10 }, (_, index) => index + 1));
  assert.equal(new Set(catalog.map((exercise) => exercise.id)).size, 10);
  catalog.forEach((exercise) => {
    assert.ok(exercise.title && exercise.description && exercise.goal && exercise.initialSpeech);
    assert.ok(["Sistema", "Rede"].includes(exercise.category));
    assert.ok(exercise.hint.title && exercise.hint.intro && exercise.hint.check);
    assert.ok(Array.isArray(exercise.hint.steps) && exercise.hint.steps.length >= 4);
    assert.ok(exercise.icon && fs.existsSync(path.join(root, exercise.icon)));
    assert.equal(typeof exercise.setup, "function");
    assert.equal(typeof exercise.isReady, "function");
    assert.equal(typeof exercise.test, "function");
  });
});

test("rede virtual respeita Wi-Fi, sub-rede, DHCP e DNS", () => {
  const emitted = [];
  const context = { window: { OSLab: { events: { emit: (...args) => emitted.push(args) } } } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/core/network-manager.js"), "utf8"), context);
  const network = context.window.OSLab.network;
  network.setWifi(false);
  assert.equal(network.getSnapshot().adapterConnected, false);
  network.setWifi(true); network.connectWifi("REDE_OSLAB");
  assert.equal(network.getSnapshot().internetAvailable, true);
  assert.ok(network.getSnapshot().availableNetworks.some((entry) => entry.ssid === "Aeroporto_Free_WiFi" && entry.secure === false));
  const quickSettings = {};
  network.bind(quickSettings, () => {});
  network.connectWifi("Casa_OS");
  assert.equal(quickSettings.connectedSsid, "Casa_OS", "o SSID atual é compartilhado com o estado do sistema");
  network.setIpConfig({ ip: "192.168.2.100", mask: "255.255.255.0", gateway: "192.168.1.1" });
  assert.equal(network.ping("192.168.1.1").ok, false);
  network.setDhcp(true);
  assert.equal(network.ping("192.168.1.1").ok, true);
  network.setDns("203.0.113.99", false);
  assert.equal(network.ping("8.8.8.8").ok, true);
  assert.equal(network.ping("google.com").ok, false);
  network.setDns("8.8.8.8", false);
  assert.equal(network.browse("google.com").ok, true);
  assert.ok(emitted.some(([type]) => type === "network:changed"));
});

test("motor de exercícios revela dica sob demanda e exige progressão sequencial", () => {
  let saved; let restored = 0; let solved = false;
  const OSLab = {
    exerciseStorage: { load: () => ({ version: 1, completed: { "ex-3": { legacy: true } }, attempts: {}, hints: {}, overallProgress: 0, lastExerciseId: null }), save: (value) => { saved = JSON.parse(JSON.stringify(value)); }, reset: () => ({ version: 1, completed: {}, attempts: {}, hints: {}, overallProgress: 0, lastExerciseId: null }) },
    exerciseCatalog: [1, 2, 3].map((order) => ({ id: `ex-${order}`, order, title: `Ex ${order}`, hint: { title: "Ajuda", intro: "Introdução", steps: ["Abra a ferramenta", "Faça a correção", "Confira o estado", "Teste o resultado"], check: "Confirme" }, initialSpeech: "Problema", cause: "Causa", tool: "Ferramenta", setup: () => ({}), isReady: () => solved, test: () => solved })),
    systemState: { beginEphemeral: () => ({ base: true }), endEphemeral: () => { restored += 1; } },
    activityCoordinator: { claim: () => {}, release: () => {}, register: () => {} },
    shell: { openApp: () => {} }, diagnostics: [],
    events: { subscribe: () => {}, emit: () => {} },
  };
  const context = { window: { OSLab } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/exercises/exercise-engine.js"), "utf8"), context);
  const engine = OSLab.exercises;
  assert.deepEqual(Array.from(engine.getExercises(), (exercise) => exercise.status), ["available", "locked", "locked"]);
  assert.equal(engine.start("ex-2").reason, "locked");
  assert.equal(engine.getSession(), null);
  engine.start("ex-1");
  assert.equal(engine.getSession().hint, undefined, "a dica não aparece antes do clique");
  assert.equal(engine.useHint().title, "Ajuda");
  assert.equal(engine.getSession().hint.steps.length, 4);
  assert.equal(engine.useHint(), null);
  assert.equal(engine.finish("next").reason, "not-completed");
  assert.equal(engine.getSession().id, "ex-1");
  assert.equal(engine.start("ex-3").reason, "locked");
  assert.equal(engine.getSession().id, "ex-1");
  solved = true;
  assert.equal(engine.runTest().ok, true);
  assert.deepEqual(Array.from(engine.getExercises(), (exercise) => exercise.status), ["active", "available", "locked"]);
  assert.equal(engine.finish("next").ok, true);
  assert.equal(restored, 1);
  assert.equal(engine.getSession().id, "ex-2");
  assert.equal(engine.runTest().ok, true);
  assert.ok(saved.completed["ex-2"]);
  engine.finish("return");
  assert.equal(restored, 2);
});

test("catálogo VPN contém sete missões sequenciais com dicas progressivas", () => {
  const context = { window: { OSLab: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/vpn/vpn-mission-catalog.js"), "utf8"), context);
  const catalog = context.window.OSLab.vpnMissionCatalog;
  assert.equal(catalog.length, 7);
  assert.deepEqual(Array.from(catalog, (mission) => mission.order), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(new Set(catalog.map((mission) => mission.id)).size, 7);
  catalog.forEach((mission) => {
    assert.ok(mission.title && mission.description && mission.goal && mission.success);
    assert.equal(mission.objectives.length, 3);
    assert.equal(mission.hints.length, 3);
    mission.hints.forEach((hint) => {
      assert.ok(hint.title && hint.intro && hint.check);
      assert.ok(Array.isArray(hint.steps) && hint.steps.length >= 2);
    });
    assert.ok(fs.existsSync(path.join(root, mission.icon)));
  });
});

test("estado VPN troca IP, país e rede corporativa com persistência local", () => {
  const values = new Map();
  const emitted = [];
  const OSLab = {
    events: { emit: (...args) => emitted.push(args) },
    network: { subscribe: () => {}, getSnapshot: () => ({ connectedSsid: "Casa_OS" }) },
    ui: { notify: () => {} },
  };
  const window = {
    OSLab,
    localStorage: {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/vpn/vpn-state.js"), "utf8"), { window });
  assert.equal(OSLab.vpn.getSnapshot().currentIp, "192.0.2.25");
  assert.equal(OSLab.vpn.connect("us").ok, true);
  assert.equal(OSLab.vpn.getSnapshot().country, "US");
  assert.equal(OSLab.vpn.getSnapshot().currentIp, "198.51.100.84");
  OSLab.vpn.connect("empresa-os");
  assert.equal(OSLab.vpn.getSnapshot().corporateNetwork, "empresa-os");
  assert.ok(values.has("oslab.vpn.state.v1"));
  OSLab.vpn.disconnect();
  assert.equal(OSLab.vpn.getSnapshot().country, "BR");
  assert.equal(OSLab.vpn.getSnapshot().connected, false);
  assert.ok(emitted.some(([type]) => type === "vpn:changed"));
});

test("sites VPN aplicam região, allowlist, acesso corporativo e latência", () => {
  const OSLab = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/apps/browser-app.js"), "utf8"), { window: { OSLab } });
  const sites = OSLab.vpnSites;
  const base = { vpn: { connected: false, country: "BR", currentIp: "192.0.2.25", latency: 22, serverId: null, corporateNetwork: null } };
  assert.equal(sites.movies.length, 20);
  assert.equal(sites.netflixAvailable(base), false);
  assert.equal(sites.netflixAvailable({ vpn: { ...base.vpn, connected: true, country: "US", serverId: "us" } }), true);
  assert.equal(sites.portalAllowed({ vpn: { ...base.vpn, connected: true, corporateNetwork: "empresa-os" } }), true);
  assert.equal(sites.schoolAllowed({ vpn: { ...base.vpn, connected: true, currentIp: "203.0.113.50", corporateNetwork: "escola-admin" } }), true);
  assert.equal(sites.bankAllowed({ vpn: { ...base.vpn, country: "JP" } }), false);
  assert.ok(sites.speedMetrics({ vpn: { ...base.vpn, connected: true, latency: 310, serverId: "jp" } }).ping > 200);
  assert.ok(sites.speedMetrics({ vpn: { ...base.vpn, connected: true, latency: 35, serverId: "br" } }).ping < 60);
});

test("motor VPN bloqueia atalhos e conclui o primeiro fluxo pelos eventos observados", () => {
  const subscribers = [];
  const saved = [];
  const vpnState = { connected: false, country: "BR", serverId: null, corporateNetwork: null };
  const networkState = { connectedSsid: "Casa_OS" };
  const OSLab = {
    events: {
      subscribe(type, listener) { if (type === "oslab:event") subscribers.push(listener); },
      emit(type, detail = {}, source = "test") { const event = { type, detail, source }; subscribers.forEach((listener) => listener(event)); return event; },
    },
    vpnLabStorage: {
      load: () => ({ version: 1, completed: { "vpn-my-ip": { legacy: true } }, active: null, lastMissionId: null }),
      save: (value) => saved.push(JSON.parse(JSON.stringify(value))),
      reset: () => ({ version: 1, completed: {}, active: null, lastMissionId: null }),
    },
    vpn: { getSnapshot: () => ({ ...vpnState }) },
    network: { getSnapshot: () => ({ ...networkState }) },
    activityCoordinator: { claim: () => {}, release: () => {}, register: () => {} },
    ui: { notify: () => {} },
    shell: { openApp: () => {} },
  };
  const context = { window: { OSLab } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/vpn/vpn-mission-catalog.js"), "utf8"), context);
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/vpn/vpn-lab-engine.js"), "utf8"), context);
  assert.deepEqual(Array.from(OSLab.vpnLab.getMissions(), (mission) => mission.status), ["available", "locked", "locked", "locked", "locked", "locked", "locked"]);
  assert.equal(OSLab.vpnLab.start("vpn-company").reason, "locked");
  assert.equal(OSLab.vpnLab.start("vpn-netflix").ok, true);
  assert.equal(OSLab.vpnLab.getHint(), null);
  assert.equal(OSLab.vpnLab.useHint().title, "Observe a região");
  assert.equal(OSLab.vpnLab.useHint().title, "Pense no endereço público");
  assert.equal(OSLab.vpnLab.useHint().title, "Teste outra localização");
  const savesAtThirdHint = saved.length;
  assert.equal(OSLab.vpnLab.useHint().title, "Teste outra localização");
  assert.equal(saved.length, savesAtThirdHint, "a terceira dica é apenas reaberta após atingir o limite");
  OSLab.events.emit("vpn-browser:action", { action: "netflix-unavailable-br", wifi: "Casa_OS" });
  vpnState.connected = true; vpnState.country = "US"; vpnState.serverId = "us";
  OSLab.events.emit("vpn:changed", { vpn: { ...vpnState } });
  OSLab.events.emit("vpn-browser:action", { action: "netflix-supernatural-us", wifi: "Casa_OS" });
  assert.ok(OSLab.vpnLab.getProgress().completed["vpn-netflix"]);
  OSLab.vpnLab.finish("next");
  assert.equal(OSLab.vpnLab.getProgress().active.id, "vpn-company");
  assert.equal(OSLab.vpnLab.debugStart("vpn-school").ok, true, "o professor pode abrir qualquer missão pelo painel de debug");
  assert.equal(OSLab.vpnLab.getProgress().active.id, "vpn-school");
  assert.ok(saved.length > 0);
});

test("motor de missões aplica dica uma vez e corrige progresso legado furado", () => {
  function createEngine(initialProgress) {
    let saved = null;
    const OSLab = {
      diagnostics: [],
      missionCatalog: [1, 2, 3].map((order) => ({
        id: `mission-${order}`, order, title: `Missão ${order}`, concept: "Conceito", description: "Descrição",
        objectives: [{ id: "step", label: "Etapa" }], hint: { title: "Ajuda", intro: "Introdução", steps: ["Abra", "Localize", "Faça", "Confira"], check: "Resultado" },
        setup: () => ({}), validate: () => [], cleanup: () => {}, reset: () => {},
      })),
      missionStorage: {
        load: () => JSON.parse(JSON.stringify(initialProgress)),
        save: (value) => { saved = JSON.parse(JSON.stringify(value)); },
        reset: () => ({ version: 1, completed: {}, active: null, medals: [], totalScore: 0 }),
      },
      fileSystem: { removeMissionItems: () => [] },
      processManager: { resetMissionProcesses: () => [] },
      activityCoordinator: { claim: () => {}, register: () => {} },
      shell: { getWallpaper: () => "1", getAudioState: () => ({ volume: 100, muted: false }), closeMissionWindows: () => {}, refreshDesktop: () => {} },
      events: { subscribe: () => {}, emit: () => {} },
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, "js/missions/mission-engine.js"), "utf8"), { window: { OSLab } });
    return { engine: OSLab.missions, saved: () => saved };
  }

  const base = { version: 1, active: null, completed: { "mission-3": { score: 100 } }, medals: [], totalScore: 100 };
  const current = createEngine(base);
  assert.deepEqual(Array.from(current.engine.getMissions(), (mission) => mission.status), ["available", "locked", "locked"]);
  assert.equal(current.engine.start("mission-2").reason, "locked");
  assert.equal(current.engine.start("mission-1").ok, true);
  assert.equal(current.engine.getHint(), null, "a dica não aparece antes do clique");
  assert.equal(current.engine.useHint().title, "Ajuda");
  assert.equal(current.engine.useHint().title, "Ajuda", "a dica revelada pode ser reaberta");
  assert.equal(current.engine.getHint().steps.length, 4);
  assert.equal(current.engine.getProgress().active.hintsUsed, 1, "a pontuação é descontada apenas uma vez");
  assert.equal(current.saved().active.hintsUsed, 1);

  const legacy = createEngine({ ...base, completed: {}, active: { id: "mission-1", checklist: { step: false }, facts: {}, scenario: {}, snapshot: {}, hintsUsed: 2, mistakes: 0 } });
  assert.equal(legacy.engine.getHint().title, "Ajuda");
  assert.equal(legacy.engine.useHint().title, "Ajuda");
  assert.equal(legacy.engine.getProgress().active.hintsUsed, 2, "sessões antigas mantêm a penalização já registrada");
});

test("próximo exercício preserva a fala explicativa durante a preparação", () => {
  const subscribers = [];
  let firstSolved = false;
  const OSLab = {
    exerciseStorage: { load: () => ({ version: 1, completed: {}, attempts: {}, hints: {}, overallProgress: 0, lastExerciseId: null }), save: () => {}, reset: () => ({}) },
    exerciseCatalog: [
      { id: "ex-1", order: 1, title: "Primeiro", initialSpeech: "Situação inicial um", success: "Resolvido", hint: "Dica", cause: "Causa", tool: "Ferramenta", setup: () => ({}), isReady: () => firstSolved, test: () => firstSolved },
      { id: "ex-2", order: 2, title: "Segundo", initialSpeech: "O programa congelou e precisa ser diagnosticado.", success: "Resolvido", hint: "Dica", cause: "Causa", tool: "Ferramenta", setup: () => ({ pid: 9001 }), isReady: (ctx) => !ctx.scenario.pid, test: () => false },
    ],
    systemState: { beginEphemeral: () => ({}), endEphemeral: () => {} },
    activityCoordinator: { claim: () => {}, release: () => {}, register: () => {} },
    shell: { openApp: () => {}, closeMissionWindows: () => {} }, diagnostics: [],
    events: {
      subscribe(type, listener) { if (type === "oslab:event") subscribers.push(listener); },
      emit(type, detail = {}, source = "test") { subscribers.forEach((listener) => listener({ type, detail, source })); },
    },
  };
  const context = { window: { OSLab } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/exercises/exercise-engine.js"), "utf8"), context);
  OSLab.exercises.start("ex-1");
  firstSolved = true;
  assert.equal(OSLab.exercises.runTest().ok, true);
  OSLab.exercises.finish("next");
  const next = OSLab.exercises.getSession();
  assert.equal(next.id, "ex-2");
  assert.equal(next.phase, "investigating");
  assert.equal(next.speech, "O programa congelou e precisa ser diagnosticado.");
});

test("catálogo de instalação possui exatamente 12 missões completas e sequenciais", () => {
  const context = { window: { OSLab: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/install/install-mission-catalog.js"), "utf8"), context);
  const catalog = context.window.OSLab.installMissionCatalog;
  assert.equal(catalog.length, 12);
  assert.deepEqual(Array.from(catalog, (mission) => mission.order), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.equal(new Set(catalog.map((mission) => mission.id)).size, 12);
  catalog.forEach((mission) => {
    assert.ok(mission.title && mission.description && mission.goal && mission.instruction && mission.success);
    assert.ok(Array.isArray(mission.objectives) && mission.objectives.length > 0);
    assert.ok(mission.hint?.title && mission.hint?.intro && mission.hint?.check);
    assert.ok(Array.isArray(mission.hint.steps) && mission.hint.steps.length >= 3);
    assert.ok(mission.hint.visualTarget && mission.hint.visualLabel);
    assert.ok(fs.existsSync(path.join(root, mission.icon)));
  });
});

test("estado de software centraliza downloads, atalhos, instalação e desinstalação", () => {
  const values = new Map();
  const events = [];
  const window = {
    OSLab: { events: { emit: (type, detail) => events.push([type, detail]) } },
    localStorage: { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) },
    setInterval: () => 1,
    clearInterval: () => {},
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/install/software-state.js"), "utf8"), { window });
  const software = window.OSLab.software;
  assert.equal(software.DOWNLOAD_DURATION_MS, 60000);
  assert.equal(software.startDownload("appjavafx").download.status, "downloading");
  assert.equal(software.getDownload("appjavafx").fileName, "AppJavaFX-Setup.exe");
  assert.equal(software.recordSearch("  AppJavaFX  "), "appjavafx");
  assert.equal(software.installBundle("appjavafx", { desktopShortcut: true }).ok, true);
  assert.equal(software.getProgram("appjavafx").desktopShortcut, true);
  assert.equal(software.getProgram("appjavafx").startMenuShortcut, true);
  assert.equal(software.markOpened("appjavafx"), true);
  assert.equal(software.uninstall("appjavafx").ok, true);
  assert.equal(software.getProgram("appjavafx").installed, false);
  assert.equal(software.getProgram("appjavafx").desktopShortcut, false);
  assert.equal(software.getProgram("appjavafx").startMenuShortcut, false);
  assert.ok(events.some(([type]) => type === "install:download-started"));
  assert.ok(events.some(([type]) => type === "install:uninstalled"));
  assert.ok(values.has(software.storageKey));
});

test("motor da trilha de instalação exige ações reais e valida a remoção completa", () => {
  const subscribers = [];
  const completed = Object.fromEntries(Array.from({ length: 11 }, (_, index) => [`done-${index + 1}`, {}]));
  const installed = { appjavafx: true };
  const OSLab = {
    diagnostics: [],
    events: {
      subscribe(type, listener) { if (type === "oslab:event") subscribers.push(listener); },
      emit(type, detail = {}, source = "test") { const event = { type, detail, source }; subscribers.forEach((listener) => listener(event)); return event; },
    },
    installMissionStorage: { load: () => ({ version: 1, completed: {}, active: null }), save: () => {}, reset: () => ({ version: 1, completed: {}, active: null }) },
    activityCoordinator: { claim: () => {}, release: () => {}, register: () => {} },
    software: {
      isInstalled: (id) => Boolean(installed[id]),
      getProgram: (id) => ({ installed: Boolean(installed[id]), desktopShortcut: Boolean(installed[id]), startMenuShortcut: Boolean(installed[id]) }),
      reset: () => {},
    },
    ui: { notify: () => {} },
  };
  const context = { window: { OSLab } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/install/install-mission-catalog.js"), "utf8"), context);
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/install/install-mission-engine.js"), "utf8"), context);
  assert.equal(OSLab.installLab.getMissions().length, 12);
  assert.equal(OSLab.installLab.start("install-search-appjavafx").reason, "locked");
  assert.equal(OSLab.installLab.start("install-browser").ok, true);
  OSLab.events.emit("app:opened", { appId: "settings" });
  assert.equal(OSLab.installLab.getProgress().active.phase, "active");
  OSLab.events.emit("app:opened", { appId: "google" });
  assert.equal(OSLab.installLab.getProgress().active.phase, "completed");

  OSLab.installMissionStorage.load = () => ({ version: 1, completed, active: null });
  const source = fs.readFileSync(path.join(root, "js/install/install-mission-engine.js"), "utf8");
  const OSLabFinal = {
    ...OSLab,
    events: { subscribe(type, listener) { if (type === "oslab:event") this.listener = listener; }, emit(type, detail = {}) { const event = { type, detail }; this.listener?.(event); return event; } },
    installMissionCatalog: OSLab.installMissionCatalog,
    installMissionStorage: { load: () => ({ version: 1, completed: Object.fromEntries(OSLab.installMissionCatalog.slice(0, 11).map((mission) => [mission.id, {}])), active: null }), save: () => {}, reset: () => ({}) },
  };
  vm.runInNewContext(source, { window: { OSLab: OSLabFinal } });
  assert.equal(OSLabFinal.installLab.start("install-uninstall").ok, true);
  OSLabFinal.events.emit("control-panel:programs-opened");
  OSLabFinal.events.emit("control-panel:program-selected", { programId: "appjavafx" });
  installed.appjavafx = false;
  OSLabFinal.events.emit("install:uninstalled", { programId: "appjavafx" });
  assert.equal(OSLabFinal.installLab.getProgress().active.phase, "completed");
});

test("precache inclui todos os recursos carregados pelo documento", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "precache-manifest.json"), "utf8"));
  const entries = new Set(manifest.map((entry) => entry.replace(/^\.\//, "")));
  manifest.forEach((entry) => assert.ok(fs.existsSync(path.join(root, entry.replace(/^\.\//, ""))), `ausente: ${entry}`));
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const runtime = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map((match) => match[1].replace(/^\.\//, "")).filter((entry) => /\.(?:js|css|png|jpe?g|webp|svg|ttf|webmanifest)$/i.test(entry));
  runtime.forEach((entry) => assert.ok(entries.has(entry) || ["manifest.webmanifest", "assets/icons/pwa-192.png"].includes(entry), `fora do precache: ${entry}`));
  [
    "css/learning.css",
    "js/ui/learning-path.js",
    "assets/fonts/NunitoSans-Variable.ttf",
    "assets/learning/mascot/oslab-mascot-neutral.png",
    "assets/learning/mascot/oslab-mascot-help.png",
    "assets/learning/mascot/oslab-mascot-celebrate.png",
    "assets/learning/icons/target_arrow.svg",
    "css/vpn.css",
    "js/vpn/vpn-state.js",
    "js/vpn/vpn-lab-engine.js",
    "js/apps/vpn-app.js",
    "js/apps/vpn-lab-app.js",
    "assets/vpn/flags/us.svg",
    "assets/vpn/posters/poster-20.jpg",
    "css/install-lab.css",
    "css/software-apps.css",
    "js/install/software-state.js",
    "js/install/install-mission-engine.js",
    "js/apps/install-lab-app.js",
    "js/apps/software-apps.js",
    "assets/programs/appjavafx.svg",
    "assets/programs/office.svg",
    "css/browser.css",
    "js/browser/browser-state.js",
    "js/browser/browser-trail.js",
    "js/browser/browser-museum.js",
    "js/apps/browser-trails-app.js",
    "assets/browser/chrome.svg",
    "assets/browser/edge.png",
    "assets/browser/firefox.png",
    "assets/browser/brave-icon.png",
    "assets/browser/brave.png",
    "assets/browser/opera.png",
  ].forEach((entry) => assert.ok(entries.has(entry), `recurso educacional fora do precache: ${entry}`));
  assert.match(fs.readFileSync(path.join(root, "service-worker.js"), "utf8"), /oslab-offline-v19/);
});

test("estado do navegador mantém histórico por aba, fechadas e favoritos", () => {
  const context = { window: { OSLab: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/browser/browser-state.js"), "utf8"), context);
  const api = context.window.OSLab.browserState;
  const state = api.create();
  assert.equal(state.tabs.length, 1);
  assert.equal(api.navigate(state, "wikipedia.org"), true);
  assert.equal(api.back(state), true);
  assert.equal(state.currentUrl, "google.com");
  assert.equal(api.forward(state), true);
  assert.equal(state.currentUrl, "wikipedia.org");
  const firstId = state.activeTab;
  const second = api.open(state, "youtube.com");
  assert.equal(state.tabs.length, 2);
  assert.equal(api.activate(state, firstId), true);
  assert.equal(state.currentUrl, "wikipedia.org");
  assert.equal(api.close(state, second.id).url, "youtube.com");
  assert.equal(state.closedTabs.length, 1);
  assert.equal(api.restore(state).id, second.id);
  assert.equal(state.currentUrl, "youtube.com");
  assert.equal(api.favorite(state, "YouTube"), true);
  assert.equal(api.favorite(state, "YouTube"), false);
  assert.equal(state.favorites.length, 1);
  assert.equal(api.openHistory(state), true);
  assert.equal(api.openHistory(state), false);
  assert.ok(state.history.some((item) => item.url === "wikipedia.org"));
});

test("trilha de navegador avança em ações reais e desafio final exige ordem", () => {
  const scripts = ["js/browser/browser-trail.js"];
  const values = new Map();
  const listeners = [];
  const OSLab = {
    events: { subscribe(type, listener) { if (type === "oslab:event") listeners.push(listener); }, emit(type, detail = {}) { const event = { type, detail }; listeners.forEach((listener) => listener(event)); } },
    activityCoordinator: { claim: () => {}, release: () => {}, register: () => {} },
    shell: { closeApp: () => {}, openApp: () => {} },
    browserApp: { prepareMission: () => {} },
    ui: { notify: () => {} },
  };
  const window = { OSLab, localStorage: { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) } };
  scripts.forEach((file) => vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), { window }));
  const trail = OSLab.browserTrail;
  assert.equal(trail.catalog.length, 13);
  assert.equal(trail.start("browser-2").ok, false);
  assert.equal(trail.start("browser-1").ok, true);
  OSLab.events.emit("app:opened", { appId: "edge" });
  assert.equal(trail.getProgress().active.index, 0);
  OSLab.events.emit("app:opened", { appId: "google" });
  assert.equal(trail.getProgress().active.phase, "completed");
  trail.finish("next");
  assert.equal(trail.getProgress().active.id, "browser-2");
  ["focus-address", "menu", "new-tab"].forEach((action) => OSLab.events.emit("browser:action", { action }));
  assert.equal(trail.getProgress().active.phase, "completed");
  trail.exit({ silent: true });

  const previous = Object.fromEntries(trail.catalog.slice(0, 12).map((mission) => [mission.id, { completedAt: "test" }]));
  values.set("oslab.browser.trail.progress.v1", JSON.stringify({ version: 1, completed: previous, active: null }));
  const fresh = { ...OSLab, events: { subscribe(type, listener) { if (type === "oslab:event") this.listener = listener; }, emit(type, detail = {}) { this.listener?.({ type, detail }); } } };
  const freshWindow = { ...window, OSLab: fresh };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/browser/browser-trail.js"), "utf8"), { window: freshWindow });
  const challenge = fresh.browserTrail;
  assert.equal(challenge.start("browser-13").ok, true);
  fresh.events.emit("browser:action", { action: "navigate", value: "google.com", source: "address" });
  assert.equal(challenge.getProgress().active.index, 0, "não aceita ação fora de ordem");
  challenge.catalog[12].steps.forEach((item, index) => { fresh.events.emit(item.type, { action: item.action, ...item.fields }); assert.equal(challenge.getProgress().active.index, index + 1); });
  assert.equal(challenge.getProgress().active.phase, "completed");
  assert.ok(challenge.getProgress().completed["browser-13"]);
});

test("museu conta cada navegador uma vez e conclui após os cinco", () => {
  const values = new Map();
  const OSLab = { shell: { openApp: (id) => ({ appId: id }) }, browserApp: { render: () => {} }, windowManager: { minimize: () => {} }, ui: { notify: () => {} }, events: { emit: () => {} } };
  const window = { OSLab, localStorage: { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/browser/browser-museum.js"), "utf8"), { window });
  const museum = OSLab.browserMuseum;
  assert.equal(museum.ids.length, 5);
  assert.equal(museum.open("google"), true);
  const first = museum.getProgress().visited.google;
  museum.open("google");
  assert.equal(museum.getProgress().visited.google, first);
  museum.ids.slice(1).forEach((id) => museum.open(id));
  assert.equal(Object.keys(museum.getProgress().visited).length, 5);
  assert.ok(museum.getProgress().completedAt);
  museum.select(null);
  assert.equal(museum.getSelected(), null);
});

test("IDs legados do Chrome e sites de VPN e instalação permanecem", () => {
  const registry = { window: { OSLab: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/core/app-registry.js"), "utf8"), registry);
  assert.equal(registry.window.OSLab.apps.get("google").title, "Google Chrome");
  const source = fs.readFileSync(path.join(root, "js/apps/browser-app.js"), "utf8");
  ["appjavafx.local", "office.local", "netflix.com", "portal.empresa.local", "meuip.com", "bancoos.com", "speedtest.os", "meet.os", "admin.escola.local", "vpn-browser:action"].forEach((text) => assert.ok(source.includes(text), text));
});

test("retomada das missões não referencia persist inexistente", () => {
  const source = fs.readFileSync(path.join(root, "js/missions/mission-engine.js"), "utf8");
  assert.equal(/\bpersist\s*\(\s*\)/.test(source), false);
});

test("missão final não conclui durante a preparação do cenário", () => {
  const subscriptions = new Map();
  const eventTrace = [];
  const OSLab = { diagnostics: [] };
  OSLab.events = {
    subscribe(type, listener) { if (!subscriptions.has(type)) subscriptions.set(type, new Set()); subscriptions.get(type).add(listener); return () => subscriptions.get(type).delete(listener); },
    emit(type, detail = {}, source = "test") { const event = { eventId: `test-${Date.now()}`, type, occurredAt: new Date().toISOString(), source, detail }; eventTrace.push(type); subscriptions.get(type)?.forEach((listener) => listener(event)); subscriptions.get("oslab:event")?.forEach((listener) => listener(event)); return event; },
  };
  const context = { window: { OSLab } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/core/file-system.js"), "utf8"), context);
  const state = { version: 3, desktopFolders: [], desktopFiles: [], recycleBin: [] };
  OSLab.fileSystem.bind(state, () => {});
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/missions/mission-catalog.js"), "utf8"), context);
  const completed = Object.fromEntries(OSLab.missionCatalog.slice(0, 11).map((mission) => [mission.id, { score: 100 }]));
  let saved;
  OSLab.missionStorage = { load: () => ({ version: 1, active: null, completed, medals: [], totalScore: 1100 }), save: (value) => { saved = JSON.parse(JSON.stringify(value)); }, reset: () => ({ version: 1, active: null, completed: {}, medals: [], totalScore: 0 }) };
  const openWindows = new Set(); let volume = 20; let muted = false;
  OSLab.processManager = { resetMissionProcesses: () => [] };
  OSLab.shell = {
    getWallpaper: () => "3", getAudioState: () => ({ volume, muted }),
    setWallpaper: () => {}, setVolume(value, isMuted) { volume = value; muted = isMuted; OSLab.events.emit("volume:changed", { volume, muted }); },
    openApp(id) { openWindows.add(id); OSLab.events.emit("app:opened", { appId: id, windowId: id }); return { windowId: id }; },
    isWindowOpen: (id) => openWindows.has(id), refreshDesktop: () => {}, closeMissionWindows: () => {}, notify: () => {},
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/missions/mission-engine.js"), "utf8"), context);
  const result = OSLab.missions.start("organize-school");
  assert.equal(result.ok, true);
  const current = OSLab.missions.getProgress();
  assert.ok(current.active, JSON.stringify({ eventTrace, current }, null, 2));
  assert.equal(current.active.id, "organize-school");
  assert.equal(current.completed["organize-school"], undefined);
  assert.ok(saved.active.scenario.mathFile && saved.active.scenario.unnecessaryWindowId === "google");
  const scenario = current.active.scenario;
  OSLab.fileSystem.move(scenario.mathFile, scenario.math);
  OSLab.fileSystem.move(scenario.computingFile, scenario.computing);
  OSLab.fileSystem.move(scenario.pictureFile, scenario.pictures);
  OSLab.shell.setVolume(20, false);
  OSLab.fileSystem.emptyRecycleBin();
  openWindows.delete("google");
  OSLab.events.emit("app:closed", { appId: "google", windowId: "google" });
  const completedFinal = OSLab.missions.getProgress();
  assert.equal(completedFinal.active, null);
  assert.equal(completedFinal.completed["organize-school"].score, 100);
});

const failed = results.filter((result) => !result.ok);
results.forEach((result) => console.log(`${result.ok ? "OK" : "FALHA"}  ${result.name}${result.ok ? "" : `\n      ${result.error.stack}`}`));
console.log(`\n${results.length - failed.length}/${results.length} verificações aprovadas.`);
if (failed.length) process.exitCode = 1;
