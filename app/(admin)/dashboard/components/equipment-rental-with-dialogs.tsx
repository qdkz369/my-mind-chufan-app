// 设备租赁管理：面板 + 5 个对话框（从 page.tsx renderEquipmentRental 提取）
// 对话框：租赁订单详情、押金退款、创建设备租赁、设备租赁详情、上传设备

"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import { DollarSign, CheckCircle2, Loader2, Upload, X, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"
import { logBusinessWarning } from "@/lib/utils/logger"
import {
  EquipmentRentalPanel,
  getStatusColor,
  getStatusLabel,
  getPaymentStatusColor,
  getPaymentStatusLabel,
} from "./equipment-rental"

export interface EquipmentRentalWithDialogsProps {
  userCompanyId?: string | null
  userRole?: string | null
}

const initialNewDeviceRental = {
  restaurant_id: "",
  start_at: new Date().toISOString().slice(0, 16),
  devices: [{ equipment_catalog_id: "", unit_price: 0 }],
}

const initialNewEquipment = {
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
}

const initialNewRentalOrder = {
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
}

export function EquipmentRentalWithDialogs({ userCompanyId, userRole }: EquipmentRentalWithDialogsProps) {
  // 租赁订单
  const [rentalOrders, setRentalOrders] = useState<any[]>([])
  const [isLoadingRentalOrders, setIsLoadingRentalOrders] = useState(false)
  const [rentalOrderError, setRentalOrderError] = useState<string | null>(null)
  const [rentalOrderStatusFilter, setRentalOrderStatusFilter] = useState<string>("all")
  const [rentalOrderSearchQuery, setRentalOrderSearchQuery] = useState<string>("")
  const [selectedRentalOrderIds, setSelectedRentalOrderIds] = useState<string[]>([])
  const [selectedRentalOrder, setSelectedRentalOrder] = useState<any | null>(null)
  const [isRentalOrderDetailDialogOpen, setIsRentalOrderDetailDialogOpen] = useState(false)
  const [isAddRentalOrderDialogOpen, setIsAddRentalOrderDialogOpen] = useState(false)
  const [isUpdatingRentalOrder, setIsUpdatingRentalOrder] = useState(false)
  const [newRentalOrder, setNewRentalOrder] = useState(initialNewRentalOrder)
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false)
  const [refundReason, setRefundReason] = useState("")
  const [refundProof, setRefundProof] = useState("")
  const [isProcessingRefund, setIsProcessingRefund] = useState(false)

  // 设备租赁基础
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
  const [newDeviceRental, setNewDeviceRental] = useState<{
    restaurant_id: string
    start_at: string
    devices: { equipment_catalog_id: string; unit_price: number }[]
  }>(initialNewDeviceRental)
  const [availableEquipmentCatalog, setAvailableEquipmentCatalog] = useState<Array<{ id: string; name: string; model: string | null; brand: string | null }>>([])
  const [availableRestaurants, setAvailableRestaurants] = useState<any[]>([])

  // 上传设备
  const [isUploadEquipmentDialogOpen, setIsUploadEquipmentDialogOpen] = useState(false)
  const [isUploadingEquipment, setIsUploadingEquipment] = useState(false)
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [uploadedEquipmentImages, setUploadedEquipmentImages] = useState<string[]>([])
  const [uploadedEquipmentVideo, setUploadedEquipmentVideo] = useState<string | null>(null)
  const [equipmentCategories, setEquipmentCategories] = useState<any[]>([])
  const [newEquipment, setNewEquipment] = useState(initialNewEquipment)

  // 用于新增订单（若将来加对话框）
  const [equipmentList, setEquipmentList] = useState<any[]>([])
  const [restaurantList, setRestaurantList] = useState<any[]>([])
  const [companyList, setCompanyList] = useState<any[]>([])

  const loadRentalOrders = useCallback(async () => {
    if (userRole !== null && userRole !== "super_admin" && userRole !== "admin" && !userCompanyId) {
      setRentalOrders([])
      setIsLoadingRentalOrders(false)
      return
    }
    setIsLoadingRentalOrders(true)
    setRentalOrderError(null)
    try {
      const params = new URLSearchParams()
      if (rentalOrderStatusFilter && rentalOrderStatusFilter !== "all") params.append("status", rentalOrderStatusFilter)
      const headers: HeadersInit = {}
      if (supabase) {
        let { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          const { data: { session: refreshed } } = await supabase.auth.refreshSession()
          session = refreshed
        }
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
      }
      const response = await fetchWithAuth(`/api/equipment/rental/admin/list?${params.toString()}`, { credentials: "include", headers })
      const result = await response.json()
      if (response.status === 401 && supabase) {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession()
        if (refreshed?.access_token) {
          const retryHeaders: HeadersInit = { ...headers, Authorization: `Bearer ${refreshed.access_token}` }
          const retryRes = await fetchWithAuth(`/api/equipment/rental/admin/list?${params.toString()}`, { credentials: "include", headers: retryHeaders })
          const retryResult = await retryRes.json()
          if (retryResult.success) {
            setRentalOrders(retryResult.data || [])
            setRentalOrderError(null)
            return
          }
        }
      }
      if (result.success) {
        setRentalOrders(result.data || [])
        setRentalOrderError(null)
      } else {
        const errorMsg = result.error || "获取租赁订单列表失败"
        const details = result.details ? `: ${result.details}` : ""
        setRentalOrderError(response.status === 401 ? `${errorMsg}${details}\n\n若使用无痕/隐私模式，请改用普通窗口并重新登录后再试。` : `${errorMsg}${details}`)
        setRentalOrders([])
      }
    } catch (err: any) {
      setRentalOrderError(err.message || "网络请求失败")
      setRentalOrders([])
    } finally {
      setIsLoadingRentalOrders(false)
    }
  }, [rentalOrderStatusFilter, supabase, userRole, userCompanyId])

  const loadDeviceRentals = useCallback(async () => {
    setIsLoadingDeviceRentals(true)
    setDeviceRentalError(null)
    try {
      const params = new URLSearchParams()
      if (deviceRentalStatusFilter && deviceRentalStatusFilter !== "all") params.append("status", deviceRentalStatusFilter)
      const headers: HeadersInit = {}
      if (supabase) {
        let { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          const { data: { session: refreshed } } = await supabase.auth.refreshSession()
          session = refreshed
        }
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
      }
      const response = await fetchWithAuth(`/api/device-rentals/list?${params.toString()}`, { credentials: "include", headers })
      const result = await response.json()
      if (response.status === 401 && supabase) {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession()
        if (refreshed?.access_token) {
          const retryHeaders: HeadersInit = { ...headers, Authorization: `Bearer ${refreshed.access_token}` }
          const retryRes = await fetchWithAuth(`/api/device-rentals/list?${params.toString()}`, { credentials: "include", headers: retryHeaders })
          const retryResult = await retryRes.json()
          if (retryResult.success) {
            setDeviceRentals(retryResult.data || [])
            setDeviceRentalError(null)
            return
          }
        }
      }
      if (result.success) {
        setDeviceRentals(result.data || [])
        setDeviceRentalError(null)
      } else {
        const errorMsg = result.error || "获取设备租赁记录列表失败"
        const details = result.details ? `: ${result.details}` : ""
        setDeviceRentalError(response.status === 401 ? `${errorMsg}${details}\n\n若使用无痕/隐私模式，请改用普通窗口并重新登录后再试。` : `${errorMsg}${details}`)
        setDeviceRentals([])
      }
    } catch (err: any) {
      setDeviceRentalError(err.message || "网络请求失败")
      setDeviceRentals([])
    } finally {
      setIsLoadingDeviceRentals(false)
    }
  }, [deviceRentalStatusFilter, supabase])

  const loadEquipmentCategories = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/equipment/categories")
      const result = await response.json()
      if (result.success && result.data) setEquipmentCategories(result.data)
    } catch (err) {
      logBusinessWarning("设备租赁管理", "加载设备分类失败", err)
    }
  }, [])

  const loadDevicesAndRestaurantsForRental = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/equipment/catalog/list?is_approved=true")
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setAvailableEquipmentCatalog(
          json.data.map((item: any) => ({
            id: item.id,
            name: item.name || "",
            model: item.model ?? null,
            brand: item.brand ?? null,
          }))
        )
      } else {
        setAvailableEquipmentCatalog([])
      }
    } catch (e) {
      logBusinessWarning("设备租赁基础功能", "加载产品库失败", e)
      setAvailableEquipmentCatalog([])
    }
    if (!supabase) {
      setAvailableRestaurants([])
      return
    }
    try {
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("id, name, address")
        .order("name")
      if (restaurantError) {
        logBusinessWarning("设备租赁基础功能", "加载餐厅列表失败", restaurantError)
        setAvailableRestaurants([])
      } else {
        setAvailableRestaurants(restaurantData || [])
      }
    } catch (err) {
      logBusinessWarning("设备租赁基础功能", "加载餐厅列表失败", err)
      setAvailableRestaurants([])
    }
  }, [supabase])

  const loadEquipmentAndRestaurants = useCallback(async () => {
    if (!supabase) return
    try {
      const { data: equipmentData } = await supabase.from("equipment").select("*").eq("status", "active").order("name")
      if (equipmentData) setEquipmentList(equipmentData)
      const { data: restaurantData } = await supabase.from("restaurants").select("id, name").order("name")
      if (restaurantData) setRestaurantList(restaurantData)
      const { data: companyData } = await supabase.from("companies").select("id, name").eq("status", "active").order("name")
      if (companyData) setCompanyList(companyData)
    } catch (err) {
      logBusinessWarning("设备租赁管理", "加载设备和餐厅列表失败", err)
    }
  }, [supabase])

  useEffect(() => {
    loadRentalOrders()
    loadDeviceRentals()
    loadDevicesAndRestaurantsForRental()
    loadEquipmentAndRestaurants()
  }, [loadRentalOrders, loadDeviceRentals, loadDevicesAndRestaurantsForRental, loadEquipmentAndRestaurants])

  const handleCreateDeviceRental = useCallback(async () => {
    const validDevices = newDeviceRental.devices.filter((d) => d.equipment_catalog_id && Number(d.unit_price) >= 0)
    if (!newDeviceRental.restaurant_id || !newDeviceRental.start_at || validDevices.length === 0) {
      alert("请选择餐厅、开始时间，并至少添加一条设备（从产品库选择设备与单价必填）")
      return
    }
    setIsCreatingDeviceRental(true)
    try {
      const createHeaders: HeadersInit = { "Content-Type": "application/json" }
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) createHeaders["Authorization"] = `Bearer ${session.access_token}`
      }
      const response = await fetchWithAuth("/api/device-rentals/create", {
        method: "POST",
        headers: createHeaders,
        body: JSON.stringify({
          restaurant_id: newDeviceRental.restaurant_id,
          start_at: newDeviceRental.start_at,
          devices: validDevices.map((d) => ({
            equipment_catalog_id: d.equipment_catalog_id,
            unit_price: Number(d.unit_price) || 0,
          })),
        }),
      })
      const result = await response.json()
      if (result.success) {
        await loadDeviceRentals()
        setIsAddDeviceRentalDialogOpen(false)
        setNewDeviceRental(initialNewDeviceRental)
        alert(result.message || "设备租赁记录已创建，已推送至客户端待客户确认。")
      } else {
        alert(`创建失败: ${result.error}`)
      }
    } catch (err: any) {
      alert(`创建失败: ${err.message}`)
    } finally {
      setIsCreatingDeviceRental(false)
    }
  }, [newDeviceRental, loadDeviceRentals])

  const handleEndDeviceRental = useCallback(async (rentalId: string) => {
    if (!confirm("确定要结束此设备租赁记录吗？")) return
    setIsEndingDeviceRental(true)
    try {
      const endHeaders: HeadersInit = { "Content-Type": "application/json" }
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) endHeaders["Authorization"] = `Bearer ${session.access_token}`
      }
      const response = await fetchWithAuth("/api/device-rentals/end", {
        method: "POST",
        headers: endHeaders,
        body: JSON.stringify({ rental_id: rentalId }),
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

  const handleUpdateRentalOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    setIsUpdatingRentalOrder(true)
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (supabase) {
        let { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          const { data: { session: refreshed } } = await supabase.auth.refreshSession()
          session = refreshed
        }
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
      }
      const body = JSON.stringify({ id: orderId, order_status: newStatus })
      let response = await fetchWithAuth("/api/equipment/rental/update", { method: "PATCH", headers, body })
      if (response.status === 401 && supabase) {
        const { data: { session: retrySession } } = await supabase.auth.refreshSession()
        if (retrySession?.access_token) {
          const retryHeaders = { ...headers, Authorization: `Bearer ${retrySession.access_token}` }
          response = await fetchWithAuth("/api/equipment/rental/update", { method: "PATCH", headers: retryHeaders, body })
        }
      }
      const result = await response.json()
      if (result.success) {
        await loadRentalOrders()
        setSelectedRentalOrder((prev: any) => (prev ? { ...prev, order_status: newStatus } : null))
      } else {
        alert(`更新失败: ${result.error}`)
      }
    } catch (err: any) {
      alert(`更新失败: ${err.message}`)
    } finally {
      setIsUpdatingRentalOrder(false)
    }
  }, [loadRentalOrders, supabase])

  const handleUpdateRentalOrderPaymentStatus = useCallback(async (orderId: string, newStatus: string) => {
    setIsUpdatingRentalOrder(true)
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (supabase) {
        let { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          const { data: { session: refreshed } } = await supabase.auth.refreshSession()
          session = refreshed
        }
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
      }
      const body = JSON.stringify({ id: orderId, payment_status: newStatus })
      let response = await fetchWithAuth("/api/equipment/rental/update", { method: "PATCH", headers, body })
      if (response.status === 401 && supabase) {
        const { data: { session: retrySession } } = await supabase.auth.refreshSession()
        if (retrySession?.access_token) {
          const retryHeaders = { ...headers, Authorization: `Bearer ${retrySession.access_token}` }
          response = await fetchWithAuth("/api/equipment/rental/update", { method: "PATCH", headers: retryHeaders, body })
        }
      }
      const result = await response.json()
      if (result.success) {
        await loadRentalOrders()
        setSelectedRentalOrder((prev: any) => (prev ? { ...prev, payment_status: newStatus } : null))
      } else {
        alert(`更新失败: ${result.error}`)
      }
    } catch (err: any) {
      alert(`更新失败: ${err.message}`)
    } finally {
      setIsUpdatingRentalOrder(false)
    }
  }, [loadRentalOrders, supabase])

  const handleCreateRentalOrder = useCallback(async () => {
    if (!newRentalOrder.restaurant_id || !newRentalOrder.equipment_id || !newRentalOrder.start_date) {
      alert("请填写必填字段（餐厅、设备、开始日期）")
      return
    }
    setIsUpdatingRentalOrder(true)
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
      }
      const response = await fetchWithAuth("/api/equipment/rental/create", {
        method: "POST",
        headers,
        body: JSON.stringify(newRentalOrder),
      })
      const result = await response.json()
      if (result.success) {
        setIsAddRentalOrderDialogOpen(false)
        setNewRentalOrder(initialNewRentalOrder)
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
  }, [newRentalOrder, loadRentalOrders, supabase])

  const handleRefundDeposit = useCallback(async () => {
    if (!selectedRentalOrder || !refundReason.trim()) {
      if (!refundReason.trim()) alert("请输入退款原因")
      return
    }
    setIsProcessingRefund(true)
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
      }
      const response = await fetchWithAuth("/api/equipment/rental/deposit/refund", {
        method: "POST",
        headers,
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
        setSelectedRentalOrder((prev: any) => (prev ? { ...prev, payment_status: "refunded" } : null))
      } else {
        alert(`退款失败: ${result.error || result.details}`)
      }
    } catch (err: any) {
      alert(`退款失败: ${err.message}`)
    } finally {
      setIsProcessingRefund(false)
    }
  }, [selectedRentalOrder, refundReason, refundProof, loadRentalOrders, supabase])

  const handleBatchUpdateStatus = useCallback(async () => {
    if (selectedRentalOrderIds.length === 0) return
    if (!confirm(`确定要将选中的 ${selectedRentalOrderIds.length} 个订单状态改为"已确认"吗？`)) return
    setIsUpdatingRentalOrder(true)
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (supabase) {
        let { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          const { data: { session: refreshed } } = await supabase.auth.refreshSession()
          session = refreshed
        }
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
      }
      const doPatch = (id: string, h: HeadersInit) =>
        fetchWithAuth("/api/equipment/rental/update", {
          method: "PATCH",
          headers: h,
          body: JSON.stringify({ id, order_status: "confirmed" }),
        })
      let results = await Promise.all(selectedRentalOrderIds.map((id) => doPatch(id, headers)))
      if (results.some((r) => r.status === 401) && supabase) {
        const { data: { session: retrySession } } = await supabase.auth.refreshSession()
        if (retrySession?.access_token) {
          const retryHeaders = { ...headers, Authorization: `Bearer ${retrySession.access_token}` }
          results = await Promise.all(selectedRentalOrderIds.map((id) => doPatch(id, retryHeaders)))
        }
      }
      setSelectedRentalOrderIds([])
      await loadRentalOrders()
      alert("批量确认完成")
    } catch (err: any) {
      alert(`批量确认失败: ${err.message}`)
    } finally {
      setIsUpdatingRentalOrder(false)
    }
  }, [selectedRentalOrderIds, loadRentalOrders, supabase])

  const handleUploadEquipmentImage = useCallback(
    async (file: File) => {
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
        const response = await fetchWithAuth("/api/storage/upload", { method: "POST", body: formData })
        const result = await response.json()
        if (result.success && result.url) {
          setUploadedEquipmentImages((prev) => [...prev, result.url])
          return result.url
        }
        throw new Error(result.error || "上传失败")
      } catch (err: any) {
        logBusinessWarning("设备租赁管理", "上传图片失败", err)
        alert(`上传图片失败: ${err.message}`)
        return null
      } finally {
        setIsUploadingImages(false)
      }
    },
    [supabase, userCompanyId]
  )

  const handleUploadEquipmentVideo = useCallback(
    async (file: File) => {
      if (!supabase || !userCompanyId) {
        alert("请先登录并关联公司")
        return null
      }
      const maxSize = 100 * 1024 * 1024
      if (file.size > maxSize) {
        alert("视频文件大小不能超过 100MB")
        return null
      }
      setIsUploadingVideo(true)
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("company_id", userCompanyId)
        formData.append("folder", "equipment-videos")
        const response = await fetchWithAuth("/api/storage/upload", { method: "POST", body: formData })
        const result = await response.json()
        if (result.success && result.url) {
          setUploadedEquipmentVideo(result.url)
          return result.url
        }
        throw new Error(result.error || "上传失败")
      } catch (err: any) {
        logBusinessWarning("设备租赁管理", "上传视频失败", err)
        alert(`上传视频失败: ${err.message}`)
        return null
      } finally {
        setIsUploadingVideo(false)
      }
    },
    [supabase, userCompanyId]
  )

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
      const response = await fetchWithAuth("/api/equipment/catalog/create", {
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
          video_url: uploadedEquipmentVideo || null,
          notes: newEquipment.notes || null,
        }),
      })
      const result = await response.json()
      if (result.success) {
        alert("设备上传成功！等待审核通过后即可在客户端显示。")
        setIsUploadEquipmentDialogOpen(false)
        setNewEquipment(initialNewEquipment)
        setUploadedEquipmentImages([])
        setUploadedEquipmentVideo(null)
      } else {
        alert(`上传失败: ${result.error}`)
      }
    } catch (err: any) {
      logBusinessWarning("设备租赁管理", "上传设备失败", err)
      alert(`上传失败: ${err.message}`)
    } finally {
      setIsUploadingEquipment(false)
    }
  }, [newEquipment, uploadedEquipmentImages, uploadedEquipmentVideo, userCompanyId])

  return (
    <div className="space-y-6">
      <EquipmentRentalPanel
        deviceRentals={deviceRentals}
        deviceRentalError={deviceRentalError}
        isLoadingDeviceRentals={isLoadingDeviceRentals}
        deviceRentalStatusFilter={deviceRentalStatusFilter}
        deviceRentalSearchQuery={deviceRentalSearchQuery}
        onDeviceRentalStatusFilterChange={setDeviceRentalStatusFilter}
        onDeviceRentalSearchQueryChange={setDeviceRentalSearchQuery}
        onOpenAddDeviceRental={() => setIsAddDeviceRentalDialogOpen(true)}
        onOpenUploadEquipment={() => {
          setIsUploadEquipmentDialogOpen(true)
          loadEquipmentCategories()
        }}
        onSelectDeviceRental={(rental) => {
          setSelectedDeviceRental(rental)
          setIsDeviceRentalDetailDialogOpen(true)
        }}
        onRetryDeviceRentals={loadDeviceRentals}
        rentalOrders={rentalOrders}
        rentalOrderError={rentalOrderError}
        isLoadingRentalOrders={isLoadingRentalOrders}
        rentalOrderStatusFilter={rentalOrderStatusFilter}
        rentalOrderSearchQuery={rentalOrderSearchQuery}
        selectedRentalOrderIds={selectedRentalOrderIds}
        onRentalOrderStatusFilterChange={setRentalOrderStatusFilter}
        onRentalOrderSearchQueryChange={setRentalOrderSearchQuery}
        onToggleRentalOrderSelection={(orderId, checked) => {
          setSelectedRentalOrderIds((prev) =>
            checked ? [...prev, orderId] : prev.filter((id) => id !== orderId)
          )
        }}
        onOpenAddRentalOrder={() => setIsAddRentalOrderDialogOpen(true)}
        onBatchUpdateStatus={handleBatchUpdateStatus}
        onClearRentalOrderSelection={() => setSelectedRentalOrderIds([])}
        onSelectRentalOrder={(order) => {
          setSelectedRentalOrder(order)
          setIsRentalOrderDetailDialogOpen(true)
        }}
        onRetryRentalOrders={loadRentalOrders}
      />

      {/* 1. 租赁订单详情对话框 */}
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
                        {selectedRentalOrder.payment_method === "cash"
                          ? "现金支付"
                          : selectedRentalOrder.payment_method === "alipay"
                            ? "支付宝"
                            : selectedRentalOrder.payment_method === "wechat"
                              ? "微信支付"
                              : selectedRentalOrder.payment_method === "bank_transfer"
                                ? "银行转账"
                                : selectedRentalOrder.payment_method}
                      </span>
                    </div>
                  )}
                </div>
              </div>
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
              {selectedRentalOrder.notes && (
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3">备注</h4>
                  <p className="text-slate-300 text-sm">{selectedRentalOrder.notes}</p>
                </div>
              )}
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
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                {(selectedRentalOrder.order_status === "completed" || selectedRentalOrder.order_status === "cancelled") &&
                  selectedRentalOrder.payment_status !== "refunded" &&
                  parseFloat(selectedRentalOrder.deposit_amount?.toString() || "0") > 0 && (
                  <Button
                    onClick={() => setIsRefundDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    押金退款
                  </Button>
                )}
                {selectedRentalOrder.payment_status === "refunded" && (
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

      {/* 2. 押金退款对话框 */}
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
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">退款金额：</span>
                  <span className="text-green-400 font-bold text-xl">
                    ¥{selectedRentalOrder.deposit_amount?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
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
              <div className="space-y-2">
                <Label className="text-slate-300">退款凭证（可选）</Label>
                <Input
                  value={refundProof}
                  onChange={(e) => setRefundProof(e.target.value)}
                  placeholder="退款凭证URL（图片或转账凭证）"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
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

      {/* 3. 创建设备租赁记录对话框 */}
      <Dialog open={isAddDeviceRentalDialogOpen} onOpenChange={setIsAddDeviceRentalDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">创建设备租赁记录</DialogTitle>
            <DialogDescription className="text-slate-400">
              支持多台多型号；每条含设备单价与合计资产总价。创建后推送至客户端待客户确认。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">餐厅（客户） <span className="text-red-400">*</span></Label>
              <Select
                value={newDeviceRental.restaurant_id}
                onValueChange={(value) => setNewDeviceRental({ ...newDeviceRental, restaurant_id: value })}
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
            <div className="space-y-2">
              <Label className="text-slate-300">开始时间 <span className="text-red-400">*</span></Label>
              <Input
                type="datetime-local"
                value={newDeviceRental.start_at}
                onChange={(e) => setNewDeviceRental({ ...newDeviceRental, start_at: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300">设备（多台多型号） <span className="text-red-400">*</span></Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setNewDeviceRental({
                      ...newDeviceRental,
                      devices: [...newDeviceRental.devices, { equipment_catalog_id: "", unit_price: 0 }],
                    })
                  }
                  className="text-slate-300 border-slate-600"
                >
                  添加设备
                </Button>
              </div>
              {newDeviceRental.devices.map((row, index) => (
                <div key={index} className="flex gap-2 items-end p-2 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs text-slate-400">设备（与上传设备产品库一致）</Label>
                    <Select
                      value={row.equipment_catalog_id}
                      onValueChange={(value) => {
                        const next = [...newDeviceRental.devices]
                        next[index] = { ...next[index], equipment_catalog_id: value }
                        setNewDeviceRental({ ...newDeviceRental, devices: next })
                      }}
                    >
                      <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white mt-1">
                        <SelectValue placeholder="选择设备（产品库）" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {availableEquipmentCatalog.map((item) => (
                          <SelectItem key={item.id} value={item.id} className="text-white hover:bg-slate-700">
                            {item.name} {item.model ? `- ${item.model}` : ""} {item.brand ? `（${item.brand}）` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-28">
                    <Label className="text-xs text-slate-400">单价（元）</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.unit_price === 0 ? "" : row.unit_price}
                      onChange={(e) => {
                        const next = [...newDeviceRental.devices]
                        next[index] = { ...next[index], unit_price: Number(e.target.value) || 0 }
                        setNewDeviceRental({ ...newDeviceRental, devices: next })
                      }}
                      placeholder="0"
                      className="bg-slate-800 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const next = newDeviceRental.devices.filter((_, i) => i !== index)
                      if (next.length === 0) next.push({ equipment_catalog_id: "", unit_price: 0 })
                      setNewDeviceRental({ ...newDeviceRental, devices: next })
                    }}
                    className="text-red-400 hover:text-red-300 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <p className="text-sm text-slate-400">
                合计资产总价：¥
                {newDeviceRental.devices.reduce((sum, d) => sum + (Number(d.unit_price) || 0), 0).toFixed(2)}
              </p>
            </div>
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
                  "创建并推送客户确认"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. 设备租赁记录详情对话框 */}
      <Dialog open={isDeviceRentalDetailDialogOpen} onOpenChange={setIsDeviceRentalDetailDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">设备租赁记录详情</DialogTitle>
            <DialogDescription className="text-slate-400">查看设备租赁记录的详细信息</DialogDescription>
          </DialogHeader>
          {selectedDeviceRental && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">状态：</span>
                  <Badge
                    className={
                      selectedDeviceRental.status === "pending_confirmation"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : selectedDeviceRental.status === "active"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                    }
                  >
                    {selectedDeviceRental.status === "pending_confirmation"
                      ? "待客户确认"
                      : selectedDeviceRental.status === "active"
                        ? "租赁中"
                        : "已结束"}
                  </Badge>
                </div>
                {(selectedDeviceRental.unit_price != null || selectedDeviceRental.total_asset_value != null) && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">设备单价：</span>
                      <span className="text-white">¥{(selectedDeviceRental.unit_price ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">合计资产总价：</span>
                      <span className="text-white">¥{(selectedDeviceRental.total_asset_value ?? 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">设备ID：</span>
                  <span className="text-white">
                    {selectedDeviceRental.devices?.device_id || selectedDeviceRental.device_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">设备型号：</span>
                  <span className="text-white">{selectedDeviceRental.devices?.model || "未知"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">餐厅：</span>
                  <span className="text-white">{selectedDeviceRental.restaurants?.name || "未知"}</span>
                </div>
                {selectedDeviceRental.restaurants?.address && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">餐厅地址：</span>
                    <span className="text-white">{selectedDeviceRental.restaurants.address}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">开始时间：</span>
                  <span className="text-white">{new Date(selectedDeviceRental.start_at).toLocaleString("zh-CN")}</span>
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

      {/* 5. 上传设备对话框 */}
      <Dialog open={isUploadEquipmentDialogOpen} onOpenChange={setIsUploadEquipmentDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">上传设备</DialogTitle>
            <DialogDescription className="text-slate-400">上传设备信息，审核通过后将在客户端显示</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <div>
              <Label className="text-white">设备图片</Label>
              <div className="mt-2 space-y-2">
                <div className="flex gap-2 flex-wrap">
                  {uploadedEquipmentImages.map((url, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-600">
                      <img src={url} alt={`设备图片 ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() =>
                          setUploadedEquipmentImages(uploadedEquipmentImages.filter((_, i) => i !== index))
                        }
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
                          if (file) await handleUploadEquipmentImage(file)
                        }}
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-slate-400">最多上传5张图片</p>
              </div>
            </div>
            <div>
              <Label className="text-white">设备展示视频（可选）</Label>
              <div className="mt-2 space-y-2">
                {uploadedEquipmentVideo ? (
                  <div className="relative w-full max-w-md rounded-lg overflow-hidden border border-slate-600 bg-slate-800">
                    <video
                      src={uploadedEquipmentVideo}
                      controls
                      className="w-full h-auto max-h-64"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                    <button
                      onClick={() => setUploadedEquipmentVideo(null)}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="w-full max-w-md border-2 border-dashed border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors bg-slate-800/50">
                    {isUploadingVideo ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-blue-400 mb-2" />
                        <span className="text-sm text-slate-400">上传中...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-300 mb-1">点击上传视频</span>
                        <span className="text-xs text-slate-500">支持 MP4、WebM，最大 100MB</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) await handleUploadEquipmentVideo(file)
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
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
                setNewEquipment(initialNewEquipment)
                setUploadedEquipmentImages([])
                setUploadedEquipmentVideo(null)
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
