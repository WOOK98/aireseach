# Airesearch Plugin / MCP Rollout Notes

## 1. Push the real report-agent code

Run this in the local report-agent repository, not in this monorepo:

```bash
grep -RInE "(sk-|api[_-]?key|DEEPSEEK|OPENAI|Bearer )" . \
  --exclude-dir=.git \
  --exclude-dir=.venv \
  --exclude-dir=node_modules

git status --short
git switch -c serenity-agent
git add .
git commit -m "feat: publish serenity multi-lens report agent"
git push -u origin serenity-agent
```

Use `serenity-agent` instead of `main` because GitHub `main` currently contains the older business-report demo shape.

## 2. MCP/data layer in this repository

Implemented in this repo:

- `packages/api/src/modules/report/cache.ts`
  - Generic TTL memoizer.
  - 5-minute cache is used by report data sources.
  - In-flight deduplication shares the same pending Promise, so six parallel skills hitting the same ticker produce one Yahoo request.
- `packages/api/src/modules/report/data-sources.ts`
  - Shared cached wrappers for entity resolution, Yahoo financials, and technicals.
- `packages/api/src/modules/mcp/router.ts`
  - Mounted at `POST /api/mcp`.
  - Tools: `resolve_entity`, `get_quote`, `get_financials`, `get_technicals`.
  - Auth: set `MCP_API_KEYS` to comma-separated keys; clients send `Authorization: Bearer <key>`.

Quick checks:

```bash
pnpm --filter @workspace/api exec tsc --noEmit
pnpm --filter @workspace/api test
```

## 3. Plugin publishing

Create the plugin repo once the plugin files are ready locally:

```bash
gh repo create WOOK98/airesearch-plugin --public --source . --remote origin --push
```

Acceptance cases:

- `NVDA` resolves to NVIDIA and can produce the full flow.
- `LIQUID` must return candidates, not a report.
- `/snapshot MU` runs a ticker snapshot.
- `液态硅胶` triggers industry/material mode instead of stock technical analysis.

For v0.3 per-user keys, replace only the MCP `isAuthorized()` function in `packages/api/src/modules/mcp/router.ts`.
