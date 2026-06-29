#!/bin/bash
# cleanup/s07_dynamic_badge.sh — undo s07 setup
set -e

NEARVAR_YAML="$HOME/nearvar.yaml"
BASHRC="$HOME/.bashrc"

echo "==> Cleaning up s07 (dynamic badge)..."

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

if grep -q "NEARVAR DEMO S07 START" "$BASHRC" 2>/dev/null; then
    sed -i '/<<< NEARVAR DEMO S07 START >>>/,/<<< NEARVAR DEMO S07 END >>>/d' "$BASHRC"
    echo "  ✓ Removed demo exports from ~/.bashrc"
    rm -f "${BASHRC}.bak"
else
    echo "  ✓ No demo block found in ~/.bashrc (already clean)"
    rm -f "${BASHRC}.bak"
fi

restore "$NEARVAR_YAML"

echo ""
echo "  ⚠  Open a new terminal to clear demo vars from your current session"
echo ""
echo "✓ Cleaned up scenario 07"
