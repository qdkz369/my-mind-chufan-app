"use client"

import {
  Bell,
  Search,
  Zap,
  Flame,
  TrendingDown,
  TrendingUp,
  Activity,
  Wrench,
  ArrowRight,
  Package,
  Droplet,
  ShoppingCart,
  HardHat,
  Clock,
  CheckCircle2,
  Home,
  Grid3x3,
  FileText,
  User,
  Crown,
  Star,
  Gift,
  Percent,
  Gauge,
  Truck,
  Lock,
  Unlock,
  QrCode,
  X,
  AlertCircle,
  Mic,
  MicOff,
  Play,
  Pause,
  Trash2,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useEffect, useState, useRef } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { QRCodeSVG } from "qrcode.react"

// Notification Bell Component - 通知铃铛组件
function NotificationBell({ 
  restaurantId, 
  onInstallationClick 
}: { 
  restaurantId: string | null
  onInstallationClick?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: 'installation' | 'order' | 'system'
    title: string
    message: string
    time: string
    deviceId?: string
    deviceAddress?: string
    installer?: string
  }>>([])
  const [isLoading, setIsLoading] = useState(false)

  // 加载通知
  useEffect(() => {
    if (!restaurantId || !supabase) return

    const loadNotifications = async () => {
      setIsLoading(true)
      try {
        // 查询待确认的设备安装
        const { data: devices, error } = await supabase
          .from("devices")
          .select("device_id, address, installer, install_date, status, created_at")
          .eq("restaurant_id", restaurantId)
          .in("status", ["online", "pending_acceptance"])
          .order("created_at", { ascending: false })
          .limit(10)

        if (error) {
          console.error("[通知] 加载设备失败:", error)
          return
        }

        // 转换为通知格式
        const deviceNotifications = (devices || []).map((device) => ({
          id: device.device_id,
          type: 'installation' as const,
          title: "设备安装完成",
          message: `设备 ${device.device_id} 已安装完成，请确认验收`,
          time: device.install_date || device.created_at || new Date().toISOString(),
          deviceId: device.device_id,
          deviceAddress: device.address || "",
          installer: device.installer || "",
        }))

        setNotifications(deviceNotifications)
      } catch (error) {
        console.error("[通知] 加载失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadNotifications()

    // 每30秒刷新一次
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [restaurantId])

  const unreadCount = notifications.length

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="text-white hover:bg-white/10 relative"
        onClick={() => setIsOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 text-white text-xs border-0">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* 通知弹窗 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 遮罩层 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            {/* 弹窗内容 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="fixed top-16 right-4 z-[101] w-96 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 标题栏 */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                <h3 className="text-lg font-bold text-white">通知</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 通知列表 */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 border-2 border-slate-600 border-t-white rounded-full animate-spin mb-2" />
                    <p className="text-sm">加载中...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">暂无通知</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (notification.type === 'installation' && onInstallationClick) {
                            onInstallationClick()
                            setIsOpen(false)
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {notification.type === 'installation' ? (
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                                <CheckCircle2 className="h-5 w-5 text-blue-400" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-slate-500/20 to-slate-600/20 rounded-lg flex items-center justify-center border border-slate-500/30">
                                <AlertCircle className="h-5 w-5 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-white mb-1">
                              {notification.title}
                            </h4>
                            <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            {notification.deviceAddress && (
                              <p className="text-xs text-slate-500 mb-1">
                                地址: {notification.deviceAddress}
                              </p>
                            )}
                            {notification.installer && (
                              <p className="text-xs text-slate-500 mb-1">
                                安装人: {notification.installer}
                              </p>
                            )}
                            <p className="text-xs text-slate-500">
                              {new Date(notification.time).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 底部操作 */}
              {notifications.length > 0 && (
                <div className="p-4 border-t border-slate-700/50">
                  <Button
                    variant="ghost"
                    className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
                    onClick={() => {
                      if (onInstallationClick) {
                        onInstallationClick()
                        setIsOpen(false)
                      }
                    }}
                  >
                    查看待确认设备
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// No Device Dialog Component - 无设备提示对话框
function NoDeviceDialog({ isOpen, onClose }: {
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* 弹出层内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl p-6 max-w-sm w-full border border-slate-700/50 shadow-2xl">
              {/* 关闭按钮 */}
              <div className="flex justify-end mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* 图标和标题 */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-zinc-500/20 to-zinc-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-500/30">
                  <Package className="h-8 w-8 text-zinc-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">欢迎！</h2>
                <p className="text-sm text-slate-400">您的餐厅已建立数字档案</p>
              </div>

              {/* 提示内容 */}
              <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-300 leading-relaxed text-center">
                  请联系服务商绑定设备以开启完整功能。
                </p>
              </div>

              {/* 确认按钮 */}
              <Button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white"
              >
                我知道了
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// QR Code Modal Component - 餐厅专属通行码弹窗
function QRCodeModal({ isOpen, onClose, qrToken }: {
  isOpen: boolean
  onClose: () => void
  qrToken: string | null
}) {
  if (!isOpen) return null

  // 二维码内容：使用 qr_token（如果为空则显示提示）
  const qrCodeValue = qrToken || ""

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* 弹出层内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl p-8 max-w-md w-full border border-[#4ade80]/30 shadow-2xl shadow-[#4ade80]/20">
              {/* 关闭按钮 */}
              <div className="flex justify-end mb-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* 顶部标题 */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">您的餐厅专属通行码</h2>
              </div>

              {/* 中间二维码 - 白底黑码，尺寸够大 */}
              <div className="flex justify-center mb-8">
                {qrToken ? (
                  <div className="bg-white p-6 rounded-xl shadow-2xl border-2 border-slate-700">
                    <QRCodeSVG
                      value={qrCodeValue}
                      size={280}
                      level="H"
                      includeMargin={true}
                      fgColor="#000000"
                      bgColor="#ffffff"
                    />
                  </div>
                ) : (
                  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <p className="text-slate-400 text-center">二维码令牌生成中...</p>
                  </div>
                )}
              </div>

              {/* 底部提示文字 */}
              <div className="text-center">
                <p className="text-sm text-slate-300 leading-relaxed">
                  请向配送员出示此码以进行燃料加注
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Header Component
function Header() {
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [isNoDeviceDialogOpen, setIsNoDeviceDialogOpen] = useState(false)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [restaurantStatus, setRestaurantStatus] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingToken, setIsGeneratingToken] = useState(false)
  const [deviceCount, setDeviceCount] = useState<number>(0) // 设备数量

  // 检查登录状态并获取餐厅信息 - 防空逻辑：只要页面加载就显示图标
  useEffect(() => {
    const loadRestaurantInfo = async () => {
      try {
        setIsLoading(true)
        // 从 localStorage 获取餐厅ID（优先使用注册信息）
        const restaurantId = localStorage.getItem("restaurantId")
        
        console.log("[QR Code] 检查餐厅ID:", restaurantId)
        
        // 防空逻辑：只要页面加载就显示二维码图标，不检查是否已登录
        // 如果未登录，点击时会提示"请先完成注册"
        setIsLoggedIn(true) // 始终显示图标
        if (restaurantId) {
          setRestaurantId(restaurantId)
        }
        
        // 如果没有 restaurantId，直接返回（图标仍然显示，点击时会提示注册）
        if (!restaurantId) {
          console.log("[QR Code] 未找到餐厅ID，图标仍显示，点击时会提示注册")
          setDeviceCount(0) // 默认设备数为0，图标显示为灰色
          setIsLoading(false)
          return
        }

        // 如果 Supabase 未配置，使用临时数据
        if (!supabase) {
          console.warn("[QR Code] Supabase未配置，使用临时数据")
          setRestaurantName("未设置")
          setRestaurantStatus("unactivated")
          setDeviceCount(0) // 未配置时默认设备数为0，图标显示为灰色
          setIsLoading(false)
          return
        }

        // 获取餐厅详细信息
        const { data: restaurantData, error: restaurantError } = await supabase!
          .from("restaurants")
          .select("id, name, qr_token, status")
          .eq("id", restaurantId)
          .single()

        console.log("[QR Code] 餐厅查询结果:", { restaurantData, restaurantError })

        if (!restaurantError && restaurantData) {
          setRestaurantId(restaurantData.id)
          setQrToken(restaurantData.qr_token || null)
          setRestaurantName(restaurantData.name || null)
          setRestaurantStatus(restaurantData.status || "unactivated")
          console.log("[QR Code] 餐厅信息加载成功:", {
            id: restaurantData.id,
            name: restaurantData.name,
            status: restaurantData.status,
            hasToken: !!restaurantData.qr_token
          })
        } else {
          // 如果餐厅信息不存在，至少设置基本信息
          setRestaurantName("未设置")
          setRestaurantStatus("unactivated")
          console.log("[QR Code] 使用餐厅ID（未找到详细信息）:", restaurantId)
        }

        // 查询当前餐厅的设备数量
        const { count, error: deviceCountError } = await supabase!
          .from("devices")
          .select("*", { count: "exact", head: true })
          .eq("restaurant_id", restaurantId)

        if (!deviceCountError && count !== null) {
          setDeviceCount(count)
          console.log("[QR Code] 设备数量:", count)
        } else {
          console.error("[QR Code] 查询设备数量失败:", deviceCountError)
          setDeviceCount(0) // 默认设为0
        }
      } catch (error) {
        console.error("[QR Code] 加载餐厅信息失败:", error)
        // 防空逻辑：即使加载失败，图标仍然显示
        setDeviceCount(0) // 默认设备数为0，图标显示为灰色
      } finally {
        setIsLoading(false)
      }
    }

    loadRestaurantInfo()
  }, [])

  // 处理二维码图标点击 - 点击绿色呼吸灯图标时弹出二维码弹窗
  const handleQRCodeClick = async () => {
    // 防空逻辑：如果点击时还没登录，弹窗提示
    const currentRestaurantId = restaurantId || localStorage.getItem("restaurantId")
    
    if (!currentRestaurantId) {
      alert("请先完成注册")
      return
    }

    console.log("[QR Code] 点击二维码按钮，餐厅ID:", currentRestaurantId, "当前Token:", qrToken)
    
    // 如果没有 qr_token，先生成一个
    if (!qrToken) {
      setIsGeneratingToken(true)
      try {
        const response = await fetch("/api/restaurant/generate-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: currentRestaurantId,
          }),
        })

        const result = await response.json()

        if (result.success && result.data) {
          console.log("[QR Code] Token生成成功:", result.data.qr_token)
          setQrToken(result.data.qr_token)
          if (result.data.name) {
            setRestaurantName(result.data.name)
          }
          // Token生成成功后打开弹窗
          setIsQRModalOpen(true)
        } else {
          console.error("[QR Code] Token生成失败:", result.error)
          alert("生成二维码令牌失败: " + (result.error || "未知错误"))
        }
      } catch (error) {
        console.error("[QR Code] 生成Token时出错:", error)
        alert("生成二维码令牌时出错，请重试")
      } finally {
        setIsGeneratingToken(false)
      }
    } else {
      // 如果已有 token，直接打开弹窗
      setIsQRModalOpen(true)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 backdrop-blur-lg border-b border-blue-800/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shadow-red-500/30">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <h1 className="text-lg font-bold leading-tight text-white">我的智能餐厅</h1>
                  <p className="text-xs text-blue-400">IoT智能餐饮服务平台</p>
                </div>
                {/* 调试信息 - 开发时可见 */}
                {process.env.NODE_ENV === "development" && (
                  <div className="ml-2 text-xs text-slate-500">
                    {isLoading ? "加载中..." : isLoggedIn ? "已登录" : "未登录"}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 二维码图标 - 放在搜索图标左侧，带心电图脉冲特效和轻微外发光 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleQRCodeClick}
                disabled={isGeneratingToken}
                className="relative text-white hover:bg-white/10 transition-all overflow-visible group"
                title={isGeneratingToken ? "正在生成令牌..." : deviceCount === 0 ? "查看提示信息" : "查看身份二维码"}
              >
                {isGeneratingToken ? (
                  <div className={`h-5 w-5 border-2 border-t-transparent rounded-full animate-spin relative z-10 ${restaurantId ? 'border-[#4ade80]' : 'border-slate-500'}`} />
                ) : (
                  <QrCode className={`h-5 w-5 relative z-10 transition-all group-hover:scale-110 ${restaurantId ? 'text-[#4ade80] animate-pulse drop-shadow-[0_0_12px_rgba(74,222,128,0.8),0_0_20px_rgba(74,222,128,0.4)]' : 'text-slate-500'}`} />
                )}
              </Button>
              
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <Search className="h-5 w-5" />
              </Button>
              <NotificationBell 
                restaurantId={restaurantId}
                onInstallationClick={() => {
                  // 点击安装通知时，可以跳转到确认页面或显示详情
                  window.location.href = "/customer/confirm"
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* 二维码弹出层 - 餐厅专属通行码 */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        qrToken={qrToken}
      />

      {/* 无设备提示对话框 */}
      <NoDeviceDialog
        isOpen={isNoDeviceDialogOpen}
        onClose={() => setIsNoDeviceDialogOpen(false)}
      />
    </>
  )
}

// IoT Dashboard Component
function IoTDashboard() {
  const [fuelLevel, setFuelLevel] = useState(68)
  const [consumption, setConsumption] = useState(12.5)
  const [isLoading, setIsLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [deviceId, setDeviceId] = useState<string>("default")
  const [deviceCount, setDeviceCount] = useState(0)
  const [onlineDeviceCount, setOnlineDeviceCount] = useState(0)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [devices, setDevices] = useState<Array<{device_id: string, status: string}>>([])
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false)
  const [repairDescription, setRepairDescription] = useState("")
  const [repairDeviceId, setRepairDeviceId] = useState<string>("")
  const [repairUrgency, setRepairUrgency] = useState<"low" | "medium" | "high">("medium")
  const [isSubmittingRepair, setIsSubmittingRepair] = useState(false)
  const [repairHistory, setRepairHistory] = useState<Array<{
    id: string
    service_type: string
    status: string
    created_at: string
    amount: number
  }>>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [repairTab, setRepairTab] = useState<"submit" | "history">("submit")
  // 语音录制相关状态
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUploadUrl, setAudioUploadUrl] = useState<string | null>(null)
  const [playbackProgress, setPlaybackProgress] = useState(0) // 播放进度（0-100）
  const [playbackTime, setPlaybackTime] = useState(0) // 当前播放时间（秒）
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 获取 restaurantId
    if (typeof window !== "undefined") {
      const rid = localStorage.getItem("restaurantId")
      setRestaurantId(rid)
    }
  }, [])

  useEffect(() => {
    // 加载设备数据
    const loadDeviceData = async () => {
      if (!restaurantId || !supabase) return

      try {
        // 查询该餐厅绑定的所有设备
        const { data: devices, error } = await supabase
          .from("devices")
          .select("device_id, status")
          .eq("restaurant_id", restaurantId)

        if (error) {
          console.error("[我的设备] 查询失败:", error)
          return
        }

        if (devices) {
          const totalCount = devices.length
          const onlineCount = devices.filter(d => d.status === "online").length
          setDeviceCount(totalCount)
          setOnlineDeviceCount(onlineCount)
          setDevices(devices) // 保存设备列表供报修使用
        }
      } catch (error) {
        console.error("[我的设备] 加载失败:", error)
      }
    }

    loadDeviceData()
  }, [restaurantId])

  useEffect(() => {
    // 加载燃料剩余百分比和锁机状态
    const loadFuelData = async () => {
      try {
        setIsLoading(true)
        // 从 localStorage 获取设备ID，如果没有则尝试获取第一个设备
        let currentDeviceId = localStorage.getItem("deviceId") || null
        
        // 移除 deviceId === 'default' 判断：如果没有设备ID，尝试获取第一个设备
        if (!currentDeviceId) {
          // 尝试获取第一个设备（只有在 Supabase 配置有效时）
          if (supabase) {
            try {
              const { data: devicesData } = await supabase
                .from("devices")
                .select("device_id")
                .limit(1)
                .single()

              if (devicesData && devicesData.device_id) {
                currentDeviceId = devicesData.device_id
                localStorage.setItem("deviceId", currentDeviceId)
                setDeviceId(currentDeviceId)
              }
            } catch (error) {
              console.log("[IoT Dashboard] 未找到设备，跳过设备数据加载")
            }
          }
        } else {
          setDeviceId(currentDeviceId)
        }

        // 如果有有效的设备ID，查询该设备的燃料数据
        // 只有在 Supabase 配置有效时才查询
        if (currentDeviceId && supabase) {
          const { data, error } = await supabase
            .from("fuel_level")
            .select("percentage, is_locked")
            .eq("device_id", currentDeviceId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          if (error) {
            // PGRST116 表示没有找到数据，这是正常的
            if (error.code !== "PGRST116") {
              console.error("加载燃料数据失败:", error)
            }
            return
          }

          if (data) {
            setFuelLevel(data.percentage || 68)
            setIsLocked(data.is_locked || false)
          }
        }
      } catch (error) {
        console.error("加载燃料数据失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFuelData()

    // 实时订阅数据库更新 - 只有在 Supabase 配置有效时才开启
    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      const channel = supabase
        .channel("fuel_level_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "fuel_level",
          },
          (payload) => {
            if (payload.new) {
              if ("percentage" in payload.new) {
                setFuelLevel(payload.new.percentage as number)
              }
              if ("is_locked" in payload.new) {
                setIsLocked(payload.new.is_locked as boolean)
              }
            }
          }
        )
        .subscribe()

      // 模拟消耗（可选，如果需要实时递减）
      const interval = setInterval(() => {
        setConsumption((prev) => 12 + Math.random() * 2)
      }, 3000)

      return () => {
        clearInterval(interval)
        if (supabase) {
          supabase.removeChannel(channel)
        }
      }
    } else {
      console.warn("[IoT Dashboard] Supabase未配置，跳过实时订阅")
    }
  }, [])

  // 清理资源
  useEffect(() => {
    return () => {
      // 清理录音资源
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current)
        playbackIntervalRef.current = null
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  // 开始录音
  const startRecording = async () => {
    try {
      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // 创建 MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      })
      mediaRecorderRef.current = mediaRecorder

      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        // 确保清除计时器
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current)
          durationIntervalRef.current = null
        }
        
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        
        // 停止所有音频轨道
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        
        // 重置播放相关状态
        setPlaybackProgress(0)
        setPlaybackTime(0)
        setIsPlaying(false)
      }

      // 开始录音
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingDuration(0)

      // 开始计时
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error("[语音录制] 启动失败:", error)
      alert("无法启动录音，请检查麦克风权限")
      setIsRecording(false)
    }
  }

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        // 如果 MediaRecorder 状态是 recording，才停止
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
        setIsRecording(false)
        
        // 清除计时器
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current)
          durationIntervalRef.current = null
        }
        
        // 停止所有音频轨道
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      } catch (error) {
        console.error("[语音录制] 停止失败:", error)
        setIsRecording(false)
      }
    }
  }

  // 删除录音
  const deleteRecording = () => {
    // 停止播放
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    
    // 清除播放进度定时器
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current)
      playbackIntervalRef.current = null
    }
    
    // 清理 URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingDuration(0)
    setAudioUploadUrl(null)
    setIsPlaying(false)
    setPlaybackProgress(0)
    setPlaybackTime(0)
  }

  // 播放/暂停录音
  const togglePlayback = async () => {
    if (!audioRef.current || !audioUrl) {
      console.warn("[语音播放] audioRef 或 audioUrl 不存在")
      return
    }

    try {
      if (isPlaying) {
        // 暂停播放
        audioRef.current.pause()
        setIsPlaying(false)
        
        // 清除播放进度定时器
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current)
          playbackIntervalRef.current = null
        }
      } else {
        // 开始播放
        await audioRef.current.play()
        setIsPlaying(true)
        
        // 开始更新播放进度
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current)
        }
        
        playbackIntervalRef.current = setInterval(() => {
          if (audioRef.current) {
            const current = audioRef.current.currentTime
            const duration = audioRef.current.duration || recordingDuration
            
            setPlaybackTime(current)
            
            if (duration > 0) {
              setPlaybackProgress((current / duration) * 100)
            }
          }
        }, 100) // 每100ms更新一次
      }
    } catch (error) {
      console.error("[语音播放] 播放失败:", error)
      setIsPlaying(false)
    }
  }

  // 上传音频文件
  const uploadAudio = async (): Promise<string | null> => {
    if (!audioBlob) return null

    try {
      const formData = new FormData()
      const fileName = `repair_audio_${Date.now()}.${audioBlob.type.includes('webm') ? 'webm' : 'mp4'}`
      formData.append('file', audioBlob, fileName)
      formData.append('folder', 'repair-audio')

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '上传失败')
      }

      const data = await response.json()
      
      if (!response.ok) {
        const errorMsg = data.error || '上传失败'
        const details = data.details ? `\n详情: ${data.details}` : ''
        const hint = data.hint ? `\n提示: ${data.hint}` : ''
        console.error('[语音上传] 失败:', { error: errorMsg, details, hint, fullData: data })
        alert(`音频上传失败: ${errorMsg}${details}${hint}`)
        return null
      }
      
      setAudioUploadUrl(data.data.url)
      return data.data.url
    } catch (error) {
      console.error('[语音上传] 失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      alert(`音频上传失败: ${errorMessage}\n请检查网络连接或稍后重试`)
      return null
    }
  }

  // 格式化时长（秒转分:秒）
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 加载历史维修记录
  useEffect(() => {
    const loadRepairHistory = async () => {
      if (!restaurantId || !supabase) return

      setIsLoadingHistory(true)
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, service_type, status, created_at, amount")
          .eq("restaurant_id", restaurantId)
          .like("service_type", "维修服务%")
          .order("created_at", { ascending: false })
          .limit(20)

        if (error) {
          console.error("[历史维修] 查询失败:", error)
          return
        }

        if (data) {
          setRepairHistory(data)
        }
      } catch (error) {
        console.error("[历史维修] 加载失败:", error)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    // 当切换到历史记录标签页时加载数据
    if (repairTab === "history" && isRepairDialogOpen && restaurantId) {
      loadRepairHistory()
    }
  }, [repairTab, isRepairDialogOpen, restaurantId])

  // 提交报修
  const handleSubmitRepair = async () => {
    if (!restaurantId) {
      alert("请先登录")
      return
    }

    // 如果没有文字描述也没有语音，提示用户
    if (!repairDescription.trim() && !audioBlob) {
      alert("请填写问题描述或录制语音")
      return
    }

    setIsSubmittingRepair(true)
    try {
      // 如果有录音但未上传，先上传音频
      let audioUrlToSubmit = audioUploadUrl
      if (audioBlob && !audioUploadUrl) {
        audioUrlToSubmit = await uploadAudio()
        if (!audioUrlToSubmit) {
          // 如果只有语音没有文字描述，且上传失败，提示用户
          if (!repairDescription.trim()) {
            alert("语音上传失败，请重试或填写文字描述")
          } else {
            alert("语音上传失败，将仅提交文字描述")
          }
          setIsSubmittingRepair(false)
          return
        }
      }

      // 确定描述文本：如果有文字描述使用文字，如果只有语音则传null（服务端会处理为"[语音消息]"）
      const descriptionText = repairDescription.trim() || null
      
      // 最终检查：至少需要文字描述或音频URL
      if (!descriptionText && !audioUrlToSubmit) {
        alert("请填写问题描述或录制语音")
        setIsSubmittingRepair(false)
        return
      }

      const response = await fetch("/api/repair/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          device_id: repairDeviceId || undefined,
          description: descriptionText,
          urgency: repairUrgency,
          audio_url: audioUrlToSubmit || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "提交报修失败")
      }

      alert("报修工单提交成功！我们会尽快安排维修人员联系您。")
      
      // 重置表单
      setRepairDescription("")
      setRepairDeviceId("")
      setRepairUrgency("medium")
      deleteRecording() // 清理录音
      
      // 切换到历史记录标签页（会自动触发加载）
      setRepairTab("history")
    } catch (error) {
      console.error("[报修] 提交失败:", error)
      alert(error instanceof Error ? error.message : "提交报修失败，请重试")
    } finally {
      setIsSubmittingRepair(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-blue-950/90 to-slate-900/90 border-blue-800/50 backdrop-blur-sm p-6">
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

        {/* 锁机状态提示 */}
        {isLocked && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
            <Lock className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">设备已被远程锁定，请联系管理员解锁</span>
          </div>
        )}

        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm text-slate-300">当前剩余量</span>
            <div className="text-right">
              {isLoading ? (
                <span className="text-4xl font-bold text-slate-500">加载中...</span>
              ) : (
                <>
                  <span className="text-4xl font-bold text-white">{fuelLevel.toFixed(1)}</span>
                  <span className="text-xl text-slate-400 ml-1">%</span>
                </>
              )}
            </div>
          </div>
          <Progress value={fuelLevel} className="h-3 bg-slate-800" />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-500">约 {(fuelLevel * 5).toFixed(0)} kg</span>
            <span className="text-xs text-orange-400">
              预计可用 {fuelLevel > 0 && consumption > 0 ? Math.floor(fuelLevel / consumption) : 0} 天
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-slate-400">累计加注</span>
            </div>
            <div className="text-xl font-bold text-white">2,845</div>
            <div className="text-xs text-slate-500">kg</div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-slate-400">日均消耗</span>
            </div>
            <div className="text-xl font-bold text-white">{consumption.toFixed(1)}</div>
            <div className="text-xs text-slate-500">kg/天</div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-slate-400">使用效率</span>
            </div>
            <div className="text-xl font-bold text-white">92</div>
            <div className="text-xs text-slate-500">%</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/30 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-300">我的设备</span>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              {deviceCount > 0 ? `${deviceCount}台绑定` : "未绑定"}
            </Badge>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {deviceCount > 0 ? Math.round((onlineDeviceCount / deviceCount) * 100) : 0}%
          </div>
          <div className={`text-xs flex items-center gap-1 ${deviceCount > 0 && onlineDeviceCount === deviceCount ? 'text-green-400' : deviceCount > 0 ? 'text-yellow-400' : 'text-slate-400'}`}>
            <TrendingUp className="h-3 w-3" />
            {deviceCount > 0 
              ? onlineDeviceCount === deviceCount 
                ? "全部在线" 
                : `${onlineDeviceCount}台在线`
              : "暂无设备"}
          </div>
        </Card>

        <Card 
          className="bg-gradient-to-br from-slate-900/90 to-purple-950/90 border-purple-800/30 backdrop-blur-sm p-4 cursor-pointer hover:border-purple-700/50 transition-colors"
          onClick={() => setIsRepairDialogOpen(true)}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-300">一键报修</span>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
              <Wrench className="h-3 w-3 mr-1" />
              快速报修
            </Badge>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            <Wrench className="h-8 w-8 inline-block mb-1" />
          </div>
          <div className="text-xs text-purple-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            点击提交报修
          </div>
        </Card>
      </div>

      {/* 报修对话框 */}
      <Dialog open={isRepairDialogOpen} onOpenChange={(open) => {
        setIsRepairDialogOpen(open)
        if (!open) {
          setRepairTab("submit") // 关闭时重置到提交标签页
          // 清理录音状态
          if (isRecording) {
            stopRecording()
          }
          deleteRecording()
        }
      }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Wrench className="h-5 w-5 text-purple-400" />
              一键报修
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              提交报修或查看历史维修记录
            </DialogDescription>
          </DialogHeader>

          <Tabs value={repairTab} onValueChange={(value) => setRepairTab(value as "submit" | "history")} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800">
              <TabsTrigger value="submit" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                提交报修
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                历史记录
              </TabsTrigger>
            </TabsList>

            {/* 提交报修标签页 */}
            <TabsContent value="submit" className="flex-1 overflow-y-auto space-y-4 py-4 mt-4">
              {/* 设备选择 */}
              {devices.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="device" className="text-slate-300">选择设备（可选）</Label>
                  <Select value={repairDeviceId || "none"} onValueChange={(value) => setRepairDeviceId(value === "none" ? "" : value)}>
                    <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="选择需要报修的设备" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="none" className="text-white hover:bg-slate-700">
                        不指定设备
                      </SelectItem>
                      {devices.map((device) => (
                        <SelectItem 
                          key={device.device_id} 
                          value={device.device_id}
                          className="text-white hover:bg-slate-700"
                        >
                          {device.device_id} {device.status === "online" ? "(在线)" : "(离线)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 问题描述 */}
              <div className="space-y-3">
                <Label htmlFor="description" className="text-slate-300">
                  问题描述 <span className="text-red-400">*</span>
                  <span className="text-xs text-slate-500 ml-2">（文字或语音，至少填写一项）</span>
                </Label>
                
                {/* 文字输入框 */}
                <Textarea
                  id="description"
                  placeholder="请详细描述设备故障或需要维修的问题..."
                  value={repairDescription}
                  onChange={(e) => setRepairDescription(e.target.value)}
                  className="min-h-[80px] bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  rows={3}
                />

                {/* 语音录制区域 */}
                <div className="space-y-2">
                  {!audioUrl ? (
                    /* 未录制状态 - 显示录音按钮 */
                    <div className="flex items-center justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        className={`w-full h-16 border-2 ${
                          isRecording 
                            ? 'border-red-500 bg-red-500/10 text-red-400' 
                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-purple-500 hover:bg-purple-500/10'
                        } transition-all`}
                      >
                        {isRecording ? (
                          <div className="flex items-center gap-3">
                            <div className="h-4 w-4 rounded-full bg-red-400 animate-pulse" />
                            <span className="text-lg font-medium">录音中... {formatDuration(recordingDuration)}</span>
                            <MicOff className="h-5 w-5" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <Mic className="h-5 w-5" />
                            <span className="text-lg font-medium">按住说话</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  ) : (
                    /* 已录制状态 - 显示播放控制 */
                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={togglePlayback}
                        className="h-10 w-10 p-0 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-full flex-shrink-0"
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5 text-purple-400" />
                        ) : (
                          <Play className="h-5 w-5 text-purple-400" />
                        )}
                      </Button>
                      
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 transition-all duration-100"
                            style={{ width: `${playbackProgress}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-400 min-w-[50px] text-right flex-shrink-0">
                          {isPlaying 
                            ? `${formatDuration(Math.floor(playbackTime))} / ${formatDuration(recordingDuration)}`
                            : `0:00 / ${formatDuration(recordingDuration)}`
                          }
                        </span>
                      </div>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={deleteRecording}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {/* 隐藏的audio元素用于播放 */}
                  {audioUrl && (
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onEnded={() => {
                        setIsPlaying(false)
                        setPlaybackProgress(0)
                        setPlaybackTime(0)
                        if (audioRef.current) {
                          audioRef.current.currentTime = 0
                        }
                        if (playbackIntervalRef.current) {
                          clearInterval(playbackIntervalRef.current)
                          playbackIntervalRef.current = null
                        }
                      }}
                      onPause={() => {
                        setIsPlaying(false)
                        if (playbackIntervalRef.current) {
                          clearInterval(playbackIntervalRef.current)
                          playbackIntervalRef.current = null
                        }
                      }}
                      onPlay={() => {
                        setIsPlaying(true)
                      }}
                      onLoadedMetadata={() => {
                        // 当音频元数据加载完成时，更新总时长
                        if (audioRef.current && audioRef.current.duration) {
                          setRecordingDuration(Math.floor(audioRef.current.duration))
                        }
                      }}
                      className="hidden"
                    />
                  )}
                </div>
              </div>

              {/* 紧急程度 */}
              <div className="space-y-2">
                <Label htmlFor="urgency" className="text-slate-300">紧急程度</Label>
                <Select value={repairUrgency} onValueChange={(value: "low" | "medium" | "high") => setRepairUrgency(value)}>
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="low" className="text-white hover:bg-slate-700">
                      低 - 可延后处理
                    </SelectItem>
                    <SelectItem value="medium" className="text-white hover:bg-slate-700">
                      中 - 尽快处理
                    </SelectItem>
                    <SelectItem value="high" className="text-white hover:bg-slate-700">
                      高 - 紧急处理
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  variant="ghost"
                  onClick={() => setIsRepairDialogOpen(false)}
                  className="text-slate-400 hover:text-white"
                  disabled={isSubmittingRepair}
                >
                  取消
                </Button>
                <Button
                  onClick={handleSubmitRepair}
                  disabled={isSubmittingRepair || (!repairDescription.trim() && !audioBlob)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSubmittingRepair ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4 mr-2" />
                      提交报修
                    </>
                  )}
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* 历史记录标签页 */}
            <TabsContent value="history" className="flex-1 overflow-y-auto py-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-300">历史维修记录</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (restaurantId && supabase) {
                      const loadRepairHistory = async () => {
                        setIsLoadingHistory(true)
                        try {
                          const { data, error } = await supabase
                            .from("orders")
                            .select("id, service_type, status, created_at, amount")
                            .eq("restaurant_id", restaurantId)
                            .like("service_type", "维修服务%")
                            .order("created_at", { ascending: false })
                            .limit(20)

                          if (error) {
                            console.error("[历史维修] 查询失败:", error)
                            return
                          }

                          if (data) {
                            setRepairHistory(data)
                          }
                        } catch (error) {
                          console.error("[历史维修] 加载失败:", error)
                        } finally {
                          setIsLoadingHistory(false)
                        }
                      }
                      loadRepairHistory()
                    }
                  }}
                  disabled={isLoadingHistory || !restaurantId}
                  className="text-slate-400 hover:text-white h-7"
                >
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  刷新
                </Button>
              </div>

              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : repairHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">暂无维修记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {repairHistory.map((record) => {
                    // 解析service_type获取详细信息
                    const parts = record.service_type.split(" - ")
                    const deviceInfo = parts.find(p => p.startsWith("设备:"))?.replace("设备:", "") || ""
                    const urgencyInfo = parts.find(p => p.startsWith("紧急:"))?.replace("紧急:", "") || ""
                    const description = parts[parts.length - 1] || record.service_type

                    // 状态颜色映射
                    const statusColors: Record<string, string> = {
                      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                      processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                      completed: "bg-green-500/20 text-green-400 border-green-500/30",
                      cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
                    }

                    const statusLabels: Record<string, string> = {
                      pending: "待处理",
                      processing: "处理中",
                      completed: "已完成",
                      cancelled: "已取消",
                    }

                    const statusColor = statusColors[record.status] || "bg-slate-500/20 text-slate-400 border-slate-500/30"
                    const statusLabel = statusLabels[record.status] || record.status

                    // 格式化时间
                    const date = new Date(record.created_at)
                    const timeStr = date.toLocaleString("zh-CN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })

                    return (
                      <Card key={record.id} className="bg-slate-800/50 border-slate-700 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Wrench className="h-4 w-4 text-purple-400" />
                              <span className="text-sm font-medium text-white">维修工单</span>
                              <Badge className={`text-xs ${statusColor}`}>
                                {statusLabel}
                              </Badge>
                            </div>
                            {deviceInfo && (
                              <p className="text-xs text-slate-400 mb-1">设备: {deviceInfo}</p>
                            )}
                            <p className="text-sm text-slate-300 line-clamp-2">{description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                          <span className="text-xs text-slate-500">{timeStr}</span>
                          {record.amount > 0 && (
                            <span className="text-sm font-semibold text-white">¥{record.amount}</span>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Core Services Component
const services = [
  {
    icon: Truck,
    title: "燃料配送",
    description: "智能监控 · 自动补给 · 24小时送达",
    color: "from-orange-500 to-red-600",
    shadowColor: "shadow-orange-500/30",
    stats: [
      { label: "今日配送", value: "28单" },
      { label: "准时率", value: "99.2%" },
    ],
    paymentLink: "/payment?service=燃料配送",
  },
  {
    icon: Wrench,
    title: "设备租赁",
    description: "灵活租期 · 免费维护 · 随时升级",
    color: "from-blue-500 to-cyan-600",
    shadowColor: "shadow-blue-500/30",
    stats: [
      { label: "可租设备", value: "156台" },
      { label: "满意度", value: "98%" },
    ],
    paymentLink: "/services",
  },
]

function CoreServices() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">核心服务</h2>
        <Link href="/services">
          <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
            全部服务
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card
            key={service.title}
            className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6 hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className={`w-12 h-12 bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center shadow-lg ${service.shadowColor}`}
              >
                <service.icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">{service.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{service.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {service.stats.map((stat) => (
                <div key={stat.label} className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">{stat.label}</div>
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                </div>
              ))}
            </div>

            <Link href={service.paymentLink || "/services"}>
              <Button className={`w-full bg-gradient-to-r ${service.color} hover:opacity-90 text-white`}>
                立即下单
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Member Privileges Component
const privileges = [
  {
    icon: Crown,
    title: "专属折扣",
    description: "所有服务享受9折优惠",
    color: "from-yellow-500 to-orange-600",
    shadowColor: "shadow-yellow-500/30",
  },
  {
    icon: Gift,
    title: "生日礼包",
    description: "生日月免费配送一次",
    color: "from-pink-500 to-rose-600",
    shadowColor: "shadow-pink-500/30",
  },
  {
    icon: Star,
    title: "优先服务",
    description: "24小时专属客服支持",
    color: "from-purple-500 to-indigo-600",
    shadowColor: "shadow-purple-500/30",
  },
  {
    icon: Percent,
    title: "积分奖励",
    description: "消费1元=10积分，可兑换好礼",
    color: "from-blue-500 to-cyan-600",
    shadowColor: "shadow-blue-500/30",
  },
]

function MemberPrivileges() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">会员特权</h2>
        <Link href="/profile">
          <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
            查看详情
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {privileges.map((privilege) => (
          <Link href="/profile" key={privilege.title}>
            <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-5 hover:scale-[1.02] transition-transform cursor-pointer">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${privilege.color} rounded-xl flex items-center justify-center shadow-lg ${privilege.shadowColor}`}
                >
                  <privilege.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white mb-1">{privilege.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{privilege.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

// Quick Actions Component
const actions = [
  {
    icon: Package,
    label: "我的设备",
    color: "from-blue-500 to-cyan-600",
    shadowColor: "shadow-blue-500/20",
    href: "/devices",
  },
  {
    icon: Truck,
    label: "燃料配送",
    color: "from-orange-500 to-red-600",
    shadowColor: "shadow-orange-500/20",
    href: "/services",
  },
  {
    icon: ShoppingCart,
    label: "B2B商城",
    color: "from-indigo-500 to-purple-600",
    shadowColor: "shadow-indigo-500/20",
    href: "/mall",
  },
  {
    icon: Wrench,
    label: "维修服务",
    color: "from-green-500 to-emerald-600",
    shadowColor: "shadow-green-500/20",
    href: "/services",
  },
  {
    icon: Droplet,
    label: "清洁服务",
    color: "from-cyan-500 to-teal-600",
    shadowColor: "shadow-cyan-500/20",
    href: "/services",
  },
  {
    icon: HardHat,
    label: "工程改造",
    color: "from-purple-500 to-pink-600",
    shadowColor: "shadow-purple-500/20",
    href: "/services",
  },
]

function QuickActions() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">快速服务</h2>
      <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm p-4">
        <div className="grid grid-cols-3 gap-4">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-slate-800/50 transition-all hover:scale-105"
            >
              <div
                className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center shadow-lg ${action.shadowColor}`}
              >
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-center text-slate-200">{action.label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}

// Recent Orders Component
const orders = [
  {
    id: "ORD20250119001",
    type: "燃料配送",
    status: "进行中",
    time: "预计 15:30 送达",
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  {
    id: "ORD20250118005",
    type: "设备租赁",
    status: "已完成",
    time: "今天 10:20",
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  {
    id: "ORD20250117012",
    type: "维修服务",
    status: "已完成",
    time: "昨天 14:45",
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
]

function RecentOrders() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">最近订单</h2>
        <Link href="/orders">
          <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
            全部订单
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {orders.map((order) => (
          <Link href="/orders" key={order.id}>
            <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm p-4 hover:bg-slate-800/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 ${order.bgColor} rounded-xl flex items-center justify-center`}>
                    <order.icon className={`h-5 w-5 ${order.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-white">{order.type}</h4>
                      <Badge className={`${order.bgColor} ${order.color} border ${order.borderColor} text-xs`}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">{order.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{order.time}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

// Bottom Navigation Component
const navItems = [
  { icon: Home, label: "首页", href: "/" },
  { icon: Grid3x3, label: "服务", href: "/services" },
  { icon: ShoppingCart, label: "商城", href: "/mall" },
  { icon: FileText, label: "订单", href: "/orders" },
  { icon: User, label: "我的", href: "/profile" },
]

function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/50 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-3 px-4 transition-all ${
                  isActive ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" : ""}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

// Installation Alert Component - 安装完成提示横幅
function InstallationAlert() {
  const [pendingDevices, setPendingDevices] = useState<Array<{
    device_id: string
    address: string
    installer: string
    install_date: string
  }>>([])
  const [isVisible, setIsVisible] = useState(true)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const rid = localStorage.getItem("restaurantId")
    setRestaurantId(rid)
  }, [])

  useEffect(() => {
    if (!restaurantId || !supabase) return

    const loadPendingDevices = async () => {
      try {
        // 查询待确认的设备安装（状态为 online 或 pending_acceptance）
        const { data, error } = await supabase
          .from("devices")
          .select("device_id, address, installer, install_date, status")
          .eq("restaurant_id", restaurantId)
          .in("status", ["online", "pending_acceptance"])
          .order("install_date", { ascending: false })
          .limit(5)

        if (error) {
          console.error("[安装提示] 加载失败:", error)
          return
        }

        if (data && data.length > 0) {
          setPendingDevices(data)
        }
      } catch (error) {
        console.error("[安装提示] 加载失败:", error)
      }
    }

    loadPendingDevices()

    // 每30秒刷新一次
    const interval = setInterval(loadPendingDevices, 30000)
    return () => clearInterval(interval)
  }, [restaurantId])

  if (!isVisible || pendingDevices.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="container mx-auto px-4 pt-4"
    >
      <Card className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30 backdrop-blur-sm p-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-xl flex items-center justify-center border border-blue-500/30 flex-shrink-0">
            <CheckCircle2 className="h-6 w-6 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">
                  设备安装完成
                </h3>
                <p className="text-sm text-slate-300 mb-2">
                  您有 {pendingDevices.length} 台设备已安装完成，请确认验收以激活设备
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsVisible(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800/50 h-8 w-8 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 mb-3">
              {pendingDevices.slice(0, 3).map((device) => (
                <div
                  key={device.device_id}
                  className="bg-slate-800/50 rounded-lg p-2 text-sm"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-blue-400" />
                    <span className="font-medium text-white">{device.device_id}</span>
                  </div>
                  <p className="text-xs text-slate-400 ml-6">
                    {device.address || "地址未设置"}
                  </p>
                  {device.installer && (
                    <p className="text-xs text-slate-500 ml-6">
                      安装人: {device.installer}
                    </p>
                  )}
                </div>
              ))}
              {pendingDevices.length > 3 && (
                <p className="text-xs text-slate-400 text-center">
                  还有 {pendingDevices.length - 3} 台设备...
                </p>
              )}
            </div>
            <Link href="/customer/confirm">
              <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 text-white">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                前往确认验收
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// Main Page Component
export default function MainPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
      <Header />
      <InstallationAlert />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <IoTDashboard />
        <CoreServices />
        <MemberPrivileges />
        <QuickActions />
        <RecentOrders />
      </div>
      <BottomNavigation />
    </main>
  )
}
