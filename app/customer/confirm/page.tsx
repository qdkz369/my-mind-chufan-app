"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  User,
  Phone,
  Package,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrderStatusLabel } from "@/lib/types/order"
import Link from "next/link"
import { logBusinessWarning } from "@/lib/utils/logger"

export default function CustomerConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("order_id")
  const deviceId = searchParams.get("device_id")

  const [order, setOrder] = useState<any>(null)
  const [restaurant, setRestaurant] = useState<any>(null)
  const [device, setDevice] = useState<any>(null)
  const [pendingDevices, setPendingDevices] = useState<Array<any>>([])
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // 获取餐厅ID
  useEffect(() => {
    if (typeof window === "undefined") return
    const rid = localStorage.getItem("restaurantId")
    setRestaurantId(rid)
  }, [])

  // 加载订单信息或设备信息
  useEffect(() => {
    if (!supabase) {
      setError("数据库连接失败")
      setIsLoading(false)
      return
    }

    const loadInfo = async () => {
      try {
        setIsLoading(true)
        setError("")

        // 如果有订单ID，加载订单信息（原有逻辑）
        if (orderId) {
          // 查询订单（需要判断是报修工单还是配送订单）
          // 先尝试查询 delivery_orders（配送订单）
          let { data: orderData, error: orderError } = await supabase
            .from("delivery_orders")
            .select("*")
            .eq("id", orderId)
            .single()
          
          // 如果 delivery_orders 中不存在，尝试查询 repair_orders（报修工单）
          if (orderError || !orderData) {
            const repairResult = await supabase
              .from("repair_orders")
              .select("*")
              .eq("id", orderId)
              .single()
            
            if (!repairResult.error && repairResult.data) {
              orderData = repairResult.data
              orderError = null
            } else {
              orderError = repairResult.error || orderError
            }
          }

          if (orderError || !orderData) {
            setError("订单不存在")
            setIsLoading(false)
            return
          }

          // 验证订单状态（使用小写字符串）
          if (orderData.status !== "pending_acceptance") {
            setError(`订单状态为 ${getOrderStatusLabel(orderData.status as any)}，无法确认验收`)
            setIsLoading(false)
            return
          }

          setOrder(orderData)

          // 查询餐厅信息
          if (orderData.restaurant_id) {
            const { data: restaurantData } = await supabase
              .from("restaurants")
              .select("id, name, contact_name, contact_phone, address")
              .eq("id", orderData.restaurant_id)
              .single()

            if (restaurantData) {
              setRestaurant(restaurantData)
            }
          }

          // 查询设备信息（如果有）
          if (orderData.restaurant_id) {
            const { data: deviceData } = await supabase
              .from("devices")
              .select("device_id, model, address, installer, install_date")
              .eq("restaurant_id", orderData.restaurant_id)
              .limit(1)
              .single()

            if (deviceData) {
              setDevice(deviceData)
            }
          }

          setIsLoading(false)
          return
        }

        // 如果没有订单ID，加载待确认的设备列表
        if (!restaurantId) {
          setError("请先登录")
          setIsLoading(false)
          return
        }

        // 查询餐厅信息
        const { data: restaurantData } = await supabase
          .from("restaurants")
          .select("id, name, contact_name, contact_phone, address")
          .eq("id", restaurantId)
          .single()

        if (restaurantData) {
          setRestaurant(restaurantData)
        }

        // 查询待确认的设备（状态为 online 或 pending_acceptance）
        const { data: devicesData, error: devicesError } = await supabase
          .from("devices")
          .select("device_id, model, address, installer, install_date, status, created_at")
          .eq("restaurant_id", restaurantId)
          .in("status", ["online", "pending_acceptance"])
          .order("install_date", { ascending: false })

        if (devicesError) {
          logBusinessWarning('客户确认', '查询设备失败', devicesError)
          setError("查询设备失败")
          setIsLoading(false)
          return
        }

        if (!devicesData || devicesData.length === 0) {
          setError("暂无待确认的设备")
          setIsLoading(false)
          return
        }

        setPendingDevices(devicesData)

        // 如果指定了 device_id，选择该设备
        if (deviceId) {
          const selectedDevice = devicesData.find((d) => d.device_id === deviceId)
          if (selectedDevice) {
            setDevice(selectedDevice)
          }
        } else if (devicesData.length === 1) {
          // 如果只有一个设备，自动选择
          setDevice(devicesData[0])
        }
      } catch (err: any) {
        logBusinessWarning('客户确认', '加载信息失败', err)
        setError(err.message || "加载失败")
      } finally {
        setIsLoading(false)
      }
    }

    loadInfo()
  }, [orderId, restaurantId, deviceId, supabase])

  // 确认验收
  const handleConfirm = async (targetDeviceId?: string) => {
    const confirmDeviceId = targetDeviceId || device?.device_id

    if (!confirmDeviceId && !orderId) {
      setError("请选择要确认的设备")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      // 如果有订单ID，使用订单确认API
      if (orderId) {
        const response = await fetch("/api/orders/accept", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_id: orderId,
          }),
        })

        const result = await response.json()

        if (!response.ok || result.error) {
          throw new Error(result.error || "确认验收失败")
        }

        setSuccess(true)
        // 3秒后跳转到主页
        setTimeout(() => {
          router.push("/")
        }, 3000)
        return
      }

      // 如果没有订单ID，直接更新设备状态
      if (!supabase || !confirmDeviceId) {
        throw new Error("缺少必要信息")
      }

      // 更新设备状态为 active
      const { error: updateError } = await supabase
        .from("devices")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("device_id", confirmDeviceId)

      if (updateError) {
        throw new Error(updateError.message || "更新设备状态失败")
      }

      setSuccess(true)
      
      // 从待确认列表中移除已确认的设备
      setPendingDevices(pendingDevices.filter((d) => d.device_id !== confirmDeviceId))
      
      // 如果当前选择的设备被确认，清空选择
      if (device?.device_id === confirmDeviceId) {
        setDevice(null)
      }

      // 3秒后刷新页面或跳转
      setTimeout(() => {
        if (pendingDevices.length <= 1) {
          router.push("/")
        } else {
          // 如果还有其他设备，刷新页面
          window.location.reload()
        }
      }, 3000)
    } catch (err: any) {
      logBusinessWarning('客户确认', '确认验收失败', err)
      setError(err.message || "确认验收失败")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-slate-400">加载中...</p>
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <Card className="bg-slate-900/90 border-red-500/50 p-6 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <h2 className="text-xl font-bold text-white">加载失败</h2>
          </div>
          <p className="text-slate-400 mb-4">{error}</p>
          <Link href="/orders">
            <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 text-white">
              返回订单列表
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 backdrop-blur-lg border-b border-blue-800/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/orders">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">确认验收</h1>
              <p className="text-xs text-blue-400">请确认安装信息无误</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 成功提示 */}
        {success && (
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
              <div>
                <h3 className="text-lg font-bold text-green-400">验收确认成功！</h3>
                <p className="text-sm text-green-300">3秒后自动跳转到订单列表</p>
              </div>
            </div>
          </Card>
        )}

        {/* 错误提示 */}
        {error && (
          <Card className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </Card>
        )}

        {/* 订单信息 */}
        {order && (
          <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">订单信息</h2>
                  <p className="text-sm text-slate-400">订单号: {order.id}</p>
                </div>
              </div>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                {getOrderStatusLabel(order.status as any)}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                <Clock className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-sm text-slate-400">创建时间</p>
                  <p className="text-white font-medium">
                    {new Date(order.created_at).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                <Package className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-sm text-slate-400">服务类型</p>
                  <p className="text-white font-medium">{order.service_type || "设备安装"}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 餐厅信息 */}
        {restaurant && (
          <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">餐厅信息</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span className="text-white">{restaurant.name}</span>
              </div>
              {restaurant.contact_name && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-300">{restaurant.contact_name}</span>
                </div>
              )}
              {restaurant.contact_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-300">{restaurant.contact_phone}</span>
                </div>
              )}
              {restaurant.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-400 mt-1" />
                  <span className="text-slate-300">{restaurant.address}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 待确认设备列表 */}
        {!orderId && pendingDevices.length > 0 && (
          <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">待确认设备 ({pendingDevices.length})</h3>
            </div>

            <div className="space-y-3">
              {pendingDevices.map((dev) => (
                <Card
                  key={dev.device_id}
                  className={`p-4 cursor-pointer transition-all ${
                    device?.device_id === dev.device_id
                      ? "bg-blue-500/20 border-blue-500/50"
                      : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70"
                  }`}
                  onClick={() => setDevice(dev)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-blue-400" />
                        <span className="font-medium text-white">{dev.device_id}</span>
                        {device?.device_id === dev.device_id && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                            已选择
                          </Badge>
                        )}
                      </div>
                      {dev.model && (
                        <p className="text-sm text-slate-400 mb-1">型号: {dev.model}</p>
                      )}
                      {dev.address && (
                        <p className="text-sm text-slate-400 mb-1">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {dev.address}
                        </p>
                      )}
                      {dev.installer && (
                        <p className="text-sm text-slate-500">
                          <User className="h-3 w-3 inline mr-1" />
                          安装人: {dev.installer}
                        </p>
                      )}
                      {dev.install_date && (
                        <p className="text-xs text-slate-500 mt-1">
                          安装时间: {new Date(dev.install_date).toLocaleString("zh-CN")}
                        </p>
                      )}
                    </div>
                    {device?.device_id === dev.device_id && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleConfirm(dev.device_id)
                        }}
                        disabled={isSubmitting || success}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "确认"
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {/* 设备信息（已选择的设备或订单关联的设备） */}
        {device && (
          <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">设备信息</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">设备ID:</span>
                <span className="text-white font-medium">{device.device_id}</span>
              </div>
              {device.model && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">型号:</span>
                  <span className="text-slate-300">{device.model}</span>
                </div>
              )}
              {device.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-400 mt-1" />
                  <div>
                    <p className="text-sm text-slate-400">安装地址</p>
                    <p className="text-slate-300">{device.address}</p>
                  </div>
                </div>
              )}
              {device.installer && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">安装人:</span>
                  <span className="text-slate-300">{device.installer}</span>
                </div>
              )}
              {device.install_date && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">安装日期:</span>
                  <span className="text-slate-300">
                    {new Date(device.install_date).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 确认按钮 */}
        {!success && device && (
          <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
            <Button
              onClick={() => handleConfirm()}
              disabled={isSubmitting || success}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white h-12 text-lg font-semibold shadow-lg shadow-green-500/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  确认中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  {orderId ? "确认验收" : "确认设备验收"}
                </>
              )}
            </Button>
            <p className="text-xs text-slate-400 text-center mt-3">
              {orderId 
                ? "确认后，订单将进入\"已激活\"状态，可以开始下单"
                : "确认后，设备将进入\"已激活\"状态，可以开始使用"}
            </p>
          </Card>
        )}

        {/* 提示：如果没有选择设备 */}
        {!success && !orderId && !device && pendingDevices.length > 0 && (
          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <p className="text-sm text-yellow-400">请从上方列表中选择要确认的设备</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

