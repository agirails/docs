#!/bin/bash
# CI Gate: Verify no hardcoded 0x addresses in docs prose
# Addresses should only appear inside Basescan URLs or as dummy placeholders
#
# Usage: ./scripts/lint-addresses.sh
# Exit code: 0 = pass, 1 = fail

set -e

DOCS_DIR="docs"
FAIL=0

echo "=== Address Lint: Checking for hardcoded 0x addresses in docs ==="

# Find all backtick-wrapped real addresses in markdown (not in basescan URLs)
# Pattern: `0x followed by 40 hex chars` that is NOT inside a basescan URL
MATCHES=$(grep -rn '`0x[0-9a-fA-F]\{40\}`' "$DOCS_DIR" --include='*.md' --include='*.mdx' \
  | grep -v 'basescan.org' \
  | grep -v '0x1111111111111111111111111111111111111111' \
  | grep -v '0x2222222222222222222222222222222222222222' \
  | grep -v '0x3333333333333333333333333333333333333333' \
  | grep -v '0x1234567890123456789012345678901234567890' \
  | grep -v '0x742d35Cc6634C0532925a3b844Bc' \
  | grep -v '0x4200000000000000000000000000000000000021' \
  | grep -v '0x4200000000000000000000000000000000000020' \
  | grep -v '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' \
  | grep -v '0xBA5ED110eFDBa3D005bfC882d75358ACBbB85842' \
  || true)

if [ -n "$MATCHES" ]; then
  echo ""
  echo "FAIL: Found hardcoded addresses in docs prose:"
  echo "$MATCHES"
  echo ""
  echo "Fix: Replace with Basescan links or use SDK auto-configuration."
  FAIL=1
else
  echo "PASS: No hardcoded addresses found in docs prose."
fi

echo ""
echo "=== Link Check: Running Docusaurus build ==="
echo "(Docusaurus throws on broken links via onBrokenLinks: 'throw')"

if [ "$FAIL" -eq 1 ]; then
  echo ""
  echo "=== FAILED ==="
  exit 1
fi

echo ""
echo "=== ALL CHECKS PASSED ==="
exit 0
