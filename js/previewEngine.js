/*
Action: file_editor create /app/ResumeForge/js/previewEngine.js --file-text "/**
 * previewEngine.js
 * -------------------------------------------------------------------------
 * Renders the resume paper on the right panel. The engine picks the
 * currently-selected template renderer, mounts its markup into #resumePage,
 * and applies typography / zoom / theme tokens.
 *
 * The engine also exposes a `highlightKeywords(list)` hook used by the
 * keyword checker to mark missing terms directly on the paper.
 * -------------------------------------------------------------------------
 */

import { qs } from './utils.js';
import { renderTemplate1 } from '../templates/template1.js';
import { renderTemplate2 } from '../templates/template2.js';
import { renderTemplate3 } from '../templates/template3.js';

const TEMPLATES = {
  template1: renderTemplate1,
  template2: renderTemplate2,
  template3: renderTemplate3
};

export function createPreviewEngine(store) {
  const stage = qs('#previewStage');
  const page = qs('#resumePage');

  function render() {
    const s = store.get();
    const tpl = TEMPLATES[s.meta.template] || renderTemplate1;

    // Reset class list preserving base
    page.className = `resume-page tpl-${s.meta.template} print-mode`;
    page.style.fontFamily = s.meta.font;

    // Delegate DOM generation to the picked template renderer.
    page.innerHTML = tpl(s);

    // Apply zoom to stage (not page — keeps A4 dimensions intact).
    stage.style.transform = `scale(${s.meta.zoom})`;
  }

  /**
   * Highlight terms on the rendered resume. Walks all text nodes inside
   * .resume-page and wraps matches in <mark class=\"r-highlight\">.
   * Called by keywordChecker.
   */
  function highlightKeywords(terms = []) {
    // Rendering re-creates all nodes, so we simply re-render then post-process.
    render();
    if (!terms.length) return;
    const escaped = terms.map((t) => t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const rx = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
    walkTextNodes(page, (node) => {
      const val = node.nodeValue;
      if (!rx.test(val)) { rx.lastIndex = 0; return; }
      rx.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0; let m;
      while ((m = rx.exec(val)) !== null) {
        frag.appendChild(document.createTextNode(val.slice(last, m.index)));
        const mark = document.createElement('mark');
        mark.className = 'r-highlight';
        mark.textContent = m[0];
        frag.appendChild(mark);
        last = m.index + m[0].length;
      }
      frag.appendChild(document.createTextNode(val.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function walkTextNodes(root, cb) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (n.parentElement.closest('mark')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(cb);
  }

  // Subscribe → re-render on any state change (fast, single innerHTML write).
  store.subscribe(render);

  // ResizeObserver keeps the zoom container centered nicely on resize.
  new ResizeObserver(() => { /* stage transform already applied; hook reserved */ }).observe(qs('#previewScroll'));

  return { render, highlightKeywords };
}
