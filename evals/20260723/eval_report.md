# Model Eval Report — Kimi K2.7 vs DeepSeek V4 Pro
**Date:** 2026-07-23 | **Test cases:** 4 | **Focus:** Investment Thesis + Scenario Analysis + Invalidation Conditions + Risk Matrix

---

## Summary Score Matrix

| Dimension | Kimi K2.7 (kimi-for-coding) | DeepSeek V4 Pro |
|---|---|---|
| **1. Factual Accuracy** | 4.0 | 3.5 |
| **2. Hallucination Rate** | 3.5 (fewer unverifiable claims) | 3.0 (more speculative numbers) |
| **3. Reasoning Depth** | 4.5 | 3.5 |
| **4. Calibration** | 4.0 (better hedging) | 3.0 (overconfident on some calls) |
| **5. Actionability** | 4.0 | 3.5 |
| **Average** | **4.0** | **3.3** |

---

## Per-Case Grading

### NVDA (Mega-cap)

| Dimension | Kimi | DeepSeek |
|---|---|---|
| Factual | 4 — Q3 FY25 data cited correctly ($35.1B rev, 74.6% GM) | 3.5 — References CY2025 but fewer anchored data points |
| Hallucination | 3.5 — "32x FY26 consensus EPS" hard to verify | 3 — "25x forward earnings" and "$300B+ hyperscaler AI capex" speculative |
| Reasoning | 4.5 — Connects CUDA moat → supply constraint → pricing power chain | 3.5 — Good but more surface-level ("rare double tailwind") |
| Calibration | 4 — States "confidence: medium due to Blackwell ramp uncertainty" | 3 — Less hedging, more declarative |
| Actionability | 4 — Clear invalidation triggers with specific numbers | 3.5 — Good but slightly generic triggers |

**Winner: Kimi** — Better data anchoring and reasoning chain.

### 6324.T (Mid-cap, robotics thesis)

| Dimension | Kimi | DeepSeek |
|---|---|---|
| Factual | 4 — Correctly identifies strain-wave gear positioning, China competitors | 4 — Channel checks on FANUC/Yaskawa orders (20-25% cut) — very specific |
| Hallucination | 3.5 — Revenue ranges plausible | 3 — ¥68bn bull case revenue seems low vs actual ¥96B baseline |
| Reasoning | 4.5 — Excellent humanoid optionality framing, "hold until evidence" | 3 — Takes a bold contrarian UW stance but reasoning less nuanced |
| Calibration | 4.5 — "medium confidence" stated, balanced tone | 3 — Overconfident UW with specific PT, less hedged |
| Actionability | 4 — Clear invalidation triggers (order intake, gross margin, humanoid revenue) | 3.5 — Triggers are good but some are oddly positioned (bull-case invalidation for a bear thesis) |

**Winner: Kimi** — Better calibration and balanced analysis.

### BABA (Chinese ADR)

| Dimension | Kimi | DeepSeek |
|---|---|---|
| Factual | 4 — $130B revenue, $22B FCF, $35B net cash all in right ballpark | 3.5 — $33B+ buyback, 8% annual retirement — plausible but less sourced |
| Hallucination | 3.5 — "9.5x P/E" and "$80 price" reasonable | 3 — "$130 price target" (85% upside) aggressive; "not seen since 2016" unverifiable |
| Reasoning | 4 — Multi-layered (CMR + Cloud + regulatory + buyback) | 3.5 — Good but more narrative-driven ("hiding in plain sight") |
| Calibration | 4 — States confidence levels, ranges appropriately | 3 — Overconfident on specific targets |
| Actionability | 4 — SEC/AADR risk trigger is excellent and specific | 3.5 — CMR take-rate trigger (<2.8%) is clever |

**Winner: Kimi** — More institutional, better sourced.

### THEMATIC_ROBOT (Non-ticker)

