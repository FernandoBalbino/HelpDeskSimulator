(function prepareOfflineApp() {
  "use strict";
  if (window.OSLab?.remoteContext) return;
  let installPrompt = null;
  let reloadingForUpdate = false;

  function standalone() {
    return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  }
  function updateConnectionState() { document.documentElement.dataset.connection = navigator.onLine ? "online" : "offline"; }
  function updateInstallButtons() {
    document.querySelectorAll("[data-pwa-install]").forEach((button) => {
      const installed = standalone();
      button.dataset.installed = String(installed);
      button.querySelector("span").textContent = installed ? "OSLab instalado e pronto offline" : "Instalar para usar offline";
      button.disabled = installed;
    });
  }
  function message(title, copy, kind = "info") { window.OSLab?.ui?.notify?.(title, copy, kind, 6500); }
  async function install() {
    if (standalone()) { message("OSLab já instalado", "O laboratório pode ser aberto e utilizado sem internet.", "success"); return; }
    if (!installPrompt) {
      message("Instalar o OSLab", "No Chrome, abra o menu do navegador e escolha Instalar OSLab ou Criar atalho. O primeiro acesso completo prepara os arquivos offline.");
      return;
    }
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") message("Instalação iniciada", "O OSLab ficará disponível como aplicativo neste dispositivo.", "success");
    installPrompt = null; updateInstallButtons();
  }

  updateConnectionState(); updateInstallButtons();
  window.addEventListener("online", updateConnectionState);
  window.addEventListener("offline", updateConnectionState);
  window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); installPrompt = event; document.documentElement.dataset.installAvailable = "true"; updateInstallButtons(); });
  window.addEventListener("appinstalled", () => { installPrompt = null; document.documentElement.dataset.installed = "true"; updateInstallButtons(); message("OSLab instalado", "A interface e os exercícios estão disponíveis offline.", "success"); });
  document.addEventListener("click", (event) => { if (event.target.closest("[data-pwa-install]")) void install(); });
  window.matchMedia("(display-mode: standalone)").addEventListener?.("change", updateInstallButtons);

  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (reloadingForUpdate) window.location.reload(); });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js");
      await navigator.serviceWorker.ready;
      document.documentElement.dataset.offlineReady = "true";
      window.dispatchEvent(new CustomEvent("oslab:offline-ready"));

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing; if (!worker) return;
        worker.addEventListener("statechange", async () => {
          if (worker.state !== "installed" || !navigator.serviceWorker.controller) return;
          document.documentElement.dataset.updateReady = "true";
          const accept = await window.OSLab.ui.confirm({ title: "Nova versão pronta", message: "Atualize agora para usar os recursos mais recentes do OSLab.", confirmLabel: "Atualizar" });
          if (accept) { reloadingForUpdate = true; worker.postMessage("SKIP_WAITING"); }
        });
      });
      void registration.update();
    } catch (error) {
      console.error("Não foi possível preparar o OSLab para uso offline.", error);
      message("Modo offline indisponível", "Recarregue a página quando houver conexão para preparar os arquivos locais.", "warning");
    }
  });
})();
