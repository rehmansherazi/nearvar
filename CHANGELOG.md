# Changelog

All changes to NearVar are documented here. Entries are append-only — existing entries are never edited.

Format: `## [version] — SEP-XX: Name — YYYY-MM-DD`

---

## [0.2.11] — feat: custom named sections + runbook grouping by source file — 2026-06-28

**Named sections (`sections:` key):**

`nearvar.yaml` now supports a top-level `sections:` key for defining fully custom collapsible sections alongside the standard source sections. Schema: array of `{ name, collapsed?, commands: [{label, value}] }`.

Each section is independently collapsible in the panel. Collapse state is controlled by the per-section `collapsed: true` field in the YAML, or by adding the section name to `ui.collapsed`. Empty sections (no valid commands) are hidden automatically.

Backward compatibility: the existing `custom:` flat key still works and renders as a "Custom" section.

Example:
```yaml
sections:
  - name: Deploy
    commands:
      - label: Deploy to staging
        value: ./deploy.sh staging
  - name: Database
    collapsed: true
    commands:
      - label: Connect to prod DB
        value: psql $DATABASE_URL
```

**Runbook grouping by source file:**

When `sources.runbooks` resolves blocks from more than one markdown file, the Runbooks section now groups items under a collapsible sub-header per file. The sub-header shows the filename; hovering shows the full absolute path. Click the sub-header to collapse/expand that file's commands. When only a single markdown file is in scope, the flat list is shown as before (no grouping header).

The `· filename` suffix previously shown on each runbook item label has been removed — that information is now conveyed by the file group header.

Search/filter continues to work across all items regardless of grouping. Typing a query forces all file groups to expand; clearing restores the pre-filter state.

---

## [0.0.1] — SEP-01: Panel Scaffold — 2026-06-17

Implemented `resolveWebviewView` in `src/panel.ts`. Delivers: CSP with `webview.cspSource`, `escapeHtml` helper, context bar (execution environment + home directory), welcome card with "Create nearvar.yaml" button, `acquireVsCodeApi()` wired. Panel opens on Ctrl+Alt+E / Cmd+Alt+E.

Smoke test: `npm run compile` — zero errors, zero warnings. Panel opens, renders, closes cleanly on Linux.

---

## [0.0.1] — SEP-00: Project Scaffold — 2026-06-17

Files created: package.json, tsconfig.json, src/extension.ts, src/panel.ts, src/bashReader.ts, src/configReader.ts, .vscodeignore, README.md, CHANGELOG.md, ROADMAP.md, NEARVAR_CONVENTIONS.md, NEARVAR_CONTEXT.md, NEARVAR_DECISIONS.md, NEARVAR_ENVIRONMENT.md

Smoke test: `npm run compile` — zero errors, zero warnings.

---

## [0.2.10] — fix: CUSTOM section no longer shows hardcoded demo data — 2026-06-28

The CUSTOM section was always rendered with a hardcoded "Running containers / docker ps -a" entry regardless of whether `custom:` was present in `nearvar.yaml`. Fixed: `custom:` is now a parsed top-level key in `NearVarConfig` (array of `{label, value}` objects). The CUSTOM section and its preceding divider are only rendered when `custom:` is present in `nearvar.yaml` and contains at least one valid entry. When `custom:` is absent or empty the section is hidden entirely. `CustomEntry` is exported from `configReader.ts`. In merged (home + workspace) mode, custom entries are concatenated.

---

## [0.2.9] — security: auto-mask sensitive bash variable values by name pattern — 2026-06-28

Bash variable values matching sensitive name patterns are now automatically masked in the panel (displayed as `••••••••`). Masking is display-only — the actual value is still available for paste/copy. Masked variable names remain searchable; masked values are excluded from the search index.

Masked patterns: `TOKEN`, `SECRET`, `KEY`, `PASSWORD`/`PASSWD`/`PWD`, `CREDENTIAL`/`CRED`, `AUTH` (with exceptions), `PRIVATE`, `CERT`, `LICENSE`, `SIGNATURE`, `DSN`, `CONNECTION_STRING`/`CONN_STR`, `P12`, `PFX`, `PEM`. Database connection URLs are also masked when the name contains `URL` or `URI` alongside a database prefix (`DATABASE`, `MONGO`, `REDIS`, `MYSQL`, `POSTGRES`, `JDBC`, `ORACLE`, `ELASTICSEARCH`, etc.).

`AUTH` exception: variables ending in `_TYPE`, `_METHOD`, `_SCHEME`, `_MODE`, or `_STRATEGY` are not masked even if they contain `AUTH` (e.g. `JIRA_AUTH_TYPE` is shown plain).

`isSensitive(name: string): boolean` is exported from `bashReader.ts` for reuse by future readers.

---

## [0.2.8] — fix: bashReader reads all bash startup files on all platforms — 2026-06-27

`readBashVars()` previously read only `.bash_profile` on macOS and `.bashrc` on Linux. Now reads all three files on every platform — `.bashrc`, `.bash_profile`, `.bash_login` — skipping files that don't exist. Results are merged with deduplication: if the same variable name appears in multiple files, the later file wins. This captures exports from Homebrew users who keep their exports in `~/.bashrc` on macOS, and from Linux users who also have `~/.bash_profile`.

---

## [0.2.7] — feat: multi-root resilience + home directory support (full) — 2026-06-27

Completes multi-root workspace resilience and home directory support across six fixes:

**FIX 1 — Scan all workspace folders:** `_resolveFolder()` checks every `workspaceFolders` entry for `nearvar.yaml`. Exactly one match → silent selection. Multiple matches → quick-pick. `_loadActiveConfig()` checks `~/nearvar.yaml` in addition to workspace config; merges both when both exist (home as base, workspace as override — runbooks/env concatenated, bash/aws OR'd).

**FIX 2 — Create follows active editor:** "Create nearvar.yaml" targets the workspace folder of the currently open file (`vscode.window.activeTextEditor`). Falls back to `workspaceFolders[0]`, then `os.homedir()`. Opens existing file instead of overwriting.

**FIX 3 — Path hint on welcome card:** Two-button welcome card — "Create ~/nearvar.yaml" (primary, yellow recommended hint) + "Create in workspace" (secondary, live path hint). Workspace path hint updates in real time on `onDidChangeActiveTextEditor` via postMessage.

**FIX 4 — No workspace folder open:** When `workspaceFolders` is empty/undefined and no `~/nearvar.yaml` exists, NearVar shows a "No folder open" card and automatically loads bash variables and AWS profiles below it — no config needed. Context bar shows `local · no folder`.

**FIX 5a — Workspace folder changes at runtime:** `onDidChangeWorkspaceFolders` listener re-runs folder scan, updates yaml watcher, and refreshes panel. No window reload required.

**FIX 5b — yaml deleted at runtime:** When watched `nearvar.yaml` (workspace or home) is deleted, panel shows a `nearvar.yaml was moved or deleted` banner at the top of the welcome card. Banner clears automatically when a config is found again.

**FIX 5c — All folders removed at runtime:** Falls through FIX 5a → FIX 4 terminal-only state automatically.

**FIX 6 — Context bar source labels:** `local · ~` (home only), `local · /path` (workspace only), `local · ~ + workspace` (merged), `local · no folder` (no workspace and no home yaml).

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
