// 从 page.tsx 的 renderExceptionHandling() 函数提取
// 异常处理：逾期账期列表、逾期设备（未归还）列表

import { Loader2, AlertTriangle, Package } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface ExceptionHandlingPanelProps {
  overdueBilling: any[]
  isLoadingOverdueBilling: boolean
  overdueRentals: any[]
  isLoadingOverdueRentals: boolean
}

export function ExceptionHandlingPanel({
  overdueBilling,
  isLoadingOverdueBilling,
  overdueRentals,
  isLoadingOverdueRentals,
}: ExceptionHandlingPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">异常处理</h1>
        <p className="text-slate-400">处理逾期账期、设备未归还等异常情况</p>
      </div>

      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-red-950/90 border-red-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            逾期账期
          </CardTitle>
          <CardDescription className="text-slate-400">需要催收的逾期账期列表</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOverdueBilling ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : overdueBilling.length === 0 ? (
            <div className="text-center py-8 text-slate-400">暂无逾期账期</div>
          ) : (
            <div className="space-y-2">
              {overdueBilling.slice(0, 10).map((cycle: any) => (
                <div key={cycle.id} className="p-4 bg-slate-800/50 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="text-white font-medium">订单: {cycle.order_number || cycle.rental_order_id}</div>
                    <div className="text-sm text-slate-400">账期: {cycle.cycle_month} | 逾期: {cycle.overdue_days}天</div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-400 font-bold">¥{(cycle.amount_due - cycle.amount_paid)?.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-orange-950/90 border-orange-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-400" />
            逾期设备（未归还）
          </CardTitle>
          <CardDescription className="text-slate-400">租期已到但未归还的设备</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOverdueRentals ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : overdueRentals.length === 0 ? (
            <div className="text-center py-8 text-slate-400">暂无逾期设备</div>
          ) : (
            <div className="space-y-2">
              {overdueRentals.slice(0, 10).map((order: any) => (
                <div key={order.id} className="p-4 bg-slate-800/50 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="text-white font-medium">订单: {order.order_number || order.id}</div>
                    <div className="text-sm text-slate-400">逾期: {order.overdue_days}天 | 应归还: {order.end_date}</div>
                  </div>
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                    未归还
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
