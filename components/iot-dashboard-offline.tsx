"use client"

/**
 * 离线IoT Dashboard组件
 * 
 * 用于：已注册但未绑定设备的用户
 * 
 * 核心原则：
 * - "离线感"不是UI技巧，而是事实表达
 * - 所有占位符（"--"、"离线"）来自明确的事实判断：系统无法采集到任何 trace / telemetry
 * - 不要写死文案，写成：fact_unavailable_reason（未来可直接复用到监管层）
 * 
 * 主题：Tech Blue（理性/潜力）
 */

import { Flame, Activity, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

// 事实不可用原因
const FACT_UNAVAILABLE_REASON = {
  NO_DEVICE_BOUND: "未绑定设备",
  NO_TELEMETRY: "无遥测数据",
  NO_TRACE: "无追踪数据",
}

export function IoTDashboardOffline() {
  // 事实判断：系统无法采集到任何 trace / telemetry
  const factUnavailableReason = FACT_UNAVAILABLE_REASON.NO_DEVICE_BOUND

  return (
    <div className="space-y-4">
      {/* 主要燃料监控卡片 - 离线状态 */}
      <Card semanticLevel="primary_fact" className="glass-breath p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted/50 rounded-xl flex items-center justify-center shadow-lg" style={{ borderRadius: 'var(--radius-button)' }}>
              <Flame className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">燃料实时监控</h3>
              <p className="text-xs text-muted-foreground">IoT智能传感器</p>
            </div>
          </div>
          <Badge className="bg-muted/20 text-muted-foreground border-muted/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            离线
          </Badge>
        </div>

        {/* 燃料剩余量 - 显示占位符 */}
        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm text-slate-300">当前剩余量</span>
            <div className="text-right">
              <span className="text-4xl font-bold text-slate-500">--</span>
              <span className="text-xl text-slate-500 ml-1">%</span>
            </div>
          </div>
          <Progress value={0} className="h-3 bg-slate-800" />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-600">约 -- kg</span>
            <span className="text-xs text-slate-600">预计可用 -- 天</span>
          </div>
        </div>

        {/* 数据统计网格 - 显示占位符 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-400">累计加注</span>
            </div>
            <div className="text-xl font-bold text-slate-500">--</div>
            <div className="text-xs text-slate-600">--kg/天</div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-400">日均消耗</span>
            </div>
            <div className="text-xl font-bold text-slate-500">--</div>
            <div className="text-xs text-slate-600">--kg/天</div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-400">使用效率</span>
            </div>
            <div className="text-xl font-bold text-slate-500">--</div>
            <div className="text-xs text-slate-600">--%</div>
          </div>
        </div>

        {/* 事实不可用提示 */}
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-slate-400 leading-relaxed">
                系统无法采集到任何遥测数据。原因：<span className="font-semibold text-slate-300">{factUnavailableReason}</span>
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 设备状态监控 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="glass-breath p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-foreground">我的设备</span>
            <Badge className="bg-muted/20 text-muted-foreground border-muted/30 text-xs">未绑定</Badge>
          </div>
          <div className="text-3xl font-bold text-muted-foreground mb-1">--</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            请绑定设备以查看数据
          </div>
        </Card>

        <Card className="glass-breath p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-foreground">设备绑定</span>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">待完成</Badge>
          </div>
          <div className="text-3xl font-bold text-primary mb-1">0</div>
          <div className="text-xs text-primary">请前往设备管理页面绑定设备</div>
        </Card>
      </div>
    </div>
  )
}
