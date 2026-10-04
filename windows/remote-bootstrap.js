(function prepareRemoteDesktop(global) {
  'use strict';
  const clientId = new URLSearchParams(global.location.search).get('client');
  if (!clientId || global.parent === global) return;
  const initial = global.parent.HelpDeskRemoteHost.initial(global);
  const data = { ...(initial.pc?.storage || {}) };
  const OSLab = global.OSLab = global.OSLab || {};
  // Every state module uses this private in-memory store in remote mode.
  // Only the host persists the complete, client-specific snapshot.
  OSLab.storage = {
    getItem: (key) => Object.hasOwn(data, key) ? data[key] : null,
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: (key) => { delete data[key]; },
    snapshot: () => JSON.parse(JSON.stringify(data)),
    restore: (input) => { Object.keys(data).forEach((key) => delete data[key]); Object.assign(data, input || {}); },
  };
  OSLab.remoteContext = { ...initial, browsers: initial.pc?.browsers || {} };
  OSLab.runtimeNow = () => OSLab.remoteContext.paused ? OSLab.remoteContext.pausedAt : global.parent.HelpDeskRemoteHost.now();
  document.documentElement.classList.add('remote-mode');
})(window);
