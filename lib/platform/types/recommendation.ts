/**
 * 平台推荐与拒绝的语义化结构
 * 支持统计、策略权重反推、explainability 对比
 */

/** 推荐主因（平台语义，可归因） */
export type PrimaryReasonCode =
  | "SKILL_MATCH"
  | "DISTANCE"
  | "AVAILABILITY"
  | "LOAD_BALANCE"
  | "EXPERIENCE"
  | "NO_CANDIDATES"

/** 次要因素（可多选） */
export type SecondaryFactorCode =
  | "SKILL_MATCH"
  | "DISTANCE"
  | "AVAILABILITY"
  | "LOAD_BALANCE"
  | "EXPERIENCE"

/** 平台推荐结构化数据 */
export interface PlatformRecommendation {
  primary_reason: PrimaryReasonCode
  secondary_factors: SecondaryFactorCode[]
  confidence_score: number
}

/** 用于 UI 展示的人类可读标签 */
export const PRIMARY_REASON_LABELS: Record<PrimaryReasonCode, string> = {
  SKILL_MATCH: "技能匹配",
  DISTANCE: "距离最近",
  AVAILABILITY: "当前可用",
  LOAD_BALANCE: "负载均衡",
  EXPERIENCE: "经验优先",
  NO_CANDIDATES: "无可用候选人",
}

export const SECONDARY_FACTOR_LABELS: Record<SecondaryFactorCode, string> = {
  SKILL_MATCH: "技能",
  DISTANCE: "距离",
  AVAILABILITY: "可用性",
  LOAD_BALANCE: "负载",
  EXPERIENCE: "经验",
}

/** 将结构化推荐转为 UI 展示文案 */
export function formatRecommendationForUI(rec: PlatformRecommendation): string {
  const primary = PRIMARY_REASON_LABELS[rec.primary_reason] ?? rec.primary_reason
  if (rec.secondary_factors.length === 0) {
    return primary
  }
  const secondaries = rec.secondary_factors
    .map((f) => SECONDARY_FACTOR_LABELS[f] ?? f)
    .join("、")
  return `${primary}（${secondaries}）`
}
