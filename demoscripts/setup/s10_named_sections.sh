#!/bin/bash
# s10_named_sections.sh — custom named sections feature
# Screenshot: panel showing multiple named collapsible sections
set -e

NEARVAR_YAML="$HOME/nearvar.yaml"

echo "==> s10: Setting up named sections demo..."

# ── Backup helper ─────────────────────────────────────────────────────────────
backup() {
    local file="$1"
    if [ -f "$file" ] && [ ! -f "${file}.bak" ]; then
        cp "$file" "${file}.bak"
        echo "  ✓ Backed up $file"
    fi
}

# ── nearvar.yaml — three named sections, minimal other sources ────────────────
backup "$NEARVAR_YAML"

cat > "$NEARVAR_YAML" << 'EOF'
# nearvar.yaml — s10 named sections demo
sources:
  bash: true
  aws: false

sections:
  - name: "Production"
    commands:
      - label: "Check pod status"
        value: "kubectl get pods -n production"
      - label: "Restart deployment"
        value: "kubectl rollout restart deployment/api -n production"
      - label: "Tail logs"
        value: "kubectl logs -n production -l app=api --tail=100"

  - name: "Database"
    collapsed: true
    commands:
      - label: "Connection count"
        value: "psql -h db.internal -U admin -c 'SELECT count(*) FROM pg_stat_activity'"
      - label: "Replication lag"
        value: "psql -h db-primary.internal -U admin -c 'SELECT now() - pg_last_xact_replay_timestamp() AS lag'"

  - name: "GPU"
    commands:
      - label: "GPU status"
        value: "nvidia-smi"
      - label: "GPU processes"
        value: "nvidia-smi pmon -s u"

ui:
  collapsed: []
EOF

echo "  ✓ Created ~/nearvar.yaml (3 named sections: Production, Database, GPU)"
echo ""
echo "✓ Ready — open NearVar panel and screenshot"
