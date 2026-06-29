#!/bin/bash
# cleanup_all.sh — run all cleanup scripts in order
# Continues even if one fails — prints summary at end

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLEANUP_DIR="$SCRIPT_DIR/cleanup"

echo "==> NearVar: running all cleanup scripts..."
echo ""

PASSED=0
FAILED=0

run_cleanup() {
    local script="$CLEANUP_DIR/$1"
    local label="$2"
    if bash "$script"; then
        PASSED=$((PASSED + 1))
    else
        echo "  ✗ $label failed (continuing)"
        FAILED=$((FAILED + 1))
    fi
    echo ""
}

run_cleanup "s02_full_panel.sh"    "s02 full panel"
run_cleanup "s06_config.sh"        "s06 config"
run_cleanup "s09_yaml_sidebyside.sh" "s09 side-by-side"
run_cleanup "s10_named_sections.sh" "s10 named sections"
run_cleanup "s11_file_grouping.sh" "s11 file grouping"
run_cleanup "s12_sensitive_masking.sh" "s12 sensitive masking"

# Nuclear option: remove sandbox directory entirely if it still exists
DEMO_DIR="$HOME/nearvar-demo"
if [ -d "$DEMO_DIR" ]; then
    rm -rf "$DEMO_DIR"
    echo "  ✓ Removed remaining $DEMO_DIR"
fi

echo "==> Summary: $PASSED passed, $FAILED failed"
if [ "$FAILED" -gt 0 ]; then
    echo "    Check output above for errors."
fi
