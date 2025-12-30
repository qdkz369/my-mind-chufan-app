"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Bell,
  ChevronDown,
  Home,
  Package as PackageIcon,
  ShoppingCart,
  Users,
  Wrench,
  BarChart3,
  DollarSign,
  Settings,
  Menu,
  X,
  Search,
  TrendingUp,
  AlertCircle,
  Flame,
  Zap,
  LogOut,
  Save,
  Lock,
  Unlock,
  InfoIcon,
  Calendar,
  MapPin,
  User,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  Cell,
} from "recharts"
import { useRouter } from "next/navigation"

// 模拟数据
const revenueData = [
  { month: "1月", revenue: 280000, orders: 320 },
  { month: "2月", revenue: 310000, orders: 380 },
  { month: "3月", revenue: 290000, orders: 350 },
  { month: "4月", revenue: 340000, orders: 420 },
  { month: "5月", revenue: 380000, orders: 480 },
  { month: "6月", revenue: 420000, orders: 520 },
]

const serviceDistribution = [
  { name: "燃料配送", value: 45, color: "#3b82f6" },
  { name: "设备租赁", value: 25, color: "#f97316" },
  { name: "维修服务", value: 15, color: "#10b981" },
  { name: "B2B商城", value: 15, color: "#8b5cf6" },
]

const iotDevices = [
  { id: "D001", merchant: "海底捞火锅(朝阳店)", fuel: 68, dailyConsumption: 45, status: "normal", alert: false },
  { id: "D002", merchant: "西贝莜面村(三里屯)", fuel: 25, dailyConsumption: 52, status: "warning", alert: true },
  { id: "D003", merchant: "外婆家(望京店)", fuel: 82, dailyConsumption: 38, status: "normal", alert: false },
  { id: "D004", merchant: "绿茶餐厅(国贸店)", fuel: 15, dailyConsumption: 48, status: "critical", alert: true },
]

const recentOrders = [
  {
    id: "ORD20250001",
    merchant: "海底捞火锅(朝阳店)",
    service: "燃料配送",
    amount: 2800,
    status: "delivering",
    time: "10分钟前",
  },
  {
    id: "ORD20250002",
    merchant: "西贝莜面村(三里屯)",
    service: "设备租赁",
    amount: 15000,
    status: "pending",
    time: "25分钟前",
  },
  {
    id: "ORD20250003",
    merchant: "外婆家(望京店)",
    service: "维修服务",
    amount: 800,
    status: "completed",
    time: "1小时前",
  },
]

const menuItems = [
  { icon: Home, label: "工作台", key: "dashboard" },
  { icon: BarChart3, label: "数据分析", key: "analytics" },
  { icon: Users, label: "商户管理", key: "merchants" },
  { icon: PackageIcon, label: "订单管理", key: "orders" },
  { icon: Wrench, label: "设备监控", key: "iot" },
  { icon: ShoppingCart, label: "商城管理", key: "mall" },
  { icon: DollarSign, label: "财务管理", key: "finance" },
  { icon: Settings, label: "系统设置", key: "settings" },
]

