"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Package,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Flame,
  Droplet,
  MapPin,
  Phone,
  Building2,
  RefreshCw,
} from "lucide-react"
import { ProductType, getProductTypeLabel, OrderStatus } from "@/lib/types/order"
import Link from "next/link"
import { getUserContext } from "@/lib/auth/user-context"

// 产品类型配置
const productTypes = [
  {
    id: ProductType.LPG,
    name: "液化气",
    icon: Flame,
    color: "from-orange-500 to-red-600",
    unit: "kg",
    defaultQuantity: 50,
    pricePerUnit: 11.5,
  },
  {
    id: ProductType.METHANOL,
    name: "甲醇",
    icon: Droplet,
    color: "from-blue-500 to-cyan-600",
    unit: "kg",
    defaultQuantity: 100,
    pricePerUnit: 3.5,
  },
  {
    id: ProductType.CLEAN_FUEL,
    name: "热能清洁燃料",
    icon: Flame,
    color: "from-green-500 to-emerald-600",
    unit: "L",
    defaultQuantity: 200,
    pricePerUnit: 7.5,
  },
  {
    id: ProductType.OUTDOOR_FUEL,
    name: "户外环保燃料",
    icon: Droplet,
    color: "from-purple-500 to-pink-600",
    unit: "L",
    defaultQuantity: 150,
    pricePerUnit: 6.0,
  },
]

interface RestaurantInfo {
  id: string
  name: string
  contact_name?: string
  contact_phone?: string
  address?: string
  company_id?: string
}

