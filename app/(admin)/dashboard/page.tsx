"use client"

// 高德地图安全密钥配置
if (typeof window !== 'undefined') {
  (window as any)._AMapSecurityConfig = {
    securityJsCode: 'ce1bde649b433cf6dbd4343190a6009a'
  }
}

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
  HardHat,
  Mic,
  Droplet,
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
  worker_type?: "delivery" | "repair" | "install" | string[] | null // 工人类型：配送员、维修工、安装工（支持多选）
  product_types?: string[] | null // 产品类型（仅配送员）：lpg, clean, alcohol, outdoor
  status?: "active" | "inactive" | null // 状态：在职、离职
  created_at?: string
  updated_at?: string
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
  { icon: Wrench, label: "报修管理", key: "repairs" },
  { icon: Package, label: "设备租赁管理", key: "equipmentRental" },
  { icon: Wrench, label: "设备监控", key: "devices" },
  { icon: Truck, label: "工人管理", key: "workers" },
  { icon: DollarSign, label: "燃料实时价格监控", key: "fuelPricing" },
  { icon: Server, label: "API配置", key: "api" },
  { icon: BarChart3, label: "数据统计", key: "analytics" },
  { icon: Settings, label: "系统设置", key: "settings" },
]

export default function AdminDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeMenu, setActiveMenu] = useState("dashboard")
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [orderServiceTypeFilter, setOrderServiceTypeFilter] = useState<string>("all") // 订单服务类型筛选：all, 维修服务, 燃料配送, 设备租赁
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all") // 订单状态筛选
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
  const [repairs, setRepairs] = useState<any[]>([])
  const [isLoadingRepairs, setIsLoadingRepairs] = useState(false)
  const [repairStatusFilter, setRepairStatusFilter] = useState<string>("all")
  const [repairServiceTypeFilter, setRepairServiceTypeFilter] = useState<string>("all") // 服务类型筛选：all, repair, cleaning, renovation
  const [selectedRepair, setSelectedRepair] = useState<any | null>(null)
  const [isRepairDetailDialogOpen, setIsRepairDetailDialogOpen] = useState(false)
  const [isUpdatingRepair, setIsUpdatingRepair] = useState(false)
  const [repairUpdateAmount, setRepairUpdateAmount] = useState<string>("")
  const [repairUpdateStatus, setRepairUpdateStatus] = useState<string>("")
  const [repairAssignedWorker, setRepairAssignedWorker] = useState<string>("none") // 分配的工人ID，"none"表示不分配
  const [isAddWorkerDialogOpen, setIsAddWorkerDialogOpen] = useState(false)
  const [newWorker, setNewWorker] = useState<{
    name: string
    phone: string
    worker_types: string[] // 支持多选
    product_types: string[]
    status: "active" | "inactive"
  }>({
    name: "",
    phone: "",
    worker_types: [],
    product_types: [],
    status: "active",
  })
  const [isAddingWorker, setIsAddingWorker] = useState(false)
  const [isEditWorkerDialogOpen, setIsEditWorkerDialogOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [editWorker, setEditWorker] = useState<{
    name: string
    phone: string
    worker_types: string[] // 支持多选
    product_types: string[]
    status: "active" | "inactive"
  }>({
    name: "",
    phone: "",
    worker_types: [],
    product_types: [],
    status: "active",
  })
  const [isUpdatingWorker, setIsUpdatingWorker] = useState(false)
  const [isDeletingWorker, setIsDeletingWorker] = useState(false)
  const [deletingWorkerId, setDeletingWorkerId] = useState<string | null>(null)
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
  
  // 设备租赁管理相关状态
  const [rentalOrders, setRentalOrders] = useState<any[]>([])
  const [isLoadingRentalOrders, setIsLoadingRentalOrders] = useState(false)
  const [rentalOrderStatusFilter, setRentalOrderStatusFilter] = useState<string>("all")
  const [selectedRentalOrder, setSelectedRentalOrder] = useState<any | null>(null)
  const [isRentalOrderDetailDialogOpen, setIsRentalOrderDetailDialogOpen] = useState(false)
  
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const infoWindowsRef = useRef<any[]>([])
  const serviceCirclesRef = useRef<any[]>([])
  const markerMapRef = useRef<Map<string, { marker: any; infoWindow: any }>>(new Map())
  const heatmapRef = useRef<any>(null)
  const markerClickTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const markerDoubleClickFlagsRef = useRef<Map<string, boolean>>(new Map())
  const updateMarkersTimerRef = useRef<NodeJS.Timeout | null>(null) // 防抖定时器

  // 生成地址降级列表（逐步简化地址）
  const generateAddressFallbacks = useCallback((address: string): string[] => {
    const fallbacks: string[] = [address] // 首先尝试原始地址
    
    // 去掉门牌号（数字结尾，包括"93号"、"93"等）
    const withoutNumber = address.replace(/\d+号?$/, '').trim()
    if (withoutNumber && withoutNumber !== address) {
      fallbacks.push(withoutNumber)
    }
    
    // 提取关键地名（优先提取，因为POI搜索通常更准确）
    // 例如："昆明市五华区黑林铺班庄村93号" -> "班庄村"
    const keyPlaceMatch = address.match(/([^省市区县镇乡街道]+(?:村|庄|社区|小区|路|街|巷|弄|公交站|站))/)
    if (keyPlaceMatch && keyPlaceMatch[1]) {
      const keyPlace = keyPlaceMatch[1]
      if (!fallbacks.includes(keyPlace)) {
        fallbacks.push(keyPlace)
      }
      // 尝试添加"（公交站）"后缀（如果还没有）
      if (!keyPlace.includes('公交站') && !keyPlace.includes('站')) {
        const busStop = `${keyPlace}（公交站）`
        if (!fallbacks.includes(busStop)) {
          fallbacks.push(busStop)
        }
        // 也尝试不加括号的版本
        const busStop2 = `${keyPlace}公交站`
        if (!fallbacks.includes(busStop2)) {
          fallbacks.push(busStop2)
        }
      }
    }
    
    // 提取主要区域信息（省市区街道村）
    // 例如："昆明市五华区黑林铺班庄村93号" -> "昆明市五华区黑林铺班庄村"
    const parts = address.split(/[省市区县镇乡街道村]/)
    if (parts.length > 1) {
      // 保留到"村"或"街道"级别（去掉门牌号后）
      const mainAreaMatch = address.match(/^([^省]*省?[^市]*市[^区]*区?[^县]*县?[^镇]*镇?[^乡]*乡?[^街道]*街道?[^村]*村?)/)
      if (mainAreaMatch && mainAreaMatch[1]) {
        const mainArea = mainAreaMatch[1].replace(/\d+号?$/, '').trim()
        if (mainArea && mainArea !== address && !fallbacks.includes(mainArea)) {
          fallbacks.push(mainArea)
        }
      }
      
      // 尝试只保留到区/县级别
      const districtMatch = address.match(/^([^省]*省?[^市]*市[^区]*区?[^县]*县?)/)
      if (districtMatch && districtMatch[1]) {
        const districtLevel = districtMatch[1]
        if (districtLevel && districtLevel !== address && !fallbacks.includes(districtLevel)) {
          fallbacks.push(districtLevel)
        }
      }
    }
    
    // 如果有关键地名，尝试在城市+关键地名的组合
    if (keyPlaceMatch && keyPlaceMatch[1]) {
      const cityMatch = address.match(/^([^省]*省?[^市]*市)/)
      if (cityMatch && cityMatch[1]) {
        const cityKeyPlace = `${cityMatch[1]}${keyPlaceMatch[1]}`
        if (!fallbacks.includes(cityKeyPlace)) {
          fallbacks.push(cityKeyPlace)
        }
      }
    }
    
    // 移除调试日志，避免控制台刷屏
    return [...new Set(fallbacks)] // 去重
  }, [])

  // 地理编码：将地址转换为经纬度（支持地址降级和POI搜索）
  const geocodeAddress = useCallback(async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !(window as any).AMap) {
        // 移除频繁的警告日志，避免控制台刷屏
        resolve(null)
        return
      }

      const AMap = (window as any).AMap
      
      // 检查 Geocoder 是否可用（可能是插件未加载）
      if (!AMap.Geocoder || typeof AMap.Geocoder !== 'function') {
        // 静默处理，避免控制台刷屏
        // 尝试动态加载 Geocoder 插件
        if (AMap.plugin) {
          AMap.plugin('AMap.Geocoder', () => {
            if (AMap.Geocoder) {
              // 移除调试日志，避免控制台刷屏
              // 重新调用地理编码
              geocodeAddress(address).then(resolve)
            } else {
              console.error('[地理编码] Geocoder 插件加载失败')
              resolve(null)
            }
          })
        } else {
          console.error('[地理编码] AMap.plugin 不可用，无法加载 Geocoder 插件')
          resolve(null)
        }
        return
      }
      
      const geocoder = new AMap.Geocoder({
        city: '全国', // 全国范围搜索
      })

      // 生成地址降级列表
      const addressFallbacks = generateAddressFallbacks(address)
      // 移除调试日志，避免控制台刷屏

      let currentIndex = 0

      // 尝试地理编码
      const tryGeocode = (addr: string) => {
        geocoder.getLocation(addr, (status: string, result: any) => {
          if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
            const location = result.geocodes[0].location
            if (location && location.lat && location.lng) {
              // 移除调试日志，避免控制台刷屏
              resolve({
                latitude: location.lat,
                longitude: location.lng,
              })
              return
            }
          }
          
          // 当前地址失败，尝试下一个降级地址
          currentIndex++
          if (currentIndex < addressFallbacks.length) {
            // 移除调试日志，避免控制台刷屏
            tryGeocode(addressFallbacks[currentIndex])
          } else {
            // 所有地址都失败，尝试POI搜索
            // 移除调试日志，避免控制台刷屏
            tryPOISearch(address)
          }
        })
      }

      // POI搜索作为最后备选
      const tryPOISearch = (searchText: string) => {
        // 检查 PlaceSearch 是否可用
        if (!AMap.PlaceSearch || typeof AMap.PlaceSearch !== 'function') {
          // 静默处理，避免控制台刷屏
          if (AMap.plugin) {
            AMap.plugin('AMap.PlaceSearch', () => {
              if (AMap.PlaceSearch) {
                // 移除调试日志，避免控制台刷屏
                // 重新尝试 POI 搜索
                tryPOISearch(searchText)
              } else {
                console.error('[地理编码] PlaceSearch 插件加载失败')
                // 静默处理，避免控制台刷屏
                resolve(null)
              }
            })
          } else {
            console.error('[地理编码] AMap.plugin 不可用，无法加载 PlaceSearch 插件')
            // 静默处理，避免控制台刷屏
            resolve(null)
          }
          return
        }
        
        const placeSearch = new AMap.PlaceSearch({
          city: '全国',
          citylimit: false,
        })

        placeSearch.search(searchText, (status: string, result: any) => {
          if (status === 'complete' && result.poiList && result.poiList.pois && result.poiList.pois.length > 0) {
            const poi = result.poiList.pois[0]
            if (poi.location && poi.location.lat && poi.location.lng) {
              // 移除调试日志，避免控制台刷屏
              resolve({
                latitude: poi.location.lat,
                longitude: poi.location.lng,
              })
              return
            }
          }
          
          // POI搜索也失败，尝试使用地址中的关键地名进行POI搜索
          const keyPlaceMatch = searchText.match(/([^省市区县镇乡街道]+(?:村|庄|社区|小区|路|街|巷|弄|公交站))/)
          if (keyPlaceMatch && keyPlaceMatch[1] && keyPlaceMatch[1] !== searchText) {
            // 移除调试日志，避免控制台刷屏
            // 再次检查 PlaceSearch 是否可用
            if (!AMap.PlaceSearch || typeof AMap.PlaceSearch !== 'function') {
              // 静默处理，避免控制台刷屏
              resolve(null)
              return
            }
            
            const placeSearch2 = new AMap.PlaceSearch({
              city: '全国',
              citylimit: false,
            })
            placeSearch2.search(keyPlaceMatch[1], (status2: string, result2: any) => {
              if (status2 === 'complete' && result2.poiList && result2.poiList.pois && result2.poiList.pois.length > 0) {
                const poi = result2.poiList.pois[0]
                if (poi.location && poi.location.lat && poi.location.lng) {
                  // 移除调试日志，避免控制台刷屏
                  resolve({
                    latitude: poi.location.lat,
                    longitude: poi.location.lng,
                  })
                  return
                }
              }
              // 静默处理，避免控制台刷屏
              resolve(null)
            })
          } else {
            // 静默处理，避免控制台刷屏
            resolve(null)
          }
        })
      }

      // 开始尝试第一个地址
      tryGeocode(addressFallbacks[0])
    })
  }, [generateAddressFallbacks])

  // 批量更新餐厅的经纬度（对于有地址但没有经纬度的餐厅）
  const updateRestaurantCoordinates = useCallback(async (restaurants: Restaurant[]) => {
    if (!supabase) {
      return
    }

    // 检查AMap是否已加载
    if (typeof window === 'undefined' || !(window as any).AMap) {
      // 移除频繁的警告日志，避免控制台刷屏
      return
    }

    // 找出有地址但没有经纬度的餐厅
    const restaurantsToGeocode = restaurants.filter(
      r => r.address && 
      r.address.trim() !== '' && 
      r.address !== '地址待完善' &&
      (!r.latitude || !r.longitude || isNaN(r.latitude) || isNaN(r.longitude))
    )

    if (restaurantsToGeocode.length === 0) {
      // 移除调试日志，避免控制台刷屏
      return
    }

    // 移除调试日志，避免控制台刷屏

    // 批量处理地理编码（限制并发数，避免API限制）
    const batchSize = 3
    for (let i = 0; i < restaurantsToGeocode.length; i += batchSize) {
      const batch = restaurantsToGeocode.slice(i, i + batchSize)
      const promises = batch.map(async (restaurant) => {
        if (!restaurant.address) return

        const location = await geocodeAddress(restaurant.address)
        if (location && supabase) {
          // 更新数据库
          const { error: updateError } = await supabase
            .from("restaurants")
            .update({
              latitude: location.latitude,
              longitude: location.longitude,
              location: `${location.latitude},${location.longitude}`,
            })
            .eq("id", restaurant.id)

          if (updateError) {
            console.error(`[更新坐标] 更新餐厅 ${restaurant.id} 失败:`, updateError)
          } else {
            // 移除调试日志，避免控制台刷屏
            // 更新本地状态
            setRestaurants(prev => prev.map(r => 
              r.id === restaurant.id 
                ? { ...r, latitude: location.latitude, longitude: location.longitude }
                : r
            ))
          }
        }
      })

      await Promise.all(promises)
      // 延迟一下，避免API请求过快
      if (i + batchSize < restaurantsToGeocode.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }, [supabase, geocodeAddress])

  // 加载餐厅数据
  // 网络重试工具函数（用于 fetch API）
  const retryFetch = async (
    url: string,
    options?: RequestInit,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<Response> => {
    let lastError: any
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options)
        // 即使响应状态不是 200，只要不是网络错误就返回
        return response
      } catch (error: any) {
        lastError = error
        const errorMessage = error?.message || String(error)
        const isNetworkError = 
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('ERR_CONNECTION_CLOSED') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('fetch') ||
          error?.code === 'ECONNRESET' ||
          error?.code === 'ETIMEDOUT'
        
        if (isNetworkError && i < maxRetries - 1) {
          // 网络错误且还有重试机会，等待后重试
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
          continue
        }
        // 非网络错误或已达到最大重试次数，抛出异常
        throw error
      }
    }
    throw lastError
  }

  // 网络重试工具函数（仅针对网络错误，不影响业务逻辑）
  // 这个函数包装 Supabase 查询，在网络错误时自动重试
  const retryOnNetworkError = async <T extends { data: any; error: any }>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastResult: T | null = null
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await fn()
        // Supabase 查询成功，检查是否有错误
        if (result.error) {
          // 检查是否是网络错误
          const errorMessage = result.error.message || String(result.error)
          const isNetworkError = 
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('ERR_CONNECTION_CLOSED') ||
            errorMessage.includes('NetworkError') ||
            errorMessage.includes('fetch') ||
            result.error.code === 'ECONNRESET' ||
            result.error.code === 'ETIMEDOUT'
          
          if (isNetworkError && i < maxRetries - 1) {
            // 网络错误且还有重试机会，等待后重试
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
            continue
          }
          // 非网络错误或已达到最大重试次数，直接返回结果
          return result
        }
        // 没有错误，直接返回
        return result
      } catch (error: any) {
        // 捕获异常（可能是网络层面的错误）
        const errorMessage = error?.message || String(error)
        const isNetworkError = 
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('ERR_CONNECTION_CLOSED') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('fetch') ||
          error?.code === 'ECONNRESET' ||
          error?.code === 'ETIMEDOUT'
        
        if (isNetworkError && i < maxRetries - 1) {
          // 网络错误且还有重试机会，等待后重试
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
          continue
        }
        // 非网络错误或已达到最大重试次数，抛出异常
        throw error
      }
    }
    // 如果所有重试都失败，返回最后一次的结果（如果有）
    if (lastResult) return lastResult
    // 否则抛出错误
    throw new Error('网络请求失败，已重试多次')
  }

  const loadRestaurants = useCallback(async () => {
    try {
      setIsLoading(true)
      if (!supabase) {
        console.warn("[Admin Dashboard] Supabase未配置")
        setIsLoading(false)
        return
      }

      const { data, error } = await retryOnNetworkError(async () => {
        return await supabase
          .from("restaurants")
          .select("id, name, contact_name, contact_phone, total_refilled, status, created_at, latitude, longitude, address, qr_token")
          .order("created_at", { ascending: false })
      })

      if (error) {
        console.error("[Admin Dashboard] 加载餐厅数据失败:", error)
        setIsLoading(false)
        return
      }

      if (data) {
        // 确保经纬度是数字类型
        const processedData = data.map(restaurant => ({
          ...restaurant,
          latitude: restaurant.latitude ? (typeof restaurant.latitude === 'string' ? parseFloat(restaurant.latitude) : restaurant.latitude) : null,
          longitude: restaurant.longitude ? (typeof restaurant.longitude === 'string' ? parseFloat(restaurant.longitude) : restaurant.longitude) : null,
        }))
        
        // 移除频繁的调试日志，避免控制台刷屏
        // console.log('[Admin Dashboard] 加载餐厅数据:', processedData.length, '个餐厅')
        
        setRestaurants(processedData)
        
        // 自动为没有经纬度的餐厅进行地理编码（不依赖地图是否加载）
        // 检查是否有需要地理编码的餐厅
        const needsGeocode = processedData.some(
          r => r.address && 
          r.address.trim() !== '' && 
          r.address !== '地址待完善' &&
          (!r.latitude || !r.longitude || isNaN(r.latitude) || isNaN(r.longitude))
        )
        
        if (needsGeocode) {
          // 移除频繁的调试日志，避免控制台刷屏
          // 等待AMap加载完成（最多等待10秒）
          let attempts = 0
          const maxAttempts = 20 // 20次 * 500ms = 10秒
          const checkAMap = setInterval(() => {
            attempts++
            if (typeof window !== 'undefined' && (window as any).AMap) {
              clearInterval(checkAMap)
              // 移除频繁的调试日志，避免控制台刷屏
              // 延迟一下，确保AMap插件也加载完成
              setTimeout(() => {
                updateRestaurantCoordinates(processedData)
              }, 1000)
            } else if (attempts >= maxAttempts) {
              clearInterval(checkAMap)
              // 只在真正超时时输出警告
              // 静默处理，避免控制台刷屏
            }
          }, 500)
        }
        
        // 如果地图已加载，立即更新标记
        if (mapLoaded && typeof window !== 'undefined' && (window as any).AMap) {
          // 延迟一下，确保地图完全加载（使用防抖机制，避免频繁调用）
          updateMarkers()
        }
      }
    } catch (error) {
      console.error("[Admin Dashboard] 加载餐厅数据时出错:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, mapLoaded, updateRestaurantCoordinates])

  // 加载订单数据
  // 加载最近订单（用于工作台显示）
  const loadRecentOrders = useCallback(async () => {
    if (!supabase) return

    try {
      setIsLoadingOrders(true)
      
      const { data: ordersData, error: ordersError } = await retryOnNetworkError(async () => {
        return await supabase
          .from("orders")
          .select("id, restaurant_id, service_type, status, amount, created_at, updated_at, worker_id")
          .order("created_at", { ascending: false })
          .limit(20)
      })

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
      }
    } catch (error) {
      console.error("[Admin Dashboard] 加载订单时出错:", error)
    } finally {
      setIsLoadingOrders(false)
    }
  }, [])

  // 加载所有订单（用于订单管理页面）
  const loadAllOrders = useCallback(async () => {
    if (!supabase) return

    try {
      setIsLoadingOrders(true)
      
      let query = supabase
        .from("orders")
        .select("id, restaurant_id, service_type, status, amount, created_at, updated_at, worker_id, assigned_to, description")
        .order("created_at", { ascending: false })

      // 服务类型筛选
      if (orderServiceTypeFilter !== "all") {
        query = query.eq("service_type", orderServiceTypeFilter)
      }

      // 状态筛选
      if (orderStatusFilter !== "all") {
        query = query.eq("status", orderStatusFilter)
      }

      const { data: ordersData, error: ordersError } = await retryOnNetworkError(async () => {
        const result = await query
        if (result.error) {
          throw result.error
        }
        return result
      })

      if (ordersError) {
        console.error("[Admin Dashboard] 加载所有订单失败:", ordersError)
        setOrders([])
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
          worker_id: order.worker_id || order.assigned_to,
        }))
        setOrders(formattedOrders)
        // 移除频繁的调试日志，避免控制台刷屏
      }
    } catch (error) {
      console.error("[Admin Dashboard] 加载所有订单时出错:", error)
      setOrders([])
    } finally {
      setIsLoadingOrders(false)
    }
  }, [orderServiceTypeFilter, orderStatusFilter])

  // 加载报修数据 - 直接使用 Supabase 查询（符合官方最佳实践）
  const loadRepairs = useCallback(async () => {
    try {
      setIsLoadingRepairs(true)
      
      // 构建查询参数
      const params = new URLSearchParams()
      if (repairStatusFilter && repairStatusFilter !== "all") {
        params.append("status", repairStatusFilter)
      }
      if (repairServiceTypeFilter && repairServiceTypeFilter !== "all") {
        params.append("service_type", repairServiceTypeFilter)
      }
      
      const url = `/api/repair/list${params.toString() ? `?${params.toString()}` : ''}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("[Admin Dashboard] 接口返回错误:", response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        // 直接使用接口返回的数据，不进行任何额外过滤
        const repairs = result.data || []
        
        // 只在数据为空且调试模式下才输出警告
        if (repairs.length === 0 && process.env.NODE_ENV === 'development') {
          console.warn(`[Admin Dashboard] 未匹配到维修单`, {
            totalOrders: result.debug?.totalOrders || 0,
            filteredRepairs: result.debug?.filteredRepairs || 0,
            audioOrders: result.debug?.audioOrders || 0
          })
        }
        
        // 直接使用接口返回的数据，不进行任何额外过滤
        setRepairs(repairs)
      } else {
        throw new Error(result.error || "获取维修列表失败")
      }

    } catch (error) {
      console.error("[Admin Dashboard] 加载报修时出错:", error)
      if (error instanceof Error) {
        console.error("[Admin Dashboard] 错误详情:", error.message, error.stack)
        alert(`加载报修列表失败: ${error.message}`)
      }
      setRepairs([])
    } finally {
      setIsLoadingRepairs(false)
    }
  }, [repairStatusFilter, repairServiceTypeFilter])

  // 更新报修状态 - 直接使用 Supabase 更新（符合官方最佳实践）
  const updateRepairStatus = useCallback(async (repairId: string, status: string, amount?: number, assignedTo?: string) => {
    if (!supabase) {
      alert("数据库连接失败")
      return
    }

    try {
      setIsUpdatingRepair(true)

      // 验证状态值
      const validStatuses = ["pending", "processing", "completed", "cancelled"]
      if (!validStatuses.includes(status)) {
        alert(`无效的状态值: ${status}。有效值: ${validStatuses.join(", ")}`)
        setIsUpdatingRepair(false)
        return
      }

      // 如果状态是completed，必须提供金额且金额必须大于0
      if (status === "completed") {
        if (amount === undefined || amount === null) {
          alert("完成报修必须提供维修金额")
          setIsUpdatingRepair(false)
          return
        }
        if (isNaN(amount) || amount <= 0) {
          alert("维修金额必须是大于0的有效数字")
          setIsUpdatingRepair(false)
          return
        }
      }

      // 构建更新数据
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString(),
      }

      // 如果提供了金额，更新金额（确保金额是数字类型）
      if (amount !== undefined && amount !== null) {
        const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount))
        if (!isNaN(numericAmount) && numericAmount > 0) {
          updateData.amount = numericAmount
        }
      }

      // 如果状态是 completed，确保金额被设置
      if (status === "completed" && (!updateData.amount || updateData.amount <= 0)) {
        alert("完成报修必须提供有效的维修金额（大于0）")
        setIsUpdatingRepair(false)
        return
      }

      // 如果提供了分配的工人ID，更新 assigned_to 和 worker_id
      if (assignedTo !== undefined && assignedTo !== null && assignedTo.trim() !== "") {
        updateData.assigned_to = assignedTo.trim()
        updateData.worker_id = assignedTo.trim() // 兼容旧字段
      } else if (assignedTo === null || assignedTo === "") {
        // 如果明确设置为空，清除分配
        updateData.assigned_to = null
        updateData.worker_id = null
      }

      // 直接使用 Supabase 更新 orders 表
      const { data: updatedRepair, error: updateError } = await retryOnNetworkError(
        async () => await supabase
          .from("orders")
          .update(updateData)
          .eq("id", repairId)
          .select("id, restaurant_id, service_type, status, description, amount, created_at, updated_at, assigned_to, worker_id")
          .single()
      )

      if (updateError) {
        console.error("[Admin Dashboard] 更新报修失败:", updateError)
        alert(`更新失败: ${updateError.message || "未知错误"}`)
        setIsUpdatingRepair(false)
        return
      }

      if (!updatedRepair) {
        console.error("[Admin Dashboard] 更新报修后未返回数据")
        alert("更新失败: 未返回更新后的数据")
        setIsUpdatingRepair(false)
        return
      }

      // 验证更新结果
      if (status === "completed" && (!updatedRepair.amount || updatedRepair.amount <= 0)) {
        console.warn("[Admin Dashboard] 警告: 完成状态但金额未正确设置", updatedRepair)
      }

      // 更新成功，刷新列表
      await loadRepairs()
      
      // 关闭对话框并重置状态
      setIsRepairDetailDialogOpen(false)
      setSelectedRepair(null)
      setRepairUpdateAmount("")
      setRepairUpdateStatus("")
      setRepairAssignedWorker("none")
      
      // 显示成功提示
      if (status === "completed") {
        alert(`报修工单已完成，维修金额: ¥${updateData.amount.toFixed(2)}`)
      } else {
        alert(`报修工单状态已更新为: ${status === "pending" ? "待处理" : status === "processing" ? "处理中" : status === "cancelled" ? "已取消" : status}`)
      }
    } catch (error: any) {
      console.error("[Admin Dashboard] 更新报修时出错:", error)
      alert(`更新报修失败: ${error?.message || "未知错误"}`)
    } finally {
      setIsUpdatingRepair(false)
    }
  }, [loadRepairs, supabase])

  // 当切换到报修管理或状态筛选改变时加载数据
  useEffect(() => {
    if (activeMenu === "repairs") {
      loadRepairs()
    }
  }, [activeMenu, repairStatusFilter, repairServiceTypeFilter, loadRepairs])

  // 单独处理URL参数，避免与repairs状态形成循环依赖
  useEffect(() => {
    if (activeMenu === "repairs" && repairs.length > 0) {
      const repairId = searchParams.get("id") || searchParams.get("repairId")
      if (repairId) {
        const repair = repairs.find((r: any) => r.id === repairId)
        if (repair) {
          setSelectedRepair(repair)
          setRepairUpdateStatus(repair.status)
          setRepairUpdateAmount(repair.amount?.toString() || "")
          setRepairAssignedWorker(repair.assigned_to || repair.worker_id || "none")
          setIsRepairDetailDialogOpen(true)
          // 清除URL参数
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname)
          }
        }
      }
    }
  }, [activeMenu, searchParams, repairs])

  // 当切换到订单管理或筛选条件改变时加载数据
  useEffect(() => {
    if (activeMenu === "orders") {
      loadAllOrders()
    }
  }, [activeMenu, orderServiceTypeFilter, orderStatusFilter, loadAllOrders])

  // 加载设备租赁订单（管理端）
  const loadRentalOrders = useCallback(async () => {
    setIsLoadingRentalOrders(true)
    try {
      const params = new URLSearchParams()
      if (rentalOrderStatusFilter && rentalOrderStatusFilter !== "all") {
        params.append("status", rentalOrderStatusFilter)
      }

      const response = await fetch(`/api/equipment/rental/admin/list?${params.toString()}`)
      const result = await response.json()
      
      if (result.success) {
        setRentalOrders(result.data || [])
      } else {
        console.error("[设备租赁管理] 加载失败:", result.error)
        setRentalOrders([])
      }
    } catch (err) {
      console.error("[设备租赁管理] 加载失败:", err)
      setRentalOrders([])
    } finally {
      setIsLoadingRentalOrders(false)
    }
  }, [rentalOrderStatusFilter])

  // 当切换到设备租赁管理或筛选条件改变时加载数据
  useEffect(() => {
    if (activeMenu === "equipmentRental") {
      loadRentalOrders()
    }
  }, [activeMenu, rentalOrderStatusFilter, loadRentalOrders])

  // 实时推送：监听维修工单变化（使用 Supabase Realtime，符合官方最佳实践）
  // 此接口保留用于后期扩展实时派单功能
  // 后期扩展建议：
  // 1. 可以添加按 assigned_to 过滤，实现工人级别的实时推送
  // 2. 可以添加按 status 过滤，只推送特定状态的订单变化
  // 3. 可以优化 payload 处理，只更新变化的订单而不是重新加载整个列表
  useEffect(() => {
    if (!supabase || activeMenu !== "repairs") return

    let debounceTimer: NodeJS.Timeout | null = null
    let isSubscribed = true

    // 订阅 orders 表的变化（只监听维修服务）
    // 注意：Supabase Realtime 的 filter 使用精确匹配，不支持 ilike
    // 如果需要匹配多种 service_type 值，可以创建多个订阅或使用 PostgreSQL 函数
    const channel = supabase
      .channel("repairs-realtime-admin")
      .on(
        "postgres_changes",
        {
          event: "*", // 监听所有事件（INSERT, UPDATE, DELETE）
          schema: "public",
          table: "orders",
          // 精确匹配：根据实际数据中的 service_type 值调整
          // 如果数据中使用 "维修服务"，则使用该值；如果使用其他值，需要相应调整
          filter: "service_type=eq.维修服务", // 精确匹配
        },
        (payload) => {
          // 实时更新：当 orders 表发生变化时，自动刷新报修列表
          // 使用防抖机制，避免频繁刷新
          // 后期扩展：可以在这里添加更细粒度的更新逻辑
          // 例如：payload.eventType === 'INSERT' 时只添加新订单，UPDATE 时只更新对应订单
          if (!isSubscribed) return
          
          if (debounceTimer) {
            clearTimeout(debounceTimer)
          }
          
          debounceTimer = setTimeout(() => {
            if (isSubscribed && activeMenu === "repairs") {
              loadRepairs()
            }
          }, 2000) // 增加到2秒防抖，减少刷新频率
        }
      )
      .subscribe()

    return () => {
      isSubscribed = false
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      // 清理订阅
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, activeMenu, loadRepairs])

  // 加载工人数据
  const loadWorkers = useCallback(async () => {
    if (!supabase) return

    try {
      const { data, error } = await retryOnNetworkError(async () => {
        return await supabase
          .from("workers")
          .select("id, name, phone, worker_type, product_types, status, created_at, updated_at")
          .order("created_at", { ascending: false })
      })

      if (error) {
        console.error("[Admin Dashboard] 加载工人列表失败:", error)
        setWorkers([])
        return
      }

      if (data) {
        // 处理product_types和worker_type（可能是JSON字符串或数组）
        const processedData = data.map((worker: any) => {
          // 处理product_types
          let productTypes = worker.product_types || []
          if (typeof worker.product_types === 'string') {
            try {
              productTypes = JSON.parse(worker.product_types || '[]')
            } catch (e) {
              productTypes = []
            }
          }

          // 处理worker_type（可能是字符串、数组或JSON字符串）
          let workerType: string | string[] | null = worker.worker_type
          if (typeof worker.worker_type === 'string') {
            // 尝试解析为JSON（如果是JSON字符串）
            try {
              const parsed = JSON.parse(worker.worker_type)
              if (Array.isArray(parsed)) {
                // 确保数组中的每个元素都是有效的类型字符串，过滤掉无效值
                const validTypes = parsed.filter((p: any) => 
                  typeof p === 'string' && ['delivery', 'repair', 'install'].includes(p)
                )
                if (validTypes.length > 0) {
                  workerType = validTypes.length === 1 ? validTypes[0] : validTypes
                } else {
                  workerType = null
                }
              } else if (typeof parsed === 'string' && ['delivery', 'repair', 'install'].includes(parsed)) {
                // 如果解析后是单个有效类型字符串
                workerType = parsed
              } else {
                // 解析后不是有效类型，检查原字符串是否是有效类型
                if (['delivery', 'repair', 'install'].includes(worker.worker_type)) {
                  workerType = worker.worker_type
                } else {
                  workerType = null
                }
              }
            } catch (e) {
              // 不是JSON，检查是否是有效的单个类型字符串
              if (['delivery', 'repair', 'install'].includes(worker.worker_type)) {
                workerType = worker.worker_type
              } else {
                workerType = null
              }
            }
          } else if (Array.isArray(worker.worker_type)) {
            // 如果是数组，过滤出有效类型
            const validTypes = worker.worker_type.filter((t: any) => 
              typeof t === 'string' && ['delivery', 'repair', 'install'].includes(t)
            )
            workerType = validTypes.length > 0 ? (validTypes.length === 1 ? validTypes[0] : validTypes) : null
          } else if (worker.worker_type === null || worker.worker_type === undefined) {
            workerType = null
          }

          // 移除调试日志，避免控制台刷屏

          return {
            ...worker,
            product_types: productTypes,
            worker_type: workerType,
          }
        })
        setWorkers(processedData)
      }
    } catch (error) {
      console.error("[Admin Dashboard] 加载工人列表失败:", error)
      setWorkers([])
    }
  }, [])

  // 添加工人
  const handleAddWorker = async () => {
    if (!newWorker.name || !newWorker.phone || newWorker.worker_types.length === 0) {
      alert("请填写完整信息：姓名、电话和至少选择一个工人类型")
      return
    }

    if (newWorker.worker_types.includes("delivery") && newWorker.product_types.length === 0) {
      alert("配送员必须至少选择一个产品类型")
      return
    }

    setIsAddingWorker(true)
    try {
      if (!supabase) {
        throw new Error("数据库连接失败，请检查 Supabase 配置")
      }

      // 先检查表是否存在
      // 移除调试日志，避免控制台刷屏
      const checkResponse = await fetch("/api/worker/check-table")
      const checkResult = await checkResponse.json()

      // 移除调试日志，避免控制台刷屏
      
      if (!checkResult.exists) {
        throw new Error(
          `数据库表不存在！\n\n` +
          `请按以下步骤操作：\n` +
          `1. 打开 Supabase Dashboard (https://app.supabase.com)\n` +
          `2. 选择你的项目\n` +
          `3. 点击左侧 "SQL Editor"\n` +
          `4. 点击 "New query"\n` +
          `5. 复制 CREATE_WORKERS_TABLE_FINAL.sql 文件中的 SQL 代码\n` +
          `6. 粘贴并执行\n` +
          `7. 刷新页面后重试`
        )
      }
      
      // 移除调试日志，避免控制台刷屏

      // 构建worker_type：单个类型保存为字符串，多个保存为JSON字符串（因为数据库字段是TEXT类型）
      let workerTypeValue: string
      if (newWorker.worker_types.length === 1) {
        workerTypeValue = newWorker.worker_types[0]
      } else if (newWorker.worker_types.length > 1) {
        // 多个类型保存为JSON字符串
        workerTypeValue = JSON.stringify(newWorker.worker_types)
      } else {
        throw new Error("至少需要选择一个工人类型")
      }

      const workerData: any = {
        name: newWorker.name.trim(),
        phone: newWorker.phone.trim(),
        worker_type: workerTypeValue,
        status: newWorker.status,
      }

      // 如果包含配送员，保存产品类型
      if (newWorker.worker_types.includes("delivery")) {
        workerData.product_types = newWorker.product_types
      } else {
        workerData.product_types = []
      }

      // 移除调试日志，避免控制台刷屏

      const { data, error } = await supabase
        .from("workers")
        .insert(workerData)
        .select("id, name, phone, worker_type, product_types, status, created_at, updated_at")
        .single()

      if (error) {
        console.error("[Admin Dashboard] 添加工人失败 - 详细错误:", error)
        console.error("[Admin Dashboard] 错误代码:", error.code)
        console.error("[Admin Dashboard] 错误详情:", error.details)
        console.error("[Admin Dashboard] 错误提示:", error.hint)
        
        // 提供更详细的错误信息
        if (error.message?.includes("Invalid API key") || error.code === "PGRST301" || error.code === "401") {
          throw new Error(
            `API Key 无效！\n\n` +
            `请按以下步骤操作：\n` +
            `1. 打开 Supabase Dashboard (https://app.supabase.com)\n` +
            `2. 选择你的项目\n` +
            `3. 进入 Settings > API\n` +
            `4. 复制 "anon" "public" 的 API Key\n` +
            `5. 在 Vercel Dashboard 中更新环境变量 NEXT_PUBLIC_SUPABASE_ANON_KEY\n` +
            `6. 重新部署项目`
          )
        }
        
        if (error.message?.includes("schema cache") || error.message?.includes("not found") || error.code === "42P01") {
          throw new Error(
            `数据库表不存在！\n\n` +
            `请按以下步骤操作：\n` +
            `1. 打开 Supabase Dashboard\n` +
            `2. 进入 SQL Editor\n` +
            `3. 执行 CREATE_WORKERS_TABLE_FINAL.sql 中的 SQL 代码\n` +
            `4. 刷新页面后重试`
          )
        }
        
        if (error.code === "42501") {
          throw new Error("权限不足，请检查 Supabase RLS 策略设置")
        }
        
        throw new Error(error.message || `添加工人失败 (错误代码: ${error.code || "未知"})`)
      }

      // 刷新工人列表
      await loadWorkers()
      
      // 重置表单
      setNewWorker({
        name: "",
        phone: "",
        worker_types: [],
        product_types: [],
        status: "active",
      })
      setIsAddWorkerDialogOpen(false)
      alert("工人添加成功")
    } catch (error: any) {
      console.error("[Admin Dashboard] 添加工人失败:", error)
      alert(`添加工人失败: ${error.message || "未知错误"}`)
    } finally {
      setIsAddingWorker(false)
    }
  }

  // 打开编辑对话框
  const handleOpenEditDialog = (worker: Worker) => {
    setEditingWorker(worker)
    
    // 处理product_types（可能是JSON字符串或数组）
    let productTypes: string[] = []
    if (typeof worker.product_types === 'string') {
      try {
        productTypes = JSON.parse(worker.product_types || '[]')
      } catch (e) {
        productTypes = []
      }
    } else if (Array.isArray(worker.product_types)) {
      productTypes = worker.product_types
    }
    
    // 处理worker_type（可能是单个类型、数组或JSON字符串）
    let workerTypes: string[] = []
    if (Array.isArray(worker.worker_type)) {
      workerTypes = worker.worker_type
    } else if (typeof worker.worker_type === 'string') {
      // 尝试解析为JSON（如果是JSON字符串）
      try {
        const parsed = JSON.parse(worker.worker_type)
        if (Array.isArray(parsed)) {
          workerTypes = parsed
        } else {
          workerTypes = [worker.worker_type] // 单个类型
        }
      } catch (e) {
        // 不是JSON，是普通字符串
        workerTypes = [worker.worker_type]
      }
    }

    // 移除调试日志，避免控制台刷屏

    setEditWorker({
      name: worker.name || "",
      phone: worker.phone || "",
      worker_types: workerTypes,
      product_types: productTypes,
      status: (worker.status as "active" | "inactive") || "active",
    })
    setIsEditWorkerDialogOpen(true)
  }

  // 更新工人信息
  const handleUpdateWorker = async () => {
    if (!editingWorker) return

    if (!editWorker.name || !editWorker.phone || editWorker.worker_types.length === 0) {
      alert("请填写完整信息：姓名、电话和至少选择一个工人类型")
      return
    }

    if (editWorker.worker_types.includes("delivery") && editWorker.product_types.length === 0) {
      alert("配送员必须至少选择一个产品类型")
      return
    }

    setIsUpdatingWorker(true)
    try {
      if (!supabase) {
        throw new Error("数据库连接失败，请检查 Supabase 配置")
      }

      // 构建worker_type：单个类型保存为字符串，多个保存为JSON字符串（因为数据库字段是TEXT类型）
      let workerTypeValue: string
      if (editWorker.worker_types.length === 1) {
        workerTypeValue = editWorker.worker_types[0]
      } else if (editWorker.worker_types.length > 1) {
        // 多个类型保存为JSON字符串
        workerTypeValue = JSON.stringify(editWorker.worker_types)
      } else {
        throw new Error("至少需要选择一个工人类型")
      }

      const updateData: any = {
        name: editWorker.name.trim(),
        phone: editWorker.phone.trim(),
        worker_type: workerTypeValue,
        status: editWorker.status,
        updated_at: new Date().toISOString(),
      }

      // 移除调试日志，避免控制台刷屏

      // 如果包含配送员，保存产品类型
      if (editWorker.worker_types.includes("delivery")) {
        updateData.product_types = editWorker.product_types
      } else {
        updateData.product_types = []
      }

      const { data, error } = await supabase
        .from("workers")
        .update(updateData)
        .eq("id", editingWorker.id)
        .select("id, name, phone, worker_type, product_types, status, created_at, updated_at")
        .single()

      if (error) {
        console.error("[Admin Dashboard] 更新工人失败 - 详细错误:", error)
        throw new Error(error.message || "更新工人失败")
      }

      // 刷新工人列表
      await loadWorkers()
      
      // 关闭对话框
      setIsEditWorkerDialogOpen(false)
      setEditingWorker(null)
      alert("工人信息更新成功")
    } catch (error: any) {
      console.error("[Admin Dashboard] 更新工人失败:", error)
      alert(`更新工人失败: ${error.message || "未知错误"}`)
    } finally {
      setIsUpdatingWorker(false)
    }
  }

  // 删除工人
  const handleDeleteWorker = async (workerId: string, workerName: string) => {
    if (!window.confirm(`确定要删除工人 "${workerName}" 吗？此操作不可恢复！`)) {
      return
    }

    setIsDeletingWorker(true)
    setDeletingWorkerId(workerId)
    try {
      if (!supabase) {
        throw new Error("数据库连接失败，请检查 Supabase 配置")
      }

      const { error } = await supabase
        .from("workers")
        .delete()
        .eq("id", workerId)

      if (error) {
        console.error("[Admin Dashboard] 删除工人失败 - 详细错误:", error)
        throw new Error(error.message || "删除工人失败")
      }

      // 刷新工人列表
      await loadWorkers()
      alert("工人删除成功")
    } catch (error: any) {
      console.error("[Admin Dashboard] 删除工人失败:", error)
      alert(`删除工人失败: ${error.message || "未知错误"}`)
    } finally {
      setIsDeletingWorker(false)
      setDeletingWorkerId(null)
    }
  }

  // 加载设备数据
  const loadDevices = useCallback(async () => {
    if (!supabase) return

    try {
      const { data, error } = await retryOnNetworkError(async () => {
        return await supabase
          .from("devices")
          .select("device_id, restaurant_id, model, address, installer, install_date, status")
          .order("install_date", { ascending: false })
      })

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
      // 先尝试查询，如果表不存在（404或PGRST205错误），直接使用模拟数据，避免频繁404错误
      const { data, error } = await supabase
        .from("service_points")
        .select("id, name, township, latitude, longitude, service_radius, legal_entity, status, created_at")
        .order("created_at", { ascending: false })

      if (error) {
        // 如果表不存在（PGRST205错误或404），直接使用模拟数据，不输出任何警告或错误
        if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('service_points') || error.message?.includes('not found')) {
          // 表不存在，直接使用模拟数据，静默处理，不输出任何日志
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
      }

      if (data) {
        setServicePoints(data)
      }
    } catch (error: any) {
      // 静默处理所有错误，使用模拟数据，不输出错误日志避免控制台刷屏
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
  }, [supabase])

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
            // 移除频繁的调试日志，避免控制台刷屏
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
            // 移除频繁的调试日志，避免控制台刷屏
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
      // 移除调试日志，避免控制台刷屏
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
      // 移除调试日志，避免控制台刷屏
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

    // 移除调试日志，避免控制台刷屏
    // 计算地图中心点（多个餐厅）: { 
    //   center: [centerLng, centerLat], 
    //   zoom, 
    //   restaurantCount: restaurantsWithLocation.length,
    //   range: { lngDiff, latDiff, maxDiff }
    // }

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
            // 静默处理错误，避免控制台刷屏
          }
        })
        markersRef.current = []

        // 清除所有信息窗口
        infoWindowsRef.current.forEach(infoWindow => {
          try {
            mapInstanceRef.current.remove(infoWindow)
            infoWindow.close()
          } catch (e) {
            // 静默处理错误，避免控制台刷屏
          }
        })
        infoWindowsRef.current = []

        // 清除所有服务点圆圈
        serviceCirclesRef.current.forEach(circle => {
          try {
            mapInstanceRef.current.remove(circle)
            circle.setMap(null)
          } catch (e) {
            // 静默处理错误，避免控制台刷屏
          }
        })
        serviceCirclesRef.current = []

        // 销毁地图实例
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
        // 移除频繁的调试日志，避免控制台刷屏
      } catch (error) {
        console.error('[Map] 销毁地图实例时出错:', error)
      }
    }
    setMapLoaded(false)
  }, [])


  // 更新地图标记
  const updateMarkers = useCallback(() => {
    if (!mapInstanceRef.current) {
      // 静默返回，不输出日志
      return
    }

    const map = mapInstanceRef.current
    const AMap = (window as any).AMap
    if (!AMap) {
      // 静默返回，不输出日志
      return
    }

    // 移除调试日志，避免控制台刷屏
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
    
    // 清除所有点击定时器和双击标志
    markerClickTimersRef.current.forEach(timer => {
      clearTimeout(timer)
    })
    markerClickTimersRef.current.clear()
    markerDoubleClickFlagsRef.current.clear()

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
            // 静默处理错误，避免控制台刷屏
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
        // 准备热力图数据（确保坐标有效）
        const heatmapData = restaurantsWithLocation
          .filter(restaurant => {
            const lng = restaurant.longitude!
            const lat = restaurant.latitude!
            return isFinite(lng) && isFinite(lat) && 
                   !isNaN(lng) && !isNaN(lat) &&
                   lng >= -180 && lng <= 180 &&
                   lat >= -90 && lat <= 90
          })
          .map(restaurant => ({
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
        // 移除频繁的调试日志，避免控制台刷屏
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
        // 移除详细的调试日志，避免控制台刷屏
        // 检查经纬度是否有效（更严格的验证）
        const lat = typeof restaurant.latitude === 'number' 
          ? restaurant.latitude 
          : (restaurant.latitude ? parseFloat(String(restaurant.latitude)) : NaN)
        const lng = typeof restaurant.longitude === 'number' 
          ? restaurant.longitude 
          : (restaurant.longitude ? parseFloat(String(restaurant.longitude)) : NaN)
        
        // 严格验证：必须是有效数字，且在合理范围内（纬度：-90到90，经度：-180到180）
        const isValidLat = !isNaN(lat) && isFinite(lat) && lat >= -90 && lat <= 90
        const isValidLng = !isNaN(lng) && isFinite(lng) && lng >= -180 && lng <= 180
        
        if (!isValidLat || !isValidLng) {
          // 如果有地址但没有经纬度，尝试地理编码（异步，不阻塞标记创建）
          if (restaurant.address && restaurant.address.trim() !== '' && restaurant.address !== '地址待完善') {
            // 移除调试日志，避免控制台刷屏
            // 异步地理编码，不阻塞当前标记创建
            geocodeAddress(restaurant.address).then(location => {
              if (location && supabase) {
                // 移除调试日志，避免控制台刷屏
                // 更新数据库
                supabase
                  .from("restaurants")
                  .update({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    location: `${location.latitude},${location.longitude}`,
                  })
                  .eq("id", restaurant.id)
                  .then(({ error }) => {
                    if (!error) {
                      // 移除调试日志，避免控制台刷屏
                      // 更新本地状态并重新创建标记
                      setRestaurants(prev => prev.map(r => 
                        r.id === restaurant.id 
                          ? { ...r, latitude: location.latitude, longitude: location.longitude }
                          : r
                      ))
                      // 触发标记更新（使用防抖机制，避免频繁调用）
                      updateMarkers()
                    } else {
                      console.error('[Map] 数据库更新失败:', error)
                    }
                  })
              } else {
                // 移除频繁的调试日志，避免控制台刷屏
              }
            }).catch(err => {
              // 只保留错误日志
              console.error('[Map] 地理编码失败:', restaurant.name, err)
            })
          } else {
            // 移除频繁的调试日志，避免控制台刷屏
          }
          return
        }

        const hasActiveOrders = activeOrderRestaurantIds.has(restaurant.id)
        const markerHTML = createMarkerHTML(restaurant, hasActiveOrders)

        // 使用解析后的经纬度（再次验证确保有效）
        // AMap 使用 [经度, 纬度] 格式
        // 最终验证：确保坐标是有效数字且在合理范围内
        if (!isFinite(lng) || !isFinite(lat) || 
            isNaN(lng) || isNaN(lat) ||
            lng < -180 || lng > 180 || 
            lat < -90 || lat > 90) {
          // 静默跳过无效坐标，避免控制台刷屏和地图错误
          return
        }
        
        const markerPosition: [number, number] = [lng, lat]
        
        // 移除调试日志，避免控制台刷屏
        // 创建HTML标记
        let marker: any
        try {
          marker = new AMap.Marker({
            position: markerPosition,
            content: markerHTML,
            offset: new AMap.Pixel(-20, -20),
            zIndex: 100,
          })
        } catch (error) {
          // 捕获创建标记时的错误，避免地图崩溃
          console.error('[Map] 创建标记失败:', restaurant.name, error)
          return
        }

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
          const restaurantId = restaurant.id
          
          // 清除之前的定时器
          const existingTimer = markerClickTimersRef.current.get(restaurantId)
          if (existingTimer) {
            clearTimeout(existingTimer)
          }

          // 延迟执行，如果300ms内没有双击，则执行单击操作
          const clickTimer = setTimeout(() => {
            const isDoubleClick = markerDoubleClickFlagsRef.current.get(restaurantId) || false
            if (!isDoubleClick) {
              // 关闭其他信息窗口
              infoWindowsRef.current.forEach(iw => {
                try {
                  iw.close()
                } catch (e) {
                  // 忽略错误
                }
              })
              
              // 打开当前信息窗口
              const position = marker.getPosition()
              if (position) {
                // 验证位置坐标是否有效
                const posLng = position.getLng()
                const posLat = position.getLat()
                if (!isFinite(posLng) || !isFinite(posLat) || isNaN(posLng) || isNaN(posLat)) {
                  // 静默跳过无效坐标，避免控制台刷屏
                  return
                }
                
                infoWindow.open(map, position)
                setSelectedMarkerRestaurant(restaurant)
                // 移除调试日志，避免控制台刷屏
              }
            }
            // 重置双击标志
            markerDoubleClickFlagsRef.current.set(restaurantId, false)
            markerClickTimersRef.current.delete(restaurantId)
          }, 300)
          
          markerClickTimersRef.current.set(restaurantId, clickTimer)
        })

        // 双击标记平滑追踪到该餐厅并放大到最大视图
        marker.on('dblclick', (e: any) => {
          const restaurantId = restaurant.id
          
          // 阻止事件冒泡
          if (e && e.domEvent) {
            e.domEvent.stopPropagation()
            e.domEvent.preventDefault()
          }
          
          // 标记为双击，阻止单击事件执行
          markerDoubleClickFlagsRef.current.set(restaurantId, true)
          
          // 清除单击定时器
          const existingTimer = markerClickTimersRef.current.get(restaurantId)
          if (existingTimer) {
            clearTimeout(existingTimer)
            markerClickTimersRef.current.delete(restaurantId)
          }

          // 关闭所有信息窗口
          infoWindowsRef.current.forEach(iw => {
            try {
              iw.close()
            } catch (e) {
              // 忽略错误
            }
          })

          const position = marker.getPosition()
          if (position) {
            // 验证位置坐标是否有效
            const posLng = position.getLng()
            const posLat = position.getLat()
            if (!isFinite(posLng) || !isFinite(posLat) || isNaN(posLng) || isNaN(posLat)) {
              // 静默跳过无效坐标，避免控制台刷屏
              return
            }
            
            // 移除调试日志，避免控制台刷屏
            // 使用 setZoomAndCenter 实现平滑动画
            // 参数：缩放级别、中心点、是否立即执行（false表示使用动画）
            map.setZoomAndCenter(18, position, false)
            
            // 等待动画完成后再打开信息窗口
            setTimeout(() => {
              // 再次检查是否仍然是双击（防止用户快速操作）
              const stillDoubleClick = markerDoubleClickFlagsRef.current.get(restaurantId)
              if (stillDoubleClick) {
                infoWindow.open(map, position)
                setSelectedMarkerRestaurant(restaurant)
                // 移除调试日志，避免控制台刷屏
                // 重置标志
                markerDoubleClickFlagsRef.current.set(restaurantId, false)
              }
            }, 1000) // 等待动画完成
          }
        })

        map.add(marker)
        markersRef.current.push(marker)
        infoWindowsRef.current.push(infoWindow)
        
        // 存储标记和信息窗口的映射关系，用于定位功能
        markerMapRef.current.set(restaurant.id, { marker, infoWindow })
        // 移除调试日志，避免控制台刷屏
      })
      
      // 移除调试日志，避免控制台刷屏
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
  }, [restaurants, orders, servicePoints, showServicePoints, showHeatmap, geocodeAddress, supabase])

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
      // 移除调试日志，避免控制台刷屏
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

        // 移除调试日志，避免控制台刷屏
        // 创建地图实例，使用计算出的中心点和缩放级别
        const map = new AMap.Map(mapContainerRef.current, {
          mapStyle: 'amap://styles/darkblue',
          center: center,
          zoom: zoom,
          viewMode: '3D',
        })

        mapInstanceRef.current = map

        // 加载必要的地图插件（Geocoder 和 PlaceSearch）
        if (AMap.plugin) {
          AMap.plugin(['AMap.Geocoder', 'AMap.PlaceSearch'], () => {
            // 移除调试日志，避免控制台刷屏
          })
        }

        // 地图加载完成
        map.on('complete', () => {
          // 移除调试日志，避免控制台刷屏
          setMapLoaded(true)
          // 地图加载完成后，尝试更新没有经纬度的餐厅坐标
          // 使用函数式更新，确保获取最新的 restaurants 状态
          setTimeout(() => {
            setRestaurants(currentRestaurants => {
              if (currentRestaurants.length > 0) {
                updateRestaurantCoordinates(currentRestaurants)
              }
              return currentRestaurants
            })
          }, 1000)
        })

        // 如果地图已经加载完成
        if (map.getStatus() === 'complete') {
          // 移除调试日志，避免控制台刷屏
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
  }, [calculateMapCenterAndZoom, updateRestaurantCoordinates])

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

  // 当餐厅、订单、服务点数据或显示状态更新时，更新标记和范围（使用防抖机制）
  useEffect(() => {
    if (mapInstanceRef.current && mapLoaded) {
      // 清除之前的防抖定时器
      if (updateMarkersTimerRef.current) {
        clearTimeout(updateMarkersTimerRef.current)
      }
      
      // 使用防抖机制，避免频繁调用（延迟300ms）
      updateMarkersTimerRef.current = setTimeout(() => {
        updateMarkers()
      }, 300)
      
      // 如果餐厅数据更新后，检查是否有需要地理编码的餐厅
      const needsGeocode = restaurants.some(
        r => r.address && 
        r.address.trim() !== '' && 
        r.address !== '地址待完善' &&
        (!r.latitude || !r.longitude || isNaN(r.latitude) || isNaN(r.longitude))
      )
      
      if (needsGeocode && typeof window !== 'undefined' && (window as any).AMap) {
        // 移除调试日志，避免控制台刷屏
        setTimeout(() => {
          updateRestaurantCoordinates(restaurants)
        }, 1000)
      }
      
      // 清理防抖定时器
      return () => {
        if (updateMarkersTimerRef.current) {
          clearTimeout(updateMarkersTimerRef.current)
        }
      }
    }
  }, [restaurants, orders, servicePoints, showServicePoints, showHeatmap, mapLoaded, updateMarkers, updateRestaurantCoordinates])

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
                      className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:border-blue-500/50 ${
                        isPending 
                          ? getOrderStatusStyle(order.status) + " animate-pulse-subtle"
                          : "border-slate-700/50 bg-slate-800/50"
                      }`}
                      onClick={async () => {
                        // 根据订单类型跳转到相应的管理页面
                        // 模糊匹配逻辑：包含"维修"或"repair"（不区分大小写），或者等于"维修服务"
                        const serviceType = order.service_type || ""
                        const normalizedType = serviceType.toLowerCase()
                        const isRepairOrder = 
                          serviceType === "维修服务" ||
                          serviceType.includes("维修") ||
                          normalizedType.includes("repair")
                        
                        if (isRepairOrder) {
                          // 跳转到报修管理，使用URL参数传递ID
                          setActiveMenu("repairs")
                          // 使用URL参数，让useEffect自动处理详情弹窗
                          const newUrl = `${window.location.pathname}?id=${order.id}`
                          router.push(newUrl, { scroll: false })
                          // 确保数据已加载
                          await loadRepairs()
                        } else {
                          // 其他类型的订单，可以跳转到订单管理或显示提示
                          alert(`订单类型: ${order.service_type}\n订单ID: ${order.id}\n状态: ${order.status}`)
                        }
                      }}
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
    // 按服务类型分类
    // 模糊匹配逻辑：包含"维修"或"repair"（不区分大小写），或者等于"维修服务"
    const repairOrders = orders.filter((o) => {
      const serviceType = o.service_type || ""
      const normalizedType = serviceType.toLowerCase()
      return serviceType === "维修服务" || serviceType.includes("维修") || normalizedType.includes("repair")
    })
    const deliveryOrders = orders.filter((o) => o.service_type?.includes("配送") || o.service_type === "燃料配送")
    const otherOrders = orders.filter((o) => {
      const serviceType = o.service_type || ""
      const normalizedType = serviceType.toLowerCase()
      // 排除维修订单（模糊匹配）和配送订单
      const isRepair = serviceType === "维修服务" || serviceType.includes("维修") || normalizedType.includes("repair")
      const isDelivery = serviceType.includes("配送") || serviceType === "燃料配送"
      return !isRepair && !isDelivery
    })

    // 按状态分类
    const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "待处理")
    const deliveringOrders = orders.filter((o) => o.status === "delivering" || o.status === "配送中" || o.status === "进行中" || o.status === "processing")
    const completedOrders = orders.filter((o) => o.status === "completed" || o.status === "已完成")

    // 根据筛选条件显示订单
    const displayOrders = orderServiceTypeFilter === "all" 
      ? orders 
      : orderServiceTypeFilter === "维修服务"
        ? repairOrders
        : orderServiceTypeFilter === "燃料配送"
          ? deliveryOrders
          : otherOrders

    // 获取服务类型标签和颜色
    const getServiceTypeBadge = (serviceType: string) => {
      // 模糊匹配逻辑：包含"维修"或"repair"（不区分大小写），或者等于"维修服务"
      const normalizedType = (serviceType || "").toLowerCase()
      if (serviceType === "维修服务" || serviceType?.includes("维修") || normalizedType.includes("repair")) {
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">维修服务</Badge>
      } else if (serviceType?.includes("配送") || serviceType === "燃料配送") {
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">燃料配送</Badge>
      } else if (serviceType?.includes("租赁") || serviceType?.includes("设备")) {
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">{serviceType}</Badge>
      } else {
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">{serviceType || "其他"}</Badge>
      }
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">订单管理</h1>
          <p className="text-slate-400">按业务类型管理所有订单</p>
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
              <CardDescription className="text-slate-400">进行中</CardDescription>
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

        {/* 业务类型统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-red-900/30 to-red-950/50 border-red-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-red-300">维修服务订单</CardDescription>
              <CardTitle className="text-2xl text-red-400">{repairOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/50 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-300">燃料配送订单</CardDescription>
              <CardTitle className="text-2xl text-blue-400">{deliveryOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-purple-900/30 to-purple-950/50 border-purple-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-300">其他订单</CardDescription>
              <CardTitle className="text-2xl text-purple-400">{otherOrders.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 筛选器 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">筛选条件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-400">服务类型:</label>
                <Select value={orderServiceTypeFilter} onValueChange={setOrderServiceTypeFilter}>
                  <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="选择服务类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部订单</SelectItem>
                    <SelectItem value="维修服务">维修服务</SelectItem>
                    <SelectItem value="燃料配送">燃料配送</SelectItem>
                    <SelectItem value="其他">其他订单</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-400">订单状态:</label>
                <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="pending">待处理</SelectItem>
                    <SelectItem value="delivering">进行中</SelectItem>
                    <SelectItem value="processing">处理中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 订单列表 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">
              {orderServiceTypeFilter === "all" ? "所有订单" : orderServiceTypeFilter === "维修服务" ? "维修服务订单" : orderServiceTypeFilter === "燃料配送" ? "燃料配送订单" : "其他订单"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              共 {displayOrders.length} 条订单
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="text-center py-8">
                <div className="inline-block h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 mt-2 text-sm">加载中...</p>
              </div>
            ) : displayOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">暂无订单</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayOrders.map((order) => {
                  const isPending = order.status === "pending" || order.status === "待处理"
                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:border-blue-500/50 ${
                        isPending 
                          ? getOrderStatusStyle(order.status) + " animate-pulse-subtle"
                          : "border-slate-700/50 bg-slate-800/50"
                      }`}
                      onClick={async () => {
                        // 如果是维修订单，跳转到报修管理
                        const isRepairOrder = 
                          order.service_type?.includes("维修") || 
                          order.service_type === "维修服务" ||
                          order.service_type?.toLowerCase().includes("repair")
                        
                        if (isRepairOrder) {
                          setActiveMenu("repairs")
                          // 使用URL参数，让useEffect自动处理详情弹窗
                          const newUrl = `${window.location.pathname}?id=${order.id}`
                          router.push(newUrl, { scroll: false })
                          // 确保数据已加载
                          await loadRepairs()
                        }
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-4 w-4 text-blue-400" />
                            <span className="font-semibold text-white">{order.restaurant_name}</span>
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                              {order.id.slice(0, 8)}
                            </Badge>
                            {getServiceTypeBadge(order.service_type || "")}
                          </div>
                        </div>
                        <Badge
                          className={
                            isPending
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              : order.status === "delivering" || order.status === "配送中" || order.status === "processing" || order.status === "进行中"
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                : "bg-green-500/20 text-green-400 border-green-500/30"
                          }
                        >
                          {isPending ? "待处理" : order.status === "delivering" || order.status === "配送中" || order.status === "processing" || order.status === "进行中" ? "进行中" : "已完成"}
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

  // 渲染报修管理
  const renderRepairs = () => {
    const pendingRepairs = repairs.filter((r) => r.status === "pending")
    const processingRepairs = repairs.filter((r) => r.status === "processing")
    const completedRepairs = repairs.filter((r) => r.status === "completed")
    const cancelledRepairs = repairs.filter((r) => r.status === "cancelled")

    // 暴力显示逻辑：移除所有多余的过滤逻辑，直接使用 repairs（接口已经根据状态筛选过了）
    const filteredRepairs = repairs

    const getStatusColor = (status: string) => {
      switch (status) {
        case "pending":
          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        case "processing":
          return "bg-blue-500/20 text-blue-400 border-blue-500/30"
        case "completed":
          return "bg-green-500/20 text-green-400 border-green-500/30"
        case "cancelled":
          return "bg-red-500/20 text-red-400 border-red-500/30"
        default:
          return "bg-slate-500/20 text-slate-400 border-slate-500/30"
      }
    }

    const getStatusLabel = (status: string) => {
      switch (status) {
        case "pending":
          return "待处理"
        case "processing":
          return "处理中"
        case "completed":
          return "已完成"
        case "cancelled":
          return "已取消"
        default:
          return status
      }
    }

    const getUrgencyColor = (urgency?: string) => {
      switch (urgency) {
        case "high":
          return "text-red-400"
        case "medium":
          return "text-yellow-400"
        case "low":
          return "text-green-400"
        default:
          return "text-slate-400"
      }
    }

    const getUrgencyLabel = (urgency?: string) => {
      switch (urgency) {
        case "high":
          return "高"
        case "medium":
          return "中"
        case "low":
          return "低"
        default:
          return "未设置"
      }
    }

    // 获取服务类型信息（图标、颜色、标签）
    const getServiceTypeInfo = (serviceType: string) => {
      const normalizedType = (serviceType || "").toLowerCase()
      
      // 维修服务
      if (serviceType === "维修服务" || serviceType.includes("维修") || normalizedType.includes("repair")) {
        return {
          icon: Wrench,
          label: "维修服务",
          color: "bg-green-500/20 text-green-400 border-green-500/30",
          iconColor: "text-green-400",
        }
      }
      
      // 清洁服务
      if (serviceType === "清洁服务" || serviceType.includes("清洁") || serviceType.includes("清洗") || normalizedType.includes("clean")) {
        return {
          icon: Droplet,
          label: "清洁服务",
          color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
          iconColor: "text-cyan-400",
        }
      }
      
      // 工程改造
      if (serviceType === "工程改造" || serviceType.includes("改造") || serviceType.includes("工程") || normalizedType.includes("renovation") || normalizedType.includes("construction")) {
        return {
          icon: HardHat,
          label: "工程改造",
          color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
          iconColor: "text-purple-400",
        }
      }
      
      // 默认
      return {
        icon: Wrench,
        label: serviceType || "未知服务",
        color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        iconColor: "text-slate-400",
      }
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">报修管理</h1>
          <p className="text-slate-400">管理所有报修工单和维修状态</p>
        </div>

        {/* 报修统计 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="bg-gradient-to-br from-slate-900/90 to-purple-950/90 border-purple-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">总报修数</CardDescription>
              <CardTitle className="text-3xl text-white">{repairs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-yellow-950/90 border-yellow-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">待处理</CardDescription>
              <CardTitle className="text-3xl text-yellow-400">{pendingRepairs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">处理中</CardDescription>
              <CardTitle className="text-3xl text-blue-400">{processingRepairs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-green-950/90 border-green-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">已完成</CardDescription>
              <CardTitle className="text-3xl text-green-400">{completedRepairs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-red-950/90 border-red-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">已取消</CardDescription>
              <CardTitle className="text-3xl text-red-400">{cancelledRepairs.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 筛选器 - 优化布局 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-purple-950/90 border-purple-800/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">筛选条件</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 状态筛选 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                状态筛选
              </label>
              <div className="flex flex-wrap gap-2.5">
                {["all", "pending", "processing", "completed", "cancelled"].map((status) => (
                  <Button
                    key={status}
                    variant={repairStatusFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRepairStatusFilter(status)}
                    className={
                      repairStatusFilter === status
                        ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/30 border-0 px-4 h-9 font-medium transition-all"
                        : "border-slate-600/50 text-slate-300 hover:bg-slate-800/50 hover:border-slate-500 hover:text-white px-4 h-9 font-medium transition-all"
                    }
                  >
                    {status === "all" ? "全部" : getStatusLabel(status)}
                  </Button>
                ))}
              </div>
            </div>

            {/* 分隔线 */}
            <div className="border-t border-slate-700/50"></div>

            {/* 服务类型筛选 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                服务类型筛选
              </label>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { value: "all", label: "全部", icon: null },
                  { value: "repair", label: "维修服务", icon: Wrench },
                  { value: "cleaning", label: "清洁服务", icon: Droplet },
                  { value: "renovation", label: "工程改造", icon: HardHat },
                ].map((type) => {
                  const IconComponent = type.icon
                  return (
                    <Button
                      key={type.value}
                      variant={repairServiceTypeFilter === type.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRepairServiceTypeFilter(type.value)}
                      className={
                        repairServiceTypeFilter === type.value
                          ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/30 border-0 px-4 h-9 font-medium transition-all"
                          : "border-slate-600/50 text-slate-300 hover:bg-slate-800/50 hover:border-slate-500 hover:text-white px-4 h-9 font-medium transition-all"
                      }
                    >
                      {IconComponent && <IconComponent className="h-3.5 w-3.5 mr-1.5" />}
                      {type.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 报修列表 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-purple-950/90 border-purple-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">报修工单列表</CardTitle>
            <CardDescription className="text-slate-400">点击工单查看详情和更新状态</CardDescription>
          </CardHeader>
          <CardContent>
            {/* 添加状态调试：在页面顶部临时加一行文字显示工单总数 */}
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-400 font-semibold">
                当前加载到的工单总数：{repairs.length}
              </p>
            </div>

            {isLoadingRepairs ? (
              <div className="text-center py-8">
                <div className="inline-block h-6 w-6 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 mt-2 text-sm">加载中...</p>
              </div>
            ) : repairs.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">暂无报修单（已连接数据库，但未匹配到维修类型数据）</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 暴力显示逻辑：移除所有多余的过滤逻辑，只要接口返回了数据，就必须全部列出来 */}
                {repairs.map((repair) => {
                  // 从 restaurants state 中查找餐厅信息（因为 API 不返回 restaurants 关联数据）
                  const restaurant = restaurants.find((r) => r.id === repair.restaurant_id)
                  return (
                    <div
                      key={repair.id}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:border-purple-500/50 ${
                        repair.status === "pending"
                          ? "border-yellow-500/50 bg-yellow-500/5"
                          : "border-slate-700/50 bg-slate-800/50"
                      }`}
                      onClick={() => {
                        setSelectedRepair(repair)
                        setRepairUpdateStatus(repair.status)
                        setRepairUpdateAmount(repair.amount?.toString() || "")
                        setRepairAssignedWorker(repair.assigned_to || repair.worker_id || "")
                        setIsRepairDetailDialogOpen(true)
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Building2 className="h-4 w-4 text-purple-400" />
                            <span className="font-semibold text-white">
                              {restaurant?.name || "未知餐厅"}
                            </span>
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                              {repair.id.slice(0, 8)}
                            </Badge>
                            {/* 服务类型标签 */}
                            {(() => {
                              const serviceInfo = getServiceTypeInfo(repair.service_type || "")
                              const ServiceIcon = serviceInfo.icon
                              return (
                                <Badge className={`text-xs ${serviceInfo.color} flex items-center gap-1`}>
                                  <ServiceIcon className={`h-3 w-3 ${serviceInfo.iconColor}`} />
                                  {serviceInfo.label}
                                </Badge>
                              )
                            })()}
                            {repair.urgency && (
                              <Badge className={`text-xs ${getUrgencyColor(repair.urgency)} border-current/30`}>
                                紧急: {getUrgencyLabel(repair.urgency)}
                              </Badge>
                            )}
                          </div>
                          {/* 渲染语音播放器：检查 audio_url 字段，如果有值，必须显示 HTML5 音频播放器 */}
                          {repair.audio_url && repair.audio_url.trim() !== "" && (
                            <div className="ml-6 mt-2 mb-2">
                              <audio 
                                controls 
                                src={repair.audio_url}
                                className="w-full mt-2"
                              >
                                您的浏览器不支持音频播放
                              </audio>
                            </div>
                          )}
                          {/* 处理空描述：如果 description 字段为空，页面上请统一显示 '[语音报修内容]' */}
                          <div className="text-sm text-slate-300 ml-6 mb-1">
                            {repair.description && repair.description.trim() !== "" 
                              ? repair.description 
                              : "[语音报修内容]"}
                          </div>
                          {/* 设备信息显示：如果 device_id 为空，显示 [非设备报修：环境/通用维修] */}
                          <div className="text-xs text-slate-500 ml-6 mt-1">
                            {(repair as any).device_id && (repair as any).device_id.trim() !== ""
                              ? `设备ID: ${(repair as any).device_id}`
                              : "[非设备报修：环境/通用维修]"}
                          </div>
                          {restaurant?.contact_phone && (
                            <div className="text-xs text-slate-500 ml-6 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {restaurant.contact_phone}
                            </div>
                          )}
                          {(repair.assigned_to || repair.worker_id) && (
                            <div className="text-xs text-blue-400 ml-6 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              已分配: {workers.find((w) => w.id === (repair.assigned_to || repair.worker_id))?.name || "未知工人"}
                            </div>
                          )}
                        </div>
                        <Badge className={`text-xs ${getStatusColor(repair.status)}`}>
                          {getStatusLabel(repair.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(repair.created_at).toLocaleString("zh-CN")}
                          </div>
                        </div>
                        <div className="text-lg font-semibold text-white">
                          {repair.amount > 0 ? `¥${repair.amount.toFixed(2)}` : "待定价"}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 报修详情对话框 */}
        <Dialog open={isRepairDetailDialogOpen} onOpenChange={setIsRepairDetailDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                {(() => {
                  const serviceInfo = getServiceTypeInfo(selectedRepair?.service_type || "")
                  const ServiceIcon = serviceInfo.icon
                  return <ServiceIcon className={`h-5 w-5 ${serviceInfo.iconColor}`} />
                })()}
                服务工单详情
                {selectedRepair?.audio_url && (
                  <Mic className="h-5 w-5 text-purple-400" />
                )}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                查看服务详情并更新状态
              </DialogDescription>
            </DialogHeader>

            {selectedRepair && (
              <div className="space-y-4">
                {/* 基本信息 */}
                <div className="space-y-2">
                  <Label className="text-slate-300">服务类型</Label>
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    {(() => {
                      const serviceInfo = getServiceTypeInfo(selectedRepair.service_type || "")
                      const ServiceIcon = serviceInfo.icon
                      return (
                        <Badge className={`${serviceInfo.color} flex items-center gap-2 w-fit`}>
                          <ServiceIcon className={`h-4 w-4 ${serviceInfo.iconColor}`} />
                          <span>{serviceInfo.label}</span>
                        </Badge>
                      )
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">餐厅信息</Label>
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-white font-medium">
                      {restaurants.find((r) => r.id === selectedRepair.restaurant_id)?.name || "未知餐厅"}
                    </p>
                    {restaurants.find((r) => r.id === selectedRepair.restaurant_id)?.address && (
                      <p className="text-sm text-slate-400 mt-1">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {restaurants.find((r) => r.id === selectedRepair.restaurant_id)?.address}
                      </p>
                    )}
                    {restaurants.find((r) => r.id === selectedRepair.restaurant_id)?.contact_phone && (
                      <p className="text-sm text-slate-400 mt-1">
                        <Phone className="h-3 w-3 inline mr-1" />
                        {restaurants.find((r) => r.id === selectedRepair.restaurant_id)?.contact_phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* 设备信息 */}
                <div className="space-y-2">
                  <Label className="text-slate-300">设备信息</Label>
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-white">
                      {(selectedRepair as any).device_id && (selectedRepair as any).device_id.trim() !== ""
                        ? `设备ID: ${(selectedRepair as any).device_id}`
                        : "[非设备报修：环境/通用维修]"}
                    </p>
                  </div>
                </div>

                {/* 问题描述 */}
                <div className="space-y-2">
                  <Label className="text-slate-300">问题描述</Label>
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    {/* 渲染语音播放器：检查 audio_url 字段，如果有值，必须显示 HTML5 音频播放器 */}
                    {selectedRepair.audio_url && selectedRepair.audio_url.trim() !== "" && (
                      <div className="mb-3">
                        <audio 
                          controls 
                          src={selectedRepair.audio_url}
                          className="w-full mt-2"
                        >
                          您的浏览器不支持音频播放
                        </audio>
                      </div>
                    )}
                    {/* 处理空描述：如果 description 字段为空，页面上请统一显示 '[语音报修内容]' */}
                    <p className="text-white">
                      {selectedRepair.description && selectedRepair.description.trim() !== "" 
                        ? selectedRepair.description 
                        : "[语音报修内容]"}
                    </p>
                  </div>
                </div>

                {/* 当前状态 */}
                <div className="space-y-2">
                  <Label className="text-slate-300">当前状态</Label>
                  <Badge className={getStatusColor(selectedRepair.status)}>
                    {getStatusLabel(selectedRepair.status)}
                  </Badge>
                </div>

                {/* 更新状态 */}
                <div className="space-y-2">
                  <Label className="text-slate-300">更新状态</Label>
                  <Select value={repairUpdateStatus} onValueChange={setRepairUpdateStatus}>
                    <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="pending" className="text-white hover:bg-slate-700">
                        待处理
                      </SelectItem>
                      <SelectItem value="processing" className="text-white hover:bg-slate-700">
                        处理中
                      </SelectItem>
                      <SelectItem value="completed" className="text-white hover:bg-slate-700">
                        已完成
                      </SelectItem>
                      <SelectItem value="cancelled" className="text-white hover:bg-slate-700">
                        已取消
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 分配工人 */}
                <div className="space-y-2">
                  <Label className="text-slate-300">分配工人</Label>
                  <Select value={repairAssignedWorker} onValueChange={setRepairAssignedWorker}>
                    <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="选择工人（可选）" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="none" className="text-white hover:bg-slate-700">
                        不分配
                      </SelectItem>
                      {workers
                        .filter((w) => {
                          // 只显示有维修权限的工人
                          const workerTypes = Array.isArray(w.worker_type)
                            ? w.worker_type
                            : typeof w.worker_type === "string"
                            ? w.worker_type.includes("repair")
                              ? ["repair"]
                              : w.worker_type.startsWith("[")
                              ? JSON.parse(w.worker_type)
                              : [w.worker_type]
                            : []
                          return workerTypes.includes("repair") || workerTypes.some((t: string) => t.includes("repair"))
                        })
                        .map((worker) => (
                          <SelectItem key={worker.id} value={worker.id} className="text-white hover:bg-slate-700">
                            {worker.name} ({worker.phone})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 维修金额 */}
                {repairUpdateStatus === "completed" && (
                  <div className="space-y-2">
                    <Label className="text-slate-300">
                      维修金额 <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      type="number"
                      placeholder="请输入维修金额"
                      value={repairUpdateAmount}
                      onChange={(e) => setRepairUpdateAmount(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}

                {/* 时间信息 */}
                <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
                  <div>
                    <span className="text-slate-500">创建时间:</span>
                    <p className="text-white mt-1">
                      {new Date(selectedRepair.created_at).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">更新时间:</span>
                    <p className="text-white mt-1">
                      {new Date(selectedRepair.updated_at).toLocaleString("zh-CN")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setIsRepairDetailDialogOpen(false)}
                className="text-slate-400 hover:text-white"
                disabled={isUpdatingRepair}
              >
                取消
              </Button>
              <Button
                onClick={() => {
                  if (repairUpdateStatus === "completed" && !repairUpdateAmount) {
                    alert("完成报修必须填写维修金额")
                    return
                  }
                  const amount = repairUpdateStatus === "completed" ? parseFloat(repairUpdateAmount) : undefined
                  // 如果选择的是"不分配"（"none"），则传递 undefined
                  const assignedTo = repairAssignedWorker === "none" ? undefined : repairAssignedWorker
                  updateRepairStatus(selectedRepair.id, repairUpdateStatus, amount, assignedTo)
                }}
                disabled={isUpdatingRepair || !repairUpdateStatus}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isUpdatingRepair ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    更新中...
                  </>
                ) : (
                  "更新状态"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // 渲染设备租赁管理
  const renderEquipmentRental = () => {
    const pendingOrders = rentalOrders.filter((o) => o.order_status === "pending")
    const confirmedOrders = rentalOrders.filter((o) => o.order_status === "confirmed")
    const activeOrders = rentalOrders.filter((o) => o.order_status === "active")
    const completedOrders = rentalOrders.filter((o) => o.order_status === "completed")
    const cancelledOrders = rentalOrders.filter((o) => o.order_status === "cancelled")

    const filteredOrders = rentalOrders.filter((order) => {
      if (rentalOrderStatusFilter === "all") return true
      return order.order_status === rentalOrderStatusFilter
    })

    const getStatusColor = (status: string) => {
      switch (status) {
        case "pending":
          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        case "confirmed":
          return "bg-blue-500/20 text-blue-400 border-blue-500/30"
        case "active":
          return "bg-green-500/20 text-green-400 border-green-500/30"
        case "completed":
          return "bg-slate-500/20 text-slate-400 border-slate-500/30"
        case "cancelled":
          return "bg-red-500/20 text-red-400 border-red-500/30"
        default:
          return "bg-slate-500/20 text-slate-400 border-slate-500/30"
      }
    }

    const getStatusLabel = (status: string) => {
      switch (status) {
        case "pending":
          return "待确认"
        case "confirmed":
          return "已确认"
        case "active":
          return "租赁中"
        case "completed":
          return "已完成"
        case "cancelled":
          return "已取消"
        default:
          return status
      }
    }

    const getPaymentStatusColor = (status: string) => {
      switch (status) {
        case "paid":
          return "bg-green-500/20 text-green-400 border-green-500/30"
        case "partial":
          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        case "pending":
          return "bg-orange-500/20 text-orange-400 border-orange-500/30"
        case "refunded":
          return "bg-blue-500/20 text-blue-400 border-blue-500/30"
        default:
          return "bg-slate-500/20 text-slate-400 border-slate-500/30"
      }
    }

    const getPaymentStatusLabel = (status: string) => {
      switch (status) {
        case "paid":
          return "已支付"
        case "partial":
          return "部分支付"
        case "pending":
          return "待支付"
        case "refunded":
          return "已退款"
        default:
          return status
      }
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">设备租赁管理</h1>
          <p className="text-slate-400">管理所有设备租赁订单</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">总订单数</CardDescription>
              <CardTitle className="text-3xl text-white">{rentalOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-yellow-950/90 border-yellow-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">待确认</CardDescription>
              <CardTitle className="text-3xl text-yellow-400">{pendingOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">租赁中</CardDescription>
              <CardTitle className="text-3xl text-blue-400">{activeOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-green-950/90 border-green-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">已完成</CardDescription>
              <CardTitle className="text-3xl text-green-400">{completedOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-red-950/90 border-red-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">已取消</CardDescription>
              <CardTitle className="text-3xl text-red-400">{cancelledOrders.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 筛选器 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">筛选条件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2.5">
              {["all", "pending", "confirmed", "active", "completed", "cancelled"].map((status) => (
                <Button
                  key={status}
                  variant={rentalOrderStatusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRentalOrderStatusFilter(status)}
                  className={
                    rentalOrderStatusFilter === status
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/30 border-0 px-4 h-9 font-medium transition-all"
                      : "border-slate-600/50 text-slate-300 hover:bg-slate-800/50 hover:border-slate-500 hover:text-white px-4 h-9 font-medium transition-all"
                  }
                >
                  {status === "all" ? "全部" : getStatusLabel(status)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 订单列表 */}
        {isLoadingRentalOrders ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
            <span className="text-slate-400">加载中...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">暂无租赁订单</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card
                key={order.id}
                className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm hover:border-blue-500/50 transition-all cursor-pointer"
                onClick={() => {
                  setSelectedRentalOrder(order)
                  setIsRentalOrderDetailDialogOpen(true)
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-bold text-white">
                          {order.equipment?.name || "未知设备"}
                        </h3>
                        <Badge className={getStatusColor(order.order_status)}>
                          {getStatusLabel(order.order_status)}
                        </Badge>
                        <Badge className={getPaymentStatusColor(order.payment_status)}>
                          {getPaymentStatusLabel(order.payment_status)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">订单号：</span>
                          <span className="text-white">{order.order_number}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">餐厅：</span>
                          <span className="text-white">{order.restaurants?.name || "未知"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">数量：</span>
                          <span className="text-white">{order.quantity} 台</span>
                        </div>
                        <div>
                          <span className="text-slate-400">租期：</span>
                          <span className="text-white">{order.rental_period} 个月</span>
                        </div>
                        <div>
                          <span className="text-slate-400">开始日期：</span>
                          <span className="text-white">{order.start_date}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">结束日期：</span>
                          <span className="text-white">{order.end_date || "未设置"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">总金额：</span>
                          <span className="text-blue-400 font-bold">¥{order.total_amount?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">押金：</span>
                          <span className="text-white">¥{order.deposit_amount?.toFixed(2) || "0.00"}</span>
                        </div>
                      </div>
                    </div>
                    <Eye className="h-5 w-5 text-slate-400 ml-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 订单详情对话框 */}
        <Dialog open={isRentalOrderDetailDialogOpen} onOpenChange={setIsRentalOrderDetailDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">租赁订单详情</DialogTitle>
              <DialogDescription className="text-slate-400">
                订单号：{selectedRentalOrder?.order_number}
              </DialogDescription>
            </DialogHeader>

            {selectedRentalOrder && (
              <div className="space-y-4">
                {/* 设备信息 */}
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3">设备信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">设备名称：</span>
                      <span className="text-white">{selectedRentalOrder.equipment?.name || "未知"}</span>
                    </div>
                    {selectedRentalOrder.equipment?.brand && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">品牌：</span>
                        <span className="text-white">{selectedRentalOrder.equipment.brand}</span>
                      </div>
                    )}
                    {selectedRentalOrder.equipment?.model && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">型号：</span>
                        <span className="text-white">{selectedRentalOrder.equipment.model}</span>
                      </div>
                    )}
                    {selectedRentalOrder.equipment?.equipment_categories && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">分类：</span>
                        <span className="text-white">{selectedRentalOrder.equipment.equipment_categories.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 订单信息 */}
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3">订单信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">餐厅：</span>
                      <span className="text-white">{selectedRentalOrder.restaurants?.name || "未知"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">数量：</span>
                      <span className="text-white">{selectedRentalOrder.quantity} 台</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">租期：</span>
                      <span className="text-white">{selectedRentalOrder.rental_period} 个月</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">开始日期：</span>
                      <span className="text-white">{selectedRentalOrder.start_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">结束日期：</span>
                      <span className="text-white">{selectedRentalOrder.end_date || "未设置"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">订单状态：</span>
                      <Badge className={getStatusColor(selectedRentalOrder.order_status)}>
                        {getStatusLabel(selectedRentalOrder.order_status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 费用信息 */}
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3">费用信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">月租金：</span>
                      <span className="text-white">¥{selectedRentalOrder.monthly_rental_price?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">押金：</span>
                      <span className="text-white">¥{selectedRentalOrder.deposit_amount?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700">
                      <span className="text-white font-medium">总金额：</span>
                      <span className="text-blue-400 font-bold text-lg">
                        ¥{selectedRentalOrder.total_amount?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">支付状态：</span>
                      <Badge className={getPaymentStatusColor(selectedRentalOrder.payment_status)}>
                        {getPaymentStatusLabel(selectedRentalOrder.payment_status)}
                      </Badge>
                    </div>
                    {selectedRentalOrder.payment_method && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">支付方式：</span>
                        <span className="text-white">
                          {selectedRentalOrder.payment_method === "cash" ? "现金支付" :
                           selectedRentalOrder.payment_method === "alipay" ? "支付宝" :
                           selectedRentalOrder.payment_method === "wechat" ? "微信支付" :
                           selectedRentalOrder.payment_method === "bank_transfer" ? "银行转账" :
                           selectedRentalOrder.payment_method}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 联系信息 */}
                {(selectedRentalOrder.delivery_address || selectedRentalOrder.contact_phone) && (
                  <div className="bg-slate-800/50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold text-white mb-3">联系信息</h4>
                    <div className="space-y-2 text-sm">
                      {selectedRentalOrder.delivery_address && (
                        <div>
                          <span className="text-slate-400">配送地址：</span>
                          <span className="text-white ml-2">{selectedRentalOrder.delivery_address}</span>
                        </div>
                      )}
                      {selectedRentalOrder.contact_phone && (
                        <div>
                          <span className="text-slate-400">联系电话：</span>
                          <span className="text-white ml-2">{selectedRentalOrder.contact_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 备注 */}
                {selectedRentalOrder.notes && (
                  <div className="bg-slate-800/50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold text-white mb-3">备注</h4>
                    <p className="text-slate-300 text-sm">{selectedRentalOrder.notes}</p>
                  </div>
                )}

                {/* 时间信息 */}
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3">时间信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">创建时间：</span>
                      <span className="text-white">
                        {new Date(selectedRentalOrder.created_at).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    {selectedRentalOrder.updated_at && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">更新时间：</span>
                        <span className="text-white">
                          {new Date(selectedRentalOrder.updated_at).toLocaleString("zh-CN")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
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
    const getWorkerTypeLabel = (type?: string | string[] | null) => {
      if (Array.isArray(type)) {
        // 处理数组，确保每个元素都是有效的类型字符串
        const validTypes: string[] = []
        for (const t of type) {
          if (typeof t === 'string') {
            // 检查是否是JSON字符串
            if (t.startsWith('[') && t.endsWith(']')) {
              try {
                const parsed = JSON.parse(t)
                if (Array.isArray(parsed)) {
                  // 如果是数组，递归处理
                  validTypes.push(...parsed.filter((p: any) => typeof p === 'string' && ['delivery', 'repair', 'install'].includes(p)))
                } else if (typeof parsed === 'string' && ['delivery', 'repair', 'install'].includes(parsed)) {
                  validTypes.push(parsed)
                }
              } catch (e) {
                // 不是JSON，检查是否是有效类型
                if (['delivery', 'repair', 'install'].includes(t)) {
                  validTypes.push(t)
                }
              }
            } else if (['delivery', 'repair', 'install'].includes(t)) {
              validTypes.push(t)
            }
          }
        }
        // 去重并排序
        const uniqueTypes = Array.from(new Set(validTypes))
        return uniqueTypes.map(t => {
          switch (t) {
            case "delivery": return "配送员"
            case "repair": return "维修工"
            case "install": return "安装工"
            default: return t
          }
        }).join("、")
      }
      if (typeof type === 'string') {
        // 检查是否是JSON字符串
        if (type.startsWith('[') && type.endsWith(']')) {
          try {
            const parsed = JSON.parse(type)
            if (Array.isArray(parsed)) {
              return getWorkerTypeLabel(parsed) // 递归处理
            }
          } catch (e) {
            // 不是JSON，继续处理
          }
        }
        switch (type) {
          case "delivery":
            return "配送员"
          case "repair":
            return "维修工"
          case "install":
            return "安装工"
          default:
            return "未分类"
        }
      }
      return "未分类"
    }

    const getWorkerTypeColor = (type?: string | string[] | null) => {
      if (Array.isArray(type) && type.length > 1) {
        return "bg-gradient-to-r from-orange-500/20 via-purple-500/20 to-blue-500/20 text-white border-orange-500/30"
      }
      if (Array.isArray(type) && type.length === 1) {
        type = type[0]
      }
      switch (type) {
        case "delivery":
          return "bg-orange-500/20 text-orange-400 border-orange-500/30"
        case "repair":
          return "bg-purple-500/20 text-purple-400 border-purple-500/30"
        case "install":
          return "bg-blue-500/20 text-blue-400 border-blue-500/30"
        default:
          return "bg-slate-500/20 text-slate-400 border-slate-500/30"
      }
    }

    const getProductTypeLabel = (productType: string) => {
      switch (productType) {
        case "lpg":
          return "液化气"
        case "clean":
          return "热能清洁燃料"
        case "alcohol":
          return "醇基燃料"
        case "outdoor":
          return "户外环保燃料"
        default:
          return productType
      }
    }

    const deliveryWorkers = workers.filter((w) => {
      if (Array.isArray(w.worker_type)) {
        return w.worker_type.includes("delivery")
      }
      return w.worker_type === "delivery"
    })
    const repairWorkers = workers.filter((w) => {
      if (Array.isArray(w.worker_type)) {
        return w.worker_type.includes("repair")
      }
      return w.worker_type === "repair"
    })
    const installWorkers = workers.filter((w) => {
      if (Array.isArray(w.worker_type)) {
        return w.worker_type.includes("install")
      }
      return w.worker_type === "install"
    })

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">工人管理</h1>
            <p className="text-slate-400">管理配送、维修、安装工人信息</p>
          </div>
          <Button 
            onClick={() => setIsAddWorkerDialogOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            添加工人
          </Button>
        </div>

        {/* 工人统计 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">总工人数</CardDescription>
              <CardTitle className="text-3xl text-white">{workers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-orange-950/90 border-orange-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">配送员</CardDescription>
              <CardTitle className="text-3xl text-orange-400">{deliveryWorkers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-purple-950/90 border-purple-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">维修工</CardDescription>
              <CardTitle className="text-3xl text-purple-400">{repairWorkers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-cyan-950/90 border-cyan-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">安装工</CardDescription>
              <CardTitle className="text-3xl text-cyan-400">{installWorkers.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workers.map((worker) => (
            <Card key={worker.id} className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      (() => {
                        const types = Array.isArray(worker.worker_type) ? worker.worker_type : worker.worker_type ? [worker.worker_type] : []
                        if (types.length > 1) {
                          return "bg-gradient-to-br from-orange-500 via-purple-500 to-blue-500"
                        } else if (types.includes("delivery")) {
                          return "bg-gradient-to-br from-orange-500 to-red-600"
                        } else if (types.includes("repair")) {
                          return "bg-gradient-to-br from-purple-500 to-pink-600"
                        } else if (types.includes("install")) {
                          return "bg-gradient-to-br from-blue-500 to-cyan-600"
                        }
                        return "bg-gradient-to-br from-slate-500 to-slate-600"
                      })()
                    }`}>
                      {(() => {
                        const types = Array.isArray(worker.worker_type) ? worker.worker_type : worker.worker_type ? [worker.worker_type] : []
                        if (types.length > 1) {
                          return <Package className="h-6 w-6 text-white" />
                        } else if (types.includes("delivery")) {
                          return <Truck className="h-6 w-6 text-white" />
                        } else if (types.includes("repair")) {
                          return <Wrench className="h-6 w-6 text-white" />
                        } else if (types.includes("install")) {
                          return <HardHat className="h-6 w-6 text-white" />
                        }
                        return <User className="h-6 w-6 text-white" />
                      })()}
                    </div>
                    <div>
                      <CardTitle className="text-white">{worker.name}</CardTitle>
                      <CardDescription className="text-slate-400">ID: {worker.id.slice(0, 12)}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={getWorkerTypeColor(worker.worker_type)}>
                      {getWorkerTypeLabel(worker.worker_type)}
                    </Badge>
                    {worker.status === "inactive" && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        已离职
                      </Badge>
                    )}
                  </div>
                  
                  {worker.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Phone className="h-4 w-4" />
                      {worker.phone}
                    </div>
                  )}

                  {(() => {
                    const types = Array.isArray(worker.worker_type) ? worker.worker_type : worker.worker_type ? [worker.worker_type] : []
                    return types.includes("delivery")
                  })() && worker.product_types && worker.product_types.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500">负责产品类型:</div>
                      <div className="flex flex-wrap gap-1">
                        {worker.product_types.map((pt) => (
                          <Badge key={pt} variant="outline" className="text-xs border-slate-600 text-slate-400">
                            {getProductTypeLabel(pt)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700/50">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                      onClick={() => handleOpenEditDialog(worker)}
                      disabled={isDeletingWorker}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDeleteWorker(worker.id, worker.name)}
                      disabled={isDeletingWorker && deletingWorkerId === worker.id}
                    >
                      {isDeletingWorker && deletingWorkerId === worker.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          删除中...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          删除
                        </>
                      )}
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

        {/* 添加工人对话框 */}
        <Dialog open={isAddWorkerDialogOpen} onOpenChange={setIsAddWorkerDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-400" />
                添加工人
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                添加新的工人并设置业务类型和权限
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 姓名 */}
              <div className="space-y-2">
                <Label className="text-slate-300">
                  姓名 <span className="text-red-400">*</span>
                </Label>
                <Input
                  placeholder="请输入工人姓名"
                  value={newWorker.name}
                  onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* 电话 */}
              <div className="space-y-2">
                <Label className="text-slate-300">
                  联系电话 <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="tel"
                  placeholder="请输入联系电话"
                  value={newWorker.phone}
                  onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* 工人类型 - 支持多选 */}
              <div className="space-y-2">
                <Label className="text-slate-300">
                  工人类型 <span className="text-red-400">*</span>
                  <span className="text-xs text-slate-500 ml-2">（可多选，支持一人多职）</span>
                </Label>
                <div className="space-y-2 border border-slate-700 rounded-lg p-3 bg-slate-800/50">
                  {[
                    { id: "delivery", name: "配送员", icon: Truck, color: "text-orange-400" },
                    { id: "repair", name: "维修工", icon: Wrench, color: "text-purple-400" },
                    { id: "install", name: "安装工", icon: HardHat, color: "text-blue-400" },
                  ].map((type) => {
                    const Icon = type.icon
                    return (
                      <div key={type.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`worker-type-${type.id}`}
                          checked={newWorker.worker_types.includes(type.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewWorker({
                                ...newWorker,
                                worker_types: [...newWorker.worker_types, type.id],
                              })
                            } else {
                              setNewWorker({
                                ...newWorker,
                                worker_types: newWorker.worker_types.filter((wt) => wt !== type.id),
                                product_types: type.id === "delivery" ? [] : newWorker.product_types,
                              })
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                        />
                        <Label
                          htmlFor={`worker-type-${type.id}`}
                          className="text-sm text-slate-300 cursor-pointer flex items-center gap-2 flex-1"
                        >
                          <Icon className={`h-4 w-4 ${type.color}`} />
                          {type.name}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 产品类型（仅配送员） */}
              {newWorker.worker_types.includes("delivery") && (
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    负责产品类型 <span className="text-red-400">*</span>
                  </Label>
                  <div className="space-y-2">
                    {[
                      { id: "lpg", name: "液化气" },
                      { id: "clean", name: "热能清洁燃料" },
                      { id: "alcohol", name: "醇基燃料" },
                      { id: "outdoor", name: "户外环保燃料" },
                    ].map((product) => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`product-${product.id}`}
                          checked={newWorker.product_types.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewWorker({
                                ...newWorker,
                                product_types: [...newWorker.product_types, product.id],
                              })
                            } else {
                              setNewWorker({
                                ...newWorker,
                                product_types: newWorker.product_types.filter((pt) => pt !== product.id),
                              })
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                        />
                        <Label
                          htmlFor={`product-${product.id}`}
                          className="text-sm text-slate-300 cursor-pointer"
                        >
                          {product.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 状态 */}
              <div className="space-y-2">
                <Label className="text-slate-300">状态</Label>
                <Select
                  value={newWorker.status}
                  onValueChange={(value: "active" | "inactive") => {
                    setNewWorker({ ...newWorker, status: value })
                  }}
                >
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="active" className="text-white hover:bg-slate-700">
                      在职
                    </SelectItem>
                    <SelectItem value="inactive" className="text-white hover:bg-slate-700">
                      离职
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsAddWorkerDialogOpen(false)
                  setNewWorker({
                    name: "",
                    phone: "",
                    worker_types: [],
                    product_types: [],
                    status: "active",
                  })
                }}
                className="text-slate-400 hover:text-white"
                disabled={isAddingWorker}
              >
                取消
              </Button>
              <Button
                onClick={handleAddWorker}
                disabled={isAddingWorker}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isAddingWorker ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    添加中...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    添加
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 编辑工人对话框 */}
        <Dialog open={isEditWorkerDialogOpen} onOpenChange={setIsEditWorkerDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-400" />
                编辑工人信息
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                修改工人的业务类型和权限
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 姓名 */}
              <div className="space-y-2">
                <Label className="text-slate-300">
                  姓名 <span className="text-red-400">*</span>
                </Label>
                <Input
                  placeholder="请输入工人姓名"
                  value={editWorker.name}
                  onChange={(e) => setEditWorker({ ...editWorker, name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* 电话 */}
              <div className="space-y-2">
                <Label className="text-slate-300">
                  联系电话 <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="tel"
                  placeholder="请输入联系电话"
                  value={editWorker.phone}
                  onChange={(e) => setEditWorker({ ...editWorker, phone: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* 工人类型 - 支持多选 */}
              <div className="space-y-2">
                <Label className="text-slate-300">
                  工人类型 <span className="text-red-400">*</span>
                  <span className="text-xs text-slate-500 ml-2">（可多选，支持一人多职）</span>
                </Label>
                <div className="space-y-2 border border-slate-700 rounded-lg p-3 bg-slate-800/50">
                  {[
                    { id: "delivery", name: "配送员", icon: Truck, color: "text-orange-400" },
                    { id: "repair", name: "维修工", icon: Wrench, color: "text-purple-400" },
                    { id: "install", name: "安装工", icon: HardHat, color: "text-blue-400" },
                  ].map((type) => {
                    const Icon = type.icon
                    return (
                      <div key={type.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-worker-type-${type.id}`}
                          checked={editWorker.worker_types.includes(type.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditWorker({
                                ...editWorker,
                                worker_types: [...editWorker.worker_types, type.id],
                              })
                            } else {
                              setEditWorker({
                                ...editWorker,
                                worker_types: editWorker.worker_types.filter((wt) => wt !== type.id),
                                product_types: type.id === "delivery" ? [] : editWorker.product_types,
                              })
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                        />
                        <Label
                          htmlFor={`edit-worker-type-${type.id}`}
                          className="text-sm text-slate-300 cursor-pointer flex items-center gap-2 flex-1"
                        >
                          <Icon className={`h-4 w-4 ${type.color}`} />
                          {type.name}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 产品类型（仅配送员） */}
              {editWorker.worker_types.includes("delivery") && (
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    负责产品类型 <span className="text-red-400">*</span>
                  </Label>
                  <div className="space-y-2">
                    {[
                      { id: "lpg", name: "液化气" },
                      { id: "clean", name: "热能清洁燃料" },
                      { id: "alcohol", name: "醇基燃料" },
                      { id: "outdoor", name: "户外环保燃料" },
                    ].map((product) => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-product-${product.id}`}
                          checked={editWorker.product_types.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditWorker({
                                ...editWorker,
                                product_types: [...editWorker.product_types, product.id],
                              })
                            } else {
                              setEditWorker({
                                ...editWorker,
                                product_types: editWorker.product_types.filter((pt) => pt !== product.id),
                              })
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                        />
                        <Label
                          htmlFor={`edit-product-${product.id}`}
                          className="text-sm text-slate-300 cursor-pointer"
                        >
                          {product.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 状态 */}
              <div className="space-y-2">
                <Label className="text-slate-300">状态</Label>
                <Select
                  value={editWorker.status}
                  onValueChange={(value: "active" | "inactive") => {
                    setEditWorker({ ...editWorker, status: value })
                  }}
                >
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="active" className="text-white hover:bg-slate-700">
                      在职
                    </SelectItem>
                    <SelectItem value="inactive" className="text-white hover:bg-slate-700">
                      离职
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsEditWorkerDialogOpen(false)
                  setEditingWorker(null)
                  setEditWorker({
                    name: "",
                    phone: "",
                    worker_types: [],
                    product_types: [],
                    status: "active",
                  })
                }}
                className="text-slate-400 hover:text-white"
                disabled={isUpdatingWorker}
              >
                取消
              </Button>
              <Button
                onClick={handleUpdateWorker}
                disabled={isUpdatingWorker}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isUpdatingWorker ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    更新中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    保存更改
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // 加载API配置
  useEffect(() => {
    if (typeof window === 'undefined') return
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
      if (typeof window !== 'undefined') {
        localStorage.setItem("apiConfigs", JSON.stringify(configs))
      }
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
      
      // 移除调试日志，避免控制台刷屏
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
      
      // 移除调试日志，避免控制台刷屏
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
          {activeMenu === "repairs" && renderRepairs()}
          {activeMenu === "equipmentRental" && renderEquipmentRental()}
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

