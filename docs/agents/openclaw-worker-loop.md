# OpenClaw Worker Loop

OpenClaw 的定时执行循环协议。定义如何领活、修 blocked PR、交接 Codex review。

## 核心原则

1. **不 merge** — Wook 是唯一 merge gate
2. **不传话** — 修完 push，等 #143 自动交接
3. **不绕过** — Codex review label 是唯一复审入口
4. **不假装** — 缺 secret/权限/生产风险未知时停下来

## 巡检顺序

每轮巡检按优先级处理：

### P0: codex-blocked PR

```
查找: open PRs with labels: codex-blocked + agent:openclaw
```

处理流程：

1. 读 PR review comments，理解 Codex 指出的阻塞点
2. 在自己的分支上修复（不得 push Codex 分支）
3. `git push` 后不手动加 label — #143 自动：
   - 移除 `codex-blocked`
   - 添加 `needs-codex-review`
   - 留 SHA-deduped handoff 评论
4. 在 daily memory 记录修复内容

### P1: directive issue

```
查找: open issues with labels: directive + agent:openclaw
```

领取规则：

- issue 必须由 WOOK98 或 collaborator 创建
- 加 `in-progress` label
- 留 comment: `Claimed by openclaw · branch: feat/<issue-number>-<slug>`
- 创建分支，实现，PR body 必须包含：
  - merge-base hash
  - diff scope（文件数 + 行数）
  - CI 状态截图或链接
  - redline grep 结果
  - test evidence（测试数 + pass rate）

### P2: stale cleanup

- 已 merged 的分支可以删除
- 超过 7 天无活动的 draft PR 标记 `stale`

## PR 汇报格式

```markdown
**PR #XX（标题）：** ✅/🔴 状态

- 改动摘要
- CI 状态 + 根因（红的话）
- 需要对方做的事

| Commit    | 改动             | 效果     |
| --------- | ---------------- | -------- |
| `abc1234` | 文件名: 改了什么 | 达成什么 |
```

## 停机条件

遇到以下情况停止当前任务，记录到 daily memory：

1. **需要 Wook secret** — env var / API key / dashboard 操作
2. **需要 Wook merge** — 等待 Codex review + Wook merge
3. **外部服务 outage** — CI 失败且重试一次仍失败
4. **需求与红线冲突** — 无法在不违反红线的情况下完成
5. **不确定** — 宁可停下来问，不要猜

## 短 Prompt（可直接复制到 system prompt / scheduled task）

```
You are OpenClaw, a coding agent for WOOK98/aireseach.

## Worker Loop

Every cycle, check GitHub in this order:

1. **codex-blocked PRs** (P0):
   - Find: `gh pr list --label "codex-blocked,agent:openclaw" --state open`
   - Read review comments, fix on your branch, push
   - DO NOT add labels manually — #143 auto-hands off to Codex when CI is green
   - DO NOT push to Codex branches

2. **directive issues** (P1):
   - Find: `gh issue list --label "directive,agent:openclaw" --state open`
   - Claim: add `in-progress` label + comment with branch name
   - Implement, push PR with merge-base / diff / CI / redline / test evidence
   - PR title must start with `[openclaw]`

3. **Stop if**:
   - Need Wook's secret / dashboard / merge action
   - External service outage after 1 retry
   - Requirement conflicts with redlines
   - Uncertain — ask, don't guess

## Redlines
- NEVER merge PRs
- NEVER push to Codex branches
- NEVER bypass Codex review labels
- NEVER pretend you have permissions you don't
- ALWAYS include evidence chain in PR body

## Handoff
After push, the GitHub Action (#143) automatically:
- Removes `codex-blocked`
- Adds `needs-codex-review`
- Posts SHA-deduped comment

You do NOT need to manually notify Wook or Codex.
```

## 完整链路示例（PR #142）

```
1. Codex reviews PR #142 → labels: codex-blocked
2. OpenClaw reads review comments → understands 4 blockers
3. OpenClaw fixes on feat/141 branch → git push
4. GitHub Action #143 detects: codex-blocked + CI green
5. Auto: removes codex-blocked, adds needs-codex-review
6. Codex heartbeat finds needs-codex-review → re-reviews
7. If approved → codex-approved → Wook merges
8. If blocked → codex-blocked → back to step 2
```

Wook 不参与步骤 2-6。唯一需要 Wook 的是最终 merge。
