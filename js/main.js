/*
Action: file_editor create /app/ResumeForge/js/main.js --file-text "/**
 * main.js
 * -------------------------------------------------------------------------
 * Application entry point. Wires all modules together:
 *   - Loads persisted state (or seeds a default example resume)
 *   - Creates the store + history + form + preview + keyword checker
 *   - Registers global toolbar handlers, keyboard shortcuts, theme toggle,
 *     import/export, zoom, and mobile preview.
 * -------------------------------------------------------------------------
 */

import { createStore, createDefaultState } from './state.js';
import { createHistory } from './history.js';
import { createFormEngine } from './formEngine.js';
import { createPreviewEngine } from './previewEngine.js';
import { loadState, saveState, startAutoSave, exportJSON, importJSONFile } from './storage.js';
import { attachKeywordChecker } from './keywordChecker.js';
import { exportPDF } from './pdf.js';
import { qs, clamp, uid, toast } from './utils.js';

// -------------------- Bootstrap state --------------------
const initial = loadState() || createDefaultState();
const store = createStore(initial);
const history = createHistory(store);

// Store rehydration might miss new keys — merge with default shape to be safe.
store.update((s) => {
  const def = createDefaultState();
  s.meta = { ...def.meta, ...s.meta };
  for (const k of Object.keys(def)) if (!(k in s)) s[k] = def[k];
});

// -------------------- Engines --------------------
const preview = createPreviewEngine(store);
const form = createFormEngine(store, history);
const keyword = attachKeywordChecker(store, preview);

// First paint
form.render();
preview.render();

// -------------------- Autosave --------------------
startAutoSave(store);

// -------------------- Theme --------------------
const themePref = localStorage.getItem('rf-theme');
if (themePref === 'dark') document.documentElement.dataset.theme = 'dark';
qs('#btnTheme').addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  localStorage.setItem('rf-theme', isDark ? 'light' : 'dark');
});

// -------------------- Toolbar: undo/redo --------------------
qs('#btnUndo').addEventListener('click', () => { if (!history.undo()) toast('Nothing to undo', 'warn'); });
qs('#btnRedo').addEventListener('click', () => { if (!history.redo()) toast('Nothing to redo', 'warn'); });

// -------------------- Toolbar: template + font --------------------
const templateSelect = qs('#templateSelect');
const fontSelect = qs('#fontSelect');
templateSelect.value = store.get().meta.template;
fontSelect.value = store.get().meta.font;
templateSelect.addEventListener('change', () => {
  store.update((s) => { s.meta.template = templateSelect.value; });
  history.snapshot();
});
fontSelect.addEventListener('change', () => {
  store.update((s) => { s.meta.font = fontSelect.value; });
  history.snapshot();
});

// Sync selects if state changes via undo/redo/import.
store.subscribe((s) => {
  if (templateSelect.value !== s.meta.template) templateSelect.value = s.meta.template;
  if (fontSelect.value !== s.meta.font) fontSelect.value = s.meta.font;
});

// -------------------- Import / Export --------------------
const fileImport = qs('#fileImport');
qs('#btnImport').addEventListener('click', () => fileImport.click());
fileImport.addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (f) { await importJSONFile(f, store); history.snapshot(); }
  fileImport.value = '';
});
qs('#btnExportJSON').addEventListener('click', () => exportJSON(store.get()));
qs('#btnExportPDF').addEventListener('click', () => exportPDF(store));

// -------------------- Zoom --------------------
const zoomValue = qs('#zoomValue');
function setZoom(z) {
  const v = clamp(Number(z.toFixed(2)), 0.5, 1.5);
  store.update((s) => { s.meta.zoom = v; });
  zoomValue.textContent = `${Math.round(v * 100)}%`;
}
qs('#btnZoomIn').addEventListener('click',  () => setZoom(store.get().meta.zoom + 0.1));
qs('#btnZoomOut').addEventListener('click', () => setZoom(store.get().meta.zoom - 0.1));
qs('#btnZoomReset').addEventListener('click', () => setZoom(1));
zoomValue.textContent = `${Math.round((store.get().meta.zoom || 1) * 100)}%`;
store.subscribe((s) => { zoomValue.textContent = `${Math.round((s.meta.zoom || 1) * 100)}%`; });

// -------------------- Mobile preview toggle --------------------
qs('#btnMobilePreview').addEventListener('click', () => {
  document.body.classList.toggle('mobile-preview');
});

// -------------------- Custom section --------------------
qs('#btnAddCustom').addEventListener('click', () => {
  const id = uid('cus');
  store.update((s) => {
    s.customSections.push({ id, title: 'Custom section', entries: [{ id: uid('cus'), text: '' }] });
    s.meta.activeSection = `custom:${id}`;
  });
  history.snapshot();
});

// -------------------- Keyboard shortcuts --------------------
document.addEventListener('keydown', (e) => {
  const meta = e.ctrlKey || e.metaKey;
  if (!meta) return;
  const k = e.key.toLowerCase();
  if (k === 's') { e.preventDefault(); saveState(store.get()); toast('Saved locally', 'success', 1200); }
  else if (k === 'z' && !e.shiftKey) { e.preventDefault(); history.undo(); }
  else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); history.redo(); }
  else if (k === 'p') { e.preventDefault(); exportPDF(store); }
});

// -------------------- Enable/disable undo/redo buttons --------------------
function reflectHistory() {
  qs('#btnUndo').disabled = !history.canUndo();
  qs('#btnRedo').disabled = !history.canRedo();
}
store.on('history:change', reflectHistory);
reflectHistory();

// -------------------- Intersection observer: subtle fade for tabs on scroll --------------------
const io = new IntersectionObserver((entries) => {
  for (const e of entries) e.target.style.opacity = e.isIntersecting ? '1' : '0.6';
});
document.querySelectorAll('.section-tab').forEach((t) => io.observe(t));

// -------------------- MutationObserver: re-observe on tab re-render --------------------
const tabsEl = qs('#sectionTabs');
new MutationObserver(() => tabsEl.querySelectorAll('.section-tab').forEach((t) => io.observe(t))).observe(tabsEl, { childList: true });

// -------------------- Console welcome --------------------
console.log(
  '%cResumeForge%c — press Ctrl/Cmd+P to export as PDF · Ctrl+Z / Ctrl+Shift+Z to undo/redo',
  'background:#0b1a2b;color:#f5c96b;padding:2px 6px;border-radius:4px;font-weight:700',
  'color:#64748b'
);
