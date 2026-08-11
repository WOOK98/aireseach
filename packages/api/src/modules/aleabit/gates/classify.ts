/**
 * AleaBit — Classification gate (pure function) (#119)
 *
 * Categorizes X post content into:
 * - earnings: explicit quarterly/annual financial results
 * - company: company analysis, strategy, management changes
 * - supply_chain: supply chain, orders, bottlenecks, capacity
 * - other: macro, personal, unrelated — skip
 *
 * Returns reasoning for audit trail.
 */
import type { ClassificationResult } from "@workspace/shared/types/aleabit";

// ── Signal patterns ──────────────────────────────────────────────────────────

const EARNINGS_SIGNALS =
  /\b(?:earnings|revenue|EPS|profit|margin|guidance|outlook|quarter|Q[1-4]|FY\d{2,4}|fiscal|income|loss|beat|miss|estimate|consensus|10-K|10-Q|8-K|annual report)\b|财报|营收|利润|毛利率|净利率|每股收益|指引|季度|同比|环比|超出预期|不及预期/i;

const COMPANY_SIGNALS =
  /\b(acquisition|merger|CEO|CFO|management|restructuring|buyback|dividend|IPO|valuation|moat|competitive|market share|strategy|partnership|contract|订单|收购|合并|管理层|回购|估值|竞争|战略|合作)\b/i;

const SUPPLY_CHAIN_SIGNALS =
  /\b(supply|chain|bottleneck|capacity|shortage|inventory|lead time|supplier|component|semiconductor|wafer|fab|HBM|packaging|ASML|TSMC|产能|供应链|瓶颈|库存|交期|供应商|晶圆|封装)\b/i;

const NOISE_SIGNALS =
  /\b(good morning|gm|follow|retweet|like|subscribe|check out|thread|crypto|bitcoin|BTC|ETH|nft|meme|早安|关注|转发)\b/i;

// ── Classification ───────────────────────────────────────────────────────────

export function classifyContent(text: string): ClassificationResult {
  const trimmed = text.trim();

  // Too short — skip
  if (trimmed.length < 30) {
    return {
      category: "other",
      confidence: 0.95,
      reasoning: "Post too short to contain meaningful financial content.",
      skipReason: "short_post",
    };
  }

  // Noise detection
  if (NOISE_SIGNALS.test(trimmed) && trimmed.length < 100) {
    return {
      category: "other",
      confidence: 0.9,
      reasoning: "Post matches noise patterns (greetings, engagement bait).",
      skipReason: "noise",
    };
  }

  // Score each category
  const earningsScore = (trimmed.match(EARNINGS_SIGNALS) || []).length;
  const companyScore = (trimmed.match(COMPANY_SIGNALS) || []).length;
  const supplyScore = (trimmed.match(SUPPLY_CHAIN_SIGNALS) || []).length;

  const maxScore = Math.max(earningsScore, companyScore, supplyScore);

  if (maxScore === 0) {
    return {
      category: "other",
      confidence: 0.7,
      reasoning: "No financial signals detected in post text.",
      skipReason: "no_financial_signals",
    };
  }

  // Earnings takes priority if tied
  if (earningsScore === maxScore) {
    return {
      category: "earnings",
      confidence: Math.min(0.5 + earningsScore * 0.15, 0.95),
      reasoning: `Detected ${earningsScore} earnings signal(s).`,
    };
  }

  if (supplyScore === maxScore) {
    return {
      category: "supply_chain",
      confidence: Math.min(0.5 + supplyScore * 0.15, 0.95),
      reasoning: `Detected ${supplyScore} supply chain signal(s).`,
    };
  }

  return {
    category: "company",
    confidence: Math.min(0.5 + companyScore * 0.15, 0.95),
    reasoning: `Detected ${companyScore} company signal(s).`,
  };
}
