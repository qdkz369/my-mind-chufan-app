/**
 * 拒绝平台推荐的语义化枚举
 * Learning 数据可归因，支持「哪类理由最常被拒绝」统计
 */

export enum RejectReasonCategory {
  /** 客户指定 */
  CUSTOMER_SPECIFIED = "CUSTOMER_SPECIFIED",
  /** 紧急覆盖 */
  URGENT_OVERRIDE = "URGENT_OVERRIDE",
  /** 经验偏好 */
  EXPERIENCE_PREFERENCE = "EXPERIENCE_PREFERENCE",
  /** 平台推荐不匹配（如距离、时间） */
  PLATFORM_MISMATCH = "PLATFORM_MISMATCH",
  /** 其他 */
  OTHER = "OTHER",
}

export const REJECT_REASON_LABELS: Record<RejectReasonCategory, string> = {
  [RejectReasonCategory.CUSTOMER_SPECIFIED]: "客户指定",
  [RejectReasonCategory.URGENT_OVERRIDE]: "紧急覆盖",
  [RejectReasonCategory.EXPERIENCE_PREFERENCE]: "经验偏好",
  [RejectReasonCategory.PLATFORM_MISMATCH]: "平台推荐不匹配",
  [RejectReasonCategory.OTHER]: "其他",
}
