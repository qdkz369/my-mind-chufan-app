"use client"

/**
 * 资产卡片组件
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

import { AssetCardViewModel } from "@/lib/facts-ui/assetCard.viewmodel"
import { QrCode, Activity, Clock, Package } from "lucide-react"

/**
 * AssetFactCard 组件 Props
 * 
 * 约束：
 * - viewModel 必须使用 AssetCardViewModel 类型（ViewModel）
 * - 组件不再直接依赖 Facts 类型
 */
interface AssetFactCardProps {
  viewModel: AssetCardViewModel
  className?: string
  onClick?: () => void
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

export function AssetFactCard({ viewModel, className, onClick }: AssetFactCardProps) {

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
              {formatAssetId(viewModel.assetId)}
            </div>
          </div>
        </div>
        
        {/* 状态标签 */}
        <div className="px-3 py-1 rounded-lg bg-gray-100 border border-gray-200/50">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">{viewModel.statusLabel}</span>
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
            <div className="text-sm font-medium text-gray-900">{viewModel.statusLabel}</div>
          </div>
        </div>

        {/* 最近一次行为 */}
        {viewModel.hasLastAction && viewModel.lastActionLabel ? (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-200/30">
            <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-blue-600/70 mb-1">最近一次行为</div>
              <div className="text-sm font-medium text-blue-900">{viewModel.lastActionLabel}</div>
              {viewModel.lastActionTimeDisplay && (
                <div className="text-xs text-blue-600/60 mt-1">{viewModel.lastActionTimeDisplay}</div>
              )}
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
            更新时间：{viewModel.lastActionTimeDisplay || "未知"}
          </span>
        </div>
      </div>
    </div>
  )
}
