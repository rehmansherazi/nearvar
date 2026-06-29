#!/bin/bash
# s03_paste_action.sh — paste action: panel populated + terminal prompt
# Screenshot: panel visible, command at terminal prompt (not executed)
set -e

DEMO_DIR="$HOME/nearvar-demo"
RUNBOOKS_DIR="$DEMO_DIR/runbooks"
NEARVAR_YAML="$HOME/nearvar.yaml"
AWS_CONFIG="$HOME/.aws/config"

echo "==> s03: Setting up paste action demo (same data as s02)..."

backup() {
    local file="$1"
    if [ -f "$file" ] && [ ! -f "${file}.bak" ]; then
        cp "$file" "${file}.bak"
        echo "  ✓ Backed up $file"
    fi
}

# ── Runbook markdown files (same as s02) ──────────────────────────────────────
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

echo "  ✓ Created $RUNBOOKS_DIR (3 files)"

# ── .env file ─────────────────────────────────────────────────────────────────
cat > "$DEMO_DIR/.env" << 'EOF'
APP_PORT=3000
APP_ENV=development
LOG_LEVEL=debug
EOF
echo "  ✓ Created $DEMO_DIR/.env"

# ── AWS config ────────────────────────────────────────────────────────────────
mkdir -p "$HOME/.aws"
backup "$AWS_CONFIG"

cat > "$AWS_CONFIG" << 'EOF'
[default]
region = us-east-1
output = json

[profile staging]
region = eu-west-1

[profile production]
region = ap-southeast-1
EOF
echo "  ✓ Created ~/.aws/config (default, staging, production)"

# ── nearvar.yaml ──────────────────────────────────────────────────────────────
backup "$NEARVAR_YAML"

cat > "$NEARVAR_YAML" << EOF
# nearvar.yaml — s03 paste action demo
sources:
  runbooks:
    - $RUNBOOKS_DIR/
  bash: true
  env:
    - $DEMO_DIR/.env
  aws: true
ui:
  collapsed: []
EOF
echo "  ✓ Created ~/nearvar.yaml"

echo ""
echo "Next steps:"
echo "  1. Open a terminal in VS Code (View → Terminal)"
echo "  2. Click any runbook command in the NearVar panel"
echo "  3. Confirm the command appears at the terminal prompt, not executed"
echo "  4. Screenshot showing panel + terminal prompt with command"
echo ""
echo "✓ Ready — open NearVar panel and screenshot"
