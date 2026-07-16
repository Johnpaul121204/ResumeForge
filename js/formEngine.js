/*Now creating the form engine, preview engine, drag-drop, keyword checker, pdf, templates, and main.
Action: file_editor create /app/ResumeForge/js/formEngine.js --file-text "/**
 * formEngine.js
 * -------------------------------------------------------------------------
 * Responsible for rendering the left-side editor. It produces:
 *   - The section tabs (with drag-drop reordering + hide toggles).
 *   - The active section's form UI, wired to the store via event delegation.
 *   - Character counters with warning thresholds.
 *   - Add / delete / reorder actions for every list-based section.
 *
 * Design goals:
 *   - Preserve focus during re-renders (we don't rebuild inputs on every
 *     keystroke — text inputs update the store directly on `input`).
 *   - Use event delegation for buttons so we render fresh markup cheaply.
 * -------------------------------------------------------------------------
 */

import { BUILT_IN_SECTIONS, CHAR_LIMITS } from './state.js';
import { qs, qsa, createEl, escapeHtml, uid, debounce, readFileAsDataURL, toast } from './utils.js';
import { attachListDnD, attachTabDnD } from './dragdrop.js';

export function createFormEngine(store, history) {
  const tabsEl = qs('#sectionTabs');
  const canvasEl = qs('#formCanvas');
  let currentSection = store.get().meta.activeSection || 'personal';

  /** Record a history snapshot after a burst of edits (400ms debounce). */
  const recordHistoryDebounced = debounce(() => history.snapshot(), 400);

  // --------------------- Section tab rendering ---------------------
  function renderTabs() {
    const state = store.get();
    tabsEl.innerHTML = '';
    // Always-present \"Personal\" tab (not draggable / not hideable).
    tabsEl.appendChild(makeTab({ id: 'personal', label: 'Personal' }, true));
    // Followed by the user-orderable sections.
    for (const id of state.meta.sectionOrder) {
      const meta = BUILT_IN_SECTIONS.find((s) => s.id === id);
      if (meta) tabsEl.appendChild(makeTab(meta));
    }
    // Custom sections (dynamic).
    for (const cs of state.customSections) {
      tabsEl.appendChild(makeTab({ id: `custom:${cs.id}`, label: cs.title || 'Untitled', custom: true }));
    }
    attachTabDnD(tabsEl, store, history);
  }

  function makeTab(section, pinned = false) {
    const state = store.get();
    const active = state.meta.activeSection === section.id;
    const hidden = state.meta.hiddenSections.includes(section.id);
    const tab = createEl('button', {
      class: `section-tab${active ? ' active' : ''}`,
      draggable: !pinned,
      dataset: { sectionId: section.id, pinned: pinned ? '1' : '0' },
      'data-testid': `tab-${section.id.replace(':', '-')}`
    }, [
      createEl('span', { class: 'dot' }),
      section.label + (hidden ? ' · hidden' : '')
    ]);
    tab.addEventListener('click', () => selectSection(section.id));
    return tab;
  }

  function selectSection(id) {
    currentSection = id;
    store.update((s) => { s.meta.activeSection = id; });
  }

  // --------------------- Form body rendering ---------------------
  function renderForm() {
    const state = store.get();
    canvasEl.innerHTML = '';
    const id = currentSection;
    if (id === 'personal')            canvasEl.appendChild(renderPersonal(state));
    else if (id === 'summary')        canvasEl.appendChild(renderSummary(state));
    else if (id === 'experience')     canvasEl.appendChild(renderExperience(state));
    else if (id === 'education')      canvasEl.appendChild(renderEducation(state));
    else if (id === 'projects')       canvasEl.appendChild(renderProjects(state));
    else if (id === 'skills')         canvasEl.appendChild(renderSkills(state));
    else if (id === 'certifications') canvasEl.appendChild(renderCertifications(state));
    else if (id === 'languages')      canvasEl.appendChild(renderLanguages(state));
    else if (id === 'achievements')   canvasEl.appendChild(renderList(state, 'achievements', 'Achievements', 'e.g. Won Product of the Year 2023'));
    else if (id === 'interests')      canvasEl.appendChild(renderList(state, 'interests', 'Interests', 'e.g. Bouldering'));
    else if (id.startsWith('custom:'))canvasEl.appendChild(renderCustom(state, id.slice(7)));
  }

  // -- Header helper for every section
  function sectionHead(title, subtitle, opts = {}) {
    const state = store.get();
    const hidden = state.meta.hiddenSections.includes(opts.toggleId || '');
    const head = createEl('div', { class: 'form-section-head' }, [
      createEl('div', {}, [
        createEl('h2', { class: 'form-section-title', text: title }),
        createEl('div', { class: 'form-section-sub', text: subtitle || '' })
      ])
    ]);
    if (opts.toggleId) {
      const label = createEl('label', { class: 'section-visibility-toggle', title: 'Show / hide in resume' }, [
        hidden ? 'Hidden' : 'Visible'
      ]);
      const input = createEl('input', { type: 'checkbox' });
      input.checked = !hidden;
      input.addEventListener('change', () => {
        store.update((s) => {
          const list = s.meta.hiddenSections;
          const i = list.indexOf(opts.toggleId);
          if (input.checked && i > -1) list.splice(i, 1);
          else if (!input.checked && i === -1) list.push(opts.toggleId);
        });
        history.snapshot();
      });
      label.appendChild(input);
      label.appendChild(createEl('span', { class: 'toggle' }));
      head.appendChild(label);
    }
    return head;
  }

  // -- Reusable text field with optional character counter
  function textField(labelText, value, onInput, opts = {}) {
    const wrap = createEl('div', { class: 'field' });
    wrap.appendChild(createEl('label', { text: labelText }));
    const input = opts.textarea
      ? createEl('textarea', { rows: opts.rows || 4, placeholder: opts.placeholder || '', 'data-testid': opts.testid })
      : createEl('input', { type: opts.type || 'text', placeholder: opts.placeholder || '', value: value ?? '', 'data-testid': opts.testid });
    if (opts.textarea) input.value = value ?? '';
    input.addEventListener('input', (e) => {
      onInput(e.target.value);
      if (counter) updateCounter(counter, e.target.value, opts.limit);
      recordHistoryDebounced();
    });
    wrap.appendChild(input);
    let counter = null;
    if (opts.limit) {
      counter = createEl('div', { class: 'char-counter' });
      updateCounter(counter, value ?? '', opts.limit);
      wrap.appendChild(counter);
    }
    return wrap;
  }
  function updateCounter(node, value, limit) {
    const n = (value || '').length;
    node.textContent = `${n} / ${limit}`;
    node.classList.toggle('warn', n > limit * 0.85 && n <= limit);
    node.classList.toggle('over', n > limit);
  }

  // ============================================================
  // PERSONAL
  // ============================================================
  function renderPersonal(state) {
    const p = state.personal;
    const wrap = createEl('div', { class: 'form-section' });
    wrap.appendChild(sectionHead('Personal details', 'Contact information and headline'));

    // Photo uploader
    const photoWrap = createEl('div', { class: 'photo-uploader' });
    const preview = createEl('div', { class: 'photo-preview' });
    if (p.photo) preview.appendChild(createEl('img', { src: p.photo, alt: 'Profile photo' }));
    else preview.textContent = 'No photo';
    const controls = createEl('div', { class: 'photo-controls' });
    const uploadBtn = createEl('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-testid': 'btn-upload-photo' }, ['Upload photo']);
    const removeBtn = createEl('button', { class: 'btn btn-ghost btn-sm', type: 'button' }, ['Remove']);
    const fileInput = createEl('input', { type: 'file', accept: 'image/*', hidden: true });
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      if (f.size > 2 * 1024 * 1024) { toast('Image too large (max 2 MB).', 'error'); return; }
      const data = await readFileAsDataURL(f);
      store.update((s) => { s.personal.photo = data; });
      history.snapshot();
    });
    removeBtn.addEventListener('click', () => { store.update((s) => { s.personal.photo = ''; }); history.snapshot(); });
    controls.append(uploadBtn, removeBtn, fileInput);
    photoWrap.append(preview, controls);
    wrap.appendChild(photoWrap);

    // Fields
    wrap.appendChild(textField('Full name', p.name, (v) => store.update((s) => { s.personal.name = v; }), { placeholder: 'Alex Morgan', testid: 'input-name' }));
    wrap.appendChild(textField('Headline / Title', p.title, (v) => store.update((s) => { s.personal.title = v; }), { placeholder: 'Senior Product Designer' }));

    const row1 = createEl('div', { class: 'field-row' });
    row1.appendChild(textField('Email', p.email, (v) => store.update((s) => { s.personal.email = v; }), { type: 'email' }));
    row1.appendChild(textField('Phone', p.phone, (v) => store.update((s) => { s.personal.phone = v; }), { type: 'tel' }));
    wrap.appendChild(row1);

    wrap.appendChild(textField('Location', p.location, (v) => store.update((s) => { s.personal.location = v; })));

    const row2 = createEl('div', { class: 'field-row-3' });
    row2.appendChild(textField('LinkedIn', p.linkedin, (v) => store.update((s) => { s.personal.linkedin = v; }), { placeholder: 'linkedin.com/in/…' }));
    row2.appendChild(textField('GitHub', p.github, (v) => store.update((s) => { s.personal.github = v; }), { placeholder: 'github.com/…' }));
    row2.appendChild(textField('Portfolio', p.portfolio, (v) => store.update((s) => { s.personal.portfolio = v; }), { placeholder: 'yourdomain.com' }));
    wrap.appendChild(row2);
    return wrap;
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  function renderSummary(state) {
    const wrap = createEl('div', { class: 'form-section' });
    wrap.appendChild(sectionHead('Professional summary', 'A concise 2–4 line pitch', { toggleId: 'summary' }));
    wrap.appendChild(textField('Summary', state.summary.text,
      (v) => store.update((s) => { s.summary.text = v; }),
      { textarea: true, rows: 6, limit: CHAR_LIMITS.summary, testid: 'input-summary', placeholder: 'What defines you professionally?' }
    ));
    return wrap;
  }

  // ============================================================
  // EXPERIENCE
  // ============================================================
  function renderExperience(state) {
    const wrap = createEl('div', { class: 'form-section' });
    wrap.appendChild(sectionHead('Work experience', 'Drag entries to reorder', { toggleId: 'experience' }));
    const list = createEl('div', { class: 'entry-list', dataset: { list: 'experience' } });
    state.experience.forEach((exp, i) => list.appendChild(experienceCard(exp, i)));
    wrap.appendChild(list);

    const addBtn = createEl('button', { class: 'add-entry-btn', 'data-testid': 'btn-add-experience' }, ['+ Add experience']);
    addBtn.addEventListener('click', () => {
      store.update((s) => s.experience.push({ id: uid('exp'), company: '', role: '', location: '', start: '', end: '', current: false, description: '' }));
      history.snapshot();
    });
    wrap.appendChild(addBtn);
    attachListDnD(list, store, history, 'experience');
    return wrap;
  }

  function experienceCard(exp, i) {
    const card = createEl('div', { class: 'entry-card', draggable: true, dataset: { id: exp.id } });
    card.appendChild(entryHeader(exp.role || exp.company || `Entry ${i + 1}`, () => deleteEntry('experience', exp.id)));
    const row = createEl('div', { class: 'field-row' });
    row.appendChild(textField('Company',  exp.company,  (v) => updateEntry('experience', exp.id, 'company', v)));
    row.appendChild(textField('Role',     exp.role,     (v) => updateEntry('experience', exp.id, 'role', v)));
    card.appendChild(row);
    card.appendChild(textField('Location', exp.location, (v) => updateEntry('experience', exp.id, 'location', v)));
    const dates = createEl('div', { class: 'field-row-3' });
    dates.appendChild(textField('Start', exp.start, (v) => updateEntry('experience', exp.id, 'start', v), { type: 'month' }));
    dates.appendChild(textField('End',   exp.end,   (v) => updateEntry('experience', exp.id, 'end', v),   { type: 'month' }));
    // \"Currently working here\" toggle
    const currentWrap = createEl('div', { class: 'field' });
    currentWrap.appendChild(createEl('label', { text: 'Present' }));
    const t = createEl('label', { class: 'section-visibility-toggle' });
    const cb = createEl('input', { type: 'checkbox' }); cb.checked = !!exp.current;
    cb.addEventListener('change', () => { updateEntry('experience', exp.id, 'current', cb.checked); });
    t.append(cb, createEl('span', { class: 'toggle' }));
    currentWrap.appendChild(t);
    dates.appendChild(currentWrap);
    card.appendChild(dates);
    card.appendChild(textField('Description', exp.description,
      (v) => updateEntry('experience', exp.id, 'description', v),
      { textarea: true, rows: 5, limit: CHAR_LIMITS.experienceDesc, placeholder: 'One achievement per line — use action verbs and numbers.' }
    ));
    return card;
  }

  // ============================================================
  // EDUCATION
  // ============================================================
  function renderEducation(state) {
    const wrap = createEl('div', { class: 'form-section' });
    wrap.appendChild(sectionHead('Education', 'Schools and degrees', { toggleId: 'education' }));
    const list = createEl('div', { class: 'entry-list', dataset: { list: 'education' } });
    state.education.forEach((ed, i) => list.appendChild(educationCard(ed, i)));
    wrap.appendChild(list);
    const btn = createEl('button', { class: 'add-entry-btn' }, ['+ Add education']);
    btn.addEventListener('click', () => {
      store.update((s) => s.education.push({ id: uid('edu'), school: '', degree: '', location: '', start: '', end: '', description: '' }));
      history.snapshot();
    });
    wrap.appendChild(btn);
    attachListDnD(list, store, history, 'education');
    return wrap;
  }
  function educationCard(ed, i) {
    const card = createEl('div', { class: 'entry-card', draggable: true, dataset: { id: ed.id } });
    card.appendChild(entryHeader(ed.school || `Entry ${i + 1}`, () => deleteEntry('education', ed.id)));
    card.appendChild(textField('School', ed.school, (v) => updateEntry('education', ed.id, 'school', v)));
    card.appendChild(textField('Degree', ed.degree, (v) => updateEntry('education', ed.id, 'degree', v)));
    const row = createEl('div', { class: 'field-row-3' });
    row.appendChild(textField('Location', ed.location, (v) => updateEntry('education', ed.id, 'location', v)));
    row.appendChild(textField('Start', ed.start, (v) => updateEntry('education', ed.id, 'start', v), { type: 'month' }));
    row.appendChild(textField('End',   ed.end,   (v) => updateEntry('education', ed.id, 'end', v),   { type: 'month' }));
    card.appendChild(row);
    card.appendChild(textField('Details', ed.description,
      (v) => updateEntry('education', ed.id, 'description', v),
      { textarea: true, rows: 3, limit: CHAR_LIMITS.educationDesc }
    ));
    return card;
  }

  // ============================================================
  // PROJECTS
  // ============================================================
  function renderProjects(state) {
    const wrap = createEl('div', { class: 'form-section' });
    wrap.appendChild(sectionHead('Projects', 'Personal or standout work', { toggleId: 'projects' }));
    const list = createEl('div', { class: 'entry-list', dataset: { list: 'projects' } });
    state.projects.forEach((p, i) => list.appendChild(projectCard(p, i)));
    wrap.appendChild(list);
    const btn = createEl('button', { class: 'add-entry-btn' }, ['+ Add project']);
    btn.addEventListener('click', () => {
      store.update((s) => s.projects.push({ id: uid('prj'), name: '', stack: '', github: '', demo: '', description: '' }));
      history.snapshot();
    });
    wrap.appendChild(btn);
    attachListDnD(list, store, history, 'projects');
    return wrap;
  }
  function projectCard(p, i) {
    const card = createEl('div', { class: 'entry-card', draggable: true, dataset: { id: p.id } });
    card.appendChild(entryHeader(p.name || `Project ${i + 1}`, () => deleteEntry('projects', p.id)));
    card.appendChild(textField('Project name', p.name, (v) => updateEntry('projects', p.id, 'name', v)));
    card.appendChild(textField('Tech stack',   p.stack, (v) => updateEntry('projects', p.id, 'stack', v), { placeholder: 'React, TypeScript, PostgreSQL' }));
    const row = createEl('div', { class: 'field-row' });
    row.appendChild(textField('GitHub',   p.github, (v) => updateEntry('projects', p.id, 'github', v)));
    row.appendChild(textField('Live demo', p.demo,  (v) => updateEntry('projects', p.id, 'demo', v)));
    card.appendChild(row);
    card.appendChild(textField('Description', p.description,
      (v) => updateEntry('projects', p.id, 'description', v),
      { textarea: true, rows: 3, limit: CHAR_LIMITS.projectDesc }));
    return card;
  }

  // ============================================================
  // SKILLS
  // ============================================================
  function renderSkills(state) {
    const wrap = createEl('div', { class: 'form-section' });
    wrap.appendChild(sectionHead('Skills', 'Grouped by category', { toggleId: 'skills' }));

    // Search
    const search = createEl('div', { class: 'skill-search field' });
    search.innerHTML = `
      <svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\"><path fill=\"currentColor\" d=\"M10 2a8 8 0 105.3 14L18 18.8V16l-2.7-2.7A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z\"/></svg>
      <input type=\"search\" placeholder=\"Filter your skills…\" data-testid=\"skill-search\" />
    `;
    const searchInput = search.querySelector('input');
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      qsa('.tag', wrap).forEach((t) => {
        const match = t.textContent.toLowerCase().includes(q);
        t.style.display = match || !q ? '' : 'none';
      });
    });
    wrap.appendChild(search);

    // Categories
    state.skills.forEach((cat) => {
      const box = createEl('div', { class: 'skill-category' });
      const head = createEl('div', { class: 'skill-category-head' });
      const nameInput = createEl('input', { type: 'text', value: cat.name, placeholder: 'Category name' });
      nameInput.addEventListener('input', () => {
        store.update((s) => { const c = s.skills.find((x) => x.id === cat.id); if (c) c.name = nameInput.value; });
        recordHistoryDebounced();
      });
      const del = createEl('button', { class: 'icon-btn', type: 'button', title: 'Delete category' }, ['×']);
      del.addEventListener('click', () => {
        store.update((s) => { s.skills = s.skills.filter((c) => c.id !== cat.id); });
        history.snapshot();
      });
      head.append(nameInput, del);
      box.appendChild(head);
      box.appendChild(tagInput(cat.tags, (next) => {
        store.update((s) => { const c = s.skills.find((x) => x.id === cat.id); if (c) c.tags = next; });
        history.snapshot();
      }));
      wrap.appendChild(box);
    });

    const btn = createEl('button', { class: 'add-entry-btn' }, ['+ Add category']);
    btn.addEventListener('click', () => {
      store.update((s) => s.skills.push({ id: uid('cat'), name: 'New category', tags: [] }));
      history.snapshot();
    });
    wrap.appendChild(btn);
    return wrap;
  }

  /** Reusable tag input (adds on Enter or comma). */
  function tagInput(tags, onChange) {
    const wrap = createEl('div', { class: 'tag-input-wrap' });
    const rerender = () => {
      wrap.innerHTML = '';
      for (const t of tags) {
        const chip = createEl('span', { class: 'tag' }, [t]);
        const x = createEl('button', { type: 'button', 'aria-label': 'Remove tag' }, ['×']);
        x.addEventListener('click', () => { tags = tags.filter((v) => v !== t); onChange([...tags]); rerender(); });
        chip.appendChild(x);
        wrap.appendChild(chip);
      }
      const input = createEl('input', { type: 'text', placeholder: 'Add a skill and press Enter…' });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const v = input.value.trim().replace(/,$/, '');
          if (v && !tags.includes(v)) { tags = [...tags, v]; onChange([...tags]); rerender(); }
        } else if (e.key === 'Backspace' && !input.value && tags.length) {
          tags = tags.slice(0, -1); onChange([...tags]); rerender();
        }
      });
      wrap.appendChild(input);
      input.focus({ preventScroll: true });
    };
    // Initial render without focusing (avoids scroll jump on load)
    wrap.innerHTML = '';
    for (const t of tags) {
      const chip = createEl('span', { class: 'tag' }, [t]);
      const x = createEl('button', { type: 'button', 'aria-label': 'Remove tag' }, ['×']);
      x.addEventListener('click', () => { tags = tags.filter((v) => v !== t); onChange([...tags]); rerender(); });
      chip.appendChild(x);
      wrap.appendChild(chip);
    }
    const input = createEl('input', { type: 'text', placeholder: 'Add a skill and press Enter…' });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const v = input.value.trim().replace(/,$/, '');
        if (v && !tags.includes(v)) { tags = [...tags, v]; onChange([...tags]); rerender(); }
      } else if (e.key === 'Backspace' && !input.value && tags.length) {
        tags = tags.slice(0, -1); onChange([...tags]); rerender();
      }
    });
    wrap.appendChild(input);
    wrap.addEventListener('click', (e) => { if (e.target === wrap) input.focus(); });
    return wrap;
  }

  // ============================================================
  // CERTIFICATIONS
  // ============================================================
  function renderCertifications(state) {
    const wrap = createEl('div', { class: 'form-section' });
    wrap.appendChild(sectionHead('Certifications', 'Credentials, courses, licenses', { toggleId: 'certifications' }));
    const list = createEl('div', { class: 'entry-list', dataset: { list: 'certifications' } });
    state.certifications.forEach((c, i) => {
      const card = createEl('div', { class: 'entry-card', draggable: true, dataset: { id: c.id } });
      card.appendChild(entryHeader(c.name || `Certification ${i + 1}`, () => deleteEntry('certifications', c.id)));
      card.appendChild(textField('Name',    c.name,   (v) => updateEntry('certifications', c.id, 'name', v)));
      const row = createEl('div', { class: 'field-row' });
      row.appendChild(textField('Issuer',   c.issuer, (v) => updateEntry('certifications', c.id, 'issuer', v)));
      row.appendChild(textField('Date',     c.date,   (v) => updateEntry('certifications', c.id, 'date', v), { type: 'month' }));
      card.appendChild(row);
      list.appendChild(card);
    });
    wrap.appendChild(list);
    const btn = createEl('button', { class: 'add-entry-btn' }, ['+ Add certification']);
    btn.addEventListener('click', () => {
      store.update((s) => s.certifications.push({ id: uid('cert'), name: '', issuer: '', date: '' }));
      history.snapshot();
    });
    wrap.appendChild(btn);
    attachListDnD(list, store, history, 'certifications');
    return wrap;
  }

  // ============================================================
  // LANGUAGES
  // ============================================================
  function renderLanguages(state) {
    const wrap = createEl('div', { class: 'form-section' });
    wrap.appendChild(sectionHead('Languages', 'Written / spoken proficiency', { toggleId: 'languages' }));
    const list = createEl('div', { class: 'entry-list', dataset: { list: 'languages' } });
    state.languages.forEach((l, i) => {
      const card = createEl('div', { class: 'entry-card', draggable: true, dataset: { id: l.id } });
      card.appendChild(entryHeader(l.name || `Language ${i + 1}`, () => deleteEntry('languages', l.id)));
      const row = createEl('div', { class: 'field-row' });
      row.appendChild(textField('Language', l.name, (v) => updateEntry('languages', l.id, 'name', v)));
      row.appendChild(textField('Proficiency', l.level, (v) => updateEntry('languages', l.id, 'level', v), { placeholder: 'Native / Professional / Conversational' }));
      card.appendChild(row);
      list.appendChild(card);
    });
    wrap.appendChild(list);
    const btn = createEl('button', { class: 'add-entry-btn' }, ['+ Add language']);
    btn.addEventListener('click', () => {
      store.update((s) => s.languages.push({ id: uid('lng'), name: '', level: '' }));
      history.snapshot();
    });
    wrap.appendChild(btn);
    attachListDnD(list, store, history, 'languages');
    return wrap;
  }

  // ============================================================
  // Generic list (achievements, interests)
  // ============================================================
  function renderList(state, key, title, placeholder) {
    const wrap = createEl('div', { class: 'form-section' });
    wrap.appendChild(sectionHead(title, 'One line per item', { toggleId: key }));
    const list = createEl('div', { class: 'entry-list', dataset: { list: key } });
    state[key].forEach((item, i) => {
      const card = createEl('div', { class: 'entry-card', draggable: true, dataset: { id: item.id } });
      card.appendChild(entryHeader(`Item ${i + 1}`, () => deleteEntry(key, item.id)));
      card.appendChild(textField('Text', item.text, (v) => updateEntry(key, item.id, 'text', v), { placeholder }));
      list.appendChild(card);
    });
    wrap.appendChild(list);
    const btn = createEl('button', { class: 'add-entry-btn' }, [`+ Add ${title.toLowerCase()}`]);
    btn.addEventListener('click', () => {
      store.update((s) => s[key].push({ id: uid(key.slice(0, 3)), text: '' }));
      history.snapshot();
    });
    wrap.appendChild(btn);
    attachListDnD(list, store, history, key);
    return wrap;
  }

  // ============================================================
  // CUSTOM sections
  // ============================================================
  function renderCustom(state, customId) {
    const custom = state.customSections.find((c) => c.id === customId);
    if (!custom) return createEl('div', { text: 'Section not found' });
    const wrap = createEl('div', { class: 'form-section' });
    const head = createEl('div', { class: 'form-section-head' });
    const titleWrap = createEl('div');
    const titleInput = createEl('input', { type: 'text', value: custom.title, placeholder: 'Section title' });
    titleInput.style.cssText = 'font-family:var(--font-display);font-size:22px;font-weight:700;background:transparent;border:none;color:var(--text-1);width:100%;';
    titleInput.addEventListener('input', () => {
      store.update((s) => { const c = s.customSections.find((x) => x.id === customId); if (c) c.title = titleInput.value; });
      recordHistoryDebounced();
    });
    titleWrap.appendChild(titleInput);
    titleWrap.appendChild(createEl('div', { class: 'form-section-sub', text: 'Custom section — visible when it has content' }));
    head.appendChild(titleWrap);
    const removeBtn = createEl('button', { class: 'btn btn-ghost btn-sm' }, ['Delete section']);
    removeBtn.addEventListener('click', () => {
      store.update((s) => { s.customSections = s.customSections.filter((c) => c.id !== customId); s.meta.activeSection = 'personal'; });
      history.snapshot();
    });
    head.appendChild(removeBtn);
    wrap.appendChild(head);

    const list = createEl('div', { class: 'entry-list', dataset: { list: `custom:${customId}` } });
    custom.entries.forEach((entry, i) => {
      const card = createEl('div', { class: 'entry-card', draggable: true, dataset: { id: entry.id } });
      card.appendChild(entryHeader(`Item ${i + 1}`, () => {
        store.update((s) => { const c = s.customSections.find((x) => x.id === customId); if (c) c.entries = c.entries.filter((e) => e.id !== entry.id); });
        history.snapshot();
      }));
      card.appendChild(textField('Text', entry.text,
        (v) => store.update((s) => { const c = s.customSections.find((x) => x.id === customId); const e = c?.entries.find((x) => x.id === entry.id); if (e) e.text = v; }),
        { textarea: true, rows: 3, limit: CHAR_LIMITS.custom }));
      list.appendChild(card);
    });
    wrap.appendChild(list);
    const add = createEl('button', { class: 'add-entry-btn' }, ['+ Add item']);
    add.addEventListener('click', () => {
      store.update((s) => { const c = s.customSections.find((x) => x.id === customId); c?.entries.push({ id: uid('cus'), text: '' }); });
      history.snapshot();
    });
    wrap.appendChild(add);
    return wrap;
  }

  // ============================================================
  // Shared helpers for card headers + updates
  // ============================================================
  function entryHeader(title, onDelete) {
    const head = createEl('div', { class: 'entry-head' });
    head.appendChild(createEl('div', { class: 'entry-title' }, [
      createEl('span', { class: 'entry-handle', title: 'Drag to reorder', html: `
        <svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\"><path fill=\"currentColor\" d=\"M8 6h2v2H8zm6 0h2v2h-2zM8 11h2v2H8zm6 0h2v2h-2zM8 16h2v2H8zm6 0h2v2h-2z\"/></svg>` }),
      title
    ]));
    const actions = createEl('div', { class: 'entry-actions' });
    const del = createEl('button', { class: 'icon-btn', title: 'Delete', type: 'button' }, [
      createEl('span', { html: '<svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\"><path fill=\"currentColor\" d=\"M9 3v1H4v2h16V4h-5V3zm-3 5v13h12V8zm3 2h2v9H9zm4 0h2v9h-2z\"/></svg>' })
    ]);
    del.addEventListener('click', onDelete);
    actions.appendChild(del);
    head.appendChild(actions);
    return head;
  }

  function updateEntry(section, id, key, value) {
    store.update((s) => {
      const item = s[section].find((x) => x.id === id);
      if (item) item[key] = value;
    });
    recordHistoryDebounced();
  }

  function deleteEntry(section, id) {
    store.update((s) => { s[section] = s[section].filter((x) => x.id !== id); });
    history.snapshot();
  }

  // ============================================================
  // Public API — subscribe to store and re-render efficiently
  // ============================================================
  function render() { renderTabs(); renderForm(); }

  store.subscribe((s) => {
    if (s.meta.activeSection !== currentSection) {
      currentSection = s.meta.activeSection;
    }
    render();
  });

  return { render };
}
