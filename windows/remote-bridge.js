(function integrateRemoteDesktop(global) {
  'use strict';
  const OSLab = global.OSLab;
  const context = OSLab?.remoteContext;
  if (!context) return;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const host = global.parent.HelpDeskRemoteHost;
  const fs = OSLab.fileSystem;
  let restoring = true;
  let scheduled = false;
  const GB = 1024 ** 3;

  function file(id, name, parentId = fs.roots.documents, extra = {}) {
    return fs.create({ id, name, parentId, kind: 'file', mime: 'text/plain', ...extra });
  }
  function seed() {
    fs.restoreSnapshot({ version: 1, items: [] });
    file(`${context.clientId}-welcome`, 'Anotações.txt', fs.roots.documents, { content: 'Meus documentos de trabalho. Computador de ' + context.name + '.' });
    switch (context.seed) {
      case 'network': OSLab.network.restoreSnapshot({ wifiEnabled: false, connectedSsid: null }); break;
      case 'install':
        file('mariana-request', 'Solicitação do programa.txt', fs.roots.documents, { content: 'Preciso usar o AppJavaFX 1.0 para os exemplos da atividade de interfaces.' }); break;
      case 'uninstall': OSLab.software.installBundle('appjavafx', { desktopShortcut: true }); break;
      case 'folder':
        file('ana-request', 'Organização da escola.txt', fs.roots.documents, { content: 'Preparar uma pasta chamada Documentos da Escola dentro de Documentos. Depois guardarei os materiais nela.' }); break;
      case 'favorite':
        file('carlos-site', 'Site que uso.txt', fs.roots.documents, { content: 'Hardware — Guia Básico\nhardware.oslab.local\nQuero salvar esse endereço nos favoritos do navegador.' }); break;
      case 'audio': OSLab.shell.setVolume(70, true); break;
      case 'find-file': file('pedro-work', 'trabalho-escola.docx', fs.roots.downloads, { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', content: 'Meu trabalho de informática.', sizeBytes: 72000 }); break;
      case 'shortcut': {
        const folder = fs.create({ id: 'juliana-materials', name: 'Materiais da Escola', parentId: fs.roots.documents, kind: 'folder' });
        file('juliana-lesson', 'Plano de aula.txt', folder.id, { content: 'Materiais de apoio para as aulas.' }); break;
      }
      case 'restore': {
        const report = file('bruno-report', 'Relatorio.pdf', fs.roots.documents, { mime: 'application/pdf', sizeBytes: 240000 }); fs.delete(report.id); break;
      }
      case 'storage': {
        file('fernanda-personal', 'Documentos pessoais.pdf', fs.roots.documents, { mime: 'application/pdf', sizeBytes: 2 * 1024 ** 2 });
        file('fernanda-planning', 'Planejamento.docx', fs.roots.documents, { sizeBytes: 1024 ** 2 });
        file('fernanda-cache', 'Cache temporário — descartável.tmp', fs.roots.downloads, { sizeBytes: 1.2 * GB });
        file('fernanda-video', 'Vídeo de teste — descartável.mp4', fs.roots.downloads, { sizeBytes: 1.1 * GB });
        const old = file('fernanda-installer', 'Instalador antigo — descartável.exe', fs.roots.downloads, { sizeBytes: GB }); fs.delete(old.id);
        OSLab.systemState.configure({ storageTotalBytes: 128 * GB, systemReservedBytes: 128 * GB - fs.usedBytes() - 100 * 1024 ** 2 }); break;
      }
    }
    OSLab.shell.refreshDesktop();
  }
  function snapshot() {
    const pc = OSLab.systemState.snapshot();
    OSLab.windowManager.getWindows().forEach((record) => {
      if (record.browserState) context.browsers[record.appId] = clone(record.browserState);
    });
    pc.software = OSLab.software.getState();
    pc.browsers = clone(context.browsers);
    pc.storage = OSLab.storage.snapshot();
    return pc;
  }
  function send() {
    scheduled = false;
    if (!restoring) host.changed(global, context.clientId, snapshot());
  }
  function scheduleSend() {
    if (restoring || scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(send);
  }
  function restore(pc) {
    restoring = true;
    context.browsers = clone(pc.browsers || {});
    OSLab.storage.restore(pc.storage);
    OSLab.software.restoreSnapshot(pc.software);
    OSLab.systemState.restore(pc, { silent: true });
    restoring = false;
    send();
    return snapshot();
  }
  const allowed = new Set(['computer', 'explorer', 'recycle', 'settings', 'google', 'installer', 'appjavafx', 'controlpanel']);
  const originalOpen = OSLab.shell.openApp;
  OSLab.shell.openApp = (id, options) => allowed.has(id) ? originalOpen(id, options) : null;
  // The shell also enforces this capability set on its internal entrypoints.
  context.allowedApps = allowed;
  const originalList = OSLab.apps.list;
  OSLab.apps.list = () => originalList().filter((app) => allowed.has(app.id));
  OSLab.shell.bootRemote();
  if (context.pc) {
    OSLab.software.restoreSnapshot(context.pc.software);
    OSLab.systemState.restore(context.pc, { silent: true });
  } else seed();

  document.querySelectorAll('[data-app]').forEach((button) => {
    if (!allowed.has(button.dataset.app)) button.hidden = true;
  });
  document.querySelectorAll('[data-pwa-install]').forEach((button) => { button.hidden = true; });
  document.querySelector('#quick-panel footer').insertAdjacentHTML('beforebegin', '<div class="remote-quick-state"><span id="remote-audio-state"></span><button type="button" data-remote-network>Redes disponíveis</button></div>');
  function reflectAudio() {
    const audio = OSLab.shell.getAudioState();
    const button = document.querySelector('#mute-button');
    button.setAttribute('aria-label', audio.muted ? 'Ativar som' : 'Silenciar som');
    button.setAttribute('aria-pressed', String(audio.muted));
    document.querySelector('#remote-audio-state').textContent = audio.muted ? 'Som desativado (mudo)' : `Volume: ${audio.volume}%`;
  }
  reflectAudio();
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-remote-network]')) OSLab.shell.openSettings('network');
  });
  OSLab.events.subscribe('volume:changed', reflectAudio);
  OSLab.events.subscribe('oslab:event', scheduleSend);
  ['click', 'input', 'change', 'pointerup', 'keyup'].forEach((type) => document.addEventListener(type, scheduleSend));
  OSLab.remote = {
    clientId: context.clientId, snapshot, restore, send,
    initialize: () => snapshot(),
    pause(value) { context.pausedAt = host.now(); context.paused = Boolean(value); return snapshot(); },
  };
  restoring = false;
  send(); host.ready(global, context.clientId);
  global.setInterval(send, 2000);
})(window);
