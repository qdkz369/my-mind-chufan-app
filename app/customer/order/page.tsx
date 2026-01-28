"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Package,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Flame,
  Droplet,
} from "lucide-react"
import { ProductType, getProductTypeLabel, OrderStatus } from "@/lib/types/order"
import Link from "next/link"
import { logBusinessWarning } from "@/lib/utils/logger"

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

export default function CustomerOrderPage() {
  const router = useRouter()
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null)
  const [quantity, setQuantity] = useState<number>(50)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)

  // 加载餐厅ID
  useEffect(() => {
    const rid = localStorage.getItem("restaurantId")
    if (!rid) {
      setError("请先登录")
      return
    }
    setRestaurantId(rid)
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

  // 提交订单
  const handleSubmit = async () => {
    if (!selectedProductType) {
      setError("请选择产品类型")
      return
    }

    if (!restaurantId) {
      setError("请先登录")
      return
    }

    if (quantity <= 0) {
      setError("请输入有效的数量")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const product = productTypes.find((p) => p.id === selectedProductType)
      const totalAmount = calculateTotal()

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          product_type: selectedProductType,
          service_type: `${product?.name || "燃料配送"} - ${quantity}${product?.unit || "kg"}`,
          status: "pending", // 创建后为待处理状态，与管理端保持一致
          amount: totalAmount,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || "创建订单失败")
      }

      setOrderId(result.data.id)
      setSuccess(true)

      // 3秒后跳转到订单列表
      setTimeout(() => {
        router.push("/orders")
      }, 3000)
    } catch (err: any) {
      logBusinessWarning('客户订单', '创建订单失败', err)
      setError(err.message || "创建订单失败")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 backdrop-blur-lg border-b border-blue-800/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">创建订单</h1>
              <p className="text-xs text-blue-400">选择产品类型和数量</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 成功提示 */}
        {success && (
          <Card semanticLevel="action" className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
              <div>
                <h3 className="text-lg font-bold text-green-400">订单创建成功！</h3>
                <p className="text-sm text-green-300">订单号: {orderId}</p>
                <p className="text-sm text-green-300 mt-1">3秒后自动跳转到订单列表</p>
              </div>
            </div>
          </Card>
        )}

        {/* 错误提示 */}
        {error && (
          <Card semanticLevel="system_hint" className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </Card>
        )}

        {/* 产品类型选择 */}
        <Card semanticLevel="action" className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">选择产品类型</h2>
              <p className="text-sm text-slate-400">请选择您需要的燃料类型</p>
            </div>
          </div>

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
        </Card>

        {/* 数量输入 */}
        {selectedProductType && (
          <Card semanticLevel="action" className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="quantity" className="text-slate-300 mb-2 block">
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
            </div>
          </Card>
        )}

        {/* 提交按钮 */}
        {!success && (
          <Card semanticLevel="action" className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
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
                  创建订单
                </>
              )}
            </Button>
            <p className="text-xs text-slate-400 text-center mt-3">
              订单创建后，系统将自动派单给对应类型的配送员
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

