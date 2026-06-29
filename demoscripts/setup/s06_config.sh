#!/bin/bash
# s06_config.sh — comprehensive nearvar.yaml showing all config options
# Screenshot: config file open in editor, full schema visible
set -e

NEARVAR_YAML="$HOME/nearvar.yaml"
DEMO_DIR="$HOME/nearvar-demo"

echo "==> s06: Setting up config file demo..."

# ── Backup helper ─────────────────────────────────────────────────────────────
backup() {
    local file="$1"
    if [ -f "$file" ] && [ ! -f "${file}.bak" ]; then
        cp "$file" "${file}.bak"
        echo "  ✓ Backed up $file"
    fi
}

# ── nearvar.yaml — every option shown and commented ──────────────────────────
backup "$NEARVAR_YAML"

cat > "$NEARVAR_YAML" << EOF
# nearvar.yaml — NearVar configuration

sources:
  runbooks:
    # Single local file
    - $DEMO_DIR/runbooks/deploy.md

    # Local folder (recursive, with exclude)
    - path: $DEMO_DIR/runbooks/
      recursive: true
      exclude:
        - "*.draft.md"
        - "archive/*"

    # Public GitHub raw file URL
    - https://raw.githubusercontent.com/org/repo/main/oncall.md

  bash: true          # reads ~/.bashrc, ~/.bash_profile, ~/.bash_login
  env:
    - .env
    - .env.local
  aws: true           # reads ~/.aws/config profiles

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
