#!/bin/bash
# s08_yaml_config.sh — annotated nearvar.yaml (same setup as s06)
# Screenshot: config file open with annotations visible
set -e

echo "==> s08: Delegating to s06 setup (same nearvar.yaml)..."
exec "$(dirname "$0")/s06_config.sh"
