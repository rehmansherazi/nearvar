#!/bin/bash
# s05_codelens.sh — CodeLens above fenced bash blocks in the editor
# Screenshot: editor open on deploy.md with ▶ NearVar: heading above each block
set -e

DEMO_DIR="$HOME/nearvar-demo"
RUNBOOKS_DIR="$DEMO_DIR/runbooks"
NEARVAR_YAML="$HOME/nearvar.yaml"

echo "==> s05: Setting up CodeLens demo..."

backup() {
    local file="$1"
    if [ -f "$file" ] && [ ! -f "${file}.bak" ]; then
        cp "$file" "${file}.bak"
        echo "  ✓ Backed up $file"
    fi
}

# ── Runbook file ──────────────────────────────────────────────────────────────
mkdir -p "$RUNBOOKS_DIR"

cat > "$RUNBOOKS_DIR/deploy.md" << 'EOF'
# Deployment runbook

## Deploy to staging

```bash
git push staging main
kubectl rollout status deployment/api -n staging
```

## Deploy to production

```bash
git push production main
kubectl rollout status deployment/api -n production
```

## Rollback

```bash
kubectl rollout undo deployment/api -n production
kubectl rollout status deployment/api -n production
```
EOF

echo "  ✓ Created $RUNBOOKS_DIR/deploy.md (3 fenced blocks with headings)"

# ── nearvar.yaml ──────────────────────────────────────────────────────────────
backup "$NEARVAR_YAML"

cat > "$NEARVAR_YAML" << EOF
# nearvar.yaml — s05 CodeLens demo
sources:
  runbooks:
    - $RUNBOOKS_DIR/deploy.md
  bash: false
  aws: false
ui:
  collapsed: []
EOF
echo "  ✓ Created ~/nearvar.yaml (pointing at deploy.md)"

echo ""
echo "Next steps:"
echo "  1. Open $RUNBOOKS_DIR/deploy.md in the VS Code editor"
echo "     (File → Open File, or Explorer panel)"
echo "  2. Confirm '▶ NearVar: Deploy to staging' appears above each fenced block"
echo "     (CodeLens may take a moment to appear — click elsewhere and back)"
echo "  3. Screenshot showing the editor with CodeLens annotations visible"
echo ""
echo "✓ Ready — open $RUNBOOKS_DIR/deploy.md and screenshot"
