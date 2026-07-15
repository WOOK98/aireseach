// ─── L1 断言落地校验器 ─────────────────────────────────────────────────────
// 数字必须绑定 data_point（来源+期标），落地率 < 0.85 触发重生成。
// 设计原则：无法验证的数字不渲染（全局红线①的管线化）

export interface JudgmentLike {
  judgment: string;
  keyNumber: string;
  wrongIf: string;
  dataPoint?: string; // "source (period)" e.g. "Yahoo Finance Q2 2026"
}

export interface LandingResult {
  rate: number;
  landed: number;
  total: number;
  unbound: string[]; // judgment text of unbound assertions
  passed: boolean; // rate >= threshold
}

export interface LandingConfig {
  threshold: number; // default 0.85
}

const DEFAULT_CONFIG: LandingConfig = { threshold: 0.85 };

/**
 * Check if a dataPoint binding is valid (non-empty, contains meaningful content).
 * A binding like "N/A" or "unknown" or empty string counts as unbound.
 */
function isValidBinding(dataPoint: string | undefined): boolean {
  if (!dataPoint) return false;
  const trimmed = dataPoint.trim();
  if (trimmed.length === 0) return false;
  const lower = trimmed.toLowerCase();
  if (["n/a", "unknown", "tbd", "pending", "—", "-"].includes(lower))
    return false;
  return true;
}

/**
 * Validate landing rate for a batch of judgments.
 * Returns the landing result with rate, counts, and unbound assertion details.
 */
export function validateLandingRate(
  judgments: JudgmentLike[],
  config: LandingConfig = DEFAULT_CONFIG,
): LandingResult {
  const total = judgments.length;
  if (total === 0) {
    return { rate: 1, landed: 0, total: 0, unbound: [], passed: true };
  }

  const unbound: string[] = [];
  let landed = 0;

  for (const j of judgments) {
    if (isValidBinding(j.dataPoint)) {
      landed++;
    } else {
      unbound.push(j.judgment);
    }
  }

  const rate = landed / total;
  const passed = rate >= config.threshold;

  return { rate, landed, total, unbound, passed };
}

/**
 * Build a retry prompt suffix for the AI model when landing rate is too low.
 * Lists the specific unbound assertions so the model knows what to fix.
 */
export function buildRetryPromptSuffix(result: LandingResult): string {
  if (result.passed) return "";

  const unboundList = result.unbound
    .map((j, i) => `  ${i + 1}. "${j}" — missing dataPoint (source + period)`)
    .join("\n");

  return `
L1 LANDING CHECK FAILED: Only ${result.landed}/${result.total} judgments have data_point bindings (required: ≥85%).
Unbound assertions:
${unboundList}

For each judgment above, add a "dataPoint" field in the format "Source Period" (e.g. "Yahoo Finance Q2 2026", "Company 10-K FY2025", "Bloomberg July 2026").
Every numeric claim MUST cite its source and time period. This is a hard requirement.`;
}
