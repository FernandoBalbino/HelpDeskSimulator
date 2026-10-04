export function preparePwa(onState) {
  let prompt = null;
  let registration = null;
  let status = 'Preparando uso offline…';
  const reflect = () => onState({ text: navigator.onLine ? status : (status === 'Disponível offline' ? 'Você está offline · tudo pronto' : 'Sem conexão'), installable: Boolean(prompt), update: Boolean(registration?.waiting) });
  window.addEventListener('online', reflect); window.addEventListener('offline', reflect);
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); prompt = event; reflect(); });
  window.addEventListener('appinstalled', () => { prompt = null; reflect(); });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').then(async (reg) => {
      registration = reg;
      const ready = await navigator.serviceWorker.ready;
      if (ready.active) { status = 'Disponível offline'; reflect(); }
      reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', reflect));
      reflect();
    }).catch(() => { status = 'Uso offline indisponível'; reflect(); });
  } else { status = 'Use um navegador compatível para instalar'; reflect(); }
  return {
    async install() { if (prompt) { await prompt.prompt(); await prompt.userChoice; prompt = null; reflect(); } else onState({ text: 'No Chrome: menu ⋮ → Instalar aplicativo', installable: false }); },
    update() { registration?.waiting?.postMessage('SKIP_WAITING'); navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true }); },
  };
}
