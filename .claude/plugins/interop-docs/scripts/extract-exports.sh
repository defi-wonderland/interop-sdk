#!/bin/bash
# extract-exports.sh
# Extracts public API exports from a package for documentation verification

PACKAGE=$1

if [ -z "$PACKAGE" ]; then
  echo "Usage: extract-exports.sh <package-name>"
  echo "Example: extract-exports.sh addresses"
  exit 1
fi

PACKAGE_DIR="packages/$PACKAGE"

if [ ! -d "$PACKAGE_DIR" ]; then
  echo "Error: Package directory not found: $PACKAGE_DIR"
  exit 1
fi

echo "=== Public Exports for @interop-sdk/$PACKAGE ==="
echo ""

# Check for external.ts first (preferred)
if [ -f "$PACKAGE_DIR/src/external.ts" ]; then
  echo "--- From external.ts ---"
  grep -E "^export " "$PACKAGE_DIR/src/external.ts" | sort
  echo ""
fi

# Check index.ts
if [ -f "$PACKAGE_DIR/src/index.ts" ]; then
  echo "--- From index.ts ---"
  grep -E "^export " "$PACKAGE_DIR/src/index.ts" | sort
  echo ""
fi

# Check types.ts
if [ -f "$PACKAGE_DIR/src/types.ts" ]; then
  echo "--- Type Exports from types.ts ---"
  grep -E "^export (type|interface)" "$PACKAGE_DIR/src/types.ts" | sort
  echo ""
fi

# List all exported functions with their signatures
echo "=== Function Signatures ==="
for file in "$PACKAGE_DIR/src/external.ts" "$PACKAGE_DIR/src/index.ts"; do
  if [ -f "$file" ]; then
    # Extract function exports with their full signatures
    grep -A 5 "^export function" "$file" 2>/dev/null | head -50
    grep -A 5 "^export const" "$file" 2>/dev/null | head -50
    grep -A 5 "^export class" "$file" 2>/dev/null | head -50
  fi
done

echo ""
echo "=== Summary ==="
EXPORT_COUNT=$(grep -rE "^export " "$PACKAGE_DIR/src/external.ts" "$PACKAGE_DIR/src/index.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "Total exports: $EXPORT_COUNT"
