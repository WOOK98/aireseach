# MCP Smoke Test

Tri-state health check for the production MCP endpoint.

## Exit Codes

| Code | State       | Meaning                                          |
| ---- | ----------- | ------------------------------------------------ |
| 0    | HEALTHY     | Endpoint reachable, auth enforced & accepted     |
| 1    | AUTH_FAIL   | Endpoint reachable but auth behaviour unexpected |
| 2    | UNREACHABLE | Timeout / DNS failure / non-2xx on GET           |

## Usage

```bash
MCP_SMOKE_ENDPOINT="https://<host>/api/mcp" \
MCP_SMOKE_KEY="<valid-bearer-token>" \
MCP_SMOKE_TIMEOUT=10 \
bash ops/smoke/mcp-health.sh
```

## GitHub Actions Setup

Add these repository secrets (Settings → Secrets and variables → Actions):

| Secret               | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `MCP_SMOKE_ENDPOINT` | Full MCP URL, e.g. `https://www.airesearchs.com/api/mcp` |
| `MCP_SMOKE_KEY`      | A valid Bearer token from `MCP_API_KEYS`                 |

The workflow runs every 6 hours (`:17 past the hour`) and on manual dispatch.
On failure, it auto-creates a GitHub issue labeled `mcp-smoke,auto,P1`.

## Local Cron (alternative)

```cron
17 */6 * * * MCP_SMOKE_ENDPOINT="https://..." MCP_SMOKE_KEY="..." bash /path/to/ops/smoke/mcp-health.sh >> /var/log/mcp-smoke.log 2>&1
```

## Design Decisions

- **No keys or hostnames in repo.** All sensitive values come from env vars.
- **GET check first.** Validates endpoint is alive before testing auth.
- **No-key POST expected 401.** Confirms auth middleware is active.
- **Valid-key POST expected 200.** Confirms key acceptance + tools/list works.
- **Single-line stdout.** Easy to parse by CI/cron. Details go to stderr.
