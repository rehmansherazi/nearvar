# NearVar — Engineering Conventions

This is the engineering bible for NearVar. All principles, rules, security requirements, and cross-platform notes live here. When a new Claude session starts, load this file alongside NEARVAR_CONTEXT.md.

## Reference implementation

Syncbridge (`/home/rehman/repos/syncbridge`) contains proven patterns that NearVar reuses directly:
- `src/panel.ts` — CSP setup, escapeHtml helper, postMessage contract
- `src/utils.ts` — utility patterns

## Security rules — non-negotiable, enforced from SEP-00

### escapeHtml on all dynamic values (Critical)

Every variable name, value, filename, section heading, and user-provided string must pass through `escapeHtml()` before injection into webview HTML. No exceptions.

```typescript
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

### CSP using webview.cspSource (Critical)

The Content-Security-Policy meta tag must use `${webview.cspSource}` — never a hardcoded origin, never a wildcard. Set in SEP-01 and never removed.

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
```

### Watcher disposal in onDidDispose (High)

All `FileSystemWatcher` instances stored in a `disposables` array. Explicit `dispose()` called when panel closes. `context.subscriptions.push()` for extension-lifetime watchers.

### No variable values in logs (High)

Variable names may be logged for debugging. Variable values are never logged — not `console.log`, not VS Code Output channel, not error messages.

### TOCTOU file read pattern (Medium)

Never check-then-read. Always read-and-catch. The OS reports the error if the file is gone between check and read.

```typescript
// Never:
if (fs.existsSync(path)) { fs.readFileSync(path); }

// Always:
try { fs.readFileSync(path); } catch (err) { /* handle */ }
```

### 512KB file size limit (Medium)

Enforced before file read. Files exceeding limit are skipped with a warning badge.

### Simple anchored regex only (Medium)

Bash variable parsing uses anchored patterns with no nested quantifiers. Prevents ReDoS on pathological input.

### Null assertion guards (Medium)

`workspaceFolders` always guarded with optional chaining. All file reads wrapped in try/catch. Panel checked for disposal before `postMessage`.

### Clipboard access — extension side only (Medium)

Webview sends `postMessage` to extension. Extension calls `vscode.env.clipboard.writeText()`. Never accessed from webview directly.

### No confirm/alert/prompt in webview (Low)

Blocked by VS Code webview sandbox. All confirmations use `vscode.window.showWarningMessage({ modal: true })`.

## Paste behaviour — non-negotiable

All paste actions send text to the terminal **without appending a newline**. The command lands in the terminal prompt. The user reviews it and presses Enter to run.

```typescript
// Never — executes immediately (shouldExecute defaults to true):
terminal.sendText(cmd);

// Always — inserts for review, no newline appended:
terminal.sendText(cmd, false);
```

Note: the second parameter is named `shouldExecute` (not `addNewLine`) in VS Code ≥ 1.100. Passing `false` suppresses the newline and leaves the text in the prompt for the user to review before pressing Enter.

## Cross-platform rules — non-negotiable

- Always use `path.join()` — never string concatenation for file paths
- Always guard `workspaceFolders` — can be undefined on macOS when opening a single file
- Register all commands before workspace checks — prevents Mac activation failures
- No Python dependency — TypeScript/Node.js only, no Python anywhere in the stack
- Test on Linux AND macOS AND Windows (WSL) before every publish

### Platform-specific paths

| Source | Linux | macOS | Windows (WSL) |
|--------|-------|-------|---------------|
| Bash source | `~/.bashrc` | `~/.bash_profile` | WSL `~/.bashrc` |
| AWS config | `~/.aws/config` | `~/.aws/config` | `%USERPROFILE%\.aws\config` |
| Shortcut | Ctrl+Alt+E | Cmd+Alt+E | Ctrl+Alt+E |

## Panel section order — locked

```
runbooks / playbooks  (document sources)
─────────────────────
bash variables
.env variables
aws profiles
─────────────────────
custom (manual items)
```

Document sources appear first — above the divider. This reflects incident response flow.

## Document source rules — locked

- Only fenced bash code blocks are indexed. Inline backtick commands are ignored.
- All `.md` files found in a configured folder are indexed — no frontmatter opt-in required.
- Exclude patterns (glob, via minimatch) are matched against the relative path from the source root.
- Section heading immediately above a fenced block becomes the item label.
- Multi-command blocks: collapsed by default, expand to reveal individual lines.
- Each line is independently clickable — no paste-all-at-once.

### Runbooks config schema

String shorthand (recursive=true, no excludes):
```yaml
sources:
  runbooks:
    - ./runbooks/deploy.md          # single file
    - ~/oncall/playbooks/           # all .md in folder, recursive
```

