# NearVar — SEP Roadmap

## Active SEP plan

| SEP | Name | Status | Delivers |
|-----|------|--------|----------|
| SEP-00 | Project scaffold | ✅ done | package.json, tsconfig, empty src files, all 7 doc files, compile clean |
| SEP-01 | Panel scaffold | ✅ done | Webview opens, CSP + escapeHtml from day one, context bar, welcome card |
| SEP-02 | Static items + paste | ✅ done | Hardcoded items, click-to-paste (insert without execute), all platforms |
| SEP-03 | nearvar.yaml config reader | ✅ done | Read config, validate, auto-reload on change, welcome card on first run |
| SEP-04 | Bash + .env variable reader | ✅ done | Parse ~/.bashrc, ~/.bash_profile, .env files, dynamic badge for $() |
| SEP-05 | Document source indexer | ✅ done | Index fenced bash blocks from markdown, frontmatter opt-in, file watcher |
| SEP-05b | Schema update | ✅ done | Drop frontmatter gate; add recursive/exclude/shorthand schema; minimatch |
| SEP-06 | AWS + cloud profiles | ✅ done | Read ~/.aws/config + credentials, display profiles/regions, --profile paste value |
| SEP-07 | Editor CodeLens (inline) | ✅ done | CodeLens above each fenced bash block, source-gated, heading labels, multi-line && join |
| SEP-08 | Remote URL sources | ⬜ v2 | https sources with timeout, cache, offline badge, no auth |
| SEP-09 | Keyboard navigation | ⬜ v2 | Arrow keys + Enter to paste in panel |

## Parking lot — decided, not yet scheduled

- SEP-09: GCP profile reader (gcp: true in nearvar.yaml)
- SEP-10: Azure profile reader (azure: true in nearvar.yaml)
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
