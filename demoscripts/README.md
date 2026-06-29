# NearVar demo scripts

Per-scenario scripts for setting up and tearing down screenshot environments.
Each script is self-contained — run setup, take screenshot, run cleanup.

All scripts use `$HOME/nearvar-demo/` as a sandbox for generated files. The
sandbox is safe to delete entirely as a nuclear cleanup option.

---

## Scenarios

| # | Setup script | What it sets up | Shared cleanup |
|---|---|---|---|
| s02 | `setup/s02_full_panel.sh` | runbooks + .env + AWS profiles + nearvar.yaml | `cleanup/s02_full_panel.sh` |
| s06 | `setup/s06_config.sh` | comprehensive nearvar.yaml (all options) | `cleanup/s06_config.sh` |
| s08 | `setup/s08_yaml_config.sh` | same as s06 (different screenshot angle) | `cleanup/s08_yaml_config.sh` → calls s06 |
| s09 | `setup/s09_yaml_sidebyside.sh` | s02 data + s06-style nearvar.yaml together | `cleanup/s09_yaml_sidebyside.sh` |
| s10 | `setup/s10_named_sections.sh` | 3 named sections (Production, Database, GPU) | `cleanup/s10_named_sections.sh` |
| s11 | `setup/s11_file_grouping.sh` | runbooks only — isolates file grouping feature | `cleanup/s11_file_grouping.sh` |
| s12 | `setup/s12_sensitive_masking.sh` | bash exports with TOKEN/SECRET/KEY values | `cleanup/s12_sensitive_masking.sh` |

---

## Usage

```bash
# Run one scenario
bash demoscripts/setup/s02_full_panel.sh
# → take screenshot
bash demoscripts/cleanup/s02_full_panel.sh

# Clean everything at once
bash demoscripts/cleanup_all.sh
```

Always run the matching cleanup script after each screenshot session.
Running a second setup script before cleanup is fine — backups protect the
original `~/nearvar.yaml` (only the first backup is kept).

---

## What gets backed up

Each setup script backs up files it overwrites, using a `.bak` suffix:

| File | Backed up as |
|---|---|
| `~/nearvar.yaml` | `~/nearvar.yaml.bak` |
| `~/.aws/config` | `~/.aws/config.bak` |
| `~/.bashrc` (s12) | `~/.bashrc.bak` |

Cleanup scripts restore from `.bak` if it exists, or remove the file if
there was no prior backup. The `.bak` files are removed on restore.

**s12 special case:** `~/.bashrc` is modified using markers rather than
overwritten — cleanup removes only the marker block via `sed`, keeping any
other changes. The `.bak` is a safety copy only.

---

## Nuclear cleanup

If scripts leave things in a bad state, delete the sandbox directory and
manually restore your `~/nearvar.yaml` and `~/.aws/config` from backups:

```bash
rm -rf "$HOME/nearvar-demo"
# Restore nearvar.yaml if needed:
mv ~/nearvar.yaml.bak ~/nearvar.yaml
# Restore AWS config if needed:
mv ~/.aws/config.bak ~/.aws/config
```
