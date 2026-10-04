(function () {
  "use strict";

  const runtimeErrors = [];
  window.__oslabRuntimeErrors = runtimeErrors;
  window.addEventListener("error", (event) => runtimeErrors.push(event.message || "Erro de execução"));
  window.addEventListener("unhandledrejection", (event) => runtimeErrors.push(String(event.reason || "Promessa rejeitada")));

  const PASSWORD = "alunos2026";
  const WELCOME_DELAY = 850;
  const STORAGE_KEY = "oslab-state-v1";
  const LEGACY_WALLPAPER_STORAGE_KEY = "oslab-wallpaper";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const loginScreen = $("#login-screen");
  const desktop = $("#desktop");
  const loginForm = $("#login-form");
  const passwordInput = $("#password");
  const loginMessage = $("#login-message");
  const passwordRow = $(".password-row");
  const welcomeState = $("#welcome-state");
  const fullscreenLoginButton = $("#fullscreen-login-button");

  const windowLayer = $("#window-layer");
  const windowTemplate = $("#window-template");
  const desktopIcons = $("#desktop-icons");
  const windows = new Map();
  let zCounter = 30;

  const startMenu = $("#start-menu");
  const searchPanel = $("#search-panel");
  const quickPanel = $("#quick-panel");
  const calendarPanel = $("#calendar-panel");
  const powerMenu = $("#power-menu");
  const contextMenu = $("#context-menu");
  const itemContextMenu = $("#item-context-menu");
  const taskbarContextMenu = $("#taskbar-context-menu");
  const startButton = $("#start-button");
  const searchButton = $("#search-button");
  const quickSettingsButton = $("#quick-settings-button");
  const clockButton = $("#clock-button");
  const taskbar = $(".taskbar");
  let contextItemId = null;
  let fileClipboard = null;
  let missionsResumed = false;
  let persistenceSuspended = false;

  const appDefinitions = OSLab.apps.definitions;

  const folders = [
    { id: "root-desktop", name: "Área de Trabalho", icon: "assets/icons/win/desktop.png" },
    { id: "root-documents", name: "Documentos", icon: "assets/icons/win/documents.png" },
    { id: "root-downloads", name: "Downloads", icon: "assets/icons/win/downloads.png" },
    { id: "root-pictures", name: "Imagens", icon: "assets/icons/win/pictures.png" },
  ];

  const wallpapers = [
    { id: "1", name: "Windows 11 colorido", src: "bg.png" },
    { id: "2", name: "Windows 11 azul", src: "bg2.jpg" },
    { id: "3", name: "Windows 11 claro", src: "bg3.jpg" },
    { id: "4", name: "Abstrato laranja", src: "bg4.jpg" },
    { id: "5", name: "Grupo musical", src: "bg5.jpg" },
    { id: "6", name: "Futebol", src: "bg6.jpg" },
    { id: "7", name: "Futebol americano", src: "bg7.jpg" },
  ];

  const defaultTaskProcesses = [
    { id: "taskmgr", pid: 7420, name: "Gerenciador de Tarefas", icon: "assets/icons/taskmanager.png", cpu: 0.3, memory: 58.4, disk: 0, network: 0 },
    { id: "explorer", pid: 3184, name: "Windows Explorer", icon: "assets/icons/explorer.png", cpu: 0.1, memory: 92.7, disk: 0.1, network: 0 },
    { id: "antimalware", pid: 1268, name: "Antimalware Service Executable", icon: "assets/icons/taskmanager/services.png", cpu: 0.2, memory: 78.2, disk: 0, network: 0 },
    { id: "dwm", pid: 1540, name: "Gerenciador de Janelas da Área de Trabalho", icon: "assets/icons/taskmanager/details.png", cpu: 0.1, memory: 44.8, disk: 0, network: 0 },
    { id: "search", pid: 4916, name: "Pesquisa", icon: "assets/icons/search.png", cpu: 0, memory: 36.1, disk: 0, network: 0 },
    { id: "secure", pid: 136, name: "Secure System", icon: "assets/icons/taskmanager/details.png", cpu: 0, memory: 24.6, disk: 0, network: 0 },
    { id: "start", pid: 5208, name: "Iniciar", icon: "assets/icons/start.png", cpu: 0, memory: 18.9, disk: 0, network: 0 },
    { id: "sihost", pid: 2440, name: "Host de Experiência do Windows", icon: "assets/icons/taskmanager/details.png", cpu: 0, memory: 17.3, disk: 0, network: 0 },
    { id: "wmi", pid: 2788, name: "WMI Provider Host", icon: "assets/icons/taskmanager/services.png", cpu: 0.1, memory: 15.8, disk: 0, network: 0 },
    { id: "services", pid: 896, name: "Host de Serviço: Sistema Local", icon: "assets/icons/taskmanager/services.png", cpu: 0, memory: 13.4, disk: 0, network: 0 },
  ];

  let taskProcesses = defaultTaskProcesses.map((process) => ({ ...process }));

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[character]);
  }

  const settingsSections = [
    { id: "home", name: "Início", icon: "assets/icons/ui/home.png" },
    {
      id: "system",
      name: "Sistema",
      icon: "assets/settings/System.webp",
      description: "Tela, som, notificações e energia",
      items: ["Tela", "Som", "Energia e bateria"],
    },
    {
      id: "bluetooth",
      name: "Bluetooth e dispositivos",
      icon: "assets/settings/Bluetooth-devices.webp",
      description: "Dispositivos, impressoras e mouse",
      items: ["Dispositivos", "Impressoras e scanners", "Mouse"],
    },
    {
      id: "network",
      name: "Rede e Internet",
      icon: "assets/settings/Network-internet.webp",
      description: "Wi-Fi, Ethernet e uso de dados",
      items: ["Wi-Fi", "Ethernet", "Configurações avançadas de rede"],
    },
    {
      id: "personalization",
      name: "Personalização",
      icon: "assets/settings/Personalisation.webp",
      description: "Plano de fundo, cores e temas",
    },
    {
      id: "apps",
      name: "Aplicativos",
      icon: "assets/settings/Apps.webp",
      description: "Aplicativos instalados e padrão",
      items: ["Aplicativos instalados", "Aplicativos padrão", "Inicialização"],
    },
    {
      id: "accounts",
      name: "Contas",
      icon: "assets/settings/Accounts.webp",
      description: "Conta local e opções de entrada",
      items: ["Suas informações", "Opções de entrada", "Outros usuários"],
    },
    {
      id: "time",
      name: "Hora e idioma",
      icon: "assets/settings/Time-language.webp",
      description: "Data, hora, idioma e região",
      items: ["Data e hora", "Idioma e região", "Digitação"],
    },
    {
      id: "gaming",
      name: "Jogos",
      icon: "assets/settings/Gaming.webp",
      description: "Modo de Jogo e capturas",
      items: ["Modo de Jogo", "Capturas", "Barra de Jogos"],
    },
    {
      id: "accessibility",
      name: "Acessibilidade",
      icon: "assets/settings/Accessibility.webp",
      description: "Visão, audição e interação",
      items: ["Visão", "Audição", "Interação"],
    },
    {
      id: "privacy",
      name: "Privacidade e segurança",
      icon: "assets/settings/Privacy-security.webp",
      description: "Segurança e permissões",
      items: ["Segurança do Windows", "Permissões do aplicativo", "Localização"],
    },
    {
      id: "update",
      name: "Windows Update",
      icon: "assets/settings/Windows-Update.webp",
      description: "Atualizações e histórico",
      items: ["Verificar atualizações", "Histórico de atualização", "Opções avançadas"],
    },
  ];

  const defaultState = {
    version: 3,
    wallpaperId: "1",
    desktopFolders: [],
    desktopFiles: [],
    recycleBin: [],
    quickSettings: {
      wifi: true,
      connectedSsid: "REDE_OSLAB",
      bluetooth: false,
      airplane: false,
      hotspot: false,
      "battery-saver": false,
      theme: true,
      "night-light": false,
    },
    brightness: 86,
    volume: 100,
    muted: false,
    lastSettingsPage: "home",
    desktopView: "medium",
    desktopSort: "manual",
    lastRename: null,
  };

  function loadState() {
    try {
      const parsed = JSON.parse((OSLab.storage || window.localStorage).getItem(STORAGE_KEY) || "null") || {};
      const legacyWallpaper = (OSLab.storage || window.localStorage).getItem(LEGACY_WALLPAPER_STORAGE_KEY);
      const wallpaperId = wallpapers.some((item) => item.id === parsed.wallpaperId)
        ? parsed.wallpaperId
        : wallpapers.some((item) => item.id === legacyWallpaper)
          ? legacyWallpaper
          : defaultState.wallpaperId;
      const desktopFolders = Array.isArray(parsed.desktopFolders)
        ? parsed.desktopFolders
            .filter((folder) => folder && typeof folder.id === "string" && typeof folder.name === "string")
            .map((folder) => ({
              id: folder.id,
              name: folder.name.slice(0, 64) || "Nova pasta",
              createdAt: Number(folder.createdAt) || Date.now(),
              kind: "folder",
            }))
        : [];
      const desktopFiles = Array.isArray(parsed.desktopFiles)
        ? parsed.desktopFiles
            .filter((file) => file && typeof file.id === "string" && typeof file.name === "string")
            .map((file) => ({
              id: file.id,
              name: file.name.slice(0, 64) || "Novo Documento de Texto.txt",
              createdAt: Number(file.createdAt) || Date.now(),
              kind: "file",
              content: typeof file.content === "string" ? file.content.slice(0, 20000) : "",
            }))
        : [];
      const recycleBin = Array.isArray(parsed.recycleBin)
        ? parsed.recycleBin
            .filter((item) => item && typeof item.id === "string" && typeof item.name === "string")
            .map((item) => ({
              id: item.id,
              name: item.name.slice(0, 64),
              kind: item.kind === "file" ? "file" : "folder",
              content: typeof item.content === "string" ? item.content.slice(0, 20000) : "",
              createdAt: Number(item.createdAt) || Date.now(),
              deletedAt: Number(item.deletedAt) || Date.now(),
              originalLocation: "Área de Trabalho",
            }))
        : [];

      return {
        ...defaultState,
        ...parsed,
        version: 3,
        wallpaperId,
        desktopFolders,
        desktopFiles,
        recycleBin,
        quickSettings: { ...defaultState.quickSettings, ...(parsed.quickSettings || {}) },
      };
    } catch (_error) {
      return {
        ...defaultState,
        quickSettings: { ...defaultState.quickSettings },
        desktopFolders: [],
        desktopFiles: [],
        recycleBin: [],
      };
    }
  }

  const state = loadState();

  function saveState() {
    if (persistenceSuspended) return;
    try {
      (OSLab.storage || window.localStorage).setItem(STORAGE_KEY, JSON.stringify(state));
      (OSLab.storage || window.localStorage).removeItem(LEGACY_WALLPAPER_STORAGE_KEY);
    } catch (_error) {
      // O simulador continua funcionando mesmo quando o armazenamento está indisponível.
    }
  }

  OSLab.fileSystem.bind(state, saveState);
  OSLab.network.bind(state.quickSettings, saveState);

  let currentWallpaperId = state.wallpaperId;

  function applyWallpaper(id, persist = true) {
    const wallpaper = wallpapers.find((item) => item.id === id) || wallpapers[0];
    currentWallpaperId = wallpaper.id;
    document.documentElement.style.setProperty("--wallpaper-image", `url("${wallpaper.src}")`);

    if (persist) {
      state.wallpaperId = wallpaper.id;
      saveState();
      OSLab.events.emit("wallpaper:changed", { wallpaperId: wallpaper.id, src: wallpaper.src }, "settings");
    }

    $$("[data-wallpaper]").forEach((button) => {
      const selected = button.dataset.wallpaper === wallpaper.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    $$("[data-current-wallpaper]").forEach((image) => {
      image.src = wallpaper.src;
      image.alt = wallpaper.name;
    });

    $$("[data-wallpaper-name]").forEach((label) => {
      label.textContent = wallpaper.name;
    });
  }

  function desktopItemById(itemId) {
    return OSLab.fileSystem.get(itemId);
  }

  function sortedDesktopFolders() {
    const result = OSLab.fileSystem.list(OSLab.fileSystem.roots.desktop);
    if (state.desktopSort === "name") result.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (state.desktopSort === "date") result.sort((a, b) => b.createdAt - a.createdAt);
    return result;
  }

  function renderDesktopFolders() {
    $$("[data-desktop-item], [data-desktop-folder], [data-installed-desktop]", desktopIcons).forEach((element) => element.remove());
    desktopIcons.classList.remove("view-large", "view-medium", "view-small");
    desktopIcons.classList.add(`view-${state.desktopView}`);

    (OSLab.software?.getInstalledPrograms?.() || []).filter((program) => program.desktopShortcut).forEach((program) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "desktop-shortcut installed-program-shortcut";
      button.dataset.installedDesktop = program.id;
      button.dataset.app = program.id;
      button.innerHTML = `<img src="${escapeHtml(program.icon)}" alt="" /><span>${escapeHtml(program.name)}</span>`;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        $$(".desktop-shortcut").forEach((item) => item.classList.remove("is-selected"));
        button.classList.add("is-selected");
        if (event.detail <= 1) openApp(program.id);
      });
      desktopIcons.appendChild(button);
    });

    sortedDesktopFolders().forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "desktop-shortcut desktop-item-shortcut";
      button.dataset.desktopItem = item.id;
      button.dataset.itemKind = item.kind;
      if (item.kind === "folder") button.dataset.desktopFolder = item.id;
      button.setAttribute("aria-label", `Abrir ${item.kind === "folder" ? "pasta" : "arquivo"} ${item.name}`);

      const image = document.createElement("img");
      image.src = OSLab.icons.file(item);
      OSLab.icons.fallbackImage(image, item.kind === "folder" ? "folder" : "file");
      image.alt = "";
      const label = document.createElement("span");
      label.textContent = item.name;
      button.append(image, label);
      desktopIcons.appendChild(button);
    });
  }

  function renderInstalledStartApps() {
    const container = $("#start-apps");
    if (!container) return;
    $$(".installed-start-app", container).forEach((element) => element.remove());
    (OSLab.software?.getInstalledPrograms?.() || []).filter((program) => program.startMenuShortcut).forEach((program) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "installed-start-app";
      button.dataset.app = program.id;
      button.innerHTML = `<img src="${escapeHtml(program.icon)}" alt="" /><span>${escapeHtml(program.name)}</span>`;
      button.addEventListener("click", () => openApp(program.id));
      container.appendChild(button);
    });
    const query = $("#start-search-input")?.value.trim().toLocaleLowerCase("pt-BR") || "";
    $$("#start-apps [data-app]").forEach((button) => button.classList.toggle("is-hidden", !button.textContent.trim().toLocaleLowerCase("pt-BR").includes(query)));
  }

  function uniqueItemName(baseName, extension = "") {
    return OSLab.fileSystem.uniqueName(OSLab.fileSystem.roots.desktop, `${baseName}${extension}`);
  }

  function beginItemRename(itemId) {
    const item = desktopItemById(itemId);
    const shortcut = $(`[data-desktop-item="${itemId}"]`, desktopIcons);
    if (!item || !shortcut) return;
    const label = $("span", shortcut);
    const input = document.createElement("input");
    input.className = "desktop-folder-name";
    input.value = item.name;
    input.setAttribute("aria-label", `Nome do ${item.kind === "folder" ? "pasta" : "arquivo"}`);
    label.replaceWith(input);
    shortcut.classList.add("is-renaming");
    input.focus();
    input.select();

    let committed = false;
    const finish = (save) => {
      if (committed) return;
      committed = true;
      if (save) {
        const nextName = input.value.trim().slice(0, 64);
        if (nextName && nextName !== item.name) {
          state.lastRename = { itemId: item.id, previousName: item.name };
          OSLab.fileSystem.rename(item.id, nextName);
        }
        saveState();
      }
      renderDesktopFolders();
    };
    input.addEventListener("blur", () => finish(true));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") finish(true);
      if (event.key === "Escape") finish(false);
    });
  }

  function beginFolderRename(folderId) {
    beginItemRename(folderId);
  }

  function createDesktopFolder() {
    const folder = OSLab.fileSystem.create({ parentId: OSLab.fileSystem.roots.desktop, kind: "folder", name: uniqueItemName("Nova pasta") });
    renderDesktopFolders();
    window.setTimeout(() => beginItemRename(folder.id), 40);
  }

  function createDesktopTextFile() {
    const file = OSLab.fileSystem.create({ parentId: OSLab.fileSystem.roots.desktop, kind: "file", name: uniqueItemName("Novo Documento de Texto", ".txt"), mime: "text/plain", content: "" });
    renderDesktopFolders();
    window.setTimeout(() => beginItemRename(file.id), 40);
  }

  function openDesktopItem(itemId) {
    const item = desktopItemById(itemId);
    if (!item) return null;
    const record = openApp("explorer");
    if (item.shortcutTargetId && OSLab.fileSystem.get(item.shortcutTargetId) && !OSLab.fileSystem.get(item.shortcutTargetId).trashedAt) renderFolder(record, item.shortcutTargetId);
    else if (item.shortcutTargetId) OSLab.ui.notify("Atalho indisponível", "A pasta de destino não está disponível.", "warning");
    else if (item.kind === "folder") renderFolder(record, item.id);
    else renderTextFile(record, item.id);
    return record;
  }

  function moveDesktopItemToRecycle(itemId) {
    const item = desktopItemById(itemId);
    if (!item) return;
    OSLab.fileSystem.delete(itemId);
    renderDesktopFolders();
    const recycleRecord = windows.get("recycle");
    if (recycleRecord) renderRecycleBin(recycleRecord);
  }

  function restoreRecycleItem(itemId) {
    const item = OSLab.fileSystem.restore(itemId);
    if (!item) return;
    renderDesktopFolders();
  }

  function permanentlyDeleteRecycleItem(itemId) {
    OSLab.fileSystem.permanentlyDelete(itemId);
  }

  async function requestFullscreen() {
    if (document.fullscreenElement) return true;
    const target = document.documentElement;
    if (!target.requestFullscreen) return false;

    try {
      await target.requestFullscreen({ navigationUI: "hide" });
      return true;
    } catch (_error) {
      try {
        await target.requestFullscreen();
        return true;
      } catch (_fallbackError) {
        return false;
      }
    }
  }

  function updateFullscreenButton() {
    const label = $("span", fullscreenLoginButton);
    label.textContent = document.fullscreenElement ? "Tela cheia ativada" : "Abrir em tela cheia";
  }

  fullscreenLoginButton.addEventListener("click", () => {
    void requestFullscreen().then(updateFullscreenButton);
  });

  document.addEventListener("fullscreenchange", updateFullscreenButton);

  function showDesktop() {
    loginScreen.classList.add("is-hidden");
    desktop.classList.remove("is-hidden");
    document.title = "OSLab — Área de Trabalho";
    updateClock();
    if (!OSLab.remoteContext && !missionsResumed) { missionsResumed = true; OSLab.missions.resumeAfterBoot(); }
  }

  function resetLogin() {
    loginForm.reset();
    passwordInput.disabled = false;
    passwordRow.classList.remove("is-hidden");
    welcomeState.classList.add("is-hidden");
    fullscreenLoginButton.classList.remove("is-hidden");
    loginMessage.classList.remove("is-hidden", "is-error");
    loginMessage.textContent = "Digite sua senha para entrar.";
  }

  function lockSession() {
    closeFlyouts();
    desktop.classList.add("is-hidden");
    resetLogin();
    loginScreen.classList.remove("is-hidden");
    document.title = "Entrar — OSLab";
    window.setTimeout(() => passwordInput.focus(), 80);
    OSLab.events.emit("computer:locked", {}, "session");
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (passwordInput.value !== PASSWORD) {
      loginMessage.textContent = "Senha incorreta. Tente novamente.";
      loginMessage.classList.add("is-error");
      passwordInput.select();
      return;
    }

    void requestFullscreen();
    passwordInput.disabled = true;
    passwordRow.classList.add("is-hidden");
    fullscreenLoginButton.classList.add("is-hidden");
    loginMessage.classList.add("is-hidden");
    welcomeState.classList.remove("is-hidden");
    window.setTimeout(showDesktop, WELCOME_DELAY);
  });

  function sidebarMarkup(active) {
    return `
      <aside class="explorer-sidebar" aria-label="Navegação do Explorador">
        <button type="button" class="${active === "home" ? "is-active" : ""}" data-explorer-view="home">
          <img src="assets/icons/explorer.png" alt="" />
          <span>Início</span>
        </button>
        <button type="button" class="${active === "computer" ? "is-active" : ""}" data-explorer-view="computer">
          <img src="assets/icons/computer.png" alt="" />
          <span>Este Computador</span>
        </button>
        ${folders
          .map(
            (folder) => `
              <button type="button" class="${active === folder.id ? "is-active" : ""}" data-folder="${folder.id}">
                <img src="${folder.icon}" alt="" />
                <span>${folder.name}</span>
              </button>`,
          )
          .join("")}
        <button type="button" class="${active === "recycle" ? "is-active" : ""}" data-explorer-view="recycle">
          <img src="assets/icons/recycle-bin.png" alt="" />
          <span>Lixeira</span>
        </button>
      </aside>`;
  }

  function folderTilesMarkup() {
    return folders
      .map(
        (folder) => `
          <button type="button" class="folder-tile" data-folder="${folder.id}">
            <img src="${folder.icon}" alt="" />
            <span>${folder.name}</span>
          </button>`,
      )
      .join("");
  }

  function renderComputer(record) {
    const disk = OSLab.systemState.getStorage();
    const diskPercent = Math.round(disk.usedBytes / disk.totalBytes * 100);
    record.previousExplorerView = "computer";
    record.address.textContent = "Este Computador";
    record.content.innerHTML = `
      <div class="explorer-layout">
        ${sidebarMarkup("computer")}
        <section class="explorer-main">
          <h2>Pastas</h2>
          <div class="folder-grid">${folderTilesMarkup()}</div>
          <div class="drive-section">
            <h2>Dispositivos e unidades</h2>
            <div class="drive-tile">
              <img src="assets/icons/win/disk.png" alt="" />
              <div class="drive-copy">
                <strong>Disco Local (C:)</strong>
                <div class="drive-bar" aria-label="${diskPercent}% do disco utilizado"><span style="width:${diskPercent}%"></span></div>
                <small>${OSLab.systemTools.formatBytes(disk.freeBytes)} livres de ${OSLab.systemTools.formatBytes(disk.totalBytes)}</small>
              </div>
            </div>
          </div>
        </section>
      </div>`;
  }

  function renderExplorerHome(record) {
    record.previousExplorerView = "home";
    record.address.textContent = "Início";
    record.content.innerHTML = `
      <div class="explorer-layout">
        ${sidebarMarkup("home")}
        <section class="explorer-main">
          <h2>Acesso rápido</h2>
          <div class="folder-grid">${folderTilesMarkup()}</div>
        </section>
      </div>`;
  }

  function renderFolder(record, folderId) {
    record.fileViewId = null;
    const folder = folders.find((entry) => entry.id === folderId) || OSLab.fileSystem.get(folderId);
    if (!folder) return;
    record.currentFolderId = folderId;
    record.explorerSelection = OSLab.fileSystem.get(record.explorerSelection)?.parentId === folderId ? record.explorerSelection : null;
    record.explorerQuery = "";
    const items = OSLab.fileSystem.list(folderId).sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name, "pt-BR") : a.kind === "folder" ? -1 : 1);
    record.address.textContent = `${OSLab.fileSystem.pathLabel(folderId) || folder.name}`;
    record.previousExplorerView = folder.id;
    record.content.innerHTML = `
      <div class="explorer-layout">
        ${sidebarMarkup(folder.id)}
        <section class="file-browser" data-current-folder="${folderId}">
          <div class="explorer-file-toolbar">
            <button type="button" data-file-action="new-folder"><img src="assets/icons/context/new.png" alt="" /><span>Novo</span></button>
            <button type="button" data-file-action="cut" ${record.explorerSelection ? "" : "disabled"}><img src="assets/icons/context/cut.png" alt="" /><span>Recortar</span></button>
            <button type="button" data-file-action="copy" ${record.explorerSelection ? "" : "disabled"}><img src="assets/icons/context/copy.png" alt="" /><span>Copiar</span></button>
            <button type="button" data-file-action="paste" ${fileClipboard ? "" : "disabled"}><img src="assets/icons/context/restore-item.png" alt="" /><span>Colar</span></button>
            <button type="button" data-file-action="rename" ${record.explorerSelection ? "" : "disabled"}><img src="assets/icons/context/rename.png" alt="" /><span>Renomear</span></button>
            <button type="button" data-file-action="shortcut" ${record.explorerSelection && OSLab.fileSystem.get(record.explorerSelection)?.kind === "folder" ? "" : "disabled"}><img src="assets/icons/context/link.png" alt="" /><span>Criar atalho</span></button>
            <button type="button" data-file-action="delete" ${record.explorerSelection ? "" : "disabled"}><img src="assets/icons/context/delete.png" alt="" /><span>Excluir</span></button>
            <label><img src="assets/icons/search.png" alt="" /><input type="search" data-explorer-search placeholder="Pesquisar em ${escapeHtml(folder.name)}" aria-label="Pesquisar arquivos" /></label>
          </div>
          <div class="file-list-head"><span>Nome</span><span>Tipo</span><span>Tamanho</span></div>
          <div class="file-list" role="list">${items.map((item) => `
            <button type="button" class="file-list-row ${record.explorerSelection === item.id ? "is-selected" : ""}" data-file-item="${item.id}" role="listitem">
              <span><img src="${OSLab.icons.file(item)}" alt="" /><strong>${escapeHtml(item.name)}</strong></span><span>${item.kind === "folder" ? "Pasta de arquivos" : (item.mime || "Arquivo")}</span><span>${OSLab.systemTools.formatBytes(OSLab.fileSystem.bytesForItem(item.id))}</span>
            </button>`).join("") || `<div class="file-list-empty"><img src="${folder.icon || "assets/icons/win/folder.png"}" alt="" /><span>Esta pasta está vazia.</span></div>`}</div>
        </section>
      </div>`;
  }

  function beginExplorerRename(record, itemId) {
    const row = $(`[data-file-item="${itemId}"]`, record.content);
    const item = OSLab.fileSystem.get(itemId);
    const label = row?.querySelector("strong");
    if (!row || !item || !label) return;
    const input = document.createElement("input");
    input.className = "file-rename-input";
    input.value = item.name;
    input.setAttribute("aria-label", "Novo nome");
    label.replaceWith(input);
    input.focus(); input.select();
    let finished = false;
    const finish = (save) => {
      if (finished) return; finished = true;
      if (save && input.value.trim()) OSLab.fileSystem.rename(item.id, input.value.trim());
      renderFolder(record, item.parentId);
    };
    input.addEventListener("blur", () => finish(true));
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") finish(true); if (event.key === "Escape") finish(false); });
  }

  function renderExplorerSearch(record, query) {
    const list = $(".file-list", record.content);
    if (!list) return;
    const results = OSLab.fileSystem.search(query, record.currentFolderId);
    list.innerHTML = results.map((item) => `<button type="button" class="file-list-row is-search-result" data-file-item="${item.id}" role="listitem"><span><img src="${OSLab.icons.file(item)}" alt="" /><strong>${escapeHtml(item.name)}</strong></span><span>${item.mime || "Arquivo"}</span><span>${escapeHtml(OSLab.fileSystem.pathLabel(item.parentId))}</span></button>`).join("") || `<div class="file-list-empty"><img src="assets/icons/search.png" alt="" /><span>Nenhum resultado encontrado.</span></div>`;
    OSLab.events.emit("file:searched", { query, parentFolderId: record.currentFolderId, resultIds: results.map((item) => item.id) }, "explorer");
  }

  function renderTextFile(record, fileId) {
    const file = OSLab.fileSystem.get(fileId);
    if (!file) return;
    record.fileViewId = file.id;
    record.previousExplorerView = file.parentId;
    record.address.textContent = `${OSLab.fileSystem.pathLabel(file.parentId)}  ›  ${file.name}`;
    const editable = file.mime === "text/plain" || file.name.toLocaleLowerCase("pt-BR").endsWith(".txt");
    record.content.innerHTML = editable ? `
      <section class="text-file-view">
        <header><img src="assets/icons/notepad.png" alt="" /><strong>${escapeHtml(file.name)}</strong><span>Salvo automaticamente</span></header>
        <textarea data-text-file="${file.id}" aria-label="Conteúdo de ${escapeHtml(file.name)}" placeholder="Comece a digitar...">${escapeHtml(file.content || "")}</textarea>
      </section>` : `<section class="generic-file-view"><img src="${OSLab.icons.file(file)}" alt="" /><h2>${escapeHtml(file.name)}</h2><p>${escapeHtml(file.mime || "Arquivo")}</p><span>Visualização educacional do OSLab</span></section>`;
  }

  function renderRecycleBin(record) {
    record.previousExplorerView = "recycle";
    record.address.textContent = "Lixeira";
    const recycleItems = OSLab.fileSystem.recycleItems();
    const selectedId = record.recycleSelection && recycleItems.some((item) => item.id === record.recycleSelection)
      ? record.recycleSelection
      : null;
    record.recycleSelection = selectedId;

    if (!recycleItems.length) {
      record.content.innerHTML = `
        <div class="explorer-layout">
          ${sidebarMarkup("recycle")}
          <section class="empty-folder">
            <div>
              <img src="assets/icons/recycle-bin.png" alt="" />
              <span>A Lixeira está vazia.</span>
            </div>
          </section>
        </div>`;
      return;
    }

    const rows = recycleItems
      .map((item) => {
        const deletedAt = new Date(item.trashedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
        return `
          <button type="button" class="recycle-row ${selectedId === item.id ? "is-selected" : ""}" data-recycle-item="${item.id}">
            <span class="recycle-name"><img src="${OSLab.icons.file(item)}" alt="" /><strong>${escapeHtml(item.name)}</strong></span>
            <span>${escapeHtml(OSLab.fileSystem.pathLabel(item.originalParentId))}</span>
            <span>${deletedAt}</span>
            <span>${OSLab.systemTools.formatBytes(OSLab.fileSystem.bytesForItem(item.id))}</span>
          </button>`;
      })
      .join("");

    record.content.innerHTML = `
      <div class="explorer-layout">
        ${sidebarMarkup("recycle")}
        <section class="recycle-main">
          <div class="recycle-actions" aria-label="Ações da Lixeira">
            <button type="button" data-recycle-action="restore" ${selectedId ? "" : "disabled"}>
              <img src="assets/icons/context/restore-item.png" alt="" /><span>Restaurar</span>
            </button>
            <button type="button" data-recycle-action="delete" ${selectedId ? "" : "disabled"}>
              <img src="assets/icons/context/delete.png" alt="" /><span>Excluir permanentemente</span>
            </button>
            <button type="button" data-recycle-action="empty">
              <img src="assets/icons/recycle-bin.png" alt="" /><span>Esvaziar Lixeira</span>
            </button>
          </div>
          <div class="recycle-table" role="table" aria-label="Itens da Lixeira">
            <div class="recycle-head" role="row"><span>Nome</span><span>Local original</span><span>Data da exclusão</span><span>Tamanho</span></div>
            <div class="recycle-rows">${rows}</div>
          </div>
        </section>
      </div>`;
  }

  function renderTaskManager(record, query = record.taskQuery || "") {
    record.taskQuery = query;
    record.address.textContent = "Processos";
    const titleSearchInput = $("input", record.settingsSearch);
    if (titleSearchInput && titleSearchInput.value !== query) titleSearchInput.value = query;
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    const visibleProcesses = taskProcesses.filter((process) =>
      process.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery) || String(process.pid).includes(normalizedQuery),
    );
    if (!visibleProcesses.some((process) => process.id === record.selectedProcessId)) record.selectedProcessId = null;

    const navItems = [
      ["processes", "Processos", "assets/icons/taskmanager/details.png"],
      ["performance", "Desempenho", "assets/icons/taskmanager/performance.png"],
      ["history", "Histórico de aplicativos", "assets/icons/taskmanager/history.png"],
      ["startup", "Aplicativos de inicialização", "assets/icons/taskmanager/startup.png"],
      ["users", "Usuários", "assets/icons/taskmanager/users.png"],
      ["details", "Detalhes", "assets/icons/taskmanager/details.png"],
      ["services", "Serviços", "assets/icons/taskmanager/services.png"],
    ];
    const processRows = visibleProcesses
      .map((process) => `
        <button type="button" class="task-process-row ${record.selectedProcessId === process.id ? "is-selected" : ""}" data-process-id="${process.id}">
          <span class="task-process-name"><img src="${process.icon}" alt="" /><strong>${process.name}</strong></span>
          <span class="task-process-status"></span>
          <span class="task-use">${process.cpu.toLocaleString("pt-BR", { minimumFractionDigits: process.cpu ? 1 : 0 })}%</span>
          <span class="task-use">${process.memory.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} MB</span>
          <span class="task-use">${process.disk ? process.disk.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) : "0"} MB/s</span>
          <span class="task-use">${process.network} Mbps</span>
        </button>`)
      .join("");

    record.content.innerHTML = `
      <section class="taskmanager-page">
        <aside class="taskmanager-sidebar" aria-label="Navegação do Gerenciador de Tarefas">
          <div class="taskmanager-hamburger"><img src="assets/icons/taskmanager/more.png" alt="" /></div>
          <nav>${navItems.map(([id, label, icon]) => `
            <button type="button" class="${id === "processes" ? "is-active" : ""}" data-task-nav="${id}">
              <img src="${icon}" alt="" /><span>${label}</span>
            </button>`).join("")}</nav>
          <button type="button" class="taskmanager-settings" data-task-nav="settings">
            <img src="assets/icons/taskmanager/settings.png" alt="" /><span>Configurações</span>
          </button>
        </aside>
        <div class="taskmanager-workspace">
          <div class="taskmanager-commandbar">
            <h2>Processos</h2>
            <div>
              <button type="button" data-task-action="run"><img src="assets/icons/taskmanager/run.png" alt="" /><span>Executar nova tarefa</span></button>
              <button type="button" data-task-action="end" ${record.selectedProcessId ? "" : "disabled"}><img src="assets/icons/context/delete.png" alt="" /><span>Finalizar tarefa</span></button>
              <button type="button" disabled><img src="assets/icons/taskmanager/performance.png" alt="" /><span>Modo de eficiência</span></button>
              <button type="button" aria-label="Mais opções"><img src="assets/icons/taskmanager/more.png" alt="" /></button>
            </div>
          </div>
          <div class="task-process-table" role="table" aria-label="Processos em execução">
            <div class="task-process-head" role="row">
              <span>Nome</span><span>Status</span><span><strong>2%</strong>CPU</span><span><strong>18%</strong>Memória</span><span><strong>0%</strong>Disco</span><span><strong>0%</strong>Rede</span>
            </div>
            <div class="task-process-rows">
              ${processRows}
              <p class="task-no-results ${visibleProcesses.length ? "is-hidden" : ""}">Nenhum processo encontrado.</p>
            </div>
          </div>
        </div>
      </section>`;
  }

  function renderGoogle(record) {
    if (OSLab.browserApp) { OSLab.browserApp.render(record); return; }
    record.address.textContent = "https://www.google.com.br";
    record.content.innerHTML = `
      <section class="google-page">
        <img class="google-logo" src="assets/icons/google.png" alt="Google" />
        <h2 class="google-wordmark">Google</h2>
        <form class="google-search-form" data-google-form>
          <img src="assets/icons/search.png" alt="" />
          <input name="q" type="search" aria-label="Pesquisar no Google" placeholder="Pesquise no Google" autocomplete="off" />
          <button type="submit">Pesquisar</button>
        </form>
        <p class="google-hint">A pesquisa usa a rede virtual do OSLab e funciona sem internet real.</p>
      </section>`;
  }

  function renderTerminal(record) {
    if (OSLab.terminalApp) { OSLab.terminalApp.render(record); return; }
    record.address.textContent = "Terminal";
    record.content.innerHTML = `
      <section class="terminal-page" aria-label="Terminal do OSLab">
        <p>Microsoft Windows [versão 11.0.26100.4652]</p>
        <p>(c) OSLab. Todos os direitos reservados.</p>
        <p class="terminal-prompt">C:\\Users\\Aluno&gt;<span aria-hidden="true"></span></p>
      </section>`;
  }

  function renderTextEditor(record) {
    const title = record.options?.title || "Editor de Texto";
    record.title.textContent = record.frozen ? `${title} — Não respondendo` : title;
    record.address.textContent = record.frozen ? "Não respondendo" : "Documento sem título";
    record.content.innerHTML = `<section class="editor-app ${record.frozen ? "is-frozen" : ""}">
      <header><button type="button" ${record.frozen ? "disabled" : ""}>Arquivo</button><button type="button" ${record.frozen ? "disabled" : ""}>Editar</button><span>${record.frozen ? "O aplicativo não está respondendo" : "Salvo localmente no simulador"}</span></header>
      <textarea ${record.frozen ? "disabled" : ""} aria-label="Editor de texto" placeholder="Digite seu texto aqui...">${record.frozen ? "O Editor de Texto parou de responder. Use o Gerenciador de Tarefas para encerrar este processo." : ""}</textarea>
    </section>`;
  }

  function settingsNavMarkup(active) {
    return settingsSections
      .map(
        (section) => `
          <button
            type="button"
            class="settings-nav-item ${active === section.id ? "is-active" : ""}"
            data-settings-page="${section.id}"
            data-settings-label="${section.name.toLocaleLowerCase("pt-BR")}"
          >
            <img src="${section.icon}" alt="" />
            <span>${section.name}</span>
          </button>`,
      )
      .join("");
  }

  function wallpaperOptionsMarkup(compact = false) {
    return wallpapers
      .map(
        (wallpaper) => `
          <button
            type="button"
            class="wallpaper-option ${compact ? "is-compact" : ""} ${wallpaper.id === currentWallpaperId ? "is-selected" : ""}"
            data-wallpaper="${wallpaper.id}"
            aria-label="Usar o fundo ${wallpaper.name}"
            aria-pressed="${wallpaper.id === currentWallpaperId}"
          >
            <img src="${wallpaper.src}" alt="${wallpaper.name}" />
          </button>`,
      )
      .join("");
  }

  function settingsShellMarkup(active, mainContent) {
    return `
      <div class="settings-shell">
        <aside class="settings-sidebar" aria-label="Categorias das Configurações">
          <div class="settings-profile">
            <img src="assets/icons/avatar.webp" alt="Perfil do aluno" />
            <span><strong>Aluno</strong><small>Conta local</small></span>
          </div>
          <nav class="settings-nav">${settingsNavMarkup(active)}</nav>
        </aside>
        <main class="settings-main">${mainContent}</main>
      </div>`;
  }

  function settingsHomeMarkup() {
    const network = OSLab.network.getSnapshot();
    return `
      <header class="settings-page-heading">
        <h1>Início</h1>
      </header>
      <section class="settings-overview" aria-label="Resumo do dispositivo">
        <div class="settings-device-summary">
          <img data-current-wallpaper src="${wallpapers.find((item) => item.id === currentWallpaperId).src}" alt="Plano de fundo atual" />
          <span><strong>OSLAB-ALUNO</strong><small>Computador virtual</small><button type="button">Renomear</button></span>
        </div>
        <div class="settings-status-summary">
          <img src="assets/settings/Network-internet.webp" alt="" />
          <span><strong>${network.connectionType === "ethernet" ? "Ethernet" : network.connectedSsid || "Wi-Fi"}</strong><small>${network.internetAvailable ? "Conectado, seguro" : "Sem conexão"}</small></span>
        </div>
        <div class="settings-status-summary">
          <img src="assets/settings/Windows-Update.webp" alt="" />
          <span><strong>Windows Update</strong><small>Está tudo atualizado</small></span>
        </div>
      </section>
      <section class="settings-home-grid">
        <article class="settings-card recommended-card">
          <header>
            <h2>Configurações recomendadas</h2>
            <p>Configurações recentes e comumente usadas</p>
          </header>
          <button type="button" class="settings-row" data-settings-page="system">
            <img src="assets/settings/System.webp" alt="" />
            <span>Tela</span>
            <img class="settings-chevron" src="assets/icons/ui/right.png" alt="" />
          </button>
          <button type="button" class="settings-row" data-settings-page="network">
            <img src="assets/settings/Network-internet.webp" alt="" />
            <span>Wi-Fi</span><small>${state.quickSettings.wifi ? "Ativado" : "Desativado"}</small>
            <span class="settings-switch ${state.quickSettings.wifi ? "is-active" : ""}" aria-hidden="true"></span>
            <img class="settings-chevron" src="assets/icons/ui/right.png" alt="" />
          </button>
          <button type="button" class="settings-row" data-settings-page="time">
            <img src="assets/settings/Time-language.webp" alt="" />
            <span>Data e hora</span>
            <img class="settings-chevron" src="assets/icons/ui/right.png" alt="" />
          </button>
        </article>
        <article class="settings-card personalize-card">
          <header>
            <img src="assets/settings/Personalisation.webp" alt="" />
            <div><h2>Personalizar seu dispositivo</h2><p>Escolha um dos fundos disponíveis no OSLab</p></div>
          </header>
          <div class="wallpaper-grid is-home">${wallpaperOptionsMarkup(true)}</div>
          <button type="button" class="settings-row personalize-more" data-settings-page="personalization">
            <img src="assets/settings/Personalisation.webp" alt="" />
            <span>Plano de fundo, cores e temas</span>
            <img class="settings-chevron" src="assets/icons/ui/right.png" alt="" />
          </button>
        </article>
      </section>`;
  }

  function settingsRowsMarkup(rows) {
    return rows
      .map(
        (row) => `
          <button
            type="button"
            class="settings-row detailed-settings-row"
            ${row.page ? `data-settings-page="${row.page}"` : ""}
            ${row.toggle ? `data-state-toggle="${row.toggle}"` : ""}
          >
            <img src="${row.icon}" alt="" />
            <span><strong>${row.name}</strong><small>${row.description}</small></span>
            ${row.action ? `<em>${row.action}</em>` : ""}
            ${row.toggle ? `<small class="settings-toggle-label">${state.quickSettings[row.toggle] ? "Ativado" : "Desativado"}</small><span class="settings-switch ${state.quickSettings[row.toggle] ? "is-active" : ""}" aria-hidden="true"></span>` : ""}
            <img class="settings-chevron" src="assets/icons/ui/right.png" alt="" />
          </button>`,
      )
      .join("");
  }

  function settingsSystemMarkup() {
    const rows = [
      { name: "Tela", description: "Monitores, brilho, luz noturna, perfil de exibição", icon: "assets/icons/context/display.png" },
      { name: "Som", description: "Níveis de volume, saída, entrada, dispositivos de som", icon: "assets/icons/settings-rows/sound.png" },
      { name: "Notificações", description: "Alertas de aplicativos e do sistema, não incomodar", icon: "assets/settings/Windows-Update.webp" },
      { name: "Foco", description: "Reduza as distrações", icon: "assets/icons/settings-rows/focus.png" },
      { name: "Energia", description: "Tela e suspensão, modo de energia, economia de energia", icon: "assets/icons/ui/power.png" },
      { name: "Armazenamento", description: "Espaço de armazenamento, unidades, regras de configuração", icon: "assets/icons/settings-rows/storage.png", page: "storage" },
      { name: "Compartilhamento por proximidade", description: "Capacidade de descoberta, local de arquivos recebidos", icon: "assets/icons/settings-rows/nearshare.png" },
      { name: "Multitarefas", description: "Ajustar janelas, áreas de trabalho, mudança de tarefas", icon: "assets/icons/settings-rows/multitasking.png" },
      { name: "Avançado", description: "Desempenho, otimização e recursos de desenvolvedor", icon: "assets/icons/settings.png" },
      { name: "Ativação", description: "Estado de ativação, assinaturas, chave do produto", icon: "assets/icons/settings-rows/vpn.png" },
      { name: "Solução de Problemas", description: "Soluções de problemas recomendadas, preferências, histórico", icon: "assets/icons/settings-rows/troubleshoot.png" },
    ];
    const current = wallpapers.find((item) => item.id === currentWallpaperId) || wallpapers[0];
    return `
      <header class="settings-page-heading"><h1>Sistema</h1></header>
      <section class="settings-category-hero system-hero">
        <div class="settings-device-summary">
          <img data-current-wallpaper src="${current.src}" alt="Plano de fundo atual" />
          <span><strong>OSLAB-ALUNO</strong><small>Computador virtual</small><button type="button">Renomear</button></span>
        </div>
        <div class="settings-status-summary update-summary">
          <img src="assets/settings/Windows-Update.webp" alt="" />
          <span><strong>Windows Update</strong><small>Está tudo atualizado</small></span>
        </div>
      </section>
      <article class="settings-card detailed-settings-card">${settingsRowsMarkup(rows)}</article>`;
  }

  function settingsBluetoothMarkup() {
    const rows = [
      { name: "Dispositivos", description: "Mouse, teclado, caneta, áudio, telas e encaixes, outros dispositivos", icon: "assets/icons/settings-rows/devices.png", action: "Adicionar dispositivo" },
      { name: "Impressoras e scanners", description: "Preferências", icon: "assets/icons/explorer.png" },
      { name: "Dispositivos móveis", description: "Acesse instantaneamente seus dispositivos móveis por meio do computador", icon: "assets/icons/settings-rows/mobile.png" },
      { name: "Câmeras", description: "Câmeras conectadas, configurações de imagem padrão", icon: "assets/icons/settings-rows/camera.png" },
      { name: "Mouse", description: "Botões, velocidade do ponteiro do mouse, rolagem", icon: "assets/icons/settings-rows/devices.png" },
      { name: "Teclado", description: "Repetição de caracteres, teclas de atalho", icon: "assets/icons/settings-rows/keyboard.png" },
      { name: "Caneta e Windows Ink", description: "Destro ou canhoto, botão de atalho da caneta, manuscrito", icon: "assets/icons/context/rename.png" },
      { name: "Reprodução Automática", description: "Padrões para unidades de disco removíveis e cartões de memória", icon: "assets/icons/settings-rows/video.png" },
      { name: "USB", description: "Notificações, economia de bateria USB", icon: "assets/icons/settings-rows/usb.png" },
    ];
    return `<header class="settings-page-heading"><h1>Bluetooth e dispositivos</h1></header><article class="settings-card detailed-settings-card">${settingsRowsMarkup(rows)}</article>`;
  }

  function settingsNetworkMarkup() {
    return OSLab.systemTools.networkMarkup();
  }

  function settingsPersonalizationOverviewMarkup() {
    const rows = [
      { name: "Tela de fundo", description: "Imagem de tela de fundo, cor, apresentação de slides", icon: "assets/icons/settings-rows/personalize.png", page: "background" },
      { name: "Cores", description: "Cor de destaque, efeitos de transparência, tema de cor", icon: "assets/icons/settings-rows/colors.png" },
      { name: "Temas", description: "Instalar, criar, gerenciar", icon: "assets/icons/settings-rows/themes.png" },
      { name: "Iluminação Dinâmica", description: "Dispositivos conectados, efeitos, configurações do aplicativo", icon: "assets/icons/ui/brightness.png" },
      { name: "Tela de bloqueio", description: "Imagens da tela de bloqueio, aplicativos, animações", icon: "assets/icons/settings-rows/lock.png" },
      { name: "Entrada de texto", description: "Teclado virtual, digitação por voz, emojis e muito mais, IME", icon: "assets/icons/settings-rows/keyboard.png" },
      { name: "Iniciar", description: "Itens e aplicativos recentes, pastas", icon: "assets/icons/start.png" },
      { name: "Barra de Tarefas", description: "Comportamentos da barra de tarefas, itens fixados do sistema", icon: "assets/icons/settings-rows/multitasking.png" },
      { name: "Fontes", description: "Instalar, gerenciar", icon: "assets/icons/notepad.png" },
      { name: "Uso do dispositivo", description: "Personalize sugestões com base em como você usa o computador", icon: "assets/icons/settings.png" },
    ];
    const current = wallpapers.find((item) => item.id === currentWallpaperId) || wallpapers[0];
    return `
      <header class="settings-page-heading"><h1>Personalização</h1></header>
      <section class="personalization-hero">
        <div class="personalization-preview"><img data-current-wallpaper src="${current.src}" alt="${current.name}" /><span></span></div>
        <div class="personalization-themes"><strong>Selecionar um tema para aplicar</strong><div class="wallpaper-grid is-overview">${wallpaperOptionsMarkup(true)}</div></div>
      </section>
      <article class="settings-card detailed-settings-card">${settingsRowsMarkup(rows)}</article>`;
  }

  function installedAppsMarkup() {
    const programs = OSLab.software.getInstalledPrograms();
    return '<header class="settings-page-heading"><button type="button" data-settings-page="apps">‹</button><h1>Aplicativos instalados</h1></header><section class="installed-settings-list">' +
      (programs.length ? programs.map((p) => '<article><img src="' + escapeHtml(p.icon) + '" alt="" /><div><strong>' + escapeHtml(p.name) + '</strong><small>' + escapeHtml(p.publisher) + ' · ' + escapeHtml(p.size) + '</small></div><button type="button" data-uninstall-program="' + p.id + '">Desinstalar</button></article>').join('') : '<p>Nenhum aplicativo adicional instalado.</p>') + '</section>';
  }

  function settingsAppsMarkup() {
    const rows = [
      { name: "Aplicativos instalados", page: "installed-apps", description: "Desinstalar e gerenciar aplicativos no computador", icon: "assets/settings/Apps.webp" },
      { name: "Configurações avançadas dos aplicativos", description: "Escolha onde obter aplicativos, arquivar aplicativos, desinstalar atualizações", icon: "assets/icons/settings.png" },
      { name: "Aplicativos padrão", description: "Padrões para tipos de arquivos e de links, outros padrões", icon: "assets/icons/chrome.png" },
      { name: "Ações", description: "O Windows pode recomendar ações desses aplicativos.", icon: "assets/icons/context/new.png" },
      { name: "Mapas offline", description: "Downloads, local de armazenamento, atualizações de mapa", icon: "assets/icons/settings-rows/maps.png" },
      { name: "Aplicativos para sites", description: "Sites que podem ser abertos em um aplicativo, em vez de um navegador", icon: "assets/icons/context/link.png" },
      { name: "Reprodução de vídeo", description: "Ajustes de vídeo, streaming HDR, opções de bateria", icon: "assets/icons/settings-rows/video.png" },
      { name: "Inicialização", description: "Aplicativos iniciados automaticamente quando você entra", icon: "assets/icons/ui/power.png" },
      { name: "Continuar", description: "Continuar o trabalho nos diferentes dispositivos", icon: "assets/icons/settings-rows/devices.png" },
    ];
    return `<header class="settings-page-heading"><h1>Aplicativos</h1></header><article class="settings-card detailed-settings-card">${settingsRowsMarkup(rows)}</article>`;
  }

  function settingsTimeMarkup() {
    const rows = [
      { name: "Data e hora", description: "Fusos horários, configurações automáticas do relógio, exibição do calendário", icon: "assets/icons/settings-rows/calendar.png" },
      { name: "Idioma e região", description: "Idioma de exibição do Windows, idiomas preferenciais, formatos regionais", icon: "assets/icons/settings-rows/location.png" },
      { name: "Digitação", description: "Teclado virtual, sugestões de texto, preferências", icon: "assets/icons/settings-rows/keyboard.png" },
      { name: "Fala", description: "Idioma de fala, configuração do microfone de reconhecimento de fala, vozes", icon: "assets/icons/settings-rows/voice.png" },
    ];
    return `
      <header class="settings-page-heading"><h1>Hora e idioma</h1></header>
      <section class="settings-time-hero">
        <div class="settings-live-time"><strong data-settings-time>--:--</strong><small data-settings-date></small></div>
        <div class="time-stat"><img src="assets/icons/settings-rows/calendar.png" alt="" /><span><strong>Fuso horário</strong><small>(UTC-03:00) Fortaleza</small></span></div>
        <div class="time-stat"><img src="assets/icons/settings-rows/location.png" alt="" /><span><strong>Região</strong><small>Brasil</small></span></div>
      </section>
      <article class="settings-card detailed-settings-card">${settingsRowsMarkup(rows)}</article>`;
  }

  function settingsBackgroundMarkup() {
    const current = wallpapers.find((item) => item.id === currentWallpaperId) || wallpapers[0];
    return `
      <header class="settings-page-heading with-back">
        <button type="button" data-settings-back="personalization" aria-label="Voltar para Personalização">
          <img src="assets/icons/ui/left.png" alt="" />
        </button>
        <div><small>Personalização</small><h1>Plano de fundo</h1></div>
      </header>
      <article class="settings-card wallpaper-settings-card">
        <div class="wallpaper-preview">
          <img data-current-wallpaper src="${current.src}" alt="${current.name}" />
        </div>
        <div class="wallpaper-current-copy">
          <img src="assets/settings/Personalisation.webp" alt="" />
          <span><strong>Personalize seu plano de fundo</strong><small data-wallpaper-name>${current.name}</small></span>
        </div>
        <div class="wallpaper-picker-heading">
          <span><strong>Escolha uma imagem</strong><small>A alteração é aplicada imediatamente e fica salva neste navegador.</small></span>
        </div>
        <div class="wallpaper-grid is-settings">${wallpaperOptionsMarkup()}</div>
        <label class="settings-select-row">
          <span><strong>Escolher um ajuste</strong><small>Defina como a imagem preenche a área de trabalho.</small></span>
          <select aria-label="Ajuste da imagem">
            <option>Preencher</option>
            <option>Ajustar</option>
            <option>Estender</option>
            <option>Centralizar</option>
          </select>
        </label>
      </article>`;
  }

  function settingsGenericMarkup(section) {
    return `
      <header class="settings-page-heading with-back">
        <button type="button" data-settings-back="home" aria-label="Voltar para Início">
          <img src="assets/icons/ui/left.png" alt="" />
        </button>
        <div><h1>${section.name}</h1><p>${section.description}</p></div>
      </header>
      <article class="settings-card generic-settings-card">
        ${(section.items || [])
          .map(
            (item, index) => `
              <button type="button" class="settings-row generic-settings-row" data-settings-toggle>
                <img src="${section.icon}" alt="" />
                <span><strong>${item}</strong><small>${index === 0 ? "Configuração principal" : "Opções do dispositivo"}</small></span>
                ${index === 0 ? '<span class="settings-switch" aria-hidden="true"></span>' : ""}
                <img class="settings-chevron" src="assets/icons/ui/right.png" alt="" />
              </button>`,
          )
          .join("")}
      </article>`;
  }

  function renderSettings(record, pageId = record.settingsView || state.lastSettingsPage || "home") {
    const isBackground = pageId === "background";
    const isStorage = pageId === "storage";
    const section = isBackground
      ? settingsSections.find((item) => item.id === "personalization")
      : pageId === "installed-apps" ? settingsSections.find((item) => item.id === "apps") : isStorage ? settingsSections.find((item) => item.id === "system")
      : settingsSections.find((item) => item.id === pageId) || settingsSections[0];
    record.settingsView = pageId === "installed-apps" ? "installed-apps" : isBackground ? "background" : isStorage ? "storage" : section.id;
    record.address.textContent = isBackground ? "Plano de fundo" : isStorage ? "Armazenamento" : section.name;
    state.lastSettingsPage = record.settingsView;
    saveState();

    let mainContent = settingsHomeMarkup();
    if (pageId === "installed-apps") mainContent = installedAppsMarkup();
    else if (isBackground) mainContent = settingsBackgroundMarkup();
    else if (isStorage) mainContent = OSLab.systemTools.storageMarkup();
    else if (section.id === "system") mainContent = settingsSystemMarkup();
    else if (section.id === "bluetooth") mainContent = settingsBluetoothMarkup();
    else if (section.id === "network") mainContent = settingsNetworkMarkup();
    else if (section.id === "personalization") mainContent = settingsPersonalizationOverviewMarkup();
    else if (section.id === "apps") mainContent = settingsAppsMarkup();
    else if (section.id === "time") mainContent = settingsTimeMarkup();
    else if (section.id !== "home") mainContent = settingsGenericMarkup(section);

    record.content.innerHTML = settingsShellMarkup(section.id, mainContent);
    OSLab.systemTools.wire(record, () => renderSettings(record, record.settingsView));
    applyWallpaper(currentWallpaperId, false);
    updateClock();
  }

  function renderApp(record) {
    if (record.appId === "computer") renderComputer(record);
    if (record.appId === "explorer") renderExplorerHome(record);
    if (record.appId === "recycle") renderRecycleBin(record);
    if (["google", "edge", "firefox", "brave", "opera"].includes(record.appId)) renderGoogle(record);
    if (record.appId === "settings") renderSettings(record);
    if (record.appId === "terminal") renderTerminal(record);
    if (record.appId === "taskmanager") OSLab.taskManagerApp ? OSLab.taskManagerApp.render(record) : renderTaskManager(record);
    if (record.appId === "missions") OSLab.missionsApp.render(record);
    if (record.appId === "exercises") OSLab.exercisesApp.render(record);
    if (record.appId === "vpn") OSLab.vpnApp.render(record);
    if (record.appId === "vpnlab") OSLab.vpnLabApp.render(record);
    if (record.appId === "installlab") OSLab.installLabApp.render(record);
    if (record.appId === "browsertrail") OSLab.browserTrailsApp.renderTrail(record);
    if (record.appId === "browsermuseum") OSLab.browserTrailsApp.renderMuseum(record);
    if (OSLab.softwareApps?.appIds?.has(record.appId)) OSLab.softwareApps.render(record);
    if (record.appId === "texteditor") renderTextEditor(record);
  }

  function focusWindow(record) {
    if (!record || !record.element.isConnected) return;
    const wasMinimized = record.element.classList.contains("is-minimized");
    record.element.classList.remove("is-minimized");
    constrainBrowserWindow(record);
    window.requestAnimationFrame(() => constrainBrowserWindow(record));
    zCounter += 1;
    record.element.style.zIndex = String(zCounter);
    windows.forEach((item) => item.element.classList.toggle("is-focused", item === record));
    updateTaskbarState();
    document.dispatchEvent(new CustomEvent("oslab:window-focused", { detail: { windowId: record.windowId, appId: record.appId } }));
    if (wasMinimized) OSLab.events.emit("window:restored", { windowId: record.windowId, appId: record.appId }, "windowManager");
  }

  function positionWindow(record) {
    if (window.innerWidth <= 800) return;
    const index = Math.max(0, windows.size - 1);
    const windowWidth = Math.min(860, window.innerWidth * 0.72);
    const windowHeight = Math.min(580, window.innerHeight * 0.76);
    const left = Math.min(150 + index * 42, window.innerWidth - windowWidth - 28);
    const top = Math.min(38 + index * 34, window.innerHeight - windowHeight - 68);
    record.element.style.left = `${Math.max(18, left)}px`;
    record.element.style.top = `${Math.max(16, top)}px`;
  }

  function constrainBrowserWindow(record) {
    if (!record || !["google", "edge", "firefox", "brave", "opera"].includes(record.appId) || record.element.classList.contains("is-maximized")) return;
    const rect = record.element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const maxLeft = Math.max(0, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(0, window.innerHeight - rect.height - 56);
    record.element.style.left = `${Math.max(0, Math.min(rect.left, maxLeft))}px`;
    record.element.style.top = `${Math.max(0, Math.min(rect.top, maxTop))}px`;
  }

  window.addEventListener("resize", () => windows.forEach(constrainBrowserWindow));

  function createWindow(appId, options = {}) {
    const definition = appDefinitions[appId];
    if (!definition) return null;

    const element = windowTemplate.content.firstElementChild.cloneNode(true);
    const titleId = `window-title-${appId}`;
    const title = $("[data-window-role='title']", element);
    const record = {
      appId,
      windowId: appId,
      options,
      definition,
      element,
      title,
      titlebar: $("[data-window-role='titlebar']", element),
      toolbar: $("[data-window-role='toolbar']", element),
      address: $("[data-window-role='address']", element),
      content: $("[data-window-role='content']", element),
      resizeHandle: $("[data-window-role='resize']", element),
      maximizeIcon: $("[data-window-role='maximize-icon']", element),
      settingsSearch: $("[data-window-role='settings-search']", element),
      settingsView: appId === "settings" ? state.lastSettingsPage : "home",
      previousExplorerView: appId === "computer" ? "computer" : appId === "recycle" ? "recycle" : "home",
    };

    element.id = `oslab-window-${appId}`;
    element.dataset.app = appId;
    element.setAttribute("aria-labelledby", titleId);
    title.id = titleId;
    title.textContent = definition.title;
    $("[data-window-role='icon']", element).src = appId === "settings" ? "assets/icons/ui/left.png" : definition.icon;
    record.address.textContent = definition.address;
    record.toolbar.classList.toggle("browser-toolbar", ["google", "edge", "firefox", "brave", "opera"].includes(appId));
    element.classList.toggle("settings-window", appId === "settings");
    record.toolbar.classList.toggle("is-hidden", ["settings", "taskmanager", "missions", "exercises", "vpn", "vpnlab", "installlab", "browsertrail", "browsermuseum", "controlpanel", "installer", "appjavafx", "word", "excel", "slides", "texteditor"].includes(appId));
    record.settingsSearch.classList.toggle("is-hidden", appId !== "settings" && appId !== "taskmanager");
    element.classList.toggle("taskmanager-window", appId === "taskmanager");
    element.classList.toggle("missions-window", appId === "missions");
    element.classList.toggle("exercises-window", appId === "exercises");
    element.classList.toggle("vpn-window", appId === "vpn");
    element.classList.toggle("vpn-lab-window", appId === "vpnlab");
    element.classList.toggle("install-lab-window", appId === "installlab");
    element.classList.toggle("browser-trail-window", appId === "browsertrail");
    element.classList.toggle("browser-museum-window", appId === "browsermuseum");
    element.classList.toggle("software-window", OSLab.softwareApps?.appIds?.has(appId));
    element.classList.toggle("texteditor-window", appId === "texteditor");
    if (appId === "taskmanager") {
      const taskSearchInput = $("input", record.settingsSearch);
      taskSearchInput.placeholder = "Digite um nome, editor ou PID para pesquisar";
      taskSearchInput.setAttribute("aria-label", "Pesquisar processos");
    }

    windows.set(appId, record);
    windowLayer.appendChild(element);
    element.addEventListener("animationend", function onWindowAnimationEnd(event) {
      if (event.target !== element) return;
      element.removeEventListener("animationend", onWindowAnimationEnd);
      constrainBrowserWindow(record);
    });
    positionWindow(record);
    wireWindow(record);
    renderApp(record);
    if (["settings", "taskmanager", "missions", "exercises", "vpnlab", "installlab", "browsertrail", "browsermuseum"].includes(appId)) {
      element.classList.add("is-maximized");
      record.maximizeIcon.src = "assets/icons/ui/restore.png";
      record.maximizeIcon.closest("button").setAttribute("aria-label", "Restaurar");
    }
    focusWindow(record);
    const process = OSLab.processManager.ensureAppProcess({
      appId,
      windowId: record.windowId,
      name: definition.title,
      icon: definition.icon,
      status: "Em execução",
      cpu: appId === "taskmanager" ? 0.3 : 0.1,
      memory: ["google", "edge", "firefox", "brave", "opera"].includes(appId) ? 64.2 : ["missions", "exercises", "vpnlab", "installlab", "browsertrail", "browsermuseum"].includes(appId) ? 42.6 : ["word", "excel", "slides"].includes(appId) ? 78.4 : appId === "vpn" ? 34.8 : appId === "texteditor" ? 42 : 28.4,
      missionId: options.missionId || null,
      efficient: appId === "google",
    });
    record.pid = process.pid;
    OSLab.events.emit("app:opened", { appId, windowId: record.windowId, pid: process.pid }, "windowManager");
    if (options.frozen) {
      window.setTimeout(() => {
        if (!record.element.isConnected) return;
        record.frozen = true;
        OSLab.processManager.updateProcess(process.pid, { status: "Não respondendo", cpu: 0 });
        renderTextEditor(record);
      }, 1000);
    }
    return record;
  }

  function openApp(appId, options = {}) {
    if (OSLab.remoteContext?.allowedApps && !OSLab.remoteContext.allowedApps.has(appId)) return null;
    const requestedDefinition = appDefinitions[appId];
    if (requestedDefinition?.installedOnly && !OSLab.software?.isInstalled?.(appId)) {
      OSLab.ui.notify("Programa não instalado", `${requestedDefinition.title} precisa ser instalado antes de ser aberto.`, "warning");
      OSLab.events.emit("app:launch-blocked", { appId, reason: "not-installed" }, "windowManager");
      return null;
    }
    const existing = windows.get(appId);
    if (existing) {
      focusWindow(existing);
      closeFlyouts();
      return existing;
    }

    const launch = OSLab.systemState.isAppLaunchAllowed(appId);
    if (!launch.ok) {
      OSLab.ui.notify("Memória insuficiente", `Libere memória antes de abrir este aplicativo. Disponível: ${Math.round(launch.freeMb)} MB.`, "warning", 6000);
      OSLab.events.emit("app:launch-blocked", { appId, reason: launch.reason, freeMb: launch.freeMb, requiredMb: launch.requiredMb }, "windowManager");
      return null;
    }

    const record = createWindow(appId, options);
    closeFlyouts();
    return record;
  }

  function closeWindow(record, options = {}) {
    if (!record) return;
    if (record.browserState && OSLab.remoteContext) OSLab.remoteContext.browsers[record.appId] = JSON.parse(JSON.stringify(record.browserState));
    if (record.frozen && !options.force) {
      OSLab.ui.notify("O aplicativo não está respondendo", "Use o Gerenciador de Tarefas para finalizar o Editor de Texto.", "warning", 6000);
      OSLab.events.emit("window:close-blocked", { windowId: record.windowId, appId: record.appId }, "windowManager");
      return;
    }
    record.element.remove();
    windows.delete(record.appId);
    if (!options.fromProcessManager) OSLab.processManager.endByWindow(record.windowId, { reason: options.force ? "force-close" : "window-closed" });
    OSLab.events.emit("app:closed", { appId: record.appId, windowId: record.windowId, force: Boolean(options.force) }, "windowManager");
    const remaining = Array.from(windows.values()).filter((item) => !item.element.classList.contains("is-minimized"));
    const next = remaining.sort((a, b) => Number(b.element.style.zIndex) - Number(a.element.style.zIndex))[0];
    if (next) focusWindow(next);
    else updateTaskbarState();
  }

  function minimizeWindow(record) {
    record.element.classList.add("is-minimized");
    record.element.classList.remove("is-focused");
    const remaining = Array.from(windows.values()).filter((item) => !item.element.classList.contains("is-minimized"));
    const next = remaining.sort((a, b) => Number(b.element.style.zIndex) - Number(a.element.style.zIndex))[0];
    if (next) focusWindow(next);
    else updateTaskbarState();
    OSLab.events.emit("window:minimized", { windowId: record.windowId, appId: record.appId }, "windowManager");
  }

  function toggleMaximize(record) {
    const maximized = record.element.classList.toggle("is-maximized");
    record.maximizeIcon.src = maximized ? "assets/icons/ui/restore.png" : "assets/icons/ui/maximize.png";
    record.maximizeIcon.closest("button").setAttribute("aria-label", maximized ? "Restaurar" : "Maximizar");
    focusWindow(record);
    OSLab.events.emit(maximized ? "window:maximized" : "window:restored", { windowId: record.windowId, appId: record.appId }, "windowManager");
  }

  function setVolume(value, muted = state.muted, emit = true) {
    state.volume = Math.max(0, Math.min(100, Number(value) || 0));
    state.muted = Boolean(muted);
    saveState();
    const slider = $("#volume-slider");
    if (slider) slider.value = String(state.volume);
    const audioIcon = $("#taskbar-audio-icon");
    if (audioIcon) {
      audioIcon.src = "assets/icons/ui/audio.png";
      audioIcon.style.opacity = state.muted || state.volume === 0 ? "0.45" : "1";
      audioIcon.alt = state.muted ? "Som mudo" : `Volume ${state.volume}%`;
    }
    if (emit) OSLab.events.emit("volume:changed", { volume: state.volume, muted: state.muted }, "quickSettings");
  }

  OSLab.windowManager = {
    open: openApp,
    minimize(windowId) { const record = windows.get(windowId); if (record) minimizeWindow(record); },
    restore(windowId) { const record = windows.get(windowId); if (record) focusWindow(record); },
    maximize(windowId) { const record = windows.get(windowId); if (record && !record.element.classList.contains("is-maximized")) toggleMaximize(record); },
    close(windowId) { const record = windows.get(windowId); if (record) closeWindow(record); },
    forceCloseById(windowId, options = {}) { const record = windows.get(windowId); if (record) closeWindow(record, { ...options, force: true }); },
    isOpen(windowId) { return windows.has(windowId); },
    getWindows() { return Array.from(windows.values()); },
  };

  OSLab.shell = {
    openApp,
    bootRemote: showDesktop,
    closeApp(appId) { const record = windows.get(appId); if (record) closeWindow(record, { force: true }); },
    openFolder(folderId) { const record = openApp("explorer"); renderFolder(record, folderId); return record; },
    openRecycleBin() { const record = openApp("recycle"); renderRecycleBin(record); return record; },
    openSettings(page = "home") { const record = openApp("settings"); renderSettings(record, page); return record; },
    openTextEditor(options = {}) {
      const existing = windows.get("texteditor");
      if (existing && existing.options?.missionId !== options.missionId) closeWindow(existing, { force: true });
      const record = openApp("texteditor", options);
      record.options = { ...record.options, ...options };
      return { ...record, windowId: record.windowId, pid: record.pid };
    },
    closeMissionWindows(missionId) { Array.from(windows.values()).filter((record) => record.options?.missionId === missionId).forEach((record) => closeWindow(record, { force: true })); },
    isWindowOpen(windowId) { return windows.has(windowId); },
    refreshDesktop() { renderDesktopFolders(); const explorer = windows.get("explorer"); if (explorer?.currentFolderId) renderFolder(explorer, explorer.currentFolderId); },
    refreshPrograms() {
      renderDesktopFolders();
      renderInstalledStartApps();
      const controlPanel = windows.get("controlpanel");
      if (controlPanel) OSLab.softwareApps?.render?.(controlPanel);
    },
    setWallpaper(id, emit = true) { applyWallpaper(id, emit); if (!emit) { state.wallpaperId = id; saveState(); } },
    getWallpaper() { return currentWallpaperId; },
    setVolume,
    getAudioState() { return { volume: state.volume, muted: Boolean(state.muted) }; },
    tryDiagnosticDownload(sizeBytes, exerciseId = null) {
      const required = Math.max(0, Number(sizeBytes) || 0);
      if (OSLab.systemState.getStorage().freeBytes < required) {
        OSLab.ui.notify("Armazenamento insuficiente", "O download ainda não cabe no disco. Itens na Lixeira continuam ocupando espaço.", "warning");
        OSLab.events.emit("download:failed", { requiredBytes: required, freeBytes: OSLab.systemState.getStorage().freeBytes }, "browser");
        return false;
      }
      const file = OSLab.fileSystem.create({ parentId: OSLab.fileSystem.roots.downloads, kind: "file", name: "suporte-offline.zip", sizeBytes: required, createdByExercise: Boolean(exerciseId), exerciseId });
      OSLab.events.emit("download:completed", { fileId: file.id, sizeBytes: required }, "browser");
      OSLab.ui.notify("Download concluído", "suporte-offline.zip foi salvo em Downloads.", "success");
      this.refreshDesktop(); return true;
    },
    simulateRestart() {
      const seconds = OSLab.processManager.estimateBootTime();
      OSLab.systemState.configure({ lastBootSeconds: seconds });
      OSLab.events.emit("system:restarted", { bootSeconds: seconds }, "powerMenu");
      OSLab.ui.notify("Reinicialização simulada", `O computador iniciou em ${seconds} segundos.`, seconds <= 18 ? "success" : "warning");
      return seconds;
    },
    snapshotSystem() {
      return {
        fileClipboard: fileClipboard ? JSON.parse(JSON.stringify(fileClipboard)) : null,
        wallpaperId: currentWallpaperId, volume: state.volume, muted: Boolean(state.muted), lastSettingsPage: state.lastSettingsPage,
        openWindows: Array.from(windows.values()).map((record) => ({
          ui: Object.fromEntries(['browserState','browserPageState','googleQuery','browserHost','browserResult','downloadPanelOpen','bookmarkOpen','favoritesOpen','browserMenuOpen','installerStep','installerId','installProgress','installStartedAt','createDesktopShortcut','launchAfterInstall','controlView','controlSelected','explorerSelection','fileViewId','recycleSelection','previousExplorerView'].filter((key) => record[key] !== undefined).map((key) => [key, JSON.parse(JSON.stringify(record[key]))])),
          scroll: { top: record.content.scrollTop, left: record.content.scrollLeft },
          geometry: { left: record.element.style.left, top: record.element.style.top, width: record.element.style.width, height: record.element.style.height, z: record.element.style.zIndex, minimized: record.element.classList.contains('is-minimized'), maximized: record.element.classList.contains('is-maximized') },
          renameDraft: record.content.querySelector('.file-rename-input') ? { itemId: record.content.querySelector('.file-rename-input').closest('[data-file-item]').dataset.fileItem, value: record.content.querySelector('.file-rename-input').value } : null,
          searchDraft: record.content.querySelector('[data-explorer-search]')?.value || '',
          appId: record.appId, options: { ...(record.options || {}) }, settingsView: record.settingsView,
          browserHost: record.browserHost || null, browserResult: record.browserResult || null,
          terminalLines: record.terminalLines ? JSON.parse(JSON.stringify(record.terminalLines)) : null,
          taskNav: record.taskNav || null, currentFolderId: record.currentFolderId || null,
        })),
      };
    },
    restoreSystemSnapshot(input) {
      if (!input) return;
      fileClipboard = input.fileClipboard ? JSON.parse(JSON.stringify(input.fileClipboard)) : null;
      const windowSnapshots = input.openWindows || (input.openApps || []).map((appId) => ({ appId }));
      const openApps = new Set(windowSnapshots.map((entry) => entry.appId));
      Array.from(windows.values()).filter((record) => !openApps.has(record.appId)).forEach((record) => closeWindow(record, { force: true }));
      windowSnapshots.forEach((entry) => {
        if (!appDefinitions[entry.appId]) return;
        const record = windows.get(entry.appId) || openApp(entry.appId, entry.options || {});
        if (!record) return;
        Object.assign(record, entry.ui || {});
        record.options = { ...(entry.options || {}) };
        if (entry.settingsView) record.settingsView = entry.settingsView;
        if (entry.browserHost) { record.browserHost = entry.browserHost; record.browserResult = entry.browserResult; }
        if (entry.terminalLines) record.terminalLines = JSON.parse(JSON.stringify(entry.terminalLines));
        if (entry.taskNav) record.taskNav = entry.taskNav;
        if (entry.currentFolderId && entry.appId === "explorer") renderFolder(record, entry.currentFolderId); else renderApp(record);
        if (entry.ui?.fileViewId && entry.appId === 'explorer') renderTextFile(record, entry.ui.fileViewId);
        if (entry.searchDraft && entry.appId === 'explorer') { const field = record.content.querySelector('[data-explorer-search]'); if (field) { field.value = entry.searchDraft; renderExplorerSearch(record, entry.searchDraft); } }
        if (entry.renameDraft) { beginExplorerRename(record, entry.renameDraft.itemId); const field = record.content.querySelector('.file-rename-input'); if (field) field.value = entry.renameDraft.value; }
        if (entry.scroll) { record.content.scrollTop = entry.scroll.top; record.content.scrollLeft = entry.scroll.left; }
        if (entry.geometry) {
          for (const key of ['left','top','width','height']) record.element.style[key] = entry.geometry[key] || '';
          record.element.style.zIndex = entry.geometry.z || '30'; zCounter = Math.max(zCounter, Number(entry.geometry.z) || 30);
          record.element.classList.toggle('is-minimized', entry.geometry.minimized);
          record.element.classList.toggle('is-maximized', entry.geometry.maximized);
          record.maximizeIcon.src = entry.geometry.maximized ? 'assets/icons/ui/restore.png' : 'assets/icons/ui/maximize.png';
          record.maximizeIcon.closest('button').setAttribute('aria-label', entry.geometry.maximized ? 'Restaurar' : 'Maximizar');
        }
      });
      applyWallpaper(input.wallpaperId || "1", false); setVolume(input.volume, input.muted, false); state.lastSettingsPage = input.lastSettingsPage || "home";
    },
    setPersistenceSuspended(value) { persistenceSuspended = Boolean(value); },
    isPersistenceSuspended() { return persistenceSuspended; },
    persist: saveState,
    notify(title, message, kind = "info") { return OSLab.ui.notify(title, message, kind); },
    closeFlyouts,
    getRunnableApps() { return Object.entries(appDefinitions).filter(([id]) => !["computer", "recycle", "texteditor"].includes(id)).map(([id, app]) => ({ id, title: app.title, icon: app.icon })); },
  };

  OSLab.systemState.bindShell({
    snapshot: () => OSLab.shell.snapshotSystem(),
    restore: (input) => OSLab.shell.restoreSystemSnapshot(input),
    setPersistenceSuspended: (value) => OSLab.shell.setPersistenceSuspended(value),
    persist: saveState,
  });

  function wireWindow(record) {
    const { element, titlebar, content, toolbar, resizeHandle } = record;
    let dragState = null;
    let resizeState = null;

    element.addEventListener("pointerdown", () => focusWindow(record));

    $(".window-controls", element).addEventListener("click", (event) => {
      const action = event.target.closest("[data-window-action]")?.dataset.windowAction;
      if (action === "minimize") minimizeWindow(record);
      if (action === "maximize") toggleMaximize(record);
      if (action === "close") closeWindow(record);
    });

    titlebar.addEventListener("dblclick", (event) => {
      if (!event.target.closest(".window-controls")) toggleMaximize(record);
    });

    toolbar.addEventListener("click", (event) => {
      const action = event.target.closest("[data-toolbar-action]")?.dataset.toolbarAction;
      if (!action) return;

      if (action === "back" && record.appId !== "google") {
        if (record.currentFolderId) {
          const current = OSLab.fileSystem.get(record.currentFolderId);
          const parentId = current?.parentId;
          if (parentId) renderFolder(record, parentId);
          else renderExplorerHome(record);
        }
        else if (record.previousExplorerView === "computer") renderComputer(record);
        else if (record.previousExplorerView === "recycle") renderRecycleBin(record);
        else renderExplorerHome(record);
      }

      if (action === "refresh") renderApp(record);
    });

    content.addEventListener("click", async (event) => {
      const settingsPage = event.target.closest("[data-settings-page]");
      const settingsBack = event.target.closest("[data-settings-back]");
      const wallpaperButton = event.target.closest("[data-wallpaper]");
      const settingsToggle = event.target.closest("[data-settings-toggle]");
      const stateToggle = event.target.closest("[data-state-toggle]");
      const folderButton = event.target.closest("[data-folder]");
      const explorerView = event.target.closest("[data-explorer-view]");
      const recycleItem = event.target.closest("[data-recycle-item]");
      const recycleAction = event.target.closest("[data-recycle-action]")?.dataset.recycleAction;
      const processRow = event.target.closest("[data-process-id]");
      const taskAction = event.target.closest("[data-task-action]")?.dataset.taskAction;
      const fileItem = event.target.closest("[data-file-item]");
      const fileAction = event.target.closest("[data-file-action]")?.dataset.fileAction;

      const uninstallId = event.target.closest('[data-uninstall-program]')?.dataset.uninstallProgram;
      if (uninstallId && OSLab.software.isInstalled(uninstallId) && await OSLab.ui.confirm({ title: 'Desinstalar ' + OSLab.software.getProgram(uninstallId).name + '?', message: 'O aplicativo e seus atalhos serão removidos deste computador.', confirmLabel: 'Desinstalar' })) {
        OSLab.software.uninstall(uninstallId); renderSettings(record, 'installed-apps');
      }
      if (settingsPage && record.appId === "settings") renderSettings(record, settingsPage.dataset.settingsPage);
      if (settingsBack && record.appId === "settings") renderSettings(record, settingsBack.dataset.settingsBack);
      if (wallpaperButton && record.appId === "settings") applyWallpaper(wallpaperButton.dataset.wallpaper);
      if (settingsToggle && record.appId === "settings") {
        const toggle = $(".settings-switch", settingsToggle);
        if (toggle) toggle.classList.toggle("is-active");
      }
      if (stateToggle && record.appId === "settings") {
        const key = stateToggle.dataset.stateToggle;
        if (key === "wifi") OSLab.network.setWifi(!OSLab.network.getSnapshot().wifiEnabled);
        else if (key === "airplane") OSLab.network.setAirplaneMode(!OSLab.network.getSnapshot().airplaneMode);
        else { state.quickSettings[key] = !state.quickSettings[key]; saveState(); }
        renderSettings(record, record.settingsView);
        syncQuickSettings();
      }
      if (folderButton) renderFolder(record, folderButton.dataset.folder);
      if (explorerView?.dataset.explorerView === "home") renderExplorerHome(record);
      if (explorerView?.dataset.explorerView === "computer") renderComputer(record);
      if (explorerView?.dataset.explorerView === "recycle") renderRecycleBin(record);
      if (recycleItem) {
        record.recycleSelection = recycleItem.dataset.recycleItem;
        renderRecycleBin(record);
      }
      if (recycleAction === "restore" && record.recycleSelection) {
        restoreRecycleItem(record.recycleSelection);
        record.recycleSelection = null;
        renderRecycleBin(record);
      }
      if (recycleAction === "delete" && record.recycleSelection) {
        permanentlyDeleteRecycleItem(record.recycleSelection);
        record.recycleSelection = null;
        renderRecycleBin(record);
      }
      if (recycleAction === "empty") {
        if (await OSLab.ui.confirm({ title: "Esvaziar a Lixeira?", message: "Os itens serão apagados permanentemente.", confirmLabel: "Esvaziar" })) {
          OSLab.fileSystem.emptyRecycleBin(); record.recycleSelection = null; renderRecycleBin(record);
        }
      }
      if (fileItem && record.appId === "explorer") {
        record.explorerSelection = fileItem.dataset.fileItem;
        $$('[data-file-item]', record.content).forEach((row) => row.classList.toggle("is-selected", row === fileItem));
        $$('[data-file-action="cut"], [data-file-action="copy"], [data-file-action="rename"], [data-file-action="delete"]', record.content).forEach((button) => { button.disabled = false; });
        const selectedFile = OSLab.fileSystem.get(record.explorerSelection);
        const shortcutButton = record.content.querySelector('[data-file-action="shortcut"]'); if (shortcutButton) shortcutButton.disabled = selectedFile?.kind !== "folder";
        OSLab.events.emit("file:selected", { fileId: selectedFile?.id, name: selectedFile?.name, parentFolderId: selectedFile?.parentId }, "explorer");
      }
      if (fileAction && record.appId === "explorer") {
        const selectedFile = OSLab.fileSystem.get(record.explorerSelection);
        if (fileAction === "new-folder") {
          const folder = OSLab.fileSystem.create({ parentId: record.currentFolderId, kind: "folder", name: "Nova pasta" });
          record.explorerSelection = folder.id; renderFolder(record, record.currentFolderId); window.setTimeout(() => beginExplorerRename(record, folder.id), 30);
        }
        if ((fileAction === "cut" || fileAction === "copy") && selectedFile) { fileClipboard = { itemId: selectedFile.id, mode: fileAction }; renderFolder(record, record.currentFolderId); OSLab.ui.notify(fileAction === "cut" ? "Item recortado" : "Item copiado", selectedFile.name, "info"); }
        if (fileAction === "paste" && fileClipboard) {
          if (fileClipboard.mode === "cut") OSLab.fileSystem.move(fileClipboard.itemId, record.currentFolderId); else OSLab.fileSystem.copy(fileClipboard.itemId, record.currentFolderId);
          if (fileClipboard.mode === "cut") fileClipboard = null; renderFolder(record, record.currentFolderId); renderDesktopFolders();
        }
        if (fileAction === "shortcut" && selectedFile?.kind === "folder") {
          OSLab.fileSystem.create({ parentId: OSLab.fileSystem.roots.desktop, kind: "shortcut", name: selectedFile.name + " - Atalho", shortcutTargetId: selectedFile.id });
          renderDesktopFolders(); OSLab.ui.notify("Atalho criado", "O atalho está na Área de Trabalho.", "success");
        }
        if (fileAction === "rename" && selectedFile) beginExplorerRename(record, selectedFile.id);
        if (fileAction === "delete" && selectedFile) { OSLab.fileSystem.delete(selectedFile.id); record.explorerSelection = null; renderFolder(record, record.currentFolderId); renderDesktopFolders(); }
      }
      if (processRow && record.appId === "taskmanager" && !OSLab.taskManagerApp) {
        record.selectedProcessId = processRow.dataset.processId;
        renderTaskManager(record);
      }
      if (taskAction === "end" && record.appId === "taskmanager" && record.selectedProcessId && !OSLab.taskManagerApp) {
        taskProcesses = taskProcesses.filter((process) => process.id !== record.selectedProcessId);
        record.selectedProcessId = null;
        renderTaskManager(record);
      }
      if (taskAction === "run" && record.appId === "taskmanager" && !OSLab.taskManagerApp) {
        record.selectedProcessId = null;
        renderTaskManager(record);
        $("input", record.settingsSearch)?.focus();
      }
    });

    content.addEventListener("input", (event) => {
      const textFile = event.target.closest("[data-text-file]");
      if (textFile) {
        const file = OSLab.fileSystem.get(textFile.dataset.textFile);
        if (file) {
          file.content = textFile.value;
          saveState();
        }
      }

      const taskSearch = event.target.closest("[data-task-search]");
      if (taskSearch && record.appId === "taskmanager") {
        record.taskQuery = taskSearch.value;
        const query = taskSearch.value.trim().toLocaleLowerCase("pt-BR");
        let visibleCount = 0;
        $$("[data-process-id]", record.content).forEach((row) => {
          const process = taskProcesses.find((item) => item.id === row.dataset.processId);
          const matches = process && (process.name.toLocaleLowerCase("pt-BR").includes(query) || String(process.pid).includes(query));
          row.classList.toggle("is-hidden", !matches);
          if (matches) visibleCount += 1;
        });
        $(".task-no-results", record.content)?.classList.toggle("is-hidden", visibleCount > 0);
      }

      const explorerSearch = event.target.closest("[data-explorer-search]");
      if (explorerSearch && record.appId === "explorer") {
        record.explorerQuery = explorerSearch.value;
        renderExplorerSearch(record, explorerSearch.value);
      }
    });

    content.addEventListener("dblclick", (event) => {
      const row = event.target.closest("[data-file-item]");
      if (!row || record.appId !== "explorer") return;
      const selected = OSLab.fileSystem.get(row.dataset.fileItem);
      if (selected?.shortcutTargetId) renderFolder(record, selected.shortcutTargetId);
      else if (selected?.kind === "folder") renderFolder(record, selected.id);
      else if (selected) renderTextFile(record, selected.id);
    });

    if (record.appId === "settings") {
      const searchInput = $("input", record.settingsSearch);
      searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLocaleLowerCase("pt-BR");
        $$("[data-settings-label]", record.content).forEach((button) => {
          button.classList.toggle("is-hidden", Boolean(query) && !button.dataset.settingsLabel.includes(query));
        });
      });
      searchInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        const query = searchInput.value.trim().toLocaleLowerCase("pt-BR");
        const match = settingsSections.find((section) => section.name.toLocaleLowerCase("pt-BR").includes(query));
        if (match) {
          renderSettings(record, match.id);
          searchInput.select();
        }
      });
    }

    if (record.appId === "taskmanager") {
      const searchInput = $("input", record.settingsSearch);
      searchInput.addEventListener("input", () => {
        if (OSLab.taskManagerApp) OSLab.taskManagerApp.setQuery(record, searchInput.value);
        else record.taskQuery = searchInput.value;
      });
    }

    content.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-google-form]");
      if (!form) return;
      event.preventDefault();
      const query = new FormData(form).get("q")?.toString().trim();
      if (!query) {
        $("[name='q']", form).focus();
        return;
      }
      if (OSLab.browserApp) OSLab.browserApp.navigate(record, query);
      else OSLab.ui.notify("Navegador local", "A pesquisa simulada está disponível apenas dentro do OSLab.", "info");
    });

    titlebar.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest(".window-controls, button") || element.classList.contains("is-maximized")) return;
      const rect = element.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      titlebar.setPointerCapture(event.pointerId);
    });

    titlebar.addEventListener("pointermove", (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const layerRect = windowLayer.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      const left = Math.min(Math.max(0, event.clientX - dragState.offsetX), layerRect.width - Math.min(rect.width, 140));
      const top = Math.min(Math.max(0, event.clientY - dragState.offsetY), layerRect.height - 40);
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
    });

    const stopDragging = (event) => {
      if (dragState?.pointerId === event.pointerId) dragState = null;
    };

    titlebar.addEventListener("pointerup", stopDragging);
    titlebar.addEventListener("pointercancel", stopDragging);

    resizeHandle.addEventListener("pointerdown", (event) => {
      if (element.classList.contains("is-maximized")) return;
      const rect = element.getBoundingClientRect();
      resizeState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        width: rect.width,
        height: rect.height,
      };
      resizeHandle.setPointerCapture(event.pointerId);
      event.stopPropagation();
    });

    resizeHandle.addEventListener("pointermove", (event) => {
      if (!resizeState || resizeState.pointerId !== event.pointerId) return;
      const layerRect = windowLayer.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      const minWidth = window.innerWidth <= 800 ? 320 : 540;
      const minHeight = window.innerWidth <= 800 ? 280 : 360;
      const width = Math.min(Math.max(minWidth, resizeState.width + event.clientX - resizeState.startX), layerRect.width - rect.left);
      const height = Math.min(Math.max(minHeight, resizeState.height + event.clientY - resizeState.startY), layerRect.height - rect.top);
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
    });

    const stopResizing = (event) => {
      if (resizeState?.pointerId === event.pointerId) resizeState = null;
    };

    resizeHandle.addEventListener("pointerup", stopResizing);
    resizeHandle.addEventListener("pointercancel", stopResizing);
  }

  function taskGroup(taskId) {
    return Array.from(windows.values()).filter((record) => record.definition.task === taskId);
  }

  function updateTaskbarState() {
    const runtimeContainer = $("#runtime-taskbar-apps");
    if (runtimeContainer) {
      const represented = new Set($$(".task-app:not(.taskbar-dynamic-app)", taskbar).map((button) => button.dataset.app));
      const runtimeApps = [...new Set(Array.from(windows.values()).map((record) => record.definition.task).filter((task) => !represented.has(task)))];
      runtimeContainer.innerHTML = runtimeApps.map((taskId) => {
        const record = Array.from(windows.values()).find((entry) => entry.definition.task === taskId);
        return `<button class="taskbar-button task-app taskbar-dynamic-app" type="button" data-app="${taskId}" aria-label="${escapeHtml(record.definition.title)}"><img src="${record.definition.icon}" alt="" /></button>`;
      }).join("");
      $$(".taskbar-dynamic-app", runtimeContainer).forEach((button) => button.addEventListener("click", () => activateTaskGroup(button.dataset.app, Array.from(windows.values()).find((entry) => entry.definition.task === button.dataset.app)?.appId)));
    }
    $$(".task-app").forEach((button) => {
      const group = taskGroup(button.dataset.app);
      const active = group.some(
        (record) => record.element.classList.contains("is-focused") && !record.element.classList.contains("is-minimized"),
      );
      button.classList.toggle("is-open", group.length > 0);
      button.classList.toggle("is-active", active);
      button.dataset.windowCount = String(group.length);
    });
  }

  function activateTaskGroup(taskId, fallbackAppId) {
    const group = taskGroup(taskId).sort((a, b) => Number(b.element.style.zIndex) - Number(a.element.style.zIndex));
    if (!group.length) {
      openApp(fallbackAppId);
      return;
    }

    const visible = group.filter((record) => !record.element.classList.contains("is-minimized"));
    const focusedIndex = visible.findIndex((record) => record.element.classList.contains("is-focused"));

    if (visible.length === 1 && focusedIndex === 0) {
      minimizeWindow(visible[0]);
      return;
    }

    if (visible.length > 1 && focusedIndex >= 0) {
      focusWindow(visible[(focusedIndex + 1) % visible.length]);
      return;
    }

    focusWindow(visible[0] || group[0]);
  }

  function closeFlyouts(except = null) {
    [startMenu, searchPanel, quickPanel, calendarPanel, powerMenu, contextMenu, itemContextMenu, taskbarContextMenu].forEach((panel) => {
      if (panel !== except) panel.classList.add("is-hidden");
    });
    startButton.setAttribute("aria-expanded", String(!startMenu.classList.contains("is-hidden")));
    searchButton.setAttribute("aria-expanded", String(!searchPanel.classList.contains("is-hidden")));
    quickSettingsButton.setAttribute("aria-expanded", String(!quickPanel.classList.contains("is-hidden")));
    clockButton.setAttribute("aria-expanded", String(!calendarPanel.classList.contains("is-hidden")));
  }

  function toggleFlyout(panel, trigger) {
    const willOpen = panel.classList.contains("is-hidden");
    closeFlyouts(panel);
    panel.classList.toggle("is-hidden", !willOpen);
    trigger.setAttribute("aria-expanded", String(willOpen));
  }

  startButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const wasHidden = startMenu.classList.contains("is-hidden");
    toggleFlyout(startMenu, startButton);
    if (wasHidden && !startMenu.classList.contains("is-hidden")) OSLab.events.emit("start:opened", {}, "startMenu");
  });

  searchButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFlyout(searchPanel, searchButton);
    if (!searchPanel.classList.contains("is-hidden")) window.setTimeout(() => $("#global-search-input").focus(), 50);
  });

  quickSettingsButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFlyout(quickPanel, quickSettingsButton);
  });

  clockButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFlyout(calendarPanel, clockButton);
  });

  $("#power-button").addEventListener("click", (event) => {
    event.stopPropagation();
    powerMenu.classList.toggle("is-hidden");
  });

  powerMenu.addEventListener("click", (event) => {
    const action = event.target.closest("[data-power-action]")?.dataset.powerAction;
    if (action === "restart") {
      if (OSLab.exercises.getSession()?.id === "slow-startup") OSLab.exercises.runTest();
      else window.location.reload();
    }
    if (action === "lock") lockSession();
  });

  $("#show-desktop-button").addEventListener("click", () => {
    windows.forEach((record) => {
      record.element.classList.add("is-minimized");
      record.element.classList.remove("is-focused");
    });
    closeFlyouts();
    updateTaskbarState();
  });

  $$(".task-app").forEach((button) => {
    button.addEventListener("click", () => activateTaskGroup(button.dataset.app, button.dataset.app));
  });

  $$("[data-app]").forEach((element) => {
    if (element.classList.contains("desktop-shortcut") || element.classList.contains("task-app")) return;
    element.addEventListener("click", () => openApp(element.dataset.app));
  });

  $$(".desktop-shortcut").forEach((shortcut) => {
    shortcut.addEventListener("click", (event) => {
      event.stopPropagation();
      $$(".desktop-shortcut").forEach((item) => item.classList.remove("is-selected"));
      shortcut.classList.add("is-selected");
      if (event.detail <= 1) openApp(shortcut.dataset.app);
    });
  });

  desktopIcons.addEventListener("click", (event) => {
    const shortcut = event.target.closest("[data-desktop-item]");
    if (!shortcut || event.target.closest("input")) return;
    event.stopPropagation();
    $$(".desktop-shortcut").forEach((item) => item.classList.remove("is-selected"));
    shortcut.classList.add("is-selected");
  });

  desktopIcons.addEventListener("dblclick", (event) => {
    const shortcut = event.target.closest("[data-desktop-item]");
    if (!shortcut || event.target.closest("input")) return;
    openDesktopItem(shortcut.dataset.desktopItem);
  });

  desktopIcons.addEventListener("keydown", (event) => {
    const shortcut = event.target.closest("[data-desktop-item]");
    if (!shortcut || event.target.closest("input")) return;
    if (event.key === "Enter") openDesktopItem(shortcut.dataset.desktopItem);
    if (event.key === "F2") beginItemRename(shortcut.dataset.desktopItem);
  });

  desktopIcons.addEventListener("contextmenu", (event) => {
    const shortcut = event.target.closest("[data-desktop-item]");
    if (!shortcut || event.target.closest("input")) return;
    event.preventDefault();
    event.stopPropagation();
    contextItemId = shortcut.dataset.desktopItem;
    const item = desktopItemById(contextItemId);
    if (!item) return;
    $$(".desktop-shortcut").forEach((entry) => entry.classList.remove("is-selected"));
    shortcut.classList.add("is-selected");
    $("[data-item-menu-icon]", itemContextMenu).src = OSLab.icons.file(item);
    closeFlyouts(itemContextMenu);
    const maxX = window.innerWidth - 326;
    const maxY = window.innerHeight - 468;
    itemContextMenu.style.left = `${Math.max(8, Math.min(event.clientX, maxX))}px`;
    itemContextMenu.style.top = `${Math.max(8, Math.min(event.clientY, maxY))}px`;
    itemContextMenu.classList.remove("is-hidden");
  });

  itemContextMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    const action = event.target.closest("[data-item-action]")?.dataset.itemAction;
    const item = desktopItemById(contextItemId);
    if (!action || !item) return;
    if (action === "open") openDesktopItem(item.id);
    if (action === "cut" || action === "copy") {
      fileClipboard = { itemId: item.id, mode: action };
      OSLab.ui.notify(action === "cut" ? "Item recortado" : "Item copiado", item.name, "info");
    }
    if (action === "rename") window.setTimeout(() => beginItemRename(item.id), 20);
    if (action === "delete") moveDesktopItemToRecycle(item.id);
    if (action === "terminal") openApp("terminal");
    if (action === "copy-path" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(`C:\\Users\\Aluno\\Desktop\\${item.name}`).catch(() => {});
    }
    itemContextMenu.classList.add("is-hidden");
  });

  $("#desktop-icons").addEventListener("click", (event) => event.stopPropagation());

  $("#global-search-input").addEventListener("input", (event) => {
    const query = event.target.value.trim().toLocaleLowerCase("pt-BR");
    const matches = OSLab.apps.list()
      .filter((item) => item.id !== "installer" && (!item.installedOnly || OSLab.software?.isInstalled?.(item.id)))
      .map((item) => ({ id: item.id, name: item.title, icon: item.icon }))
      .filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(query));

    $("#search-results").innerHTML = `
      <p>${query ? "Melhor correspondência" : "Principais aplicativos"}</p>
      ${matches
        .map(
          (item) => `
            <button type="button" data-app="${item.id}">
              <img src="${item.icon}" alt="" />
              <span><strong>${item.name}</strong><small>Aplicativo</small></span>
            </button>`,
        )
        .join("") || "<p>Nenhum resultado encontrado.</p>"}`;
  });

  $("#search-results").addEventListener("click", (event) => {
    const appButton = event.target.closest("[data-app]");
    if (appButton) openApp(appButton.dataset.app);
  });

  $("#start-search-input").addEventListener("input", (event) => {
    const query = event.target.value.trim().toLocaleLowerCase("pt-BR");
    $$("#start-apps [data-app]").forEach((button) => {
      button.classList.toggle("is-hidden", !button.textContent.trim().toLocaleLowerCase("pt-BR").includes(query));
    });
  });

  $("#all-apps-button").addEventListener("click", () => $("#start-search-input").focus());

  function syncQuickSettings() {
    const network = OSLab.network.getSnapshot();
    state.quickSettings.wifi = network.wifiEnabled;
    state.quickSettings.airplane = network.airplaneMode;
    state.quickSettings.connectedSsid = network.connectedSsid;
    $$("[data-quick-action]").forEach((button) => {
      button.classList.toggle("is-active", Boolean(state.quickSettings[button.dataset.quickAction]));
    });
    $("#brightness-slider").value = String(state.brightness);
    $("#volume-slider").value = String(state.volume);
    setVolume(state.volume, state.muted, false);
    const trayNetworkIcon = $("#quick-settings-button img");
    if (trayNetworkIcon) {
      trayNetworkIcon.src = network.airplaneMode ? "assets/icons/ui/airplane.png" : "assets/icons/ui/wifi.png";
      trayNetworkIcon.style.opacity = network.adapterConnected ? "1" : ".48";
    }
  }

  $$("[data-quick-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.quickAction;
      if (key === "wifi") OSLab.network.setWifi(!OSLab.network.getSnapshot().wifiEnabled);
      else if (key === "airplane") OSLab.network.setAirplaneMode(!OSLab.network.getSnapshot().airplaneMode);
      else { state.quickSettings[key] = !state.quickSettings[key]; saveState(); }
      syncQuickSettings();
      const settingsRecord = windows.get("settings");
      if (settingsRecord && ["home", "network"].includes(settingsRecord.settingsView)) {
        renderSettings(settingsRecord, settingsRecord.settingsView);
      }
    });
  });

  OSLab.network.subscribe(() => {
    syncQuickSettings();
    const settingsRecord = windows.get("settings");
    if (settingsRecord && ["home", "network"].includes(settingsRecord.settingsView)) renderSettings(settingsRecord, settingsRecord.settingsView);
  });

  $("#brightness-slider").addEventListener("input", (event) => {
    state.brightness = Number(event.target.value);
    saveState();
  });

  $("#volume-slider").addEventListener("input", (event) => {
    setVolume(Number(event.target.value), false);
  });

  $("#volume-slider").previousElementSibling?.addEventListener("click", () => setVolume(state.volume, !state.muted));

  desktop.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".app-window") || event.target.closest(".taskbar")) return;
    event.preventDefault();
    closeFlyouts(contextMenu);
    const maxX = window.innerWidth - 246;
    const maxY = window.innerHeight - 392;
    contextMenu.style.left = `${Math.max(8, Math.min(event.clientX, maxX))}px`;
    contextMenu.style.top = `${Math.max(8, Math.min(event.clientY, maxY))}px`;
    contextMenu.classList.toggle("open-left", event.clientX > window.innerWidth - 520);
    contextMenu.classList.remove("is-hidden");
  });

  contextMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    const action = event.target.closest("[data-context-action]")?.dataset.contextAction;
    if (!action) return;
    if (action === "refresh") {
      $("#desktop-icons").animate([{ opacity: 0.45 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
    }
    if (action.startsWith("view-")) {
      state.desktopView = action.replace("view-", "");
      saveState();
      renderDesktopFolders();
    }
    if (action.startsWith("sort-")) {
      state.desktopSort = action.replace("sort-", "");
      saveState();
      renderDesktopFolders();
    }
    if (action === "new-folder") createDesktopFolder();
    if (action === "new-text") createDesktopTextFile();
    if (action === "undo-rename" && state.lastRename) {
      const item = desktopItemById(state.lastRename.itemId);
      if (item) OSLab.fileSystem.rename(item.id, state.lastRename.previousName);
      state.lastRename = null;
      renderDesktopFolders();
    }
    if (action === "display") {
      const record = openApp("settings");
      renderSettings(record, "system");
    }
    if (action === "personalize") {
      const record = openApp("settings");
      renderSettings(record, "personalization");
    }
    if (action === "terminal") openApp("terminal");
    contextMenu.classList.add("is-hidden");
  });

  taskbar.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeFlyouts(taskbarContextMenu);
    const maxX = window.innerWidth - 286;
    taskbarContextMenu.style.left = `${Math.max(8, Math.min(event.clientX, maxX))}px`;
    taskbarContextMenu.style.bottom = `${window.innerHeight - event.clientY + 8}px`;
    taskbarContextMenu.classList.remove("is-hidden");
  });

  taskbarContextMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    const action = event.target.closest("[data-taskbar-action]")?.dataset.taskbarAction;
    if (action === "task-manager") openApp("taskmanager");
    if (action === "taskbar-settings") {
      const record = openApp("settings");
      renderSettings(record, "personalization");
    }
    taskbarContextMenu.classList.add("is-hidden");
  });

  desktop.addEventListener("click", (event) => {
    if (!event.target.closest(".flyout") && !event.target.closest(".taskbar")) closeFlyouts();
    if (!event.target.closest(".desktop-shortcut")) {
      $$(".desktop-shortcut").forEach((item) => item.classList.remove("is-selected"));
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeFlyouts();
    if (event.key === "Meta" && !desktop.classList.contains("is-hidden")) {
      event.preventDefault();
      toggleFlyout(startMenu, startButton);
    }
  });

  function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const date = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const fullDate = now.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    $("#taskbar-time").textContent = time;
    $("#taskbar-date").textContent = date;
    $("#calendar-time").textContent = time;
    $("#calendar-date").textContent = fullDate;
    $$("[data-settings-time]").forEach((element) => {
      element.textContent = time;
    });
    $$("[data-settings-date]").forEach((element) => {
      element.textContent = fullDate;
    });
  }

  ["file:created", "file:deleted", "recycle:restored", "recycle:deleted", "recycle:emptied"].forEach((type) => OSLab.events.subscribe(type, () => {
    const computer = windows.get("computer"); if (computer) renderComputer(computer);
    const settings = windows.get("settings"); if (settings?.settingsView === "storage") renderSettings(settings, "storage");
  }));

  document.title = "Entrar — OSLab";
  OSLab.apps.synchronizeStaticEntries(document);
  applyWallpaper(currentWallpaperId, false);
  renderDesktopFolders();
  renderInstalledStartApps();
  OSLab.software?.subscribe?.(() => {
    renderDesktopFolders();
    renderInstalledStartApps();
  });
  syncQuickSettings();
  saveState();
  updateClock();
  window.setInterval(updateClock, 1000);
  window.setTimeout(() => passwordInput.focus(), 80);
})();
