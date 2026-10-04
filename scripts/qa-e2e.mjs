import fs from 'node:fs';
import assert from 'node:assert/strict';
import { launchBrowser } from './browser-tools.mjs';
const url = process.env.QA_URL || 'http://127.0.0.1:4173/';
const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
fs.mkdirSync('qa-evidence', { recursive: true });
fs.mkdirSync('assets/screenshots', { recursive: true });
const advance = (ms) => page.evaluate((value) => window.HelpDesk.engine.advance(value), ms);
const state = () => page.evaluate(() => window.HelpDesk.engine.snapshot());
const frame = () => page.frames().find((item) => item.url().includes('/windows/index.html'));
async function ready(id) {
  await page.waitForFunction((client) => document.querySelector('iframe')?.contentWindow?.OSLab?.remote?.clientId === client, id);
  return frame();
}
async function select(id) {
  if (!(await page.locator(`[data-ticket="${id}"]`).isVisible())) await page.locator('[data-clients]').click();
  await page.locator(`[data-ticket="${id}"]`).click();
}
async function connect(id, ask = false) {
  await select(id);
  if (ask) {
    const options = page.locator('[data-reply]').filter({ hasNot: page.locator('[disabled]') });
    await options.first().click(); await advance(5500);
  }
  await page.locator('[data-connect]').click(); await advance(5500);
  await page.locator('[data-connect]').click(); await advance(2500);
  const pc = await ready(id);
  assert.equal(await pc.locator('#desktop').isVisible(), true);
  return pc;
}
async function app(pc, id) { await pc.locator(`#desktop-icons [data-app="${id}"]`).click(); }
async function settings(pc, tab) {
  await app(pc, 'settings'); await pc.locator(`[data-settings-page="${tab}"]`).first().click();
}
async function explorer(pc, folder) {
  await app(pc, 'explorer'); await pc.locator(`[data-folder="root-${folder}"]`).first().click();
}
async function closeTicket(id) {
  await page.waitForFunction((client) => window.HelpDesk.engine.state.tickets[client].solved, id);
  await page.locator('[data-reply="verify"]').click(); await advance(5000);
  await page.locator('[data-reply="close"]').click();
  assert.equal((await state()).tickets[id].status, 'resolved');
  console.log(`OK atendimento pela interface: ${id}`);
}
async function capture(pc, name) {
  if (!process.env.QA_URL) await pc.locator('#desktop').screenshot({ path: `assets/screenshots/${name}.png` });
}
async function viewport(width, height, name) {
  await page.setViewportSize({ width, height });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false, `overflow em ${width}×${height}`);
  await page.screenshot({ path: `qa-evidence/${name}.png`, fullPage: true });
}
try {
  await page.goto(url); await page.locator('[data-start]').waitFor();
  await viewport(1366, 768, 'welcome-1366');
  await page.locator('[data-start]').click();
  // Lucas: arrival during remote access; no question is required for immediate access.
  let pc = await connect('lucas');
  await settings(pc, 'network'); await capture(pc, 'network');
  await viewport(1366, 768, 'remote-1366');
  assert.ok(await page.locator('#conversation').evaluate((el) => el.getBoundingClientRect().width) >= 300);
  await advance(110000); assert.ok((await state()).tickets.mariana?.unread > 0);
  await pc.locator('[data-network-action="wifi"]').click();
  await pc.locator('[data-network-connect="Escola_WiFi"]').click();
  await page.waitForFunction(() => window.HelpDesk.engine.state.tickets.lucas.solved);
  await page.locator('[data-reply="verify"]').click(); await advance(5000);
  await pc.locator('[data-network-action="wifi"]').click();
  await page.waitForFunction(() => !window.HelpDesk.engine.state.tickets.lucas.confirmed);
  assert.equal(await page.locator('[data-reply="close"]').count(), 0);
  await pc.locator('[data-network-action="wifi"]').click(); await pc.locator('[data-network-connect="Escola_WiFi"]').click();
  await viewport(1920, 1080, 'remote-1920'); await viewport(800, 600, 'remote-small');
  await page.locator('[data-mobile-tab="chat"]').click(); assert.ok(await page.locator('#messages').isVisible());
  await page.locator('[data-mobile-tab="pc"]').click(); assert.ok(await pc.locator('#desktop').isVisible());
  await page.locator('[data-mobile-tab="chat"]').click(); await page.setViewportSize({ width: 1366, height: 768 });
  await closeTicket('lucas');
  // The remaining arrivals use the same saved schedule and controlled active clock.
  await advance(1000000);
  // Download runs while attending a different PC, then installer restores mid-progress.
  pc = await connect('mariana', true);
  await app(pc, 'google');
  await pc.locator('[data-google-search] input').fill('AppJavaFX'); await pc.locator('[data-google-search] input').press('Enter');
  await pc.locator('[data-install-site="appjavafx"]').click();
  await pc.locator('[data-download-start="appjavafx"]').click();
  await select('rafael'); await advance(65000);
  await page.reload(); await page.locator('[data-ticket="mariana"]').waitFor();
  await select('mariana'); pc = await ready('mariana');
  await pc.locator('[data-open-download="appjavafx"]').click();
  for (let n = 0; n < 3; n++) await pc.locator('[data-installer-action="next"]').click();
  await pc.locator('[data-installer-action="install"]').click(); await advance(2000);
  await select('rafael'); await advance(5000); await select('mariana'); pc = await ready('mariana');
  await pc.locator('[data-installer-action="finish"]').waitFor();
  await pc.locator('[data-installer-launch]').check(); await pc.locator('[data-installer-action="finish"]').click();
  await closeTicket('mariana');
  pc = await connect('rafael', true); await settings(pc, 'apps');
  await pc.locator('[data-settings-page="installed-apps"]').click(); await capture(pc, 'apps');
  await pc.locator('[data-uninstall-program="appjavafx"]').click();
  await pc.locator('[data-modal-result="true"]').click(); await closeTicket('rafael');
  pc = await connect('ana', true); await explorer(pc, 'documents');
  await pc.locator('[data-file-action="new-folder"]').click();
  await pc.locator('.file-rename-input').fill('Documentos da Escola'); await pc.locator('.file-rename-input').press('Enter');
  await closeTicket('ana');
  pc = await connect('carlos'); await app(pc, 'google');
  await pc.locator('[name="address"]').fill('hardware.oslab.local'); await pc.locator('[name="address"]').press('Enter');
  await pc.locator('[data-browser-favorite]').click();
  const save = pc.locator('[data-browser-bookmark-form] button[type="submit"]'); if (await save.count()) await save.click();
  await pc.locator('.app-window [data-window-action="close"]').click(); await app(pc, 'google');
  await select('gabriela'); await select('carlos'); pc = await ready('carlos');
  assert.ok(Object.values((await state()).tickets.carlos.pc.browsers).some((b) => b.favorites.length));
  await closeTicket('carlos');
  pc = await connect('gabriela', true); await pc.locator('#quick-settings-button').click(); await capture(pc, 'audio');
  await pc.locator('#mute-button').click();
  await pc.locator('#volume-slider').fill('45'); await closeTicket('gabriela');
  pc = await connect('pedro', true); await explorer(pc, 'downloads');
  await pc.locator('[data-explorer-search]').fill('trabalho-escola');
  await pc.locator('[data-file-item="pedro-work"]').click(); await pc.locator('[data-file-action="cut"]').click();
  await select('juliana'); await page.reload(); await select('pedro'); pc = await ready('pedro');
  await pc.locator('[data-folder="root-documents"]').first().click(); await pc.locator('[data-file-action="paste"]').click();
  await closeTicket('pedro');
  pc = await connect('juliana'); await explorer(pc, 'documents');
  await pc.locator('[data-file-item="juliana-materials"]').click(); await pc.locator('[data-file-action="shortcut"]').click();
  await pc.locator('[data-window-action="close"]').click();
  await pc.locator('[data-desktop-item]').filter({ hasText: 'Materiais da Escola' }).dblclick();
  assert.equal(await pc.locator('[data-current-folder="juliana-materials"]').count(), 1);
  await closeTicket('juliana');
  pc = await connect('bruno', true); await app(pc, 'recycle');
  await pc.locator('[data-recycle-item="bruno-report"]').click(); await pc.locator('[data-recycle-action="restore"]').click(); await closeTicket('bruno');
  pc = await connect('fernanda'); await settings(pc, 'system'); await pc.locator('[data-settings-page="storage"]').click(); await capture(pc, 'storage');
  await pc.locator('[data-window-action="close"]').click(); await explorer(pc, 'downloads');
  for (const id of ['fernanda-cache', 'fernanda-video']) { await pc.locator(`[data-file-item="${id}"]`).click(); await pc.locator('[data-file-action="delete"]').click(); }
  assert.equal((await state()).tickets.fernanda.solved, false, 'Lixeira ainda ocupa espaço');
  await pc.locator('[data-window-action="close"]').click(); await app(pc, 'recycle');
  await pc.locator('[data-recycle-action="empty"]').click(); await pc.locator('[data-modal-result="true"]').click(); await closeTicket('fernanda');
  assert.equal((await state()).phase, 'finished');
  await page.reload(); assert.equal((await state()).phase, 'finished');
  await viewport(1920, 1080, 'summary-1920'); await viewport(1366, 768, 'summary-1366'); await viewport(800, 600, 'summary-small');
  assert.deepEqual(errors, []);
  const report = { url, completed: 10, consoleErrors: errors, activeTimeMs: (await state()).elapsedMs, viewports: ['1366×768', '1920×1080', '800×600'] };
  fs.writeFileSync('qa-evidence/e2e.json', JSON.stringify(report, null, 2));
  console.log('OK dez atendimentos, download em segundo plano, instalação retomada, favoritos, clipboard, atalhos e conclusão persistente.');
} catch (error) {
  await page.screenshot({ path: 'qa-evidence/failure.png', fullPage: true });
  console.log('ERROS DO NAVEGADOR', errors);
  throw error;
} finally { await browser.close(); }
