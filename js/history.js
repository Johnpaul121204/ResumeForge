/*I noticed the undo/redo has a subtle bug — snapshots are being pushed after mutations. Let me fix that.
Action: file_editor create /app/ResumeForge/js/history.js --file-text "/**
 * history.js
 * -------------------------------------------------------------------------
 * Bounded undo/redo backed by full state snapshots.
 *
 * Rather than requiring every caller to remember \"snapshot before mutation\",
 * we auto-track history by subscribing to the store. We keep a memoized
 * \"previous state\" reference; when the store changes we push that previous
 * state onto the past stack (debounced so rapid typing coalesces into a
 * single history entry).
 *
 * The public `snapshot()` method is retained as a no-op-friendly hook for
 * callers that want to force-commit a history entry immediately (e.g. after
 * a discrete action like adding a new entry). It flushes the debounce.
 * -------------------------------------------------------------------------
 */

import { deepClone } from './utils.js';

const MAX_HISTORY = 60;
const DEBOUNCE_MS = 350;

export function createHistory(store) {
  const past = [];
  let future = [];
  let previous = deepClone(store.get());
  let suspended = false;
  let debounceTimer = null;

  /** Push the memoized \"previous\" state onto the past stack. */
  function commitPrevious() {
    past.push(previous);
    if (past.length > MAX_HISTORY) past.shift();
    future = [];
    previous = deepClone(store.get());
    emitChange();
  }

  function emitChange() {
    store.emit('history:change', { canUndo: past.length > 0, canRedo: future.length > 0 });
  }

  // Auto-record on every store change.
  store.subscribe(() => {
    if (suspended) { previous = deepClone(store.get()); return; }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(commitPrevious, DEBOUNCE_MS);
  });

  /** Force-commit any pending debounced snapshot immediately. */
  function snapshot() {
    if (suspended) return;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
      commitPrevious();
    }
  }

  function undo() {
    // Flush any pending change first so the user's most recent action is undoable.
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; commitPrevious(); }
    if (past.length === 0) return false;
    const prev = past.pop();
    future.push(deepClone(store.get()));
    suspended = true;
    store.replace(prev);
    previous = deepClone(prev);
    suspended = false;
    emitChange();
    return true;
  }

  function redo() {
    if (future.length === 0) return false;
    const next = future.pop();
    past.push(deepClone(store.get()));
    suspended = true;
    store.replace(next);
    previous = deepClone(next);
    suspended = false;
    emitChange();
    return true;
  }

  return {
    snapshot,
    undo,
    redo,
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0
  };
}
