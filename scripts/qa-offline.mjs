import fs from 'node:fs';
import assert from 'node:assert/strict';
import { launchNativeBrowser } from './browser-tools.mjs';
const url = process.env.QA_URL || 'http://127.0.0.1:4173/';
const native = await launchNativeBrowser();
const browser = native.browser;
const context = browser.contexts()[0];
const page = await context.newPage();
await page.setViewportSize({ width: 1366, height: 768 });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
fs.mkdirSync('qa-evidence', { recursive: true });
const advance = (ms) => page.evaluate((value) => window.HelpDesk.engine.advance(value), ms);
const frame = () => page.frames().find((p) => p.url().includes('/windows/index.html'));
async function select(id) {
  if (!(await page.locator(`[data-ticket="${id}"]`).isVisible())) await page.locator('[data-clients]').click();
  await page.locator(`[data-ticket="${id}"]`).click();
}
async function ready(id) { await page.waitForFunction((client) => document.querySelector('iframe')?.contentWindow?.OSLab?.remote?.clientId === client, id); return frame(); }
async function connect(id) {
  await select(id);
  await page.locator('[data-connect]').click(); await advance(5000);
  await page.locator('[data-connect]').click(); await advance(2500);
  return ready(id);
}
try {
  await page.goto(url);
  await page.waitForFunction(() => navigator.serviceWorker.controller && [...document.querySelectorAll('[data-offline]')].some((e) => e.textContent.includes('Disponível offline')), null, { timeout: 60000 });
  const caches = await page.evaluate(async () => ({ versions: await window.caches.keys(), registrations: (await navigator.serviceWorker.getRegistrations()).map((r) => r.scope), entries: (await (await window.caches.open('helpdesk-offline-v2')).keys()).length }));
  assert.ok(caches.entries >= 273); assert.equal(caches.registrations.length, 1);
  await page.locator('[data-start]').focus(); assert.equal(await page.locator('[data-start]').evaluate((e) => e.matches(':focus-visible')), true);
  await page.locator('[data-start]').press('Enter');
  await page.locator('[data-reply="symbol"]').click();
  // Ordinary answer and authorization may overlap; both remain in the saved queue.
  await page.locator('[data-connect]').click(); await advance(5000);
  await page.locator('[data-image]').click(); await page.locator('#image-dialog img').waitFor();
  assert.ok(await page.locator('#image-dialog img').evaluate((image) => image.complete && image.naturalWidth > 0));
  await page.locator('[data-close-image]').click();
  await page.locator('[data-connect]').click(); await advance(2500); await ready('lucas');
  // A real hidden tab pauses the parent clock, incoming events and the guest clock.
  const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront();
  await page.waitForFunction(() => document.hidden, null, { polling: 100, timeout: 5000 });
  const before = await page.evaluate(() => ({ time: window.HelpDesk.engine.state.elapsedMs, events: window.HelpDesk.engine.state.events.length, remote: document.querySelector('iframe').contentWindow.OSLab.runtimeNow() }));
  await page.waitForTimeout(1600);
  const hidden = await page.evaluate(() => ({ time: window.HelpDesk.engine.state.elapsedMs, events: window.HelpDesk.engine.state.events.length, remote: document.querySelector('iframe').contentWindow.OSLab.runtimeNow() }));
  assert.deepEqual(hidden, before); await page.bringToFront(); await page.waitForFunction(() => !document.hidden); await other.close();
  await advance(1000000);
  // Visit all ten desktops, then reload offline and restore every snapshot.
  const ids = ['lucas', 'mariana', 'rafael', 'ana', 'carlos', 'gabriela', 'pedro', 'juliana', 'bruno', 'fernanda'];
  for (const id of ids.slice(1)) await connect(id);
  const saved = await page.evaluate(() => window.HelpDesk.engine.snapshot());
  await context.setOffline(true); await page.reload(); await ready('fernanda');
  assert.equal((await page.evaluate(() => window.HelpDesk.engine.state.id)), saved.id);
  for (const id of ids) { await select(id); const pc = await ready(id); assert.ok(await pc.locator('#desktop').isVisible()); }
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 1);
  await page.screenshot({ path: 'qa-evidence/offline-1366.png', fullPage: true });
  // Closing a tab does not consume elapsed time while no host is running.
  const time = await page.evaluate(() => window.HelpDesk.engine.state.elapsedMs);
  await page.close(); await new Promise((resolve) => setTimeout(resolve, 1400));
  const resumed = await context.newPage(); await resumed.goto(url); await resumed.waitForFunction(() => window.HelpDesk?.engine);
  assert.ok((await resumed.evaluate(() => window.HelpDesk.engine.state.elapsedMs)) - time < 1000);
  assert.deepEqual(errors, []);
  fs.writeFileSync('qa-evidence/offline.json', JSON.stringify({ url, caches, pausedTab: true, closedTab: true, offlineComputers: 10, consoleErrors: errors }, null, 2));
  console.log('OK PWA: um Service Worker, precache completo, pausa real, retomada da aba fechada e dez computadores offline.');
} catch (error) {
  if (!page.isClosed()) await page.screenshot({ path: 'qa-evidence/offline-failure.png', fullPage: true });
  console.log('ERROS DO NAVEGADOR', errors); throw error;
} finally { await native.close(); }
