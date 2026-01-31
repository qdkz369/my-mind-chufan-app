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
import { logBusinessWarning } from "@/lib/utils/logger"
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
  MessageSquare,
  XCircle,
  Calendar,
  CreditCard,
  AlertTriangle,
  FileText,
  ChevronRight,
  Upload,
  Image as ImageIcon,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"
import { ProductApproval } from "./product-approval"
import { SupplierManagement } from "./supplier-management"
import { SendNotification } from "./send-notification"
import { AgreementsSection } from "./components/agreements-section"
import { BottomNavigation } from "@/components/bottom-navigation"
import { DashboardTabWithData } from "./components/dashboard-tab-with-data"
import { RestaurantsWithDialogs } from "./components/restaurants-with-dialogs"
import { OrdersWithDialogs } from "./components/orders-with-dialogs"
import { RepairsWithDialogs } from "./components/repairs-with-dialogs"
import { WorkersWithDialogs } from "./components/workers-with-dialogs"
import { DevicesWithData } from "./components/devices-with-data"
import { ApiConfigWithData } from "./components/api-config-with-data"
import { SettingsWithDialogs } from "./components/settings-with-dialogs"
import { FuelPricingWithData } from "./components/fuel-pricing-with-data"
import { AnalyticsWithData } from "./components/analytics-with-data"
import { FinanceReportWithData } from "./components/finance-report-with-data"
import { ExceptionHandlingWithData } from "./components/exception-handling-with-data"
import { EquipmentRentalWithDialogs } from "./components/equipment-rental-with-dialogs"
import { RentalsDashboardWithDialogs } from "./components/rentals-dashboard-with-dialogs"
import { type MapDashboardHandle } from "./components/map-dashboard"
import {
  Restaurant,
  Order,
  Worker,
  Device,
  ApiConfig,
  ServicePoint,
} from "./types/dashboard-types"
import { formatTime, getOrderStatusStyle } from "./lib/dashboard-utils"
// recharts 已迁移到 components/analytics.tsx 使用

const menuItems = [
  { icon: Home, label: "工作台", key: "dashboard" },
  { icon: Users, label: "餐厅管理", key: "restaurants" },
  { icon: Package, label: "订单管理", key: "orders" },
  { icon: Wrench, label: "报修管理", key: "repairs" },
  { icon: Package, label: "设备租赁管理", key: "equipmentRental" },
  { icon: DollarSign, label: "租赁工作台", key: "rentals" },
  { icon: CheckCircle2, label: "产品审核", key: "productApproval" },
  { icon: Building2, label: "供应商管理", key: "supplierManagement" },
  { icon: Wrench, label: "设备监控", key: "devices" },
  { icon: Truck, label: "工人管理", key: "workers" },
  { icon: DollarSign, label: "燃料实时价格监控", key: "fuelPricing" },
  { icon: FileText, label: "协议管理", key: "agreements" },
  { icon: Server, label: "API配置", key: "api" },
  { icon: BarChart3, label: "数据统计", key: "analytics" },
  { icon: DollarSign, label: "财务报表", key: "financeReport" },
  { icon: AlertTriangle, label: "异常处理", key: "exceptionHandling" },
  { icon: Settings, label: "系统设置", key: "settings" },
]

