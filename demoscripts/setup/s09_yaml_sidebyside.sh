#!/bin/bash
# s09_yaml_sidebyside.sh — panel populated + config file open side by side
# Screenshot: split view showing nearvar.yaml on left, populated panel on right
set -e

DEMO_DIR="$HOME/nearvar-demo"
RUNBOOKS_DIR="$DEMO_DIR/runbooks"
NEARVAR_YAML="$HOME/nearvar.yaml"
AWS_CONFIG="$HOME/.aws/config"

echo "==> s09: Setting up side-by-side demo..."

# ── Backup helper ─────────────────────────────────────────────────────────────
backup() {
    local file="$1"
    if [ -f "$file" ] && [ ! -f "${file}.bak" ]; then
        cp "$file" "${file}.bak"
        echo "  ✓ Backed up $file"
    fi
}

# ── 1. Runbook markdown files ─────────────────────────────────────────────────
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

# ── 2. .env file ──────────────────────────────────────────────────────────────
cat > "$DEMO_DIR/.env" << 'EOF'
APP_PORT=3000
APP_ENV=development
LOG_LEVEL=debug
EOF
echo "  ✓ Created $DEMO_DIR/.env"

# ── 3. AWS config ─────────────────────────────────────────────────────────────
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

# ── 4. nearvar.yaml — comprehensive config that also populates panel ───────────
backup "$NEARVAR_YAML"

cat > "$NEARVAR_YAML" << EOF
# nearvar.yaml — NearVar configuration

sources:
  runbooks:
    - path: $RUNBOOKS_DIR/
      recursive: true
      exclude:
        - "*.draft.md"
        - "archive/*"
  bash: true
  env:
    - $DEMO_DIR/.env
  aws: true

sections:
  - name: "Production"
    commands:
      - label: "Check pods"
        value: "kubectl get pods -n production"
      - label: "Tail logs"
        value: "kubectl logs -n production -l app=api --tail=100"
  - name: "Database"
    collapsed: true
    commands:
      - label: "Connection count"
        value: "psql -h db.internal -U admin -c 'SELECT count(*) FROM pg_stat_activity'"

ui:
  collapsed:
    - aws
EOF
echo "  ✓ Created ~/nearvar.yaml"
echo "  → File path: $NEARVAR_YAML"

echo ""
echo "✓ Ready — open NearVar panel and screenshot"
