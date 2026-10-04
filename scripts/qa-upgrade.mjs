import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { launchBrowser } from './browser-tools.mjs';

// Serve the last release first, then offer the current one on the same origin.
const legacy = new Map();
for (const file of ['index.html', 'service-worker.js', 'precache-manifest.json', 'css/helpdesk.css', ...fs.readdirSync('js/helpdesk').map((name) => 'js/helpdesk/' + name), ...['lucas', 'mariana', 'rafael', 'ana', 'carlos', 'gabriela', 'pedro', 'juliana', 'bruno', 'fernanda'].map((id) => `assets/avatars/${id}.svg`)]) {
  const result = spawnSync('git', ['show', `77cb684:${file}`]); if (!result.status) legacy.set(file, result.stdout);
}
if (!legacy.has('index.html')) throw new Error('A verificação de atualização exige o commit 77cb684 no histórico Git.');
let latest = false;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html';
  const resolved = path.resolve(file);
  if (!resolved.startsWith(process.cwd() + path.sep)) { res.writeHead(403); res.end(); return; }
  const body = !latest && legacy.has(file) ? legacy.get(file) : fs.existsSync(resolved) && fs.statSync(resolved).isFile() ? fs.readFileSync(resolved) : null;
  if (!body) console.log('RECURSO AUSENTE', file);
  res.writeHead(body ? 200 : 404, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(body);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await launchBrowser();
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage(); const errors = []; page.on('pageerror', (e) => { errors.push(e.message); console.log('ERRO', e.message); }); page.on('console', (m) => { if (m.type() === 'error') console.log(m.text()); });
  await page.goto(url); await page.waitForFunction(() => navigator.serviceWorker.controller && [...document.querySelectorAll('[data-offline]')].some((e) => e.textContent.includes('Disponível offline')), null, { timeout: 60000 });
  await page.locator('[data-start]').click();
  const fixture = await page.evaluate(() => {
    const e = HelpDesk.engine; e.advance(e.state.schedule.at(-1).at);
    const saved = e.snapshot();
    for (const [id, ticket] of Object.entries(saved.tickets)) if (id !== 'lucas') { ticket.status = 'resolved'; ticket.confirmed = true; ticket.closedAt = saved.elapsedMs; }
    saved.selected = 'lucas'; saved.tickets.lucas.remote = { requested: true, authorized: true, connected: true, connecting: null, code: '111 222', accesses: 1 };
    return saved;
  });
  await page.addInitScript((saved) => { if (!localStorage.getItem('qa-fixture-applied')) { localStorage.setItem('helpdesk.simulator.shift.v1', JSON.stringify(saved)); localStorage.setItem('qa-fixture-applied', 'true'); } }, fixture);
  await page.reload(); await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.OSLab?.remote?.clientId === 'lucas');
  const pc = page.frames().find((frame) => frame.url().includes('/windows/index.html'));
  await pc.locator('#desktop-icons [data-app="settings"]').click(); await pc.locator('[data-settings-page="network"]').first().click();
  await pc.locator('[data-network-action="wifi"]').click(); await pc.locator('[data-network-action="ethernet-mode"]').click(); await pc.locator('[data-network-action="cable"]').click();
  await page.waitForFunction(() => HelpDesk.engine.state.tickets.lucas.pc?.network.internetAvailable);
  assert.ok(await page.locator('[data-reply="verify"]').isDisabled(), 'a versão anterior reproduz a falha com Ethernet');
  latest = true;
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting), null, { timeout: 60000 });
  await page.reload(); await page.locator('[data-remote-hide]').click(); await page.locator('[data-install]').filter({ hasText: 'Atualização disponível' }).click();
  await page.waitForFunction(() => window.HelpDesk?.engine.state.schedule.length === 15);
  assert.equal(await page.evaluate(() => Object.values(HelpDesk.engine.state.tickets).filter((t) => t.status === 'resolved').length), 9);
  await page.locator('[data-reply="verify"]').click(); await page.evaluate(() => HelpDesk.engine.advance(5000)); await page.locator('[data-reply="close"]').click();
  assert.equal(await page.evaluate(() => HelpDesk.engine.state.tickets.lucas.status), 'resolved');
  await page.evaluate(() => HelpDesk.engine.advance(HelpDesk.engine.state.schedule.at(-1).at - HelpDesk.engine.state.elapsedMs + 1));
  assert.equal(await page.evaluate(() => Object.keys(HelpDesk.engine.state.tickets).length), 15);
  await context.setOffline(true); await page.reload(); await page.waitForFunction(() => window.HelpDesk?.engine.state.schedule.length === 15);
  assert.equal(await page.evaluate(() => Object.values(HelpDesk.engine.state.tickets).filter((t) => t.status === 'resolved').length), 10);
  assert.deepEqual(errors, []);
  fs.writeFileSync('qa-evidence/upgrade.json', JSON.stringify({ previousRelease: '77cb684', preservedResolved: 9, ethernetResolvedAfterUpgrade: true, newTickets: 5, offlineReload: true, errors }, null, 2));
  console.log('OK atualização v2 → v3: nove atendimentos preservados, Ethernet corrigida, cinco chegadas novas e recarregamento offline.');
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
