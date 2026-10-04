export const GB = 1024 ** 3;
const present = (item) => item && !item.trashedAt;
const named = (items, parent, name, kind) => items.find((i) => present(i) && i.parentId === parent && i.name.trim().toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR') && (!kind || i.kind === kind));

export function validatePc(type, pc) {
  if (!pc) return false;
  const items = pc.files?.items || [];
  const app = pc.software?.installedPrograms?.appjavafx;
  switch (type) {
    case 'network': {
      const network = pc.network;
      const connected = network?.connectionType === 'ethernet' ? network.ethernetCableConnected : network?.wifiEnabled && !network?.airplaneMode && network?.connectedSsid;
      return Boolean(connected && network.internetAvailable);
    }
    case 'install': return Boolean(app?.installed && pc.software.openedPrograms?.appjavafx && pc.software.downloads?.appjavafx?.status === 'completed');
    case 'uninstall': return Boolean(app && !app.installed && !app.desktopShortcut && !app.startMenuShortcut);
    case 'folder': return Boolean(named(items, 'root-documents', 'Documentos da Escola', 'folder'));
    case 'favorite': return Boolean(Object.values(pc.browsers || {}).some((browser) => browser?.favorites?.some((favorite) => favorite.url === 'hardware.oslab.local')));
    case 'audio': return Boolean(pc.shell && !pc.shell.muted && pc.shell.volume > 0);
    case 'find-file': return Boolean(items.some((i) => i.id === 'pedro-work' && present(i) && i.parentId === 'root-documents'));
    case 'shortcut': {
      const target = items.find((i) => i.id === 'juliana-materials' && present(i) && i.parentId === 'root-documents');
      return Boolean(target && items.some((i) => present(i) && i.parentId === 'root-desktop' && i.shortcutTargetId === target.id));
    }
    case 'restore': return Boolean(items.some((i) => i.id === 'bruno-report' && present(i) && i.parentId === 'root-documents'));
    case 'rename': return Boolean(items.some((i) => i.id === 'tiago-task' && present(i) && i.parentId === 'root-documents' && i.name === 'Atividade de Informática.docx'));
    case 'copy': {
      const original = items.find((i) => i.id === 'beatriz-notice' && present(i) && i.parentId === 'root-documents');
      return Boolean(original && items.some((i) => present(i) && i.parentId === 'root-desktop' && i.sourceId === original.id && i.name === 'Comunicado.pdf'));
    }
    case 'pictures': return Boolean(items.some((i) => i.id === 'diego-photo' && present(i) && i.parentId === 'root-pictures'));
    case 'tabs': return Boolean(Object.values(pc.browsers || {}).some((browser) => browser?.tabs?.some((tab) => tab.url === 'hardware.oslab.local') && !browser.tabs.some((tab) => tab.url === 'youtube.com')));
    case 'browser-install': return Boolean(pc.software?.installedPrograms?.firefox?.installed && pc.software.openedPrograms?.firefox && pc.software.downloads?.firefox?.status === 'completed');
    case 'storage': {
      // Trashed files still occupy space, just as they do in OSLab.
      const used = items.reduce((total, i) => total + (i.kind === 'folder' ? 0 : Number(i.sizeBytes || 1024)), 0);
      const free = Number(pc.runtime?.storageTotalBytes || 0) - Number(pc.runtime?.systemReservedBytes || 0) - used;
      return free >= 2 * GB && ['fernanda-personal', 'fernanda-planning'].every((id) => present(items.find((i) => i.id === id)));
    }
    default: return false;
  }
}
