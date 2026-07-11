# 循环任务书增补 §10 — 双执行者扩展（OpenClaw + Codex）

> 追加于 §9 之后。总线不变, 执行者从一个变两个。Claude 继续担任指令产出与 PR 审查,
> Wook 继续担任唯一合并闸门。本节同时发给 OpenClaw 与 Codex, 两者遵守同一协议。

## 10.1 路由：谁干什么

Issue 可带路由 label(Wook 创建时指定, 可不指定):

- `agent:codex` → 仅 Codex 可领取
- `agent:openclaw` → 仅 OpenClaw 可领取
- 无路由 label → 任意执行者可领, 先到先得(见 10.2)

默认分工建议(Wook 可随时用 label 覆盖):

| 任务类型                              | 默认执行者 | 依据                                                |
| ------------------------------------- | ---------- | --------------------------------------------------- |
| Web 前端 / Next.js 页面 / 公司页      | Codex      | 现有单页与 A.5 工作均出自 codex/\* 分支, 上下文连续 |
| MCP server / 报告管线 / cron / 审计圈 | OpenClaw   | 循环基建与 skill 体系在其侧                         |
| 纯文档 / 配置                         | 任意       | —                                                   |

同一 issue 绝不双发: 禁止两个执行者做同一任务比谁快 — 浪费预算且必然合并冲突。
并行的正确形态是**不同 issue 各领各的**(吞吐翻倍), 前提见 10.3。

## 10.2 领取协议（防碰撞, 两执行者共同遵守）

领取前依次检查, 任一不满足则跳过该 issue:

1. label 含 `directive` 且不含 `in-progress` / `stuck` / `blocked`
2. 无 assignee, 且评论区无未撤销的 "Claimed" 评论
3. 路由 label 允许本执行者

领取动作(一次完成): 加 `in-progress` label + 自我 assign(或评论首行标识身份)

- 评论 `Claimed by <codex|openclaw> · branch: <agent>/YYYY-MM-DD-<slug>`

碰撞仲裁(两个 Claimed 评论同时出现): 有路由 label 者胜; 否则评论时间戳早者胜;
败方评论 "Backing off" 并移除自己的痕迹, 30 秒内不再领取任何 issue(退避)。

## 10.3 冲突避免：模块串行化

- 两个 issue 若触碰同一模块(同目录/同文件), Wook 创建时用 `blocked-by: #N` 串行;
  拿不准就串行 — 合并冲突的返工成本远高于等待
- 执行者领取时自查: 若任务清单与某个 in-progress issue 的分支明显重叠 →
  评论说明并跳过, 不领取
- **绝不触碰对方的分支**: 修正他人 PR 的唯一途径是评论或新 issue, 禁止直接 push
  到非自己创建的分支

## 10.4 身份与证据链

- 所有 PR 标题前缀执行者名: `[codex]` / `[openclaw]`; 分支前缀同理
- 证据链要求对两者完全一致(commit/测试输出/grep/preview URL);
  §0 全部红线对两者完全一致 — 纪律不因执行者而异
- 审查修正 issue 默认路由回原执行者(改自己写的代码, 上下文最省)

## 10.5 [WOOK] 启用动作

1. 把主任务书 + §9 + 本节发给 Codex(OpenClaw 已有前两者, 补发本节)
2. 在仓库建两个 label: `agent:codex`, `agent:openclaw`
3. §9.4 的首批 issue 建议路由: Issue A(分支清算)→ `agent:codex`
   (悬空工作区在 codex/preview-env-setup, 它自己的现场自己清);
   Issue B(Phase B)→ `agent:codex`(前端主战场); 审计圈照旧归 OpenClaw
