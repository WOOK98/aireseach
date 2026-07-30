# Agent Discipline Directive — P0

> Effective 2026-07-30. All agents (OpenClaw, Codex, any future agent) MUST
> comply. Violations are delivery failures, not style differences.

---

## Rule 1: No Direct Push to Main

All implementation and fix commits MUST follow:

```
issue → branch → PR → CI green → Wook merges
```

**No exceptions.** "Small fix", "one-line change", "urgent" — all go through PR.
The only allowed direct push is automated dependency updates (Dependabot/Renovate)
with passing CI.

**Enforcement:** Branch protection rules on `main`. Agent MUST NOT bypass.

---

## Rule 2: CI Status in Every Delivery

Every report, update, or handoff that claims work is "done" or "ready" MUST include
a CI status block. Format:

```
CI: Build ✅ | Unit ✅ | Playwright ✅ | Redline ✅ | Lint ✅
```

**Missing CI status = incomplete delivery.** The agent MUST check `gh pr checks`
before claiming green. "Looks green" without evidence is a violation.

---

## Rule 3: Redline Wordlist — Single Source of Truth

The supplier-name blocklist MUST be maintained in ONE file:

```
scripts/redline-wordlist.txt
```

Both CI enforcement paths MUST read from this same file:

| Path | Mechanism | Reads from |
|------|-----------|------------|
| GitHub Actions (Redline grep) | `scripts/redline-grep.sh` | `scripts/redline-wordlist.txt` |
| Playwright smoke (`VENDOR_LEAK`) | `e2e/vendor-leak.spec.ts` | `scripts/redline-wordlist.txt` |

**Never maintain separate wordlists.** Adding a blocked term to one gate but not
the other is a process failure.

### Wordlist format

One Perl-compatible regex pattern per line. Comments start with `#`.

```
# Supplier names — user-visible surface only
# Internal identifiers (function names, env vars) are exempt
Yahoo Finance
hosted DeepSeek
unlimited Jina
```

### Scope: user-visible surface only

The wordlist applies to **user-visible copy** (UI text, prompt templates shipped
to users, API response messages, error messages displayed to users).

**Exempt from the wordlist:**
- Server-side function names (`cachedFetchYahooFinance`, `searchImaKnowledge`)
- Environment variable names (`YAHOO_API_KEY`)
- Internal type names, interfaces, comments
- Log output not exposed to users

The distinction is: **would a user see this string in their browser or client?**
If yes → blocked. If no → exempt.

---

## Rule 4: Supplier Name Neutrality in User-Facing Copy

User-visible text MUST NOT name data suppliers. Use neutral alternatives:

| ❌ Blocked | ✅ Replacement |
|-----------|---------------|
| "Yahoo Finance" | "market data provider" / "the data source" |
| "Yahoo returns null" | "the data source returns null" / "data unavailable" |
| "sourced from Yahoo Finance" | "sourced from market data search" |
| "hosted DeepSeek" | "the hosted model" / "the analysis engine" |
| "unlimited Jina searches" | "unlimited web searches" |

**Rationale:** Naming suppliers exposes infrastructure to users, creates
support liability, and makes supplier changes a user-facing event.

---

## Enforcement Checklist

Before any PR merge, verify:

- [ ] No direct push to main (branch protection active)
- [ ] CI status block present in PR description or agent report
- [ ] Redline grep passes (wordlist check)
- [ ] Playwright VENDOR_LEAK passes (same wordlist)
- [ ] No supplier names in user-visible copy (manual review for new UI text)

---

## Version History

| Date | Change |
|------|--------|
| 2026-07-30 | Initial directive. Codex PR #63 review prompted by OpenClaw #58 Redline ⑦ leak. |
