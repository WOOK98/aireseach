#!/usr/bin/env python3
"""
airesearch Model Eval — Kimi K2.6 vs DeepSeek V4 Pro
Test date: 2026-07-23
Focus: Investment Thesis + Scenario Analysis + Invalidation Conditions
"""

import json
import os
import time
import random
from datetime import datetime
from openai import OpenAI

# --- Load .env ---
def load_dotenv(path):
    if not os.path.exists(path):
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, val = line.split('=', 1)
                key, val = key.strip(), val.strip().strip('"').strip("'")
                if key not in os.environ:
                    os.environ[key] = val

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '.env'))

# --- Config ---
EVAL_DIR = os.path.dirname(os.path.abspath(__file__))
RUN_TS = datetime.now().strftime("%Y%m%d_%H%M%S")

MODELS = {
    "A": {
        "label": "Model-A",
        "api_key": "sk-6cbe0ec937974c54a6d12cccd4c6d64b",
        "base_url": "https://api.deepseek.com/v1",
        "model": "deepseek-v4-pro",
    },
    "B": {
        "label": "Model-B",
        "api_key": "SKIP",
        "base_url": "https://api.kimi.com/coding/v1",
        "model": "kimi-for-coding",
    },
}

# Shuffle A/B labels so grader doesn't know which is which
SHUFFLE = random.random() > 0.5
if SHUFFLE:
    MODELS["A"], MODELS["B"] = MODELS["B"], MODELS["A"]

# --- Test set ---
TEST_CASES = [
    {
        "id": "NVDA",
        "type": "ticker",
        "target": "NVIDIA Corporation (NVDA)",
        "note": "Mega-cap AI/GPU leader"
    },
    {
        "id": "6324.T",
        "type": "ticker",
        "target": "Harmonic Drive Systems (6324.T)",
        "note": "Mid-cap precision gear, robotics thesis"
    },
    {
        "id": "BABA",
        "type": "ticker",
        "target": "Alibaba Group (BABA)",
        "note": "Chinese ADR, regulatory overhang"
    },
    {
        "id": "THEMATIC_ROBOT",
        "type": "thematic",
        "target": "Humanoid robot actuator supply chain",
        "note": "Non-ticker thematic research"
    },
]

FOCUSED_PROMPT = """You are a senior equity research analyst at a top-tier investment bank. 
Generate a focused analysis for: {target}

## STRICT REDLINE CONSTRAINTS (violation = report rejection)
- NEVER output buy/sell/overweight/underweight/equalweight ratings
- NEVER output specific price targets (e.g. $200, ¥2,300, PT $130)
- NEVER use conviction language like "Buy", "Sell", "Conviction: BUY"
- Instead of ratings, use conviction tier: S (highest) / A / B / C / D (lowest)
- Instead of price targets, present valuation ranges with structural reasoning
- Instead of "Overweight/Buy", say "Bullish structural setup" or "Bearish risk/reward"

Write ONLY these sections (be precise, quantitative, evidence-based):

## 1. INVESTMENT THESIS (3-5 sentences)
- Lead with conclusion and directional view (bullish/bearish/neutral — NO ratings)
- State what the market is missing and why now
- End with conviction tier (S/A/B/C/D) and one-line rationale

## 2. SCENARIO ANALYSIS
Three scenarios (Bull/Base/Bear) each with:
- Probability %
- Key assumptions (2-3)
- Metric range outcome (revenue/EPS ranges, NOT price targets)
- Primary catalyst (bull) or trigger (bear)

## 3. THESIS INVALIDATION CONDITIONS
- 3-4 specific, measurable conditions
- Each with a numeric threshold
- Format: "Condition: [what] → Trigger: [number/metric]"

## 4. RISK MATRIX (top 3)
| Risk | Impact (1-5) | Probability (1-5) | Score |

Be quantitative. No filler. If data is uncertain, state confidence level.
"""


