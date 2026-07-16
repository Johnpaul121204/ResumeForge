import { downloadBlob, readFileAsText, toast, qs } from './utils.js';

const KEY = 'resumeforge:v1';
const AUTOSAVE_INTERVAL = 5000; // 5 seconds

/** Load persisted state from localStorage or return null. */
export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed) return null;
    return parsed;
  } catch (e) {
    console.warn('Failed to load state:', e);
    return null;
  }
}

/** Persist current state to localStorage. */
export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('Autosave failed:', e);
    return false;
  }
}

/** Clear all persisted data. */
export function clearState() {
  localStorage.removeItem(KEY);
}

/**
 * Attach autosave to a store. Uses both interval (guaranteed 5s) AND
 * subscribe (immediate save on change with debounced UI indicator).
 */
export function startAutoSave(store) {
  const indicator = qs('#saveIndicator');
  const setText = (t) => { const s = indicator?.querySelector('.save-text'); if (s) s.textContent = t; };

  // Periodic save every 5 seconds - matches the required \"auto save every 5s\" spec.
  setInterval(() => {
    indicator?.classList.add('saving');
    setText('Saving…');
    const ok = saveState(store.get());
    setTimeout(() => {
      indicator?.classList.remove('saving');
      indicator?.classList.toggle('error', !ok);
      setText(ok ? 'All changes saved' : 'Save failed');
    }, 350);
  }, AUTOSAVE_INTERVAL);

  // Also save immediately on every mutation so we never lose work on tab close.
  let saveTimer;
  store.subscribe(() => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveState(store.get()), 300);
  });

  // Save when the tab is about to unload.
  window.addEventListener('beforeunload', () => saveState(store.get()));
}

/** Export the current state as a downloadable JSON file. */
export function exportJSON(state) {
  const payload = { app: 'ResumeForge', version: 1, exportedAt: new Date().toISOString(), data: state };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const safeName = (state.personal?.name || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  downloadBlob(blob, `${safeName}-resumeforge.json`);
  toast('Resume exported as JSON', 'success');
}

/** Import a JSON file and replace the store state. */
export async function importJSONFile(file, store) {
  try {
    const text = await readFileAsText(file);
    const parsed = JSON.parse(text);
    const data = parsed?.data ?? parsed; // accept either shape
    if (!data || typeof data !== 'object' || !data.personal) {
      toast('That file does not look like a ResumeForge export.', 'error');
      return false;
    }
    store.replace(data);
    toast('Resume imported successfully', 'success');
    return true;
  } catch (e) {
    console.error(e);
    toast('Failed to import — invalid JSON file.', 'error');
    return false;
  }
}
