/**
 * 金融视图 - 责任主体标签组件
 * 
 * 职责：
 * - 清晰标识责任主体（承租方、出租方、平台等）
 * - 使用统一的视觉样式
 * 
 * ⚠️ 禁止在 Facts 页面使用
 */

"use client"

import { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { User, Building2, Briefcase, CreditCard } from "lucide-react"
import { useFinanceUICheck } from "@/lib/ui-contexts"

export type ResponsibilityType = 
  | "lessee"      // 承租方
  | "lessor"      // 出租方
  | "platform"    // 平台
  | "finance"     // 金融方

export interface ResponsibilityLabelProps {
  /**
   * 责任主体类型
   */
  type: ResponsibilityType
  
  /**
   * 责任主体名称
   */
  name: string
  
  /**
   * 责任主体ID（可选）
   */
  id?: string
  
  /**
   * 是否显示图标
   */
  showIcon?: boolean
  
  /**
   * 自定义样式类名
   */
  className?: string
}

const typeConfig = {
  lessee: {
    label: "承租方",
    icon: User,
    variant: "default" as const,
  },
  lessor: {
    label: "出租方",
    icon: Building2,
    variant: "secondary" as const,
  },
  platform: {
    label: "平台",
    icon: Briefcase,
    variant: "outline" as const,
  },
  finance: {
    label: "金融方",
    icon: CreditCard,
    variant: "outline" as const,
  },
}

/**
 * 责任主体标签组件
 * 
 * 清晰标识责任主体，使用统一的视觉样式
 */
export function ResponsibilityLabel({
  type,
  name,
  id,
  showIcon = true,
  className,
}: ResponsibilityLabelProps) {
  // ⚠️ 安全检查：确保在金融 UI 上下文中使用
  const isFinanceContext = useFinanceUICheck()
  
  if (!isFinanceContext) {
    console.warn('[ResponsibilityLabel] 组件必须在 FinanceUIProvider 内使用')
  }
  
  const config = typeConfig[type]
  const Icon = config.icon
  
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      {showIcon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <Badge variant={config.variant} className="font-medium">
        {config.label}
      </Badge>
      <span className="font-medium">{name}</span>
      {id && (
        <span className="text-sm text-muted-foreground">({id})</span>
      )}
    </div>
  )
}
