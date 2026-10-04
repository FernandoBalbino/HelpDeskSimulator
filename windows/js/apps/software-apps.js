(function createSoftwareApps(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const records = new Set();
  const appIds = new Set(["installer", "controlpanel", "appjavafx", "word", "excel", "slides"]);
  const safe = (value) => OSLab.ui.escapeHtml(value);

  function highlighted(target) { return OSLab.installLab?.getActiveVisualTarget?.() === target ? " is-hint-target" : ""; }

  function installerStepMarkup(record, installer) {
    const step = Number(record.installerStep) || 1;
    if (step === 1) return `<div class="installer-copy"><small>ASSISTENTE DE INSTALAÇÃO</small><h1>Bem-vindo ao Assistente de Instalação do ${safe(installer.productName)}</h1><p>Este assistente instalará ${safe(installer.productName)} no computador simulado. Feche outros programas antes de continuar.</p><p class="installer-note">Nenhum arquivo executável real será iniciado.</p></div>`;
    if (step === 2) return `<div class="installer-copy"><small>LOCAL DE INSTALAÇÃO</small><h1>Escolha a pasta de destino</h1><p>O programa será instalado na pasta abaixo.</p><label class="installer-path"><span>Destino</span><input value="C:\\Program Files\\${safe(installer.productName)}" readonly /><button type="button" disabled>Procurar...</button></label><p>Espaço necessário: <strong>${installer.id === "office" ? "405 MB" : "80 MB"}</strong></p></div>`;
    if (step === 3) return `<div class="installer-copy"><small>OPÇÕES ADICIONAIS</small><h1>${installer.id === "office" ? "Componentes do pacote" : "Selecione tarefas adicionais"}</h1>${installer.id === "office" ? `<div class="installer-components"><span><img src="assets/programs/word.svg" alt="" />Word</span><span><img src="assets/programs/excel.svg" alt="" />Excel</span><span><img src="assets/programs/slides.svg" alt="" />Apresentações Slides</span></div><p>Os três aplicativos serão adicionados ao Menu Iniciar.</p>` : `<label class="installer-checkbox${highlighted("desktop-checkbox")}"><input type="checkbox" data-installer-shortcut ${record.createDesktopShortcut ? "checked" : ""} /><span><strong>Criar atalho na Área de Trabalho</strong><small>Você também poderá abrir o programa pelo Menu Iniciar.</small></span></label>`}</div>`;
    if (step === 4) return `<div class="installer-copy"><small>PRONTO PARA INSTALAR</small><h1>Pronto para instalar ${safe(installer.productName)}</h1><p>Clique em Instalar para iniciar. Você poderá acompanhar cada etapa do processo.</p><dl class="installer-summary"><div><dt>Destino</dt><dd>C:\\Program Files\\${safe(installer.productName)}</dd></div><div><dt>Menu Iniciar</dt><dd>Atalho será criado</dd></div>${installer.id === "appjavafx" ? `<div><dt>Área de Trabalho</dt><dd>${record.createDesktopShortcut ? "Criar atalho" : "Não criar atalho"}</dd></div>` : ""}</dl></div>`;
    if (step === 5) {
      const progress = Math.max(0, Math.min(100, Number(record.installProgress) || 0));
      const message = progress < 22 ? "Copiando arquivos..." : progress < 45 ? "Criando diretórios..." : progress < 68 ? "Registrando componentes..." : progress < 88 ? "Criando atalhos..." : "Finalizando instalação...";
      return `<div class="installer-copy"><small>INSTALANDO</small><h1>Instalando ${safe(installer.productName)}</h1><p>Aguarde enquanto o assistente configura o programa.</p><div class="installer-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></div><div class="installer-progress-copy"><span>${safe(message)}</span><strong>${progress}%</strong></div></div>`;
    }
    return `<div class="installer-copy"><small>INSTALAÇÃO CONCLUÍDA</small><h1>${safe(installer.productName)} foi instalado</h1><p>O assistente concluiu a instalação com sucesso. Clique em Concluir para fechar esta janela.</p>${installer.id === "appjavafx" ? `<label class="installer-checkbox"><input type="checkbox" data-installer-launch ${record.launchAfterInstall ? "checked" : ""} /><span><strong>Iniciar AppJavaFX</strong><small>Abrir o programa ao fechar o assistente.</small></span></label>` : `<div class="installer-components is-complete"><span><img src="assets/programs/word.svg" alt="" />Word</span><span><img src="assets/programs/excel.svg" alt="" />Excel</span><span><img src="assets/programs/slides.svg" alt="" />Apresentações</span></div>`}</div>`;
  }

  function installerButtons(record) {
    const step = Number(record.installerStep) || 1;
    if (step === 5) return `<button type="button" disabled>Voltar</button><button type="button" disabled>Cancelar</button>`;
    if (step === 6) return `<button type="button" data-installer-action="finish" class="is-primary">Concluir</button>`;
    return `<button type="button" data-installer-action="back" ${step === 1 ? "disabled" : ""}>Voltar</button><button type="button" data-installer-action="cancel">Cancelar</button><button type="button" data-installer-action="${step === 4 ? "install" : "next"}" class="is-primary">${step === 4 ? "Instalar" : "Avançar"}</button>`;
  }

  function renderInstaller(record) {
    const installerId = record.options?.installerId || record.installerId;
    const installer = OSLab.software.installers[installerId];
    record.installerId = installerId;
    record.installerStep ||= 1;
    record.title.textContent = installer ? `Instalação do ${installer.productName}` : "Instalador";
    record.address.textContent = installer?.fileName || "Arquivo indisponível";
    if (!installer) { record.content.innerHTML = `<section class="software-error"><h2>Instalador indisponível</h2><p>Volte ao navegador e abra um download concluído.</p></section>`; return; }
    record.content.innerHTML = `<section class="installer-wizard"><aside><img src="${installer.icon}" alt="" /><span><small>OSLAB</small><strong>${safe(installer.productName)}</strong></span><ol>${["Boas-vindas", "Destino", "Opções", "Confirmação", "Instalação", "Conclusão"].map((label, index) => `<li class="${index + 1 < record.installerStep ? "is-done" : index + 1 === record.installerStep ? "is-active" : ""}"><i>${index + 1 < record.installerStep ? "✓" : index + 1}</i>${label}</li>`).join("")}</ol></aside><main>${installerStepMarkup(record, installer)}<footer>${installerButtons(record)}</footer></main></section>`;
    if (record.installerStep === 5) resumeInstaller(record);
    if (record.softwareWired) return;
    record.softwareWired = true;
    record.content.addEventListener("change", (event) => {
      if (event.target.matches("[data-installer-shortcut]")) {
        record.createDesktopShortcut = event.target.checked;
        OSLab.events.emit("install:option-changed", { installerId: record.installerId, desktopShortcut: record.createDesktopShortcut }, "installer");
      }
      if (event.target.matches("[data-installer-launch]")) record.launchAfterInstall = event.target.checked;
    });
    record.content.addEventListener("click", async (event) => {
      const action = event.target.closest("[data-installer-action]")?.dataset.installerAction;
      if (!action) return;
      if (action === "cancel") {
        if (await OSLab.ui.confirm({ title: "Cancelar instalação?", message: "Nenhum programa será alterado.", confirmLabel: "Cancelar instalação" })) OSLab.windowManager.close(record.windowId);
        return;
      }
      if (action === "back") record.installerStep = Math.max(1, record.installerStep - 1);
      if (action === "next") record.installerStep = Math.min(4, record.installerStep + 1);
      if (action === "install") {
        record.installerStep = 5;
        record.installProgress = 0;
        renderInstaller(record);
        record.installStartedAt = OSLab.runtimeNow ? OSLab.runtimeNow() : Date.now();
        resumeInstaller(record);
        return;
      }
      if (action === "finish") {
        const openAfter = record.installerId === "appjavafx" && record.launchAfterInstall;
        OSLab.windowManager.close(record.windowId);
        if (openAfter) OSLab.shell.openApp("appjavafx");
        return;
      }
      renderInstaller(record);
    });
  }

  function resumeInstaller(record) {
    if (record.installTimer) return;
    record.installStartedAt ??= (OSLab.runtimeNow ? OSLab.runtimeNow() : Date.now()) - (record.installProgress || 0) * 60;
    record.installTimer = global.setInterval(() => {
      if (!record.element?.isConnected) { global.clearInterval(record.installTimer); record.installTimer = null; return; }
      const now = OSLab.runtimeNow ? OSLab.runtimeNow() : Date.now();
      record.installProgress = Math.min(100, Math.floor((now - record.installStartedAt) / 60));
      if (record.installProgress >= 100) {
        global.clearInterval(record.installTimer); record.installTimer = null;
        OSLab.software.installBundle(record.installerId, { desktopShortcut: Boolean(record.createDesktopShortcut) });
        record.installerStep = 6;
      }
      renderInstaller(record);
    }, 240);
  }

  const controlCategories = [
    ["Sistema e Segurança", "Veja o status do computador e resolva problemas.", "shield_checkmark"],
    ["Rede e Internet", "Confira o status da rede e as opções de compartilhamento.", "wifi_1"],
    ["Hardware e Sons", "Adicione dispositivos e ajuste opções de som.", "speaker_2"],
    ["Programas", "Desinstale programas ou altere recursos instalados.", "apps", "programs"],
    ["Contas de Usuário", "Altere tipos de conta e credenciais.", "lock_closed"],
    ["Aparência e Personalização", "Altere o tema e a exibição do Windows.", "paint_brush"],
    ["Relógio e Região", "Ajuste data, hora e formatos regionais.", "timer"],
    ["Facilidade de Acesso", "Otimize a exibição e a interação.", "window"],
  ];

  function featuresRows(record) {
    const defaults = [
      { id: "oslab-browser", name: "Navegador OSLAB", publisher: "OSLAB Educação", installDate: "21/07/2026", size: "64 MB", version: "11.4" },
      { id: "windows-tools", name: "Ferramentas do Windows", publisher: "Sistema OSLAB", installDate: "21/07/2026", size: "118 MB", version: "1.0" },
    ];
    const rows = [...OSLab.software.getInstalledPrograms(), ...defaults];
    return rows.map((program) => `<tr class="${record.controlSelected === program.id ? "is-selected" : ""}" data-program-row="${safe(program.id)}" tabindex="0"><td><span class="program-name">${program.icon ? `<img src="${program.icon}" alt="" />` : `<i>OS</i>`}<strong>${safe(program.name)}</strong></span></td><td>${safe(program.publisher)}</td><td>${safe(program.installDate || "21/07/2026")}</td><td>${safe(program.size)}</td><td>${safe(program.version)}</td></tr>`).join("");
  }

  function controlMarkup(record) {
    const view = record.controlView || "home";
    if (view === "programs") return `<section class="control-panel"><header><span>Painel de Controle</span><label>Exibir por: <select><option>Categoria</option></select></label></header><nav><button data-control-view="home">Painel de Controle</button><span>›</span><strong>Programas</strong></nav><main><h1>Programas</h1><div class="control-programs-card"><img src="${OSLab.learningPath.icon("apps")}" alt="" /><div><h2>Programas e Recursos</h2><button type="button" data-control-view="features">Desinstalar um programa</button><button type="button">Ativar ou desativar recursos do Windows</button><button type="button">Exibir atualizações instaladas</button></div></div><div class="control-programs-card"><img src="assets/icons/context/restore-item.png" alt="" /><div><h2>Programas Padrão</h2><button type="button">Definir programas padrão</button></div></div></main></section>`;
    if (view === "features") {
      const selected = OSLab.software.getProgram(record.controlSelected);
      const canRemove = Boolean(selected?.installed);
      return `<section class="programs-features"><header><span>Painel de Controle</span><label>Pesquisar Programas e Recursos <input type="search" placeholder="Pesquisar" /></label></header><nav><button data-control-view="home">Painel de Controle</button><span>›</span><button data-control-view="programs">Programas</button><span>›</span><strong>Programas e Recursos</strong></nav><main><h1>Desinstalar ou alterar um programa</h1><p>Para desinstalar um programa, selecione-o na lista e clique em Desinstalar.</p><div class="programs-command${highlighted("uninstall-button")}"><button type="button" data-program-uninstall ${canRemove && !record.uninstalling ? "" : "disabled"}>${record.uninstalling ? "Desinstalando..." : "Desinstalar"}</button><span>${OSLab.software.getInstalledPrograms().length + 2} programas instalados</span></div><div class="programs-table-wrap"><table><thead><tr><th>Nome</th><th>Editor</th><th>Instalado em</th><th>Tamanho</th><th>Versão</th></tr></thead><tbody>${featuresRows(record)}</tbody></table></div>${record.uninstalling ? `<div class="uninstall-progress"><span>Removendo ${safe(OSLab.software.programs[record.uninstalling]?.name || "programa")}...</span><i></i></div>` : ""}</main></section>`;
    }
    return `<section class="control-panel"><header><span>Painel de Controle</span><label>Exibir por: <select><option>Categoria</option></select></label></header><nav><strong>Painel de Controle</strong></nav><main><h1>Ajuste as configurações do computador</h1><div class="control-categories">${controlCategories.map(([title, description, icon, target]) => `<article class="${target === "programs" ? highlighted("uninstall-button") : ""}"><img src="${OSLab.learningPath.icon(icon)}" alt="" /><div><button type="button" ${target ? `data-control-view="${target}"` : ""}>${safe(title)}</button><p>${safe(description)}</p>${target ? `<button type="button" data-control-view="features">Desinstalar um programa</button>` : ""}</div></article>`).join("")}</div></main></section>`;
  }

  function renderControlPanel(record) {
    records.add(record);
    record.controlView ||= "home";
    record.address.textContent = record.controlView === "features" ? "Painel de Controle › Programas › Programas e Recursos" : record.controlView === "programs" ? "Painel de Controle › Programas" : "Painel de Controle";
    record.content.innerHTML = controlMarkup(record);
    if (record.softwareWired) return;
    record.softwareWired = true;
    record.content.addEventListener("click", async (event) => {
      const view = event.target.closest("[data-control-view]")?.dataset.controlView;
      const row = event.target.closest("[data-program-row]");
      if (view) {
        record.controlView = view;
        record.controlSelected = null;
        renderControlPanel(record);
        if (view === "features") OSLab.events.emit("control-panel:programs-opened", {}, "controlPanel");
        return;
      }
      if (row) {
        record.controlSelected = row.dataset.programRow;
        renderControlPanel(record);
        OSLab.events.emit("control-panel:program-selected", { programId: record.controlSelected }, "controlPanel");
        return;
      }
      if (event.target.closest("[data-program-uninstall]") && record.controlSelected) {
        const program = OSLab.software.getProgram(record.controlSelected);
        if (!program?.installed || !await OSLab.ui.confirm({ title: `Desinstalar ${program.name}?`, message: "O programa e todos os seus atalhos serão removidos do computador simulado.", confirmLabel: "Desinstalar" })) return;
        record.uninstalling = program.id;
        renderControlPanel(record);
        global.setTimeout(() => {
          if (!record.element?.isConnected) return;
          OSLab.software.uninstall(program.id);
          record.uninstalling = null;
          record.controlSelected = null;
          renderControlPanel(record);
          OSLab.ui.notify("Programa desinstalado", `${program.name} foi removido do computador simulado.`, "success");
        }, 2400);
      }
    });
    record.content.addEventListener("keydown", (event) => {
      const row = event.target.closest("[data-program-row]");
      if (row && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); row.click(); }
    });
  }

  function appJavaFxMarkup() {
    return `<section class="appjavafx-mock"><header><img src="assets/programs/appjavafx.svg" alt="" /><span><strong>AppJavaFX</strong><small>Ambiente de aprendizagem visual</small></span><nav><button>Início</button><button>Projetos</button><button>Aprender</button><button>Ajuda</button></nav></header><main><div class="java-hero"><small>BEM-VINDO AO APPJAVAFX</small><h1>Crie interfaces. Aprenda fazendo.</h1><p>Um espaço demonstrativo para organizar projetos JavaFX, componentes e cenas.</p><button type="button">Criar novo projeto</button></div><div class="java-cards"><article><strong>Projeto inicial</strong><p>Explore uma estrutura pronta para praticar.</p></article><article><strong>Componentes</strong><p>Conheça botões, campos e layouts.</p></article><article><strong>Tutoriais</strong><p>Siga exemplos guiados dentro do aplicativo.</p></article></div></main></section>`;
  }

  function wordMarkup() {
    return `<section class="office-mock word-mock"><header><div class="office-title"><img src="assets/programs/word.svg" alt="" /><span>Documento1 — Word</span><small>Aluno</small></div><nav>${["Arquivo", "Página Inicial", "Inserir", "Design", "Layout", "Referências", "Revisão", "Exibir"].map((label, index) => `<button class="${index === 1 ? "is-active" : ""}">${label}</button>`).join("")}</nav><div class="office-ribbon"><span><b>Colar</b><small>Área de transferência</small></span><span><b>Calibri · 11</b><small>Fonte</small></span><span><b>N · I · <u>S</u></b><small>Formatação</small></span><span><b>☰ ≡ ☷</b><small>Parágrafo</small></span><span><b>Normal</b><small>Estilos</small></span></div></header><main><div class="word-ruler"><i></i></div><article class="word-page"><h1>Meu documento</h1><p>Comece a criar seu trabalho nesta página em branco.</p></article></main><footer>Página 1 de 1 <span>0 palavras</span><span>Português (Brasil)</span><em>100%</em></footer></section>`;
  }

  function excelMarkup() {
    const letters = "ABCDEFGH".split("");
    const rows = Array.from({ length: 14 }, (_, row) => `<div class="excel-row"><b>${row + 1}</b>${letters.map((letter, col) => `<span>${row === 0 && col < 3 ? ["Atividade", "Prazo", "Status"][col] : ""}</span>`).join("")}</div>`).join("");
    return `<section class="office-mock excel-mock"><header><div class="office-title"><img src="assets/programs/excel.svg" alt="" /><span>Pasta1 — Excel</span><small>Aluno</small></div><nav>${["Arquivo", "Página Inicial", "Inserir", "Layout da Página", "Fórmulas", "Dados", "Revisão", "Exibir"].map((label, index) => `<button class="${index === 1 ? "is-active" : ""}">${label}</button>`).join("")}</nav><div class="office-ribbon"><span><b>Colar</b><small>Área de transferência</small></span><span><b>Calibri · 11</b><small>Fonte</small></span><span><b>R$ · % · ,</b><small>Número</small></span><span><b>Classificar</b><small>Edição</small></span></div></header><div class="formula-bar"><b>A1</b><span>fx</span><input value="" readonly /></div><main><div class="excel-head"><b></b>${letters.map((letter) => `<span>${letter}</span>`).join("")}</div>${rows}</main><footer><strong>Planilha1</strong><span>Pronto</span><em>100%</em></footer></section>`;
  }

  function slidesMarkup() {
    return `<section class="office-mock slides-mock"><header><div class="office-title"><img src="assets/programs/slides.svg" alt="" /><span>Apresentação1 — Apresentações Slides</span><small>Aluno</small></div><nav>${["Arquivo", "Página Inicial", "Inserir", "Design", "Transições", "Animações", "Apresentação", "Revisão"].map((label, index) => `<button class="${index === 1 ? "is-active" : ""}">${label}</button>`).join("")}</nav><div class="office-ribbon"><span><b>Novo slide</b><small>Slides</small></span><span><b>Layout</b><small>Organizar</small></span><span><b>▢ ○ △</b><small>Desenho</small></span><span><b>Apresentar</b><small>Exibição</small></span></div></header><main><aside>${[1, 2, 3].map((number) => `<button class="${number === 1 ? "is-active" : ""}"><b>${number}</b><span>${number === 1 ? "Título da apresentação" : ""}</span></button>`).join("")}</aside><div class="slide-stage"><article><h1>Título da apresentação</h1><p>Adicione um subtítulo</p></article><section>Clique para adicionar anotações</section></div></main><footer>Slide 1 de 3 <span>Português (Brasil)</span><em>100%</em></footer></section>`;
  }

  function renderProgram(record) {
    if (!record.softwareOpenedMarked) {
      record.softwareOpenedMarked = true;
      OSLab.software.markOpened(record.appId);
    }
    record.address.textContent = OSLab.apps.get(record.appId)?.title || "Aplicativo";
    if (record.appId === "appjavafx") record.content.innerHTML = appJavaFxMarkup();
    if (record.appId === "word") record.content.innerHTML = wordMarkup();
    if (record.appId === "excel") record.content.innerHTML = excelMarkup();
    if (record.appId === "slides") record.content.innerHTML = slidesMarkup();
  }

  function render(record) {
    records.add(record);
    if (record.appId === "installer") renderInstaller(record);
    else if (record.appId === "controlpanel") renderControlPanel(record);
    else renderProgram(record);
  }

  function renderAll() {
    records.forEach((record) => {
      if (!record.element?.isConnected) { records.delete(record); return; }
      if (record.appId === "controlpanel") renderControlPanel(record);
      if (record.appId === "installer" && record.installerStep !== 5) renderInstaller(record);
    });
  }
  OSLab.software.subscribe(renderAll);
  OSLab.softwareApps = { appIds, render, renderAll };
})(window);
