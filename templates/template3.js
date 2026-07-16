/*
Action: file_editor create /app/ResumeForge/templates/template3.js --file-text "/**
 * template3.js — \"Nova\" (Compact sidebar)
 * -------------------------------------------------------------------------
 * Two-column: dark navy sidebar with photo, contact, skills, languages,
 * interests. Main column carries the narrative sections (summary,
 * experience, projects, education, certifications, achievements).
 * -------------------------------------------------------------------------
 */

import { escapeHtml, displayUrl } from '../js/utils.js';
import { sectionRenderers, section } from './template1.js';

export function renderTemplate3(state) {
  const p = state.personal;
  const renderers = sectionRenderers();

  const sidebarSections = ['skills', 'languages', 'interests'];
  const bodySections = ['summary', 'experience', 'projects', 'education', 'certifications', 'achievements'];

  const sidebar = [];
  sidebar.push(`
    <header class=\"r-header ${p.photo ? '' : 'no-photo'}\">
      ${p.photo ? `<div class=\"r-photo\"><img src=\"${escapeHtml(p.photo)}\" alt=\"\"/></div>` : ''}
      <div class=\"r-headline\">
        <h1 class=\"r-name\">${escapeHtml(p.name || 'Your name')}</h1>
        ${p.title ? `<div class=\"r-title-line\">${escapeHtml(p.title)}</div>` : ''}
      </div>
    </header>
  `);
  sidebar.push(`<div class=\"r-contact\">${sidebarContact(p)}</div>`);
  for (const id of sidebarSections) {
    if (state.meta.hiddenSections.includes(id)) continue;
    if (!renderers[id]) continue;
    const html = renderers[id](state);
    if (html) sidebar.push(html);
  }

  const body = [];
  for (const id of bodySections) {
    if (state.meta.hiddenSections.includes(id)) continue;
    if (!renderers[id]) continue;
    const html = renderers[id](state);
    if (html) body.push(html);
  }
  state.customSections.forEach((cs) => {
    if (!cs.entries.length) return;
    body.push(section(cs.title || 'Section', `<ul>${cs.entries.map((e) => `<li>${escapeHtml(e.text)}</li>`).join('')}</ul>`));
  });

  return `
    <aside class=\"r-sidebar\">${sidebar.join('')}</aside>
    <main class=\"r-body\">${body.join('')}</main>
  `;
}

function sidebarContact(p) {
  const items = [];
  if (p.email)     items.push(`<span class=\"r-contact-item\">${escapeHtml(p.email)}</span>`);
  if (p.phone)     items.push(`<span class=\"r-contact-item\">${escapeHtml(p.phone)}</span>`);
  if (p.location)  items.push(`<span class=\"r-contact-item\">${escapeHtml(p.location)}</span>`);
  if (p.linkedin)  items.push(`<span class=\"r-contact-item\">${escapeHtml(displayUrl(p.linkedin))}</span>`);
  if (p.github)    items.push(`<span class=\"r-contact-item\">${escapeHtml(displayUrl(p.github))}</span>`);
  if (p.portfolio) items.push(`<span class=\"r-contact-item\">${escapeHtml(displayUrl(p.portfolio))}</span>`);
  return items.join('');
}
