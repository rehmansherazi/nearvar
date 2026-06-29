#!/bin/bash
# cleanup/s02_full_panel.sh — undo s02 setup
set -e

DEMO_DIR="$HOME/nearvar-demo"
NEARVAR_YAML="$HOME/nearvar.yaml"
AWS_CONFIG="$HOME/.aws/config"

echo "==> Cleaning up s02 (full panel)..."

# ── Restore helper ────────────────────────────────────────────────────────────
restore() {
    local file="$1"
    local backup="${file}.bak"
    if [ -f "$backup" ]; then
        mv "$backup" "$file"
        echo "  ✓ Restored $file"
    elif [ -f "$file" ]; then
        rm -f "$file"
        echo "  ✓ Removed $file (no prior backup)"
    fi
}

# ── Remove runbooks and .env ──────────────────────────────────────────────────
if [ -d "$DEMO_DIR/runbooks" ]; then
    rm -rf "$DEMO_DIR/runbooks"
    echo "  ✓ Removed $DEMO_DIR/runbooks/"
fi

if [ -f "$DEMO_DIR/.env" ]; then
    rm -f "$DEMO_DIR/.env"
    echo "  ✓ Removed $DEMO_DIR/.env"
fi

# Remove demo dir if now empty
rmdir "$DEMO_DIR" 2>/dev/null && echo "  ✓ Removed $DEMO_DIR (empty)" || true

# ── Restore AWS config ────────────────────────────────────────────────────────
restore "$AWS_CONFIG"

# ── Restore nearvar.yaml ──────────────────────────────────────────────────────
restore "$NEARVAR_YAML"

echo ""
echo "✓ Cleaned up scenario 02"
