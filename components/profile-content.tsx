"use client"

// 高德地图安全密钥配置
if (typeof window !== 'undefined') {
  (window as any)._AMapSecurityConfig = {
    securityJsCode: 'ce1bde649b433cf6dbd4343190a6009a'
  }
}

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { MapPin, CreditCard, Settings, HelpCircle, FileText, Shield, ChevronRight, Star, User, Phone, Building2, Navigation, Loader2, CheckCircle2, AlertCircle, Locate } from "lucide-react"
import AMapLoader from '@amap/amap-jsapi-loader'
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
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [locationError, setLocationError] = useState("")
  const [amapLoaded, setAmapLoaded] = useState(false)
  const geolocationRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)
  
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

  // 加载高德地图定位插件
  useEffect(() => {
    const loadAMapPlugins = async () => {
      if (amapLoaded) return

      const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY || '21556e22648ec56beda3e6148a22937c'
      if (!amapKey) {
        console.warn('[定位] AMAP_KEY未配置')
        return
      }

      // 确保安全密钥已配置
      if (typeof window !== 'undefined' && !(window as any)._AMapSecurityConfig) {
        (window as any)._AMapSecurityConfig = {
          securityJsCode: 'ce1bde649b433cf6dbd4343190a6009a'
        }
      }

      try {
        const AMap = await AMapLoader.load({
          key: amapKey,
          version: '2.0',
          plugins: ['AMap.Geolocation', 'AMap.Geocoder'],
        })

        // 初始化定位插件
        geolocationRef.current = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
          convert: true,
          showButton: false,
          buttonOffset: new AMap.Pixel(10, 20),
          zoomToAccuracy: true,
          buttonPosition: 'RB',
        })

        // 添加定位成功事件监听
        geolocationRef.current.on('complete', (data: any) => {
          console.log('[定位] 定位成功事件:', data)
        })

        // 添加定位失败事件监听
        geolocationRef.current.on('error', (data: any) => {
          console.error('[定位] 定位失败事件:', data)
        })

        // 初始化地理编码插件
        geocoderRef.current = new AMap.Geocoder({
          city: '全国',
        })

        setAmapLoaded(true)
        console.log('[定位] 高德地图插件加载成功')
      } catch (error) {
        console.error('[定位] 加载高德地图插件失败:', error)
        setLocationError('地图服务加载失败，请刷新页面重试')
      }
    }

    loadAMapPlugins()
  }, [amapLoaded])

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

  // 高德地图精确定位
  const handleAMapLocation = async () => {
    if (!amapLoaded || !geolocationRef.current || !geocoderRef.current) {
      setLocationError("地图服务未加载完成，请稍候再试")
      console.warn('[定位] 地图服务未就绪:', { amapLoaded, geolocation: !!geolocationRef.current, geocoder: !!geocoderRef.current })
      return
    }

    setIsLocating(true)
    setLocationError("")

    // 设置超时处理，防止一直处于定位中
    let isCompleted = false
    const timeoutId = setTimeout(() => {
      if (!isCompleted) {
        console.error('[定位] 定位超时')
        setLocationError("定位超时，请检查网络连接或定位权限")
        setIsLocating(false)
        isCompleted = true
        // 移除可能的事件监听
        if (geolocationRef.current) {
          geolocationRef.current.off('complete')
          geolocationRef.current.off('error')
        }
      }
    }, 15000) // 15秒超时

    try {
      console.log('[定位] 开始定位...')
      
      // 使用事件监听方式处理定位结果
      const handleComplete = (data: any) => {
        if (isCompleted) return // 防止重复处理
        clearTimeout(timeoutId)
        isCompleted = true
        console.log('[定位] 定位成功:', data)
        
        if (data && data.position) {
          const longitude = data.position.lng || data.position.longitude
          const latitude = data.position.lat || data.position.latitude

          console.log('[定位] 获取到坐标:', { latitude, longitude })

          // 使用逆地理编码将坐标转换为地址
          geocoderRef.current.getAddress([longitude, latitude], (geocodeStatus: string, geocodeResult: any) => {
            console.log('[定位] 逆地理编码回调:', { geocodeStatus, geocodeResult })
            
            if (geocodeStatus === 'complete' && geocodeResult.info === 'OK') {
              const address = geocodeResult.regeocode.formattedAddress || 
                (geocodeResult.regeocode.addressComponent ? 
                  `${geocodeResult.regeocode.addressComponent.province || ""}${geocodeResult.regeocode.addressComponent.city || ""}${geocodeResult.regeocode.addressComponent.district || ""}${geocodeResult.regeocode.addressComponent.township || ""}${geocodeResult.regeocode.addressComponent.street || ""}${geocodeResult.regeocode.addressComponent.streetNumber || ""}` : 
                  `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)

              console.log('[定位] 地址解析成功:', address)

              setFormData(prev => ({
                ...prev,
                latitude,
                longitude,
                address: address,
              }))
              setLocationError("")
              setIsLocating(false)
              
              // 移除事件监听
              if (geolocationRef.current) {
                geolocationRef.current.off('complete', handleComplete)
                geolocationRef.current.off('error', handleError)
              }
            } else {
              // 如果逆地理编码失败，至少保存坐标
              console.warn('[定位] 地址解析失败，但已保存坐标')
              setFormData(prev => ({
                ...prev,
                latitude,
                longitude,
                address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              }))
              setLocationError("地址解析失败，已保存坐标")
              setIsLocating(false)
              
              // 移除事件监听
              if (geolocationRef.current) {
                geolocationRef.current.off('complete', handleComplete)
                geolocationRef.current.off('error', handleError)
              }
            }
          })
        } else {
          console.error('[定位] 定位数据格式错误:', data)
          setLocationError("定位数据格式错误")
          setIsLocating(false)
          if (geolocationRef.current) {
            geolocationRef.current.off('complete', handleComplete)
            geolocationRef.current.off('error', handleError)
          }
        }
      }

      const handleError = (data: any) => {
        if (isCompleted) return // 防止重复处理
        clearTimeout(timeoutId)
        isCompleted = true
        console.error('[定位] 定位失败:', data)
        const errorMessage = data?.message || data?.info || "定位失败，请检查定位权限或稍后重试"
        setLocationError(errorMessage)
        setIsLocating(false)
        if (geolocationRef.current) {
          geolocationRef.current.off('complete', handleComplete)
          geolocationRef.current.off('error', handleError)
        }
      }

      // 添加事件监听
      geolocationRef.current.on('complete', handleComplete)
      geolocationRef.current.on('error', handleError)
      
      // 触发定位
      geolocationRef.current.getCurrentPosition()
      
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('[定位] 定位异常:', error)
      setLocationError("定位服务异常，请稍后重试")
      setIsLocating(false)
    }
  }

  // 提交注册/更新
  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim() || !formData.restaurant_name.trim()) {
      alert("请填写完整信息：姓名、手机号、餐厅名称")
      return
    }

    // 地理位置为可选字段，检查是否有有效的定位信息
    const hasLocation = formData.latitude !== 0 && formData.longitude !== 0 &&
                       !isNaN(formData.latitude) && !isNaN(formData.longitude) &&
                       formData.latitude !== null && formData.longitude !== null
    
    // 添加调试日志
    console.log('[注册表单] 提交数据:', {
      name: formData.name,
      phone: formData.phone,
      restaurant_name: formData.restaurant_name,
      hasLocation,
      latitude: formData.latitude,
      longitude: formData.longitude,
      address: formData.address,
      latitudeType: typeof formData.latitude,
      longitudeType: typeof formData.longitude,
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
            // 确保经纬度以数字类型传递，如果没有定位则传递 null
            latitude: hasLocation ? Number(formData.latitude) : null,
            longitude: hasLocation ? Number(formData.longitude) : null,
            address: formData.address || undefined,
          }),
        })

        // 检查 HTTP 状态码
        if (!response.ok) {
          const errorResult = await response.json().catch(() => ({ error: "网络请求失败" }))
          console.error('[注册表单] 更新失败 - HTTP错误:', response.status, errorResult)
          alert(`更新失败 (${response.status}): ${errorResult.error || "网络请求失败"}`)
          return
        }

        const result = await response.json()
        
        console.log('[注册表单] 更新API响应:', result)

        // 松绑逻辑判断：只要没有 error 就执行成功逻辑
        if (!result.error) {
          setSubmitSuccess(true)
          setIsEditing(false)
          if (result.data) {
            setRestaurantInfo(result.data)
          }
          // 强制清除缓存并刷新
          router.refresh()
          setTimeout(() => setSubmitSuccess(false), 3000)
        } else {
          console.error('[注册表单] 更新失败:', result.error, result.details)
          alert("更新失败: " + (result.error || "未知错误") + (result.details ? `\n详情: ${result.details}` : ""))
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
            // 确保经纬度以数字类型传递，如果没有定位则传递 null
            latitude: hasLocation ? Number(formData.latitude) : null,
            longitude: hasLocation ? Number(formData.longitude) : null,
            address: formData.address || undefined,
          }),
        })

        // 检查 HTTP 状态码
        if (!response.ok) {
          const errorResult = await response.json().catch(() => ({ error: "网络请求失败" }))
          console.error('[注册表单] 注册失败 - HTTP错误:', response.status, errorResult)
          alert(`注册失败 (${response.status}): ${errorResult.error || "网络请求失败"}`)
          return
        }

        const result = await response.json()
        
        console.log('[注册表单] API响应:', result)

        // 松绑逻辑判断：只要没有 error 就执行成功逻辑
        if (!result.error) {
          // 保存餐厅ID到localStorage（如果返回了数据）
          if (result.data && result.data.restaurant_id) {
            localStorage.setItem("restaurantId", result.data.restaurant_id)
            setRestaurantInfo({
              id: result.data.restaurant_id,
              name: result.data.name || formData.restaurant_name,
              contact_name: formData.name,
              contact_phone: formData.phone,
              address: formData.address || null,
              latitude: hasLocation ? formData.latitude : null,
              longitude: hasLocation ? formData.longitude : null,
              status: result.data.status || "unactivated",
            })
          } else {
            // 即使没有返回完整数据，也尝试保存基本信息
            console.warn('[注册表单] API返回数据不完整，但操作可能已成功')
          }
          setSubmitSuccess(true)
          setIsEditing(false)
          // 强制清除缓存并刷新
          router.refresh()
          setTimeout(() => setSubmitSuccess(false), 3000)
        } else {
          console.error('[注册表单] 注册失败:', result.error, result.details)
          alert("注册失败: " + (result.error || "未知错误") + (result.details ? `\n详情: ${result.details}` : ""))
        }
      }
    } catch (error) {
      console.error("提交失败:", error)
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      alert(`提交失败: ${errorMessage}\n\n请检查网络连接或稍后重试`)
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

            {/* 详细地址 */}
            <div>
              <Label htmlFor="address" className="text-slate-300 mb-2 block">
                详细地址 <span className="text-slate-500 text-xs">(可选)</span>
              </Label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                    placeholder="请输入详细地址或点击右侧按钮自动获取"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAMapLocation}
                  disabled={isLocating || !amapLoaded}
                  className="px-4 bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 text-white flex-shrink-0"
                  title="自动获取位置"
                >
                  {isLocating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Locate className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {locationError && (
                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
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
                <div className="mt-2 p-3 bg-slate-800/50 rounded-lg">
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
              {!amapLoaded && (
                <p className="mt-2 text-xs text-slate-500">
                  正在加载定位服务...
                </p>
              )}
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
