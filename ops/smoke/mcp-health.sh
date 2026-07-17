#!/usr/bin/env bash
# mcp-health.sh — MCP production smoke test (four-state)
#
# Exit codes:
#   0  HEALTHY        — endpoint reachable, auth enforced & accepted
#   1  AUTH_FAIL       — endpoint reachable but auth behaviour unexpected
#   2  UNREACHABLE     — connection timeout / DNS failure / non-2xx on GET
#   3  NOT_CONFIGURED  — MCP_SMOKE_ENDPOINT or MCP_SMOKE_KEY not set
#
# Required env:
#   MCP_SMOKE_ENDPOINT  — full URL (e.g. https://<host>/api/mcp)
#   MCP_SMOKE_KEY       — a valid Bearer token
#
# Optional env:
#   MCP_SMOKE_TIMEOUT   — curl timeout in seconds (default: 10)
#
# Output: single-line summary to stdout, details to stderr on failure.

set -euo pipefail

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

# ---------------------------------------------------------------------------
# Phase 0: Configuration check — exit 3 if env vars are missing or empty.
# This is NOT an auth failure — secrets simply aren't configured yet.
# Workflow treats exit 3 as a warning, not a failure.
# ---------------------------------------------------------------------------
if [[ -z "${MCP_SMOKE_ENDPOINT:-}" || -z "${MCP_SMOKE_KEY:-}" ]]; then
  echo "[$(timestamp)] NOT_CONFIGURED — MCP_SMOKE_ENDPOINT or MCP_SMOKE_KEY not set (exit 3)" >&2
  echo "NOT_CONFIGURED | secrets not configured | $(timestamp)"
  exit 3
fi

ENDPOINT="$MCP_SMOKE_ENDPOINT"
KEY="$MCP_SMOKE_KEY"
TIMEOUT="${MCP_SMOKE_TIMEOUT:-10}"

# ---------------------------------------------------------------------------
# Phase 1: Reachability — GET the MCP root (no auth required by design)
# ---------------------------------------------------------------------------
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time "$TIMEOUT" \
  "${ENDPOINT}" 2>/dev/null) || {
  echo "[$(timestamp)] UNREACHABLE — GET ${ENDPOINT} timed out or DNS failed (exit 2)" >&2
  echo "UNREACHABLE | GET timeout/DNS fail | $(timestamp)"
  exit 2
}

if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
  echo "[$(timestamp)] UNREACHABLE — GET returned HTTP ${HTTP_CODE} (exit 2)" >&2
  echo "UNREACHABLE | GET HTTP ${HTTP_CODE} | $(timestamp)"
  exit 2
fi

# ---------------------------------------------------------------------------
# Phase 2: Auth enforcement — POST without key (expect 401)
# ---------------------------------------------------------------------------
NO_KEY_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time "$TIMEOUT" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' 2>/dev/null) || {
  echo "[$(timestamp)] UNREACHABLE — unauth POST timed out (exit 2)" >&2
  echo "UNREACHABLE | unauth POST timeout | $(timestamp)"
  exit 2
}

if [[ "$NO_KEY_CODE" != "401" ]]; then
  echo "[$(timestamp)] AUTH_FAIL — unauth POST returned ${NO_KEY_CODE}, expected 401 (exit 1)" >&2
  echo "AUTH_FAIL | unauth POST got ${NO_KEY_CODE}, want 401 | $(timestamp)"
  exit 1
fi

# ---------------------------------------------------------------------------
# Phase 3: Auth acceptance — POST with key (expect 200 + valid JSON-RPC)
# ---------------------------------------------------------------------------
RAW=$(curl -s -w '\n%{http_code}' --max-time "$TIMEOUT" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${KEY}" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' 2>/dev/null) || {
  echo "[$(timestamp)] AUTH_FAIL — auth POST timed out (exit 1)" >&2
  echo "AUTH_FAIL | auth POST timeout | $(timestamp)"
  exit 1
}

AUTH_CODE=$(echo "$RAW" | tail -1)
RESPONSE=$(echo "$RAW" | sed '$d')

if [[ "$AUTH_CODE" != "200" ]]; then
  echo "[$(timestamp)] AUTH_FAIL — auth POST returned HTTP ${AUTH_CODE}, expected 200 (exit 1)" >&2
  echo "AUTH_FAIL | auth POST HTTP ${AUTH_CODE} | $(timestamp)"
  exit 1
fi

# Verify response contains tools array
if ! echo "$RESPONSE" | grep -q '"tools"'; then
  echo "[$(timestamp)] AUTH_FAIL — response missing 'tools' key (exit 1)" >&2
  echo "AUTH_FAIL | no tools in response | $(timestamp)"
  exit 1
fi

TOOL_COUNT=$(echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
tools = data.get('result', {}).get('tools', [])
print(len(tools))
" 2>/dev/null || echo "?")

echo "[$(timestamp)] HEALTHY — endpoint up, auth OK, ${TOOL_COUNT} tools exposed (exit 0)" >&2
echo "HEALTHY | ${TOOL_COUNT} tools | $(timestamp)"
exit 0
