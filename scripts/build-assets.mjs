import fs from 'node:fs';
import { tickets } from '../js/helpdesk/tickets.mjs';
fs.mkdirSync('assets/avatars', { recursive: true });
const skin = ['#d7986f','#e4b596','#bc7955','#f0c2a4','#a86f4a','#d7a07d','#e0b293','#cd9775','#c48b62','#efc1a3'];
const shirt = ['#46789b','#e0996a','#70629a','#c67c98','#388574','#b69b4c','#6083a9','#826699','#b67458','#438b82'];
const hair = ['#343339','#563d2e','#2e2b31','#4c342a','#2c2a26','#2b2931','#7c5034','#44292a','#37342f','#614031'];
const hairstyles = [
  '<path d="M32 45c-1-25 13-28 30-26 13 1 16 10 14 24-8-2-14-7-18-13-5 9-15 10-26 15"/>',
  '<path d="M24 78V47c-2-27 8-34 27-34 22 0 31 13 28 36l2 29-14-2-4-36-23-8-8 43Z"/>',
  '<path d="M30 45c-3-23 11-32 26-29 16-1 23 14 19 31L61 31l-15 5-12 8Z"/>',
  '<path d="M22 82c-5-36 0-64 28-66 29-1 34 23 32 64l-15-2-3-38-25-8-6 46Z"/>',
  '<path d="M31 44c-5-13 2-25 14-28 17-5 34 6 31 26L65 29l-29 9Z"/>',
  '<path d="M22 82V48c0-24 11-31 28-32 22 0 31 11 29 37l4 29-16-8-2-36-29-5-3 46Z"/>',
  '<path d="M31 45c-5-20 9-29 27-29 20 1 21 16 18 28l-16-16-14 6Z"/>',
  '<path d="M23 76c-6-39 4-60 30-60s31 27 26 62l-13-4-2-40-21-4-11 48Z"/>',
  '<path d="M30 43c0-18 9-26 22-26 19-1 27 13 23 30L61 33l-18 1Z"/>',
  '<path d="M23 77c-3-41 1-58 28-61 25-2 34 22 28 63l-13-4-1-35-16-12-16 14-1 32Z"/>',
];
tickets.forEach((t, i) => {
  const glasses = [2,4,8].includes(i) ? '<g fill="none" stroke="#3a3540" stroke-width="1.8"><rect x="34" y="44" width="14" height="10" rx="4"/><rect x="54" y="44" width="14" height="10" rx="4"/><path d="M48 48h6"/></g>' : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 100 100"><defs><clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#c)"><rect width="100" height="100" fill="${t.color}"/><g fill="${hair[i]}">${hairstyles[i]}</g><path d="M40 65h20v18H40Z" fill="${skin[i]}"/><path d="M13 108V91c1-17 18-22 27-22l10 9 10-9c12 1 28 8 28 24v15Z" fill="${shirt[i]}"/><path d="M40 69l10 9-7 8-7-14m24-3l-10 9 7 8 7-14" fill="#ffffff33"/><ellipse cx="50" cy="47" rx="19" ry="24" fill="${skin[i]}"/><g fill="${hair[i]}">${hairstyles[i].replace(/32-3/g,'32-3')}</g><ellipse cx="50" cy="48" rx="18" ry="22" fill="${skin[i]}"/><path d="M32 38c5-1 20-3 29-10l11 14c-1-13-8-22-21-22-12 0-17 5-19 18" fill="${hair[i]}"/><g fill="#343037"><ellipse cx="42" cy="48" rx="1.5" ry="1.7"/><ellipse cx="59" cy="48" rx="1.5" ry="1.7"/></g><path d="M47 56l3 1 3-1" stroke="#9c604d" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M44 62q6 4 13-1" stroke="#864c43" stroke-width="1.6" fill="none" stroke-linecap="round"/>${glasses}</g></svg>`;
  fs.writeFileSync(t.avatar, svg);
});
console.log('10 retratos vetoriais fictícios e locais criados.');
