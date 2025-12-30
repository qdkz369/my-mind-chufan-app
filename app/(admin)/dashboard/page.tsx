"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users,
  Phone,
  Building2,
  AlertCircle,
  Eye,
  TrendingUp,
  X,
  Activity,
  Gauge,
  Lock,
  Unlock,
  MapPin,
  Map,
  List,
  Truck,
  User,
  CheckCircle2,
  Clock,
  Bell,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "recharts"

// 餐厅数据类型
interface Restaurant {
  id: string
  name: string
  contact_name: string | null
  contact_phone: string | null
  total_refilled: number
  status: string
  created_at: string
  latitude: number | null
  longitude: number | null
  address: string | null
  qr_token: string | null
}

// 订单类型
interface Order {
  id: string
  restaurant_id: string
  restaurant_name?: string
  service_type: string
  status: string
  amount: number
  created_at: string
  updated_at: string
  worker_id?: string | null
}

// 工人类型
interface Worker {
  id: string
  name: string
  phone: string | null
}

// 燃料数据点类型
interface FuelDataPoint {
  time: string
  percentage: number
}

export default function AdminDashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [fuelData, setFuelData] = useState<FuelDataPoint[]>([])
  const [currentFuelLevel, setCurrentFuelLevel] = useState<number>(0)
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [isLoadingFuelData, setIsLoadingFuelData] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "map">("list")
  const [workers, setWorkers] = useState<Worker[]>([])
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState(false)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)

  // 加载所有餐厅数据
  const loadRestaurants = useCallback(async () => {
    try {
      setIsLoading(true)
      
      if (!supabase) {
        console.warn("[Admin Dashboard] Supabase未配置")
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, contact_name, contact_phone, total_refilled, status, created_at, latitude, longitude, address, qr_token")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[Admin Dashboard] 加载餐厅数据失败:", error)
        setIsLoading(false)
        return
      }

      if (data) {
        setRestaurants(data as Restaurant[])
      }
    } catch (error) {
      console.error("[Admin Dashboard] 加载餐厅数据时出错:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 加载指定餐厅的燃料数据（用于详情弹窗）
  const loadFuelData = useCallback(async (restaurantId: string) => {
    if (!supabase) return

    try {
      setIsLoadingFuelData(true)

      // 获取该餐厅关联的设备ID（如果有）
      const { data: devices, error: devicesError } = await supabase
        .from("devices")
        .select("device_id")
        .eq("restaurant_id", restaurantId)
        .limit(1)

      if (devicesError || !devices || devices.length === 0) {
        console.warn("[Admin Dashboard] 该餐厅暂无关联设备")
        setFuelData([])
        setCurrentFuelLevel(0)
        setIsLoadingFuelData(false)
        return
      }

      const deviceId = devices[0].device_id

      // 获取最近24小时的燃料数据
      const twentyFourHoursAgo = new Date()
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

      const { data: fuelLevelData, error: fuelError } = await supabase
        .from("fuel_level")
        .select("percentage, is_locked, created_at")
        .eq("device_id", deviceId)
        .gte("created_at", twentyFourHoursAgo.toISOString())
        .order("created_at", { ascending: true })
        .limit(100)

      if (fuelError) {
        console.error("[Admin Dashboard] 加载燃料数据失败:", fuelError)
        setFuelData([])
        setIsLoadingFuelData(false)
        return
      }

      if (fuelLevelData && fuelLevelData.length > 0) {
        // 格式化数据用于图表
        const formattedData: FuelDataPoint[] = fuelLevelData.map((item: any) => ({
          time: new Date(item.created_at).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          percentage: Number(item.percentage) || 0,
        }))

        setFuelData(formattedData)

        // 获取最新的燃料水平
        const latestData = fuelLevelData[fuelLevelData.length - 1]
        setCurrentFuelLevel(Number(latestData.percentage) || 0)
        setIsLocked(latestData.is_locked || false)
      } else {
        setFuelData([])
        setCurrentFuelLevel(0)
      }
    } catch (error) {
      console.error("[Admin Dashboard] 加载燃料数据时出错:", error)
      setFuelData([])
    } finally {
      setIsLoadingFuelData(false)
    }
  }, [])

  // 打开详情弹窗
  const handleViewDetails = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setIsDetailDialogOpen(true)
    loadFuelData(restaurant.id)
  }

  // 计算 total_refilled 的百分比（假设最大值为100，可根据实际情况调整）
  const getRefilledPercentage = (totalRefilled: number): number => {
    // 假设 total_refilled 是累计加注量（kg），我们计算一个百分比
    // 这里可以根据实际业务逻辑调整
    const maxRefilled = 100 // 可以根据实际情况调整
    return Math.min((totalRefilled / maxRefilled) * 100, 100)
  }

  // 判断是否需要显示预警
  const shouldShowWarning = (totalRefilled: number): boolean => {
    const percentage = getRefilledPercentage(totalRefilled)
    return percentage < 20
  }

  // 加载工人列表
  const loadWorkers = useCallback(async () => {
    if (!supabase) return

    try {
      // 尝试从 workers 表获取，如果不存在则使用默认列表
      const { data, error } = await supabase
        .from("workers")
        .select("id, name, phone")
        .order("name", { ascending: true })

      if (error) {
        console.warn("[Admin Dashboard] workers 表不存在或查询失败，使用默认工人列表")
        // 使用默认工人列表
        setWorkers([
          { id: "worker_001", name: "张师傅", phone: "13800138001" },
          { id: "worker_002", name: "李师傅", phone: "13800138002" },
          { id: "worker_003", name: "王师傅", phone: "13800138003" },
        ])
        return
      }

      if (data && data.length > 0) {
        setWorkers(data as Worker[])
      } else {
        // 如果没有数据，使用默认列表
        setWorkers([
          { id: "worker_001", name: "张师傅", phone: "13800138001" },
          { id: "worker_002", name: "李师傅", phone: "13800138002" },
          { id: "worker_003", name: "王师傅", phone: "13800138003" },
        ])
      }
    } catch (error) {
      console.error("[Admin Dashboard] 加载工人列表失败:", error)
      // 使用默认工人列表
      setWorkers([
        { id: "worker_001", name: "张师傅", phone: "13800138001" },
        { id: "worker_002", name: "李师傅", phone: "13800138002" },
        { id: "worker_003", name: "王师傅", phone: "13800138003" },
      ])
    }
  }, [])

  // 处理指派配送
  const handleAssignDelivery = async () => {
    if (!selectedRestaurant || !selectedWorkerId) {
      alert("请选择餐厅和工人")
      return
    }

    setIsAssigning(true)

    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_id: selectedRestaurant.id,
          worker_id: selectedWorkerId,
          service_type: "燃料配送",
          status: "pending",
          amount: 0, // 可以根据实际情况设置金额
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "创建订单失败")
      }

      alert("订单创建成功！")
      setIsAssignDialogOpen(false)
      setSelectedWorkerId("")
    } catch (error: any) {
      console.error("[Admin Dashboard] 创建订单失败:", error)
      alert("创建订单失败: " + (error.message || "未知错误"))
    } finally {
      setIsAssigning(false)
    }
  }

  // 打开指派对话框
  const handleOpenAssignDialog = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setIsAssignDialogOpen(true)
    setSelectedWorkerId("")
  }

  // 加载最新订单
  const loadRecentOrders = useCallback(async () => {
    if (!supabase) return

    try {
      setIsLoadingOrders(true)
      
      // 获取最近20条订单
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, restaurant_id, service_type, status, amount, created_at, updated_at, worker_id")
        .order("created_at", { ascending: false })
        .limit(20)

      if (ordersError) {
        console.error("[Admin Dashboard] 加载订单失败:", ordersError)
        return
      }

      if (ordersData) {
        // 获取所有相关的餐厅名称
        const restaurantIds = [...new Set(ordersData.map((o: any) => o.restaurant_id).filter(Boolean))]
        let restaurantMap: Record<string, string> = {}
        
        if (restaurantIds.length > 0) {
          const { data: restaurantsData } = await supabase
            .from("restaurants")
            .select("id, name")
            .in("id", restaurantIds)
          
          if (restaurantsData) {
            restaurantMap = restaurantsData.reduce((acc: Record<string, string>, r: any) => {
              acc[r.id] = r.name
              return acc
            }, {})
          }
        }

        // 格式化订单数据
        const formattedOrders: Order[] = ordersData.map((order: any) => ({
          id: order.id,
          restaurant_id: order.restaurant_id,
          restaurant_name: restaurantMap[order.restaurant_id] || "未知餐厅",
          service_type: order.service_type || "燃料配送",
          status: order.status || "pending",
          amount: order.amount || 0,
          created_at: order.created_at,
          updated_at: order.updated_at,
          worker_id: order.worker_id,
        }))
        setRecentOrders(formattedOrders)
      }
    } catch (error) {
      console.error("[Admin Dashboard] 加载订单时出错:", error)
    } finally {
      setIsLoadingOrders(false)
    }
  }, [])

  useEffect(() => {
    loadRestaurants()
    loadWorkers()
    loadRecentOrders()

    // 实时订阅订单变化
    if (supabase) {
      const channel = supabase
        .channel("orders_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          (payload) => {
            console.log("[Admin Dashboard] 订单变化:", payload)
            // 重新加载订单列表
            loadRecentOrders()
            // 重新加载餐厅数据（因为 total_refilled 可能更新）
            loadRestaurants()
          }
        )
        .subscribe()

      return () => {
        if (supabase) {
          supabase.removeChannel(channel)
        }
      }
    }
  }, [loadRestaurants, loadWorkers, loadRecentOrders])

  // 格式化时间显示
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return "刚刚"
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`
    return date.toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  // 获取订单状态样式
  // 获取订单状态样式
// 获取订单状态样式
const getOrderStatusStyle = (status: string) => {
  if (status === "pending" || status === "待处理") {
    return "border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/30";
  } else if (status === "delivering" || status === "配送中" || status === "进行中") {
    return "border-yellow-500/50 bg-yellow-500/10 shadow-lg shadow-yellow-500/30";
  } else if (status === "completed" || status === "已完成") {
    return "border-green-500/50 bg-green-500/10";
  }
  return "border-slate-700/50 bg-slate-800/50";
};

return (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧主内容区 */}
          <div className="lg:col-span-2 space-y-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">客户概览面板</h1>
          <p className="text-slate-400">管理所有已注册餐厅的信息和状态</p>
        </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">总餐厅数</CardDescription>
                  <CardTitle className="text-3xl text-white">{restaurants.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">已激活</CardDescription>
                  <CardTitle className="text-3xl text-white">
                    {restaurants.filter((r) => r.status === "activated").length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">待激活</CardDescription>
                  <CardTitle className="text-3xl text-white">
                    {restaurants.filter((r) => r.status === "unactivated").length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">预警餐厅</CardDescription>
                  <CardTitle className="text-3xl text-red-400">
                    {restaurants.filter((r) => shouldShowWarning(r.total_refilled)).length}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* 餐厅列表/地图 */}
            <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">餐厅列表</CardTitle>
                <CardDescription className="text-slate-400">
                  所有已注册餐厅的详细信息和位置
                </CardDescription>
              </div>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "map")}>
                <TabsList className="bg-slate-800">
                  <TabsTrigger value="list" className="data-[state=active]:bg-slate-700">
                    <List className="h-4 w-4 mr-2" />
                    列表
                  </TabsTrigger>
                  <TabsTrigger value="map" className="data-[state=active]:bg-slate-700">
                    <Map className="h-4 w-4 mr-2" />
                    地图
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === "map" ? (
              <>
                {/* 地图视图 */}
                <div className="h-[600px] rounded-lg overflow-hidden border border-slate-800">
                {restaurants.filter((r) => r.latitude && r.longitude).length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">暂无餐厅位置信息</p>
                    </div>
                  </div>
                ) : (
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(() => {
                      const restaurantsWithLocation = restaurants.filter(
                        (r) => r.latitude && r.longitude
                      )
                      if (restaurantsWithLocation.length === 0) return "102.5,24.9,102.8,25.2"
                      const lats = restaurantsWithLocation.map((r) => r.latitude!)
                      const lngs = restaurantsWithLocation.map((r) => r.longitude!)
                      const minLng = Math.min(...lngs) - 0.1
                      const maxLng = Math.max(...lngs) + 0.1
                      const minLat = Math.min(...lats) - 0.1
                      const maxLat = Math.max(...lats) + 0.1
                      return `${minLng},${minLat},${maxLng},${maxLat}`
                    })()}&layer=mapnik&marker=${restaurants
                      .filter((r) => r.latitude && r.longitude)
                      .map((r) => `${r.latitude},${r.longitude}`)
                      .join("&marker=")}`}
                    className="border-0"
                  />
                )}
                {/* 地图标记说明 */}
                <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex flex-wrap gap-4">
                    {restaurants
                      .filter((r) => r.latitude && r.longitude)
                      .slice(0, 10)
                      .map((restaurant) => (
                        <div
                          key={restaurant.id}
                          className="flex items-center gap-2 text-sm text-slate-300"
                        >
                          <MapPin className="h-4 w-4 text-blue-400" />
                          <span>{restaurant.name}</span>
                          {shouldShowWarning(restaurant.total_refilled) && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                              预警
                            </Badge>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              </>
            ) : (
              <>
                {/* 列表视图 */}
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 mt-4">加载中...</p>
                  </div>
                ) : restaurants.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">暂无餐厅数据</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                        餐厅名称
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                        负责人
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                        联系电话
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                        累计加注量
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                        状态
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                        操作
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                        位置
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.map((restaurant) => {
                      const showWarning = shouldShowWarning(restaurant.total_refilled)
                      const refilledPercentage = getRefilledPercentage(restaurant.total_refilled)

                      return (
                        <tr
                          key={restaurant.id}
                          className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-400" />
                              <span className="text-white font-medium">{restaurant.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-300">
                                {restaurant.contact_name || "未设置"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-300">
                                {restaurant.contact_phone || "未设置"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-[120px]">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-white font-medium">
                                    {restaurant.total_refilled.toFixed(1)} kg
                                  </span>
                                  {showWarning && (
                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      预警
                                    </Badge>
                                  )}
                                </div>
                                <Progress
                                  value={refilledPercentage}
                                  className={`h-2 ${
                                    showWarning ? "bg-red-500/20" : "bg-slate-800"
                                  }`}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              className={
                                restaurant.status === "activated"
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              }
                            >
                              {restaurant.status === "activated" ? "已激活" : "待激活"}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(restaurant)}
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                查看详情
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenAssignDialog(restaurant)}
                                className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                指派配送
                              </Button>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {restaurant.latitude && restaurant.longitude ? (
                              <div className="flex items-center gap-2 text-sm text-slate-300">
                                <MapPin className="h-4 w-4 text-blue-400" />
                                <span className="truncate max-w-[200px]">
                                  {restaurant.address || `${restaurant.latitude.toFixed(4)}, ${restaurant.longitude.toFixed(4)}`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-sm">未设置</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
          </div>

          {/* 右侧最新动态栏 */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm sticky top-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white">最新动态</CardTitle>
                    <CardDescription className="text-slate-400">实时订单流</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingOrders ? (
                  <div className="text-center py-8">
                    <div className="inline-block h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 mt-2 text-sm">加载中...</p>
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">暂无订单动态</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[800px] overflow-y-auto">
                    {recentOrders.map((order) => {
                      const isPending = order.status === "pending" || order.status === "待处理"
                      return (
                        <div
                          key={order.id}
                          className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            isPending 
                              ? getOrderStatusStyle(order.status) + " animate-pulse-subtle"
                              : "border-slate-700/50 bg-slate-800/50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Building2 className="h-4 w-4 text-blue-400" />
                                <span className="font-semibold text-white text-sm">
                                  {order.restaurant_name}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 ml-6">
                                {order.service_type}
                              </div>
                            </div>
                            <Badge
                              className={
                                isPending
                                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                  : order.status === "delivering" || order.status === "配送中"
                                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                    : "bg-green-500/20 text-green-400 border-green-500/30"
                              }
                            >
                              {isPending ? "待处理" : order.status === "delivering" || order.status === "配送中" ? "配送中" : "已完成"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <Clock className="h-3 w-3" />
                              {formatTime(order.created_at)}
                            </div>
                            {order.amount > 0 && (
                              <div className="text-sm font-semibold text-white">
                                ¥{order.amount.toFixed(2)}
                              </div>
                            )}
                          </div>
                          {order.worker_id && (
                            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              已指派工人
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 指派配送对话框 */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-white">指派配送</DialogTitle>
              <DialogDescription className="text-slate-400">
                为 {selectedRestaurant?.name} 指派配送工人
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  选择工人
                </label>
                <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="请选择工人" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {workers.map((worker) => (
                      <SelectItem
                        key={worker.id}
                        value={worker.id}
                        className="text-white hover:bg-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{worker.name}</span>
                          {worker.phone && (
                            <span className="text-slate-400 text-xs">({worker.phone})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-2">餐厅信息</div>
                <div className="text-white font-medium">{selectedRestaurant?.name}</div>
                {selectedRestaurant?.contact_name && (
                  <div className="text-slate-300 text-sm mt-1">
                    负责人: {selectedRestaurant.contact_name}
                  </div>
                )}
                {selectedRestaurant?.contact_phone && (
                  <div className="text-slate-300 text-sm mt-1">
                    电话: {selectedRestaurant.contact_phone}
                  </div>
                )}
                {selectedRestaurant?.address && (
                  <div className="text-slate-300 text-sm mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedRestaurant.address}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setIsAssignDialogOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  取消
                </Button>
                <Button
                  onClick={handleAssignDelivery}
                  disabled={!selectedWorkerId || isAssigning}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isAssigning ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      创建订单
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 详情弹窗 - 实时曲线图 */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-white">
                {selectedRestaurant?.name} - 实时监控
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                查看该餐厅的实时燃料曲线图
              </DialogDescription>
            </DialogHeader>

            {isLoadingFuelData ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 mt-4">加载燃料数据中...</p>
              </div>
            ) : fuelData.length === 0 ? (
              <div className="text-center py-12">
                <Gauge className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">该餐厅暂无燃料数据</p>
                <p className="text-slate-500 text-sm mt-2">
                  可能尚未安装设备或设备未开始工作
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 当前状态卡片 */}
                <Card className="bg-gradient-to-br from-blue-950/90 to-slate-900/90 border-blue-800/50">
                  <CardContent className="p-6">
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
                      <div className="flex items-center gap-2">
                        {isLocked ? (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            <Lock className="h-3 w-3 mr-1" />
                            已锁定
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <Activity className="h-3 w-3 mr-1 animate-pulse" />
                            在线
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm text-slate-300">当前剩余量</span>
                        <div className="text-right">
                          <span className="text-4xl font-bold text-white">
                            {currentFuelLevel.toFixed(1)}
                          </span>
                          <span className="text-xl text-slate-400 ml-1">%</span>
                        </div>
                      </div>
                      <Progress value={currentFuelLevel} className="h-3 bg-slate-800" />
                      <div className="flex justify-between mt-2">
                        <span className="text-xs text-slate-500">
                          约 {(currentFuelLevel * 5).toFixed(0)} kg
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 实时曲线图 */}
                <Card className="bg-slate-900/90 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">24小时燃料变化曲线</CardTitle>
                    <CardDescription className="text-slate-400">
                      实时监控燃料水平变化趋势
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={fuelData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                          dataKey="time"
                          stroke="#94a3b8"
                          style={{ fontSize: "12px" }}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          domain={[0, 100]}
                          style={{ fontSize: "12px" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="percentage"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: "#3b82f6", r: 4 }}
                          name="燃料水平 (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

