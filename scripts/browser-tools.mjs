import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import net from 'node:net';
let runtime;
if (process.env.PLAYWRIGHT_PATH) runtime = await import(pathToFileURL(process.env.PLAYWRIGHT_PATH));
else {
  try { runtime = await import('playwright'); }
  catch {
    const bundled = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
    if (!fs.existsSync(bundled)) throw new Error('Para a verificação visual, instale Playwright ou defina PLAYWRIGHT_PATH. Consulte o README.');
    runtime = await import(pathToFileURL(bundled));
  }
}
export async function launchBrowser(options = {}) {
  const systemChrome = process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : null;
  const executablePath = process.env.CHROME_PATH || (systemChrome && fs.existsSync(systemChrome) ? systemChrome : undefined);
  return runtime.chromium.launch({ executablePath, headless: true, ...options });
}
export async function launchNativeBrowser() {
  const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  if (!fs.existsSync(executablePath)) throw new Error('Defina CHROME_PATH para verificar a visibilidade nativa das abas.');
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port; await new Promise((resolve) => server.close(resolve));
  fs.mkdirSync('qa-evidence', { recursive: true });
  const profile = fs.mkdtempSync(path.resolve('qa-evidence/native-browser-'));
  const processHandle = spawn(executablePath, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-backgrounding-occluded-windows', '--window-position=-32000,-32000', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let connected;
  try {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) { try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) { connected = true; break; } } catch {} await new Promise((resolve) => setTimeout(resolve, 150)); }
    if (!connected) throw new Error('Chrome não disponibilizou a sessão de verificação.');
    // Skip Playwright's focus override in the existing, dedicated test profile.
    const browser = await runtime.chromium.connectOverCDP(`http://127.0.0.1:${port}`, { noDefaults: true });
    return { browser, async close() { const cdp = await browser.newBrowserCDPSession(); await cdp.send('Browser.close').catch(() => {}); await browser.close().catch(() => {}); processHandle.kill(); } };
  } catch (error) { processHandle.kill(); throw error; }
}
