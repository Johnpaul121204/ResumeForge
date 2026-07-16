/*
Action: file_editor create /app/ResumeForge/js/dragdrop.js --file-text "/**
 * dragdrop.js
 * -------------------------------------------------------------------------
 * Provides two attachable behaviors:
 *   1. attachListDnD(container, store, history, key)
 *      Enables drag/drop reordering of entry cards within a section list.
 *   2. attachTabDnD(container, store, history)
 *      Enables drag/drop reordering of section tabs (excluding \"personal\"
 *      which is pinned as the first tab).
 *
 * We use the native HTML5 Drag & Drop API. To keep things simple, we
 * track the currently-dragged element via a module-level variable rather
 * than relying on dataTransfer contents (which are asynchronous and
 * restricted on many browsers during dragover).
 * -------------------------------------------------------------------------
 */

let dragEl = null;

/** Attach reorder-drag behavior to a list of `.entry-card` elements. */
export function attachListDnD(container, store, history, key) {
  container.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.entry-card');
    if (!card || !container.contains(card)) return;
    dragEl = card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires setData for drag to actually initiate.
    try { e.dataTransfer.setData('text/plain', card.dataset.id || ''); } catch (_) {}
  });

  container.addEventListener('dragover', (e) => {
    if (!dragEl) return;
    e.preventDefault();
    const after = getDragAfter(container, e.clientY);
    if (after == null) container.appendChild(dragEl);
    else container.insertBefore(dragEl, after);
  });

  container.addEventListener('dragend', () => {
    if (!dragEl) return;
    dragEl.classList.remove('dragging');
    // Commit new order to the store based on DOM order.
    const newIds = Array.from(container.querySelectorAll('.entry-card')).map((el) => el.dataset.id);
    commitOrder(store, key, newIds);
    history.snapshot();
    dragEl = null;
  });
}

function getDragAfter(container, y) {
  const cards = Array.from(container.querySelectorAll('.entry-card:not(.dragging)'));
  return cards.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function commitOrder(store, key, newIds) {
  store.update((s) => {
    if (key.startsWith('custom:')) {
      const customId = key.slice(7);
      const cs = s.customSections.find((c) => c.id === customId);
      if (!cs) return;
      cs.entries = newIds.map((id) => cs.entries.find((e) => e.id === id)).filter(Boolean);
    } else {
      const arr = s[key];
      if (!Array.isArray(arr)) return;
      s[key] = newIds.map((id) => arr.find((it) => it.id === id)).filter(Boolean);
    }
  });
}

/** Attach reordering to section tabs (Personal remains pinned first). */
export function attachTabDnD(container, store, history) {
  let dragged = null;

  container.addEventListener('dragstart', (e) => {
    const tab = e.target.closest('.section-tab');
    if (!tab || tab.dataset.pinned === '1') { e.preventDefault(); return; }
    dragged = tab;
    tab.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', tab.dataset.sectionId); } catch (_) {}
  });

  container.addEventListener('dragover', (e) => {
    if (!dragged) return;
    e.preventDefault();
    const target = e.target.closest('.section-tab');
    if (!target || target === dragged || target.dataset.pinned === '1') return;
    const rect = target.getBoundingClientRect();
    const after = (e.clientX - rect.left) > rect.width / 2;
    target.parentNode.insertBefore(dragged, after ? target.nextSibling : target);
  });

  container.addEventListener('dragend', () => {
    if (!dragged) return;
    dragged.classList.remove('dragging');
    // Persist new order (excluding pinned + custom which map to sectionOrder).
    const order = Array.from(container.querySelectorAll('.section-tab'))
      .filter((t) => t.dataset.pinned !== '1' && !t.dataset.sectionId.startsWith('custom:'))
      .map((t) => t.dataset.sectionId);
    store.update((s) => { s.meta.sectionOrder = order; });
    history.snapshot();
    dragged = null;
  });
}
