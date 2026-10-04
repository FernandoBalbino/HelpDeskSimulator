import fs from 'node:fs';
import { launchBrowser } from './browser-tools.mjs';
const browser = await launchBrowser();
try {
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    const svg = fs.readFileSync('assets/icon.svg', 'utf8').replace('width="512" height="512"', `width="${size}" height="${size}"`);
    await page.setContent(`<style>body{margin:0;background:#f55821}svg{display:block}</style>${svg}`);
    await page.screenshot({ path: `assets/icon-${size}.png` });
    await page.close();
  }
} finally { await browser.close(); }
