// Reproducible, scoped adaptations to the pinned local OSLab copy.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('windows');
const marker = path.join(root, '.helpdesk-adapted');
if (fs.existsSync(marker)) { console.log('OSLab já adaptado.'); process.exit(0); }
function edit(relative, callback) {
  const file = path.join(root, relative);
  fs.writeFileSync(file, callback(fs.readFileSync(file, 'utf8')));
}
function replace(text, before, after) {
  if (!text.includes(before)) throw new Error('Trecho original não encontrado: ' + before.slice(0, 80));
  return text.replace(before, after);
}
function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? sourceFiles(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []);
}
for (const file of sourceFiles(path.join(root, 'js'))) {
  if (file.endsWith('pwa.js')) continue;
  const source = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, source.replaceAll('global.localStorage', '(OSLab.storage || global.localStorage)'));
}
edit('js/pwa.js', (s) => replace(s, '  "use strict";', '  "use strict";\n  if (window.OSLab?.remoteContext) return;'));
edit('js/install/software-state.js', (s) => {
  s = s.replaceAll('Date.now()', '(OSLab.runtimeNow ? OSLab.runtimeNow() : Date.now())').replace('download.startedAt || (OSLab.runtimeNow', 'download.startedAt ?? (OSLab.runtimeNow');
  return replace(s, '    getState: () => clone(state),', `    getState: () => clone(state),
    restoreSnapshot(input) {
      timers.forEach((timer) => global.clearInterval(timer)); timers.clear();
      state = input ? { ...defaults(), ...clone(input) } : defaults();
      save(); resumeDownloads();
      OSLab.shell?.refreshPrograms?.();
    },`);
});
edit('js/core/file-system.js', (s) => {
  s = replace(s, 'const kind = input.kind === "folder" ? "folder" : "file";', 'const kind = input.kind === "folder" ? "folder" : input.kind === "shortcut" ? "shortcut" : "file";');
  return replace(s, '      sourceId: input.sourceId || null,', '      sourceId: input.sourceId || null,\n      shortcutTargetId: input.shortcutTargetId || null,');
});
edit('js/core/os-events.js', (s) => replace(s, '      if (item.kind === "folder") return iconMap.folder;', '      if (item.kind === "folder" || item.shortcutTargetId) return iconMap.folder;'));
edit('js/browser/browser-state.js', (s) => replace(s, '  OSLab.browserState = { create,', `  function hydrate(input) {
    const result = copy(input);
    nextId = Math.max(nextId, ...result.tabs.map((t) => Number(t.id.split('-').pop()) + 1).filter(Number.isFinite));
    return result;
  }
  OSLab.browserState = { hydrate, create,`));
