"use client"

// 高德地图安全密钥配置
if (typeof window !== 'undefined') {
  (window as any)._AMapSecurityConfig = {
    securityJsCode: 'ce1bde649b433cf6dbd4343190a6009a'
  }
}

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import {
  Bell,
  Home,
  Package,
  ShoppingCart,
  Users,
  Wrench,
  BarChart3,
  Settings,
  Menu,
  X,
  Search,
  AlertCircle,
  Flame,
  Zap,
  LogOut,
  Save,
  Lock,
  Unlock,
  MapPin,
  User,
  Truck,
  Building2,
  Phone,
  Eye,
  CheckCircle2,
  Clock,
  Activity,
  Gauge,
  Plus,
  Edit,
  Trash2,
  Link as LinkIcon,
  Server,
  Database,
  Play,
  Pause,
  DollarSign,
  TrendingUp,
  Loader2,
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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


// 数据类型定义
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

interface Worker {
  id: string
  name: string
  phone: string | null
}

interface Device {
  device_id: string
  restaurant_id: string | null
  model: string | null
  address: string | null
  installer: string | null
  install_date: string | null
  status: string
}

interface ApiConfig {
  id?: string
  name: string
  endpoint: string
  method: string
  description: string
  is_active: boolean
}

interface ServicePoint {
  id: string
  name: string
  township: string
  latitude: number
  longitude: number
  service_radius: number // 服务半径（公里）
  legal_entity: string // 法人主体
  status: string
  created_at: string
  workers?: string[] // 绑定的工人ID列表
}

const menuItems = [
  { icon: Home, label: "工作台", key: "dashboard" },
  { icon: Users, label: "餐厅管理", key: "restaurants" },
  { icon: Package, label: "订单管理", key: "orders" },
  { icon: Wrench, label: "设备监控", key: "devices" },
  { icon: Truck, label: "工人管理", key: "workers" },
  { icon: DollarSign, label: "燃料实时价格监控", key: "fuelPricing" },
  { icon: Server, label: "API配置", key: "api" },
  { icon: BarChart3, label: "数据统计", key: "analytics" },
  { icon: Settings, label: "系统设置", key: "settings" },
]

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeMenu, setActiveMenu] = useState("dashboard")
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([])
  const [servicePoints, setServicePoints] = useState<ServicePoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState(false)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "map">("list")
  const [newApiConfig, setNewApiConfig] = useState<ApiConfig>({
    name: "",
    endpoint: "",
    method: "POST",
    description: "",
    is_active: true,
  })
  const [isAddingApi, setIsAddingApi] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [selectedMarkerRestaurant, setSelectedMarkerRestaurant] = useState<Restaurant | null>(null)
  const [showServicePoints, setShowServicePoints] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  
  // 燃料价格相关状态
  interface FuelPrice {
    id: string
    name: string
    unit: string
    unitLabel: string
    basePrice: number
    marketPrice?: number // 市场价格（从第三方获取）
    lastUpdated?: string
    autoSync: boolean // 是否自动同步市场价格
  }
  const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([
    { id: "lpg", name: "液化气", unit: "kg", unitLabel: "公斤", basePrice: 11.5, autoSync: false },
    { id: "clean", name: "热能清洁燃料", unit: "L", unitLabel: "升", basePrice: 7.5, autoSync: false },
    { id: "alcohol", name: "醇基燃料", unit: "kg", unitLabel: "公斤", basePrice: 3.5, autoSync: false },
    { id: "outdoor", name: "户外环保燃料", unit: "kg", unitLabel: "公斤", basePrice: 6, autoSync: false },
  ])
  const [isSavingPrice, setIsSavingPrice] = useState(false)
  const [isSyncingPrice, setIsSyncingPrice] = useState(false)
  
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const infoWindowsRef = useRef<any[]>([])
  const serviceCirclesRef = useRef<any[]>([])
  const markerMapRef = useRef<Map<string, { marker: any; infoWindow: any }>>(new Map())
  const heatmapRef = useRef<any>(null)

  // 加载餐厅数据
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
        setRestaurants(data)
      }
    } catch (error) {
      console.error("[Admin Dashboard] 加载餐厅数据时出错:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 加载订单数据
  const loadRecentOrders = useCallback(async () => {
    if (!supabase) return

    try {
      setIsLoadingOrders(true)
      
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
        setOrders(formattedOrders)
      }
    } catch (error) {
      console.error("[Admin Dashboard] 加载订单时出错:", error)
    } finally {
      setIsLoadingOrders(false)
    }
  }, [])

  // 加载工人数据
  const loadWorkers = useCallback(async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from("workers")
        .select("id, name, phone")
        .order("name", { ascending: true })

      if (error) {
        console.error("[Admin Dashboard] 加载工人列表失败:", error)
        setWorkers([
          { id: "worker_001", name: "张师傅", phone: "13800138001" },
          { id: "worker_002", name: "李师傅", phone: "13800138002" },
          { id: "worker_003", name: "王师傅", phone: "13800138003" },
        ])
        return
      }

      if (data) {
        setWorkers(data)
      }
    } catch (error) {
      console.error("[Admin Dashboard] 加载工人列表失败:", error)
    }
  }, [])

  // 加载设备数据
  const loadDevices = useCallback(async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from("devices")
        .select("device_id, restaurant_id, model, address, installer, install_date, status")
        .order("install_date", { ascending: false })

      if (error) {
        console.error("[Admin Dashboard] 加载设备列表失败:", error)
        return
      }

      if (data) {
        setDevices(data)
      }
    } catch (error) {
      console.error("[Admin Dashboard] 加载设备列表失败:", error)
    }
  }, [])

  // 加载服务点数据
  const loadServicePoints = useCallback(async () => {
    if (!supabase) {
      // 如果Supabase未配置，使用模拟数据
      setServicePoints([
        {
          id: "sp_001",
          name: "五华区服务点",
          township: "五华区",
          latitude: 25.0389,
          longitude: 102.7183,
          service_radius: 15,
          legal_entity: "昆明市五华区燃料服务有限公司",
          status: "active",
          created_at: new Date().toISOString(),
          workers: [],
        },
        {
          id: "sp_002",
          name: "盘龙区服务点",
          township: "盘龙区",
          latitude: 25.0853,
          longitude: 102.7353,
          service_radius: 12,
          legal_entity: "昆明市盘龙区能源服务有限公司",
          status: "active",
          created_at: new Date().toISOString(),
          workers: [],
        },
      ])
      return
    }

    try {
      // 从service_points表加载，如果表不存在则使用模拟数据
      const { data, error } = await supabase
        .from("service_points")
        .select("id, name, township, latitude, longitude, service_radius, legal_entity, status, created_at")
        .order("created_at", { ascending: false })

      if (error) {
        // 如果表不存在，使用模拟数据
        console.warn("[Admin Dashboard] 服务点表不存在，使用模拟数据:", error)
        setServicePoints([
          {
            id: "sp_001",
            name: "五华区服务点",
            township: "五华区",
            latitude: 25.0389,
            longitude: 102.7183,
            service_radius: 15,
            legal_entity: "昆明市五华区燃料服务有限公司",
            status: "active",
            created_at: new Date().toISOString(),
            workers: [],
          },
          {
            id: "sp_002",
            name: "盘龙区服务点",
            township: "盘龙区",
            latitude: 25.0853,
            longitude: 102.7353,
            service_radius: 12,
            legal_entity: "昆明市盘龙区能源服务有限公司",
            status: "active",
            created_at: new Date().toISOString(),
            workers: [],
          },
        ])
        return
      }

      if (data) {
        setServicePoints(data)
      }
    } catch (error) {
      console.error("[Admin Dashboard] 加载服务点失败:", error)
      // 使用模拟数据作为后备
      setServicePoints([
        {
          id: "sp_001",
          name: "五华区服务点",
          township: "五华区",
          latitude: 25.0389,
          longitude: 102.7183,
          service_radius: 15,
          legal_entity: "昆明市五华区燃料服务有限公司",
          status: "active",
          created_at: new Date().toISOString(),
          workers: [],
        },
      ])
    }
  }, [])

  // 实时订阅
  useEffect(() => {
    loadRestaurants()
    loadWorkers()
    loadRecentOrders()
    loadDevices()
    loadServicePoints()

    if (supabase) {
      const channel = supabase
        .channel("admin_dashboard_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          (payload) => {
            console.log("[Admin Dashboard] 订单变化:", payload)
            loadRecentOrders()
            loadRestaurants()
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "restaurants",
          },
          (payload) => {
            console.log("[Admin Dashboard] 餐厅变化:", payload)
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
  }, [loadRestaurants, loadWorkers, loadRecentOrders, loadDevices, loadServicePoints])


  // 格式化时间
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

  // 创建自定义HTML标记
  const createMarkerHTML = (restaurant: Restaurant, hasActiveOrders: boolean) => {
    const isPending = restaurant.status === "pending" || restaurant.status === "待激活"
    const isActivated = restaurant.status === "activated" || restaurant.status === "已激活"
    
    // 夜晚城市灯光效果：温暖的橙黄色系
    // 待激活：较暗的橙黄色（类似小城市灯光）
    // 已激活且有实时订单：明亮的金黄色+扩散光圈（类似大城市灯光）
    // 已激活但无订单：标准橙黄色（类似中等城市灯光）
    let markerColor = "rgb(255, 200, 50)" // 标准橙黄色 - 夜晚城市灯光
    let markerGlowColor = "rgba(255, 200, 50, 0.8)" // 发光颜色
    let markerClass = "marker-pulse"
    
    if (isPending) {
      markerColor = "rgb(255, 165, 80)" // 较暗的橙黄色 - 小城市灯光
      markerGlowColor = "rgba(255, 165, 80, 0.6)"
    } else if (isActivated && hasActiveOrders) {
      markerColor = "rgb(255, 255, 100)" // 明亮的金黄色 - 大城市灯光
      markerGlowColor = "rgba(255, 255, 100, 0.9)"
      markerClass = "marker-pulse marker-ripple"
    } else {
      markerGlowColor = "rgba(255, 200, 50, 0.8)"
    }

    return `
      <div class="custom-marker-wrapper" style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        ${isActivated && hasActiveOrders ? `
          <div class="marker-ripple" style="position: absolute; width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${markerColor}; opacity: 0.6; animation: marker-ripple 2s ease-out infinite;"></div>
        ` : ''}
        <div class="${markerClass}" style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: radial-gradient(circle, ${markerColor} 0%, ${markerColor}dd 50%, ${markerColor}aa 100%);
          box-shadow: 0 0 20px ${markerGlowColor}, 0 0 40px ${markerGlowColor}, 0 0 60px ${markerGlowColor}60;
          position: relative;
          z-index: 10;
          animation: marker-pulse 2s ease-in-out infinite;
        "></div>
      </div>
    `
  }

  // 计算餐厅坐标的中心点和合适的缩放级别
  const calculateMapCenterAndZoom = useCallback(() => {
    const restaurantsWithLocation = restaurants.filter(
      (r) => r.latitude && r.longitude && 
      typeof r.latitude === 'number' && typeof r.longitude === 'number' &&
      !isNaN(r.latitude) && !isNaN(r.longitude)
    )

    if (restaurantsWithLocation.length === 0) {
      // 如果没有餐厅数据，返回默认的昆明中心
      return {
        center: [102.7183, 25.0389] as [number, number],
        zoom: 12
      }
    }

    // 如果只有一个餐厅，直接使用该餐厅的坐标
    if (restaurantsWithLocation.length === 1) {
      const firstRestaurant = restaurantsWithLocation[0]
      console.log('[Map] 只有一个餐厅，聚焦到:', { 
        center: [firstRestaurant.longitude!, firstRestaurant.latitude!], 
        zoom: 15,
        restaurant: firstRestaurant.name 
      })
      return {
        center: [firstRestaurant.longitude!, firstRestaurant.latitude!] as [number, number],
        zoom: 15
      }
    }

    // 计算所有餐厅坐标的边界
    const lngs = restaurantsWithLocation.map((r) => r.longitude!)
    const lats = restaurantsWithLocation.map((r) => r.latitude!)
    
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    // 计算经纬度范围
    const lngDiff = maxLng - minLng
    const latDiff = maxLat - minLat
    const maxDiff = Math.max(lngDiff, latDiff)

    // 如果所有餐厅都在同一个位置（范围非常小），使用第一个餐厅的坐标
    if (maxDiff < 0.0001) {
      const firstRestaurant = restaurantsWithLocation[0]
      console.log('[Map] 所有餐厅位置相同，聚焦到第一个餐厅:', { 
        center: [firstRestaurant.longitude!, firstRestaurant.latitude!], 
        zoom: 15,
        restaurant: firstRestaurant.name 
      })
      return {
        center: [firstRestaurant.longitude!, firstRestaurant.latitude!] as [number, number],
        zoom: 15
      }
    }

    // 计算中心点（多个餐厅的平均位置）
    const centerLng = (minLng + maxLng) / 2
    const centerLat = (minLat + maxLat) / 2

    // 计算合适的缩放级别
    // 根据经纬度范围计算缩放级别
    let zoom = 12 // 默认缩放级别
    if (maxDiff > 0.5) {
      zoom = 8 // 范围很大，缩小视图
    } else if (maxDiff > 0.2) {
      zoom = 10
    } else if (maxDiff > 0.1) {
      zoom = 11
    } else if (maxDiff > 0.05) {
      zoom = 12
    } else if (maxDiff > 0.02) {
      zoom = 13
    } else if (maxDiff > 0.01) {
      zoom = 14
    } else {
      zoom = 15 // 范围很小，放大视图
    }

    console.log('[Map] 计算地图中心点（多个餐厅）:', { 
      center: [centerLng, centerLat], 
      zoom, 
      restaurantCount: restaurantsWithLocation.length,
      range: { lngDiff, latDiff, maxDiff }
    })

    return {
      center: [centerLng, centerLat] as [number, number],
      zoom
    }
  }, [restaurants])

  // 清理地图实例
  const destroyMap = useCallback(() => {
    // 确保只在客户端环境中执行
    if (typeof window === 'undefined') {
      return
    }

    if (mapInstanceRef.current) {
      try {
        // 清除所有标记
        markersRef.current.forEach(marker => {
          try {
            mapInstanceRef.current.remove(marker)
            marker.setMap(null)
          } catch (e) {
            console.warn('[Map] 清除标记时出错:', e)
          }
        })
        markersRef.current = []

        // 清除所有信息窗口
        infoWindowsRef.current.forEach(infoWindow => {
          try {
            mapInstanceRef.current.remove(infoWindow)
            infoWindow.close()
          } catch (e) {
            console.warn('[Map] 清除信息窗口时出错:', e)
          }
        })
        infoWindowsRef.current = []

        // 清除所有服务点圆圈
        serviceCirclesRef.current.forEach(circle => {
          try {
            mapInstanceRef.current.remove(circle)
            circle.setMap(null)
          } catch (e) {
            console.warn('[Map] 清除服务点圆圈时出错:', e)
          }
        })
        serviceCirclesRef.current = []

        // 销毁地图实例
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
        console.log('[Map] 地图实例已销毁')
      } catch (error) {
        console.error('[Map] 销毁地图实例时出错:', error)
      }
    }
    setMapLoaded(false)
  }, [])


  // 更新地图标记
  const updateMarkers = useCallback(() => {
    if (!mapInstanceRef.current) return

    const map = mapInstanceRef.current
    const AMap = (window as any).AMap
    if (!AMap) return

    // 清除现有标记
    markersRef.current.forEach(marker => {
      map.remove(marker)
    })
    markersRef.current = []

    infoWindowsRef.current.forEach(infoWindow => {
      map.remove(infoWindow)
    })
    infoWindowsRef.current = []

    // 清除标记映射
    markerMapRef.current.clear()

        // 清除现有服务点圆圈
        serviceCirclesRef.current.forEach(circle => {
          map.remove(circle)
        })
        serviceCirclesRef.current = []

        // 清除现有热力图
        if (heatmapRef.current) {
          try {
            map.remove(heatmapRef.current)
            heatmapRef.current.setMap(null)
            heatmapRef.current = null
          } catch (e) {
            console.warn('[Map] 清除热力图时出错:', e)
          }
        }

    // 根据热力图状态决定显示方式
    if (showHeatmap) {
      // 显示热力图模式
      const restaurantsWithLocation = restaurants.filter(
        r => r.latitude && r.longitude && 
        typeof r.latitude === 'number' && typeof r.longitude === 'number' &&
        !isNaN(r.latitude) && !isNaN(r.longitude)
      )

      if (restaurantsWithLocation.length > 0) {
        // 准备热力图数据
        const heatmapData = restaurantsWithLocation.map(restaurant => ({
          lng: restaurant.longitude!,
          lat: restaurant.latitude!,
          count: 1, // 每个餐厅的权重
        }))

        // 创建热力图
        if (!heatmapRef.current) {
          heatmapRef.current = new AMap.Heatmap(map, {
            radius: 25, // 热力点半径
            opacity: [0, 0.8], // 透明度范围
            gradient: {
              0.4: 'blue',    // 低密度区域 - 蓝色
              0.6: 'cyan',    // 中低密度 - 青色
              0.7: 'lime',    // 中密度 - 黄绿色
              0.8: 'yellow',  // 中高密度 - 黄色
              1.0: 'red'      // 高密度区域 - 红色
            },
            zIndex: 100,
          })
        }

        // 设置热力图数据
        heatmapRef.current.setDataSet({
          data: heatmapData,
          max: 100, // 最大权重值
        })

        map.add(heatmapRef.current)
        console.log('[Map] 热力图已创建，餐厅数量:', restaurantsWithLocation.length)
      }
    } else {
      // 显示标记模式
      // 获取有实时订单的餐厅ID列表
      const activeOrderRestaurantIds = new Set(
        orders
          .filter(o => o.status === "pending" || o.status === "待处理" || o.status === "delivering" || o.status === "配送中")
          .map(o => o.restaurant_id)
      )

      // 为每个餐厅创建标记
      restaurants.forEach(restaurant => {
        if (!restaurant.latitude || !restaurant.longitude) return

        const hasActiveOrders = activeOrderRestaurantIds.has(restaurant.id)
        const markerHTML = createMarkerHTML(restaurant, hasActiveOrders)

        // 创建HTML标记
        const marker = new AMap.Marker({
          position: [restaurant.longitude, restaurant.latitude],
          content: markerHTML,
          offset: new AMap.Pixel(-20, -20),
          zIndex: 100,
        })

        // 创建信息窗口
        const infoWindow = new AMap.InfoWindow({
        content: `
          <div style="
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 58, 138, 0.95));
            border: 1px solid rgba(59, 130, 246, 0.5);
            border-radius: 12px;
            padding: 16px;
            min-width: 250px;
            color: white;
            font-family: system-ui, -apple-system, sans-serif;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          ">
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #60a5fa;">
              ${restaurant.name}
            </div>
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">
              <strong>QR Token:</strong> <span style="color: #cbd5e1;">${restaurant.qr_token || '未设置'}</span>
            </div>
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">
              <strong>累计加注量:</strong> <span style="color: #34d399;">${restaurant.total_refilled || 0}L</span>
            </div>
            <div style="font-size: 12px; color: #94a3b8;">
              <strong>状态:</strong> 
              <span style="color: ${restaurant.status === 'activated' || restaurant.status === '已激活' ? '#34d399' : '#fbbf24'};">
                ${restaurant.status === 'activated' || restaurant.status === '已激活' ? '已激活' : '待激活'}
              </span>
            </div>
          </div>
        `,
          offset: new AMap.Pixel(0, -30),
          closeWhenClickMap: true,
        })

        // 点击标记显示信息窗口
        marker.on('click', () => {
          infoWindow.open(map, marker.getPosition())
          setSelectedMarkerRestaurant(restaurant)
        })

        // 双击标记平滑追踪到该餐厅并放大到最大视图
        marker.on('dblclick', () => {
          const position = marker.getPosition()
          if (position) {
            // 使用 setZoomAndCenter 实现平滑动画
            // 参数：缩放级别、中心点、是否立即执行、动画时长（毫秒）
            map.setZoomAndCenter(18, position, false, 1000)
            console.log('[Map] 双击追踪到餐厅:', restaurant.name, '位置:', position)
          }
        })

        map.add(marker)
        markersRef.current.push(marker)
        infoWindowsRef.current.push(infoWindow)
        
        // 存储标记和信息窗口的映射关系，用于定位功能
        markerMapRef.current.set(restaurant.id, { marker, infoWindow })
      })
    }

    // 根据状态决定是否绘制服务点范围圆圈
    if (showServicePoints) {
      servicePoints.forEach(servicePoint => {
        if (!servicePoint.latitude || !servicePoint.longitude || !servicePoint.service_radius) return

        // 将服务半径从公里转换为米
        const radiusInMeters = servicePoint.service_radius * 1000

        // 创建半透明的服务范围圆圈
        const circle = new AMap.Circle({
          center: [servicePoint.longitude, servicePoint.latitude],
          radius: radiusInMeters,
          fillColor: '#3b82f6', // 蓝色填充
          fillOpacity: 0.2, // 半透明
          strokeColor: '#60a5fa', // 蓝色边框
          strokeOpacity: 0.6,
          strokeWeight: 2,
          strokeStyle: 'solid',
          zIndex: 50, // 在标记下方
        })

        map.add(circle)
        serviceCirclesRef.current.push(circle)
      })
    }
  }, [restaurants, orders, servicePoints, showServicePoints, showHeatmap])

  // 初始化地图
  const initMap = useCallback(async () => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY || '21556e22648ec56beda3e6148a22937c'
    if (!amapKey) {
      console.error('[Map] AMAP_KEY未配置')
      setMapLoaded(true)
      return
    }

    // 确保安全密钥已配置
    if (typeof window !== 'undefined' && !(window as any)._AMapSecurityConfig) {
      (window as any)._AMapSecurityConfig = {
        securityJsCode: 'ce1bde649b433cf6dbd4343190a6009a'
      }
    }

    try {
      console.log('[Map] 开始初始化地图，容器:', mapContainerRef.current)
      
      // 计算地图中心点和缩放级别
      const { center, zoom } = calculateMapCenterAndZoom()
      
      // 动态加载高德地图JS API
      const script = document.createElement('script')
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&callback=initAMapCallback`
      script.async = true
      
      // 创建全局回调函数
      ;(window as any).initAMapCallback = () => {
        const AMap = (window as any).AMap
        if (!AMap) {
          console.error('[Map] AMap未加载')
          setMapLoaded(true)
          return
        }

        if (!mapContainerRef.current) {
          console.error('[Map] 地图容器不存在')
          setMapLoaded(true)
          return
        }

        console.log('[Map] 创建地图实例，中心点:', center, '缩放级别:', zoom)
        // 创建地图实例，使用计算出的中心点和缩放级别
        const map = new AMap.Map(mapContainerRef.current, {
          mapStyle: 'amap://styles/darkblue',
          center: center,
          zoom: zoom,
          viewMode: '3D',
        })

        mapInstanceRef.current = map

        // 地图加载完成
        map.on('complete', () => {
          console.log('[Map] 地图加载完成')
          setMapLoaded(true)
        })

        // 如果地图已经加载完成
        if (map.getStatus() === 'complete') {
          console.log('[Map] 地图已加载完成（快速路径）')
          setMapLoaded(true)
        }
      }

      script.onerror = () => {
        console.error('[Map] 地图脚本加载失败')
        setMapLoaded(true)
      }

      document.head.appendChild(script)
    } catch (error) {
      console.error('[Map] 初始化地图失败:', error)
      setMapLoaded(true)
    }
  }, [calculateMapCenterAndZoom])

  // 地图初始化Effect
  useEffect(() => {
    if (activeMenu === 'dashboard' && mapContainerRef.current && !mapInstanceRef.current) {
      initMap()
    }
  }, [activeMenu, initMap])

  // 组件卸载时清理地图
  useEffect(() => {
    return () => {
      destroyMap()
    }
  }, [destroyMap])

  // 当餐厅、订单、服务点数据或显示状态更新时，更新标记和范围
  useEffect(() => {
    if (mapInstanceRef.current && mapLoaded) {
      console.log('[Map] 更新标记，餐厅数量:', restaurants.length, '订单数量:', orders.length, '服务点数量:', servicePoints.length, '显示服务点:', showServicePoints, '显示热力图:', showHeatmap)
      updateMarkers()
    }
  }, [restaurants, orders, servicePoints, showServicePoints, showHeatmap, mapLoaded, updateMarkers])

  // 获取订单状态样式
  const getOrderStatusStyle = (status: string) => {
    if (status === "pending" || status === "待处理") {
      return "border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/30"
    } else if (status === "delivering" || status === "配送中" || status === "进行中") {
      return "border-yellow-500/50 bg-yellow-500/10 shadow-lg shadow-yellow-500/30"
    } else if (status === "completed" || status === "已完成") {
      return "border-green-500/50 bg-green-500/10"
    }
    return "border-slate-700/50 bg-slate-800/50"
  }

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
          amount: 0,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "创建订单失败")
      }

      alert("订单创建成功！")
      setIsAssignDialogOpen(false)
      setSelectedWorkerId("")
      loadRecentOrders()
    } catch (error: any) {
      console.error("[Admin Dashboard] 创建订单失败:", error)
      alert("创建订单失败: " + (error.message || "未知错误"))
    } finally {
      setIsAssigning(false)
    }
  }

  const handleOpenAssignDialog = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setIsAssignDialogOpen(true)
    setSelectedWorkerId("")
  }

  const handleViewDetails = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setIsDetailDialogOpen(true)
  }

  // 定位到餐厅位置
  const handleLocateRestaurant = (restaurant: Restaurant) => {
    if (!restaurant.latitude || !restaurant.longitude) {
      alert('该餐厅没有位置信息')
      return
    }

    if (!mapInstanceRef.current) {
      alert('地图未加载，请稍候再试')
      return
    }

    const map = mapInstanceRef.current
    const AMap = (window as any).AMap
    if (!AMap) {
      alert('地图未初始化')
      return
    }

    // 切换到工作台视图以显示地图
    if (activeMenu !== 'dashboard') {
      setActiveMenu('dashboard')
      // 等待地图加载完成后再执行定位
      setTimeout(() => {
        locateToRestaurant(restaurant, map, AMap)
      }, 500)
    } else {
      locateToRestaurant(restaurant, map, AMap)
    }
  }

  // 执行定位逻辑
  const locateToRestaurant = (restaurant: Restaurant, map: any, AMap: any) => {
    const position: [number, number] = [restaurant.longitude!, restaurant.latitude!]
    
    // 使用 setFitView 平滑移动到该位置并调整视野
    map.setFitView(
      [new AMap.Marker({ position })],
      false,
      [50, 50, 50, 50], // 边距
      1000 // 动画时长（毫秒）
    )

    // 延迟打开信息窗口，等待动画完成
    setTimeout(() => {
      // 查找对应的标记和信息窗口
      const markerInfo = markerMapRef.current.get(restaurant.id)
      if (markerInfo) {
        markerInfo.infoWindow.open(map, position)
        setSelectedMarkerRestaurant(restaurant)
      } else {
        // 如果找不到，创建一个临时的信息窗口
        const tempInfoWindow = new AMap.InfoWindow({
          content: `
            <div style="
              background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 58, 138, 0.95));
              border: 1px solid rgba(59, 130, 246, 0.5);
              border-radius: 12px;
              padding: 16px;
              min-width: 250px;
              color: white;
              font-family: system-ui, -apple-system, sans-serif;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            ">
              <div style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #60a5fa;">
                ${restaurant.name}
              </div>
              <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">
                <strong>QR Token:</strong> <span style="color: #cbd5e1;">${restaurant.qr_token || '未设置'}</span>
              </div>
              <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">
                <strong>累计加注量:</strong> <span style="color: #34d399;">${restaurant.total_refilled || 0}L</span>
              </div>
              <div style="font-size: 12px; color: #94a3b8;">
                <strong>状态:</strong> 
                <span style="color: ${restaurant.status === 'activated' || restaurant.status === '已激活' ? '#34d399' : '#fbbf24'};">
                  ${restaurant.status === 'activated' || restaurant.status === '已激活' ? '已激活' : '待激活'}
                </span>
              </div>
            </div>
          `,
          offset: new AMap.Pixel(0, -30),
          closeWhenClickMap: true,
        })
        tempInfoWindow.open(map, position)
        setSelectedMarkerRestaurant(restaurant)
      }
    }, 1100) // 等待动画完成后再打开信息窗口
  }

  // 渲染餐厅管理
  const renderRestaurants = () => {
    const shouldShowWarning = (totalRefilled: number) => {
      return totalRefilled < 50
    }

    const getRefilledPercentage = (totalRefilled: number) => {
      return Math.min(100, (totalRefilled / 100) * 100)
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">餐厅管理</h1>
            <p className="text-slate-400">管理所有已注册餐厅的信息和状态</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
            >
              {viewMode === "list" ? <MapPin className="h-4 w-4 mr-2" /> : <Users className="h-4 w-4 mr-2" />}
              {viewMode === "list" ? "地图视图" : "列表视图"}
            </Button>
          </div>
        </div>

        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardContent className="p-6">
            {viewMode === "map" ? (
              <div className="h-[600px] rounded-lg overflow-hidden border border-slate-800">
                {restaurants.filter((r) => r.latitude && r.longitude).length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">暂无餐厅位置信息</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800/50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">餐厅名称</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">负责人</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">联系电话</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">累计加注量</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">状态</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.map((restaurant) => {
                      const showWarning = shouldShowWarning(restaurant.total_refilled)
                      const refilledPercentage = getRefilledPercentage(restaurant.total_refilled)
                      return (
                        <tr
                          key={restaurant.id}
                          className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
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
                              <span className="text-slate-300">{restaurant.contact_name || "未设置"}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-300">{restaurant.contact_phone || "未设置"}</span>
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
                                  className={`h-2 ${showWarning ? "bg-red-500/20" : "bg-slate-800"}`}
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
                                onClick={() => handleLocateRestaurant(restaurant)}
                                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                                disabled={!restaurant.latitude || !restaurant.longitude}
                                title={!restaurant.latitude || !restaurant.longitude ? "该餐厅没有位置信息" : "在地图上定位该餐厅"}
                              >
                                <MapPin className="h-4 w-4 mr-1" />
                                定位
                              </Button>
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
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // 渲染工作台
  const renderDashboard = () => {
    const stats = {
      totalRestaurants: restaurants.length,
      activatedRestaurants: restaurants.filter((r) => r.status === "activated").length,
      pendingOrders: orders.filter((o) => o.status === "pending" || o.status === "待处理").length,
      totalRevenue: orders.reduce((sum, o) => sum + (o.amount || 0), 0),
    }

    return (
      <div className="space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">总餐厅数</CardDescription>
              <CardTitle className="text-3xl text-white">{stats.totalRestaurants}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">已激活</CardDescription>
              <CardTitle className="text-3xl text-white">{stats.activatedRestaurants}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">待处理订单</CardDescription>
              <CardTitle className="text-3xl text-yellow-400">{stats.pendingOrders}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">总营收</CardDescription>
              <CardTitle className="text-3xl text-green-400">¥{stats.totalRevenue.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 最新订单 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">最新订单</CardTitle>
            <CardDescription className="text-slate-400">实时订单动态</CardDescription>
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
                <p className="text-slate-400 text-sm">暂无订单</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order) => {
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
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 实时地图看板 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-cyan-400" />
                  实时地图看板
                </CardTitle>
                <CardDescription className="text-slate-400">餐厅位置分布与状态监控</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  variant={showHeatmap ? "default" : "outline"}
                  className={showHeatmap 
                    ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" 
                    : "border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                  }
                  title={showHeatmap ? "切换到标记视图" : "切换到热力图视图"}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  热力图
                </Button>
                <Button
                  onClick={() => setShowServicePoints(!showServicePoints)}
                  variant={showServicePoints ? "default" : "outline"}
                  className={showServicePoints 
                    ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500" 
                    : "border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  }
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  服务网点
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              ref={mapContainerRef} 
              className="w-full h-[600px] rounded-lg overflow-hidden border border-blue-800/30 relative"
              style={{ width: '100%', height: '600px', minHeight: '600px' }}
            >
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-30">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-slate-400 text-sm">加载地图中...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 渲染订单管理
  const renderOrders = () => {
    const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "待处理")
    const deliveringOrders = orders.filter((o) => o.status === "delivering" || o.status === "配送中" || o.status === "进行中")
    const completedOrders = orders.filter((o) => o.status === "completed" || o.status === "已完成")

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">订单管理</h1>
          <p className="text-slate-400">管理所有订单和配送状态</p>
        </div>

        {/* 订单统计 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">总订单数</CardDescription>
              <CardTitle className="text-3xl text-white">{orders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">待处理</CardDescription>
              <CardTitle className="text-3xl text-yellow-400">{pendingOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">配送中</CardDescription>
              <CardTitle className="text-3xl text-blue-400">{deliveringOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">已完成</CardDescription>
              <CardTitle className="text-3xl text-green-400">{completedOrders.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 订单列表 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">所有订单</CardTitle>
            <CardDescription className="text-slate-400">实时订单列表</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="text-center py-8">
                <div className="inline-block h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 mt-2 text-sm">加载中...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">暂无订单</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
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
                            <span className="font-semibold text-white">{order.restaurant_name}</span>
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                              {order.id.slice(0, 8)}
                            </Badge>
                          </div>
                          <div className="text-sm text-slate-400 ml-6">{order.service_type}</div>
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
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(order.created_at)}
                          </div>
                          {order.worker_id && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              已指派工人
                            </div>
                          )}
                        </div>
                        <div className="text-lg font-semibold text-white">
                          ¥{order.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // 渲染设备监控
  const renderDevices = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">设备监控</h1>
          <p className="text-slate-400">管理IoT设备和传感器数据</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {devices.map((device) => (
            <Card key={device.device_id} className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
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
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <Wrench className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">暂无设备</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // 渲染工人管理
  const renderWorkers = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">工人管理</h1>
            <p className="text-slate-400">管理配送工人信息</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700">
            <Plus className="h-4 w-4 mr-2" />
            添加工人
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workers.map((worker) => (
            <Card key={worker.id} className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white">{worker.name}</CardTitle>
                      <CardDescription className="text-slate-400">工人ID: {worker.id}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {worker.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Phone className="h-4 w-4" />
                      {worker.phone}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1 border-blue-500/50 text-blue-400 hover:bg-blue-500/10">
                      <Edit className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {workers.length === 0 && (
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">暂无工人</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // 加载API配置
  useEffect(() => {
    const saved = localStorage.getItem("apiConfigs")
    if (saved) {
      try {
        setApiConfigs(JSON.parse(saved))
      } catch (e) {
        console.error("加载API配置失败:", e)
      }
    }
  }, [])

  // 处理添加API
  const handleAddApi = async () => {
    if (!newApiConfig.name || !newApiConfig.endpoint) {
      alert("请填写API名称和端点")
      return
    }

    setIsAddingApi(true)
    try {
      // 这里可以保存到数据库或localStorage
      const configs = [...apiConfigs, { ...newApiConfig, id: Date.now().toString() }]
      setApiConfigs(configs)
      localStorage.setItem("apiConfigs", JSON.stringify(configs))
      setNewApiConfig({ name: "", endpoint: "", method: "POST", description: "", is_active: true })
      alert("API配置已添加")
    } catch (error) {
      console.error("添加API配置失败:", error)
      alert("添加失败")
    } finally {
      setIsAddingApi(false)
    }
  }

  // 渲染API配置
  const renderApiConfig = () => {

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">API接口配置</h1>
          <p className="text-slate-400">配置物联网数据传输API接口</p>
        </div>

        {/* 添加API配置 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">添加API接口</CardTitle>
            <CardDescription className="text-slate-400">配置新的API端点用于数据传输</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 mb-2 block">API名称</Label>
                <Input
                  value={newApiConfig.name}
                  onChange={(e) => setNewApiConfig({ ...newApiConfig, name: e.target.value })}
                  placeholder="例如: 燃料传感器API"
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">请求方法</Label>
                <Select
                  value={newApiConfig.method}
                  onValueChange={(value) => setNewApiConfig({ ...newApiConfig, method: value })}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">API端点URL</Label>
              <Input
                value={newApiConfig.endpoint}
                onChange={(e) => setNewApiConfig({ ...newApiConfig, endpoint: e.target.value })}
                placeholder="https://api.example.com/fuel-sensor"
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">描述</Label>
              <Textarea
                value={newApiConfig.description}
                onChange={(e) => setNewApiConfig({ ...newApiConfig, description: e.target.value })}
                placeholder="API接口的用途和说明"
                className="bg-slate-800/50 border-slate-700 text-white"
                rows={3}
              />
            </div>
            <Button
              onClick={handleAddApi}
              disabled={isAddingApi}
              className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
            >
              {isAddingApi ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  添加中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  添加API接口
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* API配置列表 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">已配置的API接口</CardTitle>
            <CardDescription className="text-slate-400">管理所有API接口配置</CardDescription>
          </CardHeader>
          <CardContent>
            {apiConfigs.length === 0 ? (
              <div className="text-center py-8">
                <Server className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">暂无API配置</p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiConfigs.map((config) => (
                  <div
                    key={config.id}
                    className="p-4 rounded-xl border-2 border-slate-700/50 bg-slate-800/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <LinkIcon className="h-4 w-4 text-blue-400" />
                          <span className="font-semibold text-white">{config.name}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              config.is_active
                                ? "border-green-500/30 text-green-400 bg-green-500/10"
                                : "border-slate-600 text-slate-400"
                            }`}
                          >
                            {config.is_active ? "启用" : "禁用"}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-400 ml-6">
                          <span className="font-mono">{config.method}</span> {config.endpoint}
                        </div>
                        {config.description && (
                          <div className="text-xs text-slate-500 ml-6 mt-1">{config.description}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // 渲染数据统计
  const renderAnalytics = () => {
    const chartData = orders
      .filter((o) => o.created_at)
      .map((o) => {
        const date = new Date(o.created_at)
        return {
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          amount: o.amount || 0,
        }
      })
      .slice(0, 30)

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">数据统计</h1>
          <p className="text-slate-400">业务数据分析和图表</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">订单趋势</CardTitle>
              <CardDescription className="text-slate-400">最近30天订单金额趋势</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="订单金额"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">订单状态分布</CardTitle>
              <CardDescription className="text-slate-400">订单状态统计</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">待处理</span>
                  <span className="text-yellow-400 font-semibold">
                    {orders.filter((o) => o.status === "pending" || o.status === "待处理").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">配送中</span>
                  <span className="text-blue-400 font-semibold">
                    {orders.filter((o) => o.status === "delivering" || o.status === "配送中").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">已完成</span>
                  <span className="text-green-400 font-semibold">
                    {orders.filter((o) => o.status === "completed" || o.status === "已完成").length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 保存燃料价格
  const handleSaveFuelPrice = async (fuelId: string, newPrice: number) => {
    setIsSavingPrice(true)
    try {
      // 更新本地状态
      setFuelPrices(prev => prev.map(fuel => 
        fuel.id === fuelId 
          ? { ...fuel, basePrice: newPrice, lastUpdated: new Date().toISOString() }
          : fuel
      ))
      
      // TODO: 保存到数据库
      // if (supabase) {
      //   await supabase.from('fuel_prices').upsert({
      //     fuel_id: fuelId,
      //     base_price: newPrice,
      //     updated_at: new Date().toISOString()
      //   })
      // }
      
      console.log('[Fuel Pricing] 价格已更新:', fuelId, newPrice)
      alert('价格已保存')
    } catch (error) {
      console.error('[Fuel Pricing] 保存价格失败:', error)
      alert('保存失败，请重试')
    } finally {
      setIsSavingPrice(false)
    }
  }

  // 同步第三方市场价格
  const handleSyncMarketPrice = async () => {
    setIsSyncingPrice(true)
    try {
      // TODO: 调用第三方API获取市场价格
      // const response = await fetch('/api/fuel-pricing/sync-market-price')
      // const data = await response.json()
      
      // 模拟数据
      const mockMarketPrices = {
        lpg: 11.8,
        clean: 7.8,
        alcohol: 3.6,
        outdoor: 6.2,
      }
      
      // 更新市场价格
      setFuelPrices(prev => prev.map(fuel => {
        const marketPrice = mockMarketPrices[fuel.id as keyof typeof mockMarketPrices]
        if (marketPrice && fuel.autoSync) {
          return {
            ...fuel,
            marketPrice,
            basePrice: marketPrice, // 如果启用自动同步，则更新基础价格
            lastUpdated: new Date().toISOString()
          }
        }
        return {
          ...fuel,
          marketPrice,
          lastUpdated: new Date().toISOString()
        }
      }))
      
      console.log('[Fuel Pricing] 市场价格已同步')
      alert('市场价格已同步')
    } catch (error) {
      console.error('[Fuel Pricing] 同步市场价格失败:', error)
      alert('同步失败，请重试')
    } finally {
      setIsSyncingPrice(false)
    }
  }

  // 切换自动同步
  const handleToggleAutoSync = (fuelId: string) => {
    setFuelPrices(prev => prev.map(fuel => 
      fuel.id === fuelId 
        ? { ...fuel, autoSync: !fuel.autoSync }
        : fuel
    ))
  }

  // 渲染燃料实时价格监控
  const renderFuelPricing = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">燃料实时价格监控</h1>
            <p className="text-slate-400">管理燃料类型价格，支持第三方市场价格自动同步</p>
          </div>
          <Button
            onClick={handleSyncMarketPrice}
            disabled={isSyncingPrice}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSyncingPrice ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                同步中...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                同步市场价格
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fuelPrices.map((fuel) => {
            const priceDiff = fuel.marketPrice 
              ? ((fuel.basePrice - fuel.marketPrice) / fuel.marketPrice * 100).toFixed(2)
              : null
            const isPriceHigher = priceDiff ? parseFloat(priceDiff) > 0 : false

            return (
              <Card 
                key={fuel.id}
                className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">{fuel.name}</CardTitle>
                      <CardDescription className="text-slate-400">
                        单位：{fuel.unitLabel} ({fuel.unit})
                      </CardDescription>
                    </div>
                    <Badge
                      className={
                        fuel.autoSync
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                      }
                    >
                      {fuel.autoSync ? "自动同步" : "手动管理"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 当前价格 */}
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <Label className="text-slate-400 text-sm mb-2 block">当前价格</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        step="0.1"
                        value={fuel.basePrice}
                        onChange={(e) => {
                          const newPrice = parseFloat(e.target.value)
                          if (!isNaN(newPrice) && newPrice >= 0) {
                            setFuelPrices(prev => prev.map(f => 
                              f.id === fuel.id ? { ...f, basePrice: newPrice } : f
                            ))
                          }
                        }}
                        className="flex-1 bg-slate-900 border-slate-700 text-white"
                      />
                      <span className="text-white font-medium">元/{fuel.unitLabel}</span>
                    </div>
                  </div>

                  {/* 市场价格 */}
                  {fuel.marketPrice && (
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-slate-400 text-sm">市场价格</Label>
                        {priceDiff && (
                          <Badge
                            className={
                              isPriceHigher
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : "bg-green-500/20 text-green-400 border-green-500/30"
                            }
                          >
                            {isPriceHigher ? '↑' : '↓'} {Math.abs(parseFloat(priceDiff))}%
                          </Badge>
                        )}
                      </div>
                      <div className="text-white font-semibold text-lg">
                        ¥{fuel.marketPrice.toFixed(2)}/{fuel.unitLabel}
                      </div>
                      {fuel.lastUpdated && (
                        <div className="text-xs text-slate-500 mt-1">
                          更新时间: {new Date(fuel.lastUpdated).toLocaleString('zh-CN')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSaveFuelPrice(fuel.id, fuel.basePrice)}
                      disabled={isSavingPrice}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {isSavingPrice ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          保存价格
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleToggleAutoSync(fuel.id)}
                      variant={fuel.autoSync ? "default" : "outline"}
                      className={
                        fuel.autoSync
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "border-green-500/50 text-green-400 hover:bg-green-500/10"
                      }
                    >
                      {fuel.autoSync ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          已启用
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          启用自动同步
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 说明卡片 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-400" />
              功能说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-slate-300 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5"></div>
                <div>
                  <strong className="text-white">手动调整价格：</strong>
                  直接修改价格输入框中的数值，点击"保存价格"按钮即可更新。
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5"></div>
                <div>
                  <strong className="text-white">自动同步价格：</strong>
                  启用"自动同步"后，系统将定期从第三方报价平台获取最新市场价格并自动更新。
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5"></div>
                <div>
                  <strong className="text-white">市场价格对比：</strong>
                  显示当前价格与市场价格的差异百分比，帮助您及时调整定价策略。
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5"></div>
                <div>
                  <strong className="text-white">第三方数据源：</strong>
                  未来将支持接入多个报价平台API，实现实时价格监控和自动调整。
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 渲染系统设置
  const renderSettings = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">系统设置</h1>
          <p className="text-slate-400">系统配置和参数设置</p>
        </div>

        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">数据库连接</CardTitle>
            <CardDescription className="text-slate-400">Supabase配置状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-blue-400" />
                  <div>
                    <div className="text-white font-medium">Supabase连接</div>
                    <div className="text-sm text-slate-400">
                      {supabase ? "已连接" : "未配置"}
                    </div>
                  </div>
                </div>
                <Badge
                  className={
                    supabase
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }
                >
                  {supabase ? "正常" : "异常"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex">
      {/* 侧边栏 */}
      <div className={`${sidebarOpen ? "w-64" : "w-20"} bg-gradient-to-b from-slate-900 to-blue-950 border-r border-blue-800/50 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-blue-800/50">
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold text-white ${!sidebarOpen && "hidden"}`}>
              管理后台
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-slate-400 hover:text-white"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                onClick={() => setActiveMenu(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeMenu === item.key
                    ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-blue-800/50">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:text-white"
          >
            <LogOut className="h-5 w-5 mr-3" />
            {sidebarOpen && <span>退出登录</span>}
          </Button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {activeMenu === "dashboard" && renderDashboard()}
          {activeMenu === "restaurants" && renderRestaurants()}
          {activeMenu === "orders" && renderOrders()}
          {activeMenu === "devices" && renderDevices()}
          {activeMenu === "workers" && renderWorkers()}
          {activeMenu === "api" && renderApiConfig()}
          {activeMenu === "fuelPricing" && renderFuelPricing()}
          {activeMenu === "analytics" && renderAnalytics()}
          {activeMenu === "settings" && renderSettings()}
        </div>
      </div>

      {/* 餐厅详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">餐厅详情</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedRestaurant?.name} 的详细信息
            </DialogDescription>
          </DialogHeader>
          {selectedRestaurant && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400 mb-1">餐厅名称</div>
                  <div className="text-white font-medium">{selectedRestaurant.name}</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400 mb-1">状态</div>
                  <Badge
                    className={
                      selectedRestaurant.status === "activated"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    }
                  >
                    {selectedRestaurant.status === "activated" ? "已激活" : "待激活"}
                  </Badge>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400 mb-1">负责人</div>
                  <div className="text-white">{selectedRestaurant.contact_name || "未设置"}</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400 mb-1">联系电话</div>
                  <div className="text-white">{selectedRestaurant.contact_phone || "未设置"}</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg col-span-2">
                  <div className="text-sm text-slate-400 mb-1">累计加注量</div>
                  <div className="text-white font-semibold text-xl">
                    {selectedRestaurant.total_refilled.toFixed(1)} kg
                  </div>
                </div>
                {selectedRestaurant.address && (
                  <div className="p-4 bg-slate-800/50 rounded-lg col-span-2">
                    <div className="text-sm text-slate-400 mb-1">地址</div>
                    <div className="text-white flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {selectedRestaurant.address}
                    </div>
                  </div>
                )}
                {selectedRestaurant.qr_token && (
                  <div className="p-4 bg-slate-800/50 rounded-lg col-span-2">
                    <div className="text-sm text-slate-400 mb-1">QR Token</div>
                    <div className="text-white font-mono text-sm">{selectedRestaurant.qr_token}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              <Label className="text-sm font-medium text-slate-300 mb-2 block">
                选择工人
              </Label>
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
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
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
    </div>
  )
}

