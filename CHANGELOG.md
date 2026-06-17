# Changelog

All changes to NearVar are documented here. Entries are append-only — existing entries are never edited.

Format: `## [version] — SEP-XX: Name — YYYY-MM-DD`

---

## [0.0.1] — SEP-01: Panel Scaffold — 2026-06-17

Implemented `resolveWebviewView` in `src/panel.ts`. Delivers: CSP with `webview.cspSource`, `escapeHtml` helper, context bar (execution environment + home directory), welcome card with "Create nearvar.yaml" button, `acquireVsCodeApi()` wired. Panel opens on Ctrl+Alt+E / Cmd+Alt+E.

Smoke test: `npm run compile` — zero errors, zero warnings. Panel opens, renders, closes cleanly on Linux.

---

## [0.0.1] — SEP-00: Project Scaffold — 2026-06-17

Files created: package.json, tsconfig.json, src/extension.ts, src/panel.ts, src/bashReader.ts, src/configReader.ts, .vscodeignore, README.md, CHANGELOG.md, ROADMAP.md, NEARVAR_CONVENTIONS.md, NEARVAR_CONTEXT.md, NEARVAR_DECISIONS.md, NEARVAR_ENVIRONMENT.md

Smoke test: `npm run compile` — zero errors, zero warnings.
