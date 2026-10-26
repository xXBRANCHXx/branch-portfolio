// Markup for the contact links: one big row per channel (email, LinkedIn, WhatsApp, Instagram)
// and a line with where Branch is and his local time. Used by build-pages.mjs for the case studies;
// index.html carries the same markup by hand (regenerate it with `node scripts/contact-markup.mjs`).
import { fileURLToPath } from 'node:url';
import { site } from '../src/content/work.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const svg = (body, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const icons = {
  out: svg('<path d="M7 17 17 7M9 7h8v8"/>', 1.6),
  copy: svg('<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>'),
  pin: svg('<path d="M12 21s7-6.1 7-11.5a7 7 0 1 0-14 0C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
};

// Gmail compose link: opens a new draft to Branch in Gmail on the web, with site.draft filled in.
export const gmailHref = `https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=${site.email}`
  + `&amp;su=${encodeURIComponent(site.draft.subject)}&amp;body=${encodeURIComponent(site.draft.body)}`;

const rows = [
  { name: 'EMAIL', href: gmailHref, detail: site.email, copy: site.email, sr: ' (opens a Gmail draft in a new tab)' },
  { name: 'LINKEDIN', href: site.linkedin, detail: 'Branch Vincent' },
  { name: 'WHATSAPP', href: site.whatsapp.href, detail: site.whatsapp.label },
  { name: 'INSTAGRAM', href: site.instagram.href, detail: site.instagram.label },
];

export function contactLinks(pad) {
  const li = (r) => {
    const copy = r.copy
      ? ` <button class="copy-btn" type="button" data-copy="${esc(r.copy)}">${icons.copy}<span class="copy-label" aria-live="polite">Copy</span></button>`
      : '';
    return `${pad}  <li class="channel">
${pad}    <a class="channel-link" href="${r.href}" target="_blank" rel="noopener"><span class="channel-name display">${r.name}</span><span class="visually-hidden">${r.sr || ' (opens in a new tab)'}</span></a>
${pad}    <p class="channel-meta"><span${r.copy ? ' class="selectable"' : ''}>${esc(r.detail)}</span>${copy}</p>
${pad}    <span class="channel-arrow">${icons.out}</span>
${pad}  </li>`;
  };
  return `${pad}<ul class="channels">
${rows.map(li).join('\n')}
${pad}</ul>
${pad}<p class="contact-local">${icons.pin} Yogyakarta, Indonesia<span class="local-time" data-local-time="Asia/Jakarta" hidden></span></p>`;
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
