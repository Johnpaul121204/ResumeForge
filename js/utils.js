/*Now creating the JavaScript modules and templates in parallel.
Action: file_editor create /app/ResumeForge/js/utils.js --file-text "/**
 * utils.js
 * -------------------------------------------------------------------------
 * Small collection of pure utility helpers used across the app.
 * Exports:
 *   - uid(prefix)      : Generate short unique ids.
 *   - debounce(fn, ms) : Trailing-edge debounce for high-frequency events.
 *   - throttle(fn, ms) : Leading-edge throttle.
 *   - escapeHtml(str)  : Escape user input before injecting into HTML.
 *   - clamp(n, a, b)   : Numeric clamp.
 *   - deepClone(obj)   : Structured deep clone using JSON round-trip.
 *   - qs / qsa         : DOM selection shortcuts.
 *   - createEl(tag,…)  : Terse element factory.
 *   - toast(msg, type) : Push a transient toast notification.
 *   - downloadBlob     : Trigger a browser file download for arbitrary Blob.
 *   - readFileAsText   : Promise wrapper over FileReader.
 * -------------------------------------------------------------------------
 */

/** Generate a compact unique id (used for entries, sections). */
export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Trailing-edge debounce. Useful for autosave, input handling. */
export function debounce(fn, wait = 200) {
  let t;
  const debounced = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), wait);
  };
  debounced.cancel = () => clearTimeout(t);
  return debounced;
}

/** Leading-edge throttle. */
export function throttle(fn, wait = 100) {
  let last = 0;
  let timer = null;
  return (...args) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      last = now;
      fn.apply(null, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(null, args);
      }, remaining);
    }
  };
}

/** Escape HTML-sensitive characters before inserting into the DOM. */
export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Convert a URL string into a nicely-truncated display label. */
export function displayUrl(url = '') {
  if (!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

/** Clamp a number between two bounds. */
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/** JSON-round-trip deep clone. Sufficient for our plain-object state. */
export const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/** querySelector shortcut. */
export const qs = (sel, ctx = document) => ctx.querySelector(sel);
/** querySelectorAll → array shortcut. */
export const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/**
 * createEl(tag, attrs, children)
 * Concise element factory. Handles: className, dataset, event listeners,
 * boolean attributes, and children (nodes / strings).
 */
export function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class' || k === 'className') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  const list = Array.isArray(children) ? children : [children];
  for (const c of list) {
    if (c == null || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Push a transient toast. type ∈ {\"\", \"success\", \"error\", \"warn\"}. */
export function toast(message, type = '', timeout = 2400) {
  const stack = qs('#toastStack');
  if (!stack) return;
  const el = createEl('div', { class: `toast ${type}`, role: 'status' }, [message]);
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 240ms ease, transform 240ms ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => el.remove(), 240);
  }, timeout);
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = createEl('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Read a File as text using a promisified FileReader. */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

/** Read a File as a base64 dataURL. */
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** Format an ISO/`YYYY-MM` date into a short \"Mon YYYY\" display. */
export function formatMonthYear(value) {
  if (!value) return '';
  const [y, m] = value.split('-');
  if (!y) return value;
  if (!m) return y;
  const dt = new Date(Number(y), Number(m) - 1, 1);
  if (isNaN(dt)) return value;
  return dt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}
