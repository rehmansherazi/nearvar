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

- **Runbook commands** — indexes fenced bash blocks from markdown files you configure. Supports `` ```bash ``, `` ```sh ``, `` ```shell ``, `` ```zsh ``. When multiple markdown files are indexed, commands are grouped under a collapsible per-file sub-header
- **GitHub raw URL support** — public `raw.githubusercontent.com` file URLs work as runbook sources alongside local paths. Use the Raw button on any GitHub file to get the URL
- **Bash variables** — reads `~/.bashrc`, `~/.bash_profile`, and `~/.bash_login` on all platforms; sensitive values (TOKEN, SECRET, KEY, PASSWORD, DATABASE_URL, DSN, etc.) are automatically masked in the panel
- **Environment files** — reads `.env` files you configure; values are always masked
- **AWS profiles** — reads `~/.aws/config` and `~/.aws/credentials`
- **Home directory config** — `~/nearvar.yaml` works across every project automatically. No per-workspace setup needed
- **Custom named sections** — define any number of named sections in `nearvar.yaml` with your own labels and commands, each independently collapsible
- **Editor CodeLens** — click `▶ NearVar:` above any fenced block in a configured runbook to paste directly from the editor
- **Search/filter** — filter across all sections by label or value
- **Collapsible sections** — collapse sections you don't need right now, configurable per section in `nearvar.yaml`
- **Paste without executing** — text lands in the terminal prompt; you press Enter to run. Never executes automatically

## Getting started

The simplest setup — works across every project forever:

1. Open your home folder in VS Code:
   **File → Add Folder to Workspace → select your home folder (~)**

2. Click the NearVar icon in the sidebar

3. Click **Create ~/nearvar.yaml** — file created at `~/nearvar.yaml`

4. Edit `~/nearvar.yaml` to point at your runbooks, .env files, and cloud profiles

NearVar will now work in every workspace you open, with no per-project setup required. `~/nearvar.yaml` lives alongside `~/.bashrc` and `~/.aws/config` — manage it the same way.

> **No workspace folder open?** NearVar still shows your bash variables and AWS profiles automatically — no config needed for those.

## Example configuration

![nearvar.yaml annotated](images/screenshots/scenario8_yaml_config.png)
*nearvar.yaml — all configuration options explained*

![Panel and config side by side](images/screenshots/scenario9_yaml_sidebyside.png)
*Each config key maps directly to a panel section*

## Configuration

`nearvar.yaml` can live in your home directory (`~/nearvar.yaml`) or your workspace root — or both. NearVar checks both locations and deep-merges them when both are present (workspace values take precedence for booleans; arrays like `runbooks` and `env` are concatenated).

```yaml
# nearvar.yaml — NearVar configuration

sources:
  runbooks:
    # Single local file
    - ./runbooks/deploy.md

    # Local folder — recursive by default
    - ~/oncall/playbooks/procedures/

    # Local folder with options
    - path: ~/oncall/playbooks/
      recursive: false        # top-level files only
      exclude:
        - "*.draft.md"
        - "archive/*"

    # Public GitHub raw file URL
    - https://raw.githubusercontent.com/org/repo/main/oncall.md

  bash: true                  # read ~/.bashrc, ~/.bash_profile, ~/.bash_login (all platforms)
  env:
    - .env                    # .env files relative to workspace root
    - .env.local
  aws: true                   # read ~/.aws/config profiles

# Custom named sections — appear below standard source sections
sections:
  - name: Production
    commands:
      - label: Check pod status
        value: kubectl get pods -n production
      - label: Tail API logs
        value: kubectl logs -n production -l app=api --follow
  - name: Database
    collapsed: true           # collapsed by default
    commands:
      - label: Connection count
        value: psql -h db.internal -c 'SELECT count(*) FROM pg_stat_activity'
      - label: Run migrations
        value: ./manage.py migrate --check

ui:
  collapsed:                  # sections collapsed by default
    - aws                     # expand by clicking the header
    - bash                    # use exact section name for named sections too
```

## Runbook format

NearVar indexes fenced code blocks from markdown files. The heading above the block becomes the item label:

~~~markdown
## Restart nginx

```bash
systemctl restart nginx
systemctl status nginx
```
~~~

Supported fence tags: `` ```bash `` `` ```sh `` `` ```shell `` `` ```zsh ``

