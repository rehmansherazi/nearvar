#!/bin/bash
# nearvar_demo_setup.sh
# Sets up realistic demo data for NearVar screenshot capture.
# Safe to run multiple times. Run nearvar_demo_cleanup.sh to remove everything.

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "==> Setting up NearVar demo environment..."

# ---------------------------------------------------------------
# 1. Runbooks folder with realistic ops content
# ---------------------------------------------------------------
mkdir -p runbooks/archive

cat > runbooks/incident-response.md << 'EOF'
## Check pod status

```bash
kubectl get pods -n production
kubectl describe pod -n production --selector app=api
```

## Restart deployment

```bash
kubectl rollout restart deployment/api -n production
kubectl rollout status deployment/api -n production
```

## Tail recent errors

```bash
kubectl logs -n production -l app=api --tail=100 --since=10m
```
EOF

cat > runbooks/database-ops.md << 'EOF'
## Check replication lag

```bash
psql -h db-primary.internal -U admin -c "SELECT now() - pg_last_xact_replay_timestamp() AS lag"
```

## Promote read replica

```bash
pg_ctl promote -D /var/lib/postgresql/data
```

## Connection count

```bash
psql -h db-primary.internal -U admin -c "SELECT count(*) FROM pg_stat_activity"
```
EOF

cat > runbooks/deploy.md << 'EOF'
## Deploy to staging

```bash
git push staging main
kubectl rollout status deployment/api -n staging
```
EOF

# Archived file — should be excluded from demo config
cat > runbooks/archive/old-migration-2024.md << 'EOF'
## Old migration steps (archived)

```bash
echo "this should not appear in the panel"
```
EOF

echo "  - Runbooks created (3 active, 1 archived)"

# ---------------------------------------------------------------
# 2. nearvar.yaml — realistic config with recursive + exclude
# ---------------------------------------------------------------
cat > nearvar.yaml << 'EOF'
# nearvar.yaml — NearVar configuration
sources:
  runbooks:
    - path: ./runbooks/
      recursive: true
      exclude:
        - "archive/*"
  bash: true
  env:
    - .env
  aws: true
EOF

echo "  - nearvar.yaml configured"

# ---------------------------------------------------------------
# 3. .env file — realistic workspace variables
# ---------------------------------------------------------------
cat > .env << 'EOF'
APP_PORT=3000
APP_ENV=development
LOG_LEVEL=debug
EOF

echo "  - .env created"

# ---------------------------------------------------------------
# 4. Bash vars — realistic exports + one dynamic var for demo
#    Appended to .bashrc with clear markers for easy cleanup
# ---------------------------------------------------------------
BASHRC="$HOME/.bashrc"
MARKER_START="# >>> NEARVAR DEMO START >>>"
MARKER_END="# <<< NEARVAR DEMO END <<<"

# Remove any previous demo block first (idempotent)
if grep -q "$MARKER_START" "$BASHRC" 2>/dev/null; then
  sed -i "/$MARKER_START/,/$MARKER_END/d" "$BASHRC"
fi

cat >> "$BASHRC" << EOF
$MARKER_START
export DEPLOY_ENV=production
export SERVICE_NAME=api-gateway
export DEPLOY_TOKEN=\$(date +%s)
$MARKER_END
EOF

echo "  - Bash vars added to ~/.bashrc (DEPLOY_ENV, SERVICE_NAME, DEPLOY_TOKEN[dynamic])"
echo "    NOTE: open a NEW terminal or 'source ~/.bashrc' for these to take effect"

# ---------------------------------------------------------------
# 5. AWS config + credentials — realistic profiles
# ---------------------------------------------------------------
mkdir -p "$HOME/.aws"

AWS_CONFIG="$HOME/.aws/config"
AWS_CREDS="$HOME/.aws/credentials"

# Back up existing files if present and not already backed up
if [ -f "$AWS_CONFIG" ] && [ ! -f "$AWS_CONFIG.nearvar-demo-bak" ]; then
  cp "$AWS_CONFIG" "$AWS_CONFIG.nearvar-demo-bak"
fi
if [ -f "$AWS_CREDS" ] && [ ! -f "$AWS_CREDS.nearvar-demo-bak" ]; then
  cp "$AWS_CREDS" "$AWS_CREDS.nearvar-demo-bak"
fi

cat > "$AWS_CONFIG" << 'EOF'
[default]
region = us-east-1
output = json

[profile staging]
region = eu-west-1

[profile production]
region = ap-southeast-1
EOF

cat > "$AWS_CREDS" << 'EOF'
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[staging]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[production]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EOF

echo "  - AWS config + credentials created (default, staging, production)"
echo "    NOTE: previous ~/.aws files backed up with .nearvar-demo-bak suffix"

echo ""
echo "==> Demo environment ready."
echo ""
echo "Next steps:"
echo "  1. Open a NEW terminal (or run: source ~/.bashrc) so bash vars load"
echo "  2. F5 in VS Code -> open /home/rehman/repos/nearvar in the EDH"
echo "  3. Click the NV icon to see the populated panel"
echo "  4. When done capturing screenshots, run: bash nearvar_demo_cleanup.sh"
