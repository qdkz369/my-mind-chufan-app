"use client"

// 设备监控组件
// 从 page.tsx 的 renderDevices() 函数提取

import { Wrench, MapPin, User, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Device } from "../types/dashboard-types"

interface DevicesMonitoringProps {
  devices: Device[]
}

export function DevicesMonitoring({ devices }: DevicesMonitoringProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">设备监控</h1>
        <p className="text-slate-400">管理IoT设备和传感器数据</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {devices.map((device) => (
          <Card
            key={device.device_id}
            semanticLevel="secondary_fact"
            className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">{device.device_id}</CardTitle>
                  <CardDescription className="text-slate-400">{device.model || "未知型号"}</CardDescription>
                </div>
                <Badge
                  className={
                    device.status === "active"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }
                >
                  {device.status === "active" ? "在线" : "离线"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {device.address && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <MapPin className="h-4 w-4" />
                    {device.address}
                  </div>
                )}
                {device.installer && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <User className="h-4 w-4" />
                    安装人: {device.installer}
                  </div>
                )}
                {device.install_date && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="h-4 w-4" />
                    {new Date(device.install_date).toLocaleDateString("zh-CN")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {devices.length === 0 && (
        <Card
          semanticLevel="secondary_fact"
          className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm"
        >
          <CardContent className="p-12 text-center">
            <Wrench className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">暂无设备</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
