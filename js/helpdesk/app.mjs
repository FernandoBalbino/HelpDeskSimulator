import { tickets, byId } from './tickets.mjs';
import { createShift, statusLabels } from './shift-engine.mjs';
import { RemoteSession } from './remote-session.mjs';
import { NotificationManager } from './notification-manager.mjs';
import { preparePwa } from './pwa.mjs';

const errors = window.__helpdeskErrors = [];
window.addEventListener('error', (event) => errors.push(event.message));
window.addEventListener('unhandledrejection', (event) => errors.push(String(event.reason)));
let storage = null;
try { storage = window.localStorage; } catch { /* Continue in memory. */ }
export const engine = createShift({ storage });
window.HelpDesk = { engine };
const $ = (selector) => document.querySelector(selector);
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name) => `<img class="icon" src="./windows/assets/learning/icons/${name}.svg" alt="">`;
const clock = (ms) => { const minutes = Math.floor(ms / 60000) + 480; return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; };
const minutes = (ms) => Math.max(1, Math.round(ms / 60000));
const avatar = (definition, size = '') => `<img class="avatar ${size}" src="./${definition.avatar}" alt="${definition.name}">`;
const badge = (ticket) => `<span class="status status-${ticket.status}"><i></i>${statusLabels[ticket.status]}</span>`;
let view = engine.state.phase === 'finished' ? 'shift' : 'tickets';
let remoteVisible = Boolean(engine.state.tickets[engine.state.selected]?.remote.connected);
let remote = null;
let currentChatKey = null;
let listFilter = 'all';
let search = '';
let pwaState = { text: 'Preparando uso offline…', installable: false, update: false };
let notification = null;
let lastNow = performance.now();
let persistenceWarning = false;

function select(ticketId) {
  if (!engine.state.tickets[ticketId]) return;
  remote?.flush(); view = 'tickets';
  remoteVisible = Boolean(engine.state.tickets[ticketId].remote.connected);
  engine.open(ticketId); currentChatKey = null; render();
}
notification = new NotificationManager(engine, select);

function intro() {
  $('#app').innerHTML = `<section class="welcome">
    <header class="welcome-header"><a class="brand" href="./"><img src="./assets/icon.svg" alt=""><span>HelpDesk<span>Simulator</span></span></a><div class="header-actions"><span class="offline-state" data-offline></span><button class="quiet" type="button" data-fullscreen>${icon('window')}<span>Tela cheia</span></button></div></header>
    <main class="welcome-main"><div class="welcome-copy"><span class="eyebrow"><i></i> SEU PRIMEIRO EXPEDIENTE NO SUPORTE</span><h1>Pessoas precisam<br>de ajuda.<br><em>Você resolve.</em></h1><p class="welcome-lead">Assuma a Central de Suporte Técnico: converse com clientes, investigue o computador e encontre uma solução de verdade.</p><div class="welcome-meta"><span>${icon('list_bar')}<b>${tickets.length}</b> chamados</span><span>${icon('timer')}45–60 minutos</span></div><button class="primary start-button" type="button" data-start>Começar expediente ${icon('arrow_right')}</button><p class="welcome-footnote">Novos chamados chegam durante o atendimento.<br>Você pode trocar entre clientes e continuar de onde parou.</p></div>
      <div class="welcome-scene" aria-label="Prévia de uma central de atendimento"><div class="scene-window"><div class="scene-heading"><span class="scene-dots">● ● ●</span><strong>Central de Suporte</strong><span class="live-label"><i></i> Pronto para começar</span></div><div class="scene-body"><div class="scene-nav"><div class="scene-nav-item selected">${icon('list_bar')} Chamados</div><div class="scene-nav-item">${icon('window')} Acesso remoto</div><div class="scene-customer">${avatar(tickets[0])}<div><strong>Lucas Almeida</strong><span>Precisa de ajuda</span></div><i></i></div><div class="scene-customer">${avatar(tickets[1])}<div><strong>Mariana Costa</strong><span>Um novo atendimento</span></div></div><div class="scene-customer">${avatar(tickets[5])}<div><strong>Gabriela Martins</strong><span>Vamos investigar?</span></div></div></div><div class="scene-chat"><span class="scene-date">Hoje · 08:00</span><div class="example-bubble">Bom dia! Preciso de ajuda com meu computador.</div><div class="example-bubble technician">Bom dia. Pode me contar o que aconteceu?</div><div class="scene-typing"><i></i><i></i><i></i></div><div class="scene-pc"><img src="./windows/assets/icons/explorer.png" alt=""><div><strong>Investigue na prática</strong><span>O Windows é seu espaço de trabalho.</span></div></div></div></div></div><div class="scene-note"><span>✓</span><div><strong>Conversar. Investigar. Resolver.</strong><small>Cada atendimento conta uma história.</small></div></div></div>
    </main><footer class="welcome-footer"><span>Uma experiência prática de informática.</span><button class="text-button" type="button" data-install>Instalar para usar offline</button><a href="./THIRD_PARTY_NOTICES.md" target="_blank" rel="noopener">Créditos</a></footer>
  </section>`;
  reflectPwa();
}

