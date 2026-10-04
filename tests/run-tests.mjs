import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createShift, statusLabels } from '../js/helpdesk/shift-engine.mjs';
import { tickets, byId } from '../js/helpdesk/tickets.mjs';
import { validatePc, GB } from '../js/helpdesk/validators.mjs';
import { STORAGE_KEY } from '../js/helpdesk/state-manager.mjs';
const results = [];
const test = (name, run) => { try { run(); results.push({ name, ok: true }); } catch (error) { results.push({ name, error }); } };
const memory = () => { const map = new Map(); return { getItem: (k) => map.get(k) || null, setItem: (k,v) => map.set(k,v), removeItem: (k) => map.delete(k), map }; };
const setup = () => { const store = memory(); const engine = createShift({ storage: store, random: () => .5 }); engine.start(); return { engine, store }; };
function pcFor(type) {
  const pc = { files: { items: [] }, software: { installedPrograms: { appjavafx: { installed: false, desktopShortcut: false, startMenuShortcut: false } }, openedPrograms: {}, downloads: {} }, browsers: {}, shell: { volume: 0, muted: true }, network: { wifiEnabled: false, internetAvailable: false }, runtime: { storageTotalBytes: 10 * GB, systemReservedBytes: 7 * GB } };
  const item = (id, parentId = 'root-documents', extra = {}) => ({ id, parentId, kind: 'file', name: 'Arquivo', sizeBytes: 100, ...extra });
  if (type === 'network') pc.network = { wifiEnabled: true, connectedSsid: 'Escola_WiFi', internetAvailable: true };
  if (type === 'install') { pc.software.installedPrograms.appjavafx.installed = true; pc.software.openedPrograms.appjavafx = 'opened'; pc.software.downloads.appjavafx = { status: 'completed' }; }
  if (type === 'folder') pc.files.items = [item('folder', 'root-documents', { name: 'Documentos da Escola', kind: 'folder' })];
  if (type === 'favorite') pc.browsers.google = { favorites: [{ url: 'hardware.oslab.local' }] };
  if (type === 'audio') pc.shell = { volume: 20, muted: false };
  if (type === 'find-file') pc.files.items = [item('pedro-work')];
  if (type === 'shortcut') pc.files.items = [item('juliana-materials', 'root-documents', { kind: 'folder' }), item('shortcut', 'root-desktop', { shortcutTargetId: 'juliana-materials' })];
  if (type === 'restore') pc.files.items = [item('bruno-report')];
  if (type === 'storage') pc.files.items = [item('fernanda-personal'), item('fernanda-planning')];
  if (type === 'rename') pc.files.items = [item('tiago-task', 'root-documents', { name: 'Atividade de Informática.docx' })];
  if (type === 'copy') pc.files.items = [item('beatriz-notice', 'root-documents', { name: 'Comunicado.pdf' }), item('notice-copy', 'root-desktop', { name: 'Comunicado.pdf', sourceId: 'beatriz-notice' })];
  if (type === 'pictures') pc.files.items = [item('diego-photo', 'root-pictures')];
  if (type === 'tabs') pc.browsers.google = { tabs: [{ url: 'hardware.oslab.local' }] };
  if (type === 'browser-install') { pc.software.installedPrograms.firefox = { installed: true }; pc.software.openedPrograms.firefox = 'opened'; pc.software.downloads.firefox = { status: 'completed' }; }
  return pc;
}

