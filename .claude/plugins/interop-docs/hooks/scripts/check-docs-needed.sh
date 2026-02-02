#!/bin/bash
# check-docs-needed.sh
# Detects if recent edits affect documentation-relevant files

# Get recently modified files in this git session
MODIFIED_FILES=$(git diff --name-only HEAD 2>/dev/null || git status --porcelain | awk '{print $2}')

# Check if any documentation-relevant files were modified
DOC_RELEVANT_PATTERNS=(
  "packages/addresses/src/"
  "packages/cross-chain/src/"
  "packages/addresses/test/"
  "packages/cross-chain/test/"
)

DOCS_NEED_UPDATE=false

for pattern in "${DOC_RELEVANT_PATTERNS[@]}"; do
  if echo "$MODIFIED_FILES" | grep -q "$pattern"; then
    DOCS_NEED_UPDATE=true
    break
  fi
done

if [ "$DOCS_NEED_UPDATE" = true ]; then
  # Check specifically for external.ts or types.ts changes (public API)
  if echo "$MODIFIED_FILES" | grep -qE "(external|types|index)\.ts$"; then
    echo "DOCS_ALERT: Public API files modified. Consider running /update-docs to verify documentation."
  else
    echo "DOCS_INFO: Package source files modified. Documentation may need updates."
  fi
fi

# Always exit 0 - this is informational only, not blocking
exit 0
