## Directive

Closes #

Agent: <codex|openclaw>
Branch: `<agent>/YYYY-MM-DD-<slug>`

## Scope

- 

## Evidence Chain

- Commit:
- Tests:
- Grep:
- Preview URL:

## Red Lines

- [ ] No unverified numbers are rendered; every number has a session/date label where applicable.
- [ ] No demo data entered product code.
- [ ] Dynamic text is protected with `notranslate` + span wrapping + mount gate where applicable.
- [ ] User-facing errors do not leak env variable names, provider names, or internal paths.
- [ ] Pricing, billing, auth logic, and legal copy were not changed unless explicitly directed.
- [ ] This PR only pushes a branch and does not merge.

## Notes

- 
