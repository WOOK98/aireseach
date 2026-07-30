# L3 账本核验闭环 — 任务书

> Issue: [#54](https://github.com/WOOK98/aireseach/issues/54)
> 优先级: P1
> 状态: 待实施
> 作者: 报告 (OpenClaw agent)
> 日期: 2026-07-30
> 依赖: #50 (L1, 已合并), #52 (L2 TQS, 待实施)
> 被依赖: #52 (TQS 校准数据来源)

---

## 一、问题

**L3 账本现在是"只写不读"的。**

`ledgerJudgment` 表每条记录都有 `checkAfter`（到期核验日），`/api/ledger/verify` 端点也能写入核验记录。但：

- `.github/workflows/` 里唯一的定时任务是冒烟监控
- 没有任何 cron / 定时任务去查询到期判断
- 没有任何自动化流程去获取当前数据、比对 `wrongIf` 条件
- 没有任何代码去写入 `ledgerVerification` 记录

**判断一条条写进去，永远没人回头看它对没对。**

这个洞的严重性：判断-结果账本的全部防御力来自"事后可验证"。不核验的账本，和把判断写在记事本上没区别。

而且 #52 的 TQS 将来要回答"高质量分的判断是不是兑现率真的更高"——数据源就是这里。这条链断着，TQS 就永远只是个自说自话的分数。

---

## 二、核心红线

> **绝不自动判"confirmed"来充数。**

这是本任务最不可协商的约束。原因：

1. 一个会给自己打高分的账本毫无价值
2. 如果取不到数据就默认通过，核验就变成了形式主义
3. 反过来还会污染 TQS 校准数据——假的 confirmed 会让 TQS 模型对低质量论点过度自信

**实施保障：**

```typescript
// 四态结果，不是二态
type VerificationOutcome =
  | "confirmed" // 数据可获取 + wrongIf 条件未触发
  | "invalidated" // 数据可获取 + wrongIf 条件已触发
  | "needs_manual_review" // 数据不可获取 或 wrongIf 不可机器判定
  | "insufficient_data"; // 数据源完全不可达
```

- 如果指标取不到 → `needs_manual_review`，不能是 `confirmed`
- 如果 `wrongIf` 不是机器可判定的条件（如"管理层信心下降"）→ `needs_manual_review`
- 如果数据源 API 报错 → `insufficient_data`，不能是 `confirmed`
- 验收要求：**不可判定态必须有真实案例**——现存判断里必然有无法机器验证的，交不出这个案例说明降级路径没真跑

---

## 三、架构设计

### 整体流程

```
┌─────────────────────────────────────────────────────────┐
│  Cron Trigger (每日 UTC 06:00 / 北京 14:00)              │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│  Step 1: 查询到期判断                                     │
│  SELECT * FROM ledger_judgment                            │
│  WHERE checkAfter <= NOW()                                │
│  AND id NOT IN (SELECT judgmentId FROM ledger_verification│
│    WHERE result != 'pending')                             │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│  Step 2: 分类（per judgment）                             │
│                                                          │
│  ┌─ 机器可判定？                                         │
│  │   ├─ YES → Step 3a: 获取当前数据                      │
│  │   └─ NO  → needs_manual_review ← 红线                │
│  │                                                       │
│  └─ 数据可获取？                                         │
│      ├─ YES → Step 3b: 比对 wrongIf                      │
│      └─ NO  → insufficient_data ← 红线                   │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│  Step 3a: 获取当前指标                                    │
│  - 调用 cachedFetchYahooFinance(ticker)                  │
│  - 调用 cachedFetchTechnicalMetrics(ticker)              │
│  - 提取 judgment.metric 对应的当前值                      │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│  Step 3b: 比对 wrongIf 条件                               │
│  - 解析 wrongIf 字符串 → 结构化条件                       │
│  - 评估：当前值 vs 条件阈值                               │
│  - 输出: confirmed / invalidated                          │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│  Step 4: 写入核验记录                                     │
│  INSERT INTO ledger_verification (...)                    │
│  - result: 确认/失效/需人工/数据不足                      │
│  - dataPoint: 当前观测值                                  │
│  - evidenceUrl: 数据源 URL                                │
│  - notes: 机器评估理由                                    │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│  Step 5: 汇总报告（可选，未来接入 morning-brief）          │
│  - 本轮核验了多少条                                       │
│  - confirmed / invalidated / needs_manual_review 分布     │
│  - 高 TQS 认知的兑现率                                    │
└──────────────────────────────────────────────────────────┘
```

### wrongIf 可判定性分类

现存判断的 `wrongIf` 字段有三种形态：

| 形态          | 示例                                             | 可机器判定？ | 处理                |
| ------------- | ------------------------------------------------ | ------------ | ------------------- |
| **数字比较**  | "Revenue growth drops below 8%"                  | ✅           | 自动核验            |
| **区间/阈值** | "Gross margin falls below 65%"                   | ✅           | 自动核验            |
| **复合条件**  | "Revenue growth < 5% for 2 consecutive quarters" | ⚠️ 部分      | 需要历史数据        |
| **定性描述**  | "Management loses confidence"                    | ❌           | needs_manual_review |
| **事件触发**  | "Key customer churns"                            | ❌           | needs_manual_review |

**解析策略（v1 规则引擎）：**

```typescript
interface ParsedCondition {
  metric: string; // "revenueGrowthYoy", "grossMargin", etc.
  operator: "<" | ">" | "<=" | ">=" | "==" | "!=";
  threshold: number; // 8, 65, etc.
  unit?: string; // "%", "$B", etc.
  duration?: string; // "2 consecutive quarters"
  machineVerifiable: boolean;
}

function parseWrongIf(
  wrongIf: string,
  metric?: string,
): ParsedCondition | null {
  // 1. 尝试提取数字比较模式
  //    "drops below 8%" → { operator: "<", threshold: 8, unit: "%" }
  //    "falls below 65%" → { operator: "<", threshold: 65, unit: "%" }
  //    "exceeds 50%" → { operator: ">", threshold: 50, unit: "%" }
  // 2. 尝试提取 metric 映射
  //    如果 judgment 有 metric 字段，直接使用
  //    否则从 wrongIf 文本中推断（"revenue growth" → revenueGrowthYoy）
  // 3. 判断可判定性
  //    有明确数字 + 有 metric 映射 = machineVerifiable: true
  //    纯定性描述 = machineVerifiable: false
  // 4. 返回 null 表示无法解析
}
```

**v2 考虑：** 用 LLM 辅助解析复杂的 wrongIf 条件。但 v1 用规则引擎——更可预测、更便宜、更易测试。

---

## 四、实施方案

### Phase 1: 核验引擎纯函数

**文件：** `packages/api/src/modules/ledger/verifier.ts`

```typescript
/**
 * 核验结果
 */
export interface VerificationOutcome {
  result:
    | "confirmed"
    | "invalidated"
    | "needs_manual_review"
    | "insufficient_data";
  dataPoint: string; // 当前观测值（如 "Gross Margin 72.3%"）
  evidenceUrl: string; // 数据源 URL
  notes: string; // 机器评估理由
}

/**
 * 可核验的判断输入
 */
export interface VerifiableJudgment {
  id: string;
  ticker: string;
  judgment: string;
  keyNumber: string;
  wrongIf: string;
  metric?: string;
  trigger?: string;
  source?: string;
}

/**
 * 判断 wrongIf 是否机器可判定。
 * 纯函数，无副作用。
 */
export function isMachineVerifiable(judgment: VerifiableJudgment): boolean;

/**
 * 解析 wrongIf 为结构化条件。
 * 返回 null 表示无法解析。
 * 纯函数，无副作用。
 */
export function parseWrongIf(
  wrongIf: string,
  metric?: string,
): ParsedCondition | null;

/**
 * 评估条件：当前值 vs 阈值。
 * 纯函数，无副作用。
 */
export function evaluateCondition(
  condition: ParsedCondition,
  currentValue: number,
): { triggered: boolean; explanation: string };

/**
 * 从财务数据中提取指定指标的当前值。
 * 纯函数，无副作用。
 */
export function extractMetricValue(
  metrics: FinancialMetrics,
  metricName: string,
): number | null;
```

**验收标准：**

- 纯函数，无副作用
- 30+ 个 test case 覆盖各种 wrongIf 模式
- 处理所有边界条件（null、NaN、无法解析等）

### Phase 2: 核验执行器

**文件：** `packages/api/src/modules/ledger/verify-runner.ts`

```typescript
/**
 * 核验执行器：获取数据 + 评估 + 写入核验记录。
 * 这是唯一有副作用的模块。
 */
export async function runVerificationBatch(opts: {
  batchSize?: number; // default 50
  dryRun?: boolean; // default false
}): Promise<{
  processed: number;
  confirmed: number;
  invalidated: number;
  needsManualReview: number;
  insufficientData: number;
  errors: number;
}>;
```

执行逻辑：

```typescript
export async function runVerificationBatch(opts) {
  const batchSize = opts.batchSize ?? 50;

  // 1. 查询到期且未核验的判断
  const dueJudgments = await db
    .select()
    .from(ledgerJudgment)
    .where(
      and(
        lte(ledgerJudgment.checkAfter, new Date()),
        // 排除已有核验记录的
        notInArray(ledgerJudgment.id,
          db.select({ id: ledgerVerification.judgmentId })
            .from(ledgerVerification)
            .where(ne(ledgerVerification.result, "pending"))
        )
      )
    )
    .limit(batchSize);

  // 2. 按 ticker 分组（减少 API 调用）
  const byTicker = groupBy(dueJudgments, "ticker");

  // 3. 逐 ticker 获取数据
  for (const [ticker, judgments] of Object.entries(byTicker)) {
    let metrics: FinancialMetrics | null = null;

    try {
      const raw = await cachedFetchYahooFinance(ticker);
      metrics = sanitizeFinancialMetrics(raw).metrics;
    } catch {
      // 数据源不可达 → 全部标 insufficient_data
      for (const j of judgments) {
        await writeVerification(j.id, {
          result: "insufficient_data",
          dataPoint: "Data source unreachable",
          evidenceUrl: "",
          notes: `Yahoo Finance API failed for ${ticker}`,
        });
      }
      continue;
    }

    // 4. 逐判断核验
    for (const j of judgments) {
      // 红线：不可判定 → needs_manual_review
      if (!isMachineVerifiable(j)) {
        await writeVerification(j.id, {
          result: "needs_manual_review",
          dataPoint: "N/A — wrongIf not machine-verifiable",
          evidenceUrl: "",
          notes: `wrongIf "${j.wrongIf}" contains qualitative or event-based conditions that cannot be automatically evaluated.`,
        });
        continue;
      }

      // 解析条件
      const condition = parseWrongIf(j.wrongIf, j.metric);
      if (!condition) {
        await writeVerification(j.id, {
          result: "needs_manual_review",
          dataPoint: "N/A — could not parse wrongIf",
          evidenceUrl: "",
          notes: `Failed to parse wrongIf "${j.wrongIf}" into a machine-evaluable condition.`,
        });
        continue;
      }

      // 提取当前值
      const currentValue = extractMetricValue(metrics, condition.metric);
      if (currentValue === null) {
        await writeVerification(j.id, {
          result: "needs_manual_review",
          dataPoint: `Metric "${condition.metric}" not available`,
          evidenceUrl: "",
          notes: `Could not extract metric "${condition.metric}" from Yahoo Finance data for ${ticker}.`,
        });
        continue;
      }

      // 评估条件
      const evaluation = evaluateCondition(condition, currentValue);

      await writeVerification(j.id, {
        result: evaluation.triggered ? "invalidated" : "confirmed",
        dataPoint: `${condition.metric}: ${currentValue}${condition.unit ?? ""}`,
        evidenceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`,
        notes: evaluation.explanation,
      });
    }
  }

  // 5. 返回汇总
  return { ... };
}
```

### Phase 3: API 端点 + Cron 触发

**新增端点：** `packages/api/src/modules/ledger/router.ts`

```typescript
// POST /api/ledger/verify/run — 手动触发核验（admin 或调试用）
ledgerRoute.post("/verify/run", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) throw new HTTPException(401);

  // 可选：限制为 admin 用户
  const result = await runVerificationBatch({ batchSize: 50 });
  return c.json({ ok: true, ...result });
});
```

**Cron 触发方案（选一个）：**

| 方案                         | 优点                 | 缺点                  |
| ---------------------------- | -------------------- | --------------------- |
| A. GitHub Actions cron       | 和现有 CI 一致，免费 | 需要 Vercel API token |
| B. Vercel Cron Jobs          | 原生集成，简单       | 仅 Pro 计划支持       |
| C. 外部 cron → POST endpoint | 最灵活               | 多一个依赖            |

**推荐方案 A：** GitHub Actions cron，和现有 workflows 一致。

```yaml
# .github/workflows/ledger-verify.yml
name: L3 Ledger Verify

