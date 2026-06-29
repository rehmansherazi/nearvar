#!/bin/bash
# s07_dynamic_badge.sh — dynamic variable badge (⚠ dynamic)
# Screenshot: bash section showing DEPLOY_TOKEN with dynamic badge instead of value
set -e

NEARVAR_YAML="$HOME/nearvar.yaml"
BASHRC="$HOME/.bashrc"
MARKER_START="# <<< NEARVAR DEMO S07 START >>>"
MARKER_END="# <<< NEARVAR DEMO S07 END >>>"

echo "==> s07: Setting up dynamic badge demo..."

backup() {
    local file="$1"
    if [ -f "$file" ] && [ ! -f "${file}.bak" ]; then
        cp "$file" "${file}.bak"
        echo "  ✓ Backed up $file"
    fi
}

# ── Append dynamic exports to ~/.bashrc (idempotent via markers) ──────────────
backup "$BASHRC"

if grep -q "NEARVAR DEMO S07 START" "$BASHRC" 2>/dev/null; then
    sed -i '/<<< NEARVAR DEMO S07 START >>>/,/<<< NEARVAR DEMO S07 END >>>/d' "$BASHRC"
fi

cat >> "$BASHRC" << 'BASHEOF'
# <<< NEARVAR DEMO S07 START >>>
# NearVar demo — dynamic badge (value uses $() substitution)
export DEPLOY_TOKEN=$(date +%s)
export SERVICE_NAME="api-gateway"
export DEPLOY_ENV="production"
# <<< NEARVAR DEMO S07 END >>>
BASHEOF

echo "  ✓ Appended demo exports to ~/.bashrc"
echo "  → DEPLOY_TOKEN uses \$(date +%s) — shows ⚠ dynamic badge in panel"
echo "  → SERVICE_NAME and DEPLOY_ENV show plain values"

# ── nearvar.yaml — bash only ──────────────────────────────────────────────────
backup "$NEARVAR_YAML"

cat > "$NEARVAR_YAML" << 'EOF'
# nearvar.yaml — s07 dynamic badge demo
sources:
  bash: true
  aws: false
ui:
  collapsed: []
EOF
echo "  ✓ Created ~/nearvar.yaml (bash: true only)"

echo ""
echo "Next steps:"
echo "  1. Source ~/.bashrc or open a new terminal:"
echo "     source ~/.bashrc"
echo "  2. Reload the NearVar panel (close and reopen, or edit nearvar.yaml)"
echo "  3. Find DEPLOY_TOKEN in the Bash Variables section"
echo "  4. Confirm it shows '⚠ dynamic' badge instead of a value"
echo "  5. Screenshot showing the dynamic badge"
echo ""
echo "✓ Ready — reload NearVar panel and screenshot"
