/*Now creating the 3 template files, main.js, README, and setting up preview access.
Action: file_editor create /app/ResumeForge/templates/template1.js --file-text "/**
 * template1.js — \"Aurora\" template
 * -------------------------------------------------------------------------
 * Modern editorial layout with a bold serif name, gold underline accent,
 * left-aligned single column, and subtle square accents next to section
 * titles. Uses the shared class names (r-*) so preview.css handles styling.
 * -------------------------------------------------------------------------
 */

import { escapeHtml, displayUrl, formatMonthYear } from '../js/utils.js';

/** @returns {string} HTML string for the whole resume paper. */
export function renderTemplate1(state) {
  const p = state.personal;
  const parts = [];

  // Header
  parts.push(`
    <header class=\"r-header ${p.photo ? '' : 'no-photo'}\">
      ${p.photo ? `<div class=\"r-photo\"><img src=\"${escapeHtml(p.photo)}\" alt=\"\"/></div>` : ''}
      <div class=\"r-headline\">
        <h1 class=\"r-name\"><span class=\"accent-underline\">${escapeHtml(p.name || 'Your name')}</span></h1>
        ${p.title ? `<div class=\"r-title-line\">${escapeHtml(p.title)}</div>` : ''}
        <div class=\"r-contact\">${contactLine(p)}</div>
      </div>
    </header>
  `);

  // Body sections in user-defined order
  const renderers = sectionRenderers();
  for (const id of state.meta.sectionOrder) {
    if (state.meta.hiddenSections.includes(id)) continue;
    const fn = renderers[id];
    if (fn) parts.push(fn(state));
  }
  // Custom sections
  state.customSections.forEach((cs) => {
    if (!cs.entries.length) return;
    parts.push(`
      <section class=\"r-section\">
        <h3 class=\"r-section-title\">${escapeHtml(cs.title || 'Section')}</h3>
        <ul>${cs.entries.map((e) => `<li>${escapeHtml(e.text)}</li>`).join('')}</ul>
      </section>
    `);
  });

  return parts.join('');
}

function contactLine(p) {
  const items = [];
  if (p.email)     items.push(pill(iconMail, p.email));
  if (p.phone)     items.push(pill(iconPhone, p.phone));
  if (p.location)  items.push(pill(iconPin, p.location));
  if (p.linkedin)  items.push(pill(iconLink, displayUrl(p.linkedin)));
  if (p.github)    items.push(pill(iconGit, displayUrl(p.github)));
  if (p.portfolio) items.push(pill(iconGlobe, displayUrl(p.portfolio)));
  return items.join('');
}
function pill(icon, text) {
  return `<span class=\"r-contact-item\">${icon}${escapeHtml(text)}</span>`;
}

const iconMail  = '<svg viewBox=\"0 0 24 24\" width=\"11\" height=\"11\"><path fill=\"currentColor\" d=\"M4 6h16v12H4zm2 2v.4l6 3.6 6-3.6V8z\"/></svg>';
const iconPhone = '<svg viewBox=\"0 0 24 24\" width=\"11\" height=\"11\"><path fill=\"currentColor\" d=\"M6 3h4l2 5-3 2a12 12 0 006 6l2-3 5 2v4a2 2 0 01-2 2A18 18 0 014 5a2 2 0 012-2z\"/></svg>';
const iconPin   = '<svg viewBox=\"0 0 24 24\" width=\"11\" height=\"11\"><path fill=\"currentColor\" d=\"M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7zm0 5a2 2 0 100 4 2 2 0 000-4z\"/></svg>';
const iconLink  = '<svg viewBox=\"0 0 24 24\" width=\"11\" height=\"11\"><path fill=\"currentColor\" d=\"M4.5 4.5h4v2h-4v11h11v-4h2v6h-13z\"/><path fill=\"currentColor\" d=\"M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14z\"/></svg>';
const iconGit   = '<svg viewBox=\"0 0 24 24\" width=\"11\" height=\"11\"><path fill=\"currentColor\" d=\"M12 2a10 10 0 00-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.1.63-1.35-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 015 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.56 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0012 2z\"/></svg>';
const iconGlobe = '<svg viewBox=\"0 0 24 24\" width=\"11\" height=\"11\"><path fill=\"currentColor\" d=\"M12 2a10 10 0 100 20 10 10 0 000-20zm7.94 9h-3.03a17 17 0 00-1.34-5.29A8 8 0 0119.94 11zM12 4c1 0 2.7 2.3 3.34 7H8.66C9.3 6.3 11 4 12 4zM4.06 11a8 8 0 014.37-5.29A17 17 0 007.09 11zm0 2h3.03c.15 2 .6 3.86 1.34 5.29A8 8 0 014.06 13zM12 20c-1 0-2.7-2.3-3.34-7h6.68C14.7 17.7 13 20 12 20zm3.57-1.71c.74-1.43 1.19-3.3 1.34-5.29h3.03a8 8 0 01-4.37 5.29z\"/></svg>';

/** Return a map of section id → renderer function. */
function sectionRenderers() {
  return {
    summary(state) {
      if (!state.summary?.text) return '';
      return section('Summary', `<div>${escapeHtml(state.summary.text).replace(/\n/g, '<br/>')}</div>`);
    },
    experience(state) {
      if (!state.experience.length) return '';
      const items = state.experience.map((e) => `
        <div class=\"r-entry\">
          <div class=\"r-entry-head\">
            <div>
              <div class=\"r-entry-title\">${escapeHtml(e.role)}</div>
              <div class=\"r-entry-sub\">${escapeHtml(e.company)}${e.location ? ' · ' + escapeHtml(e.location) : ''}</div>
            </div>
            <div class=\"r-entry-meta\">${formatRange(e.start, e.end, e.current)}</div>
          </div>
          ${e.description ? bulletList(e.description) : ''}
        </div>
      `).join('');
      return section('Experience', items);
    },
    education(state) {
      if (!state.education.length) return '';
      const items = state.education.map((e) => `
        <div class=\"r-entry\">
          <div class=\"r-entry-head\">
            <div>
              <div class=\"r-entry-title\">${escapeHtml(e.degree)}</div>
              <div class=\"r-entry-sub\">${escapeHtml(e.school)}${e.location ? ' · ' + escapeHtml(e.location) : ''}</div>
            </div>
            <div class=\"r-entry-meta\">${formatRange(e.start, e.end, false)}</div>
          </div>
          ${e.description ? `<div class=\"r-entry-desc\">${escapeHtml(e.description)}</div>` : ''}
        </div>
      `).join('');
      return section('Education', items);
    },
    projects(state) {
      if (!state.projects.length) return '';
      const items = state.projects.map((p) => `
        <div class=\"r-entry\">
          <div class=\"r-entry-head\">
            <div>
              <div class=\"r-entry-title\">${escapeHtml(p.name)}</div>
              <div class=\"r-entry-sub\">${escapeHtml(p.stack)}</div>
            </div>
            <div class=\"r-entry-meta\">${[p.github, p.demo].filter(Boolean).map(displayUrl).map(escapeHtml).join(' · ')}</div>
          </div>
          ${p.description ? `<div class=\"r-entry-desc\">${escapeHtml(p.description)}</div>` : ''}
        </div>
      `).join('');
      return section('Projects', items);
    },
    skills(state) {
      if (!state.skills.length) return '';
      const cats = state.skills.filter((c) => c.tags.length).map((c) => `
        <div class=\"r-skills-cat\">
          <span class=\"r-skills-cat-title\">${escapeHtml(c.name)}:</span>
          ${c.tags.map((t) => `<span class=\"r-skill-tag\">${escapeHtml(t)}</span>`).join('')}
        </div>
      `).join('');
      return section('Skills', cats);
    },
    certifications(state) {
      if (!state.certifications.length) return '';
      const items = state.certifications.map((c) => `
        <div class=\"r-entry\">
          <div class=\"r-entry-head\">
            <div>
              <div class=\"r-entry-title\">${escapeHtml(c.name)}</div>
              <div class=\"r-entry-sub\">${escapeHtml(c.issuer)}</div>
            </div>
            <div class=\"r-entry-meta\">${formatMonthYear(c.date)}</div>
          </div>
        </div>
      `).join('');
      return section('Certifications', items);
    },
    languages(state) {
      if (!state.languages.length) return '';
      return section('Languages',
        `<div class=\"r-chip-list\">${state.languages.map((l) => `<span class=\"r-chip\">${escapeHtml(l.name)}${l.level ? ` · ${escapeHtml(l.level)}` : ''}</span>`).join('')}</div>`);
    },
    achievements(state) {
      if (!state.achievements.length) return '';
      return section('Achievements', `<ul>${state.achievements.map((a) => `<li>${escapeHtml(a.text)}</li>`).join('')}</ul>`);
    },
    interests(state) {
      if (!state.interests.length) return '';
      return section('Interests',
        `<div class=\"r-chip-list\">${state.interests.map((i) => `<span class=\"r-chip\">${escapeHtml(i.text)}</span>`).join('')}</div>`);
    }
  };
}

function section(title, inner) {
  return `<section class=\"r-section\"><h3 class=\"r-section-title\">${title}</h3>${inner}</section>`;
}
function bulletList(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return `<div class=\"r-entry-desc\"><ul>${lines.map((l) => `<li>${escapeHtml(l.replace(/^[-•]\s*/, ''))}</li>`).join('')}</ul></div>`;
}
function formatRange(start, end, current) {
  const s = formatMonthYear(start);
  const e = current ? 'Present' : formatMonthYear(end);
  if (!s && !e) return '';
  return `${s || ''}${s && e ? ' — ' : ''}${e || ''}`;
}

// Re-export helpers used by template2/3 so they don't need to re-implement.
export { sectionRenderers, section, contactLine, formatRange, bulletList };
