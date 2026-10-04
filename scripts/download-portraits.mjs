import fs from 'node:fs';
import { portraits } from '../js/helpdesk/portraits.mjs';
fs.mkdirSync('assets/avatars', { recursive: true });
for (const [id, photo] of Object.entries(portraits)) {
  if (process.argv.length > 2 && !process.argv.slice(2).includes(id)) continue;
  const redirect = await fetch(`https://unsplash.com/photos/${photo.photoId}/download?force=true`, { method: 'HEAD' });
  if (!redirect.ok || !redirect.url.startsWith('https://images.unsplash.com/')) throw new Error(`Foto indisponível: ${id} (${redirect.status})`);
  const url = new URL(redirect.url); url.searchParams.delete('dl'); url.searchParams.set('w', '480'); url.searchParams.set('q', '85'); url.searchParams.set('fm', 'jpg');
  const image = await fetch(url);
  if (!image.ok || !image.headers.get('content-type')?.includes('image/')) throw new Error(`Imagem indisponível: ${id}`);
  fs.writeFileSync(photo.path, new Uint8Array(await image.arrayBuffer()));
  console.log(`OK foto local de ${id}: ${photo.author} / Unsplash`);
}
