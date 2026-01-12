"use client"

/**
 * 订单时间线组件
 * 
 * 核心原则：
 * - 不做"看板"，只做"事实呈现"
 * - 不强调颜色判断（红/绿仅表示发生与否）
 * - 不显示"正常 / 异常"
 * - iOS 风格（毛玻璃效果、大圆角、简洁设计）
 * 
 * 数据来源：
 * - ViewModel 层（已转换的事实数据）
 * 
 * 渲染规则：
 * - 垂直时间线
 * - 每一条必须显示：行为、操作人、时间、关联订单（如有）
 */

import { OrderTimelineViewModel } from "@/lib/facts-ui/orderTimeline.viewmodel"
import { Clock, User, Package, Circle } from "lucide-react"

/**
 * OrderTimeline 组件 Props
 * 
 * 约束：
 * - viewModel 必须使用 OrderTimelineViewModel 类型（ViewModel）
 * - 组件不再直接依赖 Facts 类型
 */
interface OrderTimelineProps {
  viewModel: OrderTimelineViewModel
  className?: string
}

export function OrderTimeline({ viewModel, className }: OrderTimelineProps) {
  const timelineNodes = viewModel.timeline

  if (timelineNodes.length === 0) {
    return (
      <div className={`rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/50 p-6 ${className || ""}`}>
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Clock className="w-6 h-6 mr-2" />
          <span className="text-sm">暂无时间线记录</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/50 p-6 ${className || ""}`}>
      <div className="space-y-4">
        {timelineNodes.map((node, index) => {
          const isLast = index === timelineNodes.length - 1
          
          return (
            <div key={node.id} className="relative flex gap-4">
              {/* 时间线连接线 */}
              {!isLast && (
                <div className="absolute left-[11px] top-8 w-0.5 h-full bg-gray-200" />
              )}
              
              {/* 节点图标 */}
              <div className="relative z-10 flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center">
                  <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                </div>
              </div>
              
              {/* 节点内容 */}
              <div className="flex-1 pb-6">
                <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-200/50">
                  {/* 行为/标签 */}
                  <div className="flex items-center gap-2 mb-2">
                    {node.nodeType === "trace" ? (
                      <Package className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="font-medium text-gray-900 text-sm">{node.label}</span>
                  </div>
                  
                  {/* 操作人 */}
                  {node.operatorId && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span>操作人：{node.operatorId}</span>
                    </div>
                  )}
                  
                  {/* 关联订单 */}
                  {node.relatedOrderId && node.relatedOrderId !== viewModel.orderId && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      <Package className="w-3 h-3" />
                      <span>关联订单：{node.relatedOrderId}</span>
                    </div>
                  )}
                  
                  {/* 资产ID（溯源记录的事实字段） */}
                  {node.relatedAssetId && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      <Circle className="w-3 h-3" />
                      <span>资产：{node.relatedAssetId}</span>
                    </div>
                  )}
                  
                  {/* 时间 */}
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                    <Clock className="w-3 h-3" />
                    <span>{node.timeDisplay}</span>
                    <span className="ml-1 text-gray-300">·</span>
                    <span>{new Date(node.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
