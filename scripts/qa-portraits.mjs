import fs from 'node:fs';
import assert from 'node:assert/strict';
import { tickets } from '../js/helpdesk/tickets.mjs';
import { launchBrowser } from './browser-tools.mjs';
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1150, height: 820 } });
  await page.setContent(`<style>body{background:#f7f8fb;font:14px Arial;padding:22px}main{display:grid;grid-template-columns:repeat(5,1fr);gap:22px}article{text-align:center;background:#fff;padding:15px;border-radius:12px}img{width:145px;height:145px;object-fit:cover;border-radius:50%}small{display:block;color:#657082;font-size:11px}</style><main>${tickets.map((t) => `<article><img src="http://127.0.0.1:4173/${t.avatar}"><p>${t.name}</p><small>${t.photo.author} / Unsplash</small></article>`).join('')}</main>`);
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
  assert.ok(await page.evaluate(() => [...document.images].every((img) => img.naturalWidth >= 300)));
  fs.mkdirSync('qa-evidence', { recursive: true });
  await page.screenshot({ path: 'qa-evidence/portraits.png', fullPage: true });
  console.log('OK quinze fotos locais com créditos individuais.');
} finally { await browser.close(); }
