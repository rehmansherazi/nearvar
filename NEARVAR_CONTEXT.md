# NearVar — Current State Snapshot

**Last updated:** SEP-00 — 2026-06-17
**Extension version:** 0.0.1
**Status:** Scaffold complete — compile clean, no features implemented

## What works

- 14 scaffold files created (see active file list below)
- `npm run compile` passes with zero errors and zero warnings

## What is not built yet

- All features — no panel UI, no variable reading, no paste, no config

## Active file list

| File | Purpose | Status |
|------|---------|--------|
| `package.json` | Extension manifest, keybindings, view registration | Done |
| `tsconfig.json` | TypeScript compiler config | Done |
| `src/extension.ts` | Activation stub | Done |
| `src/panel.ts` | Webview stub | Done |
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

9180ae1 (HEAD -> main) — SEP-00: Project scaffold — 14 files, compile clean

## Next SEP

**SEP-01: Panel scaffold**
- Implement `resolveWebviewView` in `src/panel.ts`
- CSP meta tag using `${webview.cspSource}`
- `escapeHtml()` helper written in panel.ts
- Execution context bar
- Welcome card with "Create nearvar.yaml" button

## Session continuity

Start every new Claude session with:
1. Read `NEARVAR_CONTEXT.md` — current state
2. Read `NEARVAR_CONVENTIONS.md` — engineering rules
3. Read the spec (`nearvar_locked_spec.docx`) only if a locked decision needs verification