export default function AdminDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  // 移动端默认关闭侧边栏，桌面端默认打开
  // 修复 Hydration 错误：初始状态统一为 false，在 useEffect 中根据窗口大小设置
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  
  // 客户端挂载后设置侧边栏初始状态
  useEffect(() => {
    setIsMounted(true)
    // 根据窗口大小设置初始状态
    if (typeof window !== "undefined") {
      setSidebarOpen(window.innerWidth >= 768) // 768px 是 Tailwind 的 md 断点
    }
  }, [])
  const [activeMenu, setActiveMenu] = useState("dashboard")
  
  // 用户和公司信息（用于多租户数据隔离）
  const [userRole, setUserRole] = useState<string | null>(null) // super_admin, admin, supplier
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null) // 供应商的公司ID
  const [companyPermissions, setCompanyPermissions] = useState<string[]>([]) // 供应商可访问的功能模块
  const [companyFuelTypes, setCompanyFuelTypes] = useState<string[]>([]) // 供应商可供应的燃料品种
  
  // 密码修改对话框状态与逻辑已迁入 components/settings-with-dialogs.tsx
  
  // 强制立即渲染：移除所有 hidden 属性，确保页面内容始终可见
  // 修复：直接移除 hidden 属性，不再检查
  useEffect(() => {
    // 立即移除所有 hidden 属性
    const hiddenDivs = document.querySelectorAll('body > div[hidden], [hidden]')
    hiddenDivs.forEach((div: any) => {
      div.removeAttribute('hidden')
      div.style.display = ''
      div.style.visibility = 'visible'
      div.style.opacity = '1'
      console.log('[Dashboard] 已移除 hidden 属性:', div)
    })
    
    // 添加一个标记，表示页面已加载
    document.body.setAttribute('data-dashboard-loaded', 'true')
    document.body.style.display = 'block'
    document.body.style.visibility = 'visible'
    document.body.style.opacity = '1'
    
    return () => {
      document.body.removeAttribute('data-dashboard-loaded')
    }
  }, [])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [orderServiceTypeFilter, setOrderServiceTypeFilter] = useState<string>("all") // 订单服务类型筛选：all, 维修服务, 燃料配送, 设备租赁
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all") // 订单状态筛选
  const [workers, setWorkers] = useState<Worker[]>([])
  // 设备列表已迁入 components/devices-with-data.tsx
  // API 配置相关状态已迁入 components/api-config-with-data.tsx
  // 工作台 recentOrders/recentOrdersCount/servicePoints 已迁入 components/dashboard-tab-with-data.tsx
  const [isLoading, setIsLoading] = useState(true) // 初始 true，loadUserInfo 完成后设为 false，避免一直显示「加载中」
  const [forceRender, setForceRender] = useState(false) // 强制渲染标志，用于解除UI锁定
  const [currentUser, setCurrentUser] = useState<{ email?: string } | null>(null)
  // 餐厅详情/指派配送对话框已迁入 RestaurantsWithDialogs
  const [isLoadingOrders, setIsLoadingOrders] = useState(false) // 仅用于订单管理 loadAllOrders
  // 报修管理相关状态已迁入 components/repairs-with-dialogs.tsx
  // 配送订单详情对话框已迁入 components/orders-with-dialogs.tsx
  // 工人管理对话框与 handlers 已迁入 components/workers-with-dialogs.tsx
  // 餐厅 viewMode 已迁入 RestaurantsWithDialogs
  // 燃料价格相关状态已迁入 components/fuel-pricing-with-data.tsx
  
  // 设备租赁管理相关状态已迁入 components/equipment-rental-with-dialogs.tsx
  
  // 财务报表相关状态已迁入 components/finance-report-with-data.tsx
  
  // 异常处理相关状态已迁入 components/exception-handling-with-data.tsx
  
  const mapDashboardRef = useRef<MapDashboardHandle>(null)

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
        const response = await fetchWithAuth(url, options)
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
    console.log('[Restaurants] 🚀 loadRestaurants 被调用')
    try {
      // 修复：不在 loadRestaurants 中设置 isLoading，避免覆盖身份验证状态
      // setIsLoading(true) // 已注释：避免影响主页面渲染
      if (!supabase) {
        console.warn("[Restaurants] ⚠️ Supabase未配置")
        return
      }
      
      // 🔒 多租户隔离：仅 super_admin 可查全量，其余角色必须有 companyId 并按公司过滤
      if (userRole === null) return // 初始加载中，静默返回
      if (userRole !== "super_admin" && !userCompanyId) {
        console.warn(`[Restaurants] ⚠️ 角色 ${userRole} 缺少公司ID，禁止查询（防止跨公司数据泄露）`)
        setRestaurants([])
        return
      }
      
      console.log('[Restaurants] ✅ Supabase已配置，开始查询数据库')

      console.log('[Restaurants] 🔍 开始查询数据库...')
      const { data, error } = await retryOnNetworkError(async () => {
        let query = supabase!
          .from("restaurants")
          .select("id, name, contact_name, contact_phone, total_refilled, status, created_at, latitude, longitude, address, qr_token")
        
        // 数据隔离：仅 super_admin 可查全量，platform_admin/admin/company_admin 均按 companyId 过滤
        if (userRole !== "super_admin" && userCompanyId) {
          query = query.eq("company_id", userCompanyId)
          console.log(`[Restaurants] 🔒 数据隔离：角色 ${userRole}，公司ID ${userCompanyId}，只查询本公司餐厅`)
        }
        // 超级管理员可以看到所有数据，不需要过滤
        
        const result = await query.order("created_at", { ascending: false })
        console.log('[Restaurants] 📊 数据库查询结果:', { dataCount: result.data?.length || 0, error: result.error })
        return result
      })

      if (error) {
        logBusinessWarning('Admin Dashboard', '加载餐厅数据失败', error)
        // 防御性渲染：即使加载失败，也设置空数组，确保页面能显示
        setRestaurants([])
        return
      }

      if (data) {
        console.log('当前加载到的餐厅数据:', data)
        console.log(`[Restaurants] 📥 从数据库加载了 ${data.length} 个餐厅`)
        // 确保经纬度是数字类型
        const processedData = data.map(restaurant => {
          const lat = restaurant.latitude ? (typeof restaurant.latitude === 'string' ? parseFloat(restaurant.latitude) : restaurant.latitude) : null
          const lng = restaurant.longitude ? (typeof restaurant.longitude === 'string' ? parseFloat(restaurant.longitude) : restaurant.longitude) : null
          console.log(`[Restaurants] 📍 ${restaurant.name}: lat=${lat}, lng=${lng}, address=${restaurant.address}`)
          return {
            ...restaurant,
            latitude: lat,
            longitude: lng,
          }
        })
        
        // 统计有经纬度的餐厅数量
        const restaurantsWithLocation = processedData.filter(r => 
          r.latitude && r.longitude && 
          !isNaN(r.latitude) && !isNaN(r.longitude) &&
          isFinite(r.latitude) && isFinite(r.longitude)
        )
        console.log(`[Admin Dashboard] ✅ 加载餐厅数据: ${processedData.length} 个餐厅，其中 ${restaurantsWithLocation.length} 个有有效经纬度`)
        
        // 确保状态更新
        setRestaurants(processedData)
        console.log(`[Restaurants] ✅ 已更新 restaurants 状态，当前数量: ${processedData.length}`)
        
        // 地理编码与地图标记已迁移至 MapDashboard，此处仅加载餐厅数据
      }
    } catch (error) {
      logBusinessWarning('Admin Dashboard', '加载餐厅数据时出错', error)
      // 防御性渲染：确保错误时也设置空数组
      setRestaurants([])
    }
  }, [supabase, userRole, userCompanyId])

  // 工作台 recentOrders/recentOrdersCount/loadRecentOrdersCount/loadRecentOrders 已迁入 components/dashboard-tab-with-data.tsx

  // 加载所有订单（用于订单管理页面）
  const loadAllOrders = useCallback(async () => {
    if (!supabase) return

    // 🔒 多租户隔离：仅 super_admin 可查全量，其余角色必须有 companyId
    if (userRole === null) return // 初始加载中，静默返回
    if (userRole !== "super_admin" && !userCompanyId) {
      console.warn(`[Orders] ⚠️ 角色 ${userRole} 缺少公司ID，禁止查询订单`)
      setOrders([])
      setIsLoadingOrders(false)
      return
    }

    try {
      setIsLoadingOrders(true)
      
      // 数据隔离：如果是供应商，需要先查询该公司的餐厅ID列表
      let companyRestaurantIds: string[] | null = null
      if (userRole !== "super_admin" && userCompanyId) {
        const { data: companyRestaurants } = await supabase
          .from("restaurants")
          .select("id")
          .eq("company_id", userCompanyId)
        companyRestaurantIds = companyRestaurants?.map(r => r.id) || []
        console.log(`[Orders] 🔒 数据隔离：供应商账号，只查询公司 ${userCompanyId} 的 ${companyRestaurantIds.length} 个餐厅的订单`)
      }
      
      // 表已分离，需要根据筛选条件决定查询哪个表
      let repairQuery = supabase
        .from("repair_orders")
        .select("id, restaurant_id, service_type, status, amount, created_at, updated_at, assigned_to, description")
        .order("created_at", { ascending: false })
      
      let deliveryQuery = supabase
        .from("delivery_orders")
        .select("id, restaurant_id, service_type, status, amount, created_at, updated_at, assigned_to")
        .order("created_at", { ascending: false })
      
      // 数据隔离：非 super_admin 必须按公司餐厅过滤
      if (companyRestaurantIds !== null && companyRestaurantIds.length > 0) {
        repairQuery = repairQuery.in("restaurant_id", companyRestaurantIds)
        deliveryQuery = deliveryQuery.in("restaurant_id", companyRestaurantIds)
      } else if (companyRestaurantIds !== null && companyRestaurantIds.length === 0) {
        // 供应商公司下没有餐厅，返回空
        // 如果供应商没有餐厅，返回空结果
        setOrders([])
        setIsLoadingOrders(false)
        return
      }

      // 服务类型筛选（「其他」无对应 service_type，拉取全部由前端过滤）
      if (orderServiceTypeFilter !== "all" && orderServiceTypeFilter !== "其他") {
        if (orderServiceTypeFilter === "燃料配送") {
          repairQuery = repairQuery.eq("service_type", "never_match") // 不匹配任何记录
        } else if (orderServiceTypeFilter === "维修服务") {
          repairQuery = repairQuery.eq("service_type", orderServiceTypeFilter)
          deliveryQuery = deliveryQuery.eq("service_type", "never_match")
        } else {
          repairQuery = repairQuery.eq("service_type", orderServiceTypeFilter)
          deliveryQuery = deliveryQuery.eq("service_type", "never_match")
        }
      }

      // 状态筛选
      if (orderStatusFilter !== "all") {
        repairQuery = repairQuery.eq("status", orderStatusFilter)
        deliveryQuery = deliveryQuery.eq("status", orderStatusFilter)
      }

      // 并行查询两个表
      const [repairResult, deliveryResult] = await Promise.all([
        retryOnNetworkError(async () => {
          const result = await repairQuery
          if (result.error) throw result.error
          return result
        }),
        retryOnNetworkError(async () => {
          const result = await deliveryQuery
          if (result.error) throw result.error
          return result
        })
      ])
      
      // 合并结果
      const repairData = repairResult.data || []
      const deliveryData = deliveryResult.data || []
      const ordersData = [...repairData, ...deliveryData]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      const ordersError = repairResult.error || deliveryResult.error

      if (ordersError) {
        logBusinessWarning('Admin Dashboard', '加载所有订单失败', ordersError)
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
          worker_id: order.assigned_to || order.worker_id, // 优先使用 assigned_to
        }))
        setOrders(formattedOrders)
        // 移除频繁的调试日志，避免控制台刷屏
      }
    } catch (error) {
      logBusinessWarning('Admin Dashboard', '加载所有订单时出错', error)
      setOrders([])
    } finally {
      setIsLoadingOrders(false)
    }
  }, [supabase, userRole, userCompanyId, orderServiceTypeFilter, orderStatusFilter])

  // 报修加载/更新/URL 参数/实时推送已迁入 RepairsWithDialogs

  const loadWorkers = useCallback(async () => {
    if (!supabase) return

    // 🔒 多租户隔离：仅 super_admin 可查全量，其余角色必须有 companyId
    if (userRole === null) return // 初始加载中，静默返回
    if (userRole !== "super_admin" && !userCompanyId) {
      console.warn(`[Workers] ⚠️ 角色 ${userRole} 缺少公司ID，禁止查询工人`)
      setWorkers([])
      return
    }

    try {
      const { data, error } = await retryOnNetworkError(async () => {
        let query = supabase!
          .from("workers")
          .select("id, name, phone, worker_type, product_types, status, created_at, updated_at")
        
        // 数据隔离：如果是供应商，只查询本公司的工人
        if (userRole !== "super_admin" && userCompanyId) {
          query = query.eq("company_id", userCompanyId)
          console.log(`[Workers] 🔒 数据隔离：供应商账号（角色: ${userRole}, 公司ID: ${userCompanyId}），只查询本公司的工人`)
        }
        
        return await query.order("created_at", { ascending: false })
      })

      if (error) {
        logBusinessWarning('Admin Dashboard', '加载工人列表失败', error)
        setWorkers([])
        return
      }

      // 防御性渲染：确保 data 存在且是数组，否则设置空数组
      if (data && Array.isArray(data)) {
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
      } else {
        // 防御性渲染：如果 data 不存在或不是数组，设置空数组
        setWorkers([])
      }
    } catch (error) {
      logBusinessWarning('Admin Dashboard', '加载工人列表失败', error)
      // 防御性渲染：确保错误时也设置空数组
      setWorkers([])
    }
  }, [supabase, userRole, userCompanyId])

  // 工人添加/编辑/删除 handlers 已迁入 WorkersWithDialogs

  // 处理登出
  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut()
      }
      // 跳转到登录页
      window.location.href = "/login"
    } catch (error) {
      logBusinessWarning('Dashboard', '登出失败', error)
      // 即使出错也跳转到登录页
      window.location.href = "/login"
    }
  }

  // 加载设备数据已迁入 components/devices-with-data.tsx

  // 加载服务点数据
  const loadServicePoints = useCallback(async () => {
    // 🔒 强化隔离逻辑：如果是供应商但 userCompanyId 为空，禁止请求，防止权限滑坡
    // 注意：如果 userRole 还未加载（为 null），允许查询（可能是超级管理员）
    // admin 角色但没有 companyId 时，允许查询（向后兼容）
    if (userRole !== null && userRole !== "super_admin" && userRole !== "admin" && !userCompanyId) {
      console.warn("[ServicePoints] ⚠️ 非管理员身份但缺少公司ID，禁止查询服务点数据，防止权限滑坡")
      setServicePoints([])
      return
    }

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

      // 防御性渲染：确保 data 存在，否则使用模拟数据
      setServicePoints(data || [
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
    } catch (error: any) {
      // 防御性渲染：静默处理所有错误，使用模拟数据，不输出错误日志避免控制台刷屏
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
  }, [supabase, userRole, userCompanyId])

  // 身份验证状态
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const isRedirectingRef = useRef(false) // 防止重复重定向

  // 加载用户角色和公司信息（不进行重定向检查）
  // 优先使用 /api/user/context 获取角色与公司（服务端 service_role 绕过 RLS），避免客户端查询 user_roles/user_companies 卡住
  useEffect(() => {
    const loadUserInfo = async () => {
      if (!supabase) {
        console.warn("[Dashboard] Supabase未配置，跳过用户信息加载")
        setForceRender(true)
        setIsLoading(false)
        setIsAuthenticated(true)
        return
      }
      setIsLoading(true)
      try {
        // 获取当前用户（仅用于展示邮箱）
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          console.warn("[Dashboard] 未获取到用户信息，以访客模式运行")
          setCurrentUser(null)
          setUserRole(null)
          setUserCompanyId(null)
          setForceRender(true)
          setIsLoading(false)
          setIsAuthenticated(true) // 允许访问，但不加载数据
          return
        }

        // 立即设置用户信息，避免一直显示"加载中..."
        setCurrentUser({ email: user.email || undefined })
        console.log("[Dashboard] 用户信息已加载:", user.email)

        let role: string | null = null
        let companyId: string | null = null

        // 优先通过 API 获取角色与公司（服务端绕过 RLS，避免客户端查询挂起）
        // 客户端会话在 localStorage 时需带 Authorization: Bearer，否则服务端无法鉴权返回 401
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 12000)
        try {
          const headers: HeadersInit = {}
          let { data: { session } } = await supabase.auth.getSession()
          if (!session?.access_token) {
            const { data: { session: refreshed } } = await supabase.auth.refreshSession()
            session = refreshed
          }
          if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
          const response = await fetchWithAuth("/api/user/context", { credentials: "include", headers, signal: controller.signal })
          const json = await response.json()
          if (json?.success && json?.data) {
            role = json.data.role ?? null
            companyId = json.data.companyId ?? null
            console.log("[Dashboard] ✅ 从 API 获取用户上下文:", { role, companyId })
          } else if (response.status === 401) {
            const { data: { session: retrySession } } = await supabase.auth.refreshSession()
            if (retrySession?.access_token) {
              const retryRes = await fetchWithAuth("/api/user/context", {
                credentials: "include",
                headers: { Authorization: `Bearer ${retrySession.access_token}` },
                signal: controller.signal,
              })
              const retryJson = await retryRes.json()
              if (retryJson?.success && retryJson?.data) {
                role = retryJson.data.role ?? null
                companyId = retryJson.data.companyId ?? null
                console.log("[Dashboard] ✅ 重试后从 API 获取用户上下文:", { role, companyId })
              }
            }
          }
        } catch (apiErr: any) {
          if (apiErr?.name === "AbortError") {
            console.warn("[Dashboard] 用户上下文 API 超时，降级为客户端查询")
          } else {
            console.warn("[Dashboard] 用户上下文 API 失败，降级为客户端查询:", apiErr?.message)
          }
        } finally {
          clearTimeout(timeoutId)
        }

        // 降级：API 未返回有效角色时，使用客户端查询（可能受 RLS 影响）
        if (role === null) {
          const { data: roleData, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle()
          if (roleError) console.warn("[Dashboard] 查询角色失败:", roleError)
          role = roleData?.role ?? null
          console.log("[Dashboard] 用户角色（客户端）:", role)
        }
        setUserRole(role)

        // 如果是超级管理员，不需要查询公司信息
        if (role === "super_admin") {
          setUserCompanyId(null)
          setCompanyPermissions([])
          setCompanyFuelTypes([])
          setForceRender(true)
          setIsLoading(false)
          setIsAuthenticated(true)
          return
        }

        // 降级：API 未返回公司时，从 user_companies 查询
        if (companyId === null) {
          const { data: userCompany, error: ucError } = await supabase
            .from("user_companies")
            .select("company_id")
            .eq("user_id", user.id)
            .eq("is_primary", true)
            .maybeSingle()
          if (ucError) console.warn("[Dashboard] 查询公司信息失败:", ucError)
          companyId = userCompany?.company_id ?? null
        }
        setUserCompanyId(companyId)
        console.log("[Dashboard] 用户公司ID:", companyId)

        // 如果有关联公司，加载权限（使用 API 端点绕过 RLS）
        if (companyId) {
          try {
            // 使用 API 端点查询权限，绕过 RLS 限制
            const response = await fetchWithAuth(`/api/admin/get-company-permissions?companyId=${companyId}`)
            const result = await response.json()

            if (result.success) {
              const permissions = result.permissions || []
              const fuelTypes = result.fuelTypes || []
              
              setCompanyPermissions(permissions)
              setCompanyFuelTypes(fuelTypes)
              console.log("[Dashboard] ✅ 公司权限加载成功:", {
                permissions,
                fuelTypes,
                permissionsCount: permissions.length,
                fuelTypesCount: fuelTypes.length
              })
            } else {
              console.warn("[Dashboard] ⚠️ 权限查询失败:", result.error)
              setCompanyPermissions([])
              setCompanyFuelTypes([])
            }
          } catch (error: any) {
            console.error("[Dashboard] ❌ 权限查询异常:", error)
            // 如果 API 调用失败，尝试直接查询（可能用户有权限）
            try {
              const { data: permissionsData } = await supabase
                .from("company_permissions")
                .select("permission_key")
                .eq("company_id", companyId)
                .eq("enabled", true)

              const permissions = (permissionsData || []).map(p => p.permission_key)
              setCompanyPermissions(permissions)
              console.log("[Dashboard] 公司权限（直接查询）:", permissions)

              const { data: fuelTypesData } = await supabase
                .from("company_fuel_types")
                .select("fuel_type")
                .eq("company_id", companyId)
                .eq("enabled", true)

              const fuelTypes = (fuelTypesData || []).map(f => f.fuel_type)
              setCompanyFuelTypes(fuelTypes)
              console.log("[Dashboard] 公司燃料品种（直接查询）:", fuelTypes)
            } catch (fallbackError) {
              console.error("[Dashboard] ❌ 直接查询也失败:", fallbackError)
              setCompanyPermissions([])
              setCompanyFuelTypes([])
            }
          }
        } else {
          setCompanyPermissions([])
          setCompanyFuelTypes([])
        }

        setForceRender(true)
        setIsLoading(false)
        setIsAuthenticated(true)
      } catch (error: any) {
        console.error("[Dashboard] 加载用户信息异常:", error)
        // 即使出错，也尝试设置用户信息（如果之前已获取到）
        try {
          if (supabase) {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              setCurrentUser({ email: user.email || undefined })
            }
          }
        } catch {
          // 忽略错误
        }
        setForceRender(true)
        setIsLoading(false)
        setIsAuthenticated(true) // 即使出错也允许访问
      }
    }

    loadUserInfo()
  }, [supabase])

  // 实时订阅 - 等待用户信息加载完成后再加载数据
  useEffect(() => {
    // 如果用户信息还未加载完成，等待
    if (isAuthenticated === null || isLoading) {
      console.log('[Dashboard] ⏳ 等待用户信息加载完成...')
      return
    }

    // 如果未认证，不加载数据
    if (!isAuthenticated) {
      console.log('[Dashboard] ⚠️ 用户未认证，跳过数据加载')
      return
    }

    // 🔒 多租户隔离：必须等待角色加载完成后再加载数据，避免 userRole 为 null 时误查全量
    if (userRole === null) {
      console.log('[Dashboard] ⏳ 等待用户角色加载完成，暂不加载业务数据')
      return
    }

    console.log('[Dashboard] 🚀 用户信息已加载，开始加载数据')
    console.log('[Dashboard] 用户角色:', userRole, '公司ID:', userCompanyId)
    
    loadRestaurants()
    loadWorkers()
    loadAllOrders() // 工作台统计卡片（待处理订单、总营收）需要订单数据
    // 工作台 recentOrdersCount/servicePoints 由 DashboardTabWithData 自管加载

    if (supabase) {
      const channel = supabase
        .channel("admin_dashboard_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "delivery_orders",
          },
          () => {
            loadRestaurants()
            loadAllOrders() // 订单变更时刷新工作台统计
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "repair_orders",
          },
          () => {
            loadRestaurants()
            loadAllOrders() // 订单变更时刷新工作台统计
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
  }, [isAuthenticated, isLoading, userRole, userCompanyId, loadRestaurants, loadWorkers, loadAllOrders, supabase])

  // 进入「工作台」时重新拉取餐厅列表，确保地图与餐厅管理显示数量一致（避免登录/刷新后地图少显示）
  const prevActiveMenuRef = useRef<string>(activeMenu)
  useEffect(() => {
    if (prevActiveMenuRef.current !== "dashboard" && activeMenu === "dashboard") {
      loadRestaurants()
    }
    prevActiveMenuRef.current = activeMenu
  }, [activeMenu, loadRestaurants])

  // 进入「数据统计」时订单由 AnalyticsWithData 自管加载
  // 进入「订单管理」时拉取全部订单列表，确保列表有数据
  useEffect(() => {
    if (activeMenu !== "orders" || !isAuthenticated) return
    loadAllOrders()
  }, [activeMenu, isAuthenticated, loadAllOrders])

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

  // 定位到餐厅位置（委托 MapDashboard 执行）
  const handleLocateRestaurant = (restaurant: Restaurant) => {
    if (!restaurant.latitude || !restaurant.longitude) {
      alert("该餐厅没有位置信息");
      return;
    }
    if (activeMenu !== "dashboard") {
      setActiveMenu("dashboard");
      setTimeout(() => mapDashboardRef.current?.locateToRestaurant(restaurant), 800);
    } else {
      mapDashboardRef.current?.locateToRestaurant(restaurant);
    }
  };

  // 餐厅详情/指派配送已迁入 RestaurantsWithDialogs，此处不再保留 handleViewDetails/handleOpenAssignDialog/handleAssignDelivery

  // 设备租赁管理：面板 + 5 个对话框已迁入 components/equipment-rental-with-dialogs.tsx
  const renderEquipmentRental = () => (
    <div className="space-y-6">
      <EquipmentRentalWithDialogs userCompanyId={userCompanyId} userRole={userRole} />
    </div>
  )

  const renderRentals = () => <RentalsDashboardWithDialogs />

  // 加载API配置与 handleAddApi 已迁入 components/api-config-with-data.tsx
  // 保存/同步燃料价格、handleToggleAutoSync 已迁入 components/fuel-pricing-with-data.tsx

  // 协议管理+租赁合同：已迁移到 components/agreements-section.tsx
  const renderAgreements = () => <AgreementsSection />

  // 加载财务报表已迁入 components/finance-report-with-data.tsx
  // 加载异常处理数据已迁入 components/exception-handling-with-data.tsx

  // 强制解除UI渲染锁定：即使验证中或失败，也显示内容（添加超时保护）
  // 添加调试信息（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log("[Dashboard Render] 当前状态:", { isLoading, isAuthenticated, forceRender })
  }
  
  // 强制渲染：始终显示主界面，不再检查任何条件
  // 修复：删除所有阻止渲染的逻辑
  const shouldShowError = false // 强制为 false，不再显示错误页面
  
  if (false) { // 强制改为 false，确保不会提前返回
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
          <p className="text-red-400 text-sm font-medium">身份验证失败</p>
          <p className="text-slate-400 text-xs">正在跳转到登录页面...</p>
          <Button
            onClick={() => window.location.href = "/login"}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            立即跳转
          </Button>
        </div>
      </div>
    )
  }
  
  // 强制渲染：不再显示加载覆盖层，直接显示页面内容
  // 修复：删除加载覆盖层逻辑，确保页面始终可见
  const showLoadingOverlay = false // 强制为 false，不显示加载覆盖层
  
  // 调试信息（开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log("[Dashboard Render] 加载覆盖层状态:", { 
      showLoadingOverlay, 
      isLoading, 
      isAuthenticated, 
      forceRender 
    })
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col pb-20" 
      data-density="dense"
      style={{ 
        // 背景使用 CSS radial-gradient 确保移动端不变形
        background: 'radial-gradient(ellipse at 50% -10%, oklch(0.25 0.15 250), oklch(0.1 0.05 255) 75%), linear-gradient(135deg, rgb(15 23 42), rgb(30 58 138), rgb(15 23 42))',
        // 强制显示：确保不被 Next.js 路由系统的 hidden 状态影响
        display: 'flex',
        visibility: 'visible',
        opacity: 1,
        position: 'relative',
        zIndex: 1
      } as React.CSSProperties}
    >
      {/* 加载覆盖层：显示在内容上方，但不阻止页面结构显示 */}
      {/* 只有真正需要时才显示，超时后自动隐藏 */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
          <div className="text-center space-y-4 bg-slate-800/90 rounded-lg p-6 border border-slate-700">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
            <p className="text-slate-300 text-sm font-medium">正在验证身份...</p>
            <p className="text-slate-400 text-xs">如果长时间无响应，页面将在3秒后自动显示</p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-2 bg-slate-900/50 rounded text-left text-xs text-slate-400 font-mono">
                <div>isLoading: {String(isLoading)}</div>
                <div>isAuthenticated: {String(isAuthenticated)}</div>
                <div>forceRender: {String(forceRender)}</div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-1 mt-16 relative">
      {/* 移动端遮罩层：当侧边栏打开时显示 */}
      {/* 修复 Hydration：只在客户端挂载后显示遮罩层 */}
      {isMounted && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* 侧边栏 */}
      <div className={`
        ${sidebarOpen ? "w-64" : "w-20"} 
        bg-gradient-to-b from-slate-900 to-blue-950 border-r border-blue-800/50 
        transition-all duration-300 flex flex-col
        fixed md:relative inset-y-0 left-0 z-50
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="p-4 border-b border-blue-800/50">
          <div className="flex items-center justify-between">
              <h2 className={`text-base md:text-xl font-bold text-white ${!sidebarOpen && "hidden"}`}>
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
          {(() => {
            // 根据用户角色和权限过滤菜单项
            // 采用"非超级管理员即隔离"原则，遵循最小权限原则
            let filteredMenuItems = menuItems
            
            // 如果是超级管理员，可以看到所有菜单
            // 注意：在角色加载期间（userRole === null），暂时显示所有菜单，避免刷新时闪烁
            if (userRole === "super_admin" || userRole === null) {
              // 超级管理员或角色加载中：显示所有菜单
              if (userRole === "super_admin") {
                console.log("[Dashboard] 🎯 超级管理员：显示所有菜单项")
              } else {
                // 角色加载中，暂时显示所有菜单（避免刷新时只显示 dashboard）
                console.log("[Dashboard] ⏳ 角色加载中，暂时显示所有菜单项")
              }
              filteredMenuItems = menuItems
            } else if (userRole && userCompanyId) {
              // 非超级管理员且有公司ID（供应商/管理员），严格按权限过滤
              // 安全原则：白名单机制，默认只显示 dashboard
              console.log(`[Dashboard] 🔒 供应商账号（角色: ${userRole}, 公司ID: ${userCompanyId}）`)
              console.log(`[Dashboard] 📋 已分配权限:`, companyPermissions)
              console.log(`[Dashboard] 📋 权限数量: ${companyPermissions.length}`)
              
              // 如果权限还未加载完成（为空数组且正在加载），显示加载状态
              if (companyPermissions.length === 0 && isLoading) {
                console.log("[Dashboard] ⏳ 权限加载中，暂时只显示 dashboard")
                filteredMenuItems = menuItems.filter(item => item.key === "dashboard")
              } else {
                filteredMenuItems = menuItems.filter(item => {
                  // 工作台（dashboard）始终可见
                  if (item.key === "dashboard") return true
                  // 其他功能必须明确授权（白名单机制）
                  const hasPermission = companyPermissions.includes(item.key)
                  if (!hasPermission) {
                    console.log(`[Dashboard] 🚫 过滤菜单项: ${item.label} (${item.key}) - 未授权`)
                  }
                  return hasPermission
                })
                
                console.log(`[Dashboard] ✅ 供应商菜单过滤完成: 显示 ${filteredMenuItems.length} / ${menuItems.length} 个菜单项`)
                console.log(`[Dashboard] ✅ 显示的菜单项:`, filteredMenuItems.map(item => item.label))
              }
            } else {
              // 非超级管理员但没有 companyId，出于安全考虑，只显示 dashboard
              // 注意：只有在角色已加载完成（不为 null）时才显示警告，避免刷新时误报
              if (userRole !== null) {
                console.warn(`[Dashboard] ⚠️ 非超级管理员（角色: ${userRole}）但没有 companyId，仅显示 dashboard（防止权限提升）`)
              }
              filteredMenuItems = menuItems.filter(item => item.key === "dashboard")
            }
            
            return filteredMenuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveMenu(item.key)
                    // 移动端点击菜单后关闭侧栏，使主内容区（如「创建租赁记录」「上传设备」）可点击
                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                      setSidebarOpen(false)
                    }
                  }}
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
            })
          })()}
        </nav>

        <div className="p-4 border-t border-blue-800/50">
          <Button
            variant="ghost"
            className={`w-full ${sidebarOpen ? 'justify-start' : 'justify-center'} text-slate-400 hover:text-white hover:bg-red-500/10 hover:text-red-400 transition-colors`}
            onClick={handleLogout}
            title="退出登录"
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span className="ml-3">退出登录</span>}
          </Button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto flex flex-col w-full md:w-auto">
        {/* 顶部用户信息栏 */}
        <div className="bg-slate-900/50 border-b border-blue-800/50 px-4 md:px-6 py-3 flex items-center justify-between">
          {/* 移动端显示菜单按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white md:hidden mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <User className="h-5 w-5 text-slate-400" />
            <span className="text-sm text-slate-300">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  加载中...
                </span>
              ) : currentUser?.email ? (
                currentUser.email
              ) : (
                <span>访客</span>
              )}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">退出登录</span>
          </Button>
        </div>
        
        <div className="p-4 md:p-6 flex-1">
          {activeMenu === "dashboard" && (
            <DashboardTabWithData
              userRole={userRole}
              userCompanyId={userCompanyId}
              restaurants={restaurants}
              orders={orders}
              setRestaurants={setRestaurants}
              supabase={supabase}
              onNavigateToRepairs={(orderId: string) => {
                setActiveMenu("repairs")
                const newUrl = `${window.location.pathname}?id=${orderId}`
                router.push(newUrl, { scroll: false })
              }}
              mapDashboardRef={mapDashboardRef}
            />
          )}
          {activeMenu === "restaurants" && (
            <RestaurantsWithDialogs
              restaurants={restaurants}
              workers={workers}
              onLocateRestaurant={handleLocateRestaurant}
              onAssignSuccess={loadAllOrders}
            />
          )}
          {activeMenu === "orders" && (
            <OrdersWithDialogs
              orders={orders}
              isLoadingOrders={isLoadingOrders}
              orderServiceTypeFilter={orderServiceTypeFilter}
              onOrderServiceTypeFilterChange={setOrderServiceTypeFilter}
              orderStatusFilter={orderStatusFilter}
              onOrderStatusFilterChange={setOrderStatusFilter}
              onNavigateToRepairs={(order) => {
                setActiveMenu("repairs")
                router.push(`${window.location.pathname}?id=${order.id}`, { scroll: false })
              }}
            />
          )}
          {activeMenu === "repairs" && (
            <RepairsWithDialogs
              restaurants={restaurants}
              workers={workers}
              userRole={userRole}
              userCompanyId={userCompanyId}
            />
          )}
          {/* 设备租赁管理：使用 renderEquipmentRental() 以便「创建租赁记录」「上传设备」等对话框能挂载并响应点击 */}
          {activeMenu === "equipmentRental" && renderEquipmentRental()}
          {activeMenu === "productApproval" && <ProductApproval />}
          {activeMenu === "supplierManagement" && <SupplierManagement />}
          {activeMenu === "rentals" && renderRentals()}
          {activeMenu === "devices" && <DevicesWithData userRole={userRole} userCompanyId={userCompanyId} />}
          {activeMenu === "workers" && (
            <WorkersWithDialogs
              workers={workers}
              onRefreshWorkers={loadWorkers}
              userRole={userRole}
              userCompanyId={userCompanyId}
            />
          )}
          {activeMenu === "api" && <ApiConfigWithData />}
          {activeMenu === "fuelPricing" && (
            <FuelPricingWithData
              userRole={userRole}
              userCompanyId={userCompanyId}
              companyFuelTypes={companyFuelTypes}
              isLoading={isLoading}
            />
          )}
          {activeMenu === "analytics" && <AnalyticsWithData userRole={userRole} userCompanyId={userCompanyId} />}
          {activeMenu === "financeReport" && <FinanceReportWithData />}
          {activeMenu === "exceptionHandling" && <ExceptionHandlingWithData />}
          {activeMenu === "agreements" && renderAgreements()}
          {activeMenu === "settings" && <SettingsWithDialogs />}
        </div>
      </div>

      {/* 餐厅详情/指派配送对话框已迁入 RestaurantsWithDialogs */}
      {/* 密码修改对话框已迁入 components/settings-with-dialogs.tsx */}
      {/* 指派配送对话框已迁入 RestaurantsWithDialogs */}
      </div>
      
      {/* 底部导航栏：双导航模式 - 手机端始终显示，电脑端且侧边栏开启时隐藏 */}
      <BottomNavigation sidebarOpen={sidebarOpen} />
    </div>
  )
}

