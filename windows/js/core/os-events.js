(function bootstrapOSLab(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const target = new EventTarget();
  let eventSequence = 0;

  OSLab.events = {
    emit(type, detail = {}, source = "system") {
      const envelope = {
        eventId: `os-event-${Date.now()}-${++eventSequence}`,
        type,
        occurredAt: new Date().toISOString(),
        source,
        detail: detail && typeof detail === "object" ? detail : { value: detail },
      };
      target.dispatchEvent(new CustomEvent(type, { detail: envelope }));
      target.dispatchEvent(new CustomEvent("oslab:event", { detail: envelope }));
      return envelope;
    },

    subscribe(type, listener) {
      const wrapped = (event) => listener(event.detail);
      target.addEventListener(type, wrapped);
      return () => target.removeEventListener(type, wrapped);
    },

    once(type, listener) {
      const unsubscribe = this.subscribe(type, (event) => {
        unsubscribe();
        listener(event);
      });
      return unsubscribe;
    },
  };

  const iconMap = {
    app: "assets/settings/Apps.webp",
    application: "assets/settings/Apps.webp",
    process: "assets/icons/taskmanager/services.png",
    systemProcess: "assets/icons/taskmanager/services.png",
    taskmanager: "assets/icons/taskmanager.png",
    explorer: "assets/icons/explorer.png",
    search: "assets/icons/search.png",
    start: "assets/icons/start.png",
    folder: "assets/icons/win/folder.png",
    txt: "assets/icons/notepad.png",
    pdf: "assets/icons/win/documents.png",
    docx: "assets/icons/win/documents.png",
    image: "assets/icons/win/pictures.png",
    file: "assets/icons/win/documents.png",
    mission: "assets/learning/icons/target_arrow.svg",
    medal: "assets/learning/icons/ribbon.svg",
    checklist: "assets/learning/icons/list_bar.svg",
    success: "assets/learning/icons/checkmark_circle.svg",
    warning: "assets/icons/settings-rows/troubleshoot.png",
    info: "assets/learning/icons/lightbulb.svg",
    error: "assets/icons/context/delete.png",
  };

  OSLab.icons = {
    get(kind, fallback = "app") {
      return iconMap[kind] || iconMap[fallback] || iconMap.app;
    },
    file(item) {
      if (!item) return iconMap.file;
      if (item.kind === "folder" || item.shortcutTargetId) return iconMap.folder;
      const extension = String(item.name || "").split(".").pop().toLocaleLowerCase("pt-BR");
      if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) return iconMap.image;
      return iconMap[extension] || iconMap.file;
    },
    process(process) {
      return process?.icon || iconMap.process;
    },
    fallbackImage(image, kind = "app") {
      if (!image) return;
      image.addEventListener("error", () => {
        const fallback = this.get(kind);
        if (image.src.endsWith(fallback)) return;
        image.src = fallback;
        OSLab.diagnostics?.push({ type: "asset:error", source: image.getAttribute("src"), fallback });
      }, { once: true });
    },
    map: Object.freeze({ ...iconMap }),
  };

  OSLab.diagnostics = OSLab.diagnostics || [];

  document.addEventListener("error", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || image.dataset.iconFallbackApplied === "true") return;
    image.dataset.iconFallbackApplied = "true";
    const failedSource = image.getAttribute("src") || "";
    const kind = image.dataset.iconKind || "app";
    OSLab.diagnostics.push({ type: "icon:missing", source: failedSource, occurredAt: new Date().toISOString() });
    image.src = OSLab.icons.get(kind);
  }, true);
})(window);
