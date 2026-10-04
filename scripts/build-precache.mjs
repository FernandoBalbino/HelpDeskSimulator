import fs from 'node:fs';
import path from 'node:path';
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name).replaceAll('\\', '/')]); }
const runtime = files('windows').filter((file) => !file.startsWith('windows/tests/') && !file.endsWith('.helpdesk-adapted') && !['windows/README.md','windows/service-worker.js','windows/manifest.webmanifest','windows/precache-manifest.json'].includes(file));
const local = [...files('js'), ...files('css'), ...files('assets')];
const manifest = ['./', ...['index.html','offline.html','manifest.webmanifest','THIRD_PARTY_NOTICES.md', ...local, ...runtime].map((file) => './' + file)];
fs.writeFileSync('precache-manifest.json', JSON.stringify([...new Set(manifest)].sort(), null, 2) + '\n');
console.log(`${manifest.length} recursos no precache.`);
