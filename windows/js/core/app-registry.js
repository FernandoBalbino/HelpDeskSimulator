(function createAppRegistry(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const definitions = {
    computer: { title: "Computador", icon: "assets/icons/computer.png", address: "Este Computador", task: "explorer", pinned: true },
    explorer: { title: "Explorador de Arquivos", shortTitle: "Explorador", icon: "assets/icons/explorer.png", address: "Início", task: "explorer", pinned: true },
    recycle: { title: "Lixeira", icon: "assets/icons/recycle-bin.png", address: "Lixeira", task: "explorer", pinned: true },
    google: { title: "Google Chrome", icon: "assets/browser/chrome.svg", address: "https://www.google.com.br", task: "google", pinned: true },
    edge: { title: "Microsoft Edge", icon: "assets/browser/edge.png", address: "Nova aba", task: "edge" },
    firefox: { title: "Mozilla Firefox", icon: "assets/browser/firefox.png", address: "Nova aba", task: "firefox" },
    brave: { title: "Brave", icon: "assets/browser/brave-icon.png", address: "Nova aba", task: "brave" },
    opera: { title: "Opera", icon: "assets/browser/opera.png", address: "Nova aba", task: "opera" },
    settings: { title: "Configurações", icon: "assets/icons/settings.png", address: "Configurações", task: "settings", pinned: true },
    terminal: { title: "Terminal", icon: "assets/icons/terminal.png", address: "Terminal", task: "terminal" },
    taskmanager: { title: "Gerenciador de Tarefas", icon: "assets/icons/taskmanager.png", address: "Processos", task: "taskmanager" },
    missions: { title: "Missões", icon: "assets/learning/icons/target_arrow.svg", address: "Trilha de Missões", task: "missions", pinned: true },
    exercises: { title: "Exercícios", icon: "assets/learning/icons/wrench.svg", address: "Trilha de Exercícios", task: "exercises", pinned: true },
    vpn: { title: "VPN", icon: "assets/learning/icons/shield_checkmark.svg", address: "VPN do OSLab", task: "vpn", pinned: true },
    vpnlab: { title: "Laboratório VPN", icon: "assets/learning/icons/globe_search.svg", address: "Trilha de VPN", task: "vpnlab", pinned: true },
    installlab: { title: "Instalação de Programas", shortTitle: "Instalação", icon: "assets/programs/install-lab.svg", address: "Instalação e Desinstalação", task: "installlab", pinned: true },
    browsertrail: { title: "Navegadores e Internet", icon: "assets/learning/icons/globe_search.svg", address: "Navegadores e Internet", task: "browsertrail", pinned: true },
    browsermuseum: { title: "Conhecendo os Navegadores", shortTitle: "Navegadores", icon: "assets/learning/icons/apps.svg", address: "Conhecendo os Navegadores", task: "browsermuseum", pinned: true },
    controlpanel: { title: "Painel de Controle", icon: "assets/programs/control-panel.png", address: "Painel de Controle", task: "controlpanel", pinned: true },
    installer: { title: "Instalador", icon: "assets/programs/installer.svg", address: "Assistente de Instalação", task: "installer" },
    appjavafx: { title: "AppJavaFX", icon: "assets/programs/appjavafx.svg", address: "AppJavaFX", task: "appjavafx", installedOnly: true },
    word: { title: "Word", icon: "assets/programs/word.svg", address: "Documento1 — Word", task: "word", installedOnly: true },
    excel: { title: "Excel", icon: "assets/programs/excel.svg", address: "Pasta1 — Excel", task: "excel", installedOnly: true },
    slides: { title: "Apresentações Slides", shortTitle: "Apresentações", icon: "assets/programs/slides.svg", address: "Apresentação1", task: "slides", installedOnly: true },
    texteditor: { title: "Editor de Texto", icon: "assets/icons/notepad.png", address: "Documento sem título", task: "texteditor" },
  };

  function get(id) { return definitions[id] ? { id, ...definitions[id] } : null; }
  function list() { return Object.entries(definitions).map(([id, definition]) => ({ id, ...definition })); }
  function register(id, definition) {
    if (!id || !definition?.title) throw new Error("Aplicativo inválido");
    definitions[id] = { ...definitions[id], ...definition };
    OSLab.events.emit("app:registered", { appId: id, app: get(id) }, "appRegistry");
    return get(id);
  }

  function synchronizeStaticEntries(scope = document) {
    scope.querySelectorAll("[data-app]").forEach((entry) => {
      const app = definitions[entry.dataset.app];
      if (!app) return;
      const image = entry.querySelector("img");
      if (image) {
        image.src = app.icon;
        OSLab.icons.fallbackImage(image, "app");
      }
    });
  }

  OSLab.apps = { definitions, get, list, register, synchronizeStaticEntries };
})(window);
