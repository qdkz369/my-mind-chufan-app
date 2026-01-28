"use client"

import { Flame, TrendingDown, TrendingUp, Activity, Zap, Wrench, Truck } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { logBusinessWarning } from "@/lib/utils/logger"

interface IoTDashboardProps {
  onDeviceClick?: () => void
}

export function IoTDashboard({ onDeviceClick }: IoTDashboardProps) {
  const router = useRouter()
  const [fuelLevel, setFuelLevel] = useState<number | null>(null)
  const [totalRefilled, setTotalRefilled] = useState<number>(0)
  const [dailyConsumption, setDailyConsumption] = useState<number>(0)
  const [usageEfficiency, setUsageEfficiency] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [deviceCount, setDeviceCount] = useState<number>(0)
  const [repairResponseRate, setRepairResponseRate] = useState<number>(0)
  const [deviceRunningDays, setDeviceRunningDays] = useState<number>(0)

  // 从 API 获取初始燃料数据
  useEffect(() => {
    const loadFuelData = async () => {
      try {
        const restaurantId = typeof window !== "undefined" 
          ? localStorage.getItem("restaurantId") 
          : null

        if (!restaurantId || !supabase) {
          console.warn('[IoT Dashboard] 未找到 restaurantId 或 Supabase 未初始化，无法加载燃料数据')
          setIsLoading(false)
          return
        }

        // 先通过 restaurant_id 查询 devices 表获取 device_id
        const { data: devices, error: deviceError } = await supabase
          .from("devices")
          .select("device_id")
          .eq("restaurant_id", restaurantId)
          .limit(1)
          .maybeSingle()

        if (deviceError || !devices) {
          console.warn('[IoT Dashboard] 未找到设备，无法加载燃料数据')
          setIsLoading(false)
          return
        }

        const deviceId = devices.device_id
        setDeviceId(deviceId)

        // 从 API 获取最新燃料数据
        const response = await fetch(`/api/fuel-sensor?device_id=${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setFuelLevel(data.data.percentage)
            setIsOnline(true)
          }
        }

        // 从 API 获取燃料统计数据
        const statsResponse = await fetch(`/api/facts/fuel/${deviceId}/stats`)
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          if (statsData.success) {
            setTotalRefilled(statsData.total_refilled || 0)
            setDailyConsumption(statsData.daily_consumption || 0)
            setUsageEfficiency(statsData.usage_efficiency || 0)
          }
        }

        // 获取设备数量（从餐厅总览 API）
        const overviewResponse = await fetch(`/api/facts/restaurant/${restaurantId}/overview`, {
          headers: {
            "x-restaurant-id": restaurantId,
          },
        })
        if (overviewResponse.ok) {
          const overviewData = await overviewResponse.json()
          if (overviewData.success !== false && overviewData.active_assets !== undefined) {
            setDeviceCount(overviewData.active_assets || 0)
          }
        }

        // 获取报修响应率
        const repairStatsResponse = await fetch(`/api/facts/restaurant/${restaurantId}/repair-stats`, {
          headers: {
            "x-restaurant-id": restaurantId,
          },
        })
        if (repairStatsResponse.ok) {
          const repairStatsData = await repairStatsResponse.json()
          if (repairStatsData.success) {
            setRepairResponseRate(repairStatsData.response_rate || 0)
          }
        }

        // 获取设备运行天数
        const runningDaysResponse = await fetch(`/api/facts/restaurant/${restaurantId}/device-running-days`, {
          headers: {
            "x-restaurant-id": restaurantId,
          },
        })
        if (runningDaysResponse.ok) {
          const runningDaysData = await runningDaysResponse.json()
          if (runningDaysData.success) {
            setDeviceRunningDays(runningDaysData.running_days || 0)
          }
        }
      } catch (error) {
        logBusinessWarning('IoT Dashboard', '加载燃料数据失败', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFuelData()
    
    // 设置12小时定时刷新（12小时 = 43200000毫秒）
    const interval = setInterval(() => {
      loadFuelData()
    }, 12 * 60 * 60 * 1000) // 12小时
    
    return () => {
      clearInterval(interval)
    }
  }, [])

  // 使用 Supabase Realtime 订阅 fuel_level 表（带自动重连机制）
  useEffect(() => {
    const restaurantId = typeof window !== "undefined" 
      ? localStorage.getItem("restaurantId") 
      : null

    if (!restaurantId || !supabase) {
      return
    }

    let channel: any = null
    let reconnectTimer: NodeJS.Timeout | null = null
    let isUnmounted = false
    let reconnectAttempts = 0
    const MAX_RECONNECT_ATTEMPTS = 5
    const RECONNECT_DELAY = 3000 // 3秒

    const setupRealtime = async () => {
      // 如果组件已卸载，不再尝试连接
      if (isUnmounted) return

      // 确保 supabase 不为 null
      if (!supabase) {
        console.warn('[IoT Dashboard] Supabase 未初始化，无法订阅实时数据')
        return
      }

      const supabaseClient = supabase

      try {
        // 先查询设备 ID
        const { data: devices, error: deviceError } = await supabaseClient
          .from("devices")
          .select("device_id")
          .eq("restaurant_id", restaurantId)
          .limit(1)
          .maybeSingle()

        if (deviceError || !devices) {
          console.warn('[IoT Dashboard] 未找到设备，无法订阅实时数据')
          setIsOnline(false)
          return
        }

        const currentDeviceId = devices.device_id
        setDeviceId(currentDeviceId)

        // 如果已有频道，先清理
        if (channel) {
          try {
            await supabaseClient.removeChannel(channel)
          } catch (e) {
            console.warn('[IoT Dashboard] 清理旧频道失败:', e)
          }
        }

        // 创建新频道并订阅 fuel_level 表的实时更新
        channel = supabaseClient
          .channel(`fuel-level-${currentDeviceId}`, {
            config: {
              broadcast: { self: false },
              presence: { key: currentDeviceId },
            },
          })
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "fuel_level",
              filter: `device_id=eq.${currentDeviceId}`,
            },
            (payload) => {
              console.log('[IoT Dashboard] Realtime 更新:', payload)
              if (payload.new && 'percentage' in payload.new) {
                setFuelLevel(payload.new.percentage as number)
                setIsOnline(true)
                // 重置重连计数（连接成功）
                reconnectAttempts = 0
                // 燃料更新后，刷新统计数据
                fetch(`/api/facts/fuel/${currentDeviceId}/stats`)
                  .then(res => res.json())
                  .then(statsData => {
                    if (statsData.success) {
                      setTotalRefilled(statsData.total_refilled || 0)
                      setDailyConsumption(statsData.daily_consumption || 0)
                      setUsageEfficiency(statsData.usage_efficiency || 0)
                    }
                  })
                  .catch(err => logBusinessWarning('IoT Dashboard', '刷新统计数据失败', err))
              }
            }
          )
          .subscribe((status, err) => {
            console.log('[IoT Dashboard] Realtime 订阅状态:', status, err)
            if (status === "SUBSCRIBED") {
              setIsOnline(true)
              reconnectAttempts = 0 // 重置重连计数
              console.log('[IoT Dashboard] Realtime 订阅成功')
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              setIsOnline(false)
              logBusinessWarning('IoT Dashboard', 'Realtime 订阅失败', { status, err })
              // 自动重连机制
              if (!isUnmounted && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++
                console.log(`[IoT Dashboard] 尝试重连 (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`)
                if (reconnectTimer) clearTimeout(reconnectTimer)
                reconnectTimer = setTimeout(() => {
                  if (!isUnmounted) {
                    setupRealtime()
                  }
                }, RECONNECT_DELAY)
              } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                logBusinessWarning('IoT Dashboard', '达到最大重连次数，停止重连')
              }
            }
          })
      } catch (error) {
        logBusinessWarning('IoT Dashboard', '设置实时订阅失败', error)
        setIsOnline(false)
        // 尝试重连
        if (!isUnmounted && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++
          if (reconnectTimer) clearTimeout(reconnectTimer)
          reconnectTimer = setTimeout(() => {
            if (!isUnmounted) {
              setupRealtime()
            }
          }, RECONNECT_DELAY)
        }
      }
    }

    // 初始设置
    setupRealtime()
    
    // 清理函数
    return () => {
      isUnmounted = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      if (channel && supabase) {
        console.log('[IoT Dashboard] 清理 Realtime 订阅')
        supabase.removeChannel(channel).catch(err => {
          console.warn('[IoT Dashboard] 清理频道失败:', err)
        })
        channel = null
      }
    }
  }, [])

  // 一键报修处理函数 - 跳转到报修页面
  const handleQuickRepair = () => {
    router.push("/repair/create")
  }

  return (
    <div className="space-y-4">
      {/* 主要燃料监控卡片 */}
      <Card semanticLevel="primary_fact" className="theme-card p-6" style={{ padding: '1.5rem' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-warning to-destructive rounded-xl flex items-center justify-center shadow-lg shadow-warning/30" style={{ borderRadius: 'var(--radius-button)' }}>
              <Flame className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">燃料实时监控</h3>
              <p className="text-xs text-muted-foreground">IoT智能传感器</p>
            </div>
          </div>
          <Badge className={isOnline ? "bg-success/20 text-success border-success/30" : "bg-muted/20 text-muted-foreground border-muted/30"}>
            <Activity className={`h-3 w-3 mr-1 ${isOnline ? "animate-pulse" : ""}`} />
            {isOnline ? "在线" : "离线"}
          </Badge>
        </div>

        {/* 燃料剩余量 */}
        <div className="mb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Activity className="w-5 h-5 mr-2 animate-spin" />
              <span className="text-sm">加载中...</span>
            </div>
          ) : fuelLevel !== null ? (
            <>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm text-muted-foreground">当前剩余量</span>
                <div className="text-right">
                  <span className="text-4xl font-bold text-foreground data-value">{fuelLevel.toFixed(1)}</span>
                  <span className="text-xl text-muted-foreground ml-1 data-unit">%</span>
                </div>
              </div>
              <Progress value={fuelLevel} />
              <div className="flex justify-between mt-3">
                <span className="text-sm text-foreground font-medium">约 {(fuelLevel * 5).toFixed(0)} kg</span>
                {dailyConsumption > 0 && (
                  <span className="text-sm text-warning font-medium">预计可用 {Math.floor((fuelLevel * 5) / dailyConsumption)} 天</span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <span className="text-sm">暂无数据</span>
            </div>
          )}
        </div>

        {/* 数据统计网格 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/30 backdrop-blur-sm rounded-lg p-3 border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">累计加注</span>
            </div>
            <div className="text-xl font-bold text-foreground data-value">{totalRefilled.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground data-unit">kg</div>
          </div>

          <div className="bg-muted/30 backdrop-blur-sm rounded-lg p-3 border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">日均消耗</span>
            </div>
            <div className="text-xl font-bold text-foreground data-value">{dailyConsumption.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground data-unit">kg/天</div>
          </div>

          <div className="bg-muted/30 backdrop-blur-sm rounded-lg p-3 border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-warning" />
              <span className="text-xs text-muted-foreground">使用效率</span>
            </div>
            <div className="text-xl font-bold text-foreground data-value">{Math.round(usageEfficiency)}</div>
            <div className="text-xs text-muted-foreground data-unit">%</div>
          </div>
        </div>
      </Card>

      {/* 设备状态监控 */}
      <div className="grid grid-cols-2 gap-3">
        <Card 
          semanticLevel="primary_fact"
          className="theme-card p-4 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={onDeviceClick}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">我的设备</span>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-2 py-0.5">
              {deviceCount > 0 ? `${deviceCount}台在用` : '0台在用'}
            </Badge>
          </div>
          <div className="text-3xl font-bold text-foreground mb-1">{deviceRunningDays}</div>
          <div className="text-xs text-success flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            运行天数
          </div>
        </Card>

        <Card 
          semanticLevel="primary_fact"
          className="theme-card repair-warning-card p-4 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={handleQuickRepair}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">一键报修</span>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs px-2 py-0.5">快速报修</Badge>
          </div>
          <div className="text-3xl font-bold text-foreground mb-1">{repairResponseRate.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">响应率</div>
        </Card>
      </div>

    </div>
  )
}