on:
  schedule:
    - cron: "0 6 * * *" # 每日 UTC 06:00 (北京 14:00)
  workflow_dispatch: # 支持手动触发

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger verification
        run: |
          curl -X POST "${{ secrets.VERCEL_URL }}/api/ledger/verify/run" \
            -H "Authorization: Bearer ${{ secrets.LEDGER_VERIFY_TOKEN }}" \
            -H "Content-Type: application/json"
```

### Phase 4: Schema 迁移

**修改文件：** `packages/db/src/schema/ledger.ts`

`ledgerVerification` 表已存在，但需要扩展 `result` 枚举：

```typescript
// 现有: "confirmed" | "invalidated" | "pending" | "insufficient_data"
// 新增: "needs_manual_review"

export type VerificationResult =
  | "confirmed"
  | "invalidated"
  | "pending"
  | "insufficient_data"
  | "needs_manual_review"; // 新增
```

生成 migration：

```bash
pnpm with-env pnpm -F @workspace/db db:generate
pnpm with-env pnpm -F @workspace/db db:migrate
```

### Phase 5: TQS 集成（与 #52 协同）

核验数据是 TQS 校准的源头：

```typescript
// TQS 校准查询（未来 L4 的输入）
async function getCalibrationData(): Promise<
  {
    tier: string;
    totalJudgments: number;
    confirmedRate: number;
    invalidatedRate: number;
    needsReviewRate: number;
  }[]
