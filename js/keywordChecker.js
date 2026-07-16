/*
Action: file_editor create /app/ResumeForge/js/keywordChecker.js --file-text "/**
 * keywordChecker.js
 * -------------------------------------------------------------------------
 * Client-side keyword extraction and ATS-style match scoring.
 *
 * Approach:
 *   1. Tokenize the pasted job description, drop stopwords, prefer bigrams
 *      that appear more than once (e.g. \"machine learning\").
 *   2. Compare against the flattened text of the current resume state.
 *   3. Score = (matched / total important terms) * 100.
 *   4. Also surface suggested terms — anything present in the JD that isn't
 *      in the resume yet.
 * -------------------------------------------------------------------------
 */

import { qs, createEl, escapeHtml } from './utils.js';

const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','else','for','of','on','in','at','to','from','by','with','as',
  'is','are','was','were','be','been','being','have','has','had','do','does','did','not','no','yes','it','its',
  'this','that','these','those','you','your','yours','we','our','ours','they','them','their','theirs','i','me','my','mine',
  'so','than','too','very','can','will','just','should','would','could','also','about','into','over','under','more','most','some',
  'any','all','each','every','other','same','such','only','own','via','using','use','used','including','include','includes','etc',
  'work','experience','role','years','year','team','strong','ability','excellent','good','great','plus','level','proficient','proficiency'
]);

