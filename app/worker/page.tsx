"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  QrCode,
  Package,
  MapPin,
  User,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Smartphone,
  Truck,
  Wrench,
  Home,
  AlertCircle,
  Droplet,
  Calendar,
  Hash,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

// 安装登记表单组件
function InstallForm({ onBack }: { onBack: () => void }) {
  const [deviceId, setDeviceId] = useState("")
  const [address, setAddress] = useState("")
  const [installer, setInstaller] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState("")

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitSuccess(false)

    // 验证表单
    if (!deviceId.trim()) {
      setError("请输入设备ID")
      return
    }

    if (!address.trim()) {
      setError("请输入安装地址")
      return
    }

    if (!installer.trim()) {
      setError("请输入安装人姓名")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_id: deviceId.trim(),
          model: "智能燃料监控系统 V2.0",
          address: address.trim(),
          installer: installer.trim(),
          install_date: new Date().toISOString(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "提交失败，请重试")
      }

      // 提交成功
      setSubmitSuccess(true)
      // 清空表单
      setDeviceId("")
      setAddress("")
      setInstaller("")

      // 3秒后重置成功状态
      setTimeout(() => {
        setSubmitSuccess(false)
      }, 3000)
    } catch (err: any) {
      setError(err.message || "提交失败，请检查网络连接")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 模拟扫码功能
  const handleScanQR = () => {
    alert("扫码功能需要调用设备摄像头API，请手动输入设备ID")
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-slate-300 hover:text-white hover:bg-slate-800/50"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回首页
      </Button>

      {/* 成功提示 - 带动画 */}
      {submitSuccess && (
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
              <CheckCircle2 className="h-6 w-6 text-green-400 relative animate-in zoom-in-95 duration-500" />
            </div>
            <div>
              <div className="font-semibold text-green-400 animate-in fade-in slide-in-from-bottom-2 duration-500">提交成功！</div>
              <div className="text-sm text-green-300 animate-in fade-in slide-in-from-bottom-2 duration-700">设备安装信息已保存</div>
            </div>
          </div>
        </Card>
      )}

      {/* 错误提示 */}
      {error && (
        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30 p-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div>
              <div className="font-semibold text-red-400">提交失败</div>
              <div className="text-sm text-red-300">{error}</div>
            </div>
          </div>
        </Card>
      )}

      {/* 扫码登记表单 */}
      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <QrCode className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">扫码登记</h2>
            <p className="text-sm text-slate-400">填写设备安装信息</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 设备ID */}
          <div className="space-y-2">
            <Label htmlFor="deviceId" className="text-slate-300 flex items-center gap-2">
              <Package className="h-4 w-4" />
              设备ID <span className="text-red-400">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="deviceId"
                type="text"
                placeholder="请输入设备ID或扫码获取"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="flex-1 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                onClick={handleScanQR}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white"
                disabled={isSubmitting}
              >
                <QrCode className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-slate-500">点击扫码按钮或手动输入设备ID</p>
          </div>

          {/* 安装地址 */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-slate-300 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              安装地址 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="address"
              type="text"
              placeholder="请输入详细安装地址"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500">例如：昆明市五华区xxx路123号</p>
          </div>

          {/* 安装人姓名 */}
          <div className="space-y-2">
            <Label htmlFor="installer" className="text-slate-300 flex items-center gap-2">
              <User className="h-4 w-4" />
              安装人姓名 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="installer"
              type="text"
              placeholder="请输入安装人员姓名"
              value={installer}
              onChange={(e) => setInstaller(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500">请输入您的真实姓名</p>
          </div>

          {/* 提交按钮 */}
          <Button
            type="submit"
            disabled={isSubmitting || submitSuccess}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 text-white h-12 text-lg font-semibold shadow-lg shadow-blue-500/30"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                提交中...
              </>
            ) : submitSuccess ? (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2 text-green-400 animate-in zoom-in-95 duration-300" />
                <span className="text-green-400">已提交</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                提交登记
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* 使用说明 */}
      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Smartphone className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-2">使用说明</h3>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>扫描设备上的二维码自动填入设备ID，或手动输入</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>填写详细的安装地址，包括省市区和具体街道门牌号</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>输入安装人员的真实姓名，用于记录和追溯</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>提交后系统将自动记录安装时间</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

// 设备信息类型
interface DeviceInfo {
  device_id: string
  model: string
  address: string
  container_type: "fixed_tank" | "cylinder" | null
  status: string
  is_locked: boolean
  fuel_percentage: number
}

// 餐厅信息类型
interface RestaurantInfo {
  restaurant_id: string // UUID，为了兼容性保留此字段名
  id: string // UUID，主键
  name: string
  address: string
  qr_token: string
  total_refilled?: number
}

// 潜在客户提示页组件
function NewCustomerPrompt({ restaurantInfo, onBindDevice, onBack }: {
  restaurantInfo: RestaurantInfo | null
  onBindDevice: () => void
  onBack: () => void
}) {
  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30 shadow-lg shadow-yellow-500/20 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">检测到潜在客户</h3>
            <p className="text-sm text-slate-400">该餐厅尚未绑定设备</p>
          </div>
        </div>

        {restaurantInfo && (
          <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
            <div className="text-sm text-slate-400 mb-2">餐厅信息</div>
            <div className="text-white font-semibold text-lg">{restaurantInfo.name}</div>
            {restaurantInfo.address && (
              <div className="text-sm text-slate-300 mt-2 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {restaurantInfo.address}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={onBack}
            variant="ghost"
            className="flex-1 text-slate-400 hover:text-white"
          >
            返回
          </Button>
          <Button
            onClick={onBindDevice}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white"
          >
            <Package className="h-5 w-5 mr-2" />
            立即绑定设备
          </Button>
        </div>
      </Card>
    </div>
  )
}

// 设备绑定页组件（一键安装）
function BindDevicePage({ restaurantInfo, onComplete, onBack }: {
  restaurantInfo: RestaurantInfo | null
  onComplete: () => void
  onBack: () => void
}) {
  const [deviceId, setDeviceId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState("")

  // 扫描设备码
  const handleDeviceScan = () => {
    // 模拟扫码，实际应该调用摄像头API
    const scannedId = prompt("请扫描设备二维码（或手动输入设备ID）:")
    if (scannedId && scannedId.trim()) {
      setDeviceId(scannedId.trim())
      setError("")
    }
  }

  const handleSubmit = async () => {
    if (!deviceId.trim()) {
      setError("请输入设备ID")
      return
    }

    if (!restaurantInfo) {
      setError("餐厅信息缺失")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      // 一键安装：更新设备的 restaurant_id 并同步更新餐厅状态为 active
      if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
        // 1. 检查设备是否存在
        const { data: deviceData, error: deviceCheckError } = await supabase
          .from("devices")
          .select("device_id, restaurant_id")
          .eq("device_id", deviceId.trim())
          .single()

        if (deviceCheckError || !deviceData) {
          throw new Error("设备不存在，请检查设备ID")
        }

        // 2. 更新设备的 restaurant_id
        const { error: linkError } = await supabase
          .from("devices")
          .update({
            restaurant_id: restaurantInfo.restaurant_id,
            updated_at: new Date().toISOString(),
          })
          .eq("device_id", deviceId.trim())

        if (linkError) {
          console.error("绑定设备失败:", linkError)
          throw new Error("绑定设备失败: " + linkError.message)
        }

        // 3. 同步更新餐厅状态为 active
        const { error: statusError } = await supabase
          .from("restaurants")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", restaurantInfo.restaurant_id)

        if (statusError) {
          console.error("更新餐厅状态失败:", statusError)
          // 不阻止流程，只记录错误
        }

        setSubmitSuccess(true)
        setTimeout(() => {
          onComplete()
        }, 2000)
      } else {
        throw new Error("数据库连接失败")
      }
    } catch (err: any) {
      setError(err.message || "绑定失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/40 backdrop-blur-md border border-blue-500/30 shadow-lg shadow-blue-500/20 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">绑定设备</h3>
            <p className="text-sm text-slate-400">扫描设备二维码完成绑定</p>
          </div>
        </div>

        {restaurantInfo && (
          <div className="mb-6 p-4 bg-slate-800/50 rounded-lg">
            <div className="text-sm text-slate-400 mb-2">绑定到餐厅</div>
            <div className="text-white font-semibold">{restaurantInfo.name}</div>
          </div>
        )}

        {submitSuccess && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
              <CheckCircle2 className="h-5 w-5 text-green-400 relative animate-in zoom-in-95 duration-500" />
            </div>
            <div>
              <div className="font-semibold text-green-400 animate-in fade-in slide-in-from-bottom-2 duration-500">绑定成功！</div>
              <div className="text-sm text-green-300 animate-in fade-in slide-in-from-bottom-2 duration-700">设备已关联，餐厅已激活</div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="device_id" className="text-slate-300 mb-2 block">
              设备ID <span className="text-red-400">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="device_id"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  placeholder="扫描设备二维码或手动输入"
                  disabled={isSubmitting || submitSuccess}
                />
              </div>
              <Button
                type="button"
                onClick={handleDeviceScan}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white"
                disabled={isSubmitting || submitSuccess}
              >
                <QrCode className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={onBack}
              variant="ghost"
              className="flex-1 text-slate-400 hover:text-white"
              disabled={isSubmitting || submitSuccess}
            >
              返回
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || submitSuccess || !deviceId.trim()}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  绑定中...
                </>
              ) : submitSuccess ? (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  已完成
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  完成绑定
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// 新客安装引导页组件
function NewCustomerInstallGuide({ restaurantInfo, onComplete, onBack }: {
  restaurantInfo: RestaurantInfo | null
  onComplete: () => void
  onBack: () => void
}) {
  const [deviceId, setDeviceId] = useState("")
  const [model, setModel] = useState("")
  const [address, setAddress] = useState("")
  const [installer, setInstaller] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!deviceId.trim() || !model.trim() || !address.trim() || !installer.trim()) {
      setError("请填写完整信息")
      return
    }

    if (!restaurantInfo) {
      setError("餐厅信息缺失")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      // 1. 安装设备
      const installResponse = await fetch("/api/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_id: deviceId.trim(),
          model: model.trim(),
          address: address.trim(),
          installer: installer.trim(),
          install_date: new Date().toISOString(),
        }),
      })

      const installResult = await installResponse.json()

      if (!installResult.success) {
        throw new Error(installResult.error || "设备安装失败")
      }

      // 2. 关联设备到餐厅
      if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
        const { error: linkError } = await supabase
          .from("devices")
          .update({
            restaurant_id: restaurantInfo.restaurant_id,
            updated_at: new Date().toISOString(),
          })
          .eq("device_id", deviceId.trim())

        if (linkError) {
          console.error("关联设备到餐厅失败:", linkError)
          throw new Error("关联设备失败")
        }

        // 3. 更新餐厅状态为 active
        const { error: statusError } = await supabase
          .from("restaurants")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", restaurantInfo.restaurant_id)

        if (statusError) {
          console.error("更新餐厅状态失败:", statusError)
          // 不阻止流程，只记录错误
        }
      }

      setSubmitSuccess(true)
      setTimeout(() => {
        onComplete()
      }, 2000)
    } catch (err: any) {
      setError(err.message || "安装失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/40 backdrop-blur-md border border-blue-500/30 shadow-lg shadow-blue-500/20 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">新客安装引导</h3>
            <p className="text-sm text-slate-400">为新客户安装设备并激活账户</p>
          </div>
        </div>

        {restaurantInfo && (
          <div className="mb-6 p-4 bg-slate-800/50 rounded-lg">
            <div className="text-sm text-slate-400 mb-2">客户信息</div>
            <div className="text-white font-semibold">{restaurantInfo.name}</div>
            {restaurantInfo.address && (
              <div className="text-sm text-slate-300 mt-1">{restaurantInfo.address}</div>
            )}
          </div>
        )}

        {submitSuccess && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
              <CheckCircle2 className="h-5 w-5 text-green-400 relative animate-in zoom-in-95 duration-500" />
            </div>
            <div>
              <div className="font-semibold text-green-400 animate-in fade-in slide-in-from-bottom-2 duration-500">安装成功！</div>
              <div className="text-sm text-green-300 animate-in fade-in slide-in-from-bottom-2 duration-700">设备已关联，餐厅已激活</div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="device_id" className="text-slate-300 mb-2 block">
              设备ID <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="device_id"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                placeholder="扫描设备二维码或手动输入"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="model" className="text-slate-300 mb-2 block">
              设备型号 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              placeholder="例如：IoT-Gas-2024"
            />
          </div>

          <div>
            <Label htmlFor="address" className="text-slate-300 mb-2 block">
              安装地址 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              placeholder="设备安装的具体地址"
            />
          </div>

          <div>
            <Label htmlFor="installer" className="text-slate-300 mb-2 block">
              安装人姓名 <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="installer"
                value={installer}
                onChange={(e) => setInstaller(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                placeholder="请输入安装人姓名"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={onBack}
              variant="ghost"
              className="flex-1 text-slate-400 hover:text-white"
            >
              返回
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || submitSuccess}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  安装中...
                </>
              ) : submitSuccess ? (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  已完成
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  完成安装
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// 燃料配送组件（重构版：先扫餐厅二维码，再显示设备列表）
function DeliveryForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<"scan_restaurant" | "device_list" | "filling" | "cylinder_scan" | "new_customer_install" | "bind_device">("scan_restaurant")
  const [qrToken, setQrToken] = useState("")
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // 固定油箱场景
  const [fuelAmountLiters, setFuelAmountLiters] = useState("")
  
  // 钢瓶场景
  const [cylinderId, setCylinderId] = useState("")
  
  // 通用字段
  const [deliveryPerson, setDeliveryPerson] = useState("")
  const [locationAddress, setLocationAddress] = useState("")
  const [fuelBatchId, setFuelBatchId] = useState("")
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState("")

  // 扫描餐厅二维码
  const handleRestaurantScan = async () => {
    // 模拟扫码，实际应该调用摄像头API
    const scannedToken = prompt("请扫描餐厅身份二维码（或手动输入二维码内容）:")
    if (scannedToken && scannedToken.trim()) {
      await fetchRestaurantInfo(scannedToken.trim())
    }
  }

  // 手动输入餐厅二维码
  const handleQrTokenChange = async (value: string) => {
    setQrToken(value)
    if (value.trim().length > 10) {
      await fetchRestaurantInfo(value.trim())
    }
  }

  // 获取餐厅信息和设备列表
  const fetchRestaurantInfo = async (input: string) => {
    setIsLoading(true)
    setError("")
    
    try {
      let qrToken = input
      let restaurantId: string | null = null
      let status: string | null = null

      // 尝试解析二维码内容（可能是JSON格式）
      try {
        const parsed = JSON.parse(input)
        if (parsed.restaurant_id) {
          restaurantId = parsed.restaurant_id
          status = parsed.status || null
          // 如果有 restaurant_id，需要通过 ID 查询获取 qr_token
          if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
            const { data: restaurantData } = await supabase
              .from("restaurants")
              .select("qr_token, status")
              .eq("id", restaurantId)
              .single()
            
            if (restaurantData) {
              qrToken = restaurantData.qr_token || input
              status = restaurantData.status || status
            }
          }
        } else if (parsed.qr_token) {
          qrToken = parsed.qr_token
        }
      } catch {
        // 如果不是JSON，直接使用输入作为 qr_token
        qrToken = input
      }

      const response = await fetch(`/api/restaurant?qr_token=${encodeURIComponent(qrToken)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "获取餐厅信息失败")
      }

      if (data.success) {
        setRestaurantInfo(data.restaurant)
        setDevices(data.devices || [])
        setLocationAddress(data.restaurant.address || "")
        setQrToken(qrToken)
        
        // 逻辑分支：查询该餐厅名下是否有关联设备
        const hasDevices = data.devices && data.devices.length > 0
        
        if (!hasDevices) {
          // 新客向导：若无设备，显示潜在客户页面
          setStep("new_customer_install")
        } else {
          // 有设备，显示设备列表
          setStep("device_list")
        }
      } else {
        setError("获取餐厅信息失败")
      }
    } catch (err: any) {
      setError(err.message || "获取餐厅信息失败，请检查网络连接")
    } finally {
      setIsLoading(false)
    }
  }

  // 处理设备操作（加注或换瓶）
  const handleDeviceAction = (device: DeviceInfo) => {
    setSelectedDevice(device)
    setError("")
    
    if (device.container_type === "fixed_tank") {
      // 固定油箱：直接进入加注界面
      setStep("filling")
    } else if (device.container_type === "cylinder") {
      // 钢瓶：先扫描钢瓶二维码
      setStep("cylinder_scan")
    }
  }

  // 扫描钢瓶二维码
  const handleCylinderScan = () => {
    // 模拟扫码，实际应该调用摄像头API
    const scannedId = prompt("请扫描新钢瓶身份码（或手动输入钢瓶ID）:")
    if (scannedId && scannedId.trim()) {
      setCylinderId(scannedId.trim())
      setError("")
      setStep("filling")
    }
  }

  // 提交配送记录
  const handleSubmit = async () => {
    if (!selectedDevice || !restaurantInfo) {
      setError("请先选择设备和餐厅")
      return
    }

    // 验证场景特定字段
    if (selectedDevice.container_type === "cylinder") {
      if (!cylinderId.trim()) {
        setError("请先扫描钢瓶身份码")
        setStep("cylinder_scan")
        return
      }
    } else {
      if (!fuelAmountLiters.trim() || parseFloat(fuelAmountLiters) <= 0) {
        setError("请输入有效的加注升数（必须大于0）")
        return
      }
    }

    if (!deliveryPerson.trim()) {
      setError("请输入配送人姓名")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const requestBody: any = {
        restaurant_id: restaurantInfo.restaurant_id,
        device_id: selectedDevice.device_id,
        container_type: selectedDevice.container_type,
        delivery_person: deliveryPerson.trim(),
        location_address: locationAddress || restaurantInfo.address || "",
        fuel_batch_id: fuelBatchId.trim() || null,
      }

      // 根据场景添加不同字段
      if (selectedDevice.container_type === "cylinder") {
        requestBody.cylinder_id = cylinderId.trim()
      } else {
        requestBody.fuel_amount_liters = parseFloat(fuelAmountLiters)
      }

      const response = await fetch("/api/filling", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "提交失败，请重试")
      }

      // 提交成功，刷新设备列表
      setSubmitSuccess(true)
      await fetchRestaurantInfo(qrToken)
      
      // 重置表单
      setSelectedDevice(null)
      setFuelAmountLiters("")
      setCylinderId("")
      setDeliveryPerson("")
      setFuelBatchId("")
      setStep("device_list")
      
      // 3秒后清除成功提示
      setTimeout(() => {
        setSubmitSuccess(false)
      }, 3000)
    } catch (err: any) {
      setError(err.message || "提交失败，请检查网络连接")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-slate-300 hover:text-white hover:bg-slate-800/50"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回首页
      </Button>

      {/* 成功提示 - 带动画 */}
      {submitSuccess && (
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
              <CheckCircle2 className="h-6 w-6 text-green-400 relative animate-in zoom-in-95 duration-500" />
            </div>
            <div>
              <div className="font-semibold text-green-400 animate-in fade-in slide-in-from-bottom-2 duration-500">配送记录已保存！</div>
              <div className="text-sm text-green-300 animate-in fade-in slide-in-from-bottom-2 duration-700">设备燃料已更新，3秒后刷新列表</div>
            </div>
          </div>
        </Card>
      )}

      {/* 错误提示 */}
      {error && (
        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30 p-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div>
              <div className="font-semibold text-red-400">操作失败</div>
              <div className="text-sm text-red-300">{error}</div>
            </div>
          </div>
        </Card>
      )}

      {/* 潜在客户提示页 */}
      {step === "new_customer_install" && restaurantInfo && (
        <NewCustomerPrompt
          restaurantInfo={restaurantInfo}
          onBindDevice={() => setStep("bind_device")}
          onBack={() => setStep("scan_restaurant")}
        />
      )}

      {/* 设备绑定页（一键安装） */}
      {step === "bind_device" && restaurantInfo && (
        <BindDevicePage
          restaurantInfo={restaurantInfo}
          onComplete={() => {
            // 绑定完成后，重新获取餐厅信息（此时应该已有设备）
            fetchRestaurantInfo(qrToken)
          }}
          onBack={() => setStep("new_customer_install")}
        />
      )}

      {/* 步骤1: 扫描餐厅二维码 */}
      {step === "scan_restaurant" && (
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <QrCode className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">扫描餐厅身份二维码</h2>
              <p className="text-sm text-slate-400">获取餐厅设备列表</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qrToken" className="text-slate-300 flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                餐厅二维码 <span className="text-red-400">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="qrToken"
                  type="text"
                  placeholder="请扫描餐厅身份二维码或手动输入"
                  value={qrToken}
                  onChange={(e) => handleQrTokenChange(e.target.value)}
                  className="flex-1 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  onClick={handleRestaurantScan}
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  disabled={isLoading}
                >
                  <QrCode className="h-5 w-5" />
                </Button>
              </div>
              {restaurantInfo && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="text-sm text-green-400 font-medium">餐厅验证成功</div>
                  <div className="text-xs text-green-300 mt-1">
                    {restaurantInfo.name} · {restaurantInfo.address}
                  </div>
                </div>
              )}
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-400 mr-2" />
                <span className="text-sm text-slate-400">加载设备列表...</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 步骤2: 设备列表 */}
      {step === "device_list" && restaurantInfo && (
        <div className="space-y-4">
          {/* 餐厅信息卡片 */}
          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-white">{restaurantInfo.name}</div>
                <div className="text-sm text-blue-200 mt-1">{restaurantInfo.address}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("scan_restaurant")
                  setRestaurantInfo(null)
                  setDevices([])
                  setQrToken("")
                }}
                className="text-blue-200 hover:text-white"
              >
                更换餐厅
              </Button>
            </div>
          </Card>

          {/* 设备列表 */}
          {devices.length === 0 ? (
            <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <div className="text-slate-400">该餐厅暂无设备</div>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <Card
                  key={device.device_id}
                  className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm p-4 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 ${
                        device.container_type === "fixed_tank" 
                          ? "bg-blue-500/20" 
                          : "bg-orange-500/20"
                      } rounded-xl flex items-center justify-center`}>
                        {device.container_type === "fixed_tank" ? (
                          <Droplet className="h-5 w-5 text-blue-400" />
                        ) : (
                          <Package className="h-5 w-5 text-orange-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-white text-sm">{device.model}</h4>
                          <Badge
                            className={
                              device.status === "online"
                                ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs"
                                : "bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs"
                            }
                          >
                            {device.status === "online" ? "在线" : "离线"}
                          </Badge>
                          {device.is_locked && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                              已锁机
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mb-1">{device.address}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-300">燃料: {device.fuel_percentage.toFixed(1)}%</span>
                          <span className="text-slate-400">
                            {device.container_type === "fixed_tank" ? "固定油箱" : "钢瓶"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDeviceAction(device)}
                      disabled={device.is_locked}
                      className={
                        device.container_type === "fixed_tank"
                          ? "bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 text-white ml-3"
                          : "bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 text-white ml-3"
                      }
                    >
                      {device.container_type === "fixed_tank" ? "加注" : "换瓶"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 步骤3: 扫描钢瓶二维码（仅 cylinder 场景） */}
      {step === "cylinder_scan" && selectedDevice && (
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">扫描新钢瓶身份码</h2>
              <p className="text-sm text-slate-400">请扫描要更换的新钢瓶二维码</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 mb-1">当前设备</div>
              <div className="text-sm font-medium text-white">{selectedDevice.model}</div>
              <div className="text-xs text-slate-400 mt-1">{selectedDevice.address}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cylinderId" className="text-slate-300 flex items-center gap-2">
                <Package className="h-4 w-4" />
                钢瓶ID <span className="text-red-400">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="cylinderId"
                  type="text"
                  placeholder="请扫描钢瓶二维码或手动输入"
                  value={cylinderId}
                  onChange={(e) => setCylinderId(e.target.value)}
                  className="flex-1 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500"
                />
                <Button
                  type="button"
                  onClick={handleCylinderScan}
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white"
                >
                  <QrCode className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-slate-500">扫描新钢瓶的身份码，系统将自动更新设备关联</p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setStep("device_list")
                  setSelectedDevice(null)
                  setCylinderId("")
                }}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回列表
              </Button>
              <Button
                onClick={() => {
                  if (cylinderId.trim()) {
                    setStep("filling")
                  } else {
                    setError("请先扫描或输入钢瓶ID")
                  }
                }}
                disabled={!cylinderId.trim()}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 text-white"
              >
                下一步：填写信息
                <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 步骤4: 填写配送信息 */}
      {step === "filling" && selectedDevice && (
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {selectedDevice.container_type === "fixed_tank" ? "填写加注信息" : "确认换瓶信息"}
              </h2>
              <p className="text-sm text-slate-400">填写配送详情并提交</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 设备信息 */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 mb-2">设备信息</div>
              <div className="text-sm font-medium text-white">{selectedDevice.model}</div>
              <div className="text-xs text-slate-400 mt-1">{selectedDevice.address}</div>
              <div className="text-xs text-slate-400 mt-1">燃料: {selectedDevice.fuel_percentage.toFixed(1)}%</div>
            </div>

            {/* 固定油箱：输入加注升数 */}
            {selectedDevice.container_type === "fixed_tank" && (
              <div className="space-y-2">
                <Label htmlFor="fuelAmountLiters" className="text-slate-300 flex items-center gap-2">
                  <Droplet className="h-4 w-4" />
                  加注升数 (L) <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="fuelAmountLiters"
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="请输入加注的升数"
                  value={fuelAmountLiters}
                  onChange={(e) => setFuelAmountLiters(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-slate-500">当前: {selectedDevice.fuel_percentage.toFixed(1)}%</p>
              </div>
            )}

            {/* 钢瓶：显示钢瓶ID */}
            {selectedDevice.container_type === "cylinder" && (
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 mb-2">新钢瓶ID</div>
                <div className="text-sm font-medium text-white">{cylinderId}</div>
                <p className="text-xs text-slate-500 mt-1">换瓶后燃料将自动更新为100%</p>
              </div>
            )}

            {/* 配送人姓名 */}
            <div className="space-y-2">
              <Label htmlFor="deliveryPerson" className="text-slate-300 flex items-center gap-2">
                <User className="h-4 w-4" />
                配送人姓名 <span className="text-red-400">*</span>
              </Label>
              <Input
                id="deliveryPerson"
                type="text"
                placeholder="请输入您的姓名"
                value={deliveryPerson}
                onChange={(e) => setDeliveryPerson(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-green-500"
                disabled={isSubmitting}
              />
            </div>

            {/* 燃料批次（可选） */}
            <div className="space-y-2">
              <Label htmlFor="fuelBatchId" className="text-slate-300 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                燃料批次ID（可选）
              </Label>
              <Input
                id="fuelBatchId"
                type="text"
                placeholder="请输入燃料批次编号"
                value={fuelBatchId}
                onChange={(e) => setFuelBatchId(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-green-500"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (selectedDevice.container_type === "cylinder") {
                    setStep("cylinder_scan")
                  } else {
                    setStep("device_list")
                  }
                  setSelectedDevice(null)
                }}
                variant="outline"
                disabled={isSubmitting}
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !deliveryPerson.trim() ||
                  (selectedDevice.container_type === "fixed_tank" && (!fuelAmountLiters.trim() || parseFloat(fuelAmountLiters) <= 0)) ||
                  (selectedDevice.container_type === "cylinder" && !cylinderId.trim())
                }
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white h-12 text-lg font-semibold shadow-lg shadow-green-500/30"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    确认提交
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 使用说明（仅在扫描餐厅阶段显示） */}
      {step === "scan_restaurant" && (
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Smartphone className="h-4 w-4 text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white mb-2">使用说明</h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">•</span>
                  <span>首先扫描餐厅客户端 APP 展示的身份二维码</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">•</span>
                  <span>系统将自动获取该餐厅的所有设备列表</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">•</span>
                  <span>固定油箱设备：点击"加注"按钮，输入加注升数</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">•</span>
                  <span>钢瓶设备：点击"换瓶"按钮，扫描新钢瓶身份码</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">•</span>
                  <span>所有操作都会记录配送人姓名、时间、地点和批次信息</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

// 开发中提示组件（用于维修功能）
function ComingSoon({ title, description, onBack }: { title: string; description: string; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-slate-300 hover:text-white hover:bg-slate-800/50"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回首页
      </Button>

      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-10 w-10 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-slate-400">{description}</p>
        </div>
      </Card>
    </div>
  )
}

// 主组件
export default function WorkerPage() {
  const [currentView, setCurrentView] = useState<"home" | "install" | "delivery" | "repair">("home")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 backdrop-blur-lg border-b border-blue-800/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentView !== "home" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentView("home")}
                  className="text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/30">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-white">
                  {currentView === "home" && "服务端工作台"}
                  {currentView === "install" && "设备安装登记"}
                  {currentView === "delivery" && "燃料配送"}
                  {currentView === "repair" && "故障维修"}
                </h1>
                <p className="text-xs text-blue-400">
                  {currentView === "home" && "多功能工作平台"}
                  {currentView === "install" && "扫码登记设备信息"}
                  {currentView === "delivery" && "燃料补给登记"}
                  {currentView === "repair" && "设备故障处理"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-md mx-auto">
          {currentView === "home" && (
            <div className="space-y-6">
              {/* 欢迎卡片 */}
              <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
                    <Package className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">服务端工作台</h2>
                  <p className="text-sm text-slate-400">选择您要执行的操作</p>
                </div>
              </Card>

              {/* 三个功能按钮 */}
              <div className="space-y-4">
                {/* 设备安装 */}
                <Card
                  className="bg-slate-900/40 backdrop-blur-md border border-blue-500/30 shadow-lg shadow-blue-500/20 p-6 hover:scale-[1.02] hover:shadow-blue-500/30 transition-all cursor-pointer"
                  onClick={() => setCurrentView("install")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
                      <Package className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">设备安装</h3>
                      <p className="text-sm text-slate-400">扫码登记新设备安装信息</p>
                    </div>
                    <ArrowLeft className="h-5 w-5 text-slate-400 rotate-180" />
                  </div>
                </Card>

                {/* 燃料配送 */}
                <Card
                  className="bg-slate-900/40 backdrop-blur-md border border-blue-500/30 shadow-lg shadow-blue-500/20 p-6 hover:scale-[1.02] hover:shadow-blue-500/30 transition-all cursor-pointer"
                  onClick={() => setCurrentView("delivery")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 flex-shrink-0">
                      <Truck className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">燃料配送</h3>
                      <p className="text-sm text-slate-400">记录燃料补给信息</p>
                    </div>
                    <ArrowLeft className="h-5 w-5 text-slate-400 rotate-180" />
                  </div>
                </Card>

                {/* 故障维修 */}
                <Card
                  className="bg-slate-900/40 backdrop-blur-md border border-blue-500/30 shadow-lg shadow-blue-500/20 p-6 hover:scale-[1.02] hover:shadow-blue-500/30 transition-all cursor-pointer"
                  onClick={() => setCurrentView("repair")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/30 flex-shrink-0">
                      <Wrench className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">故障维修</h3>
                      <p className="text-sm text-slate-400">处理设备故障和申请解锁</p>
                    </div>
                    <ArrowLeft className="h-5 w-5 text-slate-400 rotate-180" />
                  </div>
                </Card>
              </div>

              {/* 使用说明 */}
              <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Smartphone className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white mb-2">使用说明</h3>
                    <ul className="space-y-1.5 text-xs text-slate-400">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>点击功能卡片进入对应的工作页面</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>所有操作都会记录操作人姓名和时间</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>请确保网络连接正常，以便数据同步</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {currentView === "install" && (
            <InstallForm onBack={() => setCurrentView("home")} />
          )}

          {currentView === "delivery" && (
            <DeliveryForm onBack={() => setCurrentView("home")} />
          )}

          {currentView === "repair" && (
            <ComingSoon
              title="故障维修功能"
              description="该功能正在开发中，敬请期待"
              onBack={() => setCurrentView("home")}
            />
          )}
        </div>
      </main>
    </div>
  )
}

