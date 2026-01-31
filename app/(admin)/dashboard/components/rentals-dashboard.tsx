// 从 page.tsx 的 renderRentals() 主内容区提取（不含新增租赁、租赁详情对话框）
// 租赁工作台：统计卡片、操作栏、租赁列表

import { Package, Plus, CreditCard, MessageSquare, AlertTriangle, Eye, XCircle, CheckCircle, Ban } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"

export function getStatusColor(status: string) {
  switch (status) {
    case "pending_delivery":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    case "active":
      return "bg-green-500/20 text-green-400 border-green-500/30"
    case "expired":
      return "bg-red-500/20 text-red-400 border-red-500/30"
    case "returned":
      return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30"
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "pending_delivery":
      return "待交付"
    case "active":
      return "租赁中"
    case "expired":
      return "已到期"
    case "returned":
      return "已收回"
    default:
      return status
  }
}

function calculateRemainingDays(endDate: string | null): number | null {
  if (!endDate) return null
  const end = new Date(endDate)
  const now = new Date()
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export interface RentalsDashboardPanelProps {
  rentals: any[]
  isLoadingRentals: boolean
  sourceFilter?: "all" | "admin_create" | "client_apply"
  onSourceFilterChange?: (v: "all" | "admin_create" | "client_apply") => void
  onOpenAddRental: () => void
  onBatchSendReminder: () => void
  onSendReminder: (rental: any) => void
  onTerminateContract: (rental: any) => void
  onViewDetail: (rental: any) => void
  onApproveApply?: (rental: any) => void
  onRejectApply?: (rental: any) => void
}

export function RentalsDashboardPanel({
  rentals,
  isLoadingRentals,
  sourceFilter = "all",
  onSourceFilterChange,
  onOpenAddRental,
  onBatchSendReminder,
  onSendReminder,
  onTerminateContract,
  onViewDetail,
  onApproveApply,
  onRejectApply,
}: RentalsDashboardPanelProps) {
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const monthlyPendingAmount = rentals
    .filter((r) => {
      if (r.status !== "active") return false
      const rentalDate = new Date(r.start_date)
      return rentalDate.getMonth() === currentMonth && rentalDate.getFullYear() === currentYear
    })
    .reduce((sum, r) => sum + (parseFloat(r.rent_amount) || 0), 0)

  const activeRentals = rentals.filter((r) => r.status === "active")
  const totalDevices = activeRentals.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">租赁工作台</h1>
          <p className="text-slate-400">管理设备租赁合同和收款</p>
        </div>
        <Button onClick={onOpenAddRental} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          新增租赁
        </Button>
      </div>

      {/* 来源筛选：全部 / 后台新增 / 客户申请 */}
      {onSourceFilterChange && (
        <div className="flex flex-wrap gap-2">
          {(["all", "admin_create", "client_apply"] as const).map((key) => (
            <Button
              key={key}
              variant={sourceFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => onSourceFilterChange(key)}
              className={
                sourceFilter === key
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "border-slate-600 text-slate-400 hover:bg-slate-800"
              }
            >
              {key === "all" ? "全部" : key === "admin_create" ? "后台新增" : "客户申请"}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              本月待收款
            </CardDescription>
            <CardTitle className="text-3xl text-blue-400">¥{monthlyPendingAmount.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-green-950/90 border-green-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Package className="h-4 w-4" />
              在租设备总数
            </CardDescription>
            <CardTitle className="text-3xl text-green-400">{totalDevices}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={onBatchSendReminder}
              variant="outline"
              className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              一键发送催缴短信
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoadingRentals ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
          <span className="text-slate-400">加载中...</span>
        </div>
      ) : rentals.length === 0 ? (
        <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">暂无租赁记录</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rentals.map((rental) => {
            const remainingDays = calculateRemainingDays(rental.end_date)
            const isUrgent = remainingDays !== null && remainingDays <= 7 && remainingDays > 0
            return (
              <Card
                key={rental.id}
                semanticLevel="secondary_fact"
                className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm hover:border-blue-500/50 transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-bold text-white">
                          {Array.isArray(rental.devices) && rental.devices.length > 0
                            ? rental.devices.length === 1
                              ? rental.devices[0].device_name || rental.device_name
                              : `多台设备（${rental.devices.length} 台）`
                            : rental.device_name}
                        </h3>
                        <Badge className={getStatusColor(rental.status)}>{getStatusLabel(rental.status)}</Badge>
                        {isUrgent && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            即将到期
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-slate-400">承租人：</span>
                          <span className="text-white ml-2">{rental.customer_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">联系电话：</span>
                          <span className="text-white ml-2">{rental.customer_phone}</span>
                        </div>
                        {Array.isArray(rental.devices) && rental.devices.length > 0 ? (
                          <div className="col-span-2">
                            <span className="text-slate-400">设备明细：</span>
                            <span className="text-white ml-2">
                              {rental.devices.map((d: { device_name?: string; device_sn?: string }, i: number) => `${d.device_name || "—"}（${d.device_sn || "—"}）`).join("；")}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-400">设备序列号：</span>
                            <span className="text-white ml-2">{rental.device_sn}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-400">月租金：</span>
                          <span className="text-blue-400 font-bold ml-2">
                            ¥{parseFloat(rental.rent_amount || 0).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">押金：</span>
                          <span className="text-white ml-2">¥{parseFloat(rental.deposit || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">开始日期：</span>
                          <span className="text-white ml-2">{rental.start_date}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">结束日期：</span>
                          <span className="text-white ml-2">{rental.end_date || "未设置"}</span>
                        </div>
                        {remainingDays !== null && (
                          <div>
                            <span className="text-slate-400">剩余天数：</span>
                            <span className={`ml-2 font-bold ${isUrgent ? "text-red-400" : "text-white"}`}>
                              {remainingDays} 天
                            </span>
                          </div>
                        )}
                      </div>

                      {rental.status === "active" && rental.end_date && remainingDays !== null && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-400">租期剩余</span>
                            <span className={`text-sm font-medium ${isUrgent ? "text-red-400" : "text-slate-300"}`}>
                              {remainingDays} 天
                            </span>
                          </div>
                          <Progress
                            value={Math.max(0, Math.min(100, (remainingDays / 30) * 100))}
                            className={`h-2 ${isUrgent ? "bg-red-500/20" : ""}`}
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-4 flex-wrap">
                        {rental.source === "client_apply" && onApproveApply && onRejectApply && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                onApproveApply(rental)
                              }}
                              className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              审核通过
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                onRejectApply(rental)
                              }}
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              审核驳回
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSendReminder(rental)
                          }}
                          className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          催缴
                        </Button>
                        {rental.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              onTerminateContract(rental)
                            }}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            终止合同
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            onViewDetail(rental)
                          }}
                          className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          查看详情
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
