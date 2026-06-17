# NearVar

**NearVar — environment variables, cloud profiles, and runbook commands. Always within reach.**

A VS Code sidebar extension that surfaces environment variables, cloud profiles, and runbook commands in a single persistent panel. Click any item to paste it into the active terminal — without executing it — so you always review before running.

## Who this is for

NearVar is for engineers who work across multiple terminals, environments, and projects and need fast access to variables and runbook commands during incidents, deployments, and dev sessions.

- DevOps and platform engineers who run frequent one-liners from playbooks
- Developers who manage multiple AWS profiles or `.env` files across projects
- On-call engineers who need runbook commands immediately during an outage

## What NearVar does

- Reads environment variables from `~/.bashrc`, `~/.bash_profile`, and workspace `.env` files
- Reads AWS profile names and regions from `~/.aws/config`
- Indexes fenced bash code blocks from markdown runbooks configured in `nearvar.yaml`
- Pastes any item into the active terminal **without executing it** — you press Enter to run

## What NearVar does not do

- Not a secrets manager — no vault, no encryption, no sync
- Not a command executor — paste only, user always confirms with Enter
- Not an auth manager — if a resource is inaccessible, NearVar says so and stops
- Not a write tool — read-only across every source, always

## Installation

Install from the VS Code Marketplace: search for **NearVar** by `rehmansherazi`.

Open the panel: `Ctrl+Alt+E` (Linux / Windows) or `Cmd+Alt+E` (macOS).

## Configuration

Place a `nearvar.yaml` file in your workspace root:

```yaml
# nearvar.yaml — workspace configuration
sources:
  - /home/rehman/oncall/playbooks/  # prod oncall procedures
  - ./runbooks/                      # local workspace runbooks
custom:
  - label: prod-server-01
    value: prod-server-01.example.com
    icon: server
```

Markdown files in `sources` must opt in via frontmatter:

```yaml
---
title: VM Recovery Procedures
bashdock: true
---
```

Only fenced bash code blocks are indexed. Inline backtick commands are ignored.

## Known limitations

- **Keyboard navigation** — arrow keys and Enter-to-paste are not implemented in v1. Use the mouse to click items. Planned for v2.
- **Remote sources** — URL and Git repository sources are v2. v1 supports local filesystem paths only.
- **Azure / GCP profiles** — planned for v2, same read-only pattern as AWS.
- **Terminal pin** — NearVar pastes to the last active terminal. Pin to a specific terminal is v2.

## Security

NearVar is read-only and local-first. It never authenticates to any resource, never stores tokens, and never transmits data. Variable values are never logged. All dynamic content is HTML-escaped before display in the webview.

See the hover tooltip on the `ⓘ` icon in the panel header for the full disclaimer.
