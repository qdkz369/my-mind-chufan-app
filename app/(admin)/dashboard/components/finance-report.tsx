// 从 page.tsx 的 renderFinanceReport() 函数提取
// 财务报表：报表类型/日期选择、生成报表、收入/账期/逾期统计展示

import { Loader2, BarChart3 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface FinanceReportPanelProps {
  reportType: string
  onReportTypeChange: (value: string) => void
  reportData: any
  isLoadingReport: boolean
  financeStartDate: string
  onFinanceStartDateChange: (value: string) => void
  financeEndDate: string
  onFinanceEndDateChange: (value: string) => void
  onLoadReport: () => void
}

export function FinanceReportPanel({
  reportType,
  onReportTypeChange,
  reportData,
  isLoadingReport,
  financeStartDate,
  onFinanceStartDateChange,
  financeEndDate,
  onFinanceEndDateChange,
  onLoadReport,
}: FinanceReportPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">财务报表</h1>
        <p className="text-slate-400">查看收入统计、账期分析和逾期统计</p>
      </div>

      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-green-950/90 border-green-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">报表查询</CardTitle>
          <CardDescription className="text-slate-400">选择报表类型和时间范围</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-slate-300">报表类型</Label>
              <Select value={reportType} onValueChange={onReportTypeChange}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">收入统计</SelectItem>
                  <SelectItem value="billing">账期分析</SelectItem>
                  <SelectItem value="overdue">逾期统计</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">开始日期</Label>
              <Input
                type="date"
                value={financeStartDate}
                onChange={(e) => onFinanceStartDateChange(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">结束日期</Label>
              <Input
                type="date"
                value={financeEndDate}
                onChange={(e) => onFinanceEndDateChange(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <Button onClick={onLoadReport} disabled={isLoadingReport} className="w-full md:w-auto">
            {isLoadingReport ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
            生成报表
          </Button>
        </CardContent>
      </Card>

      {reportData && (
        <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">
              {reportType === "revenue" && "收入统计报表"}
              {reportType === "billing" && "账期分析报表"}
              {reportType === "overdue" && "逾期统计报表"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              时间范围: {reportData.period?.start_date} 至 {reportData.period?.end_date}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportType === "revenue" && reportData.summary && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">总收入</div>
                    <div className="text-2xl font-bold text-green-400">¥{reportData.summary.total_revenue?.toFixed(2)}</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">押金收入</div>
                    <div className="text-2xl font-bold text-blue-400">¥{reportData.summary.total_deposit_received?.toFixed(2)}</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">账期收入</div>
                    <div className="text-2xl font-bold text-purple-400">¥{reportData.summary.total_billing_paid?.toFixed(2)}</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">订单总数</div>
                    <div className="text-2xl font-bold text-yellow-400">{reportData.summary.total_orders}</div>
                  </div>
                </div>
              </div>
            )}
            {reportType === "billing" && reportData.summary && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">总账期数</div>
                    <div className="text-2xl font-bold text-blue-400">{reportData.summary.total_cycles}</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">应收总额</div>
                    <div className="text-2xl font-bold text-green-400">¥{reportData.summary.total_amount_due?.toFixed(2)}</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">已收总额</div>
                    <div className="text-2xl font-bold text-purple-400">¥{reportData.summary.total_amount_paid?.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}
            {reportType === "overdue" && reportData.summary && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">逾期账期数</div>
                    <div className="text-2xl font-bold text-red-400">{reportData.summary.total_overdue_cycles}</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">逾期总额</div>
                    <div className="text-2xl font-bold text-orange-400">¥{reportData.summary.total_overdue_amount?.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
