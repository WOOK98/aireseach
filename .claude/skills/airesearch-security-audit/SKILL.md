---
name: airesearch-security-audit
description: Run a security and architecture closeout audit on the airesearch platform (WOOK98/aireseach repo, airesearchs.com). Use this skill whenever Wook mentions security, auth, API keys, MCP server hardening, leaked secrets, rate limiting, "安全", "鉴权", "审计", or asks to review/harden any part of the airesearch backend (Hono API, MCP router, report-agent, Stripe webhooks, Better Auth). Also trigger before any production deploy review of airesearchs.com.
---

# airesearch Security & Architecture Audit

Audit and harden the airesearch platform. Repo: `WOOK98/aireseach` (public). Stack: TurboStarter Next.js monorepo, Hono API (`packages/api`), Python report-agent (`apps/report-agent`), Better Auth, Stripe, hosted MCP server at `https://www.airesearchs.com/api/mcp`.

## Step 0 — ALWAYS check first: leaked secrets (CRITICAL, confirmed 2026-07)

`apps/report-agent/.env` was found **committed to the public repo** containing real `JINA_API_KEY` and `LLM_API_KEY` values. Until confirmed remediated, treat this as the top finding in every audit. Remediation checklist:

1. **Rotate keys immediately** at the provider dashboards (Jina, and the LLM provider — key starts with `s`, likely DeepSeek/OpenAI-compatible). Rotation must happen BEFORE cleaning the repo; deleting the file does not un-leak it.
2. Remove the file from git tracking: `git rm --cached apps/report-agent/.env` and add `apps/report-agent/.env` to root `.gitignore` (verify `.gitignore` actually covers it — a nested `.gitignore` existed but the file was still tracked).
3. Purge from history with `git filter-repo --path apps/report-agent/.env --invert-paths` (or BFG), then force-push. Warn Wook this rewrites history and collaborators/CI must re-clone.
4. Scan the FULL history for other secrets: `gitleaks detect --source . --log-opts="--all"` or `trufflehog git file://.`. Also grep for `sk-`, `whsec_`, `AIza`, `Bearer `, `API_KEY=` across all revisions.
5. Check Vercel/deployment env vars are the only place secrets live going forward.

## Step 1 — MCP server hardening (`packages/api/src/modules/mcp/router.ts`)

Current state (verified): auth is **fail-closed** — empty `MCP_API_KEYS` returns 401 for all POSTs. So the server is not open, but it is also **unusable until keys are set**.

Audit items:
- `MCP_API_KEYS` must be set in production (comma-separated). Generate with `openssl rand -hex 32`. One key per consumer (plugin distribution, Wook's own Claude Code, partners) so keys can be revoked independently.
- Token comparison uses `Array.includes` (string equality) — recommend timing-safe compare (`crypto.timingSafeEqual` on hashed values) if keys become high-value.
- No rate limiting on the POST handler. Add per-key rate limits (e.g. Hono middleware + Upstash/Redis or in-memory sliding window) — MCP tools fan out to paid data APIs, so an abused key burns money.
- Batch JSON-RPC requests are processed with unbounded `Promise.all` — cap batch size (e.g. max 10) to prevent amplification.
- The GET `/` endpoint lists all tool names publicly — decide if that's intended (fine for discovery, but confirm).
- Log auth failures with source IP for abuse detection; never log the presented token.

## Step 2 — Ticker/entity defense layers regression check

The Research Terminal previously misparsed natural-language queries ("Liquid Silicone Rubber") as tickers and fabricated data. Four defenses exist: entity resolution, ENTITY/TECHNICAL DATA LOCKs, server-side ticker validation, real-data-only Technical lens. On each audit:

1. Locate the validation code (search repo for `ticker`, `entity`, `resolve`) and confirm all four layers are still wired in the request path (not bypassed by newer endpoints).
2. Run the adversarial query set in `references/adversarial-queries.md` against staging. Any query that returns per-ticker skill output for a non-ticker phrase is a FAIL.
3. Confirm the Technical lens rejects requests when market data fetch fails, rather than letting the model fill gaps.

## Step 3 — Standard sweep

Work through these, reporting findings as: Severity (Critical/High/Med/Low) → File/path → Issue → Concrete fix (diff or command).

- **Auth surface**: Better Auth config (`apps/web/src/lib/auth/server.ts`, `auth-proxy.ts`) — session settings, open registration abuse, 2FA paths.
- **Stripe**: webhook signature verification present and env `STRIPE_WEBHOOK_SECRET` used; idempotent event handling (past bug: subscribers stuck on Free tier).
- **Usage limits**: per-user daily chat limits enforced server-side, not just in UI; usage log can't be bypassed by calling the API directly.
- **report-agent (Python)**: `apps/report-agent/server.py`, `api/index.py` — input validation, no shell/eval on user input, dependency audit (`pip-audit` on `requirements.txt`).
- **Headers/CORS**: check Next.js/Hono CORS config isn't `*` on authenticated routes; security headers (CSP, HSTS) on airesearchs.com.
- **Dependency audit**: `pnpm audit` at root; flag criticals only.

## Output format

Produce a single report: (1) Executive summary in Chinese, 3–5 sentences; (2) findings table ordered by severity; (3) ready-to-apply patches or exact commands for the top 3 items. If run inside the repo with write access, offer to apply Critical fixes directly on a branch `security/audit-YYYYMMDD`.