| Dimension | Kimi | DeepSeek |
|---|---|---|
| Factual | 4 — 30-40% BOM, $8-15k/unit, 6-18 month lead times all plausible | 4 — 28-40 actuators/robot, ~1.5M units/year capacity, well-researched |
| Hallucination | 3.5 — Some TAM numbers speculative but flagged as "±30-40%" | 3 — "$1,200 ASP" and "50% of capacity" specific but hard to verify |
| Reasoning | 4.5 — "Software can be delayed, but robot cannot ship without actuators" — excellent framing | 3.5 — Good pricing supercycle thesis but less nuanced |
| Calibration | 4.5 — Explicitly states confidence levels on each scenario | 3 — "80% confidence" on base case is overconfident for a thematic |
| Actionability | 4.5 — OEM in-sourcing trigger (<50% by 2026) is exactly what Kevin needs | 3.5 — Triggers are reasonable but less specific |

**Winner: Kimi** — Superior reasoning and calibration.

---

## Cost & Performance

| Metric | Kimi K2.7 | DeepSeek V4 Pro |
|---|---|---|
| Avg latency | **165.9s** (6324.T outlier: 532s) | **43.3s** |
| Avg tokens/case | **4,971** | **2,165** (incl ~1,276 reasoning) |
| Avg output chars/case | **3,315** | **3,470** |
| Token efficiency | Lower (more reasoning overhead) | Higher (reasoning + output balanced) |
| Cost (est.) | ~$0.005-0.01/case (subscription) | ~$0.01-0.02/case (pay-per-token) |

---

## Key Findings

### 1. Quality: Kimi wins 4/4 cases
- **Reasoning depth** is Kimi's biggest edge — connects data to thesis with second-order thinking
- **Calibration** is consistently better — hedges appropriately, states confidence levels
- DeepSeek tends toward overconfident contrarian takes (UW on 6324.T, aggressive BABA PT)

### 2. Speed: DeepSeek wins clearly
- 43s avg vs 166s avg (3.8x faster)
- 6324.T was532s for Kimi — problematic for real-time report generation

### 3. CRITICAL: Both models violate airesearch redlines
Both outputs contain:
- ❌ Buy/Sell/Overweight/Underweight ratings
- ❌ Specific price targets ($200, ¥2,300, $130, etc.)
- ❌ "Conviction: BUY" statements

**This is a system prompt issue, not a model issue.** The evaluation prompt didn't include the airesearch redline constraints. With proper system prompt engineering (prohibiting ratings/targets, requiring conviction tier + invalidation conditions instead), both models should comply.

### 4. Kimi's reasoning token overhead
- Kimi uses ~4,000-5,000 tokens/case (including internal reasoning)
- DeepSeek uses ~2,000 tokens/case (1,000 reasoning + 1,000 output)
- For report generation, Kimi's cost is comparable due to subscription pricing

---

## Routing Recommendation

| Lens/Skill | Recommended Model | Rationale |
|---|---|---|
| **Fundamental Analysis** | **Kimi K2.7** | Reasoning depth critical for thesis construction |
| **Risk Assessment** | **Kimi K2.7** | Calibration and hedging essential for risk matrices |
| **Scenario Analysis** | **Kimi K2.7** | Better at multi-scenario reasoning with probability calibration |
| **Technical/Sentiment** | **DeepSeek V4 Pro** | Speed matters more; less reasoning needed |
| **Snapshot (quick takes)** | **DeepSeek V4 Pro** | 3.8x faster, sufficient quality for summaries |
| **Deep Dive** | **Kimi K2.7** | Quality justifies latency for premium reports |

**Hybrid pattern worth testing:** DeepSeek drafts → Kimi verifies/critiques. This could catch hallucinations at lower total cost than full Kimi generation.

---

## Next Steps

1. **Fix system prompt** — Add airesearch redline constraints (no ratings, no price targets, conviction tier only)
2. **Re-run eval** with corrected prompt to verify compliance
3. **Test hybrid pattern** — DeepSeek draft + Kimi verify
4. **Update server.py** — Add Kimi as provider option in `get_llm_config`
5. **Deploy to staging** — A/B test with real users before production

---

## 中文摘要

Kimi K2.7 在推理深度和校准能力上全面优于 DeepSeek V4 Pro（4.0 vs 3.3），尤其适合基本面分析、风险评估和情景推演。DeepSeek 速度快3.8倍，适合快速摘要和技术分析。**两个模型都违反了 airesearch 红线**（输出了买卖评级和目标价），这是系统提示词的问题，通过添加约束可以解决。建议：核心报告链用 Kimi，快速任务用 DeepSeek，后续测试 DeepSeek 起草 + Kimi 审核的混合模式。