export default function CreateOrderPage() {
  const router = useRouter()
  
  // 表单状态
  const [orderNumber, setOrderNumber] = useState<string>("")
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null)
  const [quantity, setQuantity] = useState<number>(50)
  const [contactName, setContactName] = useState<string>("")
  const [contactPhone, setContactPhone] = useState<string>("")
  const [deliveryAddress, setDeliveryAddress] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  
  // 页面状态
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const [shadowWriteResult, setShadowWriteResult] = useState<string | null>(null)
  
  // 用户信息
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null)

  // 自动生成单号
  const generateOrderNumber = () => {
    return `ORD-${Date.now()}`
  }

  // 加载默认联系方式
  const loadDefaultContactInfo = async () => {
    try {
      setIsLoadingDefaults(true)
      
      // 获取用户上下文
      const userContext = await fetch('/api/user/context', {
        credentials: 'include'
      }).then(res => res.json())

      if (userContext.success && userContext.data) {
        // 从餐厅表获取默认信息
        const response = await fetch('/api/restaurants/current', {
          credentials: 'include'
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            const restaurant = result.data
            setRestaurantInfo(restaurant)
            
            // 自动填充默认联系方式
            if (!contactName && restaurant.contact_name) {
              setContactName(restaurant.contact_name)
            }
            if (!contactPhone && restaurant.contact_phone) {
              setContactPhone(restaurant.contact_phone)
            }
            if (!deliveryAddress && restaurant.address) {
              setDeliveryAddress(restaurant.address)
            }
            
            console.log('✅ 已自动填充默认联系方式')
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ 加载默认联系方式失败，用户需手动填写', err)
      // 不显示错误，让用户手动填写
    } finally {
      setIsLoadingDefaults(false)
    }
  }

  // 初始化
  useEffect(() => {
    // 自动生成单号
    setOrderNumber(generateOrderNumber())
    
    // 加载默认联系方式
    loadDefaultContactInfo()
  }, [])

  // 选择产品类型时更新默认数量
  useEffect(() => {
    if (selectedProductType) {
      const product = productTypes.find((p) => p.id === selectedProductType)
      if (product) {
        setQuantity(product.defaultQuantity)
      }
    }
  }, [selectedProductType])

  // 计算总价
  const calculateTotal = () => {
    if (!selectedProductType) return 0
    const product = productTypes.find((p) => p.id === selectedProductType)
    if (!product) return 0
    return quantity * product.pricePerUnit
  }

  // 验证表单
  const validateForm = () => {
    if (!selectedProductType) {
      return "请选择产品类型"
    }
    if (quantity <= 0) {
      return "请输入有效的数量"
    }
    if (!contactName.trim()) {
      return "请填写联系人姓名"
    }
    if (!contactPhone.trim()) {
      return "请填写联系电话"
    }
    if (!deliveryAddress.trim()) {
      return "请填写配送地址"
    }
    
    // 验证订单号
    if (!orderNumber.trim()) {
      return "订单号不能为空"
    }
    
    // 简单的电话号码验证
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(contactPhone.replace(/\D/g, ''))) {
      return "请填写正确的手机号码（以1开头的11位数字）"
    }
    
    // 验证餐厅信息
    if (!restaurantInfo) {
      return "无法获取餐厅信息，请刷新页面或重新登录"
    }
    
    return null
  }

  // 提交订单
  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError("")
    setShadowWriteResult(null)

    try {
      // 🔒 确保获取完整的用户上下文信息
      let currentRestaurantId = restaurantInfo?.id
      let currentCompanyId = restaurantInfo?.company_id
      
      // 如果餐厅信息不完整，重新获取用户上下文
      if (!currentRestaurantId) {
        console.log('🔍 餐厅信息不完整，重新获取用户上下文...')
        
        try {
          const userContextResponse = await fetch('/api/user/context', {
            credentials: 'include'
          })
          
          if (userContextResponse.ok) {
            const userContextResult = await userContextResponse.json()
            if (userContextResult.success) {
              currentCompanyId = userContextResult.data.companyId
              console.log('✅ 从用户上下文获取 company_id:', currentCompanyId)
            }
          }
          
          // 尝试重新获取餐厅信息
          const restaurantResponse = await fetch('/api/restaurants/current', {
            credentials: 'include'
          })
          
          if (restaurantResponse.ok) {
            const restaurantResult = await restaurantResponse.json()
            if (restaurantResult.success && restaurantResult.data) {
              currentRestaurantId = restaurantResult.data.id
              currentCompanyId = restaurantResult.data.company_id || currentCompanyId
              console.log('✅ 重新获取餐厅信息:', { currentRestaurantId, currentCompanyId })
            }
          }
        } catch (contextError) {
          console.warn('⚠️ 获取用户上下文失败:', contextError)
        }
      }

      // 验证必要的ID
      if (!currentRestaurantId) {
        throw new Error("无法获取餐厅信息，请重新登录或联系管理员")
      }

      const product = productTypes.find((p) => p.id === selectedProductType)
      const totalAmount = calculateTotal()

      console.log('🔄 开始创建订单...', {
        orderNumber,
        currentRestaurantId,
        currentCompanyId,
        productType: selectedProductType,
        quantity,
        totalAmount,
        restaurantInfo
      })

      const requestBody = {
        order_number: orderNumber, // 使用生成的单号
        restaurant_id: currentRestaurantId,
        company_id: currentCompanyId, // 添加 company_id
        product_type: selectedProductType,
        service_type: `${product?.name || "燃料配送"} - ${quantity}${product?.unit || "kg"}`,
        status: "pending",
        amount: totalAmount,
        total_amount: totalAmount,
        contact_name: contactName,
        contact_phone: contactPhone,
        delivery_address: deliveryAddress,
        notes: notes,
      }

      console.log('📤 订单请求体:', requestBody)
      
      // 最后验证关键字段
      if (!requestBody.restaurant_id || !requestBody.order_number) {
        throw new Error("关键信息缺失：餐厅ID或订单号为空")
      }

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()
      console.log('📝 订单创建API响应:', result)

      if (!response.ok || result.error) {
        throw new Error(result.error || `订单创建失败 (${response.status})`)
      }

      // 验证影子写入：检查 order_main 表中是否有对应记录
      try {
        console.log('🔍 验证影子写入...')
        
        const verifyResponse = await fetch(`/api/orders/main/list?order_number=${orderNumber}`, {
          credentials: 'include'
        })
        
        if (verifyResponse.ok) {
          const verifyResult = await verifyResponse.json()
          
          if (verifyResult.success && verifyResult.data && verifyResult.data.length > 0) {
            const mainOrder = verifyResult.data[0]
            setShadowWriteResult(`✅ 影子写入成功！订单已同步到统一表，order_main.id = ${mainOrder.id}`)
            console.log('✅ 影子写入验证成功:', mainOrder)
          } else {
            setShadowWriteResult(`⚠️ 影子写入可能失败，统一订单表中未找到记录`)
            console.warn('⚠️ 影子写入验证失败')
          }
        }
      } catch (verifyError) {
        console.warn('⚠️ 影子写入验证异常:', verifyError)
        setShadowWriteResult(`⚠️ 影子写入状态未知：${verifyError}`)
      }

      setCreatedOrderId(result.data.id)
      setSuccess(true)

      console.log('✅ 订单创建成功！', result.data)

      // 5秒后跳转到订单列表
      setTimeout(() => {
        router.push("/orders")
      }, 5000)
      
    } catch (err: any) {
      console.error('❌ 订单创建失败:', err)
      
      let userFriendlyMessage = "订单创建失败，请重试"
      
      // 根据不同错误类型提供友好提示
      if (err.message?.includes('401')) {
        userFriendlyMessage = "登录已过期，请重新登录后再试"
      } else if (err.message?.includes('403')) {
        userFriendlyMessage = "没有创建订单的权限，请联系管理员"
      } else if (err.message?.includes('500')) {
        userFriendlyMessage = "服务器暂时繁忙，请稍后重试"
      } else if (err.message?.includes('网络')) {
        userFriendlyMessage = "网络连接异常，请检查网络后重试"
      } else if (err.message) {
        userFriendlyMessage = `创建失败：${err.message}`
      }
      
      setError(userFriendlyMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 重新生成单号
  const handleRegenerateOrderNumber = () => {
    setOrderNumber(generateOrderNumber())
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 backdrop-blur-lg border-b border-blue-800/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/orders">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white">创建订单</h1>
                <p className="text-xs text-blue-400">完善信息后创建燃料配送订单</p>
              </div>
            </div>
            
            {/* 导航按钮组 */}
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <Building2 className="h-4 w-4 mr-2" />
                  返回首页
                </Button>
              </Link>
              <Link href="/orders">
                <Button variant="outline" size="sm" className="text-white border-blue-500 hover:bg-blue-500/20">
                  <Package className="h-4 w-4 mr-2" />
                  订单列表
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 面包屑导航 */}
        <nav className="flex items-center text-sm text-blue-400">
          <Link href="/" className="hover:text-white transition-colors">
            首页
          </Link>
          <span className="mx-2">/</span>
          <Link href="/orders" className="hover:text-white transition-colors">
            订单管理
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white">创建订单</span>
        </nav>

        {/* 成功提示 */}
        {success && (
          <Card semanticLevel="system_hint" className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-400 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-400 mb-2">订单创建成功！</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-green-300">📝 订单号: {orderNumber}</p>
                    <p className="text-green-300">🆔 订单ID: {createdOrderId}</p>
                    {shadowWriteResult && (
                      <p className="text-green-300">{shadowWriteResult}</p>
                    )}
                    <p className="text-green-300 mt-3">5秒后自动跳转到订单列表</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <AlertDescription className="text-red-400 ml-2">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* 订单基本信息 */}
        <Card semanticLevel="action" className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-400" />
              订单基本信息
            </CardTitle>
            <CardDescription className="text-slate-400">
              订单号会自动生成，您也可以手动修改
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="orderNumber" className="text-slate-300">订单号</Label>
                <Input
                  id="orderNumber"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white"
                  placeholder="自动生成的订单号"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRegenerateOrderNumber}
                className="mt-6 border-slate-600 hover:bg-slate-700"
                title="重新生成订单号"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            {restaurantInfo && (
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">关联餐厅</p>
                <p className="text-white font-medium">{restaurantInfo.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 产品类型选择 */}
        <Card semanticLevel="action" className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">选择产品类型</CardTitle>
            <CardDescription className="text-slate-400">
              请选择您需要的燃料类型
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {productTypes.map((product) => {
                const Icon = product.icon
                const isSelected = selectedProductType === product.id

                return (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProductType(product.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/30"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    }`}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${product.color} rounded-xl flex items-center justify-center mb-3 mx-auto`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-center font-semibold text-white mb-1">{product.name}</h3>
                    <p className="text-center text-xs text-slate-400">
                      ¥{product.pricePerUnit}/{product.unit}
                    </p>
                    {isSelected && (
                      <div className="mt-2 flex justify-center">
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                          已选择
                        </Badge>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* 数量和价格 */}
        {selectedProductType && (
          <Card semanticLevel="action" className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">数量和价格</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="quantity" className="text-slate-300">
                  数量 ({productTypes.find((p) => p.id === selectedProductType)?.unit || "kg"})
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="bg-slate-800/50 border-slate-700 text-white"
                  placeholder="请输入数量"
                />
              </div>

              {/* 价格预览 */}
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">单价</span>
                  <span className="text-white font-medium">
                    ¥{productTypes.find((p) => p.id === selectedProductType)?.pricePerUnit.toFixed(2)}
                    /{productTypes.find((p) => p.id === selectedProductType)?.unit}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">数量</span>
                  <span className="text-white font-medium">{quantity}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-white">总计</span>
                    <span className="text-2xl font-bold text-green-400">
                      ¥{calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 联系信息 */}
        <Card semanticLevel="action" className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-400" />
              联系信息
            </CardTitle>
            <CardDescription className="text-slate-400">
              {isLoadingDefaults ? (
                <>
                  <Loader2 className="inline h-4 w-4 animate-spin mr-1" />
                  正在自动填充默认信息...
                </>
              ) : (
                restaurantInfo ? "已自动填充餐厅默认信息，您可以修改" : "请填写联系信息"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactName" className="text-slate-300">联系人姓名 *</Label>
                <Input
                  id="contactName"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white"
                  placeholder="请输入联系人姓名"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone" className="text-slate-300">联系电话 *</Label>
                <Input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white"
                  placeholder="请输入手机号码"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="deliveryAddress" className="text-slate-300 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                配送地址 *
              </Label>
              <Textarea
                id="deliveryAddress"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white"
                placeholder="请输入详细的配送地址"
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="notes" className="text-slate-300">备注信息</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white"
                placeholder="其他需要说明的信息（可选）"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        {!success && (
          <Card semanticLevel="action" className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedProductType || quantity <= 0}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white h-12 text-lg font-semibold shadow-lg shadow-green-500/30"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    确认下单
                  </>
                )}
              </Button>
              <p className="text-xs text-slate-400 text-center mt-3">
                订单创建后将同步到统一订单管理系统，并自动派单给配送员
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}