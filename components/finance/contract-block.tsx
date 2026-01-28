/**
 * 金融视图 - 合同区块组件
 * 
 * 职责：
 * - 展示合同相关信息（合同编号、合同方、合同期限等）
 * - 使用表格化结构
 * - 清晰的"责任主体"标签
 * 
 * ⚠️ 禁止在 Facts 页面使用
 */

"use client"

import { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Calendar, Building2, User } from "lucide-react"
import { useFinanceUICheck } from "@/lib/ui-contexts"

export interface ContractBlockProps {
  /**
   * 合同编号
   */
  contractNo: string
  
  /**
   * 合同标题（可选）
   */
  title?: string
  
  /**
   * 承租方（责任主体）
   */
  lessee: {
    name: string
    id?: string
    type?: string
  }
  
  /**
   * 出租方（责任主体）
   */
  lessor: {
    name: string
    id?: string
    type?: "platform" | "manufacturer" | "leasing_company" | "finance_partner"
  }
  
  /**
   * 合同开始时间
   */
  startAt: string
  
  /**
   * 合同结束时间
   */
  endAt: string
  
  /**
   * 合同状态
   */
  status?: "active" | "expired" | "terminated" | "pending"
  
  /**
   * 额外信息（可选）
   */
  extraInfo?: ReactNode
}

/**
 * 合同区块组件
 * 
 * 使用表格化结构展示合同信息，包含清晰的责任主体标签
 */
export function ContractBlock({
  contractNo,
  title,
  lessee,
  lessor,
  startAt,
  endAt,
  status,
  extraInfo,
}: ContractBlockProps) {
  // ⚠️ 安全检查：确保在金融 UI 上下文中使用
  const isFinanceContext = useFinanceUICheck()
  
  if (!isFinanceContext) {
    console.warn('[ContractBlock] 组件必须在 FinanceUIProvider 内使用')
  }
  
  const statusConfig = {
    active: { label: "生效中", variant: "default" as const },
    expired: { label: "已过期", variant: "secondary" as const },
    terminated: { label: "已终止", variant: "destructive" as const },
    pending: { label: "待生效", variant: "outline" as const },
  }
  
  const statusInfo = status ? statusConfig[status] : null
  
  return (
    <Card semanticLevel="financial" className="w-full border border-border shadow-none">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{title || "合同信息"}</CardTitle>
          </div>
          {statusInfo && (
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          )}
        </div>
        <CardDescription>合同编号：{contractNo}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 表格化结构：责任主体 - 清晰的边界 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 承租方 */}
            <div className="space-y-2 border border-border rounded-md p-4 bg-card">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground pb-2 border-b border-border">
                <User className="h-4 w-4" />
                <span>承租方（责任主体）</span>
              </div>
              <div className="pt-2">
                <div className="font-medium">{lessee.name}</div>
                {lessee.id && (
                  <div className="text-sm text-muted-foreground">ID: {lessee.id}</div>
                )}
                {lessee.type && (
                  <div className="text-sm text-muted-foreground">类型: {lessee.type}</div>
                )}
              </div>
            </div>
            
            {/* 出租方 */}
            <div className="space-y-2 border border-border rounded-md p-4 bg-card">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground pb-2 border-b border-border">
                <Building2 className="h-4 w-4" />
                <span>出租方（责任主体）</span>
              </div>
              <div className="pt-2">
                <div className="font-medium">{lessor.name}</div>
                {lessor.id && (
                  <div className="text-sm text-muted-foreground">ID: {lessor.id}</div>
                )}
                {lessor.type && (
                  <div className="text-sm text-muted-foreground">
                    类型: {
                      lessor.type === "platform" ? "平台" :
                      lessor.type === "manufacturer" ? "制造商" :
                      lessor.type === "leasing_company" ? "租赁公司" :
                      lessor.type === "finance_partner" ? "金融合作伙伴" :
                      lessor.type
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 表格化结构：合同期限 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>合同开始时间</span>
              </div>
              <div className="pl-6">
                <div className="font-medium">{new Date(startAt).toLocaleDateString('zh-CN')}</div>
                <div className="text-sm text-muted-foreground">{new Date(startAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>合同结束时间</span>
              </div>
              <div className="pl-6">
                <div className="font-medium">{new Date(endAt).toLocaleDateString('zh-CN')}</div>
                <div className="text-sm text-muted-foreground">{new Date(endAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          </div>
          
          {/* 额外信息 */}
          {extraInfo && (
            <div className="pt-4 border-t">
              {extraInfo}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
