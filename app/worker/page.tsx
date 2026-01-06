"use client"

import { useState, useEffect, useRef } from "react"
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
  Camera,
  List,
  Trash2,
  Plus,
  LogIn,
  HardHat,
  LogOut,
  Wifi,
  WifiOff,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { WorkerOrderList } from "@/components/worker/order-list"
import { WorkerRepairList } from "@/components/worker/repair-list"
import { QRScanner } from "@/components/worker/qr-scanner"
import { ImageUploader } from "@/components/worker/image-uploader"
// 不再使用 OrderStatus 枚举，统一使用小写字符串
import { useOfflineSync } from "@/hooks/use-offline-sync"
import { apiRequest } from "@/lib/api-client"

// 设备型号选项
const DEVICE_MODELS = [
  { id: "v2.0", name: "智能燃料监控系统 V2.0" },
  { id: "v1.0", name: "智能燃料监控系统 V1.0" },
  { id: "pro", name: "智能燃料监控系统 Pro" },
  { id: "lite", name: "智能燃料监控系统 Lite" },
]

// 设备清单项类型
interface DeviceListItem {
  id: string // 临时ID，用于列表管理
  deviceId: string // 设备ID
  model: string // 设备型号
}

// 安装登记表单组件（批量绑定版本）
function InstallForm({ onBack, workerId }: { onBack: () => void; workerId?: string | null }) {
  const [address, setAddress] = useState("")
  const [installer, setInstaller] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState("")
  const [installProofImageUrl, setInstallProofImageUrl] = useState<string | null>(null) // 安装凭证图片URL
  
  // 客户信息相关状态
  const [customerId, setCustomerId] = useState<string | null>(null) // 客户ID（餐厅ID）
  const [customerName, setCustomerName] = useState("") // 客户名称
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false) // 正在加载客户信息
  const [customerAutoFilled, setCustomerAutoFilled] = useState(false) // 客户信息是否已自动填充

  // 设备清单相关状态
  const [deviceList, setDeviceList] = useState<DeviceListItem[]>([]) // 待绑定设备清单
  const [currentDeviceId, setCurrentDeviceId] = useState("") // 当前输入的设备ID
  const [currentDeviceModel, setCurrentDeviceModel] = useState("v2.0") // 当前选择的设备型号
  const [showDeviceQRScanner, setShowDeviceQRScanner] = useState(false) // 显示设备二维码扫描器

  // 添加设备到清单
  const handleAddDevice = () => {
    if (!currentDeviceId.trim()) {
      setError("请输入设备ID")
      return
    }

    // 检查设备ID是否已存在
    if (deviceList.some((item) => item.deviceId === currentDeviceId.trim())) {
      setError("该设备ID已存在于清单中")
      return
    }

    // 获取型号名称
    const modelName = DEVICE_MODELS.find((m) => m.id === currentDeviceModel)?.name || "智能燃料监控系统 V2.0"

    // 添加到清单
    const newDevice: DeviceListItem = {
      id: Date.now().toString(), // 临时ID
      deviceId: currentDeviceId.trim(),
      model: modelName,
    }

    setDeviceList([...deviceList, newDevice])
    setCurrentDeviceId("") // 清空输入
    setError("")
  }

  // 从清单中移除设备
  const handleRemoveDevice = (id: string) => {
    setDeviceList(deviceList.filter((item) => item.id !== id))
  }

  // 设备二维码扫描成功回调
  const handleDeviceQRScanSuccess = (decodedText: string) => {
    setCurrentDeviceId(decodedText.trim())
    setShowDeviceQRScanner(false)
  }

  // 批量处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[安装表单] 开始提交，当前状态:', {
      deviceListLength: deviceList.length,
      address: address,
      installer: installer,
      customerId: customerId,
      customerName: customerName
    })
    
    setError("")
    setSubmitSuccess(false)

    // 验证表单
    if (deviceList.length === 0) {
      const errorMsg = "请至少添加一个设备到清单"
      console.error('[安装表单] 验证失败:', errorMsg)
      setError(errorMsg)
      return
    }

    if (!address.trim()) {
      const errorMsg = "请输入安装地址"
      console.error('[安装表单] 验证失败:', errorMsg)
      setError(errorMsg)
      return
    }

    if (!installer.trim()) {
      const errorMsg = "请输入安装人姓名"
      console.error('[安装表单] 验证失败:', errorMsg)
      setError(errorMsg)
      return
    }

    if (!customerId) {
      const errorMsg = "请先扫描客户二维码获取客户信息"
      console.error('[安装表单] 验证失败:', errorMsg)
      setError(errorMsg)
      return
    }

    console.log('[安装表单] 验证通过，开始提交...')
    setIsSubmitting(true)

    try {
      const installDate = new Date().toISOString()
      const successDevices: string[] = []
      const failedDevices: string[] = []

      // 批量安装和绑定设备
      for (const device of deviceList) {
        try {
          // 1. 安装设备
          const installHeaders: HeadersInit = {
            "Content-Type": "application/json",
          }
          
          // 如果已登录，添加worker_id到请求头
          if (workerId) {
            installHeaders["x-worker-id"] = workerId
          }

          const installResult = await apiRequest({
            endpoint: "/api/install",
            method: "POST",
            headers: installHeaders,
            body: {
              device_id: device.deviceId,
              model: device.model,
              address: address.trim(),
              installer: installer.trim(),
              install_date: installDate,
              install_proof_image: installProofImageUrl || undefined, // 安装凭证图片URL
              worker_id: workerId || undefined,
            },
            showToast: false, // 批量操作时不显示单个设备的Toast
            successMessage: `设备 ${device.deviceId} 安装成功`,
            operationType: "install",
            enableOfflineStorage: true,
          })

          if (!installResult.success) {
            throw new Error(installResult.error || `设备 ${device.deviceId} 安装失败`)
          }
          
          const installData = installResult.data

          // 2. 将设备关联到客户
          if (supabase) {
            const { error: linkError } = await supabase
              .from("devices")
              .update({
                restaurant_id: customerId,
                updated_at: new Date().toISOString(),
              })
              .eq("device_id", device.deviceId)

            if (linkError) {
              console.error(`关联设备 ${device.deviceId} 到客户失败:`, linkError)
              failedDevices.push(device.deviceId)
            } else {
              console.log(`✅ 设备 ${device.deviceId} 已成功关联到客户`)
              successDevices.push(device.deviceId)
            }
          }
        } catch (err: any) {
          console.error(`处理设备 ${device.deviceId} 失败:`, err)
          failedDevices.push(device.deviceId)
        }
      }

      // 检查结果
      if (failedDevices.length > 0 && successDevices.length === 0) {
        throw new Error(`所有设备安装失败: ${failedDevices.join(", ")}`)
      }

      if (failedDevices.length > 0) {
        console.warn(`部分设备安装失败: ${failedDevices.join(", ")}`)
        // 显示警告但不阻止成功提示
      }

      // 3. 如果有成功绑定的设备，更新餐厅状态为已激活
      if (successDevices.length > 0 && customerId && supabase) {
        try {
          const { error: statusError } = await supabase
            .from("restaurants")
            .update({
              status: "activated",
              updated_at: new Date().toISOString(),
            })
            .eq("id", customerId)

          if (statusError) {
            console.error("更新餐厅状态失败:", statusError)
            // 不阻止流程，只记录错误
          } else {
            console.log("✅ 餐厅状态已更新为已激活")
          }
        } catch (err) {
          console.error("更新餐厅状态时出错:", err)
          // 不阻止流程，只记录错误
        }
      }

      // 提交成功
      console.log('[安装表单] 提交成功！', {
        successDevices,
        failedDevices
      })
      setSubmitSuccess(true)
      
      // 清空表单
      setDeviceList([])
      setCurrentDeviceId("")
      setAddress("")
      setInstaller("")
      setInstallProofImageUrl(null) // 清空图片
      setCustomerId(null)
      setCustomerName("")
      setCustomerAutoFilled(false)

      // 3秒后重置成功状态
      setTimeout(() => {
        setSubmitSuccess(false)
      }, 3000)
    } catch (err: any) {
      console.error('[安装表单] 提交失败:', err)
      const errorMessage = err.message || "提交失败，请检查网络连接"
      setError(errorMessage)
      alert(`安装失败: ${errorMessage}\n\n请查看浏览器控制台获取详细信息`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 客户二维码扫描功能
  const [showCustomerQRScanner, setShowCustomerQRScanner] = useState(false)
  const [customerQRInput, setCustomerQRInput] = useState("")

  // 获取客户信息
  const fetchCustomerInfo = async (qrToken: string) => {
    setIsLoadingCustomer(true)
    setError("")

    try {
      const response = await fetch(`/api/restaurant?qr_token=${encodeURIComponent(qrToken)}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "获取客户信息失败")
      }

      // 自动填充客户信息
      if (data.restaurant) {
        setCustomerId(data.restaurant.restaurant_id || data.restaurant.id)
        setCustomerName(data.restaurant.name || "")
        
        // 自动填充地址
        if (data.restaurant.address) {
          setAddress(data.restaurant.address)
          setCustomerAutoFilled(true)
        }

        // 如果有联系人姓名，也可以填充（可选）
        if (data.restaurant.contact_name) {
          // 可以在这里设置一个联系人字段，或者只显示
        }

        console.log("✅ 客户信息已自动填充:", data.restaurant)
      }
    } catch (err: any) {
      console.error("获取客户信息失败:", err)
      setError(err.message || "获取客户信息失败，请重试")
      setCustomerAutoFilled(false)
    } finally {
      setIsLoadingCustomer(false)
    }
  }

  // 客户二维码扫描成功回调
  const handleCustomerQRScanSuccess = (decodedText: string) => {
    const qrToken = decodedText.trim()
    setCustomerQRInput("")
    setShowCustomerQRScanner(false)
    fetchCustomerInfo(qrToken)
  }

  // 模拟获取客户信息（测试用）
  const handleMockCustomerInfo = () => {
    // 提示用户如何获取真实的 qr_token
    const userInput = prompt(
      "请输入客户的二维码令牌（qr_token）\n\n" +
      "获取方式：\n" +
      "1. 在个人中心（/profile）注册新客户\n" +
      "2. 注册成功后，在浏览器控制台查看 qr_token\n" +
      "3. 或访问首页，点击右上角二维码图标查看\n" +
      "4. 或在 Supabase Dashboard 中查询 restaurants 表\n\n" +
      "如果使用测试数据，请输入：test_qr_token_001"
    )
    
    if (userInput && userInput.trim()) {
      fetchCustomerInfo(userInput.trim())
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
          {/* 第一步：扫描客户码 */}
          <div className="space-y-2">
            <Label className="text-slate-300 flex items-center gap-2">
              <User className="h-4 w-4" />
              第一步：扫描客户码 <span className="text-red-400">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="扫描客户二维码或输入二维码内容"
                value={customerQRInput}
                onChange={(e) => setCustomerQRInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && customerQRInput.trim()) {
                    fetchCustomerInfo(customerQRInput.trim())
                  }
                }}
                className="flex-1 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                disabled={isSubmitting || isLoadingCustomer}
              />
              <Button
                type="button"
                onClick={() => setShowCustomerQRScanner(true)}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white"
                disabled={isSubmitting || isLoadingCustomer}
              >
                <QrCode className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                onClick={handleMockCustomerInfo}
                variant="outline"
                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                disabled={isSubmitting || isLoadingCustomer}
              >
                模拟获取
              </Button>
            </div>
            {isLoadingCustomer && (
              <div className="flex items-center gap-2 text-xs text-blue-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>正在获取客户信息...</span>
              </div>
            )}
            {customerAutoFilled && customerName && (
              <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>自动识别成功：{customerName}</span>
                </div>
              </div>
            )}
            {/* 客户二维码扫描器 */}
            {showCustomerQRScanner && (
              <QRScanner
                onScanSuccess={handleCustomerQRScanSuccess}
                onClose={() => setShowCustomerQRScanner(false)}
                title="扫描客户二维码"
              />
            )}
          </div>

          {/* 第二步：待绑定设备清单 */}
          <div className="space-y-2">
            <Label className="text-slate-300 flex items-center gap-2">
              <List className="h-4 w-4" />
              第二步：待绑定设备清单 <span className="text-red-400">*</span>
              {deviceList.length > 0 && (
                <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  {deviceList.length} 台设备
                </Badge>
              )}
            </Label>

            {/* 添加设备输入区域 */}
            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  placeholder="扫描或输入设备ID（如：TEST-DEV-001）"
                  value={currentDeviceId}
                  onChange={(e) => setCurrentDeviceId(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddDevice()
                    }
                  }}
                  className="flex-1 bg-slate-700/50 border-slate-600 text-white text-sm"
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  onClick={() => setShowDeviceQRScanner(true)}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-400 hover:text-white"
                  disabled={isSubmitting}
                >
                  <QrCode className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  onClick={handleAddDevice}
                  size="sm"
                  className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                  disabled={!currentDeviceId.trim() || isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加
                </Button>
              </div>

              {/* 设备型号选择 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">设备型号：</span>
                <select
                  value={currentDeviceModel}
                  onChange={(e) => setCurrentDeviceModel(e.target.value)}
                  className="flex-1 bg-slate-700/50 border border-slate-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                  disabled={isSubmitting}
                >
                  {DEVICE_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 快速填充按钮 */}
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    const deviceId = "TEST-DEV-001"
                    // 检查设备ID是否已存在
                    if (deviceList.some((item) => item.deviceId === deviceId)) {
                      setError("该设备ID已存在于清单中")
                      return
                    }
                    // 获取型号名称
                    const modelName = DEVICE_MODELS.find((m) => m.id === currentDeviceModel)?.name || "智能燃料监控系统 V2.0"
                    // 直接添加到清单
                    const newDevice: DeviceListItem = {
                      id: Date.now().toString(),
                      deviceId: deviceId,
                      model: modelName,
                    }
                    setDeviceList([...deviceList, newDevice])
                    setError("")
                  }}
                  size="sm"
                  variant="outline"
                  className="text-xs border-slate-600 text-slate-400 hover:text-white h-7"
                  disabled={isSubmitting}
                >
                  + TEST-DEV-001
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const deviceId = "TEST-DEV-002"
                    // 检查设备ID是否已存在
                    if (deviceList.some((item) => item.deviceId === deviceId)) {
                      setError("该设备ID已存在于清单中")
                      return
                    }
                    // 获取型号名称
                    const modelName = DEVICE_MODELS.find((m) => m.id === currentDeviceModel)?.name || "智能燃料监控系统 V2.0"
                    // 直接添加到清单
                    const newDevice: DeviceListItem = {
                      id: (Date.now() + 1).toString(),
                      deviceId: deviceId,
                      model: modelName,
                    }
                    setDeviceList([...deviceList, newDevice])
                    setError("")
                  }}
                  size="sm"
                  variant="outline"
                  className="text-xs border-slate-600 text-slate-400 hover:text-white h-7"
                  disabled={isSubmitting}
                >
                  + TEST-DEV-002
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const deviceId = "TEST-DEV-003"
                    // 检查设备ID是否已存在
                    if (deviceList.some((item) => item.deviceId === deviceId)) {
                      setError("该设备ID已存在于清单中")
                      return
                    }
                    // 获取型号名称
                    const modelName = DEVICE_MODELS.find((m) => m.id === currentDeviceModel)?.name || "智能燃料监控系统 V2.0"
                    // 直接添加到清单
                    const newDevice: DeviceListItem = {
                      id: (Date.now() + 2).toString(),
                      deviceId: deviceId,
                      model: modelName,
                    }
                    setDeviceList([...deviceList, newDevice])
                    setError("")
                  }}
                  size="sm"
                  variant="outline"
                  className="text-xs border-slate-600 text-slate-400 hover:text-white h-7"
                  disabled={isSubmitting}
                >
                  + TEST-DEV-003
                </Button>
              </div>
            </div>

            {/* 设备清单列表 */}
            {deviceList.length > 0 && (
              <div className="space-y-2">
                {deviceList.map((device) => (
                  <Card
                    key={device.id}
                    className="bg-slate-800/50 border-slate-700 p-3 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-400" />
                        <span className="text-white font-medium text-sm">{device.deviceId}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{device.model}</div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleRemoveDevice(device.id)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {/* 设备二维码扫描器 */}
            {showDeviceQRScanner && (
              <QRScanner
                onScanSuccess={handleDeviceQRScanSuccess}
                onClose={() => setShowDeviceQRScanner(false)}
                title="扫描设备二维码"
              />
            )}
          </div>

          {/* 安装地址 */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-slate-300 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              安装地址 <span className="text-red-400">*</span>
              {customerAutoFilled && (
                <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  已自动识别
                </Badge>
              )}
            </Label>
            <Input
              id="address"
              type="text"
              placeholder={customerAutoFilled ? "地址已自动填充，可手动微调" : "请输入详细安装地址"}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value)
                // 如果用户手动修改了地址，取消自动填充标记（可选）
                if (customerAutoFilled && e.target.value !== address) {
                  // 保持自动填充标记，允许微调
                }
              }}
              className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 ${
                customerAutoFilled ? "border-green-500/30" : ""
              }`}
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500">
              {customerAutoFilled ? "地址已自动识别，您可以根据实际情况进行微调" : "例如：昆明市五华区xxx路123号"}
            </p>
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

          {/* 安装凭证图片上传 */}
          <div className="space-y-2">
            <Label className="text-slate-300 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              安装凭证照片
              <span className="text-xs text-slate-500 ml-2">（可选，建议上传安装完成后的现场照片）</span>
            </Label>
            <ImageUploader
              onUploadSuccess={(imageUrl) => {
                setInstallProofImageUrl(imageUrl)
                console.log("[安装表单] 图片上传成功:", imageUrl)
              }}
              onRemove={() => {
                setInstallProofImageUrl(null)
                console.log("[安装表单] 图片已移除")
              }}
              currentImageUrl={installProofImageUrl}
              label="上传安装凭证照片"
            />
            {installProofImageUrl && (
              <p className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                安装凭证照片已上传
              </p>
            )}
          </div>

          {/* 客户信息显示（如果已识别） */}
          {customerAutoFilled && customerId && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="text-xs text-blue-400 mb-1">已关联客户</div>
              <div className="text-sm text-white font-medium">{customerName}</div>
              <div className="text-xs text-slate-400 mt-1">客户ID: {customerId.substring(0, 8)}...</div>
            </div>
          )}

          {/* 提交按钮 */}
          <Button
            type="submit"
            disabled={isSubmitting || submitSuccess || deviceList.length === 0 || !customerId}
            onClick={(e) => {
              // 添加点击事件调试
              console.log('[安装表单] 按钮被点击', {
                isSubmitting,
                submitSuccess,
                deviceListLength: deviceList.length,
                customerId,
                disabled: isSubmitting || submitSuccess || deviceList.length === 0 || !customerId
              })
              // 如果按钮被禁用，显示原因
              if (isSubmitting) {
                console.warn('[安装表单] 按钮被禁用：正在提交中')
              } else if (submitSuccess) {
                console.warn('[安装表单] 按钮被禁用：已提交成功')
              } else if (deviceList.length === 0) {
                console.warn('[安装表单] 按钮被禁用：设备列表为空')
                alert('请至少添加一个设备到清单')
              } else if (!customerId) {
                console.warn('[安装表单] 按钮被禁用：未关联客户')
                alert('请先扫描客户二维码获取客户信息')
              }
            }}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 text-white h-12 text-lg font-semibold shadow-lg shadow-blue-500/30 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                批量安装中... ({deviceList.length} 台设备)
              </>
            ) : submitSuccess ? (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2 text-green-400 animate-in zoom-in-95 duration-300" />
                <span className="text-green-400">安装完成</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                确认安装完成 ({deviceList.length} 台设备)
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

        // 3. 同步更新餐厅状态为 activated
        const { error: statusError } = await supabase
          .from("restaurants")
          .update({
            status: "activated",
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
function NewCustomerInstallGuide({ restaurantInfo, onComplete, onBack, workerId }: {
  restaurantInfo: RestaurantInfo | null
  onComplete: () => void
  onBack: () => void
  workerId?: string | null
}) {
  const [deviceId, setDeviceId] = useState("")
  const [model, setModel] = useState("")
  const [address, setAddress] = useState("")
  const [installer, setInstaller] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState("")
  const [showQRScanner, setShowQRScanner] = useState(false) // 显示二维码扫描器
  const [manualInput, setManualInput] = useState("") // 手动输入（用于测试）
  const [installProofImageUrl, setInstallProofImageUrl] = useState<string | null>(null) // 安装凭证图片URL

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
      const installHeaders: HeadersInit = {
        "Content-Type": "application/json",
      }
      
      // 如果已登录，添加worker_id到请求头
      if (workerId) {
        installHeaders["x-worker-id"] = workerId
      }

      const installResult = await apiRequest({
        endpoint: "/api/install",
        method: "POST",
        headers: installHeaders,
        body: {
          device_id: deviceId.trim(),
          model: model.trim(),
          address: address.trim(),
          installer: installer.trim(),
          install_date: new Date().toISOString(),
          install_proof_image: installProofImageUrl || undefined, // 安装凭证图片URL
          worker_id: workerId || undefined,
        },
        showToast: true,
        successMessage: "设备安装信息已成功保存",
        errorMessage: "设备安装失败",
        operationType: "install",
        enableOfflineStorage: true,
      })
      
      if (!installResult.success) {
        throw new Error(installResult.error || "设备安装失败")
      }
      
      const installData = installResult.data

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

        // 3. 创建安装订单，状态设为 pending_acceptance（待验收）
        const orderResponse = await fetch("/api/orders/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restaurantInfo.restaurant_id,
            service_type: "设备安装",
            status: "pending_acceptance", // 待验收（使用小写字符串）
            amount: 0, // 安装订单金额为0
          }),
        })

        const orderResult = await orderResponse.json()

        if (!orderResponse.ok || orderResult.error) {
          console.error("创建安装订单失败:", orderResult.error)
          // 不阻止流程，只记录错误
        } else {
          console.log("安装订单创建成功，订单ID:", orderResult.data?.id)
          // 可以将订单ID保存到localStorage，供客户确认验收页面使用
          if (orderResult.data?.id) {
            localStorage.setItem(`pending_acceptance_order_${restaurantInfo.restaurant_id}`, orderResult.data.id)
          }
        }

        // 4. 更新餐厅状态为 active（可选，根据业务需求）
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

          {/* 安装凭证图片上传 */}
          <div className="space-y-2">
            <Label className="text-slate-300 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              安装凭证照片
              <span className="text-xs text-slate-500 ml-2">（可选，建议上传安装完成后的现场照片）</span>
            </Label>
            <ImageUploader
              onUploadSuccess={(imageUrl) => {
                setInstallProofImageUrl(imageUrl)
                console.log("[新客安装] 图片上传成功:", imageUrl)
              }}
              onRemove={() => {
                setInstallProofImageUrl(null)
                console.log("[新客安装] 图片已移除")
              }}
              currentImageUrl={installProofImageUrl}
              label="上传安装凭证照片"
            />
            {installProofImageUrl && (
              <p className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                安装凭证照片已上传
              </p>
            )}
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

// 燃料配送组件（重构版：支持订单配送，包含扫码和拍照）
function DeliveryForm({ onBack, workerId }: { onBack: () => void; workerId?: string | null }) {
  const [step, setStep] = useState<"select_order" | "order_list" | "scan_restaurant" | "device_list" | "filling" | "cylinder_scan" | "new_customer_install" | "bind_device" | "delivery_proof">("select_order")
  const [qrToken, setQrToken] = useState("")
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null) // 选中的订单
  const [trackingCode, setTrackingCode] = useState("") // 瓶身溯源二维码
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null) // 配送凭证图片URL
  const [showQRScanner, setShowQRScanner] = useState(false) // 显示二维码扫描器
  const [manualInput, setManualInput] = useState("") // 手动输入（用于测试）
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
    setShowQRScanner(true)
  }

  // 二维码扫描成功回调
  const handleQRScanSuccess = (decodedText: string) => {
    if (step === "cylinder_scan") {
      setCylinderId(decodedText.trim())
      setError("")
      setStep("filling")
    } else if (step === "delivery_proof") {
      // 扫描瓶身溯源二维码
      setTrackingCode(decodedText.trim())
      setError("")
    }
    setShowQRScanner(false)
  }

  // 图片上传成功回调
  const handleImageUploadSuccess = (imageUrl: string) => {
    setProofImageUrl(imageUrl)
  }

  // 移除图片
  const handleRemoveImage = () => {
    setProofImageUrl(null)
  }

  // 提交配送记录（新版本：支持订单配送）
  const handleSubmit = async () => {
    // 如果有选中的订单，使用订单配送流程
    if (selectedOrder) {
      // 验证必要字段
      if (!trackingCode.trim()) {
        setError("请扫描瓶身溯源二维码")
        setStep("delivery_proof")
        return
      }

      if (!proofImageUrl) {
        setError("请上传配送凭证图片")
        setStep("delivery_proof")
        return
      }

      setIsSubmitting(true)
      setError("")

      try {
        // 调用完成配送API
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        }
        
        // 如果已登录，添加worker_id到请求头
        if (workerId) {
          headers["x-worker-id"] = workerId
        }

        const response = await fetch("/api/orders/complete", {
          method: "POST",
          headers,
          body: JSON.stringify({
            order_id: selectedOrder.id,
            tracking_code: trackingCode.trim(),
            proof_image: proofImageUrl,
            worker_id: workerId || undefined, // 也添加到请求体，兼容性考虑
          }),
        })

        const result = await response.json()

        if (!response.ok || result.error) {
          throw new Error(result.error || "完成配送失败")
        }

        // 提交成功
        setSubmitSuccess(true)
        
        // 重置表单
        setSelectedOrder(null)
        setTrackingCode("")
        setProofImageUrl(null)
        setStep("select_order")
        
        // 3秒后清除成功提示
        setTimeout(() => {
          setSubmitSuccess(false)
        }, 3000)
      } catch (err: any) {
        setError(err.message || "提交失败，请检查网络连接")
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // 旧流程：设备配送（保留兼容性）
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

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      
      // 如果已登录，添加worker_id到请求头
      if (workerId) {
        headers["x-worker-id"] = workerId
      }

      const response = await fetch("/api/filling", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...requestBody,
          worker_id: workerId || undefined, // 也添加到请求体，兼容性考虑
        }),
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

      {/* 步骤0: 选择订单或扫描餐厅 */}
      {step === "select_order" && (
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">选择配送方式</h2>
              <p className="text-sm text-slate-400">选择订单配送或设备配送</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                // 加载待接单订单
                setStep("order_list")
              }}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 text-white h-12"
            >
              <Package className="h-5 w-5 mr-2" />
              订单配送（推荐）
            </Button>
            <Button
              onClick={() => setStep("scan_restaurant")}
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800/50 h-12"
            >
              <QrCode className="h-5 w-5 mr-2" />
              设备配送（传统方式）
            </Button>
          </div>
        </Card>
      )}

      {/* 订单列表（从订单列表选择） */}
      {step === "order_list" && (
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">选择订单</h2>
              <p className="text-sm text-slate-400">选择要配送的订单</p>
            </div>
          </div>
          <WorkerOrderList
            productType={null}
            workerId={localStorage.getItem("workerId") || "worker_001"}
            onSelectOrder={(order) => {
              // 选择订单后，进入配送证明步骤
              setSelectedOrder(order)
              setStep("delivery_proof")
            }}
          />
          <Button
            onClick={() => setStep("select_order")}
            variant="outline"
            className="w-full mt-4 border-slate-700 text-slate-300 hover:bg-slate-800/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
        </Card>
      )}

      {/* 配送证明步骤（扫码+拍照） */}
      {step === "delivery_proof" && selectedOrder && (
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">配送证明</h2>
              <p className="text-sm text-slate-400">扫描瓶身二维码并上传配送凭证</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 订单信息 */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 mb-2">订单信息</div>
              <div className="text-sm font-medium text-white">订单号: {selectedOrder.id}</div>
            </div>

            {/* 扫描瓶身溯源二维码 */}
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                瓶身溯源二维码 <span className="text-red-400">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="请扫描瓶身二维码或手动输入（测试：BOTTLE-999）"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className="flex-1 bg-slate-800/50 border-slate-700 text-white"
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  onClick={() => setShowQRScanner(true)}
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800/50"
                  disabled={isSubmitting}
                >
                  <QrCode className="h-5 w-5" />
                </Button>
              </div>
              {/* 手动模拟输入区域 */}
              <div className="mt-2 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-2">测试模式：快速输入模拟溯源码</p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="输入模拟溯源码（如：BOTTLE-999）"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        setTrackingCode(manualInput.trim())
                        setManualInput("")
                      }
                    }}
                    className="flex-1 bg-slate-700/50 border-slate-600 text-white text-sm h-8"
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      setTrackingCode(manualInput.trim())
                      setManualInput("")
                    }}
                    size="sm"
                    className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                    disabled={!manualInput.trim() || isSubmitting}
                  >
                    快速填充
                  </Button>
                </div>
                <div className="mt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setTrackingCode("BOTTLE-999")
                      setManualInput("")
                    }}
                    size="sm"
                    variant="outline"
                    className="text-xs border-slate-600 text-slate-400 hover:text-white h-7"
                    disabled={isSubmitting}
                  >
                    使用测试码：BOTTLE-999
                  </Button>
                </div>
              </div>
            </div>
            {/* 二维码扫描器 */}
            {showQRScanner && (
              <QRScanner
                onScanSuccess={(decodedText) => {
                  setTrackingCode(decodedText.trim())
                  setShowQRScanner(false)
                }}
                onClose={() => setShowQRScanner(false)}
                title="扫描瓶身溯源二维码"
              />
            )}

            {/* 上传配送凭证 */}
            <ImageUploader
              onUploadSuccess={handleImageUploadSuccess}
              onRemove={handleRemoveImage}
              currentImageUrl={proofImageUrl}
              label="配送凭证图片 *"
            />

            {/* 提交按钮 */}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setStep("order_list")
                  setSelectedOrder(null)
                  setTrackingCode("")
                  setProofImageUrl(null)
                }}
                variant="outline"
                disabled={isSubmitting}
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800/50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !trackingCode.trim() || !proofImageUrl}
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
                    完成配送
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 二维码扫描器 */}
      {showQRScanner && (
        <QRScanner
          onScanSuccess={handleQRScanSuccess}
          onClose={() => setShowQRScanner(false)}
          title={step === "cylinder_scan" ? "扫描钢瓶二维码" : "扫描瓶身溯源二维码"}
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

// 设备交付助手组件
function RentalDeliveryAssistant({ workerId, onBack }: { workerId: string | null; onBack: () => void }) {
  const [step, setStep] = useState<"list" | "scan" | "photo" | "signature">("list")
  const [pendingRentals, setPendingRentals] = useState<any[]>([])
  const [isLoadingRentals, setIsLoadingRentals] = useState(false)
  const [selectedRental, setSelectedRental] = useState<any | null>(null)
  const [deviceSn, setDeviceSn] = useState("")
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string | null>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // 加载待交付的租赁单
  const loadPendingRentals = async () => {
    if (!supabase) return
    setIsLoadingRentals(true)
    try {
      const { data, error } = await supabase
        .from("rentals")
        .select("*")
        .eq("status", "pending_delivery")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[设备交付] 加载失败:", error)
        setPendingRentals([])
      } else {
        setPendingRentals(data || [])
      }
    } catch (err) {
      console.error("[设备交付] 加载失败:", err)
      setPendingRentals([])
    } finally {
      setIsLoadingRentals(false)
    }
  }

  useEffect(() => {
    loadPendingRentals()
  }, [])

  // 扫码成功回调
  const handleQRScanSuccess = (decodedText: string) => {
    setDeviceSn(decodedText.trim())
    setShowQRScanner(false)
  }

  // 验证设备序列号
  const handleVerifyDevice = () => {
    if (!deviceSn.trim()) {
      setError("请输入或扫描设备序列号")
      return
    }

    // 查找匹配的租赁单
    const rental = pendingRentals.find((r) => r.device_sn === deviceSn.trim())
    if (!rental) {
      setError("未找到匹配的租赁单，请检查设备序列号")
      return
    }

    setSelectedRental(rental)
    setStep("photo")
    setError("")
  }

  // 提交交付
  const handleSubmitDelivery = async () => {
    if (!deliveryPhotoUrl) {
      setError("请上传设备安放照片")
      return
    }

    if (!signatureData) {
      setError("请客户完成电子签名")
      return
    }

    if (!supabase || !selectedRental) return

    setIsSubmitting(true)
    setError("")

    try {
      // 更新租赁单状态为 active（租赁中）
      const { error: updateError } = await supabase
        .from("rentals")
        .update({
          status: "active",
          notes: selectedRental.notes
            ? `${selectedRental.notes}\n[交付完成] 交付照片: ${deliveryPhotoUrl}, 签名: 已确认, 交付时间: ${new Date().toLocaleString("zh-CN")}`
            : `[交付完成] 交付照片: ${deliveryPhotoUrl}, 签名: 已确认, 交付时间: ${new Date().toLocaleString("zh-CN")}`,
        })
        .eq("id", selectedRental.id)

      if (updateError) {
        throw updateError
      }

      alert("设备交付成功！")
      // 重置状态
      setStep("list")
      setSelectedRental(null)
      setDeviceSn("")
      setDeliveryPhotoUrl(null)
      setSignatureData(null)
      loadPendingRentals()
    } catch (err: any) {
      console.error("[设备交付] 提交失败:", err)
      setError(`提交失败: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 电子签名组件
  const SignaturePad = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
    }, [])

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      setIsDrawing(true)
      const rect = canvas.getBoundingClientRect()
      const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
      const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

      ctx.beginPath()
      ctx.moveTo(x, y)
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return

      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const rect = canvas.getBoundingClientRect()
      const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
      const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

      ctx.lineTo(x, y)
      ctx.stroke()
    }

    const stopDrawing = () => {
      setIsDrawing(false)
      const canvas = canvasRef.current
      if (!canvas) return

      const dataURL = canvas.toDataURL()
      setSignatureData(dataURL)
    }

    const clearSignature = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setSignatureData(null)
    }

    return (
      <div className="space-y-3">
        <Label className="text-slate-300">客户电子签名 *</Label>
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            className="w-full border border-slate-600 rounded-lg bg-white cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={clearSignature}
              className="border-slate-600 text-slate-300"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              清除
            </Button>
            {signatureData && (
              <div className="flex items-center gap-2 text-xs text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                <span>签名已完成</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    )
  }

  if (step === "list") {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
          <h2 className="text-xl font-bold text-white mb-4">待交付租赁单</h2>

          {isLoadingRentals ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
              <span className="text-slate-400">加载中...</span>
            </div>
          ) : pendingRentals.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">暂无待交付的租赁单</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRentals.map((rental) => (
                <Card
                  key={rental.id}
                  className="bg-slate-800/50 border-slate-700 p-4 hover:border-cyan-500/50 transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedRental(rental)
                    setDeviceSn(rental.device_sn)
                    setStep("scan")
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{rental.device_name}</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
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
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedRental(rental)
                        setDeviceSn(rental.device_sn)
                        setStep("scan")
                      }}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      开始交付
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-6">
            <Button variant="outline" onClick={onBack} className="border-slate-600 text-slate-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (step === "scan") {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setStep("list")} className="text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold text-white">扫码/录入设备序列号</h2>
          </div>

          {selectedRental && (
            <div className="bg-slate-800/50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">{selectedRental.device_name}</h3>
              <p className="text-sm text-slate-400">承租人：{selectedRental.customer_name}</p>
              <p className="text-sm text-slate-400">联系电话：{selectedRental.customer_phone}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label className="text-slate-300 mb-2 block">设备序列号 *</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={deviceSn}
                  onChange={(e) => setDeviceSn(e.target.value)}
                  placeholder="请输入或扫描设备序列号"
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
                <Button
                  onClick={() => setShowQRScanner(true)}
                  variant="outline"
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  扫码
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              onClick={handleVerifyDevice}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
              disabled={!deviceSn.trim()}
            >
              验证并继续
            </Button>
          </div>

          {showQRScanner && (
            <div className="mt-6">
              <QRScanner
                onScanSuccess={handleQRScanSuccess}
                onClose={() => setShowQRScanner(false)}
              />
            </div>
          )}
        </Card>
      </div>
    )
  }

  if (step === "photo") {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setStep("scan")} className="text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold text-white">拍照存证</h2>
          </div>

          {selectedRental && (
            <div className="bg-slate-800/50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">{selectedRental.device_name}</h3>
              <p className="text-sm text-slate-400">设备序列号：{selectedRental.device_sn}</p>
            </div>
          )}

          <div className="space-y-4">
            <ImageUploader
              onUploadSuccess={(imageUrl) => {
                setDeliveryPhotoUrl(imageUrl)
                console.log("[设备交付] 照片上传成功:", imageUrl)
              }}
              onRemove={() => {
                setDeliveryPhotoUrl(null)
              }}
              currentImageUrl={deliveryPhotoUrl}
              label="设备安放照片 *"
            />

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              onClick={() => {
                if (!deliveryPhotoUrl) {
                  setError("请上传设备安放照片")
                  return
                }
                setStep("signature")
                setError("")
              }}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
              disabled={!deliveryPhotoUrl}
            >
              下一步：电子签名
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (step === "signature") {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setStep("photo")} className="text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold text-white">电子签名确认</h2>
          </div>

          {selectedRental && (
            <div className="bg-slate-800/50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">{selectedRental.device_name}</h3>
              <p className="text-sm text-slate-400">承租人：{selectedRental.customer_name}</p>
            </div>
          )}

          <div className="space-y-4">
            <SignaturePad />

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              onClick={handleSubmitDelivery}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={!signatureData || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                "完成交付"
              )}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return null
}

// 主组件
export default function WorkerPage() {
  const [currentView, setCurrentView] = useState<"home" | "install" | "delivery" | "orders" | "repair" | "rental_delivery">("home")
  const [workerId, setWorkerId] = useState<string | null>(null)
  const [productType, setProductType] = useState<string | null>(null) // 当前配送员的产品类型
  const [repairStatusFilter, setRepairStatusFilter] = useState<"all" | "pending" | "processing" | "completed">("all") // 维修工单状态筛选
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false)
  const [loginWorkerId, setLoginWorkerId] = useState("")
  const [loginPhone, setLoginPhone] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [workerInfo, setWorkerInfo] = useState<{
    id: string
    name: string
    phone: string | null
    worker_types: string[]
    product_types: string[]
  } | null>(null)

  // 离线同步功能
  const { isOnline, pendingCount, isSyncing, sync } = useOfflineSync()

  // 检查登录状态
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const savedWorkerId = localStorage.getItem("workerId")
    const savedWorkerInfo = localStorage.getItem("workerInfo")
    
    if (savedWorkerId && savedWorkerInfo) {
      try {
        const info = JSON.parse(savedWorkerInfo)
        console.log("[工人端] 从localStorage恢复登录信息:", info)
        
        // 确保worker_types是数组，并处理可能的嵌套JSON字符串
        if (info.worker_types) {
          if (!Array.isArray(info.worker_types)) {
            console.warn("[工人端] worker_types不是数组，尝试修复:", info.worker_types)
            if (typeof info.worker_types === 'string') {
              try {
                const parsed = JSON.parse(info.worker_types)
                info.worker_types = Array.isArray(parsed) ? parsed : [info.worker_types]
              } catch (e) {
                info.worker_types = [info.worker_types]
              }
            } else {
              info.worker_types = []
            }
          } else {
            // 是数组，但需要检查数组元素是否是JSON字符串
            const processedTypes: string[] = []
            for (const item of info.worker_types) {
              if (typeof item === 'string') {
                // 检查是否是JSON字符串（如 '["delivery","repair"]'）
                if (item.startsWith('[') && item.endsWith(']')) {
                  try {
                    const parsed = JSON.parse(item)
                    if (Array.isArray(parsed)) {
                      parsed.forEach((t: any) => {
                        if (typeof t === 'string' && ['delivery', 'repair', 'install'].includes(t) && !processedTypes.includes(t)) {
                          processedTypes.push(t)
                        }
                      })
                    }
                  } catch (e) {
                    // 解析失败，检查是否是有效类型
                    if (['delivery', 'repair', 'install'].includes(item) && !processedTypes.includes(item)) {
                      processedTypes.push(item)
                    }
                  }
                } else {
                  // 普通字符串，检查是否是有效类型
                  if (['delivery', 'repair', 'install'].includes(item) && !processedTypes.includes(item)) {
                    processedTypes.push(item)
                  }
                }
              }
            }
            if (processedTypes.length > 0) {
              info.worker_types = processedTypes
            }
          }
        } else {
          info.worker_types = []
        }
        
        console.log("[工人端] 恢复后的worker_types:", info.worker_types, "长度:", info.worker_types?.length)
        console.log("[工人端] 检查权限:", {
          hasInstall: info.worker_types?.includes("install"),
          hasDelivery: info.worker_types?.includes("delivery"),
          hasRepair: info.worker_types?.includes("repair")
        })
        
        setWorkerId(savedWorkerId)
        setWorkerInfo(info)
        setIsLoggedIn(true)
        // 如果是配送员且有产品类型，设置默认产品类型
        if (info.worker_types?.includes("delivery") && info.product_types?.length > 0) {
          setProductType(info.product_types[0])
        }
      } catch (error) {
        console.error("[工人端] 解析保存的工人信息失败:", error)
        localStorage.removeItem("workerId")
        localStorage.removeItem("workerInfo")
        setIsLoginDialogOpen(true)
      }
    } else {
      // 如果没有登录信息，显示登录对话框
      setIsLoginDialogOpen(true)
    }
  }, [])

  // 工人登录
  const handleLogin = async () => {
    if (!loginWorkerId && !loginPhone) {
      alert("请输入工人ID或电话号码")
      return
    }

    setIsLoggingIn(true)
    try {
      const response = await fetch("/api/worker/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          worker_id: loginWorkerId || undefined,
          phone: loginPhone || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "登录失败")
      }

      // 保存登录信息
      const workerData = result.data
      console.log("[工人端] 登录成功，接收到的数据:", workerData)
      
      // 确保worker_types是数组，并处理可能的嵌套JSON字符串
      if (workerData.worker_types) {
        if (!Array.isArray(workerData.worker_types)) {
          console.warn("[工人端] worker_types不是数组，尝试修复:", workerData.worker_types)
          if (typeof workerData.worker_types === 'string') {
            try {
              const parsed = JSON.parse(workerData.worker_types)
              workerData.worker_types = Array.isArray(parsed) ? parsed : [workerData.worker_types]
            } catch (e) {
              workerData.worker_types = [workerData.worker_types]
            }
          } else {
            workerData.worker_types = []
          }
        } else {
          // 是数组，但需要检查数组元素是否是JSON字符串
          const processedTypes: string[] = []
          for (const item of workerData.worker_types) {
            if (typeof item === 'string') {
              // 检查是否是JSON字符串（如 '["delivery","repair"]'）
              if (item.startsWith('[') && item.endsWith(']')) {
                try {
                  const parsed = JSON.parse(item)
                  if (Array.isArray(parsed)) {
                    parsed.forEach((t: any) => {
                      if (typeof t === 'string' && ['delivery', 'repair', 'install'].includes(t) && !processedTypes.includes(t)) {
                        processedTypes.push(t)
                      }
                    })
                  }
                } catch (e) {
                  // 解析失败，检查是否是有效类型
                  if (['delivery', 'repair', 'install'].includes(item) && !processedTypes.includes(item)) {
                    processedTypes.push(item)
                  }
                }
              } else {
                // 普通字符串，检查是否是有效类型
                if (['delivery', 'repair', 'install'].includes(item) && !processedTypes.includes(item)) {
                  processedTypes.push(item)
                }
              }
            }
          }
          if (processedTypes.length > 0) {
            workerData.worker_types = processedTypes
          }
        }
      } else {
        workerData.worker_types = []
      }
      
      console.log("[工人端] 处理后的worker_types:", workerData.worker_types, "长度:", workerData.worker_types?.length)
      console.log("[工人端] 检查权限:", {
        hasInstall: workerData.worker_types?.includes("install"),
        hasDelivery: workerData.worker_types?.includes("delivery"),
        hasRepair: workerData.worker_types?.includes("repair")
      })
      
      setWorkerId(workerData.id)
      setWorkerInfo(workerData)
      setIsLoggedIn(true)
      setIsLoginDialogOpen(false)

      // 保存到localStorage
      localStorage.setItem("workerId", workerData.id)
      localStorage.setItem("workerInfo", JSON.stringify(workerData))

      // 如果是配送员且有产品类型，设置默认产品类型
      if (workerData.worker_types?.includes("delivery") && workerData.product_types?.length > 0) {
        setProductType(workerData.product_types[0])
      }

      // 清空登录表单
      setLoginWorkerId("")
      setLoginPhone("")
    } catch (error: any) {
      console.error("[工人端] 登录失败:", error)
      alert(`登录失败: ${error.message || "未知错误"}`)
    } finally {
      setIsLoggingIn(false)
    }
  }

  // 退出登录
  const handleLogout = () => {
    if (typeof window !== 'undefined' && window.confirm("确定要退出登录吗？")) {
      localStorage.removeItem("workerId")
      localStorage.removeItem("workerInfo")
      setWorkerId(null)
      setWorkerInfo(null)
      setIsLoggedIn(false)
      setIsLoginDialogOpen(true)
      setCurrentView("home")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 backdrop-blur-lg border-b border-blue-800/30">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {currentView !== "home" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentView("home")}
                  className="text-white hover:bg-white/10 flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 flex-shrink-0">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg shadow-lg shadow-blue-500/30 flex-shrink-0">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-lg font-bold leading-tight text-white truncate">
                  {currentView === "home" && "服务端工作台"}
                  {currentView === "install" && "设备安装登记"}
                  {currentView === "delivery" && "燃料配送"}
                  {currentView === "orders" && "待接单订单"}
                  {currentView === "repair" && "故障维修"}
                  {currentView === "rental_delivery" && "设备交付助手"}
                </h1>
                <p className="text-xs text-blue-400 truncate">
                  {currentView === "home" && "多功能工作平台"}
                  {currentView === "install" && "扫码登记设备信息"}
                  {currentView === "delivery" && "燃料补给登记"}
                  {currentView === "orders" && "查看和接单"}
                  {currentView === "repair" && "设备故障处理"}
                  {currentView === "rental_delivery" && "设备交付、拍照存证、电子签名"}
                </p>
              </div>
            </div>
            {/* 登录状态 */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {isLoggedIn && workerInfo ? (
                <>
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-semibold text-white truncate">{workerInfo.name}</div>
                    <div className="text-xs text-slate-400 flex items-center justify-end gap-1 mt-1 flex-wrap">
                      {workerInfo.worker_types?.map((type) => {
                        const labels: Record<string, string> = {
                          delivery: "配送员",
                          repair: "维修工",
                          install: "安装工",
                        }
                        return (
                          <Badge key={type} variant="outline" className="text-xs border-blue-500/50 text-blue-400 whitespace-nowrap">
                            {labels[type] || type}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                  {/* 手机端显示：只显示姓名和类型（简化） */}
                  <div className="text-right sm:hidden">
                    <div className="text-xs font-semibold text-white truncate max-w-[80px]">{workerInfo.name}</div>
                    <div className="text-xs text-slate-400 flex items-center justify-end gap-0.5 mt-0.5 flex-wrap max-w-[100px]">
                      {workerInfo.worker_types?.slice(0, 2).map((type) => {
                        const labels: Record<string, string> = {
                          delivery: "配送",
                          repair: "维修",
                          install: "安装",
                        }
                        return (
                          <Badge key={type} variant="outline" className="text-[10px] px-1 py-0 border-blue-500/50 text-blue-400 whitespace-nowrap">
                            {labels[type] || type}
                          </Badge>
                        )
                      })}
                      {workerInfo.worker_types && workerInfo.worker_types.length > 2 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-500/50 text-blue-400">
                          +{workerInfo.worker_types.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-white hover:bg-white/10 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                    <span className="hidden sm:inline">退出</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLoginDialogOpen(true)}
                  className="text-white hover:bg-white/10 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <LogIn className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                  <span className="hidden sm:inline">登录</span>
                </Button>
              )}
            </div>
          </div>
          
          {/* 网络状态和暂存操作提示 */}
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            {!isOnline && (
              <Badge variant="outline" className="bg-yellow-500/20 border-yellow-500/50 text-yellow-400 text-xs">
                <WifiOff className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">离线模式</span>
                <span className="sm:hidden">离线</span>
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge 
                variant="outline" 
                className="bg-blue-500/20 border-blue-500/50 text-blue-400 cursor-pointer hover:bg-blue-500/30 text-xs"
                onClick={sync}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    <span className="hidden sm:inline">同步中...</span>
                    <span className="sm:hidden">同步</span>
                  </>
                ) : (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">{pendingCount} 个待提交</span>
                    <span className="sm:hidden">{pendingCount}</span>
                  </>
                )}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* 登录对话框 */}
      {isLoginDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-slate-900 border-slate-700 p-6">
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <LogIn className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">工人登录</h2>
                <p className="text-sm text-slate-400">请输入工人ID或电话号码登录</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">工人ID</Label>
                  <Input
                    placeholder="请输入工人ID（可选）"
                    value={loginWorkerId}
                    onChange={(e) => setLoginWorkerId(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    电话号码 <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="tel"
                    placeholder="请输入电话号码"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleLogin()
                      }
                    }}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (isLoggedIn) {
                        setIsLoginDialogOpen(false)
                      } else {
                        alert("请先登录才能使用系统")
                      }
                    }}
                    className="flex-1 border-slate-700 text-slate-400 hover:bg-slate-800"
                    disabled={isLoggingIn}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleLogin}
                    disabled={isLoggingIn || (!loginWorkerId && !loginPhone)}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        登录中...
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        登录
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

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

              {/* 功能按钮 - 根据工人类型显示 */}
              <div className="space-y-4">
                {/* 设备安装 - 仅安装工可见 */}
                {workerInfo?.worker_types?.includes("install") && (
                  <Card
                    className="bg-slate-900/40 backdrop-blur-md border border-blue-500/30 shadow-lg shadow-blue-500/20 p-6 hover:scale-[1.02] hover:shadow-blue-500/30 transition-all cursor-pointer"
                    onClick={() => setCurrentView("install")}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
                        <HardHat className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">设备安装</h3>
                        <p className="text-sm text-slate-400">扫码登记新设备安装信息</p>
                      </div>
                      <ArrowLeft className="h-5 w-5 text-slate-400 rotate-180" />
                    </div>
                  </Card>
                )}

                {/* 待接单订单 - 仅配送员可见 */}
                {workerInfo?.worker_types?.includes("delivery") && (
                  <Card
                    className="bg-slate-900/40 backdrop-blur-md border border-orange-500/30 shadow-lg shadow-orange-500/20 p-6 hover:scale-[1.02] hover:shadow-orange-500/30 transition-all cursor-pointer"
                    onClick={() => setCurrentView("orders")}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 flex-shrink-0">
                        <Truck className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">待接单订单</h3>
                        <p className="text-sm text-slate-400">查看和接单配送任务</p>
                      </div>
                      <ArrowLeft className="h-5 w-5 text-slate-400 rotate-180" />
                    </div>
                  </Card>
                )}

                {/* 燃料配送 - 仅配送员可见 */}
                {workerInfo?.worker_types?.includes("delivery") && (
                  <Card
                    className="bg-slate-900/40 backdrop-blur-md border border-blue-500/30 shadow-lg shadow-blue-500/20 p-6 hover:scale-[1.02] hover:shadow-blue-500/30 transition-all cursor-pointer"
                    onClick={() => setCurrentView("delivery")}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
                        <Truck className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">燃料配送</h3>
                        <p className="text-sm text-slate-400">记录燃料补给信息</p>
                      </div>
                      <ArrowLeft className="h-5 w-5 text-slate-400 rotate-180" />
                    </div>
                  </Card>
                )}

                {/* 故障维修 - 仅维修工可见 */}
                {workerInfo?.worker_types?.includes("repair") && (
                  <Card
                    className="bg-slate-900/40 backdrop-blur-md border border-purple-500/30 shadow-lg shadow-purple-500/20 p-6 hover:scale-[1.02] hover:shadow-purple-500/30 transition-all cursor-pointer"
                    onClick={() => setCurrentView("repair")}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
                        <Wrench className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">故障维修</h3>
                        <p className="text-sm text-slate-400">处理设备故障和申请解锁</p>
                      </div>
                      <ArrowLeft className="h-5 w-5 text-slate-400 rotate-180" />
                    </div>
                  </Card>
                )}

                {/* 设备交付助手 - 所有工人都可以使用 */}
                <Card
                  className="bg-slate-900/40 backdrop-blur-md border border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6 hover:scale-[1.02] hover:shadow-cyan-500/30 transition-all cursor-pointer"
                  onClick={() => setCurrentView("rental_delivery")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30 flex-shrink-0">
                      <Package className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">设备交付助手</h3>
                      <p className="text-sm text-slate-400">设备交付、拍照存证、电子签名</p>
                    </div>
                    <ArrowLeft className="h-5 w-5 text-slate-400 rotate-180" />
                  </div>
                </Card>

                {/* 如果没有任何权限，显示提示 */}
                {(!workerInfo || !workerInfo.worker_types || workerInfo.worker_types.length === 0) && (
                  <Card className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 p-6">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-white mb-2">暂无可用功能</h3>
                      <p className="text-sm text-slate-400 mb-4">请联系管理员分配工作权限</p>
                      <div className="text-xs text-slate-500 mt-4 p-3 bg-slate-800/50 rounded-lg text-left">
                        <p className="mb-2 font-semibold">调试信息：</p>
                        <p>workerInfo: {workerInfo ? "存在" : "不存在"}</p>
                        <p>worker_types: {workerInfo?.worker_types ? JSON.stringify(workerInfo.worker_types) : "无"}</p>
                        <p>worker_types类型: {workerInfo?.worker_types ? typeof workerInfo.worker_types : "无"}</p>
                        <p>是否为数组: {workerInfo?.worker_types ? Array.isArray(workerInfo.worker_types) ? "是" : "否" : "无"}</p>
                        <p>数组长度: {workerInfo?.worker_types ? Array.isArray(workerInfo.worker_types) ? workerInfo.worker_types.length : "N/A" : "无"}</p>
                      </div>
                    </div>
                  </Card>
                )}
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
            <InstallForm onBack={() => setCurrentView("home")} workerId={workerId} />
          )}

          {currentView === "orders" && (
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">待接单订单</h2>
                    <p className="text-sm text-slate-400">根据产品类型筛选订单</p>
                  </div>
                </div>
                <WorkerOrderList
                  productType={productType as any}
                  workerId={workerId}
                  onAcceptOrder={(orderId) => {
                    // 接单成功后，可以跳转到配送页面
                    setCurrentView("delivery")
                  }}
                />
              </Card>
            </div>
          )}

            {currentView === "delivery" && workerInfo?.worker_types?.includes("delivery") ? (
            <DeliveryForm onBack={() => setCurrentView("home")} workerId={workerId} />
          ) : currentView === "delivery" ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">您没有配送权限，请联系管理员</p>
              <Button onClick={() => setCurrentView("home")} className="mt-4">返回首页</Button>
            </div>
          ) : null}

          {currentView === "repair" && workerInfo?.worker_types?.includes("repair") ? (
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/30">
                    <Wrench className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">维修工单管理</h2>
                    <p className="text-sm text-slate-400">接收和处理设备维修工单</p>
                  </div>
                </div>

                {/* 状态筛选 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { value: "all", label: "全部" },
                    { value: "pending", label: "待处理" },
                    { value: "processing", label: "处理中" },
                    { value: "completed", label: "已完成" },
                  ].map((filter) => (
                    <Button
                      key={filter.value}
                      variant={repairStatusFilter === filter.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRepairStatusFilter(filter.value as any)}
                      className={
                        repairStatusFilter === filter.value
                          ? "bg-yellow-600 hover:bg-yellow-700"
                          : "border-slate-700 text-slate-400 hover:bg-slate-800"
                      }
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>

                {/* 维修工单列表 */}
                <WorkerRepairList workerId={workerId} statusFilter={repairStatusFilter} />
              </Card>
            </div>
          ) : currentView === "repair" ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">您没有维修权限，请联系管理员</p>
              <Button onClick={() => setCurrentView("home")} className="mt-4">返回首页</Button>
            </div>
          ) : currentView === "rental_delivery" ? (
            <RentalDeliveryAssistant workerId={workerId} onBack={() => setCurrentView("home")} />
          ) : null}
        </div>
      </main>
    </div>
  )
}

