# NearVar — SEP Roadmap

## Active SEP plan

| SEP | Name | Status | Delivers |
|-----|------|--------|----------|
| SEP-00 | Project scaffold | ✅ done | package.json, tsconfig, empty src files, all 7 doc files, compile clean |
| SEP-01 | Panel scaffold | ✅ done | Webview opens, CSP + escapeHtml from day one, context bar, welcome card |
| SEP-02 | Static items + paste | ✅ done | Hardcoded items, click-to-paste (insert without execute), all platforms |
| SEP-03 | nearvar.yaml config reader | ⬜ planned | Read config, validate, auto-reload on change, welcome card on first run |
| SEP-04 | Bash + .env variable reader | ⬜ planned | Parse ~/.bashrc, ~/.bash_profile, .env files, dynamic badge for $() |
| SEP-05 | Document source indexer | ⬜ planned | Index fenced bash blocks from markdown, frontmatter opt-in, file watcher |
| SEP-06 | AWS + cloud profiles | ⬜ planned | Read ~/.aws/config, display profiles and regions, cross-platform paths |
| SEP-07 | Editor CodeLens (inline) | ⬜ v2 | Click commands directly in editor — CodeLens on indexed source files |
| SEP-08 | Remote URL sources | ⬜ v2 | https sources with timeout, cache, offline badge, no auth |
| SEP-09 | Keyboard navigation | ⬜ v2 | Arrow keys + Enter to paste in panel |

## Parking lot — decided, not yet scheduled

- Azure and GCP profile reading (same pattern as AWS)
- Terminal pin — lock paste target to specific terminal session
- 1Password / Bitwarden CLI integration — v2+, requires dedicated security review
- Telemetry — not in v1, revisit after launch

## Completion criteria per SEP

Every SEP is complete when:

1. `npm run compile` — zero errors, zero warnings
2. All new features work end-to-end (smoke test)
3. All existing features still work (regression check)
4. CHANGELOG.md entry appended
5. ROADMAP.md updated with new SEP status
6. NEARVAR_CONTEXT.md updated with current state snapshot
