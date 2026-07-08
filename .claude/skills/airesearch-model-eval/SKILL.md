---
name: airesearch-model-eval
description: A/B evaluate AI model quality (Claude Fable 5 vs DeepSeek/GPT/Gemini) for airesearch report generation, and decide per-lens model routing. Use whenever Wook mentions comparing models, "Fable 5", model switching, report quality, hallucination rate, "模型对比", "报告质量", or asks which model should power a lens (Serenity/Supply Chain, Fundamental, Macro, Technical, Sentiment, Risk) or deep-dive vs snapshot skills.
---

# airesearch Model Quality Eval — Fable 5 vs incumbents

Goal: decide, with evidence, which model powers each of the six analysis lenses and the `deep-dive` / `snapshot` skills, balancing quality against per-report cost.

## Eval design

**Test set**: 6 tickers spanning difficulty — one mega-cap (NVDA), one mid-cap industrial in Wook's robotics thesis space (e.g. Harmonic Drive 6324.T or Regal Rexnord), one Chinese ADR (BABA or a robotics name), one recent-IPO with thin history, one turnaround/distressed name, one non-US (Japan/Korea supply chain). Plus 2 thematic queries (e.g. "humanoid robot actuator supply chain") to test non-ticker research.

**For each item**: generate the same lens output with (A) the incumbent provider and (B) `claude-fable-5` (API model string), identical prompts and identical injected market data. Randomize A/B labels before grading.

## Grading rubric (per output, 1–5 each)

1. **Factual accuracy** — every number (revenue, margins, dates, ownership) checked against injected source data or live search. Any invented figure caps the score at 2.
2. **Hallucination rate** — count of unverifiable specific claims per 1000 words. Record the raw count, not just a score.
3. **Reasoning depth** — does it connect data to a thesis (second-order effects, unit economics), or restate facts?
4. **Calibration** — are uncertain claims hedged and sourced? Overconfident wrong claims penalized doubly.
5. **Actionability** — would a paying subscriber find a decision-relevant takeaway?

Also record: latency, input/output tokens, and cost per report at current pricing (verify current API pricing before computing — do not use remembered prices).

## Routing decision rules

- A lens switches to Fable 5 only if it wins on accuracy + hallucination AND the cost delta per report is acceptable at current subscription pricing. Compute break-even: (reports/user/month × cost delta) vs subscription margin.
- Expected outcome to test (not assume): Fundamental and Risk lenses benefit most from stronger reasoning; Sentiment and snapshot are cheap-model candidates. Verify, don't presume.
- Hybrid pattern worth testing: cheap model drafts, Fable 5 as verifier/critic pass. Measure whether verify-pass catches the hallucinations at lower total cost than full generation.

## Output

1. Score matrix (model × lens × rubric dimension) as a table.
2. Per-lens routing recommendation with cost impact in USD per 1000 reports.
3. Config-ready diff for the provider routing file in `WOOK98/aireseach` (locate current provider config by searching the repo for the DeepSeek integration).
4. 中文摘要 3–5 句,便于直接发到 X 或写进 changelog。

## Caution

- Never grade a model's output using the same model as sole judge; cross-grade or hand-verify numbers.
- Keep the eval prompts and outputs saved (e.g. `evals/YYYYMMDD/`) so future model versions can be benchmarked against the same set.
