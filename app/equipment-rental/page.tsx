"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  Flame,
  Snowflake,
  Wind,
  Droplet,
  Zap,
  Package,
  MoreHorizontal,
  Search,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

// 设备分类图标映射
const categoryIcons: Record<string, any> = {
  "炉灶设备": Flame,
  "制冷设备": Snowflake,
  "排烟设备": Wind,
  "清洗设备": Droplet,
  "加工设备": Zap,
  "存储设备": Package,
  "其他设备": MoreHorizontal,
}

interface EquipmentCategory {
  id: string
  name: string
  description: string
  icon: string
  sort_order: number
}

interface Equipment {
  id: string
  category_id: string
  name: string
  brand: string
  model: string
  description: string
  specifications: any
  images: string[]
  monthly_rental_price: number
  daily_rental_price: number
  deposit_amount: number
  stock_quantity: number
  available_quantity: number
  status: string
  min_rental_period: number
  max_rental_period: number | null
  maintenance_included: boolean
  delivery_included: boolean
  equipment_categories?: EquipmentCategory
}

interface RentalOrder {
  id: string
  order_number: string
  equipment_id: string
  quantity: number
  rental_period: number
  start_date: string
  end_date: string
  monthly_rental_price: number
  total_amount: number
  deposit_amount: number
  payment_status: string
  order_status: string
  payment_method: string
  delivery_address: string
  contact_phone: string
  notes: string
  created_at: string
  equipment?: Equipment
}

