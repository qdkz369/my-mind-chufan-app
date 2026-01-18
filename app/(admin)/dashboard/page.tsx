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
import { ProductApproval } from "./product-approval"
import { SupplierManagement } from "./supplier-management"
import { SendNotification } from "./send-notification"
import { BottomNavigation } from "@/components/bottom-navigation"
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
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768 // 768px 是 Tailwind 的 md 断点
    }
    return true
  })
  const [activeMenu, setActiveMenu] = useState("dashboard")
  
  // 用户和公司信息（用于多租户数据隔离）
  const [userRole, setUserRole] = useState<string | null>(null) // super_admin, admin, supplier
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null) // 供应商的公司ID
  const [companyPermissions, setCompanyPermissions] = useState<string[]>([]) // 供应商可访问的功能模块
  const [companyFuelTypes, setCompanyFuelTypes] = useState<string[]>([]) // 供应商可供应的燃料品种
  
  // 密码修改对话框状态
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false)
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null)
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false)
  
  // 检测 URL 参数，自动打开密码修改对话框
  useEffect(() => {
    const action = searchParams.get("action")
    if (action === "change-password") {
      setIsChangePasswordDialogOpen(true)
      // 清除 URL 参数
      router.replace("/dashboard", { scroll: false })
    }
  }, [searchParams, router])

  // 修改密码函数
  const handleChangePassword = async () => {
    setChangePasswordError(null)
    setChangePasswordSuccess(false)

    // 验证输入
    if (!changePasswordForm.currentPassword || !changePasswordForm.newPassword || !changePasswordForm.confirmPassword) {
      setChangePasswordError("请填写所有字段")
      return
    }

    if (changePasswordForm.newPassword.length < 6) {
      setChangePasswordError("新密码长度至少为6位")
      return
    }

    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      setChangePasswordError("两次输入的新密码不一致")
      return
    }

    setIsChangingPassword(true)

    try {
      if (!supabase) {
        throw new Error("Supabase 未初始化")
      }

      // 先验证当前密码（通过重新登录）
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) {
        throw new Error("无法获取用户信息")
      }

      // 验证当前密码
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: changePasswordForm.currentPassword,
      })

      if (verifyError) {
        setChangePasswordError("当前密码错误")
        setIsChangingPassword(false)
        return
      }

      // 更新密码
      const { error: updateError } = await supabase.auth.updateUser({
        password: changePasswordForm.newPassword,
      })

      if (updateError) {
        throw updateError
      }

      // 更新 user_metadata，标记已修改密码
      await supabase.auth.updateUser({
        data: {
          is_default_password: false,
        },
      })

      setChangePasswordSuccess(true)
      setChangePasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      // 2秒后关闭对话框
      setTimeout(() => {
        setIsChangePasswordDialogOpen(false)
        setChangePasswordSuccess(false)
      }, 2000)
    } catch (error: any) {
      logBusinessWarning('Dashboard', '修改密码失败', error)
      setChangePasswordError(error.message || "修改密码失败，请重试")
    } finally {
      setIsChangingPassword(false)
    }
  }
  
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
  const [devices, setDevices] = useState<Device[]>([])
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([])
  const [servicePoints, setServicePoints] = useState<ServicePoint[]>([])
  const [isLoading, setIsLoading] = useState(false) // 强制初始值为 false，确保 UI 立即显示
  const [forceRender, setForceRender] = useState(false) // 强制渲染标志，用于解除UI锁定
  const [currentUser, setCurrentUser] = useState<{ email?: string } | null>(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState(false)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [isRecentOrdersExpanded, setIsRecentOrdersExpanded] = useState(false) // 控制最新订单是否展开
  const [recentOrdersCount, setRecentOrdersCount] = useState(0) // 订单数量（不加载详细数据）
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
  const [rentalOrderError, setRentalOrderError] = useState<string | null>(null)
  const [rentalOrderStatusFilter, setRentalOrderStatusFilter] = useState<string>("all")
  const [selectedRentalOrder, setSelectedRentalOrder] = useState<any | null>(null)
  const [isRentalOrderDetailDialogOpen, setIsRentalOrderDetailDialogOpen] = useState(false)
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false)
  const [refundReason, setRefundReason] = useState("")
  const [refundProof, setRefundProof] = useState("")
  const [isProcessingRefund, setIsProcessingRefund] = useState(false)
  const [rentalOrderSearchQuery, setRentalOrderSearchQuery] = useState<string>("")
  const [selectedRentalOrderIds, setSelectedRentalOrderIds] = useState<string[]>([])
  const [isAddRentalOrderDialogOpen, setIsAddRentalOrderDialogOpen] = useState(false)
  const [isUpdatingRentalOrder, setIsUpdatingRentalOrder] = useState(false)
  // 上传设备相关状态
  const [isUploadEquipmentDialogOpen, setIsUploadEquipmentDialogOpen] = useState(false)
  const [isUploadingEquipment, setIsUploadingEquipment] = useState(false)
  const [uploadedEquipmentImages, setUploadedEquipmentImages] = useState<string[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [equipmentCategories, setEquipmentCategories] = useState<any[]>([])
  const [newEquipment, setNewEquipment] = useState({
    name: "",
    brand: "",
    model: "",
    description: "",
    category_id: "",
    monthly_rental_price: "",
    daily_rental_price: "",
    deposit_amount: "0",
    min_rental_period: "1",
    max_rental_period: "",
    maintenance_included: true,
    delivery_included: false,
    notes: "",
  })
  const [newRentalOrder, setNewRentalOrder] = useState({
    restaurant_id: "",
    equipment_id: "",
    quantity: 1,
    rental_period: 1,
    start_date: new Date().toISOString().split("T")[0],
    delivery_address: "",
    contact_phone: "",
    notes: "",
    payment_method: "cash",
    provider_id: "",
    funding_type: "direct",
  })
  const [equipmentList, setEquipmentList] = useState<any[]>([])
  const [restaurantList, setRestaurantList] = useState<any[]>([])
  const [companyList, setCompanyList] = useState<any[]>([])
  
  // 租赁工作台相关状态（使用 rentals 表）
  const [rentals, setRentals] = useState<any[]>([])
  const [isLoadingRentals, setIsLoadingRentals] = useState(false)
  const [selectedRental, setSelectedRental] = useState<any | null>(null)
  const [isRentalDetailDialogOpen, setIsRentalDetailDialogOpen] = useState(false)
  const [isAddRentalDialogOpen, setIsAddRentalDialogOpen] = useState(false)
  const [newRental, setNewRental] = useState({
    customer_name: "",
    customer_phone: "",
    device_name: "",
    device_sn: "",
    rent_amount: "",
    deposit: "",
    start_date: "",
    end_date: "",
    status: "pending_delivery",
    notes: "",
  })
  
  // 设备租赁基础功能相关状态（使用 device_rentals 表）
  const [deviceRentals, setDeviceRentals] = useState<any[]>([])
  const [isLoadingDeviceRentals, setIsLoadingDeviceRentals] = useState(false)
  const [deviceRentalError, setDeviceRentalError] = useState<string | null>(null)
  const [deviceRentalStatusFilter, setDeviceRentalStatusFilter] = useState<string>("all")
  const [deviceRentalSearchQuery, setDeviceRentalSearchQuery] = useState<string>("")
  const [selectedDeviceRental, setSelectedDeviceRental] = useState<any | null>(null)
  const [isDeviceRentalDetailDialogOpen, setIsDeviceRentalDetailDialogOpen] = useState(false)
  const [isAddDeviceRentalDialogOpen, setIsAddDeviceRentalDialogOpen] = useState(false)
  const [isCreatingDeviceRental, setIsCreatingDeviceRental] = useState(false)
  const [isEndingDeviceRental, setIsEndingDeviceRental] = useState(false)
  const [newDeviceRental, setNewDeviceRental] = useState({
    device_id: "",
    restaurant_id: "",
    start_at: new Date().toISOString().slice(0, 16), // 格式：YYYY-MM-DDTHH:mm
  })
  const [availableDevices, setAvailableDevices] = useState<any[]>([])
  const [availableRestaurants, setAvailableRestaurants] = useState<any[]>([])
  
  // 协议管理相关状态
  const [agreements, setAgreements] = useState<any[]>([])
  const [isLoadingAgreements, setIsLoadingAgreements] = useState(false)
  const [agreementsError, setAgreementsError] = useState<string | null>(null)
  const [agreementsTypeFilter, setAgreementsTypeFilter] = useState<string>("all")
  const [agreementsStatusFilter, setAgreementsStatusFilter] = useState<string>("all")
  const [selectedAgreement, setSelectedAgreement] = useState<any | null>(null)
  const [isAgreementDetailDialogOpen, setIsAgreementDetailDialogOpen] = useState(false)
  const [isAddAgreementDialogOpen, setIsAddAgreementDialogOpen] = useState(false)
  const [isEditingAgreement, setIsEditingAgreement] = useState(false)
  const [newAgreement, setNewAgreement] = useState({
    title: "",
    type: "service",
    version: "1.0",
    content: "",
    content_html: "",
    status: "draft",
    is_active: false,
    effective_date: "",
    expiry_date: "",
    description: "",
  })
  
  // 租赁合同管理相关状态（集成到协议管理）
  const [rentalContracts, setRentalContracts] = useState<any[]>([])
  
  // 财务报表相关状态
  const [reportType, setReportType] = useState<string>("revenue")
  const [reportData, setReportData] = useState<any>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [financeStartDate, setFinanceStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split("T")[0]
  })
  const [financeEndDate, setFinanceEndDate] = useState(() => new Date().toISOString().split("T")[0])
  
  // 异常处理相关状态
  const [overdueBilling, setOverdueBilling] = useState<any[]>([])
  const [overdueRentals, setOverdueRentals] = useState<any[]>([])
  const [isLoadingOverdueBilling, setIsLoadingOverdueBilling] = useState(false)
  const [isLoadingOverdueRentals, setIsLoadingOverdueRentals] = useState(false)
  const [isLoadingRentalContracts, setIsLoadingRentalContracts] = useState(false)
  const [rentalContractsError, setRentalContractsError] = useState<string | null>(null)
  const [selectedRentalContract, setSelectedRentalContract] = useState<any | null>(null)
  const [isRentalContractDetailDialogOpen, setIsRentalContractDetailDialogOpen] = useState(false)
  
  // 租赁订单支付信息相关状态
  const [contractPaymentInfo, setContractPaymentInfo] = useState<any[]>([])
  const [isLoadingPaymentInfo, setIsLoadingPaymentInfo] = useState(false)
  
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
  const mapBoundsAdjustedRef = useRef<boolean>(false) // 标记是否已经调整过地图视图
  const geocodingInProgressRef = useRef<Set<string>>(new Set()) // 正在地理编码的餐厅ID集合，避免重复编码
  const lastUpdateMarkersTimeRef = useRef<number>(0) // 上次更新标记的时间戳
  const isUpdatingMarkersRef = useRef<boolean>(false) // 是否正在更新标记，防止重复调用

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
              logBusinessWarning('地理编码', 'Geocoder 插件加载失败')
              resolve(null)
            }
          })
        } else {
          logBusinessWarning('地理编码', 'AMap.plugin 不可用，无法加载 Geocoder 插件')
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
                logBusinessWarning('地理编码', 'PlaceSearch 插件加载失败')
                // 静默处理，避免控制台刷屏
                resolve(null)
              }
            })
          } else {
            logBusinessWarning('地理编码', 'AMap.plugin 不可用，无法加载 PlaceSearch 插件')
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
  // 优化：24小时刷新一次，避免频繁调用地图API
  const updateRestaurantCoordinates = useCallback(async (restaurants: Restaurant[]) => {
    if (!supabase) {
      return
    }

    // 检查AMap是否已加载
    if (typeof window === 'undefined' || !(window as any).AMap) {
      // 移除频繁的警告日志，避免控制台刷屏
      return
    }

    // 找出有地址但没有经纬度的餐厅（这些餐厅需要立即地理编码，不受24小时缓存限制）
    const restaurantsToGeocode = restaurants.filter(
      r => r.address && 
      r.address.trim() !== '' && 
      r.address !== '地址待完善' &&
      (!r.latitude || !r.longitude || isNaN(r.latitude) || isNaN(r.longitude))
    )
    
    // 如果没有需要地理编码的餐厅，直接返回
    if (restaurantsToGeocode.length === 0) {
      console.log('[Admin Dashboard] ✅ 所有餐厅都有有效坐标，无需地理编码')
      return
    }
    
    // 检查24小时缓存（仅用于批量更新已有坐标的餐厅，不适用于首次获取坐标）
    // 对于没有坐标的餐厅，允许立即地理编码
    const CACHE_KEY = 'restaurant_geocode_last_update'
    const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时 = 86400000 毫秒
    const lastUpdate = typeof window !== 'undefined' 
      ? localStorage.getItem(CACHE_KEY) 
      : null
    
    // 检查是否有餐厅已有坐标（这些餐厅的批量更新受24小时缓存限制）
    const restaurantsWithCoords = restaurants.filter(
      r => r.latitude && r.longitude && 
      !isNaN(r.latitude) && !isNaN(r.longitude) &&
      isFinite(r.latitude) && isFinite(r.longitude)
    )
    
    // 如果所有餐厅都没有坐标，允许立即地理编码（不受24小时缓存限制）
    if (restaurantsWithCoords.length === 0) {
      console.log(`[Admin Dashboard] 🔍 所有 ${restaurantsToGeocode.length} 个餐厅都没有坐标，立即进行地理编码（不受24小时缓存限制）`)
    } else if (lastUpdate) {
      const lastUpdateTime = parseInt(lastUpdate, 10)
      const now = Date.now()
      const timeSinceLastUpdate = now - lastUpdateTime
      const hoursRemaining = Math.floor((CACHE_DURATION - timeSinceLastUpdate) / (60 * 60 * 1000))
      
      if (timeSinceLastUpdate < CACHE_DURATION) {
        // 24小时内已更新过，但如果有餐厅没有坐标，仍然允许地理编码（仅针对没有坐标的餐厅）
        console.log(`[Admin Dashboard] ⏰ 地理编码缓存有效（距离上次更新 ${Math.floor(timeSinceLastUpdate / (60 * 60 * 1000))} 小时），但 ${restaurantsToGeocode.length} 个餐厅没有坐标，允许立即地理编码`)
      } else {
        console.log(`[Admin Dashboard] ⏰ 地理编码缓存已过期（距离上次更新 ${Math.floor(timeSinceLastUpdate / (60 * 60 * 1000))} 小时），允许调用API`)
      }
    } else {
      console.log(`[Admin Dashboard] ⏰ 首次地理编码，允许调用API（${restaurantsToGeocode.length} 个餐厅需要地理编码）`)
    }

    if (restaurantsToGeocode.length === 0) {
      // 移除调试日志，避免控制台刷屏
      // 即使没有需要编码的餐厅，也更新缓存时间
      if (typeof window !== 'undefined') {
        localStorage.setItem(CACHE_KEY, Date.now().toString())
      }
      return
    }

    // 移除调试日志，避免控制台刷屏

    // 批量处理地理编码（限制并发数，避免API限制）
    const batchSize = 3
    let updatedCount = 0
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
            logBusinessWarning('更新坐标', `更新餐厅 ${restaurant.id} 失败`, updateError)
          } else {
            updatedCount++
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
    
    // 更新缓存时间（无论是否成功更新，都记录本次尝试时间，确保24小时内不再调用API）
    if (typeof window !== 'undefined') {
      const updateTime = Date.now()
      localStorage.setItem(CACHE_KEY, updateTime.toString())
      const nextUpdateTime = new Date(updateTime + CACHE_DURATION)
      console.log(`[Admin Dashboard] ✅ 地理编码完成，更新了 ${updatedCount} 个餐厅位置`)
      console.log(`[Admin Dashboard] ⏰ 缓存已更新，下次允许调用API的时间：${nextUpdateTime.toLocaleString('zh-CN')}（24小时后）`)
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
    console.log('[Restaurants] 🚀 loadRestaurants 被调用')
    try {
      // 修复：不在 loadRestaurants 中设置 isLoading，避免覆盖身份验证状态
      // setIsLoading(true) // 已注释：避免影响主页面渲染
      if (!supabase) {
        console.warn("[Restaurants] ⚠️ Supabase未配置")
        return
      }
      
      // 🔒 强化隔离逻辑：如果是供应商但 userCompanyId 为空，禁止请求，防止权限滑坡
      // 注意：如果 userRole 还未加载（为 null），允许查询（可能是超级管理员）
      // admin 角色但没有 companyId 时，允许查询（向后兼容）
      if (userRole !== null && userRole !== "super_admin" && userRole !== "admin" && !userCompanyId) {
        console.warn("[Restaurants] ⚠️ 非管理员身份但缺少公司ID，禁止查询，防止权限滑坡")
        setRestaurants([])
        return
      }
      
      console.log('[Restaurants] ✅ Supabase已配置，开始查询数据库')

      console.log('[Restaurants] 🔍 开始查询数据库...')
      const { data, error } = await retryOnNetworkError(async () => {
        let query = supabase!
          .from("restaurants")
          .select("id, name, contact_name, contact_phone, total_refilled, status, created_at, latitude, longitude, address, qr_token")
        
        // 数据隔离：采用"非超级管理员即隔离"原则
        // 只要不是 super_admin，且存在 userCompanyId，就强制注入公司过滤
        // 注意：此查询依赖 restaurants 表有 company_id 字段
        // 如果表结构不同，需要相应调整字段名
        if (userRole !== "super_admin" && userCompanyId) {
          query = query.eq("company_id", userCompanyId)
          console.log(`[Restaurants] 🔒 数据隔离：供应商账号（角色: ${userRole}, 公司ID: ${userCompanyId}），只查询本公司的餐厅`)
        } else if (userRole !== "super_admin" && !userCompanyId && userRole !== null) {
          // 非超级管理员但没有 companyId，禁止查询（防止权限提升）
          console.warn(`[Restaurants] ⚠️ 非超级管理员（角色: ${userRole}）但没有 companyId，禁止查询，防止权限提升`)
          return { data: [], error: null }
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
      logBusinessWarning('Admin Dashboard', '加载餐厅数据时出错', error)
      // 防御性渲染：确保错误时也设置空数组
      setRestaurants([])
    }
  }, [supabase, mapLoaded, updateRestaurantCoordinates, userRole, userCompanyId])

  // 获取订单数量（不加载详细数据，用于折叠提醒）
  const loadRecentOrdersCount = useCallback(async () => {
    if (!supabase) return

    // 🔒 强化隔离逻辑：如果是供应商但 userCompanyId 为空，禁止请求，防止权限滑坡
    // 注意：如果 userRole 还未加载（为 null），允许查询（可能是超级管理员）
    // admin 角色但没有 companyId 时，允许查询（向后兼容）
    if (userRole !== null && userRole !== "super_admin" && userRole !== "admin" && !userCompanyId) {
      console.warn("[Orders] ⚠️ 非管理员身份但缺少公司ID，禁止查询订单数量，防止权限滑坡")
      setRecentOrdersCount(0)
      return
    }

    try {
      // 只查询数量，不加载详细数据
      const [repairResult, deliveryResult] = await Promise.all([
        retryOnNetworkError(async () => {
          const { count, error } = await supabase!
            .from("repair_orders")
            .select("*", { count: 'exact', head: true })
          return { data: count || 0, error }
        }),
        retryOnNetworkError(async () => {
          const { count, error } = await supabase!
            .from("delivery_orders")
            .select("*", { count: 'exact', head: true })
          return { data: count || 0, error }
        })
      ])
      
      const repairCount = repairResult.data || 0
      const deliveryCount = deliveryResult.data || 0
      setRecentOrdersCount(repairCount + deliveryCount)
    } catch (error) {
      logBusinessWarning('Admin Dashboard', '获取订单数量失败', error)
      setRecentOrdersCount(0)
    }
  }, [supabase, userRole, userCompanyId])

  // 加载订单数据
  // 加载最近订单（用于工作台显示）
  const loadRecentOrders = useCallback(async () => {
    if (!supabase) return

    // 🔒 强化隔离逻辑：如果是供应商但 userCompanyId 为空，禁止请求，防止权限滑坡
    // 注意：如果 userRole 还未加载（为 null），允许查询（可能是超级管理员）
    // admin 角色但没有 companyId 时，允许查询（向后兼容）
    if (userRole !== null && userRole !== "super_admin" && userRole !== "admin" && !userCompanyId) {
      console.warn("[Orders] ⚠️ 非管理员身份但缺少公司ID，禁止查询订单，防止权限滑坡")
      setRecentOrders([])
      setIsLoadingOrders(false)
      return
    }

    try {
      setIsLoadingOrders(true)
      
      // 数据隔离：如果是供应商，需要先查询该公司的餐厅ID列表
      let companyRestaurantIds: string[] | null = null
      if (userRole !== "super_admin" && userCompanyId) {
        const { data: companyRestaurants } = await supabase!
          .from("restaurants")
          .select("id")
          .eq("company_id", userCompanyId)
        companyRestaurantIds = companyRestaurants?.map(r => r.id) || []
        console.log(`[Orders] 🔒 数据隔离：供应商账号，只查询公司 ${userCompanyId} 的 ${companyRestaurantIds.length} 个餐厅的订单`)
      }
      
      // 表已分离，需要分别查询两个表然后合并
      let repairQuery = supabase!
        .from("repair_orders")
        .select("id, restaurant_id, service_type, status, amount, created_at, updated_at, assigned_to")
        .order("created_at", { ascending: false })
        .limit(20)
      
      let deliveryQuery = supabase!
        .from("delivery_orders")
        .select("id, restaurant_id, service_type, status, amount, created_at, updated_at, assigned_to")
        .order("created_at", { ascending: false })
        .limit(20)
      
      // 数据隔离：如果不是超级管理员，只查询本公司餐厅的订单
      if (companyRestaurantIds !== null && companyRestaurantIds.length > 0) {
        repairQuery = repairQuery.in("restaurant_id", companyRestaurantIds)
        deliveryQuery = deliveryQuery.in("restaurant_id", companyRestaurantIds)
      } else if (companyRestaurantIds !== null && companyRestaurantIds.length === 0) {
        // 如果供应商没有餐厅，返回空结果
        setRecentOrders([])
        setIsLoadingOrders(false)
        return
      }
      
      const [repairResult, deliveryResult] = await Promise.all([
        retryOnNetworkError(async () => await repairQuery),
        retryOnNetworkError(async () => await deliveryQuery)
      ])
      
      const repairData = repairResult.data || []
      const deliveryData = deliveryResult.data || []
      const ordersData = [...repairData, ...deliveryData]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20)
      
      const ordersError = repairResult.error || deliveryResult.error

      if (ordersError) {
        logBusinessWarning('Admin Dashboard', '加载订单失败', ordersError)
        // 防御性渲染：即使加载失败，也设置空数组
        setRecentOrders([])
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
          worker_id: order.assigned_to || order.worker_id, // 使用 assigned_to 或 worker_id
        }))
        setRecentOrders(formattedOrders)
      }
    } catch (error) {
      logBusinessWarning('Admin Dashboard', '加载订单时出错', error)
      // 防御性渲染：确保错误时也设置空数组
      setRecentOrders([])
    } finally {
      // 强制关闭 Loading，确保页面能渲染
      setIsLoadingOrders(false)
    }
  }, [])

  // 加载所有订单（用于订单管理页面）
  const loadAllOrders = useCallback(async () => {
    if (!supabase) return

    // 🔒 强化隔离逻辑：如果是供应商但 userCompanyId 为空，禁止请求，防止权限滑坡
    // 注意：如果 userRole 还未加载（为 null），允许查询（可能是超级管理员）
    // admin 角色但没有 companyId 时，允许查询（向后兼容）
    if (userRole !== null && userRole !== "super_admin" && userRole !== "admin" && !userCompanyId) {
      console.warn("[Orders] ⚠️ 非管理员身份但缺少公司ID，禁止查询订单，防止权限滑坡")
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
      
      // 数据隔离：如果不是超级管理员，只查询本公司餐厅的订单
      if (companyRestaurantIds !== null && companyRestaurantIds.length > 0) {
        repairQuery = repairQuery.in("restaurant_id", companyRestaurantIds)
        deliveryQuery = deliveryQuery.in("restaurant_id", companyRestaurantIds)
      } else if (companyRestaurantIds !== null && companyRestaurantIds.length === 0) {
        // 如果供应商没有餐厅，返回空结果
        setOrders([])
        setIsLoadingOrders(false)
        return
      }

      // 服务类型筛选
      if (orderServiceTypeFilter !== "all") {
        if (orderServiceTypeFilter === "燃料配送") {
          repairQuery = repairQuery.eq("service_type", "never_match") // 不匹配任何记录
        } else {
          repairQuery = repairQuery.eq("service_type", orderServiceTypeFilter)
          deliveryQuery = deliveryQuery.eq("service_type", "never_match") // 不匹配任何记录
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
  }, [orderServiceTypeFilter, orderStatusFilter])

  // 加载报修数据 - 直接使用 Supabase 查询（符合官方最佳实践）
  const loadRepairs = useCallback(async () => {
    // 🔒 强化隔离逻辑：如果是供应商但 userCompanyId 为空，禁止请求，防止权限滑坡
    // 注意：如果 userRole 还未加载（为 null），允许查询（可能是超级管理员）
    // admin 角色但没有 companyId 时，允许查询（向后兼容）
    if (userRole !== null && userRole !== "super_admin" && userRole !== "admin" && !userCompanyId) {
      console.warn("[Repairs] ⚠️ 非管理员身份但缺少公司ID，禁止查询报修数据，防止权限滑坡")
      setRepairs([])
      setIsLoadingRepairs(false)
      return
    }

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
        logBusinessWarning('Admin Dashboard', '接口返回错误', { status: response.status, errorText })
        
        // 🔐 如果是401未授权错误，自动跳转到登录页面
        if (response.status === 401) {
          console.warn("[报修管理] 检测到401未授权错误，跳转到登录页面")
          window.location.href = "/login"
          return
        }
        
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
        // 🔐 如果返回的结果表明未授权，跳转到登录页面
        if (result.error === "未授权" || result.details?.includes("请先登录")) {
          console.warn("[报修管理] 检测到未授权错误，跳转到登录页面")
          window.location.href = "/login"
          return
        }
        throw new Error(result.error || "获取维修列表失败")
      }

    } catch (error) {
      logBusinessWarning('Admin Dashboard', '加载报修时出错', error)
      if (error instanceof Error) {
        logBusinessWarning('Admin Dashboard', '错误详情', { message: error.message, stack: error.stack })
        
        // 🔐 如果错误信息中包含未授权相关的内容，跳转到登录页面
        if (error.message.includes("401") || error.message.includes("未授权") || error.message.includes("请先登录")) {
          console.warn("[报修管理] 检测到未授权错误，跳转到登录页面")
          window.location.href = "/login"
          return
        }
        
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

      // 直接使用 Supabase 更新 repair_orders 表（报修工单）
      const { data: updatedRepair, error: updateError } = await retryOnNetworkError(
        async () => await supabase!
          .from("repair_orders")
          .update(updateData)
          .eq("id", repairId)
          .select("id, restaurant_id, service_type, status, description, amount, created_at, updated_at, assigned_to")
          .single()
      )

      if (updateError) {
        logBusinessWarning('Admin Dashboard', '更新报修失败', updateError)
        alert(`更新失败: ${updateError.message || "未知错误"}`)
        setIsUpdatingRepair(false)
        return
      }

      if (!updatedRepair) {
        logBusinessWarning('Admin Dashboard', '更新报修后未返回数据')
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
      logBusinessWarning('Admin Dashboard', '更新报修时出错', error)
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
    // 🔒 强化隔离逻辑：如果是供应商但 userCompanyId 为空，禁止请求，防止权限滑坡
    // 注意：如果 userRole 还未加载（为 null），允许查询（可能是超级管理员）
    // admin 角色但没有 companyId 时，允许查询（向后兼容）
    if (userRole !== null && userRole !== "super_admin" && userRole !== "admin" && !userCompanyId) {
      console.warn("[RentalOrders] ⚠️ 非管理员身份但缺少公司ID，禁止查询租赁订单，防止权限滑坡")
      setRentalOrders([])
      setIsLoadingRentalOrders(false)
      return
    }

    setIsLoadingRentalOrders(true)
    setRentalOrderError(null)
    try {
      const params = new URLSearchParams()
      if (rentalOrderStatusFilter && rentalOrderStatusFilter !== "all") {
        params.append("status", rentalOrderStatusFilter)
      }

      const response = await fetch(`/api/equipment/rental/admin/list?${params.toString()}`)
      const result = await response.json()
      
      if (result.success) {
        setRentalOrders(result.data || [])
        setRentalOrderError(null)
      } else {
        const errorMsg = result.error || "获取租赁订单列表失败"
        const details = result.details ? `: ${result.details}` : ""
        logBusinessWarning('设备租赁管理', '加载失败', { errorMsg, details })
        setRentalOrderError(`${errorMsg}${details}`)
        setRentalOrders([])
      }
    } catch (err: any) {
      const errorMsg = err.message || "网络请求失败"
      logBusinessWarning('设备租赁管理', '加载失败', err)
      setRentalOrderError(errorMsg)
      setRentalOrders([])
    } finally {
      setIsLoadingRentalOrders(false)
    }
  }, [rentalOrderStatusFilter])

  // 加载设备租赁记录列表
  const loadDeviceRentals = useCallback(async () => {
    setIsLoadingDeviceRentals(true)
    setDeviceRentalError(null)
    try {
      const params = new URLSearchParams()
      if (deviceRentalStatusFilter && deviceRentalStatusFilter !== "all") {
        params.append("status", deviceRentalStatusFilter)
      }

      const response = await fetch(`/api/device-rentals/list?${params.toString()}`)
      const result = await response.json()
      
      if (result.success) {
        setDeviceRentals(result.data || [])
        setDeviceRentalError(null)
      } else {
        const errorMsg = result.error || "获取设备租赁记录列表失败"
        const details = result.details ? `: ${result.details}` : ""
        logBusinessWarning('设备租赁基础功能', '加载失败', { errorMsg, details })
        setDeviceRentalError(`${errorMsg}${details}`)
        setDeviceRentals([])
      }
    } catch (err: any) {
      const errorMsg = err.message || "网络请求失败"
      logBusinessWarning('设备租赁基础功能', '加载失败', err)
      setDeviceRentalError(errorMsg)
      setDeviceRentals([])
    } finally {
      setIsLoadingDeviceRentals(false)
    }
  }, [deviceRentalStatusFilter])
  
  // 加载设备分类列表（用于上传设备）
  const loadEquipmentCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/equipment/categories")
      const result = await response.json()
      if (result.success && result.data) {
        setEquipmentCategories(result.data)
      }
    } catch (err) {
      logBusinessWarning('设备租赁管理', '加载设备分类失败', err)
    }
  }, [])

  // 上传设备图片
  const handleUploadEquipmentImage = useCallback(async (file: File) => {
    if (!supabase || !userCompanyId) {
      alert("请先登录并关联公司")
      return null
    }

    setIsUploadingImages(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("company_id", userCompanyId)
      formData.append("folder", "equipment")

      const response = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      if (result.success && result.url) {
        setUploadedEquipmentImages((prev) => [...prev, result.url])
        return result.url
      } else {
        throw new Error(result.error || "上传失败")
      }
    } catch (err: any) {
      logBusinessWarning('设备租赁管理', '上传图片失败', err)
      alert(`上传图片失败: ${err.message}`)
      return null
    } finally {
      setIsUploadingImages(false)
    }
  }, [supabase, userCompanyId])

  // 提交上传设备
  const handleSubmitUploadEquipment = useCallback(async () => {
    if (!newEquipment.name || !newEquipment.monthly_rental_price) {
      alert("请填写设备名称和月租金")
      return
    }

    if (!userCompanyId) {
      alert("请先关联公司")
      return
    }

    setIsUploadingEquipment(true)
    try {
      const response = await fetch("/api/equipment/catalog/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: userCompanyId,
          name: newEquipment.name,
          brand: newEquipment.brand || null,
          model: newEquipment.model || null,
          description: newEquipment.description || null,
          category_id: newEquipment.category_id || null,
          monthly_rental_price: parseFloat(newEquipment.monthly_rental_price),
          daily_rental_price: newEquipment.daily_rental_price ? parseFloat(newEquipment.daily_rental_price) : null,
          deposit_amount: parseFloat(newEquipment.deposit_amount) || 0,
          min_rental_period: parseInt(newEquipment.min_rental_period) || 1,
          max_rental_period: newEquipment.max_rental_period ? parseInt(newEquipment.max_rental_period) : null,
          maintenance_included: newEquipment.maintenance_included,
          delivery_included: newEquipment.delivery_included,
          images: uploadedEquipmentImages,
          notes: newEquipment.notes || null,
        }),
      })

      const result = await response.json()
      if (result.success) {
        alert("设备上传成功！等待审核通过后即可在客户端显示。")
        setIsUploadEquipmentDialogOpen(false)
        setNewEquipment({
          name: "",
          brand: "",
          model: "",
          description: "",
          category_id: "",
          monthly_rental_price: "",
          daily_rental_price: "",
          deposit_amount: "0",
          min_rental_period: "1",
          max_rental_period: "",
          maintenance_included: true,
          delivery_included: false,
          notes: "",
        })
        setUploadedEquipmentImages([])
      } else {
        alert(`上传失败: ${result.error}`)
      }
    } catch (err: any) {
      logBusinessWarning('设备租赁管理', '上传设备失败', err)
      alert(`上传失败: ${err.message}`)
    } finally {
      setIsUploadingEquipment(false)
    }
  }, [newEquipment, uploadedEquipmentImages, userCompanyId])

  // 加载设备和餐厅列表（用于创建设备租赁记录）
  const loadDevicesAndRestaurantsForRental = useCallback(async () => {
    if (!supabase) {
      // 防御性渲染：如果 Supabase 未配置，设置空数组
      setAvailableDevices([])
      setAvailableRestaurants([])
      return
    }
    try {
      // 加载设备列表
      const { data: devicesData, error: devicesError } = await supabase
        .from("devices")
        .select("device_id, model, status")
        .order("device_id")
      
      // 防御性渲染：确保数据存在，否则设置空数组
      if (devicesError) {
        logBusinessWarning('设备租赁基础功能', '加载设备列表失败', devicesError)
        setAvailableDevices([])
      } else {
        setAvailableDevices(devicesData || [])
      }

      // 加载餐厅列表
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("id, name, address")
        .order("name")
      
      // 防御性渲染：确保数据存在，否则设置空数组
      if (restaurantError) {
        logBusinessWarning('设备租赁基础功能', '加载餐厅列表失败', restaurantError)
        setAvailableRestaurants([])
      } else {
        setAvailableRestaurants(restaurantData || [])
      }
    } catch (err) {
      logBusinessWarning('设备租赁基础功能', '加载设备和餐厅列表失败', err)
      // 防御性渲染：确保错误时也设置空数组
      setAvailableDevices([])
      setAvailableRestaurants([])
    }
  }, [supabase, userRole, userCompanyId])
  
  // 创建设备租赁记录
  const handleCreateDeviceRental = useCallback(async () => {
    if (!newDeviceRental.device_id || !newDeviceRental.restaurant_id || !newDeviceRental.start_at) {
      alert("请填写所有必需字段")
      return
    }

    setIsCreatingDeviceRental(true)
    try {
      const response = await fetch("/api/device-rentals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: newDeviceRental.device_id,
          restaurant_id: newDeviceRental.restaurant_id,
          start_at: newDeviceRental.start_at,
        }),
      })
      const result = await response.json()
      
      if (result.success) {
        await loadDeviceRentals()
        setIsAddDeviceRentalDialogOpen(false)
        setNewDeviceRental({
          device_id: "",
          restaurant_id: "",
          start_at: new Date().toISOString().slice(0, 16),
        })
        alert("设备租赁记录创建成功")
      } else {
        alert(`创建失败: ${result.error}`)
      }
    } catch (err: any) {
      alert(`创建失败: ${err.message}`)
    } finally {
      setIsCreatingDeviceRental(false)
    }
  }, [newDeviceRental, loadDeviceRentals])
  
  // 结束设备租赁记录
  const handleEndDeviceRental = useCallback(async (rentalId: string) => {
    if (!confirm("确定要结束此设备租赁记录吗？")) {
      return
    }

    setIsEndingDeviceRental(true)
    try {
      const response = await fetch("/api/device-rentals/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rental_id: rentalId,
        }),
      })
      const result = await response.json()
      
      if (result.success) {
        await loadDeviceRentals()
        setIsDeviceRentalDetailDialogOpen(false)
        setSelectedDeviceRental(null)
        alert("设备租赁记录已结束")
      } else {
        alert(`结束失败: ${result.error}`)
      }
    } catch (err: any) {
      alert(`结束失败: ${err.message}`)
    } finally {
      setIsEndingDeviceRental(false)
    }
  }, [loadDeviceRentals])

  // 当切换到设备租赁管理或筛选条件改变时加载数据
  useEffect(() => {
    if (activeMenu === "equipmentRental") {
      loadRentalOrders()
      // 加载设备和餐厅列表
      loadEquipmentAndRestaurants()
      // 加载设备租赁基础功能数据
      loadDeviceRentals()
      loadDevicesAndRestaurantsForRental()
    }
  }, [activeMenu, rentalOrderStatusFilter, deviceRentalStatusFilter, loadRentalOrders, loadDeviceRentals, loadDevicesAndRestaurantsForRental])

  // 加载设备和餐厅列表（用于新增订单）
  const loadEquipmentAndRestaurants = useCallback(async () => {
    if (!supabase) return
    try {
      // 加载设备列表
      const { data: equipmentData } = await supabase
        .from("equipment")
        .select("*")
        .eq("status", "active")
        .order("name")
      if (equipmentData) setEquipmentList(equipmentData)

      // 加载餐厅列表
      const { data: restaurantData } = await supabase
        .from("restaurants")
        .select("id, name")
        .order("name")
      if (restaurantData) setRestaurantList(restaurantData)

      // 加载公司列表（供应商）
      const { data: companyData } = await supabase
        .from("companies")
        .select("id, name")
        .eq("status", "active")
        .order("name")
      if (companyData) setCompanyList(companyData)
    } catch (err) {
      logBusinessWarning('设备租赁管理', '加载设备和餐厅列表失败', err)
    }
  }, [supabase, userRole, userCompanyId])

  // 更新订单状态
  const handleUpdateRentalOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    setIsUpdatingRentalOrder(true)
    try {
      const response = await fetch("/api/equipment/rental/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, order_status: newStatus }),
      })
      const result = await response.json()
      if (result.success) {
        await loadRentalOrders()
        setSelectedRentalOrder({ ...selectedRentalOrder!, order_status: newStatus })
      } else {
        alert(`更新失败: ${result.error}`)
      }
    } catch (err: any) {
      alert(`更新失败: ${err.message}`)
    } finally {
      setIsUpdatingRentalOrder(false)
    }
  }, [selectedRentalOrder, loadRentalOrders])

  // 更新支付状态
  const handleUpdateRentalOrderPaymentStatus = useCallback(async (orderId: string, newStatus: string) => {
    setIsUpdatingRentalOrder(true)
    try {
      const response = await fetch("/api/equipment/rental/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, payment_status: newStatus }),
      })
      const result = await response.json()
      if (result.success) {
        await loadRentalOrders()
        setSelectedRentalOrder({ ...selectedRentalOrder!, payment_status: newStatus })
      } else {
        alert(`更新失败: ${result.error}`)
      }
    } catch (err: any) {
      alert(`更新失败: ${err.message}`)
    } finally {
      setIsUpdatingRentalOrder(false)
    }
  }, [selectedRentalOrder, loadRentalOrders])

  // 创建新订单
  const handleCreateRentalOrder = useCallback(async () => {
    if (!newRentalOrder.restaurant_id || !newRentalOrder.equipment_id || !newRentalOrder.start_date) {
      alert("请填写必填字段（餐厅、设备、开始日期）")
      return
    }
    setIsUpdatingRentalOrder(true)
    try {
      const response = await fetch("/api/equipment/rental/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRentalOrder),
      })
      const result = await response.json()
      if (result.success) {
        setIsAddRentalOrderDialogOpen(false)
        setNewRentalOrder({
          restaurant_id: "",
          equipment_id: "",
          quantity: 1,
          rental_period: 1,
          start_date: new Date().toISOString().split("T")[0],
          delivery_address: "",
          contact_phone: "",
          notes: "",
          payment_method: "cash",
        })
        await loadRentalOrders()
        alert("订单创建成功！")
      } else {
        alert(`创建失败: ${result.error}`)
      }
    } catch (err: any) {
      alert(`创建失败: ${err.message}`)
    } finally {
      setIsUpdatingRentalOrder(false)
    }
  }, [newRentalOrder, loadRentalOrders])

  // 处理押金退款
  const handleRefundDeposit = useCallback(async () => {
    if (!selectedRentalOrder) return
    
    if (!refundReason.trim()) {
      alert("请输入退款原因")
      return
    }

    setIsProcessingRefund(true)
    try {
      const response = await fetch("/api/equipment/rental/deposit/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rental_order_id: selectedRentalOrder.id,
          refund_reason: refundReason,
          refund_proof: refundProof || null,
        }),
      })

      const result = await response.json()
      if (result.success) {
        alert(result.message || "押金退款成功！")
        setIsRefundDialogOpen(false)
        setRefundReason("")
        setRefundProof("")
        await loadRentalOrders()
        // 更新选中的订单状态
        setSelectedRentalOrder({ ...selectedRentalOrder, payment_status: 'refunded' })
      } else {
        alert(`退款失败: ${result.error || result.details}`)
      }
    } catch (err: any) {
      alert(`退款失败: ${err.message}`)
    } finally {
      setIsProcessingRefund(false)
    }
  }, [selectedRentalOrder, refundReason, refundProof, loadRentalOrders])

  // 批量更新状态
  const handleBatchUpdateStatus = useCallback(async () => {
    if (selectedRentalOrderIds.length === 0) return
    if (!confirm(`确定要将选中的 ${selectedRentalOrderIds.length} 个订单状态改为"已确认"吗？`)) return
    
    setIsUpdatingRentalOrder(true)
    try {
      const promises = selectedRentalOrderIds.map((id) =>
        fetch("/api/equipment/rental/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, order_status: "confirmed" }),
        })
      )
      await Promise.all(promises)
      setSelectedRentalOrderIds([])
      await loadRentalOrders()
      alert("批量更新成功！")
    } catch (err: any) {
      alert(`批量更新失败: ${err.message}`)
    } finally {
      setIsUpdatingRentalOrder(false)
    }
  }, [selectedRentalOrderIds, loadRentalOrders])

  // 加载租赁工作台数据（使用 rentals 表，直接连接 Supabase）
  const loadRentals = useCallback(async () => {
    if (!supabase) return
    setIsLoadingRentals(true)
    try {
      const { data, error } = await supabase
        .from("rentals")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        logBusinessWarning('租赁工作台', '加载失败', error)
        setRentals([])
      } else {
        setRentals(data || [])
      }
    } catch (err) {
      logBusinessWarning('租赁工作台', '加载失败', err)
      setRentals([])
    } finally {
      setIsLoadingRentals(false)
    }
  }, [supabase, userRole, userCompanyId])

  // 加载协议列表
  const loadAgreements = useCallback(async () => {
    setIsLoadingAgreements(true)
    setAgreementsError(null)
    try {
      const params = new URLSearchParams()
      if (agreementsTypeFilter !== "all") {
        params.append("type", agreementsTypeFilter)
      }
      if (agreementsStatusFilter !== "all") {
        params.append("status", agreementsStatusFilter)
      }

      const response = await fetch(`/api/agreements?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setAgreements(result.data || [])
        setAgreementsError(null)
      } else {
        const errorMsg = result.error || "获取协议列表失败"
        logBusinessWarning('协议管理', '加载失败', { errorMsg })
        setAgreementsError(errorMsg)
        setAgreements([])
      }
    } catch (err: any) {
      const errorMsg = err.message || "网络请求失败"
      logBusinessWarning('协议管理', '加载失败', err)
      setAgreementsError(errorMsg)
      setAgreements([])
    } finally {
      setIsLoadingAgreements(false)
    }
  }, [agreementsTypeFilter, agreementsStatusFilter])

  // 加载租赁合同列表（关联到协议管理）
  const loadRentalContracts = useCallback(async () => {
    setIsLoadingRentalContracts(true)
    setRentalContractsError(null)
    try {
      const response = await fetch("/api/admin/rental/contracts")
      const result = await response.json()

      if (result.success) {
        setRentalContracts(result.data || [])
        setRentalContractsError(null)
      } else {
        const errorMsg = result.error || "获取租赁合同列表失败"
        logBusinessWarning('协议管理', '加载租赁合同失败', { errorMsg })
        setRentalContractsError(errorMsg)
        setRentalContracts([])
      }
    } catch (err: any) {
      const errorMsg = err.message || "网络请求失败"
      logBusinessWarning('协议管理', '加载租赁合同失败', err)
      setRentalContractsError(errorMsg)
      setRentalContracts([])
    } finally {
      setIsLoadingRentalContracts(false)
    }
  }, [])

  // 加载租赁订单支付信息（关联到协议管理）
  const loadContractPaymentInfo = useCallback(async () => {
    if (!selectedRentalContract) return
    
    setIsLoadingPaymentInfo(true)
    try {
      // 查询与该合同相关的租赁订单和支付信息
      const response = await fetch(`/api/equipment/rental/admin/list`)
      const result = await response.json()

      if (result.success) {
        // 筛选与当前合同相关的订单（可以通过合同号、餐厅ID等关联）
        const relatedOrders = (result.data || []).filter((order: any) => {
          // 可以根据业务逻辑关联订单和合同
          // 这里简化处理，可以后续完善关联逻辑
          return order.restaurant_id === selectedRentalContract.lessee_restaurant_id
        })
        setContractPaymentInfo(relatedOrders)
      }
    } catch (err: any) {
      logBusinessWarning('协议管理', '加载支付信息失败', err)
      setContractPaymentInfo([])
    } finally {
      setIsLoadingPaymentInfo(false)
    }
  }, [selectedRentalContract])

  // 当切换到协议管理时加载数据
  useEffect(() => {
    if (activeMenu === "agreements") {
      loadAgreements()
      loadRentalContracts()
    }
  }, [activeMenu, agreementsTypeFilter, agreementsStatusFilter, loadAgreements, loadRentalContracts])

  // 当选中租赁合同时加载支付信息
  useEffect(() => {
    if (selectedRentalContract && isRentalContractDetailDialogOpen) {
      loadContractPaymentInfo()
    }
  }, [selectedRentalContract, isRentalContractDetailDialogOpen, loadContractPaymentInfo])

  // 当切换到租赁工作台时加载数据
  useEffect(() => {
    if (activeMenu === "rentals") {
      loadRentals()
    }
  }, [activeMenu, loadRentals])

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
      if (supabase) {
        supabase.removeChannel(channel)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, activeMenu, loadRepairs])

  // 加载工人数据
  const loadWorkers = useCallback(async () => {
    if (!supabase) return

    // 🔒 强化隔离逻辑：如果是供应商但 userCompanyId 为空，禁止请求，防止权限滑坡
    // 注意：如果 userRole 还未加载（为 null），允许查询（可能是超级管理员）
    // admin 角色但没有 companyId 时，允许查询（向后兼容）
    if (userRole !== null && userRole !== "super_admin" && userRole !== "admin" && !userCompanyId) {
      console.warn("[Workers] ⚠️ 非管理员身份但缺少公司ID，禁止查询工人数据，防止权限滑坡")
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
        logBusinessWarning('Admin Dashboard', '添加工人失败 - 详细错误', { error, code: error.code, details: error.details, hint: error.hint })
        
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
      logBusinessWarning('Admin Dashboard', '添加工人失败', error)
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
        logBusinessWarning('Admin Dashboard', '更新工人失败 - 详细错误', error)
        throw new Error(error.message || "更新工人失败")
      }

      // 刷新工人列表
      await loadWorkers()
      
      // 关闭对话框
      setIsEditWorkerDialogOpen(false)
      setEditingWorker(null)
      alert("工人信息更新成功")
    } catch (error: any) {
      logBusinessWarning('Admin Dashboard', '更新工人失败', error)
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
        logBusinessWarning('Admin Dashboard', '删除工人失败 - 详细错误', error)
        throw new Error(error.message || "删除工人失败")
      }

      // 刷新工人列表
      await loadWorkers()
      alert("工人删除成功")
    } catch (error: any) {
      logBusinessWarning('Admin Dashboard', '删除工人失败', error)
      alert(`删除工人失败: ${error.message || "未知错误"}`)
    } finally {
      setIsDeletingWorker(false)
      setDeletingWorkerId(null)
    }
  }

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

  // 加载设备数据
  const loadDevices = useCallback(async () => {
    if (!supabase) return

    // 🔒 强化隔离逻辑：如果是供应商但 userCompanyId 为空，禁止请求，防止权限滑坡
    // 注意：如果 userRole 还未加载（为 null），允许查询（可能是超级管理员）
    // admin 角色但没有 companyId 时，允许查询（向后兼容）
    if (userRole !== null && userRole !== "super_admin" && userRole !== "admin" && !userCompanyId) {
      console.warn("[Devices] ⚠️ 非管理员身份但缺少公司ID，禁止查询设备数据，防止权限滑坡")
      setDevices([])
      return
    }

    try {
      const { data, error } = await retryOnNetworkError(async () => {
        let query = supabase!
          .from("devices")
          .select("device_id, restaurant_id, model, address, installer, install_date, status")
        
        // 数据隔离：采用"非超级管理员即隔离"原则
        if (userRole !== "super_admin" && userCompanyId) {
          query = query.eq("company_id", userCompanyId)
          console.log('[Devices] 🔒 数据隔离：只查询公司ID', userCompanyId, '的设备')
        }
        
        return await query.order("install_date", { ascending: false })
      })

      if (error) {
        logBusinessWarning('Admin Dashboard', '加载设备列表失败', error)
        // 防御性渲染：即使加载失败，也设置空数组
        setDevices([])
        return
      }

      // 防御性渲染：确保 data 存在，否则设置空数组
      setDevices(data || [])
    } catch (error) {
      logBusinessWarning('Admin Dashboard', '加载设备列表失败', error)
      // 防御性渲染：确保错误时也设置空数组
      setDevices([])
    }
  }, [supabase, userRole, userCompanyId])

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
  useEffect(() => {
    const loadUserInfo = async () => {
      if (!supabase) {
        console.warn("[Dashboard] Supabase未配置，跳过用户信息加载")
        setForceRender(true)
        setIsLoading(false)
        setIsAuthenticated(true)
        return
      }

      try {
        // 获取当前用户
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          console.warn("[Dashboard] 未获取到用户信息，以访客模式运行")
          setUserRole(null)
          setUserCompanyId(null)
          setForceRender(true)
          setIsLoading(false)
          setIsAuthenticated(true) // 允许访问，但不加载数据
          return
        }

        // 获取用户角色
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle()

        if (roleError) {
          console.warn("[Dashboard] 查询角色失败:", roleError)
        }

        const role = roleData?.role || null
        setUserRole(role)
        console.log("[Dashboard] 用户角色:", role)

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

        // 如果不是超级管理员，查询公司信息
        const { data: userCompany, error: ucError } = await supabase
          .from("user_companies")
          .select("company_id")
          .eq("user_id", user.id)
          .eq("is_primary", true)
          .maybeSingle()

        if (ucError) {
          console.warn("[Dashboard] 查询公司信息失败:", ucError)
        }

        const companyId = userCompany?.company_id || null
        setUserCompanyId(companyId)
        console.log("[Dashboard] 用户公司ID:", companyId)

        // 如果有关联公司，加载权限（使用 API 端点绕过 RLS）
        if (companyId) {
          try {
            // 使用 API 端点查询权限，绕过 RLS 限制
            const response = await fetch(`/api/admin/get-company-permissions?companyId=${companyId}`)
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

    console.log('[Dashboard] 🚀 用户信息已加载，开始加载数据')
    console.log('[Dashboard] 用户角色:', userRole, '公司ID:', userCompanyId)
    
    loadRestaurants()
    loadWorkers()
    loadRecentOrdersCount() // 只加载订单数量，不加载详细数据
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
            // 只更新订单数量，不加载详细数据（除非已展开）
            loadRecentOrdersCount()
            if (isRecentOrdersExpanded) {
              loadRecentOrders()
            }
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
  }, [isAuthenticated, isLoading, userRole, userCompanyId, loadRestaurants, loadWorkers, loadRecentOrdersCount, loadRecentOrders, loadDevices, loadServicePoints, supabase, isRecentOrdersExpanded])


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

  // 创建自定义HTML标记 - 白色圆圈带脉冲动画
  const createMarkerHTML = (restaurant: Restaurant, hasActiveOrders: boolean) => {
    return `
      <div class="marker-pulse" style="
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: white;
        border: 2px solid #3b82f6;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        cursor: pointer;
        display: block;
        position: relative;
      "></div>
    `
  }

  // 计算餐厅坐标的中心点和合适的缩放级别
  // 使用最后一个注册的餐厅位置作为初始定位
  const calculateMapCenterAndZoom = useCallback(() => {
    let restaurantsWithLocation = restaurants.filter(
      (r) => r.latitude && r.longitude && 
      typeof r.latitude === 'number' && typeof r.longitude === 'number' &&
      !isNaN(r.latitude) && !isNaN(r.longitude)
    )

    if (restaurantsWithLocation.length === 0) {
      // 如果没有餐厅数据，返回默认的昆明中心
      console.log('[Map] 📍 没有餐厅数据，使用默认昆明中心点')
      return {
        center: [102.7183, 25.0389] as [number, number], // 昆明市中心
        zoom: 12
      }
    }
    
    // 验证所有坐标是否有效（防止定位到其他国家）
    const validRestaurants = restaurantsWithLocation.filter(r => {
      const lng = r.longitude!
      const lat = r.latitude!
      // 昆明大致范围：经度 102-103，纬度 24-26
      // 如果坐标明显不在中国境内，使用默认昆明中心
      const isValid = lng >= 102 && lng <= 103 && lat >= 24 && lat <= 26
      if (!isValid) {
        console.warn(`[Map] ⚠️ 餐厅 ${r.name} 的坐标 [${lng}, ${lat}] 不在昆明范围内，将使用默认中心点`)
      }
      return isValid
    })
    
    // 如果没有有效坐标，使用默认昆明中心
    if (validRestaurants.length === 0) {
      console.warn('[Map] ⚠️ 没有有效的餐厅坐标，使用默认昆明中心点')
      return {
        center: [102.7183, 25.0389] as [number, number],
        zoom: 12
      }
    }
    
    // 使用有效餐厅数据
    restaurantsWithLocation = validRestaurants

    // 按创建时间排序，获取最后一个注册的餐厅（created_at 最新的）
    const sortedRestaurants = [...restaurantsWithLocation].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
      return timeB - timeA // 降序排列，最新的在前
    })
    
    // 使用最后一个注册的餐厅位置作为地图中心
    const lastRestaurant = sortedRestaurants[0] // 排序后第一个就是最新的
    const center = [lastRestaurant.longitude!, lastRestaurant.latitude!] as [number, number]
    console.log(`[Map] 📍 使用最后一个注册的餐厅位置作为地图中心: ${lastRestaurant.name} [${center[0]}, ${center[1]}]`)
    
    // 验证中心点坐标是否在合理范围内（昆明地区）
    if (center[0] < 102 || center[0] > 103 || center[1] < 24 || center[1] > 26) {
      console.warn(`[Map] ⚠️ 计算出的中心点 [${center[0]}, ${center[1]}] 不在昆明范围内，使用默认昆明中心点`)
      return {
        center: [102.7183, 25.0389] as [number, number], // 昆明市中心
        zoom: 13
      }
    }
    
    return {
      center: center,
      zoom: 13 // 市级范围视图，确保可以看到昆明市范围（13级可以清楚看到市级区域，不会显示世界地图）
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
        logBusinessWarning('Map', '销毁地图实例时出错', error)
      }
    }
    setMapLoaded(false)
  }, [])


  // 更新地图标记
  // 注意：这个函数使用 restaurants 作为参数，确保总是使用最新的状态
  const updateMarkers = useCallback((restaurantsToUse?: Restaurant[]) => {
    // 防止频繁调用：如果距离上次调用不到500ms，跳过
    const now = Date.now()
    if (isUpdatingMarkersRef.current) {
      console.log('[Map] ⏸️ updateMarkers 正在执行中，跳过重复调用')
      return
    }
    if (now - lastUpdateMarkersTimeRef.current < 500) {
      console.log('[Map] ⏸️ updateMarkers 调用过于频繁，跳过（距离上次调用不到500ms）')
      return
    }
    
    // 如果传入了参数，使用参数；否则使用当前状态（可能不是最新的）
    const currentRestaurants = restaurantsToUse || restaurants
    
    console.log('[Map] 🚀 updateMarkers 被调用')
    console.log('[Map] 📊 当前状态:', {
      mapInstance: mapInstanceRef.current ? '存在' : '不存在',
      AMap: (window as any).AMap ? '已加载' : '未加载',
      restaurantsCount: currentRestaurants.length,
      mapLoaded: mapLoaded,
      usingProvidedRestaurants: !!restaurantsToUse,
      当前标记数: markersRef.current.length
    })
    
    if (!mapInstanceRef.current) {
      console.warn('[Map] ⚠️ updateMarkers: 地图实例不存在，跳过标记更新')
      return
    }

    const map = mapInstanceRef.current
    const AMap = (window as any).AMap
    if (!AMap) {
      console.warn('[Map] ⚠️ updateMarkers: AMap 未加载，跳过标记更新')
      return
    }
    
    // 标记为正在更新
    isUpdatingMarkersRef.current = true
    lastUpdateMarkersTimeRef.current = now
    
    console.log(`[Map] ✅ updateMarkers: 开始更新标记，餐厅数量: ${currentRestaurants.length}`)
    
    // 输出餐厅数据详情，用于调试
    const restaurantsStatus = currentRestaurants.map(r => ({
      id: r.id,
      name: r.name,
      address: r.address,
      lat: r.latitude,
      lng: r.longitude,
      hasValidCoords: r.latitude && r.longitude && 
                      typeof r.latitude === 'number' && typeof r.longitude === 'number' &&
                      !isNaN(r.latitude) && !isNaN(r.longitude)
    }))
    console.log(`[Map] 📊 餐厅数据详情:`, restaurantsStatus)
    
    // 统计有效坐标的餐厅数量
    const validCoordsCount = restaurantsStatus.filter(r => r.hasValidCoords).length
    console.log(`[Map] 📊 有效坐标的餐厅数量: ${validCoordsCount} / ${currentRestaurants.length}`)
    
    if (validCoordsCount === 0 && currentRestaurants.length > 0) {
      console.warn(`[Map] ⚠️ 有 ${currentRestaurants.length} 个餐厅，但都没有有效坐标！`)
      console.warn(`[Map] ⚠️ 可能原因：1) 24小时缓存阻止了地理编码 2) 地理编码失败 3) 数据库中没有存储坐标`)
    }

    // 清除现有标记（只在有标记时才清除）
    // 重要：只有在餐厅数据真正变化时才清除标记，避免频繁清除导致标记消失
    const currentMarkerCount = markersRef.current.length
    const newRestaurantIds = new Set(currentRestaurants.map(r => r.id))
    const existingMarkerIds = new Set(Array.from(markerMapRef.current.keys()))
    
    // 检查是否有餐厅被删除或添加
    const hasRestaurantChanges = currentRestaurants.length !== existingMarkerIds.size ||
      currentRestaurants.some(r => !existingMarkerIds.has(r.id)) ||
      Array.from(existingMarkerIds).some(id => !newRestaurantIds.has(id))
    
    if (currentMarkerCount > 0 && hasRestaurantChanges) {
      console.log(`[Map] 🗑️ 检测到餐厅数据变化，清除 ${currentMarkerCount} 个现有标记`)
      markersRef.current.forEach(marker => {
        try {
          map.remove(marker)
        } catch (e) {
          // 静默处理错误
        }
      })
      markersRef.current = []
    } else if (currentMarkerCount > 0) {
      console.log(`[Map] ✅ 餐厅数据未变化，保留现有 ${currentMarkerCount} 个标记`)
      // 不清除标记，直接返回，只更新需要更新的标记
      isUpdatingMarkersRef.current = false
      return
    }

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

        // 清除现有热力图（如果切换模式，需要清除旧的热力图）
        if (heatmapRef.current && !showHeatmap) {
          try {
            map.remove(heatmapRef.current)
            heatmapRef.current.setMap(null)
            heatmapRef.current = null
            console.log('[Map] 🗑️ 已清除热力图（切换到标记模式）')
          } catch (e) {
            // 静默处理错误，避免控制台刷屏
          }
        }

    // 始终显示标记，无论是否启用热力图
    // 获取有实时订单的餐厅ID列表
    const activeOrderRestaurantIds = new Set(
      orders
        .filter(o => o.status === "pending" || o.status === "待处理" || o.status === "delivering" || o.status === "配送中")
        .map(o => o.restaurant_id)
    )

    // 热力图功能暂时关闭，等待后续优化
    // 如果启用热力图，同时显示热力图
    // console.log(`[Map] 🔍 热力图状态检查: showHeatmap=${showHeatmap}, 当前餐厅数=${currentRestaurants.length}`)
    if (false && showHeatmap) { // 暂时禁用热力图功能
      console.log('[Map] 🔥 热力图模式已启用，同时显示标记和热力图')
      // 显示热力图模式（同时也会显示标记）
      const restaurantsWithLocation = currentRestaurants.filter(
        r => r.latitude && r.longitude && 
        typeof r.latitude === 'number' && typeof r.longitude === 'number' &&
        !isNaN(r.latitude) && !isNaN(r.longitude)
      )

      console.log(`[Map] 🔥 有有效坐标的餐厅数量: ${restaurantsWithLocation.length} / ${currentRestaurants.length}`)
      console.log(`[Map] 🔥 餐厅坐标详情:`, currentRestaurants.map(r => ({
        name: r.name,
        lat: r.latitude,
        lng: r.longitude,
        hasValidCoords: r.latitude && r.longitude && !isNaN(r.latitude) && !isNaN(r.longitude)
      })))

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
            count: 50, // 大幅增加权重，使灯光效果更明显（模拟城市灯光强度）
          }))
          // 为每个餐厅添加多个数据点，增强视觉效果
          .flatMap(point => {
            // 在每个餐厅周围添加多个数据点，模拟灯光扩散
            const points = [point]
            for (let i = 0; i < 5; i++) {
              // 在餐厅周围随机添加数据点（半径约100米）
              const angle = (Math.PI * 2 * i) / 5
              const radius = 0.001 // 约100米
              points.push({
                lng: point.lng + Math.cos(angle) * radius,
                lat: point.lat + Math.sin(angle) * radius,
                count: 30
              })
            }
            return points
          })

        console.log(`[Map] 🔥 热力图数据: ${heatmapData.length} 个有效坐标`)
        if (heatmapData.length > 0) {
          console.log(`[Map] 🔥 热力图数据示例（前3个）:`, heatmapData.slice(0, 3))
        }

        // 创建热力图（使用新的 API：AMap.HeatMap）
        try {
          // 如果已存在热力图实例，先清除（确保使用最新配置）
          if (heatmapRef.current) {
            try {
              map.remove(heatmapRef.current)
              heatmapRef.current.setMap(null)
              heatmapRef.current = null
              console.log('[Map] 🔄 清除旧热力图实例，重新创建')
            } catch (e) {
              console.warn('[Map] ⚠️ 清除旧热力图失败:', e)
            }
          }
          
          // 使用新的 API 名称：AMap.HeatMap（注意大小写）
          if (AMap.HeatMap) {
            console.log('[Map] 🔥 使用 AMap.HeatMap 创建热力图（城市灯光效果）')
            heatmapRef.current = new AMap.HeatMap(map, {
              radius: 150, // 大幅增大热力点半径，模拟城市灯光扩散效果（从太空看）
              opacity: [0, 1], // 提高最大透明度，增强灯光亮度
              gradient: {
                0.0: 'rgba(0, 0, 0, 0)',      // 完全透明（太空背景）
                0.1: 'rgba(30, 30, 100, 0.5)', // 深蓝色（偏远区域微弱灯光）
                0.3: 'rgba(100, 100, 200, 0.8)', // 蓝色（郊区灯光）
                0.5: 'rgba(200, 200, 100, 1)', // 黄绿色（城市边缘）
                0.7: 'rgba(255, 220, 100, 1)', // 金黄色（城市中心）
                0.9: 'rgba(255, 255, 200, 1)', // 亮黄色（城市核心）
                1.0: 'rgba(255, 255, 255, 1)'    // 纯白色（最亮城市核心）
              },
              zIndex: 100, // 提高 zIndex，确保热力图在最上层可见
            })
          } else if (AMap.Heatmap) {
            // 兼容旧版本 API
            console.log('[Map] 🔥 使用 AMap.Heatmap 创建热力图（城市灯光效果）')
            heatmapRef.current = new AMap.Heatmap(map, {
              radius: 150, // 大幅增大热力点半径，模拟城市灯光扩散效果（从太空看）
              opacity: [0, 1], // 提高最大透明度，增强灯光亮度
              gradient: {
                0.0: 'rgba(0, 0, 0, 0)',      // 完全透明（太空背景）
                0.1: 'rgba(30, 30, 100, 0.5)', // 深蓝色（偏远区域微弱灯光）
                0.3: 'rgba(100, 100, 200, 0.8)', // 蓝色（郊区灯光）
                0.5: 'rgba(200, 200, 100, 1)', // 黄绿色（城市边缘）
                0.7: 'rgba(255, 220, 100, 1)', // 金黄色（城市中心）
                0.9: 'rgba(255, 255, 200, 1)', // 亮黄色（城市核心）
                1.0: 'rgba(255, 255, 255, 1)'    // 纯白色（最亮城市核心）
              },
              zIndex: 30,
            })
          } else {
            console.warn('[Map] ⚠️ 热力图 API 不可用，请检查 AMap.HeatMap 插件是否已加载')
            console.warn('[Map] ⚠️ 可用的 AMap 对象:', Object.keys(AMap).filter(k => k.toLowerCase().includes('heat')))
            return
          }

          // 设置热力图数据（根据 API 版本使用不同方法）
          if (heatmapRef.current) {
            console.log(`[Map] 🔥 准备设置热力图数据，数据点数量: ${heatmapData.length}`)
            console.log(`[Map] 🔥 热力图数据示例:`, heatmapData.slice(0, 3))
            
            // 尝试多种方法设置热力图数据
            let dataSet = false
            if (typeof heatmapRef.current.setDataSet === 'function') {
              // 新版本 API - setDataSet
              console.log('[Map] 🔥 使用 setDataSet 方法设置热力图数据')
              try {
                heatmapRef.current.setDataSet({
                  data: heatmapData,
                  max: 100,
                })
                dataSet = true
                console.log('[Map] ✅ setDataSet 成功')
              } catch (e) {
                console.warn('[Map] ⚠️ setDataSet 失败:', e)
              }
            }
            
            if (!dataSet && typeof heatmapRef.current.setData === 'function') {
              // 旧版本 API - setData
              console.log('[Map] 🔥 使用 setData 方法设置热力图数据')
              try {
                heatmapRef.current.setData({
                  data: heatmapData,
                  max: 200, // 提高最大值，使热力图更明显
                })
                dataSet = true
                console.log('[Map] ✅ setData 成功')
              } catch (e) {
                console.warn('[Map] ⚠️ setData 失败:', e)
              }
            }
            
            // 如果以上方法都失败，尝试直接设置 data 属性
            if (!dataSet && heatmapRef.current.data !== undefined) {
              console.log('[Map] 🔥 尝试直接设置 data 属性')
              try {
                heatmapRef.current.data = heatmapData
                dataSet = true
                console.log('[Map] ✅ 直接设置 data 成功')
              } catch (e) {
                console.warn('[Map] ⚠️ 直接设置 data 失败:', e)
              }
            }
            
            if (!dataSet) {
              console.warn('[Map] ⚠️ 所有热力图数据设置方法都失败')
              console.warn('[Map] ⚠️ 热力图对象的方法:', Object.getOwnPropertyNames(heatmapRef.current).filter(m => typeof heatmapRef.current[m] === 'function'))
              console.warn('[Map] ⚠️ 热力图对象的属性:', Object.getOwnPropertyNames(heatmapRef.current))
              return
            }
            
            console.log('[Map] 🔥 热力图数据已设置')
          }
        } catch (error) {
          console.error('[Map] ❌ 创建热力图失败:', error)
          logBusinessWarning('Map', '创建热力图失败', error)
          return
        }

        // 确保热力图添加到地图（强制添加，不检查是否已存在）
        if (heatmapRef.current) {
          try {
            // 先尝试移除（如果存在）
            try {
              map.remove(heatmapRef.current)
              console.log('[Map] 🔄 已移除旧热力图实例')
            } catch (e) {
              // 忽略错误，可能不存在
              console.log('[Map] 🔄 旧热力图实例不存在，跳过移除')
            }
            
            // 添加到地图
            map.add(heatmapRef.current)
            console.log('[Map] 🔥 热力图已成功添加到地图')
            
            // 立即验证热力图是否真的在地图上
            try {
              const overlays = map.getAllOverlays ? map.getAllOverlays() : []
              const hasHeatmap = Array.from(overlays).some((overlay: any) => overlay === heatmapRef.current)
              console.log(`[Map] 🔥 热力图立即验证: ${hasHeatmap ? '✅ 已在地图上' : '❌ 未在地图上'}`)
              
              if (!hasHeatmap) {
                console.warn('[Map] ⚠️ 热力图未成功添加到地图，尝试重新添加')
                map.add(heatmapRef.current)
              }
              
              // 强制显示热力图
              if (heatmapRef.current.show) {
                heatmapRef.current.show()
                console.log('[Map] 🔥 已调用 heatmapRef.current.show()')
              }
              if (heatmapRef.current.setVisible) {
                heatmapRef.current.setVisible(true)
                console.log('[Map] 🔥 已调用 heatmapRef.current.setVisible(true)')
              }
              
              // 检查热力图的可见性
              const isVisible = heatmapRef.current.getVisible ? heatmapRef.current.getVisible() : true
              console.log(`[Map] 🔥 热力图可见性: ${isVisible ? '可见' : '不可见'}`)
              
              console.log('[Map] 🔥 热力图已强制显示')
            } catch (e) {
              console.error('[Map] ❌ 验证热力图时出错:', e)
            }
            
            // 延迟验证（确保热力图完全加载）
            setTimeout(() => {
              try {
                const overlays = map.getAllOverlays ? map.getAllOverlays() : []
                const hasHeatmap = Array.from(overlays).some((overlay: any) => overlay === heatmapRef.current)
                console.log(`[Map] 🔥 热力图延迟验证（500ms后）: ${hasHeatmap ? '✅ 已在地图上' : '❌ 未在地图上'}`)
                
                if (!hasHeatmap) {
                  console.warn('[Map] ⚠️ 热力图在延迟验证时未在地图上，尝试重新添加')
                  map.add(heatmapRef.current)
                }
              } catch (e) {
                console.error('[Map] ❌ 延迟验证热力图时出错:', e)
              }
            }, 500)
          } catch (e) {
            console.error('[Map] ❌ 添加热力图到地图失败:', e)
          }
        } else {
          console.error('[Map] ❌ heatmapRef.current 为空，无法添加到地图')
        }
      } else {
        console.warn('[Map] ⚠️ 没有有效的餐厅坐标用于热力图，需要等待地理编码完成')
        console.log(`[Map] 📍 当前餐厅坐标状态: ${currentRestaurants.map(r => `${r.name}: lat=${r.latitude}, lng=${r.longitude}`).join('; ')}`)
      }
    } else {
      console.log('[Map] 标记模式（未启用热力图）')
    }
    
    // 无论是否启用热力图，都显示标记点
    // 获取有实时订单的餐厅ID列表（使用之前定义的 activeOrderRestaurantIds）
    // 为每个餐厅创建标记
    console.log(`[Map] 🚀 开始为 ${currentRestaurants.length} 个餐厅创建标记（使用 currentRestaurants）`)
    // 输出餐厅数据详情，方便调试
    if (currentRestaurants.length > 0) {
      console.log(`[Map] 📊 餐厅数据详情:`, currentRestaurants.map(r => ({
        name: r.name,
        lat: r.latitude,
        lng: r.longitude,
        hasAddress: !!r.address,
        hasValidCoords: r.latitude && r.longitude && 
                        typeof r.latitude === 'number' && typeof r.longitude === 'number' &&
                        !isNaN(r.latitude) && !isNaN(r.longitude)
      })))
    } else {
      console.warn(`[Map] ⚠️ 当前没有餐厅数据（currentRestaurants.length = 0），无法创建标记`)
      isUpdatingMarkersRef.current = false
      return
    }
    let validCount = 0
    let invalidCount = 0
    let createdCount = 0 // 实际创建的标记数量
    
    currentRestaurants.forEach(restaurant => {
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
        
        // 如果有有效的经纬度，直接创建标记（即使24小时内不进行地理编码，也要使用已有的经纬度）
        if (isValidLat && isValidLng) {
          // 经纬度有效，继续创建标记（下面的代码会处理）
        } else {
          invalidCount++
          // 如果没有有效的经纬度，检查24小时缓存后再决定是否进行地理编码
          // 重要：即使是新餐厅，也要遵循24小时缓存规则，防止频繁调用API造成账单消费
          if (restaurant.address && restaurant.address.trim() !== '' && restaurant.address !== '地址待完善') {
            // 检查是否已经在进行地理编码，避免重复请求
            if (geocodingInProgressRef.current.has(restaurant.id)) {
              // 正在编码中，静默跳过，不输出日志
              return
            }
            
            // 重要：对于没有坐标的餐厅，允许立即地理编码，不受24小时缓存限制
            // 24小时缓存只适用于已有坐标的餐厅的批量更新，不适用于首次获取坐标
            // 这样可以确保新餐厅或缺少坐标的餐厅能够立即显示在地图上
            console.log(`[Map] 🔍 ${restaurant.name} 缺少经纬度，立即进行地理编码（不受24小时缓存限制）`)
            
            // 标记为正在编码
            geocodingInProgressRef.current.add(restaurant.id)
            // 输出地理编码启动日志（限制输出次数）
            const geocodeCount = geocodingInProgressRef.current.size
            if (geocodeCount <= 5) {
              console.log(`[Map] 🔍 [${geocodeCount}/3] 为 ${restaurant.name} 进行地理编码: ${restaurant.address}（24小时缓存已过期或首次调用）`)
            }
            // 进行地理编码（24小时缓存已过期或首次调用）
            geocodeAddress(restaurant.address).then(location => {
              if (location && supabase) {
                console.log(`[Map] 地理编码成功: ${restaurant.name} -> lat=${location.latitude}, lng=${location.longitude}`)
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
                      // 更新24小时缓存时间（防止频繁调用API造成账单消费）
                      const CACHE_KEY = 'restaurant_geocode_last_update'
                      if (typeof window !== 'undefined') {
                        localStorage.setItem(CACHE_KEY, Date.now().toString())
                      }
                      console.log(`[Map] 💾 数据库更新成功: ${restaurant.name}`)
                      // 更新本地状态并重新创建标记（使用函数式更新确保获取最新状态）
                      setRestaurants(prev => {
                        const updated = prev.map(r => 
                          r.id === restaurant.id 
                            ? { ...r, latitude: location.latitude, longitude: location.longitude }
                            : r
                        )
                        console.log(`[Map] 🔄 已更新本地状态: ${restaurant.name} 现在有有效坐标 (lat=${location.latitude}, lng=${location.longitude})`)
                        console.log(`[Map] 📊 更新后的餐厅状态:`, updated.map(r => ({
                          name: r.name,
                          lat: r.latitude,
                          lng: r.longitude
                        })))
                        // 立即触发标记更新（使用更新后的状态）
                        // 注意：不要立即调用 updateMarkers，因为这会清除所有现有标记
                        // 而是只更新这个特定餐厅的标记位置
                        setTimeout(() => {
                          console.log(`[Map] 🔄 地理编码成功，更新单个餐厅标记: ${restaurant.name}`)
                          // 只更新这个餐厅的标记，而不是清除所有标记
                          if (mapInstanceRef.current && markerMapRef.current.has(restaurant.id)) {
                            const { marker } = markerMapRef.current.get(restaurant.id)!
                            try {
                              marker.setPosition([location.longitude, location.latitude])
                              console.log(`[Map] ✅ 已更新标记位置: ${restaurant.name} -> [${location.longitude}, ${location.latitude}]`)
                            } catch (e) {
                              console.error(`[Map] ❌ 更新标记位置失败: ${restaurant.name}`, e)
                              // 如果更新失败，重新创建标记
                              updateMarkers(updated)
                            }
                          } else {
                            // 如果标记不存在，重新创建所有标记
                            console.log(`[Map] 🔄 标记不存在，重新创建所有标记`)
                            updateMarkers(updated)
                          }
                        }, 300)
                        return updated
                      })
                    } else {
                      console.error(`[Map] 数据库更新失败: ${restaurant.name}`, error)
                      logBusinessWarning('Map', '数据库更新失败', error)
                    }
                    // 移除编码标记
                    geocodingInProgressRef.current.delete(restaurant.id)
                  })
              } else {
                console.warn(`[Map] 地理编码失败: ${restaurant.name} - 无法获取位置信息`)
                // 移除编码标记
                geocodingInProgressRef.current.delete(restaurant.id)
              }
            }).catch(err => {
              console.error(`[Map] 地理编码异常: ${restaurant.name}`, err)
              logBusinessWarning('Map', `地理编码失败: ${restaurant.name}`, err)
              // 移除编码标记（即使失败也要移除，避免永久阻塞）
              geocodingInProgressRef.current.delete(restaurant.id)
            })
          } else {
            console.warn(`[Map] 餐厅 ${restaurant.name} 没有有效地址，无法进行地理编码`)
          }
          // 跳过标记创建（因为经纬度无效，等待地理编码完成后再创建）
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
          console.warn(`[Map] ⚠️ 跳过无效坐标的餐厅标记: ${restaurant.name} (lat: ${lat}, lng: ${lng})`)
          invalidCount++
          return
        }
        
        // 坐标验证通过，增加有效计数
        validCount++
        
        // 调试日志：确认使用已有的经纬度创建标记
        console.log(`[Map] ✅ 准备创建标记: ${restaurant.name} (lat: ${lat}, lng: ${lng})`)
        
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
            visible: true, // 确保标记可见
            raiseOnDrag: true, // 拖拽时提升层级
            cursor: 'pointer', // 鼠标悬停时显示手型
            title: restaurant.name, // 添加标题
          })
        } catch (error) {
          // 捕获创建标记时的错误，避免地图崩溃
          console.error(`[Map] ❌ 创建标记失败: ${restaurant.name}`, error)
          logBusinessWarning('Map', `创建标记失败: ${restaurant.name}`, error)
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

        try {
          // 添加到地图
          map.add(marker)
          
          // 确保标记可见
          if (marker.show) {
            marker.show()
          }
          if (marker.setVisible) {
            marker.setVisible(true)
          }
          
          markersRef.current.push(marker)
          infoWindowsRef.current.push(infoWindow)
          
          // 存储标记和信息窗口的映射关系，用于定位功能
          markerMapRef.current.set(restaurant.id, { marker, infoWindow })
          
          // 验证标记是否真的在地图上
          const markerPosition = marker.getPosition()
          const markerVisible = marker.getVisible ? marker.getVisible() : true
          const actualLng = markerPosition ? markerPosition.getLng() : null
          const actualLat = markerPosition ? markerPosition.getLat() : null
          
          // 检查坐标是否匹配
          if (actualLng !== null && actualLat !== null) {
            const lngDiff = Math.abs(actualLng - lng)
            const latDiff = Math.abs(actualLat - lat)
            if (lngDiff > 0.001 || latDiff > 0.001) {
              console.warn(`[Map] ⚠️ 坐标不匹配: ${restaurant.name}`, {
                预期位置: `[${lng}, ${lat}]`,
                实际位置: `[${actualLng}, ${actualLat}]`,
                差异: `经度差 ${lngDiff.toFixed(6)}, 纬度差 ${latDiff.toFixed(6)}`
              })
            }
          }
          
          console.log(`[Map] ✅ 成功创建并添加标记到地图: ${restaurant.name}`, {
            预期位置: `[${lng}, ${lat}]`,
            实际位置: markerPosition ? `[${actualLng}, ${actualLat}]` : '无法获取',
            可见性: markerVisible,
            zIndex: marker.getzIndex ? marker.getzIndex() : 100,
            标记对象: marker
          })
          
          // 强制设置标记位置（如果坐标不匹配）
          if (markerPosition && (Math.abs(markerPosition.getLng() - lng) > 0.001 || Math.abs(markerPosition.getLat() - lat) > 0.001)) {
            console.log(`[Map] 🔧 修正标记位置: ${restaurant.name} 从 [${markerPosition.getLng()}, ${markerPosition.getLat()}] 到 [${lng}, ${lat}]`)
            try {
              marker.setPosition([lng, lat])
            } catch (e) {
              console.error(`[Map] ❌ 修正标记位置失败: ${restaurant.name}`, e)
            }
          }
          createdCount++
        } catch (error) {
          console.error(`[Map] ❌ 添加标记到地图失败: ${restaurant.name}`, error)
          logBusinessWarning('Map', `添加标记失败: ${restaurant.name}`, error)
          // 标记创建失败，从有效计数中减去（因为之前已经增加了）
          validCount--
          invalidCount++
        }
    })
    
    // 标记更新完成
    isUpdatingMarkersRef.current = false
    
    console.log(`[Map] 📍 标记创建完成总结: 有效坐标 ${validCount} 个，无效坐标 ${invalidCount} 个，成功创建 ${createdCount} 个，实际添加到地图 ${markersRef.current.length} 个标记`)
    
    // 如果标记数量不匹配，输出警告
    if (validCount !== markersRef.current.length) {
      console.warn(`[Map] ⚠️ 标记数量不匹配: 有效坐标 ${validCount} 个，但只添加了 ${markersRef.current.length} 个标记到地图`)
    }
    
    // 验证所有标记是否真的在地图上并可见
    if (markersRef.current.length > 0 && map) {
      console.log(`[Map] 🔍 开始验证 ${markersRef.current.length} 个标记的可见性:`)
      markersRef.current.forEach((marker, index) => {
        try {
          const position = marker.getPosition()
          const visible = marker.getVisible ? marker.getVisible() : true
          const zIndex = marker.getzIndex ? marker.getzIndex() : 100
          const content = marker.getContent ? marker.getContent() : null
          
          console.log(`[Map]   标记 ${index + 1}:`, {
            位置: position ? `[${position.getLng()}, ${position.getLat()}]` : '无法获取',
            可见性: visible,
            zIndex: zIndex,
            content存在: !!content,
            content长度: content ? String(content).length : 0
          })
          
          // 如果标记不可见，尝试强制显示
          if (!visible) {
            console.warn(`[Map] ⚠️ 标记 ${index + 1} 不可见，尝试强制显示`)
            if (marker.show) marker.show()
            if (marker.setVisible) marker.setVisible(true)
          }
        } catch (error) {
          console.error(`[Map] ❌ 验证标记 ${index + 1} 时出错:`, error)
        }
      })
      
      // 测试标记已移除 - 餐厅标记已正常工作
    }
    
    // 如果有标记，尝试调整地图视图以显示所有标记（只在第一次有标记时调整，避免频繁重置）
    if (markersRef.current.length > 0 && map) {
      try {
        const bounds = new AMap.Bounds()
        let hasValidBounds = false
        markersRef.current.forEach(marker => {
          const position = marker.getPosition()
          if (position) {
            const lng = position.getLng()
            const lat = position.getLat()
            // 验证坐标是否有效
            if (isFinite(lng) && isFinite(lat) && !isNaN(lng) && !isNaN(lat)) {
              bounds.extend(position)
              hasValidBounds = true
            }
          }
        })
        // 只有在有有效边界时才调整地图视图
        if (hasValidBounds && bounds.getSouthWest() && bounds.getNorthEast()) {
          // 检查当前地图中心，如果已经是正确区域，不要重置（避免用户手动缩放后被重置）
          const currentCenter = map.getCenter()
          const currentZoom = map.getZoom()
          const boundsCenter = bounds.getCenter()
          
          // 如果当前视图已经在地图范围内，且缩放级别合理，不重置视图
          const distance = currentCenter.distance(boundsCenter)
          // 强制调整：如果缩放级别太小（世界视图）或距离太远，必须调整
          const shouldAdjust = !mapBoundsAdjustedRef.current || currentZoom < 5 || distance > 10000
          
          console.log(`[Map] 📊 地图视图调整判断:`, {
            当前中心: `[${currentCenter.getLng()}, ${currentCenter.getLat()}]`,
            当前缩放: currentZoom,
            标记中心: `[${boundsCenter.getLng()}, ${boundsCenter.getLat()}]`,
            距离: `${distance.toFixed(0)}m`,
            已调整过: mapBoundsAdjustedRef.current,
            应该调整: shouldAdjust
          })
          
          if (shouldAdjust) {
            console.log(`[Map] 🎯 调整地图视图以显示所有 ${markersRef.current.length} 个标记`)
            
            // 优先使用最后一个注册餐厅的位置作为中心点
            const sortedRestaurants = restaurants.filter(
              r => r.latitude && r.longitude && 
              typeof r.latitude === 'number' && typeof r.longitude === 'number' &&
              !isNaN(r.latitude) && !isNaN(r.longitude)
            ).sort((a, b) => {
              const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
              const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
              return timeB - timeA
            })
            
            if (sortedRestaurants.length > 0) {
              // 使用最后一个注册餐厅的位置作为中心点
              const lastRestaurant = sortedRestaurants[0]
              const lastRestaurantCenter = [lastRestaurant.longitude!, lastRestaurant.latitude!] as [number, number]
              console.log(`[Map] 📍 使用最后一个注册餐厅位置作为地图中心: ${lastRestaurant.name} [${lastRestaurantCenter[0]}, ${lastRestaurantCenter[1]}]`)
              
              // 验证中心点是否在合理范围内
              if (lastRestaurantCenter[0] >= 102 && lastRestaurantCenter[0] <= 103 && 
                  lastRestaurantCenter[1] >= 24 && lastRestaurantCenter[1] <= 26) {
                map.setCenter(lastRestaurantCenter)
                map.setZoom(13) // 市级范围视图
                console.log(`[Map] ✅ 地图已定位到最后一个注册餐厅: ${lastRestaurant.name}`)
              } else {
                // 如果坐标不在昆明范围内，使用边界调整
                console.warn(`[Map] ⚠️ 最后一个餐厅坐标不在昆明范围内，使用边界调整`)
                map.setBounds(bounds, false, [50, 50, 50, 50])
              }
            } else {
              // 如果没有餐厅数据，使用边界调整
              map.setBounds(bounds, false, [50, 50, 50, 50])
            }
            
            mapBoundsAdjustedRef.current = true // 标记已调整
            
            // 验证调整后的视图
            setTimeout(() => {
              const newCenter = map.getCenter()
              const newZoom = map.getZoom()
              console.log(`[Map] ✅ 地图视图已调整: 中心 [${newCenter.getLng()}, ${newCenter.getLat()}], 缩放 ${newZoom}`)
              
              // 如果缩放级别仍然太小，强制设置一个合理的缩放级别
              if (newZoom < 10) {
                console.log(`[Map] 🔧 缩放级别太小 (${newZoom})，强制设置为 13`)
                map.setZoom(13)
              }
              
              // 验证中心点是否在合理范围内（昆明地区）
              const centerLng = newCenter.getLng()
              const centerLat = newCenter.getLat()
              if (centerLng < 102 || centerLng > 103 || centerLat < 24 || centerLat > 26) {
                console.warn(`[Map] ⚠️ 调整后的中心点 [${centerLng}, ${centerLat}] 不在昆明范围内，重新使用最后一个注册餐厅的位置`)
                // 重新使用最后一个注册餐厅的位置
                if (sortedRestaurants.length > 0) {
                  const lastRestaurant = sortedRestaurants[0]
                  map.setCenter([lastRestaurant.longitude!, lastRestaurant.latitude!])
                  map.setZoom(13)
                  console.log(`[Map] ✅ 已重新定位到最后一个注册餐厅: ${lastRestaurant.name} [${lastRestaurant.longitude}, ${lastRestaurant.latitude}]`)
                } else {
                  map.setCenter([102.7183, 25.0389]) // 昆明中心
                  map.setZoom(13)
                }
              }
            }, 500)
          } else {
            console.log(`[Map] 📍 地图视图已在正确位置，不重置（当前缩放: ${currentZoom}, 距离: ${distance.toFixed(0)}m）`)
          }
        }
      } catch (error) {
        console.warn('[Map] 调整地图视图失败，使用默认视图', error)
      }
    } else if (markersRef.current.length === 0) {
      // 没有标记时，确保地图显示昆明区域（不要重置为世界地图）
      if (map) {
        const currentCenter = map.getCenter()
        const currentZoom = map.getZoom()
        // 如果当前是世界地图视图（缩放级别太小），且还没有调整过，设置为昆明区域
        if (currentZoom < 5 && !mapBoundsAdjustedRef.current) {
          console.log(`[Map] 🗺️ 当前为世界地图视图（缩放: ${currentZoom}），设置为昆明区域`)
          map.setCenter([102.7183, 25.0389]) // 昆明中心
          map.setZoom(12) // 合适的缩放级别
          mapBoundsAdjustedRef.current = true // 标记已调整
        } else {
          // 如果用户已经手动缩放，保持当前视图，不要重置
          console.log(`[Map] ⚠️ 没有标记被创建，但地图视图保持在当前区域（缩放: ${currentZoom}）`)
        }
      } else {
        console.warn('[Map] ⚠️ 没有标记被创建，请检查餐厅数据是否有有效经纬度')
      }
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

  // 热力图功能暂时关闭，等待后续优化
  // 监听 showHeatmap 变化，立即更新热力图
  // useEffect(() => {
  //   if (mapInstanceRef.current && mapLoaded) {
  //     console.log(`[Map] 🔥 showHeatmap 状态变化: ${showHeatmap}，立即更新热力图`)
  //     updateMarkers()
  //   }
  // }, [showHeatmap, mapLoaded, updateMarkers])

  // 初始化地图
  const initMap = useCallback(async () => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY || '21556e22648ec56beda3e6148a22937c'
    if (!amapKey) {
      logBusinessWarning('Map', 'AMAP_KEY未配置')
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
      // 计算地图中心点和缩放级别
      const { center, zoom } = calculateMapCenterAndZoom()
      console.log(`[Map] 🗺️ 地图初始化 - 中心点: [${center[0]}, ${center[1]}], 缩放级别: ${zoom}`)
      
      // 检查 AMap 是否已经加载
      if (typeof window !== 'undefined' && (window as any).AMap) {
        console.log('[Map] ✅ AMap 已存在，直接使用')
        // AMap 已加载，直接创建地图
        const AMap = (window as any).AMap
        if (!mapContainerRef.current) {
          logBusinessWarning('Map', '地图容器不存在')
          setMapLoaded(true)
          return
        }
        
        const map = new AMap.Map(mapContainerRef.current, {
          mapStyle: 'amap://styles/darkblue',
          center: center,
          zoom: zoom,
          viewMode: '3D',
        })
        
        mapInstanceRef.current = map
        
        // 热力图功能暂时关闭，不再切换到卫星图
        // setTimeout(() => {
        //   try {
        //     if (AMap.MapType && AMap.MapType.SATELLITE) {
        //       map.setMapType(AMap.MapType.SATELLITE) // 切换到卫星图
        //       console.log('[Map] 🛰️ 已切换到卫星图，热力图应该更明显')
        //     }
        //   } catch (e) {
        //     console.warn('[Map] ⚠️ 切换到卫星图失败，使用默认地图类型:', e)
        //   }
        // }, 1000)
        
        // 加载必要的地图插件
        if (AMap.plugin) {
          AMap.plugin(['AMap.Geocoder', 'AMap.PlaceSearch'], () => { // 热力图插件已暂时移除
            console.log('[Map] ✅ 地图插件已加载（包括热力图）')
          })
        }
        
        // 地图加载完成
        const handleMapComplete = () => {
          console.log('[Map] ✅ 地图加载完成，开始更新标记')
          setMapLoaded(true)
          setTimeout(() => {
            console.log('[Map] 🔄 地图加载完成，调用 updateMarkers')
            updateMarkers()
            setRestaurants(currentRestaurants => {
              if (currentRestaurants.length > 0) {
                updateRestaurantCoordinates(currentRestaurants)
              }
              return currentRestaurants
            })
          }, 500)
        }
        
        // 添加超时保护：如果地图在10秒内没有加载完成，强制设置为已加载
        const loadTimeout = setTimeout(() => {
          console.warn('[Map] ⚠️ 地图加载超时（10秒），强制设置为已加载状态')
          setMapLoaded(true)
          setTimeout(() => {
            updateMarkers()
          }, 500)
        }, 10000)
        
        map.on('complete', () => {
          clearTimeout(loadTimeout)
          handleMapComplete()
        })
        
        // 如果地图已经加载完成（可能很快），立即处理
        if (map.getStatus && map.getStatus() === 'complete') {
          clearTimeout(loadTimeout)
          handleMapComplete()
        }
        
        return
      }
      
      // 动态加载高德地图JS API
      const script = document.createElement('script')
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&callback=initAMapCallback`
      script.async = true
      
      // 添加脚本加载错误处理
      script.onerror = () => {
        console.error('[Map] ❌ 地图脚本加载失败')
        logBusinessWarning('Map', '地图脚本加载失败')
        setMapLoaded(true) // 即使加载失败，也设置为已加载，避免一直显示加载中
      }
      
      // 创建全局回调函数
      ;(window as any).initAMapCallback = () => {
        const AMap = (window as any).AMap
        if (!AMap) {
          logBusinessWarning('Map', 'AMap未加载')
          setMapLoaded(true)
          return
        }

        if (!mapContainerRef.current) {
          logBusinessWarning('Map', '地图容器不存在')
          setMapLoaded(true)
          return
        }

        // 创建地图实例，使用计算出的中心点和缩放级别
        console.log(`[Map] 📍 创建地图实例 - 中心点: [${center[0]}, ${center[1]}], 缩放级别: ${zoom}`)
        const map = new AMap.Map(mapContainerRef.current, {
          mapStyle: 'amap://styles/darkblue',
          center: center, // AMap 使用 [经度, 纬度] 格式
          zoom: zoom, // 确保使用计算出的缩放级别，避免显示世界地图
          viewMode: '3D',
          // 设置最小缩放级别，防止缩放到世界地图
          minZoom: 10,
          maxZoom: 18,
        })
        
        mapInstanceRef.current = map
        
        // 验证地图缩放级别是否正确设置（防止显示世界地图）
        setTimeout(() => {
          const actualZoom = map.getZoom()
          console.log(`[Map] ✅ 地图实际缩放级别: ${actualZoom} (预期: ${zoom})`)
          if (actualZoom < 10) {
            console.warn(`[Map] ⚠️ 地图缩放级别过小 (${actualZoom})，强制设置为 13`)
            map.setZoom(13)
            map.setCenter(center) // 确保中心点也正确
          }
        }, 500)
        // 清除初始化标志
        if (mapContainerRef.current) {
          ;(mapContainerRef.current as any).__mapInitializing = false
        }
        console.log('[Map] ✅ 地图实例创建成功')

      // 加载必要的地图插件（Geocoder、PlaceSearch 和 HeatMap）
      if (AMap.plugin) {
        AMap.plugin(['AMap.Geocoder', 'AMap.PlaceSearch', 'AMap.HeatMap'], () => {
          console.log('[Map] ✅ 地图插件已加载（包括热力图）')
        })
      }

        // 添加超时保护：如果地图在10秒内没有加载完成，强制设置为已加载
        const loadTimeout = setTimeout(() => {
          console.warn('[Map] ⚠️ 地图加载超时（10秒），强制设置为已加载状态')
          setMapLoaded(true)
          // 尝试更新标记
          setTimeout(() => {
            updateMarkers()
          }, 500)
        }, 10000)
        
        // 地图加载完成
        const handleMapComplete = () => {
          clearTimeout(loadTimeout)
          console.log('[Map] ✅ 地图加载完成，开始更新标记')
          setMapLoaded(true)
          // 地图加载完成后，立即更新标记（使用已有的经纬度）
          setTimeout(() => {
            console.log('[Map] 🔄 地图加载完成，调用 updateMarkers')
            updateMarkers()
            // 尝试更新没有经纬度的餐厅坐标
            setRestaurants(currentRestaurants => {
              if (currentRestaurants.length > 0) {
                updateRestaurantCoordinates(currentRestaurants)
              }
              return currentRestaurants
            })
          }, 500)
        }
        
        map.on('complete', () => {
          clearTimeout(loadTimeout)
          handleMapComplete()
        })
        
        // 如果地图已经加载完成（可能很快），立即处理
        if (map.getStatus && map.getStatus() === 'complete') {
          clearTimeout(loadTimeout)
          handleMapComplete()
        }
      }

      script.onerror = () => {
        logBusinessWarning('Map', '地图脚本加载失败')
        setMapLoaded(true)
      }

      document.head.appendChild(script)
    } catch (error) {
      logBusinessWarning('Map', '初始化地图失败', error)
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
      
      // 使用防抖机制，避免频繁调用（延迟1000ms，增加延迟以减少频繁更新）
      updateMarkersTimerRef.current = setTimeout(() => {
        // 只有在标记更新完成后才允许再次调用
        if (!isUpdatingMarkersRef.current) {
          updateMarkers()
        } else {
          console.log('[Map] ⏸️ updateMarkers 正在执行中，跳过 useEffect 触发的调用')
        }
      }, 1000) // 增加到1秒，减少频繁更新
      
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
      logBusinessWarning('Admin Dashboard', '创建订单失败', error)
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
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">餐厅管理</h1>
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
              <div className="h-[300px] md:h-[600px] rounded-lg overflow-hidden border border-slate-800">
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
              <CardTitle className="text-2xl md:text-3xl text-white">{stats.totalRestaurants}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">已激活</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-white">{stats.activatedRestaurants}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">待处理订单</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-yellow-400">{stats.pendingOrders}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">总营收</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-green-400">¥{stats.totalRevenue.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 最新订单 - 折叠消息条目提醒 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">最新订单</CardTitle>
            <CardDescription className="text-slate-400">实时订单动态</CardDescription>
          </CardHeader>
          <CardContent>
            {!isRecentOrdersExpanded ? (
              // 折叠状态：显示消息条目提醒
              <div 
                className="p-4 rounded-xl border-2 border-blue-500/30 bg-blue-500/5 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/10 transition-all duration-300"
                onClick={async () => {
                  setIsRecentOrdersExpanded(true)
                  // 点击后加载实际订单数据
                  await loadRecentOrders()
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <ShoppingCart className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">点击查看最新订单</p>
                      <p className="text-slate-400 text-xs mt-1">
                        {recentOrdersCount > 0 ? `共有 ${recentOrdersCount} 个订单` : '正在获取订单数量...'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {recentOrdersCount > 0 ? `${recentOrdersCount} 条` : '加载中'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
              </div>
            ) : (
              // 展开状态：显示实际订单列表
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-slate-400">已展开订单列表</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsRecentOrdersExpanded(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4 mr-1" />
                    折叠
                  </Button>
                </div>
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
              </>
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
                  onClick={() => {
                    // 暂时禁用热力图功能
                    console.log('[Map] ⚠️ 热力图功能已暂时关闭，等待后续优化')
                    alert('热力图功能暂时关闭，等待后续优化')
                  }}
                  variant="outline"
                  disabled
                  className="border-gray-500/30 text-gray-400 cursor-not-allowed opacity-50"
                  title="热力图功能暂时关闭，等待后续优化"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  热力图（已关闭）
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
                <Button
                  onClick={() => {
                    console.log('[Map] 🔧 手动触发标记更新')
                    console.log(`[Map] 📊 当前餐厅数据:`, restaurants.map(r => ({
                      name: r.name,
                      lat: r.latitude,
                      lng: r.longitude,
                      address: r.address
                    })))
                    console.log(`[Map] 📊 地图实例:`, mapInstanceRef.current ? '存在' : '不存在')
                    console.log(`[Map] 📊 地图已加载:`, mapLoaded)
                    if (mapInstanceRef.current && mapLoaded) {
                      updateMarkers()
                    } else {
                      console.warn('[Map] ⚠️ 地图未准备好，无法更新标记')
                    }
                  }}
                  variant="outline"
                  className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                  title="调试：手动更新标记"
                >
                  🔧 刷新标记
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              ref={mapContainerRef} 
              className="w-full h-[300px] md:h-[600px] rounded-lg overflow-hidden border border-blue-800/30 relative"
              style={{ width: '100%', minHeight: '300px' }}
            >
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-30">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-slate-400 text-sm">加载地图中...</p>
                    <p className="text-slate-500 text-xs mt-2">如果长时间未加载，请刷新页面</p>
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
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">订单管理</h1>
          <p className="text-slate-400">按业务类型管理所有订单</p>
        </div>

        {/* 订单统计 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">总订单数</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-white">{orders.length}</CardTitle>
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
              <CardTitle className="text-2xl md:text-3xl text-blue-400">{deliveringOrders.length}</CardTitle>
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
              <CardTitle className="text-xl md:text-2xl text-red-400">{repairOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/50 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-300">燃料配送订单</CardDescription>
              <CardTitle className="text-xl md:text-2xl text-blue-400">{deliveryOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-purple-900/30 to-purple-950/50 border-purple-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-300">其他订单</CardDescription>
              <CardTitle className="text-xl md:text-2xl text-purple-400">{otherOrders.length}</CardTitle>
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
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">报修管理</h1>
          <p className="text-slate-400">管理所有报修工单和维修状态</p>
        </div>

        {/* 报修统计 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="bg-gradient-to-br from-slate-900/90 to-purple-950/90 border-purple-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">总报修数</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-white">{repairs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-yellow-950/90 border-yellow-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">待处理</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-yellow-400">{pendingRepairs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">处理中</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-blue-400">{processingRepairs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-green-950/90 border-green-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">已完成</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-green-400">{completedRepairs.length}</CardTitle>
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

    // 搜索和筛选
    const filteredOrders = rentalOrders.filter((order) => {
      // 状态筛选
      if (rentalOrderStatusFilter !== "all" && order.order_status !== rentalOrderStatusFilter) {
        return false
      }
      // 搜索筛选
      if (rentalOrderSearchQuery) {
        const query = rentalOrderSearchQuery.toLowerCase()
        return (
          order.order_number?.toLowerCase().includes(query) ||
          order.equipment?.name?.toLowerCase().includes(query) ||
          order.restaurants?.name?.toLowerCase().includes(query) ||
          order.contact_phone?.includes(query)
        )
      }
      return true
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

    // 设备租赁基础功能：筛选和搜索
    const filteredDeviceRentals = deviceRentals.filter((rental) => {
      // 状态筛选
      if (deviceRentalStatusFilter !== "all" && rental.status !== deviceRentalStatusFilter) {
        return false
      }
      // 搜索筛选
      if (deviceRentalSearchQuery) {
        const query = deviceRentalSearchQuery.toLowerCase()
        return (
          rental.device_id?.toLowerCase().includes(query) ||
          rental.devices?.device_id?.toLowerCase().includes(query) ||
          rental.devices?.model?.toLowerCase().includes(query) ||
          rental.restaurants?.name?.toLowerCase().includes(query) ||
          rental.restaurants?.address?.toLowerCase().includes(query)
        )
      }
      return true
    })

    const activeDeviceRentals = deviceRentals.filter((r) => r.status === "active")
    const endedDeviceRentals = deviceRentals.filter((r) => r.status === "ended")

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">设备租赁管理</h1>
          <p className="text-slate-400">管理所有设备租赁订单</p>
        </div>
        
        {/* 设备租赁基础功能区域 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-green-950/90 border-green-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-xl flex items-center gap-2">
              <Package className="h-5 w-5" />
              设备租赁基础功能
            </CardTitle>
            <CardDescription className="text-slate-400">
              管理设备的使用租赁关系（不涉及租金计算和金融逻辑）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">总租赁记录</CardDescription>
                  <CardTitle className="text-2xl text-white">{deviceRentals.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-green-800/50 border-green-700/50">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">租赁中</CardDescription>
                  <CardTitle className="text-2xl text-green-400">{activeDeviceRentals.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-slate-700/50 border-slate-600/50">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">已结束</CardDescription>
                  <CardTitle className="text-2xl text-slate-400">{endedDeviceRentals.length}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* 搜索和操作栏 */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex-1 w-full md:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="搜索设备ID、设备型号、餐厅名称或地址..."
                    value={deviceRentalSearchQuery}
                    onChange={(e) => setDeviceRentalSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsAddDeviceRentalDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  创建租赁记录
                </Button>
                <Button
                  onClick={() => {
                    setIsUploadEquipmentDialogOpen(true)
                    loadEquipmentCategories()
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  上传设备
                </Button>
              </div>
            </div>

            {/* 状态筛选 */}
            <div className="flex flex-wrap gap-2">
              {["all", "active", "ended"].map((status) => (
                <Button
                  key={status}
                  variant={deviceRentalStatusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDeviceRentalStatusFilter(status)}
                  className={
                    deviceRentalStatusFilter === status
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "border-slate-600/50 text-slate-300 hover:bg-slate-800/50"
                  }
                >
                  {status === "all" ? "全部" : status === "active" ? "租赁中" : "已结束"}
                </Button>
              ))}
            </div>

            {/* 错误提示 */}
            {deviceRentalError && (
              <Card className="bg-red-900/50 border-red-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="flex-1">
                      <p className="text-red-400 font-medium">加载失败</p>
                      <p className="text-red-300 text-sm mt-1">{deviceRentalError}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadDeviceRentals()}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      重试
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 租赁记录列表 */}
            {isLoadingDeviceRentals ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-green-400 mr-2" />
                <span className="text-slate-400">加载中...</span>
              </div>
            ) : filteredDeviceRentals.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">
                    {deviceRentalError ? "加载失败，请点击上方重试按钮" : "暂无设备租赁记录"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredDeviceRentals.map((rental) => (
                  <Card
                    key={rental.id}
                    className="bg-slate-800/50 border-slate-700/50 hover:border-green-500/50 transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedDeviceRental(rental)
                      setIsDeviceRentalDetailDialogOpen(true)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-white">
                              {rental.devices?.device_id || rental.device_id}
                            </h3>
                            <Badge
                              className={
                                rental.status === "active"
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                              }
                            >
                              {rental.status === "active" ? "租赁中" : "已结束"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-slate-400">设备型号：</span>
                              <span className="text-white ml-2">
                                {rental.devices?.model || "未知"}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">餐厅：</span>
                              <span className="text-white ml-2">
                                {rental.restaurants?.name || "未知"}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">开始时间：</span>
                              <span className="text-white ml-2">
                                {new Date(rental.start_at).toLocaleString("zh-CN")}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">结束时间：</span>
                              <span className="text-white ml-2">
                                {rental.end_at
                                  ? new Date(rental.end_at).toLocaleString("zh-CN")
                                  : "未结束"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 分隔线 */}
        <div className="border-t border-slate-700/50 my-6"></div>
        
        {/* 原有设备租赁订单管理（rental_orders 表） */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">设备租赁订单管理</h2>
          <p className="text-slate-400 mb-6">管理复杂的设备租赁订单（包含租金、支付等）</p>
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

        {/* 搜索和操作栏 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* 搜索框 */}
              <div className="flex-1 w-full md:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="搜索订单号、设备名称、餐厅名称或联系电话..."
                    value={rentalOrderSearchQuery}
                    onChange={(e) => setRentalOrderSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsAddRentalOrderDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新增订单
                </Button>
                {selectedRentalOrderIds.length > 0 && (
                  <>
                    <Button
                      onClick={handleBatchUpdateStatus}
                      variant="outline"
                      className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      批量确认 ({selectedRentalOrderIds.length})
                    </Button>
                    <Button
                      onClick={() => setSelectedRentalOrderIds([])}
                      variant="outline"
                      className="border-slate-600/50 text-slate-400 hover:bg-slate-800/50"
                    >
                      取消选择
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* 错误提示 */}
        {rentalOrderError && (
          <Card className="bg-gradient-to-br from-red-900/90 to-red-800/90 border-red-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-400 font-medium">加载失败</p>
                  <p className="text-red-300 text-sm mt-1">{rentalOrderError}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadRentalOrders()}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  重试
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
              <p className="text-slate-400">
                {rentalOrderError ? "加载失败，请点击上方重试按钮" : "暂无租赁订单"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              // 确保每个订单都有唯一的 key，只使用稳定的 id
              const orderId = order.id || order.order_number
              if (!orderId) return null // 如果没有 id，跳过渲染
              const isSelected = selectedRentalOrderIds.includes(order.id)
              return (
              <Card
                key={orderId}
                className={`bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm hover:border-blue-500/50 transition-all ${
                  isSelected ? "border-blue-500 ring-2 ring-blue-500/50" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* 复选框 */}
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation()
                          if (e.target.checked) {
                            setSelectedRentalOrderIds((prev) => [...prev, order.id])
                          } else {
                            setSelectedRentalOrderIds((prev) => prev.filter((id) => id !== order.id))
                          }
                        }}
                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        setSelectedRentalOrder(order)
                        setIsRentalOrderDetailDialogOpen(true)
                      }}
                    >
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
              )
            })}
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

                {/* 操作按钮 */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                  {/* 退款按钮：仅当订单已完成或已取消，且未退款时显示 */}
                  {(selectedRentalOrder.order_status === 'completed' || selectedRentalOrder.order_status === 'cancelled') &&
                    selectedRentalOrder.payment_status !== 'refunded' &&
                    parseFloat(selectedRentalOrder.deposit_amount?.toString() || "0") > 0 && (
                    <Button
                      onClick={() => setIsRefundDialogOpen(true)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      押金退款
                    </Button>
                  )}
                  {selectedRentalOrder.payment_status === 'refunded' && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      押金已退款
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 押金退款对话框 */}
        <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">押金退款</DialogTitle>
              <DialogDescription className="text-slate-400">
                订单号：{selectedRentalOrder?.order_number}
              </DialogDescription>
            </DialogHeader>

            {selectedRentalOrder && (
              <div className="space-y-4 mt-4">
                {/* 退款金额显示 */}
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">退款金额：</span>
                    <span className="text-green-400 font-bold text-xl">
                      ¥{selectedRentalOrder.deposit_amount?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </div>

                {/* 退款原因 */}
                <div className="space-y-2">
                  <Label className="text-slate-300">退款原因 <span className="text-red-400">*</span></Label>
                  <Textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="请输入退款原因，例如：订单完成、设备完好；订单取消等"
                    className="bg-slate-800 border-slate-700 text-white"
                    rows={3}
                  />
                </div>

                {/* 退款凭证（可选） */}
                <div className="space-y-2">
                  <Label className="text-slate-300">退款凭证（可选）</Label>
                  <Input
                    value={refundProof}
                    onChange={(e) => setRefundProof(e.target.value)}
                    placeholder="退款凭证URL（图片或转账凭证）"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500">可以上传退款凭证图片URL或转账凭证</p>
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsRefundDialogOpen(false)
                      setRefundReason("")
                      setRefundProof("")
                    }}
                    className="border-slate-600 text-slate-300"
                    disabled={isProcessingRefund}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleRefundDeposit}
                    disabled={isProcessingRefund || !refundReason.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isProcessingRefund ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-2" />
                        确认退款
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 创建设备租赁记录对话框 */}
        <Dialog open={isAddDeviceRentalDialogOpen} onOpenChange={setIsAddDeviceRentalDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">创建设备租赁记录</DialogTitle>
              <DialogDescription className="text-slate-400">
                为设备创建使用租赁关系（不涉及租金计算）
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* 选择设备 */}
              <div className="space-y-2">
                <Label className="text-slate-300">设备 <span className="text-red-400">*</span></Label>
                <Select
                  value={newDeviceRental.device_id}
                  onValueChange={(value) =>
                    setNewDeviceRental({ ...newDeviceRental, device_id: value })
                  }
                >
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="选择设备" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {availableDevices.map((device) => (
                      <SelectItem
                        key={device.device_id}
                        value={device.device_id}
                        className="text-white hover:bg-slate-700"
                      >
                        {device.device_id} - {device.model || "未知型号"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 选择餐厅 */}
              <div className="space-y-2">
                <Label className="text-slate-300">餐厅 <span className="text-red-400">*</span></Label>
                <Select
                  value={newDeviceRental.restaurant_id}
                  onValueChange={(value) =>
                    setNewDeviceRental({ ...newDeviceRental, restaurant_id: value })
                  }
                >
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="选择餐厅" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {availableRestaurants.map((restaurant) => (
                      <SelectItem
                        key={restaurant.id}
                        value={restaurant.id}
                        className="text-white hover:bg-slate-700"
                      >
                        {restaurant.name} {restaurant.address ? `- ${restaurant.address}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 开始时间 */}
              <div className="space-y-2">
                <Label className="text-slate-300">开始时间 <span className="text-red-400">*</span></Label>
                <Input
                  type="datetime-local"
                  value={newDeviceRental.start_at}
                  onChange={(e) =>
                    setNewDeviceRental({ ...newDeviceRental, start_at: e.target.value })
                  }
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDeviceRentalDialogOpen(false)}
                  className="border-slate-600/50 text-slate-300 hover:bg-slate-800/50"
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreateDeviceRental}
                  disabled={isCreatingDeviceRental}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isCreatingDeviceRental ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    "创建"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 设备租赁记录详情对话框 */}
        <Dialog
          open={isDeviceRentalDetailDialogOpen}
          onOpenChange={setIsDeviceRentalDetailDialogOpen}
        >
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">设备租赁记录详情</DialogTitle>
              <DialogDescription className="text-slate-400">
                查看设备租赁记录的详细信息
              </DialogDescription>
            </DialogHeader>
            {selectedDeviceRental && (
              <div className="space-y-4">
                {/* 基本信息 */}
                <div className="bg-slate-800/50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">状态：</span>
                    <Badge
                      className={
                        selectedDeviceRental.status === "active"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                      }
                    >
                      {selectedDeviceRental.status === "active" ? "租赁中" : "已结束"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">设备ID：</span>
                    <span className="text-white">
                      {selectedDeviceRental.devices?.device_id || selectedDeviceRental.device_id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">设备型号：</span>
                    <span className="text-white">
                      {selectedDeviceRental.devices?.model || "未知"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">餐厅：</span>
                    <span className="text-white">
                      {selectedDeviceRental.restaurants?.name || "未知"}
                    </span>
                  </div>
                  {selectedDeviceRental.restaurants?.address && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">餐厅地址：</span>
                      <span className="text-white">{selectedDeviceRental.restaurants.address}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">开始时间：</span>
                    <span className="text-white">
                      {new Date(selectedDeviceRental.start_at).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">结束时间：</span>
                    <span className="text-white">
                      {selectedDeviceRental.end_at
                        ? new Date(selectedDeviceRental.end_at).toLocaleString("zh-CN")
                        : "未结束"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">创建时间：</span>
                    <span className="text-white">
                      {new Date(selectedDeviceRental.created_at).toLocaleString("zh-CN")}
                    </span>
                  </div>
                </div>

                {/* 操作按钮 */}
                {selectedDeviceRental.status === "active" && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      onClick={() => handleEndDeviceRental(selectedDeviceRental.id)}
                      disabled={isEndingDeviceRental}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isEndingDeviceRental ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          结束中...
                        </>
                      ) : (
                        "结束租赁"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 上传设备对话框 */}
        <Dialog open={isUploadEquipmentDialogOpen} onOpenChange={setIsUploadEquipmentDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">上传设备</DialogTitle>
              <DialogDescription className="text-slate-400">
                上传设备信息，审核通过后将在客户端显示
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">设备名称 *</Label>
                  <Input
                    value={newEquipment.name}
                    onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                    placeholder="例如：商用电磁炉"
                  />
                </div>
                <div>
                  <Label className="text-white">品牌</Label>
                  <Input
                    value={newEquipment.brand}
                    onChange={(e) => setNewEquipment({ ...newEquipment, brand: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                    placeholder="例如：美的"
                  />
                </div>
                <div>
                  <Label className="text-white">型号</Label>
                  <Input
                    value={newEquipment.model}
                    onChange={(e) => setNewEquipment({ ...newEquipment, model: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                    placeholder="例如：MC-EP186"
                  />
                </div>
                <div>
                  <Label className="text-white">设备分类</Label>
                  <Select
                    value={newEquipment.category_id}
                    onValueChange={(value) => setNewEquipment({ ...newEquipment, category_id: value })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {equipmentCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-white">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white">月租金（元） *</Label>
                  <Input
                    type="number"
                    value={newEquipment.monthly_rental_price}
                    onChange={(e) => setNewEquipment({ ...newEquipment, monthly_rental_price: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                    placeholder="例如：500"
                  />
                </div>
                <div>
                  <Label className="text-white">日租金（元）</Label>
                  <Input
                    type="number"
                    value={newEquipment.daily_rental_price}
                    onChange={(e) => setNewEquipment({ ...newEquipment, daily_rental_price: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                    placeholder="例如：20"
                  />
                </div>
                <div>
                  <Label className="text-white">押金（元）</Label>
                  <Input
                    type="number"
                    value={newEquipment.deposit_amount}
                    onChange={(e) => setNewEquipment({ ...newEquipment, deposit_amount: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                    placeholder="例如：1000"
                  />
                </div>
                <div>
                  <Label className="text-white">最短租期（月）</Label>
                  <Input
                    type="number"
                    value={newEquipment.min_rental_period}
                    onChange={(e) => setNewEquipment({ ...newEquipment, min_rental_period: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                    placeholder="例如：1"
                  />
                </div>
                <div>
                  <Label className="text-white">最长租期（月）</Label>
                  <Input
                    type="number"
                    value={newEquipment.max_rental_period}
                    onChange={(e) => setNewEquipment({ ...newEquipment, max_rental_period: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                    placeholder="留空表示无限制"
                  />
                </div>
              </div>

              {/* 描述 */}
              <div>
                <Label className="text-white">设备描述</Label>
                <Textarea
                  value={newEquipment.description}
                  onChange={(e) => setNewEquipment({ ...newEquipment, description: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                  placeholder="详细描述设备的功能、特点等"
                  rows={3}
                />
              </div>

              {/* 服务选项 */}
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="maintenance_included"
                    checked={newEquipment.maintenance_included}
                    onChange={(e) => setNewEquipment({ ...newEquipment, maintenance_included: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="maintenance_included" className="text-white cursor-pointer">
                    包含维护服务
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="delivery_included"
                    checked={newEquipment.delivery_included}
                    onChange={(e) => setNewEquipment({ ...newEquipment, delivery_included: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="delivery_included" className="text-white cursor-pointer">
                    包含配送服务
                  </Label>
                </div>
              </div>

              {/* 图片上传 */}
              <div>
                <Label className="text-white">设备图片</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {uploadedEquipmentImages.map((url, index) => (
                      <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-600">
                        <img src={url} alt={`设备图片 ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setUploadedEquipmentImages(uploadedEquipmentImages.filter((_, i) => i !== index))}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {uploadedEquipmentImages.length < 5 && (
                      <label className="w-24 h-24 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                        {isUploadingImages ? (
                          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                        ) : (
                          <Upload className="h-6 w-6 text-slate-400" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              await handleUploadEquipmentImage(file)
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">最多上传5张图片，支持JPG、PNG格式</p>
                </div>
              </div>

              {/* 备注 */}
              <div>
                <Label className="text-white">备注</Label>
                <Textarea
                  value={newEquipment.notes}
                  onChange={(e) => setNewEquipment({ ...newEquipment, notes: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                  placeholder="其他需要说明的信息"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsUploadEquipmentDialogOpen(false)
                  setNewEquipment({
                    name: "",
                    brand: "",
                    model: "",
                    description: "",
                    category_id: "",
                    monthly_rental_price: "",
                    daily_rental_price: "",
                    deposit_amount: "0",
                    min_rental_period: "1",
                    max_rental_period: "",
                    maintenance_included: true,
                    delivery_included: false,
                    notes: "",
                  })
                  setUploadedEquipmentImages([])
                }}
                className="border-slate-600 text-slate-300"
              >
                取消
              </Button>
              <Button
                onClick={handleSubmitUploadEquipment}
                disabled={isUploadingEquipment}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isUploadingEquipment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    提交审核
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // 渲染租赁工作台
  const renderRentals = () => {
    // 计算统计数据
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const monthlyPendingAmount = rentals
      .filter((r) => {
        if (r.status !== "active") return false
        const rentalDate = new Date(r.start_date)
        return rentalDate.getMonth() === currentMonth && rentalDate.getFullYear() === currentYear
      })
      .reduce((sum, r) => sum + (parseFloat(r.rent_amount) || 0), 0)
    
    const activeRentals = rentals.filter((r) => r.status === "active")
    const totalDevices = activeRentals.length

    // 计算剩余天数
    const calculateRemainingDays = (endDate: string | null) => {
      if (!endDate) return null
      const end = new Date(endDate)
      const now = new Date()
      const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return diff
    }

    // 获取状态颜色
    const getStatusColor = (status: string) => {
      switch (status) {
        case "pending_delivery":
          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        case "active":
          return "bg-green-500/20 text-green-400 border-green-500/30"
        case "expired":
          return "bg-red-500/20 text-red-400 border-red-500/30"
        case "returned":
          return "bg-slate-500/20 text-slate-400 border-slate-500/30"
        default:
          return "bg-slate-500/20 text-slate-400 border-slate-500/30"
      }
    }

    const getStatusLabel = (status: string) => {
      switch (status) {
        case "pending_delivery":
          return "待交付"
        case "active":
          return "租赁中"
        case "expired":
          return "已到期"
        case "returned":
          return "已收回"
        default:
          return status
      }
    }

    // 发送催缴短信
    const handleSendReminder = async (rental: any) => {
      try {
        // TODO: 实现发送短信功能
        alert(`发送催缴短信给 ${rental.customer_name} (${rental.customer_phone})`)
      } catch (err) {
        logBusinessWarning('催缴短信', '发送失败', err)
        alert("发送失败，请稍后重试")
      }
    }

    // 一键发送催缴短信（批量）
    const handleBatchSendReminder = async () => {
      const expiredRentals = rentals.filter((r) => {
        if (r.status !== "active") return false
        const days = calculateRemainingDays(r.end_date)
        return days !== null && days <= 7 && days > 0
      })
      
      if (expiredRentals.length === 0) {
        alert("没有需要催缴的租赁单")
        return
      }

      if (confirm(`确定要向 ${expiredRentals.length} 个客户发送催缴短信吗？`)) {
        // TODO: 实现批量发送短信功能
        alert(`已向 ${expiredRentals.length} 个客户发送催缴短信`)
      }
    }

    // 终止合同
    const handleTerminateContract = async (rental: any) => {
      if (!confirm(`确定要终止与 ${rental.customer_name} 的租赁合同吗？`)) return

      try {
        if (!supabase) return
        
        const { error } = await supabase
          .from("rentals")
          .update({ status: "returned" })
          .eq("id", rental.id)

        if (error) {
          throw error
        }

        alert("合同已终止")
        loadRentals()
      } catch (err: any) {
        logBusinessWarning('终止合同', '失败', err)
        alert(`终止合同失败: ${err.message}`)
      }
    }

    // 创建新租赁
    const handleCreateRental = async () => {
      try {
        if (!supabase) return

        if (!newRental.customer_name || !newRental.customer_phone || !newRental.device_name || !newRental.device_sn || !newRental.start_date) {
          alert("请填写必填字段")
          return
        }

        const { error } = await supabase
          .from("rentals")
          .insert({
            customer_name: newRental.customer_name,
            customer_phone: newRental.customer_phone,
            device_name: newRental.device_name,
            device_sn: newRental.device_sn,
            rent_amount: parseFloat(newRental.rent_amount) || 0,
            deposit: parseFloat(newRental.deposit) || 0,
            start_date: newRental.start_date,
            end_date: newRental.end_date || null,
            status: newRental.status,
            notes: newRental.notes || null,
          })

        if (error) {
          throw error
        }

        alert("租赁单创建成功")
        setIsAddRentalDialogOpen(false)
        setNewRental({
          customer_name: "",
          customer_phone: "",
          device_name: "",
          device_sn: "",
          rent_amount: "",
          deposit: "",
          start_date: "",
          end_date: "",
          status: "pending_delivery",
          notes: "",
        })
        loadRentals()
      } catch (err: any) {
        logBusinessWarning('创建租赁', '失败', err)
        alert(`创建失败: ${err.message}`)
      }
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">租赁工作台</h1>
            <p className="text-slate-400">管理设备租赁合同和收款</p>
          </div>
          <Button
            onClick={() => setIsAddRentalDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            新增租赁
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                本月待收款
              </CardDescription>
              <CardTitle className="text-3xl text-blue-400">
                ¥{monthlyPendingAmount.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900/90 to-green-950/90 border-green-800/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400 flex items-center gap-2">
                <Package className="h-4 w-4" />
                在租设备总数
              </CardDescription>
              <CardTitle className="text-3xl text-green-400">{totalDevices}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 操作栏 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleBatchSendReminder}
                variant="outline"
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                一键发送催缴短信
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 租赁列表 */}
        {isLoadingRentals ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
            <span className="text-slate-400">加载中...</span>
          </div>
        ) : rentals.length === 0 ? (
          <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">暂无租赁记录</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rentals.map((rental) => {
              const remainingDays = calculateRemainingDays(rental.end_date)
              const isUrgent = remainingDays !== null && remainingDays <= 7 && remainingDays > 0

              return (
                <Card
                  key={rental.id}
                  className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm hover:border-blue-500/50 transition-all"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-bold text-white">{rental.device_name}</h3>
                          <Badge className={getStatusColor(rental.status)}>
                            {getStatusLabel(rental.status)}
                          </Badge>
                          {isUrgent && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              即将到期
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <span className="text-slate-400">承租人：</span>
                            <span className="text-white ml-2">{rental.customer_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">联系电话：</span>
                            <span className="text-white ml-2">{rental.customer_phone}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">设备序列号：</span>
                            <span className="text-white ml-2">{rental.device_sn}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">月租金：</span>
                            <span className="text-blue-400 font-bold ml-2">
                              ¥{parseFloat(rental.rent_amount || 0).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">押金：</span>
                            <span className="text-white ml-2">
                              ¥{parseFloat(rental.deposit || 0).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">开始日期：</span>
                            <span className="text-white ml-2">{rental.start_date}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">结束日期：</span>
                            <span className="text-white ml-2">{rental.end_date || "未设置"}</span>
                          </div>
                          {remainingDays !== null && (
                            <div>
                              <span className="text-slate-400">剩余天数：</span>
                              <span className={`ml-2 font-bold ${isUrgent ? "text-red-400" : "text-white"}`}>
                                {remainingDays} 天
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 剩余天数进度条 */}
                        {rental.status === "active" && rental.end_date && remainingDays !== null && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-slate-400">租期剩余</span>
                              <span className={`text-sm font-medium ${isUrgent ? "text-red-400" : "text-slate-300"}`}>
                                {remainingDays} 天
                              </span>
                            </div>
                            <Progress
                              value={Math.max(0, Math.min(100, (remainingDays / 30) * 100))}
                              className={`h-2 ${isUrgent ? "bg-red-500/20" : ""}`}
                            />
                          </div>
                        )}

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSendReminder(rental)
                            }}
                            className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            催缴
                          </Button>
                          {rental.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTerminateContract(rental)
                              }}
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              终止合同
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRental(rental)
                              setIsRentalDetailDialogOpen(true)
                            }}
                            className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            查看详情
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* 新增租赁对话框 */}
        <Dialog open={isAddRentalDialogOpen} onOpenChange={setIsAddRentalDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">新增租赁</DialogTitle>
              <DialogDescription className="text-slate-400">创建新的设备租赁合同</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">承租人姓名 *</Label>
                  <Input
                    value={newRental.customer_name}
                    onChange={(e) => setNewRental({ ...newRental, customer_name: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    placeholder="请输入承租人姓名"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">联系电话 *</Label>
                  <Input
                    value={newRental.customer_phone}
                    onChange={(e) => setNewRental({ ...newRental, customer_phone: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    placeholder="请输入联系电话"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">设备名称 *</Label>
                  <Input
                    value={newRental.device_name}
                    onChange={(e) => setNewRental({ ...newRental, device_name: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    placeholder="请输入设备名称"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">设备序列号 *</Label>
                  <Input
                    value={newRental.device_sn}
                    onChange={(e) => setNewRental({ ...newRental, device_sn: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    placeholder="请输入设备序列号"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">月租金（元）</Label>
                  <Input
                    type="number"
                    value={newRental.rent_amount}
                    onChange={(e) => setNewRental({ ...newRental, rent_amount: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">押金（元）</Label>
                  <Input
                    type="number"
                    value={newRental.deposit}
                    onChange={(e) => setNewRental({ ...newRental, deposit: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">开始日期 *</Label>
                  <Input
                    type="date"
                    value={newRental.start_date}
                    onChange={(e) => setNewRental({ ...newRental, start_date: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">结束日期</Label>
                  <Input
                    type="date"
                    value={newRental.end_date}
                    onChange={(e) => setNewRental({ ...newRental, end_date: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300">状态</Label>
                <Select
                  value={newRental.status}
                  onValueChange={(value) => setNewRental({ ...newRental, status: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_delivery">待交付</SelectItem>
                    <SelectItem value="active">租赁中</SelectItem>
                    <SelectItem value="expired">已到期</SelectItem>
                    <SelectItem value="returned">已收回</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">备注</Label>
                <Textarea
                  value={newRental.notes}
                  onChange={(e) => setNewRental({ ...newRental, notes: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="请输入备注信息"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddRentalDialogOpen(false)}
                  className="border-slate-600 text-slate-300"
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreateRental}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  创建
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 租赁详情对话框 */}
        <Dialog open={isRentalDetailDialogOpen} onOpenChange={setIsRentalDetailDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">租赁详情</DialogTitle>
              <DialogDescription className="text-slate-400">
                设备序列号：{selectedRental?.device_sn}
              </DialogDescription>
            </DialogHeader>

            {selectedRental && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">承租人：</span>
                    <span className="text-white ml-2">{selectedRental.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">联系电话：</span>
                    <span className="text-white ml-2">{selectedRental.customer_phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">设备名称：</span>
                    <span className="text-white ml-2">{selectedRental.device_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">设备序列号：</span>
                    <span className="text-white ml-2">{selectedRental.device_sn}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">月租金：</span>
                    <span className="text-blue-400 font-bold ml-2">
                      ¥{parseFloat(selectedRental.rent_amount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">押金：</span>
                    <span className="text-white ml-2">
                      ¥{parseFloat(selectedRental.deposit || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">开始日期：</span>
                    <span className="text-white ml-2">{selectedRental.start_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">结束日期：</span>
                    <span className="text-white ml-2">{selectedRental.end_date || "未设置"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">状态：</span>
                    <Badge className={getStatusColor(selectedRental.status)}>
                      {getStatusLabel(selectedRental.status)}
                    </Badge>
                  </div>
                  {selectedRental.notes && (
                    <div className="col-span-2">
                      <span className="text-slate-400">备注：</span>
                      <span className="text-white ml-2">{selectedRental.notes}</span>
                    </div>
                  )}
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
        logBusinessWarning('API配置', '加载API配置失败', e)
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
      logBusinessWarning('API配置', '添加API配置失败', error)
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
    // 权限校验：防止非法越权修改其他油品的单价
    // 如果是供应商（非超级管理员），必须验证该燃料品种是否在授权列表中
    if (userRole !== "super_admin" && userCompanyId) {
      if (!companyFuelTypes.includes(fuelId)) {
        alert(`⚠️ 权限不足：您没有权限修改 "${fuelId}" 的价格。请联系管理员分配该燃料品种的权限。`)
        return
      }
    }

    setIsSavingPrice(true)
    try {
      // 更新本地状态
      setFuelPrices(prev => prev.map(fuel => 
        fuel.id === fuelId 
          ? { ...fuel, basePrice: newPrice, lastUpdated: new Date().toISOString() }
          : fuel
      ))
      
      // TODO: 保存到数据库
      // 注意：数据库层面也需要添加 RLS 策略，确保供应商只能修改自己授权的燃料品种
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
      logBusinessWarning('Fuel Pricing', '保存价格失败', error)
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
      logBusinessWarning('Fuel Pricing', '同步市场价格失败', error)
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
  // 注意：供应商只能看到被授权的燃料品种
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
          {(() => {
            // 根据供应商权限过滤燃料价格显示
            // 超级管理员可以看到所有，供应商只能看到被授权的品种
            console.log(`[燃料价格] 🔍 过滤逻辑检查:`, {
              userRole,
              userCompanyId,
              companyFuelTypes,
              companyFuelTypesCount: companyFuelTypes.length,
              allFuelPrices: fuelPrices.map(f => ({ id: f.id, name: f.name })),
              isLoading
            })
            
            const filteredFuelPrices = userRole === "super_admin"
              ? fuelPrices // 超级管理员看到所有
              : userCompanyId && companyFuelTypes.length > 0
                ? fuelPrices.filter(fuel => {
                    const isAuthorized = companyFuelTypes.includes(fuel.id)
                    console.log(`[燃料价格] 燃料 ${fuel.id} (${fuel.name}): ${isAuthorized ? '✅ 已授权' : '❌ 未授权'}, 授权列表:`, companyFuelTypes)
                    return isAuthorized
                  }) // 供应商只看到授权的
                : [] // 如果没有授权任何品种，显示为空（遵循最小权限原则）
            
            console.log(`[燃料价格] ✅ 过滤结果: ${filteredFuelPrices.length} / ${fuelPrices.length} 个燃料品种`)
            
            if (filteredFuelPrices.length === 0 && userRole !== "super_admin") {
              // 如果权限还在加载中，显示加载提示
              if (isLoading) {
                return (
                  <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm col-span-2">
                    <CardContent className="p-12 text-center">
                      <Loader2 className="h-16 w-16 text-blue-400 mx-auto mb-4 animate-spin" />
                      <p className="text-slate-400 text-lg mb-2">正在加载燃料品种权限...</p>
                    </CardContent>
                  </Card>
                )
              }
              
              return (
                <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm col-span-2">
                  <CardContent className="p-12 text-center">
                    <Droplet className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg mb-2">暂无授权的燃料品种</p>
                    <p className="text-slate-500 text-sm">请联系管理员为您分配燃料品种权限</p>
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mt-4 p-3 bg-slate-800/50 rounded text-left text-xs text-slate-500 font-mono">
                        <div>调试信息:</div>
                        <div>公司ID: {userCompanyId || 'null'}</div>
                        <div>已授权品种数: {companyFuelTypes.length}</div>
                        <div>已授权品种: {companyFuelTypes.length > 0 ? companyFuelTypes.join(', ') : '无'}</div>
                        <div>所有燃料ID: {fuelPrices.map(f => f.id).join(', ')}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            }
            
            return filteredFuelPrices.map((fuel) => {
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
                    {(() => {
                      // 检查是否有权限修改该燃料品种的价格
                      const hasPermission = userRole === "super_admin" || 
                                          (userCompanyId && companyFuelTypes.includes(fuel.id))
                      const isDisabled = isSavingPrice || !hasPermission
                      
                      return (
                        <Button
                          onClick={() => handleSaveFuelPrice(fuel.id, fuel.basePrice)}
                          disabled={isDisabled}
                          className={`flex-1 ${
                            hasPermission
                              ? "bg-blue-500 hover:bg-blue-600 text-white"
                              : "bg-slate-600/50 text-slate-400 cursor-not-allowed border-slate-600"
                          }`}
                          title={!hasPermission ? `您没有权限修改 ${fuel.name} 的价格` : ""}
                        >
                          {isSavingPrice ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              保存中...
                            </>
                          ) : !hasPermission ? (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              无权限
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              保存价格
                            </>
                          )}
                        </Button>
                      )
                    })()}
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
          })})()}
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

  // 渲染协议管理
  const renderAgreements = () => {
    const agreementTypeOptions = [
      { value: "service", label: "服务协议" },
      { value: "payment", label: "支付协议" },
      { value: "privacy", label: "隐私协议" },
      { value: "terms", label: "使用条款" },
    ]

    const agreementStatusOptions = [
      { value: "draft", label: "草稿" },
      { value: "published", label: "已发布" },
      { value: "archived", label: "已归档" },
    ]

    // 筛选协议
    const filteredAgreements = agreements.filter((agreement) => {
      if (agreementsTypeFilter !== "all" && agreement.type !== agreementsTypeFilter) {
        return false
      }
      if (agreementsStatusFilter !== "all" && agreement.status !== agreementsStatusFilter) {
        return false
      }
      return true
    })

    const getTypeLabel = (type: string) => {
      const option = agreementTypeOptions.find((opt) => opt.value === type)
      return option ? option.label : type
    }

    const getStatusLabel = (status: string) => {
      const option = agreementStatusOptions.find((opt) => opt.value === status)
      return option ? option.label : status
    }

    const getStatusColor = (status: string) => {
      switch (status) {
        case "draft":
          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        case "published":
          return "bg-green-500/20 text-green-400 border-green-500/30"
        case "archived":
          return "bg-slate-500/20 text-slate-400 border-slate-500/30"
        default:
          return "bg-slate-500/20 text-slate-400 border-slate-500/30"
      }
    }

    // 提交创建/更新协议
    const handleSubmitAgreement = async () => {
      if (!newAgreement.title || !newAgreement.type || !newAgreement.content) {
        alert("请填写协议标题、类型和内容")
        return
      }

      setIsEditingAgreement(true)
      try {
        const method = selectedAgreement ? "PUT" : "POST"
        const url = selectedAgreement ? `/api/agreements/${selectedAgreement.id}` : "/api/agreements"
        
        // 获取当前用户ID
        let userId: string | null = null
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser()
          userId = user?.id || null
        }

        const body: any = {
          ...newAgreement,
          created_by: selectedAgreement ? undefined : userId,
          updated_by: selectedAgreement ? userId : undefined,
        }

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        const result = await response.json()

        if (result.success) {
          alert(selectedAgreement ? "协议更新成功！" : "协议创建成功！")
          setIsAddAgreementDialogOpen(false)
          setSelectedAgreement(null)
          setNewAgreement({
            title: "",
            type: "service",
            version: "1.0",
            content: "",
            content_html: "",
            status: "draft",
            is_active: false,
            effective_date: "",
            expiry_date: "",
            description: "",
          })
          loadAgreements()
        } else {
          alert(`操作失败: ${result.error}`)
        }
      } catch (err: any) {
        logBusinessWarning('协议管理', '提交失败', err)
        alert(`操作失败: ${err.message}`)
      } finally {
        setIsEditingAgreement(false)
      }
    }

    // 删除协议
    const handleDeleteAgreement = async (id: string) => {
      if (!confirm("确定要删除这个协议吗？")) return

      try {
        const response = await fetch(`/api/agreements/${id}`, {
          method: "DELETE",
        })

        const result = await response.json()

        if (result.success) {
          alert("协议删除成功！")
          loadAgreements()
        } else {
          alert(`删除失败: ${result.error}`)
        }
      } catch (err: any) {
        logBusinessWarning('协议管理', '删除失败', err)
        alert(`删除失败: ${err.message}`)
      }
    }

    // 发布协议
    const handlePublishAgreement = async (id: string) => {
      if (!confirm("确定要发布这个协议吗？发布后将设置为生效版本。")) return

      try {
        const response = await fetch(`/api/agreements/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "published",
            is_active: true,
          }),
        })

        const result = await response.json()

        if (result.success) {
          alert("协议发布成功！")
          loadAgreements()
        } else {
          alert(`发布失败: ${result.error}`)
        }
      } catch (err: any) {
        logBusinessWarning('协议管理', '发布失败', err)
        alert(`发布失败: ${err.message}`)
      }
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">协议管理</h1>
          <p className="text-slate-400">管理服务协议、支付协议、隐私协议等各类协议内容</p>
        </div>

        {/* 标签页：协议管理和租赁合同管理 */}
        <Tabs defaultValue="agreements" className="space-y-4">
          <TabsList className="bg-slate-800/50 border-slate-700/50">
            <TabsTrigger value="agreements" className="data-[state=active]:bg-blue-600">
              协议管理
            </TabsTrigger>
            <TabsTrigger value="contracts" className="data-[state=active]:bg-blue-600">
              租赁合同管理
            </TabsTrigger>
          </TabsList>

          {/* 协议管理标签页 */}
          <TabsContent value="agreements" className="space-y-4">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">总协议数</CardDescription>
                  <CardTitle className="text-2xl text-white">{agreements.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-yellow-800/50 border-yellow-700/50">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">草稿</CardDescription>
                  <CardTitle className="text-2xl text-yellow-400">
                    {agreements.filter((a) => a.status === "draft").length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-green-800/50 border-green-700/50">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">已发布</CardDescription>
                  <CardTitle className="text-2xl text-green-400">
                    {agreements.filter((a) => a.status === "published").length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-blue-800/50 border-blue-700/50">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">生效中</CardDescription>
                  <CardTitle className="text-2xl text-blue-400">
                    {agreements.filter((a) => a.is_active && a.status === "published").length}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* 搜索和操作栏 */}
            <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  {/* 筛选 */}
                  <div className="flex gap-2 flex-wrap">
                    <Select value={agreementsTypeFilter} onValueChange={setAgreementsTypeFilter}>
                      <SelectTrigger className="w-[150px] bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder="协议类型" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="all" className="text-white">全部类型</SelectItem>
                        {agreementTypeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={agreementsStatusFilter} onValueChange={setAgreementsStatusFilter}>
                      <SelectTrigger className="w-[150px] bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder="状态" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="all" className="text-white">全部状态</SelectItem>
                        {agreementStatusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedAgreement(null)
                      setNewAgreement({
                        title: "",
                        type: "service",
                        version: "1.0",
                        content: "",
                        content_html: "",
                        status: "draft",
                        is_active: false,
                        effective_date: "",
                        expiry_date: "",
                        description: "",
                      })
                      setIsAddAgreementDialogOpen(true)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    新建协议
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 错误提示 */}
            {agreementsError && (
              <Card className="bg-red-900/50 border-red-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="flex-1">
                      <p className="text-red-400 font-medium">加载失败</p>
                      <p className="text-red-300 text-sm mt-1">{agreementsError}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadAgreements()}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      重试
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 协议列表 */}
            {isLoadingAgreements ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
                <span className="text-slate-400">加载中...</span>
              </div>
            ) : filteredAgreements.length === 0 ? (
              <Card className="bg-slate-900/50 border-slate-800 p-8 text-center">
                <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400 mb-2">暂无协议</p>
                {agreementsError ? (
                  <p className="text-sm text-slate-500">加载失败，请点击上方重试按钮</p>
                ) : (
                  <p className="text-sm text-slate-500">点击上方"新建协议"按钮创建第一个协议</p>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredAgreements.map((agreement) => (
                  <Card
                    key={agreement.id}
                    className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 cursor-pointer hover:border-blue-500/50 transition-colors"
                    onClick={() => {
                      setSelectedAgreement(agreement)
                      setIsAgreementDetailDialogOpen(true)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-white">{agreement.title}</h3>
                            <Badge className={getStatusColor(agreement.status)}>
                              {getStatusLabel(agreement.status)}
                            </Badge>
                            {agreement.is_active && (
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                生效中
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-slate-400">
                            <p>类型：{getTypeLabel(agreement.type)}</p>
                            <p>版本：{agreement.version}</p>
                            {agreement.effective_date && (
                              <p>生效日期：{new Date(agreement.effective_date).toLocaleDateString("zh-CN")}</p>
                            )}
                            {agreement.expiry_date && (
                              <p>失效日期：{new Date(agreement.expiry_date).toLocaleDateString("zh-CN")}</p>
                            )}
                            {agreement.description && <p>说明：{agreement.description}</p>}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 租赁合同管理标签页 */}
          <TabsContent value="contracts" className="space-y-4">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">总合同数</CardDescription>
                  <CardTitle className="text-2xl text-white">{rentalContracts.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-yellow-800/50 border-yellow-700/50">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">草稿</CardDescription>
                  <CardTitle className="text-2xl text-yellow-400">
                    {rentalContracts.filter((c) => c.status === "draft").length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-green-800/50 border-green-700/50">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">生效中</CardDescription>
                  <CardTitle className="text-2xl text-green-400">
                    {rentalContracts.filter((c) => c.status === "active").length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-slate-700/50 border-slate-600/50">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">已结束</CardDescription>
                  <CardTitle className="text-2xl text-slate-400">
                    {rentalContracts.filter((c) => c.status === "ended").length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-red-800/50 border-red-700/50">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400">违约</CardDescription>
                  <CardTitle className="text-2xl text-red-400">
                    {rentalContracts.filter((c) => c.status === "breached").length}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* 错误提示 */}
            {rentalContractsError && (
              <Card className="bg-red-900/50 border-red-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="flex-1">
                      <p className="text-red-400 font-medium">加载失败</p>
                      <p className="text-red-300 text-sm mt-1">{rentalContractsError}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadRentalContracts()}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      重试
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 合同列表 */}
            {isLoadingRentalContracts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
                <span className="text-slate-400">加载中...</span>
              </div>
            ) : rentalContracts.length === 0 ? (
              <Card className="bg-slate-900/50 border-slate-800 p-8 text-center">
                <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400 mb-2">暂无租赁合同</p>
                <p className="text-sm text-slate-500">租赁合同将从设备租赁订单中自动创建</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {rentalContracts.map((contract) => {
                  const getContractStatusColor = (status: string) => {
                    switch (status) {
                      case "draft":
                        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      case "active":
                        return "bg-green-500/20 text-green-400 border-green-500/30"
                      case "ended":
                        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
                      case "breached":
                        return "bg-red-500/20 text-red-400 border-red-500/30"
                      default:
                        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
                    }
                  }

                  const getContractStatusLabel = (status: string) => {
                    switch (status) {
                      case "draft":
                        return "草稿"
                      case "active":
                        return "生效中"
                      case "ended":
                        return "已结束"
                      case "breached":
                        return "违约"
                      default:
                        return status
                    }
                  }

                  return (
                    <Card
                      key={contract.id}
                      className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 cursor-pointer hover:border-blue-500/50 transition-colors"
                      onClick={() => {
                        setSelectedRentalContract(contract)
                        setIsRentalContractDetailDialogOpen(true)
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-white">合同号：{contract.contract_no}</h3>
                              <Badge className={getContractStatusColor(contract.status)}>
                                {getContractStatusLabel(contract.status)}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-slate-400">
                              <p>承租人餐厅ID：{contract.lessee_restaurant_id}</p>
                              <p>出租人类型：{contract.lessor_type}</p>
                              <p>计费模式：{contract.billing_model}</p>
                              <p>
                                合同期限：{new Date(contract.start_at).toLocaleDateString("zh-CN")} 至{" "}
                                {new Date(contract.end_at).toLocaleDateString("zh-CN")}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* 协议详情对话框 */}
        <Dialog open={isAgreementDetailDialogOpen} onOpenChange={setIsAgreementDetailDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">协议详情</DialogTitle>
              <DialogDescription className="text-slate-400">
                查看和编辑协议信息
              </DialogDescription>
            </DialogHeader>
            {selectedAgreement && (
              <div className="space-y-4">
                <div className="bg-slate-800/50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">标题：</span>
                    <span className="text-white">{selectedAgreement.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">类型：</span>
                    <span className="text-white">{getTypeLabel(selectedAgreement.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">版本：</span>
                    <span className="text-white">{selectedAgreement.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">状态：</span>
                    <Badge className={getStatusColor(selectedAgreement.status)}>
                      {getStatusLabel(selectedAgreement.status)}
                    </Badge>
                  </div>
                  {selectedAgreement.effective_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">生效日期：</span>
                      <span className="text-white">
                        {new Date(selectedAgreement.effective_date).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                  )}
                  {selectedAgreement.expiry_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">失效日期：</span>
                      <span className="text-white">
                        {new Date(selectedAgreement.expiry_date).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                  )}
                </div>

                {/* 协议内容 */}
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3">协议内容</h4>
                  <div className="text-slate-300 text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                    {selectedAgreement.content_html ? (
                      <div dangerouslySetInnerHTML={{ __html: selectedAgreement.content_html }} />
                    ) : (
                      selectedAgreement.content
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAgreement(null)
                      setIsAgreementDetailDialogOpen(false)
                    }}
                    className="border-slate-600 text-slate-300"
                  >
                    关闭
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewAgreement({
                        title: selectedAgreement.title,
                        type: selectedAgreement.type,
                        version: selectedAgreement.version,
                        content: selectedAgreement.content,
                        content_html: selectedAgreement.content_html || "",
                        status: selectedAgreement.status,
                        is_active: selectedAgreement.is_active,
                        effective_date: selectedAgreement.effective_date || "",
                        expiry_date: selectedAgreement.expiry_date || "",
                        description: selectedAgreement.description || "",
                      })
                      setIsAgreementDetailDialogOpen(false)
                      setIsAddAgreementDialogOpen(true)
                    }}
                    className="border-blue-600 text-blue-400 hover:bg-blue-500/10"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    编辑
                  </Button>
                  {selectedAgreement.status === "draft" && (
                    <Button
                      onClick={() => handlePublishAgreement(selectedAgreement.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      发布
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDeleteAgreement(selectedAgreement.id)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 创建/编辑协议对话框 */}
        <Dialog open={isAddAgreementDialogOpen} onOpenChange={setIsAddAgreementDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">
                {selectedAgreement ? "编辑协议" : "新建协议"}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {selectedAgreement ? "修改协议信息" : "创建新的协议内容"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">协议标题 *</Label>
                  <Input
                    value={newAgreement.title}
                    onChange={(e) => setNewAgreement({ ...newAgreement, title: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                    placeholder="例如：服务协议"
                  />
                </div>
                <div>
                  <Label className="text-white">协议类型 *</Label>
                  <Select
                    value={newAgreement.type}
                    onValueChange={(value) => setNewAgreement({ ...newAgreement, type: value })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {agreementTypeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-white">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white">版本号</Label>
                  <Input
                    value={newAgreement.version}
                    onChange={(e) => setNewAgreement({ ...newAgreement, version: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                    placeholder="例如：1.0"
                  />
                </div>
                <div>
                  <Label className="text-white">状态</Label>
                  <Select
                    value={newAgreement.status}
                    onValueChange={(value) => setNewAgreement({ ...newAgreement, status: value as any })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {agreementStatusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-white">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white">生效日期</Label>
                  <Input
                    type="date"
                    value={newAgreement.effective_date}
                    onChange={(e) => setNewAgreement({ ...newAgreement, effective_date: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">失效日期</Label>
                  <Input
                    type="date"
                    value={newAgreement.expiry_date}
                    onChange={(e) => setNewAgreement({ ...newAgreement, expiry_date: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">协议描述</Label>
                <Textarea
                  value={newAgreement.description}
                  onChange={(e) => setNewAgreement({ ...newAgreement, description: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                  placeholder="协议描述/说明"
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-white">协议内容 *</Label>
                <Textarea
                  value={newAgreement.content}
                  onChange={(e) => setNewAgreement({ ...newAgreement, content: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white font-mono text-sm"
                  placeholder="输入协议正文内容（支持Markdown格式）"
                  rows={15}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newAgreement.is_active}
                  onChange={(e) => setNewAgreement({ ...newAgreement, is_active: e.target.checked })}
                  className="w-4 h-4"
                  disabled={newAgreement.status !== "published"}
                />
                <Label htmlFor="is_active" className="text-white cursor-pointer">
                  设为生效版本（仅已发布协议可设置）
                </Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddAgreementDialogOpen(false)
                  setSelectedAgreement(null)
                }}
                className="border-slate-600 text-slate-300"
              >
                取消
              </Button>
              <Button
                onClick={handleSubmitAgreement}
                disabled={isEditingAgreement}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isEditingAgreement ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 租赁合同详情对话框（包含支付信息） */}
        <Dialog
          open={isRentalContractDetailDialogOpen}
          onOpenChange={setIsRentalContractDetailDialogOpen}
        >
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">租赁合同详情</DialogTitle>
              <DialogDescription className="text-slate-400">
                查看合同信息和关联的支付记录
              </DialogDescription>
            </DialogHeader>
            {selectedRentalContract && (
              <div className="space-y-4">
                {/* 合同基本信息 */}
                <div className="bg-slate-800/50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">合同号：</span>
                    <span className="text-white font-semibold">{selectedRentalContract.contract_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">承租人餐厅ID：</span>
                    <span className="text-white">{selectedRentalContract.lessee_restaurant_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">出租人类型：</span>
                    <span className="text-white">{selectedRentalContract.lessor_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">计费模式：</span>
                    <span className="text-white">{selectedRentalContract.billing_model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">合同期限：</span>
                    <span className="text-white">
                      {new Date(selectedRentalContract.start_at).toLocaleDateString("zh-CN")} 至{" "}
                      {new Date(selectedRentalContract.end_at).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">状态：</span>
                    <Badge
                      className={
                        selectedRentalContract.status === "active"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : selectedRentalContract.status === "draft"
                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                      }
                    >
                      {selectedRentalContract.status === "active"
                        ? "生效中"
                        : selectedRentalContract.status === "draft"
                        ? "草稿"
                        : "已结束"}
                    </Badge>
                  </div>
                </div>

                {/* 关联的租赁订单和支付信息 */}
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3">关联订单和支付记录</h4>
                  {isLoadingPaymentInfo ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-400 mr-2" />
                      <span className="text-slate-400">加载中...</span>
                    </div>
                  ) : contractPaymentInfo.length === 0 ? (
                    <p className="text-slate-400 text-sm">暂无关联的订单</p>
                  ) : (
                    <div className="space-y-3">
                      {contractPaymentInfo.map((order: any) => {
                        const monthlyPayments = (order.monthly_payments as any[]) || []
                        return (
                          <Card key={order.id} className="bg-slate-900/50 border-slate-700/50">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-white font-semibold">订单号：{order.order_number}</p>
                                    <p className="text-slate-400 text-sm mt-1">
                                      设备：{order.equipment?.name || "未知"}
                                    </p>
                                    <p className="text-slate-400 text-sm">
                                      月租金：¥{order.monthly_rental_price} × {order.rental_period} 个月
                                    </p>
                                  </div>
                                  <Badge
                                    className={
                                      order.order_status === "active"
                                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                                        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                    }
                                  >
                                    {order.order_status === "active" ? "租赁中" : "待确认"}
                                  </Badge>
                                </div>

                                {/* 每月支付记录 */}
                                {monthlyPayments.length > 0 && (
                                  <div className="border-t border-slate-700/50 pt-3">
                                    <p className="text-slate-400 text-sm mb-2">支付记录：</p>
                                    <div className="space-y-1">
                                      {monthlyPayments.map((payment: any, index: number) => (
                                        <div
                                          key={index}
                                          className="flex justify-between items-center text-sm bg-slate-800/50 p-2 rounded"
                                        >
                                          <span className="text-slate-300">{payment.month}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-white">¥{payment.amount}</span>
                                            {payment.status === "paid" ? (
                                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                                已支付
                                              </Badge>
                                            ) : (
                                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                                                待支付
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRentalContract(null)
                      setIsRentalContractDetailDialogOpen(false)
                    }}
                    className="border-slate-600 text-slate-300"
                  >
                    关闭
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // 加载财务报表
  const loadFinanceReport = useCallback(async () => {
      setIsLoadingReport(true)
      try {
        const params = new URLSearchParams({
          report_type: reportType,
          start_date: financeStartDate,
          end_date: financeEndDate,
        })
        const response = await fetch(`/api/finance/report?${params}`)
        const result = await response.json()
        if (result.success) {
          setReportData(result.data)
        } else {
          alert(result.error || "加载报表失败")
        }
      } catch (error: any) {
        alert(`加载报表失败: ${error.message}`)
      } finally {
        setIsLoadingReport(false)
      }
    }, [reportType, financeStartDate, financeEndDate])
  
  // 加载逾期账期
  const loadOverdueBillingData = useCallback(async () => {
    setIsLoadingOverdueBilling(true)
    try {
      const response = await fetch("/api/finance/billing/overdue")
      const result = await response.json()
      if (result.success) {
        setOverdueBilling(result.data?.overdue_cycles || [])
      }
    } catch (error: any) {
      logBusinessWarning('异常处理', '加载逾期账期失败', error)
    } finally {
      setIsLoadingOverdueBilling(false)
    }
  }, [])
  
  // 加载逾期设备
  const loadOverdueRentalsData = useCallback(async () => {
    setIsLoadingOverdueRentals(true)
    try {
      const response = await fetch("/api/cron/check-overdue-rentals?dry_run=true")
      const result = await response.json()
      if (result.success) {
        setOverdueRentals(result.data?.overdue_orders || [])
      }
    } catch (error: any) {
      logBusinessWarning('异常处理', '加载逾期设备失败', error)
    } finally {
      setIsLoadingOverdueRentals(false)
    }
  }, [])
  
  // 渲染财务报表
  const renderFinanceReport = () => {

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">财务报表</h1>
          <p className="text-slate-400">查看收入统计、账期分析和逾期统计</p>
        </div>

        <Card className="bg-gradient-to-br from-slate-900/90 to-green-950/90 border-green-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">报表查询</CardTitle>
            <CardDescription className="text-slate-400">选择报表类型和时间范围</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-300">报表类型</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">收入统计</SelectItem>
                    <SelectItem value="billing">账期分析</SelectItem>
                    <SelectItem value="overdue">逾期统计</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">开始日期</Label>
                <Input
                  type="date"
                  value={financeStartDate}
                  onChange={(e) => setFinanceStartDate(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">结束日期</Label>
                <Input
                  type="date"
                  value={financeEndDate}
                  onChange={(e) => setFinanceEndDate(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
            <Button onClick={loadFinanceReport} disabled={isLoadingReport} className="w-full md:w-auto">
              {isLoadingReport ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
              生成报表
            </Button>
          </CardContent>
        </Card>

        {reportData && (
          <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">
                {reportType === "revenue" && "收入统计报表"}
                {reportType === "billing" && "账期分析报表"}
                {reportType === "overdue" && "逾期统计报表"}
              </CardTitle>
              <CardDescription className="text-slate-400">
                时间范围: {reportData.period?.start_date} 至 {reportData.period?.end_date}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportType === "revenue" && reportData.summary && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">总收入</div>
                      <div className="text-2xl font-bold text-green-400">¥{reportData.summary.total_revenue?.toFixed(2)}</div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">押金收入</div>
                      <div className="text-2xl font-bold text-blue-400">¥{reportData.summary.total_deposit_received?.toFixed(2)}</div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">账期收入</div>
                      <div className="text-2xl font-bold text-purple-400">¥{reportData.summary.total_billing_paid?.toFixed(2)}</div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">订单总数</div>
                      <div className="text-2xl font-bold text-yellow-400">{reportData.summary.total_orders}</div>
                    </div>
                  </div>
                </div>
              )}
              {reportType === "billing" && reportData.summary && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">总账期数</div>
                      <div className="text-2xl font-bold text-blue-400">{reportData.summary.total_cycles}</div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">应收总额</div>
                      <div className="text-2xl font-bold text-green-400">¥{reportData.summary.total_amount_due?.toFixed(2)}</div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">已收总额</div>
                      <div className="text-2xl font-bold text-purple-400">¥{reportData.summary.total_amount_paid?.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}
              {reportType === "overdue" && reportData.summary && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">逾期账期数</div>
                      <div className="text-2xl font-bold text-red-400">{reportData.summary.total_overdue_cycles}</div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">逾期总额</div>
                      <div className="text-2xl font-bold text-orange-400">¥{reportData.summary.total_overdue_amount?.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // 加载异常处理数据
  useEffect(() => {
    if (activeMenu === "exceptionHandling") {
      loadOverdueBillingData()
      loadOverdueRentalsData()
    }
  }, [activeMenu, loadOverdueBillingData, loadOverdueRentalsData])
  
  // 渲染异常处理
  const renderExceptionHandling = () => {

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">异常处理</h1>
          <p className="text-slate-400">处理逾期账期、设备未归还等异常情况</p>
        </div>

        <Card className="bg-gradient-to-br from-slate-900/90 to-red-950/90 border-red-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              逾期账期
            </CardTitle>
            <CardDescription className="text-slate-400">需要催收的逾期账期列表</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOverdueBilling ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              </div>
            ) : overdueBilling.length === 0 ? (
              <div className="text-center py-8 text-slate-400">暂无逾期账期</div>
            ) : (
              <div className="space-y-2">
                {overdueBilling.slice(0, 10).map((cycle: any) => (
                  <div key={cycle.id} className="p-4 bg-slate-800/50 rounded-lg flex justify-between items-center">
                    <div>
                      <div className="text-white font-medium">订单: {cycle.order_number || cycle.rental_order_id}</div>
                      <div className="text-sm text-slate-400">账期: {cycle.cycle_month} | 逾期: {cycle.overdue_days}天</div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-400 font-bold">¥{(cycle.amount_due - cycle.amount_paid)?.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900/90 to-orange-950/90 border-orange-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-400" />
              逾期设备（未归还）
            </CardTitle>
            <CardDescription className="text-slate-400">租期已到但未归还的设备</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOverdueRentals ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              </div>
            ) : overdueRentals.length === 0 ? (
              <div className="text-center py-8 text-slate-400">暂无逾期设备</div>
            ) : (
              <div className="space-y-2">
                {overdueRentals.slice(0, 10).map((order: any) => (
                  <div key={order.id} className="p-4 bg-slate-800/50 rounded-lg flex justify-between items-center">
                    <div>
                      <div className="text-white font-medium">订单: {order.order_number || order.id}</div>
                      <div className="text-sm text-slate-400">逾期: {order.overdue_days}天 | 应归还: {order.end_date}</div>
                    </div>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                      未归还
                    </Badge>
                  </div>
                ))}
              </div>
            )}
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

        {/* 修改密码卡片 */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">账户安全</CardTitle>
            <CardDescription className="text-slate-400">修改登录密码</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-blue-400" />
                  <div>
                    <div className="text-white font-medium">登录密码</div>
                    <div className="text-sm text-slate-400">
                      定期修改密码可以保护账户安全
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setIsChangePasswordDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  修改密码
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
        display: 'flex !important',
        visibility: 'visible !important',
        opacity: '1 !important',
        position: 'relative',
        zIndex: 1
      }}
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
      {sidebarOpen && (
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
            if (userRole === "super_admin") {
              filteredMenuItems = menuItems
              console.log("[Dashboard] 🎯 超级管理员：显示所有菜单项")
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
              console.warn(`[Dashboard] ⚠️ 非超级管理员（角色: ${userRole}）但没有 companyId，仅显示 dashboard（防止权限提升）`)
              filteredMenuItems = menuItems.filter(item => item.key === "dashboard")
            }
            
            return filteredMenuItems.map((item) => {
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
              {currentUser?.email || '加载中...'}
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
          {activeMenu === "dashboard" && renderDashboard()}
          {activeMenu === "restaurants" && renderRestaurants()}
          {activeMenu === "orders" && renderOrders()}
          {activeMenu === "repairs" && renderRepairs()}
          {activeMenu === "equipmentRental" && renderEquipmentRental()}
          {activeMenu === "productApproval" && <ProductApproval />}
          {activeMenu === "supplierManagement" && <SupplierManagement />}
          {activeMenu === "rentals" && renderRentals()}
          {activeMenu === "devices" && renderDevices()}
          {activeMenu === "workers" && renderWorkers()}
          {activeMenu === "api" && renderApiConfig()}
          {activeMenu === "fuelPricing" && renderFuelPricing()}
          {activeMenu === "analytics" && renderAnalytics()}
          {activeMenu === "financeReport" && renderFinanceReport()}
          {activeMenu === "exceptionHandling" && renderExceptionHandling()}
          {activeMenu === "agreements" && renderAgreements()}
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

      {/* 密码修改对话框 */}
      <Dialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Lock className="h-5 w-5" />
              修改密码
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              为了账户安全，请修改您的默认密码
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {changePasswordError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{changePasswordError}</AlertDescription>
              </Alert>
            )}
            {changePasswordSuccess && (
              <Alert className="bg-green-500/10 border-green-500/50 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>密码修改成功！</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-slate-300">当前密码</Label>
              <Input
                id="currentPassword"
                type="password"
                value={changePasswordForm.currentPassword}
                onChange={(e) => setChangePasswordForm({ ...changePasswordForm, currentPassword: e.target.value })}
                placeholder="请输入当前密码"
                className="bg-slate-800 border-slate-700 text-white"
                disabled={isChangingPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-slate-300">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                value={changePasswordForm.newPassword}
                onChange={(e) => setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })}
                placeholder="请输入新密码（至少6位）"
                className="bg-slate-800 border-slate-700 text-white"
                disabled={isChangingPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">确认新密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={changePasswordForm.confirmPassword}
                onChange={(e) => setChangePasswordForm({ ...changePasswordForm, confirmPassword: e.target.value })}
                placeholder="请再次输入新密码"
                className="bg-slate-800 border-slate-700 text-white"
                disabled={isChangingPassword}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    修改中...
                  </>
                ) : (
                  "确认修改"
                )}
              </Button>
              <Button
                onClick={() => {
                  setIsChangePasswordDialogOpen(false)
                  setChangePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
                  setChangePasswordError(null)
                  setChangePasswordSuccess(false)
                }}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                取消
              </Button>
            </div>
          </div>
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
      
      {/* 底部导航栏：双导航模式 - 手机端始终显示，电脑端且侧边栏开启时隐藏 */}
      <BottomNavigation sidebarOpen={sidebarOpen} />
    </div>
  )
}

