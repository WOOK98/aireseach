# L2 TQS — Thesis Quality Score: 任务书

> Issue: [#52](https://github.com/WOOK98/aireseach/issues/52)
> 优先级: P1
> 状态: 待实施
> 作者: 报告 (OpenClaw agent)
> 日期: 2026-07-30

---

## 一、这是什么

TQS (Thesis Quality Score) 是 Core 五层验证架构的第二层（L2），位于 L1 (Landing Rate) 和 L3 (Outcome Ledger) 之间。

**一句话定义：** TQS 评估的是"这个论点有多靠谱"，不是"这只股票好不好"。

高 TQS 的看空论点和高 TQS 的看多论点价值等同。TQS 低不代表股票差，只代表当前报告的证据链不完整。

### 在 Core 五层中的位置

```
L0  Entity Lock          实体锁定（resolve_entity）       ✅ 已上线
L1  Landing Rate         断言落地率（landing-validator）    ✅ 已上线
L2  TQS                  论点质量分                         ← 本任务
L3  Outcome Ledger       判断-结果账本（ledger.ts）         ✅ 已上线
L4  Calibration          校准回测（track-record.md）        🔮 未来
```

### 为什么 TQS 是"借形不借神"的核心

"借形不借神"的决策是：拿来 JPM 排版，禁掉目标价和评级。但禁掉之后，用户需要一个替代物来判断"这份报告值不值得认真看"。

**TQS 就是那个替代物。**

- 评级 badge → 禁掉 → 替换为 **TQS 分数**
- 目标价 → 禁掉 → 替换为 **Scenario + 失效条件**（已在 report 中实现）
- 仓位建议 → 禁掉 → **永远不加**

---

## 二、五因子模型

| # | 因子 | 权重 | 数据来源 | 说明 |
|---|------|------|----------|------|
| F1 | 落地率 (Landing) | 25% | L1 现成输出 | 直接消费 `landingRate`，零额外计算 |
| F2 | 失效条件可观测性 | 25% | `topJudgments[].wrongIf` + `thesisBreakers` | 量化触发条件是否有数字、是否可观测 |
| F3 | 数据新鲜度 | 20% | 数据点日期 vs 报告生成日期 | 越新越好；>90 天扣分 |
| F4 | 来源层级 | 15% | dataPoint 来源分类 | 一手 filing > 券商/新闻 > AI 推断 |
| F5 | 反面覆盖 | 15% | risks[] + thesisBreakers + bear case | 空头论点是否有实质内容，不是一句套话 |

### F1: 落地率 (Landing Rate) — 25%

**直接消费 L1 输出，零额外计算。**

```typescript
// 从 generateValidatedJson 的输出中获取
const landingRate: number = parsed.landingRate; // 0.0 – 1.0
const f1Score = landingRate; // 1:1 映射
```

评分标准：
- 1.0 (100%): 所有断言都有数据绑定 → 100 分
- 0.85 (85%): L1 最低门槛 → 85 分
- 0.50 (50%): 一半断言无绑定 → 50 分
- 0.0 (0%): 全部幻觉 → 0 分

### F2: 失效条件可观测性 (Invalidation Observability) — 25%

**定义级红线：失效条件必须是"一个外部观察者能在不持有仓位的情况下独立验证的数字"。**

评分维度（每个维度 0–20 分，加权取平均）：

| 维度 | 20 分 | 10 分 | 0 分 |
|------|-------|-------|------|
| 有数字 | 明确数字阈值 | 区间或模糊表述 | 纯定性描述 |
| 可独立验证 | 第三方数据源可查 | 需要内部数据 | 无法独立验证 |
| 有时限 | 绑定具体季度/日期 | "中期"、"长期" | 无时限 |
| 因果链完整 | 从数据到结论逻辑闭环 | 部分跳跃 | 逻辑断裂 |
| 可操作性 | 触发即行动 | 需二次判断 | 不可执行 |

**关键检查：**

```typescript
function scoreInvalidationObservability(judgment: {
  wrongIf: string;
  keyNumber: string;
  metric?: string;
  trigger?: string;
  freq?: string;
}): number {
  // 1. wrongIf 是否包含数字？
  const hasNumeric = /\d/.test(judgment.wrongIf);
  
  // 2. wrongIf 是否引用可验证数据源？
  const hasVerifiableSource = !!judgment.metric && !!judgment.trigger;
  
  // 3. 是否有时限？
  const hasTimeframe = /\b(Q[1-4]|FY\d{4}|20\d{2}|quarter|month|year)\b/i
    .test(judgment.wrongIf);
  
  // 4. 因果链：keyNumber → judgment → wrongIf 是否逻辑闭环？
  // 人工标注或 NLP 检查（v1 用规则，v2 可用模型）
  
  // 5. 是否可操作？
  const isActionable = hasNumeric && hasVerifiableSource;
  
  // 加权计算
  return computeWeightedScore([
    hasNumeric ? 20 : 0,
    hasVerifiableSource ? 20 : 10,
    hasTimeframe ? 20 : 5,
    15, // 因果链 v1 默认给 15 分，v2 用模型
    isActionable ? 20 : 5,
  ]);
}
```

### F3: 数据新鲜度 (Data Freshness) — 20%

**规则：数据点越新，论点越可靠。但不要求实时——季度数据 > 6 个月才真正扣分。**

```typescript
function scoreDataFreshness(dataPoints: Array<{
  date: string; // "2026-Q2" or "2026-07-15" or "FY2025"
  reportDate: string; // ISO date of report generation
}>): number {
  // 将所有数据点转换为天数差
  // 评分矩阵：
  //   ≤ 30 天: 100 分
  //   31–90 天: 80 分
  //   91–180 天: 60 分
  //   181–365 天: 40 分
  //   > 365 天: 20 分
  //   无法解析日期: 50 分（中性）
  
  // 取所有数据点的加权平均
  // 近期数据占比越高，整体分越高
}
```

### F4: 来源层级 (Source Hierarchy) — 15%

**一手材料永远比二手解读更可靠。这和 filing skill 建设直接咬合。**

来源层级定义：

| 层级 | 来源类型 | 权重 | 示例 |
|------|----------|------|------|
| S1 | 一手 filing | 1.0 | SEC 10-K, 10-Q, 20-F, 6-K, 财报电话会 |
| S2 | 公司官方 | 0.8 | IR 新闻稿, 投资者日材料, 招股书 |
| S3 | 券商/卖方研报 | 0.6 | Morgan Stanley, Goldman Sachs 报告 |
| S4 | 财经媒体 | 0.4 | Bloomberg, Reuters, WSJ |
| S5 | 社交/社区 | 0.2 | X/Twitter, Reddit, 雪球 |
| S6 | AI 推断 | 0.1 | 模型基于训练数据的推断（无明确来源） |

```typescript
function scoreSourceHierarchy(dataPoints: Array<{
  source?: string; // dataPoint 字段中的来源描述
}>): number {
  // 解析 dataPoint 字段，识别来源类型
  // 计算加权平均
  // filing + 公司官方占比 > 60%: 90+ 分
  // 券商为主: 70–85 分
  // 媒体为主: 50–70 分
  // 社交/AI 推断为主: 20–50 分
}
```

**与 filing skill 的协同：** filing skill (v0.5.0) 现在能产出带 `p.NN` 页码锚点的数据。这些数据天然属于 S1 层级。当报告引用 filing 数据时，TQS 自动识别并给高分。

### F5: 反面覆盖 (Counter-Argument Coverage) — 15%

**检查报告是否认真对待了反面，不是敷衍了事。**

```typescript
function scoreCounterCoverage(report: {
  risks: string[];        // sections.risks
  thesisBreakers: Array<{ condition: string }>;
  bearCase?: string[];    // committee 报告
  topJudgments: Array<{ wrongIf: string }>;
}): number {
  // 维度 1: 风险数量
  //   3+ 条实质性风险: 20 分
  //   1-2 条: 10 分
  //   0 条或套话: 0 分
  
  // 维度 2: 风险是否有数字
  //   大部分风险有量化触发条件: 20 分
  //   部分有: 10 分
  //   全部定性: 0 分
  
  // 维度 3: 失效条件与正面判断的对称性
  //   每个 topJudgments 都有对应 wrongIf: 20 分
  //   部分有: 10 分
  //   没有: 0 分
  
  // 维度 4: bear case 质量（committee 模式）
  //   bear case 有实质论据: 20 分
  //   有但薄弱: 10 分
  //   没有: 0 分（snapshot 模式此项满分）
}
```

---

## 三、TQS 分数计算

### 加权公式

```
TQS = (F1 × 0.25) + (F2 × 0.25) + (F3 × 0.20) + (F4 × 0.15) + (F5 × 0.15)
```

### 等级映射

| TQS 分数 | 等级 | 含义 |
|----------|------|------|
| 90–100 | S | 证据完整、逻辑闭环、来源一流 |
| 75–89 | A | 证据较完整，少数盲点可接受 |
| 60–74 | B | 核心逻辑成立，但部分环节薄弱 |
| 45–59 | C | 证据不足，需补充验证 |
| 30–44 | D | 逻辑链断裂或来源不可靠 |
| 0–29 | F | 不可用，建议重做 |

### 降级条件 (Hard Floor)

以下情况直接降到对应等级上限：

| 条件 | 最高等级 |
|------|----------|
| L1 落地率 < 50% | C |
| 没有任何一手 filing 来源 | B |
| topJudgments 中 0 个有数字 wrongIf | D |
| 超过 50% 的数据点 > 1 年 | C |
| 被合规红线拦截 (prohibitedOutputPattern) | F |

---

## 四、与 L3 Ledger 的集成

### 写入

TQS 分数写入 `ledger_judgment` 表的现有结构，扩展字段：

```typescript
// ledger.ts 新增字段
tqsScore: integer("tqs_score"),           // 0–100
tqsTier: text("tqs_tier"),                // S/A/B/C/D/F
tqsFactors: jsonb("tqs_factors"),          // { F1: 85, F2: 70, ... }
tqsFactorDetails: jsonb("tqs_factor_details"), // 每个因子的详细评分理由
```

### 回答的问题

写入 L3 后，将来能回答：

1. **高 TQS 判断的兑现率是不是真的更高？**
   - 查询：`SELECT tqs_tier, AVG(confirmed_count / total_count) FROM ... GROUP BY tqs_tier`
   - 如果 S 级判断的兑现率显著高于 D 级，说明 TQS 模型有效

2. **哪个因子对预测力贡献最大？**
   - 查询：`SELECT tqs_factors->>'F1' as landing, outcome FROM ...`
   - 回归分析各因子与兑现率的关系

3. **TQS 校准曲线**
   - S 级判断的 60 天兑现率是否接近 80-90%？
   - 如果不是，说明评分标准需要调整

**护城河到这一步才真正闭环：** TQS 不只是一个静态分数，而是一个会随着数据积累自我校准的系统。

---

## 五、定义级红线

> **TQS 评的是论点质量，不是股票好坏。**

这是必须写死、不可协商的约束。原因：

1. 用户三天内就会把 TQS 当评级用："TQS S = 买入，TQS F = 卖出"
2. 评级正是"借形不借神"要禁掉的神
3. 如果 TQS 变成隐性评级，等于绕道把禁掉的东西请回来

**实施保障：**

```typescript
// TQS 输出时必须附带这段 disclaimer
const TQS_DISCLAIMER = 
  "Thesis Quality Score evaluates evidence completeness and logical closure. " +
  "A high-TQS bearish thesis is equally valuable as a high-TQS bullish thesis. " +
  "TQS is not a buy/sell/hold recommendation.";
```

- TQS 不与任何仓位建议关联
- TQS 不出现在 decisionBrief.action 中
- TQS 不影响 conviction tier（两者独立计算，可共存但不互相依赖）

---

## 六、实施计划

### Phase 1: 纯函数计算模块

**文件：** `packages/api/src/modules/report/tqs.ts`

```typescript
export interface TQSFactors {
  F1_landing: number;    // 0–100
  F2_invalidation: number; // 0–100
  F3_freshness: number;  // 0–100
  F4_source: number;     // 0–100
  F5_counter: number;    // 0–100
}

export interface TQSResult {
  score: number;         // 0–100 加权总分
  tier: "S" | "A" | "B" | "C" | "D" | "F";
  factors: TQSFactors;
  factorDetails: Record<string, string>; // 每个因子的评分理由
  hardFloorApplied?: string; // 如果触发降级，记录原因
  disclaimer: string;
}

/**
 * 计算 TQS 分数。
 * 纯函数，无副作用，无外部调用。
 */
export function computeTQS(input: {
  landingRate: number;
  topJudgments: Array<{
    judgment: string;
    keyNumber: string;
    wrongIf: string;
    dataPoint?: string;
    metric?: string;
    trigger?: string;
    freq?: string;
  }>;
  thesisBreakers: Array<{ condition: string }>;
  risks: string[];
  bearCase?: string[];
  reportDate: string; // ISO date
  monitorPanel?: {
    monitors: Array<{
      metric: string;
      current: string;
      trigger: string;
    }>;
  };
}): TQSResult;
```

**验收标准：**
- 纯函数，无副作用
- 100% 单元测试覆盖（至少 20 个 test case）
- 处理所有边界条件（空数组、缺失字段、无法解析日期等）

### Phase 2: 集成到报告生成流程

**修改文件：** `packages/api/src/modules/report/route.ts`

在 `generateValidatedJson` 返回后、写入 L3 Ledger 前，调用 `computeTQS`：

```typescript
// 在 finance/generate 和 committee/generate 中
const tqsResult = computeTQS({
  landingRate: parsed.landingRate,
  topJudgments: parsed.topJudgments,
  thesisBreakers: parsed.thesisBreakers ?? [],
  risks: parsed.sections?.risks ?? [],
  bearCase: parsed.bearCase,
  reportDate: new Date().toISOString().slice(0, 10),
  monitorPanel: parsed.monitorPanel,
});

// 写入响应 JSON
parsed.tqs = tqsResult;

// 写入 L3 Ledger
await autoInsertLedgerJudgments({
  ...existingOpts,
  tqsScore: tqsResult.score,
  tqsTier: tqsResult.tier,
  tqsFactors: tqsResult.factors,
  tqsFactorDetails: tqsResult.factorDetails,
});
```

### Phase 3: Schema 扩展

**修改文件：**
- `packages/shared/src/types/report/index.ts` — 新增 `tqs` 字段
- `packages/db/src/schema/ledger.ts` — 新增 TQS 列
- `packages/db/src/schema/` — 新增 migration

```typescript
// shared types
export interface ReportData {
  // ... existing fields
  tqs?: {
    score: number;
    tier: "S" | "A" | "B" | "C" | "D" | "F";
    factors: TQSFactors;
    factorDetails: Record<string, string>;
    hardFloorApplied?: string;
    disclaimer: string;
  };
}
```

### Phase 4: 前端展示

**在公司页 (#11) 和报告页中展示 TQS：**

- TQS 分数 + 等级 badge（不是买入/卖出评级的 badge，是证据质量的 badge）
- 五因子雷达图或横向柱状图
- 每个因子的展开详情
- disclaimer 常驻

### Phase 5: L3 回答验证（未来）

- 建立 TQS → 兑现率的回归分析
- 定期校准评分标准
- 输出 TQS 校准报告

---

## 七、与 #11 (Phase B 公司页) 的咬合关系

两个 issue 天然咬合：

| 组件 | 产出方 | 消费方 |
|------|--------|--------|
| TQS 分数 | #52 (本 issue) | #11 (公司页渲染) |
| Conviction Tier | 现有 report 逻辑 | #11 (公司页渲染) |
| Scenario + 失效条件 | 现有 report 逻辑 | #11 (公司页渲染) |
| Landing Rate | #50 (已合并) | #52 (TQS F1 输入) |
| Filing 数据 | #51 (已合并) | #52 (TQS F4 输入) |

**并行策略：**
- #52 产出 `tqs.ts` 纯函数 + schema 扩展
- #11 在前端预留 TQS 展示位置，可用 mock 数据先做 UI
- #52 合并后，#11 直接接入真实数据

---

## 八、验收清单

### 必须通过

- [ ] `computeTQS` 是纯函数，无副作用
- [ ] 单元测试覆盖所有 5 个因子 + 加权计算 + 降级条件
- [ ] TQS 分数写入 L3 Ledger
- [ ] TQS disclaimer 在所有输出中出现
- [ ] TQS 不与任何 buy/sell/hold 逻辑关联
- [ ] TQS 不出现在 `decisionBrief.action` 中
- [ ] 现有报告流程不受影响（TQS 是附加层，不改变 L0/L1/L3 行为）
- [ ] `pnpm lint` + `pnpm format` + `pnpm test` 全部通过

### 不在范围内

- TQS 校准回测（Phase 5，未来 L4 的事）
- TQS 对 LLM prompt 的反馈（v2 考虑）
- 前端 UI 实现（属于 #11）

---

## 九、失效条件

如果以下任一条件成立，本任务书需要重新评估：

1. L1 landing rate 的计算方式发生 breaking change
2. topJudgments schema 发生 breaking change
3. L3 Ledger schema 发生 breaking change
4. "借形不借神"约束被移除
5. TQS 被证明与兑现率无相关性（需要 L3 积累足够数据后才能判断）

---

## 十、来源

- [L1 Landing Validator](../packages/api/src/modules/report/landing-validator.ts)
- [L3 Ledger Schema](../packages/db/src/schema/ledger.ts)
- [Report Route](../packages/api/src/modules/report/route.ts)
- [Report Types](../packages/shared/src/types/report/index.ts)
- [Filing Skill](../skills/filing/SKILL.md)
- [Deep Dive Skill](../skills/deep-dive/SKILL.md)
- [Methodology Reference](../apps/report-agent/references/methodology.md)
- [Track Record](../apps/report-agent/references/track-record.md)
- [User Persona](./persona.md)
