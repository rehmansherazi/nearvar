# NearVar — Environment Setup

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Runtime for build tooling |
| npm | 9+ | Package manager |
| TypeScript | ^5.9.3 | Compiler (installed via devDependencies) |
| vsce | 3.9.2+ | VS Code extension packaging and publishing |
| VS Code | 1.100.0+ | Development, debugging, UI testing |

## Platform notes

### Linux

- Bash source: `~/.bashrc`
- AWS config: `~/.aws/config`
- Shortcut: Ctrl+Alt+E

### macOS

- Bash source: `~/.bash_profile`
- AWS config: `~/.aws/config`
- Shortcut: Cmd+Alt+E
- Note: `workspaceFolders` can be undefined when opening a single file — always guard with optional chaining

### Windows (WSL)

- Bash source: WSL `~/.bashrc` (inside WSL home, not Windows home)
- AWS config: `%USERPROFILE%\.aws\config`
- Shortcut: Ctrl+Alt+E
- All paths resolve inside WSL — use WSL-style paths

## Initial setup

```bash
cd /home/rehman/repos/nearvar
npm install
npm run compile
```

## Build

```bash
npm run compile      # single compile
npm run watch        # watch mode for development
```

## Debugging in VS Code

1. Open `/home/rehman/repos/nearvar` in VS Code
2. Press F5 to launch Extension Development Host
3. The NearVar panel appears in the activity bar of the dev host window
4. Use the Debug Console for extension-side logs

## Packaging

```bash
npx vsce package
```

Produces `nearvar-<version>.vsix` in the project root.

## Publishing

Run from the Bash terminal (not via Claude Code):

```bash
npx vsce publish
```

Requires:
- Publisher account: `rehmansherazi`
- Personal Access Token with Marketplace publish scope
- `npm run compile` must pass clean before publish

**Before publishing:** Create the GitHub repository at `github.com/rehmansherazi/nearvar` and push the `main` branch first. The `repository`, `homepage`, and `bugs` fields in `package.json` reference this URL — Marketplace will link to it from the extension page.

## Publisher account

- Publisher ID: `rehmansherazi`
- Marketplace ID: `rehmansherazi.nearvar`
- Publisher account already exists (same as Syncbridge)

## Project path

```
/home/rehman/repos/nearvar/
```

## Syncbridge reference

The Syncbridge extension (`/home/rehman/repos/syncbridge`) is the reference implementation for:
- CSP setup pattern
- `escapeHtml()` helper
- `postMessage` contract between extension and webview

Consult `syncbridge/src/panel.ts` and `syncbridge/src/utils.ts` when implementing these patterns in NearVar.
