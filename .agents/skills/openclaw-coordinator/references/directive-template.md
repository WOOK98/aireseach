# Directive Template

Use this when creating GitHub directive issues for OpenClaw.

```markdown
## 目标
<one sentence outcome + measurable acceptance signal>

## 背景
<why this matters, current failure mode, relevant PR/issue links>

## 任务清单
- [ ] Start from latest `origin/main`.
- [ ] Report:
  - `git merge-base origin/main HEAD`
  - `git diff --name-only origin/main...HEAD`
- [ ] <implementation step 1>
- [ ] <implementation step 2>
- [ ] Add tests for <specific behavior>.
- [ ] Run Loop Gate or the relevant local subset before opening PR.

## 红线提醒
- <task-specific redline>
- Global airesearch redlines apply.

## 验收标准
- [ ] <observable product/API behavior>
- [ ] No mock/demo data unless explicitly marked as non-product test fixture.
- [ ] Redline grep passes.
- [ ] CI/Loop Gate status included in PR report.
- [ ] Preview/runtime evidence attached.

## blocked-by
<issue number or 无>
```

## Routing Rules

- Add labels: `directive`, priority (`P0`/`P1`/`P2`), `agent:openclaw`.
- Keep one module per issue when possible.
- If two issues touch the same directory/files, mark the later one `blocked-by`.

## Priority Heuristics

- `P0`: production outage, data corruption, secret leak, compliance breach, broken auth/billing, hard redline failure in production.
- `P1`: main product loop blocked, visible user path broken, launch-critical feature, high-confidence retention/conversion gap.
- `P2`: correctness improvements, cleanup, observability, SEO, polish, non-blocking workflow enhancements.
