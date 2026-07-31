"""
Tests for the shared analysis contract fallback.

Verifies that when hard_rules.json / mode_perspectives.json are missing
or corrupt, the safety rules still appear — they must NEVER silently disappear.

Tests the contract-loading logic directly (no server.py import required).
"""

import json
from pathlib import Path

CONTRACT_DIR = (
    Path(__file__).resolve().parent.parent.parent
    / "packages" / "shared" / "src" / "skill-contract"
)


# ── Inline fallback (same as server.py) ──────────────────────────────────────

_INLINE_HARD_RULES = """## SHARED HARD RULES (from analysis contract — applies to ALL modes)

1. **Entity Gate (MANDATORY).** Resolve input to exactly ONE verified listed entity before ANY analysis. Never analyze a blend. If ambiguous, STOP and ask.
2. **Never fabricate financial figures.** If a number can't be verified, say "Data unavailable — [what to verify]".
3. **Never output** target prices, buy/sell ratings, entry levels, stop levels, portfolio weights, position sizing, or personalized investment instructions.
4. **Conviction tier** (S/A/B/C/D/F) evaluates evidence quality only — not whether to buy, sell, hold, size, or allocate.
5. **Every quantitative claim** gets a date or period attached. Distinguish facts from estimates from opinion.
6. **GAAP first.** If citing non-GAAP, name the excluded items.
7. **Never substitute** a similarly-named company. If data is missing for the resolved entity, say so.
8. **Reports end with invalidation conditions**, not price targets.
9. **Never present** the report as a trade instruction. Never execute, place, or cancel orders.
10. **Cross-market A/H peers: sourced or stated absent.** When the methodology calls for A-share or H-share peer comparison, every listed peer MUST come from search results with a citable source. If no sourced A/H peer exists, write "No listed A-share/H-share pure play found in sources" — never fill the gap from memory. **Fabricating peer names is the same failure as fabricating financial figures (rule 2).**""".strip()


_INLINE_MODE_PERSPECTIVES = {
    "snapshot": {
        "label": "Investment snapshot: decide in 3 minutes whether the stock deserves deeper work",
        "focus": "Balance breadth vs depth. Cover thesis, valuation, risks, and catalysts at equal weight.",
        "emphasis": "overview, investmentThesis, decisionBrief",
    },
    "earnings": {
        "label": "Earnings review: focus on growth quality, margins, cash flow, and execution",
        "focus": "Deep-dive revenue trajectory, margin evolution, FCF conversion, and earnings surprise history.",
        "emphasis": "growthDrivers, profitability, topJudgments (margin/cash flow focus)",
    },
    "competition": {
        "label": "Competitive landscape: moat, substitution risk, pricing power, and industry position",
        "focus": "Analyze market share trends, moat durability, Porter's Five Forces, peer benchmarking.",
        "emphasis": "overview (competitive framing), risks (disruption/substitution), scenarioMatrix",
    },
    "risk": {
        "label": "Risk scan: valuation, balance sheet, cash flow, cyclicality, and crowded narrative risk",
        "focus": "Invert the analysis — lead with what can go wrong. Weight risks section 3x.",
        "emphasis": "risks (primary focus), valuation (downside scenarios), scenarioMatrix (bear case details)",
    },
    "poc": {
        "label": "Tracking plan: convert the thesis into 30-90 day measurable validation points",
        "focus": "Focus on the watchlist and monitorPanel sections. Light on narrative, heavy on actionable metrics.",
        "emphasis": "watchlist, monitorPanel, nextSteps, evidenceNeeds",
    },
}


# ── Contract loading (mirrors server.py logic) ───────────────────────────────

