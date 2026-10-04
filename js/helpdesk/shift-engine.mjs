import { tickets, byId } from './tickets.mjs';
import { validatePc } from './validators.mjs';
import { clone, loadShift, saveShift, STORAGE_KEY } from './state-manager.mjs';
import { dialogueOptions } from './chat-engine.mjs';

export const statusLabels = { new: 'Novo', waiting: 'Aguardando', service: 'Em atendimento', remote: 'Acesso remoto', customer: 'Aguardando cliente', resolved: 'Resolvido' };

export function createShift({ storage = null, random = Math.random, saved = null } = {}) {
  const listeners = new Set();
  let serial = 0;
  let reading = null;
  const fresh = () => ({ version: 1, id: `shift-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${++serial}-${Math.floor(random() * 1e6)}`}`, phase: 'intro', elapsedMs: 0, schedule: [], events: [], tickets: {}, selected: null, muted: false, startedAt: null, finishedAt: null });
  let state = clone(saved || loadShift(storage)) || fresh();
  const delay = (low, high) => low + Math.floor(random() * (high - low + 1));
  function id(prefix) { return `${prefix}-${state.elapsedMs}-${++serial}-${Math.floor(random() * 1e6)}`; }
  function emit(type, detail = {}) { listeners.forEach((fn) => fn({ type, ...detail })); }
  function persist(type = 'changed') { const ok = saveShift(storage, state); emit(type, { persistence: ok }); }
  function queue(type, ticketId, after, data = {}) { state.events.push({ id: id('event'), type, ticketId, at: state.elapsedMs + after, data }); }
  function notify(ticketId, title, message, kind = 'message') { emit('notification', { ticketId, title, message, kind }); }
  function message(ticket, role, text, image = null) {
    ticket.messages.push({ id: id('message'), role, text, image, at: state.elapsedMs });
    if (role === 'customer' && reading !== ticket.id) ticket.unread += 1;
    if (role === 'customer' && ticket.status === 'service' && reading !== ticket.id) ticket.status = 'waiting';
  }
  function restoreStatus(ticket) { ticket.status = ticket.remote.connected ? 'remote' : 'service'; }
  function settleReply(ticket) {
    ticket.pending = state.events.some((event) => event.ticketId === ticket.id && ['reply', 'authorization', 'verify'].includes(event.type));
    ticket.typing = ticket.pending;
    if (ticket.pending) ticket.status = 'customer'; else restoreStatus(ticket);
  }
  function arrive(ticketId) {
    if (state.tickets[ticketId]) return;
    const definition = byId[ticketId];
    const ticket = { id: ticketId, arrivedAt: state.elapsedMs, openedAt: null, closedAt: null, status: 'new', node: 'start', messages: [], unread: 0, typing: false, pending: false, asked: [], solved: false, confirmed: false, pc: null, remote: { requested: false, authorized: false, connected: false, connecting: null, code: null, accesses: 0 } };
    state.tickets[ticketId] = ticket;
    message(ticket, 'customer', definition.opening);
    queue('followup', ticketId, delay(220000, 270000), { index: 0 });
    queue('followup', ticketId, delay(470000, 540000), { index: 1 });
    notify(ticketId, 'Novo chamado recebido', `${definition.name} solicitou atendimento.`, 'ticket');
  }
  function process(event) {
    if (event.type === 'arrival') return arrive(event.ticketId);
    const ticket = state.tickets[event.ticketId];
    if (!ticket || ticket.status === 'resolved') return;
    if (event.type === 'typing') ticket.typing = true;
    if (event.type === 'reply') {
      settleReply(ticket);
      ticket.node = event.data.next;
      const node = byId[ticket.id].conversation[ticket.node];
      message(ticket, 'customer', node.message, node.image ? `assets/screenshots/${node.image}.png` : null);
      notify(ticket.id, 'Nova mensagem', `${byId[ticket.id].name} respondeu sua pergunta.`);
    }
    if (event.type === 'authorization') {
      settleReply(ticket);
      ticket.remote.authorized = true;
      const used = new Set(Object.values(state.tickets).map((t) => t.remote.code));
      let value = delay(100000, 999999);
      while (used.has(String(value).slice(0, 3) + ' ' + String(value).slice(3))) value = value >= 999999 ? 100000 : value + 1;
      ticket.remote.code = String(value).slice(0, 3) + ' ' + String(value).slice(3);
      message(ticket, 'customer', `Pode acessar. O código que apareceu aqui é ${ticket.remote.code}.`);
      notify(ticket.id, 'Acesso remoto autorizado', `Código recebido de ${byId[ticket.id].name}.`, 'remote');
    }
    if (event.type === 'connection-stage') ticket.remote.connecting = event.data.label;
    if (event.type === 'connected') {
      ticket.remote.connecting = null; ticket.remote.connected = true; ticket.remote.accesses += 1; ticket.status = 'remote';
      emit('connected', { ticketId: ticket.id });
    }
    if (event.type === 'verify') {
      settleReply(ticket);
      ticket.solved = validatePc(byId[ticket.id].validation, ticket.pc);
      ticket.confirmed = ticket.solved;
      message(ticket, 'customer', ticket.solved ? byId[ticket.id].confirmation : 'Ainda continua igual. Pode conferir novamente?');
      notify(ticket.id, 'Cliente respondeu', `${byId[ticket.id].name} ${ticket.confirmed ? 'confirmou a correção.' : 'ainda precisa de ajuda.'}`);
    }
    if (event.type === 'followup') {
      if (ticket.pending || ticket.confirmed) return;
      message(ticket, 'customer', byId[ticket.id].followups[event.data.index]);
      notify(ticket.id, 'Nova mensagem', `${byId[ticket.id].name} enviou uma nova mensagem.`);
    }
  }
  function tickEvents() {
    // Event callbacks may append events. Remove each event before processing it.
    let next;
    while ((next = state.events.filter((e) => e.at <= state.elapsedMs).sort((a, b) => a.at - b.at)[0])) {
      state.events = state.events.filter((e) => e.id !== next.id);
      process(next);
    }
  }
  return {
    get state() { return state; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    snapshot() { return clone(state); },
    start() {
      if (state.phase !== 'intro') return false;
      state.phase = 'running'; state.startedAt = new Date().toISOString();
      let at = 0;
      state.schedule = tickets.map((ticket, index) => { if (index) at += delay(60000, 110000); return { ticketId: ticket.id, at }; });
      state.events = state.schedule.map((s) => ({ id: id('arrival'), type: 'arrival', ticketId: s.ticketId, at: s.at, data: {} }));
      tickEvents(); state.selected = tickets[0].id; this.open(tickets[0].id); persist(); return true;
    },
    advance(ms) {
      if (state.phase !== 'running' || !Number.isFinite(ms) || ms < 0) return;
      state.elapsedMs += ms; tickEvents();
      // Keep inactive downloads coherent with the one shared activity clock.
      for (const ticket of Object.values(state.tickets)) {
        for (const download of Object.values(ticket.pc?.software?.downloads || {})) {
          if (download.status !== 'downloading') continue;
          const elapsed = state.elapsedMs - download.startedAt;
          download.progress = Math.min(100, Math.floor(elapsed / 600));
          download.downloadedMb = Math.min(download.totalMb, download.totalMb * elapsed / 60000);
          if (elapsed >= 60000) { download.status = 'completed'; download.progress = 100; }
        }
      }
      persist('tick');
    },
    setReading(ticketId) {
      reading = ticketId;
      const ticket = state.tickets[ticketId];
      if (ticket?.unread) { ticket.unread = 0; persist('read'); }
    },
    open(ticketId) {
      const ticket = state.tickets[ticketId]; if (!ticket) return false;
      state.selected = ticketId; reading = ticketId; ticket.unread = 0;
      ticket.openedAt ??= state.elapsedMs;
      if (['new', 'waiting'].includes(ticket.status)) restoreStatus(ticket);
      persist('selected'); return true;
    },
    options(ticketId) { return dialogueOptions(state.tickets[ticketId]); },
    reply(ticketId, optionId) {
      const ticket = state.tickets[ticketId];
      const option = this.options(ticketId).find((o) => o.id === optionId);
      if (!option || option.disabled) return false;
      if (option.kind === 'remote') return ticket.remote.authorized ? this.connect(ticketId) : this.requestRemote(ticketId);
      if (option.kind === 'close') return this.close(ticketId);
      if (option.kind === 'verify') return this.verify(ticketId);
      message(ticket, 'technician', option.label); ticket.asked.push(optionId); ticket.pending = true; ticket.status = 'customer';
      const before = delay(500, 1200);
      queue('typing', ticketId, before); queue('reply', ticketId, before + delay(1000, 3000), { next: option.next });
      persist(); return true;
    },
    requestRemote(ticketId) {
      const ticket = state.tickets[ticketId];
      if (!ticket || ticket.status === 'resolved' || ticket.remote.requested) return false;
      // Request is available immediately, even while an ordinary answer is pending.
      ticket.remote.requested = true;
      message(ticket, 'technician', 'Você autoriza o acesso ao seu computador?');
      ticket.pending = true; ticket.status = 'customer';
      queue('typing', ticketId, 700); queue('authorization', ticketId, delay(2000, 4000));
      persist(); return true;
    },
    connect(ticketId) {
      const ticket = state.tickets[ticketId];
      if (!ticket?.remote.authorized || ticket.status === 'resolved') return false;
      if (ticket.remote.connected) { emit('connected', { ticketId }); return true; }
      if (ticket.remote.connecting) return false;
      ticket.remote.connecting = 'Conectando…';
      queue('connection-stage', ticketId, 650, { label: 'Estabelecendo sessão…' });
      queue('connection-stage', ticketId, 1300, { label: 'Carregando área de trabalho…' });
      queue('connected', ticketId, 1900); persist(); return true;
    },
    updatePc(ticketId, pc) {
      const ticket = state.tickets[ticketId]; if (!ticket) return;
      ticket.pc = clone(pc); ticket.solved = validatePc(byId[ticketId].validation, pc);
      if (!ticket.solved) ticket.confirmed = false;
      persist('pc');
    },
    verify(ticketId) {
      const ticket = state.tickets[ticketId];
      if (!ticket || ticket.pending || ticket.status === 'resolved' || !validatePc(byId[ticketId].validation, ticket.pc)) return false;
      message(ticket, 'technician', 'Verifique agora se o problema foi corrigido, por favor.');
      ticket.pending = true; ticket.status = 'customer';
      queue('typing', ticketId, delay(500, 1000)); queue('verify', ticketId, delay(2200, 4000));
      persist(); return true;
    },
    close(ticketId) {
      const ticket = state.tickets[ticketId];
      if (!ticket?.confirmed || ticket.status === 'resolved' || !validatePc(byId[ticketId].validation, ticket.pc)) return false;
      ticket.status = 'resolved'; ticket.closedAt = state.elapsedMs; ticket.pending = false; ticket.typing = false;
      ticket.remote.connected = false; state.events = state.events.filter((e) => e.ticketId !== ticketId);
      message(ticket, 'technician', 'Chamado resolvido. Obrigado pelo contato e bom trabalho!');
      notify(ticketId, 'Chamado resolvido', `Atendimento de ${byId[ticketId].name} concluído.`, 'resolved');
      if (Object.values(state.tickets).filter((t) => t.status === 'resolved').length === 10) { state.phase = 'finished'; state.finishedAt = new Date().toISOString(); }
      persist('closed'); return true;
    },
    mute() { state.muted = !state.muted; persist('mute'); },
    reset() { state = fresh(); reading = null; try { storage?.removeItem(STORAGE_KEY); } catch {} persist('reset'); },
    persist,
  };
}
