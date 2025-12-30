"use client"

import { useState, useEffect } from "react"
import { MapPin, CreditCard, Settings, HelpCircle, FileText, Shield, ChevronRight, Star, User, Phone, Building2, Navigation, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

const menuItems = [
  { icon: MapPin, label: "地址管理", description: "管理配送地址", href: "/addresses" },
  { icon: CreditCard, label: "支付方式", description: "管理支付账户", href: "/payment" },
  { icon: FileText, label: "发票管理", description: "开具和查看发票", href: "/invoices" },
  { icon: Shield, label: "资质认证", description: "企业资质认证", href: "/certification" },
  { icon: Star, label: "会员权益", description: "查看会员特权", href: "/vip" },
  { icon: Settings, label: "设置", description: "账户设置", href: "/settings" },
  { icon: HelpCircle, label: "帮助中心", description: "常见问题", href: "/help" },
]

export function ProfileContent() {
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [locationError, setLocationError] = useState("")
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    restaurant_name: "",
    latitude: 0,
    longitude: 0,
    address: "",
  })

  // 餐厅信息状态
  const [restaurantInfo, setRestaurantInfo] = useState<{
    id: string
    name: string
    contact_name: string | null
    contact_phone: string | null
    address: string | null
    latitude: number | null
    longitude: number | null
    status: string | null
  } | null>(null)

  // 从 localStorage 加载餐厅ID
  useEffect(() => {
    const restaurantId = localStorage.getItem("restaurantId")
    if (restaurantId) {
      loadRestaurantInfo(restaurantId)
    }
  }, [])

  // 加载餐厅信息
  const loadRestaurantInfo = async (restaurantId: string) => {
    if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      return
    }

    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, contact_name, contact_phone, address, latitude, longitude, status")
        .eq("id", restaurantId)
        .single()

      if (!error && data) {
        setRestaurantInfo(data)
        setFormData({
          name: data.contact_name || "",
          phone: data.contact_phone || "",
          restaurant_name: data.name || "",
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          address: data.address || "",
        })
      }
    } catch (error) {
      console.error("加载餐厅信息失败:", error)
    }
  }

  // 地图定位（使用高德地图API）
  const handleMapLocation = () => {
    setIsLocating(true)
    setLocationError("")

    if (!navigator.geolocation) {
      setLocationError("您的浏览器不支持GPS定位")
      setIsLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude

        try {
          // 使用高德地图API进行反向地理编码（国内更准确）
          // 注意：需要在高德开放平台申请Key，这里使用示例Key，实际使用时请替换
          const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY || "your-amap-key-here"
          
          // 如果配置了高德Key，使用高德API
          if (amapKey && amapKey !== "your-amap-key-here") {
            const response = await fetch(
              `https://restapi.amap.com/v3/geocode/regeo?key=${amapKey}&location=${longitude},${latitude}&radius=1000&extensions=all`
            )

            if (!response.ok) {
              throw new Error("高德地图API调用失败")
            }

            const data = await response.json()
            
            if (data.status === "1" && data.regeocode) {
              const formattedAddress = data.regeocode.formatted_address || 
                (data.regeocode.addressComponent ? 
                  `${data.regeocode.addressComponent.province || ""}${data.regeocode.addressComponent.city || ""}${data.regeocode.addressComponent.district || ""}${data.regeocode.addressComponent.township || ""}${data.regeocode.addressComponent.street || ""}${data.regeocode.addressComponent.streetNumber || ""}` : 
                  `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)

              setFormData(prev => ({
                ...prev,
                latitude,
                longitude,
                address: formattedAddress,
              }))
              setLocationError("")
              setIsLocating(false)
              return
            }
          }

          // 备用方案：使用百度地图API
          const baiduKey = process.env.NEXT_PUBLIC_BAIDU_MAP_KEY || "your-baidu-key-here"
          
          if (baiduKey && baiduKey !== "your-baidu-key-here") {
            // 百度地图需要将GPS坐标转换为百度坐标
            const response = await fetch(
              `https://api.map.baidu.com/geocoding/v3/?ak=${baiduKey}&location=${latitude},${longitude}&output=json&coordtype=wgs84ll`
            )

            if (!response.ok) {
              throw new Error("百度地图API调用失败")
            }

            const data = await response.json()
            
            if (data.status === 0 && data.result) {
              const formattedAddress = data.result.formatted_address || 
                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`

              setFormData(prev => ({
                ...prev,
                latitude,
                longitude,
                address: formattedAddress,
              }))
              setLocationError("")
              setIsLocating(false)
              return
            }
          }

          // 如果都没有配置，使用OpenStreetMap作为备用
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                'User-Agent': 'MyMindChufanApp/1.0'
              }
            }
          )

          if (!response.ok) {
            throw new Error("地址解析失败")
          }

          const data = await response.json()
          const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`

          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            address,
          }))
          setLocationError("")
        } catch (error) {
          console.error("地址解析失败:", error)
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          }))
          setLocationError("地址解析失败，已保存坐标")
        } finally {
          setIsLocating(false)
        }
      },
      (error) => {
        console.error("GPS定位失败:", error)
        setLocationError("定位失败，您可以稍后手动填写地址或跳过此步骤继续注册")
        setIsLocating(false)
      }
    )
  }

  // 提交注册/更新
  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim() || !formData.restaurant_name.trim()) {
      alert("请填写完整信息：姓名、手机号、餐厅名称")
      return
    }

    // 地理位置为可选字段，如果未定位则使用默认值
    const hasLocation = formData.latitude !== 0 && formData.longitude !== 0
    
    // 添加调试日志
    console.log('[注册表单] 提交数据:', {
      name: formData.name,
      phone: formData.phone,
      restaurant_name: formData.restaurant_name,
      hasLocation,
      latitude: formData.latitude,
      longitude: formData.longitude,
      address: formData.address
    })
    console.log('[注册表单] 环境变量检查:', {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '已配置' : '未配置',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已配置' : '未配置'
    })

    setIsSubmitting(true)
    setSubmitSuccess(false)

    try {
      const restaurantId = localStorage.getItem("restaurantId")

      if (restaurantId) {
        // 更新现有餐厅
        const response = await fetch("/api/restaurant/register", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            name: formData.name,
            phone: formData.phone,
            restaurant_name: formData.restaurant_name,
            latitude: hasLocation ? formData.latitude : undefined,
            longitude: hasLocation ? formData.longitude : undefined,
            address: formData.address || undefined,
          }),
        })

        const result = await response.json()
        
        console.log('[注册表单] 更新API响应:', result)

        if (result.success) {
          setSubmitSuccess(true)
          setIsEditing(false)
          if (result.data) {
            setRestaurantInfo(result.data)
          }
          setTimeout(() => setSubmitSuccess(false), 3000)
        } else {
          console.error('[注册表单] 更新失败:', result.error, result.details)
          alert("更新失败: " + (result.error || "未知错误") + (result.details ? `\n详情: ${JSON.stringify(result.details)}` : ""))
        }
      } else {
        // 注册新餐厅
        const response = await fetch("/api/restaurant/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            restaurant_name: formData.restaurant_name,
            latitude: hasLocation ? formData.latitude : undefined,
            longitude: hasLocation ? formData.longitude : undefined,
            address: formData.address || undefined,
          }),
        })

        const result = await response.json()
        
        console.log('[注册表单] API响应:', result)

        if (result.success && result.data) {
          // 保存餐厅ID到localStorage
          localStorage.setItem("restaurantId", result.data.restaurant_id)
          setRestaurantInfo({
            id: result.data.restaurant_id,
            name: result.data.name,
            contact_name: formData.name,
            contact_phone: formData.phone,
            address: formData.address || null,
            latitude: hasLocation ? formData.latitude : null,
            longitude: hasLocation ? formData.longitude : null,
            status: result.data.status,
          })
          setSubmitSuccess(true)
          setIsEditing(false)
          setTimeout(() => setSubmitSuccess(false), 3000)
        } else {
          console.error('[注册表单] 注册失败:', result.error, result.details)
          alert("注册失败: " + (result.error || "未知错误") + (result.details ? `\n详情: ${JSON.stringify(result.details)}` : ""))
        }
      }
    } catch (error) {
      console.error("提交失败:", error)
      alert("提交失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isRegistered = restaurantInfo !== null
  const isUnactivated = restaurantInfo?.status === "unactivated"

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* 注册/编辑表单 */}
      {(!isRegistered || isEditing) ? (
        <Card className="p-6 bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isRegistered ? "编辑资料" : "注册信息"}
              </h2>
              <p className="text-xs text-slate-400">
                {isRegistered ? "更新您的餐厅信息" : "填写信息以激活服务"}
              </p>
            </div>
          </div>

          {submitSuccess && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-400">
                {isRegistered ? "信息更新成功！" : "注册成功！"}
              </span>
            </div>
          )}

          <div className="space-y-4">
            {/* 姓名 */}
            <div>
              <Label htmlFor="name" className="text-slate-300 mb-2 block">
                姓名 <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  placeholder="请输入您的姓名"
                />
              </div>
            </div>

            {/* 手机号 */}
            <div>
              <Label htmlFor="phone" className="text-slate-300 mb-2 block">
                手机号 <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  placeholder="请输入手机号"
                />
              </div>
            </div>

            {/* 餐厅名称 */}
            <div>
              <Label htmlFor="restaurant_name" className="text-slate-300 mb-2 block">
                餐厅名称 <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="restaurant_name"
                  value={formData.restaurant_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, restaurant_name: e.target.value }))}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  placeholder="请输入餐厅名称"
                />
              </div>
            </div>

            {/* 地图定位 */}
            <div>
              <Label className="text-slate-300 mb-2 block">
                地理位置 <span className="text-slate-500 text-xs">(可选)</span>
              </Label>
              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={handleMapLocation}
                  disabled={isLocating}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 text-white"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      定位中...
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4 mr-2" />
                      {formData.latitude && formData.longitude ? "重新定位" : "点击定位"}
                    </>
                  )}
                </Button>
                {locationError && (
                  <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-xs text-yellow-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {locationError}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      提示：地理位置为可选信息，您可以跳过此步骤继续完成注册
                    </p>
                  </div>
                )}
                {formData.address && formData.latitude !== 0 && formData.longitude !== 0 && (
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-white">{formData.address}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          坐标: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {!formData.address && formData.latitude === 0 && formData.longitude === 0 && (
                  <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-400 text-center">
                      未获取位置信息，您可以稍后补充或跳过此步骤
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 提交按钮 */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name.trim() || !formData.phone.trim() || !formData.restaurant_name.trim()}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white h-12 text-lg font-semibold shadow-lg shadow-green-500/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {isRegistered ? "更新中..." : "注册中..."}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  {isRegistered ? "保存修改" : "完成注册"}
                </>
              )}
            </Button>

            {isRegistered && (
              <Button
                onClick={() => setIsEditing(false)}
                variant="ghost"
                className="w-full text-slate-400 hover:text-white"
              >
                取消
              </Button>
            )}
          </div>
        </Card>
      ) : (
        /* 已注册信息展示 */
        <Card className="p-6 bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src="/placeholder.svg?height=64&width=64" />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                {restaurantInfo.contact_name?.[0] || "用"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white">{restaurantInfo.contact_name || "未设置"}</h2>
                {isUnactivated ? (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    待激活
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white border-0">
                    已激活
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-400">{restaurantInfo.name}</p>
              <p className="text-sm text-slate-400">手机: {restaurantInfo.contact_phone || "未设置"}</p>
              {restaurantInfo.address && (
                <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {restaurantInfo.address}
                </p>
              )}
            </div>
            <Button
              onClick={() => setIsEditing(true)}
              variant="ghost"
              size="sm"
              className="text-blue-400 hover:text-blue-300"
            >
              编辑
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
          <div className="text-2xl font-bold mb-1 text-white">106</div>
          <div className="text-xs text-slate-400">累计订单</div>
        </Card>
        <Card className="p-4 text-center bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
          <div className="text-2xl font-bold mb-1 text-white">¥28.6k</div>
          <div className="text-xs text-slate-400">累计消费</div>
        </Card>
        <Card className="p-4 text-center bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
          <div className="text-2xl font-bold mb-1 text-white">320</div>
          <div className="text-xs text-slate-400">积分余额</div>
        </Card>
      </div>

      <Card className="divide-y divide-slate-800 bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-slate-800/50 rounded-xl flex items-center justify-center flex-shrink-0">
              <item.icon className="h-5 w-5 text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium mb-0.5 text-white">{item.label}</h3>
              <p className="text-sm text-slate-400">{item.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
          </button>
        ))}
      </Card>

      <Card className="p-4 bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
        <button className="w-full text-red-400 font-medium hover:text-red-300 transition-colors">退出登录</button>
      </Card>
    </div>
  )
}
