(function createNetworkManager(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const listeners = new Set();
  let backing = null;
  let persist = () => {};

  const defaults = Object.freeze({
    wifiEnabled: true,
    airplaneMode: false,
    connectionType: "wifi",
    connectedSsid: "REDE_OSLAB",
    ethernetCableConnected: false,
    dhcpEnabled: true,
    dnsAutomatic: true,
    ip: "192.168.1.100",
    mask: "255.255.255.0",
    gateway: "192.168.1.1",
    dns: "8.8.8.8",
  });

  let state = { ...defaults };
  const availableNetworks = Object.freeze([
    { ssid: "REDE_OSLAB", secure: true, signal: 94 },
    { ssid: "Casa_OS", secure: true, signal: 96 },
    { ssid: "Escola_WiFi", secure: true, signal: 82 },
    { ssid: "Aeroporto_Free_WiFi", secure: false, signal: 76 },
    { ssid: "Cafe_Free", secure: false, signal: 58 },
    { ssid: "BIBLIOTECA", secure: true, signal: 67 },
    { ssid: "VISITANTES", secure: false, signal: 42 },
  ]);

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function ipv4Parts(value) {
    const parts = String(value || "").trim().split(".").map(Number);
    return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? parts : null;
  }
  function validIpv4(value) { return Boolean(ipv4Parts(value)); }
  function sameNetwork(ip, gateway, mask) {
    const a = ipv4Parts(ip); const b = ipv4Parts(gateway); const m = ipv4Parts(mask);
    return Boolean(a && b && m && a.every((part, index) => (part & m[index]) === (b[index] & m[index])));
  }
  function adapterConnected() {
    if (state.connectionType === "ethernet") return state.ethernetCableConnected;
    return state.wifiEnabled && !state.airplaneMode && Boolean(state.connectedSsid);
  }
  function localNetworkAvailable() { return adapterConnected() && sameNetwork(state.ip, state.gateway, state.mask); }
  function internetByIpAvailable() { return localNetworkAvailable() && state.gateway === "192.168.1.1"; }
  function dnsResolutionAvailable() {
    return internetByIpAvailable() && (state.dnsAutomatic || ["8.8.8.8", "1.1.1.1"].includes(state.dns));
  }
  function snapshot() {
    return {
      ...clone(state),
      availableNetworks: clone(availableNetworks),
      adapterConnected: adapterConnected(),
      localNetworkAvailable: localNetworkAvailable(),
      internetByIpAvailable: internetByIpAvailable(),
      dnsResolutionAvailable: dnsResolutionAvailable(),
      internetAvailable: internetByIpAvailable() && dnsResolutionAvailable(),
    };
  }
  function syncBacking() {
    if (!backing) return;
    backing.wifi = state.wifiEnabled;
    backing.airplane = state.airplaneMode;
    backing.connectedSsid = state.connectedSsid;
  }
  function notify(reason) {
    syncBacking(); persist();
    const current = snapshot();
    listeners.forEach((listener) => listener(current, reason));
    OSLab.events.emit("network:changed", { reason, network: current }, "networkManager");
    return current;
  }
  function applyDhcp() {
    state.ip = "192.168.1.100";
    state.mask = "255.255.255.0";
    state.gateway = "192.168.1.1";
    if (state.dnsAutomatic) state.dns = "8.8.8.8";
  }
  function restoreSnapshot(input, options = {}) {
    state = { ...defaults, ...(input || {}) };
    delete state.availableNetworks;
    delete state.adapterConnected;
    delete state.localNetworkAvailable;
    delete state.internetByIpAvailable;
    delete state.dnsResolutionAvailable;
    delete state.internetAvailable;
    return options.silent ? (syncBacking(), snapshot()) : notify("restored");
  }
  function setWifi(enabled) {
    state.wifiEnabled = Boolean(enabled);
    if (state.wifiEnabled) state.airplaneMode = false;
    if (!state.wifiEnabled) state.connectedSsid = null;
    return notify("wifi");
  }
  function setAirplaneMode(enabled) {
    state.airplaneMode = Boolean(enabled);
    if (state.airplaneMode) { state.wifiEnabled = false; state.connectedSsid = null; }
    return notify("airplane");
  }
  function connectWifi(ssid) {
    if (!state.wifiEnabled || state.airplaneMode || !availableNetworks.some((network) => network.ssid === ssid)) return { ok: false };
    state.connectionType = "wifi";
    state.connectedSsid = ssid;
    if (state.dhcpEnabled) applyDhcp();
    notify("wifi-connected");
    return { ok: true, network: snapshot() };
  }
  function setConnectionType(type) {
    state.connectionType = type === "ethernet" ? "ethernet" : "wifi";
    if (state.connectionType === "wifi" && state.wifiEnabled && !state.connectedSsid) state.connectedSsid = "REDE_OSLAB";
    if (state.dhcpEnabled && adapterConnected()) applyDhcp();
    return notify("connection-type");
  }
  function setEthernetCable(connected) {
    state.ethernetCableConnected = Boolean(connected);
    state.connectionType = "ethernet";
    if (connected && state.dhcpEnabled) applyDhcp();
    return notify("ethernet-cable");
  }
  function setDhcp(enabled) {
    state.dhcpEnabled = Boolean(enabled);
    if (state.dhcpEnabled) applyDhcp();
    return notify("dhcp");
  }
  function setIpConfig(config) {
    const values = { ip: config.ip, mask: config.mask, gateway: config.gateway };
    if (!Object.values(values).every(validIpv4)) return { ok: false, reason: "invalid-ipv4" };
    state.dhcpEnabled = false;
    Object.assign(state, values);
    notify("ip-config");
    return { ok: true, network: snapshot() };
  }
  function setDns(value, automatic = false) {
    if (!automatic && !validIpv4(value)) return { ok: false, reason: "invalid-dns" };
    state.dnsAutomatic = Boolean(automatic);
    state.dns = automatic ? "8.8.8.8" : value;
    notify("dns");
    return { ok: true, network: snapshot() };
  }
  function resolveHost(host) {
    const clean = String(host || "").trim().toLocaleLowerCase("pt-BR");
    if (validIpv4(clean)) return { ok: true, host: clean, ip: clean, usedDns: false };
    if (!dnsResolutionAvailable()) return { ok: false, host: clean, ip: null, usedDns: true };
    return { ok: true, host: clean, ip: clean === "google.com" || clean === "www.google.com" ? "142.250.79.14" : "203.0.113.10", usedDns: true };
  }
  function ping(host) {
    const resolved = resolveHost(host);
    let ok = false;
    if (resolved.ok) {
      if (resolved.ip === state.gateway) ok = localNetworkAvailable();
      else ok = internetByIpAvailable();
    }
    const result = {
      ok,
      host: resolved.host,
      ip: resolved.ip,
      output: !resolved.ok
        ? `Ping: não foi possível localizar o host ${resolved.host}. Verifique o nome e tente novamente.`
        : ok
          ? `Disparando ${resolved.host} [${resolved.ip}] com 32 bytes de dados:\nResposta de ${resolved.ip}: bytes=32 tempo=8ms TTL=117\nResposta de ${resolved.ip}: bytes=32 tempo=7ms TTL=117\n\nEstatísticas do Ping: Enviados = 2, Recebidos = 2, Perdidos = 0 (0% de perda).`
          : `Disparando ${resolved.host}${resolved.ip ? ` [${resolved.ip}]` : ""} com 32 bytes de dados:\nEsgotado o tempo limite do pedido.\n\nEstatísticas do Ping: Enviados = 1, Recebidos = 0, Perdidos = 1 (100% de perda).`,
    };
    OSLab.events.emit("network:ping", result, "networkManager");
    return result;
  }
  function nslookup(host) {
    const resolved = resolveHost(host);
    const result = {
      ok: resolved.ok && dnsResolutionAvailable(), host: resolved.host, ip: resolved.ip,
      output: resolved.ok && dnsResolutionAvailable()
        ? `Servidor:  dns.oslab.local\nAddress:  ${state.dns}\n\nNome:    ${resolved.host}\nAddress:  ${resolved.ip}`
        : `Servidor:  Desconhecido\nAddress:  ${state.dns || "0.0.0.0"}\n\n*** Tempo limite da solicitação ao DNS esgotado.`,
    };
    OSLab.events.emit("network:nslookup", result, "networkManager");
    return result;
  }
  function browse(host = "google.com") {
    const resolved = resolveHost(host);
    const result = { ok: resolved.ok && internetByIpAvailable(), host: resolved.host, ip: resolved.ip, reason: null };
    if (!adapterConnected()) result.reason = "disconnected";
    else if (!localNetworkAvailable()) result.reason = "local-network";
    else if (!internetByIpAvailable()) result.reason = "internet";
    else if (!resolved.ok) result.reason = "dns";
    OSLab.events.emit("network:browser", result, "networkManager");
    return result;
  }
  function ipconfig(all = false) {
    const current = snapshot();
    const media = current.adapterConnected ? "" : "\n   Estado da mídia. . . . . . . . . . . . : mídia desconectada";
    return `Configuração de IP do Windows\n\nAdaptador ${state.connectionType === "ethernet" ? "Ethernet" : "Wi-Fi"}:\n${media || `   Endereço IPv4. . . . . . . . . . . . : ${state.ip}\n   Máscara de Sub-rede . . . . . . . . . : ${state.mask}\n   Gateway Padrão. . . . . . . . . . . . : ${state.gateway}`}${all ? `\n   DHCP Habilitado. . . . . . . . . . . . : ${state.dhcpEnabled ? "Sim" : "Não"}\n   Servidores DNS. . . . . . . . . . . . . : ${state.dns}` : ""}`;
  }

  OSLab.network = {
    defaults: { ...defaults }, bind(sharedQuickSettings, save) {
      backing = sharedQuickSettings || backing; persist = typeof save === "function" ? save : persist;
      if (backing) {
        const storedSsid = availableNetworks.some((network) => network.ssid === backing.connectedSsid)
          ? backing.connectedSsid
          : state.connectedSsid;
        state = {
          ...state,
          wifiEnabled: backing.wifi !== false,
          airplaneMode: Boolean(backing.airplane),
          connectedSsid: storedSsid,
        };
      }
      if (state.airplaneMode) { state.wifiEnabled = false; state.connectedSsid = null; }
      syncBacking(); return this;
    },
    getSnapshot: snapshot, restoreSnapshot, setWifi, setAirplaneMode, connectWifi, setConnectionType,
    setEthernetCable, setDhcp, setIpConfig, setDns, ping, nslookup, browse, ipconfig,
    validIpv4, sameNetwork, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
})(window);