Full object form (all options):
```yaml
sources:
  runbooks:
    - path: ~/oncall/playbooks/
      recursive: false              # top-level files only
      exclude:
        - "*.draft.md"
        - "archive/*"
```

`recursive` defaults to `true` when omitted. `exclude` defaults to `[]`.

## Broken reference states

| Error | Badge | Inline message |
|-------|-------|----------------|
| File not found (ENOENT / 404) | 🔴 not found | File not found at configured path. Update path in nearvar.yaml → |
| Access denied (403 / EACCES) | 🔴 unreachable | Access denied — resource must be publicly accessible |
| Network timeout | ⚫ cached | Cannot reach URL — showing cached version |
| Folder has no .md files | ⚠ no .md files | Folder exists but contains no markdown files |
| No fenced bash blocks | ⚠ 0 blocks | File found but no bash code blocks detected |
| File > 512KB | ⚠ too large | File exceeds 512KB limit — skipped |

## Dynamic value handling

Variables whose values contain `$()` command substitutions cannot be resolved statically. Display with a `⚠ dynamic` badge — the variable name is shown but the value is not. No shell execution occurs.

## Authentication — never

NearVar never authenticates to any resource. Never prompts for credentials. Never stores tokens. If a resource is inaccessible, NearVar reports it in plain English with one actionable hint and stops.

## Quality gate — every SEP before commit

Run through this checklist explicitly. Nothing ships without it.

### Code quality
- [ ] `npm run compile` — zero errors, zero warnings
- [ ] No TODOs, no placeholders, no dead code
- [ ] No unguarded `workspaceFolders` access (optional chaining required)
- [ ] No unguarded null assertions (try/catch on all file reads)
- [ ] `escapeHtml` called on every dynamic value — names, values, paths, headings
- [ ] No variable values in `console.log` or VS Code Output channel
- [ ] All file system watchers stored in disposables array and disposed on panel close
- [ ] Clipboard access only from extension side via postMessage

### Functionality
- [ ] New feature works end-to-end (smoke test)
- [ ] All existing features still work (regression checklist)
- [ ] Empty / missing / invalid inputs handled without crash
- [ ] Every button physically clicked and verified
- [ ] Paste inserts without executing on all three platforms

### Platform testing
- [ ] Smoke tests passed on Linux
- [ ] Smoke tests passed on macOS
- [ ] Smoke tests passed on Windows / WSL

### Documentation
- [ ] README.md updated
- [ ] CHANGELOG.md entry added (append-only — never edit existing entries)
- [ ] ROADMAP.md updated with new SEP status
- [ ] NEARVAR_CONTEXT.md updated with current state snapshot

## Known limitations (v1)

### Fenced bash blocks with no preceding heading are skipped

`extractBlocks` only indexes a block when `currentHeading` is non-empty at the time ` ```bash` is encountered. Blocks that appear before any heading in the file are silently dropped. Add a heading above the block to surface it in NearVar.

---

### Exclude patterns matched against relative path from source root

`isExcluded()` calls `minimatch(relPath, pattern)` where `relPath` is relative to the configured source folder. Pattern `archive/*` correctly matches `archive/old.md`. Patterns are case-sensitive on Linux and macOS (minimatch default). Windows paths with backslashes are not normalised — use forward-slash patterns.

---

### AWS config inline comments after values are not stripped

`region = us-east-1 # comment` displays as `us-east-1 # comment` in the panel. AWS CLI strips inline comments; the NearVar parser does not. Rare in practice — typical config files do not use inline comments in values.

---

### Escaped quotes inside variable values are not handled

`export FOO="bar\"baz"` and `export FOO='it'\''s'` will parse incorrectly — the value may include the literal quote characters or truncate early. Documenting only unescaped, single-quoted or double-quoted values is the safe path in v1. Multi-line values (via `\` continuation) are also not parsed.

---

## Known npm dependencies

| Package | Version | Used for |
|---------|---------|----------|
| js-yaml | bundled (vscode) | YAML parsing in configReader.ts |
| minimatch | 10.2.5 | Glob exclude patterns in docReader.ts |

minimatch 10.2.5 ships bundled TypeScript declarations (`dist/commonjs/index.d.ts`). No `@types/minimatch` needed. Import as `import { minimatch } from 'minimatch'`.

## Verify-before-implement rule

Before any SEP uses a specific VS Code API, npm package, or CLI command, verify it against current documentation. Check: VS Code API docs for the method, minimum engine version required, npm package CVEs, and any breaking changes in the last release.

## Tool usage

| Tool | Used for | Never used for |
|------|----------|----------------|
| Claude Code CLI | File edits, compile, git add, git commit, running quality gate | git push, npm publish, vsce publish, system operations |
| Bash terminal | git push, vsce publish, npm publish, system operations | File editing, compilation |
| VS Code | Debugging (F5), extension install, UI testing, physical button clicks | File editing via Claude Code |
