#!/bin/bash
# cleanup/s05_codelens.sh — undo s05 setup
set -e

DEMO_DIR="$HOME/nearvar-demo"
NEARVAR_YAML="$HOME/nearvar.yaml"

echo "==> Cleaning up s05 (CodeLens)..."

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

if [ -d "$DEMO_DIR/runbooks" ]; then
    rm -rf "$DEMO_DIR/runbooks"
    echo "  ✓ Removed $DEMO_DIR/runbooks/"
fi

rmdir "$DEMO_DIR" 2>/dev/null && echo "  ✓ Removed $DEMO_DIR (empty)" || true

restore "$NEARVAR_YAML"

echo ""
echo "✓ Cleaned up scenario 05"