def run_eval():
    results = []
    
    for case in TEST_CASES:
        print(f"\n{'='*60}")
        print(f"Test case: {case['id']} — {case['target']}")
        print(f"{'='*60}")
        
        prompt = FOCUSED_PROMPT.format(target=case["target"])
        
        for label in ["A", "B"]:
            cfg = MODELS[label]
            if not cfg["api_key"]:
                print(f"\n  Skipping {cfg['label']} ({cfg['model']}) — no API key")
                results.append({
                    "case_id": case["id"], "case_type": case["type"], "target": case["target"],
                    "model_label": cfg["label"], "model_name": cfg["model"],
                    "output": None, "latency_s": 0, "error": "No API key configured",
                })
                continue
            print(f"\n  Generating with {cfg['label']} ({cfg['model']})...")
            
            client = OpenAI(api_key=cfg["api_key"], base_url=cfg["base_url"])
            
            start = time.time()
            try:
                response = client.chat.completions.create(
                    model=cfg["model"],
                    messages=[
                        {"role": "system", "content": "You are a senior equity research analyst. Be precise and quantitative."},
                        {"role": "user", "content": prompt},
                    ],
                    max_tokens=None,
                    temperature=1,
                )
                elapsed = time.time() - start
                output = response.choices[0].message.content
                usage = response.usage
                
                result = {
                    "case_id": case["id"],
                    "case_type": case["type"],
                    "target": case["target"],
                    "model_label": cfg["label"],
                    "model_name": cfg["model"],
                    "output": output,
                    "latency_s": round(elapsed, 2),
                    "input_tokens": usage.prompt_tokens if usage else None,
                    "output_tokens": usage.completion_tokens if usage else None,
                    "reasoning_tokens": getattr(usage.completion_tokens_details, 'reasoning_tokens', None) if usage and usage.completion_tokens_details else None,
                    "total_tokens": usage.total_tokens if usage else None,
                    "finish_reason": response.choices[0].finish_reason,
                    "error": None,
                }
                print(f"    ✓ {usage.completion_tokens if usage else '?'} tokens ({getattr(usage.completion_tokens_details, 'reasoning_tokens', '?')} reasoning), {elapsed:.1f}s, finish={response.choices[0].finish_reason}")
                
            except Exception as e:
                elapsed = time.time() - start
                result = {
                    "case_id": case["id"],
                    "case_type": case["type"],
                    "target": case["target"],
                    "model_label": cfg["label"],
                    "model_name": cfg["model"],
                    "output": None,
                    "latency_s": round(elapsed, 2),
                    "error": str(e),
                }
                print(f"    ✗ Error: {e}")
            
            results.append(result)
    
    # Save results
    out_path = os.path.join(EVAL_DIR, f"results_{RUN_TS}.json")
    with open(out_path, "w") as f:
        json.dump({
            "run_ts": RUN_TS,
            "shuffle_swapped": SHUFFLE,
            "model_a": {"label": MODELS["A"]["label"], "model": MODELS["A"]["model"]},
            "model_b": {"label": MODELS["B"]["label"], "model": MODELS["B"]["model"]},
            "results": results,
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n\nResults saved to: {out_path}")
    
    # Also save readable markdown
    md_path = os.path.join(EVAL_DIR, f"results_{RUN_TS}.md")
    with open(md_path, "w") as f:
        f.write(f"# Model Eval Results — {RUN_TS}\n\n")
        f.write(f"**Model A**: {MODELS['A']['label']} (`{MODELS['A']['model']}`)\n")
        f.write(f"**Model B**: {MODELS['B']['label']} (`{MODELS['B']['model']}`)\n")
        f.write(f"**Shuffle swapped**: {SHUFFLE}\n\n")
        
        for case in TEST_CASES:
            f.write(f"---\n\n## {case['id']} — {case['target']}\n\n")
            case_results = [r for r in results if r["case_id"] == case["id"]]
            for r in case_results:
                f.write(f"### {r['model_label']} ({r['model_name']})\n")
                f.write(f"- Latency: {r['latency_s']}s | Tokens: {r.get('output_tokens', '?')} out\n\n")
                if r["output"]:
                    f.write(r["output"])
                else:
                    f.write(f"**ERROR**: {r['error']}")
                f.write("\n\n")
    
    print(f"Readable markdown: {md_path}")
    return out_path


if __name__ == "__main__":
    run_eval()