function shell() {
  $('#app').innerHTML = `<div class="desk">
    <aside class="sidebar"><a class="brand" href="./" aria-label="HelpDesk Simulator"><img src="./assets/icon.svg" alt=""><span>HelpDesk<span>Simulator</span></span></a><span class="sidebar-caption">ÁREA DE TRABALHO</span><nav aria-label="Navegação principal"><button type="button" data-view="overview">${icon('apps')}<span>Visão geral</span></button><button type="button" data-view="tickets">${icon('list_bar')}<span>Chamados</span><b id="nav-unread" hidden></b></button><button type="button" data-view="shift">${icon('timer')}<span>Expediente</span></button></nav><div class="sidebar-bottom"><div class="technician-card"><span class="technician-avatar">EU</span><div><strong>Técnico de suporte</strong><span><i></i> Disponível</span></div></div><div class="sidebar-tools"><button type="button" data-sound aria-label="Silenciar notificações">${icon('speaker_2')}</button><button type="button" data-fullscreen aria-label="Abrir em tela cheia">${icon('window')}</button><button type="button" data-reset aria-label="Reiniciar expediente">${icon('arrow_reset')}</button></div><span class="offline-state" data-offline></span><button class="text-button" type="button" data-install>Instalar aplicativo</button><a class="credits" href="./THIRD_PARTY_NOTICES.md" target="_blank" rel="noopener">Créditos e origem do Windows</a></div></aside>
    <main class="desk-main"><header class="desk-header"><div><span class="breadcrumb">CENTRAL DE SUPORTE TÉCNICO</span><h1 id="page-title">Chamados</h1></div><div class="shift-indicator"><span id="shift-dot"></span><div><small id="shift-label">EXPEDIENTE EM ANDAMENTO</small><strong id="shift-clock">08:00</strong></div></div><button class="quiet mobile-sound" type="button" data-sound aria-label="Silenciar notificações">${icon('speaker_2')}</button></header>
    <div id="stats" class="stats"></div><div id="workspace" class="workspace"><section id="ticket-list" class="ticket-list" aria-label="Chamados"><div class="list-top"><h2>Conversas <span id="ticket-total"></span></h2><label class="ticket-search">${icon('globe_search')}<input type="search" id="ticket-search" placeholder="Buscar cliente ou chamado" aria-label="Buscar chamados"></label><div class="list-filters" aria-label="Filtrar chamados"><button type="button" data-filter="all" class="selected">Todos</button><button type="button" data-filter="pending">Pendentes</button><button type="button" data-filter="resolved">Resolvidos</button></div></div><div id="ticket-rows" class="ticket-rows"></div><div class="queue-note">${icon('timer')}<span>Novos chamados chegam ao longo do expediente.</span></div></section>
    <section class="workarea" id="workarea"><section class="pc-panel" id="pc-panel" aria-label="Acesso remoto"><header class="pc-toolbar"><div>${icon('window')}<strong id="pc-owner"></strong><span class="connection-pill"><i></i> Conectado</span></div><div><button type="button" data-clients>${icon('list_bar')}<span>Clientes</span><b id="remote-unread" hidden></b></button><button type="button" data-remote-hide>Voltar ao chat</button></div></header><div id="remote-container" class="remote-container"></div><div class="pc-loading" id="pc-loading"><span class="spinner"></span>Preparando o computador…</div></section><section class="conversation" id="conversation" aria-label="Conversa com o cliente"><header id="chat-header" class="chat-header"></header><div class="remote-mobile-tabs"><button type="button" data-mobile-tab="pc">Computador</button><button type="button" data-mobile-tab="chat">Chat do cliente</button></div><div id="messages" class="messages" role="log" aria-label="Mensagens"></div><div id="reply-area" class="reply-area"></div></section></section></div>
    <section id="overview" class="overview" hidden></section><section id="shift-report" class="shift-report" hidden></section></main></div>`;
  remote = new RemoteSession(engine, $('#remote-container'), () => { $('#pc-loading').hidden = true; });
  $('#ticket-search').value = search;
}

