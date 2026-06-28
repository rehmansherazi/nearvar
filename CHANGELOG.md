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

---

## [0.2.6] — feat: home directory nearvar.yaml support — works across all projects — 2026-06-27

NearVar now checks `~/nearvar.yaml` in addition to workspace-folder configs, so a single home-directory config works across every project without per-workspace setup.

**Config resolution priority:**
1. Home only (`~/nearvar.yaml` exists, no workspace config) → loads home config; context bar shows `local · ~`
2. Workspace only (workspace `nearvar.yaml` exists, no home config) → loads workspace config; context bar shows `local · /path/to/workspace`
3. Both exist → deep-merges (home as base, workspace as override): runbooks concatenated, bash/aws OR'd, env concatenated, workspace `ui` wins; context bar shows `local · ~ + workspace`
4. Neither exists → welcome card

**Path pre-resolution:** home-config runbook and env paths are resolved to absolute at load time so relative paths in a home config work correctly when merged with a workspace config.

**Welcome card redesign:** "Create ~/nearvar.yaml" is now the primary button (recommended — works across all projects). "Create in workspace" is a secondary option. Workspace target hint updates live as the active editor changes.

**File watching:** `~/nearvar.yaml` is now watched for create/change/delete, so the panel refreshes automatically when the home config is edited.

---

## [0.2.5] — fix: multi-root workspace — scan all folders, follow active editor for create — 2026-06-27

Multi-root workspace support across three areas:

**Folder resolution on panel open**: scans all `workspaceFolders` for `nearvar.yaml`. Exactly one match → uses it silently. Multiple matches → quick-pick lets user choose. No match → falls back to `workspaceFolders[0]` and shows welcome card.

**Active-editor-aware create**: "Create nearvar.yaml" button now targets the workspace folder of the currently active editor (falls back to `workspaceFolders[0]` if no editor is open). If `nearvar.yaml` already exists in that folder, opens it instead of overwriting. After creation, NearVar switches its active folder to match.

**Switch Workspace Folder command**: new `NearVar: Switch Workspace Folder` command (Command Palette) shows a quick-pick of all workspace folders at any time, letting users switch which folder NearVar reads from without reloading the window.

**Welcome card hint**: below the "Create nearvar.yaml" button, a muted-yellow line shows exactly where the file will land. Updates in real time as the active editor changes (via `postMessage` from extension → webview on `onDidChangeActiveTextEditor`). Hint disappears once a `nearvar.yaml` is found and the panel is populated.

---

## [0.2.0] — SEP-08: Panel search/filter and collapsible sections — 2026-06-21

Added live search/filter bar (below context bar, above sections, visible only when config is valid). 150ms debounce, client-side substring match on `data-search-terms` attributes. Filter scope per section type: runbook label + command value; bash var name + value (dynamic: name only); .env var name only (value intentionally excluded — "not a secrets manager" promise); AWS profile name + region; custom item label + value. Sections with no matching items hide their entire wrapper. Clearing filter restores the pre-filter panel state.

Added collapsible sections with config-driven defaults. New optional `ui.collapsed` key in nearvar.yaml accepts a list of section identifiers (`runbooks`, `bash`, `env`, `aws`, `custom`). Unknown identifiers silently ignored. Chevron (▶/▼) always visible in section headers; click to toggle in the current session. Filter "peek-through": typing a query snapshots and forces all `section-items` visible so matches inside collapsed sections appear (chevron stays ▶). Clearing filter restores the exact pre-filter collapse state from the snapshot — no chevron changes, no data-collapsed-default read. Panel refresh resets all sections to config defaults. "Create nearvar.yaml" template now includes a `ui:` block with inline comments.

Smoke test: all scenarios confirmed on Linux. Full regression of SEP-01 through SEP-07 passed.
