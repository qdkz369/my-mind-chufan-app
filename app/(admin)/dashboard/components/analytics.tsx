// 从 page.tsx 的 renderAnalytics() 函数提取
// 数据统计：订单趋势折线图、订单状态分布

import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import type { Order } from "../types/dashboard-types"

export interface AnalyticsPanelProps {
  orders: Order[]
  isLoadingOrders: boolean
}

export function AnalyticsPanel({ orders, isLoadingOrders }: AnalyticsPanelProps) {
  const safeOrders = Array.isArray(orders) ? orders : []
  const chartData = safeOrders
    .filter((o) => o != null && o.created_at)
    .map((o) => {
      const date = new Date(o.created_at)
      const invalid = Number.isNaN(date.getTime())
      return {
        date: invalid ? "—" : `${date.getMonth() + 1}/${date.getDate()}`,
        amount: Number(o.amount) || 0,
      }
    })
    .slice(0, 30)

  const pendingCount = safeOrders.filter((o) => o.status === "pending" || o.status === "待处理").length
  const deliveringCount = safeOrders.filter((o) => o.status === "delivering" || o.status === "配送中").length
  const completedCount = safeOrders.filter((o) => o.status === "completed" || o.status === "已完成").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">数据统计</h1>
        <p className="text-slate-400">业务数据分析和图表</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">订单趋势</CardTitle>
            <CardDescription className="text-slate-400">最近30天订单金额趋势</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm">加载订单数据…</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="订单金额"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">订单状态分布</CardTitle>
            <CardDescription className="text-slate-400">订单状态统计</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="flex h-[200px] flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">加载中…</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">待处理</span>
                  <span className="text-yellow-400 font-semibold">{pendingCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">配送中</span>
                  <span className="text-blue-400 font-semibold">{deliveringCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">已完成</span>
                  <span className="text-green-400 font-semibold">{completedCount}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
