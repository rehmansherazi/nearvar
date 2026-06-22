# NearVar — Decision Log

This file is immutable. Every locked decision is recorded here with rationale and date. Existing entries are never edited. If a decision is reversed, a new entry is added with the reversal date and reason.

---

## Locked decisions — 2026-06-15

### Extension name: NearVar

**Choice:** NearVar
**Rationale:** Cleared across all channels (VS Code Marketplace, GitHub, npm, domains, social). Scales beyond bash. "Near" = always within reach.
**Previous names considered:** BashDock → EnvCue → NearVar

---

### Config format: YAML (nearvar.yaml)

**Choice:** YAML with filename `nearvar.yaml`
**Rationale:** Ops audience expects comments in config files. JSON has no comment support. YAML supports inline comments, making it appropriate for ops-managed configuration.

---

### Paste behaviour: insert without executing

**Choice:** `terminal.sendText(cmd)` — no newline appended
**Rationale:** Prevents accidental execution of destructive commands. User reviews the command in the terminal prompt and confirms with Enter. Non-negotiable.

---

### Fenced blocks only: no inline extraction

**Choice:** Only fenced bash code blocks are indexed (`\`\`\`bash`)
**Rationale:** Inline backtick extraction produces too many false positives. Fenced blocks are unambiguous — if a team wants a command surfaced in NearVar, it must be in a fenced block.

---

### Frontmatter opt-in: bashdock: true required

**Choice:** Folder scanning only indexes markdown files with `bashdock: true` in YAML frontmatter
**Rationale:** Prevents architecture docs, meeting notes, and post-mortems from polluting the panel.

---

### Panel section order: runbooks first, vars below divider

**Choice:** Document sources at top, environment variables and profiles below divider
**Rationale:** Incident response flow — the thing you reach for during an outage is at the top, not buried below shell config.

---

### Path display: relative path always, full on hover

**Choice:** Show relative path from source root in panel; full absolute path in hover tooltip
**Rationale:** Prevents truncation collision with long shared prefixes. Prevents ambiguity when two files share a name across different folders.

---

### Block paste: expand only — individual lines

**Choice:** Multi-command fenced blocks are collapsed by default; expand to reveal individual lines; each line is independently clickable
**Rationale:** Consequential ops commands require deliberate line-by-line selection. No paste-all-at-once.

---

### Multi-terminal targeting: last active terminal

**Choice:** NearVar pastes to the last active terminal; target shown in context bar
**Rationale:** Simplest consistent behaviour. Terminal pin feature planned for v2.

---

### Auth: never authenticate

**Choice:** NearVar never authenticates to any resource, never prompts for credentials, never stores tokens
**Rationale:** Clean security story. Inaccessible resources get plain English error and stop.

---

### Disclaimer: ⓘ hover tooltip, not footer

**Choice:** Permanent footer disclaimer replaced with ⓘ icon in panel header; hover shows disclaimer
**Rationale:** Permanent footer is patronising after day 3. Hover is discoverable without noise.

---

### Keyboard navigation: v2 — known limitation in README

**Choice:** Not implemented in v1; documented as known limitation in README.md
**Rationale:** Adds a full SEP of work. Ship panel first, prove value, add navigation in v2.

---

### First-run state: welcome card with scaffold button

**Choice:** On first open with no nearvar.yaml, show welcome card with "Create nearvar.yaml" button
**Rationale:** Silent empty panel reads as broken. Auto-scaffold is presumptuous — user must trigger it.

---

### Telemetry: none in v1

**Choice:** No telemetry in v1
**Rationale:** Clean privacy story, zero policy overhead, faster Marketplace approval. Revisit after launch.

---

### Python dependency: none

**Choice:** TypeScript/Node.js only — no Python anywhere in the stack
**Rationale:** Eliminates a platform dependency. NearVar is a VS Code extension, not a polyglot tool.

---

### v1 sources: local filesystem only

**Choice:** v1 supports local filesystem paths only; remote URL and Git repository sources are v2
**Rationale:** Reliable, offline-capable, zero auth complexity. Remote sources in v2.

---

### Editor CodeLens: v2 — SEP-07

**Choice:** CodeLens on indexed source files is v2
**Rationale:** Requires document parser on open editors. Ship panel first.

---

### 1Password / Bitwarden integration: v2+ — requires security review

**Choice:** Not in v1
**Rationale:** Marketplace approval risk and security surface increase.

---

### VS Code minimum engine version: ^1.100.0

**Choice:** `engines.vscode: "^1.100.0"`
**Rationale:** Matches Syncbridge reference implementation. WebviewViewProvider available since 1.49.0; 1.100.0 is the current stable baseline.
**Decision date:** 2026-06-17 (SEP-00)

---

### Keybinding: Ctrl+Alt+E / Cmd+Alt+E

**Choice:** `ctrl+alt+e` (Linux/Windows), `cmd+alt+e` (macOS)
**Rationale:** Not taken by VS Code defaults or any installed extension. Matches spec.
**Verified:** 2026-06-17 (SEP-00)

---

### nearvar.yaml validation: missing sources key is forgiving

**Choice:** Missing `sources` key coerces to safe defaults silently (runbooks: [], bash: false, env: [], aws: false). Only structural errors — YAML parse failure, wrong top-level type, or `sources` being a non-mapping — show the error card.
**Rationale:** A nearvar.yaml with no sources key is a valid "empty config" state. Erroring on omission punishes users who are scaffolding a file incrementally. Structural errors (parse failure, wrong type) are unambiguous programmer mistakes and warrant the error card.
**Decision date:** 2026-06-17 (SEP-03)

---

### Frontmatter opt-in dropped entirely

**Choice:** nearvar.yaml is the sole gating mechanism. Runbook sources support a file/folder allowlist with exclude glob patterns (minimatch) and a recursive flag. recursive defaults to true. String shorthand supported for simple cases.
**Rationale:** Frontmatter creates wrong ownership coupling — it requires write access to every markdown file you want to surface. This does not work for repos the user does not control (third-party playbooks, shared team wikis, cloned reference repos). nearvar.yaml is the right boundary: the user explicitly lists what to index.
**Decision date:** 2026-06-18 (SEP-06 spec update)

---

### GCP and Azure profile reading — deferred to v2

**Choice:** Not in v1. Will follow the same pattern as AWS (boolean toggle in nearvar.yaml sources section: `gcp: true`, `azure: true`). GCP reads from `~/.config/gcloud/configurations/`. Azure reads from `~/.azure/azureProfile.json`. Schema reserved — existing nearvar.yaml files will not need changes when v2 adds these.
**Rationale:** AWS covers the primary use case at launch. GCP and Azure parsing require their own readers and smoke tests on platforms where those CLIs are present. Deferred to avoid scope creep in v1.
**Decision date:** 2026-06-21
