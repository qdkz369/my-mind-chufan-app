"use client"

import { Truck, Wrench, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useEffect, useState } from "react"

export function CoreServices() {
  const [todayDeliveries, setTodayDeliveries] = useState<number>(0)
  const [onTimeRate, setOnTimeRate] = useState<number>(0)
  const [availableEquipmentCount, setAvailableEquipmentCount] = useState<number>(0)
  const [satisfactionRate, setSatisfactionRate] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const restaurantId = typeof window !== "undefined" 
          ? localStorage.getItem("restaurantId") 
          : null

        // 加载配送统计数据
        if (restaurantId) {
          const deliveryResponse = await fetch(`/api/facts/restaurant/${restaurantId}/delivery-stats`, {
            headers: {
              "x-restaurant-id": restaurantId,
            },
          })

          if (deliveryResponse.ok) {
            const deliveryData = await deliveryResponse.json()
            if (deliveryData.success) {
              setTodayDeliveries(deliveryData.today_deliveries || 0)
              setOnTimeRate(deliveryData.on_time_rate || 0)
            }
          }
        }

        // 加载设备租赁统计数据（不需要 restaurantId，是全局统计）
        const rentalStatsResponse = await fetch(`/api/facts/equipment-rental-stats`)
        if (rentalStatsResponse.ok) {
          const rentalStatsData = await rentalStatsResponse.json()
          if (rentalStatsData.success) {
            setAvailableEquipmentCount(rentalStatsData.available_count || 0)
            setSatisfactionRate(rentalStatsData.satisfaction_rate || 0)
          }
        }
      } catch (error) {
        console.warn('[Core Services] 加载统计数据失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [])

  const services = [
    {
      icon: Truck,
      title: "燃料配送",
      description: "智能监控 · 自动补给 · 24小时送达",
      color: "from-amber-500 to-amber-600",
      shadowColor: "shadow-amber-500/20",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-400",
      stats: [
        { label: "今日配送", value: isLoading ? "加载中..." : `${todayDeliveries}单` },
        { label: "准时率", value: isLoading ? "加载中..." : `${onTimeRate}%` },
      ],
      href: "/payment?service=燃料配送",
    },
    {
      icon: Wrench,
      title: "设备租赁",
      description: "灵活租期 · 免费维护 · 随时升级",
      color: "from-blue-600 to-cyan-700",
      shadowColor: "shadow-blue-600/15",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
      stats: [
        { label: "可租设备", value: isLoading ? "加载中..." : `${availableEquipmentCount}台` },
        { label: "满意度", value: isLoading ? "加载中..." : satisfactionRate > 0 ? `${satisfactionRate}%` : "暂无数据" },
      ],
      href: "/equipment-rental",
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">核心服务</h2>
        <Link href="/services">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            全部服务
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card
            key={service.title}
            semanticLevel="primary_fact"
            className="theme-card backdrop-blur-sm p-4 sm:p-6 hover:scale-[1.01] transition-transform min-w-0 overflow-hidden"
          >
            <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4 min-w-0">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-gradient-to-br ${service.color} rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg ${service.shadowColor}`}
                style={{ borderRadius: 'var(--radius-button)' }}
              >
                <service.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-0.5 sm:mb-1 truncate">{service.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 text-balance">{service.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 min-w-0">
              {service.stats.map((stat) => (
                <div key={stat.label} className="bg-muted/40 rounded-lg p-2 sm:p-3 border border-border/50 min-w-0 overflow-hidden" style={{ borderRadius: 'var(--radius-small)' }}>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 truncate">{stat.label}</div>
                  <div className="text-base sm:text-xl font-bold text-foreground truncate">{stat.value}</div>
                </div>
              ))}
            </div>

            <Link href={service.href || "/services"}>
              <Button 
                className={`w-full bg-gradient-to-r ${service.color} hover:opacity-95 text-white font-medium shadow-md ${service.shadowColor}`}
                style={{ borderRadius: 'var(--radius-button)' }}
              >
                立即下单 →
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}
