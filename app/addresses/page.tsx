"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MapPin, ArrowLeft, Edit, CheckCircle2, AlertCircle, Locate, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

export default function AddressesPage() {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locationError, setLocationError] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [amapLoaded, setAmapLoaded] = useState(false)
  const geolocationRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)
  
  const [formData, setFormData] = useState({
    address: "",
    latitude: 0,
    longitude: 0,
  })

  const [restaurantInfo, setRestaurantInfo] = useState<{
    id: string
    name: string
    address: string | null
    latitude: number | null
    longitude: number | null
  } | null>(null)

  // 加载高德地图定位插件
  useEffect(() => {
    const loadAMapPlugins = async () => {
      if (typeof window === 'undefined') return
      if (amapLoaded) return

      const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY || '21556e22648ec56beda3e6148a22937c'
      if (!amapKey) {
        console.warn('[定位] AMAP_KEY未配置')
        return
      }

      if (!(window as any)._AMapSecurityConfig) {
        (window as any)._AMapSecurityConfig = {
          securityJsCode: 'ce1bde649b433cf6dbd4343190a6009a'
        }
      }

      try {
        const AMapLoader = (await import('@amap/amap-jsapi-loader')).default
        const AMap = await AMapLoader.load({
          key: amapKey,
          version: '2.0',
          plugins: ['AMap.Geolocation', 'AMap.Geocoder'],
        })

        geolocationRef.current = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
          convert: true,
          showButton: false,
          zoomToAccuracy: true,
        })

        geocoderRef.current = new AMap.Geocoder({
          city: '全国',
        })

        setAmapLoaded(true)
      } catch (error) {
        console.error('[定位] 加载高德地图插件失败:', error)
        setLocationError('地图服务加载失败，请刷新页面重试')
      }
    }

    loadAMapPlugins()
  }, [amapLoaded])

  // 加载餐厅地址信息
  useEffect(() => {
    const loadRestaurantAddress = async () => {
      if (typeof window === 'undefined') return
      if (!isSupabaseConfigured || !supabase) return

      try {
        const restaurantId = localStorage.getItem("restaurantId")
        if (!restaurantId) {
          router.push("/profile")
          return
        }

        const { data, error } = await supabase
          .from("restaurants")
          .select("id, name, address, latitude, longitude")
          .eq("id", restaurantId)
          .maybeSingle()

        if (!error && data) {
          setRestaurantInfo(data)
          setFormData({
            address: data.address || "",
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
          })
        }
      } catch (error) {
        console.error("加载地址信息失败:", error)
      }
    }

    loadRestaurantAddress()
  }, [router])

  // 高德地图定位（复用 profile-content 的逻辑）
  const handleAMapLocation = async () => {
    if (navigator.geolocation) {
      try {
        setIsLocating(true)
        setLocationError("")
        
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 20000,
              maximumAge: 0,
            }
          )
        })

        const { latitude, longitude, accuracy } = position.coords
        
        if (accuracy > 50) {
          console.warn(`[定位] 定位精度较低: ${accuracy.toFixed(0)}米`)
        }

        if (amapLoaded && geocoderRef.current) {
          try {
            const AMap = (window as any).AMap
            const lngLat = new AMap.LngLat(longitude, latitude)
            
            geocoderRef.current.getAddress(lngLat, (geocodeStatus: string, geocodeResult: any) => {
              if (geocodeStatus === 'complete' && geocodeResult && geocodeResult.info === 'OK' && geocodeResult.regeocode) {
                let address = geocodeResult.regeocode.formattedAddress
                
                if (!address && geocodeResult.regeocode.addressComponent) {
                  const addrComp = geocodeResult.regeocode.addressComponent
                  const parts = [
                    addrComp.province,
                    addrComp.city,
                    addrComp.district,
                    addrComp.township,
                    addrComp.neighborhood || addrComp.building,
                    addrComp.street,
                    addrComp.streetNumber
                  ].filter(Boolean)
                  address = parts.join('')
                }
                
                if (!address || address.trim() === '') {
                  address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                }

                setFormData(prev => ({
                  ...prev,
                  latitude,
                  longitude,
                  address: address,
                }))
                setLocationError("")
                setIsLocating(false)
                return
              } else {
                setFormData(prev => ({
                  ...prev,
                  latitude,
                  longitude,
                  address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                }))
                setLocationError("地址解析失败，已保存坐标")
                setIsLocating(false)
                return
              }
            })
          } catch (error) {
            console.error('[定位] 高德逆地理编码异常:', error)
            setFormData(prev => ({
              ...prev,
              latitude,
              longitude,
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            }))
            setLocationError("地址解析异常，已保存坐标")
            setIsLocating(false)
            return
          }
        } else {
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          }))
          setLocationError("地图服务未加载，已保存坐标")
          setIsLocating(false)
          return
        }
      } catch (error: any) {
        console.error('[定位] 浏览器原生定位失败:', error)
        
        // 根据错误代码提供友好的中文提示
        let errorMessage = "定位失败，请检查定位权限或稍后重试"
        if (error.code) {
          switch (error.code) {
            case error.PERMISSION_DENIED || 1:
              errorMessage = "定位权限被拒绝，请在浏览器设置中允许位置访问"
              break
            case error.POSITION_UNAVAILABLE || 2:
              errorMessage = "定位服务不可用，请检查设备定位功能是否开启"
              break
            case error.TIMEOUT || 3:
              errorMessage = "定位超时，请检查网络连接或稍后重试"
              break
            default:
              errorMessage = error.message || "定位失败，请检查定位权限或稍后重试"
          }
        } else if (error.message) {
          // 处理错误消息
          const msg = error.message.toLowerCase()
          if (msg.includes("permission") || msg.includes("denied")) {
            errorMessage = "定位权限被拒绝，请在浏览器设置中允许位置访问"
          } else if (msg.includes("timeout")) {
            errorMessage = "定位超时，请检查网络连接或稍后重试"
          } else if (msg.includes("unavailable")) {
            errorMessage = "定位服务不可用，请检查设备定位功能是否开启"
          }
        }
        
        setLocationError(errorMessage)
        setIsLocating(false)
        return
      }
    } else {
      setLocationError("您的浏览器不支持定位功能")
      setIsLocating(false)
    }
  }

  // 保存地址
  const handleSave = async () => {
    if (typeof window === 'undefined') return
    if (!isSupabaseConfigured || !supabase) {
      alert("数据库连接失败，请稍后重试")
      return
    }

    const restaurantId = localStorage.getItem("restaurantId")
    if (!restaurantId) {
      alert("请先登录")
      router.push("/profile")
      return
    }

    setIsSubmitting(true)
    setSubmitSuccess(false)

    try {
      const hasLocation = formData.latitude !== 0 && formData.longitude !== 0 &&
                         !isNaN(formData.latitude) && !isNaN(formData.longitude) &&
                         formData.latitude !== null && formData.longitude !== null

      const response = await fetch("/api/restaurant/register", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          address: formData.address || undefined,
          latitude: hasLocation ? Number(formData.latitude) : null,
          longitude: hasLocation ? Number(formData.longitude) : null,
        }),
      })

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ error: "网络请求失败" }))
        alert(`保存失败: ${errorResult.error || "网络请求失败"}`)
        return
      }

      const result = await response.json()

      if (!result.error) {
        setSubmitSuccess(true)
        setIsEditing(false)
        if (result.data) {
          setRestaurantInfo({
            id: result.data.id,
            name: result.data.name || "",
            address: result.data.address || null,
            latitude: result.data.latitude || null,
            longitude: result.data.longitude || null,
          })
        }
        setTimeout(() => setSubmitSuccess(false), 3000)
      } else {
        alert("保存失败: " + (result.error || "未知错误"))
      }
    } catch (error) {
      console.error("保存失败:", error)
      alert("保存失败，请检查网络连接或稍后重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 返回按钮 */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">地址管理</h1>
        </div>

        {submitSuccess && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-sm text-green-400">地址保存成功！</span>
          </div>
        )}

        <Card className="p-6 bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
          {!isEditing ? (
            <>
              {/* 查看模式 */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-white">当前地址</h2>
                    <p className="text-xs text-slate-400">管理您的配送地址</p>
                  </div>
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="ghost"
                    size="sm"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    编辑
                  </Button>
                </div>

                {restaurantInfo?.address ? (
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-white font-medium mb-1">{restaurantInfo.address}</p>
                        {restaurantInfo.latitude && restaurantInfo.longitude && (
                          <p className="text-xs text-slate-400">
                            坐标: {restaurantInfo.latitude.toFixed(6)}, {restaurantInfo.longitude.toFixed(6)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                    <p className="text-slate-400 text-sm">暂无地址信息</p>
                    <p className="text-slate-500 text-xs mt-1">点击"编辑"按钮添加地址</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* 编辑模式 */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-white">编辑地址</h2>
                    <p className="text-xs text-slate-400">更新您的配送地址</p>
                  </div>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white"
                  >
                    取消
                  </Button>
                </div>

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

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        保存地址
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                  >
                    取消
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
      <BottomNavigation />
    </main>
  )
}

