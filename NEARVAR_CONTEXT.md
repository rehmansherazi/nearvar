# NearVar — Current State Snapshot

**Last updated:** SEP-05b+SEP-06-prep schema update complete — 2026-06-18
**Extension version:** 0.0.1
**Status:** Frontmatter opt-in dropped; new runbooks schema (recursive/exclude/shorthand) smoke tested on Linux, all 9 steps passed. awsReader.ts written, not yet smoke tested.

## What works

- Panel opens on Ctrl+Alt+E (Cmd+Alt+E on Mac)
- CSP using `webview.cspSource` — no hardcoded origins
- `escapeHtml` applied to all dynamic values (remoteName, homedir, item labels, item values, section titles)
- Context bar: execution environment (`local` or remote name) · home directory
- Welcome card with "Create nearvar.yaml" button when no config file exists
- "Create nearvar.yaml" writes template file, opens it in editor, refreshes panel
- Section dividers matching locked panel section order
- Click any item → pastes value to active terminal without executing (sendText with shouldExecute=false)
- Hover → Copy button appears; Copy sends value to clipboard via extension side only
- No active terminal → creates new "NearVar" terminal with 500ms delay before sendText (shell-ready fix)
- `acquireVsCodeApi()` wired in webview; item values stored in data-value attributes (no inline onclick data)
- nearvar.yaml loaded via js-yaml on every panel render; 512 KB size guard
- `_yamlWatcher` (permanent) reloads panel on nearvar.yaml create/change/delete
- Validation: YAML parse failure, wrong top-level type, and `sources` non-mapping → error card; missing `sources` key silently coerces to safe defaults (runbooks: [], bash: false, env: [], aws: false)
- Error card rendered, no sections, when config is invalid
- `readBashVars()` reads `~/.bashrc` (Linux/WSL) or `~/.bash_profile` (macOS); parses `export VAR=value`; 512 KB guard; returns `[]` on any error
- `readEnvFile()` reads workspace-relative `.env` files; parses `VAR=value`; same guards
- Variables with `$()` in value shown with `⚠ dynamic` badge; clicking pastes `$VAR_NAME`; value never shown
- Bash and .env sections hidden entirely when source disabled or returns no vars
- `readDocSources()` indexes fenced bash blocks from `.md` files in `sources.runbooks`
- Folder sources: recursive `.md` scan (no frontmatter gate), `relPath` relative to source folder
- File sources: indexed directly
- `recursive: false` limits scan to top-level `.md` files only (no subfolder traversal)
- `exclude` patterns (glob, minimatch) matched against relPath from source root; case-sensitive
- String shorthand in `sources.runbooks` expands to `{ path, recursive: true, exclude: [] }`
- CRLF normalised; 512 KB guard per file; blocks with no preceding heading skipped silently
- Single-line blocks → normal item; multi-line blocks → collapsible group (▶/▼ toggle), each line independently pasteable
- Relative path shown as `· filename.md` on items; absolute path in hover tooltip (title attr)
- Inaccessible source → inline `⚠` error badge, rest of panel renders
- `_docWatchers[]` rebuilt on every refresh — per-source FileSystemWatcher auto-reloads panel on `.md` change
- Runbooks section hidden when `runbooks: []` or all sources return no blocks

## What is not built yet

- AWS profile reading panel integration — SEP-06 smoke test pending (awsReader.ts is written)

## Active file list

| File | Purpose | Status |
|------|---------|--------|
| `package.json` | Extension manifest, keybindings, view registration | Done |
| `tsconfig.json` | TypeScript compiler config | Done |
| `src/extension.ts` | Activation — registers provider and openPanel command | Done |
| `src/panel.ts` | WebviewViewProvider — CSP, escapeHtml, context bar, welcome card, sections, paste, copy, doc groups | Done |
| `src/bashReader.ts` | Bash + .env variable reader — export/VAR=value parsing, quote strip, dynamic badge, 512 KB guard | Done |
| `src/configReader.ts` | Config reader — js-yaml parse, RunbookEntry type, toRunbookArray(), size guard, validation | Done |
| `src/docReader.ts` | Document source indexer — fenced block extraction, no frontmatter gate, recursive/exclude via minimatch | Done |
| `src/awsReader.ts` | AWS profile reader — INI parser, ~/.aws/config + credentials, credential values never stored | Written, not smoke tested |
| `.vscodeignore` | Package exclusions | Done |
| `images/icon.svg` | Activity bar icon | Done |
| `README.md` | Public documentation | Done |
| `CHANGELOG.md` | Change log | Done |
| `ROADMAP.md` | SEP plan | Done |
| `NEARVAR_CONVENTIONS.md` | Engineering bible | Done |
| `NEARVAR_CONTEXT.md` | This file | Done |
| `NEARVAR_DECISIONS.md` | Decision log | Done |
| `NEARVAR_ENVIRONMENT.md` | Platform setup | Done |

## Last commit

904b1e8 — SEP-05b+SEP-06-prep: drop frontmatter, add recursive/exclude/shorthand schema, minimatch

## Smoke test notes

- SEP-01 smoke test passed on Linux (2026-06-17): context bar, welcome card, config creation, auto-open in editor, panel switch, zero console errors
- SEP-02 smoke test passed on Linux (2026-06-17): all 8 checklist items verified — sections render, paste inserts without executing, Copy writes to clipboard, new-terminal path creates terminal and delays sendText 500ms
- SEP-03 smoke test passed on Linux (2026-06-17): all 10 steps verified — config load, error card, FileSystemWatcher auto-reload, missing sources key silently coerces to defaults (no error card)
- SEP-04 smoke test passed on Linux (2026-06-17): all 8 checklist items verified — real bash vars from ~/.bashrc, dynamic badge + $VAR_NAME paste, empty section hiding, missing .env silent handling, full SEP-02/03 regression passed
- SEP-05 smoke test passed on Linux (2026-06-17): all 12 checklist items verified — frontmatter gate, untitled block skipping, multi-line collapsible groups, inline error badges, FileSystemWatcher auto-reload, full SEP-02/03/04 regression passed
- SEP-05b schema update smoke test passed on Linux (2026-06-18): all 9 steps verified — frontmatter removal, string shorthand, recursive: false, exclude glob patterns via minimatch, error badge on missing path
- EDH requires an open folder to test config creation flow
- `terminal.sendText` second parameter is `shouldExecute` (not `addNewLine`) in VS Code ≥ 1.100 — pass `false` to insert without executing. VS Code API docs website lags behind; canonical source is vscode.d.ts on GitHub.
- Missing `sources` key in nearvar.yaml is forgiving — coerces to empty defaults, no error card. Only parse failure, wrong top-level type, or `sources` being a non-mapping shows the error card.

## Next SEP

**SEP-06: AWS + cloud profiles**

## Session continuity

Start every new Claude session with:
1. Read `NEARVAR_CONTEXT.md` — current state
2. Read `NEARVAR_CONVENTIONS.md` — engineering rules
3. Read the spec (`nearvar_locked_spec.docx`) only if a locked decision needs verification
