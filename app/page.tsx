"use client"

import {
  Bell,
  Search,
  Zap,
  Flame,
  TrendingDown,
  TrendingUp,
  Activity,
  Wrench,
  ArrowRight,
  Package,
  Droplet,
  ShoppingCart,
  HardHat,
  Clock,
  CheckCircle2,
  Home,
  Grid3x3,
  FileText,
  User,
  Crown,
  Star,
  Gift,
  Percent,
  Gauge,
  Truck,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

// Header Component
function Header() {
  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 backdrop-blur-lg border-b border-blue-800/30">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shadow-red-500/30">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-white">我的智能餐厅</h1>
              <p className="text-xs text-blue-400">IoT智能餐饮服务平台</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 text-white text-xs border-0">
                3
              </Badge>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

// IoT Dashboard Component
function IoTDashboard() {
  const [fuelLevel, setFuelLevel] = useState(68)
  const [consumption, setConsumption] = useState(12.5)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 加载燃料剩余百分比
    const loadFuelPercentage = async () => {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from("fuel_level")
          .select("percentage")
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (error && error.code !== "PGRST116") {
          console.error("加载燃料百分比失败:", error)
          return
        }

        if (data) {
          setFuelLevel(data.percentage)
        }
      } catch (error) {
        console.error("加载燃料百分比失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFuelPercentage()

    // 实时订阅数据库更新
    const channel = supabase
      .channel("fuel_level_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fuel_level",
        },
        (payload) => {
          if (payload.new && "percentage" in payload.new) {
            setFuelLevel(payload.new.percentage as number)
          }
        }
      )
      .subscribe()

    // 模拟消耗（可选，如果需要实时递减）
    const interval = setInterval(() => {
      setConsumption((prev) => 12 + Math.random() * 2)
    }, 3000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-blue-950/90 to-slate-900/90 border-blue-800/50 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Gauge className="h-6 w-6 text-white" />
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

        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm text-slate-300">当前剩余量</span>
            <div className="text-right">
              {isLoading ? (
                <span className="text-4xl font-bold text-slate-500">加载中...</span>
              ) : (
                <>
                  <span className="text-4xl font-bold text-white">{fuelLevel.toFixed(1)}</span>
                  <span className="text-xl text-slate-400 ml-1">%</span>
                </>
              )}
            </div>
          </div>
          <Progress value={fuelLevel} className="h-3 bg-slate-800" />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-500">约 {(fuelLevel * 5).toFixed(0)} kg</span>
            <span className="text-xs text-orange-400">
              预计可用 {fuelLevel > 0 && consumption > 0 ? Math.floor(fuelLevel / consumption) : 0} 天
            </span>
          </div>
        </div>

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

// Core Services Component
const services = [
  {
    icon: Truck,
    title: "燃料配送",
    description: "智能监控 · 自动补给 · 24小时送达",
    color: "from-orange-500 to-red-600",
    shadowColor: "shadow-orange-500/30",
    stats: [
      { label: "今日配送", value: "28单" },
      { label: "准时率", value: "99.2%" },
    ],
    paymentLink: "/payment?service=燃料配送",
  },
  {
    icon: Wrench,
    title: "设备租赁",
    description: "灵活租期 · 免费维护 · 随时升级",
    color: "from-blue-500 to-cyan-600",
    shadowColor: "shadow-blue-500/30",
    stats: [
      { label: "可租设备", value: "156台" },
      { label: "满意度", value: "98%" },
    ],
    paymentLink: "/services",
  },
]

function CoreServices() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">核心服务</h2>
        <Link href="/services">
          <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
            全部服务
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card
            key={service.title}
            className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6 hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className={`w-12 h-12 bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center shadow-lg ${service.shadowColor}`}
              >
                <service.icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">{service.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{service.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {service.stats.map((stat) => (
                <div key={stat.label} className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">{stat.label}</div>
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                </div>
              ))}
            </div>

            <Link href={service.paymentLink || "/services"}>
              <Button className={`w-full bg-gradient-to-r ${service.color} hover:opacity-90 text-white`}>
                立即下单
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Member Privileges Component
const privileges = [
  {
    icon: Crown,
    title: "专属折扣",
    description: "所有服务享受9折优惠",
    color: "from-yellow-500 to-orange-600",
    shadowColor: "shadow-yellow-500/30",
  },
  {
    icon: Gift,
    title: "生日礼包",
    description: "生日月免费配送一次",
    color: "from-pink-500 to-rose-600",
    shadowColor: "shadow-pink-500/30",
  },
  {
    icon: Star,
    title: "优先服务",
    description: "24小时专属客服支持",
    color: "from-purple-500 to-indigo-600",
    shadowColor: "shadow-purple-500/30",
  },
  {
    icon: Percent,
    title: "积分奖励",
    description: "消费1元=10积分，可兑换好礼",
    color: "from-blue-500 to-cyan-600",
    shadowColor: "shadow-blue-500/30",
  },
]

function MemberPrivileges() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">会员特权</h2>
        <Link href="/profile">
          <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
            查看详情
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {privileges.map((privilege) => (
          <Link href="/profile" key={privilege.title}>
            <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-5 hover:scale-[1.02] transition-transform cursor-pointer">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${privilege.color} rounded-xl flex items-center justify-center shadow-lg ${privilege.shadowColor}`}
                >
                  <privilege.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white mb-1">{privilege.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{privilege.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

// Quick Actions Component
const actions = [
  {
    icon: Truck,
    label: "燃料配送",
    color: "from-orange-500 to-red-600",
    shadowColor: "shadow-orange-500/20",
    href: "/services",
  },
  {
    icon: Package,
    label: "设备租赁",
    color: "from-blue-500 to-cyan-600",
    shadowColor: "shadow-blue-500/20",
    href: "/services",
  },
  {
    icon: ShoppingCart,
    label: "B2B商城",
    color: "from-indigo-500 to-purple-600",
    shadowColor: "shadow-indigo-500/20",
    href: "/mall",
  },
  {
    icon: Wrench,
    label: "维修服务",
    color: "from-green-500 to-emerald-600",
    shadowColor: "shadow-green-500/20",
    href: "/services",
  },
  {
    icon: Droplet,
    label: "清洁服务",
    color: "from-cyan-500 to-teal-600",
    shadowColor: "shadow-cyan-500/20",
    href: "/services",
  },
  {
    icon: HardHat,
    label: "工程改造",
    color: "from-purple-500 to-pink-600",
    shadowColor: "shadow-purple-500/20",
    href: "/services",
  },
]

function QuickActions() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">快速服务</h2>
      <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm p-4">
        <div className="grid grid-cols-3 gap-4">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-slate-800/50 transition-all hover:scale-105"
            >
              <div
                className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center shadow-lg ${action.shadowColor}`}
              >
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-center text-slate-200">{action.label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}

// Recent Orders Component
const orders = [
  {
    id: "ORD20250119001",
    type: "燃料配送",
    status: "进行中",
    time: "预计 15:30 送达",
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  {
    id: "ORD20250118005",
    type: "设备租赁",
    status: "已完成",
    time: "今天 10:20",
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  {
    id: "ORD20250117012",
    type: "维修服务",
    status: "已完成",
    time: "昨天 14:45",
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
]

function RecentOrders() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">最近订单</h2>
        <Link href="/orders">
          <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
            全部订单
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {orders.map((order) => (
          <Link href="/orders" key={order.id}>
            <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm p-4 hover:bg-slate-800/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 ${order.bgColor} rounded-xl flex items-center justify-center`}>
                    <order.icon className={`h-5 w-5 ${order.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-white">{order.type}</h4>
                      <Badge className={`${order.bgColor} ${order.color} border ${order.borderColor} text-xs`}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">{order.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{order.time}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

// Bottom Navigation Component
const navItems = [
  { icon: Home, label: "首页", href: "/" },
  { icon: Grid3x3, label: "服务", href: "/services" },
  { icon: ShoppingCart, label: "商城", href: "/mall" },
  { icon: FileText, label: "订单", href: "/orders" },
  { icon: User, label: "我的", href: "/profile" },
]

function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/50 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-3 px-4 transition-all ${
                  isActive ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" : ""}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

// Main Page Component
export default function MainPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <IoTDashboard />
        <CoreServices />
        <MemberPrivileges />
        <QuickActions />
        <RecentOrders />
      </div>
      <BottomNavigation />
    </main>
  )
}
