# NearVar

**Environment variables, cloud profiles, and runbook commands — always within reach.**

NearVar is a VS Code sidebar extension that surfaces your shell environment, AWS profiles, and runbook commands in a single persistent panel. Click any item to paste it into the active terminal — without executing it — so you always review before running.

## Screenshots

![Welcome card](images/screenshots/scenario1_welcome_card.png)
*First open — click Create nearvar.yaml to get started*

![Full panel](images/screenshots/scenario2_full_panel.png)
*All sections populated — Runbooks, Bash Variables, AWS Profiles, Custom*

![Paste in action](images/screenshots/scenario3_paste_action.png)
*Click any item — command lands in terminal prompt, not executed*

![Expanded block](images/screenshots/scenario4b_expanded_block.png)
*Multi-line runbook blocks expand to show individual pasteable commands*

![Editor CodeLens](images/screenshots/scenario5_codelens.png)
*CodeLens above every fenced bash block — paste without leaving your runbook*

![Config file](images/screenshots/scenario6_config.png)
*nearvar.yaml — configure runbook sources, bash, env, and AWS profiles*

![Dynamic badge](images/screenshots/scenario7_dynamic_badge.png)
*Dynamic variables shown with badge — value uses $() substitution*

## Who this is for

- DevOps and platform engineers who run frequent commands from playbooks during incidents
- Developers managing multiple AWS profiles or .env files across projects
- On-call engineers who need runbook commands immediately during an outage

## Features

- **Runbook commands** — indexes fenced bash blocks from markdown files you configure. Supports `` ```bash ``, `` ```sh ``, `` ```shell ``, `` ```zsh ``
- **Bash variables** — reads `~/.bashrc` (Linux) or `~/.bash_profile` (macOS)
- **Environment files** — reads `.env` files in your workspace
- **AWS profiles** — reads `~/.aws/config` and `~/.aws/credentials`
- **Editor CodeLens** — click `▶ NearVar:` above any fenced block in a configured runbook to paste directly from the editor
- **Search/filter** — filter across all sections by name or value
- **Collapsible sections** — collapse sections you don't need right now, configurable per section in `nearvar.yaml`
- **Paste without executing** — text lands in the terminal prompt, you press Enter to run. Never executes automatically.

## Getting started

1. Install NearVar from the VS Code Marketplace
2. Open the panel: `Ctrl+Alt+E` (Linux/Windows) or `Cmd+Alt+E` (macOS)
3. Click **Create nearvar.yaml** to scaffold a config file
4. Edit `nearvar.yaml` to point at your runbook files or folders

## Configuration

`nearvar.yaml` lives in your workspace root:

```yaml
# nearvar.yaml — NearVar configuration
sources:
  runbooks:
    # Single file
    - ./runbooks/deploy.md

    # Folder — recursive by default
    - ~/oncall/playbooks/procedures/

    # Folder with options
    - path: ~/oncall/playbooks/
      recursive: false        # top-level files only
      exclude:
        - "*.draft.md"
        - "archive/*"

  bash: true                  # read ~/.bashrc or ~/.bash_profile
  env:
    - .env                    # .env files relative to workspace
  aws: true                   # read ~/.aws/config profiles

ui:
  collapsed:                  # sections collapsed by default
    - aws                     # expand by clicking the header
```

## Runbook format

NearVar indexes fenced code blocks from markdown files. The section heading above the block becomes the item label:

~~~markdown
## Restart nginx

```bash
systemctl restart nginx
systemctl status nginx
```
~~~

Supported fence tags: `` ```bash `` `` ```sh `` `` ```shell `` `` ```zsh ``

Blocks without a heading above them are skipped. Inline backtick commands are not indexed — use fenced blocks.

## Search and filter

Type in the Filter box to search across all sections:

- Runbook items match by heading and command text
- Bash variables match by name and value
- AWS profiles match by name and region
- `.env` variables match by name only (values are never searched)
- Sections with no matches are hidden automatically

## Collapsible sections

Click any section header to collapse or expand it. Set default collapsed state in `nearvar.yaml`:

```yaml
ui:
  collapsed:
    - aws
    - custom
```

Valid section names: `runbooks`, `bash`, `env`, `aws`, `custom`

## What NearVar is not

- **Not a secrets manager** — no vault, no encryption, no sync
- **Not a command executor** — paste only, you always confirm with Enter
- **Not an auth manager** — if a resource is inaccessible, NearVar reports it and stops

## Security

NearVar is read-only and local-first. It never authenticates to any resource, never stores tokens, and never transmits data. Variable values are never logged. All content is HTML-escaped before display. `.env` variable values are excluded from search.

## Known limitations (v1)

- Keyboard navigation not implemented — use mouse to click items
- Remote URL and Git repository sources not supported — local filesystem only
- Azure and GCP profiles not yet supported (planned for v2)
- Inline bash commands (backtick) not indexed — use fenced blocks
- Escaped quotes inside variable values may parse incorrectly

## License

MIT
