/**
 * 资产卡片 ViewModel
 * 
 * 职责：
 * - 将 AssetFactContract 转换为 UI 可用的资产卡片数据
 * - 完成时间格式化
 * - 完成语义转换（状态代码 → 中文标签）
 * - 不暴露任何 Fact 原始字段名给 UI
 * 
 * 原则：
 * - 不引入业务判断
 * - 不进行数据库查询
 * - 仅做字段映射、格式化、语义转换
 */

import { AssetFactContract } from "@/lib/facts/contracts/order.fact"

/**
 * 资产卡片 ViewModel
 * 
 * 注意：字段名不暴露 Facts 原始字段名
 */
export type AssetCardViewModel = {
  /**
   * 资产ID（已映射，不暴露 asset_id）
   */
  assetId: string

  /**
   * 当前状态（原始值，用于判断）
   */
  status: string

  /**
   * 状态显示标签（已转换为中文）
   */
  statusLabel: string

  /**
   * 最后一次操作类型（已转换为中文，如果存在）
   */
  lastActionLabel: string | null

  /**
   * 最后一次操作时间显示（格式化后的时间，如果存在）
   */
  lastActionTimeDisplay: string | null

  /**
   * 是否有最后一次操作记录
   */
  hasLastAction: boolean
}

/**
 * 状态显示映射（语义转换）
 */
const statusLabelMap: Record<string, string> = {
  active: "活跃",
  inactive: "非活跃",
  maintenance: "维护中",
  delivered: "已交付",
  returned: "已回收",
  持有: "持有中",
}

/**
 * 格式化时间显示
 * 
 * 规则：
 * - 1分钟内：显示"刚刚"
 * - 1小时内：显示"X分钟前"
 * - 24小时内：显示"X小时前"
 * - 7天内：显示"X天前"
 * - 超过7天：显示具体日期时间（如："01-01 12:00"）
 */
function formatTimeDisplay(timestamp: string | null): string {
  if (!timestamp || timestamp === "") {
    return "未知"
  }

  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) {
      return "刚刚"
    }
    if (diffMins < 60) {
      return `${diffMins}分钟前`
    }
    if (diffHours < 24) {
      return `${diffHours}小时前`
    }
    if (diffDays < 7) {
      return `${diffDays}天前`
    }

    // 超过7天，显示具体日期时间
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${month}-${day} ${hours}:${minutes}`
  } catch {
    return timestamp
  }
}

/**
 * 将资产事实转换为资产卡片 ViewModel
 * 
 * @param asset - 资产事实契约
 * @returns 资产卡片 ViewModel
 */
export function convertAssetFactToCardViewModel(
  asset: AssetFactContract
): AssetCardViewModel {
  const hasLastAction = Boolean(asset.last_action && asset.last_action !== "")
  const lastActionLabel = hasLastAction ? asset.last_action : null
  const lastActionTimeDisplay = asset.last_action_at
    ? formatTimeDisplay(asset.last_action_at)
    : null

  return {
    assetId: asset.asset_id, // 字段映射：asset_id → assetId
    status: asset.status,
    statusLabel: statusLabelMap[asset.status] || asset.status,
    lastActionLabel,
    lastActionTimeDisplay,
    hasLastAction,
  }
}