edit('js/apps/browser-app.js', (s) => replace(s, 'record.browserState = record.browserState || OSLab.browserState.create(', 'record.browserState = record.browserState || (OSLab.remoteContext?.browsers?.[record.appId] && OSLab.browserState.hydrate(OSLab.remoteContext.browsers[record.appId])) || OSLab.browserState.create('));
edit('js/apps/software-apps.js', (s) => {
  const start = s.indexOf('        record.installTimer = global.setInterval(() => {');
  const end = s.indexOf('        return;', start);
  if (start < 0 || end < 0) throw new Error('Temporizador de instalação não encontrado');
  s = s.slice(0, start) + '        record.installStartedAt = OSLab.runtimeNow ? OSLab.runtimeNow() : Date.now();\n        resumeInstaller(record);\n' + s.slice(end);
  s = replace(s, '    if (record.softwareWired) return;', '    if (record.installerStep === 5) resumeInstaller(record);\n    if (record.softwareWired) return;');
  s = replace(s, '  const controlCategories = [', `  function resumeInstaller(record) {
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

  const controlCategories = [`);
  return s;
});
edit('index.html', (s) => {
  s = replace(s, '    <link rel="stylesheet" href="styles.css" />', '    <link rel="stylesheet" href="styles.css" />\n    <link rel="stylesheet" href="remote.css" />');
  s = replace(s, '    <script defer src="js/core/os-events.js"></script>', '    <script defer src="remote-bootstrap.js"></script>\n    <script defer src="js/core/os-events.js"></script>');
  s = replace(s, '    <script defer src="script.js"></script>', '    <script defer src="script.js"></script>\n    <script defer src="remote-bridge.js"></script>');
  return replace(s, '<img src="assets/icons/ui/audio.png" alt="Volume" />', '<button id="mute-button" type="button" aria-label="Silenciar som"><img src="assets/icons/ui/audio.png" alt="" /></button>');
});
edit('script.js', (s) => {
  s = s.replaceAll('window.localStorage', '(OSLab.storage || window.localStorage)');
  s = replace(s, '    if (!missionsResumed) { missionsResumed = true; OSLab.missions.resumeAfterBoot(); }', '    if (!OSLab.remoteContext && !missionsResumed) { missionsResumed = true; OSLab.missions.resumeAfterBoot(); }');
  s = replace(s, '  function openApp(appId, options = {}) {', '  function openApp(appId, options = {}) {\n    if (OSLab.remoteContext?.allowedApps && !OSLab.remoteContext.allowedApps.has(appId)) return null;');
  s = replace(s, '  OSLab.shell = {\n    openApp,', '  OSLab.shell = {\n    openApp,\n    bootRemote: showDesktop,');
  s = replace(s, '      if (selected?.kind === "folder") renderFolder(record, selected.id);', '      if (selected?.shortcutTargetId) renderFolder(record, selected.shortcutTargetId);\n      else if (selected?.kind === "folder") renderFolder(record, selected.id);');
  s = replace(s, '    if (item.kind === "folder") renderFolder(record, item.id);', '    if (item.shortcutTargetId && OSLab.fileSystem.get(item.shortcutTargetId) && !OSLab.fileSystem.get(item.shortcutTargetId).trashedAt) renderFolder(record, item.shortcutTargetId);\n    else if (item.shortcutTargetId) OSLab.ui.notify("Atalho indisponível", "A pasta de destino não está disponível.", "warning");\n    else if (item.kind === "folder") renderFolder(record, item.id);');
  s = replace(s, '  function renderFolder(record, folderId) {', '  function renderFolder(record, folderId) {\n    record.fileViewId = null;');
  s = replace(s, '    if (!record) return;\n    if (record.frozen', '    if (!record) return;\n    if (record.browserState && OSLab.remoteContext) OSLab.remoteContext.browsers[record.appId] = JSON.parse(JSON.stringify(record.browserState));\n    if (record.frozen');
  s = replace(s, '            <button type="button" data-file-action="delete"', '            <button type="button" data-file-action="shortcut" ${record.explorerSelection && OSLab.fileSystem.get(record.explorerSelection)?.kind === "folder" ? "" : "disabled"}><img src="assets/icons/context/link.png" alt="" /><span>Criar atalho</span></button>\n            <button type="button" data-file-action="delete"');
  s = replace(s, '        const selectedFile = OSLab.fileSystem.get(record.explorerSelection);\n        OSLab.events.emit', '        const selectedFile = OSLab.fileSystem.get(record.explorerSelection);\n        const shortcutButton = record.content.querySelector(\'[data-file-action="shortcut"]\'); if (shortcutButton) shortcutButton.disabled = selectedFile?.kind !== "folder";\n        OSLab.events.emit');
  s = replace(s, '        if (fileAction === "rename" && selectedFile)', `        if (fileAction === "shortcut" && selectedFile?.kind === "folder") {
          OSLab.fileSystem.create({ parentId: OSLab.fileSystem.roots.desktop, kind: "shortcut", name: selectedFile.name + " - Atalho", shortcutTargetId: selectedFile.id });
          renderDesktopFolders(); OSLab.ui.notify("Atalho criado", "O atalho está na Área de Trabalho.", "success");
        }
        if (fileAction === "rename" && selectedFile)`);
  s = replace(s, '{ name: "Aplicativos instalados", description:', '{ name: "Aplicativos instalados", page: "installed-apps", description:');
  s = replace(s, '      : isStorage ? settingsSections.find((item) => item.id === "system")', '      : pageId === "installed-apps" ? settingsSections.find((item) => item.id === "apps") : isStorage ? settingsSections.find((item) => item.id === "system")');
  s = replace(s, 'record.settingsView = isBackground ? "background" : isStorage ? "storage" : section.id;', 'record.settingsView = pageId === "installed-apps" ? "installed-apps" : isBackground ? "background" : isStorage ? "storage" : section.id;');
  s = replace(s, '    if (isBackground) mainContent = settingsBackgroundMarkup();', '    if (pageId === "installed-apps") mainContent = installedAppsMarkup();\n    else if (isBackground) mainContent = settingsBackgroundMarkup();');
  s = replace(s, '  function settingsAppsMarkup() {', `  function installedAppsMarkup() {
    const programs = OSLab.software.getInstalledPrograms();
    return '<header class="settings-page-heading"><button type="button" data-settings-page="apps">‹</button><h1>Aplicativos instalados</h1></header><section class="installed-settings-list">' +
      (programs.length ? programs.map((p) => '<article><img src="' + escapeHtml(p.icon) + '" alt="" /><div><strong>' + escapeHtml(p.name) + '</strong><small>' + escapeHtml(p.publisher) + ' · ' + escapeHtml(p.size) + '</small></div><button type="button" data-uninstall-program="' + p.id + '">Desinstalar</button></article>').join('') : '<p>Nenhum aplicativo adicional instalado.</p>') + '</section>';
  }

  function settingsAppsMarkup() {`);
  s = replace(s, '      if (settingsPage && record.appId === "settings")', `      const uninstallId = event.target.closest('[data-uninstall-program]')?.dataset.uninstallProgram;
      if (uninstallId && OSLab.software.isInstalled(uninstallId) && await OSLab.ui.confirm({ title: 'Desinstalar ' + OSLab.software.getProgram(uninstallId).name + '?', message: 'O aplicativo e seus atalhos serão removidos deste computador.', confirmLabel: 'Desinstalar' })) {
        OSLab.software.uninstall(uninstallId); renderSettings(record, 'installed-apps');
      }
      if (settingsPage && record.appId === "settings")`);
  s = replace(s, '        wallpaperId: currentWallpaperId, volume:', '        fileClipboard: fileClipboard ? JSON.parse(JSON.stringify(fileClipboard)) : null,\n        wallpaperId: currentWallpaperId, volume:');
  s = replace(s, '          appId: record.appId, options:', `          ui: Object.fromEntries(['browserState','browserPageState','googleQuery','browserHost','browserResult','downloadPanelOpen','bookmarkOpen','favoritesOpen','browserMenuOpen','installerStep','installerId','installProgress','installStartedAt','createDesktopShortcut','launchAfterInstall','controlView','controlSelected','explorerSelection','fileViewId','recycleSelection','previousExplorerView'].filter((key) => record[key] !== undefined).map((key) => [key, JSON.parse(JSON.stringify(record[key]))])),
          scroll: { top: record.content.scrollTop, left: record.content.scrollLeft },
          geometry: { left: record.element.style.left, top: record.element.style.top, width: record.element.style.width, height: record.element.style.height, z: record.element.style.zIndex, minimized: record.element.classList.contains('is-minimized'), maximized: record.element.classList.contains('is-maximized') },
          renameDraft: record.content.querySelector('.file-rename-input') ? { itemId: record.content.querySelector('.file-rename-input').closest('[data-file-item]').dataset.fileItem, value: record.content.querySelector('.file-rename-input').value } : null,
          searchDraft: record.content.querySelector('[data-explorer-search]')?.value || '',
          appId: record.appId, options:`);
  s = replace(s, '      if (!input) return;\n      const windowSnapshots', '      if (!input) return;\n      fileClipboard = input.fileClipboard ? JSON.parse(JSON.stringify(input.fileClipboard)) : null;\n      const windowSnapshots');
  s = replace(s, '        record.options = { ...(entry.options || {}) };', '        Object.assign(record, entry.ui || {});\n        record.options = { ...(entry.options || {}) };');
  s = replace(s, '        if (entry.currentFolderId && entry.appId === "explorer") renderFolder(record, entry.currentFolderId); else renderApp(record);', `        if (entry.currentFolderId && entry.appId === "explorer") renderFolder(record, entry.currentFolderId); else renderApp(record);
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
        }`);
  return s;
});
const precacheFile = path.join(root, 'precache-manifest.json');
const precache = JSON.parse(fs.readFileSync(precacheFile, 'utf8'));
for (const file of ['./remote-bootstrap.js','./remote-bridge.js','./remote.css']) if (!precache.includes(file)) precache.push(file);
fs.writeFileSync(precacheFile, JSON.stringify(precache, null, 2) + '\n');
fs.writeFileSync(marker, 'OSLab 357a66122f3819b0534e37bb2a20c35e12e9b887 / HelpDeskSimulator v1\n');
console.log('OSLab adaptado para computadores remotos isolados.');
