#!/usr/bin/env bash
set -euo pipefail

URL="${1:-}"
if [[ -z "$URL" ]]; then
  echo "usage: $0 <mcp-url> [transport]" >&2
  exit 64
fi

TRANSPORT="${2:-http}"
OUT_DIR="${MCP_EVIDENCE_DIR:-./evidence/mcp}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SAFE_NAME="$(printf '%s' "$URL" | sed -E 's#https?://##; s#[^A-Za-z0-9._-]+#_#g')"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"

COMMON=(
  npx --yes @modelcontextprotocol/inspector
  --cli "$URL"
  --transport "$TRANSPORT"
  --protocol-era auto
  --connect-timeout 15000
  --format json
)

if [[ "${MCP_STORED_AUTH_ONLY:-0}" == "1" ]]; then
  COMMON+=(--stored-auth-only)
fi

echo "[1/2] MCP identity/protocol: $URL"
"${COMMON[@]}" --method initialize   | tee "$OUT_DIR/${STAMP}-${SAFE_NAME}-initialize.json"

echo "[2/2] MCP tools/list + schema lint: $URL"
"${COMMON[@]}" --method tools/list --strict   | tee "$OUT_DIR/${STAMP}-${SAFE_NAME}-tools-list.json"

sha256sum   "$OUT_DIR/${STAMP}-${SAFE_NAME}-initialize.json"   "$OUT_DIR/${STAMP}-${SAFE_NAME}-tools-list.json"   | tee "$OUT_DIR/${STAMP}-${SAFE_NAME}-SHA256SUMS.txt"

echo "MCP smoke PASS: $URL"
