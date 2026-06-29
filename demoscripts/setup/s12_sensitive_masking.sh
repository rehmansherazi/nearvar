#!/bin/bash
# s12_sensitive_masking.sh — sensitive bash variable masking
# Screenshot: bash section with TOKEN/SECRET/KEY values showing ••••••••
set -e

NEARVAR_YAML="$HOME/nearvar.yaml"
BASHRC="$HOME/.bashrc"
MARKER_START="# <<< NEARVAR DEMO S12 START >>>"
MARKER_END="# <<< NEARVAR DEMO S12 END >>>"

echo "==> s12: Setting up sensitive masking demo..."

# ── Backup helper ─────────────────────────────────────────────────────────────
backup() {
    local file="$1"
    if [ -f "$file" ] && [ ! -f "${file}.bak" ]; then
        cp "$file" "${file}.bak"
        echo "  ✓ Backed up $file"
    fi
}

# ── 1. Append demo exports to ~/.bashrc (idempotent via markers) ──────────────
backup "$BASHRC"

# Remove any previous demo block first
if grep -q "NEARVAR DEMO S12 START" "$BASHRC" 2>/dev/null; then
    sed -i '/<<< NEARVAR DEMO S12 START >>>/,/<<< NEARVAR DEMO S12 END >>>/d' "$BASHRC"
fi

cat >> "$BASHRC" << 'BASHEOF'
# <<< NEARVAR DEMO S12 START >>>
# These are obviously fake — for NearVar screenshot demo only
export GITHUB_TOKEN="ghp_demo_token_not_real_abc123"
export DATABASE_PASSWORD="demo_password_not_real_xyz"
export STRIPE_SECRET_KEY="sk_test_demo_not_real_xyz789"
export DB_HOST="db.internal.example.com"
export DEPLOY_ENV="production"
export API_URL="https://api.internal.example.com"
export SERVICE_NAME="api-gateway"
# <<< NEARVAR DEMO S12 END >>>
BASHEOF

echo "  ✓ Appended demo exports to ~/.bashrc"
echo "  → Masked:  GITHUB_TOKEN, DATABASE_PASSWORD, STRIPE_SECRET_KEY"
echo "  → Visible: DB_HOST, DEPLOY_ENV, API_URL, SERVICE_NAME"

# ── 2. nearvar.yaml — bash only ───────────────────────────────────────────────
backup "$NEARVAR_YAML"

cat > "$NEARVAR_YAML" << 'EOF'
# nearvar.yaml — s12 sensitive masking demo
sources:
  bash: true
  aws: false
ui:
  collapsed: []
EOF

echo "  ✓ Created ~/nearvar.yaml (bash: true only)"
echo ""
echo "  ⚠  Source ~/.bashrc or open a new terminal first, then reload NearVar panel"
echo ""
echo "✓ Ready — open NearVar panel and screenshot"
