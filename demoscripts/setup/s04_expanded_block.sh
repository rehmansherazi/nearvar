#!/bin/bash
# s04_expanded_block.sh — multi-command block expansion
# Screenshot: block header clicked open, individual command lines visible
set -e

DEMO_DIR="$HOME/nearvar-demo"
RUNBOOKS_DIR="$DEMO_DIR/runbooks"
NEARVAR_YAML="$HOME/nearvar.yaml"

echo "==> s04: Setting up expanded block demo..."

backup() {
    local file="$1"
    if [ -f "$file" ] && [ ! -f "${file}.bak" ]; then
        cp "$file" "${file}.bak"
        echo "  ✓ Backed up $file"
    fi
}

# ── Single runbook file with a multi-command block ────────────────────────────
mkdir -p "$RUNBOOKS_DIR"

cat > "$RUNBOOKS_DIR/incident-response.md" << 'EOF'
## Check pod status

```bash
kubectl get pods -n production
kubectl describe pod -n production
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

echo "  ✓ Created $RUNBOOKS_DIR/incident-response.md (2 multi-command blocks, 1 single)"

# ── nearvar.yaml ──────────────────────────────────────────────────────────────
backup "$NEARVAR_YAML"

cat > "$NEARVAR_YAML" << EOF
# nearvar.yaml — s04 expanded block demo
sources:
  runbooks:
    - $RUNBOOKS_DIR/
  bash: false
  aws: false
ui:
  collapsed: []
EOF
echo "  ✓ Created ~/nearvar.yaml"

echo ""
echo "Next steps:"
echo "  1. Click ▶ next to 'Check pod status' to expand the block"
echo "  2. Confirm individual command lines appear below the header"
echo "  3. Screenshot showing the expanded block with commands visible"
echo ""
echo "✓ Ready — open NearVar panel and screenshot"
