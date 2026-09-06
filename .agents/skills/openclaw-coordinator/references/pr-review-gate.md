# PR Review Gate

Use this before approving or merging OpenClaw PRs.

## Metadata Gate

- PR title starts with `[openclaw]`.
- PR body includes `Closes #N` or `Refs #N` intentionally.
- Branch starts from a current baseline:
  - merge-base reported
  - diff scope reported
- PR scope matches the directive.

## Diff Gate

Inspect the actual diff. Look for:

- old-branch rollback of unrelated files
- tracked generated files (`coverage.json`, build artifacts)
- copied third-party code without license notice
- user-visible supplier/env/internal names
- new module-top-level throws in shared/serverless code
- tests that only validate helpers but not production path

## Redline Gate

Block if any apply:

- missing data rendered as `0`, `0%`, `$0`, `N/Ax`, or equivalent false value
- unverified state shown as “no change”
- target price/rating/buy/sell/hold/position sizing language
- generated numbers without source and date/period
- dynamic ticker/company/market text lacking `notranslate`
- AI/provider failure causing whole page/API 500 when partial honest output is possible

## Evidence Gate

Require a PR report with:

- commit hash
- tests run and output summary
- Redline grep status
- CI/Loop Gate status
- preview URL or runtime validation
- any manual action Wook must take

## Comment Pattern

Use this shape for blocking feedback:

```text
Blocking before merge:
<specific behavior> currently causes <incorrect outcome>.
Expected: <fix>.
Please add/adjust tests proving <case A> and <case B>.
```

If GitHub does not allow request-changes because of author identity, leave a normal PR comment prefixed `Blocking review note before merge:`.
