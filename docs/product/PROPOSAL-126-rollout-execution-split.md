# 提案：#126 剩余 scope 拆解 — 从「功能开发」转为「上线执行」

> 状态：提案，待 Wook 拍板
> 日期：2026-08-20 ｜ 作者：报告

## 现状盘点

#126（AleaBit live watcher + bilingual guarded auto-publish）的功能子刀**已全部 merged**：

| 子刀           | 状态 | 交付                                                             |
| -------------- | ---- | ---------------------------------------------------------------- |
| #133 / PR #134 | ✅   | live X read-only ingest → persistent review queue                |
| #135 / PR #136 | ✅   | 双语 16:9 PNG renderer（zh-CN + en 独立两张）                    |
| #137 / PR #138 | ✅   | publish policy gate + rollout 状态机（无 X 写）                  |
| #139           | ✅   | X write adapter shell + dry-run 记录                             |
| #141 / PR #142 | ✅   | canary approval UI + publish audit 持久化 + real X write adapter |

**结论：机器都造好了，剩下的是「打开开关并走完三阶段验证」。** #126 不应再以功能开发 issue 的形式挂着，建议拆成四个执行切片，#126 转为 tracker 或关闭。

## 拆解提案

### Slice A：生产 ingest 常态化（无发布路径）

**目标：** 真实 AleaBit 帖子持续流入 review queue，零人工触发。

- Vercel env 配置核查：`X_BEARER_TOKEN`、`ALEABIT_LIVE_CREATORS=aleabitoreddit`、`ALEABIT_INGEST_SECRET`
- 定时触发：Vercel Cron 周期调用 live ingest route（先确认 #134 是否已含自动化触发；若只有手动 route，本切片补 scheduler）
- 确认 thread quiet window / cursor checkpoint 在生产行为正确（#126 原始清单要求）
- 监控：ingest 失败告警（可先简单走 Vercel log + 每日巡检）
- **验收：** 连续 7 天，新帖自动入队，无重复、无漏抓（对照 X 时间线人工抽查）

### Slice B：shadow-run ×10（0 误发）

**目标：** 10 条真实帖子跑完整链路（gates → 双语 PNG → policy gate），全程 dry-run，无任何外部写入。

- 逐条人工审计：实体唯一、数字有 filing-grade source、报告期/单位正确、双语 parity
- 每条审计结论写进 audit log，产出 shadow 报告
- **验收：** 10/10 无未经核验数字、无误渲染、policy gate 拦截行为全部正确

### Slice C：canary ×3（人工确认后真实发布）

**目标：** 3 条通过 canary UI 人工批准后真实回复发布。

- 每条发布前人工核对图片与数字；发布后确认无重复回复、来源标注正确
- 期间演练一次一键熔断（kill switch 生效验证）
- **验收：** 3/3 发布正确 + 熔断演练通过 + audit trail 完整

### Slice D：auto 放开（独立 issue，显式 enablement）

- 默认关闭，需 Wook 显式拍板才建 issue
- 含频率限制、每日上限、熔断器、回滚预案
- Slice C 报告是开启的前置输入

## 请 Wook 拍板的点

1. 同意按 A→B→C→D 拆，#126 转为 tracker（建议）还是直接关闭？
2. Slice A 的 cron 频率：每小时 / 每 15 分钟？（X API 配额与及时性的权衡）
3. Slice B/C 的审计人：Wook 亲自审，还是我先做机审报告再人工抽查？

## 风险提醒

- Slice C 是**首次真实外部写入**，建议选低关注时段执行
- X 写权限 token 的 scope 最小化（只需要 reply 能力），与 read-only token 分离存放