test('catálogo contém quinze clientes distintos e opções ramificadas válidas', () => {
  assert.equal(tickets.length, 15); assert.equal(new Set(tickets.map((t) => t.avatar)).size, 15);
  for (const t of tickets) { assert.ok(fs.existsSync(t.avatar)); assert.ok(t.seed && t.validation); for (const node of Object.values(t.conversation)) { assert.equal(node.options.length, 3); for (const o of node.options) assert.ok(t.conversation[o.next]); } }
  assert.notEqual(byId.lucas.conversation.start.options[0].next, byId.lucas.conversation.start.options[1].next);
});
test('introdução não inicia relógio nem entrega chamados', () => {
  const e = createShift(); e.advance(600000); assert.equal(e.state.phase, 'intro'); assert.equal(e.state.elapsedMs, 0); assert.equal(Object.keys(e.state.tickets).length, 0);
});
test('chegadas têm intervalos de 60–110 segundos e independem de resolver chamados', () => {
  const { engine: e } = setup(); assert.equal(Object.keys(e.state.tickets).length, 1);
  e.state.schedule.slice(1).forEach((s, i) => { const gap = s.at - e.state.schedule[i].at; assert.ok(gap >= 60000 && gap <= 110000); });
  e.advance(e.state.schedule.at(-1).at); assert.equal(Object.keys(e.state.tickets).length, 15); assert.equal(e.state.tickets.lucas.status, 'service');
});
test('mensagens não lidas acumulam em outro cliente e zeram ao abrir', () => {
  const { engine: e } = setup(); e.advance(85000); assert.equal(e.state.tickets.mariana.unread, 1); e.open('mariana'); assert.equal(e.state.tickets.mariana.unread, 0); e.open('lucas'); e.advance(540000); assert.ok(e.state.tickets.mariana.unread > 0); e.open('mariana'); assert.equal(e.state.tickets.mariana.unread, 0);
});
test('cliente digita e responde com atraso; cada pergunta segue sua ramificação', () => {
  const { engine: e } = setup(); assert.ok(e.reply('lucas', 'devices')); assert.equal(e.state.tickets.lucas.status, 'customer'); assert.equal(e.state.tickets.lucas.messages.length, 2); e.advance(850); assert.ok(e.state.tickets.lucas.typing); e.advance(2500); assert.equal(e.state.tickets.lucas.node, 'devices'); assert.ok(e.state.tickets.lucas.messages.at(-1).text.includes('celular')); assert.equal(e.options('lucas')[0].id, 'devices-detail');
});
test('solicitação remota é última alternativa e não exige pergunta prévia', () => {
  const { engine: e } = setup(); assert.equal(e.options('lucas').at(-1).kind, 'remote'); assert.ok(e.requestRemote('lucas')); e.advance(3000); assert.match(e.state.tickets.lucas.remote.code, /^\d{3} \d{3}$/); assert.equal(e.state.tickets.lucas.asked.length, 0);
});
test('códigos são únicos mesmo com gerador aleatório constante e sobrevivem à retomada', () => {
  const { engine: e, store } = setup(); e.advance(85000); e.requestRemote('lucas'); e.requestRemote('mariana'); e.advance(4000); assert.notEqual(e.state.tickets.lucas.remote.code, e.state.tickets.mariana.remote.code); assert.equal(createShift({ storage: store }).state.tickets.lucas.remote.code, e.state.tickets.lucas.remote.code);
});
test('autorização e resposta simultâneas mantêm a espera até ambas as mensagens chegarem', () => {
  const { engine: e } = setup();
  e.reply('lucas', 'devices'); e.requestRemote('lucas');
  e.advance(2900); assert.equal(e.state.tickets.lucas.remote.authorized, false); assert.ok(e.state.tickets.lucas.pending); assert.equal(e.options('lucas').length, 0);
  e.advance(1200); assert.ok(e.state.tickets.lucas.remote.authorized); assert.equal(e.state.tickets.lucas.pending, false); assert.equal(e.state.tickets.lucas.node, 'devices');
  assert.equal(e.state.tickets.lucas.messages.filter((m) => m.role === 'customer').length, 3);
});
test('conexão exige autorização e percorre etapas até sessão remota', () => {
  const { engine: e } = setup(); assert.equal(e.connect('lucas'), false); e.requestRemote('lucas'); e.advance(4000); e.connect('lucas'); assert.equal(e.state.tickets.lucas.remote.connecting, 'Conectando…'); e.advance(700); assert.equal(e.state.tickets.lucas.remote.connecting, 'Estabelecendo sessão…'); e.advance(1300); assert.equal(e.state.tickets.lucas.status, 'remote');
});
test('correções são isoladas e o snapshot não compartilha referências', () => {
  const { engine: e } = setup(); e.advance(85000); const pc = pcFor('network'); e.updatePc('lucas', pc); pc.network.wifiEnabled = false; assert.ok(e.state.tickets.lucas.pc.network.wifiEnabled); assert.equal(e.state.tickets.mariana.pc, null); e.open('mariana'); e.open('lucas'); assert.ok(e.state.tickets.lucas.solved);
});
test('persistência restaura mensagens, cronograma, eventos e PCs sem repetir chegadas', () => {
  const { engine: e, store } = setup(); e.reply('lucas','symbol'); e.advance(1000); e.updatePc('lucas',pcFor('network')); const saved = e.snapshot(); const resumed = createShift({ storage: store, random: () => .5 }); assert.deepEqual(resumed.snapshot(), saved); resumed.advance(3000); assert.equal(resumed.state.tickets.lucas.node, 'symbol'); assert.equal(resumed.state.tickets.lucas.messages.length, 3); assert.equal(Object.keys(resumed.state.tickets).length, 1);
});
test('todas as quinze regras aceitam os estados técnicos corretos', () => { for (const ticket of tickets) assert.ok(validatePc(ticket.validation, pcFor(ticket.validation)), ticket.id); });
test('internet aceita Ethernet funcional sem SSID, com Wi-Fi ligado ou desligado', () => {
  const pc = pcFor('network'); pc.network = { connectionType: 'ethernet', ethernetCableConnected: true, wifiEnabled: false, connectedSsid: null, internetAvailable: true };
  assert.ok(validatePc('network', pc)); pc.network.wifiEnabled = true; assert.ok(validatePc('network', pc));
  pc.network.ethernetCableConnected = false; assert.equal(validatePc('network', pc), false); pc.network.ethernetCableConnected = true; pc.network.internetAvailable = false; assert.equal(validatePc('network', pc), false);
});
test('novos atendimentos exigem os arquivos originais, as abas certas e abrir o Firefox', () => {
  const rename = pcFor('rename'); rename.files.items[0].name = 'Atividade de Informática'; assert.equal(validatePc('rename', rename), false);
  const copy = pcFor('copy'); copy.files.items[0].parentId = 'root-desktop'; assert.equal(validatePc('copy', copy), false);
  const picture = pcFor('pictures'); picture.files.items[0].id = 'copy'; assert.equal(validatePc('pictures', picture), false);
  const tabs = pcFor('tabs'); tabs.browsers.google.tabs.push({ url: 'youtube.com' }); assert.equal(validatePc('tabs', tabs), false);
  const firefox = pcFor('browser-install'); firefox.software.openedPrograms = {}; assert.equal(validatePc('browser-install', firefox), false);
});
test('cada perfil usa uma foto local com fotógrafo, origem e licença', () => {
  assert.equal(new Set(tickets.map((t) => t.photo.source)).size, 15);
  for (const ticket of tickets) { assert.match(ticket.avatar, /\.jpg$/); assert.ok(fs.statSync(ticket.avatar).size > 1000); assert.ok(ticket.photo.author); assert.match(ticket.photo.source, /^https:\/\/unsplash\.com\/photos\//); assert.equal(ticket.photo.license, 'https://unsplash.com/license'); }
});
test('migração preserva nove encerramentos, corrige Ethernet e agenda cinco chegadas uma vez', () => {
  const { engine: e, store } = setup(); e.advance(e.state.schedule.at(-1).at);
  const old = e.snapshot(); old.version = 1; old.schedule = old.schedule.slice(0, 10); old.events = old.events.filter((event) => byId[event.ticketId].order <= 10);
  for (const ticket of tickets.slice(10)) delete old.tickets[ticket.id];
  for (const ticket of tickets.slice(1, 10)) { old.tickets[ticket.id].status = 'resolved'; old.tickets[ticket.id].confirmed = true; }
  old.tickets.lucas.pc = pcFor('network'); old.tickets.lucas.pc.network = { connectionType: 'ethernet', ethernetCableConnected: true, connectedSsid: null, internetAvailable: true }; old.tickets.lucas.solved = false;
  store.setItem(STORAGE_KEY, JSON.stringify(old)); const resumed = createShift({ storage: store, random: () => .5 });
  assert.equal(Object.values(resumed.state.tickets).filter((t) => t.status === 'resolved').length, 9); assert.ok(resumed.state.tickets.lucas.solved);
  assert.deepEqual(resumed.state.schedule.slice(0, 10), old.schedule); assert.equal(resumed.state.schedule.length, 15); assert.deepEqual(resumed.state.tickets.lucas.pc, old.tickets.lucas.pc);
  assert.deepEqual(createShift({ storage: store }).state.schedule, resumed.state.schedule); assert.equal(resumed.state.events.filter((event) => event.type === 'arrival').length, 5);
});
test('expediente antigo concluído reabre somente para os cinco novos chamados', () => {
  const { engine: e, store } = setup(); e.advance(e.state.schedule.at(-1).at); const old = e.snapshot(); old.version = 1; old.phase = 'finished'; old.finishedAt = 'anterior'; old.schedule = old.schedule.slice(0, 10); old.events = [];
  for (const ticket of tickets.slice(10)) delete old.tickets[ticket.id]; for (const ticket of Object.values(old.tickets)) ticket.status = 'resolved';
  store.setItem(STORAGE_KEY, JSON.stringify(old)); const resumed = createShift({ storage: store, random: () => .5 }); assert.equal(resumed.state.phase, 'running'); assert.equal(resumed.state.finishedAt, null); assert.equal(resumed.state.schedule.length, 15); assert.equal(Object.values(resumed.state.tickets).filter((t) => t.status === 'resolved').length, 10);
});
test('ligar Wi-Fi sem conectar, instalar sem abrir e criar pasta no lugar errado não concluem', () => {
  const net = pcFor('network'); net.network.connectedSsid = null; assert.equal(validatePc('network', net), false);
  const install = pcFor('install'); install.software.openedPrograms = {}; assert.equal(validatePc('install', install), false);
  const folder = pcFor('folder'); folder.files.items[0].parentId = 'root-desktop'; assert.equal(validatePc('folder', folder), false);
});
test('mover cópia, restaurar em outra pasta ou criar atalho sem destino não concluem', () => {
  const lost = pcFor('find-file'); lost.files.items[0].id = 'copy'; assert.equal(validatePc('find-file', lost), false);
  const restored = pcFor('restore'); restored.files.items[0].parentId = 'root-downloads'; assert.equal(validatePc('restore', restored), false);
  const shortcut = pcFor('shortcut'); shortcut.files.items[1].shortcutTargetId = 'wrong'; assert.equal(validatePc('shortcut', shortcut), false);
});
test('Lixeira ocupa espaço e documentos pessoais precisam ser preservados', () => {
  const pc = pcFor('storage'); pc.files.items.push({ id: 'temp', kind: 'file', sizeBytes: 2*GB, trashedAt: 1 }); assert.equal(validatePc('storage',pc),false); pc.files.items.pop(); assert.ok(validatePc('storage',pc)); pc.files.items[0].trashedAt = 1; assert.equal(validatePc('storage',pc),false);
});
test('cliente não confirma antes da correção e fechamento exige confirmação', () => {
  const { engine: e } = setup(); assert.equal(e.verify('lucas'),false); assert.equal(e.close('lucas'),false); e.updatePc('lucas',pcFor('network')); assert.equal(e.close('lucas'),false); e.verify('lucas'); e.advance(4000); assert.ok(e.state.tickets.lucas.confirmed); assert.ok(e.close('lucas')); assert.equal(e.state.tickets.lucas.status,'resolved');
});
test('desfazer correção invalida confirmação, inclusive durante a resposta pendente', () => {
  const { engine: e } = setup(); e.updatePc('lucas',pcFor('network')); e.verify('lucas'); e.updatePc('lucas',null); e.advance(4000); assert.equal(e.state.tickets.lucas.confirmed,false); assert.ok(e.state.tickets.lucas.messages.at(-1).text.includes('continua')); assert.equal(e.close('lucas'),false);
});
test('expediente só termina após quinze confirmações e encerramentos', () => {
  const { engine: e } = setup(); e.advance(e.state.schedule.at(-1).at);
  for (const ticket of tickets) { e.open(ticket.id); e.updatePc(ticket.id,pcFor(ticket.validation)); e.verify(ticket.id); e.advance(4000); assert.ok(e.close(ticket.id)); }
  assert.equal(e.state.phase,'finished'); assert.equal(Object.values(e.state.tickets).filter((t) => t.status === 'resolved').length,15); const time=e.state.elapsedMs; e.advance(60000); assert.equal(e.state.elapsedMs,time);
});
test('reiniciar limpa apenas o próprio expediente e cria novo identificador', () => {
  const { engine: e, store } = setup(); store.setItem('oslab-state-v1','original'); const old=e.state.id; e.reset(); assert.equal(e.state.phase,'intro'); assert.equal(store.getItem('oslab-state-v1'),'original'); assert.notEqual(e.state.id,old); assert.ok(store.getItem(STORAGE_KEY));
});
test('persistência indisponível não impede o atendimento', () => {
  const e=createShift({ storage:{ getItem(){throw Error();}, setItem(){throw Error();}, removeItem(){throw Error();} } }); assert.ok(e.start()); assert.ok(e.requestRemote('lucas')); e.advance(4000); assert.ok(e.state.tickets.lucas.remote.authorized);
});
test('pausa mantém tempo, eventos e downloads; retomada não usa o tempo de ausência', () => {
  const { engine:e,store }=setup(); e.updatePc('lucas',{ software:{ downloads:{ appjavafx:{ status:'downloading', startedAt:e.state.elapsedMs, totalMb:80, progress:0 } } } }); const resumed=createShift({storage:store}); assert.equal(resumed.state.elapsedMs,0); assert.equal(resumed.state.tickets.lucas.pc.software.downloads.appjavafx.progress,0); resumed.advance(60000); assert.equal(resumed.state.tickets.lucas.pc.software.downloads.appjavafx.status,'completed');
});
test('seis status previstos estão disponíveis e código fonte passa na análise sintática', () => {
  assert.equal(Object.keys(statusLabels).length,6);
  function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap((e)=>e.isDirectory()?walk(path.join(dir,e.name)): /\.(mjs|js)$/.test(e.name)?[path.join(dir,e.name)]:[]); }
  for(const file of [...walk('js'),...walk('scripts'),'service-worker.js']) { const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'}); assert.equal(check.status,0,check.stderr); }
});
test('precache contém arquivos locais existentes e ambos os documentos de entrada', () => {
  const manifest=JSON.parse(fs.readFileSync('precache-manifest.json','utf8')); assert.ok(manifest.includes('./index.html')); assert.ok(manifest.includes('./windows/index.html')); for(const file of manifest) assert.ok(fs.existsSync(file),file);
});
results.forEach((r)=>console.log(`${r.ok?'OK':'FALHA'}  ${r.name}${r.error?'\n'+r.error.stack:''}`));
console.log(`\n${results.filter((r)=>r.ok).length}/${results.length} verificações da Central aprovadas.`);
const inherited=spawnSync(process.execPath,['windows/tests/run-tests.js'],{stdio:'inherit'});
if(results.some((r)=>!r.ok)||inherited.status) process.exitCode=1;
