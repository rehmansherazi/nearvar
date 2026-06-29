#!/bin/bash
# s11_file_grouping.sh — runbook grouping by source file
# Screenshot: RUNBOOKS section showing per-file collapsible sub-headers
set -e

DEMO_DIR="$HOME/nearvar-demo"
RUNBOOKS_DIR="$DEMO_DIR/runbooks"
NEARVAR_YAML="$HOME/nearvar.yaml"

echo "==> s11: Setting up file grouping demo..."

# ── Backup helper ─────────────────────────────────────────────────────────────
backup() {
    local file="$1"
    if [ -f "$file" ] && [ ! -f "${file}.bak" ]; then
        cp "$file" "${file}.bak"
        echo "  ✓ Backed up $file"
    fi
}

# ── Runbook markdown files (3 files → 3 file group headers in panel) ──────────
mkdir -p "$RUNBOOKS_DIR"

cat > "$RUNBOOKS_DIR/database-ops.md" << 'EOF'
## Check replication lag

```bash
psql -h db-primary.internal -U admin -c "SELECT now() - pg_last_xact_replay_timestamp() AS lag"
```

## Connection count

```bash
psql -h db-primary.internal -U admin -c "SELECT count(*) FROM pg_stat_activity"
```

## Promote read replica

```bash
pg_ctl promote -D /var/lib/postgresql/data
```
EOF

cat > "$RUNBOOKS_DIR/deploy.md" << 'EOF'
## Deploy to staging

```bash
git push staging main
kubectl rollout status deployment/api -n staging
```
EOF

cat > "$RUNBOOKS_DIR/incident-response.md" << 'EOF'
## Tail recent errors

```bash
kubectl logs -n production -l app=api --tail=100 --since=10m
kubectl get events -n production --sort-by=.lastTimestamp
```

## Restart deployment

```bash
kubectl rollout restart deployment/api -n production
```
EOF

echo "  ✓ Created $RUNBOOKS_DIR (3 files → 3 group headers)"

# ── nearvar.yaml — runbooks only, no other sources ────────────────────────────
backup "$NEARVAR_YAML"

cat > "$NEARVAR_YAML" << EOF
# nearvar.yaml — s11 file grouping demo
# Only runbooks configured — isolates the grouping feature
sources:
  runbooks:
    - $RUNBOOKS_DIR/
  bash: false
  aws: false
ui:
  collapsed: []
EOF

echo "  ✓ Created ~/nearvar.yaml (runbooks only)"
echo ""
echo "✓ Ready — open NearVar panel and screenshot"