function stats() {
  const all = Object.values(engine.state.tickets);
  const done = all.filter((t) => t.status === 'resolved').length;
  const working = all.filter((t) => !['new', 'waiting', 'resolved'].includes(t.status)).length;
  return [
    ['Recebidos', all.length, 'list_bar', 'neutral'], ['Em atendimento', working, 'window_wrench', 'orange'], ['Resolvidos', done, 'checkmark_circle', 'green'], ['Pendentes', all.length - done, 'timer', 'blue'],
  ].map(([label, count, name, color]) => `<article class="stat-card"><span class="stat-icon ${color}">${icon(name)}</span><div><span>${label}</span><strong>${count}<small>${label === 'Recebidos' || label === 'Resolvidos' ? ` / ${tickets.length}` : ''}</small></strong></div></article>`).join('');
}

function renderList() {
  const all = Object.values(engine.state.tickets);
  const visible = all.filter((t) => (listFilter === 'all' || (listFilter === 'resolved' ? t.status === 'resolved' : t.status !== 'resolved')) && `${byId[t.id].name} ${byId[t.id].title}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  $('#ticket-total').textContent = all.length;
  $('#ticket-rows').innerHTML = visible.map((t) => {
    const d = byId[t.id]; const last = t.messages.at(-1);
    return `<button type="button" data-ticket="${t.id}" class="ticket-row ${t.id === engine.state.selected ? 'selected' : ''} ${t.unread ? 'unread' : ''}" aria-label="${d.name}, ${d.title}, ${t.unread} mensagens não lidas, ${statusLabels[t.status]}" ${t.id === engine.state.selected ? 'aria-current="true"' : ''}>${avatar(d)}<div class="ticket-content"><div><strong>${d.name}</strong><time>${clock(last?.at || t.arrivedAt)}</time></div><span class="ticket-title">${d.title}</span><div class="ticket-last"><span>${escape(last?.text || '')}</span>${t.unread ? `<b class="unread-badge">${t.unread}</b>` : t.status === 'resolved' ? '<b class="resolved-check">✓</b>' : ''}</div>${badge(t)}</div></button>`;
  }).join('') || '<div class="list-empty">Nenhum chamado encontrado.</div>';
  const unread = all.reduce((sum, t) => sum + t.unread, 0);
  for (const selector of ['#nav-unread', '#remote-unread']) { const element = $(selector); element.hidden = !unread; element.textContent = unread; }
  document.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('selected', b.dataset.filter === listFilter));
}

function renderChat() {
  const ticket = engine.state.tickets[engine.state.selected];
  if (!ticket) return;
  const d = byId[ticket.id];
  const key = JSON.stringify([ticket.id, ticket.status, ticket.messages.length, ticket.typing, ticket.pending, ticket.solved, ticket.confirmed, ticket.remote]);
  if (key === currentChatKey) return;
  currentChatKey = key;
  const scroll = $('#messages'); const atBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 80;
  $('#chat-header').innerHTML = `<div class="chat-person">${avatar(d)}<div><h2>${d.name}</h2><span>${d.role} <i>·</i> ${badge(ticket)}</span></div></div><button class="connect-button" type="button" data-connect ${ticket.status === 'resolved' || ticket.remote.connecting || (ticket.remote.requested && !ticket.remote.authorized) ? 'disabled' : ''}>${icon('window')}<span>${ticket.remote.connecting || (ticket.remote.authorized ? 'Conectar ao computador' : ticket.remote.requested ? 'Solicitando acesso…' : 'Conectar ao computador')}</span></button>`;
  const profileLink = document.createElement('button'); profileLink.type = 'button'; profileLink.className = 'profile-link'; profileLink.dataset.profile = d.id; profileLink.textContent = 'Perfil e créditos da foto';
  $('#chat-header .chat-person > div').append(profileLink);
  $('#messages').innerHTML = `<div class="conversation-start"><span>CHAMADO #${String(d.order).padStart(3, '0')}</span><h3>${d.title}</h3><p>Converse com ${d.name.split(' ')[0]} para entender o que aconteceu.</p></div>${ticket.messages.map((m) => `<article class="message message-${m.role}">${m.role === 'customer' ? avatar(d, 'small') : ''}<div class="message-body"><span class="message-author">${m.role === 'customer' ? d.name.split(' ')[0] : 'Você'}</span><div class="bubble"><p>${escape(m.text)}</p>${m.image ? `<button type="button" class="message-image" data-image="${m.image}" data-caption="${escape(m.text)}"><img src="./${m.image}" alt="Print enviado por ${d.name}"><span>Ampliar imagem ↗</span></button>` : ''}</div><time>${clock(m.at)}</time></div></article>`).join('')}${ticket.typing ? `<div class="typing">${avatar(d, 'small')}<div><span>${d.name.split(' ')[0]} está digitando</span><i></i><i></i><i></i></div></div>` : ''}`;
  const options = engine.options(ticket.id);
  $('#reply-area').innerHTML = ticket.status === 'resolved' ? `<div class="resolved-panel">${icon('checkmark_circle')}<strong>Chamado resolvido</strong><span>O cliente confirmou a correção. Bom trabalho!</span><button type="button" class="text-button" data-view="shift">Ver resumo do expediente →</button></div>` : `${ticket.remote.authorized ? `<div class="remote-code">${icon('shield_checkmark')}<span>Acesso autorizado <strong>${ticket.remote.code}</strong></span>${ticket.remote.connected ? '<b>Sessão disponível</b>' : ''}</div>` : ''}<div class="reply-heading"><span>${ticket.typing || ticket.pending ? 'Aguardando resposta do cliente…' : ticket.confirmed ? 'ATENDIMENTO CONCLUÍDO' : 'SUA PRÓXIMA RESPOSTA'}</span>${ticket.solved && !ticket.confirmed ? '<b>Correção disponível para teste</b>' : ''}</div><div class="reply-options">${options.map((o) => `<button type="button" data-reply="${o.id}" class="reply-option reply-${o.kind}" ${o.disabled ? 'disabled title="Disponível após a correção no computador"' : ''}>${o.kind === 'remote' ? icon('window') : o.kind === 'verify' || o.kind === 'close' ? icon('checkmark_circle') : '<span class="reply-arrow">↗</span>'}<span>${escape(o.label)}</span></button>`).join('')}</div>${!options.length ? '<div class="reply-wait"><i></i><span>Você pode atender outro chamado enquanto espera.</span></div>' : ''}`;
  if (atBottom || ticket.typing || ticket.messages.at(-1)?.role === 'technician') scroll.scrollTop = scroll.scrollHeight;
}

function overview() {
  const all = Object.values(engine.state.tickets);
  $('#overview').innerHTML = `<div class="overview-heading"><div><span class="eyebrow">SEU EXPEDIENTE, DE PERTO</span><h2>Uma conversa de cada vez.</h2><p>Acompanhe os atendimentos e continue de onde parou.</p></div><button type="button" class="primary" data-view="tickets">Atender chamados ${icon('arrow_right')}</button></div><div class="overview-columns">${[['Aguardando', all.filter((t) => ['new', 'waiting'].includes(t.status)), 'blue'], ['Em atendimento', all.filter((t) => ['service', 'remote', 'customer'].includes(t.status)), 'orange'], ['Resolvidos', all.filter((t) => t.status === 'resolved'), 'green']].map(([label, rows, color]) => `<section class="overview-group"><h3><i class="${color}"></i>${label}<b>${rows.length}</b></h3>${rows.map((t) => `<button type="button" data-ticket="${t.id}" class="overview-ticket">${avatar(byId[t.id])}<div><strong>${byId[t.id].name}</strong><span>${byId[t.id].title}</span>${badge(t)}</div>${t.unread ? `<b class="unread-badge">${t.unread}</b>` : ''}</button>`).join('') || '<p class="column-empty">Nenhum chamado nesta etapa.</p>'}</section>`).join('')}</div>`;
}

function report() {
  const all = Object.values(engine.state.tickets);
  const resolved = all.filter((t) => t.status === 'resolved');
  const questions = all.reduce((sum, t) => sum + t.asked.length, 0);
  const accesses = all.reduce((sum, t) => sum + t.remote.accesses, 0);
  const average = resolved.length ? resolved.reduce((sum, t) => sum + t.closedAt - t.openedAt, 0) / resolved.length : 0;
  $('#shift-report').innerHTML = `<div class="report-heading"><span class="report-symbol">${icon(engine.state.phase === 'finished' ? 'trophy' : 'timer')}</span><div><span class="eyebrow">${engine.state.phase === 'finished' ? 'EXPEDIENTE FINALIZADO' : 'SEU PROGRESSO'}</span><h2>${engine.state.phase === 'finished' ? 'Quinze atendimentos. Trabalho concluído.' : 'Cada solução faz a diferença.'}</h2><p>${engine.state.phase === 'finished' ? 'Todos os clientes confirmaram que suas solicitações foram resolvidas.' : 'Converse, investigue e confirme com o cliente antes de encerrar cada chamado.'}</p></div></div><div class="report-metrics"><article><strong>${resolved.length}<small>/${tickets.length}</small></strong><span>Chamados resolvidos</span></article><article><strong>${minutes(engine.state.elapsedMs)}<small> min</small></strong><span>Tempo de atividade</span></article><article><strong>${questions}</strong><span>Perguntas realizadas</span></article><article><strong>${accesses}</strong><span>Acessos remotos</span></article><article><strong>${average ? minutes(average) : '—'}<small>${average ? ' min' : ''}</small></strong><span>Tempo médio por chamado</span></article></div><div class="report-table"><h3>Resumo dos atendimentos</h3>${all.map((t) => `<button type="button" data-ticket="${t.id}"><span>${t.status === 'resolved' ? '✓' : '○'}</span>${avatar(byId[t.id])}<div><strong>${byId[t.id].name}</strong><small>${byId[t.id].title}</small></div>${badge(t)}</button>`).join('')}<p class="report-note">${tickets.length - all.length ? `Ainda chegarão ${tickets.length - all.length} chamados durante o expediente.` : 'Todos os chamados previstos já chegaram.'} Perguntar faz parte da investigação.</p></div><div class="report-actions"><button type="button" class="primary" data-view="tickets">${engine.state.phase === 'finished' ? 'Ver conversas' : 'Continuar atendimento'}</button><button type="button" class="quiet" data-reset>Reiniciar expediente</button></div>`;
}

function reflectPwa() {
  document.querySelectorAll('[data-offline]').forEach((e) => { e.textContent = pwaState.text; });
  document.querySelectorAll('[data-install]').forEach((e) => { e.textContent = pwaState.update ? 'Atualização disponível' : 'Instalar para usar offline'; });
}

function render() {
  if (engine.state.phase === 'intro') { if (!$('.welcome')) intro(); return; }
  if (!$('.desk')) shell();
  const ticket = engine.state.tickets[engine.state.selected];
  $('.desk').classList.toggle('remote-layout', view === 'tickets' && remoteVisible);
  $('#workspace').hidden = view !== 'tickets'; $('#overview').hidden = view !== 'overview'; $('#shift-report').hidden = view !== 'shift';
  $('#page-title').textContent = view === 'tickets' ? 'Chamados' : view === 'overview' ? 'Visão geral' : 'Expediente';
  $('#shift-clock').textContent = clock(engine.state.elapsedMs);
  $('#shift-label').textContent = engine.state.phase === 'finished' ? 'EXPEDIENTE FINALIZADO' : document.hidden ? 'EXPEDIENTE PAUSADO' : 'EXPEDIENTE EM ANDAMENTO';
  $('#stats').innerHTML = stats();
  document.querySelectorAll('[data-view]').forEach((e) => { e.classList.toggle('active', e.dataset.view === view); if (e.closest('nav')) e.setAttribute('aria-current', e.dataset.view === view ? 'page' : 'false'); });
  $('#workarea').classList.toggle('has-remote', view === 'tickets' && remoteVisible && Boolean(ticket?.remote.connected));
  $('#pc-panel').hidden = !remoteVisible || !ticket?.remote.connected;
  document.querySelectorAll('[data-sound]').forEach((b) => { b.setAttribute('aria-label', engine.state.muted ? 'Ativar notificações sonoras' : 'Silenciar notificações'); b.classList.toggle('muted', engine.state.muted); });
  renderList();
  if (view === 'tickets') {
    const chatHidden = remoteVisible && matchMedia('(max-width: 800px)').matches && $('#workarea').dataset.mobileTab !== 'chat';
    engine.setReading(document.hidden || chatHidden ? null : engine.state.selected);
    if (remoteVisible && ticket?.remote.connected) { $('#pc-owner').textContent = byId[ticket.id].name; remote.show(ticket.id); $('#pc-loading').hidden = remote.ready; }
    renderChat();
  } else { engine.setReading(null); if (view === 'overview') overview(); else report(); }
  reflectPwa();
}

engine.subscribe((event) => {
  if (event.type === 'notification') return;
  if (event.type === 'connected') { if (engine.state.selected === event.ticketId) { remoteVisible = true; view = 'tickets'; } }
  if (event.type === 'closed') { remote?.detach(); remoteVisible = false; if (engine.state.phase === 'finished') view = 'shift'; }
  if (event.type === 'tick') { $('#shift-clock') && ($('#shift-clock').textContent = clock(engine.state.elapsedMs)); }
  if (event.persistence === false && storage && !persistenceWarning) { persistenceWarning = true; pwaState.text = 'Armazenamento cheio: mantenha esta aba aberta'; }
  render();
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.matches('[data-start]')) { notification.activateSound(); lastNow = performance.now(); engine.start(); }
  if (button.dataset.view) { remote?.flush(); view = button.dataset.view; currentChatKey = null; render(); }
  if (button.dataset.ticket) select(button.dataset.ticket);
  if (button.dataset.filter) { listFilter = button.dataset.filter; renderList(); }
  if (button.dataset.reply) { remote?.flush(); engine.reply(engine.state.selected, button.dataset.reply); }
  if (button.matches('[data-connect]')) { const t = engine.state.tickets[engine.state.selected]; notification.activateSound(); if (t?.remote.authorized) engine.connect(t.id); else if (t) engine.requestRemote(t.id); }
  if (button.matches('[data-sound]')) { engine.mute(); notification.activateSound(); }
  if (button.matches('[data-fullscreen]')) { if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.().catch(() => {}); else await document.exitFullscreen?.(); }
  if (button.matches('[data-remote-hide]')) { remote?.flush(); remoteVisible = false; render(); }
  if (button.matches('[data-clients]')) { remote?.flush(); remoteVisible = false; render(); $('#ticket-search')?.focus(); }
  if (button.matches('[data-mobile-tab]')) { $('#workarea').dataset.mobileTab = button.dataset.mobileTab; render(); }
  if (button.matches('[data-reset]')) $('#reset-dialog').showModal();
  if (button.matches('[data-reset-cancel]')) $('#reset-dialog').close();
  if (button.matches('[data-reset-confirm]')) { $('#reset-dialog').close(); remote?.detach(); remote = null; currentChatKey = null; remoteVisible = false; view = 'tickets'; $('#app').replaceChildren(); engine.reset(); lastNow = performance.now(); render(); }
  if (button.dataset.image) { const dialog = $('#image-dialog'); dialog.querySelector('img').src = './' + button.dataset.image; dialog.querySelector('p').textContent = button.dataset.caption; dialog.showModal(); }
  if (button.matches('[data-close-image]')) $('#image-dialog').close();
  if (button.dataset.profile) {
    const definition = byId[button.dataset.profile]; const photo = definition.photo;
    $('#profile-dialog [data-profile-content]').innerHTML = `<img class="profile-photo" src="./${definition.avatar}" alt="Foto ilustrativa do perfil"><h2>${definition.name}</h2><p>${definition.role} · personagem fictício</p><div class="profile-credit"><strong>Créditos da fotografia</strong><p>Foto de <a href="${photo.source}" target="_blank" rel="noopener">${escape(photo.author)}</a> no <a href="${photo.source}" target="_blank" rel="noopener">Unsplash</a>.</p><a href="${photo.license}" target="_blank" rel="noopener">Licença da fotografia ↗</a><small>A foto ilustra um personagem fictício. A pessoa retratada não participa deste atendimento.</small></div>`;
    $('#profile-dialog').showModal();
  }
  if (button.matches('[data-close-profile]')) $('#profile-dialog').close();
  if (button.matches('[data-install]')) { if (pwaState.update) { remote?.flush(); engine.persist(); pwa.update(); } else await pwa.install(); }
});
document.addEventListener('input', (event) => { if (event.target.id === 'ticket-search') { search = event.target.value; renderList(); } });
document.addEventListener('visibilitychange', () => { remote?.flush(); remote?.pause(document.hidden); engine.persist(); lastNow = performance.now(); engine.setReading(document.hidden ? null : view === 'tickets' ? engine.state.selected : null); render(); });
window.addEventListener('pagehide', () => { remote?.flush(); engine.persist(); });
setInterval(() => {
  const now = performance.now(); const elapsed = now - lastNow; lastNow = now;
  if (!document.hidden) engine.advance(elapsed);
}, 500);

render();
const pwa = preparePwa((state) => { pwaState = { ...pwaState, ...state }; reflectPwa(); });
