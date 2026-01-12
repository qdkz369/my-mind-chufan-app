"use client"

/**
 * 资产事实卡片组件
 * 
 * 核心原则：
 * - 不做"看板"，只做"事实呈现"
 * - 不显示业务解释字段（如 is_abnormal, risk_level, score, comment）
 * - iOS 风格（毛玻璃效果、大圆角、简洁设计）
 * 
 * 展示字段：
 * - 资产 ID（二维码值）
 * - 当前状态
 * - 最近一次行为
 * - 最近更新时间
 */

import { AssetFactContract } from "@/lib/facts/contracts/order.fact"
import { QrCode, Activity, Clock, Package } from "lucide-react"

/**
 * AssetFactCard 组件 Props
 * 
 * 约束：
 * - asset 必须使用 AssetFactContract 类型（事实契约）
 * - 组件不得直接依赖数据库字段结构
 */
interface AssetFactCardProps {
  asset: AssetFactContract
  className?: string
  onClick?: () => void
}

// 状态显示映射（仅用于显示，不用于判断）
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
 */
function formatTime(timestamp: string): string {
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

    if (diffMins < 1) return "刚刚"
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`

    // 超过7天，显示具体日期
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
 * 格式化资产 ID（二维码值）显示
 * 如果 ID 过长，显示前6位和后4位，中间用省略号
 */
function formatAssetId(assetId: string): string {
  if (assetId.length <= 12) {
    return assetId
  }
  return `${assetId.slice(0, 6)}...${assetId.slice(-4)}`
}

export function AssetFactCard({ asset, className, onClick }: AssetFactCardProps) {
  const statusLabel = statusLabelMap[asset.status] || asset.status
  const hasLastAction = asset.last_action && asset.last_action !== ""
  // last_action_at 可能为 null（表示从未产生任何 trace 行为）
  const displayTime = asset.last_action_at || "未知"

  return (
    <div
      className={`
        rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/50 p-5
        transition-all duration-200
        ${onClick ? "cursor-pointer hover:shadow-lg hover:scale-[1.02]" : ""}
        ${className || ""}
      `}
      onClick={onClick}
    >
      {/* 头部：资产 ID */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">资产 ID</div>
            <div className="font-mono font-medium text-gray-900 text-sm">
              {formatAssetId(asset.asset_id)}
            </div>
          </div>
        </div>
        
        {/* 状态标签 */}
        <div className="px-3 py-1 rounded-lg bg-gray-100 border border-gray-200/50">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">{statusLabel}</span>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="space-y-3">
        {/* 当前状态 */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-200/50">
          <Package className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-400 mb-1">当前状态</div>
            <div className="text-sm font-medium text-gray-900">{statusLabel}</div>
          </div>
        </div>

        {/* 最近一次行为 */}
        {hasLastAction ? (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-200/30">
            <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-blue-600/70 mb-1">最近一次行为</div>
              <div className="text-sm font-medium text-blue-900">{asset.last_action}</div>
              <div className="text-xs text-blue-600/60 mt-1">{formatTime(displayTime)}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/50 border border-gray-200/30">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 mb-1">最近一次行为</div>
              <div className="text-sm font-medium text-gray-500">暂无行为记录</div>
            </div>
          </div>
        )}

        {/* 最近更新时间 */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200/50">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-400">
            更新时间：{formatTime(asset.last_action_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