> {
  return db
    .select({
      tier: ledgerJudgment.tqsTier,
      totalJudgments: count(),
      confirmedRate: sql`COUNT(CASE WHEN v.result = 'confirmed' THEN 1 END)::float / COUNT(*)`,
      invalidatedRate: sql`COUNT(CASE WHEN v.result = 'invalidated' THEN 1 END)::float / COUNT(*)`,
      needsReviewRate: sql`COUNT(CASE WHEN v.result = 'needs_manual_review' THEN 1 END)::float / COUNT(*)`,
    })
    .from(ledgerJudgment)
    .leftJoin(
      ledgerVerification,
      eq(ledgerJudgment.id, ledgerVerification.judgmentId),
    )
    .where(eq(ledgerJudgment.tqsTier, sql`tier`))
    .groupBy(ledgerJudgment.tqsTier);
}
```

---

## 五、核验记录写入格式

```typescript
async function writeVerification(
  judgmentId: string,
  outcome: VerificationOutcome,
): Promise<void> {
  await db.insert(ledgerVerification).values({
    judgmentId,
    result: outcome.result,
    dataPoint: outcome.dataPoint,
    evidenceUrl: outcome.evidenceUrl || null,
    notes: outcome.notes,
    verifiedAt: new Date(),
  });
}
```

每条核验记录包含：

- `result`: 四态结果
- `dataPoint`: 当前观测值（如 "Gross Margin: 72.3%"）
- `evidenceUrl`: 数据源 URL（Yahoo Finance / SEC EDGAR 等）
- `notes`: 机器评估理由（为什么判 confirmed / invalidated / needs_manual_review）

---

## 六、验收清单

### 必须通过

- [ ] `isMachineVerifiable` 纯函数有 30+ test case
- [ ] `parseWrongIf` 能正确解析数字比较模式
- [ ] `evaluateCondition` 能正确比对阈值
- [ ] `extractMetricValue` 能从 FinancialMetrics 中提取常用指标
- [ ] `runVerificationBatch` 正确处理四态结果
- [ ] **红线验证：** 存在至少 3 个 test case 证明 `needs_manual_review` 被正确触发
- [ ] **红线验证：** 存在至少 1 个 test case 证明数据源失败时不会返回 `confirmed`
- [ ] Cron job 配置正确（每日触发）
- [ ] API 端点 `POST /api/ledger/verify/run` 可调用
- [ ] `pnpm lint` + `pnpm format` + `pnpm test` 全部通过

### 不在范围内

- LLM 辅助解析 wrongIf（v2 考虑）
- 前端核验历史展示（属于 #11 公司页）
- TQS 校准回测（属于 L4）
- morning-brief 接入核验汇总（属于 #25）

---

## 七、与 #52 (TQS) 的咬合

```
#52 TQS 产出:
  → computeTQS() 纯函数
  → TQS 分数写入 ledgerJudgment.tqsScore / tqsTier

