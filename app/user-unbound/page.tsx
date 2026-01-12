"use client"

/**
 * 已注册未绑定设备页面
 * 
 * 核心原则：
 * - 显示离线状态的IoTDashboard（使用IoTDashboardOffline组件）
 * - 所有占位符（"--"、"离线"）来自明确的事实判断：系统无法采集到任何 trace / telemetry
 * - 使用 fact_unavailable_reason 表达离线状态的事实原因
 * - 主题：Tech Blue（理性/潜力）- 在身份判定后初始化
 * 
 * 禁止：
 * - 显示实时数据
 * - 调用需要设备绑定的API
 */

import { useEffect } from "react"
import { useTheme } from "@/lib/styles/theme-context"
import { Header } from "@/components/header"
import { IoTDashboardOffline } from "@/components/iot-dashboard-offline"
import { BottomNavigation } from "@/components/bottom-navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Wrench, Store, Droplet, HardHat, CreditCard, ArrowRight, Settings } from "lucide-react"

// 服务列表 - 已注册用户可见
const registeredServices = [
  {
    icon: ShoppingCart,
    label: "B2B供应链商城",
    description: "食材采购、调料批发、一站式采购平台",
    href: "/mall",
    badge: "热门",
  },
  {
    icon: Wrench,
    label: "维修服务",
    description: "水电维修、设备保养、故障排查",
    href: "/services",
    badge: "快速响应",
  },
  {
    icon: Store,
    label: "厨房用品",
    description: "锅具、刀具、餐具等厨房用品采购",
    href: "/mall",
    badge: "次日达",
  },
  {
    icon: Droplet,
    label: "清洁服务",
    description: "油烟机清洗、厨房深度清洁",
    href: "/services",
    badge: "专业团队",
  },
  {
    icon: HardHat,
    label: "工程改造",
    description: "厨房布局优化、设备升级改造",
    href: "/services",
    badge: "一站式",
  },
  {
    icon: CreditCard,
    label: "金融服务",
    description: "账期延长、设备分期、经营贷款",
    href: "/services",
    badge: "低利率",
  },
]

export default function UserUnboundPage() {
  const { setTheme, theme } = useTheme()

  // 主题初始化：在身份判定之后执行
  // 已注册未绑定用户默认主题：Tech Blue（理性/潜力）
  useEffect(() => {
    const savedTheme = typeof window !== "undefined" ? localStorage.getItem("ios-theme-preference") : null
    if (!savedTheme) {
      setTheme("tech-blue") // 已注册未绑定用户默认主题：Tech Blue（理性/潜力）
    }
    console.log('[User Unbound Page] 已注册未绑定页面加载，主题:', savedTheme || theme || "tech-blue")
  }, [setTheme, theme])

  return (
    <main className="min-h-screen bg-background pb-20">
      <Header />
      
      {/* 设备绑定提示 */}
      <div className="container mx-auto px-4 py-4">
        <Card className="theme-card p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/20 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-button)' }}>
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-foreground mb-1">设备未绑定</h3>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                请前往设备管理页面绑定您的IoT设备，以查看实时监控数据和设备状态。
              </p>
              <Link href="/devices">
                <Button className="theme-button bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
                  前往设备管理
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 离线IoT Dashboard */}
        <IoTDashboardOffline />

        {/* 服务展示 */}
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-foreground mb-2">我们的服务</h2>
            <p className="text-sm text-muted-foreground">绑定设备后可享受更多专属服务</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {registeredServices.map((service) => (
              <Link key={service.label} href={service.href}>
                <Card className="theme-card p-5 hover:scale-[1.02] hover:border-primary/30 transition-all cursor-pointer group h-full">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform" style={{ borderRadius: 'var(--radius-button)' }}>
                      <service.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-foreground">{service.label}</h3>
                        {service.badge && (
                          <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded">
                            {service.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">立即了解</span>
                    <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </main>
  )
}
