#!/bin/bash
# nearvar_demo_cleanup.sh
# Removes everything created by nearvar_demo_setup.sh
# Restores original ~/.aws files if they existed.

set -e

PROJECT_DIR="/home/rehman/repos/nearvar"
cd "$PROJECT_DIR"

echo "==> Cleaning up NearVar demo environment..."

# 1. Remove runbooks folder
rm -rf runbooks/
echo "  - runbooks/ removed"

# 2. Restore nearvar.yaml to clean template
cat > nearvar.yaml << 'EOF'
# nearvar.yaml — NearVar configuration
sources:
  runbooks:
    # Shorthand — index a single file directly
    # - ./runbooks/deploy.md
    #
    # Shorthand — index all .md files in a folder (recursive)
    # - ~/oncall/playbooks/procedures/
    #
    # Full options — folder with recursive and exclude control
    # - path: ~/oncall/playbooks/
    #   recursive: false     # top-level files only
    #   exclude:
    #     - "*.draft.md"     # skip draft files
    #     - "archive/*"      # skip archive subfolder
    []
  bash: true
  env: []
  aws: true
EOF
echo "  - nearvar.yaml restored to clean template"

# 3. Remove .env
rm -f .env
echo "  - .env removed"

# 4. Remove bash vars block from .bashrc
BASHRC="$HOME/.bashrc"
MARKER_START="# >>> NEARVAR DEMO START >>>"
MARKER_END="# <<< NEARVAR DEMO END <<<"

if grep -q "$MARKER_START" "$BASHRC" 2>/dev/null; then
  sed -i "/$MARKER_START/,/$MARKER_END/d" "$BASHRC"
  echo "  - Demo block removed from ~/.bashrc"
else
  echo "  - No demo block found in ~/.bashrc (already clean)"
fi

# 5. Restore AWS config/credentials from backup, or remove if no backup existed
AWS_CONFIG="$HOME/.aws/config"
AWS_CREDS="$HOME/.aws/credentials"

if [ -f "$AWS_CONFIG.nearvar-demo-bak" ]; then
  mv "$AWS_CONFIG.nearvar-demo-bak" "$AWS_CONFIG"
  echo "  - ~/.aws/config restored from backup"
else
  rm -f "$AWS_CONFIG"
  echo "  - ~/.aws/config removed (no prior backup existed)"
fi

if [ -f "$AWS_CREDS.nearvar-demo-bak" ]; then
  mv "$AWS_CREDS.nearvar-demo-bak" "$AWS_CREDS"
  echo "  - ~/.aws/credentials restored from backup"
else
  rm -f "$AWS_CREDS"
  echo "  - ~/.aws/credentials removed (no prior backup existed)"
fi

echo ""
echo "==> Cleanup complete. Open a NEW terminal to clear demo bash vars from your session."
