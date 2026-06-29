#!/bin/bash
# cleanup/s08_yaml_config.sh — same as s06 cleanup (identical setup)
set -e

echo "==> Cleaning up s08 (yaml config — same as s06)..."
exec "$(dirname "$0")/s06_config.sh"