/** Convert a text blob into an array of normalized tokens. */
function tokenize(text) {
  return (text.toLowerCase().match(/[a-z][a-z0-9+.#/-]{1,}/g) || [])
    .filter((t) => !STOPWORDS.has(t) && t.length > 2);
}

/** Extract candidate keywords (unigrams + repeated bigrams) with weights. */
export function extractKeywords(text, limit = 40) {
  const tokens = tokenize(text);
  const uniFreq = new Map();
  for (const t of tokens) uniFreq.set(t, (uniFreq.get(t) || 0) + 1);

  // Bigrams that appear >1 time
  const biFreq = new Map();
  for (let i = 0; i < tokens.length - 1; i++) {
    const bg = `${tokens[i]} ${tokens[i + 1]}`;
    biFreq.set(bg, (biFreq.get(bg) || 0) + 1);
  }
  const bigrams = [...biFreq.entries()].filter(([, c]) => c > 1);

  // Prefer bigrams, then top unigrams
  const scored = [
    ...bigrams.map(([k, c]) => ({ term: k, score: c * 2 })),
    ...[...uniFreq.entries()].map(([k, c]) => ({ term: k, score: c }))
  ]
    .sort((a, b) => b.score - a.score);

  // De-dupe (a bigram already contains its unigrams — keep bigram, drop covered unigram if less frequent)
  const seen = new Set();
  const out = [];
  for (const it of scored) {
    if (seen.has(it.term)) continue;
    seen.add(it.term);
    out.push(it.term);
    if (out.length >= limit) break;
  }
  return out;
}

/** Build a lower-cased text blob from the resume state. */
export function flattenResumeText(state) {
  const bits = [];
  const p = state.personal;
  bits.push(p.name, p.title, p.location, p.email);
  bits.push(state.summary?.text || '');
  state.experience?.forEach((e) => bits.push(e.company, e.role, e.location, e.description));
  state.education?.forEach((e) => bits.push(e.school, e.degree, e.description));
  state.projects?.forEach((p) => bits.push(p.name, p.stack, p.description));
  state.skills?.forEach((c) => { bits.push(c.name); bits.push(...c.tags); });
  state.certifications?.forEach((c) => bits.push(c.name, c.issuer));
  state.languages?.forEach((l) => bits.push(l.name, l.level));
  state.achievements?.forEach((a) => bits.push(a.text));
  state.interests?.forEach((i) => bits.push(i.text));
  state.customSections?.forEach((cs) => { bits.push(cs.title); cs.entries.forEach((e) => bits.push(e.text)); });
  return bits.filter(Boolean).join(' ').toLowerCase();
}

/** Compute matched / missing / score against the resume. */
export function analyze(state, jd) {
  const keywords = extractKeywords(jd);
  const resumeText = flattenResumeText(state);
  const matched = [];
  const missing = [];
  for (const kw of keywords) {
    // token boundaries; escape user-provided chars
    const escaped = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    if (re.test(resumeText)) matched.push(kw);
    else missing.push(kw);
  }
  const score = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0;
  return { keywords, matched, missing, score };
}

/**
 * Wire the keyword checker drawer. Returns a function that opens it.
 */
export function attachKeywordChecker(store, preview) {
  const drawer = qs('#drawerKeyword');
  const btnOpen = qs('#btnKeywordChecker');
  const btnRun = qs('#btnRunChecker');
  const btnClear = qs('#btnClearChecker');
  const jd = qs('#jobDescription');
  const results = qs('#kwResults');

  function open() { drawer.hidden = false; }
  function close() { drawer.hidden = true; preview.highlightKeywords([]); }

  drawer.addEventListener('click', (e) => { if (e.target.matches('[data-close-drawer]')) close(); });
  btnOpen?.addEventListener('click', open);

  btnRun?.addEventListener('click', () => {
    const text = jd.value.trim();
    if (!text) { results.innerHTML = '<div class=\"kw-empty\">Paste a JD first.</div>'; return; }
    const { matched, missing, score } = analyze(store.get(), text);
    renderResults({ matched, missing, score });
    preview.highlightKeywords(missing);
  });

  btnClear?.addEventListener('click', () => {
    jd.value = '';
    results.innerHTML = '<div class=\"kw-empty\">Paste a JD and click <strong>Analyze</strong> to see your match score.</div>';
    preview.highlightKeywords([]);
  });

  function renderResults({ matched, missing, score }) {
    results.innerHTML = '';
    const ring = createEl('div', { class: 'kw-score' }, [
      createEl('div', { class: 'kw-ring', style: { '--p': score }, 'data-testid': 'kw-score-ring' }, [
        createEl('span', { text: `${score}%` })
      ]),
      createEl('div', { class: 'kw-score-body' }, [
        createEl('h3', { text: matchTitle(score) }),
        createEl('p', { text: `${matched.length} of ${matched.length + missing.length} JD keywords appear in your resume.` })
      ])
    ]);
    results.appendChild(ring);

    results.appendChild(chipBlock('Missing keywords', missing, 'missing', (kw) => {
      // Quick-add: append to first skill category
      store.update((s) => {
        const cat = s.skills[0] || { id: 'auto', name: 'Skills', tags: [] };
        if (!s.skills.length) s.skills.push(cat);
        if (!cat.tags.includes(kw)) cat.tags.push(kw);
      });
    }));
    results.appendChild(chipBlock('Present in resume', matched, 'present'));
  }

  function chipBlock(title, items, cls, onAdd) {
    const block = createEl('div', { class: 'kw-list-block' });
    block.appendChild(createEl('div', { class: 'kw-list-title', text: title }));
    if (!items.length) {
      block.appendChild(createEl('div', { class: 'kw-empty', text: 'Nothing here 🎉' }));
      return block;
    }
    const chips = createEl('div', { class: 'kw-chips' });
    for (const kw of items) {
      const chip = createEl('span', { class: `kw-chip ${cls}` }, [kw]);
      if (onAdd) {
        const add = createEl('button', { title: 'Add to skills' }, ['+']);
        add.addEventListener('click', () => { onAdd(kw); chip.style.display = 'none'; });
        chip.appendChild(add);
      }
      chips.appendChild(chip);
    }
    block.appendChild(chips);
    return block;
  }

  function matchTitle(score) {
    if (score >= 80) return 'Strong ATS match';
    if (score >= 55) return 'Solid start — a few gaps';
    if (score >= 30) return 'Needs work';
    return 'Significant gap';
  }

  return { open, close };
}
