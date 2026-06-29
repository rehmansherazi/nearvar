#!/bin/bash
# cleanup/s09_yaml_sidebyside.sh — undo s09 setup (runbooks + aws + nearvar.yaml)
set -e

DEMO_DIR="$HOME/nearvar-demo"
NEARVAR_YAML="$HOME/nearvar.yaml"
AWS_CONFIG="$HOME/.aws/config"

echo "==> Cleaning up s09 (side-by-side)..."

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

if [ -f "$DEMO_DIR/.env" ]; then
    rm -f "$DEMO_DIR/.env"
    echo "  ✓ Removed $DEMO_DIR/.env"
fi

rmdir "$DEMO_DIR" 2>/dev/null && echo "  ✓ Removed $DEMO_DIR (empty)" || true

restore "$AWS_CONFIG"
restore "$NEARVAR_YAML"

echo ""
echo "✓ Cleaned up scenario 09"