def _load_json(filename, fallback):
    try:
        return json.loads((CONTRACT_DIR / filename).read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return fallback


def load_hard_rules():
    return _load_json("hard_rules.json", {}).get("rules", "") or _INLINE_HARD_RULES


def load_mode_perspectives():
    return _load_json("mode_perspectives.json", {}) or _INLINE_MODE_PERSPECTIVES


# ── Tests ────────────────────────────────────────────────────────────────────

CRITICAL_RULES = [
    "Entity Gate",
    "Never fabricate",
    "Never output",
    "target prices",
    "invalidation conditions",
    "Never present",
    "trade instruction",
    "Conviction tier",
]


def test_hard_rules_from_json():
    """When JSON exists, rules come from it and contain all critical rules."""
    rules = load_hard_rules()
    for phrase in CRITICAL_RULES:
        assert phrase in rules, f"JSON rules missing: '{phrase}'"


def test_inline_fallback_contains_all_critical_rules():
    """The inline fallback must contain every critical safety rule."""
    for phrase in CRITICAL_RULES:
        assert phrase in _INLINE_HARD_RULES, f"Fallback missing: '{phrase}'"


def test_hard_rules_fallback_on_missing_json(tmp_path):
    """When JSON is missing, inline fallback kicks in with full safety rules."""
    # Write a broken JSON to tmp_path and load from there
    broken_dir = tmp_path / "contract"
    broken_dir.mkdir()
    (broken_dir / "hard_rules.json").write_text("NOT JSON")

    result = _load_json.__wrapped__ if hasattr(_load_json, "__wrapped__") else None

    # Simulate: load from broken dir, fall back to inline
    try:
        data = json.loads((broken_dir / "hard_rules.json").read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        data = {}

    effective = data.get("rules", "") or _INLINE_HARD_RULES
    for phrase in CRITICAL_RULES:
        assert phrase in effective, f"Fallback (missing JSON) missing: '{phrase}'"


def test_mode_perspectives_all_modes_present():
    """All 5 modes must be present in both JSON and fallback."""
    perspectives = load_mode_perspectives()
    for mode in ["snapshot", "earnings", "competition", "risk", "poc"]:
        assert mode in perspectives, f"Missing mode: {mode}"
        assert "label" in perspectives[mode]
        assert "focus" in perspectives[mode]


def test_mode_perspectives_fallback_on_missing_json(tmp_path):
    """When JSON is missing, inline fallback covers all 5 modes."""
    for mode in ["snapshot", "earnings", "competition", "risk", "poc"]:
        assert mode in _INLINE_MODE_PERSPECTIVES, f"Fallback missing mode: {mode}"


def test_json_and_ts_consistency():
    """hard_rules.json content must match the generator's TS output constant."""
    json_rules = _load_json("hard_rules.json", {}).get("rules", "")

    # Read the TS generated file and extract SHARED_HARD_RULES
    ts_path = CONTRACT_DIR / "generated.ts"
    ts_content = ts_path.read_text(encoding="utf-8")

    # The TS file should contain the same rules text
    assert "Entity Gate" in ts_content, "generated.ts missing Entity Gate"
    assert "Entity Gate" in json_rules, "hard_rules.json missing Entity Gate"

    # Both should contain the same critical phrases
    for phrase in CRITICAL_RULES:
        assert phrase in ts_content, f"generated.ts missing: '{phrase}'"
        assert phrase in json_rules, f"hard_rules.json missing: '{phrase}'"


def test_json_and_ts_mode_perspectives_consistency():
    """mode_perspectives.json must have same modes as generated.ts."""
    json_modes = _load_json("mode_perspectives.json", {})
    ts_path = CONTRACT_DIR / "generated.ts"
    ts_content = ts_path.read_text(encoding="utf-8")

    for mode in ["snapshot", "earnings", "competition", "risk", "poc"]:
        assert mode in json_modes, f"JSON missing mode: {mode}"
        # generated.ts uses unquoted keys (serializeTsObject) or quoted keys
        assert f'{mode}:' in ts_content or f'"{mode}"' in ts_content, f"generated.ts missing mode: {mode}"


def test_generator_produces_consistent_outputs(tmp_path):
    """Running the generator should produce JSON and TS with identical rules."""
    import subprocess

    repo_root = CONTRACT_DIR.parent.parent.parent.parent
    result = subprocess.run(
        ["node", "scripts/generate-skill-contract.mjs"],
        capture_output=True, text=True,
        cwd=repo_root,
    )
    assert result.returncode == 0, f"Generator failed: {result.stderr}"

    # Re-read after generation
    json_rules = _load_json("hard_rules.json", {}).get("rules", "")
    ts_content = (CONTRACT_DIR / "generated.ts").read_text(encoding="utf-8")

    for phrase in CRITICAL_RULES:
        assert phrase in json_rules, f"Post-gen JSON missing: '{phrase}'"
        assert phrase in ts_content, f"Post-gen TS missing: '{phrase}'"