#54 核验闭环 产出:
  → runVerificationBatch() 定时执行
  → 核验结果写入 ledgerVerification

咬合点:
  → TQS 的校准数据来自核验结果
  → "S 级判断的兑现率是否高于 D 级" 这个问题只有核验闭环跑起来才能回答
```

两个 issue 可并行开发，但 #54 的核验数据是 #52 TQS 校准的输入。如果 #52 先合并，TQS 分数暂时只有静态意义；#54 合并后，TQS 才有动态校准能力。

---

## 八、失效条件

1. Yahoo Finance API 结构变化 → `extractMetricValue` 需更新
2. `wrongIf` 格式约定变化 → `parseWrongIf` 需更新
3. `ledgerVerification` schema breaking change → 核验写入逻辑需更新
4. Cron 触发机制变化（如从 GitHub Actions 迁移到 Vercel Cron）→ workflow 文件需更新

---

## 九、来源

- [L3 Ledger Schema](../../packages/db/src/schema/ledger.ts)
- [L3 Ledger Router](../../packages/api/src/modules/ledger/router.ts)
- [L3 Ledger Tests](../../packages/api/src/modules/ledger/test/ledger.test.ts)
- [L1 Landing Validator](../../packages/api/src/modules/report/landing-validator.ts)
- [Report Route](../../packages/api/src/modules/report/route.ts)
- [L2 TQS Task Spec](./L2-TQS-THESIS-QUALITY-SCORE.md)