// 订单类型定义
interface Order {
  id: string
  merchant?: string
  service?: string
  amount?: number
  status?: string
  created_at?: string
  updated_at?: string
}

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeMenu, setActiveMenu] = useState("dashboard")
  const [fuelPercentage, setFuelPercentage] = useState<number>(68)
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTogglingLock, setIsTogglingLock] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("default")
  const [devices, setDevices] = useState<Array<{device_id: string, model: string, address: string, status: string}>>([])
  const [selectedDeviceInfo, setSelectedDeviceInfo] = useState<{
    device_id: string
    model: string
    address: string
    installer: string | null
    install_date: string | null
    status: string
  } | null>(null)
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false)
  const [isLoadingDeviceInfo, setIsLoadingDeviceInfo] = useState(false)
  const router = useRouter()
  
  // 订单相关状态
  const [orders, setOrders] = useState<Order[]>([])
  const [unactivatedRestaurants, setUnactivatedRestaurants] = useState<Array<{
    id: string
    name: string
    contact_name: string | null
    contact_phone: string | null
    address: string | null
    created_at: string
  }>>([])
  const [ordersStats, setOrdersStats] = useState({
    total: 0,
    pending: 0,
    delivering: 0,
    completed: 0,
    totalRevenue: 0,
    monthlyOrders: 0,
    monthlyRevenue: 0,
  })

  // 加载待跟进新客户
  const loadUnactivatedRestaurants = useCallback(async () => {
    if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      return
    }

    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, contact_name, contact_phone, address, created_at")
        .eq("status", "unactivated")
        .order("created_at", { ascending: false })
        .limit(10)

      if (!error && data) {
        setUnactivatedRestaurants(data)
      }
    } catch (error) {
      console.error("加载待跟进新客户失败:", error)
    }
  }, [])

  // 加载订单数据的函数
  const loadOrders = useCallback(async () => {
    try {
      // 检查环境变量
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn("Supabase环境变量未配置，使用模拟数据")
        return
      }

      // 获取所有订单
      if (!supabase) {
        console.warn("Supabase客户端未初始化")
        return
      }
      
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (ordersError) {
        console.error("加载订单失败:", ordersError)
        return
      }

      if (ordersData) {
        setOrders(ordersData as Order[])
        
        // 计算统计数据
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        
        const monthlyOrders = ordersData.filter((order: any) => {
          if (!order.created_at) return false
          const orderDate = new Date(order.created_at)
          return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear
        })
        
        const stats = {
          total: ordersData.length,
          pending: ordersData.filter((o: any) => o.status === "pending" || o.status === "待处理").length,
          delivering: ordersData.filter((o: any) => o.status === "delivering" || o.status === "配送中" || o.status === "进行中").length,
          completed: ordersData.filter((o: any) => o.status === "completed" || o.status === "已完成").length,
          totalRevenue: ordersData.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0),
          monthlyOrders: monthlyOrders.length,
          monthlyRevenue: monthlyOrders.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0),
        }
        
        setOrdersStats(stats)
      }
    } catch (error) {
      console.error("加载订单失败:", error)
    }
  }, [])

  // 加载订单数据和待跟进新客户
  useEffect(() => {
    loadOrders()
    loadUnactivatedRestaurants()

    // 实时订阅订单更新 - 只有在 Supabase 配置有效时才开启
    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      const ordersChannel = supabase
        .channel("orders_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          async (payload) => {
            console.log("订单数据变化:", payload.eventType)
            // 重新加载订单数据
            await loadOrders()
          }
        )
        .subscribe()

      const restaurantsChannel = supabase
        .channel("restaurants_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "restaurants",
          },
          async (payload) => {
            console.log("餐厅数据变化:", payload.eventType)
            // 重新加载待跟进新客户
            await loadUnactivatedRestaurants()
          }
        )
        .subscribe()

      return () => {
        if (supabase) {
          supabase.removeChannel(ordersChannel)
          supabase.removeChannel(restaurantsChannel)
        }
      }
    } else {
      console.warn("[Admin] Supabase未配置，跳过实时订阅")
    }
  }, [loadOrders, loadUnactivatedRestaurants])

  // 加载燃料剩余百分比和锁机状态
  useEffect(() => {
    const loadFuelData = async () => {
      try {
        // 检查 Supabase 客户端是否可用
        if (!supabase) {
          console.warn("Supabase客户端未初始化")
          return
        }

        const { data, error } = await supabase!
          .from("fuel_level")
          .select("percentage, is_locked")
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (error) {
          // PGRST116 表示没有找到数据，这是正常的
          if (error.code !== "PGRST116") {
            console.error("加载燃料数据失败:", error)
          }
          return
        }

        if (data) {
          setFuelPercentage(data.percentage || 68)
          setIsLocked(data.is_locked || false)
        }
      } catch (error) {
        console.error("加载燃料数据失败:", error)
      }
    }

    loadFuelData()

    // 实时订阅更新
    if (supabase) {
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
            if (payload.new) {
              if ("percentage" in payload.new) {
                setFuelPercentage(payload.new.percentage as number)
              }
              if ("is_locked" in payload.new) {
                setIsLocked(payload.new.is_locked as boolean)
              }
            }
          }
        )
        .subscribe()

      return () => {
        if (supabase) {
          supabase.removeChannel(channel)
        }
      }
    }
  }, [])

  // 保存燃料剩余百分比
  const handleSaveFuelPercentage = async () => {
    if (fuelPercentage < 0 || fuelPercentage > 100) {
      alert("燃料剩余百分比必须在 0-100 之间")
      return
    }

    setIsSaving(true)
    try {
      // 检查 Supabase 客户端是否可用
      if (!supabase) {
        alert("数据库连接失败，请检查 Supabase 配置")
        return
      }

      const { data, error } = await supabase
        .from("fuel_level")
        .insert([{ 
          device_id: selectedDeviceId,
          percentage: fuelPercentage,
          is_locked: isLocked 
        }])
        .select()
        .single()

      if (error) {
        console.error("保存失败:", error)
        alert("保存失败: " + (error.message || "数据库操作失败，请检查网络连接"))
        return
      }

      if (data) {
        // 更新本地状态
        setFuelPercentage(data.percentage)
        setIsLocked(data.is_locked || false)
        alert("保存成功！")
      }
    } catch (error: any) {
      console.error("保存失败:", error)
      const errorMessage = error?.message || error?.toString() || "未知错误"
      alert("保存失败: " + errorMessage + "\n请检查网络连接和数据库配置")
    } finally {
      setIsSaving(false)
    }
  }

  // 切换锁机状态
  const handleToggleLock = async () => {
    setIsTogglingLock(true)
    try {
      // 检查 Supabase 客户端是否可用
      if (!supabase) {
        alert("数据库连接失败，请检查 Supabase 配置")
        return
      }

      const newLockStatus = !isLocked

      const { data, error } = await supabase
        .from("fuel_level")
        .insert([{ 
          device_id: selectedDeviceId,
          percentage: fuelPercentage,
          is_locked: newLockStatus 
        }])
        .select()
        .single()

      // 同时更新 devices 表的 is_locked 状态
      if (data) {
        await supabase
          .from("devices")
          .update({ is_locked: newLockStatus })
          .eq("device_id", selectedDeviceId)
      }

      if (error) {
        console.error("更新锁机状态失败:", error)
        alert("更新锁机状态失败: " + (error.message || "数据库操作失败，请检查网络连接"))
        return
      }

      if (data) {
        // 更新本地状态
        setIsLocked(newLockStatus)
        setFuelPercentage(data.percentage || fuelPercentage)
        alert(newLockStatus ? "设备已锁定" : "设备已解锁")
      }
    } catch (error: any) {
      console.error("更新锁机状态失败:", error)
      const errorMessage = error?.message || error?.toString() || "未知错误"
      alert("更新锁机状态失败: " + errorMessage + "\n请检查网络连接和数据库配置")
    } finally {
      setIsTogglingLock(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("adminLoggedIn")
    router.push("/admin/login")
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* 侧边栏 */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        } bg-slate-950 border-r border-slate-800`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white">厨房智联</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:bg-slate-800"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeMenu === item.key
            // 为订单管理显示未处理订单数量
            const badgeCount = item.key === "orders" && ordersStats.pending > 0 ? ordersStats.pending : null
            return (
              <button
                key={item.key}
                onClick={() => setActiveMenu(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                } ${!sidebarOpen && "justify-center"}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="font-medium flex-1 text-left">{item.label}</span>
                )}
                {badgeCount !== null && sidebarOpen && (
                  <Badge className="bg-[oklch(0.7_0.18_60)] text-white text-xs px-2 py-0.5">
                    {badgeCount}
                  </Badge>
                )}
                {badgeCount !== null && !sidebarOpen && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[oklch(0.7_0.18_60)] rounded-full" />
                )}
              </button>
            )
          })}

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-red-400 hover:bg-slate-800 mt-4 ${!sidebarOpen && "justify-center"}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">退出登录</span>}
          </button>
        </nav>
      </aside>

      {/* 主内容区 */}
      <div className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-30 h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <Search className="w-5 h-5 text-slate-400" />
            <Input
              placeholder="搜索商户、订单、设备..."
              className="border-0 bg-slate-900 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-white">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
            <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-800 rounded-lg p-2 transition-colors">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">管</span>
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium text-white">管理员</div>
                <div className="text-xs text-slate-400">超级管理员</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </header>

        {/* 主要内容 */}
        <main className="p-6">
          {activeMenu === "dashboard" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white">工作台</h1>
                  <p className="text-slate-400 mt-1">实时监控平台运营数据</p>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-slate-400">最后更新: 刚刚</span>
                </div>
              </div>

              {/* 待跟进新客户通知 */}
              {unactivatedRestaurants.length > 0 && (
                <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Bell className="h-5 w-5 text-yellow-400 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-white">待跟进新客户</h3>
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            {unactivatedRestaurants.length} 个
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-300 mb-3">
                          有 {unactivatedRestaurants.length} 个新注册的餐厅等待设备安装和激活
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {unactivatedRestaurants.map((restaurant) => (
                            <div
                              key={restaurant.id}
                              className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-white">{restaurant.name}</div>
                                  <div className="text-xs text-slate-400 mt-1">
                                    {restaurant.contact_name && (
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {restaurant.contact_name}
                                      </span>
                                    )}
                                    {restaurant.contact_phone && (
                                      <span className="ml-3">{restaurant.contact_phone}</span>
                                    )}
                                  </div>
                                  {restaurant.address && (
                                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {restaurant.address}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 ml-4">
                                  {new Date(restaurant.created_at).toLocaleDateString("zh-CN")}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 核心指标卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-l-4 border-l-blue-500 bg-slate-900 border-slate-800 relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-slate-400">总营收（本月）</CardDescription>
                      <div className="relative">
                        <div className="absolute inset-0 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <div className="relative w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></div>
                      </div>
                    </div>
                    <CardTitle className="text-3xl text-white">
                      {ordersStats.monthlyRevenue > 0 
                        ? `¥${(ordersStats.monthlyRevenue / 10000).toFixed(1)}万` 
                        : "¥42.0万"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-slate-400">
                        总营收: ¥{ordersStats.totalRevenue > 0 ? (ordersStats.totalRevenue / 10000).toFixed(1) + "万" : "42.0万"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 bg-slate-900 border-slate-800 relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-slate-400">订单总数（本月）</CardDescription>
                      <div className="relative">
                        <div className="absolute inset-0 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <div className="relative w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></div>
                      </div>
                    </div>
                    <CardTitle className="text-3xl text-white">
                      {ordersStats.monthlyOrders > 0 ? ordersStats.monthlyOrders : "520"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-slate-400">
                        总订单: {ordersStats.total > 0 ? ordersStats.total : "520"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 bg-slate-900 border-slate-800 relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-slate-400">活跃商户</CardDescription>
                      <div className="relative">
                        <div className="absolute inset-0 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <div className="relative w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></div>
                      </div>
                    </div>
                    <CardTitle className="text-3xl text-white">128</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 font-medium">+12</span>
                      <span className="text-slate-400">vs 上月</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500 bg-slate-900 border-slate-800 relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-slate-400">设备告警</CardDescription>
                      <div className="relative">
                        <div className="absolute inset-0 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <div className="relative w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></div>
                      </div>
                    </div>
                    <CardTitle className="text-3xl text-yellow-400">8</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 font-medium">需处理</span>
                      <span className="text-slate-400">燃料不足</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 燃料剩余百分比管理 */}
              <Card className="bg-[oklch(0.15_0.015_240)] border-[oklch(0.25_0.015_240)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[oklch(0.95_0.01_240)]">
                    <Flame className="w-5 h-5 text-[oklch(0.6_0.2_30)]" />
                    燃料剩余百分比管理
                  </CardTitle>
                  <CardDescription className="text-[oklch(0.6_0.01_240)]">
                    修改商户端显示的燃料剩余百分比
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-[oklch(0.95_0.01_240)] mb-2 block">
                        选择设备
                      </label>
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="w-full h-10 rounded-md border border-[oklch(0.25_0.015_240)] bg-[oklch(0.2_0.015_240)] text-[oklch(0.95_0.01_240)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.18_250)]"
                      >
                        {devices.length > 0 ? (
                          devices.map((device) => (
                            <option key={device.device_id} value={device.device_id}>
                              {device.device_id} - {device.model} ({device.address})
                            </option>
                          ))
                        ) : (
                          <option value="default">暂无设备，请先在数据库中创建设备</option>
                        )}
                      </select>
                      <p className="text-xs text-[oklch(0.6_0.01_240)] mt-2">
                        选择要管理的设备
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[oklch(0.95_0.01_240)] mb-2 block">
                        当前燃料剩余百分比
                      </label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={fuelPercentage}
                          onChange={(e) => setFuelPercentage(Number(e.target.value))}
                          className="flex-1 bg-[oklch(0.2_0.015_240)] border-[oklch(0.25_0.015_240)] text-[oklch(0.95_0.01_240)]"
                        />
                        <span className="text-[oklch(0.6_0.01_240)]">%</span>
                      </div>
                      <p className="text-xs text-[oklch(0.6_0.01_240)] mt-2">
                        请输入 0-100 之间的数值
                      </p>
                    </div>
                    <Button
                      onClick={handleSaveFuelPercentage}
                      disabled={isSaving}
                      className="w-full bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.6_0.2_30)] hover:opacity-90 text-white"
                    >
                      {isSaving ? (
                        <>
                          <Zap className="w-4 h-4 mr-2 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          保存修改
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 图表区域 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-[oklch(0.15_0.015_240)] border-[oklch(0.25_0.015_240)]">
                  <CardHeader>
                    <CardTitle className="text-[oklch(0.95_0.01_240)]">营收趋势</CardTitle>
                    <CardDescription className="text-[oklch(0.6_0.01_240)]">过去6个月的营收和订单数据</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.015 240)" />
                        <XAxis dataKey="month" stroke="oklch(0.6 0.01 240)" />
                        <YAxis stroke="oklch(0.6 0.01 240)" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "oklch(0.15 0.015 240)",
                            border: "1px solid oklch(0.25 0.015 240)",
                            borderRadius: "8px",
                            color: "oklch(0.95 0.01 240)",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="oklch(0.55 0.18 250)"
                          strokeWidth={3}
                          name="营收（元）"
                          dot={{ fill: "oklch(0.55 0.18 250)", r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="orders"
                          stroke="oklch(0.6 0.2 30)"
                          strokeWidth={3}
                          name="订单数"
                          dot={{ fill: "oklch(0.6 0.2 30)", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-[oklch(0.15_0.015_240)] border-[oklch(0.25_0.015_240)]">
                  <CardHeader>
                    <CardTitle className="text-[oklch(0.95_0.01_240)]">服务占比</CardTitle>
                    <CardDescription className="text-[oklch(0.6_0.01_240)]">各服务类型订单分布</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={serviceDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name} ${value}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {serviceDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "oklch(0.15 0.015 240)",
                            border: "1px solid oklch(0.25 0.015 240)",
                            borderRadius: "8px",
                            color: "oklch(0.95 0.01 240)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* 设备告警列表 */}
              <Card className="bg-[oklch(0.15_0.015_240)] border-[oklch(0.25_0.015_240)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[oklch(0.95_0.01_240)]">
                    <AlertCircle className="w-5 h-5 text-[oklch(0.7_0.18_60)]" />
                    设备告警 (需立即处理)
                  </CardTitle>
                  <CardDescription className="text-[oklch(0.6_0.01_240)]">燃料余量不足30%的设备</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {iotDevices
                      .filter((device) => device.alert)
                      .map((device) => (
                        <div
                          key={device.id}
                          className="flex items-center justify-between p-4 bg-[oklch(0.7_0.18_60)]/10 border border-[oklch(0.7_0.18_60)]/20 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[oklch(0.7_0.18_60)]/20 rounded-full flex items-center justify-center">
                              <AlertCircle className="w-6 h-6 text-[oklch(0.7_0.18_60)]" />
                            </div>
                            <div>
                              <div className="font-semibold text-[oklch(0.95_0.01_240)]">{device.merchant}</div>
                              <div className="text-sm text-[oklch(0.6_0.01_240)]">
                                设备编号: {device.id} | 日均消耗: {device.dailyConsumption}L
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-[oklch(0.7_0.18_60)]">{device.fuel}%</div>
                              <div className="text-xs text-[oklch(0.6_0.01_240)]">剩余燃料</div>
                            </div>
                            <Button size="sm">安排配送</Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* 最近订单 */}
              <Card className="bg-[oklch(0.15_0.015_240)] border-[oklch(0.25_0.015_240)]">
                <CardHeader>
                  <CardTitle className="text-[oklch(0.95_0.01_240)]">最近订单</CardTitle>
                  <CardDescription className="text-[oklch(0.6_0.01_240)]">
                    实时订单动态 {orders.length > 0 && `(${orders.length}条)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orders.length > 0 ? (
                      orders.slice(0, 10).map((order) => {
                        // 格式化时间
                        const formatTime = (dateString?: string) => {
                          if (!dateString) return "未知时间"
                          const date = new Date(dateString)
                          const now = new Date()
                          const diff = now.getTime() - date.getTime()
                          const minutes = Math.floor(diff / 60000)
                          const hours = Math.floor(minutes / 60)
                          const days = Math.floor(hours / 24)
                          
                          if (minutes < 1) return "刚刚"
                          if (minutes < 60) return `${minutes}分钟前`
                          if (hours < 24) return `${hours}小时前`
                          if (days < 7) return `${days}天前`
                          return date.toLocaleDateString("zh-CN")
                        }
                        
                        const status = order.status || "pending"
                        const merchant = order.merchant || "未知商户"
                        const service = order.service || "未知服务"
                        const amount = order.amount || 0
                        
                        return (
                          <div
                            key={order.id}
                            className="flex items-center justify-between p-4 hover:bg-[oklch(0.2_0.015_240)] border border-[oklch(0.25_0.015_240)] rounded-lg transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="font-semibold text-[oklch(0.95_0.01_240)]">{merchant}</div>
                                <Badge variant="outline">{service}</Badge>
                              </div>
                              <div className="text-sm text-[oklch(0.6_0.01_240)] mt-1">
                                订单号: {order.id} · {formatTime(order.created_at)}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-bold text-lg text-[oklch(0.95_0.01_240)]">¥{amount}</div>
                              </div>
                              <Badge
                                variant={
                                  status === "completed" || status === "已完成"
                                    ? "default"
                                    : status === "delivering" || status === "配送中" || status === "进行中"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {status === "completed" || status === "已完成"
                                  ? "已完成"
                                  : status === "delivering" || status === "配送中" || status === "进行中"
                                    ? "配送中"
                                    : "待处理"}
                              </Badge>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      // 如果没有订单数据，显示模拟数据
                      recentOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-4 hover:bg-[oklch(0.2_0.015_240)] border border-[oklch(0.25_0.015_240)] rounded-lg transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="font-semibold text-[oklch(0.95_0.01_240)]">{order.merchant}</div>
                              <Badge variant="outline">{order.service}</Badge>
                            </div>
                            <div className="text-sm text-[oklch(0.6_0.01_240)] mt-1">
                              订单号: {order.id} · {order.time}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-bold text-lg text-[oklch(0.95_0.01_240)]">¥{order.amount}</div>
                            </div>
                            <Badge
                              variant={
                                order.status === "completed"
                                  ? "default"
                                  : order.status === "delivering"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {order.status === "completed"
                                ? "已完成"
                                : order.status === "delivering"
                                  ? "配送中"
                                  : "待处理"}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeMenu === "iot" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-[oklch(0.95_0.01_240)]">设备监控</h1>
                  <p className="text-[oklch(0.6_0.01_240)] mt-1">实时监控设备状态和燃料数据</p>
                </div>
              </div>

              {/* 设备状态概览 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-[oklch(0.15_0.015_240)] border-[oklch(0.25_0.015_240)]">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-[oklch(0.6_0.01_240)]">设备状态</CardDescription>
                    <CardTitle className="text-2xl text-[oklch(0.95_0.01_240)] flex items-center gap-2">
                      {isLocked ? (
                        <>
                          <Lock className="w-6 h-6 text-[oklch(0.7_0.18_60)]" />
                          <span>已锁定</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-6 h-6 text-[oklch(0.55_0.15_150)]" />
                          <span>运行中</span>
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm">
                      {isLocked ? (
                        <span className="text-[oklch(0.7_0.18_60)]">设备已被远程锁定</span>
                      ) : (
                        <span className="text-[oklch(0.55_0.15_150)]">设备正常运行</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[oklch(0.15_0.015_240)] border-[oklch(0.25_0.015_240)]">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-[oklch(0.6_0.01_240)]">燃料剩余量</CardDescription>
                    <CardTitle className="text-2xl text-[oklch(0.95_0.01_240)]">
                      {fuelPercentage.toFixed(1)}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={fuelPercentage} className="h-2 bg-[oklch(0.2_0.015_240)]" />
                  </CardContent>
                </Card>

                <Card className="bg-[oklch(0.15_0.015_240)] border-[oklch(0.25_0.015_240)]">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-[oklch(0.6_0.01_240)]">远程控制</CardDescription>
                    <CardTitle className="text-lg text-[oklch(0.95_0.01_240)]">锁机管理</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={handleToggleLock}
                      disabled={isTogglingLock}
                      className={`w-full ${
                        isLocked
                          ? "bg-gradient-to-r from-[oklch(0.55_0.15_150)] to-[oklch(0.6_0.18_120)] hover:opacity-90 text-white"
                          : "bg-gradient-to-r from-[oklch(0.7_0.18_60)] to-[oklch(0.75_0.2_30)] hover:opacity-90 text-white"
                      }`}
                    >
                      {isTogglingLock ? (
                        <>
                          <Zap className="w-4 h-4 mr-2 animate-spin" />
                          处理中...
                        </>
                      ) : isLocked ? (
                        <>
                          <Unlock className="w-4 h-4 mr-2" />
                          解锁设备
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          锁定设备
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* 设备详细信息 */}
              <Card className="bg-[oklch(0.15_0.015_240)] border-[oklch(0.25_0.015_240)]">
                <CardHeader>
                  <CardTitle className="text-[oklch(0.95_0.01_240)]">设备详细信息</CardTitle>
                  <CardDescription className="text-[oklch(0.6_0.01_240)]">实时设备状态和监控数据</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[oklch(0.2_0.015_240)] rounded-lg">
                      <div className="flex items-center gap-3">
                        {isLocked ? (
                          <Lock className="w-5 h-5 text-[oklch(0.7_0.18_60)]" />
                        ) : (
                          <Unlock className="w-5 h-5 text-[oklch(0.55_0.15_150)]" />
                        )}
                        <div>
                          <div className="font-semibold text-[oklch(0.95_0.01_240)]">锁机状态</div>
                          <div className="text-sm text-[oklch(0.6_0.01_240)]">
                            {isLocked ? "设备已被远程锁定" : "设备正常运行"}
                          </div>
                        </div>
                      </div>
                      <Badge variant={isLocked ? "destructive" : "default"}>
                        {isLocked ? "已锁定" : "运行中"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-[oklch(0.2_0.015_240)] rounded-lg">
                      <div className="flex items-center gap-3">
                        <Flame className="w-5 h-5 text-[oklch(0.6_0.2_30)]" />
                        <div>
                          <div className="font-semibold text-[oklch(0.95_0.01_240)]">燃料剩余量</div>
                          <div className="text-sm text-[oklch(0.6_0.01_240)]">当前燃料百分比</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[oklch(0.95_0.01_240)]">
                          {fuelPercentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeMenu !== "dashboard" && activeMenu !== "iot" && (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-[oklch(0.95_0.01_240)] mb-4">功能开发中</h2>
              <p className="text-[oklch(0.6_0.01_240)]">该模块正在开发中，敬请期待</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