export default function EquipmentRentalPage() {
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [rentalOrders, setRentalOrders] = useState<RentalOrder[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchKeyword, setSearchKeyword] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [equipmentError, setEquipmentError] = useState<string | null>(null)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [isRentalDialogOpen, setIsRentalDialogOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [rentalPeriod, setRentalPeriod] = useState<number>(1)
  const [rentalQuantity, setRentalQuantity] = useState<number>(1)
  const [startDate, setStartDate] = useState<string>("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"browse" | "orders">("browse")

  // 获取餐厅ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      const rid = localStorage.getItem("restaurantId")
      setRestaurantId(rid)
    }
  }, [])

  // 加载设备分类
  useEffect(() => {
    loadCategories()
  }, [])

  // 加载设备列表（页面加载时自动加载，或当筛选条件改变时重新加载）
  useEffect(() => {
    // 页面初始加载时，即使 selectedCategory 是 "all"，也应该加载所有设备
    // 如果分类还在加载中，等待分类加载完成后再加载设备（避免分类筛选时找不到分类）
    if (selectedCategory === "all" || categories.length > 0) {
      loadEquipment()
    }
  }, [selectedCategory, searchKeyword, categories])

  // 加载租赁订单
  useEffect(() => {
    if (restaurantId && activeTab === "orders") {
      loadRentalOrders()
    }
  }, [restaurantId, activeTab])

  const loadCategories = async () => {
    setCategoriesError(null)
    try {
      const response = await fetch("/api/equipment/categories")
      const result = await response.json()
      if (result.success) {
        setCategories(result.data || [])
        setCategoriesError(null)
      } else {
        const errorMsg = result.error || "加载分类失败"
        console.error("[设备租赁] 加载分类失败:", errorMsg)
        setCategoriesError(errorMsg)
        setCategories([])
      }
    } catch (err: any) {
      const errorMsg = err.message || "网络请求失败"
      console.error("[设备租赁] 加载分类失败:", err)
      setCategoriesError(errorMsg)
      setCategories([])
    }
  }

  const loadEquipment = async () => {
    setIsLoading(true)
    setEquipmentError(null)
    try {
      const params = new URLSearchParams()
      if (selectedCategory && selectedCategory !== "all") {
        const category = categories.find(c => c.name === selectedCategory)
        if (category) {
          params.append("category_id", category.id)
        }
      }
      if (searchKeyword) {
        params.append("search", searchKeyword)
      }

      const url = `/api/equipment/list${params.toString() ? `?${params.toString()}` : ""}`
      console.log("[设备租赁] 请求URL:", url)
      const response = await fetch(url)
      const result = await response.json()
      console.log("[设备租赁] API响应:", { success: result.success, dataLength: result.data?.length, error: result.error })
      
      if (result.success) {
        const equipmentData = result.data || []
        console.log("[设备租赁] 加载成功，设备数量:", equipmentData.length)
        setEquipment(equipmentData)
        setEquipmentError(null)
      } else {
        const errorMsg = result.error || "加载设备失败"
        console.error("[设备租赁] 加载设备失败:", errorMsg)
        setEquipmentError(errorMsg)
        setEquipment([])
      }
    } catch (err: any) {
      const errorMsg = err.message || "网络请求失败"
      console.error("[设备租赁] 加载设备失败:", err)
      setEquipmentError(errorMsg)
      setEquipment([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadRentalOrders = async () => {
    if (!restaurantId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/equipment/rental/list?restaurant_id=${restaurantId}`)
      const result = await response.json()
      if (result.success) {
        setRentalOrders(result.data || [])
      }
    } catch (err) {
      console.error("[设备租赁] 加载订单失败:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const openRentalDialog = (equipment: Equipment) => {
    setSelectedEquipment(equipment)
    setRentalPeriod(equipment.min_rental_period || 1)
    setRentalQuantity(1)
    const today = new Date()
    today.setDate(today.getDate() + 1) // 默认明天开始
    setStartDate(today.toISOString().split("T")[0])
    setIsRentalDialogOpen(true)
  }

  const handleSubmitRental = async () => {
    if (!selectedEquipment || !restaurantId) {
      alert("请先登录")
      return
    }

    if (!startDate) {
      alert("请选择租赁开始日期")
      return
    }

    if (rentalQuantity > selectedEquipment.available_quantity) {
      alert(`库存不足，当前可租数量：${selectedEquipment.available_quantity}`)
      return
    }

    setIsSubmitting(true)
    try {
      // 获取当前用户ID
      let userId: string | null = null
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        userId = user?.id || null
      }

      const response = await fetch("/api/equipment/rental/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          user_id: userId,
          equipment_id: selectedEquipment.id,
          quantity: rentalQuantity,
          rental_period: rentalPeriod,
          start_date: startDate,
          delivery_address: deliveryAddress,
          contact_phone: contactPhone,
          notes: notes,
          payment_method: paymentMethod,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "创建租赁订单失败")
      }

      alert("租赁订单创建成功！")
      setIsRentalDialogOpen(false)
      setSelectedEquipment(null)
      
      // 刷新设备列表和订单列表
      loadEquipment()
      if (activeTab === "orders") {
        loadRentalOrders()
      }
    } catch (err: any) {
      console.error("[设备租赁] 提交失败:", err)
      alert(`创建租赁订单失败：${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "confirmed":
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "completed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
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

  return (
    <main className="min-h-screen bg-background pb-20">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "browse" | "orders")}>
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 mb-6">
            <TabsTrigger value="browse" className="data-[state=active]:bg-primary">
              浏览设备
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-primary">
              我的订单
            </TabsTrigger>
          </TabsList>

          {/* 浏览设备标签页 */}
          <TabsContent value="browse" className="space-y-4">
            {/* 搜索栏 */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="equipment-search"
                  name="equipment-search"
                  placeholder="搜索设备名称、品牌、型号..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10 theme-input"
                />
              </div>
            </div>

            {/* 分类筛选 */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className={selectedCategory === "all" ? "bg-blue-600" : "border-slate-700"}
              >
                全部
              </Button>
              {categories.map((category) => {
                const IconComponent = categoryIcons[category.name] || Package
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.name ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.name)}
                    className={selectedCategory === category.name ? "bg-blue-600" : "border-slate-700"}
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    {category.name}
                  </Button>
                )
              })}
            </div>

            {/* 错误提示 */}
            {equipmentError && (
              <Card className="bg-gradient-to-br from-red-900/90 to-red-800/90 border-red-700/50">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-red-400 font-medium">加载失败</p>
                      <p className="text-red-300 text-sm mt-1">{equipmentError}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadEquipment()}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      重试
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* 设备列表 */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
                <span className="text-slate-400">加载中...</span>
              </div>
            ) : equipment.length === 0 ? (
              <Card className="bg-slate-900/50 border-slate-800 p-8 text-center">
                <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400 mb-2">暂无设备</p>
                {equipmentError ? (
                  <p className="text-sm text-slate-500">加载失败，请点击上方重试按钮</p>
                ) : searchKeyword ? (
                  <p className="text-sm text-slate-500">未找到与"{searchKeyword}"相关的设备</p>
                ) : selectedCategory !== "all" ? (
                  <p className="text-sm text-slate-500">该分类下暂无设备</p>
                ) : (
                  <p className="text-sm text-slate-500">当前没有可租赁的设备，请稍后再试</p>
                )}
              </Card>
            ) : (
              <>
                <div className="text-sm text-slate-400 mb-2">
                  共找到 {equipment.length} 个设备
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {equipment.map((item) => (
                  <Card
                    key={item.id}
                    className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 overflow-hidden"
                  >
                    {/* 设备图片 */}
                    <div className="relative h-48 bg-slate-800">
                      {item.images && item.images.length > 0 ? (
                        <Image
                          src={item.images[0]}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="h-16 w-16 text-slate-600" />
                        </div>
                      )}
                      {item.equipment_categories && (
                        <Badge className="absolute top-2 left-2 bg-blue-600/80">
                          {item.equipment_categories.name}
                        </Badge>
                      )}
                      {item.available_quantity > 0 ? (
                        <Badge className="absolute top-2 right-2 bg-green-600/80">
                          可租 {item.available_quantity} 台
                        </Badge>
                      ) : (
                        <Badge className="absolute top-2 right-2 bg-red-600/80">
                          缺货
                        </Badge>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                        {(item.brand || item.model) && (
                          <p className="text-sm text-slate-400">
                            {item.brand} {item.model}
                          </p>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-sm text-slate-300 line-clamp-2">{item.description}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <div>
                          <p className="text-2xl font-bold text-blue-400">
                            ¥{item.monthly_rental_price.toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-400">/月</p>
                        </div>
                        <Button
                          onClick={() => openRentalDialog(item)}
                          disabled={item.available_quantity === 0}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          立即租赁
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        {item.maintenance_included && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            含维护
                          </span>
                        )}
                        {item.delivery_included && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            含配送
                          </span>
                        )}
                        <span>最短租期：{item.min_rental_period}个月</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              </>
            )}
          </TabsContent>

          {/* 我的订单标签页 */}
          <TabsContent value="orders" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
                <span className="text-slate-400">加载中...</span>
              </div>
            ) : rentalOrders.length === 0 ? (
              <Card className="bg-slate-900/50 border-slate-800 p-8 text-center">
                <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">暂无租赁订单</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {rentalOrders.map((order) => (
                  <Card
                    key={order.id}
                    className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-white">
                            {order.equipment?.name || "未知设备"}
                          </h3>
                          <Badge className={getStatusColor(order.order_status)}>
                            {getStatusLabel(order.order_status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">订单号：{order.order_number}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">数量：</span>
                        <span className="text-white">{order.quantity} 台</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">租期：</span>
                        <span className="text-white">{order.rental_period} 个月</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">开始日期：</span>
                        <span className="text-white">{order.start_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">结束日期：</span>
                        <span className="text-white">{order.end_date}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-700">
                        <span className="text-slate-400">总金额：</span>
                        <span className="text-xl font-bold text-blue-400">
                          ¥{order.total_amount.toFixed(2)}
                        </span>
                      </div>
                      {order.deposit_amount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">押金：</span>
                          <span className="text-white">¥{order.deposit_amount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 租赁对话框 */}
      <Dialog open={isRentalDialogOpen} onOpenChange={setIsRentalDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              租赁设备
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedEquipment?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedEquipment && (
            <div className="space-y-4">
              {/* 设备信息 */}
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <p className="text-white font-medium mb-2">{selectedEquipment.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">月租金：</span>
                  <span className="text-xl font-bold text-blue-400">
                    ¥{selectedEquipment.monthly_rental_price.toFixed(2)}
                  </span>
                </div>
                {selectedEquipment.deposit_amount > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-slate-400">押金：</span>
                    <span className="text-white">¥{selectedEquipment.deposit_amount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* 租赁数量 */}
              <div className="space-y-2">
                <Label className="text-slate-300">租赁数量</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setRentalQuantity(Math.max(1, rentalQuantity - 1))}
                    disabled={rentalQuantity <= 1}
                    className="border-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Input
                    id="rental-quantity"
                    name="rental-quantity"
                    type="number"
                    value={rentalQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      setRentalQuantity(Math.min(selectedEquipment.available_quantity, Math.max(1, val)))
                    }}
                    min={1}
                    max={selectedEquipment.available_quantity}
                    className="text-center bg-slate-800 border-slate-700 text-white"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setRentalQuantity(Math.min(selectedEquipment.available_quantity, rentalQuantity + 1))}
                    disabled={rentalQuantity >= selectedEquipment.available_quantity}
                    className="border-slate-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-400">
                    可租：{selectedEquipment.available_quantity} 台
                  </span>
                </div>
              </div>

              {/* 租期 */}
              <div className="space-y-2">
                <Label className="text-slate-300">租期（月）</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setRentalPeriod(Math.max(selectedEquipment.min_rental_period || 1, rentalPeriod - 1))}
                    disabled={rentalPeriod <= (selectedEquipment.min_rental_period || 1)}
                    className="border-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Input
                    id="rental-period"
                    name="rental-period"
                    type="number"
                    value={rentalPeriod}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      const min = selectedEquipment.min_rental_period || 1
                      const max = selectedEquipment.max_rental_period || 999
                      setRentalPeriod(Math.min(max, Math.max(min, val)))
                    }}
                    min={selectedEquipment.min_rental_period || 1}
                    max={selectedEquipment.max_rental_period || undefined}
                    className="text-center bg-slate-800 border-slate-700 text-white"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const max = selectedEquipment.max_rental_period || 999
                      setRentalPeriod(Math.min(max, rentalPeriod + 1))
                    }}
                    disabled={selectedEquipment.max_rental_period ? rentalPeriod >= selectedEquipment.max_rental_period : false}
                    className="border-slate-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-400">
                    最短：{selectedEquipment.min_rental_period} 个月
                    {selectedEquipment.max_rental_period && `，最长：${selectedEquipment.max_rental_period} 个月`}
                  </span>
                </div>
              </div>

              {/* 开始日期 */}
              <div className="space-y-2">
                <Label className="text-slate-300">租赁开始日期</Label>
                <Input
                  id="start-date"
                  name="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* 配送地址 */}
              <div className="space-y-2">
                <Label className="text-slate-300">配送地址（可选）</Label>
                <Input
                  id="delivery-address"
                  name="delivery-address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="请输入配送地址"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* 联系电话 */}
              <div className="space-y-2">
                <Label className="text-slate-300">联系电话（可选）</Label>
                <Input
                  id="contact-phone"
                  name="contact-phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="请输入联系电话"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* 支付方式 */}
              <div className="space-y-2">
                <Label className="text-slate-300">支付方式</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="cash" className="text-white hover:bg-slate-700">
                      现金支付
                    </SelectItem>
                    <SelectItem value="alipay" className="text-white hover:bg-slate-700">
                      支付宝
                    </SelectItem>
                    <SelectItem value="wechat" className="text-white hover:bg-slate-700">
                      微信支付
                    </SelectItem>
                    <SelectItem value="bank_transfer" className="text-white hover:bg-slate-700">
                      银行转账
                    </SelectItem>
                    <SelectItem value="finance_api" className="text-white hover:bg-slate-700" disabled>
                      分期付款（暂未启用）
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 备注 */}
              <div className="space-y-2">
                <Label className="text-slate-300">备注（可选）</Label>
                <Input
                  id="rental-notes"
                  name="rental-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="请输入备注信息"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* 费用明细 */}
              <div className="bg-slate-800/50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">月租金 × {rentalPeriod} 个月 × {rentalQuantity} 台：</span>
                  <span className="text-white">
                    ¥{(selectedEquipment.monthly_rental_price * rentalPeriod * rentalQuantity).toFixed(2)}
                  </span>
                </div>
                {selectedEquipment.deposit_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">押金 × {rentalQuantity} 台：</span>
                    <span className="text-white">
                      ¥{(selectedEquipment.deposit_amount * rentalQuantity).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-700">
                  <span className="text-white font-medium">总计：</span>
                  <span className="text-xl font-bold text-blue-400">
                    ¥{(
                      selectedEquipment.monthly_rental_price * rentalPeriod * rentalQuantity +
                      selectedEquipment.deposit_amount * rentalQuantity
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsRentalDialogOpen(false)}
              className="text-slate-400 hover:text-white"
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmitRental}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                "确认租赁"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </main>
  )
}

