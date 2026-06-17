# NearVar — Current State Snapshot

**Last updated:** SEP-02 complete — 2026-06-17
**Extension version:** 0.0.1
**Status:** SEP-02 complete — smoke tested on Linux, all checks passed

## What works

- Panel opens on Ctrl+Alt+E (Cmd+Alt+E on Mac)
- CSP using `webview.cspSource` — no hardcoded origins
- `escapeHtml` applied to all dynamic values (remoteName, homedir, item labels, item values, section titles)
- Context bar: execution environment (`local` or remote name) · home directory
- Welcome card with "Create nearvar.yaml" button when no config file exists
- "Create nearvar.yaml" writes template file, opens it in editor, refreshes panel
- 5 sections with hardcoded sample items: Runbooks, Bash Variables, .env Variables, AWS Profiles, Custom
- Section dividers matching locked panel section order
- Click any item → pastes value to active terminal without executing (sendText with shouldExecute=false)
- Hover → Copy button appears; Copy sends value to clipboard via extension side only
- No active terminal → creates new "NearVar" terminal with 500ms delay before sendText (shell-ready fix)
- `acquireVsCodeApi()` wired in webview; item values stored in data-value attributes (no inline onclick data)

## What is not built yet

- Variable reading (bash, .env, AWS) — SEP-04, SEP-06
- nearvar.yaml config parsing — SEP-03
- Document source indexer — SEP-05

## Active file list

| File | Purpose | Status |
|------|---------|--------|
| `package.json` | Extension manifest, keybindings, view registration | Done |
| `tsconfig.json` | TypeScript compiler config | Done |
| `src/extension.ts` | Activation — registers provider and openPanel command | Done |
| `src/panel.ts` | WebviewViewProvider — CSP, escapeHtml, context bar, welcome card, sections, paste, copy | Done |
| `src/bashReader.ts` | Bash variable reader stub | Stub only |
| `src/configReader.ts` | Config reader stub | Stub only |
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

fa0f3a3 — SEP-02: Static items and paste — 5 sections, terminal paste, clipboard copy, new-terminal delay fix

## Smoke test notes

- SEP-01 smoke test passed on Linux (2026-06-17): context bar, welcome card, config creation, auto-open in editor, panel switch, zero console errors
- SEP-02 smoke test passed on Linux (2026-06-17): all 8 checklist items verified — sections render, paste inserts without executing, Copy writes to clipboard, new-terminal path creates terminal and delays sendText 500ms
- EDH requires an open folder to test config creation flow
- `terminal.sendText` second parameter is `shouldExecute` (not `addNewLine`) in VS Code ≥ 1.100 — pass `false` to insert without executing. VS Code API docs website lags behind; canonical source is vscode.d.ts on GitHub.

## Next SEP

**SEP-03: nearvar.yaml config reader**

## Session continuity

Start every new Claude session with:
1. Read `NEARVAR_CONTEXT.md` — current state
2. Read `NEARVAR_CONVENTIONS.md` — engineering rules
3. Read the spec (`nearvar_locked_spec.docx`) only if a locked decision needs verification
