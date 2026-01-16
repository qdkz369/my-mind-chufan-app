/**
 * 金融视图 - 金额显示组件
 * 
 * 职责：
 * - 明确显示金额单位
 * - 明确显示责任方
 * - 禁止使用霓虹/发光/情绪化视觉
 * - 使用清晰的边界
 * 
 * ⚠️ 禁止在 Facts 页面使用
 */

"use client"

import { ReactNode } from "react"
import { useFinanceUICheck, useRentalUICheck } from "@/lib/ui-contexts"
import { ResponsibilityLabel, ResponsibilityType } from "./responsibility-label"

export type AmountUnit = "CNY" | "USD" | "EUR" | "JPY" | string

export interface AmountDisplayProps {
  /**
   * 金额数值
   */
  amount: number
  
  /**
   * 金额单位（必须明确）
   */
  unit: AmountUnit
  
  /**
   * 责任方类型
   */
  responsibilityType: ResponsibilityType
  
  /**
   * 责任方名称
   */
  responsibilityName: string
  
  /**
   * 责任方ID（可选）
   */
  responsibilityId?: string
  
  /**
   * 金额类型标签（可选，如"月租金"、"押金"、"总金额"等）
   */
  label?: string
  
  /**
   * 是否显示为负值（用于支出、扣款等）
   */
  isNegative?: boolean
  
  /**
   * 是否强调显示（用于重要金额）
   */
  emphasize?: boolean
  
  /**
   * 自定义样式类名
   */
  className?: string
}

/**
 * 格式化金额单位显示
 */
function formatUnit(unit: AmountUnit): string {
  const unitMap: Record<string, string> = {
    CNY: "人民币",
    USD: "美元",
    EUR: "欧元",
    JPY: "日元",
  }
  
  return unitMap[unit] || unit
}

/**
 * 格式化金额数值
 */
function formatAmount(amount: number, unit: AmountUnit): string {
  // 使用 toLocaleString 格式化数字，添加千分位分隔符
  const formatted = Math.abs(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  return formatted
}

/**
 * 金额显示组件
 * 
 * 明确显示金额单位和责任方，禁止使用霓虹/发光/情绪化视觉
 */
export function AmountDisplay({
  amount,
  unit,
  responsibilityType,
  responsibilityName,
  responsibilityId,
  label,
  isNegative = false,
  emphasize = false,
  className,
}: AmountDisplayProps) {
  // ⚠️ 安全检查：确保在金融或租赁 UI 上下文中使用
  const isFinanceContext = useFinanceUICheck()
  const isRentalContext = useRentalUICheck()
  
  if (!isFinanceContext && !isRentalContext) {
    console.warn('[AmountDisplay] 组件必须在 FinanceUIProvider 或 RentalUIProvider 内使用')
  }
  
  const formattedAmount = formatAmount(amount, unit)
  const formattedUnit = formatUnit(unit)
  const displayAmount = isNegative ? `-${formattedAmount}` : formattedAmount
  
  return (
    <div className={`space-y-2 ${className || ''}`}>
      {/* 金额类型标签（如果有） */}
      {label && (
        <div className="text-sm font-medium text-muted-foreground">
          {label}
        </div>
      )}
      
      {/* 金额显示区域 - 清晰的边界，无霓虹/发光效果 */}
      <div className={`
        border border-border
        rounded-md
        p-4
        bg-card
        ${emphasize ? 'border-2 border-primary' : ''}
      `}>
        <div className="flex items-baseline justify-between gap-4">
          {/* 金额数值 */}
          <div className="flex items-baseline gap-2">
            <span className={`
              text-2xl font-bold
              ${isNegative ? 'text-destructive' : 'text-foreground'}
              ${emphasize ? 'text-3xl' : ''}
            `}>
              {displayAmount}
            </span>
            {/* 单位 - 明确显示 */}
            <span className="text-sm font-medium text-muted-foreground">
              {formattedUnit}
            </span>
          </div>
        </div>
        
        {/* 责任方信息 - 明确显示 */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">责任方：</span>
            <ResponsibilityLabel
              type={responsibilityType}
              name={responsibilityName}
              id={responsibilityId}
              showIcon={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
