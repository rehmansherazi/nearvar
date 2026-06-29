#!/bin/bash
# cleanup/s03_paste_action.sh — undo s03 setup (same as s02)
set -e

echo "==> Cleaning up s03 (paste action — same data as s02)..."
exec "$(dirname "$0")/s02_full_panel.sh"
