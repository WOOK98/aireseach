# MCP Key Management Runbook

## Key Format

- Prefix: `mcp_` + random body (e.g. `mcp_a1b2c3d4e5f6`)
- Named keys: `label=mcp_xxx` (e.g. `beta-alice=mcp_a1b2c3d4e5f6`)
- `MCP_API_KEYS` env var: comma-separated list

## Issue a New Key

1. Generate: `python3 -c "import secrets; print('mcp_' + secrets.token_urlsafe(24))"`
2. Label it: `beta-<name>=<key>` (e.g. `beta-alice=mcp_a1b2c3d4e5f6`)
3. Append to `MCP_API_KEYS` in Vercel env: `existing...,beta-alice=mcp_xxx`
4. Redeploy (or wait for Vercel auto-deploy)
5. Smoke: `MCP_SMOKE_KEY=<new_key> bash ops/smoke/mcp-health.sh` → expect `HEALTHY`

## Revoke a Single Key

1. Remove the entry from `MCP_API_KEYS` in Vercel env
2. Redeploy
3. Smoke with revoked key → expect `AUTH_FAIL` (exit 1)
4. Smoke with a remaining key → expect `HEALTHY` (exit 0)

## Auth Logging

- Each request logs a key fingerprint (first 8 hex chars of SHA-256)
- Example: `[mcp-auth] key=beta-alice fp=a1b2c3d4 status=200`
- Use fingerprint to identify which key made a request; never log the full key

## Four Smoke States

| Exit | State          | Meaning                                       |
| ---- | -------------- | --------------------------------------------- |
| 0    | HEALTHY        | Endpoint up, auth OK                          |
| 1    | AUTH_FAIL      | Endpoint reachable, auth behaviour unexpected |
| 2    | UNREACHABLE    | Timeout / DNS failure / non-2xx               |
| 3    | NOT_CONFIGURED | Secrets not set yet                           |
