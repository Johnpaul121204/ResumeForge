
Action: file_editor create /app/ResumeForge/README.md --file-text "# ResumeForge — Visual Resume Builder

**ResumeForge** is a premium, zero-dependency resume builder that runs entirely in the browser. Build a professional, ATS-friendly resume with a live A4 preview, three carefully-designed templates, drag-and-drop reordering, a JD keyword checker, and instant PDF export — all with vanilla HTML, CSS, and modern JavaScript.

> Open `index.html` in any modern browser (or use VS Code **Live Server**). No build step, no backend, no framework.

---

## ✨ Features

- **Split-screen live preview** — every keystroke updates the A4 paper on the right.
- **Personal details** with photo upload (stored locally as base64).
- **Unlimited entries** for Experience, Education, Projects, Certifications, Languages, Achievements, Interests.
- **Dynamic skill tags** with categories, filter/search, and add-on-Enter interactions.
- **Custom sections** — create any section you like, reorder freely.
- **Drag & drop reordering** of both entries and top-level sections.
- **Auto-save** every 5 seconds to `localStorage` + save on unload + on every edit (debounced).
- **Undo / Redo** with a 60-step history stack.
- **Import / Export JSON** — take your data anywhere.
- **Keyword Checker** — paste a job description, get a match score, missing keywords, and one-click additions.
- **Three ATS-safe templates**: Aurora (modern), Meridian (classic), Nova (sidebar).
- **Theme switcher** (light / dark), **font selector**, **zoom**, **mobile preview**, **section show/hide**.
- **Keyboard shortcuts**: `Ctrl/Cmd + S` save · `Ctrl + Z` undo · `Ctrl + Shift + Z` redo · `Ctrl + P` export PDF.
- **Perfect A4 print CSS** with page-break safeguards.
- **Character counters** with warning and over-limit states.
- **Fully responsive**: desktop, laptop, tablet, mobile.

---

## 📸 Screenshots

> _Add your screenshots to `assets/` and reference them here._

| Builder view | Preview + Templates | Keyword checker |
|---|---|---|
| `assets/screenshot-builder.png` | `assets/screenshot-preview.png` | `assets/screenshot-checker.png` |

---

## 🚀 Installation

```bash
# 1. Clone / copy the folder anywhere
git clone <this-repo> ResumeForge

# 2. Open with either:
#    a. Just double-click index.html, OR
#    b. Right-click index.html → \"Open with Live Server\" in VS Code
```

Because everything is client-side and uses ES modules, the app must be served over `http://` (or `file://` in browsers that permit ES module loading for local files). VS Code Live Server is the simplest path. Any static server works — e.g. `python3 -m http.server 8080`.

---

## 📂 Folder structure

```
ResumeForge/
├── index.html
├── css/
│   ├── builder.css       # Layout, header, form panel, buttons, drawer, toasts
│   ├── preview.css       # Resume paper, typography, template variants
│   ├── theme.css         # Design tokens (light + dark theme)
│   ├── print.css         # Perfect A4 print / PDF export
│   └── responsive.css    # Laptop / tablet / mobile breakpoints
├── js/
│   ├── main.js           # App entry point — wires everything together
│   ├── state.js          # Central store + default seed data
│   ├── formEngine.js     # Renders the left-side editor
│   ├── previewEngine.js  # Renders the right-side A4 paper
│   ├── storage.js        # LocalStorage autosave + JSON import/export
│   ├── dragdrop.js       # HTML5 DnD for entries + section tabs
│   ├── pdf.js            # Print / PDF export via window.print()
│   ├── keywordChecker.js # ATS-style JD keyword extraction & scoring
│   ├── history.js        # Undo / Redo snapshot stack
│   └── utils.js          # DOM helpers, toasts, debounce, escaping…
├── templates/
│   ├── template1.js      # \"Aurora\" — modern editorial
│   ├── template2.js      # \"Meridian\" — ATS classic
│   └── template3.js      # \"Nova\" — compact sidebar
├── assets/
│   ├── icons/            # Optional SVG assets (currently inline)
│   └── fonts/            # Optional local fonts
└── README.md
```

---

## 🧪 Technologies

- HTML5 semantic structure
- CSS3 (custom properties, grid, flex, container-aware responsive design, print rules)
- Vanilla JavaScript (ES Modules, classes, closures, factory functions, template literals, destructuring, spread, array methods)
- Web APIs used: LocalStorage, File API, FileReader, Drag & Drop API, Clipboard API (used via native `document.execCommand` where needed), Intersection Observer, Resize Observer, Mutation Observer

---

## 💾 Data model

The full app state persists as a single JSON object under the key `resumeforge:v1`. Exported files carry a small envelope:

```json
{
  \"app\": \"ResumeForge\",
  \"version\": 1,
  \"exportedAt\": \"2026-02-15T10:22:00.000Z\",
  \"data\": { \"meta\": { ... }, \"personal\": { ... }, \"experience\": [ ... ], ... }
}
```

Importing accepts either the envelope shape or a bare state object.

---

## 🔎 Keyword checker

The checker tokenizes the pasted JD, drops stopwords, favors repeated bigrams (e.g. \"product roadmap\"), and compares against a flattened resume text blob. It reports:

- A **match percentage**.
- **Missing keywords** you can add to your resume with one click (auto-appended to the first skill category).
- **Present keywords** currently in your resume.
- **Inline highlights** on the preview paper for missing terms.

---

## 🗺️ Future improvements

- Additional templates (single-column classic, two-column executive, creative gradient).
- Cover letter builder that shares the same personal data.
- Multi-page pagination hints on the preview.
- Cloud sync via optional Firestore / Supabase adapter.
- Locale support for date formats and section title translations.
- AI rewrite (\"make this experience more impactful\") using an optional API key you provide.

---

## 📜 License

MIT © 2026 ResumeForge. Free for personal and commercial use.
"
Observation: Create successful: /app/ResumeForge/README.md