Blocks without a heading above them are skipped. Blocks with no language tag (plain ` ``` `) are also skipped — use one of the supported tags. Inline backtick commands are not indexed.

## Remote runbook files (GitHub)

Public GitHub raw file URLs are supported as runbook sources:

```yaml
sources:
  runbooks:
    - ~/local/runbooks/deploy.md
    - https://raw.githubusercontent.com/org/repo/main/oncall.md
```

Use the **Raw** button on any GitHub file page to get the URL. Only `raw.githubusercontent.com` URLs are accepted — `github.com` tree/blob URLs are rejected with a clear error. Private repos and folder/tree URLs are not yet supported.

Network errors, timeouts, and 404s produce a non-interactive error item in the RUNBOOKS section — the rest of the panel still loads.

## Custom sections

Define named sections in `nearvar.yaml` under the `sections:` key. Each section has a name, an optional `collapsed` default, and a list of `{label, value}` commands:

```yaml
sections:
  - name: Production
    commands:
      - label: Check pod status
        value: kubectl get pods -n production
      - label: Tail logs
        value: kubectl logs -n production -l app=api --follow

  - name: Database
    collapsed: true
    commands:
      - label: Connection count
        value: psql -h db.internal -c 'SELECT count(*) FROM pg_stat_activity'
```

Named sections appear below the standard source sections. Empty sections (no valid commands) are hidden automatically. The `custom:` key from earlier versions still works as a backward-compatible single "Custom" section.

## Search and filter

Type in the Filter box to search across all sections:

- Runbook items match by heading and command text
- Bash variables match by name; sensitive values are excluded from the search index
- AWS profiles match by name and region
- `.env` variables match by name only (values are never searched)
- Custom / named section items match by label and value
- Sections with no matches are hidden automatically

## Collapsible sections

Click any section header to collapse or expand it. Set default collapsed state in `nearvar.yaml`:

```yaml
ui:
  collapsed:
    - aws
    - bash
```

Built-in section names: `runbooks`, `bash`, `env`, `aws`, `custom`. Named sections defined under `sections:` can also be added here using their exact `name:` value.

## What NearVar is not

- **Not a secrets manager** — no vault, no encryption, no sync
- **Not a command executor** — paste only, you always confirm with Enter
- **Not an auth manager** — if a resource is inaccessible, NearVar reports it and stops

## Security

NearVar is built with a security-first philosophy. Here is exactly what it does and does not do:

**What NearVar reads:**
- `~/.bashrc`, `~/.bash_profile`, `~/.bash_login` — variable names and values (all three on every platform)
- `.env` files you explicitly configure — variable names and values
- `~/.aws/config` — profile names and regions only
- `~/.aws/credentials` — profile names only, never key values
- Markdown runbook files you explicitly configure — fenced code blocks only
- Public GitHub raw URLs you explicitly configure (`raw.githubusercontent.com` only, `https://` only) — fetched on panel load, content treated as untrusted

**What NearVar never does:**
- Never stores any data — variables, credentials, or commands are held in memory only while the panel is visible
- Never transmits credentials or personal data — the only outbound network calls are explicit `https://raw.githubusercontent.com` fetches for runbook URLs you configure
- Never executes commands — paste only, you always press Enter to run
- Never authenticates — if a resource is inaccessible, NearVar reports it and stops
- Never logs variable values — names may appear in debug output, values never do
- Never searches `.env` variable values — `.env` values are excluded from the search index to prevent accidental exposure
- Bash variable values matching sensitive name patterns are automatically masked in the panel — value displayed as `••••••••`, still available to paste

**Sensitive value masking:**

Bash variables are masked automatically when the name contains any of:
`TOKEN`, `SECRET`, `KEY`, `PASSWORD`/`PASSWD`/`PWD`, `CREDENTIAL`/`CRED`, `PRIVATE`, `CERT`, `LICENSE`, `SIGNATURE`, `DSN`, `CONNECTION_STRING`/`CONN_STR`, `P12`, `PFX`, `PEM`

Variables whose name contains `URL` or `URI` alongside a database prefix (`DATABASE`, `MONGO`, `REDIS`, `MYSQL`, `POSTGRES`, `JDBC`, `ORACLE`, `ELASTICSEARCH`, etc.) are also masked.

Exception: variables ending in `_TYPE`, `_METHOD`, `_SCHEME`, `_MODE`, or `_STRATEGY` are shown plain even if they contain `AUTH` (e.g. `JIRA_AUTH_TYPE` → not masked).

**How NearVar protects your data in the webview:**
- Content Security Policy (CSP) using VS Code's `webview.cspSource` — no external scripts, no inline execution
- All dynamic content (variable names, values, file paths, headings) is HTML-escaped before display — XSS is not possible through NearVar's rendering pipeline
- AWS secret key material (access key IDs and secret keys) is never read into memory — only profile names and regions are extracted from credentials files
- `.env` variable values are masked (••••••••) in the panel and excluded from the search index entirely

**Dependency security:**
- Minimal dependency footprint — only `js-yaml` (YAML parsing) and `minimatch` (glob pattern matching)
- Both dependencies are audited with `npm audit` before every release — zero known vulnerabilities at time of publish

**Open source:**
- Full source code available at [github.com/rehmansherazi/nearvar](https://github.com/rehmansherazi/nearvar)
- You can audit exactly what NearVar reads and how it handles your data

## Known limitations

- Keyboard navigation not implemented — use mouse to click items
- Untagged fenced blocks (plain ` ``` ` with no language) are not indexed — use `` ```bash `` or `` ```shell ``
- Private GitHub repos are not supported — public `raw.githubusercontent.com` only
- GitHub folder/tree URLs are not supported — single raw file URLs only
- Azure and GCP profiles not yet supported
- Escaped quotes inside variable values may parse incorrectly
- Response caching for remote runbook URLs is not implemented — fetched on every panel load

## License

MIT
