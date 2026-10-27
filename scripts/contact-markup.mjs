// Markup for the contact links: the "Email me" / LinkedIn button (two halves of one box that fill
// with sand on hover, see src/modules/sand.js), the address with a copy button, and a small row
// with WhatsApp, Instagram and the location. Used by build-pages.mjs for the case studies;
// index.html carries the same markup (regenerate it with `node scripts/contact-markup.mjs`).
import { fileURLToPath } from 'node:url';
import { site } from '../src/content/work.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const svg = (body, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const icons = {
  out: svg('<path d="M7 17 17 7"/><path d="M8 7h9v9"/>', 2.2),
  linkedin: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V16"/><path d="M8 7.6v.01"/><path d="M12 16v-5.5"/><path d="M12 13a2.5 2.5 0 0 1 5 0v3"/>'),
  copy: svg('<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>'),
  whatsapp: svg('<path d="M3.5 20.5l1.4-4.2A8.4 8.4 0 1 1 8 19.3z"/><path d="M9 9.5c.3 2 2.2 4.2 4.6 4.9l1.2-1.1 1.7.9-.4 1.6c-3.6.2-7.6-3.6-7.5-7.3l1.6-.4.8 1.7z"/>'),
  instagram: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>'),
  pin: svg('<path d="M12 21s7-6.1 7-11.5a7 7 0 1 0-14 0C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
};

// Gmail compose link: opens a new draft to Branch in Gmail on the web, with site.draft filled in.
export const gmailHref = `https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=${site.email}`
  + `&amp;su=${encodeURIComponent(site.draft.subject)}&amp;body=${encodeURIComponent(site.draft.body)}`;

export function contactLinks(pad) {
  return `${pad}<div class="duo" data-sand>
${pad}  <canvas aria-hidden="true"></canvas>
${pad}  <a class="duo-half" data-half="0" href="${gmailHref}" target="_blank" rel="noopener"><span class="duo-label">Email me ${icons.out}</span><span class="visually-hidden"> (opens a Gmail draft in a new tab)</span></a>
${pad}  <a class="duo-half" data-half="1" href="${site.linkedin}" target="_blank" rel="noopener"><span class="duo-label">${icons.linkedin} LinkedIn</span><span class="visually-hidden"> (opens in a new tab)</span></a>
${pad}</div>
${pad}<p class="contact-address"><span>${site.email}</span> <button class="copy-btn" type="button" data-copy="${site.email}">${icons.copy}<span class="copy-label" aria-live="polite">Copy</span></button></p>
${pad}<ul class="contact-meta">
${pad}  <li><a href="${site.whatsapp.href}" target="_blank" rel="noopener">${icons.whatsapp} WhatsApp ${esc(site.whatsapp.label)}<span class="visually-hidden"> (opens in a new tab)</span></a></li>
${pad}  <li><a href="${site.instagram.href}" target="_blank" rel="noopener">${icons.instagram} Instagram ${esc(site.instagram.label)}<span class="visually-hidden"> (opens in a new tab)</span></a></li>
${pad}  <li><span>${icons.pin} Yogyakarta, Indonesia</span></li>
${pad}</ul>`;
}

// `node scripts/contact-markup.mjs` rewrites the contact links in index.html.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { readFileSync, writeFileSync } = await import('node:fs');
  const file = new URL('../index.html', import.meta.url);
  const html = readFileSync(file, 'utf8');
  const start = html.indexOf('      <!-- contact-links -->');
  const end = html.indexOf('      <!-- /contact-links -->');
  if (start < 0 || end < 0) throw new Error('contact-links markers not found in index.html');
  writeFileSync(file, `${html.slice(0, start)}      <!-- contact-links -->\n${contactLinks('      ')}\n${html.slice(end)}`);
  console.log('Updated the contact links in index.html');
}
