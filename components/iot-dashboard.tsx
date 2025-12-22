"use client"

import { Flame, TrendingDown, TrendingUp, Activity, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"

export function IoTDashboard() {
  const [fuelLevel, setFuelLevel] = useState(68)
  const [consumption, setConsumption] = useState(12.5)

  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      setFuelLevel((prev) => prev - 0.1)
      setConsumption((prev) => 12 + Math.random() * 2)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      {/* 主要燃料监控卡片 */}
      <Card className="bg-gradient-to-br from-blue-950/90 to-slate-900/90 border-blue-800/50 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">燃料实时监控</h3>
              <p className="text-xs text-slate-400">IoT智能传感器</p>
            </div>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <Activity className="h-3 w-3 mr-1 animate-pulse" />
            在线
          </Badge>
        </div>

        {/* 燃料剩余量 */}
        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm text-slate-300">当前剩余量</span>
            <div className="text-right">
              <span className="text-4xl font-bold text-white">{fuelLevel.toFixed(1)}</span>
              <span className="text-xl text-slate-400 ml-1">%</span>
            </div>
          </div>
          <Progress value={fuelLevel} className="h-3 bg-slate-800" />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-500">约 {(fuelLevel * 5).toFixed(0)} kg</span>
            <span className="text-xs text-orange-400">预计可用 {Math.floor(fuelLevel / consumption)} 天</span>
          </div>
        </div>

        {/* 数据统计网格 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-slate-400">累计加注</span>
            </div>
            <div className="text-xl font-bold text-white">2,845</div>
            <div className="text-xs text-slate-500">kg</div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-slate-400">日均消耗</span>
            </div>
            <div className="text-xl font-bold text-white">{consumption.toFixed(1)}</div>
            <div className="text-xs text-slate-500">kg/天</div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-slate-400">使用效率</span>
            </div>
            <div className="text-xl font-bold text-white">92</div>
            <div className="text-xs text-slate-500">%</div>
          </div>
        </div>
      </Card>

      {/* 设备状态监控 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/30 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-300">租赁设备</span>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">5台在用</Badge>
          </div>
          <div className="text-3xl font-bold text-white mb-1">100%</div>
          <div className="text-xs text-green-400 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            运行正常
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900/90 to-purple-950/90 border-purple-800/30 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-300">维修预警</span>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">2个待处理</Badge>
          </div>
          <div className="text-3xl font-bold text-white mb-1">15</div>
          <div className="text-xs text-slate-400">天内需保养</div>
        </Card>
      </div>
    </div>
  )
}
