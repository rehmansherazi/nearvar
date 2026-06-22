# NearVar

**Environment variables, cloud profiles, and runbook commands — always within reach.**

NearVar is a VS Code sidebar extension that surfaces your shell environment, AWS profiles, and runbook commands in a single persistent panel. Click any item to paste it into the active terminal — without executing it — so you always review before running.

## Who this is for

- DevOps and platform engineers who run frequent commands from playbooks during incidents
- Developers managing multiple AWS profiles or `.env` files across projects
- On-call engineers who need runbook commands immediately during an outage

## Features

- **Bash variables** — reads `~/.bashrc` (Linux) or `~/.bash_profile` (macOS)
- **Environment files** — reads `.env` files in your workspace
- **AWS profiles** — reads `~/.aws/config` and `~/.aws/credentials`
- **Runbook commands** — indexes fenced bash blocks from markdown files you configure
- **Editor CodeLens** — click `▶ NearVar: <heading>` above any fenced bash block in a configured runbook to paste directly from the editor
- **Search/filter** — type in the filter bar to narrow any section instantly; `.env` values are intentionally excluded from search
- **Collapsible sections** — click any section header to collapse or expand it; configure which sections start collapsed via `ui.collapsed` in `nearvar.yaml`
- **Paste without executing** — text lands in the terminal prompt, you press Enter to run. Never executes automatically.

## Getting started

Open the panel: `Ctrl+Alt+E` (Linux / Windows) or `Cmd+Alt+E` (macOS).

On first open, NearVar shows a welcome card. Click **Create nearvar.yaml** to scaffold a config file in your workspace root.

## Configuration

`nearvar.yaml` lives in your workspace root:

```yaml
# nearvar.yaml — NearVar configuration
sources:
  runbooks:
    # Single file — indexed directly
    - ./runbooks/deploy.md

    # Folder — all .md files, recursive by default
    - ~/oncall/playbooks/procedures/

    # Folder with options
    - path: ~/oncall/playbooks/
      recursive: false        # top-level files only
      exclude:
        - "*.draft.md"        # skip draft files
        - "archive/*"         # skip archive subfolder

  bash: true                  # read ~/.bashrc or ~/.bash_profile
  env:
    - .env                    # .env files relative to workspace
  aws: true                   # read ~/.aws/config profiles

ui:
  # Sections collapsed by default — expand by clicking the header
  # Valid values: runbooks, bash, env, aws, custom
  collapsed: []
```

Only fenced bash code blocks are indexed from runbook files:

~~~markdown
## Restart nginx

```bash
systemctl restart nginx
systemctl status nginx
```
~~~

The section heading becomes the item label in the panel and the CodeLens label in the editor.

## What NearVar is not

- **Not a secrets manager** — no vault, no encryption, no sync
- **Not a command executor** — paste only, you always confirm with Enter
- **Not an auth manager** — if a resource is inaccessible, NearVar reports it and stops

## Security

NearVar is read-only and local-first. It never authenticates to any resource, never stores tokens, and never transmits data. Variable values are never logged. All content is HTML-escaped before display.

## Known limitations (v1)

- Keyboard navigation not implemented — use mouse to click items
- Remote URL and Git repository sources not supported — local filesystem only
- Azure and GCP profiles not yet supported
- Inline bash commands (backtick) not indexed — use fenced blocks
- Escaped quotes inside variable values may parse incorrectly

## License

MIT
