#!/bin/bash
# cleanup/s06_config.sh — undo s06 setup
set -e

NEARVAR_YAML="$HOME/nearvar.yaml"

echo "==> Cleaning up s06 (config file)..."

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

restore "$NEARVAR_YAML"

echo ""
echo "✓ Cleaned up scenario 06"
