/*
Action: file_editor create /app/ResumeForge/js/pdf.js --file-text "/**
 * pdf.js
 * -------------------------------------------------------------------------
 * Exposes exportPDF() which uses window.print() with the print.css page rules.
 * A short delay ensures the preview finishes any in-flight re-render before
 * the print dialog appears, and we auto-reset zoom to 1 during printing.
 * -------------------------------------------------------------------------
 */

import { qs, toast } from './utils.js';

export function exportPDF(store) {
  const previousZoom = store.get().meta.zoom;
  // Reset zoom during print so the paper prints at 100%.
  store.update((s) => { s.meta.zoom = 1; });
  document.body.classList.add('printing');
  toast('Opening print dialog… choose “Save as PDF”.', '', 3000);
  // Small delay to allow the preview to re-render at 100% before printing.
  setTimeout(() => {
    window.print();
    // Restore zoom after print dialog closes.
    setTimeout(() => {
      store.update((s) => { s.meta.zoom = previousZoom; });
      document.body.classList.remove('printing');
    }, 200);
  }, 120);
}
