/*
Action: file_editor create /app/ResumeForge/templates/template2.js --file-text "/**
 * template2.js — \"Meridian\" (ATS Classic)
 * -------------------------------------------------------------------------
 * Highly ATS-friendly. Single column, centered header, uppercase section
 * titles with hairline underline. No photo. Pure black-on-white by design.
 * -------------------------------------------------------------------------
 */

import { escapeHtml, displayUrl } from '../js/utils.js';
import { sectionRenderers, section, formatRange } from './template1.js';

export function renderTemplate2(state) {
  const p = state.personal;
  const parts = [];

  parts.push(`
    <header class=\"r-header no-photo\">
      <div class=\"r-headline\" style=\"width:100%\">
        <h1 class=\"r-name\">${escapeHtml(p.name || 'Your name')}</h1>
        ${p.title ? `<div class=\"r-title-line\">${escapeHtml(p.title)}</div>` : ''}
        <div class=\"r-contact\">${contactPlain(p)}</div>
      </div>
    </header>
  `);

  const renderers = sectionRenderers();
  for (const id of state.meta.sectionOrder) {
    if (state.meta.hiddenSections.includes(id)) continue;
    const fn = renderers[id];
    if (fn) parts.push(fn(state));
  }
  state.customSections.forEach((cs) => {
    if (!cs.entries.length) return;
    parts.push(section(cs.title || 'Section', `<ul>${cs.entries.map((e) => `<li>${escapeHtml(e.text)}</li>`).join('')}</ul>`));
  });

  return parts.join('');
}

function contactPlain(p) {
  const bits = [
    p.email, p.phone, p.location, p.linkedin && displayUrl(p.linkedin), p.github && displayUrl(p.github), p.portfolio && displayUrl(p.portfolio)
  ].filter(Boolean).map((s) => `<span class=\"r-contact-item\">${escapeHtml(s)}</span>`);
  return bits.join('<span style=\"opacity:.4;margin:0 6px\">·</span>');
}
