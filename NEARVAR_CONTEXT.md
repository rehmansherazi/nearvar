# NearVar — Current State Snapshot

**Last updated:** SEP-01 complete — 2026-06-17
**Extension version:** 0.0.1
**Status:** SEP-01 complete — smoke tested on Linux, all checks passed

## What works

- Panel opens on Ctrl+Alt+E (Cmd+Alt+E on Mac)
- CSP using `webview.cspSource` — no hardcoded origins
- `escapeHtml` applied to all dynamic values (remoteName, homedir)
- Context bar: execution environment (`local` or remote name) · home directory
- Welcome card with "Create nearvar.yaml" button when no config file exists
- "Create nearvar.yaml" writes template file, opens it in editor, refreshes panel
- Main content placeholder shown when `nearvar.yaml` exists
- `acquireVsCodeApi()` wired in webview

## What is not built yet

- Variable reading (bash, .env, AWS) — SEP-04, SEP-06
- nearvar.yaml config parsing — SEP-03
- Click-to-paste — SEP-02
- Document source indexer — SEP-05

## Active file list

| File | Purpose | Status |
|------|---------|--------|
| `package.json` | Extension manifest, keybindings, view registration | Done |
| `tsconfig.json` | TypeScript compiler config | Done |
| `src/extension.ts` | Activation — registers provider and openPanel command | Done |
| `src/panel.ts` | WebviewViewProvider — CSP, escapeHtml, context bar, welcome card | Done |
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

83a19ab — SEP-01: Panel scaffold — CSP, escapeHtml, context bar, welcome card, config creation

## Smoke test notes

- SEP-01 smoke test passed on Linux (2026-06-17): context bar, welcome card, config creation, auto-open in editor, panel switch, zero console errors
- EDH requires an open folder to test config creation flow

## Next SEP

**SEP-02: Static items + paste**
- Hardcoded item list (at least one per section: runbooks, bash vars, .env, AWS)
- Click-to-paste using `terminal.sendText(cmd)` — no newline
- Section dividers matching locked panel section order
- Paste inserts without executing — verified on Linux

## Session continuity

Start every new Claude session with:
1. Read `NEARVAR_CONTEXT.md` — current state
2. Read `NEARVAR_CONVENTIONS.md` — engineering rules
3. Read the spec (`nearvar_locked_spec.docx`) only if a locked decision needs verification
